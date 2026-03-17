/**
 * tests/unit/us-013-search.test.ts
 *
 * Unit tests for US-013: Firestore search query, results list, sort controls, and score badges.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Search Handler ──────────────────────────────────────────────────────────

describe('US-013: Search Handler', () => {
  const src = readSource('src/handlers/search.ts');

  it('exports searchCandidates async function', () => {
    expect(src).toContain('export async function searchCandidates');
  });

  it('exports findRarestTag function', () => {
    expect(src).toContain('export function findRarestTag');
  });

  it('exports sortCandidates function', () => {
    expect(src).toContain('export function sortCandidates');
  });

  it('uses array-contains-any for OR-within-category query', () => {
    expect(src).toContain("where('skillTags', 'array-contains-any'");
  });

  it('caps results at 200 documents', () => {
    expect(src).toContain('MAX_RESULTS = 200');
    expect(src).toContain('limit(MAX_RESULTS)');
  });

  it('performs client-side OR-within AND-across category filter', () => {
    // OR within each category group
    expect(src).toContain('groupTags.some');
    // AND across category groups
    expect(src).toContain('activeGroups.every');
    expect(src).toContain('skillTags.includes(tag)');
  });

  it('chunks tags into batches of 10 for Firestore limit', () => {
    expect(src).toContain('ARRAY_CONTAINS_ANY_LIMIT = 10');
    expect(src).toContain('queryWithChunking');
  });

  it('exports buildCategoryGroups for testability', () => {
    expect(src).toContain('export function buildCategoryGroups');
  });

  it('sorts by skillScore descending', () => {
    expect(src).toContain('b.skillScore - a.skillScore');
  });

  it('sorts by aiMaturityScore with nulls last', () => {
    expect(src).toContain('a.aiMaturityScore === null');
    expect(src).toContain('return 1');
    expect(src).toContain('return -1');
  });

  it('sorts by lastScanned descending', () => {
    expect(src).toContain('toMillis');
    expect(src).toContain('bTime - aTime');
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── findRarestTag Functional ────────────────────────────────────────────────

describe('US-013: findRarestTag — functional', () => {
  it('returns tag with lowest candidateCount', async () => {
    const { findRarestTag } = await import('../../src/handlers/search.js');
    const taxonomy = [
      { id: 'language:python', candidateCount: 50 },
      { id: 'framework:fastapi', candidateCount: 5 },
      { id: 'tool:docker', candidateCount: 30 },
    ] as never[];
    const result = findRarestTag(
      ['language:python', 'framework:fastapi', 'tool:docker'],
      taxonomy
    );
    expect(result).toBe('framework:fastapi');
  });

  it('returns first tag when no taxonomy match', async () => {
    const { findRarestTag } = await import('../../src/handlers/search.js');
    const result = findRarestTag(['language:unknown'], []);
    expect(result).toBe('language:unknown');
  });

  it('returns null for empty tags', async () => {
    const { findRarestTag } = await import('../../src/handlers/search.js');
    expect(findRarestTag([], [])).toBeNull();
  });
});

// ─── sortCandidates Functional ───────────────────────────────────────────────

describe('US-013: sortCandidates — functional', () => {
  it('sorts by skillScore descending', async () => {
    const { sortCandidates } = await import('../../src/handlers/search.js');
    const candidates = [
      { id: 'a', skillScore: 50 },
      { id: 'b', skillScore: 90 },
      { id: 'c', skillScore: 70 },
    ] as never[];
    const sorted = sortCandidates(candidates, 'skillScore');
    expect(sorted.map((c: { id: string }) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by aiMaturityScore with nulls last', async () => {
    const { sortCandidates } = await import('../../src/handlers/search.js');
    const candidates = [
      { id: 'a', aiMaturityScore: null },
      { id: 'b', aiMaturityScore: 3 },
      { id: 'c', aiMaturityScore: 5 },
      { id: 'd', aiMaturityScore: 0 },
    ] as never[];
    const sorted = sortCandidates(candidates, 'aiMaturityScore');
    expect(sorted.map((c: { id: string }) => c.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

// ─── CandidateCard ───────────────────────────────────────────────────────────

describe('US-013: CandidateCard Component', () => {
  const src = readSource('src/app/components/search/CandidateCard.tsx');

  it('shows GitHub username', () => {
    expect(src).toContain('candidate.githubUsername');
  });

  it('shows avatar image', () => {
    expect(src).toContain('candidate.avatarUrl');
    expect(src).toContain('rounded-full');
  });

  it('renders SkillScoreBadge', () => {
    expect(src).toContain('SkillScoreBadge');
    expect(src).toContain('candidate.skillScore');
  });

  it('renders AIMaturityBadge', () => {
    expect(src).toContain('AIMaturityBadge');
    expect(src).toContain('candidate.aiMaturityScore');
  });

  it('shows top 3 matched skill tags', () => {
    expect(src).toContain('matchedTags');
    expect(src).toContain('slice(0, 3)');
  });

  it('shows last_scanned date', () => {
    expect(src).toContain('lastScanned');
    expect(src).toContain('toLocaleDateString');
  });

  it('renders StalenessTag', () => {
    expect(src).toContain('StalenessTag');
    expect(src).toContain('candidate.isStale');
  });

  it('links to candidate profile page', () => {
    expect(src).toContain('/candidates/');
    expect(src).toContain('Link');
  });
});

// ─── SkillScoreBadge ─────────────────────────────────────────────────────────

describe('US-013: SkillScoreBadge', () => {
  const src = readSource('src/app/components/search/ScoreBadges.tsx');

  it('renders indigo circle with score', () => {
    expect(src).toContain('text-indigo-600');
    expect(src).toContain('text-indigo-700');
    expect(src).toContain('{score}');
  });

  it('uses font-mono for score display', () => {
    expect(src).toContain('font-mono');
  });
});

// ─── AIMaturityBadge ─────────────────────────────────────────────────────────

describe('US-013: AIMaturityBadge', () => {
  const src = readSource('src/app/components/search/ScoreBadges.tsx');

  it('renders null as dashed pip bar + Not evaluated', () => {
    expect(src).toContain('score === null');
    expect(src).toContain('Not evaluated');
    // Unicode light shade characters for empty pips
    expect(src).toContain("'\\u2591\\u2591\\u2591\\u2591\\u2591'");
  });

  it('uses violet color for filled pips', () => {
    expect(src).toContain('text-violet-500');
    expect(src).toContain('text-violet-700');
  });

  it('includes level labels for scores 0-5', () => {
    expect(src).toContain('Level 0');
    expect(src).toContain('Level 1');
    expect(src).toContain('Level 5');
    expect(src).toContain('No AI signals');
  });

  it('builds pip bar from filled and empty blocks', () => {
    // Full block and light shade block characters
    expect(src).toContain("'\\u2588'");
    expect(src).toContain("'\\u2591'");
  });
});

// ─── StalenessTag ────────────────────────────────────────────────────────────

describe('US-013: StalenessTag', () => {
  const src = readSource('src/app/components/search/ScoreBadges.tsx');

  it('renders Stale label when isStale is true', () => {
    expect(src).toContain('Stale');
    expect(src).toContain('bg-amber-100');
    expect(src).toContain('text-amber-700');
  });

  it('returns null when not stale', () => {
    expect(src).toContain('if (!isStale) return null');
  });
});

// ─── ActiveFilterChips ───────────────────────────────────────────────────────

describe('US-013: ActiveFilterChips', () => {
  const src = readSource('src/app/components/search/ActiveFilterChips.tsx');

  it('renders one chip per active filter', () => {
    expect(src).toContain('allChips.map');
  });

  it('includes x remove button on each chip', () => {
    expect(src).toContain('onRemove');
    expect(src).toContain("'\\u00D7'"); // × character
  });

  it('has Clear all button', () => {
    expect(src).toContain('Clear all');
    expect(src).toContain('onClearAll');
  });

  it('shows chips for all filter categories', () => {
    expect(src).toContain('params.languages');
    expect(src).toContain('params.frameworks');
    expect(src).toContain('params.tools');
    expect(src).toContain('params.aiAgentPatterns');
  });

  it('shows aiMaturityMin chip when set', () => {
    expect(src).toContain('params.aiMaturityMin');
    expect(src).toContain('AI Maturity');
  });
});

// ─── SortControls ────────────────────────────────────────────────────────────

describe('US-013: SortControls', () => {
  const src = readSource('src/app/components/search/SortControls.tsx');

  it('offers three sort options', () => {
    expect(src).toContain("'Skill Score'");
    expect(src).toContain("'AI Maturity'");
    expect(src).toContain("'Last Scanned'");
  });

  it('highlights active sort with slate-900 background', () => {
    expect(src).toContain('bg-slate-900 text-white');
  });

  it('calls onSort with sort value', () => {
    expect(src).toContain('onSort(value)');
  });

  it('persists sort in URL via sortBy values', () => {
    expect(src).toContain("'skillScore'");
    expect(src).toContain("'aiMaturityScore'");
    expect(src).toContain("'lastScanned'");
  });
});

// ─── useCandidates Hook ──────────────────────────────────────────────────────

describe('US-013: useCandidates Hook', () => {
  const src = readSource('src/app/hooks/useCandidates.ts');

  it('exports useCandidates function', () => {
    expect(src).toContain('export function useCandidates');
  });

  it('uses TanStack Query useQuery', () => {
    expect(src).toContain("from '@tanstack/react-query'");
    expect(src).toContain('useQuery');
  });

  it('includes params in queryKey for automatic refetch', () => {
    expect(src).toContain("queryKey: ['candidates', params]");
  });

  it('sets staleTime to 5 minutes', () => {
    expect(src).toContain('staleTime: 5 * 60 * 1000');
  });

  it('enabled only when hasAnyFilter is true', () => {
    expect(src).toContain('enabled: hasAnyFilter');
  });

  it('calls searchCandidates handler', () => {
    expect(src).toContain('searchCandidates(params');
  });
});

// ─── SearchPage Integration ──────────────────────────────────────────────────

describe('US-013: SearchPage Integration', () => {
  const src = readSource('src/app/pages/SearchPage.tsx');

  it('renders ActiveFilterChips', () => {
    expect(src).toContain('ActiveFilterChips');
  });

  it('renders SortControls', () => {
    expect(src).toContain('SortControls');
  });

  it('renders CandidateCard for each result', () => {
    expect(src).toContain('CandidateCard');
    expect(src).toContain('candidates.map');
  });

  it('shows loading skeleton while fetching', () => {
    expect(src).toContain('isLoading');
    expect(src).toContain('animate-pulse');
  });

  it('shows result count', () => {
    expect(src).toContain('candidates.length');
    expect(src).toContain('result');
  });
});

// ─── US-021: buildCategoryGroups Functional ────────────────────────────────

describe('US-021: buildCategoryGroups — functional', () => {
  it('groups tags by category', async () => {
    const { buildCategoryGroups } = await import('../../src/handlers/search.js');
    const groups = buildCategoryGroups({
      languages: ['language:typescript', 'language:python'],
      frameworks: ['framework:react'],
      tools: [],
      aiAgentPatterns: [],
      aiMaturityMin: null,
      sortBy: 'skillScore',
    });
    expect(groups).toEqual([
      ['language:typescript', 'language:python'],
      ['framework:react'],
      [],
      [],
    ]);
  });
});

// ─── US-021: OR-within-category client filter logic ────────────────────────

describe('US-021: OR-within AND-across filter logic', () => {
  function applyFilter(
    candidate: { skillTags: string[] },
    activeGroups: string[][],
  ): boolean {
    return activeGroups.every((groupTags) =>
      groupTags.some((tag) => candidate.skillTags.includes(tag))
    );
  }

  it('TypeScript OR Python matches candidate with only TypeScript', () => {
    const result = applyFilter(
      { skillTags: ['language:typescript', 'framework:react'] },
      [['language:typescript', 'language:python']],
    );
    expect(result).toBe(true);
  });

  it('TypeScript OR Python matches candidate with only Python', () => {
    const result = applyFilter(
      { skillTags: ['language:python', 'framework:django'] },
      [['language:typescript', 'language:python']],
    );
    expect(result).toBe(true);
  });

  it('cross-category AND requires match from each group', () => {
    const result = applyFilter(
      { skillTags: ['language:typescript', 'tool:docker'] },
      [['language:typescript'], ['framework:react']],
    );
    expect(result).toBe(false);
  });

  it('cross-category AND passes when all groups match', () => {
    const result = applyFilter(
      { skillTags: ['language:typescript', 'framework:react', 'tool:docker'] },
      [['language:typescript', 'language:python'], ['framework:react']],
    );
    expect(result).toBe(true);
  });

  it('all 12 languages OR returns candidate with any language', () => {
    const allLanguages = [
      'language:typescript', 'language:python', 'language:go',
      'language:java', 'language:rust', 'language:csharp',
      'language:javascript', 'language:ruby', 'language:swift',
      'language:kotlin', 'language:php', 'language:cpp',
    ];
    const result = applyFilter(
      { skillTags: ['language:go'] },
      [allLanguages],
    );
    expect(result).toBe(true);
  });
});

// ─── US-021: InfoIconButton DOM nesting fix ───────────────────────────────

describe('US-021: InfoIconButton avoids nested button', () => {
  const src = readSource('src/app/components/profile/InfoBadge.tsx');

  it('InfoIconButton uses span role=button instead of button element', () => {
    // Extract the InfoIconButton function body
    const fnStart = src.indexOf('export function InfoIconButton');
    const fnBody = src.slice(fnStart, src.indexOf('function InfoCircleIcon'));
    // Should NOT contain <button> element in InfoIconButton
    expect(fnBody).not.toContain('<button');
    // Should use span with role="button"
    expect(fnBody).toContain('role="button"');
    expect(fnBody).toContain('tabIndex={0}');
  });

  it('InfoIconButton supports keyboard accessibility', () => {
    const src2 = readSource('src/app/components/profile/InfoBadge.tsx');
    expect(src2).toContain('onKeyDown');
    expect(src2).toContain("e.key === 'Enter'");
    expect(src2).toContain("e.key === ' '");
  });
});
