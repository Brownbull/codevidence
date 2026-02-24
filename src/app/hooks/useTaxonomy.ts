/**
 * src/app/hooks/useTaxonomy.ts — TanStack Query hook for taxonomy data.
 *
 * Fetches isSearchable: true taxonomy items from Firestore.
 * Data is cached with a 5-minute stale time since taxonomy rarely changes.
 */

import { useQuery } from '@tanstack/react-query';
import type { TaxonomyItem, TaxonomyCategory } from '@/types/taxonomy';
import { queryDocs, where, orderBy } from '@/core/db/firestore';

async function fetchTaxonomy(): Promise<TaxonomyItem[]> {
  return queryDocs<TaxonomyItem>(
    'taxonomy',
    where('isSearchable', '==', true),
    orderBy('category'),
    orderBy('sortOrder'),
  );
}

/** Groups taxonomy items by category for the FacetPanel. */
export function groupByCategory(
  items: TaxonomyItem[]
): Record<TaxonomyCategory, TaxonomyItem[]> {
  const groups: Record<string, TaxonomyItem[]> = {
    'language': [],
    'framework': [],
    'tool': [],
    'ai-agent-pattern': [],
    'ai-maturity-level': [],
  };
  for (const item of items) {
    const group = groups[item.category];
    if (group) {
      group.push(item);
    }
  }
  return groups as Record<TaxonomyCategory, TaxonomyItem[]>;
}

export function useTaxonomy() {
  return useQuery({
    queryKey: ['taxonomy'],
    queryFn: fetchTaxonomy,
    staleTime: 5 * 60 * 1000,
  });
}
