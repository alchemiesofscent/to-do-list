export type PmoChunkKind = 'deep' | 'admin' | 'light';

export type PmoChunk = {
  id: string;
  label: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  kind: PmoChunkKind;
};

export type PmoConfig = {
  timezone: string;
  day_template_id: string;
  defaults: {
    max_tasks_per_day: number;
    max_deep_work_projects_per_day: number;
    max_active_actions_per_project: number;
    stale_days: number;
  };
  chunks: PmoChunk[];
  weekly_constraints: {
    monday_meeting_block: { start: string; end: string; label: string };
  };
};

function parseYamlLines(lines: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: unknown }> = [{ indent: -1, value: root }];

  function current(): { indent: number; value: unknown } {
    return stack[stack.length - 1]!;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
    const line = raw.trim();

    while (stack.length > 1 && indent <= current().indent) stack.pop();

    const parent = current().value;

    const listItem = line.match(/^- ([A-Za-z0-9_@.-]+):\s*(.*)$/);
    if (listItem) {
      if (!Array.isArray(parent)) continue;
      const obj: Record<string, unknown> = {};
      (parent as unknown[]).push(obj);
      obj[listItem[1]!] = parseYamlScalar(listItem[2] ?? '');
      stack.push({ indent, value: obj });
      continue;
    }

    if (line === '-') {
      if (!Array.isArray(parent)) continue;
      const obj: Record<string, unknown> = {};
      (parent as unknown[]).push(obj);
      stack.push({ indent, value: obj });
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_@.-]+):\s*(.*)$/);
    if (!keyValue) continue;
    const key = keyValue[1]!;
    const rest = keyValue[2] ?? '';

    if (rest === '') {
      // Decide whether next block is a list or a map based on lookahead
      const next = lines[i + 1] ?? '';
      const nextTrim = next.trim();
      const nextIndent = next.match(/^\s*/)?.[0]?.length ?? 0;
      const isList = nextTrim.startsWith('-') && nextIndent > indent;
      const child: unknown = isList ? [] : {};
      if (typeof parent === 'object' && parent !== null && !Array.isArray(parent)) {
        (parent as Record<string, unknown>)[key] = child;
      }
      stack.push({ indent, value: child });
      continue;
    }

    if (typeof parent === 'object' && parent !== null && !Array.isArray(parent)) {
      (parent as Record<string, unknown>)[key] = parseYamlScalar(rest);
    }
  }

  return root;
}

function parseYamlScalar(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePmoConfigYaml(yamlText: string): PmoConfig {
  const parsed = parseYamlLines(yamlText.split(/\r?\n/));
  if (!isRecord(parsed)) throw new Error('Invalid config.yml');

  const timezone = String(parsed.timezone ?? '');
  const day_template_id = String(parsed.day_template_id ?? '');
  const defaults = parsed.defaults;
  const chunks = parsed.chunks;
  const weekly_constraints = parsed.weekly_constraints;

  if (!timezone) throw new Error('Missing timezone in config.yml');
  if (!day_template_id) throw new Error('Missing day_template_id in config.yml');
  if (!isRecord(defaults)) throw new Error('Missing defaults in config.yml');
  if (!Array.isArray(chunks)) throw new Error('Missing chunks in config.yml');
  if (!isRecord(weekly_constraints)) throw new Error('Missing weekly_constraints in config.yml');

  const max_tasks_per_day = Number(defaults.max_tasks_per_day);
  const max_deep_work_projects_per_day = Number(defaults.max_deep_work_projects_per_day);
  const max_active_actions_per_project = Number(defaults.max_active_actions_per_project);
  const stale_days = Number(defaults.stale_days);

  const chunkObjs: PmoChunk[] = chunks.map((c) => {
    if (!isRecord(c)) throw new Error('Invalid chunk entry');
    const kind = String(c.kind ?? '') as PmoChunkKind;
    if (kind !== 'deep' && kind !== 'admin' && kind !== 'light') throw new Error('Invalid chunk kind');
    return {
      id: String(c.id ?? ''),
      label: String(c.label ?? ''),
      start: String(c.start ?? ''),
      end: String(c.end ?? ''),
      kind,
    };
  });

  const mondayBlock = isRecord(weekly_constraints.monday_meeting_block)
    ? weekly_constraints.monday_meeting_block
    : null;
  if (!mondayBlock) throw new Error('Missing weekly_constraints.monday_meeting_block');

  return {
    timezone,
    day_template_id,
    defaults: {
      max_tasks_per_day,
      max_deep_work_projects_per_day,
      max_active_actions_per_project,
      stale_days,
    },
    chunks: chunkObjs,
    weekly_constraints: {
      monday_meeting_block: {
        start: String(mondayBlock.start ?? ''),
        end: String(mondayBlock.end ?? ''),
        label: String(mondayBlock.label ?? ''),
      },
    },
  };
}

