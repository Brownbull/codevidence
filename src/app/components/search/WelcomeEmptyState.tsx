/**
 * src/app/components/search/WelcomeEmptyState.tsx — Onboarding empty state.
 *
 * Shown when no filters are selected. Helps first-time recruiters understand
 * what the tool does, shows pool statistics, and offers quick-start presets.
 */

import React from 'react';
import { usePoolStats } from '@/app/hooks/usePoolStats';
import { useSearchQuery } from '@/app/hooks/useSearchQuery';

interface Preset {
  label: string;
  filters: Record<string, string[]>;
}

const PRESETS: Preset[] = [
  {
    label: 'TypeScript + React',
    filters: { lang: ['language:typescript'], framework: ['framework:react'] },
  },
  {
    label: 'Python + FastAPI',
    filters: { lang: ['language:python'], framework: ['framework:fastapi'] },
  },
  {
    label: 'Go developers',
    filters: { lang: ['language:go'] },
  },
  {
    label: 'AI-native devs',
    filters: { aiPattern: ['ai-agent-pattern:co-authored-by-ai'] },
  },
  {
    label: 'Full-stack (TS + Next.js)',
    filters: { lang: ['language:typescript'], framework: ['framework:nextjs'] },
  },
];

export function WelcomeEmptyState() {
  const { data: stats } = usePoolStats();
  const { setFilter } = useSearchQuery();

  function applyPreset(preset: Preset) {
    for (const [category, ids] of Object.entries(preset.filters)) {
      setFilter(category as 'lang' | 'framework' | 'tool' | 'aiPattern', ids);
    }
  }

  return (
    <div className="mt-8 max-w-xl mx-auto text-center">
      <div className="bg-surface-raised border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-th-text-primary">
          Discover verified developer talent
        </h2>
        <p className="text-sm text-th-text-secondary mt-2">
          Search candidates by programming languages, frameworks, tools, and AI maturity
          — backed by real commit-level evidence from public GitHub repositories.
        </p>

        {stats && (
          <div className="flex justify-center gap-6 mt-4">
            <StatBadge value={stats.candidateCount} label="candidates" />
            <StatBadge value={stats.repoCount} label="repos scanned" />
          </div>
        )}

        <div className="mt-5">
          <p className="text-xs text-th-text-muted mb-2">Quick start</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-th-text-muted mt-4">
          Or select filters in the panel to build a custom search.
        </p>
      </div>
    </div>
  );
}

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <span className="text-xl font-semibold text-th-text-primary font-mono">
        {value.toLocaleString()}
      </span>
      <span className="block text-xs text-th-text-muted">{label}</span>
    </div>
  );
}
