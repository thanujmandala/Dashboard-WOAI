import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { REVIEW_1_RUBRICS, REVIEW_2_RUBRICS, REVIEW_3_RUBRICS } from '../../constants/rubrics';
import type { TeamScoreSummary, Review, ReviewScore } from '../../types';
import {
  X,
  FileEdit,
  Save,
  Layers,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
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

  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Review 1 state
  const [r1Rubrics, setR1Rubrics] = useState<Record<string, number>>({});
  const [r1Total, setR1Total] = useState<string>('');
  const [r1Comments, setR1Comments] = useState<string>('');
  const [showR1Details, setShowR1Details] = useState<boolean>(true);

  // Review 2 state
  const [r2Rubrics, setR2Rubrics] = useState<Record<string, number>>({});
  const [r2Total, setR2Total] = useState<string>('');
  const [r2Comments, setR2Comments] = useState<string>('');
  const [showR2Details, setShowR2Details] = useState<boolean>(true);

  // Review 3 state
  const [r3Rubrics, setR3Rubrics] = useState<Record<string, number>>({});
  const [r3Total, setR3Total] = useState<string>('');
  const [r3Comments, setR3Comments] = useState<string>('');
  const [showR3Details, setShowR3Details] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && summary) {
      // R1 init
      const r1ScoresMap: Record<string, number> = {};
      REVIEW_1_RUBRICS.forEach((crit) => {
        const found = summary.r1Review?.scores?.find((s) => s.criterion_id === crit.id);
        r1ScoresMap[crit.id] = found ? found.score : 0;
      });
      setR1Rubrics(r1ScoresMap);
      setR1Total(summary.r1Score !== null && summary.r1Score !== undefined ? String(summary.r1Score) : '');
      setR1Comments(summary.r1Review?.comments || '');

      // R2 init
      const r2ScoresMap: Record<string, number> = {};
      REVIEW_2_RUBRICS.forEach((crit) => {
        const found = summary.r2Review?.scores?.find((s) => s.criterion_id === crit.id);
        r2ScoresMap[crit.id] = found ? found.score : 0;
      });
      setR2Rubrics(r2ScoresMap);
      setR2Total(summary.r2Score !== null && summary.r2Score !== undefined ? String(summary.r2Score) : '');
      setR2Comments(summary.r2Review?.comments || '');

      // R3 init
      const r3ScoresMap: Record<string, number> = {};
      REVIEW_3_RUBRICS.forEach((crit) => {
        const found = summary.r3Review?.scores?.find((s) => s.criterion_id === crit.id);
        r3ScoresMap[crit.id] = found ? found.score : 0;
      });
      setR3Rubrics(r3ScoresMap);
      setR3Total(summary.r3Score !== null && summary.r3Score !== undefined ? String(summary.r3Score) : '');
      setR3Comments(summary.r3Review?.comments || '');
    }
  }, [isOpen, summary]);

  if (!isOpen || !summary) return null;

  const r1Max = settings.review_1_max || 50;
  const r2Max = settings.review_2_max || 50;
  const r3Max = settings.review_3_max || 100;

  // Numerical totals
  const numR1 = r1Total.trim() !== '' ? Number(r1Total) : null;
  const numR2 = r2Total.trim() !== '' ? Number(r2Total) : null;
  const numR3 = r3Total.trim() !== '' ? Number(r3Total) : null;

  const prelimsMains = (numR1 !== null ? numR1 : 0) + (numR2 !== null ? numR2 : 0);
  const hasPrelimsMains = numR1 !== null || numR2 !== null;
  const grandTotal = (numR1 || 0) + (numR2 || 0) + (numR3 || 0);
  const totalMax = r1Max + r2Max + r3Max;
  const grandPercentage = totalMax > 0 ? ((grandTotal / totalMax) * 100).toFixed(1) : '0';

  // Handle Rubric change for R1
  const handleR1RubricChange = (critId: string, val: number) => {
    const clamped = Math.min(10, Math.max(0, val));
    const nextMap = { ...r1Rubrics, [critId]: clamped };
    setR1Rubrics(nextMap);
    const sum = Object.values(nextMap).reduce((a, b) => a + b, 0);
    setR1Total(sum.toString());
  };

  // Handle Rubric change for R2
  const handleR2RubricChange = (critId: string, val: number) => {
    const clamped = Math.min(10, Math.max(0, val));
    const nextMap = { ...r2Rubrics, [critId]: clamped };
    setR2Rubrics(nextMap);
    const sum = Object.values(nextMap).reduce((a, b) => a + b, 0);
    setR2Total(sum.toString());
  };

  // Handle Rubric change for R3
  const handleR3RubricChange = (critId: string, val: number) => {
    const clamped = Math.min(20, Math.max(0, val));
    const nextMap = { ...r3Rubrics, [critId]: clamped };
    setR3Rubrics(nextMap);
    const sum = Object.values(nextMap).reduce((a, b) => a + b, 0);
    setR3Total(sum.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const judgeUsername = user?.username || 'admin1';

    try {
      // 1. Save R1 if changed/provided
      if (numR1 !== null && !isNaN(numR1)) {
        const clampedR1 = Math.min(Math.max(0, numR1), r1Max);
        const scoresR1: ReviewScore[] = REVIEW_1_RUBRICS.map((crit) => ({
          criterion_id: crit.id,
          criterion_name: crit.name,
          score: r1Rubrics[crit.id] || 0,
          max_score: crit.max_score,
        }));

        const rev1: Review = {
          id: summary.r1Review?.id || `rev-edit-${summary.team.id}-1-${Date.now()}`,
          team_id: summary.team.id,
          team_number: summary.team.team_number,
          review_number: 1,
          judge_id: summary.r1Review?.judge_id || `judge-${judgeUsername}`,
          judge_username: summary.r1Review?.judge_username || judgeUsername,
          scores: scoresR1,
          total_score: clampedR1,
          max_possible_score: r1Max,
          comments: r1Comments || summary.r1Review?.comments || 'Marks updated via Rubrics Editor',
          status: 'submitted',
          submitted_at: summary.r1Review?.submitted_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_locked: true,
        };
        await saveReview(rev1);
      }

      // 2. Save R2 if changed/provided
      if (numR2 !== null && !isNaN(numR2)) {
        const clampedR2 = Math.min(Math.max(0, numR2), r2Max);
        const scoresR2: ReviewScore[] = REVIEW_2_RUBRICS.map((crit) => ({
          criterion_id: crit.id,
          criterion_name: crit.name,
          score: r2Rubrics[crit.id] || 0,
          max_score: crit.max_score,
        }));

        const rev2: Review = {
          id: summary.r2Review?.id || `rev-edit-${summary.team.id}-2-${Date.now()}`,
          team_id: summary.team.id,
          team_number: summary.team.team_number,
          review_number: 2,
          judge_id: summary.r2Review?.judge_id || `judge-${judgeUsername}`,
          judge_username: summary.r2Review?.judge_username || judgeUsername,
          scores: scoresR2,
          total_score: clampedR2,
          max_possible_score: r2Max,
          comments: r2Comments || summary.r2Review?.comments || 'Marks updated via Rubrics Editor',
          status: 'submitted',
          submitted_at: summary.r2Review?.submitted_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_locked: true,
        };
        await saveReview(rev2);
      }

      // 3. Save R3 if changed/provided
      if (numR3 !== null && !isNaN(numR3)) {
        const clampedR3 = Math.min(Math.max(0, numR3), r3Max);
        const scoresR3: ReviewScore[] = REVIEW_3_RUBRICS.map((crit) => ({
          criterion_id: crit.id,
          criterion_name: crit.name,
          score: r3Rubrics[crit.id] || 0,
          max_score: crit.max_score,
        }));

        const rev3: Review = {
          id: summary.r3Review?.id || `rev-edit-${summary.team.id}-3-${Date.now()}`,
          team_id: summary.team.id,
          team_number: summary.team.team_number,
          review_number: 3,
          judge_id: summary.r3Review?.judge_id || `judge-${judgeUsername}`,
          judge_username: summary.r3Review?.judge_username || judgeUsername,
          scores: scoresR3,
          total_score: clampedR3,
          max_possible_score: r3Max,
          comments: r3Comments || summary.r3Review?.comments || 'Marks updated via Rubrics Editor',
          status: 'submitted',
          submitted_at: summary.r3Review?.submitted_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_locked: true,
        };
        await saveReview(rev3);
      }

      showToast(
        'Evaluation Marks Saved',
        `Successfully updated rubrics marks for ${summary.team.team_number} (${summary.team.team_name}).`,
        'success'
      );
      onClose();
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Error updating marks.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  {summary.team.team_number}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {summary.team.team_name}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit rubric marks: Review 1 (50 pts), Review 2 (50 pts), and Review 3 (100 pts)
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

        {/* Live Score KPI Pill Bar */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-slate-950/70 border-b border-slate-800 shrink-0 text-center">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Prelims + Mains
            </span>
            <div className="text-sm sm:text-base font-bold text-indigo-400 font-mono mt-0.5">
              {hasPrelimsMains ? `${prelimsMains} / 100` : '--'}
            </div>
          </div>

          <div className="border-x border-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grand Total
            </span>
            <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
              {grandTotal} / {totalMax}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Weighted %
            </span>
            <div className="text-sm sm:text-base font-bold text-purple-400 font-mono mt-0.5">
              {grandPercentage}%
            </div>
          </div>
        </div>

        {/* Round Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 1
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Review 1 (50 pts)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(2)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 2
                ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Review 2 (50 pts)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(3)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 3
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Review 3 (100 pts)</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: REVIEW 1 (PRELIMS) */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Review 1 – Prelims</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono">
                      5 Rubrics • 10 Marks each
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter individual marks for each rubric or set round total directly.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Round Total:</span>
                  <input
                    type="number"
                    min={0}
                    max={r1Max}
                    value={r1Total}
                    onChange={(e) => setR1Total(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-center font-mono font-extrabold text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500">/ {r1Max}</span>
                </div>
              </div>

              {/* Rubric boxes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Review 1 Rubrics (50 Marks Split)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowR1Details(!showR1Details)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                  >
                    <span>{showR1Details ? 'Collapse Rubrics' : 'Expand Rubrics'}</span>
                    {showR1Details ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showR1Details && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {REVIEW_1_RUBRICS.map((crit, idx) => (
                      <div
                        key={crit.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              C{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white tracking-tight">
                              {crit.name}
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {crit.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={r1Rubrics[crit.id] !== undefined ? r1Rubrics[crit.id] : 0}
                              onChange={(e) => handleR1RubricChange(crit.id, Number(e.target.value))}
                              className="w-12 text-center font-mono font-bold text-xs text-white bg-transparent focus:outline-none"
                            />
                            <span className="text-xs font-semibold text-slate-500 pr-1">/ 10</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* R1 Comments */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Review 1 Judge Remarks &amp; Feedback
                </label>
                <textarea
                  value={r1Comments}
                  onChange={(e) => setR1Comments(e.target.value)}
                  placeholder="Enter specific observations for Review 1..."
                  rows={2}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: REVIEW 2 (MAINS) */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Review 2 – Mains</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono">
                      5 Rubrics • 10 Marks each
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter individual marks for each rubric or set round total directly.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Round Total:</span>
                  <input
                    type="number"
                    min={0}
                    max={r2Max}
                    value={r2Total}
                    onChange={(e) => setR2Total(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-center font-mono font-extrabold text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-xs font-bold text-slate-500">/ {r2Max}</span>
                </div>
              </div>

              {/* Rubric boxes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Review 2 Rubrics (50 Marks Split)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowR2Details(!showR2Details)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                  >
                    <span>{showR2Details ? 'Collapse Rubrics' : 'Expand Rubrics'}</span>
                    {showR2Details ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showR2Details && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {REVIEW_2_RUBRICS.map((crit, idx) => (
                      <div
                        key={crit.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              C{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white tracking-tight">
                              {crit.name}
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {crit.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={r2Rubrics[crit.id] !== undefined ? r2Rubrics[crit.id] : 0}
                              onChange={(e) => handleR2RubricChange(crit.id, Number(e.target.value))}
                              className="w-12 text-center font-mono font-bold text-xs text-white bg-transparent focus:outline-none"
                            />
                            <span className="text-xs font-semibold text-slate-500 pr-1">/ 10</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* R2 Comments */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Review 2 Judge Remarks &amp; Feedback
                </label>
                <textarea
                  value={r2Comments}
                  onChange={(e) => setR2Comments(e.target.value)}
                  placeholder="Enter specific observations for Review 2..."
                  rows={2}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: REVIEW 3 (FINALE) */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Review 3 – Grand Finale</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                      5 Rubrics • 20 Marks each
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter individual marks for each rubric or set round total directly.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Round Total:</span>
                  <input
                    type="number"
                    min={0}
                    max={r3Max}
                    value={r3Total}
                    onChange={(e) => setR3Total(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-center font-mono font-extrabold text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-500">/ {r3Max}</span>
                </div>
              </div>

              {/* Rubric boxes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Review 3 Rubrics (100 Marks Split)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowR3Details(!showR3Details)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <span>{showR3Details ? 'Collapse Rubrics' : 'Expand Rubrics'}</span>
                    {showR3Details ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showR3Details && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {REVIEW_3_RUBRICS.map((crit, idx) => (
                      <div
                        key={crit.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              C{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white tracking-tight">
                              {crit.name}
                            </span>
                          </div>
                          {crit.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {crit.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2 py-1">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={r3Rubrics[crit.id] !== undefined ? r3Rubrics[crit.id] : 0}
                              onChange={(e) => handleR3RubricChange(crit.id, Number(e.target.value))}
                              className="w-12 text-center font-mono font-bold text-xs text-white bg-transparent focus:outline-none"
                            />
                            <span className="text-xs font-semibold text-slate-500 pr-1">/ 20</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* R3 Comments */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Review 3 Grand Finale Remarks &amp; Feedback
                </label>
                <textarea
                  value={r3Comments}
                  onChange={(e) => setR3Comments(e.target.value)}
                  placeholder="Enter specific observations for Review 3..."
                  rows={2}
                  className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-amber-500 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Evaluation...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Marks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

