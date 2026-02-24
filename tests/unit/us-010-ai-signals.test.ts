/**
 * tests/unit/us-010-ai-signals.test.ts
 *
 * Unit tests for US-010: AI tooling signal detection and config file
 * evolution tracking.
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

/** Creates a git repo in testDir with controlled author env vars. */
function createGitEnv(email: string, name: string) {
  return {
    ...process.env,
    GIT_AUTHOR_EMAIL: email,
    GIT_AUTHOR_NAME: name,
    GIT_COMMITTER_EMAIL: email,
    GIT_COMMITTER_NAME: name,
  };
}

// ─── AI Signals Module Structure ────────────────────────────────────────────────

describe('US-010: AI Signals Module Structure', () => {
  const src = readSource('src/pipeline/analysis/ai-signals.ts');

  it('exports analyzeAiSignals async function', () => {
    expect(src).toContain('export async function analyzeAiSignals');
  });

  it('exports AiSignalResult interface', () => {
    expect(src).toContain('export interface AiSignalResult');
    expect(src).toContain('aiConfigFiles: AiConfigFileSignalRaw[]');
    expect(src).toContain('coAuthoredByAI: boolean');
    expect(src).toContain('aiAttributionPatterns: string[]');
  });

  it('exports AiConfigFileSignalRaw interface with all fields', () => {
    expect(src).toContain('export interface AiConfigFileSignalRaw');
    expect(src).toContain('fileName: string');
    expect(src).toContain('firstDetectedAt: Date');
    expect(src).toContain('modificationCount: number');
    expect(src).toContain('lastModifiedAt: Date');
    expect(src).toContain("diffComplexity: 'minimal' | 'moderate' | 'extensive'");
    expect(src).toContain('isEvolved: boolean');
    expect(src).toContain("originSignal: 'likely-original' | 'likely-copied' | 'unknown'");
  });

  it('does not import browser APIs or Firestore', () => {
    expect(src).not.toContain("from 'firebase/");
    expect(src).not.toContain('document.');
    expect(src).not.toContain('window.');
  });

  it('imports simple-git', () => {
    expect(src).toContain("from 'simple-git'");
  });
});

// ─── AI Config File Pattern Detection ───────────────────────────────────────────

describe('US-010: AI Config File Patterns', () => {
  const src = readSource('src/pipeline/analysis/ai-signals.ts');

  it('detects CLAUDE.md', () => {
    expect(src).toContain("'CLAUDE.md'");
  });

  it('detects .claude/ directory', () => {
    expect(src).toContain("'.claude'");
  });

  it('detects .cursor/rules', () => {
    expect(src).toContain("'.cursor/rules'");
  });

  it('detects .cursor/settings.json', () => {
    expect(src).toContain("'.cursor/settings.json'");
  });

  it('detects ai-context.md', () => {
    expect(src).toContain("'ai-context.md'");
  });

  it('detects .github/copilot-instructions.md', () => {
    expect(src).toContain("'.github/copilot-instructions.md'");
  });

  it('detects .aider* files via prefix pattern', () => {
    expect(src).toContain("'.aider'");
  });
});

// ─── Diff Complexity Classification ─────────────────────────────────────────────

describe('US-010: Diff Complexity Classification', () => {
  const src = readSource('src/pipeline/analysis/ai-signals.ts');

  it('classifies minimal (<10 lines)', () => {
    expect(src).toContain("totalLines < 10");
    expect(src).toContain("return 'minimal'");
  });

  it('classifies moderate (<100 lines)', () => {
    expect(src).toContain("totalLines < 100");
    expect(src).toContain("return 'moderate'");
  });

  it('classifies extensive (>=100 lines)', () => {
    expect(src).toContain("return 'extensive'");
  });
});

// ─── Evolution Detection ────────────────────────────────────────────────────────

describe('US-010: Evolution and Origin Detection', () => {
  const src = readSource('src/pipeline/analysis/ai-signals.ts');

  it('sets isEvolved = modificationCount > 3', () => {
    expect(src).toContain('modificationCount > 3');
  });

  it('classifies likely-copied when >50 lines in first commit', () => {
    expect(src).toContain("linesAdded > 50");
    expect(src).toContain("return 'likely-copied'");
  });

  it('classifies likely-original for small introductions', () => {
    expect(src).toContain("return 'likely-original'");
  });

  it('returns unknown when insufficient data', () => {
    expect(src).toContain("return 'unknown'");
  });
});

// ─── Co-Authored-By Detection ────────────────────────────────────────────────────

describe('US-010: Co-Authored-By AI Detection', () => {
  const src = readSource('src/pipeline/analysis/ai-signals.ts');

  it('checks for co-authored-by trailers', () => {
    expect(src).toContain("'co-authored-by:'");
  });

  it('knows GitHub Copilot as an AI tool', () => {
    expect(src).toContain("'github copilot'");
    expect(src).toContain("'copilot'");
  });

  it('knows Cursor as an AI tool', () => {
    expect(src).toContain("'cursor'");
  });

  it('knows Claude as an AI tool', () => {
    expect(src).toContain("'claude'");
  });

  it('knows Aider as an AI tool', () => {
    expect(src).toContain("'aider'");
  });

  it('reads up to 200 commit messages', () => {
    expect(src).toContain('maxCount: 200');
  });
});

// ─── Scan Repo Handler Integration ──────────────────────────────────────────────

describe('US-010: Scan Repo Handler — AI Signals Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts');

  it('imports analyzeAiSignals', () => {
    expect(src).toContain("from '../analysis/ai-signals.js'");
    expect(src).toContain('analyzeAiSignals');
  });

  it('runs AI signal analysis during Layer 2', () => {
    expect(src).toContain('analyzeAiSignals(cloneDir)');
  });

  it('runs Layer 2 and AI signals in parallel with Promise.all', () => {
    expect(src).toContain('Promise.all');
    expect(src).toContain('analyzeLayer2(cloneDir, repo.owner)');
    expect(src).toContain('analyzeAiSignals(cloneDir)');
  });

  it('writes aiConfigFiles to Repository', () => {
    expect(src).toContain('aiConfigFiles');
  });

  it('writes coAuthoredByAI to Repository', () => {
    expect(src).toContain('coAuthoredByAI: aiResult.coAuthoredByAI');
  });

  it('writes aiAttributionPatterns to Repository', () => {
    expect(src).toContain('aiAttributionPatterns: aiResult.aiAttributionPatterns');
  });
});

// ─── Functional Tests ───────────────────────────────────────────────────────────

describe('US-010: AI Signals — functional tests', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-aisig-${randomBytes(4).toString('hex')}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('detects CLAUDE.md and builds signal with git history', async () => {
    const { analyzeAiSignals } = await import('../../src/pipeline/analysis/ai-signals.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = createGitEnv('dev@example.com', 'Developer');
    const gitWithEnv = simpleGit(testDir).env(env);

    // Create CLAUDE.md with initial content
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project\nSmall file.');
    await gitWithEnv.add('CLAUDE.md');
    await gitWithEnv.commit('add CLAUDE.md');

    // Modify CLAUDE.md
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project\nSmall file.\n## Updated section');
    await gitWithEnv.add('CLAUDE.md');
    await gitWithEnv.commit('update CLAUDE.md');

    const result = await analyzeAiSignals(testDir);

    expect(result.aiConfigFiles.length).toBeGreaterThanOrEqual(1);
    const claudeSignal = result.aiConfigFiles.find((f) => f.fileName === 'CLAUDE.md');
    expect(claudeSignal).toBeDefined();
    expect(claudeSignal!.modificationCount).toBe(2);
    expect(claudeSignal!.firstDetectedAt).toBeInstanceOf(Date);
    expect(claudeSignal!.lastModifiedAt).toBeInstanceOf(Date);
    expect(claudeSignal!.isEvolved).toBe(false); // only 2 modifications, not > 3
    expect(claudeSignal!.originSignal).toBe('likely-original'); // small initial commit
  });

  it('detects co-authored-by AI trailers in commits', async () => {
    const { analyzeAiSignals } = await import('../../src/pipeline/analysis/ai-signals.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = createGitEnv('dev@example.com', 'Developer');
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, 'index.ts'), 'export default {}');
    await gitWithEnv.add('index.ts');
    await gitWithEnv.commit('feat: add index\n\nCo-authored-by: Claude <noreply@anthropic.com>');

    const result = await analyzeAiSignals(testDir);

    expect(result.coAuthoredByAI).toBe(true);
    expect(result.aiAttributionPatterns.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty results for repo with no AI signals', async () => {
    const { analyzeAiSignals } = await import('../../src/pipeline/analysis/ai-signals.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = createGitEnv('dev@example.com', 'Developer');
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, 'index.ts'), 'export default {}');
    await gitWithEnv.add('index.ts');
    await gitWithEnv.commit('initial commit');

    const result = await analyzeAiSignals(testDir);

    expect(result.aiConfigFiles).toHaveLength(0);
    expect(result.coAuthoredByAI).toBe(false);
    expect(result.aiAttributionPatterns).toHaveLength(0);
  });

  it('detects .aider files via prefix matching', async () => {
    const { analyzeAiSignals } = await import('../../src/pipeline/analysis/ai-signals.js');

    const git = simpleGit(testDir);
    await git.init();
    await git.addConfig('user.email', 'dev@example.com');
    await git.addConfig('user.name', 'Developer');

    const env = createGitEnv('dev@example.com', 'Developer');
    const gitWithEnv = simpleGit(testDir).env(env);

    writeFileSync(join(testDir, '.aiderignore'), 'node_modules/');
    writeFileSync(join(testDir, '.aider.conf.yml'), 'model: gpt-4');
    await gitWithEnv.add('.');
    await gitWithEnv.commit('add aider config');

    const result = await analyzeAiSignals(testDir);

    const aiderFiles = result.aiConfigFiles.filter((f) => f.fileName.startsWith('.aider'));
    expect(aiderFiles.length).toBeGreaterThanOrEqual(1);
  });
});
