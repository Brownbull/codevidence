/**
 * src/pipeline/scoring/domain-inference.ts — Domain inference engine.
 *
 * Infers technical domains (e.g. "ML Engineer", "DevOps Engineer") from a
 * candidate's aggregated technology signals. Runs in the scoring layer only —
 * no filesystem, no API calls, pure computation.
 *
 * Confidence formula:
 *   (definingMatched/definingTotal) * 0.60 +
 *   (supportingMatched/supportingTotal) * 0.25 +
 *   topicBonus * 0.15
 *
 * Must have definingMatched >= 1 AND confidence >= 0.50 to qualify.
 */

import type { DomainExpertise } from '../../types/candidate.js';
import { DOMAIN_DEFINITIONS, type DomainDef } from './domain-definitions.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_DOMAINS = 5;
const MIN_CONFIDENCE = 0.25;
const QUALIFYING_CONFIDENCE = 0.50;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Infers domains from aggregated technology signals across all repos.
 * Returns up to MAX_DOMAINS results sorted by confidence DESC.
 * Only domains with confidence >= MIN_CONFIDENCE are included.
 */
export function inferDomains(
  languages: string[],
  frameworks: string[],
  tools: string[],
  topics: string[],
  agentPatterns: string[] = [],
): DomainExpertise[] {
  const allSignals = new Set([...languages, ...frameworks, ...tools, ...agentPatterns]);
  const topicsLower = new Set(topics.map((t) => t.toLowerCase()));

  const results: DomainExpertise[] = [];

  for (const def of DOMAIN_DEFINITIONS) {
    const result = computeDomainConfidence(def, allSignals, topicsLower);
    if (result.confidence < MIN_CONFIDENCE) continue;
    if (result.definingMatched < 1) continue;

    results.push({
      domainId: def.domainId,
      label: def.label,
      confidence: Math.round(result.confidence * 100) / 100,
      evidenceCount: result.definingMatched + result.supportingMatched,
      topEvidence: result.topEvidence,
    });
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, MAX_DOMAINS);
}

/**
 * Computes domain confidence from technology signals.
 */
export function computeDomainConfidence(
  def: DomainDef,
  allSignals: ReadonlySet<string>,
  topicsLower: ReadonlySet<string>,
): {
  confidence: number;
  definingMatched: number;
  supportingMatched: number;
  topEvidence: string[];
} {
  const matchedDefining = def.defining.filter((s) => allSignals.has(s));
  const matchedSupporting = def.supporting.filter((s) => allSignals.has(s));

  const definingMatched = matchedDefining.length;
  const definingTotal = def.defining.length;
  const supportingMatched = matchedSupporting.length;
  const supportingTotal = def.supporting.length;

  // Must have at least one defining tech
  if (definingMatched === 0) {
    return { confidence: 0, definingMatched: 0, supportingMatched, topEvidence: [] };
  }

  const defRatio = definingMatched / definingTotal;
  const supRatio = supportingTotal > 0 ? supportingMatched / supportingTotal : 0;
  const hasTopicMatch = def.topicKeywords.some((kw) => topicsLower.has(kw));
  const topicBonus = hasTopicMatch ? 1.0 : 0;

  const confidence = defRatio * 0.60 + supRatio * 0.25 + topicBonus * 0.15;

  const topEvidence = matchedDefining.slice(0, 3);

  return { confidence, definingMatched, supportingMatched, topEvidence };
}

/**
 * Counts domains that qualify for scoring (confidence >= 0.50).
 */
export function countQualifyingDomains(domains: DomainExpertise[]): number {
  return domains.filter((d) => d.confidence >= QUALIFYING_CONFIDENCE).length;
}

// Re-export the qualifying confidence for use in skill-score.ts
export { QUALIFYING_CONFIDENCE };
