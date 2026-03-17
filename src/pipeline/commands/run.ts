/**
 * src/pipeline/commands/run.ts — Interactive `scan run` command.
 *
 * Shows queue status, lists pending jobs with details, allows
 * cancelling individual jobs, then processes remaining pending jobs.
 */

import * as readline from 'readline/promises';
import { fetchJobsByStatus, cancelJob } from '../queue.js';
import { processOneJob } from '../worker.js';
import { handleDiscover } from '../handlers/discover.js';
import { handleScanRepo } from '../handlers/scan-repo.js';
import { handleRescanCandidate } from '../handlers/rescan-candidate.js';
import type { ScanJob } from '../../types/scan-job.js';
import type { JobHandlerRegistry } from '../worker.js';

/** Extracts a target label from the job payload for display. */
function getJobTarget(job: ScanJob): string {
  const payload = job.payload;
  if ('repoFullName' in payload) return payload.repoFullName;
  if ('query' in payload) return payload.query;
  if ('targetId' in payload) return payload.targetId;
  return '';
}

/** Formats a Firestore Timestamp to a short date/time string. */
function formatTimestamp(ts: ScanJob['createdAt']): string {
  if (!ts || !('toDate' in ts)) return 'unknown';
  const d = ts.toDate();
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const HANDLERS: JobHandlerRegistry = {
  discover: handleDiscover,
  'scan-repo': handleScanRepo,
  'rescan-candidate': handleRescanCandidate,
};

/**
 * Handles the `scan run` command.
 * Shows status → lists jobs → cancel flow → batch processing → exits.
 */
export async function runInteractive(): Promise<void> {
  // ── Show queue status ──────────────────────────────────────────────────────
  const [pending, running, completed, failed] = await Promise.all([
    fetchJobsByStatus('pending', 500),
    fetchJobsByStatus('running', 100),
    fetchJobsByStatus('completed', 100),
    fetchJobsByStatus('failed', 100),
  ]);

  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│          Scan Pipeline Status            │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  Pending:    ${String(pending.length).padStart(4)}                       │`);
  console.log(`│  Running:    ${String(running.length).padStart(4)}                       │`);
  console.log(`│  Completed:  ${String(completed.length).padStart(4)}                       │`);
  console.log(`│  Failed:     ${String(failed.length).padStart(4)}                       │`);
  console.log('└─────────────────────────────────────────┘');

  if (pending.length === 0) {
    console.log('\nNo pending jobs. Nothing to process.');

    if (failed.length > 0) {
      console.log(`\n${failed.length} failed job(s). Use "pnpm scan status --filter failed" to see details.`);
    }
    return;
  }

  // ── List pending jobs with details ───────────────────────────────────────
  printJobList(pending);

  // ── Cancel flow ──────────────────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let activePending = pending;

  try {
    activePending = await cancelLoop(rl, activePending);
  } catch {
    console.log('\nInput closed. Exiting.');
    rl.close();
    return;
  }

  if (activePending.length === 0) {
    console.log('\nAll pending jobs cancelled. Nothing to process.');
    rl.close();
    return;
  }

  // ── Prompt for batch size ──────────────────────────────────────────────
  console.log(`\n${activePending.length} pending job(s) remaining.`);
  console.log('How many jobs to process?');
  console.log(`  [a] All ${activePending.length} jobs`);
  if (activePending.length > 5) console.log('  [5] First 5');
  if (activePending.length > 10) console.log('  [10] First 10');
  if (activePending.length > 20) console.log('  [20] First 20');
  console.log('  [n] Enter a number');
  console.log('  [q] Quit\n');

  const answer = await rl.question('> ');
  rl.close();

  const batchSize = parseBatchSize(answer, activePending.length);

  if (batchSize === null) {
    console.log('Exiting.');
    return;
  }

  if (batchSize <= 0) {
    console.log('Invalid choice. Exiting.');
    return;
  }

  // ── Process jobs ───────────────────────────────────────────────────────
  console.log(`\nProcessing ${batchSize} job(s)...\n`);

  let processed = 0;

  while (processed < batchSize) {
    const hadJob = await processOneJob(HANDLERS);
    if (!hadJob) {
      console.log('\nNo more pending jobs.');
      break;
    }
    processed++;

    const remaining = batchSize - processed;
    process.stdout.write(
      `\r  [${processed}/${batchSize}] — ${remaining > 0 ? `${remaining} remaining` : 'done'}       `
    );
  }

  console.log('\n');

  // ── Final summary ──────────────────────────────────────────────────────
  const [finalPending, finalCompleted, finalFailed] = await Promise.all([
    fetchJobsByStatus('pending', 500),
    fetchJobsByStatus('completed', 100),
    fetchJobsByStatus('failed', 100),
  ]);

  console.log('┌─────────────────────────────────────────┐');
  console.log('│          Processing Complete             │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  Processed:  ${String(processed).padStart(4)}                       │`);
  console.log(`│  Remaining:  ${String(finalPending.length).padStart(4)}                       │`);
  console.log('└─────────────────────────────────────────┘');

  if (finalPending.length > 0) {
    console.log(`\nRun "pnpm scan run" again to process the remaining ${finalPending.length} jobs.`);
  }
}

/** Parse user input into a batch size. Returns null for quit. */
function parseBatchSize(input: string, total: number): number | null {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit') return null;
  if (trimmed === 'a' || trimmed === 'all') return total;
  if (trimmed === '') return null;

  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num) || num < 1) return 0;
  return Math.min(num, total);
}

/** Prints the full list of pending jobs with index, type, target, and creation date. */
function printJobList(jobs: (ScanJob & { id: string })[]): void {
  console.log(`\nPending jobs (${jobs.length}):\n`);

  const idxWidth = String(jobs.length).length;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]!;
    const idx = String(i + 1).padStart(idxWidth);
    const target = getJobTarget(job);
    const created = formatTimestamp(job.createdAt);
    const attempts = job.attempts > 0 ? ` [attempt ${job.attempts}/${job.maxAttempts}]` : '';
    const error = job.errorMessage ? ` — ${job.errorMessage}` : '';

    console.log(`  ${idx}. [${job.type}] ${target}  (created: ${created})${attempts}${error}`);
  }
}

/**
 * Interactive loop allowing the user to cancel pending jobs by index.
 * Returns the remaining (non-cancelled) jobs.
 */
async function cancelLoop(
  rl: readline.Interface,
  jobs: (ScanJob & { id: string })[]
): Promise<(ScanJob & { id: string })[]> {
  const cancelled = new Set<string>();

  console.log('\nCancel jobs? Enter job numbers (e.g. "1", "2,4,5"), ranges ("1-3"), or:');
  console.log('  [s] Skip — proceed to processing');
  console.log('  [q] Quit\n');

  while (true) {
    const answer = await rl.question('cancel> ');
    const trimmed = answer.trim().toLowerCase();

    if (trimmed === 's' || trimmed === 'skip' || trimmed === '') break;
    if (trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit') {
      console.log('Exiting.');
      rl.close();
      process.exit(0);
    }

    const indices = parseIndices(trimmed, jobs.length);

    if (indices.length === 0) {
      console.log('  Invalid input. Use numbers (e.g. "1,3,5"), ranges ("2-4"), [s]kip, or [q]uit.');
      continue;
    }

    const toCancel = indices.filter((i) => !cancelled.has(jobs[i]!.id));

    if (toCancel.length === 0) {
      console.log('  Those jobs are already cancelled.');
      continue;
    }

    for (const i of toCancel) {
      const job = jobs[i]!;
      const target = getJobTarget(job);
      try {
        await cancelJob(job.id);
        cancelled.add(job.id);
        console.log(`  ✕ Cancelled #${i + 1}: [${job.type}] ${target}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ! Failed to cancel #${i + 1}: ${msg}`);
      }
    }

    const remaining = jobs.length - cancelled.size;
    console.log(`  ${cancelled.size} cancelled, ${remaining} remaining.`);

    if (remaining === 0) break;
  }

  return jobs.filter((j) => !cancelled.has(j.id));
}

/**
 * Parses user input like "1", "1,3,5", "2-4", "1-3,7" into 0-based indices.
 * Invalid or out-of-range parts are silently skipped.
 */
function parseIndices(input: string, total: number): number[] {
  const result: number[] = [];
  const parts = input.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const segments = part.split('-');
      const start = parseInt(segments[0] ?? '', 10);
      const end = parseInt(segments[1] ?? '', 10);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
        result.push(i - 1);
      }
    } else {
      const num = parseInt(part, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= total) {
        result.push(num - 1);
      }
    }
  }

  return [...new Set(result)];
}
