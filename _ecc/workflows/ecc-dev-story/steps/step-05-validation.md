# Step 05: Consolidated Validation

Run slop check, then full test suite, lint, and build once. No redundant type-checks.

<critical>CONSOLIDATED VALIDATION: Single build covers type checking. No separate npx tsc --noEmit.</critical>

<!-- 0. Slop sweep — Phase 1 deterministic detection before spawning any agents -->
<action>Run slop check on src/ — collect HIGH certainty findings as {{slop_findings}}:

```bash
# console.log/debug/warn in production paths (HIGH certainty)
grep -rn "console\.\(log\|debug\|warn\)" src/ --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "__tests__\|\.test\.\|\.spec\." | head -20

# TODO/FIXME/HACK left in code (HIGH certainty)
grep -rn "// TODO\|// FIXME\|// HACK\|// TEMP" src/ \
  --include="*.ts" --include="*.tsx" 2>/dev/null | head -10

# TypeScript :any anti-pattern (HIGH certainty)
grep -rn ": any\b" src/ --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "\.test\." | head -10

# Empty catch blocks (HIGH certainty)
grep -rn "catch[[:space:]]*([^)]*)[[:space:]]*{[[:space:]]*}" src/ \
  --include="*.ts" 2>/dev/null | head -5

# Hardcoded secrets pattern (HIGH certainty)
grep -rn "api[_-]\?key\s*=\s*['\"][a-zA-Z0-9]" src/ \
  --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
```

If any findings: surface as pre-classified HIGH certainty to self-review agent (Step 7).
If none: set {{slop_findings}} = "none" and proceed silently.
</action>

<!-- 1. Full test suite -->
<action>Run full test suite: npm test or detected test command</action>
<action>Store output as {{test_result}} for Test Health step</action>

<check if="tests fail">
  <output>Tests failing — spawning Build Resolver...</output>
  <ecc-spawn agent="build-resolver">
    <task-call>
      subagent_type: "everything-claude-code:build-error-resolver"
      model: "sonnet"
      max_turns: 5
      description: "Fix test failures"
      prompt: |
        Fix the failing tests with minimal changes.
        **Test Failures:** {{test_failures}}
        Fix only what's needed to make tests pass.
    </task-call>
  </ecc-spawn>
  <action>Re-run tests after fixes</action>
  <action>Update {{test_result}} with re-run output</action>
</check>

<!-- 2. Lint once -->
<action>Run linting: npm run lint or detected lint command</action>
<action>Store output as {{lint_result}}</action>

<!-- 3. Single consolidated build (includes TypeScript type checking) -->
<action>Run build ONCE (includes type checking):
  npm run build 2>&amp;1 | tee build.log
</action>
<action>Store output as {{build_result}}</action>

<check if="build fails">
  <output>Build failed — spawning Build Resolver...</output>
  <ecc-spawn agent="build-resolver">
    <task-call>
      subagent_type: "everything-claude-code:build-error-resolver"
      model: "sonnet"
      max_turns: 5
      description: "Fix build/type errors"
      prompt: |
        Fix build/TypeScript errors with MINIMAL changes.
        **Build Output:** {{build_errors}}
        Rules: Fix only what's needed. No refactoring. No architecture changes.
    </task-call>
  </ecc-spawn>
  <action>Re-run build ONLY if changes were made</action>
</check>

<check if="build passes">
  <output>Build passed (includes TypeScript type checking — no separate tsc needed)</output>
</check>

<output>**Consolidated Validation Complete**

  Tests: {{test_result}}
  Lint: {{lint_result}}
  Build: {{build_result}} (includes type checking)

  **Build commands saved:** No per-task builds, no separate tsc --noEmit
</output>
