import React from 'react';
import { useData } from '../../context/DataContext';
import { formatScore, formatPercentage } from '../../utils/calculations';
import {
  X,
  Layers,
  Sparkles,
  Trophy,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Tag,
  Lock,
  Unlock,
  History,
} from 'lucide-react';

interface TeamDetailsDrawerProps {
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const TeamDetailsDrawer: React.FC<TeamDetailsDrawerProps> = ({ onStartReview }) => {
  const {
    selectedTeamForDrawer,
    closeTeamDrawer,
    summaries,
    settings,
    auditLogs,
  } = useData();

  if (!selectedTeamForDrawer) return null;

  const team = selectedTeamForDrawer;
  const summary = summaries.find((s) => s.team.id === team.id);

  // Relevant team audit logs
  const teamLogs = auditLogs.filter(
    (l) => l.team_number === team.team_number
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl h-full bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-900/60 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {team.team_number}
              </span>
              <span className="px-2 py-0.5 text-xs font-mono text-slate-400 rounded-md bg-slate-800 border border-slate-700">
                {team.problem_statement_id}
              </span>
              {team.is_demo && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Demo
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{team.team_name}</h2>
          </div>

          <button
            onClick={closeTeamDrawer}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close team drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Members & Problem Statement */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Team Members ({team.members.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {team.members.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>{m.name}</span>
                    {m.role && <span className="text-[10px] text-slate-400 font-normal">({m.role})</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Problem Statement
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-850">
                {team.problem_statement}
              </p>
            </div>
          </div>

          {/* Performance Overview Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-900 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Overall Scorecard Summary
              </h4>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  summary?.isEligibleForFinale
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {summary?.isEligibleForFinale ? 'Eligible for Finale' : summary?.statusText || 'Pending'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">Review 1</div>
                <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                  {formatScore(summary?.r1Score, settings.review_1_max)}
                </div>
                <div className="text-[10px] text-slate-400">{formatPercentage(summary?.r1Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">Review 2</div>
                <div className="text-base font-bold font-mono text-purple-400 mt-0.5">
                  {formatScore(summary?.r2Score, settings.review_2_max)}
                </div>
                <div className="text-[10px] text-slate-400">{formatPercentage(summary?.r2Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">Review 3</div>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                  {formatScore(summary?.r3Score, settings.review_3_max)}
                </div>
                <div className="text-[10px] text-slate-400">{formatPercentage(summary?.r3Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                <div className="text-[11px] font-semibold text-indigo-300">Grand Total</div>
                <div className="text-base font-extrabold font-mono text-white mt-0.5">
                  {formatScore(summary?.grandTotal, 200)}
                </div>
                <div className="text-[10px] font-bold text-emerald-400">
                  {formatPercentage(summary?.weightedPercentage)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Prelims + Mains Combined:</span>
              <span className="font-mono font-bold text-slate-200">
                {summary?.prelimsMainsTotal !== null && summary?.prelimsMainsTotal !== undefined
                  ? `${summary.prelimsMainsTotal} / 100 (${summary.prelimsMainsPercentage?.toFixed(1)}%)`
                  : 'Incomplete'}
              </span>
            </div>
          </div>

          {/* Individual Round Evaluation Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Round Evaluations & Actions
            </h4>

            {/* Review 1 Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-white">{settings.review_1_name}</h5>
                    {summary?.r1Review?.status === 'submitted' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </span>
                    ) : summary?.r1Review?.status === 'draft' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Draft Saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {summary?.r1Score !== null && summary?.r1Score !== undefined
                      ? `Evaluated by ${summary?.r1Review?.judge_username || 'Judge'} • Score: ${summary.r1Score}/50 (${summary?.r1Percentage?.toFixed(0) || 0}%)`
                      : 'Max Score: 50 Marks'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  closeTeamDrawer();
                  onStartReview(1, team.team_number);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{summary?.r1Review?.status === 'submitted' ? 'View / Unlock R1' : 'Grade Review 1'}</span>
              </button>
            </div>

            {/* Review 2 Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-white">{settings.review_2_name}</h5>
                    {summary?.r2Review?.status === 'submitted' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </span>
                    ) : summary?.r2Review?.status === 'draft' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Draft Saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {summary?.r2Score !== null && summary?.r2Score !== undefined
                      ? `Evaluated by ${summary?.r2Review?.judge_username || 'Judge'} • Score: ${summary.r2Score}/50 (${summary?.r2Percentage?.toFixed(0) || 0}%)`
                      : 'Max Score: 50 Marks'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  closeTeamDrawer();
                  onStartReview(2, team.team_number);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{summary?.r2Review?.status === 'submitted' ? 'View / Unlock R2' : 'Grade Review 2'}</span>
              </button>
            </div>

            {/* Review 3 Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-white">{settings.review_3_name}</h5>
                    {summary?.r3Review?.status === 'submitted' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </span>
                    ) : summary?.r3Review?.status === 'draft' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Draft Saved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {summary?.r3Score !== null && summary?.r3Score !== undefined
                      ? `Evaluated by ${summary?.r3Review?.judge_username || 'Judge'} • Score: ${summary.r3Score}/100 (${summary?.r3Percentage?.toFixed(0) || 0}%)`
                      : 'Max Score: 100 Marks'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  closeTeamDrawer();
                  onStartReview(3, team.team_number);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{summary?.r3Review?.status === 'submitted' ? 'View / Unlock R3' : 'Grade Review 3'}</span>
              </button>
            </div>
          </div>

          {/* Audit Trail & History */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" /> Evaluation Audit Trail
            </h4>

            {teamLogs.length > 0 ? (
              <div className="space-y-2">
                {teamLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{log.details}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Judge: <span className="font-mono text-indigo-400">{log.judge_username}</span> •{' '}
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {log.action === 'review_unlock' ? (
                      <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 text-center">
                No evaluation actions recorded yet for this team.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
