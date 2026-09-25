import React from 'react';
import type { TeamScoreSummary, CompetitionSettings } from '../../types';
import { REVIEW_1_RUBRICS, REVIEW_2_RUBRICS, REVIEW_3_RUBRICS } from '../../constants/rubrics';
import { formatScore, formatPercentage } from '../../utils/calculations';
import {
  X,
  Layers,
  Sparkles,
  Trophy,
  User,
  Printer,
} from 'lucide-react';

interface ScorecardModalProps {
  summary: TeamScoreSummary | null;
  settings: CompetitionSettings;
  onClose: () => void;
  onOpenEvaluation?: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  summary,
  settings,
  onClose,
}) => {
  if (!summary) return null;

  const { team, r1Review, r2Review, r3Review } = summary;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {team.team_number}
              </span>
              <span className="px-2 py-0.5 text-xs font-mono text-slate-400 rounded-md bg-slate-800 border border-slate-700">
                {team.problem_statement_id}
              </span>
              {summary.rank && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Rank #{summary.rank}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{team.team_name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{team.members.map((m: any) => m.name).join(', ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Print Scorecard"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Grand Summary Hero Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-500/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Review 1</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {formatScore(summary.r1Score, settings.review_1_max)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{formatPercentage(summary.r1Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Review 2</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {formatScore(summary.r2Score, settings.review_2_max)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{formatPercentage(summary.r2Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Review 3 (Finale)</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {formatScore(summary.r3Score, settings.review_3_max)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{formatPercentage(summary.r3Percentage)}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40">
                <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Grand Total (200)</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
                  {formatScore(summary.grandTotal, 200)}
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {formatPercentage(summary.weightedPercentage)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Pre-Finale Status (R1 + R2):</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full border ${
                  summary.isEligibleForFinale
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {summary.prelimsMainsTotal !== null
                  ? `${summary.prelimsMainsTotal}/100 (${summary.prelimsMainsPercentage?.toFixed(1)}%) • ${
                      summary.isEligibleForFinale ? 'Eligible for Finale' : 'Not Eligible'
                    }`
                  : 'Pending Evaluations'}
              </span>
            </div>
          </div>

          {/* Review 1 Detailed Rubric Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">{settings.review_1_name} Breakdown</h4>
              </div>
              <div className="text-xs font-mono font-bold text-indigo-400">
                {summary.r1Score !== null ? `${summary.r1Score} / 50 Marks (${summary.r1Percentage?.toFixed(0)}%)` : 'Not Evaluated'}
              </div>
            </div>

            {r1Review ? (
              <div className="space-y-2">
                {REVIEW_1_RUBRICS.map((rubric) => {
                  const scoreItem = r1Review.scores.find((s) => s.criterion_id === rubric.id);
                  const val = scoreItem ? scoreItem.score : 0;
                  return (
                    <div
                      key={rubric.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-850 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-3">
                        <span className="font-semibold text-slate-200">{rubric.name}</span>
                        {scoreItem?.comments && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">"{scoreItem.comments}"</p>
                        )}
                      </div>
                      <div className="font-mono font-bold text-white px-2 py-1 rounded bg-slate-950 border border-slate-800">
                        {val} / {rubric.max_score}
                      </div>
                    </div>
                  );
                })}
                {r1Review.comments && (
                  <div className="p-3 rounded-xl bg-slate-900 text-xs text-slate-300 border border-slate-800 mt-2">
                    <span className="font-bold text-slate-400">Judge Feedback: </span>
                    {r1Review.comments}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No Review 1 data submitted yet.</p>
            )}
          </div>

          {/* Review 2 Detailed Rubric Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">{settings.review_2_name} Breakdown</h4>
              </div>
              <div className="text-xs font-mono font-bold text-purple-400">
                {summary.r2Score !== null ? `${summary.r2Score} / 50 Marks (${summary.r2Percentage?.toFixed(0)}%)` : 'Not Evaluated'}
              </div>
            </div>

            {r2Review ? (
              <div className="space-y-2">
                {REVIEW_2_RUBRICS.map((rubric) => {
                  const scoreItem = r2Review.scores.find((s) => s.criterion_id === rubric.id);
                  const val = scoreItem ? scoreItem.score : 0;
                  return (
                    <div
                      key={rubric.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-850 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-3">
                        <span className="font-semibold text-slate-200">{rubric.name}</span>
                        {scoreItem?.comments && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">"{scoreItem.comments}"</p>
                        )}
                      </div>
                      <div className="font-mono font-bold text-white px-2 py-1 rounded bg-slate-950 border border-slate-800">
                        {val} / {rubric.max_score}
                      </div>
                    </div>
                  );
                })}
                {r2Review.comments && (
                  <div className="p-3 rounded-xl bg-slate-900 text-xs text-slate-300 border border-slate-800 mt-2">
                    <span className="font-bold text-slate-400">Judge Feedback: </span>
                    {r2Review.comments}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No Review 2 data submitted yet.</p>
            )}
          </div>

          {/* Review 3 Detailed Rubric Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">{settings.review_3_name} Breakdown</h4>
              </div>
              <div className="text-xs font-mono font-bold text-amber-400">
                {summary.r3Score !== null ? `${summary.r3Score} / 100 Marks (${summary.r3Percentage?.toFixed(0)}%)` : 'Not Evaluated'}
              </div>
            </div>

            {r3Review ? (
              <div className="space-y-2">
                {REVIEW_3_RUBRICS.map((rubric) => {
                  const scoreItem = r3Review.scores.find((s) => s.criterion_id === rubric.id);
                  const val = scoreItem ? scoreItem.score : 0;
                  return (
                    <div
                      key={rubric.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-850 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-3">
                        <span className="font-semibold text-slate-200">{rubric.name}</span>
                        {scoreItem?.comments && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5">"{scoreItem.comments}"</p>
                        )}
                      </div>
                      <div className="font-mono font-bold text-white px-2 py-1 rounded bg-slate-950 border border-slate-800">
                        {val} / {rubric.max_score}
                      </div>
                    </div>
                  );
                })}
                {r3Review.comments && (
                  <div className="p-3 rounded-xl bg-slate-900 text-xs text-slate-300 border border-slate-800 mt-2">
                    <span className="font-bold text-slate-400">Judge Feedback: </span>
                    {r3Review.comments}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No Grand Finale review submitted yet.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Official evaluation record for Wonders of AI
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-white transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};
