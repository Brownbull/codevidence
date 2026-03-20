/**
 * src/pipeline/handlers/self-scan.ts — self-scan job handler.
 *
 * Processes self-scan ScanJobs triggered by users from the My Profile page:
 * 1. Reads + decrypts the user's GitHub token from secrets subcollection
 * 2. Discovers repos via GitHub API (including private)
 * 3. Enqueues scan-repo jobs with tokenSourceUid (NOT the raw token)
 * 4. Updates user profile: lastSelfScanAt, selfScanCount
 *
 * Critical: downstream scan-repo jobs use tokenSourceUid to resolve
 * the token at clone time. The token is NEVER stored in job payloads.
 */

import type { ScanJob, SelfScanPayload } from '../../types/scan-job.js';
import { repoDocId, type Repository } from '../../types/repository.js';
import type { DiscoveredRepo } from '../../adapters/source-adapter.js';
import { queryDocs, where, getDoc, setDoc, updateDoc, serverTimestamp, increment } from '../../core/db/firestore.js';
import { enqueueScanRepoJob } from '../queue.js';
import { createGitHubAdapter, GitHubRateLimitError } from '../../adapters/github.js';
import { normalizeGitHubLanguage } from '../analysis/layer1.js';
import { markJobRateLimited } from '../queue.js';
import { resolveToken, markTokenExpired } from '../token-resolver.js';
import { SCANNER_VERSION } from '../scanner-version.js';

const REPOSITORIES_COLLECTION = 'repositories';

/**
 * Handles a self-scan ScanJob.
 */
export async function handleSelfScan(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as SelfScanPayload;
  const { requestedBy, githubUsername } = payload;

  console.log(
    `[self-scan] Processing job ${job.id}: user=${requestedBy}, github=${githubUsername}` +
    ` (scanner v${SCANNER_VERSION})`
  );

  // Resolve token from user's secrets
  const githubToken = await resolveToken(requestedBy);
  if (!githubToken) {
    throw new Error(
      `No valid GitHub token found for user ${requestedBy}. ` +
      `Please reconnect your GitHub account.`
    );
  }

  // Fetch repos from GitHub (including private)
  const adapter = createGitHubAdapter(githubToken);
  let result;
  try {
    result = await adapter.listUserRepos(githubUsername, 500);
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      console.warn(`[self-scan] Rate limited: ${err.message}`);
      await markJobRateLimited(job.id, err.retryAfterMs);
      throw err;
    }
    // Check for auth failure — mark token as expired
    if (err instanceof Error && err.message.includes('401')) {
      await markTokenExpired(requestedBy);
    }
    throw err;
  }

  const canonicalOwner = result.repos.length > 0
    ? result.repos[0]!.owner
    : githubUsername;

  console.log(
    `[self-scan] GitHub API returned ${result.repos.length} repo(s) for ${canonicalOwner} ` +
    `(rate limit: ${result.rateLimit.remaining}/${result.rateLimit.limit})`
  );

  // Store any new repos
  await storeNewRepos(result.repos);

  // Fetch all repos from Firestore
  const repos = await queryDocs<Repository>(
    REPOSITORIES_COLLECTION,
    where('owner', '==', canonicalOwner),
  );

  if (repos.length === 0) {
    console.log(`[self-scan] No repositories found for ${canonicalOwner}.`);
    await updateUserScanStats(requestedBy);
    return;
  }

  // Enqueue scan-repo jobs with tokenSourceUid (NOT the raw token)
  const jobIds = await Promise.all(
    repos.map((repo) =>
      enqueueScanRepoJob(
        {
          repoFullName: repo.fullName,
          targetDepth: 'layer2',
          tokenSourceUid: requestedBy,
        },
        1
      )
    )
  );

  console.log(
    `[self-scan] Enqueued ${jobIds.length} scan-repo job(s) for ${canonicalOwner}`
  );

  // Update user profile stats (worker is admin)
  await updateUserScanStats(requestedBy);
}

/**
 * Updates lastSelfScanAt and increments selfScanCount.
 * Worker is signed in as admin — Firestore rules allow admin writes on user_profiles.
 */
async function updateUserScanStats(uid: string): Promise<void> {
  try {
    await updateDoc('user_profiles', uid, {
      lastSelfScanAt: serverTimestamp(),
      selfScanCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`[self-scan] Failed to update scan stats for user ${uid}:`, err);
  }
}

/**
 * Stores any repos from GitHub that aren't yet in Firestore.
 */
async function storeNewRepos(apiRepos: DiscoveredRepo[]): Promise<void> {
  const dedupeResults = await Promise.all(
    apiRepos.map(async (repo) => {
      const existing = await getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName));
      return { repo, exists: existing !== null };
    })
  );

  const newRepos = dedupeResults.filter((r) => !r.exists).map((r) => r.repo);

  if (newRepos.length === 0) {
    console.log(`[self-scan] No new repos discovered.`);
    return;
  }

  console.log(
    `[self-scan] Discovered ${newRepos.length} new repo(s): ` +
    newRepos.map((r) => r.fullName).join(', ')
  );

  const now = serverTimestamp();
  await Promise.all(
    newRepos.map(async (repo) => {
      const repoDoc: Omit<Repository, 'id'> = {
        githubUrl: repo.githubUrl,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        primaryLanguage: normalizeGitHubLanguage(repo.primaryLanguage),
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
        scannerVersion: null,
        lastScanned: now as unknown as Repository['lastScanned'],
        createdAt: now as unknown as Repository['createdAt'],
        updatedAt: now as unknown as Repository['updatedAt'],
      };

      await setDoc<Omit<Repository, 'id'>>(
        REPOSITORIES_COLLECTION,
        repoDocId(repo.fullName),
        repoDoc
      );
    })
  );
}
