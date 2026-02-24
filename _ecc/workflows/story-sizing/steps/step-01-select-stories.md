# Step 01: Select Stories to Analyze

Sprint status scan, analysis mode selection (batch/single/manual).

<step n="1" goal="Select stories to analyze for sizing">

  <check if="{{story_path}} is provided by user">
    <action>Load single story from provided path</action>
    <action>Set {{analysis_mode}} = "single"</action>
    <action>GOTO step 2</action>
  </check>

  <action>Check if {{sprint_status}} file exists</action>
  <check if="sprint status file does NOT exist">
    <output>No sprint status file found and no story specified

      **Required Options:**
      1. Run `sprint-planning` to initialize sprint tracking
      2. Provide specific story path to analyze
      3. Provide story key to analyze</output>
    <ask>Choose option [1], [2], [3], or [X] to exit:</ask>

    <check if="user chooses X">
      <output>Workflow exited. No changes made.</output>
      <action>EXIT workflow gracefully</action>
    </check>
    <check if="user chooses 2 or 3">
      <ask>Please provide the story path or key:</ask>
      <action>Parse input and locate story file</action>
      <action>Set {{analysis_mode}} = "single"</action>
      <action>GOTO step 2</action>
    </check>
  </check>

  <!-- Load sprint status for batch analysis -->
  <critical>MUST read COMPLETE {sprint_status} file from start to end</critical>
  <action>Load the FULL file: {{sprint_status}}</action>
  <action>Find ALL stories with status = "ready-for-dev" OR "drafted"</action>
  <action>Set {{candidate_stories}} = list of story keys</action>
  <action>Set {{candidate_count}} = count of stories found</action>

  <check if="{{candidate_count}} == 0">
    <output>No stories found with status "ready-for-dev" or "drafted".
      All stories are either in backlog, in-progress, or done.</output>
    <ask>Would you like to analyze a specific story by path? [Y/N/X to exit]</ask>
    <check if="user chooses X or N">
      <output>Workflow exited. No changes made.</output>
      <action>EXIT workflow gracefully</action>
    </check>
    <check if="user chooses Y">
      <ask>Please provide the story path:</ask>
      <action>Parse input and locate story file</action>
      <action>Set {{analysis_mode}} = "single"</action>
      <action>GOTO step 2</action>
    </check>
  </check>

  <output>**Found {{candidate_count}} stories to analyze:**
    {{candidate_stories_list}}</output>

  <ask>Select analysis mode:
    1. **Analyze all** - Check all {{candidate_count}} stories for sizing issues
    2. **Select specific** - Choose which stories to analyze
    3. **Single story** - Analyze one specific story by key
    X. **Exit** workflow
    Choose [1], [2], [3], or [X]:</ask>

  <check if="user chooses X">
    <output>Workflow exited. No changes made.</output>
    <action>EXIT workflow gracefully</action>
  </check>
  <check if="user chooses 1">
    <action>Set {{analysis_mode}} = "batch"</action>
    <action>Set {{stories_to_analyze}} = {{candidate_stories}}</action>
  </check>
  <check if="user chooses 2">
    <ask>Enter story keys to analyze (comma-separated):</ask>
    <action>Parse user input into {{stories_to_analyze}}</action>
    <action>Set {{analysis_mode}} = "batch"</action>
  </check>
  <check if="user chooses 3">
    <ask>Enter story key to analyze:</ask>
    <action>Set {{stories_to_analyze}} = [user_input]</action>
    <action>Set {{analysis_mode}} = "single"</action>
  </check>
</step>
