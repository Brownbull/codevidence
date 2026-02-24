/**
 * src/pipeline/index.ts — Commander.js CLI entry point for the scan pipeline.
 *
 * Commands:
 *   scan discover --query <q> --limit <n> [--source github]
 *   scan rescan --target-type <candidate|repo> --target-id <id>
 *   scan status [--filter <status>] [--limit <n>]
 *   scan worker  (start the polling worker loop)
 *
 * Run via: pnpm scan <command> [options]
 * Targets tsconfig.pipeline.json (Node.js, ES2022, no DOM).
 */

import { Command } from 'commander';
import { runDiscover } from './commands/discover.js';
import { runRescan } from './commands/rescan.js';
import { runStatus } from './commands/status.js';
import { startWorker } from './worker.js';
import { handleDiscover } from './handlers/discover.js';

const program = new Command();

program
  .name('scan')
  .description('Candidate skill scanner — pipeline CLI')
  .version('0.1.0');

// ─── scan discover ────────────────────────────────────────────────────────────

program
  .command('discover')
  .description('Discover repositories matching a search query and enqueue scan jobs')
  .requiredOption('-q, --query <query>', 'GitHub search query string')
  .option('-l, --limit <number>', 'Max repositories to discover', (v) => parseInt(v, 10), 100)
  .option('-s, --source <source>', 'Source to search (github)', 'github')
  .action(async (opts: { query: string; limit: number; source: string }) => {
    await runDiscover(opts);
    process.exit(0);
  });

// ─── scan rescan ─────────────────────────────────────────────────────────────

program
  .command('rescan')
  .description('Re-scan an existing candidate or repository')
  .requiredOption(
    '-t, --target-type <type>',
    'What to rescan: "candidate" or "repo"'
  )
  .requiredOption('-i, --target-id <id>', 'Firestore document ID of the target')
  .action(async (opts: { targetType: string; targetId: string }) => {
    const targetType = opts.targetType as 'candidate' | 'repo';
    await runRescan({ targetType, targetId: opts.targetId });
    process.exit(0);
  });

// ─── scan status ─────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show the current state of the scan job queue')
  .option(
    '-f, --filter <status>',
    'Filter by status: pending, running, completed, failed'
  )
  .option('-l, --limit <number>', 'Max jobs to display', (v) => parseInt(v, 10), 20)
  .action(async (opts: { filter?: string; limit: number }) => {
    await runStatus(opts);
    process.exit(0);
  });

// ─── scan worker ─────────────────────────────────────────────────────────────

program
  .command('worker')
  .description('Start the polling worker loop (Ctrl-C to stop)')
  .action(() => {
    startWorker({
      discover: handleDiscover,
    });
    console.log('[scan] Worker started. Press Ctrl-C to stop.');
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);
