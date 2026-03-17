/**
 * src/pipeline/handlers/scan-repo-helpers.ts — Clone utilities + Layer 2 data builder.
 * Extracted from scan-repo.ts to stay under 300-line limit.
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, mkdirSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import type { analyzeLayer2 } from '../analysis/layer2.js';
import type { analyzeAiSignals } from '../analysis/ai-signals.js';
import type { analyzeDiffStats } from '../analysis/diff-stats.js';
import type { CodeDurabilityResult } from '../analysis/code-durability.js';
import type { BehavioralPatternResult } from '../analysis/behavioral-patterns.js';
import type { CommitMessageQuality } from '../../types/repository.js';
import type { DesignPatternResult } from '../analysis/design-patterns.js';
import { SCANNER_VERSION } from '../scanner-version.js';
import { serverTimestamp } from '../../core/db/firestore.js';

/**
 * Builds an authenticated clone URL when a token is provided.
 * Uses the x-access-token username format for GitHub fine-grained PATs.
 * CRITICAL: Never log the authenticated URL — it contains the token.
 */
export function buildCloneUrl(githubUrl: string, token?: string): string {
  if (!token) return githubUrl;
  const url = new URL(githubUrl);
  url.username = 'x-access-token';
  url.password = token;
  return url.toString();
}

/** Creates a unique temporary directory for cloning. */
export function createTempCloneDir(repoFullName: string): string {
  const safeName = repoFullName.replace(/\//g, '_');
  const uniqueId = randomBytes(4).toString('hex');
  const dir = join(tmpdir(), `css-clone-${safeName}-${uniqueId}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Deletes the clone directory. Never throws — logs errors. */
export function deleteCloneDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
      console.log(`[scan-repo] Clone directory deleted: ${dir}`);
    }
  } catch (err) {
    console.error(`[scan-repo] Failed to delete clone directory ${dir}:`, err);
  }
}

/** Builds the Firestore update data object for Layer 2 results. */
export function buildLayer2UpdateData(
  result: Awaited<ReturnType<typeof analyzeLayer2>>,
  aiResult: Awaited<ReturnType<typeof analyzeAiSignals>>,
  diffStats: ReturnType<typeof analyzeDiffStats>,
  durability: CodeDurabilityResult | null,
  behavioral: BehavioralPatternResult | null,
  commitMsg: CommitMessageQuality | null,
  designResult: DesignPatternResult,
): Record<string, unknown> {
  const aiConfigFiles = aiResult.aiConfigFiles.map((s) => ({
    fileName: s.fileName, fileType: s.fileType,
    firstDetectedAt: s.firstDetectedAt, modificationCount: s.modificationCount,
    lastModifiedAt: s.lastModifiedAt, diffComplexity: s.diffComplexity,
    isEvolved: s.isEvolved, originSignal: s.originSignal,
  }));

  return {
    commitCount: result.commitCount,
    commitSpanMonths: result.commitSpanMonths,
    isOwnerRepo: result.isOwnerRepo,
    hasTestDirectory: result.hasTestDirectory,
    estimatedTestCoverage: result.estimatedTestCoverage,
    aiConfigFiles,
    coAuthoredByAI: aiResult.coAuthoredByAI,
    aiAttributionPatterns: aiResult.aiAttributionPatterns,
    logicLinesOfCode: diffStats.logicLinesOfCode,
    logicCodeRatio: diffStats.logicCodeRatio,
    testToLogicRatio: diffStats.testToLogicRatio,
    codeDurability: durability ?? null,
    behavioralMetrics: behavioral ?? null,
    commitMessageQuality: commitMsg ?? null,
    designPatternSignals: designResult.designPatternSignals,
    architectureStyle: designResult.architectureStyle,
    antiPatternCount: designResult.antiPatternCount,
    designSophisticationTier: designResult.designSophisticationTier,
    scanStatus: 'layer2',
    scannerVersion: SCANNER_VERSION,
    lastScanned: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}
