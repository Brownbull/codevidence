/**
 * tests/unit/domain-inference.test.ts — Domain inference tests.
 *
 * Tests domain definitions structure, inference logic, confidence formula,
 * qualifying domain counting, and integration with skillTags.
 */

import { describe, it, expect } from 'vitest';
import {
  DOMAIN_DEFINITIONS,
  type DomainDef,
} from '../../src/pipeline/scoring/domain-definitions.js';
import {
  inferDomains,
  computeDomainConfidence,
  countQualifyingDomains,
  QUALIFYING_CONFIDENCE,
} from '../../src/pipeline/scoring/domain-inference.js';

// ─── Domain Definitions Structure ────────────────────────────────────────────

describe('DOMAIN_DEFINITIONS catalog', () => {
  it('has 21 domain definitions', () => {
    expect(DOMAIN_DEFINITIONS).toHaveLength(21);
  });

  it('all domainIds start with "domain:"', () => {
    for (const def of DOMAIN_DEFINITIONS) {
      expect(def.domainId).toMatch(/^domain:/);
    }
  });

  it('no duplicate domain IDs', () => {
    const ids = DOMAIN_DEFINITIONS.map((d) => d.domainId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every domain has at least one defining technology', () => {
    for (const def of DOMAIN_DEFINITIONS) {
      expect(def.defining.length).toBeGreaterThan(0);
    }
  });

  it('every domain has a non-empty label', () => {
    for (const def of DOMAIN_DEFINITIONS) {
      expect(def.label.length).toBeGreaterThan(0);
    }
  });

  it('every domain has at least one topic keyword', () => {
    for (const def of DOMAIN_DEFINITIONS) {
      expect(def.topicKeywords.length).toBeGreaterThan(0);
    }
  });

  it('defining signals use taxonomy ID format', () => {
    for (const def of DOMAIN_DEFINITIONS) {
      for (const signal of def.defining) {
        expect(signal).toMatch(/^(language|framework|tool|ai-agent-pattern):/);
      }
    }
  });
});

// ─── computeDomainConfidence ─────────────────────────────────────────────────

describe('computeDomainConfidence', () => {
  const mlDef: DomainDef = {
    domainId: 'domain:ml-engineer',
    label: 'ML Engineer',
    defining: ['tool:tensorflow', 'tool:pytorch', 'tool:scikit-learn'],
    supporting: ['tool:pandas', 'tool:numpy', 'language:python', 'tool:jupyter', 'tool:scipy'],
    topicKeywords: ['machine-learning', 'ml', 'deep-learning'],
  };

  it('returns 0 confidence when no defining signals match', () => {
    const signals = new Set(['language:python', 'tool:pandas']);
    const topics = new Set<string>();
    const result = computeDomainConfidence(mlDef, signals, topics);
    expect(result.confidence).toBe(0);
    expect(result.definingMatched).toBe(0);
  });

  it('computes confidence with one defining match', () => {
    const signals = new Set(['tool:tensorflow']);
    const topics = new Set<string>();
    const result = computeDomainConfidence(mlDef, signals, topics);
    // defRatio = 1/3 = 0.333, supRatio = 0/5 = 0, topicBonus = 0
    // confidence = 0.333 * 0.60 + 0 * 0.25 + 0 * 0.15 = 0.20
    expect(result.definingMatched).toBe(1);
    expect(result.confidence).toBeCloseTo(0.20, 2);
  });

  it('computes confidence with defining + supporting', () => {
    const signals = new Set([
      'tool:tensorflow', 'tool:pytorch',
      'tool:pandas', 'language:python',
    ]);
    const topics = new Set<string>();
    const result = computeDomainConfidence(mlDef, signals, topics);
    // defRatio = 2/3 = 0.667, supRatio = 2/5 = 0.40
    // confidence = 0.667 * 0.60 + 0.40 * 0.25 + 0 = 0.40 + 0.10 = 0.50
    expect(result.definingMatched).toBe(2);
    expect(result.supportingMatched).toBe(2);
    expect(result.confidence).toBeCloseTo(0.50, 2);
  });

  it('adds topic bonus when topic keyword matches', () => {
    const signals = new Set(['tool:tensorflow']);
    const topics = new Set(['machine-learning']);
    const result = computeDomainConfidence(mlDef, signals, topics);
    // defRatio = 1/3 = 0.333, supRatio = 0, topicBonus = 1.0
    // confidence = 0.333 * 0.60 + 0 + 1.0 * 0.15 = 0.20 + 0.15 = 0.35
    expect(result.confidence).toBeCloseTo(0.35, 2);
  });

  it('full match yields confidence = 1.0', () => {
    const signals = new Set([
      'tool:tensorflow', 'tool:pytorch', 'tool:scikit-learn',
      'tool:pandas', 'tool:numpy', 'language:python', 'tool:jupyter', 'tool:scipy',
    ]);
    const topics = new Set(['ml']);
    const result = computeDomainConfidence(mlDef, signals, topics);
    // defRatio = 3/3 = 1.0, supRatio = 5/5 = 1.0, topicBonus = 1.0
    // confidence = 1.0 * 0.60 + 1.0 * 0.25 + 1.0 * 0.15 = 1.0
    expect(result.confidence).toBeCloseTo(1.0, 2);
  });

  it('returns top evidence from matched defining signals', () => {
    const signals = new Set(['tool:tensorflow', 'tool:pytorch']);
    const topics = new Set<string>();
    const result = computeDomainConfidence(mlDef, signals, topics);
    expect(result.topEvidence).toContain('tool:tensorflow');
    expect(result.topEvidence).toContain('tool:pytorch');
    expect(result.topEvidence.length).toBeLessThanOrEqual(3);
  });
});

// ─── inferDomains ────────────────────────────────────────────────────────────

describe('inferDomains', () => {
  it('returns empty array for no signals', () => {
    const result = inferDomains([], [], [], []);
    expect(result).toEqual([]);
  });

  it('infers ML Engineer for ML profile', () => {
    const result = inferDomains(
      ['language:python'],
      [],
      ['tool:tensorflow', 'tool:pytorch', 'tool:pandas', 'tool:numpy'],
      ['machine-learning'],
    );
    const mlDomain = result.find((d) => d.domainId === 'domain:ml-engineer');
    expect(mlDomain).toBeDefined();
    expect(mlDomain!.confidence).toBeGreaterThanOrEqual(0.50);
  });

  it('infers DevOps Engineer for DevOps profile', () => {
    const result = inferDomains(
      ['language:shell'],
      [],
      ['tool:docker', 'tool:kubernetes', 'tool:terraform', 'tool:prometheus'],
      ['devops'],
    );
    const devops = result.find((d) => d.domainId === 'domain:devops-engineer');
    expect(devops).toBeDefined();
    expect(devops!.confidence).toBeGreaterThanOrEqual(0.50);
  });

  it('infers Frontend Engineer for React + TypeScript profile', () => {
    const result = inferDomains(
      ['language:typescript', 'language:javascript'],
      ['framework:react', 'framework:nextjs', 'framework:svelte'],
      ['tool:vite', 'tool:webpack'],
      ['frontend', 'react'],
    );
    const frontend = result.find((d) => d.domainId === 'domain:frontend-engineer');
    expect(frontend).toBeDefined();
    expect(frontend!.confidence).toBeGreaterThanOrEqual(0.50);
  });

  it('returns max 5 domains', () => {
    // Provide signals that match many domains
    const result = inferDomains(
      ['language:python', 'language:go', 'language:typescript'],
      ['framework:react', 'framework:express', 'framework:fastapi'],
      [
        'tool:docker', 'tool:kubernetes', 'tool:terraform',
        'tool:postgresql', 'tool:redis', 'tool:prometheus',
        'tool:pandas', 'tool:tensorflow',
      ],
      [],
    );
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('sorts results by confidence DESC', () => {
    const result = inferDomains(
      ['language:python'],
      [],
      ['tool:tensorflow', 'tool:pytorch', 'tool:scikit-learn', 'tool:pandas'],
      ['machine-learning'],
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });

  it('rounds confidence to 2 decimal places', () => {
    const result = inferDomains(
      [],
      [],
      ['tool:tensorflow'],
      [],
    );
    for (const d of result) {
      const rounded = Math.round(d.confidence * 100) / 100;
      expect(d.confidence).toBe(rounded);
    }
  });

  it('includes evidenceCount and topEvidence', () => {
    const result = inferDomains(
      ['language:python'],
      [],
      ['tool:tensorflow', 'tool:pandas'],
      [],
    );
    for (const d of result) {
      expect(d.evidenceCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(d.topEvidence)).toBe(true);
    }
  });
});

// ─── countQualifyingDomains ──────────────────────────────────────────────────

describe('countQualifyingDomains', () => {
  it('returns 0 for empty array', () => {
    expect(countQualifyingDomains([])).toBe(0);
  });

  it('returns 0 when all below qualifying threshold', () => {
    const domains = [
      { domainId: 'domain:a', label: 'A', confidence: 0.30, evidenceCount: 1, topEvidence: ['x'] },
      { domainId: 'domain:b', label: 'B', confidence: 0.49, evidenceCount: 1, topEvidence: ['x'] },
    ];
    expect(countQualifyingDomains(domains)).toBe(0);
  });

  it('counts domains at exactly 0.50', () => {
    const domains = [
      { domainId: 'domain:a', label: 'A', confidence: 0.50, evidenceCount: 1, topEvidence: ['x'] },
    ];
    expect(countQualifyingDomains(domains)).toBe(1);
  });

  it('counts only qualifying domains', () => {
    const domains = [
      { domainId: 'domain:a', label: 'A', confidence: 0.80, evidenceCount: 3, topEvidence: ['x'] },
      { domainId: 'domain:b', label: 'B', confidence: 0.30, evidenceCount: 1, topEvidence: ['x'] },
      { domainId: 'domain:c', label: 'C', confidence: 0.60, evidenceCount: 2, topEvidence: ['x'] },
    ];
    expect(countQualifyingDomains(domains)).toBe(2);
  });

  it('QUALIFYING_CONFIDENCE is 0.50', () => {
    expect(QUALIFYING_CONFIDENCE).toBe(0.50);
  });
});
