import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { EmptyState } from '../common/EmptyState';
import {
  Search,
  Users,
  Eye,
} from 'lucide-react';

interface GlobalSearchPageProps {
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const GlobalSearchPage: React.FC<GlobalSearchPageProps> = ({ onStartReview }) => {
  const { teams, summaries, openTeamDrawer } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'eligible' | 'r1_done' | 'r2_done' | 'r3_done'>('all');

  const summaryMap = useMemo(() => {
    const map = new Map();
    summaries.forEach((s) => map.set(s.team.id, s));
    return map;
  }, [summaries]);

  const results = useMemo(() => {
    if (!searchTerm.trim() && scopeFilter === 'all') {
      return teams;
    }

    const q = searchTerm.toLowerCase().trim();

    return teams.filter((t) => {
      const summary = summaryMap.get(t.id);

      if (scopeFilter === 'eligible' && !summary?.isEligibleForFinale) return false;
      if (scopeFilter === 'r1_done' && summary?.r1Score === null) return false;
      if (scopeFilter === 'r2_done' && summary?.r2Score === null) return false;
      if (scopeFilter === 'r3_done' && summary?.r3Score === null) return false;

      if (!q) return true;

      const inNum = t.team_number.toLowerCase().includes(q);
      const inName = t.team_name.toLowerCase().includes(q);
      const inPsId = t.problem_statement_id.toLowerCase().includes(q);
      const inPs = t.problem_statement.toLowerCase().includes(q);
      const inMembers = t.members.some((m) => m.name.toLowerCase().includes(q));

      return inNum || inName || inPsId || inPs || inMembers;
    });
  }, [teams, searchTerm, scopeFilter, summaryMap]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Search className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Global Hackathon Directory Search</h2>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type any team number, project name, participant name, problem ID or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full rounded-2xl bg-slate-950 border border-slate-750 pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-medium text-slate-400 mr-1">Filter by:</span>
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              scopeFilter === 'all'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Teams ({teams.length})
          </button>

          <button
            onClick={() => setScopeFilter('eligible')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              scopeFilter === 'eligible'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Finale Eligible Only
          </button>

          <button
            onClick={() => setScopeFilter('r1_done')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              scopeFilter === 'r1_done'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Prelims Done
          </button>

          <button
            onClick={() => setScopeFilter('r2_done')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              scopeFilter === 'r2_done'
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Mains Done
          </button>

          <button
            onClick={() => setScopeFilter('r3_done')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              scopeFilter === 'r3_done'
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Grand Finale Done
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400">
          Showing <strong className="text-white font-mono">{results.length}</strong> matching teams
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No Matching Records"
          description="We couldn't find any team or member matching your search keywords. Try searching for partial words or team numbers."
          actionText="Clear Search"
          onAction={() => {
            setSearchTerm('');
            setScopeFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((team) => {
            const s = summaryMap.get(team.id);

            return (
              <div
                key={team.id}
                onClick={() => openTeamDrawer(team)}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between gap-4 cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {team.team_number}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono text-slate-400 rounded-md bg-slate-950 border border-slate-800">
                        {team.problem_statement_id}
                      </span>
                    </div>

                    {s?.isEligibleForFinale && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Finale Eligible
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {team.team_name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{team.members.map((m: any) => m.name).join(', ')}</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {team.problem_statement}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[11px] text-slate-400">Total:</span>
                    <span className="font-bold text-white">{s?.grandTotal !== null ? `${s?.grandTotal}/200` : '—'}</span>
                    {s?.weightedPercentage !== null && (
                      <span className="text-emerald-400 font-bold">({s.weightedPercentage.toFixed(0)}%)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onStartReview(1, team.team_number)}
                      title="Review 1"
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                        s?.r1Score !== null
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      R1
                    </button>
                    <button
                      onClick={() => onStartReview(2, team.team_number)}
                      title="Review 2"
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                        s?.r2Score !== null
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      R2
                    </button>
                    <button
                      onClick={() => onStartReview(3, team.team_number)}
                      title="Review 3"
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                        s?.r3Score !== null
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      R3
                    </button>

                    <button
                      onClick={() => openTeamDrawer(team)}
                      className="p-1 rounded text-slate-400 hover:text-white bg-slate-800 ml-1"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
