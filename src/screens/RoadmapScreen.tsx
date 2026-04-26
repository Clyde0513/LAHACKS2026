import { useEffect, useState } from 'react';
import { generateRoadmap } from '../api/generateRoadmap';
import type { Difficulty } from '../api/generateRoadmap';
import type { Roadmap } from '../types';
import './RoadmapScreen.css';

// ── Cover gradient presets ───────────────────────────────────────────────────
const COVER_GRADIENTS = [
  { from: '#667eea', to: '#764ba2' },
  { from: '#f093fb', to: '#f5576c' },
  { from: '#4facfe', to: '#00f2fe' },
  { from: '#43e97b', to: '#38f9d7' },
  { from: '#fa709a', to: '#fee140' },
  { from: '#a78bfa', to: '#818cf8' },
  { from: '#fb923c', to: '#f43f5e' },
  { from: '#34d399', to: '#059669' },
];

const COVER_EMOJIS = [
  '⚛️','🎓','🔬','🎵','🌍','🧠','🔭','🎨',
  '🏛️','💻','🔗','📚','🌿','⚡','🎭','🏔️',
];

function topicHash(topic: string): number {
  let h = 0;
  for (let i = 0; i < topic.length; i++) {
    h = Math.imul(31, h) + topic.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function topicGradient(topic: string) {
  return COVER_GRADIENTS[topicHash(topic) % COVER_GRADIENTS.length];
}

function topicEmoji(topic: string) {
  return COVER_EMOJIS[topicHash(topic) % COVER_EMOJIS.length];
}

// ── Difficulty config ─────────────────────────────────────────────────────────
const DIFFICULTIES: { value: Difficulty; label: string; emoji: string; color: string }[] = [
  { value: 'simplified',   label: 'Simplified',   emoji: '🟢', color: '#34d399' },
  { value: 'beginner',     label: 'Beginner',     emoji: '🔵', color: '#60a5fa' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🟡', color: '#fbbf24' },
  { value: 'advanced',     label: 'Advanced',     emoji: '🔴', color: '#f87171' },
];

function diffColor(difficulty: string): string {
  return DIFFICULTIES.find((d) => d.label === difficulty)?.color ?? '#60a5fa';
}
function Skel({ w = '100%', h = '1rem', radius = '6px' }: { w?: string; h?: string; radius?: string }) {
  return <div className="rmn-skel" style={{ width: w, height: h, borderRadius: radius }} />;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  topic: string;
  onBack: () => void;
  onStart: (roadmap: Roadmap) => void;
}

// ── Status union ─────────────────────────────────────────────────────────────
type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; roadmap: Roadmap }
  | { kind: 'error'; message: string };

// ── Component ────────────────────────────────────────────────────────────────
export default function RoadmapScreen({ topic, onBack, onStart }: Props) {
  // Status is initialised as loading; subsequent resets happen in event
  // handlers (not inside effects) to avoid cascading-render warnings.
  const [status, setStatus]         = useState<Status>({ kind: 'loading' });
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [genKey, setGenKey]         = useState(0);

  const gradient = topicGradient(topic);
  const emoji    = topicEmoji(topic);

  useEffect(() => {
    let cancelled = false;

    generateRoadmap(topic, difficulty)
      .then((r) => { if (!cancelled) setStatus({ kind: 'ready', roadmap: r }); })
      .catch((e: Error) => { if (!cancelled) setStatus({ kind: 'error', message: e.message }); });

    return () => { cancelled = true; };
  }, [topic, difficulty, genKey]);

  // Event handlers set loading state themselves — safe because handlers are
  // not called during render, so there is no cascading-render concern.
  const handleRegenerate = () => {
    setStatus({ kind: 'loading' });
    setGenKey((k) => k + 1);
  };

  const handleDifficultyChange = (d: Difficulty) => {
    if (d === difficulty) return;
    setStatus({ kind: 'loading' });
    setDifficulty(d);
    setGenKey((k) => k + 1);
  };

  const isLoading = status.kind === 'loading';
  const roadmap   = status.kind === 'ready' ? status.roadmap : null;
  const errorMsg  = status.kind === 'error' ? status.message : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rmn-root">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="tmn-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <div className="tmn-nav-actions">
          <button className="tmn-btn-ghost" onClick={onBack}>← New topic</button>
        </div>
      </header>

      <main className="rmn-main">

        {/* ── Cover ───────────────────────────────────────────────────── */}
        <div
          className="rmn-cover"
          style={{ background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}
        >
          <div className="rmn-cover-overlay" />
          <div className="rmn-cover-content">
            {isLoading ? (
              <div className="rmn-cover-skeleton">
                <div className="rmn-skel rmn-skel-emoji" />
                <Skel w="55%" h="2.4rem" radius="10px" />
                <Skel w="75%" h="0.95rem" radius="6px" />
                <div className="rmn-cover-badges">
                  <Skel w="90px" h="26px" radius="999px" />
                  <Skel w="80px" h="26px" radius="999px" />
                  <Skel w="100px" h="26px" radius="999px" />
                </div>
              </div>
            ) : roadmap ? (
              <>
                <div className="rmn-cover-emoji">{emoji}</div>
                <h1 className="rmn-cover-title">{roadmap.topic}</h1>
                <p className="rmn-cover-tagline">{roadmap.tagline}</p>
                <div className="rmn-cover-badges">
                  <span className="rmn-badge rmn-badge-diff" style={{ color: diffColor(roadmap.difficulty) }}>
                    {DIFFICULTIES.find((d) => d.label === roadmap.difficulty)?.emoji ?? '🔵'}{' '}{roadmap.difficulty}
                  </span>
                  <span className="rmn-badge rmn-badge-dur">⏱ {roadmap.totalDuration}</span>
                  <span className="rmn-badge rmn-badge-mods">
                    📚 {roadmap.modules?.length ?? 0} modules
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* ── Error state ─────────────────────────────────────────────── */}
        {errorMsg ? (
          <div className="rmn-error">
            <span className="rmn-error-icon">⚠️</span>
            <p className="rmn-error-msg">{errorMsg}</p>
            <button className="tmn-btn-primary" onClick={handleRegenerate}>Try again</button>
          </div>
        ) : (

          /* ── Body ───────────────────────────────────────────────────── */
          <div className="rmn-body">

            {/* What you'll learn */}
            <section className="rmn-section">
              <h2 className="rmn-section-label">What you&apos;ll learn</h2>
              {isLoading ? (
                <div className="rmn-obj-list">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rmn-obj-item">
                      <div className="rmn-skel rmn-skel-check" />
                      <Skel w="65%" />
                    </div>
                  ))}
                </div>
              ) : roadmap ? (
                <ul className="rmn-obj-list">
                  {roadmap.objectives.map((obj, i) => (
                    <li key={i} className="rmn-obj-item">
                      <span className="rmn-obj-check" aria-hidden="true">✓</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* Lesson roadmap */}
            <section className="rmn-section">
              <h2 className="rmn-section-label">Lesson roadmap</h2>
              <div className="rmn-modules">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rmn-module-card rmn-module-skel">
                        <div className="rmn-skel rmn-skel-num" />
                        <div className="rmn-skel rmn-skel-icon" />
                        <div className="rmn-module-skel-text">
                          <Skel w="48%" h="0.95rem" />
                          <Skel w="76%" h="0.8rem" />
                        </div>
                        <div className="rmn-skel rmn-skel-dur" />
                      </div>
                    ))
                  : roadmap
                  ? roadmap.modules.map((mod, i) => (
                      <div key={mod.id} className="rmn-module-card">
                        <div className="rmn-module-num">{i + 1}</div>
                        <div className="rmn-module-icon" aria-hidden="true">{mod.icon}</div>
                        <div className="rmn-module-body">
                          <div className="rmn-module-title">{mod.title}</div>
                          <div className="rmn-module-desc">{mod.description}</div>
                        </div>
                        <div className="rmn-module-dur">{mod.duration}</div>
                      </div>
                    ))
                  : null}
              </div>
            </section>

          </div>
        )}
      </main>

      {/* ── Sticky action bar ───────────────────────────────────────────── */}
      {!errorMsg && (
        <div className="rmn-bar">
          <div className="rmn-bar-secondary">
            <div className="rmn-diff-picker">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={`rmn-diff-btn${difficulty === d.value ? ' rmn-diff-btn--active' : ''}`}
                  style={difficulty === d.value ? { borderColor: d.color, color: d.color } : {}}
                  disabled={isLoading}
                  onClick={() => handleDifficultyChange(d.value)}
                >
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
            <button
              className="tmn-btn-ghost rmn-bar-btn"
              disabled={isLoading}
              onClick={handleRegenerate}
            >
              🔄 Regenerate
            </button>
          </div>
          <button
            className="tmn-btn-primary tmn-btn-lg rmn-bar-start"
            disabled={isLoading || !roadmap}
            onClick={() => roadmap && onStart(roadmap)}
          >
            Start lesson →
          </button>
        </div>
      )}
    </div>
  );
}
