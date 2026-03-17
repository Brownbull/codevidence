/**
 * src/app/pages/GrantAccessPage.tsx — Public page for developers.
 *
 * Explains how to create a fine-grained GitHub PAT to grant
 * read access to private repositories for skill scanning.
 * Accessible without authentication at /grant-access.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const REQUIRED_PERMISSIONS = [
  { name: 'Contents', access: 'Read-only', why: 'Read source code, config files, and project structure' },
  { name: 'Metadata', access: 'Read-only', why: 'Read repository name, language, and topics' },
  { name: 'Commit statuses', access: 'Read-only', why: 'Analyse commit history and co-authorship patterns' },
];

export function GrantAccessPage() {
  const [copied, setCopied] = useState(false);

  const permissionSummary = REQUIRED_PERMISSIONS.map((p) => p.name).join(', ');

  function handleCopyLink() {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface-raised">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/login" className="text-th-text-primary font-semibold text-lg hover:text-indigo-600">
            Candidate Skill Scanner
          </Link>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs text-th-text-muted hover:text-indigo-600 transition-colors"
          >
            {copied ? 'Link copied!' : 'Copy page link'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-th-text-primary mb-2">
          Grant Repository Access
        </h1>
        <p className="text-th-text-secondary mb-8">
          A recruiter has asked to scan your GitHub repositories to evaluate your
          technical skills. This guide explains how to securely grant read-only
          access to your private repositories.
        </p>

        {/* What we scan */}
        <Section title="What we analyse" step={0}>
          <ul className="list-disc list-inside text-sm text-th-text-secondary space-y-1">
            <li>Programming languages, frameworks, and tools used</li>
            <li>Code quality signals (test coverage, project structure)</li>
            <li>AI tooling patterns (Claude, Cursor, Copilot, etc.)</li>
            <li>Commit history depth and consistency</li>
          </ul>
          <p className="text-xs text-th-text-muted mt-3">
            We never store your source code. Repositories are cloned temporarily,
            analysed, and immediately deleted.
          </p>
        </Section>

        {/* Step 1 */}
        <Section title="Go to GitHub Token Settings" step={1}>
          <p className="text-sm text-th-text-secondary mb-3">
            Open GitHub's fine-grained token creation page:
          </p>
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-md text-sm font-medium text-indigo-600 hover:bg-th-hover transition-colors"
          >
            <GitHubIcon />
            Create Fine-Grained Token
            <ExternalLinkIcon />
          </a>
        </Section>

        {/* Step 2 */}
        <Section title="Configure the token" step={2}>
          <div className="space-y-4 text-sm text-th-text-secondary">
            <ConfigRow label="Token name" value="Skill Scanner Access (or any name you prefer)" />
            <ConfigRow label="Expiration" value="7 days (recommended — keeps access short-lived)" />
            <ConfigRow label="Repository access">
              <span>
                Select <strong className="text-th-text-primary">Only select repositories</strong> and
                choose the repositories you want scanned.
              </span>
            </ConfigRow>
          </div>
        </Section>

        {/* Step 3 */}
        <Section title="Set permissions" step={3}>
          <p className="text-sm text-th-text-secondary mb-3">
            Under <strong className="text-th-text-primary">Repository permissions</strong>, enable only:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-th-text-muted border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Permission</th>
                  <th className="pb-2 px-4 font-medium">Access Level</th>
                  <th className="pb-2 pl-4 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {REQUIRED_PERMISSIONS.map((p) => (
                  <tr key={p.name} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-th-text-primary">{p.name}</td>
                    <td className="py-2 px-4 text-green-600 font-medium">{p.access}</td>
                    <td className="py-2 pl-4 text-th-text-muted">{p.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-th-text-muted mt-3">
            No write permissions are needed. We only read — never modify — your code.
          </p>
        </Section>

        {/* Step 4 */}
        <Section title="Generate and share" step={4}>
          <div className="space-y-3 text-sm text-th-text-secondary">
            <p>
              Click <strong className="text-th-text-primary">Generate token</strong> and
              copy the token that starts with <code className="px-1 py-0.5 rounded bg-surface-inset text-th-text-primary font-mono text-xs">github_pat_</code>.
            </p>
            <p>
              Send the token to your recruiter via a secure channel (encrypted message,
              password manager share, or in-person).
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-amber-800">
              <p className="font-medium text-sm">Security notes</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                <li>The token expires automatically after the period you set</li>
                <li>You can revoke it any time at github.com/settings/tokens</li>
                <li>It only grants access to the specific repositories you selected</li>
                <li>Only read permissions — your code cannot be modified</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Summary */}
        <div className="mt-8 p-4 bg-surface-raised border border-border rounded-lg">
          <p className="text-sm text-th-text-primary font-medium mb-1">Quick summary</p>
          <p className="text-xs text-th-text-secondary">
            Create a fine-grained GitHub PAT with <strong>{permissionSummary}</strong> (read-only)
            scoped to specific repositories. Set a short expiration (7 days). Share the token
            securely with your recruiter. Revoke it after the scan is complete.
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function Section({ title, step, children }: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-lg font-medium text-th-text-primary mb-3">
        {step > 0 && (
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ConfigRow({ label, value, children }: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="font-medium text-th-text-primary w-36 flex-shrink-0">{label}</span>
      {value ? <span>{value}</span> : children}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline-block">
      <path d="M4.5 1.5H10.5V7.5M10.5 1.5L1.5 10.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
