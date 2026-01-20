
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
}

const PRIORITY_COLORS: Record<Priority, string> = {
  High: 'bg-rose-100 text-rose-800 border-rose-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-slate-100 text-slate-800 border-slate-200',
  Aspirational: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const STATUS_COLORS: Record<Status, string> = {
  Published: 'bg-emerald-100 text-emerald-800',
  Complete: 'bg-blue-100 text-blue-800',
  Revision: 'bg-amber-100 text-amber-800',
  Draft: 'bg-orange-100 text-orange-800',
  'Early Stage': 'bg-slate-100 text-slate-600',
  Experimental: 'bg-purple-100 text-purple-800',
  'Needs Update': 'bg-rose-100 text-rose-800',
  Rejected: 'bg-red-100 text-red-800',
  Upcoming: 'bg-cyan-100 text-cyan-800',
};

export const AcademicTaskList: React.FC<AcademicTaskListProps> = ({ 
  tasks, 
  onToggleFavorite, 
  onDelete,
  onUpdateTask,
  onEdit
}) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
        <BookIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No projects found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="group relative bg-white border border-slate-200 rounded-xl p-5 transition-all hover:shadow-md hover:border-slate-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <select 
                  value={task.priority}
                  onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as Priority })}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border cursor-pointer outline-none focus:ring-1 focus:ring-slate-300 ${PRIORITY_COLORS[task.priority]}`}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Aspirational">Aspirational</option>
                </select>

                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                  {task.type}
                </span>
                
                {task.deadline && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-rose-500">
                      <ClockIcon className="w-3 h-3" />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                    {/* Calendar Sync Icons */}
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                      <button 
                        onClick={() => downloadIcsFile(task)}
                        title="Add to iPhone/Apple Calendar"
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <a 
                        href={generateGoogleCalendarUrl(task) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                        className="text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className="serif text-lg font-bold text-slate-900 mb-1">
                {task.title}
              </h3>
              
              <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                {task.description || <span className="italic text-slate-400">No notes provided.</span>}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <select 
                  value={task.status}
                  onChange={(e) => onUpdateTask(task.id, { status: e.target.value as Status })}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md border-none focus:ring-2 focus:ring-slate-200 cursor-pointer ${STATUS_COLORS[task.status]}`}
                >
                  <option value="Published">Published</option>
                  <option value="Complete">Complete</option>
                  <option value="Revision">Revision</option>
                  <option value="Draft">Draft</option>
                  <option value="Early Stage">Early Stage</option>
                  <option value="Experimental">Experimental</option>
                  <option value="Needs Update">Needs Update</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Upcoming">Upcoming</option>
                </select>

                {task.coAuthors && (
                  <span className="text-xs text-slate-400 italic">
                    Co-authors: {task.coAuthors}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(task)}
                className="p-2 rounded-full hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors"
                title="Edit notes and details"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button 
                onClick={() => onToggleFavorite(task.id)}
                className={`p-2 rounded-full hover:bg-slate-50 ${task.isFavorite ? 'text-amber-400' : 'text-slate-300'}`}
              >
                <StarIcon className="w-5 h-5" filled={task.isFavorite} />
              </button>
              <button 
                onClick={() => onDelete(task.id)}
                className="p-2 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
