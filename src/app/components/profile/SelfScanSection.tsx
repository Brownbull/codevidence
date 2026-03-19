/**
 * src/app/components/profile/SelfScanSection.tsx
 *
 * "Scan My Repos" button with scan progress display.
 * Creates a self-scan job and polls for status.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/auth/AuthContext';
import { hasPendingSelfScan } from '@/handlers/user-profile';
import { addDoc, serverTimestamp } from '@/core/db/firestore';
import { queryDocs, where, orderBy, limit } from '@/core/db/firestore';
import type { ScanJob } from '@/types/scan-job';

const SELF_SCAN_JOBS_KEY = 'self-scan-jobs';

export function SelfScanSection() {
  const { user, githubUsername, isGitHubConnected } = useAuth();
  const queryClient = useQueryClient();

  // Check for pending self-scan
  const { data: hasPending = false } = useQuery({
    queryKey: [SELF_SCAN_JOBS_KEY, 'pending', user?.uid],
    queryFn: () => hasPendingSelfScan(user!.uid),
    enabled: !!user && isGitHubConnected,
    refetchInterval: 15_000,
  });

  // Fetch recent self-scan jobs for status display
  const { data: recentJobs = [] } = useQuery({
    queryKey: [SELF_SCAN_JOBS_KEY, 'recent', user?.uid],
    queryFn: () =>
      queryDocs<ScanJob>(
        'scan_jobs',
        where('type', '==', 'self-scan'),
        where('payload.requestedBy', '==', user!.uid),
        orderBy('createdAt', 'desc'),
        limit(3),
      ),
    enabled: !!user && isGitHubConnected,
    refetchInterval: 15_000,
  });

  // Create self-scan job mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      if (!user || !githubUsername) throw new Error('Not connected');
      const now = serverTimestamp();
      return addDoc('scan_jobs', {
        type: 'self-scan',
        status: 'pending',
        payload: {
          requestedBy: user.uid,
          githubUsername,
        },
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: null,
        completedAt: null,
        failedAt: null,
        errorMessage: null,
        rateLimitedUntil: null,
        priority: 1,
        workerId: null,
        heartbeatAt: null,
        claimedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [SELF_SCAN_JOBS_KEY] });
    },
  });

  const canScan = isGitHubConnected && !hasPending && !scanMutation.isPending;

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-600',
    running: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
  };

  return (
    <section
      className="bg-surface-raised border border-border rounded-lg p-6"
      data-testid="self-scan-section"
    >
      <h2 className="text-base font-medium text-th-text-primary mb-3">
        Scan My Repos
      </h2>

      <p className="text-sm text-th-text-secondary mb-4">
        Trigger a scan of all your GitHub repositories to build your skill profile.
      </p>

      <button
        type="button"
        onClick={() => void scanMutation.mutateAsync()}
        disabled={!canScan}
        className="px-4 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="scan-my-repos-button"
      >
        {scanMutation.isPending
          ? 'Creating scan...'
          : hasPending
            ? 'Scan in progress...'
            : 'Scan My Repos'}
      </button>

      {scanMutation.error && (
        <p className="text-red-600 text-xs mt-2" role="alert" data-testid="scan-error">
          {(scanMutation.error as Error).message}
        </p>
      )}

      {/* Recent scan jobs */}
      {recentJobs.length > 0 && (
        <div className="mt-4 space-y-2" data-testid="recent-scans">
          <h3 className="text-xs font-medium text-th-text-muted uppercase">Recent Scans</h3>
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-2 text-xs">
              <span className={`font-medium ${statusColors[job.status] ?? 'text-th-text-muted'}`}>
                {job.status}
              </span>
              {job.errorMessage && (
                <span className="text-th-text-muted truncate max-w-xs">
                  {job.errorMessage}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
