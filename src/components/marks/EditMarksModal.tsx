import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { TeamScoreSummary, Review } from '../../types';
import {
  X,
  FileEdit,
  Save,
} from 'lucide-react';

interface EditMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: TeamScoreSummary | null;
}

export const EditMarksModal: React.FC<EditMarksModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const { user } = useAuth();
  const { settings, saveReview, showToast } = useData();

  const [r1Score, setR1Score] = useState<string>('');
  const [r2Score, setR2Score] = useState<string>('');
  const [r3Score, setR3Score] = useState<string>('');

  const [r1Comments, setR1Comments] = useState<string>('');
  const [r2Comments, setR2Comments] = useState<string>('');
  const [r3Comments, setR3Comments] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && summary) {
      setR1Score(summary.r1Score !== null && summary.r1Score !== undefined ? String(summary.r1Score) : '');
      setR2Score(summary.r2Score !== null && summary.r2Score !== undefined ? String(summary.r2Score) : '');
      setR3Score(summary.r3Score !== null && summary.r3Score !== undefined ? String(summary.r3Score) : '');

      setR1Comments(summary.r1Review?.comments || '');
      setR2Comments(summary.r2Review?.comments || '');
      setR3Comments(summary.r3Review?.comments || '');
    }
  }, [isOpen, summary]);

  if (!isOpen || !summary) return null;

  const r1Max = settings.review_1_max || 50;
  const r2Max = settings.review_2_max || 50;
  const r3Max = settings.review_3_max || 100;

  // Numerical scores
  const numR1 = r1Score.trim() !== '' ? Number(r1Score) : null;
  const numR2 = r2Score.trim() !== '' ? Number(r2Score) : null;
  const numR3 = r3Score.trim() !== '' ? Number(r3Score) : null;

  // Calculated totals
  const prelimsMains = (numR1 !== null ? numR1 : 0) + (numR2 !== null ? numR2 : 0);
  const hasPrelimsMains = numR1 !== null || numR2 !== null;
  const grandTotal = (numR1 || 0) + (numR2 || 0) + (numR3 || 0);
  const totalMax = r1Max + r2Max + r3Max;
  const grandPercentage = totalMax > 0 ? ((grandTotal / totalMax) * 100).toFixed(1) : '0';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const judgeUsername = user?.username || 'admin1';

    try {
      // Helper to build or update a review
      const buildReview = (
        roundNum: 1 | 2 | 3,
        scoreVal: number,
        maxScore: number,
        existing?: Review,
        comment?: string
      ): Review => {
        return {
          id: existing?.id || `rev-manual-${summary.team.id}-${roundNum}-${Date.now()}`,
          team_id: summary.team.id,
          team_number: summary.team.team_number,
          review_number: roundNum,
          judge_id: existing?.judge_id || `judge-${judgeUsername}`,
          judge_username: existing?.judge_username || judgeUsername,
          scores: existing?.scores || [],
          total_score: scoreVal,
          max_possible_score: maxScore,
          comments: comment || existing?.comments || 'Marks updated via Marks Editor',
          status: 'submitted',
          submitted_at: existing?.submitted_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_locked: true,
        };
      };

      if (numR1 !== null && !isNaN(numR1)) {
        const clampedR1 = Math.min(Math.max(0, numR1), r1Max);
        await saveReview(buildReview(1, clampedR1, r1Max, summary.r1Review, r1Comments));
      }

      if (numR2 !== null && !isNaN(numR2)) {
        const clampedR2 = Math.min(Math.max(0, numR2), r2Max);
        await saveReview(buildReview(2, clampedR2, r2Max, summary.r2Review, r2Comments));
      }

      if (numR3 !== null && !isNaN(numR3)) {
        const clampedR3 = Math.min(Math.max(0, numR3), r3Max);
        await saveReview(buildReview(3, clampedR3, r3Max, summary.r3Review, r3Comments));
      }

      showToast(
        'Marks Updated',
        `Successfully updated evaluation scores for ${summary.team.team_number}.`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Error saving marks.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl my-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  {summary.team.team_number}
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {summary.team.team_name}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit &amp; override evaluation marks for all 3 competition rounds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Score Summary Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Prelims + Mains
              </span>
              <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
                {hasPrelimsMains ? `${prelimsMains} / 100` : '--'}
              </div>
            </div>

            <div className="text-center border-x border-slate-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Grand Total
              </span>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                {grandTotal} / {totalMax}
              </div>
            </div>

            <div className="text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Percentage
              </span>
              <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
                {grandPercentage}%
              </div>
            </div>
          </div>

          {/* Round 1 (Prelims) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center justify-center">
                  R1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Review 1 (Prelims)</h4>
                  <p className="text-[11px] text-slate-400">Weight: 25% · Maximum Score: {r1Max}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={r1Max}
                  step="any"
                  placeholder="Score"
                  value={r1Score}
                  onChange={(e) => setR1Score(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-right font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 font-mono">/ {r1Max}</span>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="R1 Judge Comments / Feedback"
                value={r1Comments}
                onChange={(e) => setR1Comments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Round 2 (Mains) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center">
                  R2
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Review 2 (Mains)</h4>
                  <p className="text-[11px] text-slate-400">Weight: 25% · Maximum Score: {r2Max}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={r2Max}
                  step="any"
                  placeholder="Score"
                  value={r2Score}
                  onChange={(e) => setR2Score(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-right font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 font-mono">/ {r2Max}</span>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="R2 Judge Comments / Feedback"
                value={r2Comments}
                onChange={(e) => setR2Comments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Round 3 (Grand Finale) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center justify-center">
                  R3
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Review 3 (Grand Finale)</h4>
                  <p className="text-[11px] text-slate-400">Weight: 50% · Maximum Score: {r3Max}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={r3Max}
                  step="any"
                  placeholder="Score"
                  value={r3Score}
                  onChange={(e) => setR3Score(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-right font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-500 font-mono">/ {r3Max}</span>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="R3 Grand Finale Judge Comments"
                value={r3Comments}
                onChange={(e) => setR3Comments(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Marks...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Update Marks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
