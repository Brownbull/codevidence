/**
 * src/app/components/profile/EvidenceSection.tsx — Evidence section variants.
 *
 * Four variants: skills, repositories, ai-signals, evolution.
 * Each surfaces verifiable evidence from the scan pipeline.
 */

import React, { useState } from 'react';
import type { Candidate } from '@/types/candidate';
import type { Repository, AiConfigFileSignal } from '@/types/repository';

// ─── Skills Section ─────────────────────────────────────────────────────────

interface SkillsSectionProps {
  candidate: Candidate;
}

export function SkillsSection({ candidate }: SkillsSectionProps) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Skills</h3>

      <SkillGroup label="Languages" tags={candidate.detectedLanguages} />
      <SkillGroup label="Frameworks" tags={candidate.detectedFrameworks} />
      <SkillGroup label="Tools" tags={candidate.detectedTools} />
    </section>
  );
}

function SkillGroup({ label, tags }: { label: string; tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-xs font-mono text-slate-700"
          >
            {tag.split(':')[1] ?? tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Repositories Section ───────────────────────────────────────────────────

interface RepositoriesSectionProps {
  repos: (Repository & { id: string })[];
}

export function RepositoriesSection({ repos }: RepositoriesSectionProps) {
  if (repos.length === 0) {
    return (
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Repositories</h3>
        <p className="text-xs text-slate-400 italic">No repositories scanned yet.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Repositories ({repos.length})
      </h3>
      <div className="space-y-3">
        {repos.map((repo) => (
          <RepoRow key={repo.id} repo={repo} />
        ))}
      </div>
    </section>
  );
}

function RepoRow({ repo }: { repo: Repository & { id: string } }) {
  const commitSpan = repo.commitSpanMonths > 0
    ? `${repo.commitSpanMonths}mo span`
    : null;

  return (
    <div className="flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <div>
        <a
          href={repo.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          {repo.fullName}
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          {repo.primaryLanguage && (
            <span className="text-xs text-slate-500">{repo.primaryLanguage}</span>
          )}
          <span className="text-xs text-slate-400">{'\u2605'} {repo.starCount}</span>
          {commitSpan && (
            <span className="text-xs text-slate-400">{commitSpan}</span>
          )}
        </div>
      </div>
      <ScanStatusBadge status={repo.scanStatus} />
    </div>
  );
}

function ScanStatusBadge({ status }: { status: Repository['scanStatus'] }) {
  const colors: Record<string, string> = {
    surface: 'bg-slate-100 text-slate-500',
    layer1: 'bg-blue-100 text-blue-700',
    layer2: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

// ─── AI Signals Section ─────────────────────────────────────────────────────

interface AiSignalsSectionProps {
  candidate: Candidate;
  repos: (Repository & { id: string })[];
}

export function AiSignalsSection({ candidate, repos }: AiSignalsSectionProps) {
  const allConfigFiles = repos.flatMap((r) => r.aiConfigFiles ?? []);
  const hasCoAuthored = repos.some((r) => r.coAuthoredByAI);
  const hasPatterns = candidate.aiAgentPatterns.length > 0;
  const isEmpty = allConfigFiles.length === 0 && !hasCoAuthored && !hasPatterns;

  if (isEmpty) {
    return (
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Signals</h3>
        <p className="text-xs text-slate-400 italic">No AI tooling signals detected.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Signals</h3>

      {/* Config files */}
      {allConfigFiles.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1.5">AI Config Files</p>
          <div className="space-y-2">
            {allConfigFiles.map((signal, i) => (
              <AiConfigFileRow key={`${signal.fileName}-${i}`} signal={signal} />
            ))}
          </div>
        </div>
      )}

      {/* Co-authored chip */}
      {hasCoAuthored && (
        <div className="mb-3">
          <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-100 text-xs font-medium text-violet-700">
            Co-authored by AI
          </span>
        </div>
      )}

      {/* AI Agent Patterns */}
      {hasPatterns && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">AI Agent Patterns</p>
          <div className="flex flex-wrap gap-1.5">
            {candidate.aiAgentPatterns.map((pattern) => (
              <span
                key={pattern}
                className="inline-flex px-2 py-0.5 rounded-full bg-violet-50 text-xs font-mono text-violet-700"
              >
                {pattern.split(':')[1] ?? pattern}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AiConfigFileRow({ signal }: { signal: AiConfigFileSignal }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className="font-mono text-slate-700">{signal.fileName}</span>
        {signal.isEvolved && (
          <span className="px-1 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
            Evolved
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <span>{signal.modificationCount} modifications</span>
        <span className="text-slate-300">|</span>
        <span>{signal.diffComplexity}</span>
        <span className="text-slate-300">|</span>
        <span>{signal.originSignal}</span>
      </div>
    </div>
  );
}

// ─── Evolution Section ──────────────────────────────────────────────────────

interface EvolutionSectionProps {
  repos: (Repository & { id: string })[];
}

export function EvolutionSection({ repos }: EvolutionSectionProps) {
  const allConfigFiles = repos.flatMap((r) =>
    (r.aiConfigFiles ?? []).map((signal) => ({
      ...signal,
      repoName: r.fullName,
    }))
  );

  if (allConfigFiles.length === 0) {
    return (
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Evolution Timeline</h3>
        <p className="text-xs text-slate-400 italic">No AI config file history available.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">AI Evolution Timeline</h3>
      <div className="space-y-4">
        {allConfigFiles.map((signal, i) => (
          <EvolutionTimelineItem key={`${signal.repoName}-${signal.fileName}-${i}`} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function EvolutionTimelineItem({
  signal,
}: {
  signal: AiConfigFileSignal & { repoName: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const firstSeen = signal.firstDetectedAt?.toDate?.()
    ? signal.firstDetectedAt.toDate().toLocaleDateString()
    : 'Unknown';
  const lastMod = signal.lastModifiedAt?.toDate?.()
    ? signal.lastModifiedAt.toDate().toLocaleDateString()
    : 'Unknown';

  return (
    <div className="border-l-2 border-slate-200 pl-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-left w-full"
      >
        <span className="font-mono text-sm text-slate-700">{signal.fileName}</span>
        <span className="text-xs text-slate-400">in {signal.repoName}</span>
        <span className="text-xs text-slate-300 ml-auto">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="mt-2 ml-2 space-y-1 text-xs text-slate-500">
          <p>First seen: <span className="text-slate-700">{firstSeen}</span></p>
          <p>Modifications: <span className="text-slate-700">{signal.modificationCount}</span></p>
          <p>Last modified: <span className="text-slate-700">{lastMod}</span></p>
          <p>
            Classification:{' '}
            <span className={signal.isEvolved ? 'text-green-700 font-medium' : 'text-slate-700'}>
              {signal.isEvolved ? 'Evolved' : 'Static'}
            </span>
          </p>
          <p>Origin: <span className="text-slate-700">{signal.originSignal}</span></p>
          <p>Complexity: <span className="text-slate-700">{signal.diffComplexity}</span></p>
        </div>
      )}
    </div>
  );
}
