import type { Timestamp } from 'firebase/firestore';

/**
 * AiConfigFileSignal — tracks a single AI config file found in a repository.
 * Used to build the evidence trail for the AI Maturity Score model.
 */
export interface AiConfigFileSignal {
  fileName: string;
  fileType: 'file' | 'directory';
  firstDetectedAt: Timestamp;
  modificationCount: number;
  lastModifiedAt: Timestamp;
  diffComplexity: 'minimal' | 'moderate' | 'extensive';
  isEvolved: boolean;
  originSignal: 'likely-original' | 'modified-from-template' | 'likely-copied' | 'unknown';
}

/**
 * ProficiencySignal — a single code pattern observed in a repository.
 * Detected during Layer 1 proficiency analysis by matching regex patterns
 * against source files in the shallow clone.
 */
export interface ProficiencySignal {
  technology: string;    // taxonomy ID, e.g. "framework:react"
  patternId: string;     // e.g. "react:custom-hooks"
  level: 'beginner' | 'intermediate' | 'advanced';
  occurrences: number;   // how many times detected in scanned files
}

/**
 * TechProficiency — aggregated proficiency for one technology in a repository.
 * Computed from all ProficiencySignals for that technology.
 */
export interface TechProficiency {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number;         // 0-100 normalized
  patternCount: number;  // total unique positive patterns detected
  topPatterns: string[]; // up to 5 most significant pattern IDs
}

/**
 * FrameworkDepthEntry — per-framework depth classification from API usage analysis.
 * Computed during Layer 1 import analysis by matching framework-specific patterns.
 */
export interface FrameworkDepthEntry {
  frameworkId: string;          // taxonomy ID, e.g. "framework:react"
  depth: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;           // 0-1
  evidenceCount: number;        // distinct API patterns matched
  specificAPIs: string[];       // e.g. ["useState", "useContext"], max 10
}

/**
 * CodeQualityMetrics — aggregated code quality from AST analysis (TS/JS only).
 * Null when language is unsupported or insufficient functions found.
 */
export interface CodeQualityMetrics {
  filesAnalyzed: number;
  functionCount: number;
  medianComplexity: number;
  p90Complexity: number;
  medianFunctionLength: number;
  p90FunctionLength: number;
  maxNestingDepth: number;
  namingConsistency: number;            // 0-100
  errorHandlingRatio: number;           // 0-100
  codeQualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  codeQualityScore: number;            // 0-100
}

/** Code durability metrics computed from git log history (Layer 2). */
export interface CodeDurabilityMetrics {
  churnRate14d: number;        // 0.0-1.0
  churnRate90d: number;        // 0.0-1.0
  ownerChurnRate14d: number;   // 0.0-1.0
  ownerChurnRate90d: number;   // 0.0-1.0
  rewriteRatio: number;        // deleted/added, clamped 0-2.0
  avgFileChurnCount: number;
  hotFileCount: number;        // files with >10 modifications
  totalLinesAnalyzed: number;
}

/** Behavioral commit pattern metrics from git log analysis (Layer 2). */
export interface BehavioralMetrics {
  commitSizeMedian: number;
  commitSizeP90: number;
  commitBurstiness: number;         // Goh-Barabasi, -1 to +1
  conventionalCommitRatio: number;  // 0.0-1.0
  commitTypeDiversity: number;      // normalized Shannon entropy, 0.0-1.0
  refactorCommitRatio: number;
  remedyCommitRatio: number;        // quick-fix follow-ups within 5 min
  commitMessageMedianLength: number;
  uniqueMessageRatio: number;
}

/** A detected design pattern signal in a repository. */
export interface DesignPatternSignal {
  patternId: string;         // e.g., "pattern:factory", "pattern:observer"
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];        // file paths or directory names that triggered detection (max 5)
}

/** Detected architecture style from directory structure analysis. */
export type ArchitectureStyle =
  | 'mvc'           // controllers/ + models/ + views/
  | 'clean'         // domain/ + use-cases/
  | 'hexagonal'     // ports/ + adapters/
  | 'layered'       // services/ + repositories/ + controllers/
  | 'modular'       // feature-based directory structure
  | 'flat'          // no clear structure
  ;

/** Code style discipline metrics from file-level heuristic analysis. */
export interface CodeStyleMetrics {
  formattingToolScore: number;      // 0-100
  namingDescriptiveness: number;    // 0-100
  documentationHabits: number;      // 0-100
  importOrganization: number;       // 0-100
  crossFileConsistency: number;     // 0-100
  compositeStyleScore: number;      // 0-100 weighted average
  formattingToolsDetected: string[];
  filesAnalyzed: number;
}

/** Commit message quality metrics from git log analysis (Layer 2). */
export interface CommitMessageQuality {
  totalAnalyzed: number;
  conventionalRatio: number;
  imperativeRatio: number;
  weakRatio: number;               // lower is better
  bodyPresenceRatio: number;
  issueReferenceRatio: number;
  avgSubjectLength: number;
  typeDistribution: Record<string, number>;
  qualityScore: number;            // 0-100 composite
}

/**
 * Converts a repo fullName ("owner/repo") to a safe Firestore doc ID.
 * Firestore doc IDs cannot contain "/" — we replace with "__".
 */
export function repoDocId(fullName: string): string {
  return fullName.replace(/\//g, '__');
}

/**
 * Repository — Firestore document shape for a scanned GitHub repository.
 * id = repoDocId(fullName) e.g. "owner__repo".
 */
export interface Repository {
  id: string;                          // "owner__repo" (repoDocId)
  githubUrl: string;
  owner: string;
  name: string;
  fullName: string;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  starCount: number;
  forkCount: number;
  lastPushedAt: Timestamp;
  topics: string[];
  detectedFrameworks: string[];
  detectedTools: string[];
  detectedDependencies: string[];
  aiConfigFiles: AiConfigFileSignal[];
  coAuthoredByAI: boolean;
  aiAttributionPatterns: string[];
  commitCount: number;
  firstCommitAt: Timestamp | null;
  lastCommitAt: Timestamp | null;
  commitSpanMonths: number;
  isOwnerRepo: boolean;
  hasTestDirectory: boolean;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
  skillScoreContribution: number;
  scanStatus: 'surface' | 'layer1' | 'layer2';
  /** Proficiency signals detected during Layer 1 analysis. Absent = not yet analyzed. */
  proficiencySignals?: ProficiencySignal[];
  /** Per-technology proficiency scores. Absent = not yet analyzed. */
  techProficiency?: Record<string, TechProficiency>;
  /** Confirmed imports — taxonomy IDs validated by actual import statements. */
  confirmedImports?: string[];
  /** Per-framework depth classification from API pattern matching. */
  frameworkDepth?: FrameworkDepthEntry[];
  /** Lines of logic code (excludes config, tests, generated, vendor). */
  logicLinesOfCode?: number;
  /** Ratio of logic code to total meaningful code (0-1). */
  logicCodeRatio?: number;
  /** Ratio of test code to logic code (0-1). */
  testToLogicRatio?: number;
  /** AST-based code quality metrics (TS/JS only). Null = unsupported/insufficient. */
  codeQualityMetrics?: CodeQualityMetrics | null;
  /** Code durability from git log. Absent = not yet analyzed, null = insufficient history. */
  codeDurability?: CodeDurabilityMetrics | null;
  /** Behavioral commit patterns. Absent = not yet analyzed, null = <3 commits. */
  behavioralMetrics?: BehavioralMetrics | null;
  /** Commit message quality. Absent = not yet analyzed, null = <5 non-merge commits. */
  commitMessageQuality?: CommitMessageQuality | null;
  /** Design pattern signals detected via file structure + content heuristics (Layer 2). */
  designPatternSignals?: DesignPatternSignal[];
  /** Detected architecture style from directory layout. null = not yet analyzed. */
  architectureStyle?: ArchitectureStyle | null;
  /** Count of anti-patterns detected (god class, flat structure, no abstraction). */
  antiPatternCount?: number;
  /** Overall design sophistication tier. */
  designSophisticationTier?: 'none' | 'basic' | 'intermediate' | 'advanced';
  /** Code style metrics from heuristic analysis. Absent = not yet analyzed, null = insufficient data. */
  codeStyleMetrics?: CodeStyleMetrics | null;
  /** Pipeline version (package.json) that last scanned this repo. Null = pre-versioning. */
  scannerVersion: string | null;
  lastScanned: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
