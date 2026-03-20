#!/usr/bin/env python3
"""PostToolUse:Edit warnings — Test content-based checks.

Reads tool input JSON from stdin. Checks for test anti-patterns.
Exit 0 = no issues. Exit 1 = non-blocking warning.

Checks:
  1. toHaveBeenCalled without toHaveBeenCalledWith → warn
  2. E2E test missing cleanup pattern → warn
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
    new_string = tool_input.get("new_string", "")

    warnings = []

    # 1. toHaveBeenCalled without specificity (test files only)
    if file_path.endswith((".test.ts", ".test.tsx")):
        if "toHaveBeenCalled" in new_string and "toHaveBeenCalledWith" not in new_string:
            warnings.append(
                "toHaveBeenCalled detected. Prefer toHaveBeenCalledWith for specificity."
            )

    # 2. E2E cleanup reminder
    if "e2e" in file_path and file_path.endswith(".spec.ts"):
        try:
            with open(file_path) as f:
                content = f.read().lower()
            if "cleanup" not in content and "afterall" not in content and "aftereach" not in content:
                warnings.append(
                    "E2E test may be missing cleanup. Always delete test data at end."
                )
        except OSError:
            pass

    if warnings:
        for w in warnings:
            print(f"  {w}", file=sys.stderr)
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
