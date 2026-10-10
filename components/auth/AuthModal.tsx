'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Cloud,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { isGuestEmail } from '@/lib/guest';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const calculatePasswordStrength = (pwd: string) => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  switch (score) {
    case 1: return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    case 2: return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    case 3: return { score: 75, label: 'Good', color: 'bg-blue-500' };
    case 4: return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
    default: return { score: 10, label: 'Very Weak', color: 'bg-rose-600' };
  }
};

const GUEST_EMAILS = ['guest@assistance.ai', 'alex@example.com'];
const isGuest = (email?: string) => !email || GUEST_EMAILS.includes(email);

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, updateUser, refreshAll, showToast, signOut } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLoggedIn = user && !isGuestEmail(user.email);
  const strength = calculatePasswordStrength(password);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }
      if (data.user) {
        try {
          localStorage.setItem('recall_user', JSON.stringify(data.user));
          localStorage.setItem('recall_onboarded', '1');
          if (data.token) localStorage.setItem('recall_token', data.token);
        } catch {}
        await updateUser(data.user);
        await refreshAll();
        showToast(mode === 'login' ? `Welcome back, ${data.user.name}!` : `Account created! Welcome, ${data.user.name}!`, 'success');
        onClose();
      }
    } catch (err: any) {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully.', 'info');
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div
      data-modal-backdrop="true"
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 sm:pt-14 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-[420px] bg-(--bg-card) border border-(--border-subtle) rounded-[28px] shadow-2xl overflow-hidden animate-top-modal">

        {/* ── Close Button ─────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
        >
          <X size={17} />
        </button>

        {/* ── If Already Signed In ──────────────────────────────────────── */}
        {isLoggedIn ? (
          <div className="p-7 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-2xl flex items-center justify-center shadow-lg">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-(--text-primary)">{user.name}</div>
                <div className="text-xs text-(--text-muted) mt-0.5">{user.email}</div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                <CheckCircle2 size={12} /> Cloud Sync Active
              </span>
            </div>

            {/* Account Details */}
            <div className="rounded-2xl border border-(--border-subtle) bg-(--bg-elevated) divide-y divide-(--border-subtle) overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-(--text-muted)">Account ID</span>
                <span className="text-[11px] font-mono text-(--text-secondary) truncate max-w-[160px]">{user.id}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-(--text-muted)">Encryption</span>
                <span className="text-[11px] text-emerald-600 font-semibold">BCrypt + JWT</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-(--text-muted)">Member since</span>
                <span className="text-[11px] text-(--text-secondary)">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        ) : (
          <>
            {/* ── Header Branding ───────────────────────────────────────── */}
            <div className="px-7 pt-7 pb-5 text-center space-y-3">
              {/* Gradient logo mark */}
              <div className="w-14 h-14 rounded-[22px] bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center mx-auto shadow-lg">
                <Sparkles size={28} />
              </div>
              <div>
                <h2 className="app-modal-title">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="app-card-subtitle mt-1 leading-relaxed">
                  {mode === 'login'
                    ? 'Sign in to sync your memories, tasks & goals across all devices.'
                    : 'Set up your Assistance account for encrypted cloud backup.'}
                </p>
              </div>
            </div>

            {/* ── Mode Tabs ─────────────────────────────────────────────── */}
            <div className="px-7 mb-1">
              <div className="flex p-1 bg-(--bg-elevated) border border-(--border-subtle) rounded-2xl">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-(--bg-card) text-(--text-primary) shadow-sm'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-(--bg-card) text-(--text-primary) shadow-sm'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* ── Form ─────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="px-7 pb-7 pt-4 space-y-4">
              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed">{error}</span>
                </div>
              )}

              {/* Name — Register only */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE] focus:ring-2 focus:ring-[#4E82EE]/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE] focus:ring-2 focus:ring-[#4E82EE]/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE] focus:ring-2 focus:ring-[#4E82EE]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary) cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength — register only */}
                {mode === 'register' && password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-(--text-muted)">Password strength</span>
                      <span className={`text-[10px] font-semibold ${
                        strength.score >= 100 ? 'text-emerald-500' :
                        strength.score >= 75 ? 'text-blue-500' :
                        strength.score >= 50 ? 'text-amber-500' : 'text-rose-500'
                      }`}>{strength.label}</span>
                    </div>
                    <div className="w-full h-1 bg-(--bg-elevated) rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} rounded-full transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password — register only */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE] focus:ring-2 focus:ring-[#4E82EE]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary) cursor-pointer transition-colors"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 font-medium">Passwords don&apos;t match</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white font-semibold text-sm shadow-lg shadow-[#4E82EE]/20 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Continue as Guest */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-medium text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-all cursor-pointer"
              >
                Continue as Guest (local only, no sync)
              </button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck size={12} className="text-(--text-muted)" />
                <span className="text-[10px] text-(--text-muted)">
                  End-to-end encrypted · BCrypt hashed · JWT secured
                </span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
