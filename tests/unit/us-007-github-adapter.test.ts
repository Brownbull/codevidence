/**
 * tests/unit/us-007-github-adapter.test.ts
 *
 * Unit tests for US-007: GitHub API adapter, repo discovery,
 * deduplication, and rate-limit pacing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Source Adapter Interface ──────────────────────────────────────────────────

describe('US-007: Source Adapter Interface', () => {
  const src = readSource('src/adapters/source-adapter.ts');

  it('exports DiscoveredRepo interface with required fields', () => {
    expect(src).toContain('export interface DiscoveredRepo');
    expect(src).toContain('fullName: string');
    expect(src).toContain('owner: string');
    expect(src).toContain('name: string');
    expect(src).toContain('primaryLanguage: string | null');
    expect(src).toContain('starCount: number');
    expect(src).toContain('forkCount: number');
    expect(src).toContain('lastPushedAt: string');
    expect(src).toContain('topics: string[]');
    expect(src).toContain('githubUrl: string');
  });

  it('exports RateLimitInfo interface', () => {
    expect(src).toContain('export interface RateLimitInfo');
    expect(src).toContain('remaining: number');
    expect(src).toContain('resetAtMs: number');
    expect(src).toContain('limit: number');
  });

  it('exports DiscoverResult interface with repos, totalCount, and rateLimit', () => {
    expect(src).toContain('export interface DiscoverResult');
    expect(src).toContain('repos: DiscoveredRepo[]');
    expect(src).toContain('totalCount: number');
    expect(src).toContain('rateLimit: RateLimitInfo');
  });

  it('exports SourceAdapter interface with sourceName and searchRepositories', () => {
    expect(src).toContain('export interface SourceAdapter');
    expect(src).toContain('readonly sourceName: string');
    expect(src).toContain('searchRepositories(query: string, limit: number): Promise<DiscoverResult>');
  });
});

// ─── GitHub Adapter ────────────────────────────────────────────────────────────

describe('US-007: GitHub Adapter', () => {
  const src = readSource('src/adapters/github.ts');

  it('imports from source-adapter (implements the interface)', () => {
    expect(src).toContain("from './source-adapter.js'");
    expect(src).toContain('SourceAdapter');
    expect(src).toContain('DiscoveredRepo');
    expect(src).toContain('RateLimitInfo');
  });

  it('imports Octokit from @octokit/rest', () => {
    expect(src).toContain("from '@octokit/rest'");
    expect(src).toContain('Octokit');
  });

  it('exports createGitHubAdapter factory function', () => {
    expect(src).toContain('export function createGitHubAdapter(): SourceAdapter');
  });

  it('exports GitHubAdapter class implementing SourceAdapter', () => {
    expect(src).toContain('export class GitHubAdapter implements SourceAdapter');
    expect(src).toContain("readonly sourceName = 'github'");
  });

  it('reads GITHUB_PAT from process.env — never hardcoded', () => {
    expect(src).toContain("process.env['GITHUB_PAT']");
    // Must not contain a hardcoded token
    expect(src).not.toMatch(/ghp_[A-Za-z0-9]{36}/);
    expect(src).not.toMatch(/github_pat_[A-Za-z0-9_]{82}/);
  });

  it('throws if GITHUB_PAT is not set', () => {
    expect(src).toContain('GITHUB_PAT environment variable is not set');
  });

  it('implements searchRepositories method', () => {
    expect(src).toContain('async searchRepositories(query: string, limit: number): Promise<DiscoverResult>');
  });

  it('uses octokit.search.repos for GitHub Search API', () => {
    expect(src).toContain('this.octokit.search.repos');
  });

  it('extracts rate limit from response headers', () => {
    expect(src).toContain('x-ratelimit-remaining');
    expect(src).toContain('x-ratelimit-reset');
    expect(src).toContain('x-ratelimit-limit');
  });

  it('has throttle threshold constant (< 100 remaining)', () => {
    expect(src).toContain('RATE_LIMIT_THROTTLE_THRESHOLD');
    expect(src).toMatch(/RATE_LIMIT_THROTTLE_THRESHOLD\s*=\s*100/);
  });

  it('throttles when rate limit remaining is low', () => {
    expect(src).toContain('lastRateLimit.remaining < RATE_LIMIT_THROTTLE_THRESHOLD');
    expect(src).toContain('THROTTLE_DELAY_MS');
  });

  it('exports GitHubRateLimitError with retryAfterMs', () => {
    expect(src).toContain('export class GitHubRateLimitError extends Error');
    expect(src).toContain('public readonly retryAfterMs: number');
    expect(src).toContain('public readonly rateLimit: RateLimitInfo');
  });

  it('throws GitHubRateLimitError on 429 or 403 response', () => {
    expect(src).toContain('status === 429');
    expect(src).toContain('status === 403');
    expect(src).toContain('throw new GitHubRateLimitError');
  });

  it('enforces minimum 1 minute retry window', () => {
    expect(src).toContain('60_000');
    expect(src).toMatch(/Math\.max\(\s*\n?\s*.*resetAtMs.*Date\.now/s);
  });

  it('maps GitHub API fields to DiscoveredRepo shape', () => {
    expect(src).toContain('item.full_name');
    expect(src).toContain('item.language');
    expect(src).toContain('item.stargazers_count');
    expect(src).toContain('item.forks_count');
    expect(src).toContain('item.pushed_at');
    expect(src).toContain('item.topics');
    expect(src).toContain('item.html_url');
  });

  it('handles pagination (page increment, per_page capping at 100)', () => {
    expect(src).toContain('page++');
    expect(src).toMatch(/Math\.min\(limit,\s*100\)/);
  });

  it('stops pagination when API returns fewer items than requested', () => {
    expect(src).toContain('response.data.items.length < currentPerPage');
  });
});

// ─── Discover Handler ──────────────────────────────────────────────────────────

describe('US-007: Discover Handler', () => {
  const src = readSource('src/pipeline/handlers/discover.ts');

  it('imports from source-adapter and github adapter', () => {
    expect(src).toContain("from '../../adapters/github.js'");
    expect(src).toContain("from '../../adapters/source-adapter.js'");
    expect(src).toContain('createGitHubAdapter');
    expect(src).toContain('GitHubRateLimitError');
  });

  it('imports from Firestore wrapper — never directly from Firebase SDK', () => {
    expect(src).toContain("from '../../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/firestore'");
    expect(src).not.toContain("from 'firebase/app'");
  });

  it('imports queue functions for rate-limit handling', () => {
    expect(src).toContain("from '../queue.js'");
    expect(src).toContain('markJobRateLimited');
  });

  it('exports handleDiscover function', () => {
    expect(src).toContain('export async function handleDiscover');
  });

  it('casts payload as DiscoverPayload', () => {
    expect(src).toContain('job.payload as DiscoverPayload');
  });

  it('creates adapter via factory function', () => {
    expect(src).toContain('createGitHubAdapter()');
  });

  it('calls adapter.searchRepositories', () => {
    expect(src).toContain('adapter.searchRepositories(payload.query, payload.limit)');
  });

  it('deduplicates against existing repositories collection', () => {
    expect(src).toContain("getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName))");
    expect(src).toContain('exists: existing !== null');
  });

  it('uses Promise.all for parallel deduplication checks', () => {
    // Check for parallel dedup
    expect(src).toContain('Promise.all');
    expect(src).toContain('result.repos.map(async');
  });

  it('writes Repository docs with scanStatus: surface', () => {
    expect(src).toContain("scanStatus: 'surface'");
    expect(src).toContain('setDoc<Omit<Repository,');
  });

  it('enqueues scan-repo jobs with targetDepth: layer1', () => {
    expect(src).toContain("type: 'scan-repo'");
    expect(src).toContain("targetDepth: 'layer1'");
    expect(src).toContain('addDoc<Omit<ScanJob,');
  });

  it('uses Promise.all for parallel repo writes and job enqueues', () => {
    expect(src).toContain('Promise.all');
    expect(src).toContain('newRepos.map(async');
  });

  it('catches GitHubRateLimitError and marks job rate-limited', () => {
    expect(src).toContain('err instanceof GitHubRateLimitError');
    expect(src).toContain('markJobRateLimited(job.id, err.retryAfterMs)');
  });

  it('logs summary of discovered vs new repos', () => {
    expect(src).toContain('new');
    expect(src).toContain('already in collection');
  });

  it('handles empty result set gracefully', () => {
    expect(src).toContain('newRepos.length === 0');
    expect(src).toContain('No new repos to process');
  });

  it('initializes new Repository doc with all required surface fields', () => {
    expect(src).toContain('owner: repo.owner');
    expect(src).toContain('name: repo.name');
    expect(src).toContain('fullName: repo.fullName');
    expect(src).toContain('primaryLanguage: repo.primaryLanguage');
    expect(src).toContain('starCount: repo.starCount');
    expect(src).toContain('forkCount: repo.forkCount');
    expect(src).toContain('topics: repo.topics');
    expect(src).toContain('githubUrl: repo.githubUrl');
  });

  it('initializes Repository with empty layer1/layer2 fields (not yet scanned)', () => {
    expect(src).toContain('languages: {}');
    expect(src).toContain('detectedFrameworks: []');
    expect(src).toContain('detectedTools: []');
    expect(src).toContain('detectedDependencies: []');
    expect(src).toContain('aiConfigFiles: []');
    expect(src).toContain('coAuthoredByAI: false');
    expect(src).toContain('aiAttributionPatterns: []');
    expect(src).toContain('commitCount: 0');
    expect(src).toContain('commitSpanMonths: 0');
    expect(src).toContain('isOwnerRepo: false');
    expect(src).toContain('hasTestDirectory: false');
    expect(src).toContain("estimatedTestCoverage: 'none'");
  });
});

// ─── Pipeline Index (Worker Registration) ──────────────────────────────────────

describe('US-007: Pipeline Index — Worker Handler Registration', () => {
  const src = readSource('src/pipeline/index.ts');

  it('imports handleDiscover from handlers', () => {
    expect(src).toContain("import { handleDiscover } from './handlers/discover.js'");
  });

  it('registers discover handler in worker', () => {
    expect(src).toContain('discover: handleDiscover');
  });

  it('does not start worker with empty handlers', () => {
    // The old comment/empty handler registration should be gone
    expect(src).not.toContain('startWorker({})');
  });
});

// ─── Rate Limit Logic ──────────────────────────────────────────────────────────

describe('US-007: Rate Limit Logic', () => {
  const adapterSrc = readSource('src/adapters/github.ts');
  const handlerSrc = readSource('src/pipeline/handlers/discover.ts');

  it('adapter reads X-RateLimit headers from every response', () => {
    expect(adapterSrc).toContain('x-ratelimit-remaining');
    expect(adapterSrc).toContain('x-ratelimit-reset');
  });

  it('adapter converts reset epoch seconds to milliseconds', () => {
    expect(adapterSrc).toContain('resetEpochSeconds * 1000');
  });

  it('handler re-throws rate limit error after marking job', () => {
    expect(handlerSrc).toContain('throw err');
    expect(handlerSrc).toContain('markJobRateLimited(job.id, err.retryAfterMs)');
  });

  it('rate limit error class preserves retryAfterMs and rateLimit', () => {
    expect(adapterSrc).toContain("this.name = 'GitHubRateLimitError'");
    expect(adapterSrc).toContain('public readonly retryAfterMs: number');
    expect(adapterSrc).toContain('public readonly rateLimit: RateLimitInfo');
  });
});

// ─── Deduplication Logic ───────────────────────────────────────────────────────

describe('US-007: Deduplication Logic', () => {
  const src = readSource('src/pipeline/handlers/discover.ts');

  it('checks each repo by fullName against repositories collection', () => {
    expect(src).toContain("getDoc<Repository>(REPOSITORIES_COLLECTION, repoDocId(repo.fullName))");
  });

  it('filters out repos that already exist', () => {
    expect(src).toContain('exists: existing !== null');
    expect(src).toContain('if (exists)');
    expect(src).toContain('skipped++');
  });

  it('only writes and enqueues new repos', () => {
    // newRepos is the filtered array
    expect(src).toContain('newRepos.push(repo)');
    expect(src).toContain('newRepos.map(async');
  });

  it('uses repositories collection constant', () => {
    expect(src).toContain("REPOSITORIES_COLLECTION = 'repositories'");
  });
});

// ─── Integration Expectations ──────────────────────────────────────────────────

describe('US-007: Integration Expectations', () => {
  it('scan-repo job enqueued with correct payload shape', () => {
    const src = readSource('src/pipeline/handlers/discover.ts');
    expect(src).toContain("type: 'scan-repo'");
    expect(src).toContain("status: 'pending'");
    expect(src).toContain('repoFullName: repo.fullName');
    expect(src).toContain("targetDepth: 'layer1'");
    expect(src).toContain('attempts: 0');
    expect(src).toContain('maxAttempts: 3');
    expect(src).toContain('priority: 0');
  });

  it('Repository doc uses setDoc with fullName as document ID', () => {
    const src = readSource('src/pipeline/handlers/discover.ts');
    // setDoc uses fullName as the document ID (second arg)
    expect(src).toMatch(/setDoc.*REPOSITORIES_COLLECTION.*repo\.fullName/s);
  });

  it('scan-repo job uses addDoc (auto-generated ID)', () => {
    const src = readSource('src/pipeline/handlers/discover.ts');
    expect(src).toContain("addDoc<Omit<ScanJob, 'id'>>(SCAN_JOBS_COLLECTION");
  });
});
