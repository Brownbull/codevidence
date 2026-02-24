# Step 02: Pre-Flight Checklist (MANDATORY)

Complete all 4 pre-flight checks before writing any test code.

<step n="2" goal="Complete all 4 pre-flight checks" tag="pre-flight">
  <critical>🚨 NO test code is written until all 4 checks pass or user explicitly skips each.</critical>

  <!-- 2a: TestId Discovery -->
  <action>**2a: TestId Discovery (Playwright CLI auto-mode)**
    1. Check if dev:staging is running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5174`
    2. If running (200) → use playwright-cli for TestId extraction:
       - Open target page(s) that {{changed_ui_files}} render
       - Run snapshot → extract element refs (roles, labels, data-testid)
       - ~93% fewer tokens than reading full component source
    3. If NOT running → fallback to source file reading:
       - Read each .tsx component, grep for data-testid attributes
       - Read src/utils/translations.ts for button/label text
       - Warn: "Start dev:staging for better TestId discovery via Playwright CLI"
    4. If MCP Playwright tools available → use for richer DOM introspection
    Output: {{testid_map}} — all interactive elements on target views
  </action>

  <!-- 2b: Data Flow Analysis -->
  <action>**2b: Data Flow Analysis**
    For EVERY mutation the test will trigger:
    1. Read the service function — understand the database write
    2. Read the hook — find optimistic update patterns
    3. Search for: PENDING, temp-, loading, optimistic in hook code
    4. If optimistic updates exist → plan polling/retry logic BEFORE writing test
    5. Document expected state transitions
    Output: {{data_flow_map}} — mutations, optimistic patterns, expected transitions
  </action>

  <!-- 2c: Environment Readiness -->
  <action>**2c: Environment Readiness**
    1. Read security/access rules for the resources the feature accesses
    2. Verify rules allow test operations (cross-user reads, group access patterns)
    3. Check if Cloud Functions are required and deployed to staging
    4. Verify test users exist: alice, bob, charlie, diana
    Output: {{env_readiness}} — pass/fail with details
  </action>

  <!-- 2d: Cleanup Strategy -->
  <action>**2d: Cleanup Strategy**
    1. Determine data created during test (groups, invitations, preferences)
    2. Plan try/finally cleanup from the start
    3. Name test data: "E2E" prefix + Date.now() suffix for targeting
    4. For multi-user: plan bidirectional cleanup (member leaves → owner deletes)
    5. Check if cooldown resets are needed (sharing toggle, etc.)
    Output: {{cleanup_plan}} — cleanup sequence, cooldown resets, residual data handling
  </action>

  <check if="any pre-flight check fails">
    <ask>⚠️ Pre-flight check failed: {{failed_check}}
      Issue: {{issue_description}} | Recommendation: {{recommendation}}
      [F]ix (attempt to resolve) / [S]kip (proceed with known risk) / [A]bort</ask>
    <check if="user chooses S">
      <output>⚠️ Proceeding with known risk: {{failed_check}} skipped by user</output>
    </check>
    <check if="user chooses A">
      <output>🛑 Aborted. Fix {{failed_check}} and re-run /ecc-e2e</output>
      <action>Stop workflow</action>
    </check>
  </check>

  <output>✅ **Pre-Flight Complete**
    TestId Map: {{testid_count}} elements | Data Flow: {{mutation_count}} mutations mapped
    Environment: {{env_readiness}} | Cleanup: {{cleanup_summary}}
  </output>
</step>
