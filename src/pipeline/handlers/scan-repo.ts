/** scan-repo job handler. Clones, analyzes, updates Firestore, deletes clone. */

import simpleGit from 'simple-git';

import type { ScanJob, ScanRepoPayload } from '../../types/scan-job.js';
import { repoDocId, type Repository } from '../../types/repository.js';
import { storeUnknownSignals } from './store-unknown-signals.js';
import { analyzeLayer1 } from '../analysis/layer1.js';
import { analyzeLayer2 } from '../analysis/layer2.js';
import { analyzeAiSignals } from '../analysis/ai-signals.js';
import { analyzeProficiency } from '../analysis/proficiency.js';
import { analyzeImports } from '../analysis/import-analysis.js';
import { analyzeCodeQuality } from '../analysis/code-quality.js';
import { analyzeDiffStats } from '../analysis/diff-stats.js';
import { analyzeCodeDurability } from '../analysis/code-durability.js';
import { analyzeBehavioralPatterns } from '../analysis/behavioral-patterns.js';
import { analyzeCommitMessageQuality } from '../analysis/commit-messages.js';
import { analyzeDesignPatterns } from '../analysis/design-patterns.js';
import { analyzeCodeStyle } from '../analysis/code-style.js';
import { updateCandidateProfile } from '../scoring/skill-score.js';
import { SCANNER_VERSION } from '../scanner-version.js';
import { logLayer1Extras, logLayer2Extras } from './scan-repo-logging.js';
import { buildCloneUrl, createTempCloneDir, deleteCloneDir, buildLayer2UpdateData } from './scan-repo-helpers.js';
import {
  getDoc,
  updateDoc,
  serverTimestamp,
} from '../../core/db/firestore.js';

const REPOSITORIES_COLLECTION = 'repositories';

/**
 * Handles a scan-repo ScanJob.
 *
 * For targetDepth: layer1 — shallow clone + Layer 1 analysis.
 * For targetDepth: layer2 — full clone + Layer 1 + Layer 2 analysis.
 */
export async function handleScanRepo(job: ScanJob & { id: string }): Promise<void> {
  const payload = job.payload as ScanRepoPayload;
  const { repoFullName, targetDepth, githubToken } = payload;

  console.log(
    `[scan-repo] Processing job ${job.id}: ` +
    `repo=${repoFullName} depth=${targetDepth}` +
    (githubToken ? ' (with developer token)' : '')
  );

  const repoDoc = await getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repoFullName));
  if (!repoDoc) {
    throw new Error(`Repository not found in Firestore: ${repoFullName}`);
  }

  if (targetDepth === 'layer1') {
    await runLayer1(job.id, repoDoc, githubToken);
  } else if (targetDepth === 'layer2') {
    await runLayer2(job.id, repoDoc, githubToken);
  } else {
    throw new Error(`Unsupported targetDepth: ${targetDepth}`);
  }
}

/**
 * Runs Layer 1 analysis: shallow clone → analysis → update Firestore → delete clone.
 */
async function runLayer1(
  jobId: string,
  repo: Repository & { id: string },
  githubToken?: string
): Promise<void> {
  const cloneDir = createTempCloneDir(repo.fullName);

  try {
    const cloneUrl = buildCloneUrl(repo.githubUrl, githubToken);
    console.log(`[scan-repo] Cloning ${repo.fullName} (shallow) to ${cloneDir}...`);
    const git = simpleGit();
    await git.clone(cloneUrl, cloneDir, ['--depth', '1']);
    console.log(`[scan-repo] Clone complete.`);

    const result = analyzeLayer1(cloneDir, repo.primaryLanguage);
    const { profResult, importResult, codeQuality, styleResult } =
      runLayer1Analyses(cloneDir, result);
    logLayer1AllResults(result, profResult, importResult, codeQuality, styleResult);

    if (result.unknownSignals.length > 0) {
      await storeUnknownSignals(result.unknownSignals);
    }

    await updateDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName), {
      primaryLanguage: result.primaryLanguage,
      detectedFrameworks: result.detectedFrameworks,
      detectedTools: result.detectedTools,
      detectedDependencies: result.detectedDependencies,
      proficiencySignals: profResult.proficiencySignals,
      techProficiency: profResult.techProficiency,
      confirmedImports: importResult.confirmedImports,
      frameworkDepth: importResult.frameworkDepth,
      codeQualityMetrics: codeQuality,
      codeStyleMetrics: styleResult,
      scanStatus: 'layer1',
      scannerVersion: SCANNER_VERSION,
      lastScanned: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[scan-repo] Repository ${repo.fullName} updated to scanStatus: layer1.`);
  } finally {
    deleteCloneDir(cloneDir);
  }
}

/**
 * Runs Layer 2 analysis: full clone → Layer 1 + Layer 2 → update Firestore → delete clone.
 * Also runs Layer 1 analyses on the full clone to ensure proficiency, imports, quality,
 * and style fields are populated (a full clone is a superset of a shallow clone).
 */
async function runLayer2(
  jobId: string,
  repo: Repository & { id: string },
  githubToken?: string
): Promise<void> {
  const cloneDir = createTempCloneDir(repo.fullName);

  try {
    const cloneUrl = buildCloneUrl(repo.githubUrl, githubToken);
    console.log(`[scan-repo] Cloning ${repo.fullName} (full) to ${cloneDir}...`);
    const git = simpleGit();
    await git.clone(cloneUrl, cloneDir);
    console.log(`[scan-repo] Full clone complete.`);

    // Layer 1 analyses on the full clone
    const l1Result = analyzeLayer1(cloneDir, repo.primaryLanguage);
    const l1Extra = runLayer1Analyses(cloneDir, l1Result);
    logLayer1AllResults(l1Result, l1Extra.profResult, l1Extra.importResult, l1Extra.codeQuality, l1Extra.styleResult);

    // Layer 2 analyses in parallel
    const [result, aiResult, diffStats, durability, behavioral, commitMsg, designResult] =
      await Promise.all([
        analyzeLayer2(cloneDir, repo.owner),
        analyzeAiSignals(cloneDir),
        Promise.resolve(analyzeDiffStats(cloneDir)),
        analyzeCodeDurability(cloneDir, repo.owner),
        analyzeBehavioralPatterns(cloneDir),
        analyzeCommitMessageQuality(cloneDir),
        Promise.resolve(analyzeDesignPatterns(cloneDir, repo.primaryLanguage)),
      ]);

    logLayer2Results(result, aiResult, diffStats, durability, behavioral, commitMsg, designResult);

    const updateData = buildCombinedUpdateData(
      l1Result, l1Extra, result, aiResult, diffStats, durability, behavioral, commitMsg, designResult,
    );

    if (l1Result.unknownSignals.length > 0) {
      await storeUnknownSignals(l1Result.unknownSignals);
    }

    await updateDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName), updateData);
    console.log(`[scan-repo] Repository ${repo.fullName} updated to scanStatus: layer2.`);
    await updateCandidateProfile(repo.owner);
  } finally {
    deleteCloneDir(cloneDir);
  }
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

type L1Extra = ReturnType<typeof runLayer1Analyses>;

/** Runs proficiency, import, code quality, and code style analyses. */
function runLayer1Analyses(cloneDir: string, l1Result: ReturnType<typeof analyzeLayer1>) {
  return {
    profResult: analyzeProficiency(cloneDir, l1Result),
    importResult: analyzeImports(cloneDir, l1Result.detectedFrameworks, l1Result.primaryLanguage),
    codeQuality: analyzeCodeQuality(cloneDir, l1Result.primaryLanguage),
    styleResult: analyzeCodeStyle(cloneDir, l1Result.primaryLanguage),
  };
}

/** Logs all Layer 1 analysis results including code style. */
function logLayer1AllResults(
  result: ReturnType<typeof analyzeLayer1>,
  profResult: L1Extra['profResult'], importResult: L1Extra['importResult'],
  codeQuality: L1Extra['codeQuality'], styleResult: L1Extra['styleResult'],
): void {
  console.log(
    `[scan-repo] Layer 1: lang=${result.primaryLanguage} ` +
    `frameworks=[${result.detectedFrameworks.join(', ')}] ` +
    `tools=[${result.detectedTools.join(', ')}] deps=${result.detectedDependencies.length} ` +
    `unknowns=${result.unknownSignals.length}`
  );
  logLayer1Extras(profResult, importResult, codeQuality);
  console.log(
    `[scan-repo] Code style: composite=${styleResult.compositeStyleScore} ` +
    `tools=[${styleResult.formattingToolsDetected.join(', ')}] files=${styleResult.filesAnalyzed}`
  );
}

/** Builds combined L1 + L2 Firestore update data. */
function buildCombinedUpdateData(
  l1Result: ReturnType<typeof analyzeLayer1>, l1Extra: L1Extra,
  ...args: L2Args
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    primaryLanguage: l1Result.primaryLanguage,
    detectedFrameworks: l1Result.detectedFrameworks,
    detectedTools: l1Result.detectedTools,
    detectedDependencies: l1Result.detectedDependencies,
    proficiencySignals: l1Extra.profResult.proficiencySignals,
    techProficiency: l1Extra.profResult.techProficiency,
    confirmedImports: l1Extra.importResult.confirmedImports,
    frameworkDepth: l1Extra.importResult.frameworkDepth,
    codeQualityMetrics: l1Extra.codeQuality,
    codeStyleMetrics: l1Extra.styleResult,
    ...buildLayer2UpdateData(...args),
  };
  if (args[0].firstCommitAt) updateData.firstCommitAt = args[0].firstCommitAt;
  if (args[0].lastCommitAt) updateData.lastCommitAt = args[0].lastCommitAt;
  return updateData;
}

type L2Args = Parameters<typeof buildLayer2UpdateData>;

function logLayer2Results(...args: L2Args): void {
  const [result, aiResult, diffStats, durability, behavioral, commitMsg, designResult] = args;
  console.log(
    `[scan-repo] Layer 2: commits=${result.commitCount} span=${result.commitSpanMonths}mo ` +
    `owner=${result.isOwnerRepo} coverage=${result.estimatedTestCoverage} ` +
    `aiConfigs=${aiResult.aiConfigFiles.length} diffLOC=${diffStats.logicLinesOfCode}`
  );
  logLayer2Extras(durability, behavioral, commitMsg);
  console.log(
    `[scan-repo] Design: signals=${designResult.designPatternSignals.length} ` +
    `arch=${designResult.architectureStyle ?? 'none'} ` +
    `anti=${designResult.antiPatternCount} tier=${designResult.designSophisticationTier}`
  );
}
