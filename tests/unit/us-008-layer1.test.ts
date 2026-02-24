/**
 * tests/unit/us-008-layer1.test.ts
 *
 * Unit tests for US-008: Local repo cloning and Layer 1 analysis.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Layer 1 Analysis Module ───────────────────────────────────────────────────

describe('US-008: Layer 1 Analysis Module Structure', () => {
  const src = readSource('src/pipeline/analysis/layer1.ts');

  it('exports analyzeLayer1 function', () => {
    expect(src).toContain('export function analyzeLayer1');
  });

  it('exports Layer1Result interface', () => {
    expect(src).toContain('export interface Layer1Result');
    expect(src).toContain('primaryLanguage: string | null');
    expect(src).toContain('detectedFrameworks: string[]');
    expect(src).toContain('detectedTools: string[]');
    expect(src).toContain('detectedDependencies: string[]');
  });

  it('exports UnknownSignal interface', () => {
    expect(src).toContain('export interface UnknownSignal');
    expect(src).toContain("category: 'framework' | 'tool'");
    expect(src).toContain('source: string');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain("from 'window'");
    expect(src).not.toContain('document.');
    expect(src).not.toContain("from 'firebase/");
  });

  it('uses Node.js fs API for file reading', () => {
    expect(src).toContain("from 'fs'");
    expect(src).toContain('readFileSync');
    expect(src).toContain('existsSync');
  });
});

// ─── Package File Parser Coverage ──────────────────────────────────────────────

describe('US-008: Package File Parsers', () => {
  const src = readSource('src/pipeline/analysis/layer1.ts');

  it('parses package.json (Node.js/JavaScript)', () => {
    expect(src).toContain('parsePackageJson');
    expect(src).toContain("'package.json'");
  });

  it('parses requirements.txt (Python)', () => {
    expect(src).toContain('parseRequirementsTxt');
    expect(src).toContain("'requirements.txt'");
  });

  it('parses pyproject.toml (Python)', () => {
    expect(src).toContain('parsePyprojectToml');
    expect(src).toContain("'pyproject.toml'");
  });

  it('parses Cargo.toml (Rust)', () => {
    expect(src).toContain('parseCargoToml');
    expect(src).toContain("'Cargo.toml'");
  });

  it('parses go.mod (Go)', () => {
    expect(src).toContain('parseGoMod');
    expect(src).toContain("'go.mod'");
  });

  it('parses pom.xml (Java Maven)', () => {
    expect(src).toContain('parsePomXml');
    expect(src).toContain("'pom.xml'");
  });

  it('parses build.gradle (Java/Kotlin Gradle)', () => {
    expect(src).toContain('parseBuildGradle');
    expect(src).toContain("'build.gradle'");
    expect(src).toContain("'build.gradle.kts'");
  });
});

// ─── Taxonomy Normalization ────────────────────────────────────────────────────

describe('US-008: Taxonomy Normalization Maps', () => {
  const src = readSource('src/pipeline/analysis/layer1.ts');

  it('maps npm packages to framework taxonomy IDs', () => {
    expect(src).toContain("'react': 'framework:react'");
    expect(src).toContain("'next': 'framework:nextjs'");
    expect(src).toContain("'vue': 'framework:vue'");
    expect(src).toContain("'express': 'framework:express'");
  });

  it('maps Python packages to framework taxonomy IDs', () => {
    expect(src).toContain("'fastapi': 'framework:fastapi'");
    expect(src).toContain("'django': 'framework:django'");
    expect(src).toContain("'flask': 'framework:flask'");
  });

  it('maps Rust crates to framework taxonomy IDs', () => {
    expect(src).toContain("'actix-web': 'framework:actix'");
    expect(src).toContain("'axum': 'framework:axum'");
  });

  it('maps Java artifacts to framework taxonomy IDs', () => {
    expect(src).toContain("'spring-boot-starter': 'framework:spring'");
  });

  it('maps tool dependencies to taxonomy IDs', () => {
    expect(src).toContain("'firebase': 'tool:firebase'");
    expect(src).toContain("'graphql': 'tool:graphql'");
    expect(src).toContain("'vite': 'tool:vite'");
    expect(src).toContain("'pg': 'tool:postgresql'");
  });

  it('has file extension → language mapping', () => {
    expect(src).toContain("'.ts': 'language:typescript'");
    expect(src).toContain("'.py': 'language:python'");
    expect(src).toContain("'.rs': 'language:rust'");
    expect(src).toContain("'.go': 'language:go'");
    expect(src).toContain("'.java': 'language:java'");
    expect(src).toContain("'.rb': 'language:ruby'");
  });

  it('has GitHub language name → taxonomy ID mapping', () => {
    expect(src).toContain("'TypeScript': 'language:typescript'");
    expect(src).toContain("'Python': 'language:python'");
    expect(src).toContain("'Go': 'language:go'");
  });
});

// ─── Tool Detection via Config Files ────────────────────────────────────────────

describe('US-008: Tool Detection via Config Files', () => {
  const src = readSource('src/pipeline/analysis/layer1.ts');

  it('detects Docker via Dockerfile', () => {
    expect(src).toContain("'Dockerfile'");
    expect(src).toContain("'tool:docker'");
  });

  it('detects Docker via docker-compose files', () => {
    expect(src).toContain("'docker-compose.yml'");
    expect(src).toContain("'docker-compose.yaml'");
  });

  it('detects Firebase via firebase.json', () => {
    expect(src).toContain("'firebase.json'");
    expect(src).toContain("'tool:firebase'");
  });

  it('detects Terraform via .tf files', () => {
    expect(src).toContain("'main.tf'");
    expect(src).toContain("'tool:terraform'");
  });

  it('detects GitHub Actions via .github/workflows', () => {
    expect(src).toContain("'.github/workflows'");
    expect(src).toContain("'tool:github-actions'");
  });
});

// ─── Scan Repo Handler ─────────────────────────────────────────────────────────

describe('US-008: Scan Repo Handler', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts');

  it('exports handleScanRepo function', () => {
    expect(src).toContain('export async function handleScanRepo');
  });

  it('imports simple-git for cloning', () => {
    expect(src).toContain("from 'simple-git'");
    expect(src).toContain('simpleGit');
  });

  it('imports analyzeLayer1 from layer1 module', () => {
    expect(src).toContain("from '../analysis/layer1.js'");
    expect(src).toContain('analyzeLayer1');
  });

  it('imports from Firestore wrapper — never directly from Firebase SDK', () => {
    expect(src).toContain("from '../../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/firestore'");
    expect(src).not.toContain("from 'firebase/app'");
  });

  it('uses shallow clone (--depth 1) for Layer 1', () => {
    expect(src).toContain("'--depth'");
    expect(src).toContain("'1'");
  });

  it('clones to a temporary directory', () => {
    expect(src).toContain('tmpdir()');
    expect(src).toContain('css-clone-');
  });

  it('always deletes clone directory in finally block', () => {
    expect(src).toContain('finally');
    expect(src).toContain('deleteCloneDir');
  });

  it('deleteCloneDir never throws (logs errors)', () => {
    expect(src).toContain('catch (err)');
    expect(src).toContain('Failed to delete clone directory');
  });

  it('uses rmSync with recursive and force for deletion', () => {
    expect(src).toContain('rmSync(dir, { recursive: true, force: true })');
  });

  it('updates Repository doc with layer1 results', () => {
    expect(src).toContain("scanStatus: 'layer1'");
    expect(src).toContain('detectedFrameworks: result.detectedFrameworks');
    expect(src).toContain('detectedTools: result.detectedTools');
    expect(src).toContain('detectedDependencies: result.detectedDependencies');
    expect(src).toContain('primaryLanguage: result.primaryLanguage');
  });

  it('updates lastScanned and updatedAt timestamps', () => {
    expect(src).toContain('lastScanned: serverTimestamp()');
    expect(src).toContain('updatedAt: serverTimestamp()');
  });

  it('stores unknown signals as taxonomy items with isSearchable: false', () => {
    expect(src).toContain('isSearchable: false');
    expect(src).toContain('isSeeded: false');
    expect(src).toContain("storeUnknownSignals");
  });

  it('checks if taxonomy item exists before storing (idempotent)', () => {
    expect(src).toContain("getDoc<TaxonomyItem>(TAXONOMY_COLLECTION, taxonomyId)");
    expect(src).toContain('if (existing) return');
  });

  it('fetches Repository doc before analysis', () => {
    expect(src).toContain("getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repoFullName))");
  });

  it('throws if Repository not found', () => {
    expect(src).toContain('Repository not found in Firestore');
  });
});

// ─── Pipeline Index Registration ────────────────────────────────────────────────

describe('US-008: Pipeline Index — Handler Registration', () => {
  const src = readSource('src/pipeline/index.ts');

  it('imports handleScanRepo from handlers', () => {
    expect(src).toContain("import { handleScanRepo } from './handlers/scan-repo.js'");
  });

  it('registers scan-repo handler in worker', () => {
    expect(src).toContain("'scan-repo': handleScanRepo");
  });
});

// ─── Layer 1 Functional Tests (with temp directories) ──────────────────────────

describe('US-008: Layer 1 Analysis — package.json extraction', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `test-layer1-${randomBytes(4).toString('hex')}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('extracts React and Express from package.json dependencies', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'express': '^4.18.2',
      },
      devDependencies: {
        'typescript': '^5.0.0',
        'vite': '^5.0.0',
      },
    }));

    // Create some .ts files for language detection
    writeFileSync(join(testDir, 'index.ts'), 'export default {}');
    writeFileSync(join(testDir, 'app.tsx'), 'export default function App() {}');

    const result = analyzeLayer1(testDir, 'TypeScript');

    expect(result.primaryLanguage).toBe('language:typescript');
    expect(result.detectedFrameworks).toContain('framework:react');
    expect(result.detectedFrameworks).toContain('framework:express');
    expect(result.detectedTools).toContain('tool:vite');
    expect(result.detectedDependencies).toContain('react');
    expect(result.detectedDependencies).toContain('express');
  });

  it('extracts frameworks from requirements.txt', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'requirements.txt'), [
      'fastapi>=0.100.0',
      'uvicorn[standard]>=0.23.0',
      'psycopg2-binary>=2.9.0',
      '# comment line',
      'boto3>=1.28.0',
    ].join('\n'));

    writeFileSync(join(testDir, 'main.py'), 'print("hello")');

    const result = analyzeLayer1(testDir, 'Python');

    expect(result.primaryLanguage).toBe('language:python');
    expect(result.detectedFrameworks).toContain('framework:fastapi');
    expect(result.detectedTools).toContain('tool:postgresql');
    expect(result.detectedTools).toContain('tool:aws');
    expect(result.detectedDependencies).toContain('fastapi');
    expect(result.detectedDependencies).toContain('psycopg2-binary');
  });

  it('detects Docker tool from Dockerfile presence', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      dependencies: { 'express': '^4.18.0' },
    }));
    writeFileSync(join(testDir, 'Dockerfile'), 'FROM node:18\nCOPY . .\nCMD ["node", "index.js"]');
    writeFileSync(join(testDir, 'index.js'), 'console.log("hi")');

    const result = analyzeLayer1(testDir, 'JavaScript');

    expect(result.detectedTools).toContain('tool:docker');
    expect(result.detectedFrameworks).toContain('framework:express');
  });

  it('detects primary language from file extensions when GitHub metadata is null', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'main.go'), 'package main');
    writeFileSync(join(testDir, 'handler.go'), 'package main');
    writeFileSync(join(testDir, 'README.md'), '# Project');

    const result = analyzeLayer1(testDir, null);

    expect(result.primaryLanguage).toBe('language:go');
  });

  it('returns unknownSignals for unrecognised dependencies', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      dependencies: {
        'react': '^18.0.0',
        'some-exotic-lib': '^1.0.0',
        'another-unknown': '^2.0.0',
      },
    }));

    const result = analyzeLayer1(testDir, null);

    expect(result.detectedFrameworks).toContain('framework:react');
    expect(result.unknownSignals.length).toBeGreaterThanOrEqual(2);
    const names = result.unknownSignals.map((s) => s.name);
    expect(names).toContain('some-exotic-lib');
    expect(names).toContain('another-unknown');
  });

  it('skips common dev deps (typescript, eslint) from unknown signals', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'package.json'), JSON.stringify({
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
        'eslint-config-prettier': '^9.0.0',
        '@typescript-eslint/parser': '^7.0.0',
        'vitest': '^2.0.0',
      },
    }));

    const result = analyzeLayer1(testDir, null);

    const names = result.unknownSignals.map((s) => s.name);
    expect(names).not.toContain('typescript');
    expect(names).not.toContain('@types/node');
    expect(names).not.toContain('eslint-config-prettier');
    expect(names).not.toContain('vitest');
  });

  it('handles missing package files gracefully', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    // Empty directory — no package files
    const result = analyzeLayer1(testDir, null);

    expect(result.primaryLanguage).toBeNull();
    expect(result.detectedFrameworks).toHaveLength(0);
    expect(result.detectedTools).toHaveLength(0);
    expect(result.detectedDependencies).toHaveLength(0);
  });

  it('handles malformed package.json gracefully', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    writeFileSync(join(testDir, 'package.json'), 'not valid json { broken');

    const result = analyzeLayer1(testDir, null);

    // Should not throw — just skip the malformed file
    expect(result.detectedFrameworks).toHaveLength(0);
  });

  it('detects GitHub Actions via .github/workflows directory', async () => {
    const { analyzeLayer1 } = await import('../../src/pipeline/analysis/layer1.js');

    const workflowDir = join(testDir, '.github', 'workflows');
    mkdirSync(workflowDir, { recursive: true });
    writeFileSync(join(workflowDir, 'ci.yml'), 'name: CI');

    const result = analyzeLayer1(testDir, null);

    expect(result.detectedTools).toContain('tool:github-actions');
  });
});
