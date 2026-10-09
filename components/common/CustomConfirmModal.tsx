'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

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

export default function CustomConfirmModal({ dialog, onClose }: CustomConfirmModalProps) {
  if (!dialog || !dialog.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    onConfirm,
    onCancel,
  } = dialog;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } finally {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0">
            <Info size={24} />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    if (type === 'danger') {
      return 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 active:scale-95';
    }
    if (type === 'warning') {
      return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 active:scale-95';
    }
    return 'bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] hover:opacity-95 text-white shadow-blue-500/20 active:scale-95';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-16 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-(--bg-card) border border-(--border-subtle) rounded-3xl shadow-2xl p-6 overflow-hidden animate-top-modal text-(--text-primary)"
      >
        <div className="flex items-start gap-4">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="app-modal-title leading-tight mb-1.5">
              {title}
            </h3>
            <p className="app-card-subtitle leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-(--border-subtle)">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
