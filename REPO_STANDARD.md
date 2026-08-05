# Repo Standard — alchemiesofscent

**Version:** 1.0 (2026-08-05)
Applies to every active repo. Applied during Phase 3 refactor; mandatory for new repos.

---

## Required files (every repo)

```
README.md      what & why — stable, rarely edited
STATUS.md      current state — edited every session (template below)
AGENTS.md      operating rules for agents (template below; CLAUDE.md symlinks to it)
docs/
  DECISIONS.md rulings log: dated, one line each, newest first
  ...          specs, notes (no orphan .md files in repo root)
```

Everything else (`src/`, `scripts/`, `data/`, `app/`) as the project needs — but all
prose documentation lives in `docs/`, except the three root files above.

## STATUS.md template

```markdown
# STATUS

**Updated:** YYYY-MM-DD (by: sean | agent-name)
**Canonical branch:** main

## State
One short paragraph: where the work is right now.

## Next action
ONE action. Not a list.

## Blockers
- ... (or "none")

## Active branches
| branch | purpose | created | merge-by |
|---|---|---|---|

Every branch/worktree MUST have a row here before work starts on it.
Delete the row when the branch merges or dies.
```

## AGENTS.md template

```markdown
# Agent operating rules

1. Read STATUS.md before doing anything.
2. Branches: before creating a branch or worktree, add a row to the
   Active branches table in STATUS.md (purpose + merge-by date).
   Branch naming: feature/<slug>-YYYYMMDD, fix/<slug>, agent/<slug>-YYYYMMDD.
3. No orphan worktrees: if you create one, it's registered; when done, remove it.
4. Every branch either merges or dies. Do not leave work stranded; if a task
   is abandoned, say so in STATUS.md and delete the branch.
5. Last act of EVERY session: update STATUS.md (State, Next action, branch
   table), commit, push. A session that doesn't end with a push didn't happen.
6. Decisions with consequences (schema changes, deletions, direction changes)
   get one dated line in docs/DECISIONS.md.
7. Documentation lives in docs/. Do not create .md files in repo root.
```

## Branch rules (humans and agents alike)

- One canonical branch (`main`). Every machine is a disposable clone.
- Registered at creation, merged or deleted by merge-by date.
- Unregistered branches on the dashboard = red flag, resolved at weekly review.
- `backup/*`, `recovery/*`, `archive/*` branches: not allowed. Git history is
  the backup. Tag instead if a point-in-time marker is needed.

## Repo lifecycle

- **active** — has STATUS.md, appears on dashboard, audited
- **archived** — GitHub archive flag set; README top line says what superseded it
- No third state. A repo that isn't being worked and isn't archived is a bug.
```