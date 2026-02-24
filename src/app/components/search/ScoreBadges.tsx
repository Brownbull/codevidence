/**
 * src/app/components/search/ScoreBadges.tsx — Score display components.
 *
 * Exports:
 * - SkillScoreBadge: indigo circle with score number
 * - AIMaturityBadge: violet pip bar with level label
 * - StalenessTag: stale indicator badge
 */

import React from 'react';

// ─── SkillScoreBadge ─────────────────────────────────────────────────────────

interface SkillScoreBadgeProps {
  score: number;
}

/** Indigo circle badge: ● 87 */
export function SkillScoreBadge({ score }: SkillScoreBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span className="text-indigo-600">{'\u25CF'}</span>
      <span className="text-indigo-700 font-semibold">{score}</span>
    </span>
  );
}

// ─── AIMaturityBadge ─────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<number, string> = {
  0: 'Level 0 \u2014 No AI signals',
  1: 'Level 1 \u2014 AI Tool Present',
  2: 'Level 2 \u2014 Active AI Usage',
  3: 'Level 3 \u2014 AI-Integrated',
  4: 'Level 4 \u2014 AI-Native',
  5: 'Level 5 \u2014 AI-First',
};

interface AIMaturityBadgeProps {
  score: number | null;
}

/** Violet pip bar: ████░░ Lvl 3 or Not evaluated for null */
export function AIMaturityBadge({ score }: AIMaturityBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-mono text-slate-300">{'\u2591\u2591\u2591\u2591\u2591'}</span>
        <span className="text-th-text-muted italic">Not evaluated</span>
      </span>
    );
  }

  const filled = Math.min(score, 5);
  const empty = 5 - filled;
  const pips = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  const label = LEVEL_LABELS[score] ?? `Level ${score}`;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="font-mono text-violet-500">{pips}</span>
      <span className="text-violet-700">{label}</span>
    </span>
  );
}

// ─── StalenessTag ────────────────────────────────────────────────────────────

interface StalenessTagProps {
  isStale: boolean;
}

export function StalenessTag({ isStale }: StalenessTagProps) {
  if (!isStale) return null;

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
      Stale
    </span>
  );
}
