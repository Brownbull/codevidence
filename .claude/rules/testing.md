# Testing Rules (enforced by hooks + CI)

## Test Tiers
- `pnpm test:unit` (~35s): unit tests only. Run after every task.
- `pnpm test:unit` (~2min): unit tests. Run before commit.
- `pnpm test:unit && pnpm test:e2e` (~5min): full suite. Run before PR.

## Coverage Thresholds (enforced by CI)
- Lines: 45%, Branches: 30%, Functions: 25%, Statements: 40%

## File Size Guidelines (checked during code review; hook blocks at 800 lines)
- Unit tests: max 300 lines
- Integration tests: max 500 lines
- E2E tests: max 400 lines

## E2E Rules
- Run serially, never parallel (shared staging data)
- Use `dev:staging` environment for E2E
- Selector priority: data-testid > getByRole > scoped text > bare text
- No `networkidle` (Firebase WebSocket keeps connection alive)
- No `waitForTimeout` > 3000ms (use `waitFor` instead)
- Always clean up test data in afterAll/afterEach

## Test Patterns
- Prefer `toHaveBeenCalledWith` over bare `toHaveBeenCalled`
- Reset mocks in `beforeEach` (vi.resetAllMocks)
- One assertion focus per test
- Fix test breakages immediately per file — don't batch
