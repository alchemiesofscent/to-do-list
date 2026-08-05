# STATUS

**Updated:** 2026-08-05 (by: claude-cowork)
**Canonical branch:** main

## Previously on alchemiesofscent…

Sean, a scholar of ancient perfume, has years of research projects scattered
across twenty-five online archives and two computers — a laptop and a desktop.
Over time, he and his AI assistants made copies of copies, left work half-filed,
and in places kept the only version of something on a single machine, where a
spilled coffee could end it. So he started a cleanup with one rule: everything
important must live in the shared online archive, where every machine can see
it, and this folder is the cleanup's logbook.

Step one: list what the online archive holds. Done — and it showed the mess.
Step two: search each computer and compare. The laptop has now been searched,
and it was hiding things. The biggest surprise: inside one project sits a
detailed plan, written by an AI assistant in July and never shared online, to
freeze that project and start a successor called "hylike" — the exact opposite
of the current cleanup plan, which says to fold two other projects *into* it.
Sean has deferred that decision. The laptop also holds hundreds of unfiled
edits to a project that's supposed to be untouched, several projects with no
online backup at all, and a to-do app whose latest state was never written
down anywhere — it exists only inside a web browser.

The desktop hasn't been searched yet. It may hold a third version of events,
so no cleanup — no merging, no deleting — happens until it has been heard.

## State

PLAN v0.4. Phases 0–2 done except 2.3 (theophrastos audit — blocked, at that
machine). Phase 3 (consolidation) hard-gated on 2.3. Machine reports committed:
`data/machines/metopion{,-wsl}.json`; provisional cross-reference in
`docs/FINDINGS-metopion-20260805.md`.

## Next action

At theophrastos: `git pull` this repo, then
`python scripts/repo_audit.py --machine theophrastos --root <dirs> --fetch`,
commit `data/machines/theophrastos.json`, push. (~5 min.)

## Blockers

- 2.3 until Sean is at theophrastos; all of Phase 3 gated on it.

## Active branches

| branch | purpose | created | merge-by |
|---|---|---|---|

Every branch/worktree MUST have a row here before work starts on it.
Delete the row when the branch merges or dies.
