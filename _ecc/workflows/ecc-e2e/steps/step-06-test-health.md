# Step 06: Test Health Interpretation (E2E — always fires)

E2E is inherently noisy. This step ALWAYS fires (not silent like unit test version).
Classify every failure as FLAKY, REGRESSION, or SYSTEMIC. Present Gabe Decision Block.

<step n="6" goal="Test health interpretation for E2E results" tag="test-health">
  <!-- E2E Test Health always produces a summary — no silent path -->
  <action>Read {{e2e_run_output}} from Step 5 (in context)</action>
  <action>Read docs/test-health/latest-run.json if it exists (E2E previous run baseline)</action>
  <action>Read docs/test-health/known-flaky.yaml (quarantined E2E tests)</action>

  <check if="test_result == PASS and retries_needed == false">
    <action>Write current results to docs/test-health/latest-run.json</action>
    <output>✅ **E2E Test Health: Clean Pass** — No retries, no flakiness detected. No action needed.</output>
  </check>

  <check if="test_result == PASS and retries_needed == true">
    <output>## E2E Test Health Report — Gabe Decision Block

      ### What's Happening
      Test passed on retry {{run_attempt}} — passed eventually but required {{retries_needed}} retry.

      ### The Analogy
      Like a car that starts on the third try: it works, but the starting circuit is unreliable.
      Today it got there. Next week it might not.

      ### Pattern Classification
      **FLAKY** — test is non-deterministic. Passed but required retry.

      ### Your Call
      Options: (A) investigate root cause now (timing? optimistic update race?),
      (B) add to known-flaky.yaml to track, (C) accept current state and monitor.
      Trade-off: A costs time now. B tracks it. C risks silent future failure.
    </output>
    <action>Append to docs/test-health/failure-log.csv: {date}, {{test_file}}, flaky, FLAKY</action>
  </check>

  <check if="test_result == DEFERRED or test_result == SKIPPED">
    <output>## E2E Test Health Report — Gabe Decision Block

      ### What's Happening
      E2E test could not pass after {{run_attempt}} attempts. Status: {{test_result}}.

      ### Pattern Classification
      **{{failure_classification}}** — classify based on error: consistent error = SYSTEMIC, random = FLAKY, new feature = REGRESSION

      ### Your Call
      Test is {{test_result}}. {{decision_options}}
    </output>

    <check if="failure_classification == SYSTEMIC">
      <output>**SYSTEMIC** — multiple tests failing with same root cause. Likely infrastructure, not test code.
        Check: staging environment, test emulator/backend, test user data state.
      </output>
    </check>
  </check>

  <!-- Update history regardless of outcome -->
  <action>Append to docs/test-health/failure-log.csv: {date}, {{test_file}}, {{e2e_action}}, {{test_result}}</action>
  <action>Write current results to docs/test-health/latest-run.json</action>
</step>
