/**
 * tests/unit/us-016-admin-ui.test.ts
 *
 * Unit tests for US-016: Admin UI — shell, pipeline trigger, job queue monitor,
 * and flags tab.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── AdminPage Shell ────────────────────────────────────────────────────────

describe('US-016: AdminPage Shell', () => {
  const src = readSource('src/app/pages/AdminPage.tsx');

  it('renders four tabs: Pipeline, Queue, Flags, Candidates', () => {
    expect(src).toContain("label: 'Pipeline'");
    expect(src).toContain("label: 'Queue'");
    expect(src).toContain("label: 'Flags'");
    expect(src).toContain("label: 'Candidates'");
  });

  it('supports deep-linking via ?tab= URL param', () => {
    expect(src).toContain('useSearchParams');
    expect(src).toContain("searchParams.get('tab')");
  });

  it('defaults to pipeline tab', () => {
    expect(src).toContain("'pipeline'");
  });

  it('renders PipelineTab component', () => {
    expect(src).toContain('PipelineTab');
    expect(src).toContain("activeTab === 'pipeline'");
  });

  it('renders QueueTab component', () => {
    expect(src).toContain('QueueTab');
    expect(src).toContain("activeTab === 'queue'");
  });

  it('renders FlagsTab component', () => {
    expect(src).toContain('FlagsTab');
    expect(src).toContain("activeTab === 'flags'");
  });

  it('renders CandidatesTab for candidates tab', () => {
    expect(src).toContain("activeTab === 'candidates'");
    expect(src).toContain('CandidatesTab');
  });

  it('has sticky nav and tab bar', () => {
    expect(src).toContain('sticky top-0');
    expect(src).toContain('sticky top-12');
  });

  it('highlights active tab with border', () => {
    expect(src).toContain('border-indigo-500');
    expect(src).toContain('border-transparent');
  });

  it('links back to search', () => {
    expect(src).toContain('to="/search"');
  });
});

// ─── PipelineTab ────────────────────────────────────────────────────────────

describe('US-016: PipelineTab', () => {
  const src = readSource('src/app/components/admin/PipelineTab.tsx');

  it('renders discovery run form', () => {
    expect(src).toContain('Discovery Run');
    expect(src).toContain('<form');
  });

  it('has Query field (required)', () => {
    expect(src).toContain("'query'");
    expect(src).toContain('Query is required');
  });

  it('has Source select (default github)', () => {
    expect(src).toContain("'source'");
    expect(src).toContain("source: 'github'");
    expect(src).toContain('<option value="github">GitHub</option>');
  });

  it('has Limit field (1-1000, default 100)', () => {
    expect(src).toContain("'limit'");
    expect(src).toContain('min(1)');
    expect(src).toContain('max(1000)');
    expect(src).toContain('limit: 100');
  });

  it('uses React Hook Form with Zod resolver', () => {
    expect(src).toContain('useForm');
    expect(src).toContain('zodResolver');
    expect(src).toContain('discoverSchema');
  });

  it('disables form during submission', () => {
    expect(src).toContain('formState.isSubmitting');
  });

  it('queues discover job via useQueueDiscover', () => {
    expect(src).toContain('useQueueDiscover');
    expect(src).toContain('queueDiscover.mutateAsync');
  });

  it('shows success confirmation', () => {
    expect(src).toContain('queueDiscover.isSuccess');
    expect(src).toContain('queued successfully');
  });

  it('resets form after successful submit', () => {
    expect(src).toContain('reset()');
  });
});

// ─── QueueTab ───────────────────────────────────────────────────────────────

describe('US-016: QueueTab', () => {
  const src = readSource('src/app/components/admin/QueueTab.tsx');

  it('has status filter tabs: All, Pending, Running, Completed, Failed', () => {
    expect(src).toContain("label: 'All'");
    expect(src).toContain("label: 'Pending'");
    expect(src).toContain("label: 'Running'");
    expect(src).toContain("label: 'Completed'");
    expect(src).toContain("label: 'Failed'");
  });

  it('shows auto-refresh indicator', () => {
    expect(src).toContain('Auto-refreshes every 30s');
  });

  it('renders job table with column headers', () => {
    expect(src).toContain('Type');
    expect(src).toContain('Status');
    expect(src).toContain('Created At');
    expect(src).toContain('Attempts');
    expect(src).toContain('Error');
    expect(src).toContain('Actions');
  });

  it('renders AdminQueueRow for each job', () => {
    expect(src).toContain('AdminQueueRow');
    expect(src).toContain('jobs.map');
  });

  it('highlights active filter tab', () => {
    expect(src).toContain('bg-slate-900 text-white');
  });

  it('shows loading skeleton', () => {
    expect(src).toContain('animate-pulse');
    expect(src).toContain('isLoading');
  });

  it('shows empty state when no jobs', () => {
    expect(src).toContain('No jobs found');
  });

  it('passes retry and dismiss callbacks', () => {
    expect(src).toContain('onRetry');
    expect(src).toContain('onDismiss');
  });
});

// ─── AdminQueueRow ──────────────────────────────────────────────────────────

describe('US-016: AdminQueueRow Component', () => {
  const src = readSource('src/app/components/admin/AdminQueueRow.tsx');

  it('shows job type', () => {
    expect(src).toContain('job.type');
  });

  it('shows status badge with color coding', () => {
    expect(src).toContain('STATUS_COLORS');
    expect(src).toContain('job.status');
    expect(src).toContain("pending: 'bg-yellow-100");
    expect(src).toContain("failed: 'bg-red-100");
  });

  it('shows created date', () => {
    expect(src).toContain('job.createdAt');
    expect(src).toContain('toLocaleString');
  });

  it('shows attempts out of maxAttempts', () => {
    expect(src).toContain('job.attempts');
    expect(src).toContain('job.maxAttempts');
  });

  it('truncates error message', () => {
    expect(src).toContain('errorTruncated');
    expect(src).toContain('.slice(0, 40)');
  });

  it('shows full error in expandable section', () => {
    expect(src).toContain('showError');
    expect(src).toContain('job.errorMessage');
  });

  it('has Retry button for failed jobs', () => {
    expect(src).toContain('Retry');
    expect(src).toContain('onRetry');
  });

  it('has Dismiss button for failed jobs', () => {
    expect(src).toContain('Dismiss');
    expect(src).toContain('onDismiss');
  });

  it('only shows actions for failed status', () => {
    expect(src).toContain("job.status === 'failed'");
  });
});

// ─── FlagsTab ───────────────────────────────────────────────────────────────

describe('US-016: FlagsTab', () => {
  const src = readSource('src/app/components/admin/FlagsTab.tsx');

  it('shows underserved queries section', () => {
    expect(src).toContain('Underserved Queries');
    expect(src).toContain("f.type === 'underserved-query'");
  });

  it('shows repos-of-interest section', () => {
    expect(src).toContain('Repos of Interest');
    expect(src).toContain("f.type === 'repo-of-interest'");
  });

  it('sorts underserved queries by resultCount ASC', () => {
    expect(src).toContain('.sort((a, b) => (a.resultCount');
    expect(src).toContain('b.resultCount');
  });

  it('shows facet params as chips', () => {
    expect(src).toContain('flag.queryParams');
    expect(src).toContain('languages');
    expect(src).toContain('frameworks');
  });

  it('shows result count', () => {
    expect(src).toContain('flag.resultCount');
    expect(src).toContain('result');
  });

  it('shows flagged date', () => {
    expect(src).toContain('flag.createdAt');
    expect(src).toContain('toLocaleDateString');
  });

  it('shows status badge', () => {
    expect(src).toContain('flag.status');
    expect(src).toContain("'active'");
  });

  it('has Trigger Discovery button', () => {
    expect(src).toContain('Trigger Discovery');
  });

  it('shows inline form with pre-filled query', () => {
    expect(src).toContain('buildSuggestedCommand');
    expect(src).toContain('showForm');
  });

  it('queues discover job and marks flag actioned', () => {
    expect(src).toContain('queueDiscover.mutateAsync');
    expect(src).toContain('actionFlag.mutateAsync');
  });

  it('shows repos-of-interest with detected signals', () => {
    expect(src).toContain('flag.detectedSignals');
    expect(src).toContain('flag.repoFullName');
  });

  it('has Mark as actioned button for repos', () => {
    expect(src).toContain('Mark as actioned');
  });

  it('shows empty state when no flags', () => {
    expect(src).toContain('No active flags');
  });
});

// ─── useAdmin Hooks ─────────────────────────────────────────────────────────

describe('US-016: useAdmin Hooks', () => {
  const src = readSource('src/app/hooks/useAdmin.ts');

  it('exports useJobs hook with status filter', () => {
    expect(src).toContain('export function useJobs');
    expect(src).toContain('statusFilter');
  });

  it('auto-refreshes jobs every 30s', () => {
    expect(src).toContain('refetchInterval: 30_000');
  });

  it('exports useAdminFlags hook', () => {
    expect(src).toContain('export function useAdminFlags');
  });

  it('exports useRetryJob mutation', () => {
    expect(src).toContain('export function useRetryJob');
    expect(src).toContain("status: 'pending'");
    expect(src).toContain('attempts: 0');
  });

  it('exports useDismissJob mutation', () => {
    expect(src).toContain('export function useDismissJob');
  });

  it('exports useQueueDiscover mutation', () => {
    expect(src).toContain('export function useQueueDiscover');
    expect(src).toContain('enqueueDiscoverJob');
  });

  it('exports useActionFlag mutation', () => {
    expect(src).toContain('export function useActionFlag');
    expect(src).toContain("status: 'actioned'");
  });

  it('invalidates queries on mutation success', () => {
    expect(src).toContain('invalidateQueries');
    expect(src).toContain("queryKey: ['admin-jobs']");
    expect(src).toContain("queryKey: ['admin-flags']");
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '@/core/db/firestore'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── Routing Integration ────────────────────────────────────────────────────

describe('US-016: Routing Integration', () => {
  const mainSrc = readSource('src/app/main.tsx');

  it('admin routes use AdminRoute guard', () => {
    expect(mainSrc).toContain('AdminRoute');
    expect(mainSrc).toContain('AdminPage');
  });

  it('non-admin users redirected (handled by AdminRoute)', () => {
    expect(mainSrc).toContain('/admin/*');
    expect(mainSrc).toContain('AdminRoute');
  });
});
