# Step 03: PR to main (merge commit)

Create PR from develop to main, wait for CI, merge commit for production deployment.

<step n="3" goal="Create PR to main (merge commit)">

  <action>Run `git checkout develop`</action>
  <action>Run `git pull origin develop`</action>

  <output>**Step 2/2: PR to main (production)**
    Creating PR: develop -> main (merge commit, preserves history)
    This triggers auto-deploy on merge to main.</output>

  <ask>**FINAL CONFIRMATION**: Create PR to main for production deployment? [Y/N]</ask>
  <check if="user says N">
    <output>Deployment paused at develop. Story is integrated but not in production.
      You can create the PR to main later.</output>
    <action>Set {{final_environment}} = "develop"</action>
    <action>GOTO step 5 (cleanup)</action>
  </check>

  <action>Run `gh pr create --base main --title "Release: {{story_key}}" --body "## Release

Promoting develop to main for story {{story_key}}.

## Changes
{{story_summary}}

Auto-deploys on merge to main.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"`</action>

  <action>Set {{main_pr_url}} = PR URL from output</action>

  <output>**PR Created:** {{main_pr_url}}
    Waiting for CI checks to pass...</output>

  <action>Run `gh pr checks {{main_pr_url}} --watch` to wait for CI</action>

  <check if="CI checks fail">
    <output>**CI CHECKS FAILED**
      Fix the failing checks on develop and push again.
      Do NOT bypass CI.</output>
    <action>EXIT workflow</action>
  </check>

  <output>**CI Checks Passed** — Merge-committing PR to main...</output>

  <action>Run `gh pr merge {{main_pr_url}} --merge`</action>

  <check if="merge fails">
    <output>**MERGE FAILED**
      Check the PR for merge conflicts or review requirements. Resolve and retry.</output>
    <action>EXIT workflow</action>
  </check>

  <action>Set {{final_environment}} = "production"</action>

  <output>**Merged to main**
    Frontend/hosting auto-deploys on merge to main.
    Production URL: {deployment_urls.production}
    Checking if backend deployment is needed...</output>
</step>
