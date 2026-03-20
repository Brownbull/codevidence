# Step 01: Analyze Story for E2E Action

Determine E2E action: SKIP, VERIFY, EXTEND, or CREATE.

<step n="1" goal="Determine E2E action" tag="analysis">
  <action>Detect story from branch name or user argument:
    - If user passed story key → load story from sprint_artifacts
    - If user passed directory → use as scope
    - Else → extract story key from current branch name (feature/{{story_key}})
  </action>

  <action>Run `git diff develop...HEAD --name-only` → {{changed_files}}</action>
  <action>If story file found, extract File Specification and ACs → {{story_context}}</action>
  <action>Filter changed files to UI components (.tsx in components/views, not types/utils) → {{changed_ui_files}}</action>
  <action>Extract {{story_acs_relevant_to_e2e}} — ACs describing user-visible behavior</action>

  <!-- Auto-classification -->
  <action>Classify E2E action:
    1. If no UI files in {{changed_ui_files}} and no user-flow ACs → SKIP
    2. Search tests/e2e/staging/*.spec.ts for TestIds matching {{changed_ui_files}}
    3. If match found and all relevant ACs already covered → VERIFY
    4. If match found but new ACs not covered → EXTEND
    5. If no match → CREATE
  </action>

  <action>Set {{e2e_action}} = SKIP | VERIFY | EXTEND | CREATE</action>
  <action>Set {{target_spec}} = matching spec file (VERIFY/EXTEND) or new file path (CREATE)</action>

  <ask>**E2E Analysis: {{e2e_action}}**

    Story: {{story_key}}
    Changed UI: {{changed_ui_files}}
    {{#if target_spec}}Existing spec: {{target_spec}}{{/if}}
    {{#if e2e_gap}}Gap: {{e2e_gap}}{{/if}}

    Proceed with {{e2e_action}}? [Y / N / Override]</ask>

  <check if="e2e_action == SKIP and user confirms">
    <output>⏭️ **E2E not needed** — {{skip_reason}}</output>
    <action>Jump to Step 8 (update story with "E2E: SKIP" note)</action>
  </check>

  <check if="e2e_action == VERIFY and user confirms">
    <action>Run existing spec: `npx playwright test {{target_spec}} --project=staging`</action>
    <check if="test passes">
      <output>✅ **Existing E2E spec passes** — no changes needed</output>
      <action>Set {{test_result}} = "PASS" | Set {{run_attempt}} = 1</action>
      <action>Jump to Step 6 (test health), then Step 7 (quality), then Step 8 (completion)</action>
    </check>
    <check if="test fails">
      <output>⚠️ Existing spec FAILS — switching to EXTEND mode to fix</output>
      <action>Set {{e2e_action}} = EXTEND</action>
    </check>
  </check>
</step>
