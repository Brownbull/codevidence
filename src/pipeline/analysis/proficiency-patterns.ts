/**
 * src/pipeline/analysis/proficiency-patterns.ts — Proficiency pattern catalog.
 *
 * Defines regex patterns used to assess code proficiency for each technology.
 * Each pattern has a weight, the level it indicates, and matching rules.
 * Anti-patterns subtract from the score to penalise bad practices.
 *
 * Currently covers: React, TypeScript, Python, Docker, Testing (cross-tech).
 * Maintenance: review and update quarterly (~2hr/quarter).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type PatternLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PatternDef {
  id: string;
  level: PatternLevel;
  weight: number;            // relative contribution (1-5)
  isAntiPattern: boolean;    // true = subtracts from score
  contentPattern?: string;   // regex matched against file content
  fileExists?: string;       // check specific file relative to clone root
  fileExtensions?: string[]; // only scan files with these extensions
}

export interface TechPatternSet {
  technologyId: string;        // taxonomy ID (e.g. "framework:react")
  totalPossibleWeight: number; // sum of all positive pattern weights
  patterns: PatternDef[];
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function sumPositiveWeights(patterns: PatternDef[]): number {
  return patterns
    .filter((p) => !p.isAntiPattern)
    .reduce((sum, p) => sum + p.weight, 0);
}

// ─── Pattern Catalog ────────────────────────────────────────────────────────

const REACT_PATTERNS: PatternDef[] = [
  // Anti-patterns
  { id: 'react:class-component', level: 'beginner', weight: 2, isAntiPattern: true,
    contentPattern: 'extends\\s+(?:React\\.)?Component', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:prop-drilling', level: 'beginner', weight: 1, isAntiPattern: true,
    contentPattern: 'props\\.\\w+\\.\\w+\\.\\w+', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:any-props', level: 'beginner', weight: 1, isAntiPattern: true,
    contentPattern: 'props:\\s*any', fileExtensions: ['.tsx'] },
  // Intermediate
  { id: 'react:hooks-basic', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'use(?:State|Effect)\\(', fileExtensions: ['.tsx', '.jsx', '.ts', '.js'] },
  { id: 'react:hooks-advanced', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'use(?:Callback|Memo|Ref|Reducer)\\(', fileExtensions: ['.tsx', '.jsx', '.ts', '.js'] },
  { id: 'react:custom-hooks', level: 'intermediate', weight: 4, isAntiPattern: false,
    contentPattern: 'export\\s+(?:function|const)\\s+use[A-Z]', fileExtensions: ['.tsx', '.ts', '.jsx', '.js'] },
  { id: 'react:context-api', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'createContext|useContext', fileExtensions: ['.tsx', '.ts', '.jsx', '.js'] },
  // Advanced
  { id: 'react:error-boundary', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: 'componentDidCatch|getDerivedStateFromError|ErrorBoundary', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:suspense', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '<Suspense|React\\.Suspense|React\\.lazy', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:memo-optimization', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'React\\.memo\\(|memo\\(', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:portal', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'createPortal|ReactDOM\\.createPortal', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:forwardref', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'forwardRef|React\\.forwardRef', fileExtensions: ['.tsx', '.jsx'] },
  { id: 'react:concurrent', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: 'useTransition|useDeferredValue|startTransition', fileExtensions: ['.tsx', '.jsx', '.ts'] },
  { id: 'react:test-files', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'render\\(|screen\\.|fireEvent\\.|userEvent\\.', fileExtensions: ['.test.tsx', '.test.jsx'] },
];

const TYPESCRIPT_PATTERNS: PatternDef[] = [
  // Anti-patterns
  { id: 'ts:any-usage', level: 'beginner', weight: 2, isAntiPattern: true,
    contentPattern: ':\\s*any(?:\\s|\\[|,|\\)|;|$)', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:ts-ignore', level: 'beginner', weight: 2, isAntiPattern: true,
    contentPattern: '@ts-ignore|@ts-nocheck', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:type-assertion-any', level: 'beginner', weight: 1, isAntiPattern: true,
    contentPattern: 'as\\s+any', fileExtensions: ['.ts', '.tsx'] },
  // Intermediate
  { id: 'ts:interfaces', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'export\\s+(?:interface|type)\\s+\\w+', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:generics', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'function\\s+\\w+\\s*<|<T(?:\\s|,|>|\\s+extends)', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:enums', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: 'export\\s+(?:const\\s+)?enum\\s+', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:discriminated-unions', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: "type:\\s*['\"]\\w+['\"]", fileExtensions: ['.ts', '.tsx'] },
  // Advanced
  { id: 'ts:utility-types', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '(?:Partial|Required|Readonly|Pick|Omit|ReturnType|Awaited|Extract|Exclude)<', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:strict-config', level: 'advanced', weight: 5, isAntiPattern: false,
    contentPattern: '"strict"\\s*:\\s*true', fileExists: 'tsconfig.json' },
  { id: 'ts:mapped-types', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '\\[\\w+\\s+in\\s+keyof|\\[\\w+\\s+in\\s+', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:conditional-types', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '\\w+\\s+extends\\s+\\w+\\s*\\?\\s*\\w+\\s*:', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:template-literals', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'type\\s+\\w+\\s*=\\s*`', fileExtensions: ['.ts', '.tsx'] },
  { id: 'ts:decorators', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: '@\\w+\\(|experimentalDecorators', fileExtensions: ['.ts', '.tsx'] },
];

const PYTHON_PATTERNS: PatternDef[] = [
  // Intermediate
  { id: 'py:type-hints', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'def\\s+\\w+\\([^)]*:\\s*\\w+', fileExtensions: ['.py'] },
  { id: 'py:dataclasses', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: '@dataclass|from dataclasses import', fileExtensions: ['.py'] },
  { id: 'py:async-await', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'async\\s+def|await\\s+', fileExtensions: ['.py'] },
  { id: 'py:context-managers', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: '__enter__|__exit__|@contextmanager', fileExtensions: ['.py'] },
  { id: 'py:list-comprehension', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: '\\[\\w+\\s+for\\s+\\w+\\s+in\\s+', fileExtensions: ['.py'] },
  { id: 'py:f-strings', level: 'intermediate', weight: 1, isAntiPattern: false,
    contentPattern: "f['\"]", fileExtensions: ['.py'] },
  // Advanced
  { id: 'py:protocols', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: 'from typing import Protocol|class\\s+\\w+\\(Protocol\\)', fileExtensions: ['.py'] },
  { id: 'py:generators', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'yield\\s+|yield\\s+from', fileExtensions: ['.py'] },
  { id: 'py:metaclass', level: 'advanced', weight: 5, isAntiPattern: false,
    contentPattern: 'metaclass=|__metaclass__|ABCMeta', fileExtensions: ['.py'] },
  { id: 'py:abstract-base', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'from abc import|ABC,|ABCMeta|@abstractmethod', fileExtensions: ['.py'] },
  { id: 'py:pydantic', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'from pydantic import|class\\s+\\w+\\(BaseModel\\)', fileExtensions: ['.py'] },
  { id: 'py:testing', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'import pytest|from pytest|def test_', fileExtensions: ['.py'] },
  { id: 'py:typing-advanced', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: 'TypeVar|Generic\\[|ParamSpec|TypeGuard|overload', fileExtensions: ['.py'] },
];

const DOCKER_PATTERNS: PatternDef[] = [
  // Anti-patterns
  { id: 'docker:root-user', level: 'beginner', weight: 2, isAntiPattern: true,
    contentPattern: '^USER\\s+root', fileExists: 'Dockerfile' },
  { id: 'docker:latest-tag', level: 'beginner', weight: 1, isAntiPattern: true,
    contentPattern: 'FROM\\s+\\w+:latest', fileExists: 'Dockerfile' },
  // Beginner
  { id: 'docker:basic-dockerfile', level: 'beginner', weight: 2, isAntiPattern: false,
    fileExists: 'Dockerfile' },
  { id: 'docker:dockerignore', level: 'beginner', weight: 1, isAntiPattern: false,
    fileExists: '.dockerignore' },
  // Intermediate
  { id: 'docker:compose', level: 'intermediate', weight: 3, isAntiPattern: false,
    fileExists: 'docker-compose.yml' },
  { id: 'docker:compose-yaml', level: 'intermediate', weight: 3, isAntiPattern: false,
    fileExists: 'docker-compose.yaml' },
  { id: 'docker:env-vars', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: '^ENV\\s+\\w+', fileExists: 'Dockerfile' },
  { id: 'docker:volume', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: '^VOLUME\\s+', fileExists: 'Dockerfile' },
  // Advanced
  { id: 'docker:multistage', level: 'advanced', weight: 5, isAntiPattern: false,
    contentPattern: 'FROM\\s+\\S+\\s+[Aa][Ss]\\s+\\w+', fileExists: 'Dockerfile' },
  { id: 'docker:healthcheck', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '^HEALTHCHECK\\s+', fileExists: 'Dockerfile' },
  { id: 'docker:non-root', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: '^USER\\s+(?!root)\\w+', fileExists: 'Dockerfile' },
  { id: 'docker:cache-busting', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'COPY\\s+package\\*?\\.json|COPY\\s+requirements\\.txt', fileExists: 'Dockerfile' },
];

const TESTING_PATTERNS: PatternDef[] = [
  // Beginner
  { id: 'test:has-test-files', level: 'beginner', weight: 2, isAntiPattern: false,
    fileExtensions: ['.test.ts', '.test.tsx', '.test.js', '.test.jsx', '.spec.ts', '.spec.js'] },
  // Intermediate
  { id: 'test:mocking', level: 'intermediate', weight: 3, isAntiPattern: false,
    contentPattern: 'jest\\.mock|vi\\.mock|unittest\\.mock|@patch|MagicMock|mock\\(' },
  { id: 'test:assertions-rich', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: 'toHaveBeenCalledWith|toHaveBeenCalledTimes|toMatchSnapshot|assert_called_with' },
  { id: 'test:setup-teardown', level: 'intermediate', weight: 2, isAntiPattern: false,
    contentPattern: 'beforeEach|afterEach|beforeAll|afterAll|setUp|tearDown|@pytest\\.fixture' },
  // Advanced
  { id: 'test:e2e-dir', level: 'advanced', weight: 4, isAntiPattern: false,
    fileExtensions: ['.e2e.ts', '.e2e.js'] },
  { id: 'test:parameterized', level: 'advanced', weight: 4, isAntiPattern: false,
    contentPattern: 'test\\.each|describe\\.each|@pytest\\.mark\\.parametrize|parameterize' },
  { id: 'test:coverage-config', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'coverageThreshold|coverage:|--coverage|\\bcov\\b' },
  { id: 'test:integration', level: 'advanced', weight: 3, isAntiPattern: false,
    contentPattern: 'supertest|httpx\\.AsyncClient|TestClient|request\\(' },
];

// ─── Assembled Catalog ──────────────────────────────────────────────────────

function buildPatternSet(technologyId: string, patterns: PatternDef[]): TechPatternSet {
  return { technologyId, totalPossibleWeight: sumPositiveWeights(patterns), patterns };
}

export const PROFICIENCY_PATTERNS: TechPatternSet[] = [
  buildPatternSet('framework:react', REACT_PATTERNS),
  buildPatternSet('language:typescript', TYPESCRIPT_PATTERNS),
  buildPatternSet('language:python', PYTHON_PATTERNS),
  buildPatternSet('tool:docker', DOCKER_PATTERNS),
  buildPatternSet('testing', TESTING_PATTERNS),
];

/** Returns pattern sets relevant to the detected technologies. */
export function getRelevantPatternSets(
  primaryLanguage: string | null,
  detectedFrameworks: string[],
  detectedTools: string[],
): TechPatternSet[] {
  const allSignals = new Set<string>();
  if (primaryLanguage) allSignals.add(primaryLanguage);
  for (const fw of detectedFrameworks) allSignals.add(fw);
  for (const tool of detectedTools) allSignals.add(tool);

  return PROFICIENCY_PATTERNS.filter((ps) =>
    ps.technologyId === 'testing' || allSignals.has(ps.technologyId)
  );
}
