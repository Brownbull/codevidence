/**
 * src/app/utils/position-weights.ts — Position-specific score weight profiles.
 *
 * Each position defines a weight (0-3) for every score component:
 *   0 = irrelevant for this role
 *   1 = minor relevance
 *   2 = important
 *   3 = critical
 *
 * The weighted score is normalized to 0-100: only components with weight > 0
 * contribute, and 100 is achievable only by maxing every weighted component.
 */

/** Weight for a single score component within a position profile. */
export interface ComponentWeight {
  /** Must match ScoreComponent.id */
  componentId: string;
  weight: 0 | 1 | 2 | 3;
}

export interface PositionProfile {
  id: string;
  label: string;
  icon: string;
  description: string;
  weights: ComponentWeight[];
}

// ─── Weight builder helpers ─────────────────────────────────────────────────

type WeightTuple = [id: string, weight: 0 | 1 | 2 | 3];

function buildWeights(tuples: WeightTuple[]): ComponentWeight[] {
  return tuples.map(([componentId, weight]) => ({ componentId, weight }));
}

/** All 19 component IDs in order. */
const ALL_IDS = [
  'language', 'frameworks', 'tools', 'commitSpan', 'ownership',
  'tests', 'aiSignals', 'proficiency', 'domain',
  'importConfirm', 'frameworkDepth', 'logicRatio', 'codeQuality',
  'durability', 'behavioral', 'commitMessage',
  'designPatterns', 'codeStyle',
  'evolution',
] as const;

/** Shorthand: provide weights in the same order as ALL_IDS. */
function w(...weights: (0 | 1 | 2 | 3)[]): ComponentWeight[] {
  return buildWeights(ALL_IDS.map((id, i) => [id, weights[i] ?? 1]));
}

// ─── Position Profiles ──────────────────────────────────────────────────────

export const POSITION_PROFILES: PositionProfile[] = [
  {
    id: 'frontend', label: 'Frontend Developer', icon: '\uD83C\uDFA8',
    description: 'Prioritizes UI frameworks, code quality, styling patterns, and design sophistication. De-emphasizes ops tooling.',
    //                lang fw   tool span own  test ai   prof dom  imp  depth logic qual dur  behv cmsg dpat style evol
    weights:       w( 3,   3,   2,   1,   1,   2,   1,   3,   2,   2,   3,    2,    3,   1,   1,   2,   3,   3,    1),
  },
  {
    id: 'backend', label: 'Backend Developer', icon: '\u2699\uFE0F',
    description: 'Emphasizes language depth, testing rigor, design patterns, and code durability. AI tooling is secondary.',
    weights:       w( 3,   3,   2,   2,   1,   3,   1,   3,   2,   2,   3,    2,    3,   2,   2,   2,   3,   2,    1),
  },
  {
    id: 'fullstack', label: 'Full Stack Developer', icon: '\uD83D\uDD04',
    description: 'Balanced across all dimensions. Values breadth (frameworks, domains) and practical ownership.',
    weights:       w( 3,   3,   2,   2,   2,   2,   1,   2,   3,   2,   2,    2,    2,   2,   1,   2,   2,   2,    1),
  },
  {
    id: 'devops', label: 'DevOps / SRE', icon: '\uD83D\uDE80',
    description: 'Focuses on tooling, commit discipline, and operational patterns. Framework depth and AI signals are less relevant.',
    weights:       w( 2,   1,   3,   2,   1,   2,   0,   1,   3,   1,   1,    1,    2,   2,   3,   3,   2,   2,    1),
  },
  {
    id: 'data-engineer', label: 'Data Engineer', icon: '\uD83D\uDD27',
    description: 'Values language proficiency, tooling breadth, and code durability. UI patterns are irrelevant.',
    weights:       w( 3,   2,   3,   2,   1,   2,   0,   3,   3,   1,   2,    2,    2,   2,   2,   2,   2,   1,    1),
  },
  {
    id: 'data-scientist', label: 'Data Scientist', icon: '\uD83D\uDD2C',
    description: 'Prioritizes language mastery and domain expertise. Design patterns and code style are minor.',
    weights:       w( 3,   2,   2,   1,   1,   1,   1,   3,   3,   1,   2,    2,    1,   1,   1,   1,   1,   1,    1),
  },
  {
    id: 'ml-engineer', label: 'ML Engineer', icon: '\uD83E\uDD16',
    description: 'Combines data science depth with engineering rigor. Values testing, code quality, and tool breadth.',
    weights:       w( 3,   2,   3,   2,   1,   2,   1,   3,   3,   1,   2,    2,    2,   2,   2,   2,   2,   1,    1),
  },
  {
    id: 'mobile', label: 'Mobile Developer', icon: '\uD83D\uDCF1',
    description: 'Emphasizes framework depth, code quality, and design patterns. Ops tooling is minor.',
    weights:       w( 3,   3,   1,   1,   2,   2,   1,   3,   2,   2,   3,    2,    3,   1,   1,   2,   3,   2,    1),
  },
  {
    id: 'cloud-architect', label: 'Cloud Architect', icon: '\u2601\uFE0F',
    description: 'Focuses on tooling, domain expertise, design patterns, and commit discipline over raw code quality.',
    weights:       w( 2,   1,   3,   2,   1,   2,   0,   2,   3,   1,   1,    1,    2,   2,   3,   3,   3,   2,    1),
  },
  {
    id: 'dba', label: 'Database Administrator', icon: '\uD83D\uDDC4\uFE0F',
    description: 'Values domain expertise, commit discipline, and code durability. Framework depth is irrelevant.',
    weights:       w( 2,   1,   2,   2,   1,   1,   0,   2,   3,   0,   0,    1,    1,   3,   3,   3,   1,   1,    1),
  },
  {
    id: 'security', label: 'Security Engineer', icon: '\uD83D\uDD12',
    description: 'Prioritizes code quality, durability, behavioral discipline, and domain expertise. UI concerns are irrelevant.',
    weights:       w( 2,   1,   2,   2,   1,   2,   0,   2,   3,   1,   1,    2,    3,   3,   3,   3,   2,   1,    1),
  },
  {
    id: 'qa', label: 'QA / Test Engineer', icon: '\u2705',
    description: 'Testing is paramount. Also values behavioral discipline, commit messages, and code quality.',
    weights:       w( 2,   1,   2,   2,   1,   3,   0,   1,   2,   1,   1,    1,    3,   2,   3,   3,   1,   1,    1),
  },
  {
    id: 'data-analyst', label: 'Data Analyst', icon: '\uD83D\uDCCA',
    description: 'Values language mastery and domain expertise. Engineering rigor and design patterns are minor.',
    weights:       w( 3,   1,   2,   1,   1,   1,   0,   3,   3,   1,   1,    1,    1,   1,   1,   1,   1,   1,    1),
  },
  // ─── AI / LLM Roles ────────────────────────────────────────────────────────
  {
    id: 'agentic-ai', label: 'Agentic AI Engineer', icon: '\uD83E\uDD16',
    description: 'Builds autonomous AI agents and multi-agent systems. Includes tool orchestration, progressive context disclosure, prompt engineering, and memory management. Recognizes both RAG-based and non-RAG patterns (BMAD-style agent suites, YAML pipelines, knowledge curation).',
    //                lang fw   tool span own  test ai   prof dom  imp  depth logic qual dur  behv cmsg dpat style evol
    weights:       w( 3,   3,   3,   1,   2,   2,   3,   3,   3,   2,   3,    2,    2,   1,   2,   2,   3,   1,    2),
  },
  {
    id: 'rag-engineer', label: 'RAG Engineer', icon: '\uD83D\uDDC3\uFE0F',
    description: 'Specializes in retrieval-augmented generation: vector databases, embedding pipelines, document chunking, and search relevance at scale. One approach to context engineering focused on large-corpus retrieval. Values tooling, code quality, and domain expertise.',
    weights:       w( 3,   2,   3,   2,   1,   2,   3,   3,   3,   2,   3,    2,    3,   2,   2,   2,   2,   1,    1),
  },
  {
    id: 'context-engineer', label: 'Context Engineer', icon: '\uD83C\uDFAF',
    description: 'Designs full context for LLM interactions. Broader than RAG \u2014 includes progressive context disclosure, selective knowledge loading, SSOT references, agent instructions (CLAUDE.md, AGENTS.md), hooks, and structured outputs. RAG is one tool in the toolbox, not a requirement.',
    weights:       w( 3,   2,   3,   1,   2,   2,   3,   3,   3,   2,   3,    2,    2,   1,   2,   2,   3,   2,    2),
  },
  {
    id: 'llm-integration', label: 'LLM Integration Engineer', icon: '\uD83D\uDD17',
    description: 'Integrates LLMs into production systems: API orchestration, cost/latency optimization, eval pipelines, and safety guardrails. Values testing, code quality, behavioral discipline, and AI signals.',
    weights:       w( 3,   2,   3,   2,   1,   3,   3,   2,   3,   2,   2,    2,    3,   2,   2,   2,   2,   2,    1),
  },
  {
    id: 'ai-product', label: 'AI Product Engineer', icon: '\u2728',
    description: 'Full-stack builder of AI-powered features: LLM integration + frontend + backend. Balanced across all dimensions with extra emphasis on AI signals and framework depth.',
    weights:       w( 3,   3,   2,   1,   2,   2,   3,   2,   3,   2,   3,    2,    2,   1,   1,   2,   2,   2,    2),
  },
];

/** Look up a position profile by ID. Returns undefined if not found. */
export function getPositionProfile(positionId: string): PositionProfile | undefined {
  return POSITION_PROFILES.find((p) => p.id === positionId);
}
