/**
 * src/pipeline/handlers/scan-repo.ts — scan-repo job handler.
 *
 * Handles scan-repo ScanJobs for Layer 1 (and later Layer 2) analysis.
 * Clones the repository, runs analysis, updates Firestore, then deletes the clone.
 *
 * CRITICAL: Clone directory is ALWAYS deleted after analysis, success or failure.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, mkdirSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import simpleGit from 'simple-git';

import type { ScanJob, ScanRepoPayload } from '../../types/scan-job.js';
import type { Repository } from '../../types/repository.js';
import type { TaxonomyItem } from '../../types/taxonomy.js';
import { analyzeLayer1 } from '../analysis/layer1.js';
import { analyzeLayer2 } from '../analysis/layer2.js';
import { analyzeAiSignals } from '../analysis/ai-signals.js';
import {
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  queryDocs,
  where,
} from '../../core/db/firestore.js';

const REPOSITORIES_COLLECTION = 'repositories';
const TAXONOMY_COLLECTION = 'taxonomy';

/**
 * Handles a scan-repo ScanJob.
 *
 * For targetDepth: layer1:
 * 1. Clone repo (shallow --depth 1)
 * 2. Run Layer 1 analysis
 * 3. Normalise unknown signals → new taxonomy items (isSearchable: false)
 * 4. Update Repository doc
 * 5. Delete clone directory (always, even on failure)
 */
export async function handleScanRepo(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as ScanRepoPayload;
  const { repoFullName, targetDepth } = payload;

  console.log(
    `[scan-repo] Processing job ${job.id}: ` +
    `repo=${repoFullName} depth=${targetDepth}`
  );

  // Fetch the Repository doc to get metadata
  const repoDoc = await getDoc<Repository>(REPOSITORIES_COLLECTION, repoFullName);
  if (!repoDoc) {
    throw new Error(`Repository not found in Firestore: ${repoFullName}`);
  }

  if (targetDepth === 'layer1') {
    await runLayer1(job.id, repoDoc);
  } else if (targetDepth === 'layer2') {
    await runLayer2(job.id, repoDoc);
  } else {
    throw new Error(`Unsupported targetDepth: ${targetDepth}`);
  }
}

/**
 * Runs Layer 1 analysis: shallow clone → analysis → update Firestore → delete clone.
 */
async function runLayer1(
  jobId: string,
  repo: Repository & { id: string }
): Promise<void> {
  const cloneDir = createTempCloneDir(repo.fullName);

  try {
    // Shallow clone (--depth 1 for Layer 1)
    console.log(`[scan-repo] Cloning ${repo.fullName} (shallow) to ${cloneDir}...`);
    const git = simpleGit();
    await git.clone(repo.githubUrl, cloneDir, ['--depth', '1']);
    console.log(`[scan-repo] Clone complete.`);

    // Run Layer 1 analysis
    const result = analyzeLayer1(cloneDir, repo.primaryLanguage);

    console.log(
      `[scan-repo] Layer 1 analysis: ` +
      `lang=${result.primaryLanguage} ` +
      `frameworks=[${result.detectedFrameworks.join(', ')}] ` +
      `tools=[${result.detectedTools.join(', ')}] ` +
      `deps=${result.detectedDependencies.length} ` +
      `unknowns=${result.unknownSignals.length}`
    );

    // Store unknown signals as new taxonomy items (isSearchable: false)
    if (result.unknownSignals.length > 0) {
      await storeUnknownSignals(result.unknownSignals);
    }

    // Update Repository doc with Layer 1 results
    await updateDoc<Repository>(REPOSITORIES_COLLECTION, repo.fullName, {
      primaryLanguage: result.primaryLanguage,
      detectedFrameworks: result.detectedFrameworks,
      detectedTools: result.detectedTools,
      detectedDependencies: result.detectedDependencies,
      scanStatus: 'layer1',
      lastScanned: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[scan-repo] Repository ${repo.fullName} updated to scanStatus: layer1.`);
  } finally {
    // ALWAYS delete clone directory — success or failure
    deleteCloneDir(cloneDir);
  }
}

/**
 * Runs Layer 2 analysis: full clone → analysis → update Firestore → delete clone.
 */
async function runLayer2(
  jobId: string,
  repo: Repository & { id: string }
): Promise<void> {
  const cloneDir = createTempCloneDir(repo.fullName);

  try {
    // Full clone (no --depth flag for Layer 2 — needs full commit history)
    console.log(`[scan-repo] Cloning ${repo.fullName} (full) to ${cloneDir}...`);
    const git = simpleGit();
    await git.clone(repo.githubUrl, cloneDir);
    console.log(`[scan-repo] Full clone complete.`);

    // Run Layer 2 analysis and AI signal detection in parallel
    const [result, aiResult] = await Promise.all([
      analyzeLayer2(cloneDir, repo.owner),
      analyzeAiSignals(cloneDir),
    ]);

    console.log(
      `[scan-repo] Layer 2 analysis: ` +
      `commits=${result.commitCount} ` +
      `span=${result.commitSpanMonths}mo ` +
      `owner=${result.isOwnerRepo} ` +
      `tests=${result.testFileCount} ` +
      `coverage=${result.estimatedTestCoverage}`
    );

    console.log(
      `[scan-repo] AI signals: ` +
      `configFiles=${aiResult.aiConfigFiles.length} ` +
      `coAuthored=${aiResult.coAuthoredByAI} ` +
      `patterns=[${aiResult.aiAttributionPatterns.join(', ')}]`
    );

    // Convert AI config file signal dates for Firestore
    const aiConfigFiles = aiResult.aiConfigFiles.map((signal) => ({
      fileName: signal.fileName,
      firstDetectedAt: signal.firstDetectedAt,
      modificationCount: signal.modificationCount,
      lastModifiedAt: signal.lastModifiedAt,
      diffComplexity: signal.diffComplexity,
      isEvolved: signal.isEvolved,
      originSignal: signal.originSignal,
    }));

    // Update Repository doc with Layer 2 + AI signal results
    const updateData: Record<string, unknown> = {
      commitCount: result.commitCount,
      commitSpanMonths: result.commitSpanMonths,
      isOwnerRepo: result.isOwnerRepo,
      hasTestDirectory: result.hasTestDirectory,
      estimatedTestCoverage: result.estimatedTestCoverage,
      aiConfigFiles,
      coAuthoredByAI: aiResult.coAuthoredByAI,
      aiAttributionPatterns: aiResult.aiAttributionPatterns,
      scanStatus: 'layer2',
      lastScanned: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only set dates if they exist (avoid writing null over existing values)
    if (result.firstCommitAt) {
      updateData.firstCommitAt = result.firstCommitAt;
    }
    if (result.lastCommitAt) {
      updateData.lastCommitAt = result.lastCommitAt;
    }

    await updateDoc<Repository>(REPOSITORIES_COLLECTION, repo.fullName, updateData);

    console.log(`[scan-repo] Repository ${repo.fullName} updated to scanStatus: layer2.`);
  } finally {
    // ALWAYS delete clone directory — success or failure
    deleteCloneDir(cloneDir);
  }
}

/**
 * Creates a unique temporary directory for cloning.
 */
function createTempCloneDir(repoFullName: string): string {
  const safeName = repoFullName.replace(/\//g, '_');
  const uniqueId = randomBytes(4).toString('hex');
  const dir = join(tmpdir(), `css-clone-${safeName}-${uniqueId}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Deletes the clone directory. Never throws — logs errors.
 */
function deleteCloneDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`[scan-repo] Clone directory deleted: ${dir}`);
    }
  } catch (err) {
    console.error(`[scan-repo] Failed to delete clone directory ${dir}:`, err);
  }
}

/**
 * Stores unknown signals as taxonomy items with isSearchable: false.
 * Uses setDoc for idempotency — running twice won't duplicate.
 */
async function storeUnknownSignals(
  signals: Array<{ name: string; category: 'framework' | 'tool'; source: string }>
): Promise<void> {
  const now = serverTimestamp();

  await Promise.all(
    signals.map(async (signal) => {
      const taxonomyId = `${signal.category}:${signal.name}`;

      // Check if already exists to avoid overwriting curated items
      const existing = await getDoc<TaxonomyItem>(TAXONOMY_COLLECTION, taxonomyId);
      if (existing) return;

      const item: Omit<TaxonomyItem, 'id'> = {
        category: signal.category,
        displayName: signal.name,
        aliases: [],
        candidateCount: 0,
        isSeeded: false,
        isSearchable: false, // Admin must review and enable
        firstDetectedAt: now as unknown as TaxonomyItem['firstDetectedAt'],
        addedToTaxonomyAt: now as unknown as TaxonomyItem['addedToTaxonomyAt'],
        sortOrder: 999,
        createdAt: now as unknown as TaxonomyItem['createdAt'],
        updatedAt: now as unknown as TaxonomyItem['updatedAt'],
      };

      await setDoc<Omit<TaxonomyItem, 'id'>>(TAXONOMY_COLLECTION, taxonomyId, item);
      console.log(`[scan-repo] New taxonomy item stored: ${taxonomyId} (isSearchable: false)`);
    })
  );
}
