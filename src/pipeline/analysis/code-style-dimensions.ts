/**
 * src/pipeline/analysis/code-style-dimensions.ts — Style dimension analyzers.
 * Extracted from code-style.ts: naming, documentation, imports, consistency.
 */

import { readdirSync } from 'fs';

// ─── Dimension 2: Naming Descriptiveness ─────────────────────

const ACCEPTABLE_SHORT = new Set(['id', 'db', 'err', 'fn', 'cb', 'ok', 'io', 'fs', 'os', 'tx', 'rx']);

export function analyzeNaming(fileContents: string[]): number {
  const identifierRe = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  const lengths: number[] = [];
  let singleCharCount = 0;
  let totalIdCount = 0;

  for (const content of fileContents) {
    let match;
    identifierRe.lastIndex = 0;
    while ((match = identifierRe.exec(content)) !== null) {
      const name = match[1]!;
      if (name.length <= 2 && !ACCEPTABLE_SHORT.has(name)) singleCharCount++;
      lengths.push(name.length);
      totalIdCount++;
    }
  }

  if (totalIdCount < 5) return 50; // Neutral

  const medianLen = median(lengths);
  const singleCharRatio = singleCharCount / totalIdCount;
  const lenScore = Math.min(medianLen / 10, 1) * 70;
  const charScore = (1 - Math.min(singleCharRatio * 5, 1)) * 30;
  return Math.round(lenScore + charScore);
}

// ─── Dimension 3: Documentation Habits ───────────────────────

export function analyzeDocumentation(cloneDir: string, fileContents: string[]): number {
  let score = 0;

  // Sub-score 1: JSDoc/docstring coverage on exported functions (0-60)
  let exportCount = 0;
  let docExportCount = 0;
  for (const content of fileContents) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*export\s+(function|class|const|interface|type)\b/.test(lines[i]!)) {
        exportCount++;
        if (i > 0 && /\*\/\s*$|^"""|^'''/.test(lines[i - 1]!.trim())) docExportCount++;
      }
    }
  }
  score += exportCount > 0 ? Math.round((docExportCount / exportCount) * 60) : 0;

  // Sub-score 2: Project docs presence (0-25) — case-insensitive for Linux
  const docFiles = ['readme.md', 'contributing.md', 'changelog.md'];
  let docPresence = 0;
  try {
    const dirEntries = new Set(readdirSync(cloneDir).map((e) => e.toLowerCase()));
    docPresence = docFiles.filter((d) => dirEntries.has(d)).length;
  } catch { /* empty */ }
  score += docPresence === 0 ? 0 : docPresence === 1 ? 15 : docPresence === 2 ? 20 : 25;

  // Sub-score 3: Tech debt (TODO/FIXME density) (0-15)
  let totalLines = 0;
  let todoCount = 0;
  for (const content of fileContents) {
    const lines = content.split('\n');
    totalLines += lines.length;
    for (const line of lines) {
      if (/\bTODO\b|\bFIXME\b|\bHACK\b/i.test(line)) todoCount++;
    }
  }
  const todoPer1000 = totalLines > 0 ? (todoCount / totalLines) * 1000 : 0;
  if (todoPer1000 > 9) score -= 15;
  else if (todoPer1000 <= 2) score += 15;

  return Math.max(0, Math.min(100, score));
}

// ─── Dimension 4: Import Organization ────────────────────────

export function analyzeImportOrg(fileContents: string[]): number {
  const importRe = /^(?:import\s|from\s|const\s+\w+\s*=\s*require\()/;
  let filesWithImports = 0;
  let sortedCount = 0;
  let groupedCount = 0;
  let wildcardFiles = 0;

  for (const content of fileContents) {
    const lines = content.split('\n');
    const importLines: string[] = [];
    let hasGap = false;
    let hasWildcard = false;

    for (const line of lines) {
      if (importRe.test(line.trim())) {
        importLines.push(line.trim());
        if (/import\s+\*\s+as/.test(line)) hasWildcard = true;
      } else if (importLines.length > 0 && line.trim() === '') {
        hasGap = true;
      } else if (importLines.length > 0 && line.trim() !== '') {
        break;
      }
    }

    if (importLines.length < 2) continue;
    filesWithImports++;

    const sorted = importLines.every((line, i) =>
      i === 0 || line.localeCompare(importLines[i - 1]!) >= 0,
    );
    if (sorted) sortedCount++;
    if (hasGap) groupedCount++;
    if (hasWildcard) wildcardFiles++;
  }

  if (filesWithImports === 0) return 50;

  const sortScore = (sortedCount / filesWithImports) * 40;
  const groupScore = (groupedCount / filesWithImports) * 40;
  const wildcardPenalty = (wildcardFiles / filesWithImports) * 20;
  return Math.round(sortScore + groupScore + 20 - wildcardPenalty);
}

// ─── Dimension 5: Cross-File Consistency ─────────────────────

export function analyzeConsistency(fileContents: string[]): number {
  if (fileContents.length <= 1) return 50;

  const indentTypes: ('tab' | 'space')[] = [];
  const quoteTypes: ('single' | 'double')[] = [];
  const semiUsage: boolean[] = [];

  for (const content of fileContents) {
    const lines = content.split('\n').slice(0, 50);

    for (const line of lines) {
      if (line.startsWith('\t')) { indentTypes.push('tab'); break; }
      if (line.startsWith('  ')) { indentTypes.push('space'); break; }
    }

    let singles = 0, doubles = 0;
    for (const line of lines) {
      singles += (line.match(/'/g) ?? []).length;
      doubles += (line.match(/"/g) ?? []).length;
    }
    if (singles + doubles > 0) {
      quoteTypes.push(singles >= doubles ? 'single' : 'double');
    }

    let hasSemi = false;
    for (const line of lines) {
      if (/;\s*$/.test(line.trim())) { hasSemi = true; break; }
    }
    semiUsage.push(hasSemi);
  }

  let score = 0;

  if (indentTypes.length > 0) {
    const dominant = indentTypes.filter((t) => t === indentTypes[0]).length;
    score += Math.round((dominant / indentTypes.length) * 40);
  } else { score += 20; }

  if (quoteTypes.length > 0) {
    const dominant = quoteTypes.filter((t) => t === quoteTypes[0]).length;
    score += Math.round((dominant / quoteTypes.length) * 30);
  } else { score += 15; }

  if (semiUsage.length > 0) {
    const trueCount = semiUsage.filter(Boolean).length;
    const dominant = Math.max(trueCount, semiUsage.length - trueCount);
    score += Math.round((dominant / semiUsage.length) * 30);
  } else { score += 15; }

  return Math.min(100, score);
}

// ─── Utility ─────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
