import React from 'react';
import { AcademicTask } from '../types.ts';

export type StatsFilterKey = 'total' | 'inProgress' | 'highPriority' | 'published';

interface StatsOverviewProps {
  tasks: AcademicTask[];
  activeFilter?: StatsFilterKey;
  onSelectFilter?: (filter: StatsFilterKey) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ tasks, activeFilter, onSelectFilter }) => {
  const total = tasks.length;
  const published = tasks.filter(t => t.status === 'Published').length;
  const highPriority = tasks.filter(t => t.priority === 'High').length;
  const inProgress = tasks.filter(t => ['Draft', 'Revision', 'Experimental'].includes(t.status)).length;

  const stats = [
    { key: 'total' as const, label: 'Total Projects', value: total, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
    { key: 'inProgress' as const, label: 'Active Drafts', value: inProgress, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { key: 'highPriority' as const, label: 'High Priority', value: highPriority, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { key: 'published' as const, label: 'Published', value: published, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.key;
        const isAnyFilterActive = !!activeFilter && activeFilter !== 'total';

        const activeRing =
          stat.key === 'inProgress'
            ? 'ring-2 ring-amber-500/30 dark:ring-amber-400/25'
            : stat.key === 'highPriority'
              ? 'ring-2 ring-rose-500/30 dark:ring-rose-400/25'
              : stat.key === 'published'
                ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-400/25'
                : 'ring-2 ring-slate-900/10 dark:ring-white/10';

        const inactiveDim = isAnyFilterActive && !isActive ? 'opacity-70 hover:opacity-100' : '';

        return (
          <button
            key={stat.label}
            type="button"
            className={[
              stat.bg,
              'p-4 rounded-xl shadow-sm border border-black/5 dark:border-white/5 text-left transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 dark:focus-visible:ring-white/20',
              isActive ? activeRing : '',
              inactiveDim,
            ].join(' ')}
            onClick={() => {
              if (!onSelectFilter) return;
              onSelectFilter(stat.key);
            }}
            aria-pressed={isActive}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </button>
        );
      })}
    </div>
  );
};
