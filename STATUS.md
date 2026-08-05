# STATUS

**Updated:** 2026-08-05 (by: claude-cowork)
**Canonical branch:** main

---

## Part 1 — The story so far (for Sean)

### Previously on alchemiesofscent…

Sean, a scholar of ancient perfume, has years of research projects scattered
across twenty-five online archives and two computers — a laptop and a desktop.
Over time, he and his AI assistants made copies of copies, left work half-filed,
and in places kept the only version of something on a single machine, where a
spilled coffee could end it. So he started a cleanup with one rule: everything
important must live in the shared online archive, where every machine can see
it, and this folder is the cleanup's logbook.

Step one: list what the online archive holds. Done. Of twenty-five projects,
only about five showed recent life; the rest were husks, half-finished starts,
or duplicates. The same project often existed under two or three names — a
cookbook of ancient recipes in three variants, a data model in two — because
when a project stalled, the habit was to start a fresh copy rather than repair
the old one. And the two busiest projects (a tool for editing ancient texts,
and a database of the physician Oribasius) each had a large body of new work
sitting in side-drafts that were never folded back into the official version.
The cause, in one sentence: many working sessions — human and AI alike — ended
without anyone filing what had been done, and each rescue attempt made another
copy instead of cleaning up the last one.

Step two: search each computer and compare. The laptop has now been searched,
and it was hiding things. The biggest surprise: inside the Oribasius project
sits a detailed plan, written by an AI assistant in July and never shared
online, to freeze that project and start a successor called "hylike" — the
exact opposite of the current cleanup plan, which says to fold two other
projects *into* it. Sean has deferred that decision. The laptop also holds
hundreds of unfiled edits to the text-editing tool (which is supposed to be
frozen), a ten-thousand-file salvage copy of it with no backup anywhere,
several smaller projects with no online backup at all, and a to-do app whose
latest state was never written down anywhere — it exists only inside a web
browser, last touched in January.

The desktop hasn't been searched yet. It may hold a third version of events,
so no cleanup — no merging, no deleting — happens until it has been heard.

### What happens next

Next time you're at the desktop: open a terminal in this project's folder,
pull the latest version, and run the search command (it's in Part 2, ready to
paste). Five minutes. That unlocks everything else.

---

## Part 2 — Machine state (for agents)

Agents: parse the YAML block; the template sections below it are normative for
REPO_STANDARD compliance. Read PLAN.md before acting. Phase 3 is gated.

```yaml
plan_version: "0.4"
plan_file: PLAN.md
phases:
  phase0_decisions: done
  phase1_github_truth: partial   # 1.1/1.2 stale-unticked but scripts exist & ran; 1.6, 1.7 open
  phase2_machine_audit:
    metopion: done               # 2026-08-05, two reports (Windows + WSL)
    theophrastos: blocked        # until Sean is at that machine
    cross_reference: provisional # metopion only
  phase3_consolidation: GATED
  phase4_app_rework: not_started
  phase5_rhythm: not_started
gate:
  rule: "No merge, branch deletion, archive, or worktree removal in ANY repo
         until data/machines/theophrastos.json is committed."
  evidence_rule: "Existing local clones are evidence: read, never modify."
frozen_repos:
  - tei-maker   # pending Sean's review of PR#13
open_rulings:
  - id: oribasius-hylike-contradiction
    question: "Hylike greenfield cutover (local, 2026-07-12) vs PLAN 3.1
               absorption ruling — which stands?"
    status: deferred_until_theophrastos   # ruled 2026-08-05
  - id: duplicate-clusters
    question: "cookbook/aos-cookbook/aos-cookbook-mockup; dmm/aos-dmm"
    status: open
artifacts:
  portfolio: data/portfolio.json           # GitHub-side truth, nightly
  machine_reports:
    - data/machines/metopion.json          # Windows roots: C:\Projects, C:\dev
    - data/machines/metopion-wsl.json      # WSL roots: ~/Projects et al.
  findings: docs/FINDINGS-metopion-20260805.md   # ALL PROVISIONAL
next_action:
  where: theophrastos
  commands:
    - git pull
    - python scripts/repo_audit.py --machine theophrastos --root <dirs> --fetch
    - git add data/machines/theophrastos.json && git commit -m "audit: theophrastos" && git push
  note: "Ask Sean for scan roots first; pass each subdirectory as its own root
         if a root directory is itself a git repo (script does not descend
         into nested repos)."
known_hazards:
  - "Windows git cannot read \\\\wsl.localhost repos (rc=128); audit WSL side
     from inside WSL."
  - "Orphaned git-remote-https children can deadlock repo_audit.py's fetch
     timeout on Windows; kill stale git processes if the log stalls."
  - "Scholar's Opus localStorage (browser, Jan 2026) is ahead of committed
     data/projects.md; export before Phase 4.1 strips it."
```

## State

Phase 2 metopion audit committed (two reports). Provisional cross-reference in
findings doc. Phase 3 hard-gated on theophrastos audit. Hylike-vs-absorption
ruling deferred 2026-08-05.

## Next action

At theophrastos: run the three commands in the YAML `next_action` block
(PLAN 2.3).

## Blockers

- 2.3 until Sean is at theophrastos; all of Phase 3 gated on it.

## Active branches

| branch | purpose | created | merge-by |
|---|---|---|---|

Every branch/worktree MUST have a row here before work starts on it.
Delete the row when the branch merges or dies.
