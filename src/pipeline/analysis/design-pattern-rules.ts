/**
 * src/pipeline/analysis/design-pattern-rules.ts — Pattern detection rules and constants.
 * Extracted from design-patterns.ts to stay within file size limits.
 */

import type { ArchitectureStyle } from '../../types/repository.js';

// ─── Shared Constants ────────────────────────────────────────

export const MAX_DEPTH = 3;
export const MAX_SAMPLE_FILES = 30;
export const MAX_LINES_PER_FILE = 100;
export const GOD_CLASS_LINE_THRESHOLD = 500;

export const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build', '__pycache__',
  '.venv', 'target', '.next', '.nuxt', 'coverage', '.cache',
  'bower_components', '.tox', 'venv', 'env',
]);

export const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go',
  '.rs', '.rb', '.php', '.cs', '.kt', '.scala', '.swift',
]);

export const TECH_LAYER_DIRS = new Set([
  'utils', 'helpers', 'lib', 'types', 'config', 'assets',
  'styles', 'constants', 'shared', 'common', 'src', 'test',
  'tests', 'docs', 'scripts', 'public', 'static',
]);

// ─── Tier 1: File Name Pattern Signals ───────────────────────

export const FILE_PATTERN_SIGNALS: ReadonlyArray<{
  regex: RegExp;
  patternId: string;
}> = [
  { regex: /factory/i, patternId: 'pattern:factory' },
  { regex: /strategy/i, patternId: 'pattern:strategy' },
  { regex: /observer|listener|eventemitter/i, patternId: 'pattern:observer' },
  { regex: /singleton/i, patternId: 'pattern:singleton' },
  { regex: /decorator/i, patternId: 'pattern:decorator' },
  { regex: /builder/i, patternId: 'pattern:builder' },
  { regex: /command/i, patternId: 'pattern:command' },
  { regex: /container|injector|provider/i, patternId: 'pattern:di' },
];

// ─── Tier 1: Directory Name Pattern Signals ──────────────────

export const DIR_PATTERN_SIGNALS: ReadonlyArray<{
  dir: string;
  patternId: string;
}> = [
  { dir: 'repositories', patternId: 'pattern:repository' },
  { dir: 'repos', patternId: 'pattern:repository' },
  { dir: 'services', patternId: 'pattern:service-layer' },
  { dir: 'service', patternId: 'pattern:service-layer' },
  { dir: 'controllers', patternId: 'pattern:controller' },
  { dir: 'controller', patternId: 'pattern:controller' },
  { dir: 'middleware', patternId: 'pattern:middleware' },
  { dir: 'middlewares', patternId: 'pattern:middleware' },
  { dir: 'adapters', patternId: 'pattern:adapter' },
  { dir: 'ports', patternId: 'pattern:adapter' },
  { dir: 'plugins', patternId: 'pattern:plugin-arch' },
  { dir: 'extensions', patternId: 'pattern:plugin-arch' },
  { dir: 'dto', patternId: 'pattern:dto' },
  { dir: 'dtos', patternId: 'pattern:dto' },
  { dir: 'value-objects', patternId: 'pattern:dto' },
  { dir: 'events', patternId: 'pattern:event-driven' },
  { dir: 'handlers', patternId: 'pattern:event-driven' },
  { dir: 'commands', patternId: 'pattern:event-driven' },
  { dir: 'domain', patternId: 'pattern:clean-arch' },
  { dir: 'use-cases', patternId: 'pattern:clean-arch' },
  { dir: 'usecases', patternId: 'pattern:clean-arch' },
];

// ─── Tier 2: Content Pattern Signals ─────────────────────────

export const CONTENT_SIGNALS: ReadonlyArray<{
  regex: RegExp;
  patternId: string;
  boost: boolean;  // true = only strengthens existing signal
}> = [
  { regex: /abstract\s+class/m, patternId: 'pattern:template-method', boost: false },
  { regex: /\binterface\b.*\{/m, patternId: 'pattern:interface-segregation', boost: false },
  { regex: /\.emit\(|\.on\(|addEventListener|\.subscribe\(/m, patternId: 'pattern:observer', boost: true },
  { regex: /@Injectable|@Inject|@Component|@Service/m, patternId: 'pattern:di', boost: true },
  { regex: /implements\s+\w+/m, patternId: 'pattern:interface-segregation', boost: true },
];

// ─── Architecture Style Rules ────────────────────────────────

export interface ArchRule {
  style: ArchitectureStyle;
  required: string[];
}

export const ARCH_RULES: ReadonlyArray<ArchRule> = [
  { style: 'clean', required: ['domain', 'use-cases'] },
  { style: 'clean', required: ['domain', 'usecases'] },
  { style: 'hexagonal', required: ['ports', 'adapters'] },
  { style: 'mvc', required: ['controllers', 'models', 'views'] },
  { style: 'layered', required: ['services', 'repositories', 'controllers'] },
  { style: 'layered', required: ['services', 'repositories'] },
];

// ─── Tier Points ─────────────────────────────────────────────

export const TIER_POINTS: Record<string, number> = {
  'none': 0, 'basic': 3, 'intermediate': 6, 'advanced': 10,
};
