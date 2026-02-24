/**
 * src/app/components/admin/PipelineTab.tsx — Discovery run form.
 *
 * Two modes:
 *   1. Scan Developer — enter a GitHub username to scan all their repos
 *   2. Discovery Run — advanced GitHub search query with preset helpers
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueueDiscover } from '@/app/hooks/useAdmin';
import { hasActivePatExpiryFlag } from '@/handlers/pat-expiry';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const usernameSchema = z.object({
  username: z.string().min(1, 'Username is required').regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    'Invalid GitHub username',
  ),
});

const discoverSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  source: z.enum(['github']),
  limit: z.number().min(1).max(1000),
});

type UsernameFormData = z.infer<typeof usernameSchema>;
type DiscoverFormData = z.infer<typeof discoverSchema>;

// ─── Query Presets ───────────────────────────────────────────────────────────

interface QueryPreset {
  label: string;
  query: string;
  category: 'language' | 'framework' | 'ai-patterns';
}

const QUERY_PRESETS: QueryPreset[] = [
  // Languages
  { label: 'Python', query: 'language:python stars:>50', category: 'language' },
  { label: 'TypeScript', query: 'language:typescript stars:>50', category: 'language' },
  { label: 'Rust', query: 'language:rust stars:>20', category: 'language' },
  { label: 'Go', query: 'language:go stars:>50', category: 'language' },
  { label: 'Java', query: 'language:java stars:>50', category: 'language' },

  // Frameworks
  { label: 'FastAPI', query: 'fastapi language:python stars:>10', category: 'framework' },
  { label: 'Django', query: 'django language:python stars:>10', category: 'framework' },
  { label: 'Next.js', query: 'nextjs language:typescript stars:>20', category: 'framework' },
  { label: 'Express', query: 'express language:typescript stars:>10', category: 'framework' },
  { label: 'React', query: 'react language:typescript stars:>20', category: 'framework' },

  // AI Patterns
  { label: 'Claude users', query: 'filename:CLAUDE.md path:/', category: 'ai-patterns' },
  { label: 'Cursor users', query: 'filename:.cursorrules OR path:.cursor/rules', category: 'ai-patterns' },
  { label: 'Aider users', query: 'filename:.aider.conf.yml', category: 'ai-patterns' },
  { label: 'Copilot configured', query: 'path:.github filename:copilot-instructions.md', category: 'ai-patterns' },
  { label: 'AI co-authored', query: '"Co-Authored-By" "copilot" OR "claude" OR "cursor"', category: 'ai-patterns' },
];

const PRESET_CATEGORIES: { key: QueryPreset['category']; label: string }[] = [
  { key: 'language', label: 'Languages' },
  { key: 'framework', label: 'Frameworks' },
  { key: 'ai-patterns', label: 'AI Patterns' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function PipelineTab() {
  const queueDiscover = useQueueDiscover();

  // ── Scan Developer form ──
  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const onScanDeveloper = async (data: UsernameFormData) => {
    await queueDiscover.mutateAsync({
      query: `user:${data.username}`,
      source: 'github',
      limit: 100,
    });
    usernameForm.reset();
  };

  // ── Discovery Run form ──
  const discoverForm = useForm<DiscoverFormData>({
    resolver: zodResolver(discoverSchema),
    defaultValues: { query: '', source: 'github', limit: 100 },
  });

  const onDiscover = async (data: DiscoverFormData) => {
    await queueDiscover.mutateAsync(data);
    discoverForm.reset();
  };

  // ── Fill query from preset ──
  const [showPresets, setShowPresets] = useState(false);

  function applyPreset(preset: QueryPreset): void {
    discoverForm.setValue('query', preset.query, { shouldValidate: true });
    setShowPresets(false);
  }

  // ── PAT expiry check ──
  const { data: patExpired } = useQuery({
    queryKey: ['pat-expiry-flag'],
    queryFn: hasActivePatExpiryFlag,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-8">
      {patExpired && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            GitHub API authentication error — PAT may have expired.
          </p>
          <p className="text-xs text-red-600 mt-1">
            Check your GITHUB_PAT env var.
          </p>
        </div>
      )}

      {/* ── Scan Developer ── */}
      <section>
        <h2 className="text-sm font-semibold text-th-text-primary mb-1">Scan Developer</h2>
        <p className="text-xs text-th-text-secondary mb-3">
          Enter a GitHub username to scan all their public repositories.
        </p>

        <form
          onSubmit={(e) => void usernameForm.handleSubmit(onScanDeveloper)(e)}
          className="max-w-lg flex gap-2 items-start"
        >
          <div className="flex-1">
            <input
              type="text"
              {...usernameForm.register('username')}
              disabled={usernameForm.formState.isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              placeholder="e.g. torvalds"
              data-testid="scan-username-input"
            />
            {usernameForm.formState.errors.username && (
              <p className="text-xs text-red-500 mt-1">
                {usernameForm.formState.errors.username.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={usernameForm.formState.isSubmitting}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            data-testid="scan-username-button"
          >
            {usernameForm.formState.isSubmitting ? 'Queuing...' : 'Scan'}
          </button>
        </form>

        {queueDiscover.isSuccess && usernameForm.formState.isSubmitSuccessful && (
          <p className="text-xs text-green-600 mt-2">Developer scan queued successfully.</p>
        )}
      </section>

      <hr className="border-border" />

      {/* ── Discovery Run ── */}
      <section>
        <h2 className="text-sm font-semibold text-th-text-primary mb-1">Discovery Run</h2>
        <p className="text-xs text-th-text-secondary mb-3">
          Search GitHub repositories with a query. Use presets or write your own&nbsp;
          <a
            href="https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline"
          >
            GitHub search syntax
          </a>.
        </p>

        <form
          onSubmit={(e) => void discoverForm.handleSubmit(onDiscover)(e)}
          className="max-w-lg space-y-4"
        >
          {/* Query with preset toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="discover-query" className="text-xs font-medium text-th-text-primary">
                Query <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPresets((v) => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {showPresets ? 'Hide presets' : 'Show presets'}
              </button>
            </div>

            {showPresets && (
              <div className="mb-2 p-3 bg-surface border border-border rounded-md space-y-2">
                {PRESET_CATEGORIES.map(({ key, label }) => (
                  <div key={key}>
                    <span className="text-[10px] uppercase tracking-wider text-th-text-muted font-semibold">
                      {label}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {QUERY_PRESETS.filter((p) => p.category === key).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-2 py-0.5 text-xs bg-surface-raised border border-slate-300 rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              id="discover-query"
              type="text"
              {...discoverForm.register('query')}
              disabled={discoverForm.formState.isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              placeholder="e.g. python fastapi stars:>50"
            />
            {discoverForm.formState.errors.query && (
              <p className="text-xs text-red-500 mt-1">
                {discoverForm.formState.errors.query.message}
              </p>
            )}
          </div>

          {/* Source */}
          <div>
            <label htmlFor="discover-source" className="block text-xs font-medium text-th-text-primary mb-1">
              Source
            </label>
            <select
              id="discover-source"
              {...discoverForm.register('source')}
              disabled={discoverForm.formState.isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="github">GitHub</option>
            </select>
          </div>

          {/* Limit */}
          <div>
            <label htmlFor="discover-limit" className="block text-xs font-medium text-th-text-primary mb-1">
              Limit
            </label>
            <input
              id="discover-limit"
              type="number"
              {...discoverForm.register('limit', { valueAsNumber: true })}
              disabled={discoverForm.formState.isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              min={1}
              max={1000}
            />
            {discoverForm.formState.errors.limit && (
              <p className="text-xs text-red-500 mt-1">
                {discoverForm.formState.errors.limit.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={discoverForm.formState.isSubmitting}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {discoverForm.formState.isSubmitting ? 'Queuing...' : 'Queue Discovery'}
          </button>

          {queueDiscover.isSuccess && discoverForm.formState.isSubmitSuccessful && (
            <p className="text-xs text-green-600">Discovery job queued successfully.</p>
          )}
        </form>
      </section>
    </div>
  );
}
