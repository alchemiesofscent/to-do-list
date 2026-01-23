import React from 'react';

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map((c) => c.trim());
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? '';
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.startsWith('## ')) {
      blocks.push({ type: 'h2', text: t.slice(3).trim() });
      i++;
      continue;
    }
    if (t.startsWith('### ')) {
      blocks.push({ type: 'h3', text: t.slice(4).trim() });
      i++;
      continue;
    }
    if (t.startsWith('- ')) {
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const li = (lines[i] ?? '').trim();
        if (!li.startsWith('- ')) break;
        items.push(li.slice(2).trim());
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (t.startsWith('|')) {
      const header = splitRow(t);
      const divider = splitRow((lines[i + 1] ?? '').trim());
      if (header.length && divider.length === header.length) {
        const rows: string[][] = [];
        i += 2;
        for (; i < lines.length; i++) {
          const r = (lines[i] ?? '').trim();
          if (!r.startsWith('|') || !r.endsWith('|')) break;
          const row = splitRow(r);
          if (row.length === header.length) rows.push(row);
        }
        blocks.push({ type: 'table', headers: header, rows });
        continue;
      }
    }

    // Paragraph: gather until blank line.
    const parts: string[] = [];
    for (; i < lines.length; i++) {
      const l = (lines[i] ?? '').trimEnd();
      if (!l.trim()) break;
      parts.push(l.trim());
    }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }

  return blocks;
}

export const MarkdownView: React.FC<{ markdown: string }> = ({ markdown }) => {
  const blocks = React.useMemo(() => parseBlocks(markdown), [markdown]);

  return (
    <div className="space-y-3">
      {blocks.map((b, idx) => {
        if (b.type === 'h2') return <h2 key={idx} className="text-lg font-black text-slate-900 dark:text-white">{b.text}</h2>;
        if (b.type === 'h3') return <h3 key={idx} className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{b.text}</h3>;
        if (b.type === 'p') return <p key={idx} className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{b.text}</p>;
        if (b.type === 'ul')
          return (
            <ul key={idx} className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-200 space-y-1">
              {b.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          );
        if (b.type === 'table')
          return (
            <div key={idx} className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    {b.headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, rIdx) => (
                    <tr key={rIdx} className="border-t border-slate-100 dark:border-slate-700">
                      {r.map((c, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-slate-700 dark:text-slate-200 align-top">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        return null;
      })}
    </div>
  );
};

