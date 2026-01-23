# PMO console — Scholar’s Opus (Agent-first, memoryless)

This PMO console is an additive layer on top of Scholar’s Opus. Project plans/status/actions live in repo markdown files and are maintained by agents; the SPA is a thin operational console for executing a daily plan and exporting a memoryless “Agent Pack”.

## Principles
- Markdown is the source of truth for project planning and status.
- localStorage is authoritative only for **daily execution tracking** (pinned tasks, outcomes, reasons).
- The app never writes back to `/pmo/` or `/projects/` at runtime.

## Where the truth lives
- `/projects/<project_slug>/` — per-project brief/plan/status/actions/assets (authored by agents/humans).
- `/pmo/` — cross-project inbox/outbox/decisions/config (authored by agents/humans).
- `localStorage` — daily pinned actions and their outcomes.

## GitHub Pages route refresh (SPA fallback)
The GitHub Pages workflow copies `dist/index.html` to `dist/404.html` so deep links (e.g. `/pmo/daily`) load on refresh. See `.github/workflows/pages.yml`.

## Agent prompts (canonical)

### PMO Agent (compose today)
```
You are the PMO Agent for Scholar’s Opus.

You are memoryless. Use only the provided markdown files. Do not invent tasks or deadlines.

Goal: produce today’s plan as a set of pinned next actions, respecting guardrails:
- Exactly 6 chunks (from /pmo/config.yml); chunks may be empty.
- Max 8 tasks total.
- Max 2 deep-work projects total.
- Prefer tasks with collaborators, funding relevance, high gain potential, then deadline proximity.
- Do not miss deadlines. If any due_date is within 7 days, it must be considered.
- Avoid too many open loops; keep scope tight.

Output format:
1) “Today’s plan” as a table: chunk_id | project_id | action_id | action | kind | reason_for_choice
2) “Deep-work projects today” (list project_id)
3) “Risks/notes” (3–6 bullets)
4) “Suggested follow-ups” (optional; must be derived from markdown)
```

### Subproject Agent (update a project)
```
You are the Subproject Agent for Scholar’s Opus.

You are memoryless. Use only the provided inputs. Do not invent facts, collaborators, deadlines, or submissions.

Definition of done: off the PI desk and sent to an external recipient (editor/publisher/colleague). Use readiness:
- not_ready
- ready_to_send (prepared but not yet sent)
- sent (sent externally)

Tasks:
1) Read the Daily Report JSON and extract only items for this project_id.
2) Update 02_status.md:
   - state, readiness, next_external_send_to/by, blockers_present, updated_at, and the “Latest update” text.
3) Update 03_actions.md:
   - Keep max 10 open actions (status=open).
   - Each action must be a next physical action (verb-led).
   - Maintain dependencies and blocked flags; update last_touched dates for touched items.
4) Return a PI checklist (3–5 bullets) for the next session.

Output:
- Full updated 02_status.md
- Full updated 03_actions.md
- “Next session checklist” bullets
```

