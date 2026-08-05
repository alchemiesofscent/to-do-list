# Machine audit findings — theophrastos — 2026-08-05

Both machine audits are now committed. The two-machine gate condition is met.
Findings from metopion (`docs/FINDINGS-metopion-20260805.md`) are hereby
confirmed or extended, not superseded.

**Method:** Sean ran `repo_audit.py` on theophrastos: Windows pass
(`data/machines/theophrastos.json`, roots `c:\dev` + `\\wsl.localhost\...`)
and WSL pass (`data/machines/theophrastos-wsl.json`, roots `~/github` and its
subdirectories).

## 1. Headline findings

1. **oribasius-app (WSL)** — checked out on `consolidation-20260729` with
   **dirty: 999 files**, five local-only branches (`backup/local-main-2026-07-15`,
   `feature/paul-book7-translation-20260722`, `paul-book7-completion-20260722`,
   `recovery/aetius-export-20260728`, `recovery/galen-json-2026-07-15`), and
   **`recovery/galen-json-2026-07-15` is +19 ahead** of its GitHub counterpart.
   Three registered worktrees plus two detached worktree dirs
   (`oribasius-app-paul-completion-20260722`, `oribasius-app-paul7`).
   So the desktop holds the *Paul Book 7* line and unpushed Galen-JSON
   recovery work — a third version of events, as suspected.
2. **tei-maker (WSL)** — FROZEN repo, yet branch `wellmann-qc-20260721` has a
   commit dated **today (2026-08-05), +1 unpushed**. Five unpushed/local-only
   branches, dirty:5, and **12 worktrees** plus four detached worktree dirs
   (`tei-maker-integration`, `tei-maker-trip`, `tei-maker-trip-ocr`,
   `tei-maker-trip-paul7`). Something (an agent?) has been active on the
   frozen repo very recently.
3. **extraction-pipeline (WSL)** — branch `feat/f0.12.0-ingredient-join`,
   tip **today (2026-08-05), no upstream**. Active unpushed work.
4. **source-artifacts (WSL)** — a repo that **does not exist on GitHub at
   all** (NO-REMOTE, main tip 2026-07-30, dirty:1). Not in the portfolio.
   Machine-only project.
5. **aetius (WSL)** — 2 stashes, dirty:1, local-only
   `backup/main-before-origin-sync-20260426`, main −3. Absorption target with
   loose ends on this machine too.
6. **c:\dev\perfume-tables** — dirty:5, 1 stash, main **−48** behind GitHub.
   Both machines carry stale, dirty `c:\dev\perfume-tables` clones
   (metopion's is dirty:15).
7. **~/github wrapper** — like metopion's `~/Projects`, the desktop's
   `~/github` directory is itself a git repo with no remote (seen by the
   Windows pass). The WSL pass had a typo root (`githun`) so the wrapper was
   never audited natively — unknown contents. Same hazard pattern as metopion.

## 2. Cross-machine picture (both audits now in)

- **oribasius-app exists in three diverged states:** GitHub (main + pushed
  consolidation-20260729), metopion (unpushed Hylike/refactor line, local
  main +326/−98), theophrastos (consolidation checkout, dirty:999, unpushed
  paul-book7 + recovery branches, galen-json +19). No two agree.
- **tei-maker likewise:** GitHub (10 branches, 4 PRs), metopion-Windows
  (dirty:551, no-upstream main), metopion-WSL (6 local-only branches,
  2 stashes), theophrastos (5 unpushed branches incl. one touched today,
  12 worktrees). The freeze is not being respected by whatever runs on
  theophrastos.
- **Duplicate clusters unchanged** by desktop data: cookbook×, dmm×,
  recipe-aligner× as per metopion findings.
- **GitHub repos absent from BOTH machines:** `dioscorides-viewer`,
  `periplus-tour` (metopion's dual-remote clone covers it),
  `map`, plus archived `cookbook-mockup`. `extraction-pipeline` and
  `index-locorum` do exist on theophrastos (absent from metopion).
- **New machine-only repo count:** metopion 4 (`~/Projects` wrapper,
  aos-corpus-cli, egg-ink-phylogeny, periplus-material-map) +
  theophrastos 2 (`~/github` wrapper, source-artifacts).

## 3. Data caveats

- `theophrastos.json` (Windows pass) contains six garbage rows for
  `\\wsl.localhost\...` paths (head `?`, NO-REMOTE) — Windows git cannot read
  WSL repos (rc=128); the WSL JSON supersedes those rows. `c:\dev` rows are
  valid.
- WSL pass roots contain a typo (`/home/seanm/githun`); harmless except that
  `~/github` itself (a git repo per the Windows pass) was never natively
  audited.
- `~/github/rescue-20260729` was passed as a root but yielded no repo.
- tei-maker ahead/behind figures may rest on stale remote refs where fetch
  was slow.

## 4. Consequences

The gate condition is **met** — both machines are on record. But the audits
argue for keeping the freeze on execution until Sean rules on:
(1) Hylike-vs-absorption (deferred earlier today; all evidence now in);
(2) what is running on theophrastos that commits to frozen tei-maker;
(3) the paul-book7 rescue order for oribasius-app's three-way divergence.
Rescue-before-merge (PLAN 3.1b) is even more clearly the right sequence.
