import { useState, useRef, useCallback, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { AdvancedImage, lazyload, placeholder } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/format';
import { auto as autoQuality } from '@cloudinary/url-gen/qualifiers/quality';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { improve } from '@cloudinary/url-gen/actions/adjust';
import { cld } from '../cloudinary/config';
import { analyzeUpload } from '../api/analyzeUpload';
import type { UploadAnalysis, UploadQuizItem } from '../types';
import './UploadLearnScreen.css';

// ── Cloudinary upload ─────────────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<{ publicId: string; url: string }> {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Upload failed (${res.status})`);
  }
  const data = await res.json() as { public_id: string; secure_url: string };
  return { publicId: data.public_id, url: data.secure_url };
}

// ── Phase discriminated union ────────────────────────────────────────────────
type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; preview: string }
  | { kind: 'analyzing'; publicId: string; url: string; preview: string }
  | { kind: 'results';   publicId: string; url: string; preview: string; analysis: UploadAnalysis };

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({
  onFile,
  busy,
  preview,
  error,
}: {
  onFile: (f: File) => void;
  busy: boolean;
  preview?: string;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={[
        'upl-zone',
        dragging ? 'upl-zone-drag' : '',
        busy ? 'upl-zone-busy' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !busy && fileRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload image — click or drag and drop"
      onKeyDown={(e) => e.key === 'Enter' && !busy && fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="upl-file-hidden"
        onChange={handleChange}
      />

      {busy && preview ? (
        <div className="upl-zone-progress">
          <img className="upl-zone-thumb" src={preview} alt="" />
          <div className="upl-zone-spinner-row">
            <span className="upl-spinner" />
            <span>Uploading…</span>
          </div>
        </div>
      ) : (
        <>
          <span className="upl-zone-icon">📤</span>
          <p className="upl-zone-primary">Drag &amp; drop an image here</p>
          <p className="upl-zone-secondary">
            or <span className="upl-zone-link">click to browse</span>
          </p>
          <p className="upl-zone-hint">JPG · PNG · WEBP · GIF · Max 10 MB</p>
          {error && <p className="upl-zone-error">{error}</p>}
        </>
      )}
    </div>
  );
}

// ── Analyzing skeleton ────────────────────────────────────────────────────────
function AnalyzingSkeleton({ preview }: { preview: string }) {
  return (
    <div className="upl-skel-wrap">
      <div className="upl-skel-img-wrap">
        <img className="upl-skel-preview" src={preview} alt="" />
        <div className="upl-skel-overlay">
          <span className="upl-analyzing-dot" />
          <span>Analyzing with AI…</span>
        </div>
      </div>
      <div className="upl-skel-lines">
        <div className="upl-skel upl-skel-badge" />
        <div className="upl-skel upl-skel-title" />
        <div className="upl-skel upl-skel-line" />
        <div className="upl-skel upl-skel-line upl-skel-short" />
        <div className="upl-skel-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="upl-skel upl-skel-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mini quiz ─────────────────────────────────────────────────────────────────
type QuizAnswer = { selectedIndex: number; revealed: boolean } | null;

function MiniQuiz({
  questions,
  onAllDone,
}: {
  questions: UploadQuizItem[];
  onAllDone: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<QuizAnswer[]>(() => questions.map(() => null));
  const onAllDoneRef = useRef(onAllDone);
  onAllDoneRef.current = onAllDone;

  const handleSelect = (qi: number, oi: number) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === qi && a === null ? { selectedIndex: oi, revealed: false } : a)),
    );
  };

  const handleSubmit = (qi: number) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === qi && a && !a.revealed ? { ...a, revealed: true } : a)),
    );
  };

  const allRevealed = answers.every((a) => a?.revealed);
  const score = answers.filter(
    (a, i) => a?.revealed && a.selectedIndex === questions[i].correctIndex,
  ).length;

  useEffect(() => {
    if (allRevealed) {
      onAllDoneRef.current(score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed]);

  return (
    <div className="upl-quiz">
      {questions.map((q, qi) => {
        const answer  = answers[qi];
        const revealed = answer?.revealed ?? false;
        const isCorrect = answer?.selectedIndex === q.correctIndex;

        return (
          <div key={qi} className="upl-quiz-card">
            <p className="upl-quiz-q">
              <span className="upl-quiz-num">{qi + 1}</span>
              {q.question}
            </p>

            <ul className="upl-quiz-opts">
              {q.options.map((opt, oi) => {
                let cls = 'upl-qopt';
                if (revealed) {
                  if (oi === q.correctIndex)          cls += ' upl-qopt-correct';
                  else if (oi === answer?.selectedIndex) cls += ' upl-qopt-wrong';
                  else                                   cls += ' upl-qopt-dim';
                } else if (oi === answer?.selectedIndex) {
                  cls += ' upl-qopt-selected';
                }
                return (
                  <li key={oi}>
                    <button
                      className={cls}
                      onClick={() => !revealed && handleSelect(qi, oi)}
                      disabled={revealed}
                    >
                      <span className="upl-qopt-letter">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  </li>
                );
              })}
            </ul>

            {answer && !revealed && (
              <button
                className="tmn-btn-primary upl-quiz-submit"
                onClick={() => handleSubmit(qi)}
              >
                Submit answer
              </button>
            )}

            {revealed && (
              <div className={`upl-qfeedback ${isCorrect ? 'upl-qfb-ok' : 'upl-qfb-miss'}`}>
                <span className="upl-qfb-icon">{isCorrect ? '✓' : '✗'}</span>
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Results view ──────────────────────────────────────────────────────────────
function ResultsView({
  publicId,
  preview,
  analysis,
  onStartLesson,
}: {
  publicId: string;
  preview: string;
  analysis: UploadAnalysis;
  onStartLesson: () => void;
}) {
  const [showQuiz, setShowQuiz]   = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [imgErr, setImgErr]       = useState(false);

  // Cloudinary-optimized: smart auto-crop + AI enhance
  const cldImg = cld
    .image(publicId)
    .resize(fill().width(640).height(360).gravity(autoGravity()))
    .adjust(improve())
    .delivery(format(auto()))
    .delivery(quality(autoQuality()));

  return (
    <div className="upl-results">
      {/* ── Image + detected topic ── */}
      <div className="upl-preview-row">
        <div className="upl-preview-img-wrap">
          {imgErr ? (
            <img className="upl-preview-img" src={preview} alt="Uploaded content" />
          ) : (
            <AdvancedImage
              cldImg={cldImg}
              plugins={[placeholder({ mode: 'blur' }), lazyload()]}
              alt="Uploaded content"
              className="upl-preview-img"
              onError={() => setImgErr(true)}
            />
          )}
          <span className="upl-cld-badge">✦ Smart crop via Cloudinary</span>
        </div>
        <div className="upl-preview-meta">
          <span className="upl-topic-badge">🏷️ {analysis.topic}</span>
          <p className="upl-summary">{analysis.summary}</p>
        </div>
      </div>

      {/* ── Key concepts ── */}
      <section className="upl-section">
        <h2 className="upl-section-title">🧠 Key Concepts</h2>
        <div className="upl-concepts-grid">
          {analysis.concepts.map((c, i) => (
            <div key={i} className="upl-concept-card">
              <h3 className="upl-concept-title">{c.title}</h3>
              <p className="upl-concept-body">{c.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Glossary ── */}
      <section className="upl-section">
        <h2 className="upl-section-title">📖 Glossary</h2>
        <dl className="upl-glossary">
          {analysis.glossary.map((g, i) => (
            <div key={i} className="upl-gloss-item">
              <dt className="upl-gloss-term">{g.term}</dt>
              <dd className="upl-gloss-def">{g.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Actions ── */}
      <div className="upl-actions">
        {!showQuiz && (
          <button
            className="tmn-btn-ghost upl-quiz-btn"
            onClick={() => setShowQuiz(true)}
          >
            📝 Generate quiz
          </button>
        )}
        <button className="tmn-btn-primary upl-lesson-btn" onClick={onStartLesson}>
          Start full lesson on &ldquo;{analysis.topic}&rdquo; →
        </button>
      </div>

      {/* ── Quiz ── */}
      {showQuiz && (
        <section className="upl-section">
          <h2 className="upl-section-title">📝 Quiz</h2>
          <p className="upl-section-sub">Based on your uploaded content</p>
          <MiniQuiz
            questions={analysis.quiz}
            onAllDone={(s) => setQuizScore(s)}
          />
          {quizScore !== null && (
            <div className="upl-quiz-result">
              <div className="upl-quiz-result-score">
                <span className="upl-result-num">{quizScore}</span>
                <span className="upl-result-denom">/ {analysis.quiz.length}</span>
              </div>
              <div className="upl-quiz-result-body">
                <strong>
                  {quizScore === analysis.quiz.length
                    ? 'Perfect! 🎉'
                    : quizScore >= Math.ceil(analysis.quiz.length * 0.67)
                    ? 'Nice work! 👏'
                    : 'Keep going! 💡'}
                </strong>
                <p>
                  {quizScore === analysis.quiz.length
                    ? "You've mastered the basics from this image."
                    : 'Start a full lesson to dive deeper.'}
                </p>
                <button className="tmn-btn-primary upl-lesson-btn" onClick={onStartLesson}>
                  Start full lesson →
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
interface Props {
  onBack: () => void;
  onStartLesson: (topic: string, publicId: string) => void;
}

export default function UploadLearnScreen({ onBack, onStartLesson }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | undefined>();

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP, GIF)');
      return;
    }
    setError(undefined);
    const preview = URL.createObjectURL(file);
    setPhase({ kind: 'uploading', preview });

    try {
      const { publicId, url } = await uploadToCloudinary(file);
      setPhase({ kind: 'analyzing', publicId, url, preview });
      const analysis = await analyzeUpload(url);
      setPhase({ kind: 'results', publicId, url, preview, analysis });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPhase({ kind: 'idle' });
    }
  }, []);

  const handleReset = () => {
    if (phase.kind !== 'idle' && 'preview' in phase) {
      URL.revokeObjectURL(phase.preview);
    }
    setPhase({ kind: 'idle' });
    setError(undefined);
  };

  return (
    <div className="upl-root">
      {/* ── Nav ── */}
      <header className="tmn-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <span className="upl-nav-label">Upload to Learn</span>
        <div className="tmn-nav-actions">
          {phase.kind !== 'idle' && (
            <button className="tmn-btn-ghost tmn-btn-sm" onClick={handleReset}>
              ↺ New upload
            </button>
          )}
          <button className="tmn-btn-ghost tmn-btn-sm" onClick={onBack}>
            ← Back
          </button>
        </div>
      </header>

      <main className="upl-main">
        {/* ── Idle / Uploading ── */}
        {(phase.kind === 'idle' || phase.kind === 'uploading') && (
          <div className="upl-landing">
            <div className="upl-landing-header">
              <h1 className="upl-headline">
                Learn from <span className="upl-accent">your media</span>
              </h1>
              <p className="upl-subline">
                Upload a photo, screenshot, or diagram — AI extracts the
                concepts and builds you a lesson in seconds.
              </p>
            </div>
            <DropZone
              onFile={processFile}
              busy={phase.kind === 'uploading'}
              preview={phase.kind === 'uploading' ? phase.preview : undefined}
              error={error}
            />
            <div className="upl-examples">
              <span className="upl-examples-label">Works great with:</span>
              {['Textbook pages 📚', 'Diagrams 📊', 'Whiteboard photos 🖊️', 'Infographics 🗺️'].map(
                (ex) => (
                  <span key={ex} className="upl-example-chip">{ex}</span>
                ),
              )}
            </div>
          </div>
        )}

        {/* ── Analyzing ── */}
        {phase.kind === 'analyzing' && (
          <AnalyzingSkeleton preview={phase.preview} />
        )}

        {/* ── Results ── */}
        {phase.kind === 'results' && (
          <ResultsView
            publicId={phase.publicId}
            preview={phase.preview}
            analysis={phase.analysis}
            onStartLesson={() => onStartLesson(phase.analysis.topic, phase.publicId)}
          />
        )}
      </main>
    </div>
  );
}
