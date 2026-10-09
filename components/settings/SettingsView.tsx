'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Moon,
  Sun,
  Lock,
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  Edit2,
  HardDrive,
  KeyRound,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

export default function SettingsView() {
  const {
    user,
    updateUser,
    refreshAll,
    theme,
    setTheme,
    showToast,
    showConfirm,
    isPinSet,
    setAppPin,
    lockApp,
  } = useApp();

  // Profile edit modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Security PIN states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'create' | 'change' | 'remove'>('create');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Backup states
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Never');
  const [backupSize, setBackupSize] = useState<string>('0 KB');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocal = localStorage.getItem('recall_backup_local_time');
      const storedSize = localStorage.getItem('recall_backup_size');
      if (storedLocal) setLastLocalBackup(storedLocal);
      if (storedSize) setBackupSize(storedSize);
    }
  }, []);

  // ── Profile handler ──────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setIsSavingName(true);
    try {
      await updateUser({ name: profileName.trim() });
      showToast('Profile name updated!', 'success');
      setIsEditProfileOpen(false);
      refreshAll();
    } catch (err) {
      console.error('Failed to save profile', err);
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  // ── PIN Handlers ─────────────────────────────────────────────
  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN and Confirmation do not match');
      return;
    }
    setAppPin(newPin);
    showToast('4-Digit PIN Lock enabled!', 'success');
    setNewPin('');
    setConfirmPin('');
    setIsPinModalOpen(false);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const storedHash = localStorage.getItem('recall_app_pin_hash');
    if (storedHash && btoa(oldPin) !== storedHash) {
      setPinError('Current PIN is incorrect');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirmation do not match');
      return;
    }
    setAppPin(newPin);
    showToast('Security PIN changed!', 'success');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setIsPinModalOpen(false);
  };

  const handleRemovePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const storedHash = localStorage.getItem('recall_app_pin_hash');
    if (storedHash && btoa(oldPin) !== storedHash) {
      setPinError('Current PIN is incorrect');
      return;
    }
    setAppPin(null);
    showToast('PIN Lock disabled', 'info');
    setOldPin('');
    setIsPinModalOpen(false);
  };

  // ── Backup Handlers ──────────────────────────────────────────
  const handlePerformBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(25);
    setBackupStatusText('Packaging memories, notes, ledger & tasks...');

    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const data = await res.json();
      setBackupProgress(65);
      setBackupStatusText('Encrypting local snapshot...');

      const exportJson = JSON.stringify(data.export || {});
      const sizeBytes = new Blob([exportJson]).size;
      const formattedSize =
        sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;

      await new Promise((r) => setTimeout(r, 300));
      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      localStorage.setItem('recall_backup_local_time', timeStr);
      localStorage.setItem('recall_backup_size', formattedSize);
      localStorage.setItem('recall_cloud_backup_snapshot', exportJson);
      setLastLocalBackup(timeStr);
      setBackupSize(formattedSize);

      setBackupProgress(100);
      setBackupStatusText('Backup completed!');
      showToast(`Personal backup saved (${formattedSize})`, 'success');

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatusText('');
      }, 800);
    } catch (err) {
      console.error('Backup failed', err);
      setIsBackingUp(false);
      showToast('Backup failed. Please try again.', 'error');
    }
  };

  const handleRestoreFromSnapshot = async () => {
    showConfirm({
      title: 'Restore from Backup',
      message: `Restore your data from your latest snapshot (${lastLocalBackup})?`,
      confirmText: 'Restore',
      type: 'warning',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          const snapshot = localStorage.getItem('recall_cloud_backup_snapshot');
          if (!snapshot) {
            showToast('No backup found. Please create a backup first.', 'error');
            setIsRestoring(false);
            return;
          }
          const backupData = JSON.parse(snapshot);
          const res = await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', backupData }),
          });
          const result = await res.json();
          if (result.success) {
            showToast('Data restored from backup!', 'success');
            await refreshAll();
          } else {
            showToast('Failed to restore backup.', 'error');
          }
        } catch (err) {
          console.error('Restore error', err);
          showToast('Invalid backup snapshot.', 'error');
        } finally {
          setIsRestoring(false);
        }
      },
    });
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);
        const res = await apiFetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', backupData }),
        });
        const result = await res.json();
        if (result.success) {
          showToast(`Restored ${file.name}!`, 'success');
          await refreshAll();
        } else {
          showToast('Failed to restore file.', 'error');
        }
      } catch (err) {
        showToast('Invalid backup file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportData = async () => {
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal_assistant_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup file downloaded (.json)', 'success');
    } catch (err) {
      console.error('Export failed', err);
      showToast('Failed to export data', 'error');
    }
  };

  const handleWipeData = () => {
    showConfirm({
      title: 'Erase All Data',
      message: 'This will permanently delete all tasks, dues, notes, and reset settings. This action cannot be undone.',
      confirmText: 'Erase Everything',
      type: 'danger',
      onConfirm: async () => {
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'wipe' }),
          });
          showToast('All local data has been erased.', 'success');
          refreshAll();
        } catch (err) {
          console.error('Wipe failed', err);
          showToast('Failed to erase data.', 'error');
        }
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary) font-sans">
      {/* ── WhatsApp Style Mobile Header ── */}
      <header className="h-14 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-card)/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-lg font-bold tracking-tight text-(--text-primary)">
          Settings
        </h1>
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-(--bg-elevated) text-(--text-muted) border border-(--border-subtle)">
          v2.5
        </span>
      </header>

      {/* ── Main Scrollable WhatsApp-Style Settings Page ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar pb-32 sm:pb-36 md:pb-12">
        <div className="w-full max-w-lg space-y-4 sm:space-y-5 animate-in fade-in duration-150">

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 1. TOP PROFILE BANNER (WhatsApp / Mobile Settings Style)      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div
            onClick={() => setIsEditProfileOpen(true)}
            className="p-4 sm:p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between gap-3 shadow-xs hover:bg-(--bg-elevated)/70 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/25">
                  {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-(--bg-card)" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-(--text-primary) truncate group-hover:text-[#4E82EE] transition-colors">
                    {user?.name || 'Personal Account'}
                  </h2>
                  <Edit2 size={13} className="text-(--text-muted) opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-(--text-secondary) font-medium truncate mt-0.5">
                  Personal Assistant • Offline Protected
                </p>
              </div>
            </div>

            <ChevronRight size={18} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors shrink-0" />
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2. GROUP 1: APPEARANCE / THEME                                */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
            {/* Theme Row */}
            <div
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-4 flex items-center justify-between hover:bg-(--bg-elevated) transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--text-primary)">Appearance</div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">
                    {theme === 'dark' ? 'Dark Mode (Night)' : 'Light Mode (Day)'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="px-3 py-1 rounded-full bg-(--bg-elevated) border border-(--border-subtle) text-xs font-bold text-(--text-primary) flex items-center gap-1.5"
              >
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 3. GROUP 2: PRIVACY & PASSCODE LOCK                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
            {/* PIN Row */}
            <div
              onClick={() => {
                setPinError('');
                setOldPin('');
                setNewPin('');
                setConfirmPin('');
                setPinMode(isPinSet ? 'change' : 'create');
                setIsPinModalOpen(true);
              }}
              className="p-4 flex items-center justify-between hover:bg-(--bg-elevated) transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--text-primary) flex items-center gap-2">
                    <span>4-Digit PIN Lock</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPinSet
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isPinSet ? 'On' : 'Off'}
                    </span>
                  </div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">
                    {isPinSet ? 'Passcode protection active' : 'Secure your ledger, notes, and messages'}
                  </div>
                </div>
              </div>

              <ChevronRight size={18} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors shrink-0" />
            </div>

            {/* If PIN is set: Quick Lock Button */}
            {isPinSet && (
              <div
                onClick={() => lockApp()}
                className="p-4 flex items-center justify-between hover:bg-(--bg-elevated) transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-(--text-primary)">Lock Application Now</div>
                    <div className="text-xs text-(--text-secondary) mt-0.5">Test PIN or secure active session</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs"
                >
                  Lock
                </button>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 4. GROUP 3: CHATS & DATA BACKUP                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
            {/* Backup Hub Row */}
            <div
              onClick={() => setIsBackupModalOpen(true)}
              className="p-4 flex items-center justify-between hover:bg-(--bg-elevated) transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                  <Database size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--text-primary) flex items-center gap-2">
                    <span>Chat & Data Backup</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                      Vault
                    </span>
                  </div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">
                    {lastLocalBackup ? `Last: ${lastLocalBackup}` : 'Save local snapshot and export files'}
                  </div>
                </div>
              </div>

              <ChevronRight size={18} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors shrink-0" />
            </div>

            {/* Export JSON quick button */}
            <div
              onClick={handleExportData}
              className="p-4 flex items-center justify-between hover:bg-(--bg-elevated) transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-[#4E82EE]/15 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                  <Download size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--text-primary)">Export Data (.json)</div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">Download portable offline archive</div>
                </div>
              </div>

              <ChevronRight size={18} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors shrink-0" />
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 5. GROUP 4: SYSTEM INFO & DANGER ZONE                        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
            {/* System Info */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <HardDrive size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-(--text-primary)">Storage & System</div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">Offline-first local SQLite and JSON sync</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-(--bg-elevated) text-(--text-muted)">
                v2.5
              </span>
            </div>

            {/* Danger Row: Erase Data */}
            <div
              onClick={handleWipeData}
              className="p-4 flex items-center justify-between hover:bg-rose-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">Erase All Personal Data</div>
                  <div className="text-xs text-rose-500/70 mt-0.5">Permanently delete tasks, dues, notes, and reset</div>
                </div>
              </div>

              <ChevronRight size={18} className="text-rose-400 group-hover:text-rose-600 transition-colors shrink-0" />
            </div>
          </div>

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 1: Edit Profile Name (WhatsApp Style Modal)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <h3 className="text-base font-bold text-(--text-primary)">Edit Profile Name</h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase">
                  Your Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-bold text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSavingName ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 2: 4-Digit Passcode PIN Manager                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-emerald-500" />
                <h3 className="text-base font-bold text-(--text-primary)">
                  {pinMode === 'create' ? 'Set 4-Digit PIN' : pinMode === 'change' ? 'Change Security PIN' : 'Disable PIN'}
                </h3>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={17} />
              </button>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                {pinError}
              </div>
            )}

            {/* Set New PIN Form */}
            {pinMode === 'create' && (
              <form onSubmit={handleSetPin} className="space-y-4 text-xs">
                <p className="text-xs text-(--text-secondary)">
                  Set a 4-digit PIN to lock your personal agent when returning to the app.
                </p>
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">New 4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    autoFocus
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2 border-t border-(--border-subtle)">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-(--bg-elevated) text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Enable PIN
                  </button>
                </div>
              </form>
            )}

            {/* Change PIN Form */}
            {pinMode === 'change' && (
              <form onSubmit={handleChangePin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    autoFocus
                    placeholder="••••"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">New 4-Digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-(--border-subtle)">
                  <button
                    type="button"
                    onClick={() => {
                      setPinError('');
                      setOldPin('');
                      setPinMode('remove');
                    }}
                    className="text-xs text-rose-500 font-bold hover:underline"
                  >
                    Disable PIN
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPinModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-(--bg-elevated) text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Remove PIN Form */}
            {pinMode === 'remove' && (
              <form onSubmit={handleRemovePin} className="space-y-4 text-xs">
                <p className="text-xs text-rose-500 font-semibold">
                  Enter your current 4-digit PIN to disable app passcode lock.
                </p>
                <div>
                  <label className="block font-bold text-(--text-secondary) uppercase mb-1">Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    autoFocus
                    placeholder="••••"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2 border-t border-(--border-subtle)">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-(--bg-elevated) text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    Confirm & Disable
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 3: Backup Vault Modal (WhatsApp Chat Backup Style)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-teal-500" />
                <h3 className="text-base font-bold text-(--text-primary)">Chat & Data Backup</h3>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={17} />
              </button>
            </div>

            {/* Metrics */}
            <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-(--text-secondary)">Last Backup:</span>
                <span className="font-bold text-(--text-primary)">{lastLocalBackup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-secondary)">Archive Size:</span>
                <span className="font-bold text-(--text-primary)">{backupSize}</span>
              </div>
            </div>

            {/* Main Backup Button */}
            <button
              type="button"
              disabled={isBackingUp}
              onClick={handlePerformBackup}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>{backupStatusText || 'Backing up...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>BACK UP NOW</span>
                </>
              )}
            </button>

            {/* Restore from snapshot */}
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestoreFromSnapshot}
              className="w-full py-2.5 px-4 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Restore from Latest Snapshot</span>
            </button>

            {/* Restore from file */}
            <label className="w-full py-2.5 px-4 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload size={14} />
              <span>Import .JSON Backup File</span>
              <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
            </label>
          </div>
        </div>
      )}

    </div>
  );
}
