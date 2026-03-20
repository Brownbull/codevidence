/**
 * src/pipeline/analysis/ai-config-patterns.ts — Known AI tool config patterns.
 *
 * Centralized lists of AI config files, directories, tool names,
 * and file-to-taxonomy pattern mapping. Used by both detection and scoring.
 */

/** Specific AI config files to look for in repositories. */
export const AI_CONFIG_FILES = [
  // Claude
  'CLAUDE.md',
  '.claude/settings.json',
  // Cursor
  '.cursorrules',
  '.cursor/rules',
  '.cursor/settings.json',
  // Copilot
  '.github/copilot-instructions.md',
  // Windsurf / Codeium
  '.windsurfrules',
  // Cline
  '.clinerules',
  // Continue.dev
  '.continuerc.json',
  // Codex (OpenAI)
  'codex.md',
  // General AI context
  'ai-context.md',
  'AGENTS.md',
  // MCP tool configuration
  'mcp.json',
  '.mcp.json',
];

/** Directory patterns — presence of directory itself is a signal. */
export const AI_CONFIG_DIRS = [
  '.claude',
  '.cursor',
  '.windsurf',
  '.cline',
  '.continue',
  '.cody',
  '.codex',
  '.amazonq',
  '.github/copilot',
  // Agent engineering infrastructure
  '.github/agents',
  'agents',
];

/** Claude sub-directories that indicate deeper AI integration. */
export const CLAUDE_SUBDIRS = [
  '.claude/hooks',
  '.claude/rules',
  '.claude/knowledge',
  '.claude/workflows',
  '.claude/commands',
];

/** Agent engineering sub-directories (checked under known agent infrastructure dirs). */
export const AGENT_ENGINEERING_SUBDIRS = [
  'agents/instincts',
  'agents/knowledge',
  'agents/templates',
];

/** Glob-like prefix patterns (e.g. .aider matches .aider, .aiderignore, etc.). */
export const AI_CONFIG_PREFIXES = [
  '.aider',
];

/** Suffix patterns for root-level files (e.g. *.agent.yaml, *.prompt.md). */
export const AI_CONFIG_SUFFIXES = [
  '.agent.yaml',
  '.agent.json',
  '.prompt.md',
];

/** Known AI tool names in co-authored-by trailers and commit messages. */
export const AI_TOOL_NAMES = [
  'github copilot',
  'copilot',
  'cursor',
  'claude',
  'anthropic',
  'aider',
  'codeium',
  'windsurf',
  'tabnine',
  'cody',
  'sourcegraph',
  'amazon q',
  'devin',
  'cline',
  'continue',
  'codex',
];

/** Maps AI config file/dir names to taxonomy agent pattern IDs. */
export const AI_CONFIG_PATTERN_MAP: Record<string, string> = {
  // Claude
  'CLAUDE.md': 'ai-agent-pattern:claude-md',
  '.claude': 'ai-agent-pattern:claude-md',
  '.claude/settings.json': 'ai-agent-pattern:claude-md',
  '.claude/hooks': 'ai-agent-pattern:claude-hooks',
  '.claude/rules': 'ai-agent-pattern:claude-rules',
  '.claude/knowledge': 'ai-agent-pattern:claude-knowledge',
  '.claude/workflows': 'ai-agent-pattern:claude-workflows',
  // Cursor
  '.cursorrules': 'ai-agent-pattern:cursor-rules',
  '.cursor/rules': 'ai-agent-pattern:cursor-rules',
  '.cursor/settings.json': 'ai-agent-pattern:cursor-rules',
  '.cursor': 'ai-agent-pattern:cursor-rules',
  // Copilot
  '.github/copilot-instructions.md': 'ai-agent-pattern:copilot-instructions',
  '.github/copilot': 'ai-agent-pattern:copilot-instructions',
  // Windsurf / Codeium
  '.windsurfrules': 'ai-agent-pattern:windsurf-rules',
  '.windsurf': 'ai-agent-pattern:windsurf-rules',
  // Cline
  '.clinerules': 'ai-agent-pattern:cline-config',
  '.cline': 'ai-agent-pattern:cline-config',
  // Continue.dev
  '.continuerc.json': 'ai-agent-pattern:continue-config',
  '.continue': 'ai-agent-pattern:continue-config',
  // Cody
  '.cody': 'ai-agent-pattern:cody-config',
  // Codex (OpenAI)
  'codex.md': 'ai-agent-pattern:codex-config',
  '.codex': 'ai-agent-pattern:codex-config',
  // Amazon Q
  '.amazonq': 'ai-agent-pattern:amazonq-config',
  // General
  'ai-context.md': 'ai-agent-pattern:ai-context-file',
  'AGENTS.md': 'ai-agent-pattern:agents-md',
  // MCP
  'mcp.json': 'ai-agent-pattern:mcp-config',
  '.mcp.json': 'ai-agent-pattern:mcp-config',
  // Agent engineering infrastructure
  '.github/agents': 'ai-agent-pattern:github-agents',
  '.claude/commands': 'ai-agent-pattern:claude-commands',
  'agents': 'ai-agent-pattern:agent-definitions',
  'agents/instincts': 'ai-agent-pattern:agent-instincts',
  'agents/knowledge': 'ai-agent-pattern:agent-knowledge',
  'agents/templates': 'ai-agent-pattern:agent-templates',
};

/** Maps sidecar/agent infrastructure basenames to taxonomy IDs. */
const INFRA_BASENAME_MAP: Record<string, string> = {
  'knowledge': 'ai-agent-pattern:knowledge-base',
  'instincts': 'ai-agent-pattern:agent-instincts',
  'templates': 'ai-agent-pattern:agent-templates',
  'prompts': 'ai-agent-pattern:prompt-templates',
};

export function mapConfigFileToPattern(fileName: string): string | null {
  if (AI_CONFIG_PATTERN_MAP[fileName]) return AI_CONFIG_PATTERN_MAP[fileName] ?? null;
  if (fileName.toLowerCase().startsWith('.aider')) return 'ai-agent-pattern:aider-config';
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.agent.yaml') || lower.endsWith('.agent.json')) return 'ai-agent-pattern:agent-definition-file';
  if (lower.endsWith('.prompt.md')) return 'ai-agent-pattern:prompt-file';
  // Sidecar and agent infrastructure subdirs (e.g. neo-sidecar/knowledge, agents/instincts)
  if (fileName.includes('-sidecar/') || fileName.startsWith('agents/')) {
    const basename = fileName.split('/').pop()?.toLowerCase();
    if (basename && INFRA_BASENAME_MAP[basename]) return INFRA_BASENAME_MAP[basename]!;
  }
  return null;
}
