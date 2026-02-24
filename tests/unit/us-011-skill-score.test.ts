/**
 * tests/unit/us-011-skill-score.test.ts
 *
 * Unit tests for US-011: Skill Score computation and candidate profile generation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ────────────────────────────────────────────────────────

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

  it('exports mapConfigFileToPattern function', () => {
    expect(src).toContain('export function mapConfigFileToPattern');
  });

  it('imports from Firestore wrapper only, not Firebase SDK directly', () => {
    expect(src).not.toContain("from 'firebase/");
    expect(src).toContain("from '../../core/db/firestore.js'");
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });
});

// ─── Pipeline Scoring Output Type Safety ─────────────────────────────────────

describe('US-011: Pipeline Scoring Output Type Safety', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('PipelineScoringOutput uses Omit to exclude aiMaturity fields', () => {
    expect(src).toContain('Omit<');
    expect(src).toContain('Candidate');
  });

  it('never writes aiMaturityScore in pipeline fields', () => {
    // The pipelineFields object must NOT contain aiMaturityScore
    // Only the initial setDoc for new candidates should set it to null
    const lines = src.split('\n');
    const pipelineFieldsBlock: string[] = [];
    let inBlock = false;
    for (const line of lines) {
      if (line.includes('const pipelineFields')) inBlock = true;
      if (inBlock) {
        pipelineFieldsBlock.push(line);
        if (line.trim() === '};') break;
      }
    }
    const block = pipelineFieldsBlock.join('\n');
    expect(block).not.toContain('aiMaturityScore');
    expect(block).not.toContain('aiMaturityScoredAt');
    expect(block).not.toContain('aiMaturityScoredBy');
  });

  it('sets aiMaturityScore: null only on new candidate creation', () => {
    expect(src).toContain('aiMaturityScore: null');
    expect(src).toContain('aiMaturityScoredAt: null');
    expect(src).toContain('aiMaturityScoredBy: null');
  });

  it('updates existing candidates with updateDoc (never setDoc overwrites)', () => {
    expect(src).toContain('updateDoc<Candidate>(CANDIDATES_COLLECTION, owner, pipelineFields)');
  });
});

// ─── computeSkillScore Formula ───────────────────────────────────────────────

describe('US-011: computeSkillScore Formula', () => {
  // Dynamic import to test actual computation
  let computeSkillScore: (input: {
    hasLanguage: boolean;
    frameworkCount: number;
    toolCount: number;
    commitSpanMonths: number;
    isOwnerRepo: boolean;
    estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
    aiSignalPoints: number;
  }) => number;

  it('loads the module', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    computeSkillScore = mod.computeSkillScore;
    expect(computeSkillScore).toBeDefined();
  });

  it('computes correct score for known input set', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    // 20 + 18 + 10 + 8 + 10 + 8 + 5 = 79
    const score = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 3,
      toolCount: 2,
      commitSpanMonths: 8,
      isOwnerRepo: true,
      estimatedTestCoverage: 'medium',
      aiSignalPoints: 5,
    });
    expect(score).toBe(79);
  });

  it('returns 0 for empty input', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const score = mod.computeSkillScore({
      hasLanguage: false,
      frameworkCount: 0,
      toolCount: 0,
      commitSpanMonths: 0,
      isOwnerRepo: false,
      estimatedTestCoverage: 'none',
      aiSignalPoints: 0,
    });
    expect(score).toBe(0);
  });

  it('clamps maximum score to 100', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    // 20 + 30 + 15 + 10 + 10 + 15 + 10 = 110, clamped to 100
    const score = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 10, // capped at 30
      toolCount: 10,      // capped at 15
      commitSpanMonths: 50, // capped at 10
      isOwnerRepo: true,
      estimatedTestCoverage: 'high',
      aiSignalPoints: 20, // capped at 10
    });
    expect(score).toBe(100);
  });

  it('awards 20 points for primary language', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const withLang = mod.computeSkillScore({
      hasLanguage: true, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false,
      estimatedTestCoverage: 'none', aiSignalPoints: 0,
    });
    const withoutLang = mod.computeSkillScore({
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false,
      estimatedTestCoverage: 'none', aiSignalPoints: 0,
    });
    expect(withLang - withoutLang).toBe(20);
  });

  it('awards 6 points per framework, capped at 30', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, toolCount: 0, commitSpanMonths: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0 };

    expect(mod.computeSkillScore({ ...base, frameworkCount: 1 })).toBe(6);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 3 })).toBe(18);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 5 })).toBe(30);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 6 })).toBe(30); // capped
  });

  it('awards 5 points per tool, capped at 15', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, frameworkCount: 0, commitSpanMonths: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0 };

    expect(mod.computeSkillScore({ ...base, toolCount: 1 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, toolCount: 3 })).toBe(15);
    expect(mod.computeSkillScore({ ...base, toolCount: 4 })).toBe(15); // capped
  });

  it('awards commitSpanMonths up to 10', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, frameworkCount: 0, toolCount: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0 };

    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 10 })).toBe(10);
    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 24 })).toBe(10); // capped
  });

  it('awards 10 points for ownership', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0 };

    const owned = mod.computeSkillScore({ ...base, isOwnerRepo: true });
    const notOwned = mod.computeSkillScore({ ...base, isOwnerRepo: false });
    expect(owned - notOwned).toBe(10);
  });

  it('awards correct test coverage points (0/3/8/15)', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, aiSignalPoints: 0 };

    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'none' })).toBe(0);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'low' })).toBe(3);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'medium' })).toBe(8);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'high' })).toBe(15);
  });

  it('awards AI signal points capped at 10', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = { hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none' as const };

    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 10 })).toBe(10);
    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 15 })).toBe(10); // capped
  });
});

// ─── computeAiSignalPoints ───────────────────────────────────────────────────

describe('US-011: computeAiSignalPoints', () => {
  it('returns 0 for repos with no AI signals', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const points = mod.computeAiSignalPoints([
      { aiConfigFiles: [], coAuthoredByAI: false },
    ]);
    expect(points).toBe(0);
  });

  it('awards 2 points per unique AI config pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const points = mod.computeAiSignalPoints([
      {
        aiConfigFiles: [
          { fileName: 'CLAUDE.md', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal', isEvolved: false, originSignal: 'likely-original' },
        ],
        coAuthoredByAI: false,
      },
    ]);
    expect(points).toBe(2); // 1 pattern * 2
  });

  it('awards 3 extra points for coAuthoredByAI', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const points = mod.computeAiSignalPoints([
      { aiConfigFiles: [], coAuthoredByAI: true },
    ]);
    expect(points).toBe(3);
  });

  it('caps total at 10', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const points = mod.computeAiSignalPoints([
      {
        aiConfigFiles: [
          { fileName: 'CLAUDE.md', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal', isEvolved: false, originSignal: 'likely-original' },
          { fileName: '.cursor/rules', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal', isEvolved: false, originSignal: 'likely-original' },
          { fileName: 'ai-context.md', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal', isEvolved: false, originSignal: 'likely-original' },
          { fileName: '.aiderignore', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal', isEvolved: false, originSignal: 'likely-original' },
        ],
        coAuthoredByAI: true,
      },
    ]);
    // 4 patterns * 2 + 3 = 11, capped to 10
    expect(points).toBe(10);
  });

  it('deduplicates patterns across repos', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const signal = { fileName: 'CLAUDE.md', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal' as const, isEvolved: false, originSignal: 'likely-original' as const };
    const points = mod.computeAiSignalPoints([
      { aiConfigFiles: [signal], coAuthoredByAI: false },
      { aiConfigFiles: [signal], coAuthoredByAI: false },
    ]);
    expect(points).toBe(2); // same pattern, counted once
  });
});

// ─── AI Config File Pattern Mapping ──────────────────────────────────────────

describe('US-011: mapConfigFileToPattern', () => {
  it('maps CLAUDE.md to claude-md pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('CLAUDE.md')).toBe('ai-agent-pattern:claude-md');
  });

  it('maps .cursor/rules to cursor-rules pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('.cursor/rules')).toBe('ai-agent-pattern:cursor-rules');
  });

  it('maps .aider* files to aider-config pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('.aiderignore')).toBe('ai-agent-pattern:aider-config');
    expect(mod.mapConfigFileToPattern('.aider.conf.yml')).toBe('ai-agent-pattern:aider-config');
  });

  it('maps ai-context.md to ai-context-file pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('ai-context.md')).toBe('ai-agent-pattern:ai-context-file');
  });

  it('maps copilot-instructions.md to copilot-instructions pattern', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('.github/copilot-instructions.md'))
      .toBe('ai-agent-pattern:copilot-instructions');
  });

  it('returns null for unknown files', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('README.md')).toBeNull();
    expect(mod.mapConfigFileToPattern('package.json')).toBeNull();
  });
});

// ─── Candidate Building Logic ────────────────────────────────────────────────

describe('US-011: Candidate Building — Structural', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('derives candidate from repo owner as doc ID', () => {
    expect(src).toContain("CANDIDATES_COLLECTION, owner");
  });

  it('sets isStale to false at write time', () => {
    expect(src).toContain('isStale: false');
  });

  it('sets githubProfileUrl from owner username', () => {
    expect(src).toContain('`https://github.com/${owner}`');
  });

  it('sets avatarUrl from GitHub convention', () => {
    expect(src).toContain('`https://github.com/${owner}.png`');
  });

  it('queries repos by owner from Firestore', () => {
    expect(src).toContain("where('owner', '==', owner)");
  });

  it('aggregates skillTags from languages, frameworks, tools, and AI patterns', () => {
    expect(src).toContain('...aggregated.languages');
    expect(src).toContain('...aggregated.frameworks');
    expect(src).toContain('...aggregated.tools');
    expect(src).toContain('...aggregated.aiAgentPatterns');
  });
});

// ─── Score Formula Constants ─────────────────────────────────────────────────

describe('US-011: Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('uses 20 points for primary language', () => {
    expect(src).toContain('input.hasLanguage ? 20 : 0');
  });

  it('uses 6 points per framework, capped at 30', () => {
    expect(src).toContain('input.frameworkCount * 6, 30');
  });

  it('uses 5 points per tool, capped at 15', () => {
    expect(src).toContain('input.toolCount * 5, 15');
  });

  it('uses commitSpanMonths capped at 10', () => {
    expect(src).toContain('input.commitSpanMonths, 10');
  });

  it('uses 10 points for ownership bonus', () => {
    expect(src).toContain('input.isOwnerRepo ? 10 : 0');
  });

  it('defines test coverage points: 0/3/8/15', () => {
    expect(src).toContain("'none': 0");
    expect(src).toContain("'low': 3");
    expect(src).toContain("'medium': 8");
    expect(src).toContain("'high': 15");
  });

  it('clamps result to 0-100', () => {
    expect(src).toContain('Math.max(0, Math.min(100, total))');
  });
});

// ─── Scan Repo Handler Integration ──────────────────────────────────────────

describe('US-011: Scan Repo Handler — Candidate Profile Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts');

  it('imports updateCandidateProfile', () => {
    expect(src).toContain("from '../scoring/skill-score.js'");
    expect(src).toContain('updateCandidateProfile');
  });

  it('calls updateCandidateProfile after Layer 2 analysis', () => {
    expect(src).toContain('updateCandidateProfile(repo.owner)');
  });

  it('calls updateCandidateProfile after repo Firestore update', () => {
    const updateRepoIdx = src.indexOf('scanStatus: \'layer2\'');
    const updateCandIdx = src.indexOf('updateCandidateProfile(repo.owner)');
    expect(updateRepoIdx).toBeLessThan(updateCandIdx);
  });

  it('runs candidate update inside the try block (before clone cleanup)', () => {
    const updateCandIdx = src.indexOf('updateCandidateProfile(repo.owner)');
    const finallyIdx = src.indexOf('} finally {', updateCandIdx - 200);
    expect(updateCandIdx).toBeLessThan(finallyIdx);
  });
});
