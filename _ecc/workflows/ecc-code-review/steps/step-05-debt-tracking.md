# Step 05: Deferred Item Audit + Tech Debt Story Creation

Audit ALL deferred items. Ensure every one is tracked by a story. No dark void.

<step n="4.5" goal="Audit deferred items and track every one via a story" tag="debt-tracking">
  <critical>🗂️ TECH DEBT TRACKING — Every deferred item MUST be tracked by a story</critical>
  <critical>This step is MANDATORY even when triage has zero deferred items</critical>

  <!-- Collect ALL deferred items from THREE sources -->
  <action>Build {{all_deferred_items}} from:
    1. {{td_items}} from Step 4 (triage deferrals)
    2. Story Dev Notes containing "Deferred", "out of scope", "follow-up", "future"
    3. Agent outputs flagged as "out of scope", "pre-existing", "follow-up recommended"
  </action>

  <!-- Verify existing coverage -->
  <action>For EACH item in {{all_deferred_items}}, check if already tracked:
    1. Search {sprint_artifacts}/stories/ for story files covering this item
    2. Search {sprint_status} for matching story descriptions
    3. Set {{item.tracked}} = true/false | {{item.tracking_story}} = story ID if tracked
  </action>

  <!-- Handle tracked items -->
  <check if="any items have item.tracked = true">
    <action>For each tracked item: verify coverage is real, update source story deferred reference to link to tracking story</action>
  </check>

  <!-- Handle untracked items -->
  <check if="any items have item.tracked = false">
    <action>For each UNTRACKED item:
      Option A: Add to existing ready-for-dev story if related theme exists
      Option B: Create new TD story — group related items to minimize story count
    </action>

    <action>For each new TD story, create file using template:
      ```markdown
      # Tech Debt Story TD-{{epic_id}}-{{td_number}}: {{title}}

      Status: ready-for-dev

      > **Source:** ECC Code Review ({{date}}) on story {{story_key}}
      > **Priority:** {{priority}} | **Estimated Effort:** {{effort_estimate}}

      ## Story
      As a **developer**, I want **{{what}}**, so that **{{why}}**.

      ## Acceptance Criteria
      {{acceptance_criteria}}

      ## Tasks / Subtasks
      {{tasks}}

      ## Dev Notes
      - Source story: [{{story_key}}](./{{story_filename}})
      - Review findings: {{finding_indices}}
      - Files affected: {{affected_files}}
      ```
    </action>

    <action>Write story files to: {sprint_artifacts}/stories/TD-{{epic_id}}-{{td_number}}-{{slug}}.md</action>
  </check>

  <!-- Update sprint-status.yaml + source story (MANDATORY) -->
  <action>For each NEW TD story: add to sprint-status.yaml (status: ready-for-dev, DEPENDS: {{story_key}})</action>
  <action>Update source story {{story_key}} with tracking table:
    | TD Story | Description | Priority | Action |
    | {{tracking_id}} | {{description}} | {{priority}} | CREATED / ADDED_TO_EXISTING / ALREADY_TRACKED |
  </action>

  <output>🗂️ **Deferred Item Audit Complete**

    Triage deferrals: {{triage_deferred_count}}
    Story pre-existing deferrals: {{preexisting_deferred_count}}
    Agent out-of-scope findings: {{agent_deferred_count}}

    Already tracked: {{already_tracked_count}} | Added to existing: {{added_to_existing_count}} | New TD stories: {{new_td_count}}

    Sprint status updated. All deferred items are now tracked.
  </output>
</step>
