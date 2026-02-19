/**
 * tests/unit/us-004-security-rules.test.ts
 *
 * Verifies US-004 deliverables:
 * 1. firestore.rules — three-tier access model structure
 * 2. firestore.indexes.json — all required composite indexes present
 * 3. scripts/seeds/taxonomy.json — seed data coverage (counts and categories)
 * 4. scripts/seed-taxonomy.ts — idempotency contract and structure
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFile(relativePath)) as T;
}

// ─── Firestore Rules ──────────────────────────────────────────────────────────

describe('firestore.rules', () => {
  let rules: string;

  rules = readFile('firestore.rules');

  it('exists and is non-empty', () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(rules).toContain('rules_version');
  });

  it('defines three-tier access model using isAuthenticated and isAdmin helpers', () => {
    expect(rules).toContain('function isAuthenticated()');
    expect(rules).toContain('function isAdmin()');
    expect(rules).toContain('request.auth != null');
    expect(rules).toContain('request.auth.token.admin == true');
  });

  it('grants read access to candidates for authenticated users', () => {
    // The candidates block must allow read for isAuthenticated()
    expect(rules).toContain('/candidates/{candidateId}');
    expect(rules).toContain('allow read: if isAuthenticated()');
  });

  it('restricts write on candidates to admin only', () => {
    expect(rules).toContain('allow write: if isAdmin()');
  });

  it('grants read access to repositories for authenticated users', () => {
    expect(rules).toContain('/repositories/{repoId}');
  });

  it('grants read access to taxonomy for authenticated users', () => {
    expect(rules).toContain('/taxonomy/{itemId}');
  });

  it('restricts admin_flags to admin only (no non-admin read)', () => {
    expect(rules).toContain('/admin_flags/{flagId}');
    // admin_flags block must NOT have "allow read: if isAuthenticated()"
    // It should only have "allow read, write: if isAdmin()"
    const adminFlagsBlock = extractBlock(rules, '/admin_flags/{flagId}');
    expect(adminFlagsBlock).not.toContain('isAuthenticated()');
    expect(adminFlagsBlock).toContain('isAdmin()');
  });

  it('restricts scan_jobs to admin only', () => {
    expect(rules).toContain('/scan_jobs/{jobId}');
    const scanJobsBlock = extractBlock(rules, '/scan_jobs/{jobId}');
    expect(scanJobsBlock).not.toContain('isAuthenticated()');
    expect(scanJobsBlock).toContain('isAdmin()');
  });
});

// ─── Firestore Indexes ────────────────────────────────────────────────────────

interface IndexField {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
}

interface FirestoreIndex {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

interface IndexesFile {
  indexes: FirestoreIndex[];
  fieldOverrides: unknown[];
}

describe('firestore.indexes.json', () => {
  let indexFile: IndexesFile;

  indexFile = readJson<IndexesFile>('firestore.indexes.json');

  it('exists and has an indexes array', () => {
    expect(Array.isArray(indexFile.indexes)).toBe(true);
    expect(indexFile.indexes.length).toBeGreaterThan(0);
  });

  it('has indexes for all five required collections', () => {
    const collections = new Set(indexFile.indexes.map((i) => i.collectionGroup));
    expect(collections.has('candidates')).toBe(true);
    expect(collections.has('repositories')).toBe(true);
    expect(collections.has('scan_jobs')).toBe(true);
    expect(collections.has('admin_flags')).toBe(true);
    expect(collections.has('taxonomy')).toBe(true);
  });

  it('has candidates skillTags + skillScore index', () => {
    const idx = findIndex(indexFile.indexes, 'candidates', ['skillTags', 'skillScore']);
    expect(idx).not.toBeNull();
    expect(idx?.fields[0].arrayConfig).toBe('CONTAINS');
    expect(idx?.fields[1].order).toBe('DESCENDING');
  });

  it('has candidates skillTags + aiMaturityScore index', () => {
    const idx = findIndex(indexFile.indexes, 'candidates', ['skillTags', 'aiMaturityScore']);
    expect(idx).not.toBeNull();
  });

  it('has candidates skillTags + lastScanned index', () => {
    const idx = findIndex(indexFile.indexes, 'candidates', ['skillTags', 'lastScanned']);
    expect(idx).not.toBeNull();
  });

  it('has candidates aiMaturityScore + skillScore index', () => {
    const idx = findIndex(indexFile.indexes, 'candidates', ['aiMaturityScore', 'skillScore']);
    expect(idx).not.toBeNull();
  });

  it('has candidates isStale + lastScanned index', () => {
    const idx = findIndex(indexFile.indexes, 'candidates', ['isStale', 'lastScanned']);
    expect(idx).not.toBeNull();
  });

  it('has repositories owner + lastScanned index', () => {
    const idx = findIndex(indexFile.indexes, 'repositories', ['owner', 'lastScanned']);
    expect(idx).not.toBeNull();
  });

  it('has repositories scanStatus + lastPushedAt index', () => {
    const idx = findIndex(indexFile.indexes, 'repositories', ['scanStatus', 'lastPushedAt']);
    expect(idx).not.toBeNull();
  });

  it('has scan_jobs status + createdAt index', () => {
    const idx = findIndex(indexFile.indexes, 'scan_jobs', ['status', 'createdAt']);
    expect(idx).not.toBeNull();
  });

  it('has scan_jobs status + priority + createdAt index', () => {
    const idx = findIndex(indexFile.indexes, 'scan_jobs', ['status', 'priority', 'createdAt']);
    expect(idx).not.toBeNull();
  });

  it('has scan_jobs status + failedAt index', () => {
    const idx = findIndex(indexFile.indexes, 'scan_jobs', ['status', 'failedAt']);
    expect(idx).not.toBeNull();
  });

  it('has admin_flags type + status + createdAt index', () => {
    const idx = findIndex(indexFile.indexes, 'admin_flags', ['type', 'status', 'createdAt']);
    expect(idx).not.toBeNull();
  });

  it('has admin_flags type + status + resultCount index', () => {
    const idx = findIndex(indexFile.indexes, 'admin_flags', ['type', 'status', 'resultCount']);
    expect(idx).not.toBeNull();
  });

  it('has taxonomy category + isSearchable + sortOrder index', () => {
    const idx = findIndex(indexFile.indexes, 'taxonomy', ['category', 'isSearchable', 'sortOrder']);
    expect(idx).not.toBeNull();
  });

  it('has taxonomy isSearchable + candidateCount index', () => {
    const idx = findIndex(indexFile.indexes, 'taxonomy', ['isSearchable', 'candidateCount']);
    expect(idx).not.toBeNull();
  });
});

// ─── Taxonomy Seed Data ───────────────────────────────────────────────────────

interface SeedEntry {
  id: string;
  category: string;
  displayName: string;
  aliases: string[];
  sortOrder: number;
  isSearchable: boolean;
}

interface TaxonomySeedFile {
  taxonomy: SeedEntry[];
}

describe('scripts/seeds/taxonomy.json', () => {
  let seed: TaxonomySeedFile;

  seed = readJson<TaxonomySeedFile>('scripts/seeds/taxonomy.json');

  it('exists and has a taxonomy array', () => {
    expect(Array.isArray(seed.taxonomy)).toBe(true);
    expect(seed.taxonomy.length).toBeGreaterThan(0);
  });

  it('has 10+ language items', () => {
    const languages = seed.taxonomy.filter((i) => i.category === 'language');
    expect(languages.length).toBeGreaterThanOrEqual(10);
  });

  it('has 10+ framework items', () => {
    const frameworks = seed.taxonomy.filter((i) => i.category === 'framework');
    expect(frameworks.length).toBeGreaterThanOrEqual(10);
  });

  it('has 10+ tool items', () => {
    const tools = seed.taxonomy.filter((i) => i.category === 'tool');
    expect(tools.length).toBeGreaterThanOrEqual(10);
  });

  it('has 6+ ai-agent-pattern items', () => {
    const patterns = seed.taxonomy.filter((i) => i.category === 'ai-agent-pattern');
    expect(patterns.length).toBeGreaterThanOrEqual(6);
  });

  it('has ai-maturity-level items for 0–5', () => {
    const levels = seed.taxonomy.filter((i) => i.category === 'ai-maturity-level');
    expect(levels.length).toBe(6);
    const sortOrders = levels.map((l) => l.sortOrder).sort((a, b) => a - b);
    expect(sortOrders[0]).toBe(0);
  });

  it('all items have required fields', () => {
    seed.taxonomy.forEach((item) => {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.category).toBe('string');
      expect(typeof item.displayName).toBe('string');
      expect(Array.isArray(item.aliases)).toBe(true);
      expect(typeof item.sortOrder).toBe('number');
      expect(typeof item.isSearchable).toBe('boolean');
    });
  });

  it('all items have isSearchable: true', () => {
    seed.taxonomy.forEach((item) => {
      expect(item.isSearchable).toBe(true);
    });
  });

  it('item IDs follow the category:slug pattern', () => {
    seed.taxonomy.forEach((item) => {
      expect(item.id).toContain(':');
      const [prefix] = item.id.split(':');
      // Category prefix must be a valid category
      const validPrefixes = ['language', 'framework', 'tool', 'ai-agent-pattern', 'ai-maturity-level'];
      expect(validPrefixes).toContain(prefix);
    });
  });

  it('has no duplicate IDs (idempotency foundation)', () => {
    const ids = seed.taxonomy.map((i) => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─── Seed Script Structure ────────────────────────────────────────────────────

describe('scripts/seed-taxonomy.ts', () => {
  it('exists', () => {
    const content = readFile('scripts/seed-taxonomy.ts');
    expect(content.length).toBeGreaterThan(0);
  });

  it('uses setDoc (idempotent write, not addDoc)', () => {
    const content = readFile('scripts/seed-taxonomy.ts');
    expect(content).toContain('setDoc');
    expect(content).not.toContain('addDoc');
  });

  it('imports from core/db/firestore wrapper (not firebase SDK directly)', () => {
    const content = readFile('scripts/seed-taxonomy.ts');
    expect(content).toContain('@/core/db/firestore');
    expect(content).not.toContain("from 'firebase/firestore'");
  });

  it('sets isSeeded: true on all items', () => {
    const content = readFile('scripts/seed-taxonomy.ts');
    expect(content).toContain('isSeeded: true');
  });

  it('sets candidateCount: 0 on all items', () => {
    const content = readFile('scripts/seed-taxonomy.ts');
    expect(content).toContain('candidateCount: 0');
  });
});

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Extracts the text content between the line containing `marker` and the
 * matching closing brace. Used to test per-collection rule blocks.
 */
function extractBlock(rules: string, marker: string): string {
  const lines = rules.split('\n');
  const start = lines.findIndex((l) => l.includes(marker));
  if (start === -1) return '';

  let depth = 0;
  const blockLines: string[] = [];
  let inside = false;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    blockLines.push(line);

    for (const ch of line) {
      if (ch === '{') { depth++; inside = true; }
      else if (ch === '}') { depth--; }
    }

    if (inside && depth === 0) break;
  }

  return blockLines.join('\n');
}

/**
 * Finds a composite index that matches the given collection and field paths
 * (in order). Returns the index or null if not found.
 */
function findIndex(
  indexes: FirestoreIndex[],
  collection: string,
  fieldPaths: string[]
): FirestoreIndex | null {
  return (
    indexes.find((idx) => {
      if (idx.collectionGroup !== collection) return false;
      if (idx.fields.length !== fieldPaths.length) return false;
      return fieldPaths.every((fp, i) => idx.fields[i]?.fieldPath === fp);
    }) ?? null
  );
}
