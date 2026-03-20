# Step 00: Preflight

Story status verification + branch guard.

<step n="0" goal="Story verification + branch guard">

  <!-- Story Verification -->
  <action>If {{story_path}} not provided, ask user which story to deploy</action>
  <action>Read COMPLETE story file</action>
  <action>Extract {{story_key}} from filename</action>
  <action>Extract story Status field</action>

  <check if="story status != 'done'">
    <output>**DEPLOYMENT BLOCKED**
      Story status is "{{story_status}}" - must be "done" to deploy.
      Run `/ecc-code-review` first to complete the story.</output>
    <action>EXIT workflow</action>
  </check>

  <!-- Uncommitted Changes -->
  <action>Run `git status --porcelain` to check for uncommitted changes</action>
  <check if="uncommitted changes exist">
    <output>**WARNING: Uncommitted Changes Detected**
      Please commit or stash changes before deployment.</output>
    <ask>Commit changes now? [Y/N]</ask>
    <check if="user says Y">
      <action>Stage relevant files with `git add` (specific files, not -A)</action>
      <action>Run `git commit -m "chore: pre-deployment cleanup for {{story_key}}"`</action>
    </check>
    <check if="user says N">
      <output>Deployment cancelled. Commit changes and retry.</output>
      <action>EXIT workflow</action>
    </check>
  </check>

  <!-- Branch Guard -->
  <action>Detect current branch with `git branch --show-current`</action>
  <action>Set {{current_branch}} = result</action>

  <check if="{{current_branch}} == 'main' OR {{current_branch}} == 'develop'">
    <output>**DEPLOYMENT BLOCKED**
      You are on a protected branch ({{current_branch}}).
      Deployments must originate from a feature/fix/chore branch.</output>
    <action>EXIT workflow</action>
  </check>

  <output>**Story Ready for Deployment**
    **Story:** {{story_key}}
    **Current Branch:** {{current_branch}}
    **Status:** done
    Pipeline: {{current_branch}} -> develop (squash PR) -> main (merge PR)</output>
</step>
