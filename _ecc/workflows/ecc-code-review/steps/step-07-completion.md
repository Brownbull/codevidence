# Step 07: Cost Tracking, E2E Analysis, and Story Completion

## Phase A: E2E Coverage Analysis

<check if="story adds or modifies user-facing functionality (canvas, toolbar, import/export, inspector, etc.)">
  <action>Assess E2E coverage:
    1. Check if a new user journey was introduced (export flow, import flow, etc.)
    2. Glob `tests/e2e/` for specs that cover the changed user flow
    3. Confirm existing spec assertions still match the updated component selectors
  </action>

  <check if="E2E gap detected — new user journey with no spec coverage">
    <output>**E2E Gap Detected**

      User flow(s) added/changed without E2E coverage: {{e2e_gaps}}
      Recommendation: run `/ecc-e2e {{story_key}}` after this review is resolved.
    </output>
  </check>

  <check if="E2E coverage adequate or story is service/schema-only (no UI changes)">
    <output>E2E: adequate coverage / not applicable for this story type.</output>
  </check>
</check>

## Phase B: Story Status Update

<check if="review decision is APPROVE">
  <action>Update story status: review → done in {{sprint_status}}</action>
  <output>Story {{story_key}} marked **done** in sprint-status.yaml</output>
</check>

<check if="review decision is CHANGES REQUESTED">
  <action>Update story status: review → in-progress in {{sprint_status}}</action>
  <output>Story {{story_key}} returned to **in-progress**. Dev must address findings and re-submit for review.</output>
</check>

## Phase C: Cost Tracking

<action>Run: `workflow-cost --csv --stats --workflow "ecc-code-review" --story "{{story_key}}"` → {{cost_output}}</action>

<output>**Workflow Cost Logged**

{{cost_output}}
</output>

## Phase D: Workflow Complete

<output>**ECC Code Review Complete — {{story_key}}**

  Decision: {{review_decision}} | Score: {{review_score}}/10
  Review agents: {{spawned_agents | join(", ")}}
  Findings: {{critical_count}} critical | {{high_count}} high | {{medium_count}} medium | {{td_count}} deferred
  TD stories created: {{new_td_count}}
  Story status: {{story_key}} → {{new_status}}
</output>
