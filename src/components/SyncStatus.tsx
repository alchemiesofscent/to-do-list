import React from 'react';
import { CloudCheckIcon, CloudOffIcon, CloudIcon, RefreshIcon } from './Icons';
import type { SyncStatus as SyncStatusType } from '../sync';

interface SyncStatusProps {
  status: SyncStatusType;
  onManualSync?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ status, onManualSync }) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <RefreshIcon className="w-4 h-4 animate-spin" />,
          label: 'Syncing',
          color: 'text-blue-500',
        };
      case 'synced':
        return {
          icon: <CloudCheckIcon className="w-4 h-4" />,
          label: 'Synced',
          color: 'text-emerald-500',
        };
      case 'offline':
        return {
          icon: <CloudOffIcon className="w-4 h-4" />,
          label: 'Offline',
          color: 'text-slate-400',
        };
      case 'error':
        return {
          icon: <CloudOffIcon className="w-4 h-4" />,
          label: 'Error',
          color: 'text-rose-500',
        };
      default:
        return {
          icon: <CloudIcon className="w-4 h-4" />,
          label: 'Local',
          color: 'text-slate-400',
        };
    }
  };

  const { icon, label, color } = getStatusDisplay();

  return (
    <button
      type="button"
      onClick={onManualSync}
      disabled={status === 'syncing'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${color} hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed`}
      title={`Sync status: ${label}${onManualSync ? ' (click to sync)' : ''}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
