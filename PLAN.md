# Pipeline Build Plan

**Version:** 0.2 (2026-08-05)
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
- [ ] 1.4 Trigger manually once; verify `data/portfolio.json` is sane
- [ ] 1.5 Review output together: first real inventory of what's on GitHub
- [ ] 1.6 Sean enumerates Google Drive project folders → added to `projects.md` as entries with `drive:` links (automation of Drive freshness deferred to v0.3 if wanted)

## Phase 2 — Local audit (per machine, whenever at that machine)

- [ ] 2.1 Claude writes `scripts/repo_audit.py` — walks filesystem, finds every repo/worktree, reports dirty trees, unpushed commits, stashes, no-remote repos, divergence → table + `data/machines/<name>.json`
- [ ] 2.2 Run on `metopion` (laptop); commit report
- [!] 2.3 Run on `theophrastos` (desktop) — blocked until Sean is next at that machine
- [ ] 2.4 Cross-reference GitHub list vs. machine reports → stranded-work list

## Phase 3 — Triage (the one-time cleanup)

- [ ] 3.1 Go through stranded-work list repo by repo; ruling per repo: push / merge / archive / delete
- [ ] 3.2 Kill stray worktrees and duplicate clones; one canonical clone per repo per machine
- [ ] 3.3 Add `STATUS.md` to every surviving active repo (template: last state, next action, blockers, canonical branch)
- [ ] 3.4 Add standing instruction to agent configs (CLAUDE.md / AGENTS.md): end every session by updating `STATUS.md` and pushing

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

- 0.2 (2026-08-05): Phase 0 decisions recorded (source of truth, scope incl. Drive folders, private repos + PAT, machine names). Added 1.6 (Drive enumeration). Phase 1 build started.
- 0.1 (2026-08-05): initial plan.