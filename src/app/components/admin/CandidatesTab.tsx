/**
 * src/app/components/admin/CandidatesTab.tsx — Admin candidates tab.
 *
 * Summary row, taxonomy coverage, candidates table with rescan + inline scoring.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Candidate } from '@/types/candidate';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from '@/app/components/search/ScoreBadges';
import { InfoIconButton } from '@/app/components/profile/InfoBadge';
import { getAllCandidates, getLanguageTaxonomy } from '@/handlers/candidates';
import { enqueueRescanJob } from '@/pipeline/queue';
import { buildEvaluationPrompt } from './eval-prompt';
import { EvaluationContext, InlineScoreStepper } from './EvaluationPanel';
import { RescanModal } from './RescanModal';

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
      <h2 className="text-base font-semibold text-th-text-primary mb-4">Candidates</h2>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Candidates" value={totalCount} />
        <SummaryCard label="AI Maturity Scored" value={scoredCount} />
        <SummaryCard label="Stale" value={staleCount} />
      </div>

      {/* Taxonomy coverage */}
      {languageTaxonomy && languageTaxonomy.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-th-text-secondary uppercase tracking-wide mb-2">
            Language Coverage
          </h3>
          <div className="flex flex-wrap gap-2">
            {languageTaxonomy.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-inset text-xs"
              >
                <span className="font-mono text-th-text-primary">{item.displayName}</span>
                <span className="text-th-text-muted">{item.candidateCount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-inset rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Candidates table */}
      {candidates && candidates.length > 0 && (
        <div className="border border-border rounded-lg overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 px-4 py-2 bg-surface text-xs font-medium text-th-text-secondary border-b border-border min-w-[600px]">
            <span>Username</span>
            <span>Skill Score</span>
            <span>AI Maturity</span>
            <span>Last Scanned</span>
            <span>Status</span>
            <span className="whitespace-nowrap">
              Actions
              <InfoIconButton tooltip="Rescan: re-queue the scan pipeline. Evaluate: copy AI maturity evaluation prompt to clipboard." />
            </span>
          </div>
          {candidates.map((candidate) => (
            <CandidateRow key={candidate.id} candidate={candidate} />
          ))}
        </div>
      )}

      {candidates && candidates.length === 0 && (
        <p className="text-sm text-th-text-muted text-center py-8">No candidates yet.</p>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-raised rounded-lg border border-border p-4">
      <p className="text-xs text-th-text-secondary">{label}</p>
      <p className="text-2xl font-semibold text-th-text-primary mt-1">{value}</p>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: Candidate & { id: string } }) {
  const [expanded, setExpanded] = useState(false);
  const [showRescan, setShowRescan] = useState(false);
  const queryClient = useQueryClient();

  const rescanMutation = useMutation({
    mutationFn: async (githubToken?: string) => {
      await enqueueRescanJob({
        targetType: 'candidate',
        targetId: candidate.githubUsername,
        githubToken,
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
        className={`grid grid-cols-6 gap-2 px-4 py-2 border-b border-border text-xs items-center cursor-pointer hover:bg-th-hover min-w-[600px] ${
          candidate.isStale ? 'bg-amber-50' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1.5">
          <a
            href={`/candidates/${candidate.githubUsername}`}
            onClick={(e) => e.stopPropagation()}
            title="View full profile"
            className="text-th-text-muted hover:text-indigo-600 transition-colors flex-shrink-0"
          >
            <UserIcon />
          </a>
          <span className="font-mono text-th-text-primary">{candidate.githubUsername}</span>
        </span>
        <span><SkillScoreBadge score={candidate.skillScore} /></span>
        <span><AIMaturityBadge score={candidate.aiMaturityScore} /></span>
        <span className="text-th-text-secondary">{lastScannedDate}</span>
        <span><StalenessTag isStale={candidate.isStale} /></span>
        <span className="flex items-center gap-1">
          <ActionButton
            title="Rescan candidate"
            disabled={rescanMutation.isPending}
            onClick={(e) => { e.stopPropagation(); setShowRescan(true); }}
          >
            <RefreshIcon />
          </ActionButton>
          <ActionButton
            title="Copy evaluation prompt"
            onClick={(e) => {
              e.stopPropagation();
              void navigator.clipboard.writeText(buildEvaluationPrompt(candidate));
            }}
          >
            <ClipboardIcon />
          </ActionButton>
        </span>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-surface border-b border-border space-y-3">
          <EvaluationContext candidate={candidate} />
          <InlineScoreStepper candidate={candidate} />
        </div>
      )}

      {showRescan && (
        <RescanModal
          username={candidate.githubUsername}
          onConfirm={(token) => {
            setShowRescan(false);
            rescanMutation.mutate(token);
          }}
          onCancel={() => setShowRescan(false)}
        />
      )}
    </>
  );
}

// ─── Shared Action Button ────────────────────────────────────────────────────

function ActionButton({ title, disabled, onClick, children }: {
  title: string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1 rounded text-th-text-muted hover:text-indigo-600 hover:bg-surface-inset transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ─── SVG Icons (14x14) ──────────────────────────────────────────────────────

function UserIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm4.735 2.692A5.99 5.99 0 0 0 8 8.5a5.99 5.99 0 0 0-4.735 2.192A7.96 7.96 0 0 0 8 16a7.96 7.96 0 0 0 4.735-5.308Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.5 8a5.5 5.5 0 0 1 9.68-3.578l.002.002L10.5 6H15V1.5l-1.79 1.79A7.5 7.5 0 0 0 .5 8h2Zm11 0a5.5 5.5 0 0 1-9.68 3.578l-.002-.002L5.5 10H1v4.5l1.79-1.79A7.5 7.5 0 0 0 15.5 8h-2Z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
      <path d="M6.5 0A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3ZM5 2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Z" />
      <path d="M3 2.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-10a1 1 0 0 0-1-1h-1v1h1v10H3v-10h1v-1H3Z" />
    </svg>
  );
}
