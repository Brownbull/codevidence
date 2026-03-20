/**
 * src/app/components/admin/RescanModal.tsx — Rescan confirmation modal.
 *
 * Shows a modal with an optional GitHub PAT token input before
 * enqueueing a rescan job. Empty token = public repos only.
 */

import React, { useState, useRef, useEffect } from 'react';

interface RescanModalProps {
  username: string;
  onConfirm: (githubToken?: string) => void;
  onCancel: () => void;
}

export function RescanModal({ username, onConfirm, onCancel }: RescanModalProps) {
  const [token, setToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the token input when the modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    onConfirm(trimmed || undefined);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-5"
        style={{ backgroundColor: 'rgb(var(--color-surface-raised))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-th-text-primary mb-1">
          Rescan {username}
        </h3>
        <p className="text-xs text-th-text-secondary mb-4">
          Paste a developer-provided GitHub token to include private repositories.
          Leave empty for public repositories only.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="rescan-token" className="block text-xs font-medium text-th-text-secondary mb-1">
            GitHub Token (optional)
          </label>
          <input
            ref={inputRef}
            id="rescan-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            autoComplete="off"
            className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono text-th-text-primary bg-surface placeholder-th-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-th-text-muted mt-1">
            The developer can create one at{' '}
            <a href="/grant-access" target="_blank" className="text-indigo-600 hover:underline">/grant-access</a>
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-th-text-secondary border border-border rounded-md hover:bg-th-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              {token.trim() ? 'Rescan with Token' : 'Rescan Public Only'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
