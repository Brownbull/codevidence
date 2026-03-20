# Step 06: Test Health Interpretation

Read test results from Step 5. Classify failures. Produce Gabe Decision Block only if thresholds are met.
Silent when all tests pass.

<action>Read {{test_result}} from Step 5 (already in context)</action>
<action>Read docs/test-health/latest-run.json if it exists (previous run baseline)</action>
<action>Read docs/test-health/known-flaky.yaml (quarantined tests to exclude from regression detection)</action>

<!-- Silent path: all green -->
<check if="all tests pass">
  <action>Write current results to docs/test-health/latest-run.json (overwrite)</action>
  <output>**Test Health: All green.** No action needed.</output>
</check>

<!-- Active path: failures present -->
<check if="any tests fail">
  <action>Classify each failing test:
    - FLAKY: same test failed in previous run AND passes randomly across runs
    - REGRESSION: passed in previous run, fails after this change
    - SYSTEMIC: many tests fail with identical error message or same root cause
    - COVERAGE DROP: test coverage decreased >5% in any module
  </action>
  <action>Exclude tests in known-flaky.yaml from REGRESSION classification</action>

  <!-- Emergency threshold -->
  <check if=">20% of test suite failing">
    <output>**EMERGENCY: Test Suite Failure**

      More than 20% of tests are failing. Something structural is broken.
      STOP and investigate before continuing to completion.
    </output>
    <ask>How to proceed?
      [I]nvestigate — review failures before continuing
      [S]kip — proceed to completion with known broken state (document reason):</ask>
  </check>

  <!-- Full Gabe Decision Block: systemic or coverage drop -->
  <check if=">5 failures with same error OR coverage drops >5%">
    <output>## Test Health Report — Gabe Decision Block

      ### What's Happening
      {{failure_summary}}

      ### The Analogy
      {{test_health_analogy}}

      ### Pattern Classification
      **{{failure_classification}}** (FLAKY / REGRESSION / SYSTEMIC / COVERAGE DROP)

      ### Your Call
      {{decision_options}}
    </output>
  </check>

  <!-- Brief report: 1-3 new failures -->
  <check if="1-3 new failures not in known-flaky.yaml">
    <output>**Test Health:** {{failure_count}} new failures in {{failing_modules}}.
      Likely REGRESSION from this change. Review before marking story complete.
    </output>
  </check>

  <!-- Update history -->
  <action>Append to docs/test-health/failure-log.csv: {date}, test_name, error_type, classification</action>
  <action>Write current results to docs/test-health/latest-run.json (overwrite)</action>
</check>
