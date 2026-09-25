import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  Zap,
  X,
  Search,
  Layers,
  Sparkles,
  Trophy,
  ArrowRight,
} from 'lucide-react';

interface QuickEvaluateModalProps {
  onStartReview: (roundNumber: 1 | 2 | 3, teamNumber: string) => void;
}

export const QuickEvaluateModal: React.FC<QuickEvaluateModalProps> = ({ onStartReview }) => {
  const { isQuickEvaluateOpen, closeQuickEvaluate, teams, reviews } = useData();
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isQuickEvaluateOpen) return null;

  const filteredTeams = teams.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.team_number.toLowerCase().includes(q) ||
      t.team_name.toLowerCase().includes(q) ||
      t.problem_statement_id.toLowerCase().includes(q)
    );
  });

  const handleLaunch = () => {
    const targetTeam = selectedTeamNumber || (filteredTeams.length > 0 ? filteredTeams[0].team_number : '');
    if (!targetTeam) return;
    closeQuickEvaluate();
    onStartReview(selectedRound, targetTeam);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={closeQuickEvaluate}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Quick Evaluate Team</h3>
            <p className="text-xs text-slate-400">
              Select any team and jump directly into the scoring rubric
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Select Evaluation Round
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRound(1)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRound === 1
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-indigo-400" />
                <div className="font-bold text-xs">Review 1</div>
                <div className="text-[10px] text-slate-400">Prelims (50)</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRound(2)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRound === 2
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-purple-400" />
                <div className="font-bold text-xs">Review 2</div>
                <div className="text-[10px] text-slate-400">Mains (50)</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRound(3)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedRound === 3
                    ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-4 h-4 mb-1 text-amber-400" />
                <div className="font-bold text-xs">Review 3</div>
                <div className="text-[10px] text-slate-400">Finale (100)</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Select Team
            </label>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850">
              {filteredTeams.map((t) => {
                const isSelected = (selectedTeamNumber || (filteredTeams[0]?.team_number)) === t.team_number;
                const rev = reviews.find((r) => r.team_id === t.id && r.review_number === selectedRound);

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeamNumber(t.team_number)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-600/20' : 'hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-indigo-300">{t.team_number}</span>
                        <span className="font-semibold text-xs text-white">{t.team_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{t.problem_statement_id}</div>
                    </div>

                    <div>
                      {rev?.status === 'submitted' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          {rev.total_score} pts
                        </span>
                      ) : rev?.status === 'draft' ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Draft
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Unscored</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={closeQuickEvaluate}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <span>Open Rubric</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
