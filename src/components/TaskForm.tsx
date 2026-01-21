import React, { useState, useEffect } from 'react';
import { AcademicTask, Domain, Priority, Status, TaskType } from '../types.ts';
import { PlusIcon, CheckIcon } from './Icons.tsx';

// Types available for each domain
const DOMAIN_TYPES: Record<Domain, TaskType[]> = {
  'Writing': ['Article', 'Book', 'Translation', 'Edited Volume', 'Book Review', 'Book Proposal'],
  'Experiments': ['Perfume', 'Other Experiment'],
  'DH': ['Website', 'Database', 'Other DH'],
  'Grants': ['Grant'],
  'Admin': ['GACR', 'FLU', 'IOCB', 'Internal', 'Other Admin'],
};

// Default type for each domain
const DEFAULT_TYPE: Record<Domain, TaskType> = {
  'Writing': 'Article',
  'Experiments': 'Perfume',
  'DH': 'Website',
  'Grants': 'Grant',
  'Admin': 'Internal',
};

interface TaskFormProps {
  onSave: (task: Omit<AcademicTask, 'id'>) => void;
  onClose: () => void;
  initialData?: AcademicTask;
  currentDomain: Domain;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onSave, onClose, initialData, currentDomain }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: DEFAULT_TYPE[currentDomain] as TaskType,
    priority: 'Medium' as Priority,
    status: 'Draft' as Status,
    description: '',
    coAuthors: '',
    deadline: '',
    deadlineNote: '',
    isFavorite: false
  });

  const availableTypes = DOMAIN_TYPES[currentDomain];

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        type: initialData.type,
        priority: initialData.priority,
        status: initialData.status,
        description: initialData.description,
        coAuthors: initialData.coAuthors || '',
        deadline: initialData.deadline || '',
        deadlineNote: initialData.deadlineNote || '',
        isFavorite: initialData.isFavorite || false
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h2 className="serif text-xl font-bold text-slate-900 dark:text-white">
            {initialData ? 'Update Research Entry' : 'Catalogue New Research'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Project Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g. A New Method for Identifying Ancient Stacte"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as TaskType})}
              >
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Priority</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Aspirational">Aspirational</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current Status</label>
            <select 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as Status})}
            >
              <option value="Upcoming">Upcoming / Planned</option>
              <option value="Early Stage">Early Stage</option>
              <option value="Draft">Drafting</option>
              <option value="Experimental">Experimental Work</option>
              <option value="Revision">In Revision</option>
              <option value="Complete">Complete (Unpublished)</option>
              <option value="Needs Update">Needs Update</option>
              <option value="Published">Published</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Description & Notes</label>
            <textarea 
              rows={5}
              placeholder="Summary of findings..."
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Co-Authors</label>
              <input 
                type="text" 
                placeholder="e.g. Laurence Totelin"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                value={formData.coAuthors}
                onChange={e => setFormData({...formData, coAuthors: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Target Deadline</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Deadline Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. End of November"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              value={formData.deadlineNote}
              onChange={e => setFormData({ ...formData, deadlineNote: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
            >
              {initialData ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
              {initialData ? 'Save Changes' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
