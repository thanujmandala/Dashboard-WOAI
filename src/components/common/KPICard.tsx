import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  fraction?: string;
  icon: React.ReactNode;
  progress?: number;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'rose';
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  fraction,
  icon,
  progress,
  accentColor = 'indigo',
  onClick,
}) => {
  const colorMap = {
    indigo: {
      bg: 'from-indigo-500/10 to-indigo-900/10 border-indigo-500/20',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      progress: 'bg-indigo-500',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-900/10 border-emerald-500/20',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      progress: 'bg-emerald-500',
    },
    amber: {
      bg: 'from-amber-500/10 to-amber-900/10 border-amber-500/20',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      progress: 'bg-amber-500',
    },
    blue: {
      bg: 'from-blue-500/10 to-blue-900/10 border-blue-500/20',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      progress: 'bg-blue-500',
    },
    purple: {
      bg: 'from-purple-500/10 to-purple-900/10 border-purple-500/20',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      progress: 'bg-purple-500',
    },
    rose: {
      bg: 'from-rose-500/10 to-rose-900/10 border-rose-500/20',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      progress: 'bg-rose-500',
    },
  };

  const scheme = colorMap[accentColor];

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br bg-slate-900/90 border transition-all duration-200 ${scheme.bg} ${
        onClick ? 'cursor-pointer hover:border-slate-600 hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {value}
            </span>
            {fraction && (
              <span className="text-sm font-medium text-slate-400 font-mono">
                / {fraction}
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-slate-400">Progress</span>
            <span className="text-slate-200 font-mono font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${scheme.progress}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {subtitle && (
        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};
