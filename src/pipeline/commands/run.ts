/**
 * src/pipeline/commands/run.ts — Interactive `scan run` command.
 *
 * Shows queue status, then offers to process pending jobs.
 * Options: all, first N, or skip. Runs the worker inline until
 * the selected batch is done, then exits cleanly.
 */

import * as readline from 'readline/promises';
import { fetchJobsByStatus } from '../queue.js';
import { processOneJob } from '../worker.js';
import { handleDiscover } from '../handlers/discover.js';
import { handleScanRepo } from '../handlers/scan-repo.js';
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

const HANDLERS: JobHandlerRegistry = {
  discover: handleDiscover,
  'scan-repo': handleScanRepo,
};

/**
 * Handles the `scan run` command.
 * Shows status → prompts for batch size → processes jobs → exits.
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

  // ── Show what's pending ────────────────────────────────────────────────────
  printPendingSummary(pending);

  // ── Prompt for batch size ──────────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nHow many jobs to process?');
  console.log(`  [a] All ${pending.length} jobs`);
  console.log('  [5] First 5');
  console.log('  [10] First 10');
  console.log('  [20] First 20');
  console.log('  [n] Enter a number');
  console.log('  [q] Quit\n');

  const answer = await rl.question('> ');
  rl.close();

  const batchSize = parseBatchSize(answer, pending.length);

  if (batchSize === null) {
    console.log('Exiting.');
    return;
  }

  if (batchSize <= 0) {
    console.log('Invalid choice. Exiting.');
    return;
  }

  // ── Process jobs ───────────────────────────────────────────────────────────
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

  // ── Final summary ──────────────────────────────────────────────────────────
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

/** Prints a summary of pending jobs grouped by type, with example targets. */
function printPendingSummary(jobs: (ScanJob & { id: string })[]): void {
  const byType = new Map<string, { count: number; example: string }>();
  for (const job of jobs) {
    const existing = byType.get(job.type);
    if (existing) {
      existing.count++;
    } else {
      byType.set(job.type, { count: 1, example: getJobTarget(job) });
    }
  }

  console.log('\nPending jobs by type:');
  for (const [type, { count, example }] of byType) {
    const suffix = example ? ` (e.g. ${example})` : '';
    console.log(`  ${type}: ${count}${suffix}`);
  }
}
