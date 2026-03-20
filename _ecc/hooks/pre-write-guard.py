#!/usr/bin/env python3
"""PreToolUse:Write guard — Planning artifact gate.

When creating a NEW file in src/, checks if a planning artifact (ADR)
exists in docs/decisions/ for the current branch/epic.

Exit 0 = allow. Exit 1 = non-blocking warning (no ADR found).
Does NOT block — just reminds to plan before building.
"""
import json
import os
import sys


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    tool_input = data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    # Only check new files in src/
    if not file_path:
        sys.exit(0)

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")

    # Make path relative to project
    if file_path.startswith(project_dir):
        rel_path = file_path[len(project_dir):].lstrip("/")
    else:
        rel_path = file_path

    # Only care about new files in src/
    if not rel_path.startswith("src/"):
        sys.exit(0)

    # If the file already exists, this is an overwrite, not a new file
    if os.path.isfile(file_path):
        sys.exit(0)

    # Check if any ADR exists in docs/decisions/
    decisions_dir = os.path.join(project_dir, "docs", "decisions")
    if os.path.isdir(decisions_dir):
        adrs = [f for f in os.listdir(decisions_dir)
                if f.endswith(".md") and f != "TEMPLATE.md"]
        if adrs:
            sys.exit(0)  # At least one ADR exists

    # No planning artifacts found — warn
    print(
        f"  Creating new file in src/ with no planning artifacts in docs/decisions/. "
        f"Consider writing an ADR before implementation.",
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == "__main__":
    main()
