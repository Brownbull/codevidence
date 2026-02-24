/**
 * src/app/components/admin/QueueTab.tsx — Job queue monitor.
 *
 * Jobs table with status filter tabs. Auto-refreshes every 30s.
 * Retry and dismiss actions on failed jobs.
 */

import React, { useState } from 'react';
import type { ScanJobStatus } from '@/types/scan-job';
import { useJobs, useRetryJob, useDismissJob } from '@/app/hooks/useAdmin';
import { AdminQueueRow } from './AdminQueueRow';

const STATUS_TABS: { label: string; value: ScanJobStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Running', value: 'running' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

export function QueueTab() {
  const [statusFilter, setStatusFilter] = useState<ScanJobStatus | 'all'>('all');
  const { data: jobs, isLoading } = useJobs(statusFilter);
  const retryJob = useRetryJob();
  const dismissJob = useDismissJob();

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Job Queue</h2>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              statusFilter === tab.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <p className="text-xs text-slate-400 mb-3">Auto-refreshes every 30s</p>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No jobs found.</p>
      )}

      {jobs && jobs.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200">
            <span>Type</span>
            <span>Status</span>
            <span>Created At</span>
            <span>Attempts</span>
            <span>Error</span>
            <span>Actions</span>
          </div>

          {/* Job rows */}
          {jobs.map((job) => (
            <AdminQueueRow
              key={job.id}
              job={job}
              onRetry={() => retryJob.mutate(job.id)}
              onDismiss={() => dismissJob.mutate(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
