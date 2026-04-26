import { useState, useRef, useEffect } from 'react';
import RoadmapScreen from './screens/RoadmapScreen';
import LessonScreen from './screens/LessonScreen';
import UploadLearnScreen from './screens/UploadLearnScreen';
import RecapScreen from './screens/RecapScreen';
import DashboardScreen from './screens/DashboardScreen';
import AuthScreen from './screens/AuthScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import { useAuth } from './context/AuthContext';
import type { LessonCompletion, Roadmap } from './types';
import './App.css';

type Screen = 'home' | 'roadmap' | 'lesson' | 'upload' | 'recap' | 'dashboard' | 'forgot-password' | 'reset-password';

const SUGGESTED_TOPICS = [
  { label: 'Quantum Computing', emoji: '⚛️' },
  { label: 'Music Theory', emoji: '🎵' },
  { label: 'Japanese Cooking', emoji: '🍱' },
  { label: 'Machine Learning', emoji: '🤖' },
  { label: 'Climate Science', emoji: '🌍' },
  { label: 'Philosophy of Mind', emoji: '🧠' },
  { label: 'Astrophysics', emoji: '🔭' },
  { label: 'Origami', emoji: '🦢' },
  { label: 'Blockchain', emoji: '🔗' },
  { label: 'Stoicism', emoji: '🏛️' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Pick a topic',
    desc: "Type anything you're curious about or choose from our suggestions.",
  },
  {
    step: '02',
    title: 'Get a visual roadmap',
    desc: 'AI builds a structured lesson plan with concept cards, diagrams, and media.',
  },
  {
    step: '03',
    title: 'Learn in 15 minutes',
    desc: 'Move through bite-sized cards, answer quizzes, and test your understanding.',
  },
];

function App() {
  const { user, loading, signOut } = useAuth();
  const [screen, setScreen]             = useState<Screen>('home');
  const [activeTopic, setActiveTopic]   = useState('');
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  // uploadedPublicId: set ONLY by UploadLearnScreen and consumed when the lesson starts.
  // lessonPublicId:   the ID actually in use for the current lesson (snapshot at lesson start).
  const [uploadedPublicId, setUploadedPublicId] = useState<string | undefined>();
  const [lessonPublicId, setLessonPublicId]     = useState<string | undefined>();
  const [activeCompletion, setActiveCompletion] = useState<LessonCompletion | null>(null);

  const [topic, setTopic]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Logo: generated once via DALL-E, cached in localStorage forever ─────
  const LOGO_KEY = 'tmn-logo-url-v1';
  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem(LOGO_KEY));

  useEffect(() => {
    if (logoUrl) return; // already have one
    fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword:
          'glowing crystalline star prism icon dark navy background purple violet gradient bokeh minimal clean logo mark',
      }),
    })
      .then((r) => r.json())
      .then((d: { url?: string }) => {
        if (d.url) {
          localStorage.setItem(LOGO_KEY, d.url);
          setLogoUrl(d.url);
        }
      })
      .catch(() => {}); // fail silently, no logo is fine
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect password-recovery redirect (from forgot-password email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash   = window.location.hash;
    const isRecovery =
      params.get('code') != null ||
      params.get('type') === 'recovery' ||
      hash.includes('type=recovery');
    if (isRecovery) {
      // Use a microtask to avoid calling setState synchronously inside the effect body
      queueMicrotask(() => setScreen('reset-password'));
    }
  }, []);

  // Surprise me: pick a random suggested topic
  const handleSurpriseMe = () => {
    const random = SUGGESTED_TOPICS[Math.floor(Math.random() * SUGGESTED_TOPICS.length)];
    setTopic(random.label);
    inputRef.current?.focus();
  };

  const handleChipClick = (label: string) => {
    setTopic(label);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setActiveTopic(topic.trim());
    // Clear any previously uploaded image so it doesn't bleed into typed-topic lessons
    setUploadedPublicId(undefined);
    setScreen('roadmap');
  };

  const handleBackToHome = () => {
    setUploadedPublicId(undefined);
    setScreen('home');
  };

  const handleStartLesson = (roadmap: Roadmap) => {
    // Snapshot the upload ID for this lesson, then immediately wipe the
    // global state so no future lesson can accidentally inherit it.
    setLessonPublicId(uploadedPublicId);
    setUploadedPublicId(undefined);
    setActiveRoadmap(roadmap);
    setScreen('lesson');
  };

  const handleStartFromUpload = (topic: string, publicId: string) => {
    setUploadedPublicId(publicId);
    setActiveTopic(topic);
    setScreen('roadmap');
  };

  const handleFinishLesson = (responses: import('./types').QuizResponse[]) => {
    if (activeRoadmap) {
      setActiveCompletion({ roadmap: activeRoadmap, responses, uploadedPublicId: lessonPublicId });
      setLessonPublicId(undefined);
      setScreen('recap');
    } else {
      setScreen('home');
    }
  };

  const handleRecapHome = () => {
    setScreen('home');
    setActiveTopic('');
    setActiveRoadmap(null);
    setUploadedPublicId(undefined);
    setLessonPublicId(undefined);
    setActiveCompletion(null);
  };

  const handleRecapContinue = (topic: string) => {
    setActiveTopic(topic);
    setActiveRoadmap(null);
    setUploadedPublicId(undefined);
    setLessonPublicId(undefined);
    setActiveCompletion(null);
    setScreen('roadmap');
  };

  const handleRecapRestart = () => {
    if (!activeCompletion) { setScreen('home'); return; }
    // Restore the upload ID so the restarted lesson keeps the same photo
    setLessonPublicId(activeCompletion.uploadedPublicId);
    setActiveRoadmap(activeCompletion.roadmap);
    setActiveCompletion(null);
    setScreen('lesson');
  };

  // Keyboard shortcut: Enter submits, Escape clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTopic('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (screen === 'reset-password') {
    return (
      <ResetPasswordScreen
        onDone={() => {
          window.history.replaceState({}, '', '/');
          setScreen('home');
        }}
      />
    );
  }

  // ── Auth loading spinner ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 36, height: 36, border: '3px solid rgba(124,111,247,0.25)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'tmn-spin 0.7s linear infinite', display: 'inline-block' }} />
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!user) {
    if (screen === 'forgot-password') {
      return <ForgotPasswordScreen onBack={() => setScreen('home')} />;
    }
    return <AuthScreen onForgotPassword={() => setScreen('forgot-password')} />;
  }

  if (screen === 'roadmap') {
    return (
      <RoadmapScreen
        topic={activeTopic}
        onBack={handleBackToHome}
        onStart={handleStartLesson}
      />
    );
  }

  if (screen === 'lesson' && activeRoadmap) {
    return (
      <LessonScreen
        roadmap={activeRoadmap}
        onBack={() => setScreen('roadmap')}
        onFinish={handleFinishLesson}
        uploadedPublicId={lessonPublicId}
      />
    );
  }

  if (screen === 'recap' && activeCompletion) {
    return (
      <RecapScreen
        completion={activeCompletion}
        onHome={handleRecapHome}
        onContinue={handleRecapContinue}
        onRestart={handleRecapRestart}
        onDashboard={() => setScreen('dashboard')}
      />
    );
  }

  if (screen === 'dashboard') {
    return (
      <DashboardScreen
        onBack={() => setScreen('home')}
        onStartTopic={(topic) => {
          setActiveTopic(topic);
          setActiveRoadmap(null);
          setUploadedPublicId(undefined);
          setLessonPublicId(undefined);
          setScreen('roadmap');
        }}
      />
    );
  }

  if (screen === 'upload') {
    return (
      <UploadLearnScreen
        onBack={() => setScreen('home')}
        onStartLesson={handleStartFromUpload}
      />
    );
  }

  return (
    <div className="tmn-root">
      {/* ── Nav ── */}
      <header className="tmn-nav">
        <div className="tmn-nav-logo">
          <span className="tmn-logo-icon">✦</span>
          <span className="tmn-logo-text">TeachMeNew</span>
        </div>
        <div className="tmn-nav-actions">
          <button
            className="tmn-btn-ghost tmn-btn-sm tmn-nav-btn"
            onClick={() => setScreen('dashboard')}
          >
            <span aria-hidden="true">📊</span>
            <span className="tmn-nav-btn-label">Dashboard</span>
          </button>
          <button
            className="tmn-btn-ghost tmn-btn-sm tmn-nav-btn"
            onClick={() => setScreen('upload')}
          >
            <span aria-hidden="true">📸</span>
            <span className="tmn-nav-btn-label">Upload to Learn</span>
          </button>
          <span className="tmn-nav-username">
            {(user.user_metadata?.username as string | undefined) ?? user.email?.split('@')[0] ?? 'Learner'}
          </span>
          <button
            className="tmn-btn-ghost tmn-btn-sm tmn-nav-btn"
            onClick={() => signOut()}
          >
            <span className="tmn-nav-btn-label">Sign out</span>
            <span className="tmn-nav-btn-icon-only" aria-hidden="true">↩</span>
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="tmn-hero">
        {/* Ambient glow blobs */}
        <div className="tmn-glow tmn-glow-1" aria-hidden="true" />
        <div className="tmn-glow tmn-glow-2" aria-hidden="true" />

        <div className="tmn-hero-content">
          {logoUrl && (
            <div className="tmn-logo-mark-wrap">
              <img src={logoUrl} alt="TeachMeNew logo" className="tmn-logo-mark" />
              <div className="tmn-logo-mark-glow" aria-hidden="true" />
            </div>
          )}
          <div className="tmn-badge">AI-powered learning</div>
          <h1 className="tmn-headline">
            What do you want<br />to <span className="tmn-headline-accent">learn today?</span>
          </h1>
          <p className="tmn-subline">
            Go from zero to understanding any topic in&nbsp;10–15&nbsp;minutes —<br className="tmn-br-lg" />
            through AI-generated, visual, personalised lessons.
          </p>

          {/* ── Search bar ── */}
          <form className={`tmn-search-form${focused ? ' tmn-search-focused' : ''}`} onSubmit={handleSubmit}>
            <span className="tmn-search-icon" aria-hidden="true">🔍</span>
            <input
              ref={inputRef}
              className="tmn-search-input"
              type="text"
              placeholder="e.g. Quantum Computing, Jazz Piano, Roman History…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-label="Enter a topic to learn"
              autoComplete="off"
              spellCheck={false}
            />
            {topic && (
              <button
                type="button"
                className="tmn-search-clear"
                onClick={() => { setTopic(''); inputRef.current?.focus(); }}
                aria-label="Clear"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="tmn-btn-primary tmn-search-submit"
              disabled={!topic.trim()}
            >
              Start learning →
            </button>
          </form>

          {/* ── Chips ── */}
          <div className="tmn-chips-row">
            <span className="tmn-chips-label">Try:</span>
            {SUGGESTED_TOPICS.map(({ label, emoji }) => (
              <button
                key={label}
                className={`tmn-chip${topic === label ? ' tmn-chip-active' : ''}`}
                onClick={() => handleChipClick(label)}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* ── Surprise me ── */}
          <button className="tmn-surprise-btn" onClick={handleSurpriseMe}>
            <span className="tmn-surprise-icon">🎲</span> Surprise me
          </button>
        </div>
      </main>

      {/* ── How it works ── */}
      <section className="tmn-how">
        <h2 className="tmn-how-title">How it works</h2>
        <div className="tmn-how-grid">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="tmn-how-card">
              <div className="tmn-how-step">{step}</div>
              <h3 className="tmn-how-card-title">{title}</h3>
              <p className="tmn-how-card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="tmn-footer-cta">
        <p className="tmn-footer-cta-text">Ready to start learning?</p>
        <button
          className="tmn-btn-primary tmn-btn-lg"
          onClick={() => { inputRef.current?.scrollIntoView({ behavior: 'smooth' }); inputRef.current?.focus(); }}
        >
          Pick your first topic
        </button>
        <p className="tmn-footer-note">Signed in as {user.email}</p>
      </section>

      <footer className="tmn-footer">
        <span>TeachMeNew &copy; 2026</span>
        <span className="tmn-footer-sep">·</span>
        <span>Built with Cloudinary AI</span>
      </footer>
    </div>
  );
}

export default App;
