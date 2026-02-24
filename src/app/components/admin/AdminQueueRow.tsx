/**
 * src/app/components/admin/AdminQueueRow.tsx — Single job row in the queue table.
 *
 * Shows type, status badge, created date, attempts, truncated error, actions.
 */

import React, { useState } from 'react';
import type { ScanJob } from '@/types/scan-job';

interface AdminQueueRowProps {
  job: ScanJob & { id: string };
  onRetry: () => void;
  onDismiss: () => void;
  onCancel: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function getJobTarget(job: ScanJob & { id: string }): { label: string; href: string | null } {
  const payload = job.payload;
  if ('repoFullName' in payload) {
    return {
      label: payload.repoFullName,
      href: `https://github.com/${payload.repoFullName}`,
    };
  }
  if ('query' in payload) {
    return { label: payload.query, href: null };
  }
  if ('targetId' in payload) {
    return { label: payload.targetId, href: null };
  }
  return { label: '\u2014', href: null };
}

/** Returns a human-readable time-ago string from a Firestore Timestamp. */
function timeAgo(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return '';
  const diffMs = Date.now() - ts.toDate().getTime();
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Returns a status-aware duration label. */
function getStatusDuration(job: ScanJob): string {
  if (job.status === 'pending') return `waiting ${timeAgo(job.createdAt)}`;
  if (job.status === 'running') return `started ${timeAgo(job.lastAttemptAt ?? job.updatedAt)}`;
  return '';
}

export function AdminQueueRow({ job, onRetry, onDismiss, onCancel }: AdminQueueRowProps) {
  const [showError, setShowError] = useState(false);
  const createdDate = job.createdAt?.toDate?.()
    ? job.createdAt.toDate().toLocaleString()
    : 'Unknown';

  const errorTruncated = job.errorMessage
    ? job.errorMessage.length > 40
      ? job.errorMessage.slice(0, 40) + '...'
      : job.errorMessage
    : '\u2014';

  const target = getJobTarget(job);

  return (
    <>
      <div className="grid grid-cols-7 gap-2 px-4 py-2 border-b border-border text-xs items-center min-w-[700px]">
        <span className="font-mono text-th-text-primary">{job.type}</span>
        <span className="truncate" title={target.label}>
          {target.href ? (
            <a
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {target.label}
            </a>
          ) : (
            <span className="text-th-text-secondary">{target.label}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[job.status] ?? 'bg-surface-inset text-th-text-secondary'}`}>
            {job.status}
          </span>
          {(job.status === 'pending' || job.status === 'running') && (
            <span className="text-[10px] text-th-text-muted italic">{getStatusDuration(job)}</span>
          )}
        </span>
        <span className="text-th-text-secondary">{createdDate}</span>
        <span className="text-th-text-secondary">{job.attempts}/{job.maxAttempts}</span>
        <span
          className="text-th-text-secondary cursor-pointer hover:text-th-text-primary"
          title={job.errorMessage ?? undefined}
          onClick={() => job.errorMessage && setShowError(!showError)}
        >
          {errorTruncated}
        </span>
        <span className="flex gap-1">
          {(job.status === 'pending' || job.status === 'running') && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-[10px] transition-colors"
            >
              Cancel
            </button>
          )}
          {job.status === 'failed' && (
            <>
              <button
                type="button"
                onClick={onRetry}
                className="px-2 py-0.5 bg-surface-inset text-th-text-secondary rounded hover:bg-th-hover text-[10px] transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-2 py-0.5 bg-surface-inset text-th-text-secondary rounded hover:bg-th-hover text-[10px] transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </span>
      </div>

      {/* Expanded error message */}
      {showError && job.errorMessage && (
        <div className="px-4 py-2 bg-red-50 border-b border-border">
          <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap break-all">
            {job.errorMessage}
          </pre>
        </div>
      )}
    </>
  );
}
