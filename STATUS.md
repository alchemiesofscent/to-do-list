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

Then, that same evening, Sean sat down at the desktop and ran the search
himself. It did hold a third version of events. The Oribasius project turned
out to exist in three states that no longer agree: the shared archive's
version, the laptop's secret successor plan, and the desktop's own pile —
nearly a thousand unfiled edits plus rescue work (a translation of Paul of
Aegina's Book 7, recovered Galen data) that was never sent anywhere. Worse:
the supposedly frozen text-editing tool had been changed *that very day* by
something still running on the desktop — nobody yet knows what. And a small
project surfaced that exists on no archive at all, only on that one machine.

Both machines have now been heard; the searching phase is over. The mystery
of the frozen tool solved itself: the editor was Sean — before leaving town,
he deliberately restarted three automated jobs on the desktop (the Oribasius
translations, the Dioscorides edition, and the cookbook's extraction
pipeline) so they'd finish while he's away, back Sunday. So those three
projects are off-limits until the machines go quiet. The cleanup can now be
planned, but two questions remain Sean's alone: which future the Oribasius
project gets, and in what order the desktop's rescue work gets carried to
safety. And one worry stands: the automated jobs are writing days of work
onto that single desktop — if they don't send it to the shared archive as
they go, the cleanup's central sin is being recommitted in real time.

### What happens next

Three decisions, all Sean's, in any order: (1) rule on the Oribasius future —
keep the absorption plan or adopt the successor plan found on the laptop;
(2) find out what on the desktop keeps editing the frozen tool, and stop it;
(3) approve the order for carrying the desktop's rescue work (Paul Book 7,
Galen data) to the shared archive. Everything else in the cleanup waits on
these, and nothing gets deleted without an explicit yes.

---

## Part 2 — Machine state (for agents)

Agents: parse the YAML block; the template sections below it are normative for
REPO_STANDARD compliance. Read PLAN.md before acting. Phase 3 is gated.

```yaml
plan_version: "0.4"
plan_file: PLAN.md
phases:
  phase0_decisions: done
  phase1_github_truth: partial   # 1.1/1.2 stale-unticked but scripts exist & ran; 1.6 in progress, 1.7 open
  phase2_machine_audit:
    metopion: done               # 2026-08-05, two reports (Windows + WSL)
    theophrastos: done           # 2026-08-05, two reports (c:\dev + ~/github WSL)
    cross_reference: done        # both findings docs committed
  phase3_consolidation: open_for_rulings   # execution blocked on open_rulings below
  phase4_app_rework: not_started
  phase5_rhythm: not_started
gate:
  rule: "SATISFIED 2026-08-05 — both machine audits committed. Phase 3 rulings
         may proceed; each destructive execution still needs Sean's explicit
         in-session confirmation."
  evidence_rule: "Existing local clones are evidence: read, never modify."
frozen_repos:
  - tei-maker   # pending Sean's review of PR#13
open_rulings:
  - id: oribasius-hylike-contradiction
    question: "Hylike greenfield cutover (metopion, 2026-07-12) vs PLAN 3.1
               absorption ruling — which stands?"
    status: ready_for_ruling   # deferral condition met — all evidence in
  - id: tei-maker-active-writer
    question: "What on theophrastos committed to FROZEN tei-maker on
               2026-08-05?"
    status: resolved_2026-08-05   # Sean: his own automated /goals jobs, authorized
  - id: active-lines-hands-off
    rule: "Sean resumed three automated lines on theophrastos (2026-08-05,
           via /goals), running unattended until ~2026-08-09 (Sunday):
           (1) oribasius-app translations, (2) tei-maker wellmann_dioscorides
           edition, (3) extraction-pipeline (WS-E of cookbook). NO
           consolidation, rescue, or branch surgery on these three repos
           until the jobs finish AND their work is pushed."
    status: standing
  - id: schema-v405-conformance
    question: "Verify the three active lines' outputs conform to schema
               v4.0.5 once jobs complete."
    status: open   # check after ~2026-08-09
  - id: unpushed-automation-risk
    question: "The /goals jobs commit to local branches, several with no
               upstream (wellmann-qc +1, extraction-pipeline feat no-up,
               oribasius paul-book7 lines). Days of unattended work on one
               machine = exactly the stranded-work pattern this cleanup
               exists to kill. Do the jobs push? If not, arrange it."
    status: open   # flagged to Sean 2026-08-05
  - id: oribasius-rescue-order
    question: "Rescue order for theophrastos paul-book7 + recovery branches
               (galen-json +19 unpushed) across three diverged states"
    status: open
  - id: duplicate-clusters
    question: "cookbook/aos-cookbook/aos-cookbook-mockup; dmm/aos-dmm"
    status: open
artifacts:
  portfolio: data/portfolio.json           # GitHub-side truth, nightly
  machine_reports:
    - data/machines/metopion.json          # Windows roots: C:\Projects, C:\dev
    - data/machines/metopion-wsl.json      # WSL roots: ~/Projects et al.
    - data/machines/theophrastos.json      # c:\dev valid; WSL rows garbage (rc=128)
    - data/machines/theophrastos-wsl.json  # ~/github; wrapper repo itself unaudited (typo root)
  findings:
    - docs/FINDINGS-metopion-20260805.md
    - docs/FINDINGS-theophrastos-20260805.md
next_action:
  where: anywhere
  what: "Obtain Sean's rulings on open_rulings (Hylike first); no execution
         without them. In parallel: finish 1.6 Drive links in
         data/projects.md."
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
