import React, { useEffect, useMemo, useState } from 'react';
import { loadPmoConfig, loadProjectBundle } from './content.ts';
import { MarkdownView } from './MarkdownView.tsx';
import { parseActionsFromDoc } from './projectActions.ts';
import { pinAction, getDayPinnedItems } from './dailyStorage.ts';
import { utcDateKey } from './time.ts';
import type { PmoConfig } from './config.ts';
import { PrimaryNav } from '../components/PrimaryNav.tsx';

export const PmoProjectPage: React.FC<{
  projectSlug: string;
  onNavigate: (path: string) => void;
  storageScopeUserId: string | null;
}> = ({ projectSlug, onNavigate, storageScopeUserId }) => {
  const [config, setConfig] = useState<PmoConfig | null>(null);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof loadProjectBundle>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'brief' | 'plan' | 'status' | 'actions' | 'assets'>('actions');
  const [chunkId, setChunkId] = useState<string>('chunk_1');
  const [pinError, setPinError] = useState<string | null>(null);
  const dateUtc = useMemo(() => utcDateKey(), []);

  useEffect(() => {
    loadPmoConfig().then(setConfig).catch(() => {});
    loadProjectBundle(projectSlug)
      .then(setBundle)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load project'));
  }, [projectSlug]);

  useEffect(() => {
    if (config?.chunks?.[0]?.id) setChunkId(config.chunks[0].id);
  }, [config]);

  const briefFm = bundle?.docs['00_brief.md'].frontmatter ?? {};
  const projectId = String(briefFm.project_id ?? projectSlug);
  const projectTitle = String(briefFm.title ?? projectSlug);

  const actionsParse = useMemo(() => {
    if (!bundle) return { actions: [], errors: [] as string[] };
    return parseActionsFromDoc(bundle.docs['03_actions.md']);
  }, [bundle]);

  const openActions = actionsParse.actions.filter((a) => a.status === 'open');

  const deepProjectsToday = useMemo(() => {
    const set = new Set<string>();
    for (const item of getDayPinnedItems(dateUtc, storageScopeUserId)) {
      if (item.item_type === 'pmo_action' && item.kind === 'deep') set.add(item.project_id);
    }
    return set;
  }, [dateUtc, storageScopeUserId]);

  const pinnedCount = useMemo(() => getDayPinnedItems(dateUtc, storageScopeUserId).length, [dateUtc, storageScopeUserId]);

  const canPin = (kind: 'deep' | 'light' | 'admin') => {
    if (!config) return true;
    if (pinnedCount >= config.defaults.max_tasks_per_day) return false;
    if (kind === 'deep') {
      const set = new Set(deepProjectsToday);
      set.add(projectId);
      if (set.size > config.defaults.max_deep_work_projects_per_day) return false;
    }
    return true;
  };

  const doPin = (actionId: string, actionText: string, kind: 'deep' | 'light' | 'admin') => {
    setPinError(null);
    if (!config) return;
    if (pinnedCount >= config.defaults.max_tasks_per_day) {
      setPinError(`Guardrail: max ${config.defaults.max_tasks_per_day} tasks per day.`);
      return;
    }
    if (kind === 'deep') {
      const set = new Set(deepProjectsToday);
      set.add(projectId);
      if (set.size > config.defaults.max_deep_work_projects_per_day) {
        setPinError(`Guardrail: max ${config.defaults.max_deep_work_projects_per_day} deep-work projects per day.`);
        return;
      }
    }
    pinAction({
      dateUtc,
      chunkId,
      projectId,
      projectSlug,
      projectTitle,
      actionId,
      actionText,
      kind,
    }, storageScopeUserId);
    onNavigate('/pmo/daily');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <PrimaryNav active="pmo" onNavigate={onNavigate} />
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">PMO — Project</div>
            <div className="font-serif text-lg font-bold text-slate-900 dark:text-white">{projectTitle}</div>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
            <div className="font-mono">{projectId}</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">{error}</div>}
        {!bundle && !error && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}

        {bundle && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                {(['actions', 'brief', 'plan', 'status', 'assets'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${
                      tab === t
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                        : 'bg-white dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {config && tab === 'actions' && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pin to</div>
                  <select
                    value={chunkId}
                    onChange={(e) => setChunkId(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm"
                  >
                    {config.chunks.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.start}–{c.end})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {pinError && <div className="mt-3 text-sm text-rose-600">{pinError}</div>}

            <div className="mt-4">
              {tab === 'brief' && <MarkdownView markdown={bundle.docs['00_brief.md'].body} />}
              {tab === 'plan' && <MarkdownView markdown={bundle.docs['01_plan.md'].body} />}
              {tab === 'status' && <MarkdownView markdown={bundle.docs['02_status.md'].body} />}
              {tab === 'assets' && <MarkdownView markdown={bundle.docs['04_assets.md'].body} />}

              {tab === 'actions' && (
                <div className="space-y-4">
                  {actionsParse.errors.length > 0 && (
                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                      {actionsParse.errors.join(' ')}
                    </div>
                  )}

                  {openActions.length === 0 ? (
                    <div className="text-slate-500 dark:text-slate-400">No open actions available to pin.</div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/40">
                          <tr>
                            <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Action</th>
                            <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Kind</th>
                            <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Blocked</th>
                            <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Due</th>
                            <th className="text-right px-3 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Pin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openActions.map((a) => (
                            <tr key={a.action_id} className="border-t border-slate-100 dark:border-slate-700">
                              <td className="px-3 py-2 text-slate-900 dark:text-white">
                                <div className="font-medium">{a.action}</div>
                                <div className="text-slate-500 dark:text-slate-400">ID: {a.action_id} · Effort: {a.effort}</div>
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{a.kind}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{a.blocked}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{a.due_date || '—'}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  disabled={a.blocked === 'yes' || !canPin(a.kind)}
                                  onClick={() => doPin(a.action_id, a.action, a.kind)}
                                  className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50"
                                >
                                  Pin
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Only actions with status=open are pin-eligible. The app does not edit project markdown.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
