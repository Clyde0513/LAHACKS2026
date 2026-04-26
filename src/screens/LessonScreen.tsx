import { useEffect, useRef, useState } from 'react';
import { AdvancedImage, lazyload, placeholder } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/format';
import { auto as autoQuality } from '@cloudinary/url-gen/qualifiers/quality';
import { autoGravity, compass } from '@cloudinary/url-gen/qualifiers/gravity';
import { source as overlaySource } from '@cloudinary/url-gen/actions/overlay';
import { text as textSource } from '@cloudinary/url-gen/qualifiers/source';
import { TextStyle } from '@cloudinary/url-gen/qualifiers/textStyle';
import { Position } from '@cloudinary/url-gen/qualifiers/position';
import { improve } from '@cloudinary/url-gen/actions/adjust';
import { cld } from '../cloudinary/config';
import { generateLesson, simplifyCard, anotherExample } from '../api/generateLesson';
import type { CheckpointData, Lesson, LessonCard, QuizResponse, Roadmap } from '../types';
import CheckpointQuizScreen from './CheckpointQuizScreen';
import './LessonScreen.css';

// ── Visual config ─────────────────────────────────────────────────────────────
// Cloudinary sample images used as concept visuals with SDK transformations
const VISUAL_SAMPLES = [
  'samples/landscapes/nature-mountains',
  'samples/landscapes/beach-boat',
  'samples/landscapes/architecture-signs',
  'samples/balloons',
  'samples/people/bicycle',
  'samples/people/boy-snow-hoodie',
  'samples/animals/cat',
  'samples/animals/kitten-playing',
  'samples/food/spices',
  'samples/food/fish-vegetables',
];

const CARD_GRADIENTS = [
  { from: '#1a1a2e', to: '#16213e', accent: '#7c6ff7' },
  { from: '#0f2027', to: '#203a43', accent: '#4facfe' },
  { from: '#1a0533', to: '#2d1b69', accent: '#c084fc' },
  { from: '#0d1f0d', to: '#1a3a1a', accent: '#34d399' },
  { from: '#1f0d0d', to: '#3a1a1a', accent: '#fb923c' },
  { from: '#0d1a33', to: '#1a2d5a', accent: '#60a5fa' },
];

function cardGradient(index: number) {
  return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

function sampleForCard(index: number) {
  return VISUAL_SAMPLES[index % VISUAL_SAMPLES.length];
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="lsn-loading">
      <div className="lsn-loading-bar" />
      <div className="lsn-loading-card">
        <div className="lsn-skel lsn-skel-module" />
        <div className="lsn-skel lsn-skel-visual" />
        <div className="lsn-skel lsn-skel-title" />
        <div className="lsn-skel lsn-skel-line" />
        <div className="lsn-skel lsn-skel-line lsn-skel-line-short" />
        <div className="lsn-skel lsn-skel-analogy" />
        <div className="lsn-loading-terms">
          {[1, 2, 3].map((i) => <div key={i} className="lsn-skel lsn-skel-term" />)}
        </div>
      </div>
      <p className="lsn-loading-label">Building your lesson…</p>
    </div>
  );
}

// ── Quiz overlay ──────────────────────────────────────────────────────────────
interface QuizProps {
  card: LessonCard;
  onClose: () => void;
}
function QuizOverlay({ card, onClose }: QuizProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed]  = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setRevealed(true);
  };

  const correct = selected === card.quizCorrectIndex;

  return (
    <div className="lsn-quiz-backdrop" role="dialog" aria-modal="true">
      <div className="lsn-quiz">
        <div className="lsn-quiz-header">
          <span className="lsn-quiz-label">❓ Quick check</span>
          <button className="lsn-quiz-close" onClick={onClose} aria-label="Close quiz">✕</button>
        </div>

        <p className="lsn-quiz-question">{card.quizQuestion}</p>

        <ul className="lsn-quiz-options">
          {card.quizOptions.map((opt, i) => {
            let cls = 'lsn-quiz-option';
            if (revealed) {
              if (i === card.quizCorrectIndex) cls += ' lsn-quiz-correct';
              else if (i === selected) cls += ' lsn-quiz-wrong';
            } else if (i === selected) {
              cls += ' lsn-quiz-selected';
            }
            return (
              <li key={i}>
                <button
                  className={cls}
                  onClick={() => !revealed && setSelected(i)}
                  disabled={revealed}
                >
                  <span className="lsn-quiz-letter">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>

        {!revealed ? (
          <button
            className="tmn-btn-primary lsn-quiz-submit"
            disabled={selected === null}
            onClick={handleSubmit}
          >
            Submit answer
          </button>
        ) : (
          <div className={`lsn-quiz-result ${correct ? 'lsn-result-correct' : 'lsn-result-wrong'}`}>
            <span className="lsn-result-icon">{correct ? '🎉' : '💡'}</span>
            <div>
              <strong>{correct ? 'Correct!' : 'Not quite.'}</strong>
              <p>{card.quizExplanation}</p>
            </div>
            <button className="tmn-btn-primary lsn-quiz-continue" onClick={onClose}>
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card visual using Cloudinary ──────────────────────────────────────────────
// Cloudinary fetch delivery: proxy any public URL through Cloudinary CDN,
// applying transformations (crop, enhance, overlay) + f_auto/q_auto —
// without uploading to your account. Result is cached on Cloudinary's edge.
function buildVisualImage(
  cardIndex: number,
  uploadedPublicId: string | undefined,
  moduleTitle: string,
  imageKeyword: string | undefined,
) {
  const addOverlay = (img: ReturnType<typeof cld.image>, label: string) =>
    img.overlay(
      overlaySource(
        textSource(label, new TextStyle('Arial', 24).fontWeight('bold')).textColor('white'),
      ).position(new Position().gravity(compass('south_west')).offsetX(16).offsetY(14)),
    );

  const withDelivery = (img: ReturnType<typeof cld.image>) =>
    img.delivery(format(auto())).delivery(quality(autoQuality()));

  if (uploadedPublicId) {
    return withDelivery(
      cld.image(uploadedPublicId)
        .resize(fill().width(700).height(320).gravity(autoGravity()))
        .adjust(improve()),
    );
  }

  if (imageKeyword) {
    // Cloudinary fetch: pull a contextually relevant image from Unsplash by keyword
    const unsplashUrl = `https://source.unsplash.com/featured/700x320/?${encodeURIComponent(imageKeyword)}`;
    const img = cld.image(unsplashUrl)
      .setDeliveryType('fetch')
      .resize(fill().width(700).height(320).gravity(autoGravity()))
      .adjust(improve());
    const label = moduleTitle.length > 36 ? moduleTitle.slice(0, 34) + '\u2026' : moduleTitle;
    return withDelivery(addOverlay(img, label));
  }

  // Fallback: static Cloudinary sample (always works, no external fetch needed)
  const label = moduleTitle.length > 36 ? moduleTitle.slice(0, 34) + '\u2026' : moduleTitle;
  return withDelivery(
    addOverlay(
      cld.image(sampleForCard(cardIndex))
        .resize(fill().width(700).height(320).gravity(autoGravity()))
        .adjust(improve()),
      label,
    ),
  );
}

interface VisualProps {
  cardIndex: number;
  uploadedPublicId?: string;
  moduleTitle: string;
  imageKeyword?: string;
}
function ConceptVisual({ cardIndex, uploadedPublicId, moduleTitle, imageKeyword }: VisualProps) {
  const [imgError, setImgError] = useState(false);

  const cldImg = buildVisualImage(cardIndex, uploadedPublicId, moduleTitle, imgError ? undefined : imageKeyword);

  return (
    <div className="lsn-visual-img-wrap">
      <AdvancedImage
        cldImg={cldImg}
        plugins={[placeholder({ mode: 'blur' }), lazyload()]}
        alt={moduleTitle}
        className="lsn-visual-img"
        onError={() => setImgError(true)}
      />
      <span className="lsn-visual-badge">✦ Cloudinary AI</span>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
interface Props {
  roadmap: Roadmap;
  onBack: () => void;
  onFinish: (responses: QuizResponse[]) => void;
  uploadedPublicId?: string;
}

type LessonStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; lesson: Lesson }
  | { kind: 'error'; message: string };

type CardAction = 'simplify' | 'example' | null;

export default function LessonScreen({ roadmap, onBack, onFinish, uploadedPublicId }: Props) {
  const [status, setStatus]       = useState<LessonStatus>({ kind: 'loading' });
  const [cardIndex, setCardIndex] = useState(0);
  const [animDir, setAnimDir]     = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey]     = useState(0);
  const [quizOpen, setQuizOpen]           = useState(false);
  const [cardAction, setCardAction]       = useState<CardAction>(null);
  const [overrideCard, setOverrideCard]   = useState<Partial<LessonCard> | null>(null);
  const [checkpoint, setCheckpoint]       = useState<CheckpointData | null>(null);
  const [allResponses, setAllResponses]   = useState<QuizResponse[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Load lesson ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    generateLesson(roadmap)
      .then((lesson) => { if (!cancelled) setStatus({ kind: 'ready', lesson }); })
      .catch((e: Error) => { if (!cancelled) setStatus({ kind: 'error', message: e.message }); });
    return () => { cancelled = true; };
  }, [roadmap]);

  if (status.kind === 'loading') {
    return (
      <div className="lsn-root">
        <NavBar onBack={onBack} progress={0} label="Generating lesson…" />
        <LoadingSkeleton />
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="lsn-root">
        <NavBar onBack={onBack} progress={0} label="Error" />
        <div className="lsn-error">
          <span>⚠️</span>
          <p>{status.message}</p>
          <button className="tmn-btn-primary" onClick={onBack}>Go back</button>
        </div>
      </div>
    );
  }

  const { lesson } = status;
  const totalCards  = lesson.cards.length;
  const baseCard    = lesson.cards[cardIndex];
  // Merge any override (simplified / new example) on top of base card
  const card: LessonCard = overrideCard ? { ...baseCard, ...overrideCard } : baseCard;
  const progress = Math.round(((cardIndex + 1) / totalCards) * 100);
  const grad = cardGradient(cardIndex);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = (dir: 'prev' | 'next') => {
    const next = dir === 'next' ? cardIndex + 1 : cardIndex - 1;
    if (next < 0 || next >= totalCards) return;

    // Detect module boundary → show checkpoint before advancing
    if (
      dir === 'next' &&
      lesson.cards[next].moduleId !== lesson.cards[cardIndex].moduleId
    ) {
      const currentModuleId = lesson.cards[cardIndex].moduleId;
      const moduleCards = lesson.cards.filter((c) => c.moduleId === currentModuleId);
      setCheckpoint({
        moduleId: currentModuleId,
        moduleTitle: lesson.cards[cardIndex].moduleTitle,
        moduleIcon: lesson.cards[cardIndex].moduleIcon,
        cards: moduleCards,
        resumeIndex: next,
      });
      return;
    }

    setOverrideCard(null);
    setAnimDir(dir === 'next' ? 'left' : 'right');
    setAnimKey((k) => k + 1);
    setCardIndex(next);
  };

  // ── Card actions ─────────────────────────────────────────────────────────────
  const handleSimplify = async () => {
    if (cardAction) return;
    setCardAction('simplify');
    try {
      const simplified = await simplifyCard(baseCard);
      setOverrideCard(simplified);
    } catch {
      // silently keep original
    } finally {
      setCardAction(null);
    }
  };

  const handleAnotherExample = async () => {
    if (cardAction) return;
    setCardAction('example');
    try {
      const newAnalogy = await anotherExample(baseCard);
      setOverrideCard((prev) => ({ ...prev, analogy: newAnalogy }));
    } catch {
      // silently keep original
    } finally {
      setCardAction(null);
    }
  };

  const isLast = cardIndex === totalCards - 1;

  return (
    <div className="lsn-root">
      {/* ── Nav + progress ─────────────────────────────────────────────── */}
      <NavBar
        onBack={onBack}
        progress={progress}
        label={`${cardIndex + 1} / ${totalCards} · ${card.moduleTitle}`}
      />

      {/* ── Card ────────────────────────────────────────────────────────── */}
      <main className="lsn-main">
        <div
          key={animKey}
          ref={cardRef}
          className={`lsn-card lsn-anim-${animDir}`}
          style={{
            background: `linear-gradient(160deg, ${grad.from} 0%, ${grad.to} 100%)`,
            borderColor: `${grad.accent}22`,
          }}
        >
          {/* Module header */}
          <div className="lsn-module-tag">
            <span>{card.moduleIcon}</span>
            <span>{card.moduleTitle}</span>
          </div>

          {/* Cloudinary visual — contextual image fetched via Cloudinary + smart-crop + AI-enhance */}
          <ConceptVisual
            cardIndex={cardIndex}
            uploadedPublicId={uploadedPublicId}
            moduleTitle={card.moduleTitle}
            imageKeyword={card.imageKeyword}
          />

          {/* Concept title */}
          <h1 className="lsn-card-title" style={{ color: grad.accent }}>{card.title}</h1>

          {/* Explanation */}
          <p className="lsn-explanation">{card.explanation}</p>

          {/* Analogy */}
          <div className="lsn-analogy-block">
            <span className="lsn-analogy-icon">💡</span>
            <p className="lsn-analogy-text">
              {cardAction === 'example'
                ? <span className="lsn-generating">Generating new example…</span>
                : card.analogy}
            </p>
          </div>

          {/* Key terms */}
          <div className="lsn-terms">
            <h3 className="lsn-terms-label">Key terms</h3>
            <dl className="lsn-terms-grid">
              {(cardAction === 'simplify'
                ? card.keyTerms.map((kt) => ({ ...kt, definition: '…' }))
                : card.keyTerms
              ).map((kt) => (
                <div key={kt.term} className="lsn-term-item">
                  <dt className="lsn-term-word" style={{ color: grad.accent }}>{kt.term}</dt>
                  <dd className="lsn-term-def">
                    {cardAction === 'simplify' && kt.definition === '…'
                      ? <span className="lsn-generating">Simplifying…</span>
                      : kt.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Action row ────────────────────────────────────────────────── */}
        <div className="lsn-actions">
          <button
            className={`lsn-action-btn${cardAction === 'simplify' ? ' lsn-action-busy' : ''}`}
            onClick={handleSimplify}
            disabled={!!cardAction}
            title="Rewrite this card in simpler terms"
          >
            {cardAction === 'simplify' ? '⏳' : '🧩'} Simplify
          </button>
          <button
            className={`lsn-action-btn${cardAction === 'example' ? ' lsn-action-busy' : ''}`}
            onClick={handleAnotherExample}
            disabled={!!cardAction}
            title="Get a fresh analogy for this concept"
          >
            {cardAction === 'example' ? '⏳' : '🔄'} New example
          </button>
          <button
            className="lsn-action-btn lsn-action-quiz"
            onClick={() => setQuizOpen(true)}
            title="Test your understanding"
          >
            ❓ Quiz me
          </button>
        </div>
      </main>

      {/* ── Bottom nav bar ──────────────────────────────────────────────── */}
      <div className="lsn-bar">
        <button
          className="tmn-btn-ghost lsn-bar-prev"
          onClick={() => navigate('prev')}
          disabled={cardIndex === 0}
        >
          ← Previous
        </button>

        <div className="lsn-bar-dots">
          {lesson.cards.map((_, i) => (
            <button
              key={i}
              className={`lsn-dot${i === cardIndex ? ' lsn-dot-active' : ''}${i < cardIndex ? ' lsn-dot-done' : ''}`}
              onClick={() => {
                setOverrideCard(null);
                setAnimDir(i > cardIndex ? 'left' : 'right');
                setAnimKey((k) => k + 1);
                setCardIndex(i);
              }}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>

        {isLast ? (
          <button className="tmn-btn-primary lsn-bar-finish" onClick={() => onFinish(allResponses)}>
            Finish lesson 🎓
          </button>
        ) : (
          <button
            className="tmn-btn-primary lsn-bar-next"
            onClick={() => navigate('next')}
          >
            Next →
          </button>
        )}
      </div>

      {/* ── Quiz overlay ────────────────────────────────────────────────── */}
      {quizOpen && (
        <QuizOverlay card={card} onClose={() => setQuizOpen(false)} />
      )}

      {/* ── Checkpoint quiz overlay ─────────────────────────────────────── */}
      {checkpoint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto' }}>
          <CheckpointQuizScreen
            data={checkpoint}
            onContinue={(responses: QuizResponse[]) => {
              setAllResponses((prev) => [...prev, ...responses]);
              const resumeTo = checkpoint.resumeIndex;
              setCheckpoint(null);
              setOverrideCard(null);
              setAnimDir('left');
              setAnimKey((k) => k + 1);
              setCardIndex(resumeTo);
            }}
            onReview={() => setCheckpoint(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Shared nav component ──────────────────────────────────────────────────────
function NavBar({
  onBack,
  progress,
  label,
}: {
  onBack: () => void;
  progress: number;
  label: string;
}) {
  return (
    <header className="lsn-nav">
      <div className="tmn-nav-logo">
        <span className="tmn-logo-icon">✦</span>
        <span className="tmn-logo-text">TeachMeNew</span>
      </div>
      <span className="lsn-nav-label">{label}</span>
      <button className="tmn-btn-ghost lsn-nav-back" onClick={onBack}>✕ Exit</button>
      <div className="lsn-progress-bar">
        <div className="lsn-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}
