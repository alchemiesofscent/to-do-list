
import React from 'react';
import { AcademicTask } from '../types';

interface StatsOverviewProps {
  tasks: AcademicTask[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ tasks }) => {
  const total = tasks.length;
  const published = tasks.filter(t => t.status === 'Published').length;
  const highPriority = tasks.filter(t => t.priority === 'High').length;
  const inProgress = tasks.filter(t => ['Draft', 'Revision', 'Experimental'].includes(t.status)).length;

  const stats = [
    { label: 'Total Projects', value: total, color: 'text-slate-900', bg: 'bg-slate-100' },
    { label: 'Active Drafts', value: inProgress, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'High Priority', value: highPriority, color: 'text-rose-700', bg: 'bg-rose-50' },
    { label: 'Published', value: published, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bg} p-4 rounded-xl shadow-sm border border-black/5`}>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};
