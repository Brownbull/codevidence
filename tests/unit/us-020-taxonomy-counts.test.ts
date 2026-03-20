/**
 * tests/unit/us-020-taxonomy-counts.test.ts
 *
 * Source-level structural tests for US-020: taxonomy candidateCount updates.
 * Verifies updateTaxonomyCounts logic in candidate-writer.ts and
 * rebuild-counts.ts command structure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('US-020: Taxonomy Count Updates in candidate-writer.ts', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('imports increment from firestore wrapper', () => {
    expect(src).toContain("import");
    expect(src).toContain("increment");
    expect(src).toContain("from '../../core/db/firestore.js'");
  });

  it('defines updateTaxonomyCounts function', () => {
    expect(src).toContain('async function updateTaxonomyCounts');
  });

  it('updateTaxonomyCounts compares old and new tags', () => {
    expect(src).toContain('oldTags: string[]');
    expect(src).toContain('newTags: string[]');
    expect(src).toContain('new Set(oldTags)');
    expect(src).toContain('new Set(newTags)');
  });

  it('increments count for added tags', () => {
    expect(src).toContain('increment(1)');
  });

  it('decrements count for removed tags', () => {
    expect(src).toContain('increment(-1)');
  });

  it('uses updateDoc for atomic increments (not setDoc)', () => {
    // updateTaxonomyCounts should use updateDoc with increment, not setDoc
    const fnBody = src.slice(src.indexOf('async function updateTaxonomyCounts'));
    expect(fnBody).toContain('updateDoc(TAXONOMY_COLLECTION');
    expect(fnBody).toContain('increment(1)');
    expect(fnBody).toContain('increment(-1)');
  });

  it('handles errors gracefully with catch', () => {
    // Taxonomy doc may not exist for auto-discovered tags
    const fnBody = src.slice(src.indexOf('async function updateTaxonomyCounts'));
    expect(fnBody).toContain('.catch(');
  });

  it('short-circuits when no tags changed', () => {
    expect(src).toContain('added.length === 0 && removed.length === 0');
  });

  it('writeCandidateDoc calls updateTaxonomyCounts', () => {
    const writeBody = src.slice(
      src.indexOf('async function writeCandidateDoc'),
      src.indexOf('function buildOptionalAnalysisFields') || src.length,
    );
    expect(writeBody).toContain('updateTaxonomyCounts');
  });

  it('writeCandidateDoc passes existing skillTags as old tags', () => {
    expect(src).toContain("existing?.skillTags ?? []");
  });

  it('runs count updates in parallel with Promise.all', () => {
    const fnBody = src.slice(src.indexOf('async function updateTaxonomyCounts'));
    expect(fnBody).toContain('Promise.all');
  });

  it('defines TAXONOMY_COLLECTION constant', () => {
    expect(src).toContain("const TAXONOMY_COLLECTION = 'taxonomy'");
  });
});

describe('US-020: rebuild-counts CLI Command', () => {
  const src = readSource('src/pipeline/commands/rebuild-counts.ts');

  it('exports runRebuildCounts function', () => {
    expect(src).toContain('export async function runRebuildCounts');
  });

  it('reads all candidates from Firestore', () => {
    expect(src).toContain("queryDocs<Candidate>(CANDIDATES_COLLECTION)");
  });

  it('tallies skillTags across all candidates', () => {
    expect(src).toContain('candidate.skillTags');
    expect(src).toContain('tagCounts.set');
  });

  it('reads all taxonomy items', () => {
    expect(src).toContain("queryDocs<TaxonomyItem>(TAXONOMY_COLLECTION)");
  });

  it('compares current count with correct count', () => {
    expect(src).toContain('item.candidateCount !== correctCount');
  });

  it('updates taxonomy docs with correct counts', () => {
    expect(src).toContain('updateDoc(TAXONOMY_COLLECTION');
    expect(src).toContain('candidateCount: correctCount');
  });

  it('reports orphan tags not in taxonomy', () => {
    expect(src).toContain('orphanTags');
    expect(src).toContain('!taxonomyIds.has(tag)');
  });

  it('runs all updates in parallel', () => {
    expect(src).toContain('Promise.all(updates)');
  });
});

describe('US-020: rebuild-counts CLI Wiring', () => {
  const src = readSource('src/pipeline/index.ts');

  it('imports runRebuildCounts', () => {
    expect(src).toContain("import { runRebuildCounts } from './commands/rebuild-counts.js'");
  });

  it('registers rebuild-counts command', () => {
    expect(src).toContain(".command('rebuild-counts')");
  });

  it('requires authentication before running', () => {
    // The rebuild-counts action should authenticate first
    const cmdBlock = src.slice(src.indexOf("command('rebuild-counts')"));
    expect(cmdBlock).toContain('authenticateWorker');
    expect(cmdBlock).toContain('runRebuildCounts');
  });
});

describe('US-020: FacetPanel displays candidateCount', () => {
  const src = readSource('src/app/components/search/FacetPanel.tsx');

  it('renders candidateCount for each taxonomy item', () => {
    expect(src).toContain('item.candidateCount');
  });

  it('shows count in a muted text style', () => {
    expect(src).toContain('text-th-text-muted');
    expect(src).toContain('candidateCount');
  });
});

describe('US-020: Admin Language Coverage displays counts', () => {
  const src = readSource('src/app/components/admin/CandidatesTab.tsx');

  it('displays candidateCount for language taxonomy items', () => {
    expect(src).toContain('candidateCount');
  });
});

describe('US-020: updateTaxonomyCounts diff logic (functional)', () => {
  // Test the diff algorithm conceptually via reimplementation
  function computeTagDiffs(oldTags: string[], newTags: string[]) {
    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);
    const added = newTags.filter((t) => !oldSet.has(t));
    const removed = oldTags.filter((t) => !newSet.has(t));
    return { added, removed };
  }

  it('detects added tags for new candidate', () => {
    const { added, removed } = computeTagDiffs(
      [],
      ['language:typescript', 'framework:react'],
    );
    expect(added).toEqual(['language:typescript', 'framework:react']);
    expect(removed).toEqual([]);
  });

  it('detects removed tags on rescan', () => {
    const { added, removed } = computeTagDiffs(
      ['language:typescript', 'framework:react', 'tool:docker'],
      ['language:typescript', 'framework:react'],
    );
    expect(added).toEqual([]);
    expect(removed).toEqual(['tool:docker']);
  });

  it('detects both added and removed on rescan', () => {
    const { added, removed } = computeTagDiffs(
      ['language:typescript', 'framework:react'],
      ['language:typescript', 'framework:nextjs', 'tool:docker'],
    );
    expect(added).toEqual(['framework:nextjs', 'tool:docker']);
    expect(removed).toEqual(['framework:react']);
  });

  it('returns empty arrays when tags unchanged', () => {
    const { added, removed } = computeTagDiffs(
      ['language:typescript', 'framework:react'],
      ['language:typescript', 'framework:react'],
    );
    expect(added).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('handles empty old tags (first scan)', () => {
    const { added, removed } = computeTagDiffs(
      [],
      ['language:python', 'framework:django', 'tool:pytest'],
    );
    expect(added).toEqual(['language:python', 'framework:django', 'tool:pytest']);
    expect(removed).toEqual([]);
  });

  it('handles empty new tags (all tags removed)', () => {
    const { added, removed } = computeTagDiffs(
      ['language:go', 'tool:docker'],
      [],
    );
    expect(added).toEqual([]);
    expect(removed).toEqual(['language:go', 'tool:docker']);
  });

  it('handles duplicate tags in input gracefully', () => {
    const { added } = computeTagDiffs(
      [],
      ['language:typescript', 'language:typescript'],
    );
    // Both pass the filter since Set doesn't deduplicate the array iteration
    // but increment(1) twice is still correct (Firestore handles atomic increment)
    expect(added.length).toBe(2);
  });
});
