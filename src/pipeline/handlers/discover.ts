/**
 * src/pipeline/handlers/discover.ts — Discover job handler.
 *
 * Processes discover ScanJobs:
 * 1. Query GitHub Search API via the adapter
 * 2. Deduplicate against existing repositories collection
 * 3. Write new Repository docs with scanStatus: 'surface'
 * 4. Enqueue scan-repo jobs with targetDepth: 'layer1'
 *
 * Rate-limit errors are caught and converted to job rate-limit markers.
 */

import type { ScanJob, DiscoverPayload, ScanRepoPayload } from '../../types/scan-job.js';
import { repoDocId, type Repository } from '../../types/repository.js';
import type { DiscoveredRepo } from '../../adapters/source-adapter.js';
import { createGitHubAdapter, GitHubRateLimitError } from '../../adapters/github.js';
import { markJobRateLimited } from '../queue.js';
import {
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from '../../core/db/firestore.js';

const REPOSITORIES_COLLECTION = 'repositories';
const SCAN_JOBS_COLLECTION = 'scan_jobs';

/**
 * Handles a discover ScanJob.
 *
 * Queries GitHub for repos matching the payload, deduplicates against existing
 * repositories, stores new ones, and enqueues scan-repo jobs for Layer 1.
 */
export async function handleDiscover(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as DiscoverPayload;
  console.log(
    `[discover-handler] Processing job ${job.id}: ` +
    `query="${payload.query}" limit=${payload.limit} source=${payload.source}`
  );

  const adapter = createGitHubAdapter();

  let result;
  try {
    result = await adapter.searchRepositories(payload.query, payload.limit);
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      console.warn(
        `[discover-handler] Rate limited: ${err.message}. ` +
        `Setting rateLimitedUntil for ${Math.ceil(err.retryAfterMs / 60_000)}m.`
      );
      await markJobRateLimited(job.id, err.retryAfterMs);
      // Re-throw so the worker marks it appropriately
      throw err;
    }
    throw err;
  }

  console.log(
    `[discover-handler] GitHub returned ${result.repos.length} repos ` +
    `(${result.totalCount} total matches). ` +
    `Rate limit: ${result.rateLimit.remaining}/${result.rateLimit.limit} remaining.`
  );

  // Deduplicate against existing repositories
  const newRepos: DiscoveredRepo[] = [];
  const existingCount = { skipped: 0 };

  // Check all repos for existence in parallel
  const dedupeResults = await Promise.all(
    result.repos.map(async (repo) => {
      const existing = await getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName));
      return { repo, exists: existing !== null };
    })
  );

  for (const { repo, exists } of dedupeResults) {
    if (exists) {
      existingCount.skipped++;
    } else {
      newRepos.push(repo);
    }
  }

  console.log(
    `[discover-handler] Deduplication: ${newRepos.length} new, ` +
    `${existingCount.skipped} already in collection.`
  );

  if (newRepos.length === 0) {
    console.log('[discover-handler] No new repos to process. Job complete.');
    return;
  }

  // Write new Repository docs and enqueue scan-repo jobs in parallel
  await Promise.all(
    newRepos.map(async (repo) => {
      const now = serverTimestamp();

      // Write Repository doc with surface metadata
      const repoDoc: Omit<Repository, 'id'> = {
        githubUrl: repo.githubUrl,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        primaryLanguage: repo.primaryLanguage,
        languages: {},
        starCount: repo.starCount,
        forkCount: repo.forkCount,
        lastPushedAt: now as unknown as Repository['lastPushedAt'],
        topics: repo.topics,
        detectedFrameworks: [],
        detectedTools: [],
        detectedDependencies: [],
        aiConfigFiles: [],
        coAuthoredByAI: false,
        aiAttributionPatterns: [],
        commitCount: 0,
        firstCommitAt: null,
        lastCommitAt: null,
        commitSpanMonths: 0,
        isOwnerRepo: false,
        hasTestDirectory: false,
        estimatedTestCoverage: 'none',
        skillScoreContribution: 0,
        scanStatus: 'surface',
        lastScanned: now as unknown as Repository['lastScanned'],
        createdAt: now as unknown as Repository['createdAt'],
        updatedAt: now as unknown as Repository['updatedAt'],
      };

      await setDoc<Omit<Repository, 'id'>>(
        REPOSITORIES_COLLECTION,
        repoDocId(repo.fullName),
        repoDoc
      );

      // Enqueue scan-repo job for Layer 1 analysis
      const scanJobData: Omit<ScanJob, 'id'> = {
        type: 'scan-repo',
        status: 'pending',
        payload: {
          repoFullName: repo.fullName,
          targetDepth: 'layer1',
        } as ScanRepoPayload,
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: null,
        completedAt: null,
        failedAt: null,
        errorMessage: null,
        rateLimitedUntil: null,
        priority: 0,
        workerId: null,
        heartbeatAt: null,
        claimedAt: null,
        createdAt: now as unknown as ScanJob['createdAt'],
        updatedAt: now as unknown as ScanJob['updatedAt'],
      };

      await addDoc<Omit<ScanJob, 'id'>>(SCAN_JOBS_COLLECTION, scanJobData);
    })
  );

  console.log(
    `[discover-handler] Complete: ${newRepos.length} repos stored, ` +
    `${newRepos.length} scan-repo jobs enqueued.`
  );
}
