# Step 04: Write/Extend E2E Test

Spawn e2e-runner agent with full pre-flight context.

<step n="4" goal="Spawn e2e-runner to write or extend test" tag="write-test">
  <critical>🎭 ECC ORCHESTRATOR: Spawning E2E Runner with full pre-flight context</critical>

  <output>🎭 **Spawning E2E Runner — Mode: {{e2e_action}} | Target: {{target_spec}}**</output>

  <ecc-spawn agent="e2e-runner">
    <task-call>
      subagent_type: "everything-claude-code:e2e-runner"
      model: "sonnet"
      description: "E2E test {{e2e_action}} for {{story_key}}"
      prompt: |
        ## E2E Test {{e2e_action}}: {{story_key}}

        **Mode:** {{e2e_action}} | **Target:** {{target_spec}}

        **Pre-Flight Results:**
        - TestId Map: {{testid_map}}
        - Data Flow: {{data_flow_map}}
        - Environment: {{env_readiness}}
        - Cleanup Plan: {{cleanup_plan}}
        - Multi-User Strategy: {{multi_user_strategy}}

        **E2E Conventions (MUST follow):** {{e2e_conventions}}
        **Available Helpers (import from staging-helpers.ts):** {{staging_helpers_api}}
        **Cooldown Helpers (if needed):** {{cooldown_helpers}}

        **Selector Priority:**
        1. data-testid (always preferred)
        2. getByRole with name
        3. Scoped locator within known container
        4. text= (last resort, breaks on translations)

        **Wait Strategy:**
        - Observable state: element.waitFor({ state: 'hidden/visible' })
        - Settling only: waitForTimeout(<1000ms)
        - NEVER: waitForTimeout(2000+) for async operations
        - AVOID: waitForLoadState('networkidle') with live WebSocket connections (prevents resolution)

        **Screenshot Convention:**
        - Persistent: test-results/{spec-name}/ (not cleaned by Playwright)
        - Auto-artifacts: playwright-artifacts/ (cleaned per run)
        - Pattern: {step}-{description}.png
        - Capture at: page load, navigation, dialog open/close, form submit, final state

        **Viewport (MANDATORY):** { width: 360, height: 780 }
        **Test Users:** alice, bob, charlie, diana
        Auth: [data-testid="test-login-button"] → [data-testid="test-user-{name}"]

        **Story ACs relevant to E2E:** {{story_acs_relevant_to_e2e}}

        **Requirements:**
        1. Follow ALL conventions from E2E-TEST-CONVENTIONS.md
        2. Use data-testid selectors — NEVER bare text selectors
        3. Include try/finally cleanup matching the cleanup plan
        4. Add screenshots at every key interaction point
        5. Name test data with "E2E" prefix + Date.now() suffix
        6. If multi-user: implement {{multi_user_pattern}} pattern
        7. E2E spec max 400 lines
    </task-call>
  </ecc-spawn>

  <action>Collect e2e-runner output as {{test_code}}</action>
  <action>Set {{test_file}} = path to created/modified spec file</action>

  <output>✅ **E2E Test Written** — File: {{test_file}} | Mode: {{e2e_action}} | Multi-User: {{multi_user_pattern}}</output>
</step>
