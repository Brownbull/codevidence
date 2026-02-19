# Getting Started: candidate-skill-scanner

**Project**: candidate-skill-scanner  
**Template**: code  
**Branch**: ralph/build-my-poc

---

## Quick Start

### 1. Setup Dependencies

```bash
# Install dependencies (adjust for your project type)
# For Python:
pip install -e .

# For Node.js:
# npm install

# For additional tools, check prd.json for requirements
```

### 2. Launch Ralph Loop (Autonomous Development)

Start a tmux session for background development:

```bash
# Start tmux session
tmux new -s candidate-skill-scanner

# Launch Claude Code
claude --dangerously-skip-permissions

# Inside Claude Code, run Ralph Loop:
bash ~/.claude/plugins/cache/claude-plugins-official/ralph-loop/2cd88e7947b7/scripts/setup-ralph-loop.sh "Read CLAUDE.md and follow the instructions" --max-iterations 30 --completion-promise "COMPLETE"
```

**Detach from tmux**: `Ctrl+B`, then `D`  
**Reattach**: `tmux attach -t candidate-skill-scanner`

### 3. Monitor Progress

From another terminal:

```bash
# Watch progress file (real-time updates)
tail -f progress.txt

# Watch git commits
watch -n 5 'git log --oneline --graph -10'
```

---

## Project Overview

See `prd.json` for:
- Project description
- User stories with acceptance criteria
- Priority and implementation order


---

## User Stories

Ralph Loop will implement stories sequentially based on priority in `prd.json`.

Check the PRD for:
- Story ID, title, and description
- Acceptance criteria
- Priority order
- Implementation notes

---

## Manual Development (Alternative)

If you prefer manual development instead of Ralph Loop:

```bash
# Read the PRD
cat prd.json


# Implement user stories in order
# Run tests after each story
# (adjust test command for your project)

# Commit after each passing story
git add .
git commit -m "feat: [STORY-ID] - [Story Title]"

# Update prd.json to mark story as complete
# Set "passes": true for the completed story
```

---

## Git Workflow

The PRD specifies development on branch:
```
ralph/build-my-poc
```

Ralph Loop will automatically create and checkout this branch.

---

## Questions or Issues?

- Review `CLAUDE.md` for Ralph agent instructions
- Check `progress.txt` for implementation learnings and patterns

---

**Created**: 2026-02-19  
**Status**: Ready for development
