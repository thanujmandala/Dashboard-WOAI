import React from 'react';
import { Users, FileSpreadsheet, Search, Award, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'teams' | 'spreadsheet' | 'search' | 'marks' | 'error';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'teams',
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
}) => {
  let iconComponent = <Users className="w-8 h-8 text-indigo-400" />;

  if (icon === 'spreadsheet') {
    iconComponent = <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
  } else if (icon === 'search') {
    iconComponent = <Search className="w-8 h-8 text-blue-400" />;
  } else if (icon === 'marks') {
    iconComponent = <Award className="w-8 h-8 text-amber-400" />;
  } else if (icon === 'error') {
    iconComponent = <AlertCircle className="w-8 h-8 text-rose-400" />;
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 my-4">
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-4 shadow-inner">
        {iconComponent}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
