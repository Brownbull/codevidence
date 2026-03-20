/**
 * tests/unit/us-019-docs.test.ts
 *
 * Unit tests for US-019: Documentation and README.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const EGGS_ROOT = resolve(ROOT, '..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── README.md ──────────────────────────────────────────────────────────────

describe('US-019: README.md', () => {
  it('exists at the project root', () => {
    expect(existsSync(resolve(ROOT, 'README.md'))).toBe(true);
  });

  const src = readSource('README.md');

  it('has What it is section', () => {
    expect(src).toContain('Candidate Skill Scanner');
    expect(src).toContain('developer talent');
  });

  it('has Prerequisites section', () => {
    expect(src).toContain('Prerequisites');
    expect(src).toContain('Node.js');
    expect(src).toContain('pnpm');
    expect(src).toContain('Firebase');
  });

  it('has Local Setup section', () => {
    expect(src).toContain('Local Setup');
    expect(src).toContain('.env.local');
    expect(src).toContain('pnpm install');
  });

  it('has Firebase project setup', () => {
    expect(src).toContain('Firebase project');
    expect(src).toContain('Authentication');
    expect(src).toContain('Firestore');
  });

  it('has emulator startup instructions', () => {
    expect(src).toContain('firebase emulators:start');
  });

  it('has scan pipeline section', () => {
    expect(src).toContain('Scan Pipeline');
    expect(src).toContain('scan discover');
    expect(src).toContain('scan status');
  });

  it('has admin role provisioning', () => {
    expect(src).toContain('grant-admin');
    expect(src).toContain('admin:ops');
  });

  it('has Web UI access section', () => {
    expect(src).toContain('pnpm dev');
    expect(src).toContain('localhost:3000');
  });

  it('has Running tests section', () => {
    expect(src).toContain('Running Tests');
    expect(src).toContain('pnpm test:unit');
    expect(src).toContain('pnpm test:e2e');
  });

  it('has deploying to Firebase Hosting section', () => {
    expect(src).toContain('Firebase Hosting');
    expect(src).toContain('FIREBASE_SERVICE_ACCOUNT');
  });

  it('has AI Maturity Model reference table', () => {
    expect(src).toContain('AI Maturity Model');
    expect(src).toContain('Level 0');
    expect(src).toContain('Level 1');
    expect(src).toContain('Level 2');
    expect(src).toContain('Level 3');
    expect(src).toContain('Level 4');
    expect(src).toContain('Level 5');
    expect(src).toContain('No AI signals');
    expect(src).toContain('AI-First');
  });

  it('has CLI command reference', () => {
    expect(src).toContain('Command Reference');
    expect(src).toContain('scan discover');
    expect(src).toContain('scan status');
    expect(src).toContain('admin:ops grant-admin');
  });

  it('has environment variable reference', () => {
    expect(src).toContain('VITE_FIREBASE_API_KEY');
    expect(src).toContain('VITE_FIREBASE_PROJECT_ID');
    expect(src).toContain('GITHUB_PAT');
  });

  it('documents null vs 0 invariant', () => {
    expect(src).toContain('null');
    expect(src).toContain('not yet evaluated');
  });
});

// ─── eggs/INDEX.md ──────────────────────────────────────────────────────────

describe('US-019: eggs/INDEX.md', () => {
  const indexPath = resolve(EGGS_ROOT, 'INDEX.md');

  it('exists', () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  it('includes candidate-skill-scanner entry', () => {
    const src = readFileSync(indexPath, 'utf-8');
    expect(src).toContain('candidate-skill-scanner');
    expect(src).toContain('code');
    expect(src).toContain('in-progress');
  });
});

// ─── CLAUDE.md ──────────────────────────────────────────────────────────────

describe('US-019: CLAUDE.md', () => {
  const src = readSource('CLAUDE.md');

  it('has Codebase Patterns section populated', () => {
    expect(src).toContain('## Codebase Patterns');
    expect(src).not.toContain('Populated by Ralph agent as patterns are discovered');
  });

  it('documents dual runtime context', () => {
    expect(src).toContain('Dual runtime context');
  });

  it('documents Firestore wrapper pattern', () => {
    expect(src).toContain('Firestore wrapper');
  });

  it('documents aiMaturityScore invariant', () => {
    expect(src).toContain('aiMaturityScore invariant');
  });

  it('documents URL as filter state', () => {
    expect(src).toContain('URL as filter state');
  });

  it('documents rarest-tag-first query', () => {
    expect(src).toContain('Rarest-tag-first');
  });

  it('documents theme flash prevention', () => {
    expect(src).toContain('Theme flash prevention');
  });
});
