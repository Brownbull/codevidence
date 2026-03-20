# Step 02: PR to develop (squash merge)

Create PR from feature branch to develop, wait for CI, squash merge.

<step n="2" goal="Create PR to develop (squash merge)">

  <action>Run `git fetch origin`</action>
  <action>Run `git push -u origin {{current_branch}}`</action>

  <output>**Step 1/2: PR to develop**
    Creating PR: {{current_branch}} -> develop (squash merge)
    This integrates your feature into the development branch.</output>

  <ask>Proceed with PR to develop? [Y/N]</ask>
  <check if="user says N">
    <output>Deployment paused. Resume when ready.</output>
    <action>EXIT workflow</action>
  </check>

  <action>Run `gh pr create --base develop --title "{{story_key}}: {{story_title}}" --body "## Summary

{{story_summary}}

## Story
{{story_key}}

## Acceptance Criteria
{{acceptance_criteria_summary}}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"`</action>

  <action>Set {{develop_pr_url}} = PR URL from output</action>

  <output>**PR Created:** {{develop_pr_url}}
    Waiting for CI checks to pass...</output>

  <action>Run `gh pr checks {{develop_pr_url}} --watch` to wait for CI</action>

  <check if="CI checks fail">
    <output>**CI CHECKS FAILED**
      Fix the failing checks on branch {{current_branch}} and push again.
      The PR will re-run CI automatically. Do NOT bypass CI.</output>
    <action>EXIT workflow</action>
  </check>

  <output>**CI Checks Passed** — Squash-merging PR to develop...</output>

  <action>Run `gh pr merge {{develop_pr_url}} --squash --delete-branch`</action>

  <check if="merge fails">
    <output>**MERGE FAILED**
      Check the PR for merge conflicts or review requirements. Resolve and retry.</output>
    <action>EXIT workflow</action>
  </check>

  <output>**Merged to develop (squash)**
    Feature branch {{current_branch}} auto-deleted.
    CI validates on push to develop.</output>
</step>
