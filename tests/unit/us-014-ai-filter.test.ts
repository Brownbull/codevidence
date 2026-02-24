/**
 * tests/unit/us-014-ai-filter.test.ts
 *
 * Unit tests for US-014: AI maturity min filter, thin-results state,
 * and underserved query flagging.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Search Handler: Dual Query for aiMaturityMin ───────────────────────────

describe('US-014: Search Handler — aiMaturityMin dual query', () => {
  const src = readSource('src/handlers/search.ts');

  it('checks for aiMaturityMin > 0 before dual query', () => {
    expect(src).toContain('params.aiMaturityMin !== null');
    expect(src).toContain('params.aiMaturityMin > 0');
  });

  it('runs two parallel Firestore queries via Promise.all', () => {
    expect(src).toContain('Promise.all');
  });

  it('queries scored candidates at or above minimum', () => {
    expect(src).toContain("where('aiMaturityScore', '>=', params.aiMaturityMin)");
  });

  it('queries unscored candidates (null) separately', () => {
    expect(src).toContain("where('aiMaturityScore', '==', null)");
  });

  it('merges and deduplicates results by ID', () => {
    expect(src).toContain('new Set<string>()');
    expect(src).toContain('seen.has(candidate.id)');
    expect(src).toContain('seen.add(candidate.id)');
  });

  it('uses array-contains on rarest tag in both queries', () => {
    // Both scored and unscored queries use the same rarest tag filter
    const matches = src.match(/where\('skillTags', 'array-contains', rarestTag\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('caps both queries at MAX_RESULTS', () => {
    const limitMatches = src.match(/limit\(MAX_RESULTS\)/g);
    expect(limitMatches).not.toBeNull();
    // At least 3: single query + scored + unscored
    expect(limitMatches!.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Admin Flags Handler ────────────────────────────────────────────────────

describe('US-014: Admin Flags Handler', () => {
  const src = readSource('src/handlers/admin-flags.ts');

  it('exports maybeFlagUnderservedQuery async function', () => {
    expect(src).toContain('export async function maybeFlagUnderservedQuery');
  });

  it('exports buildSuggestedCommand function', () => {
    expect(src).toContain('export function buildSuggestedCommand');
  });

  it('skips flagging when resultCount >= 10', () => {
    expect(src).toContain('if (resultCount >= 10) return false');
  });

  it('queries admin_flags for recent duplicates', () => {
    expect(src).toContain("where('type', '==', 'underserved-query')");
    expect(src).toContain("where('status', '==', 'active')");
  });

  it('uses 24-hour deduplication cooldown', () => {
    expect(src).toContain('24 * 60 * 60 * 1000');
    expect(src).toContain('DEDUP_COOLDOWN_MS');
  });

  it('serializes params deterministically for comparison', () => {
    expect(src).toContain('serializeParams');
    expect(src).toContain('.sort()');
  });

  it('creates admin_flags doc with type underserved-query', () => {
    expect(src).toContain("type: 'underserved-query'");
    expect(src).toContain("status: 'active'");
    expect(src).toContain('queryParams');
    expect(src).toContain('resultCount');
  });

  it('writes serverTimestamp for createdAt and updatedAt', () => {
    expect(src).toContain('serverTimestamp()');
    expect(src).toContain('createdAt:');
    expect(src).toContain('updatedAt:');
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── buildSuggestedCommand Functional ───────────────────────────────────────

describe('US-014: buildSuggestedCommand — functional', () => {
  it('builds CLI command from search params', async () => {
    const { buildSuggestedCommand } = await import(
      '../../src/handlers/admin-flags.js'
    );
    const params = {
      languages: ['language:python'],
      frameworks: ['framework:fastapi'],
      tools: ['tool:docker'],
      aiAgentPatterns: [],
      aiMaturityMin: null,
      sortBy: 'skillScore' as const,
    };
    const cmd = buildSuggestedCommand(params);
    expect(cmd).toContain('pnpm scan discover');
    expect(cmd).toContain('python');
    expect(cmd).toContain('fastapi');
    expect(cmd).toContain('docker');
    expect(cmd).toContain('--limit 100');
  });

  it('strips category prefix from taxonomy IDs', async () => {
    const { buildSuggestedCommand } = await import(
      '../../src/handlers/admin-flags.js'
    );
    const params = {
      languages: ['language:typescript'],
      frameworks: [],
      tools: [],
      aiAgentPatterns: [],
      aiMaturityMin: null,
      sortBy: 'skillScore' as const,
    };
    const cmd = buildSuggestedCommand(params);
    expect(cmd).toContain('typescript');
    expect(cmd).not.toContain('language:');
  });

  it('defaults to "developer" when no tags', async () => {
    const { buildSuggestedCommand } = await import(
      '../../src/handlers/admin-flags.js'
    );
    const params = {
      languages: [],
      frameworks: [],
      tools: [],
      aiAgentPatterns: [],
      aiMaturityMin: null,
      sortBy: 'skillScore' as const,
    };
    const cmd = buildSuggestedCommand(params);
    expect(cmd).toContain("--query 'developer'");
  });
});

// ─── Deduplication Cooldown Logic (source-level) ────────────────────────────

describe('US-014: Deduplication cooldown logic', () => {
  const src = readSource('src/handlers/admin-flags.ts');

  it('compares serialized params to detect duplicates', () => {
    expect(src).toContain('serializeParams(flag.queryParams)');
    expect(src).toContain('paramsHash');
  });

  it('checks timestamp against cooldown window', () => {
    expect(src).toContain('now - flagTime < DEDUP_COOLDOWN_MS');
  });

  it('returns false when within cooldown period', () => {
    // Within cooldown block returns false
    expect(src).toContain('return false; // Within 24h cooldown');
  });

  it('sorts params arrays for deterministic comparison', () => {
    // serializeParams sorts all arrays
    expect(src).toContain('[...params.languages].sort()');
    expect(src).toContain('[...params.frameworks].sort()');
    expect(src).toContain('[...params.tools].sort()');
    expect(src).toContain('[...params.aiAgentPatterns].sort()');
  });

  it('includes aiMaturityMin in serialized params', () => {
    expect(src).toContain('params.aiMaturityMin');
  });
});

// ─── ThinResultsState Component ─────────────────────────────────────────────

describe('US-014: ThinResultsState Component', () => {
  const src = readSource('src/app/components/search/ResultsState.tsx');

  it('renders pool coverage limited message', () => {
    expect(src).toContain('Pool coverage limited');
  });

  it('shows result count in message', () => {
    expect(src).toContain('{resultCount}');
    expect(src).toContain('result');
  });

  it('renders suggested CLI discover command', () => {
    expect(src).toContain('buildSuggestedCommand');
    expect(src).toContain('{command}');
  });

  it('shows flagged confirmation message', () => {
    expect(src).toContain('flagged for admin review');
  });

  it('uses amber styling for warning state', () => {
    expect(src).toContain('bg-amber-50');
    expect(src).toContain('border-amber-200');
    expect(src).toContain('text-amber-800');
  });

  it('renders command in monospace pre block', () => {
    expect(src).toContain('<pre');
    expect(src).toContain('font-mono');
  });
});

// ─── ZeroResultsState Component ─────────────────────────────────────────────

describe('US-014: ZeroResultsState Component', () => {
  const src = readSource('src/app/components/search/ResultsState.tsx');

  it('renders no candidates message', () => {
    expect(src).toContain('No candidates match the selected filters');
  });

  it('suggests adjusting filters', () => {
    expect(src).toContain('adjusting your filters');
  });

  it('renders suggested CLI command', () => {
    expect(src).toContain('buildSuggestedCommand');
  });

  it('shows flagged confirmation', () => {
    expect(src).toContain('flagged for admin review');
  });

  it('uses centered layout', () => {
    expect(src).toContain('text-center');
  });
});

// ─── SearchPage Integration — Thin/Zero Results ─────────────────────────────

describe('US-014: SearchPage Integration', () => {
  const src = readSource('src/app/pages/SearchPage.tsx');

  it('imports ThinResultsState and ZeroResultsState', () => {
    expect(src).toContain('ThinResultsState');
    expect(src).toContain('ZeroResultsState');
  });

  it('renders ThinResultsState when results < 10 and > 0', () => {
    expect(src).toContain('isThin');
    expect(src).toContain('candidates.length < 10');
    expect(src).toContain('candidates.length > 0');
  });

  it('renders ZeroResultsState when results === 0', () => {
    expect(src).toContain('isEmpty');
    expect(src).toContain('candidates.length === 0');
  });

  it('calls maybeFlagUnderservedQuery for underserved queries', () => {
    expect(src).toContain('maybeFlagUnderservedQuery');
    expect(src).toContain('candidates.length >= 10');
  });

  it('deduplicates flagging within session using ref', () => {
    expect(src).toContain('flaggedRef');
    expect(src).toContain('useRef');
    expect(src).toContain('paramsKey');
  });

  it('passes params to results state components', () => {
    expect(src).toContain('params={params}');
  });

  it('passes resultCount to ThinResultsState', () => {
    expect(src).toContain('resultCount={candidates.length}');
  });
});

// ─── ResultsState Types ─────────────────────────────────────────────────────

describe('US-014: ResultsState type contracts', () => {
  const src = readSource('src/app/components/search/ResultsState.tsx');

  it('ThinResultsState accepts resultCount and params', () => {
    expect(src).toContain('resultCount: number');
    expect(src).toContain('params: SearchQueryParams');
  });

  it('ZeroResultsState accepts params', () => {
    expect(src).toContain('ZeroResultsStateProps');
    expect(src).toContain('params: SearchQueryParams');
  });

  it('imports SearchQueryParams type', () => {
    expect(src).toContain("from '@/types/admin'");
  });

  it('imports buildSuggestedCommand from admin-flags', () => {
    expect(src).toContain("from '@/handlers/admin-flags'");
  });
});
