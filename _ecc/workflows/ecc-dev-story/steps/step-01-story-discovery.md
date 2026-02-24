# Step 01: Story Discovery

Find next ready story, load it, parse ACs, classify complexity, extract architectural requirements.

<check if="{{story_path}} is provided">
  <action>Use {{story_path}} directly</action>
  <action>Read COMPLETE story file</action>
  <action>Extract story_key from filename or metadata</action>
  <goto anchor="task_check" />
</check>

<check if="{{sprint_status}} file exists">
  <action>Load the FULL file: {{sprint_status}}</action>
  <action>Find the FIRST story with status "ready-for-dev"</action>

  <check if="no ready-for-dev story found">
    <output>No ready-for-dev stories found in sprint-status.yaml

      **Options:**
      1. Run `ecc-create-story` to create next story with ECC planning
      2. Specify a particular story file path
    </output>
    <ask>Choose option [1] or [2], or provide story path:</ask>
  </check>
</check>

<anchor id="task_check" />
<action>Parse sections: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes</action>
<action>Identify first incomplete task (unchecked [ ])</action>
<action>Set {{story_context}} = summary of story requirements for ECC agents</action>

<!-- STORY COMPLEXITY CLASSIFICATION -->
<action>Count {{task_count}}, {{subtask_count}}, {{file_count}} from story</action>
<action>Classify story complexity:
  - If task_count > 3 OR subtask_count > 10 OR file_count > 4 → COMPLEX
  - Otherwise → STANDARD
</action>
<action>Set {{story_complexity}} = STANDARD | COMPLEX</action>
<action>Set {{planning_model}} = "opus" if COMPLEX, "sonnet" if STANDARD</action>
<action>Set {{tdd_model}} = "opus" if COMPLEX, "sonnet" if STANDARD</action>

<!-- ARCHITECTURE ENFORCEMENT -->
<critical>ARCHITECTURE ENFORCEMENT: Extract architectural ACs and pattern documentation</critical>
<action>Parse "Architectural Acceptance Criteria" section from story</action>
<action>Extract {{file_location_acs}} - list of required file paths</action>
<action>Extract {{pattern_acs}} - required patterns from documented architecture</action>
<action>Extract {{antipattern_acs}} - things that must NOT happen per docs</action>
<action>Parse "File Specification" table for {{expected_file_paths}}</action>
<action>Extract {{architecture_reference}} - source of architectural patterns</action>

<check if="architectural ACs found">
  <output>**Architectural Requirements Loaded**

    **Architecture Source:** {{architecture_reference}}
    **File Location ACs:** {{file_location_ac_count}}
    **Pattern ACs:** {{pattern_ac_count}}
    **Anti-Pattern ACs:** {{antipattern_ac_count}}

    Implementation will be validated against documented patterns.
  </output>
</check>

<check if="NO architectural ACs found">
  <output>**Warning: No Architectural ACs Found**

    This story was created without architectural acceptance criteria.
    **Recommended Action:** Re-create story using `ecc-create-story` workflow.
  </output>
  <ask>Continue without architectural validation? [Y/N]</ask>
</check>

<!-- IMPACT ANALYSIS PRE-FLIGHT -->
<check if="story File Specification touches files in multiple <src>/<features>/ OR shared services/components">
  <output>**Pre-flight:** This story crosses feature boundaries.
    Consider running `/ecc-impact-analysis {{story_key}}` to check for sprint conflicts.
  </output>
</check>

<!-- E2E ISOLATION GATE (A7 / L2-007) -->
<check if="story title or ACs contain: e2e, end-to-end, playwright, cypress, integration test">
  <output>**⚠️  E2E STORY DETECTED**

    Before implementation, confirm fixture isolation:
    Will this test use isolated fixtures (no shared staging state, no live API calls)?

    BoletApp evidence: 44 CI config changes for E2E infrastructure, ultimately excluded from CI.
    Cause: tests sharing state are unreliable and too expensive to maintain.</output>
  <ask>Confirm: [Y] isolated fixtures will be used / [N] explain why isolation isn't possible</ask>
</check>
