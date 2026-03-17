/**
 * src/app/components/search/FacetPanel.tsx — Taxonomy facet panel.
 *
 * Five collapsible sections (Languages, Frameworks, Tools, AI Agent Patterns,
 * AI Maturity Level). Each uses <fieldset>/<legend> for WCAG 2.1 AA.
 * Checkboxes for isSearchable: true taxonomy items sorted by sortOrder.
 * candidateCount shown as muted badge.
 */

import React from 'react';
import type { TaxonomyItem, TaxonomyCategory } from '@/types/taxonomy';
import { useTaxonomy, groupByCategory } from '@/app/hooks/useTaxonomy';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';
import { useUiStore } from '@/app/store/ui-store';

const SECTION_CONFIG: Array<{
  category: TaxonomyCategory;
  label: string;
  urlKey: 'lang' | 'framework' | 'tool' | 'aiPattern';
}> = [
  { category: 'language', label: 'Languages', urlKey: 'lang' },
  { category: 'framework', label: 'Frameworks', urlKey: 'framework' },
  { category: 'tool', label: 'Tools', urlKey: 'tool' },
  { category: 'ai-agent-pattern', label: 'AI Agent Patterns', urlKey: 'aiPattern' },
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
      {SECTION_CONFIG.map(({ category, label, urlKey }) => {
        const items = grouped[category] ?? [];
        const selectedField = SELECTED_FIELDS[category];
        const selectedIds = selectedField ? (params[selectedField] as string[]) : [];

        return (
          <FacetSection
            key={category}
            category={category}
            label={label}
            items={items}
            selectedIds={selectedIds}
            isOpen={openSections[category] ?? true}
            onToggleSection={() => toggleSection(category)}
            onToggleItem={(id) => toggleTaxonomyId(urlKey, id)}
            onSetAll={(ids) => setFilter(urlKey, ids)}
          />
        );
      })}

      {/* AI Maturity Level — single minimum selector */}
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
  category: TaxonomyCategory;
  label: string;
  items: TaxonomyItem[];
  selectedIds: string[];
  isOpen: boolean;
  onToggleSection: () => void;
  onToggleItem: (taxonomyId: string) => void;
  onSetAll: (taxonomyIds: string[]) => void;
}

function FacetSection({
  category, label, items, selectedIds, isOpen, onToggleSection, onToggleItem, onSetAll,
}: FacetSectionProps) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

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
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => onSetAll(allSelected ? [] : items.map((i) => i.id))}
              className="text-xs text-th-text-muted hover:text-indigo-600 px-1 mb-0.5"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
          {items.map((item) => (
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
          {items.length === 0 && (
            <p className="text-xs text-th-text-muted px-1">No items</p>
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
