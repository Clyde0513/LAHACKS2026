import { useState, useRef, useEffect } from 'react';
import RoadmapScreen from './screens/RoadmapScreen';
import LessonScreen from './screens/LessonScreen';
import UploadLearnScreen from './screens/UploadLearnScreen';
import RecapScreen from './screens/RecapScreen';
import DashboardScreen from './screens/DashboardScreen';
import type { LessonCompletion, Roadmap } from './types';
import './App.css';

type Screen = 'home' | 'roadmap' | 'lesson' | 'upload' | 'recap' | 'dashboard';

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
  const [screen, setScreen]             = useState<Screen>('home');
  const [activeTopic, setActiveTopic]   = useState('');
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);
  const [uploadedPublicId, setUploadedPublicId] = useState<string | undefined>();
  const [activeCompletion, setActiveCompletion] = useState<LessonCompletion | null>(null);

  const [topic, setTopic]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setScreen('roadmap');
  };

  const handleBackToHome = () => {
    setScreen('home');
  };

  const handleStartLesson = (roadmap: Roadmap) => {
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
      setActiveCompletion({ roadmap: activeRoadmap, responses, uploadedPublicId });
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
    setActiveCompletion(null);
  };

  const handleRecapContinue = (topic: string) => {
    setActiveTopic(topic);
    setActiveRoadmap(null);
    setUploadedPublicId(undefined);
    setActiveCompletion(null);
    setScreen('roadmap');
  };

  const handleRecapRestart = () => {
    if (!activeCompletion) { setScreen('home'); return; }
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
        uploadedPublicId={uploadedPublicId}
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
            className="tmn-btn-ghost tmn-btn-sm"
            onClick={() => setScreen('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className="tmn-btn-ghost tmn-btn-sm"
            onClick={() => setScreen('upload')}
          >
            📸 Upload to Learn
          </button>
          <button className="tmn-btn-ghost">Sign in</button>
          <button className="tmn-btn-primary tmn-btn-sm">Continue as guest</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="tmn-hero">
        {/* Ambient glow blobs */}
        <div className="tmn-glow tmn-glow-1" aria-hidden="true" />
        <div className="tmn-glow tmn-glow-2" aria-hidden="true" />

        <div className="tmn-hero-content">
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
        <p className="tmn-footer-note">No account required &mdash; start in seconds.</p>
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
