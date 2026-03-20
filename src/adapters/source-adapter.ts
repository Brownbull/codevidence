/**
 * src/adapters/source-adapter.ts — Source-agnostic interface for repository discovery.
 *
 * All code-hosting platform adapters (GitHub, GitLab, Bitbucket) must implement
 * this interface. Currently only GitHub is supported (MVP), but the interface
 * ensures future extensibility per NFR15.
 */

/**
 * Surface-level repository metadata returned by a discovery search.
 * This is the minimum data needed before deeper analysis (Layer 1/2).
 */
export interface DiscoveredRepo {
  fullName: string;               // "{owner}/{repo}"
  owner: string;
  name: string;
  primaryLanguage: string | null;
  starCount: number;
  forkCount: number;
  lastPushedAt: string;           // ISO 8601 string from the API
  topics: string[];
  githubUrl: string;
}

/**
 * Rate limit state returned alongside search results.
 */
export interface RateLimitInfo {
  remaining: number;
  resetAtMs: number;              // Unix epoch milliseconds
  limit: number;
}

/**
 * Result of a repository discovery search.
 */
export interface DiscoverResult {
  repos: DiscoveredRepo[];
  totalCount: number;
  rateLimit: RateLimitInfo;
}

/** User profile info returned by getUserProfile. */
export interface UserProfile {
  login: string;
  email: string | null;
  avatarUrl: string | null;
  name: string | null;
  bio: string | null;
  location: string | null;
  company: string | null;
  hireable: boolean | null;
  websiteUrl: string | null;
  followers: number | null;
  createdAt: string | null;            // ISO 8601 account creation date
}

/**
 * Source adapter interface — every code-hosting platform adapter implements this.
 */
export interface SourceAdapter {
  /** Human-readable source name (e.g., "github"). */
  readonly sourceName: string;

  /**
   * Search for repositories matching the given query.
   * @param query  Search query string (GitHub Search syntax for GitHub adapter)
   * @param limit  Maximum number of results to return
   * @returns DiscoverResult with repos, total count, and rate limit info
   */
  searchRepositories(query: string, limit: number): Promise<DiscoverResult>;

  /**
   * List repositories for a user. When authenticated with the user's own
   * token, includes private repos the token can access.
   * @param username  The GitHub username to list repos for
   * @param limit     Maximum repos to return
   * @returns DiscoverResult with repos and rate limit info
   */
  listUserRepos(username: string, limit: number): Promise<DiscoverResult>;

  /**
   * Fetch a user's public profile info (email, avatar, etc.).
   * @param username  The username to look up
   * @returns UserProfile with available info, or null if user not found
   */
  getUserProfile(username: string): Promise<UserProfile | null>;
}
