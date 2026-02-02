import type { PmoConfig } from './config.ts';
import type { PinnedItem } from './dailyStorage.ts';
import { formatDateForDisplay } from './time.ts';

export type DailyReportStatus = 'done' | 'ready_to_send' | 'blocked' | 'not_done';

function getReportFields(item: PinnedItem): {
  project_id: string;
  project_slug: string;
  project_title: string;
  action_id: string;
  action_text: string;
  kind: string;
} {
  if (item.item_type === 'pmo_action') {
    return {
      project_id: item.project_id,
      project_slug: item.project_slug,
      project_title: item.project_title,
      action_id: item.action_id,
      action_text: item.action_text,
      kind: item.kind,
    };
  }
  return {
    project_id: 'todo',
    project_slug: 'todo',
    project_title: 'To Do',
    action_id: item.todo_id,
    action_text: item.title_snapshot,
    kind: item.kind,
  };
}

export type DailyReportJsonV1 = {
  schema_version: 'scholars-opus-daily-report@1';
  date_utc: string; // YYYY-MM-DD
  timezone_display: 'Europe/Prague';
  base_path: string;
  guardrails: {
    max_tasks_per_day: number;
    max_deep_work_projects_per_day: number;
  };
  summary: {
    total_pinned: number;
    done: number;
    ready_to_send: number;
    blocked: number;
    not_done: number;
  };
  chunks: Array<{
    chunk_id: string;
    label: string;
    start: string;
    end: string;
    kind: string;
    items: Array<{
      project_id: string;
      project_slug: string;
      project_title: string;
      action_id: string;
      action_text: string;
      kind: string;
      status: DailyReportStatus;
      reason_code: string | null;
      reason_text: string | null;
      pinned_at_utc: string;
      updated_at_utc: string;
    }>;
  }>;
  projects: Array<{
    project_id: string;
    project_slug: string;
    project_title: string;
    deep_work_today: boolean;
    items: Array<{ action_id: string; status: DailyReportStatus }>;
  }>;
  generated_at_utc: string;
};

export function buildDailyReportJson(params: {
  config: PmoConfig;
  dateUtc: string;
  pinned: PinnedItem[];
}): DailyReportJsonV1 {
  const { config, dateUtc, pinned } = params;

  const counts = { done: 0, ready_to_send: 0, blocked: 0, not_done: 0 };
  for (const p of pinned) {
    counts[p.status] += 1;
  }

  const byChunk = new Map<string, PinnedItem[]>();
  for (const p of pinned) {
    const arr = byChunk.get(p.chunk_id) ?? [];
    arr.push(p);
    byChunk.set(p.chunk_id, arr);
  }

  const deepProjects = new Set(
    pinned
      .filter((p): p is Extract<PinnedItem, { item_type: 'pmo_action' }> => p.item_type === 'pmo_action' && p.kind === 'deep')
      .map((p) => p.project_id)
  );
  const byProject = new Map<string, { slug: string; title: string; items: PinnedItem[] }>();
  for (const p of pinned) {
    const fields = getReportFields(p);
    const key = fields.project_id;
    const entry = byProject.get(key) ?? { slug: fields.project_slug, title: fields.project_title, items: [] };
    entry.items.push(p);
    byProject.set(key, entry);
  }

  return {
    schema_version: 'scholars-opus-daily-report@1',
    date_utc: dateUtc,
    timezone_display: 'Europe/Prague',
    base_path: import.meta.env.BASE_URL || '/',
    guardrails: {
      max_tasks_per_day: config.defaults.max_tasks_per_day,
      max_deep_work_projects_per_day: config.defaults.max_deep_work_projects_per_day,
    },
    summary: {
      total_pinned: pinned.length,
      done: counts.done,
      ready_to_send: counts.ready_to_send,
      blocked: counts.blocked,
      not_done: counts.not_done,
    },
    chunks: config.chunks.map((c) => {
      const items = (byChunk.get(c.id) ?? []).map((p) => {
        const fields = getReportFields(p);
        return {
          project_id: fields.project_id,
          project_slug: fields.project_slug,
          project_title: fields.project_title,
          action_id: fields.action_id,
          action_text: fields.action_text,
          kind: fields.kind,
          status: p.status,
          reason_code: p.reason_code,
          reason_text: p.reason_text,
          pinned_at_utc: p.pinned_at_utc,
          updated_at_utc: p.updated_at_utc,
        };
      });
      return { chunk_id: c.id, label: c.label, start: c.start, end: c.end, kind: c.kind, items };
    }),
    projects: Array.from(byProject.entries()).map(([project_id, entry]) => ({
      project_id,
      project_slug: entry.slug,
      project_title: entry.title,
      deep_work_today: deepProjects.has(project_id),
      items: entry.items.map((i) => ({ action_id: getReportFields(i).action_id, status: i.status })),
    })),
    generated_at_utc: new Date().toISOString(),
  };
}

export function buildDailyReportMarkdown(params: { config: PmoConfig; dateUtc: string; pinned: PinnedItem[] }): string {
  const { config, dateUtc, pinned } = params;
  const title = formatDateForDisplay(dateUtc);

  const byStatus: Record<DailyReportStatus, PinnedItem[]> = {
    done: [],
    ready_to_send: [],
    blocked: [],
    not_done: [],
  };
  for (const p of pinned) byStatus[p.status].push(p);

  const lines: string[] = [];
  lines.push(`# Daily report — ${dateUtc} (${title})`);
  lines.push('');
  lines.push('## Plan');
  for (const chunk of config.chunks) {
    const items = pinned.filter((p) => p.chunk_id === chunk.id);
    lines.push(`### ${chunk.label} (${chunk.start}–${chunk.end})`);
    if (items.length === 0) {
      lines.push('- (none)');
      lines.push('');
      continue;
    }
    for (const item of items) {
      const fields = getReportFields(item);
      lines.push(`- [${fields.project_id}] ${fields.action_text} (${fields.action_id})`);
    }
    lines.push('');
  }

  lines.push('## Outcomes');
  const section = (label: string, items: PinnedItem[]) => {
    lines.push(`### ${label}`);
    if (items.length === 0) {
      lines.push('- (none)');
      lines.push('');
      return;
    }
    for (const item of items) {
      const fields = getReportFields(item);
      if (item.status === 'blocked' || item.status === 'not_done') {
        lines.push(
          `- [${fields.project_id}] ${fields.action_text} (${fields.action_id}) — ${item.reason_code ?? 'reason_missing'}: ${item.reason_text ?? ''}`.trim()
        );
      } else {
        lines.push(`- [${fields.project_id}] ${fields.action_text} (${fields.action_id})`);
      }
    }
    lines.push('');
  };

  section('Ready to send', byStatus.ready_to_send);
  section('Done', byStatus.done);
  section('Blocked', byStatus.blocked);
  section('Not done', byStatus.not_done);

  return lines.join('\n').trimEnd() + '\n';
}

export function buildSubprojectAgentPrompt(params: { agentPackJson: string }): string {
  const { agentPackJson } = params;
  return [
    'You are the Subproject Agent for Scholar’s Opus.',
    '',
    'You are memoryless. Use only the Agent Pack JSON below. Do not invent facts, collaborators, deadlines, or submissions.',
    '',
    'Definition of done: off the PI desk and sent to an external recipient (editor/publisher/colleague).',
    'Use readiness: not_ready | ready_to_send | sent.',
    '',
    'Tasks:',
    '1) Summarise today’s outcomes and blockers per project_id.',
    '2) For each touched project, update 02_status.md and 03_actions.md.',
    '   - Keep max 10 open actions (status=open).',
    '   - Mark completed actions as done (or remove them); do not leave them implicit.',
    '3) Return full updated file contents for each updated file.',
    '',
    'Agent Pack JSON:',
    '```json',
    agentPackJson,
    '```',
    '',
  ].join('\n');
}

export function buildAgentPackMarkdown(params: {
  dailyReportJson: string;
  dailyReportMarkdown: string;
  promptText: string;
  touchedProjects: Array<{ project_id: string; project_slug: string; status_md: string; actions_md: string }>;
}): string {
  const lines: string[] = [];
  lines.push('# Agent Pack — Daily PMO handoff');
  lines.push('');
  lines.push('## Daily report (Markdown)');
  lines.push('```md');
  lines.push(params.dailyReportMarkdown.trimEnd());
  lines.push('```');
  lines.push('');
  lines.push('## Daily report (JSON)');
  lines.push('```json');
  lines.push(params.dailyReportJson.trimEnd());
  lines.push('```');
  lines.push('');
  lines.push('## Subproject Agent prompt');
  lines.push('```text');
  lines.push(params.promptText.trimEnd());
  lines.push('```');
  lines.push('');

  lines.push('## Touched project excerpts');
  for (const proj of params.touchedProjects) {
    lines.push(`### ${proj.project_id} (${proj.project_slug})`);
    lines.push('');
    lines.push('#### 02_status.md');
    lines.push('```md');
    lines.push(proj.status_md.trimEnd());
    lines.push('```');
    lines.push('');
    lines.push('#### 03_actions.md');
    lines.push('```md');
    lines.push(proj.actions_md.trimEnd());
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
