import React from 'react';
import { AcademicTask, Priority, Status, TaskType } from '../types.ts';
import { ClockIcon, TrashIcon, StarIcon, BookIcon } from './Icons.tsx';
import { downloadIcsFile, generateGoogleCalendarUrl } from '../calendarUtils.ts';

interface AcademicTaskListProps {
  tasks: AcademicTask[];
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AcademicTask>) => void;
  onEdit: (task: AcademicTask) => void;
  isEditingMode: boolean;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  High: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
  Medium: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  Low: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  Aspirational: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
};

const STATUS_COLORS: Record<Status, string> = {
  Published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  Complete: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Revision: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Draft: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  'Early Stage': 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
  Experimental: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'Needs Update': 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  Rejected: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  Upcoming: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
};

export const AcademicTaskList: React.FC<AcademicTaskListProps> = ({ 
  tasks, 
  onToggleFavorite, 
  onDelete,
  onUpdateTask,
  onEdit,
  isEditingMode
}) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
        <BookIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">No records found matching these criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </div>

                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  {task.type}
                </span>
                
                {task.deadline && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">
                    <ClockIcon className="w-3 h-3" />
                    <span>{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                {!task.deadline && task.deadlineNote && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest">
                    <ClockIcon className="w-3 h-3" />
                    <span>{task.deadlineNote}</span>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-serif text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
                  {task.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2 italic">
                  {task.description || "No research summary provided."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className={`text-xs font-bold px-4 py-1.5 rounded-full border border-transparent ${STATUS_COLORS[task.status]}`}>
                  {task.status}
                </div>

                {task.coAuthors && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                    Collaboration: {task.coAuthors}
                  </span>
                )}
              </div>
            </div>

            {/* Actions Sidebar/Bottom */}
            <div className="flex sm:flex-col items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl sm:opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditingMode ? (
                <>
                  <button 
                    onClick={() => onEdit(task)}
                    className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                    title="Edit project details"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => onDelete(task.id)}
                    className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-all shadow-sm"
                    title="Delete project"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </>
              ) : null}
              
              <button 
                onClick={() => onToggleFavorite(task.id)}
                className={`p-2.5 rounded-lg transition-all ${task.isFavorite ? 'text-amber-400 bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                title="Mark as vital"
              >
                <StarIcon className="w-5 h-5" filled={task.isFavorite} />
              </button>
              
              {task.deadline && isEditingMode && (
                <button 
                  onClick={() => downloadIcsFile(task)}
                  className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 transition-all shadow-sm"
                  title="Export to Calendar"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
