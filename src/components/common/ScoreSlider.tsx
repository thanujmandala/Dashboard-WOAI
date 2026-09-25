import React, { useState, useEffect } from 'react';
import type { CriterionRubric } from '../../types';
import { Plus, Minus, CheckCircle2 } from 'lucide-react';

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
  const [inputValue, setInputValue] = useState<string>(score.toString());

  useEffect(() => {
    setInputValue(score.toString());
  }, [score]);

  // Quick preset buttons
  const presets = max === 10 ? [0, 3, 5, 7, 8, 9, 10] : [0, 5, 10, 15, 18, 20];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const raw = e.target.value;
    setInputValue(raw);

    if (raw.trim() === '') {
      onChangeScore(0);
      return;
    }

    const num = Number(raw);
    if (!isNaN(num)) {
      const clamped = Math.min(max, Math.max(0, num));
      onChangeScore(clamped);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim() === '' || isNaN(Number(inputValue))) {
      setInputValue('0');
      onChangeScore(0);
    } else {
      const clamped = Math.min(max, Math.max(0, Number(inputValue)));
      setInputValue(clamped.toString());
      onChangeScore(clamped);
    }
  };

  const handleIncrement = () => {
    if (isLocked || score >= max) return;
    const next = Math.min(max, score + 1);
    setInputValue(next.toString());
    onChangeScore(next);
  };

  const handleDecrement = () => {
    if (isLocked || score <= 0) return;
    const next = Math.max(0, score - 1);
    setInputValue(next.toString());
    onChangeScore(next);
  };

  const handleSelectPreset = (preset: number) => {
    if (isLocked) return;
    setInputValue(preset.toString());
    onChangeScore(preset);
  };

  // Color coding based on score ratio
  const ratio = max > 0 ? score / max : 0;
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
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 ${
        isLocked
          ? 'bg-slate-900/50 border-slate-800 opacity-90'
          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700/80 shadow-md shadow-black/20'
      }`}
    >
      {/* Criterion Header & Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-white tracking-tight">{criterion.name}</h4>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Max {max} Marks
            </span>
          </div>
          {criterion.description && (
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{criterion.description}</p>
          )}
        </div>

        {/* Direct Numeric Marks Entry Box */}
        <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
          <div className="flex items-center bg-slate-950 rounded-2xl border-2 border-slate-700/80 hover:border-indigo-500/70 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 p-1 transition-all shadow-inner">
            {/* Decrement Button */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleDecrement}
                disabled={score <= 0}
                aria-label={`Decrease score for ${criterion.name}`}
                className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Input Box */}
            <div className="flex items-center px-2 py-0.5">
              <input
                type="number"
                min={0}
                max={max}
                step={1}
                value={inputValue}
                disabled={isLocked}
                onChange={handleInputChange}
                onBlur={handleBlur}
                aria-label={`Enter marks for ${criterion.name}`}
                placeholder="0"
                className="w-14 text-center font-mono font-extrabold text-xl text-white bg-transparent focus:outline-none disabled:opacity-75 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs font-bold text-slate-500 pr-1 select-none">
                / {max}
              </span>
            </div>

            {/* Increment Button */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleIncrement}
                disabled={score >= max}
                aria-label={`Increase score for ${criterion.name}`}
                className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Percentage Badge */}
          <div className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${badgeColor} flex items-center gap-1`}>
            {ratio >= 1 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            <span>{Math.round(ratio * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Quick Score Preset Pills */}
      {!isLocked && (
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-850">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 select-none">Quick Marks:</span>
          {presets.map((preset) => {
            const isSelected = score === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1 text-xs font-bold font-mono rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      )}

      {/* Criterion Comments Textarea */}
      <div className="mt-3">
        <textarea
          value={comments}
          disabled={isLocked}
          onChange={(e) => onChangeComments(e.target.value)}
          placeholder={isLocked ? 'No criterion remarks entered.' : `Enter specific remarks or feedback for ${criterion.name} (optional)...`}
          rows={2}
          className="w-full text-xs rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-75 resize-none"
        />
      </div>
    </div>
  );
};
