/**
 * tests/unit/us-011-skill-score.test.ts
 *
 * Unit tests for US-011: Skill Score formula computation.
 */

import { describe, it, expect } from 'vitest';

// ─── computeSkillScore Formula ───────────────────────────────────────────────

describe('US-011: computeSkillScore Formula', () => {
  let computeSkillScore: (input: {
    hasLanguage: boolean;
    frameworkCount: number;
    toolCount: number;
    commitSpanMonths: number;
    isOwnerRepo: boolean;
    estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
    aiSignalPoints: number;
    proficiencyBonus?: number;
    domainPoints?: number;
  }) => number;

  it('loads the module', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    computeSkillScore = mod.computeSkillScore;
    expect(computeSkillScore).toBeDefined();
  });

  it('computes correct score for known input set', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    // 15 + 12 + 6 + 7 + 8 + 5 + 5 = 58
    const score = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 3,
      toolCount: 2,
      commitSpanMonths: 8,
      isOwnerRepo: true,
      estimatedTestCoverage: 'medium',
      aiSignalPoints: 5,
    });
    expect(score).toBe(58);
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

  it('reaches exactly 100 with all components at max', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    // 15 + 20 + 9 + 7 + 8 + 10 + 7 + 14 + 10 = 100
    const score = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 10,
      toolCount: 10,
      commitSpanMonths: 50,
      isOwnerRepo: true,
      estimatedTestCoverage: 'high',
      aiSignalPoints: 20,
      proficiencyBonus: 20,
      domainPoints: 15,
    });
    expect(score).toBe(100);
  });

  it('awards 15 points for primary language', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      frameworkCount: 0, toolCount: 0, commitSpanMonths: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0,
    };
    const diff = mod.computeSkillScore({ ...base, hasLanguage: true })
      - mod.computeSkillScore({ ...base, hasLanguage: false });
    expect(diff).toBe(15);
  });

  it('awards 4 points per framework, capped at 20', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, toolCount: 0, commitSpanMonths: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, frameworkCount: 1 })).toBe(4);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 3 })).toBe(12);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 5 })).toBe(20);
    expect(mod.computeSkillScore({ ...base, frameworkCount: 6 })).toBe(20);
  });

  it('awards 3 points per tool, capped at 9', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, commitSpanMonths: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, toolCount: 1 })).toBe(3);
    expect(mod.computeSkillScore({ ...base, toolCount: 3 })).toBe(9);
    expect(mod.computeSkillScore({ ...base, toolCount: 4 })).toBe(9);
  });

  it('awards commitSpanMonths up to 7', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      isOwnerRepo: false, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 7 })).toBe(7);
    expect(mod.computeSkillScore({ ...base, commitSpanMonths: 24 })).toBe(7);
  });

  it('awards 8 points for ownership', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, estimatedTestCoverage: 'none' as const, aiSignalPoints: 0,
    };
    const diff = mod.computeSkillScore({ ...base, isOwnerRepo: true })
      - mod.computeSkillScore({ ...base, isOwnerRepo: false });
    expect(diff).toBe(8);
  });

  it('awards correct test coverage points (0/2/5/10)', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'none' })).toBe(0);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'low' })).toBe(2);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'medium' })).toBe(5);
    expect(mod.computeSkillScore({ ...base, estimatedTestCoverage: 'high' })).toBe(10);
  });

  it('awards AI signal points capped at 7', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none' as const,
    };
    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 7 })).toBe(7);
    expect(mod.computeSkillScore({ ...base, aiSignalPoints: 15 })).toBe(7);
  });

  it('awards proficiency bonus capped at 14', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none' as const,
      aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, proficiencyBonus: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, proficiencyBonus: 14 })).toBe(14);
    expect(mod.computeSkillScore({ ...base, proficiencyBonus: 20 })).toBe(14);
  });

  it('defaults proficiencyBonus to 0 when not provided', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const score = mod.computeSkillScore({
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none',
      aiSignalPoints: 0,
    });
    expect(score).toBe(0);
  });

  it('awards domain points capped at 10', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = {
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none' as const,
      aiSignalPoints: 0,
    };
    expect(mod.computeSkillScore({ ...base, domainPoints: 5 })).toBe(5);
    expect(mod.computeSkillScore({ ...base, domainPoints: 10 })).toBe(10);
    expect(mod.computeSkillScore({ ...base, domainPoints: 15 })).toBe(10);
  });

  it('defaults domainPoints to 0 when not provided', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const score = mod.computeSkillScore({
      hasLanguage: false, frameworkCount: 0, toolCount: 0,
      commitSpanMonths: 0, isOwnerRepo: false, estimatedTestCoverage: 'none',
      aiSignalPoints: 0,
    });
    expect(score).toBe(0);
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
    expect(points).toBe(2);
  });

  it('awards 3 extra points for coAuthoredByAI', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const points = mod.computeAiSignalPoints([
      { aiConfigFiles: [], coAuthoredByAI: true },
    ]);
    expect(points).toBe(3);
  });

  it('caps total at 7', async () => {
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
    // 4 patterns * 2 + 3 = 11, capped to 7
    expect(points).toBe(7);
  });

  it('deduplicates patterns across repos', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const signal = { fileName: 'CLAUDE.md', firstDetectedAt: new Date() as never, modificationCount: 1, lastModifiedAt: new Date() as never, diffComplexity: 'minimal' as const, isEvolved: false, originSignal: 'likely-original' as const };
    const points = mod.computeAiSignalPoints([
      { aiConfigFiles: [signal], coAuthoredByAI: false },
      { aiConfigFiles: [signal], coAuthoredByAI: false },
    ]);
    expect(points).toBe(2);
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

  it('returns null for unknown files', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.mapConfigFileToPattern('README.md')).toBeNull();
    expect(mod.mapConfigFileToPattern('package.json')).toBeNull();
  });
});
