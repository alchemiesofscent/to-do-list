
import React, { useState, useMemo, useEffect } from 'react';
import { AcademicTask, TaskType, Status, Priority } from './types';
import { INITIAL_TASKS } from './initialData';
import { StatsOverview } from './components/StatsOverview';
import { AcademicTaskList } from './components/AcademicTaskList';
import { TaskForm } from './components/TaskForm';
import { SearchIcon, FilterIcon, PlusIcon, BookIcon } from './components/Icons';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<AcademicTask[]>(() => {
    const saved = localStorage.getItem('scholar_opus_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<AcademicTask | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<TaskType | 'All'>('All');
  const [sortBy, setSortBy] = useState<'priority' | 'type' | 'title'>('priority');

  useEffect(() => {
    localStorage.setItem('scholar_opus_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleSaveTask = (taskData: Omit<AcademicTask, 'id'>) => {
    if (taskToEdit) {
      setTasks(tasks.map(t => t.id === taskToEdit.id ? { ...taskData, id: taskToEdit.id } : t));
    } else {
      const newTask: AcademicTask = {
        ...taskData,
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
    if (confirm('Are you sure you want to remove this project from your opus?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const updateTaskField = (id: string, updates: Partial<AcademicTask>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
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
  }, [tasks, searchQuery, activeTypeFilter, sortBy]);

  const taskTypes: (TaskType | 'All')[] = [
    'All', 'Article', 'Book', 'Translation', 'Edited Volume', 'Book Review', 'Digital Humanities', 'Grant', 'Book Proposal'
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-lg">
              <BookIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="serif text-xl font-bold text-slate-900 tracking-tight">Scholar's Opus</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <SearchIcon className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search corpus..."
                className="bg-transparent text-sm outline-none w-48 text-slate-700 placeholder-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-slate-900 text-white p-2 md:px-4 md:py-2 rounded-full md:rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden md:inline">New Project</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-10 text-center md:text-left">
          <h2 className="serif text-3xl font-bold text-slate-900 mb-2">Research Catalog</h2>
          <p className="text-slate-500 max-w-2xl leading-relaxed">
            Managing a career of classical research, experimental replications, and technical translations.
            Track your movement from ancient fragments to final manuscripts.
          </p>
        </div>

        <StatsOverview tasks={tasks} />

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 sticky top-20 bg-slate-50/80 backdrop-blur py-4 z-20">
          <div className="flex items-center gap-2 overflow-x-auto w-full no-scrollbar pb-2 md:pb-0">
            <FilterIcon className="w-4 h-4 text-slate-400 shrink-0" />
            {taskTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  activeTypeFilter === type 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort by:</label>
            <select 
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
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
        />
      </main>

      <footer className="max-w-5xl mx-auto px-4 mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest gap-4">
          <div className="flex gap-4">
            <span>PhD since 2013</span>
            <span>ERC Consolidator Eligible: 2027</span>
          </div>
          <div>
            Sean Coughlin • Alchemies of Scent
          </div>
        </div>
      </footer>

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
