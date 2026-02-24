# Deploy Story Validation Checklist

## Pre-Deployment Checks

### Story Readiness
- [ ] Story status is "done"
- [ ] All acceptance criteria marked as implemented
- [ ] Code review has been approved
- [ ] All tests passing
- [ ] No uncommitted changes in working directory

### Git State
- [ ] On a feature/fix/chore branch (NOT on develop or main)
- [ ] Origin is reachable
- [ ] `gh` CLI authenticated and available

### E2E Coverage
- [ ] E2E testing completed (`/ecc-e2e`) or explicitly skipped (no UI changes)
- [ ] If E2E ran: all specs passing against staging
- [ ] If E2E skipped: documented in story Dev Notes with reason

### Pattern Validation
- [ ] Project patterns loaded (code-review-patterns.md)
- [ ] Affected features identified for this story
- [ ] Architectural alignment verified
- [ ] No critical conflicts detected

## Deployment Pipeline Checks

### Develop Branch (Step 1/2)
- [ ] Feature branch pushed to origin
- [ ] PR created to develop with `gh pr create --base develop`
- [ ] CI checks passing (`gh pr checks --watch`)
- [ ] PR squash-merged to develop (`gh pr merge --squash --delete-branch`)
- [ ] Feature branch auto-deleted

### Production Branch (Step 2/2)
- [ ] Checked out develop and pulled latest
- [ ] PR created from develop to main with `gh pr create --base main`
- [ ] CI checks passing (`gh pr checks --watch`)
- [ ] PR merge-committed to main (`gh pr merge --merge`)
- [ ] Auto-deploy triggered on merge to main
- [ ] Production accessible at https://<your-project-id>.web.app

## Backend Deployment (if applicable)

Stories that modify backend/infrastructure files (e.g., database rules, serverless function source) require manual deployment after merge to main. Frontend auto-deploys; backend infrastructure does NOT.

Reference: your project deployment docs

### Detection
- [ ] Checked for backend file changes: `git diff origin/main~1..origin/main --name-only | grep -E '<your-backend-file-patterns>'`
- [ ] If no backend changes: skip this section

### Production Deploy
- [ ] Cloud Functions built: `cd functions && npm run build` (if functions changed)
- [ ] Deployed to production: `<your-deploy-command> --targets <targets> --project <your-project-id>`
- [ ] Verified in your deployment console (function status, rules, indexes)

### Staging Sync
- [ ] Backend config synced to staging: `<your-deploy-command> --targets <targets> --project <your-staging-project-id>`

### Manifest Update
- [ ] Updated deployment manifest / changelog with today's date

## Post-Deployment Checks

### Branch Cleanup
- [ ] `git fetch --prune` executed
- [ ] Local develop branch synced with origin

### Status Sync
- [ ] Sprint status file updated
- [ ] Story marked as "deployed"

### Verification
- [ ] Production URL responds correctly
- [ ] No errors in deployment console
- [ ] User can access deployed feature

## Rollback Considerations

If deployment fails at any stage:
1. **PR to develop fails CI:** Fix on feature branch and push again - PR re-runs CI automatically
2. **PR to main fails CI:** Fix on develop branch, push, PR re-runs CI automatically
3. **Production broken after merge:** Revert on main with `git revert`

### Emergency Rollback Commands
```bash
# Revert production to previous commit (safe, creates new commit)
git checkout main
git pull origin main
git revert HEAD
git push origin main
# This triggers a new auto-deploy with the revert
```

### Hotfix Flow
```
branch from main -> PR to main -> merge main back into develop
```

## Deployment Frequency Guidelines

| Scenario | Recommendation |
|----------|----------------|
| Single story completed | Deploy immediately |
| Multiple stories ready | Deploy individually or batch |
| End of sprint | Ensure all done stories deployed |
| Hotfix needed | Branch from main, PR to main, sync back to develop |

## Critical Rules

- **NEVER** push directly to develop or main
- **NEVER** use `git merge` to merge into protected branches
- **ALWAYS** use `gh pr create` + `gh pr merge` for all branch promotions
- **ALWAYS** wait for CI to pass before merging
- **NEVER** bypass CI failures - fix the issue first

## Validation Notes

Pre-deployment validation checks:
1. **Pattern validation:** Checking against documented project patterns
2. **Impact analysis:** Identifying affected user journeys
3. **Architectural alignment:** Verifying patterns match documented architecture
