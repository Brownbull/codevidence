/**
 * tests/unit/us-011-skill-score-structure.test.ts
 *
 * Source-level structural tests for US-011: module structure, type safety,
 * candidate building logic, and scan-repo handler integration.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('US-011: Skill Score Module Structure', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('exports computeSkillScore function', () => {
    expect(src).toContain('export function computeSkillScore');
  });

  it('exports SkillScoreInput interface', () => {
    expect(src).toContain('export interface SkillScoreInput');
  });

  it('exports PipelineScoringOutput type excluding aiMaturity fields', () => {
    expect(src).toContain('export type PipelineScoringOutput');
    expect(src).toContain("'aiMaturityScore'");
    expect(src).toContain("'aiMaturityScoredAt'");
    expect(src).toContain("'aiMaturityScoredBy'");
  });

  it('exports computeAiSignalPoints function', () => {
    expect(src).toContain('export function computeAiSignalPoints');
  });

  it('exports updateCandidateProfile async function', () => {
    expect(src).toContain('export async function updateCandidateProfile');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });
});

describe('US-011: Pipeline Scoring Output Type Safety', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('PipelineScoringOutput uses Omit to exclude aiMaturity fields', () => {
    expect(src).toContain('Omit<');
    expect(src).toContain('Candidate');
  });
});

describe('US-011: Candidate Writer — Structural', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('never writes aiMaturityScore in buildPipelineFields return object', () => {
    // Extract the return block of buildPipelineFields (the object literal returned)
    const lines = src.split('\n');
    const returnBlock: string[] = [];
    let inFunc = false;
    let inReturn = false;
    let braceDepth = 0;
    for (const line of lines) {
      if (line.includes('function buildPipelineFields')) inFunc = true;
      if (inFunc && line.trim().startsWith('return {')) {
        inReturn = true;
        braceDepth = 0;
      }
      if (inReturn) {
        returnBlock.push(line);
        braceDepth += (line.match(/{/g) ?? []).length;
        braceDepth -= (line.match(/}/g) ?? []).length;
        if (braceDepth <= 0) break;
      }
    }
    const block = returnBlock.join('\n');
    expect(block.length).toBeGreaterThan(10); // sanity: found the block
    expect(block).not.toContain('aiMaturityScore');
    expect(block).not.toContain('aiMaturityScoredAt');
    expect(block).not.toContain('aiMaturityScoredBy');
  });

  it('sets aiMaturityScore: null only on new candidate creation', () => {
    expect(src).toContain('aiMaturityScore: null');
    expect(src).toContain('aiMaturityScoredAt: null');
    expect(src).toContain('aiMaturityScoredBy: null');
  });

  it('updates existing candidates with updateDoc', () => {
    expect(src).toContain('updateDoc<Candidate>(CANDIDATES_COLLECTION, owner, pipelineFields)');
  });

  it('imports from Firestore wrapper only, not Firebase SDK directly', () => {
    expect(src).not.toContain("from 'firebase/");
    expect(src).toContain("from '../../core/db/firestore.js'");
  });

  it('sets isStale to false at write time', () => {
    expect(src).toContain('isStale: false');
  });

  it('sets githubProfileUrl from owner username', () => {
    expect(src).toContain('`https://github.com/${owner}`');
  });

  it('writes proficiency fields to candidate doc', () => {
    expect(src).toContain('proficiencyScores: data.proficiencyScores');
    expect(src).toContain('overallProficiency: data.overallProficiency');
    expect(src).toContain('proficiencyBonus: data.proficiencyBonus');
  });

  it('writes domain fields to candidate doc', () => {
    expect(src).toContain('detectedDomains');
  });
});

describe('US-011: Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('uses 15 points for primary language', () => {
    expect(src).toContain('input.hasLanguage ? 15 : 0');
  });

  it('uses 4 points per framework, capped at 20', () => {
    expect(src).toContain('input.frameworkCount * 4, 20');
  });

  it('uses 3 points per tool, capped at 9', () => {
    expect(src).toContain('input.toolCount * 3, 9');
  });

  it('uses commitSpanMonths capped at 7', () => {
    expect(src).toContain('input.commitSpanMonths, 7');
  });

  it('uses 8 points for ownership bonus', () => {
    expect(src).toContain('input.isOwnerRepo ? 8 : 0');
  });

  it('defines test coverage points: 0/2/5/10', () => {
    expect(src).toContain("'none': 0");
    expect(src).toContain("'low': 2");
    expect(src).toContain("'medium': 5");
    expect(src).toContain("'high': 10");
  });

  it('uses proficiency bonus capped at 14', () => {
    expect(src).toContain('input.proficiencyBonus ?? 0, 14');
  });

  it('uses domain points capped at 10', () => {
    expect(src).toContain('input.domainPoints ?? 0, 10');
  });

  it('clamps result to 0-100', () => {
    expect(src).toContain('Math.max(0, Math.min(100, total))');
  });
});

describe('US-011: Skill Score ↔ Domain Integration', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('imports domain inference module', () => {
    expect(src).toContain("from './domain-inference.js'");
    expect(src).toContain('inferDomains');
    expect(src).toContain('countQualifyingDomains');
  });

  it('aggregates skillTags from languages, frameworks, tools, AI patterns, and domains', () => {
    expect(src).toContain('...aggregated.languages');
    expect(src).toContain('...aggregated.frameworks');
    expect(src).toContain('...aggregated.tools');
    expect(src).toContain('...aggregated.aiAgentPatterns');
    expect(src).toContain('...qualifyingDomainIds');
  });
});

// ─── Phase 2: Score Formula Additions ────────────────────────────────────────

describe('US-011: Phase 2 Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('uses 2 points per confirmed framework, capped at 6', () => {
    expect(src).toContain('confirmedFrameworkCount ?? 0) * 2, 6');
  });

  it('caps framework depth points at 8', () => {
    expect(src).toContain('frameworkDepthPoints ?? 0, 8');
  });

  it('caps logic code ratio points at 3', () => {
    expect(src).toContain('logicCodeRatioPoints ?? 0, 3');
  });

  it('caps code quality points at 8', () => {
    expect(src).toContain('codeQualityPoints ?? 0, 8');
  });

  it('re-exports Phase 2 helpers from scoring-helpers', () => {
    expect(src).toContain('computeFrameworkDepthPoints');
    expect(src).toContain('computeLogicRatioPoints');
    expect(src).toContain('computeCodeQualityPoints');
  });
});

// ─── Scan Repo Handler Integration ──────────────────────────────────────────

describe('US-011: Scan Repo Handler — Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts') +
    readSource('src/pipeline/handlers/scan-repo-helpers.ts');

  it('imports updateCandidateProfile', () => {
    expect(src).toContain("from '../scoring/skill-score.js'");
    expect(src).toContain('updateCandidateProfile');
  });

  it('calls updateCandidateProfile after Layer 2 analysis', () => {
    expect(src).toContain('updateCandidateProfile(repo.owner)');
  });

  it('calls updateCandidateProfile after repo Firestore update', () => {
    // In runLayer2: updateDoc comes before updateCandidateProfile
    const updateRepoIdx = src.indexOf('await updateDoc<Repository>');
    const updateCandIdx = src.indexOf('updateCandidateProfile(repo.owner)');
    expect(updateRepoIdx).toBeGreaterThan(-1);
    expect(updateCandIdx).toBeGreaterThan(-1);
    expect(updateRepoIdx).toBeLessThan(updateCandIdx);
  });

  it('imports analyzeProficiency for Layer 1', () => {
    expect(src).toContain("from '../analysis/proficiency.js'");
    expect(src).toContain('analyzeProficiency');
  });

  it('writes proficiency results to Repository doc in Layer 1', () => {
    expect(src).toContain('proficiencySignals: profResult.proficiencySignals');
    expect(src).toContain('techProficiency: profResult.techProficiency');
  });

  it('imports analyzeImports for Layer 1', () => {
    expect(src).toContain("from '../analysis/import-analysis.js'");
    expect(src).toContain('analyzeImports');
  });

  it('imports analyzeCodeQuality for Layer 1', () => {
    expect(src).toContain("from '../analysis/code-quality.js'");
    expect(src).toContain('analyzeCodeQuality');
  });

  it('imports analyzeDiffStats for Layer 2', () => {
    expect(src).toContain("from '../analysis/diff-stats.js'");
    expect(src).toContain('analyzeDiffStats');
  });

  it('writes import results to Repository doc in Layer 1', () => {
    expect(src).toContain('confirmedImports: importResult.confirmedImports');
    expect(src).toContain('frameworkDepth: importResult.frameworkDepth');
  });

  it('writes diff stats to Repository doc in Layer 2', () => {
    expect(src).toContain('logicLinesOfCode: diffStats.logicLinesOfCode');
    expect(src).toContain('logicCodeRatio: diffStats.logicCodeRatio');
  });
});

// ─── Candidate Writer Phase 2 ───────────────────────────────────────────────

describe('US-011: Candidate Writer — Phase 2 Fields', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('aggregates confirmedFrameworks across repos', () => {
    expect(src).toContain('confirmedFrameworks');
    expect(src).toContain('confirmedFw');
  });

  it('aggregates frameworkDepthSummary across repos', () => {
    expect(src).toContain('frameworkDepthSummary');
    expect(src).toContain('deduplicateDepthEntries');
  });

  it('computes avgLogicCodeRatio', () => {
    expect(src).toContain('avgLogicCodeRatio');
  });

  it('picks best code quality grade', () => {
    expect(src).toContain('bestCodeQualityGrade');
    expect(src).toContain('pickBestQuality');
  });
});

// Phase 3 structural tests: see phase3-scoring-structure.test.ts
