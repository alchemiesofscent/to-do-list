import { parseFirstTableAfterHeading } from './markdownTable.ts';
import type { ProjectDoc } from './content.ts';

export type ActionStatus = 'open' | 'done' | 'dropped';

export type ProjectNextAction = {
  action_id: string;
  action: string;
  kind: 'deep' | 'light' | 'admin';
  effort: 'S' | 'M' | 'L';
  depends_on: string;
  blocked: 'yes' | 'no';
  owner: string;
  priority_hint: string;
  due_date: string;
  last_touched: string;
  status: ActionStatus;
  notes: string;
};

const REQUIRED_HEADERS = [
  'action_id',
  'action',
  'kind',
  'effort',
  'depends_on',
  'blocked',
  'owner',
  'priority_hint',
  'due_date',
  'last_touched',
  'status',
  'notes',
] as const;

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseActionsFromDoc(doc: ProjectDoc): { actions: ProjectNextAction[]; errors: string[] } {
  const table = parseFirstTableAfterHeading({ markdownBody: doc.body, heading: 'Next actions' });
  if (!table) return { actions: [], errors: ['Missing "## Next actions" table'] };

  const headers = table.headers.map(normaliseHeader);
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { actions: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const index = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<string, number>;
  const actions: ProjectNextAction[] = [];
  for (const row of table.rows) {
    const get = (key: string) => row[index[key]!] ?? '';
    const kind = get('kind') as ProjectNextAction['kind'];
    const effort = get('effort') as ProjectNextAction['effort'];
    const blocked = get('blocked') as ProjectNextAction['blocked'];
    const status = get('status') as ActionStatus;
    if (status !== 'open' && status !== 'done' && status !== 'dropped') continue;
    if (kind !== 'deep' && kind !== 'light' && kind !== 'admin') continue;
    if (effort !== 'S' && effort !== 'M' && effort !== 'L') continue;
    if (blocked !== 'yes' && blocked !== 'no') continue;

    actions.push({
      action_id: get('action_id'),
      action: get('action'),
      kind,
      effort,
      depends_on: get('depends_on'),
      blocked,
      owner: get('owner'),
      priority_hint: get('priority_hint'),
      due_date: get('due_date'),
      last_touched: get('last_touched'),
      status,
      notes: get('notes'),
    });
  }

  return { actions, errors: [] };
}

