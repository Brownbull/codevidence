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
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function AdminQueueRow({ job, onRetry, onDismiss }: AdminQueueRowProps) {
  const [showError, setShowError] = useState(false);
  const createdDate = job.createdAt?.toDate?.()
    ? job.createdAt.toDate().toLocaleString()
    : 'Unknown';

  const errorTruncated = job.errorMessage
    ? job.errorMessage.length > 40
      ? job.errorMessage.slice(0, 40) + '...'
      : job.errorMessage
    : '\u2014';

  return (
    <>
      <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-slate-100 text-xs items-center">
        <span className="font-mono text-slate-700">{job.type}</span>
        <span>
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[job.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {job.status}
          </span>
        </span>
        <span className="text-slate-500">{createdDate}</span>
        <span className="text-slate-500">{job.attempts}/{job.maxAttempts}</span>
        <span
          className="text-slate-500 cursor-pointer hover:text-slate-700"
          title={job.errorMessage ?? undefined}
          onClick={() => job.errorMessage && setShowError(!showError)}
        >
          {errorTruncated}
        </span>
        <span className="flex gap-1">
          {job.status === 'failed' && (
            <>
              <button
                type="button"
                onClick={onRetry}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-[10px] transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-[10px] transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </span>
      </div>

      {/* Expanded error message */}
      {showError && job.errorMessage && (
        <div className="px-4 py-2 bg-red-50 border-b border-slate-100">
          <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap break-all">
            {job.errorMessage}
          </pre>
        </div>
      )}
    </>
  );
}
