import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Menu,
  Zap,
  Search,
  UploadCloud,
  Moon,
  Sun,
  Shield,
  Sparkles,
  Database,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onToggleSidebar,
}) => {
  const { user } = useAuth();
  const {
    settings,
    theme,
    toggleTheme,
    openQuickEvaluate,
    openImportModal,
    teams,
    isDatabaseConnected,
  } = useData();

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onSelectTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTab]);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview & Evaluation Hub';
      case 'teams':
        return 'Team Directory & Management';
      case 'review1':
        return settings.review_1_name;
      case 'review2':
        return settings.review_2_name;
      case 'review3':
        return settings.review_3_name;
      case 'marks':
        return 'Marks Ledger & Scorecards';
      case 'search':
        return 'Global Search';
      case 'settings':
        return 'System & Rubric Settings';
      default:
        return 'Dashboard';
    }
  };

  const hasDemoData = teams.some((t) => t.is_demo);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80">
      {/* Left: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 bg-slate-900 border border-slate-800"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {getPageTitle(currentTab)}
            </h1>
            {isDatabaseConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Database className="w-3 h-3" /> Supabase Live
              </span>
            )}
            {hasDemoData && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3" /> Demo Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            {settings.competition_name} • Live Judging Portal
          </p>
        </div>
      </div>

      {/* Right: Quick Actions & Judge Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Button */}
        <button
          onClick={() => onSelectTab('search')}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-900/90 hover:bg-slate-850 hover:text-slate-200 border border-slate-800 rounded-xl transition-all shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">
            Ctrl K
          </kbd>
        </button>

        {/* Import Teams Shortcut */}
        <button
          onClick={openImportModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 hover:border-slate-700 transition-all"
        >
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          <span>Import Teams</span>
        </button>

        {/* Evaluate Team (Primary Quick Action) */}
        <button
          onClick={openQuickEvaluate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Evaluate Team</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Judge Account Pill */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-xs text-white shadow-inner">
            {user?.username ? user.username.toUpperCase().slice(0, 2) : 'AD'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
              {user?.name || user?.username}
              <Shield className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="text-[10px] font-mono text-emerald-400">
              Active Judge
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
