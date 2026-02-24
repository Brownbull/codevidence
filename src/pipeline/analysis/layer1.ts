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
  // npm
  'react': 'framework:react',
  'react-dom': 'framework:react',
  'next': 'framework:nextjs',
  'vue': 'framework:vue',
  'express': 'framework:express',
  // Python
  'fastapi': 'framework:fastapi',
  'django': 'framework:django',
  'flask': 'framework:flask',
  // Rust
  'actix-web': 'framework:actix',
  'axum': 'framework:axum',
  // Java
  'spring-boot-starter': 'framework:spring',
  'spring-boot-starter-web': 'framework:spring',
  // Ruby
  'rails': 'framework:rails',
  'railties': 'framework:rails',
  // Elixir
  'phoenix': 'framework:phoenix',
  'phoenix_html': 'framework:phoenix',
};

const TOOL_MAP: Record<string, string> = {
  // npm
  'firebase': 'tool:firebase',
  'firebase-admin': 'tool:firebase',
  'firebase-functions': 'tool:firebase',
  '@google-cloud/firestore': 'tool:firebase',
  'graphql': 'tool:graphql',
  'apollo-server': 'tool:graphql',
  '@apollo/server': 'tool:graphql',
  'vite': 'tool:vite',
  'pg': 'tool:postgresql',
  'knex': 'tool:postgresql',
  'prisma': 'tool:postgresql',
  '@prisma/client': 'tool:postgresql',
  'redis': 'tool:redis',
  'ioredis': 'tool:redis',
  'aws-sdk': 'tool:aws',
  '@aws-sdk/client-s3': 'tool:aws',
  // Python
  'psycopg2': 'tool:postgresql',
  'psycopg2-binary': 'tool:postgresql',
  'sqlalchemy': 'tool:postgresql',
  'redis-py': 'tool:redis',
  'boto3': 'tool:aws',
  // Rust
  'tokio-postgres': 'tool:postgresql',
  'sqlx': 'tool:postgresql',
  // Go
  'github.com/lib/pq': 'tool:postgresql',
  'github.com/go-redis/redis': 'tool:redis',
  'github.com/aws/aws-sdk-go': 'tool:aws',
};

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
  '.rb': 'language:ruby',
  '.ex': 'language:elixir',
  '.exs': 'language:elixir',
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
  'Ruby': 'language:ruby',
  'Elixir': 'language:elixir',
};

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
  // If GitHub provides a primary language, use it (most reliable)
  if (githubPrimaryLanguage && GITHUB_LANGUAGE_MAP[githubPrimaryLanguage]) {
    return GITHUB_LANGUAGE_MAP[githubPrimaryLanguage];
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

// ─── Tool detection via config files ──────────────────────────────────────────

function detectToolsByFiles(cloneDir: string, tools: Set<string>): void {
  const fileToolMap: [string, string][] = [
    ['Dockerfile', 'tool:docker'],
    ['docker-compose.yml', 'tool:docker'],
    ['docker-compose.yaml', 'tool:docker'],
    ['.dockerignore', 'tool:docker'],
    ['firebase.json', 'tool:firebase'],
    ['.firebaserc', 'tool:firebase'],
    ['terraform.tf', 'tool:terraform'],
    ['main.tf', 'tool:terraform'],
    ['.github/workflows', 'tool:github-actions'],
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
