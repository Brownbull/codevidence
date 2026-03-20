/**
 * src/app/hooks/useCandidates.ts — TanStack Query hook for search results.
 *
 * Calls searchCandidates handler. Enabled only when filters are active.
 * QueryKey includes serialized params for automatic refetch on filter change.
 */

import { useQuery } from '@tanstack/react-query';
import type { SearchQueryParams } from '@/types/admin';
import type { TaxonomyItem } from '@/types/taxonomy';
import { searchCandidates } from '@/handlers/search';

export function useCandidates(
  params: SearchQueryParams,
  taxonomyItems: TaxonomyItem[] | undefined,
  hasAnyFilter: boolean
) {
  return useQuery({
    queryKey: ['candidates', params],
    queryFn: () => searchCandidates(params, taxonomyItems ?? []),
    staleTime: 5 * 60 * 1000,
    enabled: hasAnyFilter && (taxonomyItems?.length ?? 0) > 0,
  });
}
