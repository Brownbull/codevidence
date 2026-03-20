# Step 04a: TDD Setup

Initialize progress tracking, sizing baseline, and AST-grep guidance before the TDD loop.

<critical>ECC ORCHESTRATOR: Spawning ECC TDD Guide agent for each task</critical>
<critical>ARCHITECTURE ENFORCEMENT: Validate file locations after each task</critical>
<critical>BATCHED PROGRESS: Track subtasks in memory, write story file only on task_complete</critical>

<!-- Initialize Progress Tracker in memory -->
<action>Initialize progress tracker in memory:
  {{progress_tracker}} = {
    completed_subtasks: [],
    completed_tasks: [],
    current_task: null,
    files_changed: []
  }
</action>
<output>Progress tracker initialized. Story file updates batched at task boundaries.</output>

<!-- Initialize Sizing Metrics -->
<action>Run `dust <src>/<features>/ -d 2` to capture baseline directory sizes for context budgeting</action>
<action>Initialize sizing metrics in memory:
  {{sizing_metrics}} = {
    current_files: 0,
    current_loc: 0,
    completed_task_count: 0,
    remaining_tasks: length of {{task_list}},
    baseline_dir_sizes: output of dust command
  }
</action>

<!-- TDD Efficiency Rules -->
<action>For each task: read test + implementation files ONCE before starting TDD loop.
  After editing, context already has new content — avoid redundant re-reads of unchanged files.
  Run tests per-edit with `npx vitest run <path>` — do NOT run full suite per subtask.
</action>

<!-- AST-Grep Structural Search: check before writing new code -->
<action>BEFORE writing new service functions, hooks, or utility code:
  1. Run ast-grep MCP `find_code` to check if similar pattern already exists in `src/`
  2. If matches found → reuse or extract to shared utility instead of duplicating
  3. When extracting shared code, use `find_code` to find ALL callers before refactoring
  4. If your project has ast-grep skill patterns, load `.claude/skills/ast-grep/SKILL.md` for pre-built query templates
</action>

<output>TDD setup complete. Ready to begin per-task loop in step-04b.</output>
