/**
 * tests/unit/phase3-scoring-structure.test.ts
 *
 * Source-level structural tests for Phase 3: code durability, behavioral
 * patterns, commit messages — scoring integration and pipeline wiring.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Phase 3: Score Formula Constants ────────────────────────────────────────

describe('Phase 3: Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('caps code durability points at 12', () => {
    expect(src).toContain('codeDurabilityPoints ?? 0, 12');
  });

  it('caps behavioral points at 5', () => {
    expect(src).toContain('behavioralPoints ?? 0, 5');
  });

  it('caps commit message points at 8', () => {
    expect(src).toContain('commitMessagePoints ?? 0, 8');
  });

  it('imports scoring helpers', () => {
    expect(src).toContain("from './scoring-helpers.js'");
  });

  it('includes Phase 3 points in total', () => {
    expect(src).toContain('durabilityPts + behavioralPts + commitMsgPts');
  });
});

// ─── Phase 3: Scan Repo Handler Integration ─────────────────────────────────

describe('Phase 3: Scan Repo Handler Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts') +
    readSource('src/pipeline/handlers/scan-repo-helpers.ts');

  it('imports Phase 3 analysis modules', () => {
    expect(src).toContain("from '../analysis/code-durability.js'");
    expect(src).toContain("from '../analysis/behavioral-patterns.js'");
    expect(src).toContain("from '../analysis/commit-messages.js'");
  });

  it('runs Phase 3 analyses in parallel with Layer 2', () => {
    expect(src).toContain('analyzeCodeDurability(cloneDir, repo.owner)');
    expect(src).toContain('analyzeBehavioralPatterns(cloneDir)');
    expect(src).toContain('analyzeCommitMessageQuality(cloneDir)');
  });

  it('writes Phase 3 results to Repository doc', () => {
    expect(src).toContain('codeDurability');
    expect(src).toContain('behavioralMetrics');
    expect(src).toContain('commitMessageQuality');
  });
});

// ─── Phase 3: Candidate Writer Fields ────────────────────────────────────────

describe('Phase 3: Candidate Writer Fields', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('collects Phase 3 data from repos', () => {
    expect(src).toContain('collectPhase3Data');
  });

  it('writes durability fields to candidate doc', () => {
    expect(src).toContain('codeDurabilityScore');
    expect(src).toContain('avgChurnRate14d');
    expect(src).toContain('avgChurnRate90d');
  });

  it('writes behavioral fields to candidate doc', () => {
    expect(src).toContain('behavioralScore');
    expect(src).toContain('commitDisciplineLevel');
  });

  it('writes commit message score to candidate doc', () => {
    expect(src).toContain('commitMessageScore');
  });
});

// ─── Phase 3: Scoring Helpers ────────────────────────────────────────────────

describe('Phase 3: Scoring Helpers Module', () => {
  const src = readSource('src/pipeline/scoring/scoring-helpers.ts');

  it('exports computeDurabilityPoints', () => {
    expect(src).toContain('export function computeDurabilityPoints');
  });

  it('exports computeBehavioralPoints', () => {
    expect(src).toContain('export function computeBehavioralPoints');
  });

  it('exports computeCommitMessagePoints', () => {
    expect(src).toContain('export function computeCommitMessagePoints');
  });

  it('computes durability weighted by commit count', () => {
    expect(src).toContain('repo.commitCount');
    expect(src).toContain('weightedChurn');
  });

  it('requires minimum 20 commits for commit message scoring', () => {
    expect(src).toContain('MIN_COMMITS_FOR_SCORING = 20');
  });
});
