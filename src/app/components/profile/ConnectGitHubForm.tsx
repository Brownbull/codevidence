/**
 * src/app/components/profile/ConnectGitHubForm.tsx
 *
 * Form for connecting a GitHub account by entering username and PAT.
 * Validates inputs client-side before submitting to Firebase Function.
 */

import React, { useState } from 'react';
import { useConnectGitHub } from '@/app/hooks/useUserProfile';
import { sanitizeInput } from '@/core/utils/sanitize';

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const VALID_TOKEN_PREFIXES = ['ghp_', 'gho_', 'github_pat_'];

export function ConnectGitHubForm() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const connectMutation = useConnectGitHub();

  function validateInputs(): boolean {
    const sanitizedUsername = sanitizeInput(username.trim(), 39);
    if (!sanitizedUsername || !GITHUB_USERNAME_REGEX.test(sanitizedUsername)) {
      setValidationError('Invalid GitHub username format.');
      return false;
    }
    if (!token.trim()) {
      setValidationError('GitHub token is required.');
      return false;
    }
    if (!VALID_TOKEN_PREFIXES.some((p) => token.trim().startsWith(p))) {
      setValidationError('Token must start with ghp_, gho_, or github_pat_.');
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!validateInputs()) return;

    await connectMutation.mutateAsync({
      githubUsername: username.trim(),
      githubToken: token.trim(),
    });

    setUsername('');
    setToken('');
  }

  const error = validationError ?? (connectMutation.error as Error | null)?.message ?? null;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-4"
      data-testid="connect-github-form"
    >
      <div>
        <label htmlFor="github-username" className="block text-sm font-medium text-th-text-secondary mb-1">
          GitHub Username
        </label>
        <input
          id="github-username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="octocat"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-th-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-500"
          data-testid="github-username-input"
          maxLength={39}
        />
      </div>

      <div>
        <label htmlFor="github-token" className="block text-sm font-medium text-th-text-secondary mb-1">
          Personal Access Token
        </label>
        <input
          id="github-token"
          type="password"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-3 py-2 border border-border rounded-md text-sm text-th-text-primary bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-500"
          data-testid="github-token-input"
        />
        <p className="text-xs text-th-text-muted mt-1">
          Fine-grained PAT with repo scope. <a href="/grant-access" className="text-indigo-500 hover:text-indigo-400">How to create one</a>
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-xs" role="alert" data-testid="connect-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={connectMutation.isPending}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        data-testid="connect-github-button"
      >
        {connectMutation.isPending ? 'Connecting...' : 'Connect GitHub'}
      </button>
    </form>
  );
}
