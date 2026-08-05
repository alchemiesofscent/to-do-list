# STATUS

**Updated:** 2026-08-05 (by: claude-cowork)
**Canonical branch:** main

## Previously on alchemiesofscent…

Twenty-five repos, two machines, and years of agent-assisted work had quietly
sprawled: duplicate clones, unpushed branches, work that existed in exactly one
place. The fix: make git the database — portfolio, repo health, and per-machine
audits all live as committed files here, and a dashboard reads them. The GitHub
inventory came first and named the suspects (tei-maker and oribasius-app hiding
the most divergence). Then the metopion audit confirmed it: an entire unpushed
"Hylike cutover" program inside oribasius-app that contradicts the standing
plan to absorb aetius/ancient-simples into it — ruling deferred; 551 dirty
files on frozen tei-maker's Windows clone; four repos with no remote at all;
and the Scholar's Opus browser state eight days ahead of anything committed,
frozen since January. Nothing merges until the desktop machine, theophrastos,
tells its side of the story.

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
