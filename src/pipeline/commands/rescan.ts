/**
 * src/pipeline/commands/rescan.ts — `scan rescan` command handler.
 *
 * Creates a rescan ScanJob for a specific candidate or repo.
 */

import { enqueueRescanJob } from '../queue.js';
import type { RescanPayload } from '../../types/scan-job.js';

export interface RescanOptions {
  targetType: 'candidate' | 'repo';
  targetId: string;
  githubToken?: string;
}

/**
 * Handles the `scan rescan` command.
 * Creates a rescan-candidate or rescan-repo ScanJob with priority: 1.
 * Optionally accepts a fine-grained PAT for private repository access.
 */
export async function runRescan(opts: RescanOptions): Promise<void> {
  const { targetType, targetId, githubToken } = opts;

  if (!targetId || targetId.trim() === '') {
    console.error('[rescan] --target-id is required and cannot be empty.');
    process.exit(1);
  }

  if (targetType !== 'candidate' && targetType !== 'repo') {
    console.error('[rescan] --target-type must be "candidate" or "repo".');
    process.exit(1);
  }

  const payload: RescanPayload = {
    targetType,
    targetId: targetId.trim(),
    githubToken,
  };

  console.log(
    `[rescan] Enqueueing rescan job: targetType="${payload.targetType}" targetId="${payload.targetId}"` +
    (githubToken ? ' (with developer token)' : '')
  );

  const jobId = await enqueueRescanJob(payload);

  console.log(`[rescan] Job created: ${jobId}`);
  console.log(`[rescan] Status: pending | Priority: 1 (high) | Attempts: 0/${3}`);
}
