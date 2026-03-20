/**
 * src/app/components/admin/eval-prompt.ts — Evaluation prompt builder.
 *
 * Builds a structured text prompt with all candidate evidence for
 * AI Maturity evaluation. Designed to be copied to clipboard.
 */

import type { Candidate } from '@/types/candidate';

const LEVEL_GUIDE = [
  'L0: No AI signals — No AI config files, no co-authored commits, no agent patterns.',
  'L1: AI tool present — Has AI config files (e.g. .cursorrules) but minimal customization.',
  'L2: Active AI usage — Multiple AI config files, some evolved/customized, or co-authored commits.',
  'L3: AI-integrated — Deeply customized AI configs across repos, clear agent workflow patterns.',
  'L4: AI-native — Development built around AI — CLAUDE.md, multi-tool configs, original patterns.',
  'L5: AI-first engineering — Architects projects around AI agents. Multi-agent setups, AI-first design.',
];

export function buildEvaluationPrompt(candidate: Candidate): string {
  const langs = candidate.detectedLanguages.map((l) => l.split(':')[1] ?? l).join(', ') || 'None';
  const fws = candidate.detectedFrameworks.map((f) => f.split(':')[1] ?? f).join(', ') || 'None';
  const tools = candidate.detectedTools.map((t) => t.split(':')[1] ?? t).join(', ') || 'None';
  const signals = candidate.aiToolingSignals.length > 0
    ? candidate.aiToolingSignals.join(', ')
    : 'None detected';
  const patterns = candidate.aiAgentPatterns.length > 0
    ? candidate.aiAgentPatterns.map((p) => p.split(':')[1] ?? p).join(', ')
    : 'None detected';
  const currentScore = candidate.aiMaturityScore !== null
    ? `Level ${candidate.aiMaturityScore}`
    : 'Not yet evaluated';

  return [
    `## AI Maturity Evaluation — ${candidate.githubUsername}`,
    '',
    '### Developer Profile',
    `- GitHub: ${candidate.githubProfileUrl}`,
    `- Skill Score: ${candidate.skillScore}/100`,
    `- Repos: ${candidate.repoCount} | Commit Span: ${candidate.commitSpanMonths}mo`,
    `- Scan Depth: ${candidate.scanDepth}`,
    `- Languages: ${langs}`,
    `- Frameworks: ${fws}`,
    `- Tools: ${tools}`,
    '',
    '### AI Evidence',
    `- Config files: ${signals}`,
    `- Agent patterns: ${patterns}`,
    '',
    '### Scoring Guidelines',
    ...LEVEL_GUIDE,
    '',
    '### Your Task',
    'Based on the evidence above, assign an AI Maturity score from 0 to 5.',
    `Current score: ${currentScore}`,
  ].join('\n');
}
