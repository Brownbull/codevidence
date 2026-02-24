# Step 08: Story Update, Quality Escalation, and Completion

Update story with E2E results. Assess quality escalation. Final summary.

<step n="8" goal="Story update, quality escalation, and completion" tag="completion">
  <!-- Update story Dev Notes -->
  <action>Add E2E results to story file:
    ```markdown
    ### E2E Testing
    - Action: {{e2e_action}} | File: {{test_file}} | Result: {{test_result}}
    - Multi-User: {{multi_user_pattern}} | Quality Score: {{quality_score}}/100 | Date: {{date}}
    ```
  </action>

  <check if="story has E2E-related ACs">
    <action>Mark satisfied ACs in story file</action>
  </check>

  <check if="e2e_action == CREATE">
    <action>Add new test file to story File Specification</action>
  </check>

  <!-- Quality Escalation Assessment -->
  <action>Assess quality escalation triggers:
    - {{quality_score}} &lt; 60 → flag
    - Multi-user concurrent + retries needed → flag
    - >3 specs created/modified in this session → flag
    - Last story in epic (check sprint-status.yaml) → flag
  </action>

  <check if="any quality escalation trigger fired">
    <output>**E2E Follow-Up Recommended**
      Reason: {{escalation_reason}}
      Suggested: {{suggested_tea_workflow}}
      Scope: {{escalation_scope}}
    </output>
  </check>

  <check if="no quality escalation triggers">
    <action>Set {{quality_recommendation}} = "No follow-up needed"</action>
  </check>

  <output>✅ **ECC E2E Complete**

    Story: {{story_key}} | Action: {{e2e_action}} | Result: {{test_result}} | Quality: {{quality_score}}/100
    Test File: {{test_file}}
    {{#if multi_user_pattern != "SINGLE-USER"}}Multi-User: {{multi_user_pattern}} ({{user_a}}, {{user_b}}){{/if}}
    {{#if quality_recommendation != "No follow-up needed"}}Follow-up: {{quality_recommendation}}{{/if}}

    **Next Steps:**
    {{#if test_result == "PASS"}}
    - Commit E2E test with story changes
    - Run `ecc-code-review` if not yet done
    {{else}}
    - Fix failing test and re-run `/ecc-e2e`
    {{/if}}
  </output>
</step>
