import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './ResetPasswordScreen.css';

interface Props {
  onDone: () => void;
}

type Stage = 'loading' | 'form' | 'success' | 'error';

export default function ResetPasswordScreen({ onDone }: Props) {
  const [stage,     setStage]     = useState<Stage>('loading');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [initError, setInitError] = useState('');

  // Exchange the auth code from the URL for a session
  useEffect(() => {
    if (!supabase) { setInitError('Supabase not configured.'); setStage('error'); return; }

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');

    if (code) {
      // PKCE flow: exchange code → session
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) { setInitError('This reset link is invalid or has expired.'); setStage('error'); }
          else     { setStage('form'); }
        });
    } else {
      // Hash-based token (older Supabase flow / some redirect configs)
      const hash   = window.location.hash.replace('#', '');
      const hParams = new URLSearchParams(hash);
      const type   = hParams.get('type');

      if (type === 'recovery') {
        // onAuthStateChange will pick up the session from the hash automatically
        setStage('form');
      } else {
        setInitError('No reset token found in the URL. Please request a new reset link.');
        setStage('error');
      }
    }

    // Clear the code/hash from the URL bar
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirm) { setError('Please fill in both fields.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    if (password.length < 6)   { setError('Password must be at least 6 characters.'); return; }

    if (!supabase) { setError('Supabase not configured.'); return; }

    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) { setError(updateErr.message); return; }
      setStage('success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── States ─────────────────────────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <div className="rp-root">
        <div className="rp-card rp-center">
          <span className="rp-big-spinner" />
          <p className="rp-muted">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="rp-root">
        <div className="rp-card rp-center">
          <div className="rp-error-icon">⚠️</div>
          <h2 className="rp-title">Reset link invalid</h2>
          <p className="rp-muted">{initError}</p>
          <button className="tmn-btn-primary rp-done-btn" onClick={onDone}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className="rp-root">
        <div className="rp-card rp-center">
          <div className="rp-success-icon">✅</div>
          <h2 className="rp-title">Password updated!</h2>
          <p className="rp-muted">Your password has been changed. You can now sign in.</p>
          <button className="tmn-btn-primary rp-done-btn" onClick={onDone}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rp-root">
      <div className="rp-logo">
        <span className="tmn-logo-icon">✦</span>
        <span className="tmn-logo-text">TeachMeNew</span>
      </div>

      <div className="rp-card">
        <div className="rp-header">
          <h2 className="rp-title">Set a new password</h2>
          <p className="rp-muted">Choose a strong password — at least 6 characters.</p>
        </div>

        <form className="rp-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label">
            New password
            <input
              className="auth-input"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
              autoFocus
              disabled={saving}
            />
          </label>

          <label className="auth-label">
            Confirm new password
            <input
              className="auth-input"
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              autoComplete="new-password"
              disabled={saving}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="tmn-btn-primary auth-submit"
            type="submit"
            disabled={saving}
          >
            {saving ? <span className="auth-spinner" /> : 'Update password →'}
          </button>
        </form>
      </div>
    </div>
  );
}
