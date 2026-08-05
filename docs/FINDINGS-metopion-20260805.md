# Machine audit findings — metopion — 2026-08-05

**Status: ALL FINDINGS PROVISIONAL.** theophrastos holds a third copy of several
repos and has not been audited (PLAN 2.3 blocked). Nothing here authorizes a
merge, deletion, or archive. Hard gate: no consolidation until both machine
audits are committed.

**Method:** `scripts/repo_audit.py --fetch` run twice on metopion:
Windows side (roots `C:\Projects`, `C:\dev`) → `data/machines/metopion.json`;
WSL Ubuntu side (roots `~/Projects` + each subdirectory, `~/sweep2`,
`~/sweeprun`, `~/Preservation`) → `data/machines/metopion-wsl.json`.
Cross-referenced against `data/portfolio.json` (generated 2026-08-05T11:20Z).
Browser localStorage of Scholar's Opus read from the deployed app origin.

## 1. Headline risks (work that exists only on this machine)

1. **oribasius-app (WSL)** — HEAD is `refactor/project-layout`, tip 2026-08-04,
   **no upstream, not on GitHub**. Local `main` is **+326/−98 vs origin/main**.
   A second worktree `~/Projects/oribasius-viewer` sits on
   `consolidation-20260729`. See §5 — this is part of an undocumented-on-GitHub
   "Hylike greenfield cutover" program that contradicts PLAN Phase 3 rulings.
2. **tei-maker (Windows clone)** — `main` has **no upstream configured**,
   tip 2026-08-04 (GitHub main last pushed 2026-08-03), **dirty: 551 files**.
   Divergence vs origin unknown (fetch hung; see §7). Repo is FROZEN pending
   PR#13 review — nothing was touched, but this clone likely holds unpushed
   main-line work.
3. **tei-maker (WSL clone)** — 6 local-only branches (anchor-step5 ×3,
   beck-publication-qc-20260713, docs/repository-refresh-20260716,
   docs/wellmann-qc-token-diagnosis), 2 stashes, dirty:5, 3 worktrees
   (`tei-maker-anchor-step5`, `tei-maker-beck-publication`, + one registered
   under `.git/worktrees`). None of these branches exist on GitHub.
4. **tei-maker.mixed-20260622-114326 (WSL)** — NO REMOTE, **dirty: 10,576
   files**. Presumably a salvage copy from 2026-06-22; whether it holds
   anything unique is unverifiable until a tei-maker ruling. Largest single
   blob of unbacked-up state on the machine.
5. **No-remote repos (WSL):** `~/Projects` itself (a git repo wrapping all
   projects, head detached `?`), `aos-corpus-cli`, `egg-ink-phylogeny`,
   `periplus-material-map`. None have any GitHub counterpart. "Nothing exists
   only locally" is currently violated by all four.
6. **Unpushed commits on tracked branches:** `dmm` main +6 (also dirty:5);
   `simples` main +1 (dirty:1); `kyphi-repo` seed/rufus +2 plus local-only
   `backup/*`, `wip/backup-before-merge`, `ci/commit-back` branches
   (kyphi-repo is slated for absorption into perfume-tables — these must be
   rescued or ruled dead first).
7. **Non-repo project dirs on Windows:** `C:\Projects\eggphy`, `index`,
   `mum-report`, `phylogeny` are not git repos (loose files, zero version
   control). `C:\dev\perfume-tables` is dirty:15.

## 2. Dirty-tree inventory (uncommitted changes)

| Clone | Dirty files | Stashes | Notes |
|---|---|---|---|
| WSL tei-maker.mixed-20260622 | 10,576 | 0 | no remote |
| Win C:\Projects\tei-maker | 551 | 0 | FROZEN repo; main no upstream |
| Win C:\Projects\aos-dmm | 398 | 0 | GitHub copy stale since 2025-08-16 |
| WSL ~/Projects/index | 25 | 1 | maps to index-locorum |
| WSL eggphy | 18 | 0 | |
| WSL social | 16 | 0 | maps to social-carousel-bank |
| Win C:\dev\perfume-tables | 15 | 0 | second clone of perfume-tables |
| WSL cookbook-archive | 14 | 0 | detached HEAD |
| WSL cookbook | 13 | 0 | detached HEAD |
| WSL flash | 11 | 0 | |
| WSL dmm | 5 | 0 | + main +6 unpushed |
| WSL tei-maker | 5 | 2 | + 6 local-only branches |
| others | ≤3 each | — | see machine JSONs |

## 3. GitHub ↔ metopion drift

- **On GitHub, absent from metopion entirely:** `dioscorides-viewer` and
  `extraction-pipeline` (private), plus archived `cookbook-mockup` (expected).
  `periplus-tour` (private) is covered: local `periplus-tour-mvp` carries two
  remotes (`map.git` + `periplus-tour.git`) — one clone serving two GitHub
  repos, itself a consolidation question.
- **Stale local copies of stale GitHub repos:** recipe-aligner-1 (−20),
  recipe-aligner-bak (−30), aos-cookbook (−1) — behind origin, no local work.
  recipe-aligner-1 / recipe-aligner-bak are duplicate clones of
  `recipe-aligner`.
- **External corpora clones (not AoS):** `~/Projects/corpora/{digiliblt,
  first1kgreek, idp}` — third-party data mirrors, exclude from portfolio logic.
- **Tool-internal git dirs** (`~/.codex/*`) ignored.

## 4. Scholar's Opus: localStorage vs committed data/projects.md

- Committed `data/projects.md`: last commit **2026-01-20** (`6355696`),
  53 entries.
- Browser (`scholar_opus_db` at the GitHub Pages origin): **55 tasks**,
  imported from projects.md revision `f646d5cb` on **2026-01-20**, then edited
  in-browser through **2026-01-28** (status changes; latest touches:
  "Ancient Volatile Fractioning Techniques", "A New Method for Identifying
  Ancient Stacte", 2026-01-28).
- Browser-only tasks with no projects.md source include: **IOCB TECH Report,
  GACR financial report, "Eggs like peaches" (PGM VII note)** and ~10 more.
- Also present: namespaced todo/pmo/my-day stores under user id
  `5035d9df-5d5e-44cc-a038-31e65bbd3daa`, a Supabase auth token, and unrelated
  AOS_* datasets sharing the origin.
- **Conclusion (provisional):** localStorage is ~8 days ahead of git and git is
  ~6 months ahead of nothing — neither side has synced since January. Phase 4.1
  export-before-strip is mandatory or the January browser edits are lost.

## 5. oribasius-app recon (read-only) — contradicts PLAN Phase 3

Local docs (`docs/GREENFIELD_CUTOVER.md`, `docs/PRESERVATION_STATUS.md`,
`CONTINUATION_PROMPT.md`, `HANDOFF_LOCAL_AGENT_V2.md`) describe a **"Hylike
Greenfield Cutover"** authorized 2026-07-12: oribasius-app is designated a
frozen **"bridge repository"** kept as forensic evidence; a successor repo
**`hylike`** (does not exist yet anywhere) becomes canonical; production
translation and DB writes are "mechanically frozen"; M1 forensic preservation
in progress; git bundle pending. Terminal bridge commit
`75f1109f9` = current local main tip.

Branch topology: `refactor/project-layout` (local-only, main+3) and
`consolidation-20260729` (pushed) have **diverged by 329 vs 218 commits** —
two competing consolidation lines. `recovery/` exists only as GitHub branches
(aetius-export, galen-json, paul-book7), not as a local directory.
`docs/archive/` holds superseded RECOVERY_PLAN_2026-07-09.

**Contradictions with PLAN.md:**
- PLAN 3.1b: "consolidation-20260729 → main (fast-forward)" — **impossible**;
  local main has diverged +326/−98 and the two lines share no fast-forward
  relationship.
- PLAN 3.1a/3.1c: "oribasius-app absorbs aetius + ancient-simples" — the local
  program says the opposite: oribasius-app is being *frozen and superseded* by
  `hylike`.
- None of this program exists in any pushed branch's docs — GitHub-side
  portfolio cannot see it.

## 6. Duplicate-cluster evidence (for pending rulings)

- `cookbook` + `cookbook-archive` (WSL, both detached HEAD, dirty) +
  `aos-cookbook` (Win, clean, stale) + `aos-cookbook-mockup` (WSL, dirty:2,
  local `workflow-bootstrap` branch upstream-gone) + GitHub `cookbook`,
  `aos-cookbook`, `aos-cookbook-mockup`, archived `cookbook-mockup`.
- `dmm` (WSL, main+6, dirty:5) + `aos-dmm` (Win, dirty:398, GitHub stale
  2025-08).
- `recipe-aligner` (WSL clean) + `recipe-aligner-1`/`-bak` (Win, stale
  duplicates).
- `eggphy` (WSL dirty:18) + `egg-ink-phylogeny` (WSL, NO-REMOTE) + non-repo
  dirs `C:\Projects\eggphy`, `C:\Projects\phylogeny`.

## 7. Audit-method caveats

- `repo_audit.py` does not descend into nested repos: `~/Projects` being
  itself a git repo would have masked all 25 nested repos; worked around by
  passing every subdirectory as a root. Same limitation means repos nested
  *inside* any repo remain invisible.
- Windows `tei-maker` fetch hung (credential path); the script's 120 s timeout
  fired but orphaned `git-remote-https` children held the stdout pipe and
  stalled the audit ~10 min; unstuck by killing those processes. tei-maker
  ahead/behind figures on the Windows side therefore rest on stale
  remote-tracking refs.
- Two Scholar's Opus keys exist (`scholar_opus_db` and namespaced variants);
  only the unnamespaced key held task data.
- Windows-side scan of `\\wsl.localhost\...` is impossible (git rc=128,
  dubious ownership) — hence the two-JSON split for one machine.

## 8. What this means for the plan (pending theophrastos)

Nothing merges. Open questions for Sean logged in PLAN.md changelog; the
decisive one: **does the Hylike cutover program supersede the Phase 3 ruling
that oribasius-app absorbs aetius/ancient-simples, or is the cutover itself
abandoned?** Every Phase 3 checkbox depends on that answer, and on what
theophrastos holds.
