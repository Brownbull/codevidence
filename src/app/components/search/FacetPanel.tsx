/**
 * src/app/components/search/FacetPanel.tsx — Taxonomy facet panel.
 *
 * Five collapsible sections (Languages, Frameworks, Tools, AI Agent Patterns,
 * AI Maturity Level). Items sorted by candidateCount descending, top 8 shown
 * by default with "+N more" toggle. Items with 0 candidates hidden until expanded.
 * Frameworks and Tools have in-group search input.
 */

import React, { useState } from 'react';
import type { TaxonomyItem, TaxonomyCategory } from '@/types/taxonomy';
import { useTaxonomy, groupByCategory } from '@/app/hooks/useTaxonomy';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';
import { useUiStore } from '@/app/store/ui-store';

const DEFAULT_VISIBLE = 8;

const SECTION_CONFIG: Array<{
  category: TaxonomyCategory;
  label: string;
  urlKey: 'lang' | 'framework' | 'tool' | 'aiPattern';
  hasSearch: boolean;
}> = [
  { category: 'language', label: 'Languages', urlKey: 'lang', hasSearch: false },
  { category: 'framework', label: 'Frameworks', urlKey: 'framework', hasSearch: true },
  { category: 'tool', label: 'Tools', urlKey: 'tool', hasSearch: true },
  { category: 'ai-agent-pattern', label: 'AI Agent Patterns', urlKey: 'aiPattern', hasSearch: false },
];

const SELECTED_FIELDS: Record<string, 'languages' | 'frameworks' | 'tools' | 'aiAgentPatterns'> = {
  'language': 'languages',
  'framework': 'frameworks',
  'tool': 'tools',
  'ai-agent-pattern': 'aiAgentPatterns',
};

export function FacetPanel() {
  const { data: taxonomy, isLoading } = useTaxonomy();
  const { params, toggleTaxonomyId, setFilter, setAiMaturityMin } = useSearchQuery();
  const { openSections, toggleSection } = useUiStore();

  if (isLoading) {
    return (
      <aside className="w-full md:w-64 md:border-r border-border bg-surface-raised p-4 overflow-y-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-surface-inset rounded animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  const grouped = groupByCategory(taxonomy ?? []);

  return (
    <aside className="w-full md:w-64 md:border-r border-border bg-surface-raised p-4 overflow-y-auto">
      {SECTION_CONFIG.map(({ category, label, urlKey, hasSearch }) => {
        const items = grouped[category] ?? [];
        const selectedField = SELECTED_FIELDS[category];
        const selectedIds = selectedField ? (params[selectedField] as string[]) : [];

        return (
          <FacetSection
            key={category}
            label={label}
            items={items}
            selectedIds={selectedIds}
            isOpen={openSections[category] ?? true}
            hasSearch={hasSearch}
            onToggleSection={() => toggleSection(category)}
            onToggleItem={(id) => toggleTaxonomyId(urlKey, id)}
            onSetAll={(ids) => setFilter(urlKey, ids)}
          />
        );
      })}

      {/* AI Maturity Level — always show all levels */}
      <AiMaturitySection
        items={grouped['ai-maturity-level'] ?? []}
        currentMin={params.aiMaturityMin}
        isOpen={openSections['ai-maturity-level'] ?? true}
        onToggleSection={() => toggleSection('ai-maturity-level')}
        onSetMin={setAiMaturityMin}
      />
    </aside>
  );
}

// ─── Facet Section ───────────────────────────────────────────────────────────

interface FacetSectionProps {
  label: string;
  items: TaxonomyItem[];
  selectedIds: string[];
  isOpen: boolean;
  hasSearch: boolean;
  onToggleSection: () => void;
  onToggleItem: (taxonomyId: string) => void;
  onSetAll: (taxonomyIds: string[]) => void;
}

function FacetSection({
  label, items, selectedIds, isOpen, hasSearch,
  onToggleSection, onToggleItem, onSetAll,
}: FacetSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort by candidateCount descending
  const sorted = [...items].sort((a, b) => b.candidateCount - a.candidateCount);

  // Filter by search query
  const searched = searchQuery
    ? sorted.filter((item) =>
        item.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sorted;

  // Hide items with 0 candidates unless expanded or selected
  const withCandidates = searched.filter(
    (item) => item.candidateCount > 0 || selectedIds.includes(item.id)
  );
  const zeroCountHidden = searched.length - withCandidates.length;

  // Show top N or all
  const displayItems = showAll || searchQuery ? withCandidates : withCandidates.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = withCandidates.length - displayItems.length;

  const visibleIds = displayItems.map((i) => i.id);
  const allSelected = displayItems.length > 0 && displayItems.every((item) => selectedIds.includes(item.id));

  return (
    <fieldset className="mb-4 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <button
        type="button"
        onClick={onToggleSection}
        className="flex items-center justify-between w-full text-left text-base font-medium text-th-text-primary py-1.5 hover:text-th-text-primary"
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <span className="text-xs text-th-text-muted">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1">
          {hasSearch && (
            <input
              type="text"
              placeholder={`Filter ${label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowAll(true); }}
              className="w-full px-2 py-1 text-xs border border-border rounded bg-surface text-th-text-primary placeholder:text-th-text-muted focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
          {displayItems.length > 0 && (
            <button
              type="button"
              onClick={() => onSetAll(allSelected ? [] : visibleIds)}
              className="text-xs text-th-text-muted hover:text-indigo-600 px-1 mb-0.5"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
          {displayItems.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-th-hover cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggleItem(item.id)}
                className="rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-mono text-sm text-th-text-primary">{item.displayName}</span>
              <span className="ml-auto text-xs text-th-text-muted">{item.candidateCount}</span>
            </label>
          ))}
          {(hiddenCount > 0 || zeroCountHidden > 0) && !searchQuery && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-indigo-600 hover:text-indigo-700 px-1 mt-0.5"
            >
              {showAll ? 'Show less' : `+ ${hiddenCount + zeroCountHidden} more`}
            </button>
          )}
          {displayItems.length === 0 && (
            <p className="text-xs text-th-text-muted px-1">
              {searchQuery ? 'No matches' : 'No items'}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

// ─── AI Maturity Level Section ───────────────────────────────────────────────

interface AiMaturitySectionProps {
  items: TaxonomyItem[];
  currentMin: number | null;
  isOpen: boolean;
  onToggleSection: () => void;
  onSetMin: (min: number | null) => void;
}

function AiMaturitySection({
  items, currentMin, isOpen, onToggleSection, onSetMin,
}: AiMaturitySectionProps) {
  return (
    <fieldset className="mb-4 border-0 p-0">
      <legend className="sr-only">AI Maturity Level</legend>
      <button
        type="button"
        onClick={onToggleSection}
        className="flex items-center justify-between w-full text-left text-base font-medium text-th-text-primary py-1.5 hover:text-th-text-primary"
        aria-expanded={isOpen}
      >
        <span>AI Maturity Level</span>
        <span className="text-xs text-th-text-muted">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1">
          {items.map((item) => {
            const level = parseInt(item.id.split(':')[1] ?? '0', 10);
            const isSelected = currentMin === level;
            return (
              <label
                key={item.id}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-th-hover cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSetMin(isSelected ? null : level)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500"
                />
                <span className="font-mono text-sm text-th-text-primary">{item.displayName}</span>
                <span className="ml-auto text-xs text-th-text-muted">{item.candidateCount}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
