import { useState } from 'react';
import './ForgotPasswordScreen.css';

interface Props {
  onBack: () => void;
}

type Status = 'idle' | 'loading' | 'sent' | 'error';

export default function ForgotPasswordScreen({ onBack }: Props) {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setErrorMsg('Please enter your email address.'); return; }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, origin: window.location.origin }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch {
      setErrorMsg('Network error — please check your connection.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="fp-root">
        <div className="fp-card fp-sent-card">
          <div className="fp-sent-icon">📩</div>
          <h2 className="fp-sent-title">Reset link sent!</h2>
          <p className="fp-sent-sub">
            We sent a password reset link to <strong>{email.trim()}</strong>.<br />
            Check your inbox (and spam folder).
          </p>
          <button className="tmn-btn-ghost fp-back-btn" onClick={onBack}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fp-root">
      <div className="fp-logo">
        <span className="tmn-logo-icon">✦</span>
        <span className="tmn-logo-text">TeachMeNew</span>
      </div>

      <div className="fp-card">
        <div className="fp-header">
          <h2 className="fp-title">Forgot password?</h2>
          <p className="fp-sub">Enter your email and we'll send a reset link.</p>
        </div>

        <form className="fp-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label">
            Email address
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
              autoComplete="email"
              disabled={status === 'loading'}
              autoFocus
            />
          </label>

          {(status === 'error' || errorMsg) && (
            <p className="auth-error">{errorMsg}</p>
          )}

          <button
            className="tmn-btn-primary auth-submit"
            type="submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? <span className="auth-spinner" /> : 'Send reset link →'}
          </button>
        </form>

        <button type="button" className="auth-forgot-link fp-back" onClick={onBack}>
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
}
