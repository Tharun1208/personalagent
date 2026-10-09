'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastAlertState {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'info' | 'error';
  duration?: number;
}

interface CustomToastAlertProps {
  toasts: ToastAlertState[];
  onDismiss: (id: string) => void;
}

export default function CustomToastAlert({ toasts, onDismiss }: CustomToastAlertProps) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 pointer-events-none w-[92vw] max-w-md">
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        return (
          <div
            key={toast.id}
            className="pointer-events-auto p-3.5 sm:p-4 rounded-2xl bg-(--bg-card)/95 backdrop-blur-xl border border-(--border-subtle) shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200 text-(--text-primary) ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="flex items-center gap-3 min-w-0">
              {type === 'success' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <CheckCircle2 size={17} />
                </div>
              )}
              {type === 'error' && (
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                  <AlertCircle size={17} />
                </div>
              )}
              {type === 'warning' && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <AlertTriangle size={17} />
                </div>
              )}
              {type === 'info' && (
                <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/15 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                  <Info size={17} />
                </div>
              )}
              <div className="text-xs sm:text-sm font-semibold text-(--text-primary) leading-snug">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
