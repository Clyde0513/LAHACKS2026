import { useEffect, useRef, useState } from 'react';
import { generateRecap } from '../api/generateRecap';
import { saveLessonRecord } from '../lib/lessonHistory';
import type { LessonCompletion, RecapData, RelatedTopic } from '../types';
import './RecapScreen.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcQuizScore(responses: LessonCompletion['responses']): number {
  if (!responses.length) return 0;
  return Math.round((responses.filter((r) => r.isCorrect).length / responses.length) * 100);
}

function calcAvgConfidence(responses: LessonCompletion['responses']): number {
  if (!responses.length) return 0;
  const map = { low: 1, medium: 2, high: 3 };
  const total = responses.reduce((s, r) => s + map[r.confidence], 0);
  return Math.round((total / (responses.length * 3)) * 100);
}

function scoreColor(score: number): string {
  if (score >= 75) return '#34d399';
  if (score >= 50) return '#60a5fa';
  return '#fb923c';
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  const dash  = 251;
  const fill  = dash - (dash * score) / 100;
  return (
    <div className="rcp-ring-wrap">
      <svg viewBox="0 0 100 100" className="rcp-ring-svg">
        <circle className="rcp-ring-bg"   cx="50" cy="50" r="40" />
        <circle className="rcp-ring-fill" cx="50" cy="50" r="40"
          style={{ strokeDashoffset: fill, stroke: color }}
        />
      </svg>
      <div className="rcp-ring-inner">
        <span className="rcp-ring-pct" style={{ color }}>{score}%</span>
        <span className="rcp-ring-label">{label}</span>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function RecapSkeleton() {
  return (
    <div className="rcp-skel-wrap">
      <div className="rcp-skel rcp-skel-badge" />
      <div className="rcp-skel rcp-skel-title" />
      <div className="rcp-skel rcp-skel-sub"   />
      <div className="rcp-skel-row">
        <div className="rcp-skel rcp-skel-ring" />
        <div className="rcp-skel rcp-skel-ring" />
      </div>
      <div className="rcp-skel rcp-skel-section" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rcp-skel rcp-skel-line" />
      ))}
    </div>
  );
}

// ── Takeaway item (animated in) ───────────────────────────────────────────────
function Takeaway({ text, index }: { text: string; index: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 * index);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <li className={`rcp-takeaway${visible ? ' rcp-takeaway-visible' : ''}`}>
      <span className="rcp-takeaway-icon">✦</span>
      <span>{text}</span>
    </li>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Props {
  completion: LessonCompletion;
  onHome: () => void;
  onContinue: (topic: string) => void;
  onRestart: () => void;
  onDashboard: () => void;
}

export default function RecapScreen({
  completion,
  onHome,
  onContinue,
  onRestart,
  onDashboard,
}: Props) {
  const { roadmap, responses } = completion;
  const quizScore      = calcQuizScore(responses);
  const avgConfidence  = calcAvgConfidence(responses);

  const [recapStatus, setRecapStatus] = useState<
    { kind: 'loading' } | { kind: 'ready'; data: RecapData } | { kind: 'error'; message: string }
  >({ kind: 'loading' });
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(false);

  // Generate recap + auto-save on mount
  useEffect(() => {
    let cancelled = false;
    generateRecap(roadmap, responses)
      .then((data) => {
        if (cancelled) return;
        setRecapStatus({ kind: 'ready', data });

        // Save to history (once)
        if (!savedRef.current) {
          savedRef.current = true;
          saveLessonRecord({
            id:              `${roadmap.topic}-${Date.now()}`,
            topic:           roadmap.topic,
            difficulty:      roadmap.difficulty,
            totalDuration:   roadmap.totalDuration,
            moduleCount:     roadmap.modules.length,
            completedAt:     Date.now(),
            quizScore,
            avgConfidence,
            relatedTopics:   data.relatedTopics,
            uploadedPublicId: completion.uploadedPublicId,
          });
          setSaved(true);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setRecapStatus({ kind: 'error', message: e.message });
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    if (saved || recapStatus.kind !== 'ready') return;
    saveLessonRecord({
      id:              `${roadmap.topic}-${Date.now()}`,
      topic:           roadmap.topic,
      difficulty:      roadmap.difficulty,
      totalDuration:   roadmap.totalDuration,
      moduleCount:     roadmap.modules.length,
      completedAt:     Date.now(),
      quizScore,
      avgConfidence,
      relatedTopics:   recapStatus.data.relatedTopics,
      uploadedPublicId: completion.uploadedPublicId,
    });
    setSaved(true);
  };

  return (
    <div className="rcp-root">
      {/* ── Nav ── */}
      <header className="tmn-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <span className="rcp-nav-label">Lesson Recap</span>
        <div className="tmn-nav-actions">
          <button className="tmn-btn-ghost tmn-btn-sm" onClick={onDashboard}>
            📊 Dashboard
          </button>
          <button className="tmn-btn-ghost tmn-btn-sm" onClick={onHome}>
            ✕ Home
          </button>
        </div>
      </header>

      <main className="rcp-main">
        {/* ── Hero ── */}
        <div className="rcp-hero">
          <div className="rcp-hero-badge">
            <span>🎓</span>
            <span>Lesson Complete</span>
          </div>
          <h1 className="rcp-topic">{roadmap.topic}</h1>
          <div className="rcp-meta">
            <span className="rcp-meta-pill">{roadmap.difficulty}</span>
            <span className="rcp-meta-pill">{roadmap.totalDuration}</span>
            <span className="rcp-meta-pill">{roadmap.modules.length} modules</span>
          </div>
        </div>

        {/* ── Score rings ── */}
        {responses.length > 0 && (
          <div className="rcp-scores">
            <ScoreRing score={quizScore}     label="Quiz score"  />
            <div className="rcp-scores-divider" />
            <ScoreRing score={avgConfidence} label="Confidence"  />
          </div>
        )}

        {/* ── Loading / error / ready ── */}
        {recapStatus.kind === 'loading' && <RecapSkeleton />}

        {recapStatus.kind === 'error' && (
          <div className="rcp-error">
            <span>⚠️</span>
            <p>{recapStatus.message}</p>
          </div>
        )}

        {recapStatus.kind === 'ready' && (() => {
          const { data } = recapStatus;
          return (
            <>
              {/* Key takeaways */}
              <section className="rcp-section">
                <h2 className="rcp-section-title">✦ 5 Key Takeaways</h2>
                <ul className="rcp-takeaway-list">
                  {data.takeaways.map((t, i) => (
                    <Takeaway key={i} text={t} index={i} />
                  ))}
                </ul>
              </section>

              {/* Strengths / weak spots */}
              <div className="rcp-two-col">
                {data.strengths.length > 0 && (
                  <div className="rcp-col rcp-col-strength">
                    <h3 className="rcp-col-title">💪 Strengths</h3>
                    <ul className="rcp-col-list">
                      {data.strengths.map((s, i) => (
                        <li key={i} className="rcp-col-item">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.weakSpots.length > 0 && (
                  <div className="rcp-col rcp-col-weak">
                    <h3 className="rcp-col-title">🔍 Areas to revisit</h3>
                    <ul className="rcp-col-list">
                      {data.weakSpots.map((w, i) => (
                        <li key={i} className="rcp-col-item">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Related topics */}
              <section className="rcp-section">
                <h2 className="rcp-section-title">🚀 Continue Learning</h2>
                <p className="rcp-section-sub">Recommended based on what you just learned</p>
                <div className="rcp-related">
                  {data.relatedTopics.map((rt: RelatedTopic, i: number) => (
                    <button
                      key={i}
                      className="rcp-related-card"
                      onClick={() => onContinue(rt.topic)}
                    >
                      <span className="rcp-related-emoji">{rt.emoji}</span>
                      <div className="rcp-related-body">
                        <strong className="rcp-related-topic">{rt.topic}</strong>
                        <span className="rcp-related-reason">{rt.reason}</span>
                      </div>
                      <span className="rcp-related-arrow">→</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* CTAs */}
              <div className="rcp-actions">
                <button
                  className={`tmn-btn-ghost rcp-save-btn${saved ? ' rcp-saved' : ''}`}
                  onClick={handleSave}
                  disabled={saved}
                >
                  {saved ? '✓ Saved to dashboard' : '🔖 Save lesson'}
                </button>
                <button className="tmn-btn-ghost rcp-restart-btn" onClick={onRestart}>
                  ↺ Restart topic
                </button>
                <button className="tmn-btn-primary rcp-home-btn" onClick={onHome}>
                  ← Back to home
                </button>
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}
