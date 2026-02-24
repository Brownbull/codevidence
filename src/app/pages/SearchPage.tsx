/**
 * src/app/pages/SearchPage.tsx — Main search page.
 *
 * Three-zone layout: top nav + left facet panel + main content.
 * Filter state lives in URL via useSearchQuery hook.
 */
import React from 'react';
import { AppShell } from '@/app/components/layout/AppShell';
import { FacetPanel } from '@/app/components/search/FacetPanel';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';

export function SearchPage() {
  const { params, hasAnyFilter } = useSearchQuery();

  return (
    <AppShell sidebar={<FacetPanel />}>
      <div>
        {hasAnyFilter ? (
          <p className="text-slate-500 font-mono text-sm">
            Search results — US-013 (sort: {params.sortBy})
          </p>
        ) : (
          <p className="text-slate-500 font-mono text-sm">
            Select filters in the panel to search candidates.
          </p>
        )}
      </div>
    </AppShell>
  );
}
