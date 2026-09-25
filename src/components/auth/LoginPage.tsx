import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Cpu,
  KeyRound,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, availableJudges } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await login(username, password);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Check credentials.');
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (judgeUser: string) => {
    setUsername(judgeUser);
    setPassword('WOAI@123');
    setError('');
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 mb-2">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">
            Wonders of AI – Judge Portal
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Team Evaluation &amp; Review Dashboard
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Judge Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. admin1, admin2, admin3"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-xs rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs tracking-wide uppercase shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Demo Judge Accounts:
            </span>
            <span className="text-[10px] font-mono text-slate-500">Pass: WOAI@123</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {availableJudges.map((j) => (
              <button
                key={j.username}
                type="button"
                onClick={() => handleQuickFill(j.username)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-center transition-all group"
              >
                <div className="font-mono font-bold text-xs text-white group-hover:text-indigo-400">
                  {j.username}
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">Judge</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <Lock className="w-3 h-3 text-emerald-400" /> Protected Evaluation Environment
          </span>
        </div>
      </div>
    </div>
  );
};
