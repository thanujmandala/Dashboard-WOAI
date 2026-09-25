import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { CompetitionSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Settings,
  Shield,
  Save,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Layers,
  Sparkles,
  Trophy,
  History,
  FileText,
  UserCheck,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, availableJudges } = useAuth();
  const {
    settings,
    updateSettings,
    resetToDemo,
    clearAllReviews,
    auditLogs,
    showToast,
    refreshData,
  } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formSettings, setFormSettings] = useState<CompetitionSettings>({ ...settings });
  const [modalAction, setModalAction] = useState<'reset_demo' | 'clear_reviews' | 'wipe_all' | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
  };

  const handleBackupDownload = () => {
    StorageService.exportFullBackup();
    showToast('Backup Exported', 'Full database snapshot downloaded successfully.', 'success');
  };

  const handleBackupRestore = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const ok = StorageService.importFullBackup(content, user?.username || 'admin1');
        if (ok) {
          refreshData();
          setFormSettings(StorageService.getSettings());
          showToast('Database Restored', 'Successfully restored database from backup.', 'success');
        } else {
          showToast('Restore Failed', 'Invalid JSON backup file format.', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">System & Evaluation Settings</h2>
            <p className="text-xs text-slate-400">
              Configure competition rubrics, advancement thresholds, stage weights, and database management
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>General Competition Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Competition Name
              </label>
              <input
                type="text"
                value={formSettings.competition_name}
                onChange={(e) => setFormSettings({ ...formSettings, competition_name: e.target.value })}
                className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Subtitle / Description
              </label>
              <input
                type="text"
                value={formSettings.subtitle}
                onChange={(e) => setFormSettings({ ...formSettings, subtitle: e.target.value })}
                className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Review Stages, Max Scores & Stage Weights</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Layers className="w-4 h-4" /> Review 1 Config
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Stage Title</label>
                <input
                  type="text"
                  value={formSettings.review_1_name}
                  onChange={(e) => setFormSettings({ ...formSettings, review_1_name: e.target.value })}
                  className="w-full text-xs rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={formSettings.review_1_max}
                    onChange={(e) => setFormSettings({ ...formSettings, review_1_max: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    value={formSettings.review_1_weight}
                    onChange={(e) => setFormSettings({ ...formSettings, review_1_weight: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" /> Review 2 Config
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Stage Title</label>
                <input
                  type="text"
                  value={formSettings.review_2_name}
                  onChange={(e) => setFormSettings({ ...formSettings, review_2_name: e.target.value })}
                  className="w-full text-xs rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={formSettings.review_2_max}
                    onChange={(e) => setFormSettings({ ...formSettings, review_2_max: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    value={formSettings.review_2_weight}
                    onChange={(e) => setFormSettings({ ...formSettings, review_2_weight: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Trophy className="w-4 h-4" /> Review 3 Config
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Stage Title</label>
                <input
                  type="text"
                  value={formSettings.review_3_name}
                  onChange={(e) => setFormSettings({ ...formSettings, review_3_name: e.target.value })}
                  className="w-full text-xs rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Score</label>
                  <input
                    type="number"
                    value={formSettings.review_3_max}
                    onChange={(e) => setFormSettings({ ...formSettings, review_3_max: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Weight (%)</label>
                  <input
                    type="number"
                    value={formSettings.review_3_weight}
                    onChange={(e) => setFormSettings({ ...formSettings, review_3_weight: Number(e.target.value) })}
                    className="w-full text-xs font-mono font-bold rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Grand Finale Advancement Rule</span>
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            Specify the qualification threshold criteria. Default rubric: Top 50 teams with combined Round 1 + Round 2 percentage &ge; 90% advance to the Grand Finale.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Advancement Threshold Percentage (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={formSettings.advancement_threshold_percent}
                onChange={(e) => setFormSettings({ ...formSettings, advancement_threshold_percent: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Max Top Teams Advancing (Quota)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                step={1}
                value={formSettings.advancement_top_teams_limit}
                onChange={(e) => setFormSettings({ ...formSettings, advancement_top_teams_limit: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      </form>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Configured Judge Accounts</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableJudges.map((j) => {
            const isCurrent = user?.username === j.username;

            return (
              <div
                key={j.username}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/15 border-indigo-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-white">{j.username}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/40">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 font-semibold">{j.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase font-mono">Role: {j.role}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Database Management & Full Backups</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleBackupDownload}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all group"
          >
            <Download className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Export Full Backup</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Download entire database as JSON</div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleBackupRestore(e.target.files[0]);
                }
              }}
            />
            <Upload className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Restore from Backup</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Upload and import JSON backup</div>
          </button>

          <button
            type="button"
            onClick={() => setModalAction('reset_demo')}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all group"
          >
            <RotateCcw className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Reset to Demo Teams</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Restore initial 5 demo teams</div>
          </button>

          <button
            type="button"
            onClick={() => setModalAction('clear_reviews')}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all group"
          >
            <Trash2 className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Clear All Reviews</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Reset all scores and drafts</div>
          </button>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span>System Audit Trail ({auditLogs.length} Events)</span>
        </h3>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-850 text-xs">
          {auditLogs.slice(0, 30).map((log) => (
            <div key={log.id} className="p-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-slate-200 font-semibold">{log.details}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Judge: <span className="font-mono text-indigo-400">{log.judge_username}</span> •{' '}
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-mono uppercase font-bold rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                {log.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalAction === 'reset_demo'}
        onClose={() => setModalAction(null)}
        onConfirm={() => {
          resetToDemo();
          setModalAction(null);
        }}
        title="Reset to Demo Data?"
        message="This will restore the 5 initial sample teams and baseline reviews for testing."
        confirmText="Yes, Restore Demo Data"
        type="warning"
      />

      <ConfirmationModal
        isOpen={modalAction === 'clear_reviews'}
        onClose={() => setModalAction(null)}
        onConfirm={() => {
          clearAllReviews();
          setModalAction(null);
        }}
        title="Clear All Evaluations?"
        message="This will permanently delete all submitted marks, comments, and drafts across all teams. Teams themselves will not be deleted."
        confirmText="Yes, Clear All Reviews"
        type="danger"
      />
    </div>
  );
};
