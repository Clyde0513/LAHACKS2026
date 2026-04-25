import { useState } from 'react';
import type { CheckpointData, Confidence, QuizResponse } from '../types';
import './CheckpointQuizScreen.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const CONFIDENCE_OPTIONS: { value: Confidence; label: string; emoji: string; color: string }[] = [
  { value: 'low',    label: 'Still unsure',  emoji: '🤔', color: '#fb923c' },
  { value: 'medium', label: 'Getting it',    emoji: '🙂', color: '#60a5fa' },
  { value: 'high',   label: 'Got it!',       emoji: '💪', color: '#34d399' },
];

function confidenceScore(responses: QuizResponse[]): number {
  if (!responses.length) return 0;
  const map: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };
  const total = responses.reduce((s, r) => s + map[r.confidence], 0);
  return Math.round((total / (responses.length * 3)) * 100);
}

function feedbackMessage(score: number, confidence: number): { headline: string; body: string } {
  if (score === 100) {
    return {
      headline: 'Perfect score! 🎉',
      body: 'You nailed every question. Keep that momentum going into the next module.',
    };
  }
  if (score >= 75) {
    return {
      headline: 'Great work! 👏',
      body: "You've got a solid grasp of this module. Review the ones you missed and you'll be unstoppable.",
    };
  }
  if (score >= 50) {
    return {
      headline: "Good effort! 🙌",
      body: 'Some concepts are sticking — go back and re-read the explanations for the ones that tripped you up.',
    };
  }
  return {
    headline: "Keep going! 💡",
    body: confidence >= 50
      ? "You're more confident than your score suggests — the details will click with more practice."
      : 'These concepts can be tricky. Try the "Simplify" button on earlier cards and come back.',
  };
}

// ── Per-question step ─────────────────────────────────────────────────────────
type QuestionPhase = 'answering' | 'revealed' | 'confidence';

interface QuestionStepProps {
  index: number;
  total: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  onRespond: (selectedIndex: number, confidence: Confidence) => void;
}

function QuestionStep({
  index,
  total,
  question,
  options,
  correctIndex,
  explanation,
  onRespond,
}: QuestionStepProps) {
  const [phase, setPhase]       = useState<QuestionPhase>('answering');
  const [selected, setSelected] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selected === null) return;
    setPhase('revealed');
  };

  const handleConfidence = (conf: Confidence) => {
    onRespond(selected!, conf);
  };

  const isCorrect = selected === correctIndex;

  return (
    <div className="cqz-question-step">
      {/* Header */}
      <div className="cqz-q-header">
        <span className="cqz-q-counter">Question {index + 1} of {total}</span>
        <div className="cqz-q-pips">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`cqz-pip${i < index ? ' cqz-pip-done' : i === index ? ' cqz-pip-active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <p className="cqz-q-text">{question}</p>

      {/* Options */}
      <ul className="cqz-options">
        {options.map((opt, i) => {
          let cls = 'cqz-option';
          if (phase !== 'answering') {
            if (i === correctIndex)     cls += ' cqz-opt-correct';
            else if (i === selected)    cls += ' cqz-opt-wrong';
            else                        cls += ' cqz-opt-dim';
          } else if (i === selected) {
            cls += ' cqz-opt-selected';
          }
          return (
            <li key={i}>
              <button
                className={cls}
                onClick={() => phase === 'answering' && setSelected(i)}
                disabled={phase !== 'answering'}
              >
                <span className="cqz-opt-letter">{String.fromCharCode(65 + i)}</span>
                <span className="cqz-opt-text">{opt}</span>
                {phase !== 'answering' && i === correctIndex && (
                  <span className="cqz-opt-tick">✓</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Feedback panel */}
      {phase === 'revealed' && (
        <div className={`cqz-feedback ${isCorrect ? 'cqz-feedback-correct' : 'cqz-feedback-wrong'}`}>
          <div className="cqz-feedback-icon">{isCorrect ? '🎉' : '💡'}</div>
          <div className="cqz-feedback-body">
            <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
            <p>{explanation}</p>
          </div>
        </div>
      )}

      {/* Submit / confidence */}
      {phase === 'answering' && (
        <button
          className="tmn-btn-primary cqz-submit"
          disabled={selected === null}
          onClick={handleSubmit}
        >
          Submit answer
        </button>
      )}

      {phase === 'revealed' && (
        <div className="cqz-confidence-row">
          <p className="cqz-confidence-label">How confident do you feel?</p>
          <div className="cqz-confidence-btns">
            {CONFIDENCE_OPTIONS.map((c) => (
              <button
                key={c.value}
                className="cqz-conf-btn"
                style={{ '--conf-color': c.color } as React.CSSProperties}
                onClick={() => handleConfidence(c.value)}
              >
                <span className="cqz-conf-emoji">{c.emoji}</span>
                <span className="cqz-conf-label">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
interface ResultsProps {
  data: CheckpointData;
  responses: QuizResponse[];
  onContinue: () => void;
  onReview: () => void;
}

function ResultsPanel({ data, responses, onContinue, onReview }: ResultsProps) {
  const correctCount = responses.filter((r) => r.isCorrect).length;
  const score        = Math.round((correctCount / responses.length) * 100);
  const confScore    = confidenceScore(responses);
  const { headline, body } = feedbackMessage(score, confScore);

  const confColor =
    confScore >= 75 ? '#34d399' : confScore >= 45 ? '#60a5fa' : '#fb923c';

  return (
    <div className="cqz-results">
      {/* Module badge */}
      <div className="cqz-results-module">
        <span>{data.moduleIcon}</span>
        <span>{data.moduleTitle} — checkpoint complete</span>
      </div>

      {/* Score ring + headline */}
      <div className="cqz-score-wrap">
        <div className="cqz-score-ring" style={{ '--score': score } as React.CSSProperties}>
          <svg viewBox="0 0 100 100" className="cqz-ring-svg">
            <circle className="cqz-ring-bg"  cx="50" cy="50" r="40" />
            <circle className="cqz-ring-fill" cx="50" cy="50" r="40"
              style={{ strokeDashoffset: `${251 - (251 * score) / 100}` }}
            />
          </svg>
          <div className="cqz-score-text">
            <span className="cqz-score-pct">{score}%</span>
            <span className="cqz-score-sub">{correctCount}/{responses.length}</span>
          </div>
        </div>

        <div className="cqz-score-right">
          <h2 className="cqz-headline">{headline}</h2>
          <p className="cqz-headline-body">{body}</p>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="cqz-conf-meter">
        <div className="cqz-conf-meter-label">
          <span>Confidence</span>
          <span style={{ color: confColor }}>{confScore}%</span>
        </div>
        <div className="cqz-conf-meter-bar">
          <div
            className="cqz-conf-meter-fill"
            style={{ width: `${confScore}%`, background: confColor }}
          />
        </div>
        <div className="cqz-conf-meter-desc">
          {confScore >= 75
            ? 'High confidence — you feel solid on this material.'
            : confScore >= 45
            ? 'Building confidence — a quick review will cement it.'
            : 'Low confidence — spend more time with the lesson cards.'}
        </div>
      </div>

      {/* Response history */}
      <div className="cqz-history">
        <h3 className="cqz-history-label">Response breakdown</h3>
        {responses.map((r, i) => {
          const confOpt = CONFIDENCE_OPTIONS.find((c) => c.value === r.confidence)!;
          return (
            <div key={r.cardId} className={`cqz-history-item ${r.isCorrect ? 'cqz-hist-ok' : 'cqz-hist-miss'}`}>
              <div className="cqz-hist-left">
                <span className="cqz-hist-num">{i + 1}</span>
                <span className="cqz-hist-icon">{r.isCorrect ? '✓' : '✗'}</span>
              </div>
              <div className="cqz-hist-body">
                <p className="cqz-hist-q">{r.question}</p>
                {!r.isCorrect && (
                  <p className="cqz-hist-expl">{r.explanation}</p>
                )}
              </div>
              <span
                className="cqz-hist-conf"
                style={{ color: confOpt.color }}
                title={`Confidence: ${confOpt.label}`}
              >
                {confOpt.emoji}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTAs */}
      <div className="cqz-results-actions">
        {score < 75 && (
          <button className="tmn-btn-ghost cqz-review-btn" onClick={onReview}>
            ← Review cards
          </button>
        )}
        <button className="tmn-btn-primary cqz-continue-btn" onClick={onContinue}>
          Continue lesson →
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Props {
  data: CheckpointData;
  onContinue: (responses: QuizResponse[]) => void;
  onReview: () => void;
}

export default function CheckpointQuizScreen({ data, onContinue, onReview }: Props) {
  const [responses, setResponses]   = useState<QuizResponse[]>([]);
  const [qIndex, setQIndex]         = useState(0);
  const [animKey, setAnimKey]       = useState(0);
  const [phase, setPhase]           = useState<'quiz' | 'results'>('quiz');

  const cards = data.cards;

  const handleRespond = (selectedIndex: number, confidence: Confidence) => {
    const card = cards[qIndex];
    const response: QuizResponse = {
      cardId:        card.id,
      question:      card.quizQuestion,
      selectedIndex,
      correctIndex:  card.quizCorrectIndex,
      isCorrect:     selectedIndex === card.quizCorrectIndex,
      confidence,
      explanation:   card.quizExplanation,
    };
    const updated = [...responses, response];
    setResponses(updated);

    if (qIndex + 1 < cards.length) {
      setAnimKey((k) => k + 1);
      setQIndex((q) => q + 1);
    } else {
      setPhase('results');
    }
  };

  return (
    <div className="cqz-root">
      {/* Nav */}
      <header className="tmn-nav cqz-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <div className="cqz-nav-badge">
          <span>{data.moduleIcon}</span>
          <span>Checkpoint · {data.moduleTitle}</span>
        </div>
        <button className="tmn-btn-ghost cqz-nav-back" onClick={onReview}>
          ✕ Exit
        </button>
      </header>

      <main className="cqz-main">
        {phase === 'quiz' ? (
          <div key={animKey} className="cqz-step-wrap">
            <div className="cqz-intro-banner">
              <span className="cqz-intro-icon">🏁</span>
              <div>
                <strong>Module checkpoint</strong>
                <span>{data.moduleTitle}</span>
              </div>
            </div>
            <QuestionStep
              key={qIndex}
              index={qIndex}
              total={cards.length}
              question={cards[qIndex].quizQuestion}
              options={cards[qIndex].quizOptions}
              correctIndex={cards[qIndex].quizCorrectIndex}
              explanation={cards[qIndex].quizExplanation}
              onRespond={handleRespond}
            />
          </div>
        ) : (
          <ResultsPanel
            data={data}
            responses={responses}
            onContinue={() => onContinue(responses)}
            onReview={onReview}
          />
        )}
      </main>
    </div>
  );
}
