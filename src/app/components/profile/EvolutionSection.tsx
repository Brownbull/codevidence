/**
 * src/app/components/profile/EvolutionSection.tsx — Cross-repo growth evolution.
 *
 * Shows how a candidate's skills have evolved across repositories over time.
 * Displays growth vector, 4 dimension trajectories, and adoption timeline.
 * Uses evolutionProfile from the Candidate document (computed in scoring layer).
 */

import React, { useState } from 'react';
import type { Candidate, EvolutionProfile, EvolutionDimension, AdoptionEvent } from '@/types/candidate';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoIconButton } from './InfoBadge';
import { TechIcon } from './TechIcon';

const SECTION_INFO =
  'Cross-repo evolution analysis. Tracks growth in tech sophistication, testing maturity, ' +
  'architecture complexity, and AI adoption across repositories over time.';

interface Props {
  candidate: Candidate;
}

export function EvolutionSection({ candidate }: Props) {
  const profile = candidate.evolutionProfile;

  if (!profile) {
    return (
      <CollapsibleSection
        title="Growth Evolution"
        count={0}
        infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
      >
        <p className="text-xs text-th-text-muted italic">
          Not enough repositories for evolution analysis (requires 2+).
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Growth Evolution"
      count={profile.reposSampled}
      infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
    >
      <div className="space-y-4">
        <GrowthVectorHeader profile={profile} bonus={candidate.evolutionBonus ?? 0} />
        <DimensionGrid profile={profile} />
        {(profile.adoptionTimeline?.length ?? 0) > 0 && (
          <AdoptionTimeline events={profile.adoptionTimeline} />
        )}
      </div>
    </CollapsibleSection>
  );
}

// ─── Growth Vector Header ───────────────────────────────────────────────────

function GrowthVectorHeader({ profile, bonus }: { profile: EvolutionProfile; bonus: number }) {
  const gv = profile.growthVector;
  const arrow = gv > 0.1 ? '\u2197' : gv < -0.1 ? '\u2198' : '\u2192';
  const color = gv >= 0.3 ? 'text-green-600' : gv >= 0 ? 'text-blue-600' : 'text-amber-600';

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-th-text-muted">Growth Vector:</span>
        <span className={`text-lg font-bold tabular-nums ${color}`}>
          {gv >= 0 ? '+' : ''}{gv.toFixed(2)} {arrow}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-th-text-muted">
        <span>{profile.reposSampled} repos sampled</span>
        <span>&middot;</span>
        <span>+{bonus} bonus pts</span>
      </div>
    </div>
  );
}

// ─── Dimension Grid ─────────────────────────────────────────────────────────

const DIMENSION_META: Record<string, { label: string; maxTier: number; info: string }> = {
  techSophistication: {
    label: 'Tech Sophistication', maxTier: 5,
    info: 'Tier 1=plain code, 2=framework, 3=typed+framework, 4=advanced fw, 5=infra+distributed. Each bar = one repo over time.',
  },
  testingMaturity: {
    label: 'Testing Maturity', maxTier: 4,
    info: 'Tier 0=none, 1=test dir, 2=test fw+coverage, 3=medium+coverage, 4=high+CI+E2E. Each bar = one repo over time.',
  },
  architectureComplexity: {
    label: 'Architecture', maxTier: 4,
    info: 'Tier 1=basic, 2=fw+DB, 3=fw+DB+cache/queue, 4=Docker+orchestration. Each bar = one repo over time.',
  },
  aiAdoption: {
    label: 'AI Adoption', maxTier: 3,
    info: 'Tier 0=none, 1=AI config file, 2=multiple configs or co-authored, 3=evolved+co-authored. Each bar = one repo.',
  },
};

function DimensionGrid({ profile }: { profile: EvolutionProfile }) {
  const dims = profile.dimensions;
  const entries: [string, EvolutionDimension][] = [
    ['techSophistication', dims.techSophistication],
    ['testingMaturity', dims.testingMaturity],
    ['architectureComplexity', dims.architectureComplexity],
    ['aiAdoption', dims.aiAdoption],
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map(([key, dim]) => (
        <DimensionCard key={key} dimKey={key} dimension={dim} />
      ))}
    </div>
  );
}

const TREND_STYLES: Record<string, { label: string; color: string }> = {
  'rapid-growth':  { label: 'Rapid Growth',  color: 'bg-green-100 text-green-700' },
  'steady-growth': { label: 'Steady Growth', color: 'bg-blue-100 text-blue-700' },
  'plateau':       { label: 'Plateau',       color: 'bg-slate-100 text-slate-600' },
  'regression':    { label: 'Regression',    color: 'bg-amber-100 text-amber-700' },
};

function DimensionCard({ dimKey, dimension }: { dimKey: string; dimension: EvolutionDimension }) {
  const meta = DIMENSION_META[dimKey] ?? { label: dimKey, maxTier: 5, info: '' };
  const trend = TREND_STYLES[dimension.trend] ?? TREND_STYLES.plateau!;

  return (
    <div className="rounded-md border border-border/50 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-th-text-primary flex items-center gap-1">
          {meta.label}
          <InfoIconButton tooltip={meta.info} />
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${trend.color}`}
          title={dimension.trend === 'regression'
            ? 'Regression may include learning/exploratory repos which lower the average — it does not necessarily indicate declining skill'
            : undefined}
        >
          {trend.label}
        </span>
      </div>
      <TrajectoryBars trajectory={dimension.trajectory} maxTier={meta.maxTier} />
      <div className="text-xs text-th-text-muted mt-1">
        slope: {dimension.slope >= 0 ? '+' : ''}{dimension.slope.toFixed(2)} tier/yr
      </div>
    </div>
  );
}

function TrajectoryBars({
  trajectory,
  maxTier,
}: {
  trajectory: { date: string; tier: number; repoName: string }[];
  maxTier: number;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  if (trajectory.length === 0) return null;

  const selected = selectedIdx !== null ? trajectory[selectedIdx] : null;

  return (
    <div>
      <div className="flex items-end gap-0.5 h-6">
        {trajectory.map((pt, i) => {
          const heightPct = maxTier > 0 ? (pt.tier / maxTier) * 100 : 0;
          const isActive = selectedIdx === i;
          return (
            <div
              key={`${pt.repoName}-${i}`}
              className={`flex-1 rounded-t-sm min-w-[3px] cursor-pointer transition-colors ${
                isActive ? 'bg-indigo-300' : 'bg-indigo-400 hover:bg-indigo-300'
              }`}
              style={{ height: `${Math.max(heightPct, 8)}%` }}
              onClick={() => setSelectedIdx(isActive ? null : i)}
            />
          );
        })}
      </div>
      {selected && (
        <div className="text-xs text-th-text-secondary mt-1 bg-surface-inset rounded px-1.5 py-0.5">
          {selected.repoName} — tier {selected.tier}/{maxTier} ({selected.date.slice(0, 10)})
        </div>
      )}
    </div>
  );
}

// ─── Adoption Timeline ──────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, string> = {
  language:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  framework: 'bg-blue-100 text-blue-700 border-blue-200',
  tool:      'bg-teal-100 text-teal-700 border-teal-200',
};

function AdoptionTimeline({ events }: { events: AdoptionEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_LIMIT = 15;
  const showToggle = events.length > COLLAPSED_LIMIT;
  const visible = expanded ? events : events.slice(0, COLLAPSED_LIMIT);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <h4 className="text-sm font-semibold text-th-text-primary">Adoption Timeline</h4>
        <InfoIconButton tooltip="First appearance of each technology across repos, in chronological order. Shows tech name, icon, and year adopted." />
        <span className="text-xs text-th-text-muted">({events.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((e) => <AdoptionBadge key={`${e.taxonomyId}-${e.repoName}`} event={e} />)}
        {showToggle && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-1"
          >
            {expanded ? 'show less' : `+${events.length - COLLAPSED_LIMIT} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function AdoptionBadge({ event }: { event: AdoptionEvent }) {
  const parts = event.taxonomyId.split(':');
  const techName = parts.length > 1 ? parts.slice(1).join(':') : event.taxonomyId;
  const badge = CATEGORY_BADGE[event.category] ?? CATEGORY_BADGE.tool!;
  const year = event.date.slice(0, 4);

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${badge}`}
      title={`${techName} \u2014 first seen in ${event.repoName} (${event.date.slice(0, 10)})`}
    >
      <TechIcon taxonomyId={event.taxonomyId} />
      <span>{techName}</span>
      <span className="opacity-50">{year}</span>
    </span>
  );
}
