# Step 01: Story Discovery + Adaptive Classification

Load story, discover files to review, extract architectural ACs, classify complexity.

<step n="1" goal="Load story and discover files to review">
  <action>Use provided {{story_path}} or ask user which story to review</action>
  <action>Read COMPLETE story file</action>
  <action>Extract {{story_key}} from filename</action>
  <action>Extract {{epic_id}} from {{story_key}} (e.g., "<epic-id>-<story-num>" → epic_id = "<epic-id>")</action>
  <action>Parse sections: Acceptance Criteria, Tasks, File List</action>

  <critical>🏗️ ARCHITECTURE ENFORCEMENT: Extract architectural ACs for validation</critical>
  <action>Parse "Architectural Acceptance Criteria" section from story</action>
  <action>Extract {{architectural_acs}}, {{file_specification_table}}, {{architecture_reference}}, {{feature_name}}</action>

  <check if="architectural ACs found">
    <output>🏗️ **Architectural ACs Loaded** — Source: {{architecture_reference}}
      File Location ACs: {{file_location_ac_count}} | Pattern ACs: {{pattern_ac_count}} | Anti-Pattern ACs: {{antipattern_ac_count}}
    </output>
  </check>

  <check if="NO architectural ACs found">
    <action>Set {{architectural_acs}} = "No architectural ACs specified in story"</action>
    <output>⚠️ **No Architectural ACs in Story** — Re-create story using `ecc-create-story` to generate ACs from architecture documentation.</output>
  </check>

  <check if="git repository exists">
    <action>Run `git status --porcelain` and `git diff --name-only`</action>
    <action>Compile {{files_to_review}} from git + story File List</action>
  </check>

  <!-- Read ALL files ONCE — pass to agents to avoid 4x duplicate reads -->
  <critical>Read ALL files in {{files_to_review}} NOW using parallel Read calls.
    Store as {{file_contents_manifest}} — each file's path and full content.
    Agents MUST NOT read files themselves. This avoids 4x cost duplication.</critical>
  <action>Read all {{files_to_review}} in parallel</action>
  <action>Store combined content as {{file_contents_manifest}}</action>

  <output>📋 **Review Target** — Story: {{story_key}} | Files: {{file_count}} | Functional ACs: {{functional_ac_count}} | Architectural ACs: {{arch_ac_count}}</output>
</step>

<step n="1.5" goal="Classify story complexity for adaptive review agent selection" tag="classification">
  <critical>🎯 ADAPTIVE REVIEW: Select review agents based on story complexity — TRIVIAL gets code-reviewer only</critical>

  <action>Parse metrics: {{task_count}}, {{subtask_count}}, {{file_count}}, {{file_paths}}</action>
  <action>Check if {{file_paths}} match security patterns: e.g., database-rules files, "**/security/**", "**/functions/**", "**/auth/**"</action>
  <action>Set {{has_security_files}} = true/false</action>
  <action>Check if {{file_paths}} match architecture patterns: "**/stores/**", "**/contexts/**", "**/features/**/index.ts", "**/*.types.ts"</action>
  <action>Set {{has_architecture_files}} = true/false</action>
  <action>Search story content for keywords: authentication, authorization, delete, cascade, password, token, secret</action>
  <action>Set {{has_security_keywords}} = true/false</action>

  <!-- Classification cascade: first match wins -->
  <check if="task_count > 6 OR file_count > 10 OR ({{has_architecture_files}} AND {{has_security_files}})">
    <action>Set {{classification}} = "COMPLEX" | Set {{review_agents}} = ["code-reviewer", "security-reviewer", "architect", "tdd-guide"]</action>
  </check>
  <check if="{{classification}} NOT set AND (task_count > 4 OR file_count > 6 OR {{has_security_files}} OR {{has_security_keywords}})">
    <action>Set {{classification}} = "STANDARD" | Set {{review_agents}} = ["code-reviewer", "security-reviewer"]</action>
  </check>
  <check if="{{classification}} NOT set AND task_count &lt;= 2 AND subtask_count &lt;= 5 AND file_count &lt;= 3 AND NOT {{has_security_files}}">
    <action>Set {{classification}} = "TRIVIAL" | Set {{review_agents}} = ["code-reviewer"]</action>
  </check>
  <check if="{{classification}} NOT set">
    <action>Set {{classification}} = "SIMPLE" | Set {{review_agents}} = ["code-reviewer", "tdd-guide"]</action>
  </check>

  <!-- Force-include based on sensitivity -->
  <check if="{{has_security_files}} OR {{has_security_keywords}}">
    <action>Force add "security-reviewer" to {{review_agents}} if not already present</action>
  </check>
  <check if="{{has_architecture_files}} AND task_count > 6">
    <action>Force add "architect" to {{review_agents}} if not already present</action>
  </check>

  <check if="file_count > 12">
    <output>**Context Budget Warning:** {{file_count}} files exceeds the 12-file guideline. Consider splitting via `/story-sizing` or running agents in two passes.</output>
  </check>

  <output>🎯 **Classification: {{classification}}** | Tasks: {{task_count}} | Files: {{file_count}} | Security: {{has_security_files}} | Agents: {{review_agents}}</output>
</step>
