import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AcademicTask, Domain, TaskType } from './types.ts';
import { INITIAL_TASKS, PROJECTS_MD_REVISION } from './initialData.ts';
import { loadTasksFromDb, saveTasksToDb } from './db.ts';
import { StatsFilterKey, StatsOverview } from './components/StatsOverview.tsx';
import { AcademicTaskList } from './components/AcademicTaskList.tsx';
import { TaskForm } from './components/TaskForm.tsx';
import { SearchIcon, FilterIcon, PlusIcon, BookIcon, SunIcon, MoonIcon, MonitorIcon, MenuIcon, XIcon } from './components/Icons.tsx';
import { syncTasks, deleteFromCloud, pullFromCloud, pushToCloud, type SyncStatus } from './sync.ts';
import { isSupabaseConfigured } from './supabase.ts';
import { SyncStatus as SyncStatusIndicator } from './components/SyncStatus.tsx';

type Theme = 'light' | 'dark' | 'system';

const DOMAIN_TABS: { key: Domain; label: string }[] = [
  { key: 'Writing', label: 'Writing' },
  { key: 'Experiments', label: 'Experiments' },
  { key: 'DH', label: 'DH' },
  { key: 'Grants', label: 'Grants' },
  { key: 'Admin', label: 'Admin' },
];

// Map task types directly to domains
const TYPE_TO_DOMAIN: Partial<Record<TaskType, Domain>> = {
  'Experiment': 'Experiments',
  'Admin Task': 'Admin',
  'Digital Humanities': 'DH',
  'Grant': 'Grants',
  // All others default to 'Writing'
};

const classifyTaskDomain = (task: AcademicTask): Domain => {
  if (task.domain) return task.domain;

  // Check type-based mapping first
  const domainFromType = TYPE_TO_DOMAIN[task.type];
  if (domainFromType) return domainFromType;

  // Fallback heuristics for legacy data without explicit type
  const section = (task.section ?? '').toLowerCase();
  const subsection = (task.subsection ?? '').toLowerCase();
  const title = task.title.toLowerCase();
  const description = task.description.toLowerCase();
  const combined = `${title}\n${description}`;

  if (section.includes('grants & admin') || section.includes('grants')) return 'Grants';

  const looksDh =
    section.includes('digital humanities') ||
    /\b(tei|teitok|portal|database|data model|model|dioscorides|disambiguat|github)\b/i.test(combined);
  if (looksDh) return 'DH';

  const looksExperiment =
    task.status === 'Experimental' ||
    subsection.includes('experimental philology') ||
    /\b(experimental|replicat|residue|volatile|fraction|susinum|stacte|stypsis|mendesian|kyphi)\b/i.test(combined);
  if (looksExperiment) return 'Experiments';

  return 'Writing';
};

const applyStatsFilter = (tasks: AcademicTask[], filter: StatsFilterKey): AcademicTask[] => {
  if (filter === 'total') return tasks;
  if (filter === 'published') return tasks.filter((t) => t.status === 'Published');
  if (filter === 'highPriority') return tasks.filter((t) => t.priority === 'High');
  return tasks.filter((t) => ['Draft', 'Revision', 'Experimental'].includes(t.status));
};

const MobileDrawer: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-t-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-100 dark:border-slate-700 p-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close drawer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [tasks, setTasks] = useState<AcademicTask[]>(() =>
    loadTasksFromDb({ seedTasks: INITIAL_TASKS, seedRevision: PROJECTS_MD_REVISION })
  );
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('scholar_opus_theme') as Theme) || 'system';
  });
  const [taskToEdit, setTaskToEdit] = useState<AcademicTask | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<TaskType | 'All'>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'type' | 'title'>('priority');
  const [activeStatsFilter, setActiveStatsFilter] = useState<StatsFilterKey>('total');
  const [activeDomainTab, setActiveDomainTab] = useState<Domain>(() => {
    const saved = localStorage.getItem('scholar_opus_domain_tab');
    const validTabs = new Set(DOMAIN_TABS.map((t) => t.key));
    if (saved && validTabs.has(saved as Domain)) return saved as Domain;
    return 'Writing';
  });
  const [isTabsDrawerOpen, setIsTabsDrawerOpen] = useState(false);
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Save to localStorage whenever tasks change
  useEffect(() => {
    saveTasksToDb({ tasks, seedRevision: PROJECTS_MD_REVISION });
  }, [tasks]);

  // Sync with cloud on app load - pull only, don't push seed data
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const doInitialSync = async () => {
      setSyncStatus('syncing');
      const cloudTasks = await pullFromCloud();

      if (cloudTasks && cloudTasks.length > 0) {
        // Cloud has data - use it as source of truth
        setTasks(cloudTasks);
        setSyncStatus('synced');
      } else if (cloudTasks !== null) {
        // Cloud is empty but reachable - push local data
        await pushToCloud(tasks);
        setSyncStatus('synced');
      } else {
        // Cloud unreachable
        setSyncStatus('error');
      }
    };

    doInitialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (isSupabaseConfigured) {
        syncTasks(tasks, setSyncStatus).then((merged) => {
          if (merged !== tasks) setTasks(merged);
        });
      }
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline status
    if (!navigator.onLine) setSyncStatus('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tasks]);

  // Sync after task changes (debounced)
  const syncAfterChange = useCallback(async (updatedTasks: AcademicTask[]) => {
    if (!isSupabaseConfigured || !navigator.onLine) return;
    await syncTasks(updatedTasks, setSyncStatus);
  }, []);

  useEffect(() => {
    const anyOpen = isTabsDrawerOpen || isFiltersDrawerOpen || isActionsDrawerOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTabsDrawerOpen, isFiltersDrawerOpen, isActionsDrawerOpen]);

  useEffect(() => {
    localStorage.setItem('scholar_opus_domain_tab', activeDomainTab);
  }, [activeDomainTab]);

  useEffect(() => {
    localStorage.setItem('scholar_opus_theme', theme);
    const root = window.document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    if (theme === 'dark') applyTheme(true);
    else if (theme === 'light') applyTheme(false);
    else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [theme]);

  const handleSaveTask = (taskData: Omit<AcademicTask, 'id'>) => {
    const now = new Date().toISOString();
    const normalizedTaskData: Omit<AcademicTask, 'id'> = {
      ...taskData,
      domain: taskToEdit?.domain ?? taskData.domain ?? activeDomainTab,
      coAuthors: taskData.coAuthors?.trim() ? taskData.coAuthors.trim() : undefined,
      deadline: taskData.deadline?.trim() ? taskData.deadline.trim() : undefined,
      deadlineNote: taskData.deadlineNote?.trim() ? taskData.deadlineNote.trim() : undefined,
      description: taskData.description ?? '',
      updatedAt: now,
    };

    let updatedTasks: AcademicTask[];
    if (taskToEdit) {
      updatedTasks = tasks.map(t => t.id === taskToEdit.id ? { ...normalizedTaskData, id: taskToEdit.id } : t);
    } else {
      const newTask: AcademicTask = {
        ...normalizedTaskData,
        id: Math.random().toString(36).substr(2, 9),
      };
      updatedTasks = [newTask, ...tasks];
    }
    setTasks(updatedTasks);
    syncAfterChange(updatedTasks);
    closeForm();
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setTaskToEdit(undefined);
  };

  const openEditForm = (task: AcademicTask) => {
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  const toggleFavorite = (id: string) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite, updatedAt: now } : t);
    setTasks(updatedTasks);
    syncAfterChange(updatedTasks);
  };

  const deleteTask = async (id: string) => {
    if (confirm('Are you sure you want to remove this project?')) {
      const updatedTasks = tasks.filter(t => t.id !== id);
      setTasks(updatedTasks);
      // Delete from cloud as well
      await deleteFromCloud(id);
      syncAfterChange(updatedTasks);
    }
  };

  const updateTaskField = (id: string, updates: Partial<AcademicTask>) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t);
    setTasks(updatedTasks);
    syncAfterChange(updatedTasks);
  };

  const domainCounts = useMemo(() => {
    const counts: Record<Domain, number> = { Writing: 0, Experiments: 0, DH: 0, Grants: 0, Admin: 0 };
    for (const task of tasks) counts[classifyTaskDomain(task)]++;
    return counts;
  }, [tasks]);

  const tasksAfterPrimaryFilters = useMemo(() => {
    const result = tasks.filter(t => classifyTaskDomain(t) === activeDomainTab).filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTypeFilter === 'All' || t.type === activeTypeFilter;
      return matchesSearch && matchesType;
    });

    return result.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityMap = { High: 0, Medium: 1, Low: 2, Aspirational: 3 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      }
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return a.title.localeCompare(b.title);
    });
  }, [tasks, activeDomainTab, searchQuery, activeTypeFilter, sortBy]);

  const displayedTasks = useMemo(
    () => applyStatsFilter(tasksAfterPrimaryFilters, activeStatsFilter),
    [tasksAfterPrimaryFilters, activeStatsFilter]
  );

  const taskTypes: (TaskType | 'All')[] = [
    'All', 'Article', 'Book', 'Translation', 'Edited Volume', 'Book Review', 'Digital Humanities', 'Grant', 'Book Proposal', 'Experiment', 'Admin Task'
  ];

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeTypeFilter !== 'All') count++;
    if (searchQuery.trim()) count++;
    if (sortBy !== 'priority') count++;
    if (activeStatsFilter !== 'total') count++;
    return count;
  }, [activeTypeFilter, searchQuery, sortBy, activeStatsFilter]);

  const resetFilters = () => {
    setActiveTypeFilter('All');
    setSearchQuery('');
    setSortBy('priority');
    setActiveStatsFilter('total');
  };

  const handleManualSync = useCallback(async () => {
    if (!isSupabaseConfigured || !navigator.onLine) return;
    const merged = await syncTasks(tasks, setSyncStatus);
    if (merged !== tasks) setTasks(merged);
  }, [tasks]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 dark:bg-slate-100 p-1.5 rounded-lg shadow-sm">
              <BookIcon className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <h1 className="font-serif text-xl font-bold text-slate-900 dark:text-white tracking-tight">Scholar's Opus</h1>
            {isSupabaseConfigured && (
              <SyncStatusIndicator status={syncStatus} onManualSync={handleManualSync} />
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Control Center */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {/* Theme Selector */}
              <div className="flex items-center border-r border-slate-200 dark:border-slate-700 pr-1 mr-1">
                 <button 
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <SunIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <MoonIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={`p-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <MonitorIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Editing Mode */}
              <button 
                onClick={() => setIsEditingMode(!isEditingMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest ${
                  isEditingMode 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {isEditingMode ? 'Editing' : 'Locked'}
                <div className={`w-1.5 h-1.5 rounded-full ${isEditingMode ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsActionsDrawerOpen(true)}
              className="sm:hidden bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              aria-label="Open actions"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="hidden sm:flex bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-2 sm:px-4 sm:py-2 rounded-full sm:rounded-lg font-bold text-sm items-center gap-2 hover:opacity-90 transition-all shadow active:scale-95"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="font-serif text-4xl font-bold text-slate-900 dark:text-white mb-3">Research Corpus</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg leading-relaxed">
            A comprehensive catalog of academic output, technical replications, and ongoing philological studies.
          </p>
        </div>

        <div className="mb-6 flex justify-center sm:justify-start">
          <div className="hidden sm:inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm">
            {DOMAIN_TABS.map((tab) => {
              const isActive = tab.key === activeDomainTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveDomainTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 dark:bg-slate-900/10'
                        : 'bg-slate-100 dark:bg-slate-900/50'
                    }`}
                  >
                    {domainCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsTabsDrawerOpen(true)}
            className="sm:hidden w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">View</span>
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {activeDomainTab}
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                {domainCounts[activeDomainTab]}
              </span>
            </span>
          </button>
        </div>

        <StatsOverview
          tasks={tasksAfterPrimaryFilters}
          activeFilter={activeStatsFilter}
          onSelectFilter={(next) => setActiveStatsFilter((current) => (current === next ? 'total' : next))}
        />

        {/* Filters Sticky Bar */}
        <div className="sm:hidden mb-6 sticky top-16 bg-slate-50 dark:bg-slate-900 py-3 z-30">
          <button
            type="button"
            onClick={() => setIsFiltersDrawerOpen(true)}
            className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm"
          >
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm">
              <FilterIcon className="w-4 h-4 text-slate-400" />
              Filters
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {activeFilterCount === 0 ? 'None' : `${activeFilterCount} Active`}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex flex-row items-center gap-4 mb-8 sticky top-16 bg-slate-50 dark:bg-slate-900 py-4 z-30">
          <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <FilterIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type:</label>
            <select
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              value={activeTypeFilter}
              onChange={(e) => setActiveTypeFilter(e.target.value as TaskType | 'All')}
            >
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700">
            <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none w-full placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sort:</label>
            <select
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => {
                const next = e.target.value;
                if (next === 'priority' || next === 'type' || next === 'title') setSortBy(next);
              }}
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <AcademicTaskList 
          tasks={displayedTasks}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteTask}
          onUpdateTask={updateTaskField}
          onEdit={openEditForm}
          isEditingMode={isEditingMode}
        />
      </main>

      <MobileDrawer
        open={isTabsDrawerOpen}
        title="Views"
        onClose={() => setIsTabsDrawerOpen(false)}
      >
        <div className="grid grid-cols-1 gap-2">
          {DOMAIN_TABS.map((tab) => {
            const isActive = tab.key === activeDomainTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveDomainTab(tab.key);
                  setIsTabsDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow'
                    : 'bg-white dark:bg-slate-900/30 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
                aria-pressed={isActive}
              >
                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-900/50'}`}>
                  {domainCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </MobileDrawer>

      <MobileDrawer
        open={isFiltersDrawerOpen}
        title="Filters"
        onClose={() => setIsFiltersDrawerOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <SearchIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full placeholder:text-slate-400"
            />
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">Type</div>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map((type) => {
                const isActive = activeTypeFilter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveTypeFilter(type)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                    aria-pressed={isActive}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900/30 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sort</label>
            <select
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => {
                const next = e.target.value;
                if (next === 'priority' || next === 'type' || next === 'title') setSortBy(next);
              }}
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setIsFiltersDrawerOpen(false);
              }}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsFiltersDrawerOpen(false)}
              className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </MobileDrawer>

      <MobileDrawer
        open={isActionsDrawerOpen}
        title="Actions"
        onClose={() => setIsActionsDrawerOpen(false)}
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setIsActionsDrawerOpen(false);
              setIsFormOpen(true);
            }}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow"
          >
            <PlusIcon className="w-5 h-5" />
            New Project
          </button>

          <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">Theme</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 py-2 rounded-lg transition-all font-bold text-xs flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <SunIcon className="w-4 h-4" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2 rounded-lg transition-all font-bold text-xs flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <MoonIcon className="w-4 h-4" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex-1 py-2 rounded-lg transition-all font-bold text-xs flex items-center justify-center gap-2 ${
                  theme === 'system'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <MonitorIcon className="w-4 h-4" />
                System
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingMode(!isEditingMode)}
            className={`w-full px-4 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-between transition-all border ${
              isEditingMode
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            aria-pressed={isEditingMode}
          >
            <span>{isEditingMode ? 'Editing' : 'Locked'}</span>
            <span className={`w-2 h-2 rounded-full ${isEditingMode ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsActionsDrawerOpen(false)}
            className="w-full px-4 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200"
          >
            Close
          </button>
        </div>
      </MobileDrawer>

      {isFormOpen && (
        <TaskForm 
          onSave={handleSaveTask} 
          onClose={closeForm}
          initialData={taskToEdit}
        />
      )}
    </div>
  );
};

export default App;
