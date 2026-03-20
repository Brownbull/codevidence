# Step 04: Smart Triage

Classify each finding by effort. Let user choose handling per item or batch.

<step n="4" goal="Auto-triage findings by effort, user chooses handling" tag="triage">
  <critical>🎯 SMART TRIAGE: Every finding gets effort classification + suggested action</critical>

  <!-- Classify each finding -->
  <action>For each finding from Step 3, classify effort:

    ⚡ QUICK (fix in current session):
    - Missing validation/guard clause (1-5 lines), naming fix, missing error handling (single call)
    - Missing test assertion, import cleanup, simple type fix, missing null check
    - Documentation/comment fix, single-file localized change

    🔧 COMPLEX (needs separate work):
    - Multi-file refactoring, new abstraction, architectural restructuring
    - Service layer redesign, new test infrastructure, security model change
    - State management refactoring, performance optimization requiring profiling
    - Changes touching >3 files
  </action>

  <action>Apply certainty-based routing to each finding:
    - HIGH certainty (H): Fix or flag immediately — no additional context needed; safe to auto-apply for QUICK findings
    - MEDIUM certainty (M): Read surrounding code/context before acting — LLM found a pattern but judgment is needed
    - LOW certainty (L): Surface to human — heuristic finding, high false-positive risk; do not auto-fix
    Note: Certainty is independent of severity. A HIGH-certainty LOW-severity finding is a safe quick fix.
    A LOW-certainty CRITICAL finding still requires human verification before acting.
  </action>

  <action>Build {{numbered_findings}}: for each finding assign index, severity, agent, description, file, effort_class, suggested_action (FIX_NOW or DEFER)</action>
  <action>Count {{quick_count}}, {{complex_count}}, {{total_findings}}</action>

  <ask>**Smart Triage** — {{quick_count}} quick fixes, {{complex_count}} complex items

    1. **[Q]uick + Defer** — Fix all ⚡ QUICK now → TD stories for 🔧 COMPLEX *(Recommended)*
    2. **[F]ix all** — Fix everything now (only if scope fits in session)
    3. **[C]ustom** — Per-item control: `fix 1-3, defer 4-6`
    4. **[S]kip** — Mark review complete without changes

    Choose [Q], [F], [C], or [S]:</ask>

  <check if="user chooses Q">
    <action>Fix all findings where effort_class = ⚡ QUICK</action>
    <action>Re-run tests after fixes</action>
    <action>Store {{test_result_post_fix}} for Test Health step</action>
    <action>Set {{fixed_items}}, {{fixed_count}}, {{td_items}} = all COMPLEX findings</action>
    <output>✅ Fixed {{fixed_count}} quick items. {{complex_count}} deferred to TD stories (Step 5).</output>
  </check>

  <check if="user chooses F">
    <action>Fix ALL findings (both QUICK and COMPLEX)</action>
    <action>Re-run tests after fixes</action>
    <action>Store {{test_result_post_fix}} for Test Health step</action>
    <action>Update File List in story</action>
    <action>Set {{fixed_count}} = total_findings</action>
  </check>

  <check if="user chooses C">
    <ask>Enter triage commands:
      - `fix 1-5` or `fix 1,3,5` — fix these items now
      - `defer 6-8` — create TD stories for these items
      - Combine: `fix 1-3, defer 4-6`
      - Shortcuts: `fix quick`, `defer complex`

      Enter triage commands:</ask>
    <action>Parse ranges/lists/keywords → map each finding index to FIX or DEFER</action>
    <action>Fix all FIX findings, re-run tests</action>
    <action>Store {{test_result_post_fix}} for Test Health step</action>
    <action>Set {{fixed_items}}, {{fixed_count}}, {{td_items}} = DEFER findings</action>
    <output>✅ Fixed: {{fixed_count}} | Deferred: {{td_item_count}} → TD stories in Step 5</output>
  </check>

  <check if="user chooses S">
    <output>⏭️ Review marked complete without changes.</output>
  </check>
</step>
