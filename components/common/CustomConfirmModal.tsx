'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface CustomConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

type DialogType = 'danger' | 'warning' | 'info' | 'success';

const THEME: Record<
  DialogType,
  {
    icon: typeof AlertTriangle;
    iconWrap: string;
    glow: string;
    accent: string;
    confirm: string;
    eyebrow: string;
  }
> = {
  danger: {
    icon: Trash2,
    iconWrap: 'bg-rose-500/10 text-rose-500 ring-8 ring-rose-500/5',
    glow: 'bg-rose-500/20',
    accent: 'from-rose-500 via-rose-400/60 to-transparent',
    confirm:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 focus-visible:ring-rose-500/40',
    eyebrow: 'text-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5',
    glow: 'bg-amber-500/20',
    accent: 'from-amber-500 via-amber-400/60 to-transparent',
    confirm:
      'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25 focus-visible:ring-amber-500/40',
    eyebrow: 'text-amber-500',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5',
    glow: 'bg-emerald-500/20',
    accent: 'from-emerald-500 via-emerald-400/60 to-transparent',
    confirm:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 focus-visible:ring-emerald-500/40',
    eyebrow: 'text-emerald-500',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-[#4E82EE]/10 text-[#4E82EE] ring-8 ring-[#4E82EE]/5',
    glow: 'bg-[#4E82EE]/20',
    accent: 'from-[#4E82EE] via-[#9B72CF]/60 to-transparent',
    confirm:
      'bg-[#4E82EE] hover:bg-[#3f6fd8] text-white shadow-lg shadow-blue-500/25 focus-visible:ring-blue-500/40',
    eyebrow: 'text-[#4E82EE]',
  },
};

export default function CustomConfirmModal({ dialog, onClose }: CustomConfirmModalProps) {
  const isOpen = Boolean(dialog?.isOpen);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Reset the pending state whenever the dialog closes.
  useEffect(() => {
    if (!isOpen) setBusy(false);
  }, [isOpen]);

  // Lock background scroll, focus the safe action, and support Esc to dismiss.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 60);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!dialog || !dialog.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
  } = dialog;

  const type: DialogType = dialog.type || 'danger';
  const theme = THEME[type] || THEME.info;
  const Icon = theme.icon;

  const handleCancel = () => {
    if (busy) return;
    if (onCancel) onCancel();
    onClose();
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep the dialog open so the user can retry after a failed action.
      setBusy(false);
    }
  };

  return (
    <div
      data-modal-backdrop="true"
      role="presentation"
      onClick={handleCancel}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-950/55 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] overflow-hidden rounded-[26px] border border-(--border-subtle) bg-(--bg-card) text-(--text-primary) shadow-[0_24px_70px_-20px_rgba(15,23,42,0.55)] animate-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Soft colored glow behind the header */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl ${theme.glow}`}
        />
        {/* Accent hairline across the top edge */}
        <div aria-hidden className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${theme.accent}`} />

        <button
          type="button"
          onClick={handleCancel}
          aria-label="Close dialog"
          disabled={busy}
          className="absolute right-3.5 top-3.5 z-10 rounded-full p-2 text-(--text-muted) transition-colors hover:bg-(--bg-elevated) hover:text-(--text-primary) disabled:opacity-40 cursor-pointer"
        >
          <X size={15} />
        </button>

        <div className="relative px-6 pt-8 pb-6 sm:px-7">
          <div className="flex flex-col items-center text-center">
            <div
              className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${theme.iconWrap}`}
            >
              <Icon size={26} strokeWidth={2} />
            </div>

            <span
              className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}
            >
              {type === 'danger' ? 'Confirm deletion' : type === 'warning' ? 'Please review' : 'Confirm action'}
            </span>

            <h3
              id="confirm-dialog-title"
              className="text-[17px] font-semibold leading-snug tracking-tight"
            >
              {title}
            </h3>

            <p
              id="confirm-dialog-message"
              className="mt-2 max-w-[320px] text-[13px] leading-relaxed text-(--text-muted)"
            >
              {message}
            </p>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={handleCancel}
              disabled={busy}
              className="flex-1 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) px-4 py-2.5 text-[13px] font-semibold text-(--text-secondary) transition-all hover:border-(--border-medium) hover:bg-(--bg-hover) hover:text-(--text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--border-medium) disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer ${theme.confirm}`}
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Working…</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
