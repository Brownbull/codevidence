# Step 07: Quality Review

Review E2E test quality using 5-dimension scoring.

<step n="7" goal="Quality review via code-reviewer — 5-dimension" tag="quality-review">
  <critical>🎭 ECC ORCHESTRATOR: Spawning Code Reviewer for E2E quality assessment</critical>

  <ecc-spawn agent="code-reviewer">
    <task-call>
      subagent_type: "everything-claude-code:code-reviewer"
      model: "sonnet"
      description: "E2E quality review for {{test_file}}"
      prompt: |
        ## E2E Test Quality Review

        **Test file:** {{test_file}} | **Story:** {{story_key}}
        **E2E Conventions:** {{e2e_conventions}}

        **Review checklist:**
        - Follows project E2E conventions?
        - Uses data-testid selectors (not fragile selectors)?
        - Has proper cleanup (try/finally)?
        - Screenshots at key interaction points?
        - Wait strategy correct (no networkidle, no long timeouts)?
        - Test data named with E2E prefix + timestamp?
        - Multi-user cleanup bidirectional (if applicable)?
        - File under 400 lines?

        **Quality Score (rate each 0-20, total /100):**
        1. **Determinism** — No random/flaky patterns? No timing dependencies?
        2. **Isolation** — No shared state leaking? Proper cleanup?
        3. **Maintainability** — Uses staging-helpers? Follows conventions? Readable?
        4. **Coverage** — Story ACs covered? Edge cases?
        5. **Performance** — Runs within 60-120s? No unnecessary waits?

        **Output:** Score per dimension + total + findings to fix.
    </task-call>
  </ecc-spawn>

  <action>Collect quality review as {{quality_review}}</action>
  <action>Extract {{quality_score}} (0-100) and {{quality_findings}}</action>

  <check if="quality_findings has CRITICAL or HIGH severity">
    <action>Fix critical quality issues in test file</action>
    <action>Re-run test to verify fixes don't break it</action>
  </check>

  <output>✅ **Quality Review Complete**

    Quality Score: {{quality_score}}/100
    - Determinism: {{score_determinism}}/20
    - Isolation: {{score_isolation}}/20
    - Maintainability: {{score_maintainability}}/20
    - Coverage: {{score_coverage}}/20
    - Performance: {{score_performance}}/20
    {{#if quality_findings}}Findings: {{quality_findings_count}} ({{fixed_count}} fixed){{/if}}
  </output>
</step>
