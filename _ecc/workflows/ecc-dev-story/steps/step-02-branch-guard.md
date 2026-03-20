# Step 02: Branch Guard

Ensure correct feature branch before any code changes.

<critical>BRANCH GUARD: All development MUST happen on a feature branch off develop.</critical>
<critical>NEVER start coding on main or develop — always use a feature branch.</critical>

<action>Run `git branch --show-current` → {{current_branch}}</action>
<action>Run `git status --porcelain` → {{git_status}}</action>

<!-- Case 1: On a protected branch -->
<check if="{{current_branch}} == 'main' OR {{current_branch}} == 'develop'">
  <check if="{{git_status}} has uncommitted changes">
    <output>**BRANCH WARNING**

      You are on **{{current_branch}}** (protected) with uncommitted changes.
      These changes must be moved to a feature branch before proceeding.
    </output>
    <ask>Stash changes and create feature branch? [Y/N]</ask>
    <check if="user says Y">
      <action>Run `git stash`</action>
    </check>
    <check if="user says N">
      <output>Cannot proceed on a protected branch. Commit or stash changes, then create a feature branch.</output>
      <action>EXIT workflow</action>
    </check>
  </check>

  <action>Run `git checkout develop`</action>
  <action>Run `git pull origin develop`</action>
  <action>Derive branch name from story key: feature/{{story_key}}</action>
  <action>Run `git checkout -b feature/{{story_key}}`</action>

  <check if="stashed changes exist">
    <action>Run `git stash pop`</action>
    <output>Stashed changes restored on feature branch.</output>
  </check>

  <action>Set {{current_branch}} = feature/{{story_key}}</action>
  <output>**Feature Branch Created**

    Branch: feature/{{story_key}} (from develop)
    All development will happen on this branch.
  </output>
</check>

<!-- Case 2: Already on a feature branch -->
<check if="{{current_branch}} != 'main' AND {{current_branch}} != 'develop'">
  <action>Run `git fetch origin`</action>
  <action>Run `git log HEAD..origin/develop --oneline` → {{behind_commits}}</action>

  <check if="{{behind_commits}} is not empty">
    <output>**BRANCH SYNC WARNING**

      Branch **{{current_branch}}** is behind develop by:
      {{behind_commits}}

      Rebasing before development prevents merge conflicts later.
    </output>
    <ask>Rebase onto latest develop? [Y/N]</ask>
    <check if="user says Y">
      <action>Run `git rebase origin/develop`</action>
      <check if="rebase conflict">
        <output>**REBASE CONFLICT** — Resolve manually and re-run ecc-dev-story.</output>
        <action>EXIT workflow</action>
      </check>
      <output>Branch rebased onto latest develop.</output>
    </check>
    <check if="user says N">
      <output>Proceeding with potentially outdated branch. Merge conflicts may occur later.</output>
    </check>
  </check>

  <check if="{{behind_commits}} is empty">
    <output>**Branch Verified**

      Branch: {{current_branch}} (up-to-date with develop)
      Ready to proceed with development.
    </output>
  </check>
</check>
