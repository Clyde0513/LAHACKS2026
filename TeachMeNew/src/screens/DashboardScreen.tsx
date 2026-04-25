import { useEffect, useState } from 'react';
import { getLessonRecords, removeLessonRecord, clearHistory, calcStreak } from '../lib/lessonHistory';
import { supabase } from '../lib/supabase';
import type { LessonRecord } from '../types';
import './DashboardScreen.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 75) return '#34d399';
  if (score >= 50) return '#60a5fa';
  return '#fb923c';
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(ms: number): string {
  const diffMs = Date.now() - ms;
  const mins   = Math.floor(diffMs / 60_000);
  const hours  = Math.floor(diffMs / 3_600_000);
  const days   = Math.floor(diffMs / 86_400_000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  return formatDate(ms);
}

function calcAvgConfidenceFromCounts(low: number, medium: number, high: number): number {
  const total = low + medium + high;
  if (!total) return 0;
  return Math.round(((low * 1 + medium * 2 + high * 3) / (total * 3)) * 100);
}

// Aggregate confidence per topic for the chart
function buildConfidenceByTopic(records: LessonRecord[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of records) {
    const existing = map.get(r.topic) ?? { total: 0, count: 0 };
    map.set(r.topic, { total: existing.total + r.avgConfidence, count: existing.count + 1 });
  }
  return Array.from(map.entries())
    .map(([topic, { total, count }]) => ({ topic, avg: Math.round(total / count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);
}

// ── Record card ───────────────────────────────────────────────────────────────
function RecordCard({
  record,
  onReopen,
  onRemove,
}: {
  record: LessonRecord;
  onReopen: (topic: string) => void;
  onRemove: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = scoreColor(record.quizScore);

  return (
    <div className="dsh-record">
      <div className="dsh-record-left">
        <div className="dsh-score-badge" style={{ '--badge-color': color } as React.CSSProperties}>
          {record.quizScore}%
        </div>
      </div>

      <div className="dsh-record-body">
        <p className="dsh-record-topic">{record.topic}</p>
        <div className="dsh-record-meta">
          <span className="dsh-record-pill">{record.difficulty}</span>
          <span className="dsh-record-pill">{record.moduleCount} modules</span>
          <span className="dsh-record-time">{formatRelative(record.completedAt)}</span>
        </div>
        <div className="dsh-record-conf-row">
          <span className="dsh-record-conf-label">Confidence</span>
          <div className="dsh-record-conf-bar">
            <div
              className="dsh-record-conf-fill"
              style={{ width: `${record.avgConfidence}%`, background: scoreColor(record.avgConfidence) }}
            />
          </div>
          <span className="dsh-record-conf-pct" style={{ color: scoreColor(record.avgConfidence) }}>
            {record.avgConfidence}%
          </span>
        </div>
      </div>

      <div className="dsh-record-actions">
        <button
          className="tmn-btn-primary tmn-btn-sm dsh-reopen-btn"
          onClick={() => onReopen(record.topic)}
        >
          Reopen →
        </button>
        {!confirmDelete ? (
          <button
            className="tmn-btn-ghost tmn-btn-sm dsh-del-btn"
            onClick={() => setConfirmDelete(true)}
            aria-label="Remove lesson"
          >
            ✕
          </button>
        ) : (
          <button
            className="tmn-btn-ghost tmn-btn-sm dsh-del-confirm"
            onClick={() => onRemove(record.id)}
          >
            Sure?
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="dsh-empty">
      <span className="dsh-empty-icon">📚</span>
      <h2 className="dsh-empty-title">No lessons yet</h2>
      <p className="dsh-empty-sub">Complete a lesson to start building your learning history.</p>
      <button className="tmn-btn-primary" onClick={onStart}>Start your first lesson →</button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  onStartTopic: (topic: string) => void;
}

export default function DashboardScreen({ onBack, onStartTopic }: Props) {
  const [records, setRecords] = useState<LessonRecord[]>(() => getLessonRecords());
  const [confirmClear, setConfirmClear] = useState(false);

  // Fetch from Supabase when logged in and merge with localStorage
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data, error } = await supabase!
        .from('user_progress')
        .select('id, topic, difficulty, score_pct, completed_at, confidence_low, confidence_medium, confidence_high')
        .eq('user_id', session.user.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) { console.warn('[dashboard] fetch error:', error.message); return; }
      if (!data?.length) return;

      const remote: LessonRecord[] = data.map((row) => ({
        id:            row.id as string,
        topic:         row.topic as string,
        difficulty:    (row.difficulty as string) ?? 'Beginner',
        totalDuration: '',
        moduleCount:   0,
        completedAt:   new Date(row.completed_at as string).getTime(),
        quizScore:     Math.round((row.score_pct as number) ?? 0),
        avgConfidence: calcAvgConfidenceFromCounts(
          (row.confidence_low as number) ?? 0,
          (row.confidence_medium as number) ?? 0,
          (row.confidence_high as number) ?? 0,
        ),
        relatedTopics: [],
      }));

      // Merge: remote is authoritative for records that exist there
      const localOnly = getLessonRecords().filter(
        (local) => !remote.some((r) => r.id === local.id),
      );
      setRecords([...remote, ...localOnly]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streak      = calcStreak(records);
  const totalLessons = records.length;
  const avgScore    = records.length
    ? Math.round(records.reduce((s, r) => s + r.quizScore, 0) / records.length)
    : 0;

  const confByTopic = buildConfidenceByTopic(records);

  // Gather unique recommended topics from all lessons
  const recommended = Array.from(
    new Map(
      records
        .flatMap((r) => r.relatedTopics)
        .map((rt) => [rt.topic, rt]),
    ).values(),
  )
    .filter((rt) => !records.some((r) => r.topic.toLowerCase() === rt.topic.toLowerCase()))
    .slice(0, 6);

  const handleRemove = (id: string) => {
    removeLessonRecord(id);
    setRecords(getLessonRecords());
  };

  const handleClearAll = () => {
    clearHistory();
    setRecords([]);
    setConfirmClear(false);
  };

  return (
    <div className="dsh-root">
      {/* ── Nav ── */}
      <header className="tmn-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <span className="dsh-nav-label">My Dashboard</span>
        <div className="tmn-nav-actions">
          <button className="tmn-btn-ghost tmn-btn-sm" onClick={onBack}>
            ← Back
          </button>
        </div>
      </header>

      <main className="dsh-main">
        {records.length === 0 ? (
          <EmptyState onStart={onBack} />
        ) : (
          <>
            {/* ── Stats row ── */}
            <div className="dsh-stats">
              <div className="dsh-stat">
                <span className="dsh-stat-num">{streak}</span>
                <span className="dsh-stat-label">
                  {streak === 1 ? 'Day streak 🔥' : streak > 1 ? 'Day streak 🔥' : 'Day streak'}
                </span>
              </div>
              <div className="dsh-stat-divider" />
              <div className="dsh-stat">
                <span className="dsh-stat-num">{totalLessons}</span>
                <span className="dsh-stat-label">Lessons completed</span>
              </div>
              <div className="dsh-stat-divider" />
              <div className="dsh-stat">
                <span className="dsh-stat-num" style={{ color: scoreColor(avgScore) }}>
                  {avgScore}%
                </span>
                <span className="dsh-stat-label">Avg quiz score</span>
              </div>
            </div>

            {/* ── Confidence by topic chart ── */}
            {confByTopic.length > 0 && (
              <section className="dsh-section">
                <h2 className="dsh-section-title">📊 Confidence by Topic</h2>
                <div className="dsh-conf-chart">
                  {confByTopic.map(({ topic, avg }) => (
                    <div key={topic} className="dsh-conf-row">
                      <span className="dsh-conf-topic">{topic}</span>
                      <div className="dsh-conf-bar-wrap">
                        <div
                          className="dsh-conf-bar-fill"
                          style={{ width: `${avg}%`, background: scoreColor(avg) }}
                        />
                      </div>
                      <span className="dsh-conf-pct" style={{ color: scoreColor(avg) }}>{avg}%</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Recommended next lessons ── */}
            {recommended.length > 0 && (
              <section className="dsh-section">
                <h2 className="dsh-section-title">🚀 Recommended Next</h2>
                <p className="dsh-section-sub">Based on your completed lessons</p>
                <div className="dsh-recommended">
                  {recommended.map((rt) => (
                    <button
                      key={rt.topic}
                      className="dsh-rec-chip"
                      onClick={() => onStartTopic(rt.topic)}
                    >
                      <span>{rt.emoji}</span>
                      <span>{rt.topic}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Lesson history ── */}
            <section className="dsh-section">
              <div className="dsh-section-head">
                <h2 className="dsh-section-title">📚 Lesson History</h2>
                {!confirmClear ? (
                  <button
                    className="tmn-btn-ghost tmn-btn-sm dsh-clear-btn"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear all
                  </button>
                ) : (
                  <div className="dsh-clear-confirm">
                    <span>Remove all records?</span>
                    <button className="tmn-btn-ghost tmn-btn-sm" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </button>
                    <button className="tmn-btn-ghost tmn-btn-sm dsh-clear-yes" onClick={handleClearAll}>
                      Yes, clear
                    </button>
                  </div>
                )}
              </div>
              <div className="dsh-records">
                {records.map((r) => (
                  <RecordCard
                    key={r.id}
                    record={r}
                    onReopen={onStartTopic}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
