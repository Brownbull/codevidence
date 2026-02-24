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
    <section className="bg-surface-raised rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-th-text-primary mb-3">Skills</h3>

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
      <p className="text-xs text-th-text-secondary mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex px-2 py-0.5 rounded-full bg-surface-inset text-xs font-mono text-th-text-primary"
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
      <section className="bg-surface-raised rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-th-text-primary mb-3">Repositories</h3>
        <p className="text-xs text-th-text-muted italic">No repositories scanned yet.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-th-text-primary mb-3">
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
    <div className="flex items-start justify-between border-b border-border pb-2 last:border-0 last:pb-0">
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
            <span className="text-xs text-th-text-secondary">{repo.primaryLanguage}</span>
          )}
          <span className="text-xs text-th-text-muted">{'\u2605'} {repo.starCount}</span>
          {commitSpan && (
            <span className="text-xs text-th-text-muted">{commitSpan}</span>
          )}
        </div>
      </div>
      <ScanStatusBadge status={repo.scanStatus} />
    </div>
  );
}

function ScanStatusBadge({ status }: { status: Repository['scanStatus'] }) {
  const colors: Record<string, string> = {
    surface: 'bg-surface-inset text-th-text-secondary',
    layer1: 'bg-blue-100 text-blue-700',
    layer2: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-surface-inset text-th-text-secondary'}`}>
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
      <section className="bg-surface-raised rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-th-text-primary mb-3">AI Signals</h3>
        <p className="text-xs text-th-text-muted italic">No AI tooling signals detected.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-th-text-primary mb-3">AI Signals</h3>

      {/* Config files */}
      {allConfigFiles.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-th-text-secondary mb-1.5">AI Config Files</p>
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
          <p className="text-xs text-th-text-secondary mb-1.5">AI Agent Patterns</p>
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

/** Human-readable labels and colors for origin signals. */
const ORIGIN_LABELS: Record<string, { label: string; color: string }> = {
  'likely-original': { label: 'Original', color: 'text-green-600' },
  'modified-from-template': { label: 'From template', color: 'text-amber-600' },
  'likely-copied': { label: 'Copied', color: 'text-red-500' },
  'unknown': { label: 'Unknown', color: 'text-th-text-muted' },
};

function AiConfigFileRow({ signal }: { signal: AiConfigFileSignal }) {
  const origin = ORIGIN_LABELS[signal.originSignal] ?? ORIGIN_LABELS['unknown']!;

  return (
    <div className="flex items-center justify-between text-xs gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-th-text-primary truncate">{signal.fileName}</span>
        {signal.isEvolved && (
          <span className="px-1 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium flex-shrink-0">
            Evolved
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-th-text-muted flex-shrink-0">
        <InfoBadge
          value={`${signal.modificationCount} mods`}
          tooltip="Number of git commits that modified this file."
        />
        <span className="text-border">|</span>
        <InfoBadge
          value={signal.diffComplexity}
          tooltip="Total lines changed: minimal (<10), moderate (<100), extensive (100+)."
        />
        <span className="text-border">|</span>
        <InfoBadge
          value={origin.label}
          valueClass={origin.color}
          tooltip="Original = built from scratch. From template = started from existing code, then customized. Copied = taken with few/no changes."
        />
      </div>
    </div>
  );
}

/** A value with a clickable info icon that shows a tooltip. */
function InfoBadge({
  value,
  tooltip,
  valueClass,
}: {
  value: string;
  tooltip: string;
  valueClass?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-0.5">
      <span className={valueClass}>{value}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        onBlur={() => setShow(false)}
        className="text-th-text-muted hover:text-th-text-secondary transition-colors leading-none"
        aria-label={`Info: ${value}`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="inline-block">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM7.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM7.25 7a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V7Z" />
        </svg>
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 px-2 py-1.5 rounded bg-slate-900 text-white text-[10px] leading-snug shadow-lg z-50 pointer-events-none">
          {tooltip}
        </span>
      )}
    </span>
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
      <section className="bg-surface-raised rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-th-text-primary mb-3">AI Evolution Timeline</h3>
        <p className="text-xs text-th-text-muted italic">No AI config file history available.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-raised rounded-lg border border-border p-5">
      <h3 className="text-sm font-semibold text-th-text-primary mb-3">AI Evolution Timeline</h3>
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
    <div className="border-l-2 border-border pl-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-left w-full"
      >
        <span className="font-mono text-sm text-th-text-primary">{signal.fileName}</span>
        <span className="text-xs text-th-text-muted">in {signal.repoName}</span>
        <span className="text-xs text-slate-300 ml-auto">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="mt-2 ml-2 space-y-1 text-xs text-th-text-secondary">
          <p>First seen: <span className="text-th-text-primary">{firstSeen}</span></p>
          <p>Modifications: <span className="text-th-text-primary">{signal.modificationCount}</span></p>
          <p>Last modified: <span className="text-th-text-primary">{lastMod}</span></p>
          <p>
            Classification:{' '}
            <span className={signal.isEvolved ? 'text-green-700 font-medium' : 'text-th-text-primary'}>
              {signal.isEvolved ? 'Evolved' : 'Static'}
            </span>
          </p>
          <p>Origin: <span className={(ORIGIN_LABELS[signal.originSignal] ?? ORIGIN_LABELS['unknown']!).color + ' font-medium'}>{(ORIGIN_LABELS[signal.originSignal] ?? ORIGIN_LABELS['unknown']!).label}</span></p>
          <p>Complexity: <span className="text-th-text-primary">{signal.diffComplexity}</span></p>
        </div>
      )}
    </div>
  );
}
