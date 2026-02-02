import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { PrimaryNav } from '../components/PrimaryNav.tsx';
import { SyncStatus as SyncStatusIndicator } from '../components/SyncStatus.tsx';
import type { PmoConfig } from '../pmo/config.ts';
import { loadPmoConfig } from '../pmo/content.ts';
import { getDayPinnedItems, pinTodoTask } from '../pmo/dailyStorage.ts';
import { utcDateKey } from '../pmo/time.ts';
import { isSupabaseConfigured } from '../supabase.ts';
import type { SyncStatus } from '../sync.ts';
import { markPulledOnce } from '../syncState.ts';
import { setAuthReturnTo } from '../auth/returnTo.ts';
import { stripBase } from '../pmo/router.ts';
import type { TodoStep, TodoTask } from './types.ts';
import { loadTodoTasks, saveTodoTasks } from './storage.ts';
import { mergeTodo, pullTodoFromCloud, syncTodoTasks } from './syncTodo.ts';

const TODO_DB_KEY = 'scholar_opus_todo_db';

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatLocalDueDate(dueDate: string | null): string {
  if (!dueDate) return '';
  return dueDate;
}

export const TodoPage: React.FC<{
  onNavigate: (path: string) => void;
  session: Session | null;
  storageScopeUserId: string | null;
}> = ({ onNavigate, session, storageScopeUserId }) => {
  const todoStorageKey = storageScopeUserId ? `${TODO_DB_KEY}:${storageScopeUserId}` : TODO_DB_KEY;
  const todoFallbackStorageKey = storageScopeUserId ? TODO_DB_KEY : undefined;

  const [tasks, setTasks] = useState<TodoTask[]>(() =>
    loadTodoTasks({ storageKey: todoStorageKey, fallbackStorageKey: todoFallbackStorageKey })
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [showCompleted, setShowCompleted] = useState(false);
  const [pmoConfig, setPmoConfig] = useState<PmoConfig | null>(null);
  const [pinKind, setPinKind] = useState<'light' | 'admin'>('light');
  const [pinChunkId, setPinChunkId] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const visibleTasks = useMemo(() => tasks.filter((t) => !t.deletedAt), [tasks]);
  const displayedTasks = useMemo(() => {
    const list = showCompleted ? visibleTasks : visibleTasks.filter((t) => !t.completed);
    return list.slice().sort((a, b) => {
      if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
  }, [showCompleted, visibleTasks]);

  const selected = useMemo(
    () => (selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null),
    [selectedId, tasks]
  );

  useEffect(() => {
    loadPmoConfig().then(setPmoConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pmoConfig) return;
    if (pinChunkId) return;
    const initial = pmoConfig.chunks.find((c) => c.kind === pinKind)?.id ?? pmoConfig.chunks[0]?.id ?? 'chunk_1';
    setPinChunkId(initial);
  }, [pinChunkId, pinKind, pmoConfig]);

  useEffect(() => {
    if (selectedId && !tasks.some((t) => t.id === selectedId && !t.deletedAt)) {
      setSelectedId(displayedTasks[0]?.id ?? null);
    }
  }, [displayedTasks, selectedId, tasks]);

  useEffect(() => {
    const loaded = loadTodoTasks({ storageKey: todoStorageKey, fallbackStorageKey: todoFallbackStorageKey });
    setTasks(loaded);

    if (!isSupabaseConfigured || !session) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    const doInitialPull = async () => {
      setSyncStatus('syncing');
      const cloud = await pullTodoFromCloud();
      if (!cloud) {
        setSyncStatus('error');
        return;
      }
      markPulledOnce(new Date().toISOString(), { entity: 'todo', scopeUserId: session.user.id });
      const merged = mergeTodo(loaded, cloud);
      setTasks(merged);
      setSyncStatus('synced');
    };

    doInitialPull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoStorageKey, session?.user.id]);

  useEffect(() => {
    saveTodoTasks({ storageKey: todoStorageKey, tasks });
  }, [tasks, todoStorageKey]);

  useEffect(() => {
    const handleOnline = () => {
      if (!isSupabaseConfigured || !session) return;
      syncTodoTasks(tasks, setSyncStatus).then((merged) => setTasks(merged));
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, tasks]);

  const openCloudSync = useCallback(() => {
    setAuthReturnTo(stripBase(window.location.pathname));
    onNavigate('/auth');
  }, [onNavigate]);

  const syncAfterChange = useCallback(
    async (nextTasks: TodoTask[]) => {
      if (!isSupabaseConfigured || !session || !navigator.onLine) return;
      const merged = await syncTodoTasks(nextTasks, setSyncStatus);
      setTasks(merged);
    },
    [session]
  );

  const handleManualSync = useCallback(async () => {
    if (!session) {
      openCloudSync();
      return;
    }
    if (!isSupabaseConfigured || !navigator.onLine) return;
    const merged = await syncTodoTasks(tasks, setSyncStatus, { allowBootstrapPush: true });
    setTasks(merged);
  }, [openCloudSync, session, tasks]);

  const upsertTask = (id: string, patch: Partial<TodoTask>) => {
    const now = new Date().toISOString();
    const nextTasks = tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
    setTasks(nextTasks);
    syncAfterChange(nextTasks);
  };

  const addTask = () => {
    const title = draftTitle.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const id = newId();

    const task: TodoTask = {
      id,
      title,
      completed: false,
      isImportant: false,
      dueDate: null,
      note: '',
      steps: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const nextTasks = [task, ...tasks];
    setTasks(nextTasks);
    setSelectedId(id);
    setDraftTitle('');
    syncAfterChange(nextTasks);
  };

  const deleteTask = (id: string) => {
    if (!confirm('Delete this To Do task?')) return;
    const now = new Date().toISOString();
    const nextTasks = tasks.map((t) => (t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t));
    setTasks(nextTasks);
    syncAfterChange(nextTasks);
  };

  const addStep = (taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const step: TodoStep = { id: newId(), title: trimmed, completed: false };
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    upsertTask(taskId, { steps: [...(task.steps ?? []), step] });
  };

  const toggleStep = (taskId: string, stepId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    upsertTask(taskId, {
      steps: (task.steps ?? []).map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)),
    });
  };

  const removeStep = (taskId: string, stepId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    upsertTask(taskId, { steps: (task.steps ?? []).filter((s) => s.id !== stepId) });
  };

  const isPinnedToday = useMemo(() => {
    if (!selected) return false;
    const today = utcDateKey();
    const items = getDayPinnedItems(today, storageScopeUserId);
    return items.some((i) => i.item_type === 'todo_task' && i.todo_id === selected.id);
  }, [selected, storageScopeUserId]);

  const pinToToday = useCallback(() => {
    if (!selected) return;
    setPinError(null);

    if (!pmoConfig) {
      setPinError('PMO config is still loading. Try again in a moment.');
      return;
    }

    const today = utcDateKey();
    const pinnedCount = getDayPinnedItems(today, storageScopeUserId).length;
    if (pinnedCount >= pmoConfig.defaults.max_tasks_per_day) {
      setPinError(`Guardrail: max ${pmoConfig.defaults.max_tasks_per_day} tasks per day.`);
      return;
    }

    const chunkId = pinChunkId || pmoConfig.chunks[0]?.id || 'chunk_1';
    pinTodoTask(
      { dateUtc: today, chunkId, todoId: selected.id, titleSnapshot: selected.title, kind: pinKind },
      storageScopeUserId
    );

    onNavigate('/pmo/daily');
  }, [onNavigate, pinChunkId, pinKind, pmoConfig, selected, storageScopeUserId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <PrimaryNav active="todo" onNavigate={onNavigate} />
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">To Do</div>
            <div className="font-serif text-lg font-bold text-slate-900 dark:text-white">My tasks</div>
          </div>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured && (
              <>
                <SyncStatusIndicator status={syncStatus} onManualSync={handleManualSync} />
                <button
                  type="button"
                  onClick={openCloudSync}
                  className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Cloud sync"
                >
                  Cloud
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex-1 flex gap-2">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask();
              }}
              placeholder="Add a task…"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm"
            />
            <button
              type="button"
              onClick={addTask}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            >
              Add
            </button>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Show completed
            </label>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {visibleTasks.filter((t) => !t.completed).length} open · {visibleTasks.length} total
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
            {displayedTasks.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 p-3">No tasks yet.</div>
            ) : (
              <ul className="space-y-2">
                {displayedTasks.map((t) => {
                  const isSelected = selectedId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                          isSelected
                            ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-900/40'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => upsertTask(t.id, { completed: !t.completed })}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 rounded border-slate-300 dark:border-slate-600"
                          />
                          <div className="flex-1">
                            <div className={`text-sm font-semibold ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {t.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-2 mt-1">
                              {t.isImportant && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Important</span>}
                              {t.dueDate && <span className="font-mono">{formatLocalDueDate(t.dueDate)}</span>}
                              {(t.steps?.length ?? 0) > 0 && (
                                <span>
                                  {(t.steps ?? []).filter((s) => s.completed).length}/{t.steps.length} steps
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              upsertTask(t.id, { isImportant: !t.isImportant });
                            }}
                            className={`text-xs font-bold px-2 py-1 rounded-lg ${
                              t.isImportant
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-400'
                            }`}
                            title="Toggle important"
                          >
                            {t.isImportant ? '★' : '☆'}
                          </button>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
            {!selected ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Select a task to view details.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Task</div>
                    <input
                      value={selected.title}
                      onChange={(e) => upsertTask(selected.id, { title: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => upsertTask(selected.id, { completed: !selected.completed })}
                      className={`px-4 py-2 rounded-xl font-bold text-sm ${
                        selected.completed
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {selected.completed ? 'Mark open' : 'Mark done'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(selected.id)}
                      className="px-4 py-2 rounded-xl font-bold text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">My Day (PMO)</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Pin this task into today’s plan.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('/pmo/daily')}
                      className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100"
                    >
                      Open today
                    </button>
                  </div>

                  {isPinnedToday ? (
                    <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">Pinned to today.</div>
                  ) : (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Kind
                          <select
                            value={pinKind}
                            onChange={(e) => setPinKind(e.target.value as 'light' | 'admin')}
                            className="mt-1 w-full sm:w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm"
                          >
                            <option value="light">Light</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Slot
                          <select
                            value={pinChunkId}
                            onChange={(e) => setPinChunkId(e.target.value)}
                            className="mt-1 w-full sm:w-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-2 text-sm"
                            disabled={!pmoConfig}
                          >
                            {pmoConfig?.chunks.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label} ({c.start}–{c.end})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={pinToToday}
                        className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      >
                        Pin to today
                      </button>
                    </div>
                  )}

                  {pinError && <div className="mt-2 text-xs text-rose-600">{pinError}</div>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Due date (UTC)
                    <input
                      type="date"
                      value={selected.dueDate ?? ''}
                      onChange={(e) => upsertTask(selected.id, { dueDate: e.target.value || null })}
                      className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Important
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.isImportant}
                        onChange={(e) => upsertTask(selected.id, { isImportant: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {selected.isImportant ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </label>
                </div>

                <label className="block text-xs text-slate-500 dark:text-slate-400">
                  Note
                  <textarea
                    value={selected.note}
                    onChange={(e) => upsertTask(selected.id, { note: e.target.value })}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Steps</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {(selected.steps ?? []).filter((s) => s.completed).length}/{selected.steps.length} completed
                      </div>
                    </div>
                    <StepComposer
                      onAdd={(title) => addStep(selected.id, title)}
                    />
                  </div>

                  {(selected.steps?.length ?? 0) === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">No steps.</div>
                  ) : (
                    <ul className="space-y-2">
                      {selected.steps.map((s) => (
                        <li key={s.id} className="flex items-start gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() => toggleStep(selected.id, s.id)}
                            className="mt-1 rounded border-slate-300 dark:border-slate-600"
                          />
                          <div className={`flex-1 text-sm ${s.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {s.title}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStep(selected.id, s.id)}
                            className="text-xs font-bold text-slate-400 hover:text-rose-500"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const StepComposer: React.FC<{ onAdd: (title: string) => void }> = ({ onAdd }) => {
  const [draft, setDraft] = useState('');
  return (
    <div className="flex gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const title = draft.trim();
          if (!title) return;
          onAdd(title);
          setDraft('');
        }}
        placeholder="Add step…"
        className="w-40 sm:w-56 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm"
      />
      <button
        type="button"
        onClick={() => {
          const title = draft.trim();
          if (!title) return;
          onAdd(title);
          setDraft('');
        }}
        className="px-3 py-2 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100"
      >
        Add
      </button>
    </div>
  );
};
