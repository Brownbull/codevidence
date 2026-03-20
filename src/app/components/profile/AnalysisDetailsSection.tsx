/**
 * src/app/components/profile/AnalysisDetailsSection.tsx — Detailed analysis panels.
 *
 * Collapsed by default. Shows granular analysis results from Phases 1-4:
 * proficiency, domains, code quality, git history, architecture & style.
 */

import React from 'react';
import type { Candidate, DomainExpertise } from '@/types/candidate';
import { CollapsibleSection } from './CollapsibleSection';
import { InfoIconButton } from './InfoBadge';
import { TechIcon } from './TechIcon';
import * as TIP from './analysis-tooltips';

const SECTION_INFO =
  'Detailed analysis metrics from the scan pipeline. ' +
  'Includes proficiency levels, domain expertise, code quality, git history, and architecture.';

interface Props {
  candidate: Candidate;
}

export function AnalysisDetailsSection({ candidate }: Props) {
  const hasProficiency = candidate.proficiencyScores && Object.keys(candidate.proficiencyScores).length > 0;
  const hasDomains = (candidate.detectedDomains ?? []).length > 0;
  const hasQuality = candidate.codeQualityGrade != null;
  const hasGitHistory = candidate.codeDurabilityScore != null ||
    candidate.behavioralScore != null || candidate.commitMessageScore != null;
  const hasArch = candidate.designSophisticationTier != null;

  const panelCount = [hasProficiency, hasDomains, hasQuality, hasGitHistory, hasArch]
    .filter(Boolean).length;

  if (panelCount === 0) {
    return (
      <CollapsibleSection
        title="Analysis Details"
        count={0}
        defaultOpen={false}
        infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
      >
        <p className="text-xs text-th-text-muted italic">
          No detailed analysis data available. Rescan with the latest pipeline to populate.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Analysis Details"
      count={panelCount}
      defaultOpen={false}
      infoTooltip={<InfoIconButton tooltip={SECTION_INFO} />}
    >
      <div className="space-y-4">
        {hasProficiency && <ProficiencyPanel candidate={candidate} />}
        {hasDomains && <DomainsPanel domains={candidate.detectedDomains!} />}
        {hasQuality && <CodeQualityPanel candidate={candidate} />}
        {hasGitHistory && <GitHistoryPanel candidate={candidate} />}
        {hasArch && <ArchitecturePanel candidate={candidate} />}
      </div>
    </CollapsibleSection>
  );
}

// ─── Proficiency Panel ──────────────────────────────────────────────────────

function ProficiencyPanel({ candidate }: { candidate: Candidate }) {
  const scores = candidate.proficiencyScores ?? {};
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  return (
    <Panel title="Proficiency" info="Per-technology proficiency scores based on API usage pattern analysis.">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-th-text-secondary">Overall:</span>
        <LevelBadge level={candidate.overallProficiency ?? null} info={TIP.PROFICIENCY_OVERALL} />
        <span className="text-xs text-th-text-muted">
          (+{candidate.proficiencyBonus ?? 0} bonus pts)
        </span>
        <InfoIconButton tooltip={TIP.PROFICIENCY_BONUS} />
      </div>
      <div className="space-y-1">
        {entries.map(([tech, score]) => (
          <div key={tech} className="flex items-center gap-2">
            <TechIcon taxonomyId={tech} />
            <span className="text-xs text-th-text-secondary w-28 truncate">
              {tech.split(':')[1] ?? tech}
            </span>
            <div className="flex-1 h-1 rounded-full bg-surface-inset overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-400"
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
            <span className="text-xs text-th-text-muted tabular-nums w-6 text-right">{score}</span>
            <InfoIconButton tooltip={TIP.PROFICIENCY_TECH_SCORE} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Domains Panel ──────────────────────────────────────────────────────────

function DomainsPanel({ domains }: { domains: DomainExpertise[] }) {
  const sorted = [...domains].sort((a, b) => b.confidence - a.confidence);

  return (
    <Panel title="Domain Expertise" info="Inferred technical domains from aggregated technology signals.">
      <div className="space-y-2">
        {sorted.map((d) => (
          <div key={d.domainId} className="flex items-center gap-2">
            <span className="text-xs font-medium text-th-text-primary w-36 truncate">{d.label}</span>
            <div className="flex-1 h-1 rounded-full bg-surface-inset overflow-hidden">
              <div
                className={`h-full rounded-full ${d.confidence >= 0.5 ? 'bg-green-500' : 'bg-slate-400'}`}
                style={{ width: `${Math.round(d.confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs text-th-text-muted tabular-nums w-8 text-right">
              {Math.round(d.confidence * 100)}%
            </span>
            <InfoIconButton tooltip={TIP.DOMAIN_CONFIDENCE} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Code Quality Panel ─────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700', D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
};

function CodeQualityPanel({ candidate }: { candidate: Candidate }) {
  const grade = candidate.codeQualityGrade ?? 'N/A';
  const gradeColor = GRADE_COLORS[grade] ?? 'bg-slate-100 text-slate-700';

  return (
    <Panel title="Code Quality" info="TypeScript/JavaScript AST analysis: complexity, naming, function length.">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColor}`}>
          Grade {grade}
        </span>
        <InfoIconButton tooltip={TIP.QUALITY_GRADE} />
        {candidate.codeQualityScore != null && (
          <MetricChip label="Score" value={String(candidate.codeQualityScore)} info={TIP.QUALITY_SCORE} />
        )}
        {candidate.avgLogicCodeRatio != null && (
          <MetricChip label="Logic ratio" value={`${Math.round(candidate.avgLogicCodeRatio * 100)}%`} info={TIP.QUALITY_LOGIC_RATIO} />
        )}
        {(candidate.confirmedFrameworks ?? []).length > 0 && (
          <MetricChip
            label="Confirmed"
            value={candidate.confirmedFrameworks!.map((f) => f.split(':')[1] ?? f).join(', ')}
            info={TIP.QUALITY_CONFIRMED}
          />
        )}
      </div>
    </Panel>
  );
}

// ─── Git History Panel ──────────────────────────────────────────────────────

function GitHistoryPanel({ candidate }: { candidate: Candidate }) {
  return (
    <Panel title="Git History" info="Code durability, behavioral discipline, and commit message quality from git log analysis.">
      <div className="flex flex-wrap items-center gap-3">
        {candidate.avgChurnRate14d != null && (
          <MetricChip label="Churn 14d" value={`${(candidate.avgChurnRate14d * 100).toFixed(1)}%`} info={TIP.CHURN_14D} />
        )}
        {candidate.avgChurnRate90d != null && (
          <MetricChip label="Churn 90d" value={`${(candidate.avgChurnRate90d * 100).toFixed(1)}%`} info={TIP.CHURN_90D} />
        )}
        {candidate.commitDisciplineLevel != null && (
          <LevelChip label="Discipline" level={candidate.commitDisciplineLevel} info={TIP.DISCIPLINE_LEVEL} />
        )}
        {candidate.commitMessageScore != null && (
          <MetricChip label="Msg quality" value={`${candidate.commitMessageScore}/100`} info={TIP.MSG_QUALITY} />
        )}
      </div>
    </Panel>
  );
}

// ─── Architecture Panel ─────────────────────────────────────────────────────

function ArchitecturePanel({ candidate }: { candidate: Candidate }) {
  const tier = candidate.designSophisticationTier ?? 'none';
  return (
    <Panel title="Architecture & Style" info="Design pattern detection, architecture style, and code style fingerprinting.">
      <div className="flex flex-wrap items-center gap-3">
        <LevelChip label="Sophistication" level={tier} info={TIP.SOPHISTICATION_TIER} />
        {candidate.designPatternDiversity != null && candidate.designPatternDiversity > 0 && (
          <MetricChip label="Patterns" value={String(candidate.designPatternDiversity)} info={TIP.PATTERN_COUNT} />
        )}
        {(candidate.architectureStyles ?? []).length > 0 && (
          <MetricChip label="Styles" value={candidate.architectureStyles!.join(', ')} info={TIP.ARCH_STYLES} />
        )}
        {candidate.codeStyleScore != null && (
          <MetricChip label="Style score" value={`${candidate.codeStyleScore}/100`} info={TIP.STYLE_SCORE} />
        )}
      </div>
    </Panel>
  );
}

// ─── Shared Primitives ──────────────────────────────────────────────────────

function Panel({ title, info, children }: { title: string; info: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <h4 className="text-sm font-semibold text-th-text-primary">{title}</h4>
        <InfoIconButton tooltip={info} />
      </div>
      {children}
    </div>
  );
}

function MetricChip({ label, value, info }: { label: string; value: string; info?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-th-text-muted">{label}:</span>
      <span className="font-medium text-th-text-primary">{value}</span>
      {info && <InfoIconButton tooltip={info} />}
    </span>
  );
}

function LevelBadge({ level, info }: { level: string | null; info?: string }) {
  if (!level) return <span className="text-xs text-th-text-muted italic">N/A</span>;
  const colors: Record<string, string> = {
    beginner: 'bg-slate-100 text-slate-600', intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-indigo-100 text-indigo-700', expert: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${colors[level] ?? 'bg-slate-100 text-slate-600'}`}>
        {level}
      </span>
      {info && <InfoIconButton tooltip={info} />}
    </span>
  );
}

function LevelChip({ label, level, info }: { label: string; level: string; info?: string }) {
  const colors: Record<string, string> = {
    none: 'text-th-text-muted', low: 'text-amber-600', basic: 'text-th-text-secondary',
    moderate: 'text-blue-600', intermediate: 'text-blue-600',
    high: 'text-green-600', advanced: 'text-green-600',
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-th-text-muted">{label}:</span>
      <span className={`font-medium ${colors[level] ?? 'text-th-text-secondary'}`}>{level}</span>
      {info && <InfoIconButton tooltip={info} />}
    </span>
  );
}
