/**
 * src/pipeline/handlers/rescan-candidate.ts — rescan-candidate job handler.
 *
 * Handles rescan-candidate ScanJobs:
 * 1. When a githubToken is provided, discovers ALL repos (including private)
 *    via the GitHub API and stores any new ones in Firestore.
 * 2. Fetches all repos for the candidate from Firestore.
 * 3. Skips repos that haven't changed since last scan (same pushed_at + same scanner version).
 * 4. Enqueues scan-repo (layer2) jobs for repos that need re-scanning.
 *
 * Each scan-repo job triggers updateCandidateProfile(owner) on completion,
 * so the candidate profile is rebuilt with fresh data after the last repo finishes.
 */

import type { ScanJob, RescanPayload } from '../../types/scan-job.js';
import { repoDocId, type Repository } from '../../types/repository.js';
import type { DiscoveredRepo } from '../../adapters/source-adapter.js';
import { queryDocs, where, getDoc, setDoc, serverTimestamp } from '../../core/db/firestore.js';
import { enqueueScanRepoJob } from '../queue.js';
import { createGitHubAdapter, GitHubRateLimitError } from '../../adapters/github.js';
import { normalizeGitHubLanguage } from '../analysis/layer1.js';
import { markJobRateLimited } from '../queue.js';
import { SCANNER_VERSION } from '../scanner-version.js';

const REPOSITORIES_COLLECTION = 'repositories';

/**
 * Handles a rescan-candidate ScanJob.
 *
 * 1. Fetch current repo metadata from GitHub API
 * 2. If githubToken provided → also discover new (private) repos
 * 3. Fetch all Repository docs for the candidate from Firestore
 * 4. Skip repos where: repo unchanged (pushed_at <= lastScanned) AND scannerVersion matches
 * 5. Enqueue scan-repo (layer2) jobs only for repos that need it
 */
export async function handleRescanCandidate(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as RescanPayload;
  const { targetId, githubToken } = payload;

  console.log(
    `[rescan-candidate] Processing job ${job.id}: candidate=${targetId}` +
    (githubToken ? ' (with developer token)' : '') +
    ` (scanner v${SCANNER_VERSION})`
  );

  // Fetch current repo metadata from GitHub — needed for both discovery and skip logic
  const { repoMap: currentRepoMap, canonicalOwner } = await fetchCurrentRepoMetadata(job, targetId, githubToken);

  if (canonicalOwner !== targetId) {
    console.log(`[rescan-candidate] Canonical GitHub username: "${canonicalOwner}" (CLI input: "${targetId}")`);
  }

  // Fetch all repos for this candidate from Firestore (use canonical casing)
  const repos = await queryDocs<Repository>(
    REPOSITORIES_COLLECTION,
    where('owner', '==', canonicalOwner),
  );

  if (repos.length === 0) {
    console.log(`[rescan-candidate] No repositories found for ${targetId}. Nothing to rescan.`);
    return;
  }

  // Determine which repos actually need re-scanning
  const { toScan, skipped } = filterReposForRescan(repos, currentRepoMap);

  if (skipped.length > 0) {
    console.log(
      `[rescan-candidate] Skipping ${skipped.length} unchanged repo(s): ` +
      skipped.map((r) => r.fullName).join(', ')
    );
  }

  if (toScan.length === 0) {
    console.log(
      `[rescan-candidate] All ${repos.length} repo(s) are up-to-date ` +
      `(same pushed_at + scanner v${SCANNER_VERSION}). Nothing to rescan.`
    );
    return;
  }

  console.log(
    `[rescan-candidate] ${toScan.length}/${repos.length} repo(s) need re-scanning. ` +
    `Enqueueing scan-repo jobs...`
  );

  // Enqueue scan-repo (layer2) jobs only for repos that need it
  const jobIds = await Promise.all(
    toScan.map((repo) =>
      enqueueScanRepoJob(
        { repoFullName: repo.fullName, targetDepth: 'layer2', githubToken },
        1
      )
    )
  );

  console.log(
    `[rescan-candidate] Enqueued ${jobIds.length} scan-repo job(s) for ${targetId}: ` +
    toScan.map((r) => r.fullName).join(', ')
  );
}

interface RepoMetadataResult {
  repoMap: Map<string, DiscoveredRepo>;
  /** GitHub's canonical-cased username (e.g. "BrownBull" not "brownbull"). */
  canonicalOwner: string;
}

/**
 * Fetches current repo metadata from GitHub for a user.
 * If a developer token is provided, also discovers and stores new repos.
 * Returns a map of fullName → DiscoveredRepo plus the canonical GitHub username.
 */
async function fetchCurrentRepoMetadata(
  job: ScanJob & { id: string },
  username: string,
  githubToken?: string
): Promise<RepoMetadataResult> {
  // Use the developer's token if available, otherwise fall back to default PAT
  const adapter = createGitHubAdapter(githubToken);

  let result;
  try {
    result = await adapter.listUserRepos(username, 500);
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      console.warn(
        `[rescan-candidate] Rate limited during repo fetch: ${err.message}`
      );
      await markJobRateLimited(job.id, err.retryAfterMs);
      throw err;
    }
    throw err;
  }

  // Resolve canonical GitHub username from API response (case may differ from CLI input)
  const canonicalOwner = result.repos.length > 0
    ? result.repos[0]!.owner
    : username;

  console.log(
    `[rescan-candidate] GitHub API returned ${result.repos.length} repo(s) for ${canonicalOwner} ` +
    `(rate limit: ${result.rateLimit.remaining}/${result.rateLimit.limit})`
  );

  // Build lookup map
  const repoMap = new Map<string, DiscoveredRepo>();
  for (const repo of result.repos) {
    repoMap.set(repo.fullName.toLowerCase(), repo);
  }

  // If we have a developer token, discover and store any new repos
  if (githubToken) {
    await storeNewRepos(result.repos);
  }

  return { repoMap, canonicalOwner };
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
    console.log(`[rescan-candidate] No new repos discovered. All ${apiRepos.length} already in Firestore.`);
    return;
  }

  console.log(
    `[rescan-candidate] Discovered ${newRepos.length} new repo(s): ` +
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

  console.log(`[rescan-candidate] Stored ${newRepos.length} new repo(s) in Firestore.`);
}

interface RescanFilterResult {
  toScan: (Repository & { id: string })[];
  skipped: (Repository & { id: string })[];
}

/**
 * Determines which repos need re-scanning by comparing:
 * 1. GitHub's current pushed_at vs our lastScanned timestamp
 * 2. Current SCANNER_VERSION vs stored scannerVersion
 *
 * A repo is SKIPPED only if BOTH conditions are met:
 * - The repo hasn't been pushed to since our last scan
 * - The scanner version is the same as when we last scanned
 *
 * Repos that are always scanned (never skipped):
 * - scanStatus === 'surface' (never been analyzed)
 * - scannerVersion === null (pre-versioning, unknown scanner)
 * - Not found in the GitHub API response (can't verify, scan to be safe)
 */
function filterReposForRescan(
  repos: (Repository & { id: string })[],
  currentRepoMap: Map<string, DiscoveredRepo>
): RescanFilterResult {
  const toScan: (Repository & { id: string })[] = [];
  const skipped: (Repository & { id: string })[] = [];

  for (const repo of repos) {
    // Always scan repos that haven't been analyzed yet
    if (repo.scanStatus === 'surface') {
      toScan.push(repo);
      continue;
    }

    // Always rescan if scanner version is unknown (pre-versioning data)
    if (!repo.scannerVersion) {
      toScan.push(repo);
      continue;
    }

    // Scanner version changed → rescan even if repo is unchanged
    if (repo.scannerVersion !== SCANNER_VERSION) {
      toScan.push(repo);
      continue;
    }

    // Check if repo has been pushed to since our last scan
    const currentMeta = currentRepoMap.get(repo.fullName.toLowerCase());
    if (!currentMeta) {
      // Not in GitHub response — can't verify, scan to be safe
      toScan.push(repo);
      continue;
    }

    const pushedAt = new Date(currentMeta.lastPushedAt).getTime();
    const lastScannedMs = repo.lastScanned && 'toMillis' in repo.lastScanned
      ? repo.lastScanned.toMillis()
      : 0;

    if (pushedAt > lastScannedMs) {
      // Repo has new pushes since our last scan
      toScan.push(repo);
    } else {
      // Repo unchanged + same scanner version → skip
      skipped.push(repo);
    }
  }

  return { toScan, skipped };
}
