# Code Review Patterns

> **Source:** Production retrospective analysis
> **Purpose:** MUST CHECK patterns for ECC code reviewers
> **Usage:** Loaded by `ecc-code-review` and `ecc-dev-story` workflows at Step 0

---

## MUST CHECK Patterns

### 1. Git Staging Verification

**Severity:** CRITICAL - Untracked files will NOT be committed

| Check | Command | Expected |
|-------|---------|----------|
| All CREATE files staged | `git status --porcelain \| grep "^??"` | No output |
| All MODIFY files staged | `git status --porcelain \| grep "^ M"` | No output |
| No split staging | `git status --porcelain \| grep "^MM"` | No output |
| Story file tracked | `git status --porcelain <story-file>` | `A ` or `M ` |

**Historical frequency:** High — found repeatedly across multiple stories.

**Pattern:** Foundation stories that CREATE new files need extra staging verification. Stories extending prior story files need both old and new changes verified.

---

### 2. Input Sanitization

**Severity:** HIGH - XSS prevention

| Check | Rule |
|-------|------|
| User string inputs | Must go through `<your-sanitize-fn>()` from `<your-utils-path>/sanitize` |
| Name fields | `sanitize(input.name, { maxLength: 100 })` |
| Service functions | ALL service functions accepting user strings must sanitize |

**Verification:**
```bash
# Audit sanitization usage in services
grep -r "sanitize" <src>/<features>/*/services/
grep -r "sanitize" <src>/<services>/
```

**Historical frequency:** High — found in multiple stories across service layers.

---

### 3. Database Batch Operations

**Severity:** HIGH - Silent failure on large datasets

| Check | Rule |
|-------|------|
| Batch write usage | MUST implement operation-count chunking (e.g., 500-op limit for Firestore) |
| ALL batch operations | If one function chunks, verify ALL functions in file do too |
| Batch commit | Use retry with exponential backoff |

**Pattern (Firestore example):**
```typescript
const BATCH_SIZE = 500;
let batch = writeBatch(db);
let opCount = 0;
for (const doc of docs) {
  batch.delete(doc.ref);
  if (++opCount >= BATCH_SIZE) {
    await batch.commit();
    batch = writeBatch(db);
    opCount = 0;
  }
}
if (opCount > 0) await batch.commit();
```

**Historical frequency:** High — deletion functions missing batch handling while similar functions in same file had it.

---

### 4. TOCTOU Race Conditions

**Severity:** CRITICAL - Security vulnerability

| Check | Rule |
|-------|------|
| `read()` then `delete()` | FLAG - must use atomic transaction |
| `read()` then `update()` | FLAG - must use atomic transaction |
| Authorization + mutation | MUST be in same transaction |
| Client-side auth check | Flag for TOCTOU review |

**Pattern:**
```typescript
// REQUIRED: Wrap authorization + mutation in transaction
await runTransaction(db, async (transaction) => {
  const snap = await transaction.get(ref);
  if (snap.data()?.ownerId !== requesterId) {
    throw new Error('Unauthorized');
  }
  transaction.delete(ref); // Same transaction = atomic
});
```

**Historical frequency:** High — found in deletion, update, and cloud function stories.

**Note:** Applies to ALL authorization-before-mutation functions. When fixed in one function, audit ALL similar functions in the same file.

---

### 5. Feature Module Exports

**Severity:** MEDIUM - Architecture compliance

| Check | Rule |
|-------|------|
| New types | Also re-export from feature barrel `index.ts` |
| New utilities | Verify imported in `src/` (not just tests) |
| Feature barrel exports | Feature `index.ts` must export all public API |
| Naming collisions | Check existing functions with same name before creating |

**Verification:**
```bash
# Verify type re-exports from feature modules
grep -r "TypeName" <src>/<features>/*/index.ts

# Verify utility is imported in src/ (not just tests)
grep -r "from.*newUtilFile" <src>/ --include="*.ts" --include="*.tsx"
```

**Historical frequency:** Medium — found in stories involving new types and utilities.

---

### 6. E2E Test Quality

**Severity:** HIGH - Prevents false passes and orphan data accumulation

| Check | Rule |
|-------|------|
| Pre-flight research | Component source files read before writing E2E selectors |
| Selector priority | `data-testid` > `getByRole` > scoped locator > bare `text=` |
| Cleanup pattern | ALL test data wrapped in `try/finally` cleanup blocks |
| Pre-test cleanup | Delete residual E2E data before creating new test data |
| Wait strategy | `element.waitFor()` for async ops, `waitForTimeout` only for settling (<1s) |
| Optimistic updates | Poll for resolved values, don't read DOM during PENDING state |
| Test data naming | Unique prefix + `Date.now()` suffix for cleanup targeting |
| Phantom testIds | Verify EVERY `data-testid` exists in component source before using |

**Verification:**
```bash
# Check for long fixed timeouts
grep -rE "waitForTimeout\([3-9]\d{3}" <tests>/e2e/
# Check for networkidle (Firebase WebSocket prevents resolution)
grep -r "networkidle" <tests>/e2e/
# Check for try/finally cleanup
grep -rA2 "afterEach\|afterAll\|cleanup" <tests>/e2e/
```

**Historical frequency:** High — individual stories consumed 20+ test runs due to selector guessing and orphan accumulation.

---

### 7. Database-Sourced Value Injection Prevention

**Severity:** MEDIUM - Injection via database-sourced values (e.g., CSS, HTML)

| Check | Rule |
|-------|------|
| DB-sourced values in style props | Must use `<your-validation-fn>()` |
| DB-sourced values in HTML | Must sanitize before rendering |
| Custom fallback values | Must be hardcoded strings, not user input |

**Pattern:**
```typescript
// GOOD: Validated at rendering boundary
style={{ backgroundColor: validateColor(record.color) }}

// BAD: Raw database value in CSS
style={{ backgroundColor: record.color }}
```

**Historical frequency:** Medium — found during code review across multiple components.

---

## Additional Review Checks

- **Defensive timestamps:** Use optional chaining + try/catch when converting DB timestamps
- **Real-time query limits:** All live-query listeners must have a `limit()` applied (unbounded listener cost)
- **i18n completeness:** No hardcoded user-facing strings; search translation files for existing keys first
- **Test mock consistency:** When refactoring to transactions, update test mocks accordingly
- **Integration verification:** "Props exist" does NOT mean "Props are used" — verify parent passes them

---

*Source: Production retrospective analysis + E2E lessons learned*
