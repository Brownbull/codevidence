/**
 * src/app/components/search/ScoreBadges.tsx — Score display components.
 *
 * Exports:
 * - SkillScoreBadge: indigo circle with score number
 * - AIMaturityBadge: violet pip bar with level label
 * - StalenessTag: stale indicator badge
 */

import React, { useState } from 'react';

// ─── SkillScoreBadge ─────────────────────────────────────────────────────────

interface SkillScoreBadgeProps {
  score: number;
}

const SKILL_SCORE_TOOLTIP =
  'Skill Score (0\u2013100) \u2014 18-component formula:\n' +
  'Core: language(15) + frameworks(20) + tools(9) + span(7) + ownership(8) + tests(10) + AI(7) + proficiency(14) + domain(10)\n' +
  'Extras: imports, depth, quality, durability, behavioral, commits, design, style, evolution\n' +
  'Raw total clamped to 100. See Score Breakdown for details.';

/** Indigo circle badge: ● 87 with info tooltip */
export function SkillScoreBadge({ score }: SkillScoreBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span className="text-indigo-600">{'\u25CF'}</span>
      <span className="text-indigo-700 font-semibold">{score}</span>
      <span className="relative inline-flex items-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowTip(!showTip); }}
          onBlur={() => setShowTip(false)}
          className="text-th-text-muted hover:text-th-text-secondary transition-colors leading-none ml-0.5"
          aria-label="Skill Score info"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM7.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM7.25 7a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V7Z" />
          </svg>
        </button>
        {showTip && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-2 rounded bg-slate-900 text-white text-xs leading-snug shadow-lg z-50 pointer-events-none whitespace-pre-line">
            {SKILL_SCORE_TOOLTIP}
          </span>
        )}
      </span>
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

const MATURITY_TOOLTIP =
  'Manually assigned by a human evaluator.\n' +
  'L0: No AI signals. L1: AI tool present. L2: Active AI usage. ' +
  'L3: AI-integrated. L4: AI-native. L5: AI-first.\n' +
  '"Not evaluated" = no human has reviewed this candidate yet.';

/** Violet pip bar: ████░░ Lvl 3 or Not evaluated for null */
export function AIMaturityBadge({ score }: AIMaturityBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  const infoButton = (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowTip(!showTip); }}
        onBlur={() => setShowTip(false)}
        className="text-th-text-muted hover:text-th-text-secondary transition-colors leading-none ml-0.5"
        aria-label="AI Maturity info"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM7.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM7.25 7a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V7Z" />
        </svg>
      </button>
      {showTip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-2 rounded bg-slate-900 text-white text-xs leading-snug shadow-lg z-50 pointer-events-none whitespace-pre-line">
          {MATURITY_TOOLTIP}
        </span>
      )}
    </span>
  );

  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-mono text-slate-300">{'\u2591\u2591\u2591\u2591\u2591'}</span>
        <span className="text-th-text-muted italic">Not evaluated</span>
        {infoButton}
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
      {infoButton}
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
