/**
 * src/adapters/github.ts — GitHub adapter implementing SourceAdapter.
 *
 * Wraps Octokit for all GitHub API calls. Handles:
 * - Repository search via GitHub Search API
 * - Rate limit header reading (X-RateLimit-Remaining/Reset)
 * - Throttling when remaining < 100
 * - Rate limit error detection (429/403)
 *
 * GITHUB_PAT must be set in .env.local — never hardcoded.
 */

import { Octokit } from '@octokit/rest';
import type {
  SourceAdapter,
  DiscoverResult,
  DiscoveredRepo,
  RateLimitInfo,
} from './source-adapter.js';

/** Threshold below which we start throttling requests. */
const RATE_LIMIT_THROTTLE_THRESHOLD = 100;

/** Delay in ms when throttling due to low remaining rate limit. */
const THROTTLE_DELAY_MS = 2_000;

/**
 * Error thrown when GitHub API returns a rate limit response (429 or 403 with rate limit message).
 * Contains the retry-after information for the job queue.
 */
export class GitHubRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number,
    public readonly rateLimit: RateLimitInfo
  ) {
    super(message);
    this.name = 'GitHubRateLimitError';
  }
}

/**
 * Reads GITHUB_PAT from environment (process.env for pipeline context).
 * Throws if not set — caller must handle gracefully.
 */
function getGitHubToken(): string {
  const token = process.env['GITHUB_PAT'];
  if (!token) {
    throw new Error(
      'GITHUB_PAT environment variable is not set. ' +
      'Set it in .env.local for local development.'
    );
  }
  return token;
}

/**
 * Extracts rate limit info from Octokit response headers.
 */
function extractRateLimit(headers: Record<string, string | undefined>): RateLimitInfo {
  const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '0', 10);
  const resetEpochSeconds = parseInt(headers['x-ratelimit-reset'] ?? '0', 10);
  const limit = parseInt(headers['x-ratelimit-limit'] ?? '0', 10);

  return {
    remaining: isNaN(remaining) ? 0 : remaining,
    resetAtMs: isNaN(resetEpochSeconds) ? 0 : resetEpochSeconds * 1000,
    limit: isNaN(limit) ? 0 : limit,
  };
}

/**
 * Sleeps for the given duration in milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a GitHubAdapter instance.
 * Uses GITHUB_PAT from environment for authenticated API access.
 */
export function createGitHubAdapter(): SourceAdapter {
  const token = getGitHubToken();
  const octokit = new Octokit({ auth: token });

  return new GitHubAdapter(octokit);
}

/**
 * GitHub implementation of SourceAdapter.
 * All GitHub API calls in the codebase go through this class.
 */
export class GitHubAdapter implements SourceAdapter {
  readonly sourceName = 'github';

  constructor(private readonly octokit: Octokit) {}

  /**
   * Search for repositories via GitHub Search API.
   *
   * Handles pagination to collect up to `limit` results.
   * Throttles when rate limit remaining < 100.
   * Throws GitHubRateLimitError on 429/403 rate limit responses.
   */
  async searchRepositories(query: string, limit: number): Promise<DiscoverResult> {
    const repos: DiscoveredRepo[] = [];
    const perPage = Math.min(limit, 100); // GitHub max per_page is 100
    let page = 1;
    let totalCount = 0;
    let lastRateLimit: RateLimitInfo = { remaining: 0, resetAtMs: 0, limit: 0 };

    while (repos.length < limit) {
      const remaining = limit - repos.length;
      const currentPerPage = Math.min(perPage, remaining);

      try {
        const response = await this.octokit.search.repos({
          q: query,
          per_page: currentPerPage,
          page,
          sort: 'updated',
          order: 'desc',
        });

        lastRateLimit = extractRateLimit(
          response.headers as Record<string, string | undefined>
        );

        if (page === 1) {
          totalCount = response.data.total_count;
        }

        for (const item of response.data.items) {
          if (repos.length >= limit) break;

          repos.push({
            fullName: item.full_name,
            owner: item.owner?.login ?? item.full_name.split('/')[0] ?? '',
            name: item.name,
            primaryLanguage: item.language ?? null,
            starCount: item.stargazers_count ?? 0,
            forkCount: item.forks_count ?? 0,
            lastPushedAt: item.pushed_at ?? new Date().toISOString(),
            topics: item.topics ?? [],
            githubUrl: item.html_url,
          });
        }

        // No more results available
        if (response.data.items.length < currentPerPage) break;

        // Throttle if rate limit is getting low
        if (lastRateLimit.remaining < RATE_LIMIT_THROTTLE_THRESHOLD) {
          console.log(
            `[github] Rate limit low (${lastRateLimit.remaining} remaining). ` +
            `Throttling for ${THROTTLE_DELAY_MS / 1000}s...`
          );
          await sleep(THROTTLE_DELAY_MS);
        }

        page++;
      } catch (err: unknown) {
        const error = err as { status?: number; response?: { headers?: Record<string, string> } };
        const status = error.status;
        const headers = error.response?.headers ?? {};

        if (status === 429 || status === 403) {
          const errorRateLimit = extractRateLimit(headers);
          const retryAfterMs = Math.max(
            errorRateLimit.resetAtMs - Date.now(),
            60_000 // minimum 1 minute retry window
          );

          throw new GitHubRateLimitError(
            `GitHub API rate limited (HTTP ${status}). ` +
            `Retry after ${Math.ceil(retryAfterMs / 60_000)}m.`,
            retryAfterMs,
            errorRateLimit
          );
        }

        throw err;
      }
    }

    return { repos, totalCount, rateLimit: lastRateLimit };
  }
}
