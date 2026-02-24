#!/usr/bin/env bash
# post-bash-script-guard.sh
#
# Claude Code PostToolUse hook for Bash tool invocations.
# Detects project script execution and reminds the agent to report
# failures before falling back to manual work.
#
# Adapted from agentsys/enforce-script-failure-report.sh (MIT License).
# Extends patterns for Python, poetry, and generic project scripts.
#
# Input: JSON on stdin with tool_input.command
# Output: Reminder on stdout if project script detected; nothing otherwise.
# Exit: Always 0 — this hook is informational only, never blocks.

set -euo pipefail

INPUT=$(cat 2>/dev/null || true)

[ -z "$INPUT" ] && exit 0

# Extract the command from tool_input.command
COMMAND=""
if command -v jq >/dev/null 2>&1; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
else
  # Fallback: extract via grep/sed without jq
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' 2>/dev/null || true)
fi

[ -z "$COMMAND" ] && exit 0

# Detect project script patterns
IS_PROJECT_SCRIPT=false

case "$COMMAND" in
  # Node / npm
  *npm\ test*|*npm\ run\ *|*npm\ build*|*npm\ pack*)
    IS_PROJECT_SCRIPT=true ;;
  # Node scripts / dev CLIs
  *node\ scripts/*|*node\ bin/*|*agentsys-dev*|*agentsys*)
    IS_PROJECT_SCRIPT=true ;;
  # Python
  *python\ scripts/*|*python3\ scripts/*|*pytest*|*poetry\ run*|*uv\ run*)
    IS_PROJECT_SCRIPT=true ;;
  # Shell scripts in project
  *bash\ scripts/*|*sh\ scripts/*)
    IS_PROJECT_SCRIPT=true ;;
esac

if [ "$IS_PROJECT_SCRIPT" = true ]; then
  echo "[HOOK] Project script detected. If this command failed, you MUST:"
  echo "  1. Report the failure with exact error output"
  echo "  2. Diagnose the root cause"
  echo "  3. Fix the script/tooling — do NOT silently fall back to manual work"
  echo "  Bypassing broken scripts masks the real problem. Fix the script, not the symptom."
fi

exit 0
