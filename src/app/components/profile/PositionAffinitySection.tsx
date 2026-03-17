/**
 * src/app/components/profile/PositionAffinitySection.tsx — Position Affinity UI.
 *
 * Displays which IT roles a candidate aligns with based on skill categories.
 * Each role is a toggle button that expands to show covered/missing categories.
 * Uses category-based scoring from position-affinity-data.ts.
 */

import React, { useState } from 'react';
import type { Candidate } from '@/types/candidate';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoIconButton } from './InfoBadge';
import { TechIcon } from './TechIcon';
import {
  computeAffinities,
  signalDisplayName,
  type RoleAffinity,
  type CategoryMatch,
} from './position-affinity-data';

const SECTION_INFO =
  'Role affinity based on skill categories. Each role requires specific areas ' +
  '(language, framework, database, etc.). Covering any tool within a category ' +
  'satisfies that requirement. Score = categories covered / total categories.';

const MAX_NEEDS_SHOWN = 4;

// ─── Component ─────────────────────────────────────────────────────────────

interface PositionAffinitySectionProps {
  candidate: Candidate;
}

export function PositionAffinitySection({ candidate }: PositionAffinitySectionProps) {
  const affinities = computeAffinities(candidate);

  if (affinities.length === 0) {
    return (
      <CollapsibleSection
        title="Position Affinity"
        count={0}
        infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
      >
        <p className="text-xs text-th-text-muted italic">
          Not enough skill signals to compute role affinity.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Position Affinity"
      count={affinities.length}
      infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
    >
      <div className="space-y-1">
        {affinities.map((a) => (
          <AffinityRow key={a.role.id} affinity={a} />
        ))}
      </div>
    </CollapsibleSection>
  );
}

function AffinityRow({ affinity }: { affinity: RoleAffinity }) {
  const [expanded, setExpanded] = useState(false);
  const { role, score, coveredCount, totalCategories, categoryMatches } = affinity;

  const barColor = score >= 60
    ? 'bg-indigo-500'
    : score >= 35
      ? 'bg-blue-400'
      : 'bg-slate-400';

  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-surface-inset/50 transition-colors text-left"
      >
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="currentColor"
          className={`text-th-text-muted flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <span className="text-xs font-medium text-th-text-primary w-48 flex-shrink-0 truncate">
          {role.icon} {role.label}
        </span>
        <div className="flex-1 mx-2">
          <div className="h-1.5 rounded-full bg-surface-inset overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.max(score, 2)}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-th-text-muted tabular-nums flex-shrink-0">
          {coveredCount}/{totalCategories} &middot; {score}%
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-1">
          {categoryMatches.map((m) => (
            <CategoryRow key={m.category.label} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({ match }: { match: CategoryMatch }) {
  const isCovered = match.matched.length > 0;

  return (
    <div className={`flex items-start gap-2 py-0.5 ${isCovered ? '' : 'opacity-40'}`}>
      <span className={`text-xs mt-0.5 flex-shrink-0 ${isCovered ? 'text-green-600' : 'text-th-text-muted'}`}>
        {isCovered ? '\u2713' : '\u2717'}
      </span>
      <span className="text-xs font-medium text-th-text-secondary w-32 flex-shrink-0 truncate">
        {match.category.label}
      </span>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {isCovered ? (
          match.matched.map((s) => (
            <span key={s} className="inline-flex items-center gap-0.5">
              <TechIcon taxonomyId={s} />
              <span className="text-xs text-th-text-muted">{signalDisplayName(s)}</span>
            </span>
          ))
        ) : (
          <span className="text-xs text-th-text-muted italic">
            needs{' '}
            {match.category.alternatives
              .slice(0, MAX_NEEDS_SHOWN)
              .map((s) => signalDisplayName(s))
              .join(', ')}
            {match.category.alternatives.length > MAX_NEEDS_SHOWN ? ', \u2026' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
