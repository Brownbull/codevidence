/**
 * src/app/pages/CandidateProfilePage.tsx — Candidate profile page.
 *
 * Loads candidate by :id (GitHub username) and linked repositories.
 * Renders four evidence sections: skills, repositories, ai-signals, evolution.
 * Back navigation preserves search filter state via URL.
 */
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppShell } from '@/app/components/layout/AppShell';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from '@/app/components/search/ScoreBadges';
import {
  SkillsSection,
  RepositoriesSection,
  AiSignalsSection,
  EvolutionSection,
} from '@/app/components/profile/EvidenceSection';
import { useCandidate, useCandidateRepos } from '@/app/hooks/useCandidate';

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const username = id ?? '';
  const { data: candidate, isLoading } = useCandidate(username);
  const { data: repos } = useCandidateRepos(username);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-36 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!candidate) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center mt-16">
          <p className="text-slate-500 font-medium">Candidate not found</p>
          <p className="text-sm text-slate-400 mt-1">
            No candidate with username &ldquo;{username}&rdquo; exists.
          </p>
          <Link
            to="/search"
            className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to search
          </Link>
        </div>
      </AppShell>
    );
  }

  const lastScannedDate = candidate.lastScanned?.toDate?.()
    ? candidate.lastScanned.toDate().toLocaleDateString()
    : 'Unknown';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          to="/search"
          className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block"
        >
          &larr; Back to search
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 md:p-5 mb-4">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            {candidate.avatarUrl && (
              <img
                src={candidate.avatarUrl}
                alt=""
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-full flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold text-slate-900">
                  {candidate.githubUsername}
                </h1>
                <a
                  href={candidate.githubProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-indigo-600"
                >
                  GitHub Profile &rarr;
                </a>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                <SkillScoreBadge score={candidate.skillScore} />
                <AIMaturityBadge score={candidate.aiMaturityScore} />
                <StalenessTag isStale={candidate.isStale} />
              </div>

              <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                <span>Last scanned: {lastScannedDate}</span>
                <span>{candidate.commitSpanMonths}mo commit span</span>
                <span>{candidate.repoCount} repo{candidate.repoCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence sections */}
        <div className="space-y-4">
          <SkillsSection candidate={candidate} />
          <RepositoriesSection repos={repos ?? []} />
          <AiSignalsSection candidate={candidate} repos={repos ?? []} />
          <EvolutionSection repos={repos ?? []} />
        </div>
      </div>
    </AppShell>
  );
}
