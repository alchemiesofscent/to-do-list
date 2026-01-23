export type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map((c) => c.trim());
}

export function parseFirstTableAfterHeading(params: { markdownBody: string; heading: string }): MarkdownTable | null {
  const { markdownBody, heading } = params;
  const lines = markdownBody.split(/\r?\n/);
  const headingLine = `## ${heading}`.trim();
  const startIndex = lines.findIndex((l) => l.trim() === headingLine);
  if (startIndex === -1) return null;

  // Find header row
  let i = startIndex + 1;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!line.trim()) continue;
    if (line.trim().startsWith('|')) break;
  }
  if (i >= lines.length) return null;
  const header = splitRow(lines[i] ?? '');
  const divider = splitRow(lines[i + 1] ?? '');
  if (header.length === 0 || divider.length !== header.length) return null;

  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length; j++) {
    const line = lines[j] ?? '';
    if (!line.trim()) break;
    if (!line.trim().startsWith('|')) break;
    const row = splitRow(line);
    if (row.length !== header.length) continue;
    rows.push(row);
  }

  return { headers: header, rows };
}

