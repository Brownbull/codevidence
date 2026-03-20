# Step 08: Story Completion + Cost Tracking

Final checklist: git staging verification, sprint-status update, commit, cost report.

## Phase A: Git Staging Verification (MUST CHECK #1)

<critical>CODE REVIEW PATTERN #1: Untracked files WILL NOT be committed — verify before commit</critical>

<action>Run `git status --porcelain` → capture output as {{git_status}}</action>

<check if="any NEW files created during this story show as '??' (untracked)">
  <output>**GIT STAGING WARNING**

    Untracked story files detected — these will NOT be in the commit:
    {{untracked_files}}
  </output>
  <action>Stage all created files: `git add {{created_files_list}}`</action>
  <action>Re-run `git status --porcelain` and confirm no story files remain as `??`</action>
</check>

<action>Run `git status --porcelain | grep "^??"` — confirm no story files are untracked</action>
<output>Git staging verified — all story files are tracked.</output>

## Phase B: Sprint Status Update

<action>Update story status: in-progress → review in {{sprint_status}}</action>
<output>Story {{story_key}} marked **review** in sprint-status.yaml</output>

## Phase C: Commit

<action>Run `git diff --cached --stat` → confirm staged files match story scope</action>

<check if="staged files look correct">
  <action>Run git commit:
    ```bash
    git commit -m "$(cat <<'EOF'
    {{story_key}}: {{one_line_summary}}

    {{what_changed_and_why}}

    Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
    EOF
    )"
    ```
  </action>
  <output>Committed: {{commit_hash}} — {{commit_message_first_line}}</output>
</check>

## Phase D: Cost Tracking

<action>Run: `workflow-cost --csv --stats --workflow "ecc-dev-story" --story "{{story_key}}"` → {{cost_output}}</action>

<output>**Workflow Cost Logged**

{{cost_output}}
</output>

## Phase E: Workflow Complete

<output>**ECC Dev Story Complete — {{story_key}} → review**

  Commit: {{commit_hash}}
  Files changed: {{progress_tracker.files_changed | join(", ")}}
  Tasks: {{completed_task_count}} | Coverage: {{coverage_percentage}}%
  Self-review: {{review_score}}/10

  **Next step:** Run `/ecc-code-review {{story_key}}` for formal review.
</output>
