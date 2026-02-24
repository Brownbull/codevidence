# Workflow Rules

## Framework Division
- **BMAD** handles Phases 1-3 (planning, design, architecture)
- **ECC** handles Phase 4 (development, testing, review, deployment)
- Do not mix: use BMAD agents for planning, ECC agents for execution

## Story Lifecycle
```
create → ready → dev → review → close → done
```

## Story Sizing Limits
- Max 8 tasks per story
- Max 40 subtasks per story
- Max 12 files touched per story
- If exceeded: split the story before continuing

## Agent Model Selection
- **Sonnet**: default for all tasks
- **Opus**: only for complex architecture decisions and planning
- **Haiku**: deprecated — do not use

## Workflow Completion Checklist (after every workflow)
- [ ] Tests pass (test:quick minimum)
- [ ] TypeScript compiles (tsc --noEmit)
- [ ] Sprint status updated (if story-based work)
- [ ] Branch state clean (no uncommitted changes)
- [ ] Cost logged (automatic via Stop hook)

## Session Budget
- Aim for 90 minutes or 2 compactions — whichever comes first
- At compaction 3: save handoff note, consider restarting (hook warns)
- At compaction 5: stop. Start fresh session (hook blocks).
