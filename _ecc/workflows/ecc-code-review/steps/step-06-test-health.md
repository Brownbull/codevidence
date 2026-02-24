# Step 06: Test Health Interpretation (Code Review)

Read test results from triage fixes. Classify failures. Produce Gabe Decision Block only if thresholds are met.
Silent when all tests pass or failures are already known.

<step n="6" goal="Test health check after triage fixes" tag="test-health">
  <!-- Source: tests run during Step 4 triage (re-run after fixes) -->
  <action>Read {{test_result_post_fix}} from Step 4 (in context, or re-run if not stored)</action>
  <action>Read docs/test-health/latest-run.json if it exists (previous baseline)</action>
  <action>Read docs/test-health/known-flaky.yaml (quarantined tests)</action>

  <!-- Silent path: all green -->
  <check if="all tests pass">
    <action>Write current results to docs/test-health/latest-run.json</action>
    <output>✅ Test Health: All green. No action needed.</output>
  </check>

  <!-- Active path: failures present -->
  <check if="any tests fail">
    <action>Classify each failing test:
      - REGRESSION: passed before, fails after this change → flag as BLOCKING in review
      - FLAKY: same test failed in previous runs AND passes randomly → informational
      - SYSTEMIC: many tests fail with identical error → informational (not caused by this change)
      - COVERAGE DROP: coverage decreased >5% in any module
    </action>
    <action>Exclude tests in known-flaky.yaml from REGRESSION classification</action>

    <check if="REGRESSION detected">
      <output>🚨 **TEST HEALTH: REGRESSION DETECTED — BLOCKING**

        ## Test Health Report — Gabe Decision Block

        ### What's Happening
        {{regression_summary}}

        ### The Analogy
        {{test_health_analogy}}

        ### Pattern Classification
        **REGRESSION** — tests that passed before now fail after this change.

        ### Your Call
        This is BLOCKING. The change introduced a regression.
        Options: (A) fix the regression now, (B) revert the change and investigate, (C) accept and document known breakage.
      </output>
    </check>

    <check if="SYSTEMIC detected (no REGRESSION)">
      <output>⚠️ **TEST HEALTH: SYSTEMIC FAILURE — INFORMATIONAL**

        ## Test Health Report — Gabe Decision Block

        ### What's Happening
        {{systemic_summary}}

        ### Pattern Classification
        **SYSTEMIC** — many tests fail with same root cause. Not caused by this change.

        ### Your Call
        Not blocking this review. Recommend investigating separately: see docs/test-health/failure-log.csv for history.
      </output>
    </check>

    <check if="COVERAGE DROP detected">
      <output>⚠️ **TEST HEALTH: COVERAGE DROP**
        Coverage in {{module}} dropped from {{prev_pct}}% to {{curr_pct}}%. New code may lack tests.
      </output>
    </check>

    <action>Append to docs/test-health/failure-log.csv: {date}, test_name, error_type, classification</action>
    <action>Write current results to docs/test-health/latest-run.json</action>
  </check>
</step>
