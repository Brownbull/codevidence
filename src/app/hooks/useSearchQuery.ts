/**
 * src/app/hooks/useSearchQuery.ts — URL ↔ SearchQueryParams bidirectional hook.
 *
 * The URL is the SINGLE SOURCE OF TRUTH for filter state.
 * Zustand holds only UI state (panel open/closed).
 *
 * URL param mapping:
 *   ?lang=python,typescript       → languages: ['language:python', ...]
 *   ?framework=react              → frameworks: ['framework:react']
 *   ?tool=docker                  → tools: ['tool:docker']
 *   ?aiPattern=claude-md          → aiAgentPatterns: ['ai-agent-pattern:claude-md']
 *   ?aiMin=3                      → aiMaturityMin: 3
 *   ?sort=skillScore              → sortBy: 'skillScore'
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchQueryParams } from '@/types/admin';

const CATEGORY_PREFIX_MAP: Record<string, string> = {
  lang: 'language',
  framework: 'framework',
  tool: 'tool',
  aiPattern: 'ai-agent-pattern',
};

const VALID_SORT_VALUES = new Set(['skillScore', 'aiMaturityScore', 'lastScanned']);

function parseArrayParam(params: URLSearchParams, key: string, prefix: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(',').filter(Boolean).map((v) => `${prefix}:${v}`);
}

function serializeArrayParam(values: string[], prefix: string): string {
  return values
    .map((v) => v.startsWith(`${prefix}:`) ? v.slice(prefix.length + 1) : v)
    .filter(Boolean)
    .join(',');
}

export function useSearchQuery() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: SearchQueryParams = useMemo(() => ({
    languages: parseArrayParam(searchParams, 'lang', 'language'),
    frameworks: parseArrayParam(searchParams, 'framework', 'framework'),
    tools: parseArrayParam(searchParams, 'tool', 'tool'),
    aiAgentPatterns: parseArrayParam(searchParams, 'aiPattern', 'ai-agent-pattern'),
    aiMaturityMin: searchParams.has('aiMin')
      ? parseInt(searchParams.get('aiMin') ?? '', 10) || null
      : null,
    sortBy: (VALID_SORT_VALUES.has(searchParams.get('sort') ?? '')
      ? searchParams.get('sort')
      : 'skillScore') as SearchQueryParams['sortBy'],
  }), [searchParams]);

  const setFilter = useCallback((
    category: keyof typeof CATEGORY_PREFIX_MAP,
    taxonomyIds: string[]
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const prefix = CATEGORY_PREFIX_MAP[category] ?? category;
      const serialized = serializeArrayParam(taxonomyIds, prefix);
      if (serialized) {
        next.set(category, serialized);
      } else {
        next.delete(category);
      }
      return next;
    });
  }, [setSearchParams]);

  const setSort = useCallback((sortBy: SearchQueryParams['sortBy']) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', sortBy);
      return next;
    });
  }, [setSearchParams]);

  const setAiMaturityMin = useCallback((min: number | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (min !== null && min > 0) {
        next.set('aiMin', String(min));
      } else {
        next.delete('aiMin');
      }
      return next;
    });
  }, [setSearchParams]);

  const setFilters = useCallback((
    filters: Record<string, string[]>
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [category, taxonomyIds] of Object.entries(filters)) {
        const prefix = CATEGORY_PREFIX_MAP[category] ?? category;
        const serialized = serializeArrayParam(taxonomyIds, prefix);
        if (serialized) {
          next.set(category, serialized);
        } else {
          next.delete(category);
        }
      }
      return next;
    });
  }, [setSearchParams]);

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const toggleTaxonomyId = useCallback((
    category: keyof typeof CATEGORY_PREFIX_MAP,
    taxonomyId: string
  ) => {
    const prefix = CATEGORY_PREFIX_MAP[category] ?? category;
    const fieldMap: Record<string, keyof SearchQueryParams> = {
      lang: 'languages', framework: 'frameworks',
      tool: 'tools', aiPattern: 'aiAgentPatterns',
    };
    const field = fieldMap[category];
    if (!field) return;
    const current = params[field] as string[];
    const next = current.includes(taxonomyId)
      ? current.filter((id) => id !== taxonomyId)
      : [...current, taxonomyId];
    setFilter(category, next);
  }, [params, setFilter]);

  const hasAnyFilter = useMemo(() =>
    params.languages.length > 0 ||
    params.frameworks.length > 0 ||
    params.tools.length > 0 ||
    params.aiAgentPatterns.length > 0 ||
    params.aiMaturityMin !== null,
  [params]);

  return { params, setFilter, setFilters, setSort, setAiMaturityMin, clearAll, toggleTaxonomyId, hasAnyFilter };
}
