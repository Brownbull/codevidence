/**
 * src/app/components/search/ActiveFilterChips.tsx — Active filter chip display.
 *
 * Renders one chip per active filter with x remove button.
 * Clear all button removes all filter params from URL.
 */

import React from 'react';
import type { SearchQueryParams } from '@/types/admin';

interface ActiveFilterChipsProps {
  params: SearchQueryParams;
  onRemoveTag: (category: 'lang' | 'framework' | 'tool' | 'aiPattern', taxonomyId: string) => void;
  onClearAiMin: () => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({
  params, onRemoveTag, onClearAiMin, onClearAll,
}: ActiveFilterChipsProps) {
  const allChips: Array<{ label: string; onRemove: () => void }> = [];

  for (const id of params.languages) {
    allChips.push({ label: id.split(':')[1] ?? id, onRemove: () => onRemoveTag('lang', id) });
  }
  for (const id of params.frameworks) {
    allChips.push({ label: id.split(':')[1] ?? id, onRemove: () => onRemoveTag('framework', id) });
  }
  for (const id of params.tools) {
    allChips.push({ label: id.split(':')[1] ?? id, onRemove: () => onRemoveTag('tool', id) });
  }
  for (const id of params.aiAgentPatterns) {
    allChips.push({ label: id.split(':')[1] ?? id, onRemove: () => onRemoveTag('aiPattern', id) });
  }
  if (params.aiMaturityMin !== null) {
    allChips.push({
      label: `AI Maturity \u2265 ${params.aiMaturityMin}`,
      onRemove: onClearAiMin,
    });
  }

  if (allChips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      {allChips.map((chip, i) => (
        <span
          key={`${chip.label}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-inset text-xs font-mono text-th-text-primary"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-th-text-muted hover:text-th-text-secondary ml-0.5"
            aria-label={`Remove ${chip.label} filter`}
          >
            {'\u00D7'}
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-th-text-secondary hover:text-th-text-primary underline"
      >
        Clear all
      </button>
    </div>
  );
}
