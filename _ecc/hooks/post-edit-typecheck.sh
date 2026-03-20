#!/bin/bash
# PostToolUse:Edit — TypeScript type check after .ts/.tsx edits.
# Shows first 20 lines of errors. Non-blocking (exit 1 = warn).

FILE_PATH=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
")

if [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true
    OUTPUT=$(npx tsc --noEmit 2>&1 | head -20)
    if [ $? -ne 0 ] && [ -n "$OUTPUT" ]; then
        echo "$OUTPUT" >&2
        exit 1
    fi
fi

exit 0
