/**
 * src/app/pages/CandidateProfilePage.tsx — Candidate profile page.
 *
 * Loads candidate by :id (GitHub username) and linked repositories.
 * Renders seven evidence sections: score breakdown, skills, analysis details, position affinity,
 * repositories, ai-signals, growth evolution.
 * Back navigation preserves search filter state via URL.
 */
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Candidate } from '@/types/candidate';
import { AppShell } from '@/app/components/layout/AppShell';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from '@/app/components/search/ScoreBadges';
import {
  SkillsSection,
  RepoAndSignalsSection,
} from '@/app/components/profile/EvidenceSection';
import { PositionAffinitySection } from '@/app/components/profile/PositionAffinitySection';
import { ScoreBreakdownSection } from '@/app/components/profile/ScoreBreakdownSection';
import { AnalysisDetailsSection } from '@/app/components/profile/AnalysisDetailsSection';
import { EvolutionSection } from '@/app/components/profile/EvolutionSection';
import { MailIcon, PinIcon, OrgIcon, LinkIcon, PeopleIcon } from '@/app/components/profile/ProfileIcons';
import { useCandidate, useCandidateRepos } from '@/app/hooks/useCandidate';
import { reconstructScoreBreakdown, applyPositionWeights } from '@/app/utils/score-breakdown';
import { POSITION_PROFILES, getPositionProfile } from '@/app/utils/position-weights';

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const username = id ?? '';
  const { data: candidate, isLoading } = useCandidate(username);
  const { data: repos } = useCandidateRepos(username);

  const [positionId, setPositionId] = useState<string>('');
  const generalBreakdown = useMemo(
    () => candidate ? reconstructScoreBreakdown(candidate, repos ?? []) : null,
    [candidate, repos],
  );
  const breakdown = useMemo(() => {
    if (!generalBreakdown) return null;
    if (!positionId) return generalBreakdown;
    const profile = getPositionProfile(positionId);
    if (!profile) return generalBreakdown;
    return applyPositionWeights(generalBreakdown, profile);
  }, [generalBreakdown, positionId]);
  const selectedPosition = positionId ? getPositionProfile(positionId) : undefined;
  const positionScores = useMemo(() => {
    if (!generalBreakdown) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const p of POSITION_PROFILES) {
      const wb = applyPositionWeights(generalBreakdown, p);
      map.set(p.id, wb.weightedTotal ?? 0);
    }
    return map;
  }, [generalBreakdown]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-24 bg-surface-inset rounded-lg animate-pulse" />
          <div className="h-48 bg-surface-inset rounded-lg animate-pulse" />
          <div className="h-36 bg-surface-inset rounded-lg animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!candidate || !breakdown) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center mt-16">
          <p className="text-th-text-secondary font-medium">Candidate not found</p>
          <p className="text-sm text-th-text-muted mt-1">
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
          className="text-sm text-th-text-muted hover:text-th-text-secondary mb-4 inline-block"
        >
          &larr; Back to search
        </Link>

        {/* Header */}
        <div className="bg-surface-raised rounded-lg border border-border p-4 md:p-5 mb-4">
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
              {/* Name + username + GitHub link */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold text-th-text-primary">
                  {candidate.name ?? candidate.githubUsername}
                </h1>
                {candidate.name && (
                  <span className="text-sm text-th-text-muted">{candidate.githubUsername}</span>
                )}
                <a
                  href={candidate.githubProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-th-text-muted hover:text-indigo-600"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Profile &rarr;
                </a>
                {candidate.hireable && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    Hireable
                  </span>
                )}
              </div>

              {/* Bio */}
              {candidate.bio && (
                <p className="text-xs text-th-text-secondary mt-1 line-clamp-2">{candidate.bio}</p>
              )}

              {/* Scores */}
              <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                <SkillScoreBadge score={candidate.skillScore} />
                <AIMaturityBadge score={candidate.aiMaturityScore} />
                <StalenessTag isStale={candidate.isStale} />
              </div>

              {/* Contact & profile details */}
              <ProfileDetails candidate={candidate} />

              {/* Scan metadata */}
              <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-th-text-muted flex-wrap">
                <span>Last scanned: {lastScannedDate}</span>
                <span>{candidate.commitSpanMonths}mo commit span</span>
                <span>{candidate.repoCount} repo{candidate.repoCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Position evaluation selector */}
        <PositionSelector
          positionId={positionId}
          onChange={setPositionId}
          description={selectedPosition?.description}
          scores={positionScores}
          generalScore={generalBreakdown?.total ?? 0}
        />

        {/* Evidence sections */}
        <div className="space-y-4">
          <ScoreBreakdownSection breakdown={breakdown} />
          <SkillsSection candidate={candidate} />
          <AnalysisDetailsSection candidate={candidate} />
          <PositionAffinitySection candidate={candidate} />
          <RepoAndSignalsSection candidate={candidate} repos={repos ?? []} />
          <EvolutionSection candidate={candidate} />
        </div>
      </div>
    </AppShell>
  );
}

/** Renders contact details and profile metadata as icon+text pairs. */
function ProfileDetails({ candidate }: { candidate: Candidate }) {
  const hasAny = candidate.email || candidate.location || candidate.company ||
    candidate.websiteUrl || candidate.followers;

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-th-text-muted flex-wrap">
      {candidate.email && (
        <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
          <MailIcon />
          {candidate.email}
        </a>
      )}
      {candidate.location && (
        <span className="inline-flex items-center gap-1">
          <PinIcon />
          {candidate.location}
        </span>
      )}
      {candidate.company && (
        <span className="inline-flex items-center gap-1">
          <OrgIcon />
          {candidate.company}
        </span>
      )}
      {candidate.websiteUrl && (
        <a
          href={candidate.websiteUrl.startsWith('http') ? candidate.websiteUrl : `https://${candidate.websiteUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-indigo-600"
        >
          <LinkIcon />
          {candidate.websiteUrl.replace(/^https?:\/\//, '')}
        </a>
      )}
      {candidate.followers != null && candidate.followers > 0 && (
        <span className="inline-flex items-center gap-1">
          <PeopleIcon />
          {candidate.followers.toLocaleString()} {candidate.followers === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  );
}

// ─── Position Selector ──────────────────────────────────────────────────────

function PositionSelector({
  positionId,
  onChange,
  description,
  scores,
  generalScore,
}: {
  positionId: string;
  onChange: (id: string) => void;
  description?: string;
  scores: Map<string, number>;
  generalScore: number;
}) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <label htmlFor="position-select" className="text-xs font-medium text-th-text-secondary whitespace-nowrap">
        Evaluate as:
      </label>
      <select
        id="position-select"
        value={positionId}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs rounded-md border border-border bg-surface-raised text-th-text-primary px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">General (all weights equal) — {generalScore}/100</option>
        {POSITION_PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.icon} {p.label} — {scores.get(p.id) ?? 0}/100
          </option>
        ))}
      </select>
      {description && (
        <span className="text-xs text-th-text-muted italic">{description}</span>
      )}
    </div>
  );
}

