/**
 * src/app/pages/MyProfilePage.tsx — User profile dashboard.
 *
 * Shows GitHub connection status, connect form for Google-login users,
 * token health indicator, and link to own candidate profile.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';
import { AppShell } from '@/app/components/layout/AppShell';
import { ConnectGitHubForm } from '@/app/components/profile/ConnectGitHubForm';
import { SelfScanSection } from '@/app/components/profile/SelfScanSection';
import { useUserProfile, useGitHubSecret, useDisconnectGitHub } from '@/app/hooks/useUserProfile';

export function MyProfilePage() {
  const { user, githubUsername, isGitHubConnected, tokenStatus } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: secret } = useGitHubSecret();
  const disconnectMutation = useDisconnectGitHub();

  const tokenStatusLabel: Record<string, { text: string; color: string }> = {
    valid: { text: 'Valid', color: 'text-green-600' },
    expired: { text: 'Expired', color: 'text-red-600' },
    revoked: { text: 'Revoked', color: 'text-red-600' },
  };

  const statusInfo = tokenStatus ? tokenStatusLabel[tokenStatus] : null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto" data-testid="my-profile-page">
        <h1 className="text-xl font-semibold text-th-text-primary mb-6">My Profile</h1>

        {/* GitHub Connection Section */}
        <section className="bg-surface-raised border border-border rounded-lg p-6 mb-6">
          <h2 className="text-base font-medium text-th-text-primary mb-4">
            GitHub Connection
          </h2>

          {isGitHubConnected ? (
            <div className="space-y-3" data-testid="github-connected-status">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-th-text-secondary">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span className="text-sm font-medium text-th-text-primary">
                  {githubUsername}
                </span>
                {statusInfo && (
                  <span className={`text-xs font-medium ${statusInfo.color}`} data-testid="token-status">
                    {statusInfo.text}
                  </span>
                )}
              </div>

              {secret && (
                <p className="text-xs text-th-text-muted">
                  Token: {secret.tokenPrefix}****
                </p>
              )}

              {profile?.githubProvider && (
                <p className="text-xs text-th-text-muted">
                  Connected via {profile.githubProvider === 'oauth' ? 'GitHub OAuth' : 'Personal Access Token'}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void disconnectMutation.mutateAsync()}
                  disabled={disconnectMutation.isPending}
                  className="text-xs text-red-600 hover:text-red-500 transition-colors"
                  data-testid="disconnect-github-button"
                >
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <div data-testid="github-not-connected">
              <p className="text-sm text-th-text-secondary mb-4">
                Connect your GitHub account to scan your repositories and build your skill profile.
              </p>
              <ConnectGitHubForm />
            </div>
          )}
        </section>

        {/* Candidate Profile Link */}
        {isGitHubConnected && githubUsername && (
          <section className="bg-surface-raised border border-border rounded-lg p-6 mb-6">
            <h2 className="text-base font-medium text-th-text-primary mb-3">
              My Candidate Profile
            </h2>
            <Link
              to={`/candidates/${githubUsername}`}
              className="text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
              data-testid="view-candidate-profile-link"
            >
              View my profile at /candidates/{githubUsername}
            </Link>
          </section>
        )}

        {/* Self-Scan Section */}
        {isGitHubConnected && <SelfScanSection />}
      </div>
    </AppShell>
  );
}
