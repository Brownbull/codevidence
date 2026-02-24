# Step 00: Project Knowledge Loading

Load all project knowledge once at session start. Cache for ECC agents.

<critical>Load ALL project knowledge ONCE at session start — pass to ECC agents via cached variables</critical>

<action>Load and cache {project-root}/_ecc/knowledge/code-review-patterns.md → {{cached_review_patterns}}</action>
<action>Load docs/architecture/<db-patterns>.md if present → {{cached_db_patterns}}  # optional: your DB/architecture doc</action>
<action>Load and cache {project-root}/docs/architecture/state-management.md → {{cached_state_mgmt}}</action>
<action>Load and cache {project-root}/docs/architecture/component-patterns.md → {{cached_components}}</action>
<action>Store combined as {{project_patterns}} for passing to ECC agents</action>

<action>Load and cache .claude/rules/testing.md → {{cached_testing_guidelines}}</action>
<action>Store as {{project_testing_patterns}} for TDD Guide agents</action>

<output>**ECC Orchestrator Initialized — Project Knowledge Cached**

  Knowledge loaded for session:
  - Code review patterns: {{review_patterns_summary}}
  - Architecture: <db-patterns>, state management, component patterns
  - Testing guidelines: loaded

  ECC agents will receive cached context.
</output>
