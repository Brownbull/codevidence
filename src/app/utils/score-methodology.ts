/**
 * src/app/utils/score-methodology.ts — Score naming, grouping, and methodology API.
 *
 * Types, phase labels, and lookup functions. Methodology content lives in
 * score-methodology-data.ts to keep both files under 300 lines.
 */

import { SCORE_METHODOLOGY_DATA, type ScoreMethodology } from './score-methodology-data';
export type { ScoreMethodology } from './score-methodology-data';

export const PHASE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  core: {
    label: 'Foundation',
    description: 'Baseline signals from repository metadata, dependencies, and high-level code patterns. These scores answer: "What does this developer work with?"',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  },
  phase2: {
    label: 'Validation',
    description: 'Deeper static analysis that verifies real usage beyond declared dependencies. These scores answer: "Are they actually using what they claim?"',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  phase3: {
    label: 'Craftsmanship',
    description: 'Git history analysis measuring code longevity, workflow habits, and communication quality. These scores answer: "How do they write and maintain code over time?"',
    icon: 'M11.42 15.17l-5.28-5.28a2 2 0 010-2.83l.18-.18a2 2 0 012.83 0l2.27 2.27 5.94-5.94a2 2 0 012.83 0l.18.18a2 2 0 010 2.83L11.42 15.17zM7.5 20h9',
  },
  phase4: {
    label: 'Architecture',
    description: 'Pattern recognition for design sophistication and code style discipline. These scores answer: "How well do they structure and organize code?"',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  phase5: {
    label: 'Growth',
    description: 'Cross-repository evolution tracking measuring how a developer\'s skills change over time. These scores answer: "Are they getting better?"',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
};

export const PHASE_ORDER = ['core', 'phase2', 'phase3', 'phase4', 'phase5'] as const;

export const SCORE_METHODOLOGY = SCORE_METHODOLOGY_DATA;

/** Lookup methodology by component ID. */
export function getMethodology(id: string): ScoreMethodology | undefined {
  return SCORE_METHODOLOGY.find((m) => m.id === id);
}

