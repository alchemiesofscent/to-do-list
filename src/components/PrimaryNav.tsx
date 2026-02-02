import React from 'react';

type PrimaryNavTab = 'tracker' | 'pmo' | 'todo';

export const PrimaryNav: React.FC<{
  active: PrimaryNavTab;
  onNavigate: (path: string) => void;
  className?: string;
}> = ({ active, onNavigate, className }) => {
  const tabClass = (key: PrimaryNavTab) =>
    `px-2 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${
      active === key
        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`;

  return (
    <nav className={className} aria-label="Primary navigation">
      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
        <button type="button" className={tabClass('tracker')} onClick={() => onNavigate('/')}>
          Research
        </button>
        <button type="button" className={tabClass('pmo')} onClick={() => onNavigate('/pmo/daily')}>
          PMO
        </button>
        <button type="button" className={tabClass('todo')} onClick={() => onNavigate('/todo')}>
          To Do
        </button>
      </div>
    </nav>
  );
};

