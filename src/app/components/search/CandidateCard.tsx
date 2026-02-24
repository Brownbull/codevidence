/**
 * src/app/components/search/CandidateCard.tsx — Search result card.
 *
 * Shows: avatar, username, SkillScoreBadge, AIMaturityBadge,
 * top 3 matched skill tags, last_scanned date, StalenessTag.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { Candidate } from '@/types/candidate';
import { SkillScoreBadge, AIMaturityBadge, StalenessTag } from './ScoreBadges';

interface CandidateCardProps {
  candidate: Candidate & { id: string };
  matchedTags?: string[];
}

export function CandidateCard({ candidate, matchedTags = [] }: CandidateCardProps) {
  const topTags = matchedTags.slice(0, 3);
  const lastScannedDate = candidate.lastScanned?.toDate?.()
    ? candidate.lastScanned.toDate().toLocaleDateString()
    : 'Unknown';

  return (
    <Link
      to={`/candidates/${candidate.githubUsername}`}
      className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {candidate.avatarUrl && (
          <img
            src={candidate.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Top row: username + badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-sm text-slate-900">
              {candidate.githubUsername}
            </span>
            <SkillScoreBadge score={candidate.skillScore} />
            <AIMaturityBadge score={candidate.aiMaturityScore} />
            <StalenessTag isStale={candidate.isStale} />
          </div>

          {/* Matched tags */}
          {topTags.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {topTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-xs font-mono text-slate-600"
                >
                  {tag.split(':')[1] ?? tag}
                </span>
              ))}
            </div>
          )}

          {/* Last scanned */}
          <p className="text-xs text-slate-400 mt-1.5">
            Last scanned: {lastScannedDate}
          </p>
        </div>
      </div>
    </Link>
  );
}
