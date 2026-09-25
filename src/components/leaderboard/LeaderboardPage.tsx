import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import type { TeamScoreSummary } from '../../types';
import { Trophy, Star, RefreshCw, TrendingUp, ChevronRight } from 'lucide-react';

interface LeaderboardPageProps {
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
  onNavigateTab: (tab: string) => void;
}

// ── small helpers ──────────────────────────────────────────────────────────
const medalColors: Record<number, { ring: string; bg: string; text: string; label: string; glow: string }> = {
  1: {
    ring: 'ring-2 ring-amber-400',
    bg: 'bg-gradient-to-b from-amber-400/30 to-amber-600/10',
    text: 'text-amber-300',
    label: 'Champion',
    glow: 'shadow-amber-400/30',
  },
  2: {
    ring: 'ring-2 ring-slate-300',
    bg: 'bg-gradient-to-b from-slate-300/20 to-slate-400/5',
    text: 'text-slate-200',
    label: '1st Runner Up',
    glow: 'shadow-slate-300/20',
  },
  3: {
    ring: 'ring-2 ring-amber-700',
    bg: 'bg-gradient-to-b from-amber-700/30 to-amber-900/10',
    text: 'text-amber-600',
    label: '2nd Runner Up',
    glow: 'shadow-amber-700/20',
  },
};

const rankIcon = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

const scoreColor = (pct: number | null) => {
  if (pct === null) return 'text-slate-500';
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 75) return 'text-indigo-400';
  if (pct >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

// ── Podium card ────────────────────────────────────────────────────────────
const PodiumCard: React.FC<{ summary: TeamScoreSummary; position: 1 | 2 | 3 }> = ({ summary, position }) => {
  const style = medalColors[position];
  const heights = { 1: 'min-h-[260px]', 2: 'min-h-[220px]', 3: 'min-h-[200px]' };
  const textSizes = { 1: 'text-4xl', 2: 'text-3xl', 3: 'text-2xl' };

  return (
    <div
      className={`relative flex flex-col items-center justify-end rounded-2xl border border-slate-700/60 p-4 ${style.bg} ${style.ring} shadow-2xl ${style.glow} ${heights[position]} transition-all duration-300 hover:scale-[1.03]`}
    >
      {/* rank emoji */}
      <div className="absolute -top-5 text-4xl">{rankIcon(position)}</div>

      {/* Team badge */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold mb-3 border-2 border-slate-600 bg-slate-900/80 ${style.text}`}
      >
        {position}
      </div>

      <div className="text-center space-y-1 w-full">
        <div className={`font-mono font-bold text-xs ${style.text}`}>{summary.team.team_number}</div>
        <div className="font-extrabold text-white text-sm leading-tight line-clamp-2">{summary.team.team_name}</div>
        <div className="text-[11px] text-slate-400 font-mono">{summary.team.problem_statement_id}</div>

        {/* Grand total */}
        <div className="pt-2">
          {summary.grandTotal !== null ? (
            <>
              <div className={`${textSizes[position]} font-black ${style.text}`}>
                {summary.grandTotal}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">/ 200 pts</div>
              <div className={`text-xs font-bold mt-0.5 ${scoreColor(summary.weightedPercentage)}`}>
                {summary.weightedPercentage?.toFixed(1)}%
              </div>
            </>
          ) : summary.prelimsMainsTotal !== null ? (
            <>
              <div className={`${textSizes[position]} font-black ${style.text}`}>
                {summary.prelimsMainsTotal}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">/ 100 pts (R1+R2)</div>
            </>
          ) : (
            <div className="text-slate-600 text-sm font-mono">—</div>
          )}
        </div>

        <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${style.text} border border-current/30`}>
          {style.label}
        </div>
      </div>
    </div>
  );
};

// ── Main Leaderboard ────────────────────────────────────────────────────────
export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onStartReview, onNavigateTab }) => {
  const { summaries, teams, refreshData, settings } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'overall' | 'r1' | 'r2' | 'r3'>('overall');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Sort by chosen view
  const ranked = useMemo(() => {
    let list = [...summaries];

    if (viewMode === 'overall') {
      list.sort((a, b) => {
        // Teams with grand total first, then by pre-finale
        const aScore = a.grandTotal ?? a.prelimsMainsTotal ?? -1;
        const bScore = b.grandTotal ?? b.prelimsMainsTotal ?? -1;
        return bScore - aScore;
      });
    } else if (viewMode === 'r1') {
      list.sort((a, b) => (b.r1Score ?? -1) - (a.r1Score ?? -1));
    } else if (viewMode === 'r2') {
      list.sort((a, b) => (b.r2Score ?? -1) - (a.r2Score ?? -1));
    } else if (viewMode === 'r3') {
      list.sort((a, b) => (b.r3Score ?? -1) - (a.r3Score ?? -1));
    }

    return list;
  }, [summaries, viewMode]);

  const top3 = ranked.slice(0, 3);

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 p-8">
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl">
          <Trophy className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-white mb-2">No Teams Yet</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-xs">
            Import teams from a spreadsheet or load demo data to see the leaderboard.
          </p>
          <button
            onClick={() => onNavigateTab('teams')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
          >
            Go to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Leaderboard</h1>
              <p className="text-xs text-slate-400">Live rankings · {teams.length} teams · All judges synced</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode tabs */}
          {(['overall', 'r1', 'r2', 'r3'] as const).map((m) => {
            const labels = {
              overall: 'Overall',
              r1: `R1 (${settings.review_1_max})`,
              r2: `R2 (${settings.review_2_max})`,
              r3: `R3 (${settings.review_3_max})`,
            };
            return (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  viewMode === m
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                {labels[m]}
              </button>
            );
          })}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Sync from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Podium – top 3 */}
      {top3.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Performers</span>
          </div>

          <div className="flex items-end justify-center gap-4 sm:gap-8">
            {podiumOrder.map((s, idx) => {
              const pos = s === top3[0] ? 1 : s === top3[1] ? 2 : 3;
              return (
                <div key={s.team.id} className="flex-1 max-w-[220px]" style={{ paddingTop: idx === 1 ? 0 : idx === 0 ? '20px' : '40px' }}>
                  <PodiumCard summary={s} position={pos as 1 | 2 | 3} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Ranked Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">Full Rankings</span>
            <span className="text-xs text-slate-500 font-mono">({ranked.length} teams)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            {viewMode === 'overall' ? (
              <span>Sorted by Grand Total → Pre-Finale → R1+R2</span>
            ) : viewMode === 'r1' ? (
              <span>Sorted by Review 1 score</span>
            ) : viewMode === 'r2' ? (
              <span>Sorted by Review 2 score</span>
            ) : (
              <span>Sorted by Review 3 (Finale) score</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 w-12 text-center">Rank</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Problem ID</th>
                <th className="px-4 py-3 text-center">R1 /50</th>
                <th className="px-4 py-3 text-center">R2 /50</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">R1+R2 /100</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">Finale Status</th>
                <th className="px-4 py-3 text-center">R3 /100</th>
                <th className="px-4 py-3 text-center font-extrabold text-white">Total /200</th>
                <th className="px-4 py-3 text-center text-emerald-400">%</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ranked.map((s, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const rowBg = isTop3
                  ? rank === 1
                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                    : rank === 2
                    ? 'bg-slate-300/5 hover:bg-slate-300/10'
                    : 'bg-amber-700/5 hover:bg-amber-700/10'
                  : 'hover:bg-slate-800/40';

                return (
                  <tr key={s.team.id} className={`transition-colors ${rowBg}`}>
                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      {rank <= 3 ? (
                        <span className="text-xl">{rankIcon(rank)}</span>
                      ) : (
                        <span className="font-mono font-bold text-slate-500">#{rank}</span>
                      )}
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{s.team.team_name}</div>
                      <div className="font-mono text-indigo-400 text-[11px]">{s.team.team_number}</div>
                      <div className="text-slate-500 text-[10px] sm:hidden">{s.team.problem_statement_id}</div>
                    </td>

                    {/* Problem ID */}
                    <td className="px-4 py-3 text-center font-mono text-slate-400 hidden sm:table-cell">
                      {s.team.problem_statement_id}
                    </td>

                    {/* R1 */}
                    <td className="px-4 py-3 text-center font-mono">
                      {s.r1Score !== null ? (
                        <span className={`font-bold ${viewMode === 'r1' ? 'text-indigo-300' : 'text-white'}`}>
                          {s.r1Score}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* R2 */}
                    <td className="px-4 py-3 text-center font-mono">
                      {s.r2Score !== null ? (
                        <span className={`font-bold ${viewMode === 'r2' ? 'text-purple-300' : 'text-white'}`}>
                          {s.r2Score}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* R1+R2 */}
                    <td className="px-4 py-3 text-center font-mono hidden md:table-cell">
                      {s.prelimsMainsTotal !== null ? (
                        <div>
                          <span className="font-bold text-indigo-300">{s.prelimsMainsTotal}</span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Finale Status */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          s.isEligibleForFinale
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : s.prelimsMainsTotal !== null
                            ? 'bg-slate-800 text-slate-500 border-slate-700'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                      >
                        {s.isEligibleForFinale ? 'Eligible' : s.prelimsMainsTotal !== null ? 'Not Eligible' : 'Pending'}
                      </span>
                    </td>

                    {/* R3 */}
                    <td className="px-4 py-3 text-center font-mono">
                      {s.r3Score !== null ? (
                        <span className={`font-bold ${viewMode === 'r3' ? 'text-amber-300' : 'text-white'}`}>
                          {s.r3Score}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Total /200 */}
                    <td className="px-4 py-3 text-center font-mono">
                      {s.grandTotal !== null ? (
                        <div>
                          <span className={`font-extrabold text-sm ${isTop3 ? scoreColor(s.weightedPercentage) : 'text-white'}`}>
                            {s.grandTotal}
                          </span>
                          <span className="text-[10px] text-slate-500">/200</span>
                        </div>
                      ) : s.prelimsMainsTotal !== null ? (
                        <div>
                          <span className="font-bold text-indigo-300 text-sm">{s.prelimsMainsTotal}</span>
                          <span className="text-[10px] text-slate-500">/100*</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* % */}
                    <td className="px-4 py-3 text-center">
                      {s.weightedPercentage !== null ? (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                          s.weightedPercentage >= 90
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : s.weightedPercentage >= 75
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {s.weightedPercentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => {
                          const nextReview = s.r1Score === null ? 1 : s.r2Score === null ? 2 : 3;
                          onStartReview(nextReview as 1 | 2 | 3, s.team.team_number);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors ml-auto"
                      >
                        Evaluate
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>* Teams without Finale score show R1+R2 total as interim. Grand Total = R1+R2+R3 out of 200.</span>
          <button
            onClick={() => onNavigateTab('marks')}
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            Full Marks Ledger <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
