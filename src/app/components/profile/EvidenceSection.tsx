/**
 * src/app/components/profile/EvidenceSection.tsx — Evidence section variants.
 *
 * Four variants: skills, repositories, ai-signals, evolution.
 * Each surfaces verifiable evidence from the scan pipeline.
 */

import React from 'react';
import type { Candidate } from '@/types/candidate';
import type { Repository, AiConfigFileSignal } from '@/types/repository';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoIconButton } from './InfoBadge';
import { TechIcon } from './TechIcon';
import { FileTypeIcon } from './FileTypeIcon';

// Re-export EvolutionSection from its own file for backwards-compatible imports
export { EvolutionSection } from './EvolutionSection';

// ─── Section Info Tooltips ──────────────────────────────────────────────────

const SECTION_INFO = {
  skills: 'Languages, frameworks, and tools detected from repository code analysis.',
  repositories: 'GitHub repositories owned by this developer, with scan depth status.',
  aiSignals: 'Evidence of AI tool usage: config files (.cursorrules, CLAUDE.md, etc.), co-authored commits, and AI agent patterns.',
};

// ─── Skills Section ─────────────────────────────────────────────────────────

interface SkillsSectionProps {
  candidate: Candidate;
}

export function SkillsSection({ candidate }: SkillsSectionProps) {
  const totalSkills = candidate.detectedLanguages.length +
    candidate.detectedFrameworks.length +
    candidate.detectedTools.length;

  return (
    <CollapsibleSection
      title="Skills"
      count={totalSkills}
      infoTooltip={<InfoIconButton tooltip={SECTION_INFO.skills} />}
    >
      <SkillGroup label="Languages" tags={candidate.detectedLanguages} />
      <SkillGroup label="Frameworks" tags={candidate.detectedFrameworks} />
      <SkillGroup label="Tools" tags={candidate.detectedTools} />
    </CollapsibleSection>
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
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-inset text-xs font-mono text-th-text-primary"
          >
            <TechIcon taxonomyId={tag} />
            {tag.split(':')[1] ?? tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Repositories & AI Signals (combined, collapsed by default) ─────────────

interface RepoAndSignalsSectionProps {
  candidate: Candidate;
  repos: (Repository & { id: string })[];
}

export function RepoAndSignalsSection({ candidate, repos }: RepoAndSignalsSectionProps) {
  const allConfigFiles = repos.flatMap((r) => r.aiConfigFiles ?? []);
  const hasCoAuthored = repos.some((r) => r.coAuthoredByAI);
  const hasPatterns = candidate.aiAgentPatterns.length > 0;
  const signalCount = allConfigFiles.length + (hasCoAuthored ? 1 : 0);

  return (
    <CollapsibleSection
      title="Repositories & AI Signals"
      count={repos.length}
      defaultOpen={false}
      infoTooltip={<InfoIconButton tooltip="Scanned repositories, AI config files, and agent patterns." />}
    >
      {/* Repositories table */}
      {repos.length > 0 ? (
        <RepositoriesTable repos={repos} />
      ) : (
        <p className="text-xs text-th-text-muted italic">No repositories scanned yet.</p>
      )}

      {/* AI Signals — compact view */}
      {(signalCount > 0 || hasPatterns) && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs font-medium text-th-text-secondary mb-2">AI Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {hasCoAuthored && (
              <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-500/10 text-xs font-medium text-violet-400">
                Co-authored by AI
              </span>
            )}
            {allConfigFiles.map((f, i) => (
              <AiConfigTag key={`${f.fileName}-${i}`} signal={f} />
            ))}
            {hasPatterns && candidate.aiAgentPatterns.map((p) => (
              <span
                key={p}
                className="inline-flex px-2 py-0.5 rounded-full bg-violet-500/10 text-xs font-mono text-violet-400"
              >
                {p.split(':')[1] ?? p}
              </span>
            ))}
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

/** Compact tag for an AI config file — shows filename + origin badge. */
function AiConfigTag({ signal }: { signal: AiConfigFileSignal }) {
  const origin = ORIGIN_LABELS[signal.originSignal] ?? ORIGIN_LABELS['unknown']!;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-inset text-xs font-mono text-th-text-primary"
      title={`${signal.fileName} — ${signal.diffComplexity} complexity, ${signal.modificationCount} mods, ${origin.label}`}
    >
      <FileTypeIcon type={signal.fileType} />
      {signal.fileName}
      {signal.isEvolved && (
        <span className="text-xs text-green-500 font-medium">evolved</span>
      )}
    </span>
  );
}

// Keep legacy exports for backwards compatibility
export function RepositoriesSection({ repos }: { repos: (Repository & { id: string })[] }) {
  return repos.length > 0 ? <RepositoriesTable repos={repos} /> : null;
}

export function AiSignalsSection(_props: { candidate: Candidate; repos: (Repository & { id: string })[] }) {
  return null; // Consolidated into RepoAndSignalsSection
}

const SCAN_STATUS_TOOLTIP =
  'surface = metadata only. layer1 = code analysis (skills, frameworks). layer2 = deep analysis (commits, ownership, AI evolution).';

const SCAN_STATUS_COLORS: Record<string, string> = {
  surface: 'text-th-text-secondary',
  layer1: 'text-blue-600',
  layer2: 'text-green-600',
};

function RepositoriesTable({ repos }: { repos: (Repository & { id: string })[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-th-text-muted border-b border-border">
            <th className="pb-1.5 pr-3 font-medium">Repository</th>
            <th className="pb-1.5 px-3 font-medium">Language</th>
            <th className="pb-1.5 px-3 font-medium whitespace-nowrap">
              {'\u2605'} Stars
              <InfoIconButton tooltip="GitHub star count for this repository." />
            </th>
            <th className="pb-1.5 px-3 font-medium whitespace-nowrap">
              Span
              <InfoIconButton tooltip="Time span between first and last commit in months." />
            </th>
            <th className="pb-1.5 pl-3 font-medium whitespace-nowrap">
              Depth
              <InfoIconButton tooltip={SCAN_STATUS_TOOLTIP} />
            </th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <tr key={repo.id} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pr-3">
                <a
                  href={repo.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {repo.fullName}
                </a>
              </td>
              <td className="py-1.5 px-3 text-th-text-secondary">
                {repo.primaryLanguage?.split(':')[1] ?? '\u2014'}
              </td>
              <td className="py-1.5 px-3 text-th-text-secondary tabular-nums">{repo.starCount}</td>
              <td className="py-1.5 px-3 text-th-text-secondary">
                {repo.commitSpanMonths > 0 ? `${repo.commitSpanMonths}mo` : '\u2014'}
              </td>
              <td className={`py-1.5 pl-3 font-medium ${SCAN_STATUS_COLORS[repo.scanStatus] ?? 'text-th-text-secondary'}`}>
                {repo.scanStatus}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Human-readable labels and colors for origin signals. */
const ORIGIN_LABELS: Record<string, { label: string; color: string }> = {
  'likely-original': { label: 'Original', color: 'text-green-600' },
  'modified-from-template': { label: 'From template', color: 'text-amber-600' },
  'likely-copied': { label: 'Copied', color: 'text-th-text-muted' },
  'unknown': { label: 'Unknown', color: 'text-th-text-muted' },
};

