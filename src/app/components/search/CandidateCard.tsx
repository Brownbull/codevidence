/**
 * src/app/components/search/CandidateCard.tsx — Enriched search result card.
 *
 * Shows: avatar, name + @username, location/company, bio snippet,
 * top 5 skill tags with TechIcon, best-fit position, score badges.
 * Compact layout (~120px max height).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { Candidate } from '@/types/candidate';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from './ScoreBadges';
import { TechIcon } from '@/app/components/profile/TechIcon';
import { computeAffinities } from '@/app/components/profile/position-affinity-data';

interface CandidateCardProps {
  candidate: Candidate & { id: string };
  matchedTags?: string[];
}

export function CandidateCard({ candidate, matchedTags = [] }: CandidateCardProps) {
  const topTags = getTopSkillTags(candidate, matchedTags, 5);
  const bestPosition = getBestPosition(candidate);
  const lastScannedDate = candidate.lastScanned?.toDate?.()
    ? candidate.lastScanned.toDate().toLocaleDateString()
    : 'Unknown';

  return (
    <Link
      to={`/candidates/${candidate.githubUsername}`}
      className="block bg-surface-raised rounded-lg border border-border p-4 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {candidate.avatarUrl && (
          <img
            src={candidate.avatarUrl}
            alt=""
            className="h-12 w-12 rounded-full flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Row 1: Name + username + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base text-th-text-primary truncate">
              {candidate.name ?? candidate.githubUsername}
            </span>
            {candidate.name && (
              <span className="text-sm text-th-text-muted">@{candidate.githubUsername}</span>
            )}
            <span className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              <SkillScoreBadge score={candidate.skillScore} />
              <AIMaturityBadge score={candidate.aiMaturityScore} />
              <StalenessTag isStale={candidate.isStale} />
            </span>
          </div>

          {/* Row 2: Location + company + bio */}
          <div className="flex items-center gap-3 mt-0.5 text-xs text-th-text-muted">
            {candidate.location && <span>{candidate.location}</span>}
            {candidate.company && <span>{candidate.company}</span>}
            {candidate.bio && (
              <span className="truncate max-w-xs">{candidate.bio}</span>
            )}
          </div>

          {/* Row 3: Skill tags + position hint + last scanned */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex gap-1.5">
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-inset text-xs font-mono text-th-text-secondary"
                >
                  <TechIcon taxonomyId={tag} />
                  {tag.split(':')[1] ?? tag}
                </span>
              ))}
            </div>
            {bestPosition && (
              <span className="text-xs text-indigo-600 font-medium">
                {bestPosition}
              </span>
            )}
            <span className="text-xs text-th-text-muted ml-auto flex-shrink-0">
              {lastScannedDate}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Prioritize matched filter tags first, then all skill tags, deduped, capped. */
function getTopSkillTags(candidate: Candidate, matchedTags: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  // Matched filter tags first
  for (const tag of matchedTags) {
    if (candidate.skillTags.includes(tag) && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
      if (result.length >= max) return result;
    }
  }

  // Fill with remaining skill tags (languages first, then frameworks, tools)
  for (const tag of candidate.skillTags) {
    if (!seen.has(tag) && !tag.startsWith('ai-agent-pattern:') && !tag.startsWith('domain:')) {
      seen.add(tag);
      result.push(tag);
      if (result.length >= max) return result;
    }
  }

  return result;
}

/** Returns best-fit position string or null. */
function getBestPosition(candidate: Candidate): string | null {
  try {
    const affinities = computeAffinities(candidate);
    if (affinities.length === 0) return null;
    const best = affinities[0] ?? null;
    if (!best || best.score < 30) return null;
    return `Best fit: ${best.role.label} (${best.score}%)`;
  } catch {
    return null;
  }
}
