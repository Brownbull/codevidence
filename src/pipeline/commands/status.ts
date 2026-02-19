/**
 * src/pipeline/commands/status.ts — `scan status` command handler.
 *
 * Displays the current state of the scan_jobs queue.
 */

import { fetchJobsByStatus, fetchRecentJobs } from '../queue.js';
import type { ScanJob } from '../../types/scan-job.js';

export interface StatusOptions {
  filter?: string;
  limit?: number;
}

const VALID_STATUSES: ScanJob['status'][] = ['pending', 'running', 'completed', 'failed'];

/**
 * Handles the `scan status` command.
 * Shows queue summary or filtered job list.
 */
export async function runStatus(opts: StatusOptions): Promise<void> {
  const { filter, limit = 20 } = opts;

  if (filter) {
    if (!VALID_STATUSES.includes(filter as ScanJob['status'])) {
      console.error(`[status] --filter must be one of: ${VALID_STATUSES.join(', ')}`);
      process.exit(1);
    }
    await showFilteredJobs(filter as ScanJob['status'], limit);
  } else {
    await showQueueSummary();
  }
}

/** Shows all statuses with counts + recent jobs. */
async function showQueueSummary(): Promise<void> {
  console.log('\n[status] Fetching queue summary...\n');

  const [pending, running, completed, failed] = await Promise.all([
    fetchJobsByStatus('pending', 100),
    fetchJobsByStatus('running', 100),
    fetchJobsByStatus('completed', 100),
    fetchJobsByStatus('failed', 100),
  ]);

  console.log('── Queue Summary ────────────────────────');
  console.log(`  pending:   ${pending.length}`);
  console.log(`  running:   ${running.length}`);
  console.log(`  completed: ${completed.length}`);
  console.log(`  failed:    ${failed.length}`);
  console.log('─────────────────────────────────────────\n');

  const recent = await fetchRecentJobs(10);
  if (recent.length > 0) {
    console.log('── Recent Jobs (last 10) ─────────────────');
    for (const job of recent) {
      printJobLine(job);
    }
    console.log('─────────────────────────────────────────\n');
  }
}

/** Shows jobs filtered by a specific status. */
async function showFilteredJobs(
  status: ScanJob['status'],
  maxResults: number
): Promise<void> {
  console.log(`\n[status] Fetching ${status} jobs (max ${maxResults})...\n`);

  const jobs = await fetchJobsByStatus(status, maxResults);

  if (jobs.length === 0) {
    console.log(`[status] No ${status} jobs found.\n`);
    return;
  }

  console.log(`── ${status.toUpperCase()} Jobs (${jobs.length}) ───────────────────`);
  for (const job of jobs) {
    printJobLine(job);
    if (job.errorMessage) {
      console.log(`         error: ${job.errorMessage}`);
    }
  }
  console.log('─────────────────────────────────────────\n');
}

/** Formats a single job line for display. */
function printJobLine(job: ScanJob & { id: string }): void {
  const id = job.id.slice(0, 8);
  const type = job.type.padEnd(20);
  const status = job.status.padEnd(10);
  const attempts = `${job.attempts}/${job.maxAttempts}`;
  console.log(`  ${id}  ${type}  ${status}  attempts: ${attempts}`);
}
