# Step 02: Pre-Classify + Parallel Review Agent Spawn

Run deterministic pre-classifiers first, then spawn agents with pre-labelled input.
Tools detect; agents judge. Agents receive structured findings, not raw code to scan.

<critical>ECC ORCHESTRATOR: Spawning ONLY agents from {{review_agents}} ({{classification}} classification)</critical>
<critical>CRITICAL: Send ALL selected Task calls in a SINGLE message for true parallelism!</critical>

## 2a: Shell Pre-Classification (HIGH certainty findings)

<action>Run deterministic checks on {{files_to_review}} — collect output as {{preclassified_findings}}:

```bash
# 1. AI slop patterns (HIGH certainty)
grep -rn "console\.\(log\|debug\|warn\)" src/ --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "__tests__\|\.test\.\|\.spec\." | head -20

# 2. TypeScript anti-patterns (HIGH certainty)
grep -rn ": any\b" src/ --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "\.test\." | head -20

# 3. TODO/FIXME left in code (HIGH certainty)
grep -rn "// TODO\|// FIXME\|// HACK\|// TEMP" src/ \
  --include="*.ts" --include="*.tsx" 2>/dev/null | head -10

# 4. TypeScript errors (HIGH certainty)
npx tsc --noEmit 2>&1 | head -30 || true

# 5. Circular dependencies (MEDIUM certainty — requires judgment)
npx madge --circular src/ 2>/dev/null | head -20 || true
```

Format results as:
| Type | Certainty | file:line | Finding |
Items 1-3: HIGH certainty. Item 4: HIGH certainty. Item 5: MEDIUM certainty.
Store as {{preclassified_findings}}.
</action>

<action>Set {{security_reviewer_model}}:
  - If {{classification}} == "COMPLEX" → "opus"
  - Otherwise → "sonnet"
</action>

<agent-directives>
  IMPORTANT — include in EVERY agent prompt:
  1. File contents provided below. Do NOT use Read/Grep/Glob to read review files.
  2. Pre-classified HIGH certainty findings are listed below — DO NOT re-detect these.
     Focus your review on MEDIUM and LOW certainty items that require judgment.
  3. Return ONLY: numbered findings table (severity | certainty | description | file:line),
     recommendation (APPROVE / CHANGES REQUESTED / BLOCKED), score (X/10). Max ~50 lines. No code snippets.
</agent-directives>

## 2b: Spawn Agents

<output>**Spawning {{classification}} Review Team: {{review_agents}}**</output>

<ecc-parallel-spawn agents="{{review_agents}}">
  <!-- Task 1: Code Reviewer (ALWAYS included) -->
  <task-call id="code_review" if="code-reviewer in {{review_agents}}">
    subagent_type: "everything-claude-code:code-reviewer"
    model: "sonnet"
    max_turns: 5
    description: "Code quality review for {{story_key}}"
    prompt: |
      ## Code Review Task — Story: {{story_key}}
      **IMPORTANT: File contents provided below. Do NOT read files yourself.**

      **Pre-classified HIGH certainty findings (do NOT re-detect these):**
      {{preclassified_findings}}

      **Acceptance Criteria:** {{acceptance_criteria}}
      **Project Patterns:** {{project_patterns}}

      **Review focus:** MEDIUM/LOW certainty items — quality, error handling, performance,
      naming, DRY, complexity, coupling. Skip items already listed in pre-classified findings.

      **Output (max 50 lines):**
      | # | Sev | Cert | Finding | file:line |
      Recommendation: APPROVE / CHANGES REQUESTED
      Score: X/10

      **FILE CONTENTS:** {{file_contents_manifest}}
  </task-call>

  <!-- Task 2: Security Reviewer (STANDARD + COMPLEX only) -->
  <task-call id="security_review" if="security-reviewer in {{review_agents}}">
    subagent_type: "everything-claude-code:security-reviewer"
    model: "{{security_reviewer_model}}"
    max_turns: 5
    description: "Security review for {{story_key}}"
    prompt: |
      ## Security Review Task — Story: {{story_key}}
      **IMPORTANT: File contents provided below. Do NOT read files yourself.**

      **Check:** OWASP Top 10 (injection, XSS, auth, access control, secrets, data exposure, CSRF, input validation)

      **Output (max 50 lines):**
      | # | Sev | Vulnerability | file:line | Remediation |
      Secrets detected: Y/N
      Recommendation: APPROVE / BLOCK / CHANGES REQUESTED
      Score: X/10

      **FILE CONTENTS:** {{file_contents_manifest}}
  </task-call>

  <!-- Task 3: Architect (COMPLEX only) -->
  <task-call id="architecture_review" if="architect in {{review_agents}}">
    subagent_type: "everything-claude-code:architect"
    model: "opus"
    max_turns: 5
    description: "Architecture review for {{story_key}}"
    prompt: |
      ## Architecture Review Task — Story: {{story_key}}
      **IMPORTANT: File contents provided below. Do NOT read files yourself.**

      **Architecture Source:** {{architecture_reference}}
      **Architectural ACs:** {{architectural_acs}}
      **File Specification:** {{file_specification_table}}
      **Patterns:** {{project_patterns}}

      **Validate:** file locations, pattern compliance, anti-patterns, architectural ACs, separation of concerns, dependency management

      **Output (max 50 lines):**
      | AC ID | Status | Notes |
      File location compliance: X/Y | Pattern violations: [list] | Alignment: ALIGNED / DRIFT
      Recommendation: APPROVE / CHANGES REQUESTED / BLOCKED
      Score: X/10

      **FILE CONTENTS:** {{file_contents_manifest}}
  </task-call>

  <!-- Task 4: TDD Guide (SIMPLE + COMPLEX only) -->
  <task-call id="test_review" if="tdd-guide in {{review_agents}}">
    subagent_type: "everything-claude-code:tdd-guide"
    model: "sonnet"
    max_turns: 5
    description: "Test review for {{story_key}}"
    prompt: |
      ## Test Coverage Review Task — Story: {{story_key}}
      **IMPORTANT: File contents provided below. Do NOT read files yourself.**

      **Acceptance Criteria:** {{acceptance_criteria}}
      **Testing Patterns:** {{project_testing_patterns}}

      **Review:** AC coverage, edge cases, error scenarios, assertion quality, mock appropriateness, naming

      **Quality Score (each 0-100):** Determinism, Isolation, Maintainability, Coverage, Performance. 70+ = GOOD.

      **Output (max 50 lines):**
      Coverage gaps: [AC] missing test for [scenario] [file]
      | Dimension | Score | Notes |
      Overall: X/100 — GOOD / NEEDS IMPROVEMENT
      Recommendation: APPROVE / CHANGES REQUESTED
      Score: X/10

      **FILE CONTENTS:** {{file_contents_manifest}}
  </task-call>
</ecc-parallel-spawn>

<action>Wait for all selected agents to complete</action>
<action>Collect outputs — extract: finding #, severity, agent, one-line description, file:line</action>
