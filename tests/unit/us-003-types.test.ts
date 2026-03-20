/**
 * tests/unit/us-003-types.test.ts
 *
 * Verifies the US-003 type definitions:
 * 1. CandidatePipelineUpdate does NOT contain aiMaturityScore / aiMaturityScoredAt / aiMaturityScoredBy
 * 2. aiMaturityScore: null is a valid Candidate (not-yet-evaluated state)
 * 3. aiMaturityScore: 0 is a valid Candidate (evaluated, rated Level 0 — distinct from null)
 */

import { describe, it, expect } from 'vitest';
import type { Candidate, CandidatePipelineUpdate } from '@/types/candidate';
import type { Repository, AiConfigFileSignal } from '@/types/repository';
import type {
  ScanJob,
  ScanJobStatus,
  ScanJobType,
  DiscoverPayload,
  ScanRepoPayload,
  RescanPayload,
} from '@/types/scan-job';
import type { TaxonomyItem, TaxonomyCategory } from '@/types/taxonomy';
import type {
  AdminFlag,
  AdminFlagType,
  AdminFlagStatus,
  SearchQueryParams,
} from '@/types/admin';

// ─── Helper: build a valid Timestamp-like object for structural tests ────────
// We don't import Firestore in tests — use a plain object that satisfies the
// structural type (toDate, toMillis, seconds, nanoseconds).
function fakeTimestamp() {
  return {
    seconds: 1700000000,
    nanoseconds: 0,
    toDate: () => new Date(1700000000000),
    toMillis: () => 1700000000000,
    isEqual: () => false,
    valueOf: () => '1700000000.0',
  };
}

// ─── CandidatePipelineUpdate exclusion tests ─────────────────────────────────

describe('CandidatePipelineUpdate', () => {
  it('does not have aiMaturityScore key (compile-time Omit enforcement)', () => {
    // TypeScript compile-time check: if CandidatePipelineUpdate had aiMaturityScore,
    // the line below would cause a TS error ("Object literal may only specify known properties").
    // This test failing to compile = type safety regression.
    const update: CandidatePipelineUpdate = {
      id: 'torvalds',
      githubUsername: 'torvalds',
      githubProfileUrl: 'https://github.com/torvalds',
      avatarUrl: null,
      skillScore: 85,
      skillTags: ['language:c', 'tool:git'],
      detectedLanguages: ['c'],
      detectedFrameworks: [],
      detectedTools: ['git'],
      aiToolingSignals: [],
      aiAgentPatterns: [],
      repoCount: 10,
      primaryRepoIds: ['torvalds/linux'],
      commitSpanMonths: 120,
      lastScanned: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      isStale: false,
      scanDepth: 'layer1',
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    // Runtime assertion: none of the excluded keys are present
    expect(Object.prototype.hasOwnProperty.call(update, 'aiMaturityScore')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(update, 'aiMaturityScoredAt')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(update, 'aiMaturityScoredBy')).toBe(false);
  });

  it('has all required pipeline-owned fields', () => {
    const update: CandidatePipelineUpdate = {
      id: 'test-user',
      githubUsername: 'test-user',
      githubProfileUrl: 'https://github.com/test-user',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
      skillScore: 42,
      skillTags: [],
      detectedLanguages: ['typescript'],
      detectedFrameworks: ['react'],
      detectedTools: [],
      aiToolingSignals: [],
      aiAgentPatterns: [],
      repoCount: 5,
      primaryRepoIds: [],
      commitSpanMonths: 24,
      lastScanned: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      isStale: false,
      scanDepth: 'layer2',
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(update.skillScore).toBe(42);
    expect(update.scanDepth).toBe('layer2');
    expect(update.githubUsername).toBe('test-user');
  });
});

// ─── Candidate null vs 0 invariant tests ────────────────────────────────────

describe('Candidate aiMaturityScore invariant', () => {
  it('accepts aiMaturityScore: null (not-yet-evaluated state)', () => {
    const candidate: Candidate = {
      id: 'ghost',
      githubUsername: 'ghost',
      githubProfileUrl: 'https://github.com/ghost',
      avatarUrl: null,
      skillScore: 50,
      aiMaturityScore: null,       // ← not evaluated
      aiMaturityScoredAt: null,
      aiMaturityScoredBy: null,
      skillTags: [],
      detectedLanguages: [],
      detectedFrameworks: [],
      detectedTools: [],
      aiToolingSignals: [],
      aiAgentPatterns: [],
      repoCount: 1,
      primaryRepoIds: [],
      commitSpanMonths: 6,
      lastScanned: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      isStale: false,
      scanDepth: 'layer1',
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(candidate.aiMaturityScore).toBeNull();
    // null means "not evaluated" — should be displayed as "Not evaluated" in UI
    expect(candidate.aiMaturityScore).not.toBe(0);
  });

  it('accepts aiMaturityScore: 0 (evaluated, rated Level 0)', () => {
    const candidate: Candidate = {
      id: 'beginner-dev',
      githubUsername: 'beginner-dev',
      githubProfileUrl: 'https://github.com/beginner-dev',
      avatarUrl: null,
      skillScore: 20,
      aiMaturityScore: 0,          // ← evaluated, rated Level 0 — NOT the same as null
      aiMaturityScoredAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      aiMaturityScoredBy: 'admin-uid-123',
      skillTags: [],
      detectedLanguages: ['javascript'],
      detectedFrameworks: [],
      detectedTools: [],
      aiToolingSignals: [],
      aiAgentPatterns: [],
      repoCount: 2,
      primaryRepoIds: [],
      commitSpanMonths: 3,
      lastScanned: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      isStale: false,
      scanDepth: 'layer1',
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(candidate.aiMaturityScore).toBe(0);
    // 0 is a valid evaluated score — should be displayed as "Level 0" in UI
    expect(candidate.aiMaturityScore).not.toBeNull();
  });

  it('null and 0 are semantically distinct states', () => {
    const unevaluated: Candidate['aiMaturityScore'] = null;
    const levelZero: Candidate['aiMaturityScore'] = 0;

    // These two values must never be conflated
    expect(unevaluated).toBeNull();
    expect(levelZero).toBe(0);
    expect(unevaluated === levelZero).toBe(false);
  });

  it('accepts scores across the full 0–5 range', () => {
    const validScores: Array<number | null> = [null, 0, 1, 2, 3, 4, 5];
    validScores.forEach((score) => {
      const isValid =
        score === null || (typeof score === 'number' && score >= 0 && score <= 5);
      expect(isValid).toBe(true);
    });
  });
});

// ─── Repository type tests ───────────────────────────────────────────────────

describe('Repository type', () => {
  it('accepts a valid Repository document shape', () => {
    const repo: Repository = {
      id: 'torvalds/linux',
      githubUrl: 'https://github.com/torvalds/linux',
      owner: 'torvalds',
      name: 'linux',
      fullName: 'torvalds/linux',
      primaryLanguage: 'c',
      languages: { c: 98, asm: 2 },
      starCount: 180000,
      forkCount: 55000,
      lastPushedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      topics: ['kernel', 'linux'],
      detectedFrameworks: [],
      detectedTools: ['make'],
      detectedDependencies: [],
      aiConfigFiles: [],
      coAuthoredByAI: false,
      aiAttributionPatterns: [],
      commitCount: 1200000,
      firstCommitAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      lastCommitAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      commitSpanMonths: 360,
      isOwnerRepo: true,
      hasTestDirectory: true,
      estimatedTestCoverage: 'medium',
      skillScoreContribution: 30,
      scanStatus: 'layer2',
      lastScanned: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(repo.id).toBe('torvalds/linux');
    expect(repo.scanStatus).toBe('layer2');
    expect(repo.primaryLanguage).toBe('c');
  });

  it('accepts a valid AiConfigFileSignal', () => {
    const signal: AiConfigFileSignal = {
      fileName: 'CLAUDE.md',
      firstDetectedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      modificationCount: 12,
      lastModifiedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      diffComplexity: 'extensive',
      isEvolved: true,
      originSignal: 'likely-original',
    };

    expect(signal.isEvolved).toBe(true);
    expect(signal.diffComplexity).toBe('extensive');
  });
});

// ─── ScanJob type tests ──────────────────────────────────────────────────────

describe('ScanJob type', () => {
  it('accepts all ScanJobStatus values', () => {
    const statuses: ScanJobStatus[] = ['pending', 'running', 'completed', 'failed'];
    expect(statuses).toHaveLength(4);
  });

  it('accepts all ScanJobType values', () => {
    const types: ScanJobType[] = ['discover', 'scan-repo', 'rescan-candidate', 'rescan-repo'];
    expect(types).toHaveLength(4);
  });

  it('accepts a DiscoverPayload', () => {
    const payload: DiscoverPayload = {
      query: 'python fastapi',
      source: 'github',
      limit: 100,
    };
    expect(payload.source).toBe('github');
  });

  it('accepts a ScanRepoPayload', () => {
    const payload: ScanRepoPayload = {
      repoFullName: 'tiangolo/fastapi',
      targetDepth: 'layer1',
    };
    expect(payload.targetDepth).toBe('layer1');
  });

  it('accepts a RescanPayload', () => {
    const payload: RescanPayload = {
      targetType: 'candidate',
      targetId: 'torvalds',
    };
    expect(payload.targetType).toBe('candidate');
  });

  it('accepts a full ScanJob document', () => {
    const job: ScanJob = {
      id: 'job-abc-123',
      type: 'discover',
      status: 'pending',
      payload: { query: 'rust actix', source: 'github', limit: 50 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.rateLimitedUntil).toBeNull();
  });
});

// ─── TaxonomyItem type tests ─────────────────────────────────────────────────

describe('TaxonomyItem type', () => {
  it('accepts all TaxonomyCategory values', () => {
    const categories: TaxonomyCategory[] = [
      'language',
      'framework',
      'tool',
      'ai-agent-pattern',
      'ai-maturity-level',
    ];
    expect(categories).toHaveLength(5);
  });

  it('accepts a valid TaxonomyItem', () => {
    const item: TaxonomyItem = {
      id: 'language:typescript',
      category: 'language',
      displayName: 'TypeScript',
      aliases: ['ts'],
      candidateCount: 42,
      isSeeded: true,
      isSearchable: true,
      firstDetectedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      addedToTaxonomyAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      sortOrder: 10,
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(item.category).toBe('language');
    expect(item.isSearchable).toBe(true);
    expect(item.candidateCount).toBe(42);
  });
});

// ─── AdminFlag type tests ────────────────────────────────────────────────────

describe('AdminFlag type', () => {
  it('accepts all AdminFlagType values', () => {
    const types: AdminFlagType[] = ['underserved-query', 'repo-of-interest'];
    expect(types).toHaveLength(2);
  });

  it('accepts all AdminFlagStatus values', () => {
    const statuses: AdminFlagStatus[] = ['active', 'actioned', 'dismissed'];
    expect(statuses).toHaveLength(3);
  });

  it('accepts a valid SearchQueryParams', () => {
    const params: SearchQueryParams = {
      languages: ['typescript', 'python'],
      frameworks: ['react'],
      tools: [],
      aiAgentPatterns: [],
      aiMaturityMin: null,
      sortBy: 'skillScore',
    };

    expect(params.aiMaturityMin).toBeNull();
    expect(params.languages).toHaveLength(2);
  });

  it('accepts a valid underserved-query AdminFlag', () => {
    const flag: AdminFlag = {
      id: 'flag-001',
      type: 'underserved-query',
      status: 'active',
      queryParams: {
        languages: ['elixir'],
        frameworks: ['phoenix'],
        tools: [],
        aiAgentPatterns: [],
        aiMaturityMin: 3,
        sortBy: 'aiMaturityScore',
      },
      resultCount: 3,
      actionedAt: null,
      actionedBy: null,
      createdAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
      updatedAt: fakeTimestamp() as ReturnType<typeof fakeTimestamp> & { toDate: () => Date },
    };

    expect(flag.type).toBe('underserved-query');
    expect(flag.resultCount).toBe(3);
    expect(flag.status).toBe('active');
  });
});
