# STATUS

**Updated:** 2026-08-05 (by: claude-cowork)
**Canonical branch:** main

## State

Phase 2 metopion audit complete and committed: `data/machines/metopion.json`
(Windows) + `data/machines/metopion-wsl.json` (WSL). Provisional
cross-reference in `docs/FINDINGS-metopion-20260805.md`. Phase 3 is hard-gated
until the theophrastos audit (2.3) is committed. An open contradiction between
the oribasius-app "Hylike cutover" program and the Phase 3 absorption ruling
awaits Sean's ruling (PLAN.md Phase 3 header, findings §5).

## Next action

Run `scripts/repo_audit.py --machine theophrastos --fetch` on theophrastos and
commit the JSON (PLAN 2.3).

## Blockers

- 2.3 blocked until Sean is at theophrastos; all of Phase 3 gated on it.

## Active branches

| branch | purpose | created | merge-by |
|---|---|---|---|

Every branch/worktree MUST have a row here before work starts on it.
Delete the row when the branch merges or dies.
