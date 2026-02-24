/**
 * src/app/components/search/SortControls.tsx — Sort selection.
 *
 * Button group: Skill Score / AI Maturity / Last Scanned.
 * Selection updates URL ?sort= param.
 */

import React from 'react';
import type { SearchQueryParams } from '@/types/admin';

interface SortControlsProps {
  currentSort: SearchQueryParams['sortBy'];
  onSort: (sortBy: SearchQueryParams['sortBy']) => void;
}

const SORT_OPTIONS: Array<{ value: SearchQueryParams['sortBy']; label: string }> = [
  { value: 'skillScore', label: 'Skill Score' },
  { value: 'aiMaturityScore', label: 'AI Maturity' },
  { value: 'lastScanned', label: 'Last Scanned' },
];

export function SortControls({ currentSort, onSort }: SortControlsProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Sort by">
      <span className="text-xs text-th-text-secondary mr-1">Sort:</span>
      {SORT_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSort(value)}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            currentSort === value
              ? 'bg-slate-900 text-white'
              : 'bg-surface-inset text-th-text-secondary hover:bg-th-hover'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
