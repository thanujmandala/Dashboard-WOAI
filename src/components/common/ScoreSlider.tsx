import React from 'react';
import type { CriterionRubric } from '../../types';

interface ScoreSliderProps {
  criterion: CriterionRubric;
  score: number;
  comments: string;
  onChangeScore: (newScore: number) => void;
  onChangeComments: (newComments: string) => void;
  isLocked?: boolean;
}

export const ScoreSlider: React.FC<ScoreSliderProps> = ({
  criterion,
  score,
  comments,
  onChangeScore,
  onChangeComments,
  isLocked = false,
}) => {
  const max = criterion.max_score;

  // Preset buttons
  const presets = max === 10 ? [0, 5, 7, 8, 9, 10] : [0, 5, 10, 15, 18, 20];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const val = Number(e.target.value);
    onChangeScore(Math.min(max, Math.max(0, val)));
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const val = e.target.value === '' ? 0 : Number(e.target.value);
    if (!isNaN(val)) {
      onChangeScore(Math.min(max, Math.max(0, val)));
    }
  };

  // Color coding based on score ratio
  const ratio = score / max;
  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

  if (ratio >= 0.9) {
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else if (ratio >= 0.7) {
    badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  } else if (ratio >= 0.5) {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (score > 0) {
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all duration-200 ${
      isLocked 
        ? 'bg-slate-900/50 border-slate-800 opacity-90' 
        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700/80 shadow-md shadow-black/20'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-white tracking-tight">{criterion.name}</h4>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Max {max} pts
            </span>
          </div>
          {criterion.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{criterion.description}</p>
          )}
        </div>

        {/* Score Display & Direct Numeric Input */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl bg-slate-950 border border-slate-700 p-1">
            <input
              type="number"
              min={0}
              max={max}
              step={1}
              value={score}
              disabled={isLocked}
              onChange={handleNumberInput}
              aria-label={`Score for ${criterion.name}`}
              className="w-14 text-center font-mono font-bold text-lg text-white bg-transparent focus:outline-none disabled:opacity-75"
            />
            <span className="text-sm font-semibold text-slate-500 pr-2">/ {max}</span>
          </div>
          <div className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeColor}`}>
            {Math.round((score / max) * 100)}%
          </div>
        </div>
      </div>

      {/* Slider & Presets */}
      <div className="space-y-3 mt-4">
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={score}
              disabled={isLocked}
              onChange={handleSliderChange}
              aria-label={`Score slider for ${criterion.name}`}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-indigo-500"
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-500 px-0.5">
            <span>0</span>
            <span>{max / 2}</span>
            <span>{max}</span>
          </div>
        </div>

        {/* Quick Click Preset Pills */}
        {!isLocked && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-500 mr-1">Quick:</span>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeScore(preset)}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border transition-all ${
                  score === preset
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Criterion Comments */}
        <div className="mt-3">
          <textarea
            value={comments}
            disabled={isLocked}
            onChange={(e) => onChangeComments(e.target.value)}
            placeholder={isLocked ? 'No comments entered.' : `Specific remarks for ${criterion.name} (optional)...`}
            rows={2}
            className="w-full text-xs rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-75 resize-none"
          />
        </div>
      </div>
    </div>
  );
};
