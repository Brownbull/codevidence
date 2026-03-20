/**
 * src/app/pages/ScoreMethodologyPage.tsx — Score methodology deep-dive page.
 *
 * Explains every score component: what it measures, how it's calculated,
 * scoring tiers, caps, and edge cases. Accessible from candidate profiles.
 */
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppShell } from '@/app/components/layout/AppShell';
import {
  SCORE_METHODOLOGY,
  PHASE_LABELS,
  PHASE_ORDER,
  type ScoreMethodology,
} from '@/app/utils/score-methodology';

const PHASE_COLORS: Record<string, { border: string; badge: string; accent: string }> = {
  core:   { border: 'border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', accent: 'text-indigo-600' },
  phase2: { border: 'border-l-blue-500',   badge: 'bg-blue-100 text-blue-700',     accent: 'text-blue-600' },
  phase3: { border: 'border-l-teal-500',   badge: 'bg-teal-100 text-teal-700',     accent: 'text-teal-600' },
  phase4: { border: 'border-l-amber-500',  badge: 'bg-amber-100 text-amber-700',   accent: 'text-amber-600' },
  phase5: { border: 'border-l-violet-500', badge: 'bg-violet-100 text-violet-700', accent: 'text-violet-600' },
};

export function ScoreMethodologyPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const backTo: string = (location.state as { from?: string } | null)?.from ?? '/search';
  const backLabel = backTo.startsWith('/candidates/') ? 'Back to profile' : 'Back to search';

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <Link
          to={backTo}
          className="text-sm text-th-text-muted hover:text-th-text-secondary mb-4 inline-block"
        >
          &larr; {backLabel}
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-bold text-th-text-primary mb-2">Score Methodology</h1>
          <p className="text-sm text-th-text-secondary leading-relaxed">
            Every candidate receives a Skill Score from 0 to 100, computed from 19 individual
            components grouped into 5 analysis phases. The theoretical maximum across all components
            is ~176 points, clamped to 100. This page explains exactly how each component is measured,
            what the thresholds are, and why each signal matters.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-8 bg-surface-raised rounded-lg border border-border p-4">
          <h2 className="text-xs font-semibold text-th-text-muted uppercase tracking-wider mb-3">Contents</h2>
          <div className="space-y-3">
            {PHASE_ORDER.map((phase) => {
              const info = PHASE_LABELS[phase]!;
              const colors = PHASE_COLORS[phase]!;
              const components = SCORE_METHODOLOGY.filter((m) => m.phase === phase);
              return (
                <div key={phase}>
                  <a
                    href={`#phase-${phase}`}
                    className={`text-sm font-semibold ${colors.accent} hover:underline inline-flex items-center gap-1.5`}
                  >
                    <PhaseIcon path={info.icon} className={colors.accent} />
                    {info.label}
                  </a>
                  <div className="ml-4 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {components.map((c) => (
                      <a
                        key={c.id}
                        href={`#score-${c.id}`}
                        className="text-xs text-th-text-muted hover:text-th-text-secondary"
                      >
                        {c.name}
                        <span className="text-th-text-muted/50 ml-1">({c.maxPoints})</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-th-text-muted">
              Total maximum: {SCORE_METHODOLOGY.reduce((s, m) => s + m.maxPoints, 0)} raw points, clamped to 100.
            </p>
          </div>
        </nav>

        {/* Phase sections */}
        <div className="space-y-10">
          {PHASE_ORDER.map((phase) => (
            <PhaseSection key={phase} phase={phase} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function PhaseSection({ phase }: { phase: string }) {
  const info = PHASE_LABELS[phase];
  if (!info) return null;
  const colors = PHASE_COLORS[phase]!;
  const components = SCORE_METHODOLOGY.filter((m) => m.phase === phase);
  const phaseMax = components.reduce((s, c) => s + c.maxPoints, 0);

  return (
    <section id={`phase-${phase}`}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <PhaseIcon path={info.icon} className={colors.accent} size={20} />
          <h2 className={`text-lg font-bold ${colors.accent}`}>{info.label}</h2>
          <span className="text-xs text-th-text-muted tabular-nums">{phaseMax} pts max</span>
        </div>
        <p className="text-sm text-th-text-secondary mt-1">{info.description}</p>
      </div>

      <div className="space-y-4">
        {components.map((comp) => (
          <ScoreCard key={comp.id} methodology={comp} colors={colors} />
        ))}
      </div>
    </section>
  );
}

function PhaseIcon({ path, className, size = 14 }: { path: string; className: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
    >
      <path d={path} />
    </svg>
  );
}

function ScoreCard({
  methodology: m,
  colors,
}: {
  methodology: ScoreMethodology;
  colors: { border: string; badge: string; accent: string };
}) {
  const paragraphs = m.methodology.split('\n\n');

  return (
    <article
      id={`score-${m.id}`}
      className={`bg-surface-raised rounded-lg border border-border border-l-4 ${colors.border} p-4 scroll-mt-20`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-sm font-bold text-th-text-primary">{m.name}</h3>
          <p className="text-xs text-th-text-secondary mt-0.5">{m.summary}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${colors.badge}`}>
          {m.maxPoints} pts
        </span>
      </div>

      <div className="space-y-2 mt-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-xs text-th-text-secondary leading-relaxed">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
