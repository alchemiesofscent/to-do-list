import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { PrimaryNav } from '../components/PrimaryNav.tsx';
import { SyncStatus as SyncStatusIndicator } from '../components/SyncStatus.tsx';
import { SearchIcon } from '../components/Icons.tsx';
import type { PmoConfig } from '../pmo/config.ts';
import { loadPmoConfig } from '../pmo/content.ts';
import { getAllPinnedItemsForSync, getDayPinnedItems, pinTodoTask, upsertPinnedItem, upsertPinnedItems, type PinnedItem } from '../pmo/dailyStorage.ts';
import { utcDateKey } from '../pmo/time.ts';
import { isSupabaseConfigured } from '../supabase.ts';
import type { SyncStatus } from '../sync.ts';
import { markPulledOnce } from '../syncState.ts';
import { setAuthReturnTo } from '../auth/returnTo.ts';
import { stripBase } from '../pmo/router.ts';
import type { TodoStep, TodoTask } from './types.ts';
import { loadTodoTasks, saveTodoTasks, todoStorageKeys } from './storage.ts';
import { mergeTodo, pullTodoFromCloud, syncTodoTasks } from './syncTodo.ts';
import { filterItemsToWindow, syncMyDayItems } from '../pmo/syncMyDay.ts';
import { dailyStatusFromTodoCompleted, reconcileTodoMyDayCompletionToday } from '../integration/todoMyDayCompletion.ts';

const SYNC_DEBOUNCE_MS = 800;
const DUE_SOON_DAYS = 7;
const DISPLAY_TZ = 'Europe/Prague';
const MY_DAY_DAYS_BACK = 30;

type TodoView = 'all' | 'important' | 'dueSoon';

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function addDaysToUtcDateKey(dateKey: string, days: number): string {
  const dt = new Date(`${dateKey}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function formatDueDateShort(dueDate: string): string {
  const dt = new Date(`${dueDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-GB', { timeZone: DISPLAY_TZ, month: 'short', day: 'numeric' }).format(dt);
}

function getDuePill(dueDate: string, todayKey: string): { label: string; className: string } {
  const tomorrowKey = addDaysToUtcDateKey(todayKey, 1);
  const formatted = formatDueDateShort(dueDate);

  if (dueDate < todayKey) {
    return {
      label: `Overdue (${formatted})`,
      className:
        'text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 px-2 py-0.5 rounded-full',
    };
  }
  if (dueDate === todayKey) {
    return {
      label: 'Today',
      className:
        'text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full',
    };
  }
  if (dueDate === tomorrowKey) {
    return {
      label: 'Tomorrow',
      className:
        'text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-0.5 rounded-full',
    };
  }
  return {
    label: formatted,
    className:
      'text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300 px-2 py-0.5 rounded-full',
  };
}

export const TodoPage: React.FC<{
  onNavigate: (path: string) => void;
  session: Session | null;
  storageScopeUserId: string | null;
}> = ({ onNavigate, session, storageScopeUserId }) => {
  const { storageKey: todoStorageKey, fallbackStorageKey: todoFallbackStorageKey } = todoStorageKeys(storageScopeUserId);

  const [tasks, setTasks] = useState<TodoTask[]>(() =>
    loadTodoTasks({ storageKey: todoStorageKey, fallbackStorageKey: todoFallbackStorageKey })
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<TodoView>('all');
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [pmoConfig, setPmoConfig] = useState<PmoConfig | null>(null);
  const [pinKind, setPinKind] = useState<'light' | 'admin'>('light');
  const [pinChunkId, setPinChunkId] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const todayKey = utcDateKey();
  const dueSoonUntilKey = addDaysToUtcDateKey(todayKey, DUE_SOON_DAYS);

  const visibleTasks = useMemo(() => tasks.filter((t) => !t.deletedAt), [tasks]);
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (t: TodoTask) => {
      if (!query) return true;
      if (t.title.toLowerCase().includes(query)) return true;
      if ((t.note ?? '').toLowerCase().includes(query)) return true;
      return (t.steps ?? []).some((s) => s.title.toLowerCase().includes(query));
    };
    const matchesView = (t: TodoTask) => {
      if (view === 'all') return true;
      if (view === 'important') return t.isImportant;
      return Boolean(t.dueDate) && (t.dueDate ?? '') <= dueSoonUntilKey;
    };

    return visibleTasks.filter((t) => matchesSearch(t) && matchesView(t));
  }, [dueSoonUntilKey, searchQuery, view, visibleTasks]);

  const openTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => !t.completed)
      .slice()
      .sort((a, b) => {
        if (view === 'dueSoon') {
          const aDue = a.dueDate ?? '9999-12-31';
          const bDue = b.dueDate ?? '9999-12-31';
          if (aDue !== bDue) return aDue.localeCompare(bDue);
        }
        if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
        return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      });
  }, [filteredTasks, view]);

  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter((t) => t.completed)
      .slice()
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [filteredTasks]);

  const syncSeqRef = useRef(0);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadPmoConfig().then(setPmoConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pmoConfig) return;
    if (pinChunkId) return;
    const initial = pmoConfig.chunks.find((c) => c.kind === pinKind)?.id ?? pmoConfig.chunks[0]?.id ?? 'chunk_1';
    setPinChunkId(initial);
  }, [pinChunkId, pinKind, pmoConfig]);

  const cancelPendingSync = useCallback(() => {
    if (syncTimerRef.current === null) return;
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = null;
  }, []);

  useEffect(() => cancelPendingSync, [cancelPendingSync]);

  const applyRemoteTasks = useCallback((next: TodoTask[]) => {
    cancelPendingSync();
    syncSeqRef.current += 1;
    setTasks(next);
  }, [cancelPendingSync]);

  const queueSync = useCallback(
    (nextTasks: TodoTask[], options?: { immediate?: boolean; allowBootstrapPush?: boolean }) => {
      if (!isSupabaseConfigured || !session || !navigator.onLine) return;

      cancelPendingSync();
      const seq = ++syncSeqRef.current;
      const delay = options?.immediate ? 0 : SYNC_DEBOUNCE_MS;

      syncTimerRef.current = window.setTimeout(async () => {
        const merged = await syncTodoTasks(nextTasks, setSyncStatus, { allowBootstrapPush: options?.allowBootstrapPush });
        if (seq !== syncSeqRef.current) return;
        applyRemoteTasks(merged);
      }, delay);
    },
    [applyRemoteTasks, cancelPendingSync, session]
  );

  const syncMyDayAfterExternalWrite = useCallback(async () => {
    if (!isSupabaseConfigured || !session || !navigator.onLine) return;

    const local1 = filterItemsToWindow(getAllPinnedItemsForSync(storageScopeUserId), { daysBack: MY_DAY_DAYS_BACK });
    const merged1 = await syncMyDayItems(local1, undefined, { daysBack: MY_DAY_DAYS_BACK, allowBootstrapPush: true });
    upsertPinnedItems(merged1, storageScopeUserId);

    // Second pass: once pulled, allow record-level pushes.
    const local2 = filterItemsToWindow(getAllPinnedItemsForSync(storageScopeUserId), { daysBack: MY_DAY_DAYS_BACK });
    const merged2 = await syncMyDayItems(local2, undefined, { daysBack: MY_DAY_DAYS_BACK, allowBootstrapPush: true });
    upsertPinnedItems(merged2, storageScopeUserId);
  }, [session, storageScopeUserId]);

  useEffect(() => {
    if (expandedId && !filteredTasks.some((t) => t.id === expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, filteredTasks]);

  useEffect(() => {
    const loaded = loadTodoTasks({ storageKey: todoStorageKey, fallbackStorageKey: todoFallbackStorageKey });
    applyRemoteTasks(loaded);

    // Local-only reconciliation with today's pinned PMO items.
    const pinnedToday = getDayPinnedItems(todayKey, storageScopeUserId);
    const reconciledLocal = reconcileTodoMyDayCompletionToday({ todoTasks: loaded, pinnedToday });
    if (reconciledLocal.changedPinnedIds.length > 0) upsertPinnedItems(reconciledLocal.nextPinnedToday, storageScopeUserId);
    if (reconciledLocal.changedTodoIds.length > 0) applyRemoteTasks(reconciledLocal.nextTodoTasks);

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
      applyRemoteTasks(merged);

      // Reconcile after incorporating cloud To Do changes (still local-only).
      const pinnedToday = getDayPinnedItems(todayKey, storageScopeUserId);
      const reconciled = reconcileTodoMyDayCompletionToday({ todoTasks: merged, pinnedToday });
      if (reconciled.changedPinnedIds.length > 0) upsertPinnedItems(reconciled.nextPinnedToday, storageScopeUserId);
      if (reconciled.changedTodoIds.length > 0) applyRemoteTasks(reconciled.nextTodoTasks);

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
      queueSync(tasks, { immediate: true });
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queueSync, session, tasks]);

  const openCloudSync = useCallback(() => {
    setAuthReturnTo(stripBase(window.location.pathname));
    onNavigate('/auth');
  }, [onNavigate]);

  const handleManualSync = useCallback(async () => {
    if (!session) {
      openCloudSync();
      return;
    }
    if (!isSupabaseConfigured || !navigator.onLine) return;

    cancelPendingSync();
    const seq = ++syncSeqRef.current;
    const merged = await syncTodoTasks(tasks, setSyncStatus, { allowBootstrapPush: true });
    if (seq !== syncSeqRef.current) return;
    applyRemoteTasks(merged);
  }, [applyRemoteTasks, cancelPendingSync, openCloudSync, session, tasks]);

  const upsertTask = (id: string, patch: Partial<TodoTask>) => {
    const now = new Date().toISOString();
    let completedChange: boolean | null = null;
    setTasks((prev) => {
      const before = prev.find((t) => t.id === id);
      if (before && typeof patch.completed === 'boolean' && patch.completed !== before.completed) {
        completedChange = patch.completed;
      }

      const nextTasks = prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now } : t));
      queueSync(nextTasks);
      return nextTasks;
    });

    // If this task is pinned into today's PMO plan, mirror completion into its PMO status.
    if (completedChange !== null) {
      const pinnedToday = getDayPinnedItems(todayKey, storageScopeUserId);
      const pinned = pinnedToday.find(
        (p): p is Extract<PinnedItem, { item_type: 'todo_task' }> => p.item_type === 'todo_task' && p.todo_id === id
      );
      if (pinned) {
        const nextStatus = dailyStatusFromTodoCompleted(pinned.status, completedChange);
        if (nextStatus !== pinned.status) {
          const clearReason = nextStatus === 'done' || nextStatus === 'ready_to_send';
          upsertPinnedItem(
            {
              ...pinned,
              status: nextStatus,
              updated_at_utc: now,
              reason_code: clearReason ? null : pinned.reason_code,
              reason_text: clearReason ? null : pinned.reason_text,
            },
            storageScopeUserId
          );
          void syncMyDayAfterExternalWrite();
        }
      }
    }
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

    setTasks((prev) => {
      const nextTasks = [task, ...prev];
      queueSync(nextTasks);
      return nextTasks;
    });
    setExpandedId(id);
    setDraftTitle('');
  };

  const deleteTask = (id: string) => {
    if (!confirm('Delete this To Do task?')) return;
    const now = new Date().toISOString();
    setTasks((prev) => {
      const nextTasks = prev.map((t) => (t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t));
      queueSync(nextTasks);
      return nextTasks;
    });
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

  const pinnedTodoIdsToday = useMemo(() => {
    const items = getDayPinnedItems(todayKey, storageScopeUserId);
    return new Set(items.filter((i) => i.item_type === 'todo_task').map((i) => i.todo_id));
  }, [storageScopeUserId, todayKey]);

  const pinToToday = useCallback((task: TodoTask) => {
    setPinError(null);

    if (!pmoConfig) {
      setPinError('PMO config is still loading. Try again in a moment.');
      return;
    }

    const pinnedCount = getDayPinnedItems(todayKey, storageScopeUserId).length;
    if (pinnedCount >= pmoConfig.defaults.max_tasks_per_day) {
      setPinError(`Guardrail: max ${pmoConfig.defaults.max_tasks_per_day} tasks per day.`);
      return;
    }

    const chunkId = pinChunkId || pmoConfig.chunks[0]?.id || 'chunk_1';
    pinTodoTask(
      { dateUtc: todayKey, chunkId, todoId: task.id, titleSnapshot: task.title, kind: pinKind },
      storageScopeUserId
    );

    onNavigate('/pmo/daily');
  }, [onNavigate, pinChunkId, pinKind, pmoConfig, storageScopeUserId, todayKey]);

  const toggleExpanded = useCallback((taskId: string) => {
    setExpandedId((prev) => (prev === taskId ? null : taskId));
  }, []);

  const renderTaskItem = (t: TodoTask) => {
    const isExpanded = expandedId === t.id;
    const isPinnedToday = pinnedTodoIdsToday.has(t.id);
    const duePill = t.dueDate ? getDuePill(t.dueDate, todayKey) : null;

    return (
      <li key={t.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleExpanded(t.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpanded(t.id);
            }
          }}
          className={`w-full flex items-start justify-between gap-3 px-3 py-3 cursor-pointer ${
            isExpanded ? 'bg-slate-50 dark:bg-slate-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => upsertTask(t.id, { completed: !t.completed })}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 rounded border-slate-300 dark:border-slate-600"
            />
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-semibold truncate ${
                  t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                }`}
              >
                {t.title}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                {isPinnedToday && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                    Pinned today
                  </span>
                )}
                {t.isImportant && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    Important
                  </span>
                )}
                {duePill && <span className={duePill.className}>{duePill.label}</span>}
                {(t.steps?.length ?? 0) > 0 && (
                  <span>
                    {(t.steps ?? []).filter((s) => s.completed).length}/{t.steps.length} steps
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
            <span className="text-slate-400 dark:text-slate-500 text-sm">{isExpanded ? '▾' : '▸'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Task</div>
                <input
                  value={t.title}
                  onChange={(e) => upsertTask(t.id, { title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => upsertTask(t.id, { completed: !t.completed })}
                  className={`px-4 py-2 rounded-xl font-bold text-sm ${
                    t.completed
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {t.completed ? 'Mark open' : 'Mark done'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(t.id)}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Due date (UTC)
                <input
                  type="date"
                  value={t.dueDate ?? ''}
                  onChange={(e) => upsertTask(t.id, { dueDate: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Important
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={t.isImportant}
                    onChange={(e) => upsertTask(t.id, { isImportant: e.target.checked })}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{t.isImportant ? 'Yes' : 'No'}</span>
                </div>
              </label>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    My Day (PMO)
                  </div>
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
                    onClick={() => pinToToday(t)}
                    className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  >
                    Pin to today
                  </button>
                </div>
              )}

              {pinError && <div className="mt-2 text-xs text-rose-600">{pinError}</div>}
            </div>

            <label className="block text-xs text-slate-500 dark:text-slate-400">
              Note
              <textarea
                value={t.note}
                onChange={(e) => upsertTask(t.id, { note: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Steps</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {(t.steps ?? []).filter((s) => s.completed).length}/{t.steps.length} completed
                  </div>
                </div>
                <StepComposer onAdd={(title) => addStep(t.id, title)} />
              </div>

              {(t.steps?.length ?? 0) === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No steps.</div>
              ) : (
                <ul className="space-y-2">
                  {t.steps.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                      <input
                        type="checkbox"
                        checked={s.completed}
                        onChange={() => toggleStep(t.id, s.id)}
                        className="mt-1 rounded border-slate-300 dark:border-slate-600"
                      />
                      <div
                        className={`flex-1 text-sm ${
                          s.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {s.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(t.id, s.id)}
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
      </li>
    );
  };

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
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
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

            <div className="text-xs text-slate-400 dark:text-slate-500">
              {visibleTasks.filter((t) => !t.completed).length} open · {visibleTasks.length} total
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, note, steps…"
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full placeholder:text-slate-400"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {(['all', 'important', 'dueSoon'] as const).map((key) => {
                const isActive = view === key;
                const label = key === 'all' ? 'All' : key === 'important' ? 'Important' : `Due ≤${DUE_SOON_DAYS}d`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
                    }`}
                    aria-pressed={isActive}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
          {openTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 p-3">
              {visibleTasks.length === 0
                ? 'No tasks yet.'
                : searchQuery.trim() || view !== 'all'
                  ? 'No tasks match your filters.'
                  : 'No open tasks.'}
            </div>
          ) : (
            <div className="space-y-4">
              {openTasks.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 p-3">No open tasks in this view.</div>
              ) : (
                <ul className="space-y-3">{openTasks.map(renderTaskItem)}</ul>
              )}

              {completedTasks.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCompletedExpanded((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Completed
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {completedTasks.length}
                      </span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-sm">{completedExpanded ? '▾' : '▸'}</span>
                  </button>

                  {completedExpanded && <ul className="mt-3 space-y-3">{completedTasks.map(renderTaskItem)}</ul>}
                </div>
              )}
            </div>
          )}
        </section>
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
