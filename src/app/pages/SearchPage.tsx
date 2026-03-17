/**
 * src/app/pages/SearchPage.tsx — Main search page.
 *
 * Three-zone layout: top nav + left facet panel + main content.
 * Filter state lives in URL via useSearchQuery hook.
 */
import React, { useEffect, useRef } from 'react';
import { AppShell } from '@/app/components/layout/AppShell';
import { FacetPanel } from '@/app/components/search/FacetPanel';
import { ActiveFilterChips } from '@/app/components/search/ActiveFilterChips';
import { SortControls } from '@/app/components/search/SortControls';
import { CandidateCard } from '@/app/components/search/CandidateCard';
import { ThinResultsState, ZeroResultsState } from '@/app/components/search/ResultsState';
import { WelcomeEmptyState } from '@/app/components/search/WelcomeEmptyState';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';
import { useTaxonomy } from '@/app/hooks/useTaxonomy';
import { useCandidates } from '@/app/hooks/useCandidates';
import { maybeFlagUnderservedQuery } from '@/handlers/admin-flags';

export function SearchPage() {
  const { params, setSort, setAiMaturityMin, clearAll, toggleTaxonomyId, hasAnyFilter } =
    useSearchQuery();
  const { data: taxonomy } = useTaxonomy();
  const { data: candidates, isLoading } = useCandidates(params, taxonomy, hasAnyFilter);
  const flaggedRef = useRef<string>('');

  const allTags = [
    ...params.languages,
    ...params.frameworks,
    ...params.tools,
    ...params.aiAgentPatterns,
  ];

  // Flag underserved queries (< 10 results) with 24h dedup
  useEffect(() => {
    if (!candidates || isLoading || !hasAnyFilter) return;
    if (candidates.length >= 10) return;
    const paramsKey = JSON.stringify(params);
    if (flaggedRef.current === paramsKey) return;
    flaggedRef.current = paramsKey;
    void maybeFlagUnderservedQuery(params, candidates.length);
  }, [candidates, isLoading, hasAnyFilter, params]);

  const isThin = candidates && candidates.length > 0 && candidates.length < 10 && !isLoading;
  const isEmpty = candidates && candidates.length === 0 && hasAnyFilter && !isLoading;

  return (
    <AppShell sidebar={<FacetPanel />}>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-4">
        <ActiveFilterChips
          params={params}
          onRemoveTag={toggleTaxonomyId}
          onClearAiMin={() => setAiMaturityMin(null)}
          onClearAll={clearAll}
        />
        <SortControls currentSort={params.sortBy} onSort={setSort} />
      </div>

      {!hasAnyFilter && <WelcomeEmptyState />}

      {isLoading && hasAnyFilter && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-inset rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {candidates && candidates.length > 0 && (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              matchedTags={allTags}
            />
          ))}
          <p className="text-xs text-th-text-muted text-center mt-4">
            {candidates.length} result{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {isThin && <ThinResultsState resultCount={candidates.length} params={params} />}
      {isEmpty && <ZeroResultsState params={params} />}
    </AppShell>
  );
}
