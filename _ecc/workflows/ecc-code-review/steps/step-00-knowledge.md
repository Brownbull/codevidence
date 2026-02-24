# Step 00: Project Knowledge Loading

Load all project knowledge once at review session start. Cache for ECC review agents.

<critical>📚 Load project patterns ONCE for all review agents</critical>

<action>Load {project-root}/_ecc/knowledge/code-review-patterns.md → {{cached_review_patterns}}</action>
<action>Load docs/architecture/<db-patterns>.md if present → {{cached_db_patterns}}  # optional: your DB/architecture doc</action>
<action>Load {project-root}/docs/architecture/state-management.md → {{cached_state_mgmt}}</action>
<action>Load {project-root}/docs/architecture/component-patterns.md → {{cached_components}}</action>
<action>Load .claude/rules/testing.md → {{cached_testing_guidelines}}</action>
<action>Store combined as {{project_patterns}} for ECC agents</action>
<action>Store testing content as {{project_testing_patterns}} for TDD Guide</action>

<output>📚 **ECC Orchestrator Initialized for Parallel Review**

  Project knowledge loaded for review agents:
  - Code review patterns: {{review_patterns_summary}}
  - DB patterns: {{db_patterns_summary}}
  - State management: {{state_mgmt_summary}}
  - Component patterns: {{components_summary}}
  - Testing guidelines: {{testing_summary}}

  Ready to spawn parallel review team.
</output>
