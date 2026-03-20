# Step 03: Multi-User Detection and Strategy

Auto-detect multi-user need and recommend approach.

<step n="3" goal="Detect multi-user need and plan approach" tag="multi-user">
  <action>Detect multi-user indicators:
    - Story mentions: sharing, invitation, join, group membership, cross-user
    - Changed files include: <service-a>, <service-b> with shared-state operations
    - ACs mention multiple user perspectives ("owner sees...", "member sees...")
    - Existing related tests use multi-user pattern (browser contexts)
  </action>

  <check if="multi-user indicators found">
    <action>Determine pattern:
      - CONCURRENT: users must see each other's actions in same session
        → Separate browser contexts (browser.newContext()), both open simultaneously
      - SEQUENTIAL: users act independently in sequence
        → Single page, login/logout between users via TestUserMenu
    </action>

    <action>Determine cleanup order:
      - CONCURRENT: bidirectional (member leaves → owner deletes → close contexts)
      - SEQUENTIAL: single-direction (last user cleans up)
    </action>

    <action>Check cooldown resets:
      - If test involves sharing toggle → import resetAllCooldowns from helpers/cooldown-reset.ts
      - Call in test setup BEFORE toggle operations
    </action>

    <ask>**Multi-User Analysis**

      Pattern: {{multi_user_pattern}} ({{pattern_reason}})
      Users: {{user_a}} ({{role_a}}), {{user_b}} ({{role_b}})
      Cleanup: {{cleanup_order}}
      Cooldown resets: {{cooldown_needed}}

      Proceed? [Y / N / Adjust]</ask>
  </check>

  <check if="no multi-user indicators">
    <action>Set {{multi_user_strategy}} = "SINGLE-USER — standard staging test pattern"</action>
    <output>✅ Single-user test — standard staging pattern.</output>
  </check>
</step>
