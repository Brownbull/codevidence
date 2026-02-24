# Step 02: Parse Story Content and Apply Sizing Heuristics

Load stories, extract metrics, apply Opus 4.6 sizing heuristics.

<step n="2" goal="Load and parse story content, apply sizing analysis">

  <!-- Parse story content -->
  <critical>EXHAUSTIVE STORY ANALYSIS</critical>

  <action>For each story in {{stories_to_analyze}}:</action>
  <action>  1. Locate story file using story key pattern</action>
  <action>  2. Load complete story file content</action>
  <action>  3. Parse sections: Tasks/Subtasks, Dev Notes, Acceptance Criteria</action>
  <action>  4. Extract metrics:</action>
  <action>     - task_count: Number of top-level tasks (lines starting with "- [ ] Task")</action>
  <action>     - subtask_count: Total subtasks across all tasks (nested "- [ ]" items)</action>
  <action>     - file_count: Estimated files from Dev Notes or task descriptions</action>
  <action>     - complexity_indicators: Test requirements, architectural changes, dependencies</action>
  <action>  5. Run `dust` on affected feature directories to assess current codebase size:</action>
  <action>     - `dust <src>/<features>/<feature>/ -d 2` for feature module size</action>
  <action>     - Use directory sizes to gauge context budget impact</action>

  <action>Set {{story_metrics}} = collected metrics for all stories</action>

  <!-- Apply sizing heuristics -->
  <critical>CONTEXT WINDOW SIZING - Apply sizing heuristics (Opus 4.6 calibrated)</critical>

  <note>
    **Sizing Guidelines (Opus 4.6 - Updated 2026-02-05):**
    - **SMALL (1-2 pts):** 1-3 tasks, <=10 subtasks total, <=4 files
    - **MEDIUM (3-5 pts):** 3-6 tasks, <=25 subtasks total, <=8 files
    - **LARGE (5-8 pts):** 6-8 tasks, <=40 subtasks total, <=12 files
    - **TOO LARGE (needs split):** >8 tasks OR >40 subtasks OR >12 files

    **Key Insight:** Opus 4.6 can handle ~3x the context of previous models.
    Prefer fewer, larger stories to reduce context-switch overhead.
  </note>

  <action>For each story in {{story_metrics}}:</action>
  <action>  Apply sizing classification based on metrics</action>
  <action>  Set {{story_size}} = SMALL | MEDIUM | LARGE | TOO_LARGE</action>

  <action>Categorize results:</action>
  <action>  {{ok_stories}} = stories classified as SMALL or MEDIUM</action>
  <action>  {{warning_stories}} = stories classified as LARGE</action>
  <action>  {{critical_stories}} = stories classified as TOO_LARGE</action>

  <output>**Sizing Analysis Complete**

    **Summary:**
    - OK (SMALL/MEDIUM): {{ok_count}} stories
    - WARNING (LARGE): {{warning_count}} stories
    - CRITICAL (TOO_LARGE): {{critical_count}} stories

    {{sizing_results_table}}</output>

  <check if="{{critical_count}} == 0 AND {{warning_count}} == 0">
    <output>**All stories are properly sized!**
      No stories require splitting. All are within context window capacity.</output>
    <action>GOTO step 6</action>
  </check>
</step>
