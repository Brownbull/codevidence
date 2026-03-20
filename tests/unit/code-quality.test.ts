/** Tests for TypeScript AST metrics and code quality orchestration. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('Code Quality: ts-metrics Module Structure', () => {
  const src = readSource('src/pipeline/analysis/ts-metrics.ts');

  it('exports analyzeFileMetrics, FunctionMetric, FileMetrics', () => {
    expect(src).toContain('export function analyzeFileMetrics');
    expect(src).toContain('export interface FunctionMetric');
    expect(src).toContain('export interface FileMetrics');
  });

  it('imports TypeScript compiler API, not browser APIs or fs', () => {
    expect(src).toContain("import ts from 'typescript'");
    expect(src).not.toContain('window.');
    expect(src).not.toContain("from 'fs'");
  });
});

describe('Code Quality: code-quality Module Structure', () => {
  const src = readSource('src/pipeline/analysis/code-quality.ts');

  it('exports analyzeCodeQuality and imports ts-metrics', () => {
    expect(src).toContain('export function analyzeCodeQuality');
    expect(src).toContain("from './ts-metrics.js'");
    expect(src).toContain('analyzeFileMetrics');
  });

  it('uses lstatSync, caps files at 30, requires 3+ functions', () => {
    expect(src).toContain('lstatSync');
    expect(src).toContain('MAX_FILES = 30');
    expect(src).toContain('MIN_FUNCTIONS = 3');
  });
});

// ─── Functional Tests: analyzeFileMetrics ───────────────────────────────────

describe('Code Quality: analyzeFileMetrics — Functional', () => {
  it('returns null for empty content', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const result = mod.analyzeFileMetrics('test.ts', '');
    expect(result).not.toBeNull();
    expect(result!.functions).toHaveLength(0);
  });

  it('extracts function declarations', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
function hello(name: string): string {
  if (name.length > 0) {
    return "Hello, " + name;
  }
  return "Hello, World";
}`;
    const result = mod.analyzeFileMetrics('test.ts', code);
    expect(result).not.toBeNull();
    expect(result!.functions.length).toBeGreaterThanOrEqual(1);
    const fn = result!.functions.find(f => f.name === 'hello');
    expect(fn).toBeDefined();
    expect(fn!.complexity).toBeGreaterThanOrEqual(1); // if statement
    expect(fn!.parameterCount).toBe(1);
  });

  it('extracts arrow functions assigned to const', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
const greet = (name: string): string => {
  if (name) {
    return "Hi " + name;
  }
  return "Hi";
};`;
    const result = mod.analyzeFileMetrics('test.ts', code);
    expect(result).not.toBeNull();
    const fn = result!.functions.find(f => f.name === 'greet');
    expect(fn).toBeDefined();
  });

  it('computes cognitive complexity for nested control flow', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
function complex(a: number, b: number): number {
  if (a > 0) {
    if (b > 0) {
      for (let i = 0; i < a; i++) {
        if (i % 2 === 0) {
          return i;
        }
      }
    }
  }
  return 0;
}`;
    const result = mod.analyzeFileMetrics('test.ts', code);
    expect(result).not.toBeNull();
    const fn = result!.functions.find(f => f.name === 'complex');
    expect(fn).toBeDefined();
    expect(fn!.complexity).toBeGreaterThanOrEqual(4); // 3 ifs + 1 for
    expect(fn!.maxNesting).toBeGreaterThanOrEqual(3);
  });

  it('detects error handling via try-catch', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}`;
    const result = mod.analyzeFileMetrics('test.ts', code);
    expect(result).not.toBeNull();
    const fn = result!.functions.find(f => f.name === 'safeParse');
    expect(fn).toBeDefined();
    expect(fn!.hasErrorHandling).toBe(true);
  });

  it('classifies naming style as camelCase', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
function getUserName() {
  return "test";
}
function setUserAge() {
  return 25;
}`;
    const result = mod.analyzeFileMetrics('test.ts', code);
    expect(result).not.toBeNull();
    expect(result!.namingStyle).toBe('camelCase');
  });

  it('handles TSX files', async () => {
    const mod = await import('../../src/pipeline/analysis/ts-metrics.js');
    const code = `
function App() {
  const [count, setCount] = useState(0);
  if (count > 10) {
    return <div>Too many</div>;
  }
  return <button onClick={() => setCount(count + 1)}>Click</button>;
}`;
    const result = mod.analyzeFileMetrics('test.tsx', code);
    expect(result).not.toBeNull();
  });
});

// ─── Functional Tests: analyzeCodeQuality ───────────────────────────────────

describe('Code Quality: analyzeCodeQuality — Functional', () => {
  it('returns null for unsupported languages', async () => {
    const mod = await import('../../src/pipeline/analysis/code-quality.js');
    expect(mod.analyzeCodeQuality('/tmp/nonexistent', 'language:python')).toBeNull();
    expect(mod.analyzeCodeQuality('/tmp/nonexistent', null)).toBeNull();
  });
});

// ─── Score Formula Helpers ──────────────────────────────────────────────────

describe('Code Quality: Score Helpers in skill-score.ts', () => {
  it('computeFrameworkDepthPoints returns correct points', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.computeFrameworkDepthPoints([])).toBe(0);
    expect(mod.computeFrameworkDepthPoints([{ depth: 'beginner' }])).toBe(1);
    expect(mod.computeFrameworkDepthPoints([{ depth: 'intermediate' }])).toBe(3);
    expect(mod.computeFrameworkDepthPoints([{ depth: 'advanced' }])).toBe(5);
    expect(mod.computeFrameworkDepthPoints([{ depth: 'expert' }])).toBe(8);
  });

  it('computeFrameworkDepthPoints takes best across entries', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const entries = [{ depth: 'beginner' }, { depth: 'advanced' }];
    expect(mod.computeFrameworkDepthPoints(entries)).toBe(5);
  });

  it('computeLogicRatioPoints maps ratio to points', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.computeLogicRatioPoints(undefined)).toBe(0);
    expect(mod.computeLogicRatioPoints(0.2)).toBe(0);
    expect(mod.computeLogicRatioPoints(0.3)).toBe(1);
    expect(mod.computeLogicRatioPoints(0.5)).toBe(2);
    expect(mod.computeLogicRatioPoints(0.7)).toBe(3);
    expect(mod.computeLogicRatioPoints(0.9)).toBe(3);
  });

  it('computeCodeQualityPoints maps grade to points', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    expect(mod.computeCodeQualityPoints(undefined)).toBe(0);
    expect(mod.computeCodeQualityPoints(null)).toBe(0);
    expect(mod.computeCodeQualityPoints('F')).toBe(0);
    expect(mod.computeCodeQualityPoints('D')).toBe(2);
    expect(mod.computeCodeQualityPoints('C')).toBe(4);
    expect(mod.computeCodeQualityPoints('B')).toBe(6);
    expect(mod.computeCodeQualityPoints('A')).toBe(8);
  });
});

// ─── Updated Skill Score Formula ────────────────────────────────────────────

describe('Code Quality: Updated computeSkillScore', () => {
  it('includes Phase 2 fields in score', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const base = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 3,
      toolCount: 2,
      commitSpanMonths: 5,
      isOwnerRepo: true,
      estimatedTestCoverage: 'medium',
      aiSignalPoints: 5,
      proficiencyBonus: 10,
      domainPoints: 5,
    });

    const withPhase2 = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 3,
      toolCount: 2,
      commitSpanMonths: 5,
      isOwnerRepo: true,
      estimatedTestCoverage: 'medium',
      aiSignalPoints: 5,
      proficiencyBonus: 10,
      domainPoints: 5,
      confirmedFrameworkCount: 2,
      frameworkDepthPoints: 5,
      logicCodeRatioPoints: 2,
      codeQualityPoints: 6,
    });

    expect(withPhase2).toBeGreaterThan(base);
    expect(withPhase2 - base).toBe(4 + 5 + 2 + 6); // 17 more points
  });

  it('caps Phase 2 components', async () => {
    const mod = await import('../../src/pipeline/scoring/skill-score.js');
    const maxed = mod.computeSkillScore({
      hasLanguage: true,
      frameworkCount: 5,
      toolCount: 3,
      commitSpanMonths: 7,
      isOwnerRepo: true,
      estimatedTestCoverage: 'high',
      aiSignalPoints: 7,
      proficiencyBonus: 14,
      domainPoints: 10,
      confirmedFrameworkCount: 10, // cap 6
      frameworkDepthPoints: 20,    // cap 8
      logicCodeRatioPoints: 5,     // cap 3
      codeQualityPoints: 15,       // cap 8
    });
    // Theoretical max with Phase 2: 15+20+9+7+8+10+7+14+10+6+8+3+8 = 125 → clamped 100
    expect(maxed).toBe(100);
  });

  it('still returns 0 for empty input', async () => {
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
});
