/**
 * src/pipeline/commands/discover.ts — `scan discover` command handler.
 *
 * Creates a discover ScanJob in scan_jobs collection.
 */

import { enqueueDiscoverJob } from '../queue.js';
import type { DiscoverPayload } from '../../types/scan-job.js';

export interface DiscoverOptions {
  query: string;
  limit: number;
  source?: string;
}

/**
 * Handles the `scan discover` command.
 * Creates a discover ScanJob document and logs the job ID.
 */
export async function runDiscover(opts: DiscoverOptions): Promise<void> {
  const { query, limit, source = 'github' } = opts;

  if (!query || query.trim() === '') {
    console.error('[discover] --query is required and cannot be empty.');
    process.exit(1);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    console.error('[discover] --limit must be an integer between 1 and 1000.');
    process.exit(1);
  }

  if (source !== 'github') {
    console.error('[discover] --source must be "github" (only supported source in MVP).');
    process.exit(1);
  }

  const payload: DiscoverPayload = {
    query: query.trim(),
    source: 'github',
    limit,
  };

  console.log(`[discover] Enqueueing discover job: query="${payload.query}" limit=${payload.limit}`);

  const jobId = await enqueueDiscoverJob(payload);

  console.log(`[discover] Job created: ${jobId}`);
  console.log(`[discover] Status: pending | Priority: 0 | Attempts: 0/${3}`);
}
