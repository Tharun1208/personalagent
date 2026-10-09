'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Delete, KeyRound, AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

export default function SecurityLockScreen() {
  const { isPinSet, isAppLocked, unlockApp } = useApp();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 4) return;
      setError(null);
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        // Attempt unlock
        setTimeout(() => {
          const success = unlockApp(nextPin);
          if (!success) {
            setIsShaking(true);
            setError('Incorrect PIN. Please try again.');
            setPin('');
            setTimeout(() => setIsShaking(false), 500);
          } else {
            setPin('');
            setError(null);
          }
        }, 150);
      }
    },
    [pin, unlockApp]
  );

  const handleDelete = useCallback(() => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setError(null);
    setPin('');
  }, []);

  // Physical keyboard listener
  useEffect(() => {
    if (!isAppLocked || !isPinSet) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAppLocked, isPinSet, handleDigit, handleDelete, handleClear]);

  if (!isPinSet || !isAppLocked) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Security PIN Lock Screen"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 select-none animate-fadeIn"
    >
      <div
        className={`w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl text-center transition-transform duration-200 ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Shield Icon Header */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Personal Agent Locked
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your 4-digit security PIN to unlock
        </p>

        {/* PIN Dots Indicator */}
        <div className="my-6 flex items-center justify-center space-x-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-indigo-600 dark:bg-indigo-500 scale-125 shadow-md shadow-indigo-500/30'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xl font-semibold text-slate-800 dark:text-slate-100 shadow-sm transition active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none uppercase tracking-wider"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xl font-semibold text-slate-800 dark:text-slate-100 shadow-sm transition active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete last digit"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 transition active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Shield className="h-3.5 w-3.5" />
          <span>Client-side hardware secured PIN</span>
        </div>
      </div>
    </div>
  );
}
