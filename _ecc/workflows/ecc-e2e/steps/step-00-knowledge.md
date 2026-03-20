# Step 00: E2E Knowledge Loading

Load all E2E knowledge once at session start. Cache for e2e-runner and code-reviewer agents.

<critical>Load ALL knowledge ONCE — these inform pre-flight checks and agent prompts</critical>

<action>Load and cache tests/e2e/E2E-TEST-CONVENTIONS.md → {{e2e_conventions}}</action>
<action>Load and cache .claude/rules/testing.md → {{testing_rules}}</action>
<action>Load and cache tests/e2e/helpers/staging-helpers.ts → {{staging_helpers_api}}</action>
<action>Load and cache tests/e2e/helpers/cooldown-reset.ts → {{cooldown_helpers}} (if exists)</action>

<output>📚 **ECC E2E Orchestrator Initialized**

  Knowledge loaded:
  - E2E conventions: {{e2e_conventions_summary}}
  - Testing rules: pre-flight checklist loaded
  - Staging helpers: {{helper_count}} functions available
  - E2E patterns from code-review-patterns.md
</output>
