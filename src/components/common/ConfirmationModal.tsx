import React, { useState } from 'react';
import { AlertCircle, Lock, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Please specify reason...',
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Reason is required for audit logging.');
      return;
    }
    onConfirm(reason);
    setReason('');
    setError('');
  };

  let btnColor = 'bg-indigo-600 hover:bg-indigo-500 text-white';
  let iconColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';

  if (type === 'danger') {
    btnColor = 'bg-rose-600 hover:bg-rose-500 text-white';
    iconColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (type === 'warning') {
    btnColor = 'bg-amber-600 hover:bg-amber-500 text-white';
    iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/70 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className={`p-3 rounded-xl border ${iconColor}`}>
            {type === 'warning' && requireReason ? (
              <Lock className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Wonders of AI • Security Guard
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">{message}</p>

        {requireReason && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Reason for Action (Recorded in Audit Log) *
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={2}
              placeholder={reasonPlaceholder}
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all shadow-md ${btnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
