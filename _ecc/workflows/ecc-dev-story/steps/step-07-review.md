# Step 07: Self-Review

Quick code-reviewer self-review before marking story review-ready.
Full review (security, architecture, TDD) runs separately via /ecc-code-review.

<critical>SELF-REVIEW: code-reviewer only. Full review runs via /ecc-code-review.</critical>

<!-- Read changed files once — avoid agent reading independently -->
<action>Read ALL files in {{progress_tracker}}.files_changed using parallel Read calls</action>
<action>Store as {{file_contents_manifest}} for the review agent</action>

<ecc-spawn agent="code-reviewer">
  <task-call>
    subagent_type: "everything-claude-code:code-reviewer"
    model: "sonnet"
    max_turns: 7
    description: "Self-review for {{story_key}}"
    prompt: |
      ## Quick Self-Review
      **Story:** {{story_key}}
      **IMPORTANT: File contents provided below. Do NOT read files yourself.**

      **Project Patterns:** {{project_patterns}}

      **Review focus:** quality, error handling, performance, naming, DRY, obvious security issues

      **Output (max 50 lines):**
      | # | Sev | Finding | file:line |
      Recommendation: APPROVE / CHANGES REQUESTED
      Score: X/10

      ---
      **FILE CONTENTS:**
      {{file_contents_manifest}}
  </task-call>
</ecc-spawn>

<action>Collect code review output</action>

<check if="HIGH severity issues found">
  <action>Fix HIGH severity issues before proceeding</action>
  <action>Re-run affected tests</action>
</check>

<!-- Agent config integrity gate — catches misconfigured hooks/workflows before story closes -->
<action>Run agnix if installed:
```bash
if command -v agnix >/dev/null 2>&1; then
  agnix . 2>&1 | head -30
else
  echo "[INFO] agnix not installed — skipping config lint (install: npm install -g agnix)"
fi
```
If agnix reports violations in `_ecc/hooks/` or `_ecc/workflows/`: fix before proceeding.
If agnix not installed: note in output, do not block.
</action>
