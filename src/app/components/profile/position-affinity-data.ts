/**
 * src/app/components/profile/position-affinity-data.ts — Role definitions + computation.
 *
 * Category-based scoring: each role defines skill categories (e.g. "Language",
 * "Frontend Framework"). Any tool within a category satisfies that slot.
 * Score = categories covered / total categories.
 */

import type { Candidate } from '@/types/candidate';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillCategory {
  label: string;
  /** Any ONE of these taxonomy IDs satisfies this category */
  alternatives: string[];
}

export interface RoleDef {
  id: string;
  label: string;
  icon: string;
  categories: SkillCategory[];
}

export interface CategoryMatch {
  category: SkillCategory;
  /** Which alternatives the candidate has (empty = not covered) */
  matched: string[];
}

export interface RoleAffinity {
  role: RoleDef;
  score: number;
  coveredCount: number;
  totalCategories: number;
  categoryMatches: CategoryMatch[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const cat = (label: string, alternatives: string[]): SkillCategory =>
  ({ label, alternatives });

/** Strip prefix from taxonomy ID: "language:python" → "python" */
export function signalDisplayName(signal: string): string {
  return signal.split(':')[1] ?? signal;
}

// ─── Role Definitions ───────────────────────────────────────────────────────

export const ROLE_DEFINITIONS: RoleDef[] = [
  {
    id: 'frontend', label: 'Frontend Developer', icon: '\uD83C\uDFA8',
    categories: [
      cat('Language', ['language:javascript', 'language:typescript']),
      cat('Web Fundamentals', ['language:html', 'language:css']),
      cat('UI Framework', ['framework:react', 'framework:vue', 'framework:angular', 'framework:svelte', 'framework:ember']),
      cat('Meta-Framework', ['framework:nextjs', 'framework:nuxt', 'framework:gatsby']),
      cat('Build Tool', ['tool:vite', 'tool:webpack', 'tool:babel']),
      cat('Styling', ['tool:tailwindcss', 'tool:sass']),
    ],
  },
  {
    id: 'backend', label: 'Backend Developer', icon: '\u2699\uFE0F',
    categories: [
      cat('Language', ['language:python', 'language:java', 'language:go', 'language:rust', 'language:csharp', 'language:ruby', 'language:php', 'language:kotlin', 'language:scala', 'language:elixir']),
      cat('Framework', ['framework:express', 'framework:nestjs', 'framework:fastapi', 'framework:django', 'framework:flask', 'framework:spring', 'framework:rails', 'framework:laravel', 'framework:phoenix', 'framework:dotnet']),
      cat('Relational DB', ['tool:postgresql', 'tool:mysql', 'tool:sqlite']),
      cat('NoSQL / Cache', ['tool:mongodb', 'tool:redis', 'tool:elasticsearch']),
      cat('API / Messaging', ['tool:graphql', 'tool:rabbitmq', 'tool:kafka']),
    ],
  },
  {
    id: 'fullstack', label: 'Full Stack Developer', icon: '\uD83D\uDD04',
    categories: [
      cat('Language', ['language:javascript', 'language:typescript', 'language:python', 'language:ruby', 'language:php', 'language:java', 'language:go']),
      cat('Frontend Framework', ['framework:react', 'framework:vue', 'framework:angular', 'framework:svelte', 'framework:nextjs', 'framework:nuxt']),
      cat('Backend Framework', ['framework:express', 'framework:nestjs', 'framework:django', 'framework:flask', 'framework:rails', 'framework:laravel', 'framework:fastapi']),
      cat('Database', ['tool:postgresql', 'tool:mysql', 'tool:mongodb', 'tool:firebase', 'tool:supabase', 'tool:redis', 'tool:sqlite']),
      cat('DevOps', ['tool:docker', 'tool:kubernetes', 'tool:vercel', 'tool:heroku', 'tool:aws', 'tool:gcp']),
    ],
  },
  {
    id: 'devops', label: 'DevOps / SRE', icon: '\uD83D\uDE80',
    categories: [
      cat('Scripting', ['language:python', 'language:go', 'language:shell', 'language:bash', 'language:powershell', 'language:groovy']),
      cat('Containerization', ['tool:docker', 'tool:kubernetes']),
      cat('Infrastructure as Code', ['tool:terraform', 'tool:ansible']),
      cat('CI/CD', ['tool:jenkins', 'tool:github-actions', 'tool:gitlab-ci', 'tool:circleci']),
      cat('Cloud Platform', ['tool:aws', 'tool:azure', 'tool:gcp']),
    ],
  },
  {
    id: 'data-engineer', label: 'Data Engineer', icon: '\uD83D\uDD27',
    categories: [
      cat('Language', ['language:python', 'language:scala', 'language:java', 'language:sql', 'language:r']),
      cat('Data Pipeline', ['tool:kafka', 'tool:rabbitmq']),
      cat('Database', ['tool:postgresql', 'tool:mongodb', 'tool:redis', 'tool:elasticsearch']),
      cat('Cloud Platform', ['tool:aws', 'tool:gcp', 'tool:azure']),
      cat('Data Tooling', ['tool:pandas', 'tool:numpy', 'tool:jupyter', 'tool:anaconda']),
    ],
  },
  {
    id: 'data-scientist', label: 'Data Scientist', icon: '\uD83D\uDD2C',
    categories: [
      cat('Language', ['language:python', 'language:r']),
      cat('Notebook', ['tool:jupyter', 'tool:anaconda']),
      cat('Data Libraries', ['tool:pandas', 'tool:numpy']),
      cat('ML Framework', ['tool:tensorflow', 'tool:pytorch']),
      cat('Visualization', ['framework:streamlit', 'tool:matlab']),
    ],
  },
  {
    id: 'ml-engineer', label: 'ML Engineer', icon: '\uD83E\uDD16',
    categories: [
      cat('Language', ['language:python', 'language:cpp', 'language:rust', 'language:java']),
      cat('ML Framework', ['tool:tensorflow', 'tool:pytorch']),
      cat('Data Libraries', ['tool:pandas', 'tool:numpy']),
      cat('Containerization', ['tool:docker', 'tool:kubernetes']),
      cat('Cloud Platform', ['tool:aws', 'tool:gcp', 'tool:azure']),
    ],
  },
  {
    id: 'mobile', label: 'Mobile Developer', icon: '\uD83D\uDCF1',
    categories: [
      cat('Native Language', ['language:swift', 'language:kotlin', 'language:dart', 'language:objective-c', 'language:java']),
      cat('Cross-Platform', ['language:javascript', 'language:typescript']),
      cat('Mobile Framework', ['framework:react', 'framework:flutter', 'framework:ionic']),
      cat('Backend Service', ['tool:firebase', 'tool:supabase', 'tool:aws']),
    ],
  },
  {
    id: 'cloud-architect', label: 'Cloud Architect', icon: '\u2601\uFE0F',
    categories: [
      cat('Language', ['language:python', 'language:go', 'language:shell', 'language:bash']),
      cat('Cloud Platform', ['tool:aws', 'tool:azure', 'tool:gcp']),
      cat('Containerization', ['tool:docker', 'tool:kubernetes']),
      cat('Infrastructure as Code', ['tool:terraform', 'tool:ansible']),
      cat('Monitoring', ['tool:prometheus', 'tool:grafana', 'tool:sentry']),
    ],
  },
  {
    id: 'dba', label: 'Database Administrator', icon: '\uD83D\uDDC4\uFE0F',
    categories: [
      cat('Query Language', ['language:sql', 'language:tsql', 'language:plpgsql']),
      cat('Scripting', ['language:python', 'language:shell', 'language:bash']),
      cat('Relational DB', ['tool:postgresql', 'tool:mysql', 'tool:sqlite']),
      cat('NoSQL DB', ['tool:mongodb', 'tool:redis', 'tool:elasticsearch', 'tool:neo4j']),
    ],
  },
  {
    id: 'security', label: 'Security Engineer', icon: '\uD83D\uDD12',
    categories: [
      cat('Language', ['language:python', 'language:go', 'language:rust', 'language:c', 'language:cpp']),
      cat('Scripting', ['language:shell', 'language:bash']),
      cat('Containerization', ['tool:docker', 'tool:kubernetes']),
      cat('Cloud Platform', ['tool:aws', 'tool:azure']),
      cat('Infrastructure', ['tool:terraform', 'tool:nginx', 'tool:sentry']),
    ],
  },
  {
    id: 'qa', label: 'QA / Test Engineer', icon: '\u2705',
    categories: [
      cat('Language', ['language:javascript', 'language:typescript', 'language:python', 'language:java', 'language:ruby']),
      cat('CI/CD', ['tool:jenkins', 'tool:github-actions', 'tool:gitlab-ci', 'tool:circleci']),
      cat('Containerization', ['tool:docker', 'tool:kubernetes']),
    ],
  },
  {
    id: 'data-analyst', label: 'Data Analyst', icon: '\uD83D\uDCCA',
    categories: [
      cat('Language', ['language:python', 'language:r']),
      cat('Query Language', ['language:sql', 'language:tsql']),
      cat('Data Libraries', ['tool:pandas', 'tool:numpy', 'tool:jupyter']),
      cat('Database', ['tool:postgresql', 'tool:mysql', 'tool:elasticsearch']),
    ],
  },
  // ─── AI / LLM Roles ─────────────────────────────────────────────
  {
    id: 'agentic-ai', label: 'Agentic AI Engineer', icon: '\uD83E\uDD16',
    categories: [
      cat('Language', ['language:python', 'language:typescript', 'language:javascript']),
      cat('Agent Framework', ['framework:langchain', 'framework:autogen', 'framework:crewai', 'framework:semantic-kernel', 'framework:langgraph', 'framework:dspy']),
      cat('LLM Platform', ['tool:openai-sdk', 'tool:anthropic-sdk', 'tool:huggingface', 'tool:ollama']),
      cat('Vector DB', ['tool:pinecone', 'tool:chromadb', 'tool:weaviate', 'tool:qdrant', 'tool:milvus']),
      cat('Agent Infrastructure', [
        'ai-agent-pattern:claude-md', 'ai-agent-pattern:agents-md',
        'ai-agent-pattern:agent-definitions', 'ai-agent-pattern:mcp-config',
        'ai-agent-pattern:claude-hooks', 'ai-agent-pattern:claude-rules',
        'ai-agent-pattern:prompt-templates', 'ai-agent-pattern:agent-definition-file',
        'ai-agent-pattern:claude-commands', 'ai-agent-pattern:github-agents',
      ]),
    ],
  },
  {
    id: 'rag-engineer', label: 'RAG Engineer', icon: '\uD83D\uDDC3\uFE0F',
    categories: [
      cat('Language', ['language:python', 'language:typescript']),
      cat('Vector DB', ['tool:pinecone', 'tool:chromadb', 'tool:weaviate', 'tool:qdrant', 'tool:milvus', 'tool:elasticsearch']),
      cat('LLM Platform', ['tool:openai-sdk', 'tool:anthropic-sdk', 'tool:huggingface']),
      cat('Data Pipeline', ['tool:kafka', 'tool:rabbitmq', 'tool:redis']),
      cat('Search / Embedding', ['framework:langchain', 'framework:llamaindex', 'framework:haystack']),
    ],
  },
  {
    id: 'context-engineer', label: 'Context Engineer', icon: '\uD83C\uDFAF',
    categories: [
      cat('Language', ['language:python', 'language:typescript', 'language:javascript']),
      cat('LLM Framework', ['framework:langchain', 'framework:llamaindex', 'framework:semantic-kernel', 'framework:vercel-ai-sdk']),
      cat('LLM Platform', ['tool:openai-sdk', 'tool:anthropic-sdk', 'tool:huggingface', 'tool:ollama']),
      cat('Agent Infrastructure', [
        'ai-agent-pattern:claude-md', 'ai-agent-pattern:agents-md',
        'ai-agent-pattern:claude-hooks', 'ai-agent-pattern:claude-rules',
        'ai-agent-pattern:mcp-config', 'ai-agent-pattern:prompt-templates',
        'ai-agent-pattern:claude-commands', 'ai-agent-pattern:claude-knowledge',
        'ai-agent-pattern:copilot-instructions', 'ai-agent-pattern:cursor-rules',
      ]),
      cat('Data Store', ['tool:redis', 'tool:postgresql', 'tool:mongodb', 'tool:pinecone', 'tool:chromadb']),
    ],
  },
  {
    id: 'llm-integration', label: 'LLM Integration Engineer', icon: '\uD83D\uDD17',
    categories: [
      cat('Language', ['language:python', 'language:typescript', 'language:go']),
      cat('LLM Platform', ['tool:openai-sdk', 'tool:anthropic-sdk', 'tool:huggingface', 'tool:ollama']),
      cat('LLM Framework', ['framework:langchain', 'framework:llamaindex', 'framework:vercel-ai-sdk', 'framework:haystack']),
      cat('Backend Framework', ['framework:fastapi', 'framework:express', 'framework:nestjs', 'framework:django', 'framework:flask']),
      cat('CI/CD', ['tool:docker', 'tool:github-actions', 'tool:gitlab-ci']),
    ],
  },
  {
    id: 'ai-product', label: 'AI Product Engineer', icon: '\u2728',
    categories: [
      cat('Language', ['language:typescript', 'language:python', 'language:javascript']),
      cat('Frontend', ['framework:react', 'framework:nextjs', 'framework:vue', 'framework:svelte']),
      cat('LLM Platform', ['tool:openai-sdk', 'tool:anthropic-sdk', 'tool:huggingface']),
      cat('Backend', ['framework:express', 'framework:fastapi', 'framework:nestjs']),
      cat('Database', ['tool:postgresql', 'tool:mongodb', 'tool:redis', 'tool:firebase', 'tool:supabase']),
    ],
  },
];

// ─── Computation ────────────────────────────────────────────────────────────

export function computeAffinities(candidate: Candidate): RoleAffinity[] {
  const allSkills = new Set([
    ...candidate.detectedLanguages.map((s) => s.toLowerCase()),
    ...candidate.detectedFrameworks.map((s) => s.toLowerCase()),
    ...candidate.detectedTools.map((s) => s.toLowerCase()),
    ...candidate.aiAgentPatterns.map((s) => s.toLowerCase()),
  ]);

  return ROLE_DEFINITIONS.map((role) => {
    const categoryMatches: CategoryMatch[] = role.categories.map((category) => {
      const matched = category.alternatives.filter((alt) => allSkills.has(alt.toLowerCase()));
      return { category, matched };
    });

    // Sort: covered categories first, then uncovered
    categoryMatches.sort((a, b) => {
      if (a.matched.length > 0 && b.matched.length === 0) return -1;
      if (a.matched.length === 0 && b.matched.length > 0) return 1;
      return 0;
    });

    const coveredCount = categoryMatches.filter((m) => m.matched.length > 0).length;
    const totalCategories = role.categories.length;
    const score = totalCategories > 0 ? Math.round((coveredCount / totalCategories) * 100) : 0;

    return { role, score, coveredCount, totalCategories, categoryMatches };
  })
    .filter((a) => a.coveredCount >= 2)
    .sort((a, b) => b.score - a.score);
}
