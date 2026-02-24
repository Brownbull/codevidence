# Step 03: Planning + Sizing + Mark In-Progress

Spawn ECC Planner, validate post-planning scope, mark story in-progress.

## Phase A: ECC Planner

<critical>ECC ORCHESTRATOR: Spawning ECC Planner agent</critical>

<action>Prepare planner context:
  - Story requirements: {{story_context}}
  - Architecture patterns: {{project_patterns}}
  - Incomplete tasks: {{task_list}}
</action>

<output>**Spawning ECC Planner...**
  Task: Create implementation plan for story {{story_key}}
  Context: Project patterns + story requirements
</output>

<ecc-spawn agent="planner">
  <task-call>
    subagent_type: "everything-claude-code:planner"
    model: "{{planning_model}}"
    max_turns: 7
    description: "Plan story implementation"
    prompt: |
      Plan the implementation for story: {{story_key}}

      **Story Requirements:** {{story_context}}
      **Tasks to Implement:** {{task_list}}
      **Architecture Patterns:** {{project_patterns}}

      **Output Required:**
      1. Implementation approach for each task
      2. File changes required (paths must match story File Specification)
      3. Dependencies and order
      4. Risk assessment
      5. Testing strategy alignment

      Create a clear implementation plan that the TDD Guide agent can follow.
  </task-call>
</ecc-spawn>

<action>Collect planner output as {{implementation_plan}}</action>
<output>**ECC Planner Complete** — {{implementation_plan_summary}}</output>

## Phase B: Post-Planning Complexity Check

<critical>MID-STORY SIZING: Check if planning revealed hidden complexity</critical>

<action>Extract from {{implementation_plan}}:
  - {{planned_files}}: Number of files planner identified for changes
  - {{planned_subtasks}}: Subtasks inferred from plan
</action>
<action>Compare to original story: {{original_files}} and {{original_subtasks}}</action>
<action>Calculate: {{file_growth}} = planned_files - original_files | {{subtask_growth}} = planned_subtasks - original_subtasks</action>

<check if="file_growth > 3 OR subtask_growth > 5">
  <output>**COMPLEXITY GROWTH DETECTED**

    **Original:** {{original_files}} files, {{original_subtasks}} subtasks
    **After Planning:** {{planned_files}} files (+{{file_growth}}), {{planned_subtasks}} subtasks (+{{subtask_growth}})
    **Recommendation:** Consider splitting this story before proceeding.
  </output>

  <ask>How to proceed?
    [C]ontinue - Accept increased scope (document risk)
    [S]plit - Split story now before implementation
    [A]bort - Stop and re-scope with SM</ask>

  <check if="user chooses C">
    <action>Document in Dev Notes: Complexity Growth Accepted {date}, original vs actual scope, risk noted</action>
    <output>Proceeding with increased scope. Risk documented.</output>
  </check>
  <check if="user chooses S">
    <action>Invoke story-sizing workflow for this story</action>
    <action>Create split stories, update sprint-status.yaml, continue with first split story</action>
  </check>
  <check if="user chooses A">
    <action>Mark story status as "blocked" in sprint-status.yaml</action>
    <output>Story blocked for re-scoping. Run create-story to revise.</output>
    <stop/>
  </check>
</check>

<check if="file_growth &lt;= 3 AND subtask_growth &lt;= 5">
  <output>Planning scope matches story estimate. Proceeding.</output>
</check>

## Phase C: Mark Story In-Progress

<check if="{{sprint_status}} file exists">
  <action>Update story status: ready-for-dev → in-progress in {{sprint_status}}</action>
  <output>Story {{story_key}} marked in-progress</output>
</check>
