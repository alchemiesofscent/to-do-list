# Decisions (ADR-lite) — PMO console

## ADR-0001 — Markdown as source of truth
- Date: 2026-01-23
- Status: accepted
- Context: PI wants agent-first, memoryless operation with durable project plans/status in versioned files.
- Decision: Project plan/status/actions are authored in repo markdown under `/projects/<project_slug>/`; the SPA is read-only for these files.
- Consequences: UI edits are out of scope; changes occur via agents (Codex/LLM) committing updates to markdown.
- Alternatives considered: Rich in-app editor; external PM tool (rejected: complexity and tool sprawl).

## ADR-0002 — Daily execution is localStorage-only
- Date: 2026-01-23
- Status: accepted
- Context: Daily execution changes frequently and should not require repo writes or sync.
- Decision: localStorage stores only daily pinned tasks + statuses + reasons + timestamps; exports provide memoryless handoff to agents.
- Consequences: Daily history is per-browser unless exported.

