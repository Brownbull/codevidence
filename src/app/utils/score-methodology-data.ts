/**
 * src/app/utils/score-methodology-data.ts — Score methodology content data.
 *
 * Separated from score-methodology.ts to keep both files under 300 lines.
 * Contains the full methodology text for each of the 19 score components.
 */

export interface ScoreMethodology {
  id: string;
  name: string;
  phase: 'core' | 'phase2' | 'phase3' | 'phase4' | 'phase5';
  maxPoints: number;
  summary: string;
  methodology: string;
}

// ─── Core (Foundation) ──────────────────────────────────────────────

const language: ScoreMethodology = {
  id: 'language', name: 'Tech Stack Breadth', phase: 'core', maxPoints: 15,
  summary: 'Detects programming languages across all repositories.',
  methodology: `Awards 15 points if at least one programming language is detected across any scanned repository.

How it works: The scanner checks GitHub's language metadata for each repo, then validates against file extensions found during the shallow clone. Languages are normalized to taxonomy IDs (e.g. "JavaScript" becomes "language:javascript").

Why 15 points: Having a detectable primary language is the most fundamental signal — it confirms the candidate actually writes code. This is a binary check (all-or-nothing) because the number of languages is rewarded elsewhere through framework and tool diversity.

Edge cases: Repos with only documentation, config, or non-code files will not trigger this. The language must be recognized by GitHub's linguist library.`,
};

const frameworks: ScoreMethodology = {
  id: 'frameworks', name: 'Framework Adoption', phase: 'core', maxPoints: 20,
  summary: '4 points per unique framework, up to 5 frameworks.',
  methodology: `Awards 4 points per unique framework detected, capped at 20 points (5 frameworks).

How it works: Frameworks are detected by scanning package.json (npm), requirements.txt / pyproject.toml (Python), Cargo.toml (Rust), go.mod (Go), pom.xml / build.gradle (Java), and setup.py. Each dependency is matched against a curated taxonomy map (e.g. "react" maps to "framework:react", "django" maps to "framework:django").

Scoring logic: count(unique frameworks) * 4, capped at 20. Having 5+ frameworks earns the maximum.

What counts as a framework: Libraries that provide application structure — React, Express, Django, FastAPI, Spring Boot, etc. Utility libraries like lodash or moment are classified as tools, not frameworks.

Why it matters: Framework diversity signals breadth of experience and ability to work across different paradigms (frontend, backend, API, etc.).`,
};

const tools: ScoreMethodology = {
  id: 'tools', name: 'Tooling Ecosystem', phase: 'core', maxPoints: 9,
  summary: '3 points per dev tool, up to 3 tools.',
  methodology: `Awards 3 points per unique developer tool detected, capped at 9 points (3 tools).

How it works: Tools are detected from config files (Dockerfile, .eslintrc, webpack.config, etc.) and package dependencies. Each tool is mapped to a taxonomy ID (e.g. "tool:docker", "tool:eslint").

Scoring logic: count(unique tools) * 3, capped at 9.

What counts as a tool: Infrastructure and developer experience tools — Docker, Kubernetes, CI/CD systems, linters, bundlers, databases, monitoring tools. These are distinct from frameworks (which provide app structure) and languages.

Why it matters: Tool adoption reflects professional practices — testing infrastructure, containerization, code quality automation, and operational maturity.`,
};

const commitSpan: ScoreMethodology = {
  id: 'commitSpan', name: 'Activity Longevity', phase: 'core', maxPoints: 7,
  summary: '1 point per month of commit history, up to 7 months.',
  methodology: `Awards 1 point per month of commit history across the candidate's best repository, capped at 7 points.

How it works: The scanner computes the time difference between the earliest and latest commits in each repository. The maximum span across all repos becomes the candidate's commitSpanMonths value.

Scoring logic: min(commitSpanMonths, 7).

Why capped at 7: Beyond 7 months, additional longevity doesn't meaningfully differentiate developers. A developer with 7+ months of history has demonstrated sustained engagement.

Edge cases: Repos with a single commit have a span of 0. Repos created from templates or forks may show artificially long spans if they include the original commit history.`,
};

const ownership: ScoreMethodology = {
  id: 'ownership', name: 'Code Ownership', phase: 'core', maxPoints: 8,
  summary: '8 points if the developer owns at least one repository.',
  methodology: `Awards 8 points (all-or-nothing) if the candidate is detected as the owner of at least one scanned repository.

How it works: During the full clone (layer 2), the scanner analyzes git log to extract commit authors. If the most frequent committer's email prefix matches the GitHub username, the repo is flagged as "owner-authored."

Scoring logic: any repo with isOwnerRepo=true gives 8 points.

Why 8 points: Owning and maintaining a repository demonstrates initiative, end-to-end responsibility, and the ability to drive a project. This is a strong signal that distinguishes creators from contributors.

Common false negatives: If the git email doesn't contain the GitHub username (e.g. john.doe@gmail.com for user "jdoe"), ownership may not be detected. This is a known limitation of email-based matching.`,
};

const tests: ScoreMethodology = {
  id: 'tests', name: 'Testing Practice', phase: 'core', maxPoints: 10,
  summary: 'Best test coverage level across repos: none=0, low=2, medium=5, high=10.',
  methodology: `Awards points based on the best estimated test coverage across all repositories.

How it works: The scanner counts test files (*.test.*, *.spec.*, files in __tests__/ directories) and compares against total source files to estimate coverage level.

Scoring tiers: none (0 pts) = No test files detected. low (2 pts) = Some test files present but sparse coverage. medium (5 pts) = Moderate test file density relative to source. high (10 pts) = Strong test file presence throughout the codebase.

Why "best across repos": Using the best repo rather than average prevents penalizing developers who have experimental repos alongside well-tested projects. The signal is "can this person write tests?" not "do all their repos have tests?"

Limitations: This measures test file presence, not actual code coverage percentage. A project could have many test files with poor assertions, or few test files with excellent coverage.`,
};

const aiSignals: ScoreMethodology = {
  id: 'aiSignals', name: 'AI Tooling Adoption', phase: 'core', maxPoints: 7,
  summary: 'Points for AI assistant config files and co-authored commits.',
  methodology: `Awards points for detected AI-assisted development practices, capped at 7.

How it works: The scanner checks for: (1) AI config files (2 pts each): CLAUDE.md, .cursorrules, .github/copilot-instructions.md, .aider*, MCP config files, agent definitions, etc. (2) Co-authored-by-AI git trailers (3 pts): Git commits containing "Co-authored-by" trailers referencing AI assistants (Copilot, Claude, etc.)

Scoring logic: (config file count * 2) + (co-authored ? 3 : 0), capped at 7.

What's detected: Claude Code configs, Cursor rules, GitHub Copilot instructions, Aider configs, MCP server configs, agent definition files (.agent.yaml/.agent.json), prompt templates, and knowledge base structures.

Why it matters: AI-assisted development is a modern skill signal. Developers who configure and customize AI tools demonstrate awareness of productivity tooling and context engineering practices.`,
};

const proficiency: ScoreMethodology = {
  id: 'proficiency', name: 'Language Mastery', phase: 'core', maxPoints: 14,
  summary: 'Code complexity and idiom usage analysis per language.',
  methodology: `Awards up to 14 points based on language-specific proficiency analysis.

How it works: For each detected language, the scanner analyzes source files for advanced API usage patterns (async/await, generators, decorators), idiomatic code patterns (list comprehensions in Python, generics in TypeScript), standard library breadth, and code complexity indicators (advanced type system features, metaprogramming).

Each language receives a proficiency score (0-100). These are aggregated into a bonus using a weighted formula that favors the strongest language while giving partial credit for breadth.

Scoring logic: The proficiency bonus is computed from the top language scores, capped at 14 points. A developer with expert-level proficiency in one language and intermediate in another will score higher than someone with intermediate across three.

Limitations: Pattern-based analysis cannot fully capture code quality. It measures "what patterns are used" rather than "how well are they used." Generated or copied code may inflate scores.`,
};

const domain: ScoreMethodology = {
  id: 'domain', name: 'Domain Expertise', phase: 'core', maxPoints: 10,
  summary: '5 points per qualifying domain, up to 2 domains.',
  methodology: `Awards 5 points per detected domain with confidence >= 50%, capped at 10 points (2 domains).

How it works: The domain inference engine compares the candidate's aggregated technology signals (languages, frameworks, tools, AI agent patterns) against 21 domain definitions. Each domain has defining signals (strongly indicate the domain), supporting signals (correlate but aren't definitive), and topic keywords (GitHub repo topics).

Confidence formula: (defining matched / defining total) * 0.60 + (supporting matched / supporting total) * 0.25 + (topic match ? 1 : 0) * 0.15. A domain qualifies for scoring if confidence >= 50% and at least one defining signal is matched.

Available domains: Frontend, Backend, Full-Stack, Mobile, DevOps, Cloud, Data Scientist, ML Engineer, Security, Systems, Game Developer, Embedded, Desktop, Blockchain, QA, Technical Writer, Database, API, UI/UX, SRE, AI Agent Engineer.

Why capped at 2: Most developers have 1-3 strong domains. Capping at 2 prevents generalists from getting outsized scores while rewarding clear specialization.`,
};

// ─── Phase 2 (Validation) ───────────────────────────────────────────

const importConfirm: ScoreMethodology = {
  id: 'importConfirm', name: 'Import Validation', phase: 'phase2', maxPoints: 6,
  summary: '2 points per framework confirmed via actual import statements.',
  methodology: `Awards 2 points per framework confirmed through actual import/require statements in source code, capped at 6 points (3 frameworks).

How it works: After Layer 1 detects frameworks from package.json, Layer 2 scans source files for actual import statements. For example, if "react" is in package.json, the scanner checks for "import React from 'react'" or "require('react')" in .tsx/.jsx files.

Scoring logic: count(confirmed frameworks) * 2, capped at 6.

Why this exists: Package.json can contain unused dependencies, starter template leftovers, or transitively-included packages. Import validation confirms the developer actually uses the framework in their code.`,
};

const frameworkDepth: ScoreMethodology = {
  id: 'frameworkDepth', name: 'Framework Depth', phase: 'phase2', maxPoints: 8,
  summary: 'Deepest framework mastery level detected.',
  methodology: `Awards points based on the deepest framework mastery level found across all repos, using a ladder model.

Ladder levels (must pass each level sequentially): Beginner (1 pt) = Basic imports and fundamental API usage. Intermediate (3 pts) = Hooks, middleware, configuration, routing patterns. Advanced (5 pts) = Custom hooks, performance optimization, advanced configuration. Expert (8 pts) = Internal API usage, plugin authoring, framework extension patterns.

Best depth level across all frameworks determines the score. A developer must demonstrate each level before advancing — you can't skip from beginner to expert. This prevents false positives from copied code snippets.

Example (React): Beginner = useState/useEffect, Intermediate = useMemo/useCallback/context, Advanced = custom hooks/React.memo/lazy, Expert = concurrent features/suspense boundaries/ref forwarding.`,
};

const logicRatio: ScoreMethodology = {
  id: 'logicRatio', name: 'Logic Density', phase: 'phase2', maxPoints: 3,
  summary: 'Percentage of actual logic vs. boilerplate/config.',
  methodology: `Awards points based on what percentage of the codebase is actual logic versus boilerplate, imports, config, and generated code.

The scanner categorizes each line of TypeScript/JavaScript source code as: Logic (function bodies, control flow, computations), Boilerplate (imports, type definitions), Config (configuration objects), or Tests (excluded entirely). The ratio is: logic lines / total classified lines.

Scoring tiers: >= 70% logic = 3 pts (lean, logic-dense codebase). >= 50% = 2 pts (balanced). >= 30% = 1 pt (boilerplate-heavy). < 30% = 0 pts (mostly config/boilerplate).

Limitations: Only analyzed for TypeScript/JavaScript repos with 3+ functions. Python and other languages return null.`,
};

const codeQuality: ScoreMethodology = {
  id: 'codeQuality', name: 'Code Quality', phase: 'phase2', maxPoints: 8,
  summary: 'Grade from AST complexity analysis of TypeScript/JavaScript.',
  methodology: `Awards points based on a code quality grade derived from AST (Abstract Syntax Tree) analysis.

The scanner parses TypeScript/JavaScript files and measures four metrics per function: function length (shorter is better), nesting depth (less nesting = more readable), parameter count (fewer = better abstraction), and cyclomatic complexity (number of decision points).

Grade scoring: A (8 pts) = Score >= 80, excellent structure. B (6 pts) = Score >= 60, mostly well-structured. C (4 pts) = Score >= 40, some complexity. D (2 pts) = Score >= 20, significant issues. F (0 pts) = Score < 20, very complex.

Scope: Only production code is analyzed (test files excluded). Requires at least 3 functions to generate a grade. Python repos are not analyzed.`,
};

// ─── Phase 3 (Craftsmanship) ────────────────────────────────────────

const durability: ScoreMethodology = {
  id: 'durability', name: 'Code Durability', phase: 'phase3', maxPoints: 12,
  summary: 'How well code survives over time — churn rate + rewrite ratio.',
  methodology: `Awards up to 12 points measuring how durable the developer's code is over time.

Churn Rate (0-8 pts): What percentage of code written in the last 14 days gets modified again within that window? <= 3% = 8 pts, <= 5% = 6 pts, <= 8% = 4 pts, <= 12% = 2 pts, > 12% = 0 pts.

Rewrite Ratio (0-4 pts): What proportion of commits are full-file rewrites vs. surgical edits? 20-50% = 4 pts (healthy balance), 10-20% = 3 pts, 50-70% = 2 pts, < 10% = 1 pt, > 70% = 0 pts (excessive rewrites).

Total: churn + rewrite, capped at 12. For multiple repos, scores are weighted by commit count.

Why it matters: Developers who write code that doesn't need constant rework produce more stable, maintainable codebases.`,
};

const behavioral: ScoreMethodology = {
  id: 'behavioral', name: 'Commit Discipline', phase: 'phase3', maxPoints: 5,
  summary: 'Small commits, diverse types, low fix-after-fix rate.',
  methodology: `Awards up to 5 points measuring developer workflow discipline from commit patterns, using the best-scoring repo.

Commit Size (0-2 pts): Median lines changed per commit. <= 50 lines = 2 pts (focused), <= 150 = 1 pt, > 150 = 0 pts (unfocused).

Commit Type Diversity (0-2 pts): Variety of commit types (feat, fix, refactor, docs, test, chore). >= 0.60 = 2 pts, >= 0.30 = 1 pt, < 0.30 = 0 pts.

Remedy Ratio (0-1 pt): Percentage of commits that fix a previous commit. <= 5% = 1 pt, > 5% = 0 pts.

Why "best repo": Rewards developers who demonstrate discipline somewhere, even if experimental repos have messier history.`,
};

const commitMessage: ScoreMethodology = {
  id: 'commitMessage', name: 'Commit Clarity', phase: 'phase3', maxPoints: 8,
  summary: 'Quality of commit message writing across repos.',
  methodology: `Awards up to 8 points based on commit message quality analysis.

The scanner analyzes up to 200 commit messages per repo, evaluating: prefix convention (conventional commits like "feat:", "fix:"), descriptive content (explains what and why), appropriate length (10-72 characters), and specificity (avoids generic messages like "fix" or "update").

Scoring: floor(best repo quality score / 10), capped at 8. A repo needs >= 20 analyzed commits to qualify.

Score examples: 80+ (8 pts) = "feat: add pagination with cursor-based navigation". 60 (6 pts) = "fix: resolve null pointer in user profile". 40 (4 pts) = "add tests". 20 (2 pts) = "fix". 0 (0 pts) = "." or "asdf".

Why it matters: Clear commit messages indicate communication skills, professional workflow practices, and consideration for team collaboration.`,
};

// ─── Phase 4 (Architecture) ─────────────────────────────────────────

const designPatterns: ScoreMethodology = {
  id: 'designPatterns', name: 'Design Sophistication', phase: 'phase4', maxPoints: 10,
  summary: 'Best design pattern sophistication tier across repos.',
  methodology: `Awards points based on the most sophisticated design patterns detected in any repository.

The scanner uses regex-based pattern detection to identify: Basic patterns (module, simple factory, event handling), Intermediate patterns (strategy, observer/pub-sub, dependency injection, builder), Advanced patterns (abstract factory, decorator composition, state machines, middleware pipelines, CQRS).

Sophistication tiers: none = 0 pts, basic = 3 pts, intermediate = 6 pts, advanced = 10 pts. The tier is determined by pattern diversity and maximum sophistication level.

Anti-patterns (god objects, deep inheritance, circular dependencies) are also detected but don't subtract points.

Why "best repo": Design sophistication is about capability. A developer who demonstrates advanced patterns in one project has the skill, regardless of simpler repos.`,
};

const codeStyle: ScoreMethodology = {
  id: 'codeStyle', name: 'Style Consistency', phase: 'phase4', maxPoints: 8,
  summary: 'Naming consistency, import organization, and code formatting.',
  methodology: `Awards up to 8 points based on a composite code style score measuring consistency and discipline.

Three dimensions analyzed: (1) Naming consistency — are names consistently camelCase, snake_case, or PascalCase? (2) Import organization — are imports grouped logically and sorted? (3) Code formatting — consistent indentation, spacing, and line length.

Composite score (0-100) mapped to points: >= 76 = 8 pts (highly consistent), >= 51 = 5 pts (mostly consistent), >= 31 = 2 pts (noticeable variation), < 31 = 0 pts (inconsistent).

The scanner doesn't enforce a specific style (tabs vs. spaces, semicolons vs. not). It measures internal consistency within each codebase. Consistent code style is a strong proxy for attention to detail and team-readiness.`,
};

// ─── Phase 5 (Growth) ───────────────────────────────────────────────

const evolution: ScoreMethodology = {
  id: 'evolution', name: 'Growth Trajectory', phase: 'phase5', maxPoints: 8,
  summary: 'Cross-repo growth across tech sophistication, testing, architecture, and AI adoption.',
  methodology: `Awards up to 8 points measuring how a developer's skills evolve across repositories over time.

The scanner sorts repos by creation date and computes growth trajectories across four dimensions: Tech Sophistication, Testing Maturity, Architecture Complexity, and AI Adoption. Each produces a slope (-1 to +1) combined into a growth vector.

Growth vector scoring: >= 0.50 (rapid growth) = 4 pts, >= 0.30 (steady) = 3 pts, >= 0.15 (gradual) = 2 pts, >= 0.00 (stable) = 1 pt, < 0.00 (regression) = 0 pts. Additional points from breadth and span (up to 4 more), total cap 8.

Requires at least 2 repositories with valid dates. Candidates with a single repo receive 0 points.

Why it matters: Growth trajectory distinguishes developers who are actively improving from those who have plateaued. A junior with a strong growth signal may be more valuable than a senior showing stagnation.`,
};

export const SCORE_METHODOLOGY_DATA: ScoreMethodology[] = [
  language, frameworks, tools, commitSpan, ownership, tests, aiSignals, proficiency, domain,
  importConfirm, frameworkDepth, logicRatio, codeQuality,
  durability, behavioral, commitMessage,
  designPatterns, codeStyle,
  evolution,
];
