# Security Rules (enforced by hooks + CI)

## Input Sanitization
- All user-facing strings through `sanitizeInput()` with maxLength
- Never trust client-side data in security-critical paths

## TOCTOU Prevention
- Auth check and mutation in the SAME transaction (Firestore: inside `runTransaction`)
- Never: check auth → gap → mutate. Always: check + mutate atomically

## Batch Operations
- Max 500 operations per Firestore batch
- Chunk arrays before batch writes: `for (let i = 0; i < items.length; i += 500)`

## Secrets
- Pre-commit hook (gitleaks) blocks secrets — Tier 1
- CI runs gitleaks on full history as backup
- Never commit `.env`, credentials, or API keys
- Use `firebase.json` for public config, env vars for secrets

## Defense Layers
```
Pre-commit (gitleaks) → CI (gitleaks + tests) → Architecture (Firestore rules) → Runtime (auth checks)
```
