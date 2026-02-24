/**
 * src/app/components/admin/CandidatesTab.tsx — Admin candidates tab.
 *
 * Summary row, taxonomy coverage, candidates table with rescan + inline scoring.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Candidate } from '@/types/candidate';
import { useAuth } from '@/app/auth/AuthContext';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from '@/app/components/search/ScoreBadges';
import {
  getAllCandidates,
  getLanguageTaxonomy,
  updateAiMaturityScore,
} from '@/handlers/candidates';
import { enqueueRescanJob } from '@/pipeline/queue';

export function CandidatesTab() {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['admin-candidates'],
    queryFn: getAllCandidates,
    staleTime: 30_000,
  });

  const { data: languageTaxonomy } = useQuery({
    queryKey: ['admin-language-taxonomy'],
    queryFn: getLanguageTaxonomy,
    staleTime: 60_000,
  });

  const totalCount = candidates?.length ?? 0;
  const scoredCount = candidates?.filter((c) => c.aiMaturityScore !== null).length ?? 0;
  const staleCount = candidates?.filter((c) => c.isStale).length ?? 0;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Candidates</h2>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Candidates" value={totalCount} />
        <SummaryCard label="AI Maturity Scored" value={scoredCount} />
        <SummaryCard label="Stale" value={staleCount} />
      </div>

      {/* Taxonomy coverage */}
      {languageTaxonomy && languageTaxonomy.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Language Coverage
          </h3>
          <div className="flex flex-wrap gap-2">
            {languageTaxonomy.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-xs"
              >
                <span className="font-mono text-slate-700">{item.displayName}</span>
                <span className="text-slate-400">{item.candidateCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Candidates table */}
      {candidates && candidates.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-slate-50 text-xs font-medium text-slate-500 border-b border-slate-200 min-w-[600px]">
            <span>Username</span>
            <span>Skill Score</span>
            <span>AI Maturity</span>
            <span>Last Scanned</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {candidates.map((candidate) => (
            <CandidateRow key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}

      {candidates && candidates.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No candidates yet.</p>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: Candidate & { id: string } }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const rescanMutation = useMutation({
    mutationFn: async () => {
      await enqueueRescanJob({
        targetType: 'candidate',
        targetId: candidate.githubUsername,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
    },
  });

  const lastScannedDate = candidate.lastScanned?.toDate?.()
    ? candidate.lastScanned.toDate().toLocaleDateString()
    : 'Unknown';

  return (
    <>
      <div
        className={`grid grid-cols-6 gap-2 px-4 py-2 border-b border-slate-100 text-xs items-center cursor-pointer hover:bg-slate-50 min-w-[600px] ${
          candidate.isStale ? 'bg-amber-50' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-mono text-slate-700">{candidate.githubUsername}</span>
        <span><SkillScoreBadge score={candidate.skillScore} /></span>
        <span><AIMaturityBadge score={candidate.aiMaturityScore} /></span>
        <span className="text-slate-500">{lastScannedDate}</span>
        <span><StalenessTag isStale={candidate.isStale} /></span>
        <span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              rescanMutation.mutate();
            }}
            disabled={rescanMutation.isPending}
            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-[10px] transition-colors disabled:opacity-50"
          >
            {rescanMutation.isPending ? 'Queuing...' : 'Rescan'}
          </button>
        </span>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <InlineScoreStepper candidate={candidate} />
        </div>
      )}
    </>
  );
}

function InlineScoreStepper({ candidate }: { candidate: Candidate & { id: string } }) {
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
      <p className="text-xs text-slate-500 mb-2">AI Maturity Score</p>
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
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-violet-50 hover:border-violet-300'
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
