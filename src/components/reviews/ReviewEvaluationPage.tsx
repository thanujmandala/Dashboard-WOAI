import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Review, ReviewScore } from '../../types';
import { REVIEW_RUBRIC_MAP } from '../../constants/rubrics';
import { ScoreSlider } from '../common/ScoreSlider';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { EmptyState } from '../common/EmptyState';
import confetti from 'canvas-confetti';
import {
  Layers,
  Sparkles,
  Trophy,
  Save,
  Send,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';

interface ReviewEvaluationPageProps {
  roundNumber: 1 | 2 | 3;
  initialTeamNumber?: string;
  onNavigateTab?: (tab: string) => void;
}

export const ReviewEvaluationPage: React.FC<ReviewEvaluationPageProps> = ({
  roundNumber,
  initialTeamNumber,
}) => {
  const { user } = useAuth();
  const {
    teams,
    reviews,
    settings,
    saveReview,
    unlockReview,
    openImportModal,
  } = useData();

  const rubrics = REVIEW_RUBRIC_MAP[roundNumber] || [];
  const maxPossible = roundNumber === 3 ? settings.review_3_max : (roundNumber === 2 ? settings.review_2_max : settings.review_1_max);
  const roundTitle = roundNumber === 3 ? settings.review_3_name : (roundNumber === 2 ? settings.review_2_name : settings.review_1_name);

  // Selected Team
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Evaluation state
  const [scores, setScores] = useState<Record<string, { score: number; comments: string }>>({});
  const [overallComments, setOverallComments] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'draft' | 'submitted'>('pending');
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  useEffect(() => {
    if (teams.length === 0) return;

    if (initialTeamNumber) {
      const match = teams.find(
        (t) => t.team_number.toLowerCase() === initialTeamNumber.toLowerCase()
      );
      if (match) {
        setSelectedTeamId(match.id);
        return;
      }
    }

    if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, initialTeamNumber, selectedTeamId]);

  const currentTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || teams[0];
  }, [teams, selectedTeamId]);

  // Load existing review for current team & round
  useEffect(() => {
    if (!currentTeam) return;

    const rev = reviews.find(
      (r) => r.team_id === currentTeam.id && r.review_number === roundNumber
    );

    if (rev) {
      setExistingReview(rev);
      setIsLocked(rev.is_locked);
      setReviewStatus(rev.status);
      setOverallComments(rev.comments || '');

      const initialScores: Record<string, { score: number; comments: string }> = {};
      rubrics.forEach((crit) => {
        const found = rev.scores.find((s) => s.criterion_id === crit.id);
        initialScores[crit.id] = {
          score: found ? found.score : 0,
          comments: found?.comments || '',
        };
      });
      setScores(initialScores);
    } else {
      setExistingReview(null);
      setIsLocked(false);
      setReviewStatus('pending');
      setOverallComments('');

      const defaultScores: Record<string, { score: number; comments: string }> = {};
      rubrics.forEach((crit) => {
        defaultScores[crit.id] = { score: 0, comments: '' };
      });
      setScores(defaultScores);
    }
  }, [currentTeam, roundNumber, reviews, rubrics]);

  // Calculations
  const calculatedTotal = useMemo(() => {
    let sum = 0;
    rubrics.forEach((crit) => {
      sum += scores[crit.id]?.score || 0;
    });
    return Math.min(maxPossible, Math.max(0, sum));
  }, [scores, rubrics, maxPossible]);

  const scorePercentage = useMemo(() => {
    return (calculatedTotal / maxPossible) * 100;
  }, [calculatedTotal, maxPossible]);

  const handleScoreChange = (criterionId: string, val: number) => {
    if (isLocked) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        score: val,
      },
    }));
  };

  const handleCommentsChange = (criterionId: string, text: string) => {
    if (isLocked) return;
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        comments: text,
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (!currentTeam || !user) return;

    const reviewScores: ReviewScore[] = rubrics.map((crit) => ({
      criterion_id: crit.id,
      criterion_name: crit.name,
      score: scores[crit.id]?.score || 0,
      max_score: crit.max_score,
      comments: scores[crit.id]?.comments || '',
    }));

    const reviewData: Review = {
      id: existingReview?.id || `rev-${currentTeam.team_number}-${roundNumber}-${Date.now()}`,
      team_id: currentTeam.id,
      team_number: currentTeam.team_number,
      review_number: roundNumber,
      judge_id: user.id,
      judge_username: user.username,
      scores: reviewScores,
      total_score: calculatedTotal,
      max_possible_score: maxPossible,
      comments: overallComments,
      status: 'draft',
      is_locked: false,
      updated_at: new Date().toISOString(),
    };

    await saveReview(reviewData);
  };

  const handleSubmitReview = async () => {
    if (!currentTeam || !user) return;

    const reviewScores: ReviewScore[] = rubrics.map((crit) => ({
      criterion_id: crit.id,
      criterion_name: crit.name,
      score: scores[crit.id]?.score || 0,
      max_score: crit.max_score,
      comments: scores[crit.id]?.comments || '',
    }));

    const reviewData: Review = {
      id: existingReview?.id || `rev-${currentTeam.team_number}-${roundNumber}-${Date.now()}`,
      team_id: currentTeam.id,
      team_number: currentTeam.team_number,
      review_number: roundNumber,
      judge_id: user.id,
      judge_username: user.username,
      scores: reviewScores,
      total_score: calculatedTotal,
      max_possible_score: maxPossible,
      comments: overallComments,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      is_locked: true,
      updated_at: new Date().toISOString(),
    };

    await saveReview(reviewData);
    setIsSubmitModalOpen(false);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const handleUnlockConfirm = async (reason?: string) => {
    if (!currentTeam) return;
    await unlockReview(currentTeam.id, roundNumber, reason || 'Judge manual unlock request');
    setIsUnlockModalOpen(false);
  };

  const currentIndex = teams.findIndex((t) => t.id === selectedTeamId);
  const handleNextTeam = () => {
    if (currentIndex < teams.length - 1) {
      setSelectedTeamId(teams[currentIndex + 1].id);
    }
  };
  const handlePrevTeam = () => {
    if (currentIndex > 0) {
      setSelectedTeamId(teams[currentIndex - 1].id);
    }
  };

  if (teams.length === 0) {
    return (
      <EmptyState
        icon="teams"
        title="No Teams Available for Evaluation"
        description="Please upload team spreadsheet or register teams first."
        actionText="Import Teams"
        onAction={openImportModal}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Team Navigation Switcher Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white w-full focus:outline-none cursor-pointer py-0.5"
            >
              {teams.map((t) => {
                const r = reviews.find((rev) => rev.team_id === t.id && rev.review_number === roundNumber);
                const statusSymbol = r?.status === 'submitted' ? '✓' : r?.status === 'draft' ? '✎' : '○';
                return (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {statusSymbol} {t.team_number} — {t.team_name}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Team {currentIndex + 1} of {teams.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevTeam}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-200 border border-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>
          <button
            onClick={handleNextTeam}
            disabled={currentIndex === teams.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-200 border border-slate-700 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Team Overview Card */}
      {currentTeam && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-indigo-950/30 border border-slate-800/90 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 text-xs font-mono font-extrabold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {currentTeam.team_number}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono text-slate-300 rounded-md bg-slate-800 border border-slate-700">
                  {currentTeam.problem_statement_id}
                </span>
                {reviewStatus === 'submitted' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Submitted & Locked
                  </span>
                )}
                {reviewStatus === 'draft' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/30">
                    <Clock className="w-3 h-3" /> Draft In Progress
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {currentTeam.team_name}
              </h2>

              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-300">Members:</span>
                <span>{currentTeam.members.map((m: any) => m.name).join(', ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Live Round Score
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-0.5">
                  {calculatedTotal} <span className="text-sm font-semibold text-slate-500">/ {maxPossible}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
                {Math.round(scorePercentage)}%
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-bold text-white">Problem: </span>
                {currentTeam.problem_statement}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lock Notice & Unlock Button */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Evaluation is Locked.</span> Submitted by{' '}
              <span className="font-mono text-white font-bold">{existingReview?.judge_username}</span> on{' '}
              {existingReview?.submitted_at ? new Date(existingReview.submitted_at).toLocaleString() : 'N/A'}.
            </div>
          </div>
          <button
            onClick={() => setIsUnlockModalOpen(true)}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Evaluation</span>
          </button>
        </div>
      )}

      {/* Rubric Criteria Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            {roundNumber === 1 && <Layers className="w-4 h-4 text-indigo-400" />}
            {roundNumber === 2 && <Sparkles className="w-4 h-4 text-purple-400" />}
            {roundNumber === 3 && <Trophy className="w-4 h-4 text-amber-400" />}
            <span>Evaluation Criteria ({rubrics.length} Categories • Max {maxPossible} Marks)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {rubrics.map((criterion) => (
            <ScoreSlider
              key={criterion.id}
              criterion={criterion}
              score={scores[criterion.id]?.score || 0}
              comments={scores[criterion.id]?.comments || ''}
              onChangeScore={(val) => handleScoreChange(criterion.id, val)}
              onChangeComments={(text) => handleCommentsChange(criterion.id, text)}
              isLocked={isLocked}
            />
          ))}
        </div>
      </div>

      {/* Overall Judge Comments Box */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          Overall Round Summary & Judge Feedback
        </label>
        <textarea
          value={overallComments}
          disabled={isLocked}
          onChange={(e) => setOverallComments(e.target.value)}
          placeholder={isLocked ? 'No overall summary entered.' : 'Enter overall observations, strengths, and areas for improvement...'}
          rows={3}
          className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 p-3 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-75 resize-none"
        />
      </div>

      {/* Bottom Sticky Score & Action Bar */}
      <div className="sticky bottom-4 z-20 p-4 sm:p-5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {roundTitle} Total Score
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
                {calculatedTotal}
              </span>
              <span className="text-sm font-semibold text-slate-500 font-mono">
                / {maxPossible} Marks
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {scorePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isLocked && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Final Review</span>
              </button>
            </>
          )}

          {isLocked && (
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(true)}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock to Edit</span>
            </button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleSubmitReview}
        title={`Submit ${roundTitle}?`}
        message={`Are you sure you want to submit the final score of ${calculatedTotal}/${maxPossible} (${scorePercentage.toFixed(1)}%) for ${currentTeam?.team_name} (${currentTeam?.team_number})? Once submitted, the scores will be locked to prevent accidental changes.`}
        confirmText="Yes, Submit & Lock Review"
        cancelText="Keep Editing"
        type="primary"
      />

      <ConfirmationModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onConfirm={handleUnlockConfirm}
        title={`Unlock ${roundTitle}?`}
        message={`You are about to unlock the submitted evaluation for ${currentTeam?.team_name} (${currentTeam?.team_number}). Please provide a brief reason for the audit trail.`}
        confirmText="Authorize & Unlock"
        cancelText="Cancel"
        type="warning"
        requireReason={true}
        reasonPlaceholder="e.g. Correcting technical reasoning score based on Q&A verification..."
      />
    </div>
  );
};
