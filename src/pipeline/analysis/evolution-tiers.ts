/**
 * src/pipeline/analysis/evolution-tiers.ts — Tier mapping tables for evolution analysis.
 * Extracted from evolution.ts to stay within file size limits.
 */

// ─── Tech Sophistication Tiers ──────────────────────────────

export const TYPED_LANGUAGES = new Set([
  'typescript', 'rust', 'go', 'java', 'kotlin', 'swift', 'c#', 'scala', 'haskell',
]);

/** Framework tier: higher = more sophisticated. */
export const FRAMEWORK_TIER: ReadonlyArray<{ names: Set<string>; tier: number }> = [
  { names: new Set(['next.js', 'nuxt', 'remix', 'sveltekit', 'astro']), tier: 4 },
  { names: new Set(['react', 'vue', 'angular', 'svelte', 'django', 'spring']), tier: 3 },
  { names: new Set(['express', 'flask', 'fastapi', 'nestjs', 'gin', 'actix']), tier: 2 },
];

export const INFRA_TOOLS = new Set([
  'docker', 'kubernetes', 'terraform', 'ansible', 'pulumi',
  'github-actions', 'gitlab-ci', 'jenkins', 'circleci',
]);

export const DISTRIBUTED_TOOLS = new Set([
  'kafka', 'rabbitmq', 'redis', 'grpc', 'elasticsearch', 'graphql',
]);

// ─── Testing Maturity Tiers ─────────────────────────────────

export const TEST_FRAMEWORK_DEPS = new Set([
  'jest', 'vitest', 'mocha', 'pytest', 'junit', 'rspec',
  'jasmine', 'ava', 'tap', 'testing-library', 'go-test',
]);

export const E2E_DEPS = new Set([
  'playwright', 'cypress', 'selenium', 'puppeteer', 'nightwatch',
  'testcafe', 'webdriverio',
]);

export const CI_TOOLS = new Set([
  'github-actions', 'gitlab-ci', 'jenkins', 'circleci',
  'travis-ci', 'buildkite',
]);

// ─── Architecture Tiers ─────────────────────────────────────

export const DB_DEPS = new Set([
  'postgresql', 'mysql', 'mongodb', 'prisma', 'sqlalchemy',
  'typeorm', 'sequelize', 'mongoose', 'knex', 'drizzle',
  'sqlite', 'redis', 'dynamodb', 'firestore',
]);

export const QUEUE_DEPS = new Set([
  'kafka', 'rabbitmq', 'sqs', 'bull', 'celery', 'sidekiq',
]);

export const CACHE_DEPS = new Set(['redis', 'memcached', 'varnish']);

export const ORCHESTRATION_TOOLS = new Set([
  'kubernetes', 'docker-compose', 'nomad', 'docker-swarm',
]);

// ─── Dimension Weights ──────────────────────────────────────

export const DIMENSION_WEIGHTS = {
  techSophistication: 0.35,
  testingMaturity: 0.25,
  architectureComplexity: 0.25,
  aiAdoption: 0.15,
} as const;

// ─── Trend Thresholds ───────────────────────────────────────

export const TREND_THRESHOLDS = {
  rapidGrowth: 0.5,
  steadyGrowth: 0.15,
  plateau: -0.1,
} as const;

export const MAX_TRAJECTORY_POINTS = 30;
export const MAX_ADOPTION_EVENTS = 50;
