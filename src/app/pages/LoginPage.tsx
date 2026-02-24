/**
 * src/app/pages/LoginPage.tsx — Sign-In page.
 *
 * Supports Google OAuth popup and email/password sign-in (pre-created accounts).
 * After successful auth, AuthContext resolves user and PrivateRoute
 * redirects to /search.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';

export function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to search
  useEffect(() => {
    if (!loading && user) {
      void navigate('/search', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleEmailLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-th-text-muted font-mono text-sm">Checking authentication…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="bg-surface-raised border border-border rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-th-text-primary mb-1 text-center">
          Candidate Skill Scanner
        </h1>
        <p className="text-th-text-secondary text-sm mb-6 text-center">
          Sign in to explore developer talent
        </p>

        <button
          onClick={() => void signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-surface-raised border border-border rounded-md shadow-sm text-sm font-medium text-th-text-primary hover:bg-th-hover transition-colors"
          type="button"
          aria-label="Sign in with Google"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-th-text-muted uppercase">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-th-text-secondary mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm text-th-text-primary bg-surface placeholder-th-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="test@example.com"
              data-testid="email-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-th-text-secondary mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm text-th-text-primary bg-surface placeholder-th-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Password"
              data-testid="password-input"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs" role="alert" data-testid="login-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="email-login-button"
          >
            {submitting ? 'Signing in…' : 'Sign in with Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
