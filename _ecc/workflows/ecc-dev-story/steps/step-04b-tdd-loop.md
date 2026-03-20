# Step 04b: TDD Development Loop

Per-task TDD cycle with architecture validation, build resolver, and batched progress tracking.

<loop for="each incomplete task in {{task_list}}">
  <output>**Spawning ECC TDD Guide for Task: {{current_task}}** — RED-GREEN-REFACTOR cycle</output>

  <ecc-spawn agent="tdd-guide">
    <task-call>
      subagent_type: "everything-claude-code:tdd-guide"
      model: "{{tdd_model}}"
      description: "TDD implementation for {{current_task}}"
      prompt: |
        Implement task using strict TDD methodology: {{current_task}}

        **Implementation Plan (from Planner):** {{implementation_plan}}
        **Testing Patterns:** {{project_testing_patterns}}
        **Cached Testing Guidelines:** {{cached_testing_guidelines}}

        ## MANDATORY: Architecture Compliance
        **Architecture Source:** {{architecture_reference}}
        **Expected File Paths (story File Specification):** {{expected_file_paths}}
        **File Location ACs:** {{file_location_acs}}
        **Pattern ACs:** {{pattern_acs}}
        **Anti-Patterns (MUST NOT DO):** {{antipattern_acs}}

        **Requirements:**
        1. Write FAILING tests first (RED)
        2. Implement MINIMAL code to pass (GREEN)
        3. Refactor while green (REFACTOR)
        4. 80%+ coverage for new code
        5. Create files ONLY at paths in story File Specification
        6. Run tests per-edit: `npx vitest run <path>` — no full suite per subtask
        7. Do NOT run npm run build — defer to Step 5 consolidated validation
        8. Do NOT edit story file for subtask completion — report completed subtasks in output only

        **Task Details:** {{current_task_details}}

        **Expected Output:** Test files, implementation files (at specified paths), coverage report,
        list of completed subtasks (for batch tracking — NOT written to story file)
    </task-call>
  </ecc-spawn>

  <action>Collect TDD output for {{current_task}}</action>

  <!-- Architecture Validation: check file locations after each task -->
  <action>Identify new files created by TDD Guide</action>
  <action>Validate each new file against {{expected_file_paths}} and architectural ACs</action>

  <check if="file location violation detected">
    <output>**ARCHITECTURAL VIOLATION**
      Expected: {{expected_path}} | Actual: {{actual_path}} | AC: {{violated_ac}}
    </output>
    <ask>How to handle? [F]ix (move + update imports) / [E]xception (document) / [A]bort:</ask>
    <check if="user chooses F">
      <action>Move file from {{actual_path}} to {{expected_path}}, update all imports, re-run tests</action>
      <output>File moved to correct location. Imports updated.</output>
    </check>
    <check if="user chooses E">
      <ask>Provide justification for exception:</ask>
      <action>Document exception in story Dev Notes: path, expected path, justification, date</action>
      <output>Exception documented. Will be flagged in code review.</output>
    </check>
    <check if="user chooses A">
      <action>Mark story as blocked</action>
      <output>Implementation paused. Resolve architectural issue before continuing.</output>
      <stop/>
    </check>
  </check>

  <check if="file violates documented anti-pattern in {{antipattern_acs}}">
    <output>**ANTI-PATTERN VIOLATION** — {{actual_path}} violates {{violated_antipattern_ac}}</output>
    <action>Move file to location per documented patterns, update imports</action>
  </check>

  <check if="build errors detected">
    <output>Build errors detected — spawning Build Resolver...</output>
    <ecc-spawn agent="build-resolver">
      <task-call>
        subagent_type: "everything-claude-code:build-error-resolver"
        model: "sonnet"
        max_turns: 5
        description: "Fix build errors"
        prompt: |
          Fix build/TypeScript errors with MINIMAL changes.
          **Errors:** {{build_errors}}
          Rules: Fix only what's needed. No refactoring. No architecture changes. No file moves.
      </task-call>
    </ecc-spawn>
  </check>

  <!-- Batched Progress: single story file write per task -->
  <action>Add completed subtasks from TDD output to {{progress_tracker}}.completed_subtasks</action>
  <action>Add {{current_task}} to {{progress_tracker}}.completed_tasks</action>
  <action>Add changed files to {{progress_tracker}}.files_changed</action>
  <action>BATCH EDIT story file: mark all completed_subtasks [x], mark {{current_task}} [x], update File List</action>
  <action>Clear {{progress_tracker}}.completed_subtasks for next task</action>

  <!-- Mid-Task Sizing Check -->
  <action>Update {{sizing_metrics}}: increment current_files + current_loc from task output,
    increment completed_task_count, decrement remaining_tasks</action>

  <check if="sizing_metrics.current_files > 8 OR sizing_metrics.current_loc > (500 * sizing_metrics.completed_task_count)">
    <action>Run `dust <src>/<features>/<feature>/ -d 2` to show growth vs baseline</action>
    <output>**MID-IMPLEMENTATION SIZE ALERT** — Task: {{current_task}}
      Files: {{sizing_metrics.current_files}}/8 limit | LOC: {{sizing_metrics.current_loc}} | Remaining: {{sizing_metrics.remaining_tasks}}
    </output>
    <ask>Continue?
      [C]ontinue - Accept trajectory (document risk)
      [P]ause - Commit work, create follow-up story for remaining tasks
      [S]plit - Split remaining tasks into new story now</ask>
    <check if="user chooses C">
      <action>Document in Dev Notes: Size Alert Accepted {date}, files/LOC metrics, remaining tasks</action>
    </check>
    <check if="user chooses P">
      <action>Update story: mark remaining tasks "Deferred to follow-up"</action>
      <action>Create follow-up story with remaining tasks, add cross-reference</action>
      <action>Jump to Step 5 validation — skip remaining tasks in loop</action>
    </check>
    <check if="user chooses S">
      <action>Invoke story-sizing workflow with remaining tasks, create split stories, update sprint-status.yaml</action>
    </check>
  </check>

  <output>**Task Complete:** {{current_task}}
    Files (arch-validated): {{task_files_list}} | Subtasks batched: {{batched_subtask_count}}
  </output>
</loop>

<output>**ECC TDD Guide Complete**
  Tasks: {{completed_task_count}} | Coverage: {{coverage_percentage}}% | Violations fixed: {{violations_fixed_count}}
</output>
