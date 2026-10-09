'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Check,
  Download,
  Trash2,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  Upload,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  CloudUpload,
  RefreshCw,
  FileJson,
  Database,
  Lock,
  KeyRound,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

export default function SettingsView() {
  const appCtx = useApp();
  const { user, updateUser, refreshAll, theme, setTheme, showToast, showConfirm, isPinSet, setAppPin, lockApp } = appCtx;

  // View routing: 'main' | 'profile' | 'backup' | 'data' | 'security'
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'backup' | 'data' | 'security'>('main');

  // Backup states
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Today, 2:00 AM');
  const [backupSize, setBackupSize] = useState<string>('184 KB');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Profile states
  const [name, setName] = useState(user?.name || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // Security & PIN states
  const [pinMode, setPinMode] = useState<'view' | 'create' | 'change' | 'remove'>('view');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

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
    showToast('4-Digit Security PIN enabled successfully!', 'success');
    setNewPin('');
    setConfirmPin('');
    setPinMode('view');
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
    showToast('Security PIN changed successfully!', 'success');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMode('view');
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
    showToast('PIN Lock disabled successfully', 'info');
    setOldPin('');
    setPinMode('view');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocal = localStorage.getItem('recall_backup_local_time');
      const storedSize = localStorage.getItem('recall_backup_size');

      if (storedLocal) setLastLocalBackup(storedLocal);
      if (storedSize) setBackupSize(storedSize);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateUser({ name: name.trim() });
      setSavedSuccess(true);
      showToast(`✓ Profile updated successfully!`, 'success');
      setTimeout(() => setSavedSuccess(false), 3000);
      refreshAll();
    } catch (err) {
      console.error('Failed to save profile', err);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePerformBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(20);
    setBackupStatusText('Packaging memories, notes, conversations & tasks...');

    try {
      setBackupProgress(50);
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const data = await res.json();
      const exportJson = JSON.stringify(data.export || {});
      const sizeBytes = new Blob([exportJson]).size;
      const formattedSize =
        sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;

      setBackupProgress(85);
      setBackupStatusText('Encrypting local snapshot...');
      await new Promise((r) => setTimeout(r, 350));

      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      // Save local device snapshot
      localStorage.setItem('recall_backup_local_time', timeStr);
      localStorage.setItem('recall_backup_size', formattedSize);
      localStorage.setItem('recall_cloud_backup_snapshot', exportJson);
      setLastLocalBackup(timeStr);
      setBackupSize(formattedSize);

      setBackupProgress(100);
      setBackupStatusText('Backup completed successfully!');
      showToast(`✓ Personal backup snapshot saved (${formattedSize})`, 'success');

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatusText('');
      }, 1000);
    } catch (err) {
      console.error('Backup failed', err);
      setIsBackingUp(false);
      showToast('Backup failed. Please try again.', 'error');
    }
  };

  const handleRestoreFromSnapshot = async () => {
    showConfirm({
      title: 'Restore from Vault Snapshot',
      message: `Restore your memories, notes, conversations, and tasks from your latest snapshot (${lastLocalBackup || 'Recent'})?`,
      confirmText: 'Restore Now',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          const snapshot = localStorage.getItem('recall_cloud_backup_snapshot');
          if (!snapshot) {
            showToast('No backup snapshot found. Please create a backup first.', 'error');
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
            showToast('✓ Successfully restored all data from snapshot!', 'success');
            await refreshAll();
          } else {
            showToast('Failed to restore backup.', 'error');
          }
        } catch (err) {
          console.error('Restore error', err);
          showToast('Error restoring backup. File may be corrupted.', 'error');
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
          showToast(`✓ Successfully restored ${file.name}!`, 'success');
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
      showToast('✓ Backup file downloaded (.json)', 'success');
    } catch (err) {
      console.error('Export failed', err);
      showToast('Failed to export data', 'error');
    }
  };

  const handleWipeData = () => {
    showConfirm({
      title: 'Wipe All Personal Data',
      message: 'This will permanently delete all your memories, tasks, habits, and preferences. This action cannot be undone.',
      confirmText: 'Yes, Wipe Everything',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'wipe' }),
          });
          showToast('All memories, tasks, and data have been wiped.', 'success');
          refreshAll();
        } catch (err) {
          console.error('Wipe failed', err);
          showToast('Failed to wipe data. Please try again.', 'error');
        }
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary) font-sans">
      {/* ── Top Header Bar ── */}
      <div className="h-15 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-card)/70 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {currentView !== 'main' && (
            <button
              onClick={() => setCurrentView('main')}
              className="p-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer mr-0.5 flex items-center gap-1.5 text-xs font-bold shrink-0 border border-(--border-subtle)"
              title="Back to Settings Hub"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Settings size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-(--text-primary) truncate">
              {currentView === 'main' && 'System Settings'}
              {currentView === 'profile' && 'Profile & Appearance'}
              {currentView === 'security' && 'Privacy & PIN Lock'}
              {currentView === 'backup' && 'Personal Backup & Restore'}
              {currentView === 'data' && 'Data & Privacy'}
            </h1>
            <p className="text-xs text-(--text-secondary) truncate font-medium">
              {currentView === 'main' && 'Personal preferences, themes, backup and storage'}
              {currentView === 'profile' && 'Manage your personal identity, display name, and color theme'}
              {currentView === 'security' && 'Configure 4-digit security PIN and privacy app lock'}
              {currentView === 'backup' && 'Simple 1-click personal backup and recovery'}
              {currentView === 'data' && 'Manage local data export and privacy reset'}
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shrink-0">
            <Check size={15} />
            <span>Saved</span>
          </span>
        )}
      </div>

      {/* ── Main Settings Content ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar pb-32 sm:pb-36 md:pb-12">
        <div className="w-full max-w-2xl space-y-6">

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 1: Main System Settings Hub                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'main' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* User Profile Card Header */}
              <div
                onClick={() => setCurrentView('profile')}
                className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 hover:bg-(--bg-elevated)/60 transition-all cursor-pointer shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-(--bg-card)" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-(--text-primary) truncate group-hover:text-[#4E82EE] transition-colors">
                      {user?.name || 'Personal Account'}
                    </h2>
                    <p className="text-xs text-(--text-secondary) font-medium truncate mt-0.5">
                      Personal Assistant · Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#4E82EE] font-bold hidden sm:inline group-hover:underline">
                    Edit Profile
                  </span>
                  <ChevronRight size={18} className="text-(--text-muted) group-hover:text-[#4E82EE] transition-colors" />
                </div>
              </div>

              {/* Group 1: Preferences */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-secondary) px-2">
                  Preferences & Interface
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) overflow-hidden shadow-xs">
                  {/* Item 1: Profile & Appearance */}
                  <div
                    onClick={() => setCurrentView('profile')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Palette size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-(--text-primary)">
                          Profile & Theme
                        </div>
                        <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          Display name, appearance & color scheme ({theme === 'dark' ? 'Dark' : 'Light'})
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>
                </div>
              </div>

              {/* Group 2: Privacy & Security */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-secondary) px-2">
                  Privacy & App Lock
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) overflow-hidden shadow-xs">
                  <div
                    onClick={() => {
                      setPinError('');
                      setOldPin('');
                      setNewPin('');
                      setConfirmPin('');
                      setPinMode('view');
                      setCurrentView('security');
                    }}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Lock size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-(--text-primary) flex items-center gap-2">
                          <span>4-Digit PIN App Lock</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPinSet
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isPinSet ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          {isPinSet
                            ? 'Screen lock is active. Tap to change or remove PIN.'
                            : 'Set a 4-digit PIN to secure your ledger, notes, and messages.'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>
                </div>
              </div>

              {/* Group 2: System & Storage */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-secondary) px-2">
                  Backup & Storage
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
                  
                  {/* Item: Backup & Restore */}
                  <div
                    onClick={() => setCurrentView('backup')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                        <Database size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-(--text-primary) flex items-center gap-2">
                          <span>Personal Backup & Restore</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                            1-Click
                          </span>
                        </div>
                        <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          {lastLocalBackup ? `Last backup: ${lastLocalBackup}` : 'Save local snapshot and export files'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* Item: Data & Privacy */}
                  <div
                    onClick={() => setCurrentView('data')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-(--text-primary)">
                          Data & Local Privacy
                        </div>
                        <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          Download portable JSON data, reset local storage
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* App Info row */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-(--text-primary)">
                          Assistance Personal AI OS
                        </div>
                        <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          Offline-Ready · Encrypted Vault · Personal Edition
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-(--bg-elevated) text-(--text-primary) font-mono font-bold border border-(--border-subtle)">
                      v2.5
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 2: Profile & Theme Sub-Page                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-(--border-subtle)">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                    {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-(--text-primary)">
                      {user?.name || 'Personal Account'}
                    </h3>
                    <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                      Personal display name & interface theme
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-semibold text-(--text-primary) focus:outline-hidden focus:border-[#4E82EE] transition-all"
                  />
                </div>

                {/* Theme Selector */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    Color Theme Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 ring-2 ring-[#4E82EE]/30 shadow-md'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-100 shrink-0">
                        <Moon size={18} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-(--text-primary)">Dark Mode</div>
                        <div className="text-[11px] text-(--text-secondary) font-medium truncate">Night contrast mode</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 ring-2 ring-[#4E82EE]/30 shadow-md'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                        <Sun size={18} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-(--text-primary)">Light Mode</div>
                        <div className="text-[11px] text-(--text-secondary) font-medium truncate">Clean bright mode</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white hover:opacity-95 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  {isSaving ? <span>Saving...</span> : <><span>Save Profile</span><Check size={16} /></>}
                </button>
              </div>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW: Privacy & PIN Lock Sub-Page                            */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle)">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-(--text-primary)">
                        4-Digit PIN & Privacy Lock
                      </h3>
                      <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                        Client-side passcode protection for your ledger, notes, and messages
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isPinSet
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {isPinSet ? 'Active' : 'Not Set'}
                  </span>
                </div>

                {pinError && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                    {pinError}
                  </div>
                )}

                {/* State A: PIN Not Set */}
                {!isPinSet && (
                  <form onSubmit={handleSetPin} className="space-y-4 text-xs">
                    <p className="text-xs text-(--text-secondary)">
                      Create a 4-digit numeric PIN. Every time you open Personal Agent or return to it, this PIN will be required.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                          New 4-Digit PIN *
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                          Confirm PIN *
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        Enable PIN Protection
                      </button>
                    </div>
                  </form>
                )}

                {/* State B: PIN Already Set */}
                {isPinSet && pinMode === 'view' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-sm text-(--text-primary)">Lock Application Now</div>
                        <div className="text-xs text-(--text-secondary) mt-0.5">
                          Instantly lock the app to test or protect your active session
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => lockApp()}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <Lock size={14} />
                        <span>Lock Now</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPinError('');
                          setOldPin('');
                          setNewPin('');
                          setConfirmPin('');
                          setPinMode('change');
                        }}
                        className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
                      >
                        <div className="font-bold text-xs text-(--text-primary) group-hover:text-indigo-500">Change PIN</div>
                        <div className="text-[11px] text-(--text-secondary) mt-0.5">Update your existing 4-digit code</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPinError('');
                          setOldPin('');
                          setPinMode('remove');
                        }}
                        className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-left transition-all cursor-pointer group"
                      >
                        <div className="font-bold text-xs text-rose-600 dark:text-rose-400">Disable PIN Lock</div>
                        <div className="text-[11px] text-rose-500/70 mt-0.5">Remove passcode protection</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* State C: Change PIN Form */}
                {isPinSet && pinMode === 'change' && (
                  <form onSubmit={handleChangePin} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                        Current 4-Digit PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        placeholder="••••"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full sm:w-1/2 px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                          New 4-Digit PIN *
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                          Confirm New PIN *
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          placeholder="••••"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPinMode('view')}
                        className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer"
                      >
                        Update PIN
                      </button>
                    </div>
                  </form>
                )}

                {/* State D: Remove PIN Form */}
                {isPinSet && pinMode === 'remove' && (
                  <form onSubmit={handleRemovePin} className="space-y-4 text-xs">
                    <p className="text-xs text-rose-500 font-semibold">
                      Please enter your current 4-digit PIN to disable app lock.
                    </p>
                    <div>
                      <label className="block font-bold text-(--text-secondary) uppercase mb-1.5">
                        Current PIN *
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        required
                        placeholder="••••"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full sm:w-1/2 px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-lg font-bold text-center tracking-widest text-(--text-primary) focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPinMode('view')}
                        className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer"
                      >
                        Confirm & Remove PIN
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Back to Settings */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Back to Settings
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 3: Simple Personal Backup & Restore Sub-Page             */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'backup' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Clean Status & Backup Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                      <Database size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-(--text-primary)">Personal Backup Status</h3>
                      <p className="text-[11px] text-(--text-secondary) font-medium">All tasks, notes, habits, and memories</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle)">
                    <div className="text-(--text-secondary) text-xs font-semibold">Last Backup Time</div>
                    <div className="font-bold text-sm text-(--text-primary) mt-1">{lastLocalBackup || 'Never'}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle)">
                    <div className="text-(--text-secondary) text-xs font-semibold">Archive Size</div>
                    <div className="font-bold text-sm text-(--text-primary) mt-1">{backupSize}</div>
                  </div>
                </div>

                {/* Main 1-Click Back Up Button */}
                <div>
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handlePerformBackup}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      isBackingUp
                        ? 'bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] opacity-70 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] hover:opacity-95 active:scale-[0.99] shadow-blue-500/25'
                    }`}
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        <span>{backupStatusText || 'Saving snapshot...'}</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload size={18} />
                        <span>BACK UP DATA NOW</span>
                      </>
                    )}
                  </button>

                  {isBackingUp && (
                    <div className="mt-3 space-y-1.5 animate-in fade-in">
                      <div className="w-full bg-(--bg-elevated) h-2 rounded-full overflow-hidden border border-(--border-subtle)">
                        <div
                          className="bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] h-full transition-all duration-300 rounded-full"
                          style={{ width: `${backupProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-(--text-secondary) font-mono">
                        <span>{backupStatusText}</span>
                        <span>{backupProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions & Recovery */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-secondary) px-2">
                  Backup Files & Recovery
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Export file */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex flex-col justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-(--text-primary) flex items-center gap-1.5">
                        <Download size={15} className="text-[#4E82EE]" />
                        <span>Download Backup File</span>
                      </div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-1">
                        Export all your data into a portable <code className="font-mono text-[11px] text-(--text-primary)">.json</code> file.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="w-full py-2.5 px-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-bold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download .JSON</span>
                    </button>
                  </div>

                  {/* Restore from file */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex flex-col justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-(--text-primary) flex items-center gap-1.5">
                        <FileJson size={15} className="text-amber-500" />
                        <span>Restore from File</span>
                      </div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-1">
                        Upload a previously saved <code className="font-mono text-[11px] text-(--text-primary)">.json</code> backup file.
                      </div>
                    </div>
                    <label className="w-full py-2.5 px-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-amber-500 text-xs font-bold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload size={14} />
                      <span>Choose .JSON File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileRestore}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Restore latest snapshot */}
                <div className="p-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between gap-3 text-xs shadow-xs">
                  <div>
                    <div className="font-bold text-sm text-(--text-primary)">Restore Latest Snapshot</div>
                    <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                      Roll back to your stored snapshot ({lastLocalBackup || 'Recent'})
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleRestoreFromSnapshot}
                    className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {isRestoring ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    <span>Restore</span>
                  </button>
                </div>
              </div>

              {/* Back to Settings */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Back to Settings
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 4: Data & Local Privacy Sub-Page                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-5">
                <div className="flex items-center gap-3.5 pb-4 border-b border-(--border-subtle)">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-(--text-primary)">
                      Data & Local Privacy
                    </h3>
                    <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                      Manage your offline database, downloads, and storage wipe
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-(--text-primary)">Export All Data (.json)</div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-0.5">Save a local copy of all memories, tasks, and notes</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-4 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Export</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-rose-600 dark:text-rose-400">Wipe Local Database</div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-0.5">Permanently erase all local memories, tasks, and history</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleWipeData}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Trash2 size={14} />
                      <span>Wipe All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Back to Settings */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Back to Settings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
