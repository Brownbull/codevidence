/**
 * src/app/components/admin/FlagsTab.tsx — Admin flags tab.
 *
 * Shows underserved query flags and repos-of-interest.
 * Inline trigger-discovery action queues discover job and marks flag actioned.
 */

import React, { useState } from 'react';
import type { AdminFlag } from '@/types/admin';
import { useAuth } from '@/app/auth/AuthContext';
import { useAdminFlags, useActionFlag, useQueueDiscover } from '@/app/hooks/useAdmin';
import { buildSuggestedCommand } from '@/handlers/admin-flags';

export function FlagsTab() {
  const { data: flags, isLoading } = useAdminFlags();

  const underservedFlags = (flags ?? []).filter((f) => f.type === 'underserved-query');
  const repoFlags = (flags ?? []).filter((f) => f.type === 'repo-of-interest');

  return (
    <div>
      <h2 className="text-sm font-semibold text-th-text-primary mb-4">Admin Flags</h2>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-inset rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Underserved queries */}
      {underservedFlags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-th-text-secondary uppercase tracking-wide mb-3">
            Underserved Queries
          </h3>
          <div className="space-y-2">
            {underservedFlags
              .sort((a, b) => (a.resultCount ?? 0) - (b.resultCount ?? 0))
              .map((flag) => (
                <UnderservedFlagRow key={flag.id} flag={flag} />
              ))}
          </div>
        </div>
      )}

      {/* Repos of interest */}
      {repoFlags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-th-text-secondary uppercase tracking-wide mb-3">
            Repos of Interest
          </h3>
          <div className="space-y-2">
            {repoFlags.map((flag) => (
              <RepoFlagRow key={flag.id} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && underservedFlags.length === 0 && repoFlags.length === 0 && (
        <p className="text-sm text-th-text-muted text-center py-8">No active flags.</p>
      )}
    </div>
  );
}

function UnderservedFlagRow({ flag }: { flag: AdminFlag & { id: string } }) {
  const { user } = useAuth();
  const actionFlag = useActionFlag();
  const queueDiscover = useQueueDiscover();
  const [showForm, setShowForm] = useState(false);

  const flagDate = flag.createdAt?.toDate?.()
    ? flag.createdAt.toDate().toLocaleDateString()
    : 'Unknown';

  const handleTriggerDiscovery = async () => {
    if (!flag.queryParams || !user) return;

    const tags = [
      ...flag.queryParams.languages.map((l) => l.split(':')[1] ?? l),
      ...flag.queryParams.frameworks.map((f) => f.split(':')[1] ?? f),
      ...flag.queryParams.tools.map((t) => t.split(':')[1] ?? t),
    ];
    const query = tags.join(' ') || 'developer';

    await queueDiscover.mutateAsync({ query, source: 'github', limit: 100 });
    await actionFlag.mutateAsync({ flagId: flag.id, adminUid: user.uid });
    setShowForm(false);
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-th-text-primary">
              {flag.resultCount ?? 0} result{(flag.resultCount ?? 0) !== 1 ? 's' : ''}
            </span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
              flag.status === 'active'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {flag.status}
            </span>
            <span className="text-xs text-th-text-muted">{flagDate}</span>
          </div>
          {flag.queryParams && (
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                ...flag.queryParams.languages,
                ...flag.queryParams.frameworks,
                ...flag.queryParams.tools,
                ...flag.queryParams.aiAgentPatterns,
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-1.5 py-0.5 rounded-full bg-surface-inset text-[10px] font-mono text-th-text-secondary"
                >
                  {tag.split(':')[1] ?? tag}
                </span>
              ))}
              {flag.queryParams.aiMaturityMin !== null && (
                <span className="inline-flex px-1.5 py-0.5 rounded-full bg-violet-50 text-[10px] font-mono text-violet-600">
                  AI {'\u2265'} {flag.queryParams.aiMaturityMin}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-2 py-1 bg-surface-inset text-th-text-secondary rounded text-xs hover:bg-th-hover transition-colors flex-shrink-0"
        >
          Trigger Discovery
        </button>
      </div>

      {showForm && (
        <div className="mt-3 p-3 bg-surface rounded">
          {flag.queryParams && (
            <pre className="text-xs font-mono text-th-text-secondary mb-2">
              {buildSuggestedCommand(flag.queryParams)}
            </pre>
          )}
          <button
            type="button"
            onClick={() => void handleTriggerDiscovery()}
            disabled={queueDiscover.isPending}
            className="px-3 py-1 bg-slate-900 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {queueDiscover.isPending ? 'Queuing...' : 'Queue & Mark Actioned'}
          </button>
        </div>
      )}
    </div>
  );
}

function RepoFlagRow({ flag }: { flag: AdminFlag & { id: string } }) {
  const { user } = useAuth();
  const actionFlag = useActionFlag();

  const handleAction = async () => {
    if (!user) return;
    await actionFlag.mutateAsync({ flagId: flag.id, adminUid: user.uid });
  };

  return (
    <div className="border border-border rounded-lg p-3 flex items-start justify-between">
      <div>
        <span className="text-sm font-mono text-th-text-primary">{flag.repoFullName ?? flag.repoId}</span>
        {flag.detectedSignals && flag.detectedSignals.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {flag.detectedSignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex px-1.5 py-0.5 rounded-full bg-violet-50 text-[10px] text-violet-600"
              >
                {signal}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => void handleAction()}
        disabled={actionFlag.isPending}
        className="px-2 py-1 bg-surface-inset text-th-text-secondary rounded text-xs hover:bg-th-hover disabled:opacity-50 transition-colors flex-shrink-0"
      >
        Mark as actioned
      </button>
    </div>
  );
}
