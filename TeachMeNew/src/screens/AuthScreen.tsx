import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthScreen.css';

type Tab = 'signin' | 'signup';

interface Props {
  onForgotPassword: () => void;
}

export default function AuthScreen({ onForgotPassword }: Props) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');

  // ── Sign In state ──────────────────────────────────────────────────────────
  const [siEmail,    setSiEmail]    = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError,    setSiError]    = useState('');
  const [siLoading,  setSiLoading]  = useState(false);

  // ── Sign Up state ──────────────────────────────────────────────────────────
  const [suUsername,  setSuUsername]  = useState('');
  const [suEmail,     setSuEmail]     = useState('');
  const [suPassword,  setSuPassword]  = useState('');
  const [suConfirm,   setSuConfirm]   = useState('');
  const [suError,     setSuError]     = useState('');
  const [suLoading,   setSuLoading]   = useState(false);
  const [suCheckEmail, setSuCheckEmail] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError('');
    if (!siEmail.trim() || !siPassword) { setSiError('Please fill in all fields.'); return; }
    setSiLoading(true);
    try {
      await signIn(siEmail.trim(), siPassword);
      // AuthContext onAuthStateChange will update user → App re-renders
    } catch (err) {
      setSiError((err as Error).message);
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError('');

    const uname = suUsername.trim();
    const email = suEmail.trim();

    if (!uname || !email || !suPassword || !suConfirm) {
      setSuError('Please fill in all fields.'); return;
    }
    if (uname.length < 3) {
      setSuError('Username must be at least 3 characters.'); return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(uname)) {
      setSuError('Username can only contain letters, numbers, and underscores.'); return;
    }
    if (suPassword !== suConfirm) {
      setSuError('Passwords do not match.'); return;
    }
    if (suPassword.length < 6) {
      setSuError('Password must be at least 6 characters.'); return;
    }

    setSuLoading(true);
    try {
      const { needsConfirmation } = await signUp(email, suPassword, uname);
      if (needsConfirmation) {
        setSuCheckEmail(true);
      }
      // else: AuthContext sets user → App re-renders immediately
    } catch (err) {
      setSuError((err as Error).message);
    } finally {
      setSuLoading(false);
    }
  };

  // ── Email confirmation state ───────────────────────────────────────────────
  if (suCheckEmail) {
    return (
      <div className="auth-root">
        <div className="auth-card auth-confirm-card">
          <div className="auth-confirm-icon">📬</div>
          <h2 className="auth-confirm-title">Check your email</h2>
          <p className="auth-confirm-sub">
            We sent a confirmation link to <strong>{suEmail.trim()}</strong>.<br />
            Click the link in the email to activate your account.
          </p>
          <button
            className="tmn-btn-ghost auth-confirm-back"
            onClick={() => { setSuCheckEmail(false); setTab('signin'); }}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root">
      {/* ── Logo ── */}
      <div className="auth-logo">
        <span className="tmn-logo-icon">✦</span>
        <span className="tmn-logo-text">TeachMeNew</span>
      </div>

      <div className="auth-card">
        {/* ── Tabs ── */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'signin' ? ' auth-tab-active' : ''}`}
            onClick={() => { setTab('signin'); setSiError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${tab === 'signup' ? ' auth-tab-active' : ''}`}
            onClick={() => { setTab('signup'); setSuError(''); }}
          >
            Sign Up
          </button>
        </div>

        {/* ── Sign In ── */}
        {tab === 'signin' && (
          <form className="auth-form" onSubmit={handleSignIn} noValidate>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                autoComplete="email"
                disabled={siLoading}
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                autoComplete="current-password"
                disabled={siLoading}
              />
            </label>

            {siError && <p className="auth-error">{siError}</p>}

            <button
              className="tmn-btn-primary auth-submit"
              type="submit"
              disabled={siLoading}
            >
              {siLoading ? <span className="auth-spinner" /> : 'Sign In →'}
            </button>

            <button
              type="button"
              className="auth-forgot-link"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </form>
        )}

        {/* ── Sign Up ── */}
        {tab === 'signup' && (
          <form className="auth-form" onSubmit={handleSignUp} noValidate>
            <label className="auth-label">
              Username
              <input
                className="auth-input"
                type="text"
                placeholder="coollearner_42"
                value={suUsername}
                onChange={(e) => setSuUsername(e.target.value)}
                autoComplete="username"
                disabled={suLoading}
                maxLength={32}
              />
              <span className="auth-hint">Letters, numbers, underscores — 3–32 chars</span>
            </label>

            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                autoComplete="email"
                disabled={suLoading}
              />
            </label>

            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                placeholder="Min. 6 characters"
                value={suPassword}
                onChange={(e) => setSuPassword(e.target.value)}
                autoComplete="new-password"
                disabled={suLoading}
              />
            </label>

            <label className="auth-label">
              Confirm password
              <input
                className="auth-input"
                type="password"
                placeholder="Repeat your password"
                value={suConfirm}
                onChange={(e) => setSuConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={suLoading}
              />
            </label>

            {suError && <p className="auth-error">{suError}</p>}

            <button
              className="tmn-btn-primary auth-submit"
              type="submit"
              disabled={suLoading}
            >
              {suLoading ? <span className="auth-spinner" /> : 'Create account →'}
            </button>
          </form>
        )}
      </div>

      <p className="auth-tagline">Visual AI learning — anything, in 15 minutes.</p>
    </div>
  );
}
