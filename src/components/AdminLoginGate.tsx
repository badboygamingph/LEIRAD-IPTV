import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Database,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  verifyAdminPassword,
  isSupabaseConfigured,
  DEFAULT_ADMIN_PASSWORD
} from '../utils/supabase';

interface AdminLoginGateProps {
  onSuccess: () => void;
  onReturnToApp: () => void;
}

export const AdminLoginGate: React.FC<AdminLoginGateProps> = ({
  onSuccess,
  onReturnToApp,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter the admin password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await verifyAdminPassword(password);
      if (result.success) {
        onSuccess();
      } else {
        setErrorMessage(result.message || 'Incorrect password. Access denied.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0a0f1d]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-cyan-500 p-[1.5px] shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#090d18] rounded-[15px] flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Restricted Route: /admin</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              LEIRAD TV Administration
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Please enter the master admin password to manage Supabase IPTV playlists and broadcast feeds.
            </p>
          </div>
        </div>

        {/* Supabase Status Indicator */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-medium">Auth Provider</span>
          </div>
          {supabaseReady ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Database
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400" title="Connect Supabase in settings to customize password remotely">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Local / Default Master
            </span>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Default initial password is <span className="font-mono font-bold">{DEFAULT_ADMIN_PASSWORD}</span>
              </p>
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Admin Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password..."
                autoFocus
                required
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 font-mono transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Unlock /admin Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Helper Notice */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onReturnToApp}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public TV (/)</span>
          </button>

          <button
            type="button"
            onClick={() => setPassword(DEFAULT_ADMIN_PASSWORD)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors cursor-pointer"
            title="Auto-fill default setup password"
          >
            Auto-fill Default Key
          </button>
        </div>
      </div>
    </div>
  );
};
