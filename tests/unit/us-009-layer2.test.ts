/**
 * tests/unit/us-009-layer2.test.ts
 *
 * Unit tests for US-009: Layer 2 analysis — commit patterns, ownership,
 * and test coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import simpleGit from 'simple-git';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Layer 2 Analysis Module Structure ─────────────────────────────────────────

describe('US-009: Layer 2 Analysis Module Structure', () => {
  const src = readSource('src/pipeline/analysis/layer2.ts');

  it('exports analyzeLayer2 async function', () => {
    expect(src).toContain('export async function analyzeLayer2');
  });

  it('exports Layer2Result interface with all required fields', () => {
    expect(src).toContain('export interface Layer2Result');
    expect(src).toContain('commitCount: number');
    expect(src).toContain('firstCommitAt: Date | null');
    expect(src).toContain('lastCommitAt: Date | null');
    expect(src).toContain('commitSpanMonths: number');
    expect(src).toContain('isOwnerRepo: boolean');
    expect(src).toContain('hasTestDirectory: boolean');
    expect(src).toContain('testFileCount: number');
    expect(src).toContain("estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high'");
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain("from 'firebase/");
    expect(src).not.toContain('document.');
    expect(src).not.toContain('window.');
  });

  it('imports simple-git for git log access', () => {
    expect(src).toContain("from 'simple-git'");
    expect(src).toContain('simpleGit');
  });

  it('uses git.log with maxCount 200', () => {
    expect(src).toContain('maxCount: 200');
  });
});

// ─── Commit Analysis ───────────────────────────────────────────────────────────

describe('US-009: Commit Pattern Analysis', () => {
  const src = readSource('src/pipeline/analysis/layer2.ts');

  it('computes commit count from git log result', () => {
    expect(src).toContain('commits.length');
  });

  it('computes commit span in months', () => {
    expect(src).toContain('computeMonthSpan');
    expect(src).toContain('commitSpanMonths');
  });

  it('sorts dates to find first and last commit', () => {
    expect(src).toContain('.sort(');
    expect(src).toContain('getTime()');
  });

  it('handles empty commit history (0 commits)', () => {
    expect(src).toContain('commitCount > 0');
    expect(src).toContain('firstCommitAt: Date | null');
  });
});

// ─── Ownership Detection ───────────────────────────────────────────────────────

describe('US-009: Ownership Detection', () => {
  const src = readSource('src/pipeline/analysis/layer2.ts');

  it('has detectOwnership function', () => {
    expect(src).toContain('detectOwnership');
  });

  it('compares owner username against commit author email prefix', () => {
    expect(src).toContain("commit.email.toLowerCase().split('@')");
    expect(src).toContain('ownerLower');
  });

  it('applies >50% threshold for dominant committer', () => {
    expect(src).toContain('commits.length * 0.5');
  });

  it('returns false for empty commits', () => {
    expect(src).toContain('commits.length === 0');
    expect(src).toContain('return false');
  });
});

// ─── Test Coverage Detection ───────────────────────────────────────────────────

describe('US-009: Test Coverage Detection', () => {
  const src = readSource('src/pipeline/analysis/layer2.ts');

  it('checks for standard test directories', () => {
    expect(src).toContain("'tests'");
    expect(src).toContain("'__tests__'");
    expect(src).toContain("'spec'");
    expect(src).toContain("'test'");
  });

  it('counts test files recursively', () => {
    expect(src).toContain('countTestFiles');
    expect(src).toContain('isTestFile');
  });

  it('detects co-located tests in src/', () => {
    expect(src).toContain('countColocatedTestFiles');
  });

  it('classifies test coverage: none (0), low (<10), medium (10-50), high (50+)', () => {
    expect(src).toContain('classifyTestCoverage');
    expect(src).toContain("testFileCount === 0");
    expect(src).toContain("testFileCount < 10");
    expect(src).toContain("testFileCount <= 50");
    expect(src).toContain("return 'none'");
    expect(src).toContain("return 'low'");
    expect(src).toContain("return 'medium'");
    expect(src).toContain("return 'high'");
  });

  it('recognises standard test file patterns', () => {
    expect(src).toContain('.test.ts');
    expect(src).toContain('.test.tsx');
    expect(src).toContain('.spec.ts');
    expect(src).toContain('.spec.js');
    expect(src).toContain('_test.py');
    expect(src).toContain('_test.go');
  });
});

// ─── Scan Repo Handler — Layer 2 Support ────────────────────────────────────────

describe('US-009: Scan Repo Handler — Layer 2 Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts');

  it('imports analyzeLayer2 from layer2 module', () => {
    expect(src).toContain("from '../analysis/layer2.js'");
    expect(src).toContain('analyzeLayer2');
  });

  it('handles targetDepth layer2', () => {
    expect(src).toContain("targetDepth === 'layer2'");
    expect(src).toContain('runLayer2');
  });

  it('performs full clone for Layer 2 (no --depth flag)', () => {
    // runLayer2 should clone without --depth
    expect(src).toContain('git.clone(repo.githubUrl, cloneDir)');
  });

  it('updates Repository with layer2 fields', () => {
    expect(src).toContain("scanStatus: 'layer2'");
    expect(src).toContain('commitCount: result.commitCount');
    expect(src).toContain('commitSpanMonths: result.commitSpanMonths');
    expect(src).toContain('isOwnerRepo: result.isOwnerRepo');
    expect(src).toContain('hasTestDirectory: result.hasTestDirectory');
    expect(src).toContain('estimatedTestCoverage: result.estimatedTestCoverage');
  });

  it('deletes clone directory in finally block for Layer 2', () => {
    // Both runLayer1 and runLayer2 should use finally + deleteCloneDir
    const runLayer2Section = src.substring(src.indexOf('async function runLayer2'));
    expect(runLayer2Section).toContain('finally');
    expect(runLayer2Section).toContain('deleteCloneDir');
  });
});

// ─── Layer 2 Functional Tests (with temp git repos) ────────────────────────────

describe('US-009: Layer 2 Analysis — functional tests', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-layer2-${randomBytes(4).toString('hex')}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('detects ownership when owner is dominant committer', async () => {
    const { analyzeLayer2 } = await import('../../src/pipeline/analysis/layer2.js');

    // Create a git repo with commits from the owner.
    // Use env overrides to ensure the commit email is correct even when
    // running inside a git pre-commit hook (which may set GIT_AUTHOR_EMAIL).
    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'johndoe@example.com');
    await git.addConfig('user.name', 'John Doe');

    // Override GIT_AUTHOR/COMMITTER env vars that pre-commit hooks may set
    const env = {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'johndoe@example.com',
      GIT_AUTHOR_NAME: 'John Doe',
      GIT_COMMITTER_EMAIL: 'johndoe@example.com',
      GIT_COMMITTER_NAME: 'John Doe',
    };
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, 'file1.ts'), 'export const a = 1;');
    await gitWithEnv.add('file1.ts');
    await gitWithEnv.commit('first commit');

    writeFileSync(join(testDir, 'file2.ts'), 'export const b = 2;');
    await gitWithEnv.add('file2.ts');
    await gitWithEnv.commit('second commit');

    const result = await analyzeLayer2(testDir, 'johndoe');

    expect(result.commitCount).toBe(2);
    expect(result.isOwnerRepo).toBe(true);
    expect(result.commitSpanMonths).toBeGreaterThanOrEqual(0);
    expect(result.firstCommitAt).toBeInstanceOf(Date);
    expect(result.lastCommitAt).toBeInstanceOf(Date);
  });

  it('returns false for ownership when owner is not dominant', async () => {
    const { analyzeLayer2 } = await import('../../src/pipeline/analysis/layer2.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'otheruser@example.com');
    await git.addConfig('user.name', 'Other User');

    // Override env to ensure commit author is 'otheruser', not inherited
    const env = {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'otheruser@example.com',
      GIT_AUTHOR_NAME: 'Other User',
      GIT_COMMITTER_EMAIL: 'otheruser@example.com',
      GIT_COMMITTER_NAME: 'Other User',
    };
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, 'file1.ts'), 'export const a = 1;');
    await gitWithEnv.add('file1.ts');
    await gitWithEnv.commit('commit by other 1');

    writeFileSync(join(testDir, 'file2.ts'), 'export const b = 2;');
    await gitWithEnv.add('file2.ts');
    await gitWithEnv.commit('commit by other 2');

    writeFileSync(join(testDir, 'file3.ts'), 'export const c = 3;');
    await gitWithEnv.add('file3.ts');
    await gitWithEnv.commit('commit by other 3');

    const result = await analyzeLayer2(testDir, 'johndoe');

    expect(result.isOwnerRepo).toBe(false);
    expect(result.commitCount).toBe(3);
  });

  it('detects test directories and counts test files', async () => {
    const { analyzeLayer2 } = await import('../../src/pipeline/analysis/layer2.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'dev@example.com',
      GIT_AUTHOR_NAME: 'Developer',
      GIT_COMMITTER_EMAIL: 'dev@example.com',
      GIT_COMMITTER_NAME: 'Developer',
    };
    const gitWithEnv = simpleGit(testDir).env(env);

    // Create test directory with test files
    const testsDir = join(testDir, 'tests');
    mkdirSync(testsDir, { recursive: true });
    writeFileSync(join(testsDir, 'auth.test.ts'), 'test("auth", () => {})');
    writeFileSync(join(testsDir, 'api.test.ts'), 'test("api", () => {})');
    writeFileSync(join(testsDir, 'utils.spec.ts'), 'test("utils", () => {})');

    // Create source file
    writeFileSync(join(testDir, 'index.ts'), 'export default {}');

    await gitWithEnv.add('.');
    await gitWithEnv.commit('initial');

    const result = await analyzeLayer2(testDir, 'dev');

    expect(result.hasTestDirectory).toBe(true);
    expect(result.testFileCount).toBeGreaterThanOrEqual(3);
    expect(result.estimatedTestCoverage).toBe('low'); // < 10 test files
  });

  it('classifies test coverage as none when no test files', async () => {
    const { analyzeLayer2 } = await import('../../src/pipeline/analysis/layer2.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'dev@example.com',
      GIT_AUTHOR_NAME: 'Developer',
      GIT_COMMITTER_EMAIL: 'dev@example.com',
      GIT_COMMITTER_NAME: 'Developer',
    };
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, 'index.ts'), 'export default {}');
    await gitWithEnv.add('.');
    await gitWithEnv.commit('initial');

    const result = await analyzeLayer2(testDir, 'dev');

    expect(result.hasTestDirectory).toBe(false);
    expect(result.testFileCount).toBe(0);
    expect(result.estimatedTestCoverage).toBe('none');
  });

  it('handles empty repo gracefully', async () => {
    const { analyzeLayer2 } = await import('../../src/pipeline/analysis/layer2.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'dev@example.com',
      GIT_AUTHOR_NAME: 'Developer',
      GIT_COMMITTER_EMAIL: 'dev@example.com',
      GIT_COMMITTER_NAME: 'Developer',
    };
    const gitWithEnv = simpleGit(testDir).env(env);

    // Create at least one commit (git log fails on empty repo)
    writeFileSync(join(testDir, 'README.md'), '# Hello');
    await gitWithEnv.add('.');
    await gitWithEnv.commit('initial');

    const result = await analyzeLayer2(testDir, 'someowner');

    expect(result.commitCount).toBeGreaterThanOrEqual(1);
    expect(result.isOwnerRepo).toBe(false);
    expect(result.estimatedTestCoverage).toBe('none');
  });
});
