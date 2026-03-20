/**
 * src/pipeline/analysis/ai-signals.ts — AI signal detection.
 *
 * Detects AI config files/directories, analyses their evolution via git log,
 * and detects co-authored-by AI commit trailers.
 *
 * Covers: Claude, Cursor, Copilot, Aider, Windsurf, Cline, Continue.dev,
 * Cody, Codex, Amazon Q, MCP, agent engineering infrastructure, and general
 * AI context patterns.
 */

import { existsSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';
import {
  AI_CONFIG_FILES, AI_CONFIG_DIRS, CLAUDE_SUBDIRS,
  AGENT_ENGINEERING_SUBDIRS,
  AI_CONFIG_PREFIXES, AI_CONFIG_SUFFIXES, AI_TOOL_NAMES,
} from './ai-config-patterns.js';
import { analyzeFileHistory } from './ai-signals-helpers.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiSignalResult {
  aiConfigFiles: AiConfigFileSignalRaw[];
  coAuthoredByAI: boolean;
  aiAttributionPatterns: string[];
}

/** Raw AI config file signal — dates as JS Dates (converted to Timestamps at write time). */
export interface AiConfigFileSignalRaw {
  fileName: string;
  fileType: 'file' | 'directory';
  firstDetectedAt: Date;
  modificationCount: number;
  lastModifiedAt: Date;
  diffComplexity: 'minimal' | 'moderate' | 'extensive';
  isEvolved: boolean;
  originSignal: 'likely-original' | 'modified-from-template' | 'likely-copied' | 'unknown';
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Analyses a cloned repo for AI tooling signals.
 *
 * @param cloneDir  Path to the cloned repository directory (must be a git repo)
 */
export async function analyzeAiSignals(cloneDir: string): Promise<AiSignalResult> {
  const git = simpleGit(cloneDir);

  // 1. Detect AI config files/directories in the file tree
  const detectedEntries = detectAiConfigEntries(cloneDir);

  // 2. Analyse each detected entry's git history
  const aiConfigFiles: AiConfigFileSignalRaw[] = [];
  for (const entry of detectedEntries) {
    const signal = await analyzeFileHistory(git, entry.name, entry.fileType);
    if (signal) aiConfigFiles.push(signal);
  }

  // 3. Detect co-authored-by AI trailers in commit messages
  const { coAuthoredByAI, aiAttributionPatterns } = await detectAiAttribution(git);

  return { aiConfigFiles, coAuthoredByAI, aiAttributionPatterns };
}

// ─── File detection ───────────────────────────────────────────────────────────

interface DetectedEntry { name: string; fileType: 'file' | 'directory'; }

/**
 * Detects known AI config files and directories in the clone directory.
 */
function detectAiConfigEntries(cloneDir: string): DetectedEntry[] {
  const found: DetectedEntry[] = [];
  const seen = new Set<string>();

  const add = (name: string, ft: 'file' | 'directory') => {
    if (seen.has(name)) return;
    seen.add(name);
    found.push({ name, fileType: ft });
  };

  // Exact file matches
  for (const file of AI_CONFIG_FILES) {
    if (existsSync(join(cloneDir, file))) {
      add(file, isDir(join(cloneDir, file)) ? 'directory' : 'file');
    }
  }

  // Exact directory matches
  for (const dir of [...AI_CONFIG_DIRS, ...CLAUDE_SUBDIRS, ...AGENT_ENGINEERING_SUBDIRS]) {
    if (existsSync(join(cloneDir, dir))) add(dir, 'directory');
  }

  // Prefix + suffix patterns via root directory listing
  detectByPrefixAndSuffix(cloneDir, add);

  // Agent engineering: sidecar dirs, nested agent YAML files
  detectAgentInfrastructure(cloneDir, add);

  return found;
}

/** Detects files matching prefix (.aider*) and suffix (*.agent.yaml) patterns. */
function detectByPrefixAndSuffix(
  cloneDir: string,
  add: (name: string, ft: 'file' | 'directory') => void,
): void {
  try {
    for (const entry of readdirSync(cloneDir)) {
      const lower = entry.toLowerCase();
      for (const prefix of AI_CONFIG_PREFIXES) {
        if (lower.startsWith(prefix)) {
          add(entry, isDir(join(cloneDir, entry)) ? 'directory' : 'file');
        }
      }
      for (const suffix of AI_CONFIG_SUFFIXES) {
        if (lower.endsWith(suffix)) add(entry, 'file');
      }
    }
  } catch { /* skip */ }
}

/**
 * Scans for agent engineering infrastructure: *-sidecar/ dirs with sub-structures,
 * nested *.agent.yaml files inside agents/ or _bmad/ directories.
 */
function detectAgentInfrastructure(
  cloneDir: string,
  add: (name: string, ft: 'file' | 'directory') => void,
): void {
  try {
    for (const entry of readdirSync(cloneDir)) {
      const fullPath = join(cloneDir, entry);
      if (!safeLstat(fullPath)?.isDirectory()) continue;

      if (entry.endsWith('-sidecar')) {
        add(entry, 'directory');
        scanSidecarSubdirs(cloneDir, entry, add);
      } else if (entry === 'agents' || entry === '_bmad') {
        scanForAgentYaml(fullPath, entry, add);
      }
    }
  } catch { /* skip */ }
}

/** Checks for known sub-structures inside a sidecar directory. */
function scanSidecarSubdirs(
  cloneDir: string,
  sidecarName: string,
  add: (name: string, ft: 'file' | 'directory') => void,
): void {
  const SIDECAR_SIGNALS = ['knowledge', 'instincts', 'templates', 'dynamic', 'tracking'];
  for (const sub of SIDECAR_SIGNALS) {
    if (existsSync(join(cloneDir, sidecarName, sub))) {
      add(`${sidecarName}/${sub}`, 'directory');
    }
  }
}

/** Scans 2 levels deep for *.agent.yaml files inside a directory. */
function scanForAgentYaml(
  dirPath: string,
  relativePath: string,
  add: (name: string, ft: 'file' | 'directory') => void,
): void {
  try {
    for (const entry of readdirSync(dirPath)) {
      const lower = entry.toLowerCase();
      if (lower.endsWith('.agent.yaml') || lower.endsWith('.agent.json')) {
        add(`${relativePath}/${entry}`, 'file');
      }
      const nested = join(dirPath, entry);
      if (!safeLstat(nested)?.isDirectory()) continue;
      try {
        for (const inner of readdirSync(nested)) {
          const il = inner.toLowerCase();
          if (il.endsWith('.agent.yaml') || il.endsWith('.agent.json')) {
            add(`${relativePath}/${entry}/${inner}`, 'file');
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

function isDir(path: string): boolean {
  try { return lstatSync(path).isDirectory(); } catch { return false; }
}

function safeLstat(path: string) {
  try { return lstatSync(path); } catch { return null; }
}

// ─── AI attribution detection ─────────────────────────────────────────────────

async function detectAiAttribution(
  git: ReturnType<typeof simpleGit>,
): Promise<{ coAuthoredByAI: boolean; aiAttributionPatterns: string[] }> {
  let coAuthoredByAI = false;
  const patterns = new Set<string>();

  try {
    const log = await git.log({ maxCount: 200 });
    for (const commit of log.all) {
      const body = commit.body?.toLowerCase() ?? '';
      const message = commit.message?.toLowerCase() ?? '';
      const fullText = `${message}\n${body}`;

      if (fullText.includes('co-authored-by:')) {
        for (const toolName of AI_TOOL_NAMES) {
          if (fullText.includes(toolName)) {
            coAuthoredByAI = true;
            patterns.add(`co-authored-by:${toolName}`);
          }
        }
      }
      if (fullText.includes('generated by') || fullText.includes('created by')) {
        for (const toolName of AI_TOOL_NAMES) {
          if (fullText.includes(toolName)) {
            patterns.add(`attribution:${toolName}`);
          }
        }
      }
    }
  } catch { /* git log failed */ }

  return { coAuthoredByAI, aiAttributionPatterns: [...patterns].sort() };
}
