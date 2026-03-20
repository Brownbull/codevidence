/**
 * src/pipeline/handlers/scan-repo-logging.ts — Scan pipeline logging helpers.
 * Extracted from scan-repo.ts to keep handler code focused on logic.
 */

import type { analyzeProficiency } from '../analysis/proficiency.js';
import type { analyzeImports } from '../analysis/import-analysis.js';
import type { CodeQualityMetrics } from '../../types/repository.js';
import type { CodeDurabilityResult } from '../analysis/code-durability.js';
import type { BehavioralPatternResult } from '../analysis/behavioral-patterns.js';
import type { CommitMessageQuality } from '../../types/repository.js';

/** Logs Layer 1 extras (proficiency, imports, code quality). */
export function logLayer1Extras(
  profResult: ReturnType<typeof analyzeProficiency>,
  importResult: ReturnType<typeof analyzeImports>,
  codeQuality: CodeQualityMetrics | null,
): void {
  console.log(
    `[scan-repo] Proficiency: bonus=${profResult.proficiencyBonus} ` +
    `level=${profResult.overallProficiency} techs=${Object.keys(profResult.techProficiency).length}`
  );
  console.log(
    `[scan-repo] Imports: confirmed=${importResult.confirmedImports.length} ` +
    `depth=[${importResult.frameworkDepth.map((d) => `${d.frameworkId}:${d.depth}`).join(', ')}]`
  );
  if (codeQuality) {
    console.log(
      `[scan-repo] Code quality: grade=${codeQuality.codeQualityGrade} ` +
      `score=${codeQuality.codeQualityScore} funcs=${codeQuality.functionCount}`
    );
  } else {
    console.log(`[scan-repo] Code quality: skipped (unsupported language or insufficient data)`);
  }
}

/** Logs Layer 2 analysis results including Phase 3 analyses. */
export function logLayer2Extras(
  durability: CodeDurabilityResult | null,
  behavioral: BehavioralPatternResult | null,
  commitMsg: CommitMessageQuality | null,
): void {
  console.log(
    `[scan-repo] Durability: ` +
    (durability
      ? `churn14d=${(durability.churnRate14d * 100).toFixed(1)}% ` +
        `churn90d=${(durability.churnRate90d * 100).toFixed(1)}% ` +
        `rewrite=${durability.rewriteRatio.toFixed(2)} ` +
        `hotFiles=${durability.hotFileCount}`
      : 'insufficient history')
  );
  console.log(
    `[scan-repo] Behavioral: ` +
    (behavioral
      ? `sizeMedian=${behavioral.commitSizeMedian} ` +
        `burstiness=${behavioral.commitBurstiness.toFixed(2)} ` +
        `conventional=${(behavioral.conventionalCommitRatio * 100).toFixed(0)}% ` +
        `diversity=${behavioral.commitTypeDiversity.toFixed(2)}`
      : 'insufficient data')
  );
  console.log(
    `[scan-repo] Commit messages: ` +
    (commitMsg
      ? `analyzed=${commitMsg.totalAnalyzed} ` +
        `conventional=${(commitMsg.conventionalRatio * 100).toFixed(0)}% ` +
        `weak=${(commitMsg.weakRatio * 100).toFixed(0)}% ` +
        `quality=${commitMsg.qualityScore}`
      : 'insufficient data')
  );
}
