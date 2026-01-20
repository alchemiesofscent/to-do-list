import React, { useState, useMemo, useEffect } from 'react';
import { AcademicTask, TaskType, Status, Priority } from './types.ts';
import { INITIAL_TASKS, PROJECTS_MD_REVISION } from './initialData.ts';
import { loadTasksFromDb, saveTasksToDb } from './db.ts';
import { StatsOverview } from './components/StatsOverview.tsx';
import { AcademicTaskList } from './components/AcademicTaskList.tsx';
import { TaskForm } from './components/TaskForm.tsx';
import { FilterIcon, PlusIcon, BookIcon, SunIcon, MoonIcon, MonitorIcon } from './components/Icons.tsx';

type Theme = 'light' | 'dark' | 'system';
type DomainTab = 'Writing' | 'Experiments' | 'DH' | 'Grants' | 'Admin';

const DOMAIN_TABS: { key: DomainTab; label: string }[] = [
  { key: 'Writing', label: 'Writing' },
  { key: 'Experiments', label: 'Experiments' },
  { key: 'DH', label: 'DH' },
  { key: 'Grants', label: 'Grants' },
  { key: 'Admin', label: 'Admin' },
];

const classifyTaskDomain = (task: AcademicTask): DomainTab => {
  const section = (task.section ?? '').toLowerCase();
  const subsection = (task.subsection ?? '').toLowerCase();
  const title = task.title.toLowerCase();
  const description = task.description.toLowerCase();
  const combined = `${title}\n${description}`;

  if (task.type === 'Grant' || section.includes('grants & admin') || section.includes('grants')) return 'Grants';

  const looksDh =
    task.type === 'Digital Humanities' ||
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
  const [activeDomainTab, setActiveDomainTab] = useState<DomainTab>(() => {
    const saved = localStorage.getItem('scholar_opus_domain_tab');
    const validTabs = new Set(DOMAIN_TABS.map((t) => t.key));
    if (saved && validTabs.has(saved as DomainTab)) return saved as DomainTab;
    return 'Writing';
  });

  useEffect(() => {
    saveTasksToDb({ tasks, seedRevision: PROJECTS_MD_REVISION });
  }, [tasks]);

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
    const normalizedTaskData: Omit<AcademicTask, 'id'> = {
      ...taskData,
      coAuthors: taskData.coAuthors?.trim() ? taskData.coAuthors.trim() : undefined,
      deadline: taskData.deadline?.trim() ? taskData.deadline.trim() : undefined,
      deadlineNote: taskData.deadlineNote?.trim() ? taskData.deadlineNote.trim() : undefined,
      description: taskData.description ?? '',
    };

    if (taskToEdit) {
      setTasks(tasks.map(t => t.id === taskToEdit.id ? { ...normalizedTaskData, id: taskToEdit.id } : t));
    } else {
      const newTask: AcademicTask = {
        ...normalizedTaskData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setTasks([newTask, ...tasks]);
    }
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
    setTasks(tasks.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  };

  const deleteTask = (id: string) => {
    if (confirm('Are you sure you want to remove this project?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const updateTaskField = (id: string, updates: Partial<AcademicTask>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const domainCounts = useMemo(() => {
    const counts: Record<DomainTab, number> = { Writing: 0, Experiments: 0, DH: 0, Grants: 0, Admin: 0 };
    for (const task of tasks) counts[classifyTaskDomain(task)]++;
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => classifyTaskDomain(t) === activeDomainTab).filter(t => {
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

  const taskTypes: (TaskType | 'All')[] = [
    'All', 'Article', 'Book', 'Translation', 'Edited Volume', 'Book Review', 'Digital Humanities', 'Grant', 'Book Proposal'
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 dark:bg-slate-100 p-1.5 rounded-lg shadow-sm">
              <BookIcon className="w-5 h-5 text-white dark:text-slate-900" />
            </div>
            <h1 className="font-serif text-xl font-bold text-slate-900 dark:text-white tracking-tight">Scholar's Opus</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Control Center */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
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
              onClick={() => setIsFormOpen(true)}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-2 sm:px-4 sm:py-2 rounded-full sm:rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow active:scale-95"
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
          <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-sm">
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
        </div>

        <StatsOverview tasks={filteredTasks} />

        {/* Filters Sticky Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 sticky top-16 bg-slate-50 dark:bg-slate-900 py-4 z-30">
          <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pb-2 sm:pb-0">
            <FilterIcon className="w-4 h-4 text-slate-400 shrink-0" />
            {taskTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  activeTypeFilter === type 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sort:</label>
            <select 
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <AcademicTaskList 
          tasks={filteredTasks}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteTask}
          onUpdateTask={updateTaskField}
          onEdit={openEditForm}
          isEditingMode={isEditingMode}
        />
      </main>

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
