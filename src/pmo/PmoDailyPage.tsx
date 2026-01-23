import React, { useEffect, useMemo, useState } from 'react';
import type { PmoConfig } from './config.ts';
import { loadPmoConfig, loadProjectBundle } from './content.ts';
import { formatDateForDisplay, utcDateKey } from './time.ts';
import { getDayPinnedItems, removePinnedItem, upsertPinnedItem, type DailyStatus, type PinnedItem, type ReasonCode } from './dailyStorage.ts';
import { buildAgentPackMarkdown, buildDailyReportJson, buildDailyReportMarkdown, buildSubprojectAgentPrompt } from './export.ts';

const REASONS: Array<{ code: ReasonCode; label: string }> = [
  { code: 'waiting_on_colleague', label: 'Waiting on colleague' },
  { code: 'waiting_on_materials', label: 'Waiting on materials' },
  { code: 'scope_unclear', label: 'Scope unclear' },
  { code: 'needs_admin_time', label: 'Needs admin time' },
  { code: 'needs_deep_think', label: 'Needs deep thinking' },
  { code: 'fatigue_context_switching', label: 'Fatigue / context switching' },
  { code: 'overran_estimate', label: 'Overran estimate' },
  { code: 'blocked_by_dependency', label: 'Blocked by dependency' },
  { code: 'other', label: 'Other' },
];

export const PmoDailyPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [config, setConfig] = useState<PmoConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateUtc] = useState(() => utcDateKey());
  const [pinned, setPinned] = useState<PinnedItem[]>(() => getDayPinnedItems(dateUtc));
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPayload, setExportPayload] = useState<{
    reportJson: string;
    reportMd: string;
    prompt: string;
    agentPackMd: string;
  } | null>(null);

  useEffect(() => {
    loadPmoConfig()
      .then(setConfig)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load PMO config'));
  }, []);

  const byChunk = useMemo(() => {
    const map = new Map<string, PinnedItem[]>();
    for (const item of pinned) {
      const arr = map.get(item.chunk_id) ?? [];
      arr.push(item);
      map.set(item.chunk_id, arr);
    }
    return map;
  }, [pinned]);

  const deepProjectsToday = useMemo(() => {
    const set = new Set<string>();
    for (const item of pinned) {
      if (item.kind === 'deep') set.add(item.project_id);
    }
    return set;
  }, [pinned]);

  const handleUpdate = (item: PinnedItem, next: Partial<PinnedItem>) => {
    const updated: PinnedItem = { ...item, ...next, updated_at_utc: new Date().toISOString() };
    upsertPinnedItem(updated);
    setPinned(getDayPinnedItems(dateUtc));
  };

  const handleRemove = (item: PinnedItem) => {
    removePinnedItem({ dateUtc, pinnedId: item.pinned_id });
    setPinned(getDayPinnedItems(dateUtc));
  };

  const exportReady = useMemo(() => {
    for (const item of pinned) {
      if (item.status === 'blocked' || item.status === 'not_done') {
        if (!item.reason_code) return false;
        if ((item.reason_text ?? '').trim().length < 10) return false;
      }
    }
    return true;
  }, [pinned]);

  const downloadText = (filename: string, text: string, mime: string) => {
    const blob = new Blob([text], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyText = async (text: string) => navigator.clipboard.writeText(text);

  const prepareExportPayload = async (): Promise<{
    reportJson: string;
    reportMd: string;
    prompt: string;
    agentPackMd: string;
  } | null> => {
    if (!config) return;
    setExportError(null);
    if (!exportReady) {
      setExportError('Please add a reason code and brief explanation for any blocked or not-done items.');
      return null;
    }

    setIsExporting(true);
    try {
      const report = buildDailyReportJson({ config, dateUtc, pinned });
      const reportJson = JSON.stringify(report, null, 2) + '\n';
      const reportMd = buildDailyReportMarkdown({ config, dateUtc, pinned });

      const touchedSlugs: string[] = Array.from(new Set<string>(pinned.map((p) => p.project_slug))).sort((a, b) =>
        a.localeCompare(b)
      );
      const bundles = await Promise.all(touchedSlugs.map((slug) => loadProjectBundle(slug)));

      const touchedProjects = bundles.map((b) => {
        const status = b.docs['02_status.md'].raw;
        const actions = b.docs['03_actions.md'].raw;
        const project_id = String(b.docs['00_brief.md'].frontmatter.project_id ?? b.project_slug);
        return { project_id, project_slug: b.project_slug, status_md: status, actions_md: actions };
      });

      const prompt = buildSubprojectAgentPrompt({ agentPackJson: reportJson.trimEnd() });
      const packMd = buildAgentPackMarkdown({
        dailyReportJson: reportJson,
        dailyReportMarkdown: reportMd,
        promptText: prompt,
        touchedProjects,
      });

      const payload = { reportJson, reportMd, prompt, agentPackMd: packMd };
      setExportPayload(payload);
      return payload;
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const doDownloadExports = async () => {
    const payload = await prepareExportPayload();
    if (!payload) return;
    downloadText(`daily-report_${dateUtc}.md`, payload.reportMd, 'text/markdown;charset=utf-8');
    downloadText(`daily-report_${dateUtc}.json`, payload.reportJson, 'application/json;charset=utf-8');
    downloadText(`agent-pack_${dateUtc}.md`, payload.agentPackMd, 'text/markdown;charset=utf-8');
  };

  const doCopy = async (kind: 'json' | 'markdown' | 'prompt' | 'pack') => {
    const payload = exportPayload ?? (await prepareExportPayload());
    if (!payload) return;
    if (kind === 'json') await copyText(payload.reportJson);
    if (kind === 'markdown') await copyText(payload.reportMd);
    if (kind === 'prompt') await copyText(payload.prompt);
    if (kind === 'pack') await copyText(payload.agentPackMd);
  };

  const label = formatDateForDisplay(dateUtc);
  const mondayNote =
    config && new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'long' }).format(new Date(`${dateUtc}T00:00:00.000Z`)) === 'Monday'
      ? config.weekly_constraints.monday_meeting_block
      : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Back
          </button>
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">PMO — Today</div>
            <div className="font-serif text-lg font-bold text-slate-900 dark:text-white">{label}</div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
            <div>{pinned.length} / {config?.defaults.max_tasks_per_day ?? 8} tasks</div>
            <div>{deepProjectsToday.size} / {config?.defaults.max_deep_work_projects_per_day ?? 2} deep projects</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">{error}</div>}
        {!config && !error && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}

        {mondayNote && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
            Monday note: {mondayNote.label} typically {mondayNote.start}–{mondayNote.end}.
          </div>
        )}

        {config && config.chunks.map((chunk) => {
          const items = byChunk.get(chunk.id) ?? [];
          return (
            <section key={chunk.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{chunk.kind}</div>
                  <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white">{chunk.label}</h2>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{chunk.start}–{chunk.end} (Europe/Prague)</div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{items.length} task{items.length === 1 ? '' : 's'}</div>
              </div>

              {items.length === 0 ? (
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">No tasks pinned.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((item) => {
                    const needsReason = item.status === 'blocked' || item.status === 'not_done';
                    const reasonOk = !needsReason || (item.reason_code && (item.reason_text ?? '').trim().length >= 10);
                    return (
                      <div key={item.pinned_id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <button
                              type="button"
                              onClick={() => onNavigate(`/pmo/project/${encodeURIComponent(item.project_slug)}`)}
                              className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              title="Open project"
                            >
                              {item.project_title}
                            </button>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{item.action_text}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Action: {item.action_id} · Kind: {item.kind}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-500"
                            title="Remove from today"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <label className="text-xs text-slate-500 dark:text-slate-400">
                            Status
                            <select
                              value={item.status}
                              onChange={(e) => {
                                const status = e.target.value as DailyStatus;
                                handleUpdate(item, {
                                  status,
                                  reason_code: status === 'blocked' || status === 'not_done' ? item.reason_code : null,
                                  reason_text: status === 'blocked' || status === 'not_done' ? item.reason_text : null,
                                });
                              }}
                              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm"
                            >
                              <option value="done">Done</option>
                              <option value="ready_to_send">Ready to send</option>
                              <option value="blocked">Blocked</option>
                              <option value="not_done">Not done</option>
                            </select>
                          </label>

                          <label className="text-xs text-slate-500 dark:text-slate-400">
                            Reason code
                            <select
                              value={item.reason_code ?? ''}
                              disabled={!needsReason}
                              onChange={(e) => handleUpdate(item, { reason_code: (e.target.value || null) as ReasonCode | null })}
                              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm disabled:opacity-50"
                            >
                              <option value="">Select…</option>
                              {REASONS.map((r) => (
                                <option key={r.code} value={r.code}>{r.label}</option>
                              ))}
                            </select>
                          </label>

                          <label className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-1">
                            Reason text (min 10 chars)
                            <input
                              value={item.reason_text ?? ''}
                              disabled={!needsReason}
                              onChange={(e) => handleUpdate(item, { reason_text: e.target.value || null })}
                              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm disabled:opacity-50"
                              placeholder={needsReason ? 'Briefly explain…' : ''}
                            />
                          </label>
                        </div>

                        {needsReason && !reasonOk && (
                          <div className="mt-2 text-xs text-rose-600">Reason code and a brief explanation are required.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {config && (
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Export</div>
                <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white">Daily report & Agent Pack</h2>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Exports are read-only. The app does not write back to repo markdown.
                </div>
              </div>
              <button
                type="button"
                disabled={isExporting || pinned.length === 0}
                onClick={() => doDownloadExports()}
                className="px-4 py-3 rounded-xl font-black uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50"
              >
                {isExporting ? 'Exporting…' : 'Export'}
              </button>
            </div>

            {!exportReady && pinned.length > 0 && (
              <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Export is locked until blocked/not-done items have a reason code and a brief explanation.
              </div>
            )}
            {exportError && <div className="mt-3 text-sm text-rose-600">{exportError}</div>}

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={isExporting || pinned.length === 0 || !exportReady}
                onClick={() => doCopy('json')}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-50"
              >
                Copy JSON
              </button>
              <button
                type="button"
                disabled={isExporting || pinned.length === 0 || !exportReady}
                onClick={() => doCopy('markdown')}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-50"
              >
                Copy Markdown
              </button>
              <button
                type="button"
                disabled={isExporting || pinned.length === 0 || !exportReady}
                onClick={() => doCopy('prompt')}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-50"
              >
                Copy prompt
              </button>
              <button
                type="button"
                disabled={isExporting || pinned.length === 0 || !exportReady}
                onClick={() => doCopy('pack')}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 disabled:opacity-50"
              >
                Copy Agent Pack
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Tip: the Agent Pack includes today’s report plus the touched projects’ current 02_status.md and 03_actions.md.
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
