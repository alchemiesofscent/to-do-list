# Pipeline Build Plan

**Version:** 0.4 (2026-08-05)
**Lives at:** repo root of `to-do-list` — update status here, commit on every change.
**Status codes:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (note why)

**Goal:** git is the database; the app is a viewer. All state (portfolio, repo health, machine audits) lives as committed files. Agents and Sean read/write the same files.

---

## Phase 0 — Decisions (unblock everything else)

- [x] 0.1 Portfolio source of truth: `data/projects.md` in `to-do-list` repo (Notion demoted to non-project tasks only)
- [x] 0.2 Collector scope: all repos under `alchemiesofscent`. Also: Google Drive project folders (articles/books) — tracked as `projects.md` entries with a `drive:` link field; Sean enumerates when ready (→ 1.6)
- [x] 0.3 Private repos in scope → Sean creates fine-grained PAT (read-only: Contents + Metadata, all repos), adds as secret `PORTFOLIO_TOKEN` (→ 1.3)
- [x] 0.4 Machines: `metopion` (laptop), `theophrastos` (desktop)

## Phase 1 — GitHub-side truth (no PC needed)

- [ ] 1.1 Claude writes `scripts/collect_portfolio.py` — queries GitHub API: every repo, last push, branches, ahead/behind default, open PRs, pulls `STATUS.md` if present → writes `data/portfolio.json`
- [ ] 1.2 Claude writes `.github/workflows/collect.yml` — nightly schedule + manual trigger; commits `portfolio.json` if changed
- [ ] 1.3 Sean merges both, adds secret if 0.3 = yes
- [x] 1.4 Trigger manually once; verify `data/portfolio.json` is sane (25 repos; PAT needed Pull requests: read — fixed)
- [x] 1.5 Review output: 5 live repos; divergence concentrated in `tei-maker` (wellmann-qc +194) and `oribasius-app` (consolidation-20260729 +120/-0); duplicate clusters identified; zero STATUS.md files
- [ ] 1.6 Sean enumerates Google Drive project folders → added to `projects.md` as entries with `drive:` links (automation of Drive freshness deferred to v0.3 if wanted)
- [ ] 1.7 Extend collector: capture README.md + `docs/` file listing per repo, so consolidation/documentation questions are answerable from `portfolio.json`

## Phase 2 — Local audit (per machine, whenever at that machine)

- [x] 2.1 Claude writes `scripts/repo_audit.py` — walks filesystem, finds every repo/worktree, reports dirty trees, unpushed commits, stashes, no-remote repos, divergence → table + `data/machines/<name>.json`
- [x] 2.2 Run on `metopion` (laptop); commit report — two JSONs: `metopion.json` (Windows: C:\Projects, C:\dev) + `metopion-wsl.json` (WSL: ~/Projects et al.); Windows git cannot read \\wsl.localhost repos
- [!] 2.3 Run on `theophrastos` (desktop) — blocked until Sean is next at that machine
- [~] 2.4 Cross-reference GitHub list vs. machine reports → stranded-work list — metopion side done, PROVISIONAL: `docs/FINDINGS-metopion-20260805.md`; final only after 2.3

## Phase 3 — Triage & consolidation (the one-time cleanup)

**GATE (2026-08-05): no Phase 3 action — no merge, branch deletion, archive, or worktree removal in any repo — until BOTH machine audits (2.2 metopion ✓, 2.3 theophrastos ✗) are committed.** Existing local clones are evidence: read, never modify. metopion findings are PROVISIONAL until theophrastos lands.

**Open contradiction (2026-08-05, from metopion audit):** the local oribasius-app clone carries an authorized (2026-07-12) "Hylike greenfield cutover" program — oribasius-app frozen as a forensic *bridge* repo, successor repo `hylike` to become canonical; local main +326/−98 vs origin (no fast-forward possible for 3.1b); unpushed `refactor/project-layout` diverged 329/218 from `consolidation-20260729`. This contradicts the 3.1a/3.1c ruling that oribasius-app absorbs aetius/ancient-simples. Sean must rule before any 3.1 work. See `docs/FINDINGS-metopion-20260805.md` §5.

**Rulings so far (2026-08-05):**
- `oribasius-app` absorbs `aetius`, `ancient-simples` (+ `simples` archived as superseded scaffold) — merger must be documented in oribasius-app docs first (→ 3.1a)
- `kyphi-repo` absorbed into `perfume-tables`
- Duplicate clusters pending ruling: `cookbook`/`aos-cookbook`/`aos-cookbook-mockup`; `dmm`/`aos-dmm`

- [ ] 3.1a Verify/write the oribasius-app consolidation plan in its `docs/` (currently undocumented in any public repo)
- [ ] 3.1b Rescue stranded work first: `oribasius-app` consolidation-20260729 → main (fast-forward); `ancient-simples` wip/public-read (+18/-0); `aetius` integrate/schema-policy (+3/-0); decide `tei-maker` wellmann-qc (+194) and berendes branches (active or abandoned?)
- [ ] 3.1c Execute mergers: aetius + ancient-simples → oribasius-app; kyphi-repo → perfume-tables; archive sources with pointer in README
- [ ] 3.1d Rule on remaining duplicate clusters (cookbook×3, dmm×2)
- [ ] 3.2 Kill stray branches (`backup/*`, `recovery/*`, `archive/*`, agent leftovers) and worktrees; one canonical clone per repo per machine
- [ ] 3.3 Apply REPO_STANDARD.md to every surviving active repo: STATUS.md (with branch registry), AGENTS.md, docs/DECISIONS.md
- [ ] 3.4 Dashboard flags unregistered branches: declared (STATUS.md registry) vs. actual (portfolio.json) diff — the "PM" is this mechanism, not a person
- [ ] 3.5 Archive dead repos (GitHub archive flag + README pointer): candidates `simples`, `flash`, `recipe-aligner`, `eggphy` — confirm each

## Phase 4 — App rework (viewer over git data)

- [ ] 4.1 Strip Supabase sync and localStorage-as-truth from Scholar's Opus
- [ ] 4.2 Repoint app to render `data/projects.md` + `data/portfolio.json` + `data/machines/*.json`
- [ ] 4.3 Dashboard views: portfolio by stage · repo health (dirty/unpushed/stale) · per-machine stranded work
- [ ] 4.4 Deploy; verify Pages rebuild on data commits

## Phase 5 — Operating rhythm

- [ ] 5.1 Weekly 20-min review: update `projects.md` next-actions, check dashboard red flags
- [ ] 5.2 Monthly: rerun `repo_audit.py` on each machine
- [ ] 5.3 After 4 weeks: review what's rotting; cut anything not being maintained (v0.2 of this plan)

---

## Rules (already agreed)

1. GitHub = single source of truth; every machine is a disposable clone.
2. One next action per project, never a list.
3. Last act of every session (human or agent): update STATUS.md, push.
4. Nothing exists only locally.

## Changelog

- 0.4 (2026-08-05): metopion audit run and committed (2.1–2.2 done; two JSONs, Windows + WSL). Phase 3 hard-gated on both machine audits. Cross-reference done provisionally (2.4 [~]): headline risks — oribasius-app unpushed Hylike-cutover line (main +326/−98, local-only `refactor/project-layout`); tei-maker Windows clone dirty:551 with no-upstream main, WSL clone with 6 local-only branches + 2 stashes; `tei-maker.mixed` no-remote dirty:10,576; 4 no-remote WSL repos incl. `~/Projects` wrapper repo; Scholar's Opus localStorage 8 days ahead of projects.md (both frozen since 2026-01); browser-only tasks exist. Open contradiction logged: Hylike cutover vs. 3.1 absorption ruling — needs Sean. Details: `docs/FINDINGS-metopion-20260805.md`.
- 0.3 (2026-08-05): First inventory complete (1.4–1.5). Phase 3 rewritten with consolidation rulings (oribasius-app absorbs aetius/ancient-simples/simples; kyphi-repo → perfume-tables), stranded-work rescue list, REPO_STANDARD.md rollout, branch-registry mechanism. Added 1.7 (collector captures README + docs).
- 0.2 (2026-08-05): Phase 0 decisions recorded (source of truth, scope incl. Drive folders, private repos + PAT, machine names). Added 1.6 (Drive enumeration). Phase 1 build started.
- 0.1 (2026-08-05): initial plan.