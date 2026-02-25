/**
 * src/pipeline/handlers/rescan-candidate.ts — rescan-candidate job handler.
 *
 * Handles rescan-candidate ScanJobs: fetches all repos for the candidate,
 * then enqueues scan-repo (layer2) jobs for each one. Each scan-repo job
 * triggers updateCandidateProfile(owner) on completion, so the candidate
 * profile is rebuilt with fresh data after the last repo finishes.
 */

import type { ScanJob, RescanPayload } from '../../types/scan-job.js';
import type { Repository } from '../../types/repository.js';
import { queryDocs, where } from '../../core/db/firestore.js';
import { enqueueScanRepoJob } from '../queue.js';

const REPOSITORIES_COLLECTION = 'repositories';

/**
 * Handles a rescan-candidate ScanJob.
 *
 * 1. Fetch all Repository docs for the candidate (owner)
 * 2. Enqueue a scan-repo (layer2) job for each repo
 * 3. Log summary
 */
export async function handleRescanCandidate(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as RescanPayload;
  const { targetId } = payload;

  console.log(`[rescan-candidate] Processing job ${job.id}: candidate=${targetId}`);

  // Fetch all repos for this candidate
  const repos = await queryDocs<Repository>(
    REPOSITORIES_COLLECTION,
    where('owner', '==', targetId),
  );

  if (repos.length === 0) {
    console.log(`[rescan-candidate] No repositories found for ${targetId}. Nothing to rescan.`);
    return;
  }

  console.log(`[rescan-candidate] Found ${repos.length} repo(s) for ${targetId}. Enqueueing scan-repo jobs...`);

  // Enqueue a scan-repo (layer2) job for each repo with high priority
  const jobIds = await Promise.all(
    repos.map((repo) =>
      enqueueScanRepoJob({ repoFullName: repo.fullName, targetDepth: 'layer2' }, 1)
    )
  );

  console.log(
    `[rescan-candidate] Enqueued ${jobIds.length} scan-repo job(s) for ${targetId}: ` +
    repos.map((r) => r.fullName).join(', ')
  );
}
