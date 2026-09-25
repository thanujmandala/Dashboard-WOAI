import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { KPICard } from '../common/KPICard';
import {
  Users,
  Layers,
  Sparkles,
  Trophy,
  Award,
  Zap,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface DashboardHomeProps {
  onNavigateTab: (tab: string) => void;
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onNavigateTab,
  onStartReview,
}) => {
  const {
    teams,
    reviews,
    settings,
    kpis,
    summaries,
    openQuickEvaluate,
    openImportModal,
    openTeamDrawer,
  } = useData();

  const recentReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
  }, [reviews]);

  const draftReviews = useMemo(() => {
    return reviews.filter((r) => r.status === 'draft');
  }, [reviews]);

  const scoreDistribution = useMemo(() => {
    const buckets = {
      '90-100%': 0,
      '80-89%': 0,
      '70-79%': 0,
      '< 70%': 0,
    };

    summaries.forEach((s) => {
      if (s.weightedPercentage !== null) {
        const p = s.weightedPercentage;
        if (p >= 90) buckets['90-100%']++;
        else if (p >= 80) buckets['80-89%']++;
        else if (p >= 70) buckets['70-79%']++;
        else buckets['< 70%']++;
      }
    });

    return buckets;
  }, [summaries]);

  const roundAverages = useMemo(() => {
    const r1 = reviews.filter((r) => r.review_number === 1 && r.status === 'submitted');
    const r2 = reviews.filter((r) => r.review_number === 2 && r.status === 'submitted');
    const r3 = reviews.filter((r) => r.review_number === 3 && r.status === 'submitted');

    const avgR1 = r1.length > 0 ? r1.reduce((sum, r) => sum + r.total_score, 0) / r1.length : 0;
    const avgR2 = r2.length > 0 ? r2.reduce((sum, r) => sum + r.total_score, 0) / r2.length : 0;
    const avgR3 = r3.length > 0 ? r3.reduce((sum, r) => sum + r.total_score, 0) / r3.length : 0;

    return {
      r1: Number(avgR1.toFixed(1)),
      r2: Number(avgR2.toFixed(1)),
      r3: Number(avgR3.toFixed(1)),
    };
  }, [reviews]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Teams"
          value={kpis.totalTeams}
          subtitle="Registered & Imported"
          icon={<Users className="w-5 h-5" />}
          accentColor="indigo"
          onClick={() => onNavigateTab('teams')}
        />

        <KPICard
          title={settings.review_1_name.split('–')[0].trim() || 'Review 1'}
          value={kpis.r1Completed}
          fraction={String(kpis.totalTeams)}
          progress={kpis.r1ProgressPct}
          icon={<Layers className="w-5 h-5" />}
          accentColor="blue"
          onClick={() => onNavigateTab('review1')}
        />

        <KPICard
          title={settings.review_2_name.split('–')[0].trim() || 'Review 2'}
          value={kpis.r2Completed}
          fraction={String(kpis.totalTeams)}
          progress={kpis.r2ProgressPct}
          icon={<Sparkles className="w-5 h-5" />}
          accentColor="purple"
          onClick={() => onNavigateTab('review2')}
        />

        <KPICard
          title={settings.review_3_name.split('–')[0].trim() || 'Review 3'}
          value={kpis.r3Completed}
          fraction={String(kpis.eligibleForFinale || kpis.totalTeams)}
          progress={kpis.r3ProgressPct}
          icon={<Trophy className="w-5 h-5" />}
          accentColor="amber"
          onClick={() => onNavigateTab('review3')}
        />

        <KPICard
          title="Finale Eligible"
          value={kpis.eligibleForFinale}
          subtitle={`Top ${settings.advancement_top_teams_limit} & ≥ ${settings.advancement_threshold_percent}%`}
          icon={<Award className="w-5 h-5" />}
          accentColor="emerald"
          onClick={() => onNavigateTab('marks')}
        />

        <KPICard
          title="Average Score"
          value={kpis.averageScore > 0 ? `${kpis.averageScore}%` : '—'}
          subtitle="Evaluated Teams"
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="rose"
          onClick={() => onNavigateTab('marks')}
        />
      </div>

      {/* Quick Actions Action Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Quick Actions:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openQuickEvaluate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Evaluate Team</span>
          </button>

          <button
            onClick={() => onNavigateTab('teams')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>View Teams</span>
          </button>

          <button
            onClick={() => onNavigateTab('marks')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>View Marks</span>
          </button>

          {draftReviews.length > 0 && (
            <button
              onClick={() => {
                const firstDraft = draftReviews[0];
                onStartReview(firstDraft.review_number, firstDraft.team_number);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors animate-pulse"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Continue Drafts ({draftReviews.length})</span>
            </button>
          )}

          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Excel</span>
          </button>
        </div>
      </div>

      {/* Main Row: Progress Meters & Lightweight Fast Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Stage Completion
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {kpis.totalTeams} Total Teams
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">{settings.review_1_name}</span>
                <span className="font-mono text-indigo-400 font-bold">
                  {kpis.r1Completed}/{kpis.totalTeams} ({kpis.r1ProgressPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${kpis.r1ProgressPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">{settings.review_2_name}</span>
                <span className="font-mono text-purple-400 font-bold">
                  {kpis.r2Completed}/{kpis.totalTeams} ({kpis.r2ProgressPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${kpis.r2ProgressPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-300">{settings.review_3_name}</span>
                <span className="font-mono text-amber-400 font-bold">
                  {kpis.r3Completed}/{kpis.eligibleForFinale || kpis.totalTeams} ({kpis.r3ProgressPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${kpis.r3ProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Advancement Rule:</span>
            <span className="text-slate-300 font-semibold">
              Prelims + Mains &ge; {settings.advancement_threshold_percent}%
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Score Distribution
              </h3>
            </div>
            <span className="text-xs text-slate-400">Weighted Marks</span>
          </div>

          <div className="space-y-3">
            {Object.entries(scoreDistribution).map(([range, count]) => {
              const evaluatedCount = summaries.filter((s) => s.weightedPercentage !== null).length;
              const pct = evaluatedCount > 0 ? Math.round((count / evaluatedCount) * 100) : 0;

              let color = 'bg-emerald-500';
              let textCol = 'text-emerald-400';
              if (range === '80-89%') {
                color = 'bg-indigo-500';
                textCol = 'text-indigo-400';
              } else if (range === '70-79%') {
                color = 'bg-amber-500';
                textCol = 'text-amber-400';
              } else if (range === '< 70%') {
                color = 'bg-rose-500';
                textCol = 'text-rose-400';
              }

              return (
                <div key={range} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{range}</span>
                    <span className={`font-mono font-bold ${textCol}`}>
                      {count} Teams ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Evaluated Teams:</span>
            <span className="text-white font-mono font-bold">
              {summaries.filter((s) => s.weightedPercentage !== null).length} / {teams.length}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Average Marks by Round
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-indigo-400">Prelims</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {roundAverages.r1}
              </div>
              <div className="text-[10px] text-slate-500">/ 50 pts</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-purple-400">Mains</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {roundAverages.r2}
              </div>
              <div className="text-[10px] text-slate-500">/ 50 pts</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-amber-400">Finale</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {roundAverages.r3}
              </div>
              <div className="text-[10px] text-slate-500">/ 100 pts</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
            <span className="font-bold">Pro Tip: </span>
            Click "Evaluate Team" or select a team from the Teams table to evaluate live submissions.
          </div>
        </div>
      </div>

      {/* Recent Evaluations Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Evaluations & Activity
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('marks')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All Marks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReviews.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Team Number</th>
                  <th className="p-3">Team Name</th>
                  <th className="p-3">Review</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Judge</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {recentReviews.map((r) => {
                  const team = teams.find((t) => t.id === r.team_id);
                  const roundName =
                    r.review_number === 1
                      ? 'Review 1 (Prelims)'
                      : r.review_number === 2
                      ? 'Review 2 (Mains)'
                      : 'Review 3 (Finale)';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => team && openTeamDrawer(team)}
                    >
                      <td className="p-3 font-mono font-bold text-indigo-400">{r.team_number}</td>
                      <td className="p-3 font-semibold text-white">{team?.team_name || r.team_number}</td>
                      <td className="p-3 text-slate-300">{roundName}</td>
                      <td className="p-3 font-mono font-bold text-white">
                        {r.total_score} / {r.max_possible_score} pts
                      </td>
                      <td className="p-3 font-mono text-slate-400">{r.judge_username}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(r.updated_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            r.status === 'submitted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {r.status === 'submitted' ? 'Submitted' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onStartReview(r.review_number, r.team_number)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                        >
                          Open Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No evaluations submitted yet. Click "⚡ Evaluate Team" to start judging.
          </div>
        )}
      </div>
    </div>
  );
};
