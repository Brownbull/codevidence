# Step 01: Pre-Deployment Validation

Validate deployment against project patterns before any PRs.

<step n="1" goal="Pre-deployment validation">

  <action>Load project patterns from {project-root}/_ecc/knowledge/code-review-patterns.md</action>
  <action>Load architecture docs from {project-root}/docs/architecture/</action>

  <output>**Pre-Deployment Validation**
    Checking alignment with documented architecture and patterns...</output>

  <!-- Cross-cutting impact analysis -->
  <action>Identify workflows affected by this story's changes:
    1. Parse story acceptance criteria for user journey references
    2. Map file changes to affected features
    3. Identify downstream impacts</action>

  <!-- Architectural alignment -->
  <action>Check implementation against architecture docs:
    1. Verify patterns used match documented ADRs
    2. Check for undocumented architectural decisions
    3. Flag any deviations from standards</action>

  <check if="critical architectural conflicts found">
    <output>**DEPLOYMENT BLOCK**
      Critical architectural conflicts detected:
      {{conflict_list}}
      Resolve these issues before deployment.</output>
    <ask>Override deployment block? (Not recommended) [Y/N]</ask>
    <check if="user says N">
      <action>EXIT workflow</action>
    </check>
    <check if="user says Y">
      <action>Log override decision</action>
      <output>Deployment block overridden by user. Proceeding with caution.</output>
    </check>
  </check>

  <output>**Validation: PASSED**
    Patterns validated: {{chain_count}}
    Architectural alignment: Confirmed
    Downstream impacts: {{impact_summary}}</output>
</step>
