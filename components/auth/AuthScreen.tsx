'use client';

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Brain,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

const calcStrength = (pwd: string) => {
  if (!pwd) return null;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const map: Record<number, { label: string; color: string; pct: number }> = {
    1: { label: 'Weak', color: '#ef4444', pct: 25 },
    2: { label: 'Fair', color: '#f59e0b', pct: 50 },
    3: { label: 'Good', color: '#3b82f6', pct: 75 },
    4: { label: 'Strong', color: '#22c55e', pct: 100 },
  };
  return map[s] ?? { label: 'Too short', color: '#ef4444', pct: 10 };
};

interface AuthScreenProps {
  /** Optional notice shown at the top (e.g. "guest limit reached") */
  notice?: string | null;
  /** Force a starting mode (used when redirected from the guest limit) */
  initialMode?: 'login' | 'register';
  /** Hide the guest option (e.g. after limit reached) */
  hideGuest?: boolean;
}

export default function AuthScreen({ notice, initialMode, hideGuest }: AuthScreenProps) {
  const { updateUser, refreshAll, continueAsGuest, showToast } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode || 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = calcStrength(password);
  const passwordsMatch = password === confirmPassword;

  const switchMode = (m: typeof mode) => {
    setMode(m);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'register' && !passwordsMatch) {
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
        setError(data.error || 'Authentication failed. Please try again.');
        return;
      }
      if (data.user) {
        localStorage.setItem('recall_user', JSON.stringify(data.user));
        localStorage.setItem('recall_onboarded', '1');
        if (data.token) localStorage.setItem('recall_token', data.token);
        await updateUser(data.user);
        await refreshAll();
        showToast(
          mode === 'login'
            ? `Welcome back, ${data.user.name}!`
            : `Account created! Welcome, ${data.user.name}!`,
          'success'
        );
        // AppLayout detects the session and unmounts this screen
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await continueAsGuest();
    } finally {
      setGuestLoading(false);
    }
  };

  const inputCls =
    'h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus:border-blue-500 transition-all';

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* ── Card ─────────────────────────────────────────────────────────── */}
        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Soft blue glow, like the reference */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-blue-100 via-blue-50 to-transparent opacity-40 blur-3xl -mt-20 pointer-events-none" />

          <div className="relative p-8">
            {/* Logo + heading */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-white p-4 rounded-2xl shadow-lg mb-5 border border-gray-50">
                <Brain size={44} className="text-[#3B82F6]" strokeWidth={1.8} />
              </div>
              <h2 className="app-modal-title text-center text-gray-900">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="app-card-subtitle text-center text-gray-500 mt-2">
                {mode === 'login'
                  ? 'Sign in to continue to your account'
                  : 'Get started with Assistance AI'}
              </p>
            </div>

            {/* Notice (e.g. guest limit reached) */}
            {notice && (
              <div className="flex items-start gap-2.5 mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{notice}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed">{error}</span>
              </div>
            )}

            {/* ── Form ─────────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full name (register only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Full name</label>
                  <div className="relative">
                    <UserIcon
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      autoFocus
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email address</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    autoFocus={mode === 'login'}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputCls} pr-16`}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-md text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Password strength (register only) */}
                {mode === 'register' && password && strength && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Password strength</span>
                      <span className="text-[10px] font-semibold" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password (register only) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirm password</label>
                  <div className="relative">
                    <ShieldCheck
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`${inputCls} pr-16`}
                    />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-md text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        passwordsMatch ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 size={12} /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} /> Passwords don&apos;t match
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-blue-100 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>

            {/* ── Divider + mode switch ────────────────────────────────────── */}
            <div className="flex items-center my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-4 text-sm text-gray-400">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="w-full h-12 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg flex items-center justify-center text-sm font-medium transition-colors cursor-pointer"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in instead'}
            </button>

            {/* ── Guest ────────────────────────────────────────────────────── */}
            {!hideGuest && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={handleGuest}
                  disabled={guestLoading}
                  className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer underline underline-offset-2 decoration-dotted disabled:opacity-60"
                >
                  {guestLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Compass size={12} />
                  )}
                  Continue without account (limited features, no sync)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legal */}
        <p className="mt-6 text-center text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
          By continuing, you agree to our Terms of Service and acknowledge our Privacy Policy.
          Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}
