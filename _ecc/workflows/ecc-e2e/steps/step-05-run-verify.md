# Step 05: Run and Verify

Run E2E test against staging. Handle failures with up to 2 retries.

<step n="5" goal="Run E2E test against staging and handle failures" tag="run-verify">
  <action>Check if dev:staging is running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5174`</action>

  <check if="dev:staging not running">
    <ask>⚠️ dev:staging is not running. Start it with: `npm run dev:staging`
      Confirm when ready: [R]eady / [A]bort</ask>
  </check>

  <action>Run: `npx playwright test {{test_file}} --project=staging`</action>
  <action>Store output as {{e2e_run_output}}</action>
  <action>Set {{run_attempt}} = 1</action>

  <check if="test fails and run_attempt &lt;= 2">
    <action>Analyze failure:
      - Selector not found → re-check TestId map, fix selector
      - Timeout → check wait strategy, add polling/settling
      - State mismatch → check optimistic update handling
      - Auth failure → verify test user, re-login sequence
      - Flaky/timing → add settling wait, increase timeout
    </action>
    <action>Fix identified issue in test file</action>
    <action>Increment {{run_attempt}}</action>
    <action>Set {{retries_needed}} = true</action>
    <action>Re-run: `npx playwright test {{test_file}} --project=staging`</action>
    <action>Update {{e2e_run_output}} with retry output</action>
  </check>

  <check if="test fails after 2 retries">
    <ask>❌ E2E test failed after 2 retries.
      Error: {{error_summary}}
      Screenshots: {{screenshot_paths}}

      [F]ix manually / [S]kip / [D]efer (create TD story for flaky test)</ask>

    <check if="user chooses D">
      <action>Create TD story for flaky E2E test</action>
      <action>Set {{test_result}} = "DEFERRED"</action>
    </check>
    <check if="user chooses S">
      <action>Set {{test_result}} = "SKIPPED"</action>
    </check>
  </check>

  <check if="test passes">
    <!-- Determinism check: run once more -->
    <action>Run again: `npx playwright test {{test_file}} --project=staging`</action>
    <action>Update {{e2e_run_output}} with second run output</action>
    <check if="second run fails">
      <output>⚠️ **Flaky test detected** — passed first run, failed second</output>
      <action>Set {{retries_needed}} = true</action>
      <action>Analyze flakiness source and fix, then re-run</action>
    </check>
    <check if="second run passes">
      <action>Set {{test_result}} = "PASS"</action>
      <action>Set {{test_duration}} from Playwright output</action>
    </check>
  </check>

  <output>{{#if test_result == "PASS"}}✅{{else}}⚠️{{/if}} **E2E Run Complete**
    Result: {{test_result}} | File: {{test_file}} | Duration: {{test_duration}} | Retries: {{retries_needed}}
  </output>
</step>
