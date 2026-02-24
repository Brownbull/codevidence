# Step 04: Backend Deployment (if needed)

Check for backend/infrastructure changes and deploy if required.

<step n="4" goal="Backend deployment (if needed)" tag="backend-deploy">

  <!-- Backend Changes Detection -->
  <action>Run `git diff origin/main~1..origin/main --name-only` to detect backend file changes</action>
  <action>Check detected files against your project's backend patterns (e.g., database rules, serverless function source, infrastructure configs)</action>

  <check if="no backend files changed">
    <output>**No backend changes detected** — hosting/frontend-only deployment.
    Proceeding to cleanup.</output>
  </check>

  <check if="backend files changed">
    <output>**Backend Changes Detected**
    Files: {{backend_files_changed}}
    Backend changes require a manual deployment step after merge to main.
    Frontend/hosting auto-deploys on merge; backend infrastructure does NOT.</output>

    <action>Identify {{deploy_targets}} from the changed backend files</action>

    <ask>Deploy backend to production now?
    Targets: {{deploy_targets}}
    Command: `<your-deploy-command> --targets {{deploy_targets}} --project <your-project-id>`
    [Y / N — deploy later]</ask>

    <check if="user says Y">
      <action>Run your project's deploy command for {{deploy_targets}}</action>
      <check if="deploy succeeds">
        <output>Backend deployed successfully.</output>
        <!-- Sync staging if applicable -->
        <action>If your project has a staging environment, sync backend config to staging</action>
      </check>
      <check if="deploy fails">
        <output>**Deploy Failed** — check logs, fix, and retry.
        Deploy later with: `<your-deploy-command> --targets {{deploy_targets}}`
        See your project's deployment docs for full reference.</output>
      </check>
    </check>

    <check if="user says N">
      <output>Backend deployment deferred.
      Deploy later with: `<your-deploy-command> --targets {{deploy_targets}}`
      See your project's deployment docs for full reference.</output>
    </check>
  </check>

<!-- STEP COMPLETE: mark Step 4 [x] in router checklist, load step-05-cleanup-and-complete.md -->
</step>
