This workspace is the PM hub for all alchemiesofscent repos.

**Publications sessions:** if Sean opens a publications session (papers, books,
proposals, chapters, reviews), read `publications/BRIEF.md` and follow it
instead of the rest of this file.

Ground truth, read in this order before any work:
1. PLAN.md — current phase, checkboxes, rulings. Never work outside it.
2. REPO_STANDARD.md — repo structure and branch rules. Apply to every repo touched.
3. data/portfolio.json — GitHub-side state. data/machines/*.json — local state.

Rules:
- Every branch/worktree you create: register it in that repo's STATUS.md first.
- tei-maker is FROZEN pending Sean's review of PR#13. Do not touch.
- Destructive actions (deleting branches/repos, force-push, archiving) require
  Sean's explicit confirmation in-session, even if PLAN.md implies them.
- Session end, no exceptions: update PLAN.md checkboxes + changelog, update
  STATUS.md in every repo touched, commit, push. Unpushed work didn't happen.
