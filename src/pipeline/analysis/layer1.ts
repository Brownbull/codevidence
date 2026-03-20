/**
 * src/pipeline/analysis/layer1.ts — Layer 1 analysis.
 *
 * Analyses a shallow clone to extract:
 * - Primary language (from file extensions + GitHub metadata)
 * - Frameworks and tools (from package/dependency manifest files)
 * - Normalised taxonomy IDs for all detected signals
 *
 * Layer 1 uses NO GitHub API calls — all work is on the local clone.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Layer1Result {
  primaryLanguage: string | null;
  detectedFrameworks: string[];   // taxonomy IDs (e.g., "framework:react")
  detectedTools: string[];        // taxonomy IDs (e.g., "tool:docker")
  detectedDependencies: string[]; // raw dependency names
  unknownSignals: UnknownSignal[];
}

export interface UnknownSignal {
  name: string;
  category: 'framework' | 'tool';
  source: string; // e.g., "package.json", "requirements.txt"
}

// ─── Taxonomy mappings ────────────────────────────────────────────────────────
// Maps known dependency names to taxonomy IDs.
// Must match IDs in scripts/seeds/taxonomy.json.

const FRAMEWORK_MAP: Record<string, string> = {
  // npm — JS/TS frameworks
  'react': 'framework:react',
  'react-dom': 'framework:react',
  'next': 'framework:nextjs',
  'vue': 'framework:vue',
  'express': 'framework:express',
  '@angular/core': 'framework:angular',
  '@angular/common': 'framework:angular',
  'svelte': 'framework:svelte',
  '@sveltejs/kit': 'framework:svelte',
  '@nestjs/core': 'framework:nestjs',
  '@nestjs/common': 'framework:nestjs',
  'nuxt': 'framework:nuxt',
  'nuxt3': 'framework:nuxt',
  '@remix-run/react': 'framework:remix',
  '@remix-run/node': 'framework:remix',
  'astro': 'framework:astro',
  'hono': 'framework:hono',
  // Python
  'fastapi': 'framework:fastapi',
  'django': 'framework:django',
  'flask': 'framework:flask',
  'starlette': 'framework:starlette',
  'streamlit': 'framework:streamlit',
  // Rust
  'actix-web': 'framework:actix',
  'axum': 'framework:axum',
  'rocket': 'framework:rocket',
  'warp': 'framework:warp',
  // Java
  'spring-boot-starter': 'framework:spring',
  'spring-boot-starter-web': 'framework:spring',
  // Ruby
  'rails': 'framework:rails',
  'railties': 'framework:rails',
  // Elixir
  'phoenix': 'framework:phoenix',
  'phoenix_html': 'framework:phoenix',
  // Go (full module paths matched in classifyDependencies)
  'github.com/gin-gonic/gin': 'framework:gin',
  'github.com/gofiber/fiber': 'framework:fiber',
  'github.com/labstack/echo': 'framework:echo',
  // npm — LLM / AI agent frameworks
  '@langchain/core': 'framework:langchain',
  '@langchain/community': 'framework:langchain',
  '@langchain/langgraph': 'framework:langgraph',
  'langchain': 'framework:langchain',
  'llamaindex': 'framework:llamaindex',
  'crewai': 'framework:crewai',
  'ai': 'framework:vercel-ai-sdk',
  // Python — LLM / AI agent frameworks
  'langchain-core': 'framework:langchain',
  'langchain-community': 'framework:langchain',
  'langgraph': 'framework:langgraph',
  'llama-index': 'framework:llamaindex',
  'llama-index-core': 'framework:llamaindex',
  'autogen': 'framework:autogen',
  'pyautogen': 'framework:autogen',
  'semantic-kernel': 'framework:semantic-kernel',
  'haystack-ai': 'framework:haystack',
  'farm-haystack': 'framework:haystack',
  'dspy-ai': 'framework:dspy',
  'dspy': 'framework:dspy',
};

const TOOL_MAP: Record<string, string> = {
  // npm — Firebase / GCP
  'firebase': 'tool:firebase',
  'firebase-admin': 'tool:firebase',
  'firebase-functions': 'tool:firebase',
  '@google-cloud/firestore': 'tool:firebase',
  // npm — GraphQL
  'graphql': 'tool:graphql',
  'apollo-server': 'tool:graphql',
  '@apollo/server': 'tool:graphql',
  // npm — build tools
  'vite': 'tool:vite',
  'webpack': 'tool:webpack',
  // npm — PostgreSQL
  'pg': 'tool:postgresql',
  'knex': 'tool:postgresql',
  'prisma': 'tool:postgresql',
  '@prisma/client': 'tool:postgresql',
  // npm — Redis
  'redis': 'tool:redis',
  'ioredis': 'tool:redis',
  // npm — AWS
  'aws-sdk': 'tool:aws',
  '@aws-sdk/client-s3': 'tool:aws',
  '@aws-sdk/client-dynamodb': 'tool:aws',
  // npm — MongoDB
  'mongodb': 'tool:mongodb',
  'mongoose': 'tool:mongodb',
  // npm — MySQL
  'mysql': 'tool:mysql',
  'mysql2': 'tool:mysql',
  // npm — SQLite
  'better-sqlite3': 'tool:sqlite',
  // npm — Message queues
  'kafkajs': 'tool:kafka',
  'amqplib': 'tool:rabbitmq',
  'nats': 'tool:nats',
  // npm — Monitoring / observability
  'prom-client': 'tool:prometheus',
  '@elastic/elasticsearch': 'tool:elasticsearch',
  '@sentry/node': 'tool:sentry',
  '@sentry/react': 'tool:sentry',
  'dd-trace': 'tool:datadog',
  // npm — gRPC
  '@grpc/grpc-js': 'tool:grpc',
  '@grpc/proto-loader': 'tool:grpc',
  // npm — ML / data
  '@tensorflow/tfjs': 'tool:tensorflow',
  '@tensorflow/tfjs-node': 'tool:tensorflow',
  // npm — Services
  '@supabase/supabase-js': 'tool:supabase',
  'stripe': 'tool:stripe',
  // Python — PostgreSQL
  'psycopg2': 'tool:postgresql',
  'psycopg2-binary': 'tool:postgresql',
  'sqlalchemy': 'tool:postgresql',
  // Python — Redis
  'redis-py': 'tool:redis',
  // Python — AWS
  'boto3': 'tool:aws',
  // Python — MongoDB
  'pymongo': 'tool:mongodb',
  // Python — MySQL
  'mysqlclient': 'tool:mysql',
  'pymysql': 'tool:mysql',
  // Python — Message queues
  'kafka-python': 'tool:kafka',
  'confluent-kafka': 'tool:kafka',
  'pika': 'tool:rabbitmq',
  'celery': 'tool:celery',
  // Python — Monitoring
  'prometheus-client': 'tool:prometheus',
  'elasticsearch': 'tool:elasticsearch',
  'sentry-sdk': 'tool:sentry',
  'ddtrace': 'tool:datadog',
  // Python — ML / data science
  'tensorflow': 'tool:tensorflow',
  'torch': 'tool:pytorch',
  'torchvision': 'tool:pytorch',
  'pandas': 'tool:pandas',
  'numpy': 'tool:numpy',
  'scikit-learn': 'tool:scikit-learn',
  'scipy': 'tool:scipy',
  // Python — Jupyter
  'jupyter': 'tool:jupyter',
  'jupyterlab': 'tool:jupyter',
  'notebook': 'tool:jupyter',
  'ipykernel': 'tool:jupyter',
  // Python — gRPC
  'grpcio': 'tool:grpc',
  // Rust — PostgreSQL
  'tokio-postgres': 'tool:postgresql',
  'sqlx': 'tool:postgresql',
  // Rust — MongoDB
  'mongodb-driver': 'tool:mongodb',
  // Go — databases & services
  'github.com/lib/pq': 'tool:postgresql',
  'github.com/go-redis/redis': 'tool:redis',
  'github.com/aws/aws-sdk-go': 'tool:aws',
  'go.mongodb.org/mongo-driver': 'tool:mongodb',
  'github.com/go-sql-driver/mysql': 'tool:mysql',
  'github.com/segmentio/kafka-go': 'tool:kafka',
  'github.com/streadway/amqp': 'tool:rabbitmq',
  'github.com/nats-io/nats.go': 'tool:nats',
  'google.golang.org/grpc': 'tool:grpc',
  // npm — LLM / AI SDKs & providers
  '@anthropic-ai/sdk': 'tool:anthropic-sdk',
  '@ai-sdk/anthropic': 'tool:anthropic-sdk',
  '@ai-sdk/openai': 'tool:openai-sdk',
  'openai': 'tool:openai-sdk',
  // Python — LLM / AI SDKs & providers
  'anthropic': 'tool:anthropic-sdk',
  // Python pip package 'openai' already matched above in npm section
  'transformers': 'tool:huggingface',
  'huggingface-hub': 'tool:huggingface',
  'huggingface_hub': 'tool:huggingface',
  'diffusers': 'tool:huggingface',
  'ollama': 'tool:ollama',
  // npm — Vector databases
  '@pinecone-database/pinecone': 'tool:pinecone',
  'chromadb': 'tool:chromadb',
  'weaviate-ts-client': 'tool:weaviate',
  '@qdrant/js-client-rest': 'tool:qdrant',
  // Python — Vector databases
  'pinecone-client': 'tool:pinecone',
  'pinecone': 'tool:pinecone',
  'chromadb-client': 'tool:chromadb',
  'weaviate-client': 'tool:weaviate',
  'qdrant-client': 'tool:qdrant',
  'pymilvus': 'tool:milvus',
};

/** Maps Python import names to taxonomy IDs (for notebook cell scanning). */
const PYTHON_IMPORT_MAP: Record<string, string> = {
  'pandas': 'tool:pandas',
  'numpy': 'tool:numpy',
  'scipy': 'tool:scipy',
  'sklearn': 'tool:scikit-learn',
  'tensorflow': 'tool:tensorflow',
  'keras': 'tool:tensorflow',
  'torch': 'tool:pytorch',
  'torchvision': 'tool:pytorch',
  'flask': 'framework:flask',
  'django': 'framework:django',
  'fastapi': 'framework:fastapi',
  'streamlit': 'framework:streamlit',
  'starlette': 'framework:starlette',
  'redis': 'tool:redis',
  'pymongo': 'tool:mongodb',
  'sqlalchemy': 'tool:postgresql',
  'psycopg2': 'tool:postgresql',
  'boto3': 'tool:aws',
  'celery': 'tool:celery',
  'kafka': 'tool:kafka',
  'elasticsearch': 'tool:elasticsearch',
  'sentry_sdk': 'tool:sentry',
  'prometheus_client': 'tool:prometheus',
  'grpc': 'tool:grpc',
  'IPython': 'tool:jupyter',
  // LLM / AI SDKs & providers
  'anthropic': 'tool:anthropic-sdk',
  'openai': 'tool:openai-sdk',
  'transformers': 'tool:huggingface',
  'huggingface_hub': 'tool:huggingface',
  'diffusers': 'tool:huggingface',
  'ollama': 'tool:ollama',
  // LLM / AI agent frameworks
  'langchain': 'framework:langchain',
  'langchain_core': 'framework:langchain',
  'langchain_community': 'framework:langchain',
  'langgraph': 'framework:langgraph',
  'llama_index': 'framework:llamaindex',
  'crewai': 'framework:crewai',
  'autogen': 'framework:autogen',
  'semantic_kernel': 'framework:semantic-kernel',
  'haystack': 'framework:haystack',
  'dspy': 'framework:dspy',
  // Vector databases
  'pinecone': 'tool:pinecone',
  'chromadb': 'tool:chromadb',
  'weaviate': 'tool:weaviate',
  'qdrant_client': 'tool:qdrant',
  'pymilvus': 'tool:milvus',
};

/** Common Python stdlib modules to exclude from notebook import scanning. */
const PYTHON_STDLIB = new Set([
  'os', 'sys', 'json', 'math', 're', 'io', 'time', 'datetime', 'collections',
  'functools', 'itertools', 'pathlib', 'typing', 'abc', 'copy', 'glob',
  'shutil', 'subprocess', 'threading', 'logging', 'warnings', 'unittest',
  'argparse', 'csv', 'hashlib', 'random', 'string', 'pickle', 'sqlite3',
  'xml', 'html', 'http', 'urllib', 'socket', 'email', 'uuid', 'decimal',
  'enum', 'dataclasses', 'contextlib', 'ast', 'inspect', 'pprint',
  'struct', 'base64', 'textwrap', 'operator', 'signal', 'platform',
]);

// File extension → language taxonomy ID
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'language:typescript',
  '.tsx': 'language:typescript',
  '.js': 'language:javascript',
  '.jsx': 'language:javascript',
  '.py': 'language:python',
  '.rs': 'language:rust',
  '.go': 'language:go',
  '.java': 'language:java',
  '.kt': 'language:kotlin',
  '.kts': 'language:kotlin',
  '.swift': 'language:swift',
  '.c': 'language:c',
  '.h': 'language:c',
  '.cpp': 'language:cpp',
  '.cc': 'language:cpp',
  '.cxx': 'language:cpp',
  '.cs': 'language:csharp',
  '.rb': 'language:ruby',
  '.ex': 'language:elixir',
  '.exs': 'language:elixir',
  '.html': 'language:html',
  '.htm': 'language:html',
  '.css': 'language:css',
  '.sh': 'language:shell',
  '.bash': 'language:shell',
  '.zsh': 'language:shell',
  '.ps1': 'language:powershell',
  '.php': 'language:php',
  '.scala': 'language:scala',
  '.r': 'language:r',
  '.dart': 'language:dart',
  '.lua': 'language:lua',
  '.pl': 'language:perl',
  '.pm': 'language:perl',
  '.hs': 'language:haskell',
  '.groovy': 'language:groovy',
  '.m': 'language:objective-c',
  '.clj': 'language:clojure',
  '.erl': 'language:erlang',
  '.fs': 'language:fsharp',
  '.fsx': 'language:fsharp',
  '.sql': 'language:sql',
  '.vue': 'language:vue',
  '.svelte': 'language:svelte',
  '.zig': 'language:zig',
  '.jl': 'language:julia',
  '.ml': 'language:ocaml',
  '.sol': 'language:solidity',
  '.scss': 'language:scss',
  '.less': 'language:less',
};

// GitHub language name → taxonomy ID
const GITHUB_LANGUAGE_MAP: Record<string, string> = {
  'TypeScript': 'language:typescript',
  'JavaScript': 'language:javascript',
  'Python': 'language:python',
  'Rust': 'language:rust',
  'Go': 'language:go',
  'Java': 'language:java',
  'Kotlin': 'language:kotlin',
  'Swift': 'language:swift',
  'C': 'language:c',
  'C++': 'language:cpp',
  'C#': 'language:csharp',
  'Ruby': 'language:ruby',
  'Elixir': 'language:elixir',
  'HTML': 'language:html',
  'CSS': 'language:css',
  'Shell': 'language:shell',
  'Bash': 'language:shell',
  'PowerShell': 'language:powershell',
  'PHP': 'language:php',
  'Scala': 'language:scala',
  'R': 'language:r',
  'Dart': 'language:dart',
  'Lua': 'language:lua',
  'Perl': 'language:perl',
  'Haskell': 'language:haskell',
  'Groovy': 'language:groovy',
  'Objective-C': 'language:objective-c',
  'Clojure': 'language:clojure',
  'Erlang': 'language:erlang',
  'F#': 'language:fsharp',
  'TSQL': 'language:tsql',
  'PLpgSQL': 'language:plsql',
  'PLSQL': 'language:plsql',
  'SQL': 'language:sql',
  'Vim Script': 'language:vim-script',
  'Dockerfile': 'language:dockerfile',
  'Makefile': 'language:makefile',
  'Nix': 'language:nix',
  'Zig': 'language:zig',
  'Julia': 'language:julia',
  'OCaml': 'language:ocaml',
  'Solidity': 'language:solidity',
  'Assembly': 'language:assembly',
  'SCSS': 'language:scss',
  'Less': 'language:less',
  'CoffeeScript': 'language:coffeescript',
  'Vue': 'language:vue',
  'Svelte': 'language:svelte',
};

// ─── Language normalizer (exported for use by handlers) ───────────────────────

/**
 * Normalizes a GitHub API language name to a taxonomy ID.
 * Returns the taxonomy ID if mapped, or auto-generates "language:<lowercase>" as fallback.
 *
 * Examples:
 *   "JavaScript"       → "language:javascript"
 *   "HTML"             → "language:html"
 *   "language:python"  → "language:python" (already normalized, passthrough)
 *   null               → null
 */
export function normalizeGitHubLanguage(githubLanguage: string | null): string | null {
  if (!githubLanguage) return null;

  // Already in taxonomy format — pass through
  if (githubLanguage.startsWith('language:')) return githubLanguage.toLowerCase();

  // Known mapping
  if (GITHUB_LANGUAGE_MAP[githubLanguage]) {
    return GITHUB_LANGUAGE_MAP[githubLanguage];
  }

  // Auto-generate taxonomy ID for unmapped languages
  return `language:${githubLanguage.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Runs Layer 1 analysis on a shallow clone.
 *
 * @param cloneDir  Path to the cloned repository directory
 * @param githubPrimaryLanguage  Primary language from GitHub API (may be null)
 */
export function analyzeLayer1(
  cloneDir: string,
  githubPrimaryLanguage: string | null
): Layer1Result {
  const frameworks = new Set<string>();
  const tools = new Set<string>();
  const deps = new Set<string>();
  const unknownSignals: UnknownSignal[] = [];

  // Detect primary language
  const primaryLanguage = detectPrimaryLanguage(cloneDir, githubPrimaryLanguage);

  // Parse all known package/dependency files
  parsePackageJson(cloneDir, frameworks, tools, deps, unknownSignals);
  parseRequirementsTxt(cloneDir, frameworks, tools, deps, unknownSignals);
  parsePyprojectToml(cloneDir, frameworks, tools, deps, unknownSignals);
  parseCargoToml(cloneDir, frameworks, tools, deps, unknownSignals);
  parseGoMod(cloneDir, frameworks, tools, deps, unknownSignals);
  parsePomXml(cloneDir, frameworks, tools, deps, unknownSignals);
  parseBuildGradle(cloneDir, frameworks, tools, deps, unknownSignals);
  parseSetupPy(cloneDir, frameworks, tools, deps, unknownSignals);
  parsePipfile(cloneDir, frameworks, tools, deps, unknownSignals);
  parseCondaEnvironment(cloneDir, frameworks, tools, deps, unknownSignals);
  parseNotebookImports(cloneDir, frameworks, tools, deps);

  // Check for tool presence via config files
  detectToolsByFiles(cloneDir, tools);

  return {
    primaryLanguage,
    detectedFrameworks: [...frameworks].sort(),
    detectedTools: [...tools].sort(),
    detectedDependencies: [...deps].sort(),
    unknownSignals,
  };
}

// ─── Language detection ───────────────────────────────────────────────────────

function detectPrimaryLanguage(
  cloneDir: string,
  githubPrimaryLanguage: string | null
): string | null {
  // If GitHub provides a primary language, normalize and use it (most reliable)
  if (githubPrimaryLanguage) {
    const normalized = normalizeGitHubLanguage(githubPrimaryLanguage);
    if (normalized) return normalized;
  }

  // Fallback: count file extensions
  const counts: Record<string, number> = {};
  countFileExtensions(cloneDir, counts, 0, 3);

  let maxCount = 0;
  let detected: string | null = null;

  for (const [ext, count] of Object.entries(counts)) {
    const langId = EXTENSION_LANGUAGE_MAP[ext];
    if (langId && count > maxCount) {
      maxCount = count;
      detected = langId;
    }
  }

  return detected;
}

/**
 * Recursively counts file extensions, stopping at maxDepth to avoid
 * traversing deep node_modules or vendor directories.
 */
function countFileExtensions(
  dir: string,
  counts: Record<string, number>,
  depth: number,
  maxDepth: number
): void {
  if (depth > maxDepth) return;

  const SKIP_DIRS = new Set([
    'node_modules', '.git', 'vendor', 'dist', 'build',
    '__pycache__', '.venv', 'venv', 'target',
  ]);

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        countFileExtensions(fullPath, counts, depth + 1, maxDepth);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (ext) {
          counts[ext] = (counts[ext] ?? 0) + 1;
        }
      }
    } catch {
      // Skip inaccessible files
    }
  }
}

// ─── Package file parsers ─────────────────────────────────────────────────────

function parsePackageJson(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'package.json');
  if (!existsSync(filePath)) return;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return;
  }

  const allDeps: string[] = [
    ...Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
    ...Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
  ];

  classifyDependencies(allDeps, 'package.json', frameworks, tools, deps, unknownSignals);
}

function parseRequirementsTxt(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'requirements.txt');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const allDeps = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('-'))
    .map((line) => {
      const part = line.split(/[>=<!\[;]/)[0];
      return part ? part.trim().toLowerCase() : '';
    })
    .filter(Boolean);

  classifyDependencies(allDeps, 'requirements.txt', frameworks, tools, deps, unknownSignals);
}

function parsePyprojectToml(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'pyproject.toml');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Simple TOML dependency extraction (handles dependencies = [...] arrays)
  const depRegex = /dependencies\s*=\s*\[([^\]]*)\]/gs;
  const allDeps: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    const block = match[1] ?? '';
    const items = block.match(/"([^"]+)"|'([^']+)'/g) ?? [];
    for (const item of items) {
      const part = item.replace(/["']/g, '').split(/[>=<!\[;]/)[0];
      const cleaned = part ? part.trim().toLowerCase() : '';
      if (cleaned) allDeps.push(cleaned);
    }
  }

  classifyDependencies(allDeps, 'pyproject.toml', frameworks, tools, deps, unknownSignals);
}

function parseCargoToml(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'Cargo.toml');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Extract crate names from [dependencies] and [dev-dependencies] sections
  const allDeps: string[] = [];
  const sectionRegex = /\[(dev-)?dependencies\]\s*\n([\s\S]*?)(?=\n\[|$)/g;

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(content)) !== null) {
    const block = match[2] ?? '';
    const lines = block.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const part = trimmed.split(/\s*=\s*/)[0];
      const crateName = part ? part.trim() : '';
      if (crateName) allDeps.push(crateName.toLowerCase());
    }
  }

  classifyDependencies(allDeps, 'Cargo.toml', frameworks, tools, deps, unknownSignals);
}

function parseGoMod(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'go.mod');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Extract module paths from require blocks and single require lines
  const allDeps: string[] = [];

  // require ( ... ) block
  const blockRegex = /require\s*\(([\s\S]*?)\)/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1] ?? '';
    const lines = block.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;
      const modulePath = trimmed.split(/\s+/)[0];
      if (modulePath) allDeps.push(modulePath);
    }
  }

  // Single require lines
  const singleRegex = /^require\s+(\S+)\s+/gm;
  while ((match = singleRegex.exec(content)) !== null) {
    const dep = match[1];
    if (dep) allDeps.push(dep);
  }

  classifyDependencies(allDeps, 'go.mod', frameworks, tools, deps, unknownSignals);
}

function parsePomXml(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'pom.xml');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Extract artifactId values from <dependency> blocks
  const allDeps: string[] = [];
  const artifactRegex = /<artifactId>\s*([^<]+)\s*<\/artifactId>/g;

  let match: RegExpExecArray | null;
  while ((match = artifactRegex.exec(content)) !== null) {
    const artifact = match[1];
    if (artifact) allDeps.push(artifact.trim().toLowerCase());
  }

  classifyDependencies(allDeps, 'pom.xml', frameworks, tools, deps, unknownSignals);
}

function parseBuildGradle(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  // Check both build.gradle (Groovy) and build.gradle.kts (Kotlin)
  const groovyPath = join(cloneDir, 'build.gradle');
  const kotlinPath = join(cloneDir, 'build.gradle.kts');
  const filePath = existsSync(groovyPath) ? groovyPath : existsSync(kotlinPath) ? kotlinPath : null;
  if (!filePath) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  // Extract artifact references from implementation/compile/api declarations
  const allDeps: string[] = [];
  const depRegex = /(?:implementation|compile|api|testImplementation)\s*[('"]([^'"]+)['")\s]/g;

  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    const depStr = match[1];
    if (!depStr) continue;
    const parts = depStr.split(':');
    // Gradle format: group:artifact:version
    const artifact = parts.length >= 2 ? (parts[1] ?? '').toLowerCase() : (parts[0] ?? '').toLowerCase();
    if (artifact) allDeps.push(artifact);
  }

  const source = existsSync(groovyPath) ? 'build.gradle' : 'build.gradle.kts';
  classifyDependencies(allDeps, source, frameworks, tools, deps, unknownSignals);
}

// ─── setup.py parser ──────────────────────────────────────────────────────────

function parseSetupPy(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'setup.py');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const allDeps: string[] = [];

  // Extract from install_requires=[...], setup_requires=[...], tests_require=[...]
  const listRegex = /(?:install_requires|setup_requires|tests_require)\s*=\s*\[([^\]]*)\]/gs;
  let match: RegExpExecArray | null;
  while ((match = listRegex.exec(content)) !== null) {
    extractPythonDeps(match[1] ?? '', allDeps);
  }

  // Extract from extras_require={...: [...], ...} nested lists
  const extrasRegex = /extras_require\s*=\s*\{([\s\S]*?)\}/gs;
  while ((match = extrasRegex.exec(content)) !== null) {
    const innerListRegex = /\[([^\]]*)\]/gs;
    let inner: RegExpExecArray | null;
    while ((inner = innerListRegex.exec(match[1] ?? '')) !== null) {
      extractPythonDeps(inner[1] ?? '', allDeps);
    }
  }

  classifyDependencies(allDeps, 'setup.py', frameworks, tools, deps, unknownSignals);
}

/** Extracts quoted package names from a Python list literal string. */
function extractPythonDeps(block: string, allDeps: string[]): void {
  const items = block.match(/"([^"]+)"|'([^']+)'/g) ?? [];
  for (const item of items) {
    const part = item.replace(/["']/g, '').split(/[>=<!\[;]/)[0];
    const cleaned = part ? part.trim().toLowerCase() : '';
    if (cleaned) allDeps.push(cleaned);
  }
}

// ─── Pipfile parser ───────────────────────────────────────────────────────────

function parsePipfile(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const filePath = join(cloneDir, 'Pipfile');
  if (!existsSync(filePath)) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const allDeps: string[] = [];
  const sectionRegex = /\[(packages|dev-packages)\]\s*\n([\s\S]*?)(?=\n\[|$)/g;

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(content)) !== null) {
    const block = match[2] ?? '';
    for (const line of block.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const pkgName = trimmed.slice(0, eqIdx).trim().toLowerCase();
      if (pkgName) allDeps.push(pkgName);
    }
  }

  classifyDependencies(allDeps, 'Pipfile', frameworks, tools, deps, unknownSignals);
}

// ─── Conda environment.yml parser ─────────────────────────────────────────────

function parseCondaEnvironment(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const ymlPath = join(cloneDir, 'environment.yml');
  const yamlPath = join(cloneDir, 'environment.yaml');
  const filePath = existsSync(ymlPath) ? ymlPath : existsSync(yamlPath) ? yamlPath : null;
  if (!filePath) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const allDeps: string[] = [];

  // Extract from dependencies: YAML list
  const depsMatch = content.match(/dependencies:\s*\n((?:\s+-[^\n]*\n?)*)/);
  if (depsMatch) {
    for (const line of (depsMatch[1] ?? '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) continue;
      const value = trimmed.slice(1).trim();
      if (value === 'pip:' || value.startsWith('python')) continue;
      const part = value.split(/[>=<=!]/)[0];
      const cleaned = part ? part.trim().toLowerCase() : '';
      if (cleaned) allDeps.push(cleaned);
    }
  }

  // Extract from nested pip: sub-list
  const pipMatch = content.match(/pip:\s*\n((?:\s+-[^\n]*\n?)*)/);
  if (pipMatch) {
    for (const line of (pipMatch[1] ?? '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) continue;
      const part = trimmed.slice(1).trim().split(/[>=<=!\[;]/)[0];
      const cleaned = part ? part.trim().toLowerCase() : '';
      if (cleaned) allDeps.push(cleaned);
    }
  }

  const source = filePath === ymlPath ? 'environment.yml' : 'environment.yaml';
  classifyDependencies(allDeps, source, frameworks, tools, deps, unknownSignals);
}

// ─── Jupyter notebook import scanner ──────────────────────────────────────────

const NOTEBOOK_SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'target', '.ipynb_checkpoints',
]);

const MAX_NOTEBOOKS = 10;

function parseNotebookImports(
  cloneDir: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
): void {
  const notebooks = findNotebookFiles(cloneDir);
  if (notebooks.length === 0) return;

  // Any .ipynb file = Jupyter detected
  tools.add('tool:jupyter');

  const allImports = new Set<string>();
  for (const nb of notebooks) {
    for (const imp of extractImportsFromNotebook(nb)) {
      allImports.add(imp);
    }
  }

  for (const imp of allImports) {
    const taxonomyId = PYTHON_IMPORT_MAP[imp] ?? PYTHON_IMPORT_MAP[imp.toLowerCase()];
    if (taxonomyId) {
      if (taxonomyId.startsWith('framework:')) {
        frameworks.add(taxonomyId);
      } else {
        tools.add(taxonomyId);
      }
    }
    deps.add(imp.toLowerCase());
  }
}

function findNotebookFiles(cloneDir: string): string[] {
  const notebooks: string[] = [];

  // Root level
  try {
    for (const entry of readdirSync(cloneDir)) {
      if (entry.endsWith('.ipynb') && !entry.startsWith('.')) {
        notebooks.push(join(cloneDir, entry));
        if (notebooks.length >= MAX_NOTEBOOKS) return notebooks;
      }
    }
  } catch {
    return notebooks;
  }

  // One level deep
  try {
    for (const entry of readdirSync(cloneDir)) {
      if (NOTEBOOK_SKIP_DIRS.has(entry)) continue;
      const dirPath = join(cloneDir, entry);
      try {
        if (!statSync(dirPath).isDirectory()) continue;
        for (const file of readdirSync(dirPath)) {
          if (file.endsWith('.ipynb') && !file.startsWith('.')) {
            notebooks.push(join(dirPath, file));
            if (notebooks.length >= MAX_NOTEBOOKS) return notebooks;
          }
        }
      } catch { continue; }
    }
  } catch { /* skip */ }

  return notebooks;
}

interface NotebookCell {
  cell_type?: string;
  source?: string[];
}

function extractImportsFromNotebook(filePath: string): string[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  let notebook: { cells?: NotebookCell[] };
  try {
    notebook = JSON.parse(content) as { cells?: NotebookCell[] };
  } catch {
    return [];
  }

  const imports = new Set<string>();
  for (const cell of notebook.cells ?? []) {
    if (cell.cell_type !== 'code') continue;
    const source = Array.isArray(cell.source) ? cell.source.join('') : '';
    const importRegex = /^(?:import|from)\s+(\w+)/gm;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(source)) !== null) {
      const mod = match[1];
      if (mod && !PYTHON_STDLIB.has(mod)) imports.add(mod);
    }
  }

  return [...imports];
}

// ─── Tool detection via config files ──────────────────────────────────────────

function detectToolsByFiles(cloneDir: string, tools: Set<string>): void {
  const fileToolMap: [string, string][] = [
    // Containers
    ['Dockerfile', 'tool:docker'],
    ['docker-compose.yml', 'tool:docker'],
    ['docker-compose.yaml', 'tool:docker'],
    ['.dockerignore', 'tool:docker'],
    // Firebase
    ['firebase.json', 'tool:firebase'],
    ['.firebaserc', 'tool:firebase'],
    // IaC
    ['terraform.tf', 'tool:terraform'],
    ['main.tf', 'tool:terraform'],
    ['ansible.cfg', 'tool:ansible'],
    ['playbook.yml', 'tool:ansible'],
    ['playbook.yaml', 'tool:ansible'],
    ['Vagrantfile', 'tool:vagrant'],
    // Kubernetes
    ['k8s', 'tool:kubernetes'],
    ['kubernetes', 'tool:kubernetes'],
    // CI/CD
    ['.github/workflows', 'tool:github-actions'],
    ['.gitlab-ci.yml', 'tool:gitlab-ci'],
    ['.circleci', 'tool:circleci'],
    ['Jenkinsfile', 'tool:jenkins'],
    // Monitoring
    ['prometheus.yml', 'tool:prometheus'],
    ['prometheus.yaml', 'tool:prometheus'],
    ['grafana', 'tool:grafana'],
    // Web servers
    ['nginx.conf', 'tool:nginx'],
    // Hosting
    ['vercel.json', 'tool:vercel'],
    ['netlify.toml', 'tool:netlify'],
    // Jupyter
    ['.ipynb_checkpoints', 'tool:jupyter'],
  ];

  for (const [file, toolId] of fileToolMap) {
    if (existsSync(join(cloneDir, file))) {
      tools.add(toolId);
    }
  }
}

// ─── Dependency classification ────────────────────────────────────────────────

function classifyDependencies(
  depNames: string[],
  source: string,
  frameworks: Set<string>,
  tools: Set<string>,
  deps: Set<string>,
  unknownSignals: UnknownSignal[]
): void {
  const seenUnknown = new Set<string>();

  for (const name of depNames) {
    if (!name) continue;
    deps.add(name);

    const lowerName = name.toLowerCase();

    if (FRAMEWORK_MAP[lowerName]) {
      frameworks.add(FRAMEWORK_MAP[lowerName]);
    } else if (TOOL_MAP[lowerName]) {
      tools.add(TOOL_MAP[lowerName]);
    } else if (!seenUnknown.has(lowerName)) {
      // Only track non-trivial dependencies as unknown signals
      // Skip common dev tools, type packages, and well-known non-framework deps
      if (!isCommonDevDep(lowerName)) {
        unknownSignals.push({ name: lowerName, category: 'framework', source });
        seenUnknown.add(lowerName);
      }
    }
  }
}

/** Returns true for common dev/build deps that aren't interesting as signals. */
function isCommonDevDep(name: string): boolean {
  const SKIP_PREFIXES = [
    '@types/', '@typescript-eslint/', '@eslint/', 'eslint-',
    'prettier', 'typescript', 'vitest', 'jest', '@jest/',
    'tailwindcss', 'autoprefixer', 'postcss', '@vitejs/',
  ];

  return SKIP_PREFIXES.some((prefix) => name.startsWith(prefix));
}
