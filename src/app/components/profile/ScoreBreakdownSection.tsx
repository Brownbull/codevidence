/**
 * src/app/components/profile/ScoreBreakdownSection.tsx — Visual score breakdown.
 *
 * Primary section in the candidate profile. Shows 19 score components grouped by phase.
 * Each component renders as a labeled horizontal bar with the new methodology names.
 * Links to the dedicated methodology page for deep-dive explanations.
 */

import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoIconButton } from './InfoBadge';
import { PHASE_LABELS, PHASE_ORDER } from '@/app/utils/score-methodology';
import type { ScoreBreakdown, ScoreComponent, PhaseSubtotal } from '@/app/utils/score-breakdown';

/** Small question-mark link that navigates to the score's methodology section. */
function MethodologyLink({ scoreId, candidateId }: { scoreId: string; candidateId: string }) {
  return (
    <Link
      to={`/methodology#score-${scoreId}`}
      state={{ from: `/candidates/${candidateId}` }}
      className="text-indigo-400 hover:text-indigo-300 transition-colors leading-none flex-shrink-0"
      aria-label={`How is ${scoreId} calculated?`}
      title="How is this calculated?"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM8 10.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5ZM6.5 6.25c0-1 .75-1.75 1.5-1.75s1.5.75 1.5 1.75c0 .58-.34.97-.74 1.24-.18.12-.3.22-.38.34-.07.1-.13.25-.13.42a.75.75 0 0 1-1.5 0c0-.46.16-.82.41-1.1.23-.25.52-.44.74-.58.18-.12.1-.32.1-.32z" />
      </svg>
    </Link>
  );
}

const PHASE_COLORS: Record<string, { bar: string; text: string }> = {
  core:   { bar: 'bg-indigo-500', text: 'text-indigo-600' },
  phase2: { bar: 'bg-blue-500',   text: 'text-blue-600' },
  phase3: { bar: 'bg-teal-500',   text: 'text-teal-600' },
  phase4: { bar: 'bg-amber-500',  text: 'text-amber-600' },
  phase5: { bar: 'bg-violet-500', text: 'text-violet-600' },
};

const WEIGHT_LABELS: Record<number, { text: string; color: string }> = {
  3: { text: 'critical', color: 'text-red-500' },
  2: { text: 'important', color: 'text-amber-500' },
  1: { text: 'minor', color: 'text-th-text-muted' },
  0: { text: 'excluded', color: 'text-th-text-muted line-through' },
};

interface Props {
  breakdown: ScoreBreakdown;
}

export function ScoreBreakdownSection({ breakdown }: Props) {
  const { id } = useParams<{ id: string }>();
  const isWeighted = breakdown.positionId != null;
  const displayScore = isWeighted ? (breakdown.weightedTotal ?? 0) : breakdown.total;

  return (
    <CollapsibleSection title="Scores" defaultOpen={true}>
      {/* Score header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-indigo-600 tabular-nums">{displayScore}</span>
          <span className="text-sm text-th-text-muted">/ 100</span>
          {isWeighted ? (
            <span className="text-xs text-th-text-muted">(weighted)</span>
          ) : breakdown.rawTotal > 100 ? (
            <span className="text-xs text-th-text-muted">({breakdown.rawTotal} raw, clamped)</span>
          ) : null}
        </div>
        <Link
          to="/methodology"
          state={{ from: `/candidates/${id ?? ''}` }}
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          How are scores calculated?
        </Link>
      </div>

      {/* Phase groups */}
      <div className="space-y-5">
        {PHASE_ORDER.map((phase) => {
          const sub = breakdown.phaseSubtotals[phase];
          if (!sub) return null;
          const comps = breakdown.components.filter((c) => c.phase === phase);
          if (comps.length === 0) return null;
          return (
            <PhaseGroup
              key={phase}
              phase={phase}
              subtotal={sub}
              components={comps}
              isWeighted={isWeighted}
              candidateId={id ?? ''}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

function PhaseGroup({
  phase,
  subtotal,
  components,
  isWeighted,
  candidateId,
}: {
  phase: string;
  subtotal: PhaseSubtotal;
  components: ScoreComponent[];
  isWeighted: boolean;
  candidateId: string;
}) {
  const colors = PHASE_COLORS[phase] ?? PHASE_COLORS.core!;
  const phaseInfo = PHASE_LABELS[phase];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {phaseInfo?.icon && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={colors.text}
          >
            <path d={phaseInfo.icon} />
          </svg>
        )}
        <span className={`text-xs font-bold ${colors.text}`}>{subtotal.label}</span>
        <span className="text-xs text-th-text-muted tabular-nums">
          {subtotal.points} / {subtotal.max}
        </span>
        {phaseInfo && <InfoIconButton tooltip={phaseInfo.description} />}
      </div>
      <div className="space-y-1.5">
        {components.map((comp) => (
          <ComponentBar
            key={comp.id}
            component={comp}
            colors={colors}
            isWeighted={isWeighted}
            candidateId={candidateId}
          />
        ))}
      </div>
    </div>
  );
}

function ComponentBar({
  component,
  colors,
  isWeighted,
  candidateId,
}: {
  component: ScoreComponent;
  colors: { bar: string; text: string };
  isWeighted: boolean;
  candidateId: string;
}) {
  const pct = component.maxPoints > 0
    ? Math.round((component.points / component.maxPoints) * 100)
    : 0;

  const weight = component.weight ?? 1;
  const isExcluded = isWeighted && weight === 0;
  const isZero = component.points === 0;
  const dimmed = isExcluded || isZero;

  const weightInfo = WEIGHT_LABELS[weight];

  return (
    <div className={`flex items-center gap-2 ${dimmed ? 'opacity-30' : ''}`}>
      <span className="text-xs text-th-text-secondary w-44 flex-shrink-0 flex items-center gap-1">
        <span className={`truncate ${isExcluded ? 'line-through' : ''}`}>{component.label}</span>
        <MethodologyLink scoreId={component.id} candidateId={candidateId} />
      </span>
      {isWeighted && (
        <span className={`text-xs font-medium w-12 flex-shrink-0 ${weightInfo?.color ?? ''}`}>
          {isExcluded ? '\u2014' : `\u00D7${weight}`}
        </span>
      )}
      <div className="flex-1 h-2 rounded-full bg-surface-inset overflow-hidden">
        {!isZero && !isExcluded && (
          <div
            className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        )}
      </div>
      <span className="text-xs text-th-text-muted tabular-nums w-12 text-right flex-shrink-0">
        {isExcluded ? '\u2014' : `${component.points}/${component.maxPoints}`}
      </span>
    </div>
  );
}
