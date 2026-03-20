/**
 * src/app/components/profile/analysis-tooltips.ts — Tooltip text for Analysis Details metrics.
 *
 * Extracted to keep AnalysisDetailsSection.tsx under 300 lines.
 */

// ─── Proficiency Panel ─────────────────────────────────────────────────────

export const PROFICIENCY_OVERALL =
  'Aggregate proficiency level across all technologies. ' +
  'Based on how deeply each tech\'s APIs are used (not just imported). ' +
  'Levels: beginner (<20), intermediate (20-49), advanced (50-79), expert (80+).';

export const PROFICIENCY_BONUS =
  'Extra score points awarded based on overall proficiency level. ' +
  'Beginner: +2, Intermediate: +5, Advanced: +10, Expert: +14. ' +
  'Added directly to the candidate\'s skill score.';

export const PROFICIENCY_TECH_SCORE =
  'How deeply this technology\'s APIs are used across all repos (0-100). ' +
  'Measures usage of advanced patterns, not just basic imports. ' +
  'Higher scores mean deeper, more sophisticated usage.';

// ─── Domain Expertise Panel ────────────────────────────────────────────────

export const DOMAIN_CONFIDENCE =
  'Confidence that this developer works in this domain (0-100%). ' +
  'Calculated from matching technologies weighted by relevance. ' +
  'Domains with 50%+ confidence (green bar) are strong signals.';

// ─── Code Quality Panel ────────────────────────────────────────────────────

export const QUALITY_GRADE =
  'Overall code quality grade from AST analysis of TypeScript/JavaScript files. ' +
  'A (90-100): excellent — low complexity, clean naming, small functions. ' +
  'B (75-89): good. C (60-74): average. D (40-59): below average. F (<40): poor.';

export const QUALITY_SCORE =
  'Numeric code quality score (0-100) before letter grade conversion. ' +
  'Composite of: cognitive complexity, function length, nesting depth, ' +
  'naming consistency, and error handling density.';

export const QUALITY_LOGIC_RATIO =
  'Percentage of code that is actual logic (not config, tests, docs, or generated). ' +
  'Measures how much of the codebase is hand-written business logic. ' +
  'Higher is better — below 30% means most code is boilerplate/config.';

export const QUALITY_CONFIRMED =
  'Frameworks confirmed as actually imported in source code (not just listed in package.json). ' +
  'Validates real usage — a framework in package.json but never imported doesn\'t count.';

// ─── Git History Panel ─────────────────────────────────────────────────────

export const CHURN_14D =
  'Code churn rate over the last 14 days — percentage of recently-written lines ' +
  'that were modified again within 14 days. Lower is better: low churn means code ' +
  'is stable and well-thought-out on first write.';

export const CHURN_90D =
  'Code churn rate over 90 days — same as 14d but over a longer window. ' +
  'Shows longer-term code stability. Typical healthy range: 5-15%. ' +
  'Very high churn (>30%) suggests frequent rewrites or unstable design.';

export const DISCIPLINE_LEVEL =
  'Commit discipline based on behavioral patterns. Measures: atomic commit sizes, ' +
  'type diversity (feat/fix/refactor/etc.), low remedy-commit ratio, and ' +
  'conventional commit format adherence. Higher = more disciplined workflow.';

export const MSG_QUALITY =
  'Commit message quality score (0-100). Evaluates: conventional format, ' +
  'imperative mood, descriptive content (not "fix" or "update"), ' +
  'body presence, and issue references. Higher = more informative messages.';

// ─── Architecture Panel ────────────────────────────────────────────────────

export const SOPHISTICATION_TIER =
  'Design sophistication tier from pattern detection. ' +
  'None: no patterns detected. Basic: simple patterns (MVC, modules). ' +
  'Intermediate: layered architecture, dependency injection. ' +
  'Advanced: clean/hexagonal architecture, CQRS, event sourcing.';

export const PATTERN_COUNT =
  'Number of distinct design patterns detected across all repos. ' +
  'Includes: factory, strategy, observer, decorator, repository, etc. ' +
  'Higher diversity suggests broader architectural experience.';

export const ARCH_STYLES =
  'Detected architecture styles across repos: clean, hexagonal, MVC, ' +
  'layered, modular, or flat. Based on directory structure and code organization patterns.';

export const STYLE_SCORE =
  'Code style consistency score (0-100). Composite of 5 dimensions: ' +
  'formatting consistency (25%), naming conventions (15%), documentation presence (25%), ' +
  'import organization (15%), and overall consistency (20%).';
