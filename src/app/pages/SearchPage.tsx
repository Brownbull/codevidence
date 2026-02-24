/**
 * src/app/pages/SearchPage.tsx — Main search page.
 *
 * Three-zone layout: top nav + left facet panel + main content.
 * Filter state lives in URL via useSearchQuery hook.
 */
import React from 'react';
import { AppShell } from '@/app/components/layout/AppShell';
import { FacetPanel } from '@/app/components/search/FacetPanel';
import { ActiveFilterChips } from '@/app/components/search/ActiveFilterChips';
import { SortControls } from '@/app/components/search/SortControls';
import { CandidateCard } from '@/app/components/search/CandidateCard';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';
import { useTaxonomy } from '@/app/hooks/useTaxonomy';
import { useCandidates } from '@/app/hooks/useCandidates';

export function SearchPage() {
  const { params, setSort, setAiMaturityMin, clearAll, toggleTaxonomyId, hasAnyFilter } =
    useSearchQuery();
  const { data: taxonomy } = useTaxonomy();
  const { data: candidates, isLoading } = useCandidates(params, taxonomy, hasAnyFilter);

  const allTags = [
    ...params.languages,
    ...params.frameworks,
    ...params.tools,
    ...params.aiAgentPatterns,
  ];

  return (
    <AppShell sidebar={<FacetPanel />}>
      {/* Active filters + sort controls */}
      <div className="flex items-start justify-between mb-4">
        <ActiveFilterChips
          params={params}
          onRemoveTag={toggleTaxonomyId}
          onClearAiMin={() => setAiMaturityMin(null)}
          onClearAll={clearAll}
        />
        <SortControls currentSort={params.sortBy} onSort={setSort} />
      </div>

      {/* Results */}
      {!hasAnyFilter && (
        <p className="text-slate-500 font-mono text-sm text-center mt-12">
          Select filters in the panel to search candidates.
        </p>
      )}

      {isLoading && hasAnyFilter && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
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
          <p className="text-xs text-slate-400 text-center mt-4">
            {candidates.length} result{candidates.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {candidates && candidates.length === 0 && hasAnyFilter && !isLoading && (
        <p className="text-slate-500 font-mono text-sm text-center mt-12">
          No candidates match the selected filters.
        </p>
      )}
    </AppShell>
  );
}
