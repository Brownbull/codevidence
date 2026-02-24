# Step 04: Interactive Split Review + Manual Mode

Interactive review (4b) and manual split mode (4c) merged into one step file.

<!-- STEP 4b: Interactive Split Review -->
<step n="4b" goal="Interactive review of each split recommendation">

  <action>For each story in ({{critical_stories}} + {{warning_stories}}):</action>

  <output>**Story: {{current_story_key}}**

    **Current Metrics:**
    | Metric | Value | Guideline | Status |
    |--------|-------|-----------|--------|
    | Tasks | {{task_count}} | <=8 | {{task_status}} |
    | Subtasks | {{subtask_count}} | <=40 | {{subtask_status}} |
    | Files | {{file_count}} | <=12 | {{file_status}} |

    **Recommended Split Strategy: {{recommended_strategy}}**
    {{split_preview}}</output>

  <ask>Action for {{current_story_key}}:
    1. **Accept** - Apply this split
    2. **Modify** - Adjust the split strategy
    3. **Skip** - Don't split this story
    4. **Custom** - Define my own split
    X. **Exit** - Stop reviewing, proceed with accepted splits
    Choose [1], [2], [3], [4], or [X]:</ask>

  <check if="user chooses 1">
    <action>Add story to {{approved_splits}} with recommended strategy</action>
  </check>
  <check if="user chooses 2">
    <ask>Which split strategy? [by_layer/by_feature/by_phase/by_file]</ask>
    <action>Regenerate split preview with selected strategy</action>
    <action>Redisplay for approval</action>
  </check>
  <check if="user chooses 3">
    <action>Skip this story, continue to next</action>
  </check>
  <check if="user chooses 4">
    <ask>Describe your split approach (which tasks go in which sub-story):</ask>
    <action>Parse custom split definition</action>
    <action>Add to {{approved_splits}} with custom strategy</action>
  </check>
  <check if="user chooses X">
    <action>Set {{stories_to_split}} = {{approved_splits}}</action>
  </check>

  <action>After all stories reviewed, set {{stories_to_split}} = {{approved_splits}}</action>
</step>

<!-- STEP 4c: Manual Split Mode -->
<step n="4c" goal="Manual split specification">

  <output>**Manual Split Mode**
    Oversized stories to consider:
    {{oversized_stories_list}}</output>

  <ask>Which story would you like to split? (enter story key or [done] when finished)</ask>

  <check if="user says done">
    <action>Proceed to step 5</action>
  </check>

  <action>Load selected story details</action>
  <output>**Story: {{selected_story_key}}**
    **Tasks:** {{task_list_numbered}}</output>

  <ask>How many sub-stories to create? [2-5]</ask>
  <action>For each sub-story, ask:</action>
  <ask>Sub-story {{n}} name and which tasks (by number):</ask>

  <action>Build custom split definition from user input</action>
  <action>Add to {{stories_to_split}}</action>
  <action>Ask if user wants to split another story</action>
</step>
