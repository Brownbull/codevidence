/**
 * src/app/components/admin/EvaluationPanel.tsx — Evaluation context + score stepper.
 *
 * Shows AI evidence summary, skills snapshot, level guidelines, and
 * the inline 0–5 score stepper for AI Maturity evaluation.
 */

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Candidate } from '@/types/candidate';
import { useAuth } from '@/app/auth/AuthContext';
import { updateAiMaturityScore } from '@/handlers/candidates';

const LEVEL_GUIDELINES = [
  { level: 0, hint: 'No AI config files, no co-authored commits, no agent patterns.' },
  { level: 1, hint: 'Has AI config files (e.g. .cursorrules) but minimal customization.' },
  { level: 2, hint: 'Multiple AI config files, some evolved/customized, or co-authored commits.' },
  { level: 3, hint: 'Deeply customized AI configs across repos, clear agent workflow patterns.' },
  { level: 4, hint: 'Development approach built around AI — CLAUDE.md, multi-tool configs, original patterns.' },
  { level: 5, hint: 'Architects entire projects around AI agents. Multi-agent setups, AI-first design.' },
];

export function EvaluationContext({ candidate }: { candidate: Candidate & { id: string } }) {
  const hasSignals = candidate.aiToolingSignals.length > 0 || candidate.aiAgentPatterns.length > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-th-text-secondary font-medium mb-1">AI Evidence</p>
          {hasSignals ? (
            <div className="space-y-0.5">
              {candidate.aiToolingSignals.length > 0 && (
                <p className="text-th-text-primary">
                  <span className="text-th-text-muted">Config files:</span>{' '}
                  {candidate.aiToolingSignals.join(', ')}
                </p>
              )}
              {candidate.aiAgentPatterns.length > 0 && (
                <p className="text-th-text-primary">
                  <span className="text-th-text-muted">Patterns:</span>{' '}
                  {candidate.aiAgentPatterns.map((p) => p.split(':')[1] ?? p).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-th-text-muted italic">No AI signals detected</p>
          )}
        </div>
        <div>
          <p className="text-th-text-secondary font-medium mb-1">Skills Snapshot</p>
          <div className="space-y-0.5">
            {candidate.detectedLanguages.length > 0 && (
              <p className="text-th-text-primary">
                <span className="text-th-text-muted">Lang:</span>{' '}
                {candidate.detectedLanguages.map((l) => l.split(':')[1]).join(', ')}
              </p>
            )}
            {candidate.detectedFrameworks.length > 0 && (
              <p className="text-th-text-primary">
                <span className="text-th-text-muted">FW:</span>{' '}
                {candidate.detectedFrameworks.map((f) => f.split(':')[1]).join(', ')}
              </p>
            )}
            <p className="text-th-text-muted">
              {candidate.repoCount} repos · {candidate.commitSpanMonths}mo span
            </p>
          </div>
        </div>
      </div>

      <details className="text-xs">
        <summary className="text-th-text-muted cursor-pointer hover:text-th-text-secondary">
          Level guidelines
        </summary>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pl-2">
          {LEVEL_GUIDELINES.map((g) => (
            <p key={g.level} className="text-th-text-muted">
              <span className="font-medium text-th-text-secondary">L{g.level}</span>{' '}
              {g.hint}
            </p>
          ))}
        </div>
      </details>

      <a
        href={`/candidates/${candidate.githubUsername}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
      >
        Open full profile &rarr;
      </a>
    </div>
  );
}

export function InlineScoreStepper({ candidate }: { candidate: Candidate & { id: string } }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scoreMutation = useMutation({
    mutationFn: async (score: number) => {
      if (!user) throw new Error('Not authenticated');
      await updateAiMaturityScore(candidate.id, score, user.uid);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-candidates'] });
      void queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
    },
  });

  return (
    <div>
      <p className="text-xs text-th-text-secondary mb-2">AI Maturity Score</p>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => scoreMutation.mutate(level)}
            disabled={scoreMutation.isPending}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              candidate.aiMaturityScore === level
                ? 'bg-violet-600 text-white'
                : 'bg-surface-raised border border-slate-300 text-th-text-secondary hover:bg-violet-50 hover:border-violet-300'
            } disabled:opacity-50`}
          >
            {level}
          </button>
        ))}
      </div>
      {scoreMutation.isSuccess && (
        <p className="text-xs text-green-600 mt-1">Score saved.</p>
      )}
    </div>
  );
}
