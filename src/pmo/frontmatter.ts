function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseScalar(raw: string): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(raw: string): string[] | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => String(parseScalar(s)));
}

export type FrontmatterParseResult = {
  frontmatter: Record<string, unknown>;
  body: string;
};

// Very small YAML frontmatter parser for this repo’s strict schemas:
// - key: value scalars
// - key: [a, b] inline arrays
// - key:\n  - item (arrays of strings)
export function parseYamlFrontmatter(markdown: string): FrontmatterParseResult {
  if (!markdown.startsWith('---\n')) return { frontmatter: {}, body: markdown };
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: markdown };

  const raw = markdown.slice(4, end).trimEnd();
  const body = markdown.slice(end + '\n---\n'.length);

  const frontmatter: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i++;
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_@.-]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1] ?? '';
    const rest = kv[2] ?? '';
    if (rest.trim() === '') {
      // Possibly a list of strings:
      const items: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const next = lines[j] ?? '';
        const m = next.match(/^\s*-\s+(.*)$/);
        if (!m) break;
        items.push(String(parseScalar(m[1] ?? '')));
      }
      frontmatter[key] = items;
      i = j;
      continue;
    }
    const inline = parseInlineArray(rest);
    if (inline) {
      frontmatter[key] = inline;
      i++;
      continue;
    }
    frontmatter[key] = parseScalar(rest);
    i++;
  }

  if (!isRecord(frontmatter)) return { frontmatter: {}, body };
  return { frontmatter, body };
}

