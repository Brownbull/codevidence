/**
 * src/pipeline/analysis/ts-metrics.ts — TypeScript AST-based code metrics.
 *
 * Uses the TypeScript compiler API to compute per-file and per-function
 * metrics: cognitive complexity, function length, nesting depth,
 * naming consistency, and error handling density.
 * Runs in Layer 1 on shallow clone. Zero API cost.
 */

import ts from 'typescript';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FunctionMetric {
  name: string;
  lineCount: number;
  complexity: number;
  maxNesting: number;
  parameterCount: number;
  hasErrorHandling: boolean;
}

export interface FileMetrics {
  filePath: string;
  functions: FunctionMetric[];
  totalLines: number;
  namingStyle: 'camelCase' | 'snake_case' | 'mixed';
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COMPLEXITY_INCREMENTS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.SwitchStatement,
]);

const NESTING_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.TryStatement,
]);

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Analyzes a single TypeScript/JavaScript file for code metrics.
 * Returns null if the file cannot be parsed.
 */
export function analyzeFileMetrics(
  filePath: string,
  content: string,
): FileMetrics | null {
  const sourceFile = createSourceFile(filePath, content);
  if (!sourceFile) return null;

  const functions: FunctionMetric[] = [];
  extractFunctions(sourceFile, sourceFile, functions);

  const names = functions.map((f) => f.name).filter((n) => n !== '<anonymous>');
  const namingStyle = classifyNamingStyle(names);
  const totalLines = content.split('\n').length;

  return { filePath, functions, totalLines, namingStyle };
}

// ─── AST Parsing ────────────────────────────────────────────────────────────

function createSourceFile(
  filePath: string, content: string,
): ts.SourceFile | null {
  try {
    const lang = filePath.endsWith('.tsx') || filePath.endsWith('.jsx')
      ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, lang);
  } catch {
    return null;
  }
}

function extractFunctions(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  out: FunctionMetric[],
): void {
  if (isFunctionLike(node)) {
    const metric = analyzeFunctionNode(node, sourceFile);
    if (metric) out.push(metric);
  }
  ts.forEachChild(node, (child) => extractFunctions(child, sourceFile, out));
}

function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node)
  );
}

// ─── Function Analysis ──────────────────────────────────────────────────────

function analyzeFunctionNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): FunctionMetric | null {
  const name = getFunctionName(node);
  const body = getFunctionBody(node);
  if (!body) return null;

  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
  const lineCount = endLine - startLine + 1;

  // Skip trivial functions (single-line getters, etc.)
  if (lineCount < 2) return null;

  const complexity = computeComplexity(body);
  const maxNesting = computeMaxNesting(body, 0);
  const parameterCount = getParameterCount(node);
  const hasErrorHandling = containsTryCatch(body);

  return { name, lineCount, complexity, maxNesting, parameterCount, hasErrorHandling };
}

function getFunctionName(node: ts.Node): string {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name?.getText() ?? '<anonymous>';
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && parent.name) {
      return parent.name.getText();
    }
    if (ts.isPropertyAssignment(parent) && parent.name) {
      return parent.name.getText();
    }
  }
  return '<anonymous>';
}

function getFunctionBody(node: ts.Node): ts.Node | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.body ?? null;
  }
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return node.body;
  }
  return null;
}

function getParameterCount(node: ts.Node): number {
  if (
    ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) || ts.isFunctionExpression(node)
  ) {
    return node.parameters.length;
  }
  return 0;
}

// ─── Cognitive Complexity (SonarSource-inspired) ────────────────────────────

function computeComplexity(node: ts.Node): number {
  let complexity = 0;
  function walk(n: ts.Node): void {
    if (COMPLEXITY_INCREMENTS.has(n.kind)) complexity++;
    // Logical operators add complexity
    if (ts.isBinaryExpression(n)) {
      if (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        complexity++;
      }
    }
    ts.forEachChild(n, walk);
  }
  ts.forEachChild(node, walk);
  return complexity;
}

function computeMaxNesting(node: ts.Node, depth: number): number {
  let max = depth;
  function walk(n: ts.Node, d: number): void {
    const nextDepth = NESTING_KINDS.has(n.kind) ? d + 1 : d;
    if (nextDepth > max) max = nextDepth;
    ts.forEachChild(n, (child) => walk(child, nextDepth));
  }
  ts.forEachChild(node, (child) => walk(child, depth));
  return max;
}

function containsTryCatch(node: ts.Node): boolean {
  let found = false;
  function walk(n: ts.Node): void {
    if (found) return;
    if (n.kind === ts.SyntaxKind.TryStatement) { found = true; return; }
    ts.forEachChild(n, walk);
  }
  ts.forEachChild(node, walk);
  return found;
}

// ─── Naming Consistency ─────────────────────────────────────────────────────

const CAMEL_RE = /^[a-z][a-zA-Z0-9]*$/;
const SNAKE_RE = /^[a-z][a-z0-9_]*$/;

function classifyNamingStyle(names: string[]): 'camelCase' | 'snake_case' | 'mixed' {
  if (names.length === 0) return 'mixed'; // No data → don't inflate consistency
  let camel = 0;
  let snake = 0;
  for (const name of names) {
    if (CAMEL_RE.test(name)) camel++;
    else if (SNAKE_RE.test(name)) snake++;
  }
  if (camel >= names.length * 0.7) return 'camelCase';
  if (snake >= names.length * 0.7) return 'snake_case';
  return 'mixed';
}
