/**
 * src/app/components/search/ResultsState.tsx — Thin and zero results states.
 *
 * ThinResultsState: results < 10, > 0 — shows pool coverage message + CLI command.
 * ZeroResultsState: results === 0 — shows empty state + CLI command.
 */

import React from 'react';
import type { SearchQueryParams } from '@/types/admin';
import { buildSuggestedCommand } from '@/handlers/admin-flags';

interface ThinResultsStateProps {
  resultCount: number;
  params: SearchQueryParams;
}

export function ThinResultsState({ resultCount, params }: ThinResultsStateProps) {
  const command = buildSuggestedCommand(params);

  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm text-amber-800 font-medium">
        Pool coverage limited — only {resultCount} result{resultCount !== 1 ? 's' : ''} found
      </p>
      <p className="text-xs text-amber-700 mt-1">
        Expand your candidate pool by running a discovery scan:
      </p>
      <pre className="mt-2 p-2 bg-white border border-amber-200 rounded text-xs font-mono text-slate-700 overflow-x-auto">
        {command}
      </pre>
      <p className="text-xs text-amber-600 mt-2 italic">
        This query has been flagged for admin review.
      </p>
    </div>
  );
}

interface ZeroResultsStateProps {
  params: SearchQueryParams;
}

export function ZeroResultsState({ params }: ZeroResultsStateProps) {
  const command = buildSuggestedCommand(params);

  return (
    <div className="mt-12 text-center">
      <p className="text-slate-500 font-medium">No candidates match the selected filters</p>
      <p className="text-sm text-slate-400 mt-2">
        Try adjusting your filters, or expand the candidate pool:
      </p>
      <pre className="mt-3 mx-auto max-w-lg p-3 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-700 text-left overflow-x-auto">
        {command}
      </pre>
      <p className="text-xs text-slate-400 mt-2 italic">
        This query has been flagged for admin review.
      </p>
    </div>
  );
}
