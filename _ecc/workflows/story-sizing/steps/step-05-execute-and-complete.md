# Step 05: Execute Splits, Create Files, Update Sprint Status, Summary

Execute approved splits, create new story files, update sprint status, and present summary.

<step n="5" goal="Execute splits and create new story files">

  <check if="{{stories_to_split}} is empty">
    <output>No stories selected for splitting.</output>
    <action>Skip to summary below</action>
  </check>

  <action>For each story in {{stories_to_split}}:</action>
  <action>  1. Generate sub-story keys using letter suffix (e.g., 22 -> 22a, 22b, 22c)</action>
  <action>  2. Create new story files from template</action>
  <action>  3. Distribute tasks according to split strategy</action>
  <action>  4. Copy relevant Dev Notes and Acceptance Criteria</action>
  <action>  5. Add dependency note: "Part of split from {{original_story_key}}"</action>
  <action>  6. Add cross-references between split stories</action>
  <action>  7. Mark original story as "split" or archive it</action>

  <output>**Split Complete: {{original_story_key}}**
    **Created {{sub_story_count}} sub-stories:**
    {{created_stories_list}}
    **Original story archived/marked as split**</output>

  <action>After all splits complete:</action>
  <action>Set {{total_created}} = count of new stories</action>
  <action>Set {{total_archived}} = count of original stories archived</action>
</step>

<!-- Sprint Status Update -->
<step n="6" goal="Update sprint status with split results">

  <check if="sprint status file exists AND splits were made">
    <critical>MUST update {sprint_status} with new stories</critical>
    <action>Load the FULL file: {{sprint_status}}</action>
    <action>For each split story:</action>
    <action>  1. Update original story status to "split" or remove entry</action>
    <action>  2. Add entries for each new sub-story with status "ready-for-dev"</action>
    <action>  3. Preserve story ordering within epic</action>
    <action>Save file, preserving ALL comments and structure</action>
    <output>**Sprint Status Updated**
      - Archived/marked as split: {{total_archived}} stories
      - Added new entries: {{total_created}} stories</output>
  </check>

  <check if="no splits were made">
    <output>No changes to sprint status required.</output>
  </check>
</step>

<!-- Summary -->
<step n="7" goal="Present sizing results and next steps">

  <output>**STORY SIZING COMPLETE, {user_name}!**

    **Analysis Summary:**
    - Stories Analyzed: {{total_analyzed}}
    - OK (no action needed): {{ok_count}}
    - Split: {{total_archived}} -> {{total_created}} new stories

    **Files Modified:**
    {{modified_files_list}}

    **Next Steps:**
    1. Review the split stories in their respective files
    2. Mark split stories ready for dev
    3. Prioritize sub-stories in sprint planning

    **Sizing Tip:** Consider using `ecc-create-story` for future stories -
    it includes built-in sizing checks via mid-story sizing.</output>
</step>
