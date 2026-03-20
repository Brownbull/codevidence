# Step 03: Review Synthesis

Merge parallel review outputs. Resolve conflicts. Produce unified findings table.

<step n="3" goal="Synthesis of parallel review outputs" tag="synthesis">
  <critical>🗺️ REVIEW SYNTHESIS — Merge findings, resolve conflicts, add workflow analysis</critical>
  <critical>🏗️ ARCHITECTURE GATE: Architectural violations are BLOCKING</critical>

  <action>Merge findings from all spawned agents ({{review_agents}}) by severity:
    - CRITICAL: Security vulnerabilities requiring immediate fix
    - HIGH: Must fix before approval (includes architectural violations)
    - MEDIUM: Should fix, can be action items
    - LOW: Nice to have improvements
  </action>

  <action>For each merged finding, assign a CERTAINTY level:
    - HIGH certainty: Single regex/grep match, unambiguous pattern (console.log in prod path, `: any` type, missing null check on known-null field) — deterministically detectable; act immediately
    - MEDIUM certainty: Structural analysis required, depends on context (function doing 3 things, potential over-engineering, coupling concern) — review surrounding code before acting
    - LOW certainty: Heuristic or tool output (possible duplication, speculative perf concern, style opinion) — flag for human judgment; may be false positive
  </action>

  <action>Identify conflicts between agent recommendations</action>

  <action>Add cross-cutting impact analysis:
    - Check if {{files_to_review}} span multiple <src>/<features>/ directories
    - If cross-feature changes: recommend `/ecc-impact-analysis {{story_key}}`
    - Note shared services/types modified that may affect other features
  </action>

  <action>Calculate overall score as average of all active agent scores (1-10 scale)</action>

  <action>Extract architectural findings: FSD compliance, Zustand compliance, Architectural AC validation</action>

  <output>## 🗺️ ECC Adaptive Review Synthesis

    **Story:** {{story_key}} | **Date:** {date} | **Classification:** {{classification}} | **Agents:** {{review_agents}}

    ### 📊 Overall Assessment

    | Agent | Score | Status |
    |-------|-------|--------|
    | Code Quality | {{code_score}}/10 | {{code_status}} |
    {{#if security-reviewer in review_agents}}| Security | {{security_score}}/10 | {{security_status}} |{{/if}}
    {{#if architect in review_agents}}| Architecture | {{arch_score}}/10 | {{arch_status}} |{{/if}}
    {{#if tdd-guide in review_agents}}| Testing | {{test_score}}/10 | {{test_status}} |{{/if}}
    | **OVERALL** | **{{overall_score}}/10** | **{{overall_status}}** |

    {{#if architectural_violations}}
    ⚠️ **ARCHITECTURAL VIOLATIONS (blocks approval):**
    {{architectural_violations}}
    {{/if}}

    ### 📋 Numbered Findings

    Each finding: ⚡ **QUICK** (fix now) or 🔧 **COMPLEX** (needs separate work)
    Certainty: **H** = act immediately · **M** = check context · **L** = human judgment

    | # | Sev | Cert | Agent | Finding | Effort |
    |---|-----|------|-------|---------|--------|
    {{#each all_findings_numbered}}
    | {{index}} | {{severity}} | {{certainty}} | {{agent}} | {{description}} [{{file}}:{{line}}] | {{effort_class}} |
    {{/each}}

    **Recommendation:** {{final_recommendation}}
  </output>
</step>
