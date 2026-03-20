# Step 03: Split Recommendations

Present CRITICAL/WARNING stories and split strategy options.

<step n="3" goal="Present split recommendations for oversized stories">

  <check if="{{critical_count}} > 0">
    <output>**CRITICAL: {{critical_count}} stories REQUIRE splitting before development**
      These stories will exhaust the dev agent's context window mid-implementation:
      {{critical_stories_details}}</output>
  </check>

  <check if="{{warning_count}} > 0">
    <output>**WARNING: {{warning_count}} stories are at capacity**
      These stories are at the upper limit and may benefit from splitting:
      {{warning_stories_details}}</output>
  </check>

  <action>For each oversized story, generate split recommendations:</action>
  <action>  1. Analyze task groupings for natural split points</action>
  <action>  2. Suggest split strategy (by_layer, by_feature, by_phase, by_file)</action>
  <action>  3. Calculate metrics for proposed sub-stories</action>

  <output>**Recommended Splits:**
    {{split_recommendations}}</output>

  <ask>How would you like to proceed?
    1. **Auto-split all** - Apply recommended splits to all oversized stories
    2. **Review each** - Interactively review and approve each split
    3. **Skip warnings** - Only split CRITICAL stories, ignore warnings
    4. **Manual mode** - I'll specify my own split strategy
    X. **Exit** - Don't split anything
    Choose [1], [2], [3], [4], or [X]:</ask>

  <check if="user chooses X">
    <output>Workflow exited. No stories were split.</output>
    <action>GOTO step 6</action>
  </check>
  <check if="user chooses 1">
    <action>Set {{split_mode}} = "auto_all"</action>
    <action>Set {{stories_to_split}} = {{critical_stories}} + {{warning_stories}}</action>
  </check>
  <check if="user chooses 2">
    <action>Set {{split_mode}} = "interactive"</action>
    <action>GOTO step 4b (interactive review in step-04-interactive-split.md)</action>
  </check>
  <check if="user chooses 3">
    <action>Set {{split_mode}} = "auto_critical"</action>
    <action>Set {{stories_to_split}} = {{critical_stories}}</action>
  </check>
  <check if="user chooses 4">
    <action>Set {{split_mode}} = "manual"</action>
    <action>GOTO step 4c (manual mode in step-04-interactive-split.md)</action>
  </check>
</step>
