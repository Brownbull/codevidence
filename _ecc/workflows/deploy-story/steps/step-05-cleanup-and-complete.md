# Step 05: Branch Cleanup + Sprint Status + Deployment Summary

Branch cleanup, sprint status update, and deployment summary.

<step n="5" goal="Branch cleanup, sprint status update, deployment summary">

  <!-- Branch Cleanup -->
  <action>Run `git fetch --prune`</action>
  <action>Run `git checkout develop`</action>
  <action>Run `git pull origin develop`</action>
  <output>**Branch Cleanup**
    Remote branches pruned. Local develop branch synced with origin.</output>

  <!-- Sprint Status Update -->
  <check if="{sprint_status} file exists">
    <action>Load {sprint_status}</action>
    <action>Update development_status[{{story_key}}] = "deployed"</action>
    <action>Add deployed_to: {{final_environment}}</action>
    <action>Add deployed_at: {{date}}</action>
    <action>Save file preserving structure</action>
    <output>Sprint status updated: {{story_key}} -> deployed ({{final_environment}})</output>
  </check>

  <!-- Deployment Summary -->
  <output>**DEPLOYMENT COMPLETE**

    **Story:** {{story_key}}
    **Final Environment:** {{final_environment}}
    **Production URL:** {deployment_urls.production}

    **Pipeline Executed:**
    - Story status verified (done)
    - Pre-deployment validation passed
    - PR to develop (squash merge) {{develop_pr_url}}
    {{#if final_environment == 'production'}}- PR to main (merge commit) {{main_pr_url}}
    - Frontend/hosting auto-deployed on merge
    {{#if deploy_targets}}- Backend deployed: {{deploy_targets}}
    - Staging synced (rules + indexes){{else}}- No backend changes detected{{/if}}{{else}}- Production deployment skipped{{/if}}
    - Branches cleaned up
    - Sprint status synced

    **Next Steps:**
    - Run `/workflow-close` to verify tests, status files, and branch state
    - Verify production functionality at {deployment_urls.production}
    {{#if deploy_targets}}- Verify backend in deployment console
    - Update deployment manifest/changelog{{/if}}
    - Run `/sprint-status` to see sprint progress
    - Continue with next story via `/ecc-create-story`
    - Disable any deployment MCP tools if enabled for this session</output>
</step>
