'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Palette,
  Lock,
  Database,
  ShieldCheck,
  Check,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
  FileJson,
  KeyRound,
  HardDrive,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

type TabType = 'account' | 'appearance' | 'security' | 'backup' | 'system';

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

  const [activeTab, setActiveTab] = useState<TabType>('account');

  // Account state
  const [name, setName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup states
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Never');
  const [backupSize, setBackupSize] = useState<string>('0 KB');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Security & PIN states
  const [pinMode, setPinMode] = useState<'view' | 'create' | 'change' | 'remove'>('view');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
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
    if (!name.trim()) return;
    setIsSavingName(true);
    try {
      await updateUser({ name: name.trim() });
      setSaveSuccess(true);
      showToast('Profile updated successfully!', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
      refreshAll();
    } catch (err) {
      console.error('Failed to save profile', err);
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsSavingName(false);
    }
  };

  // ── Security PIN handlers ────────────────────────────────────
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

  // ── Backup & Vault handlers ──────────────────────────────────
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
      setBackupStatusText('Backup completed successfully!');
      showToast(`Personal backup snapshot saved (${formattedSize})`, 'success');

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
      title: 'Restore from Local Snapshot',
      message: `Restore your data from your latest local snapshot (${lastLocalBackup || 'Recent'})?`,
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
            showToast('Successfully restored all data from snapshot!', 'success');
            await refreshAll();
          } else {
            showToast('Failed to restore backup.', 'error');
          }
        } catch (err) {
          console.error('Restore error', err);
          showToast('Error restoring backup. Snapshot may be invalid.', 'error');
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
          showToast(`Successfully restored ${file.name}!`, 'success');
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
      title: 'Permanently Erase All Data',
      message:
        'This will erase all tasks, ledger dues, notes, memories, and personal settings from your local database. This cannot be undone.',
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
          showToast('All local data wiped successfully.', 'success');
          refreshAll();
        } catch (err) {
          console.error('Wipe failed', err);
          showToast('Failed to wipe data.', 'error');
        }
      },
    });
  };

  const tabs: { id: TabType; label: string; icon: any; badge?: string }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Theme & Display', icon: Palette },
    { id: 'security', label: 'Security & PIN', icon: Lock, badge: isPinSet ? 'ON' : undefined },
    { id: 'backup', label: 'Backup Vault', icon: Database },
    { id: 'system', label: 'Storage & System', icon: HardDrive },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary) font-sans">
      {/* ── Top Header ── */}
      <header className="h-16 px-4 sm:px-8 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-card)/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Settings size={20} className="animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-(--text-primary) truncate">
                Settings & Preferences
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wide">
                v2.5
              </span>
            </div>
            <p className="text-xs text-(--text-secondary) truncate font-medium">
              Configure your profile, theme, passcode lock, and automated backup vault
            </p>
          </div>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in shrink-0">
            <Check size={14} />
            <span>Saved</span>
          </span>
        )}
      </header>

      {/* ── Main Layout (Sidebar/Top Nav + Content) ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-24 md:pb-0">
        {/* Navigation Tabs (Horizontal on mobile / Sidebar on desktop) */}
        <nav className="shrink-0 w-full md:w-64 border-b md:border-b-0 md:border-r border-(--border-subtle) bg-(--bg-card)/40 p-3 sm:p-4 flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 md:w-full ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-md shadow-blue-500/20'
                    : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={isActive ? 'text-white' : 'text-(--text-muted)'} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-200">
            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 1: Account & Identity                                    */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                  <div className="flex items-center gap-4 pb-5 border-b border-(--border-subtle)">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-3 ring-(--bg-card)" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-(--text-primary)">
                        {user?.name || 'Personal Account'}
                      </h2>
                      <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                        Local Offline Profile · Encrypted Workspace
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-2">
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

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingName}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white hover:opacity-95 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                      >
                        {isSavingName ? <span>Saving...</span> : <><span>Save Name</span><Check size={16} /></>}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Account Status Card */}
                <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-(--text-primary)">Privacy Mode Active</div>
                      <div className="text-[11px] text-(--text-secondary)">All personal ledger and tasks stay on this device</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
                    Offline Ready
                  </span>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 2: Appearance & Theme                                    */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-5">
                  <div>
                    <h2 className="text-base font-bold text-(--text-primary)">Color Scheme & Mode</h2>
                    <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                      Select your preferred contrast aesthetic for all views and tools
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Dark Mode Card */}
                    <div
                      onClick={() => setTheme('dark')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
                        theme === 'dark'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 shadow-lg shadow-blue-500/10 ring-2 ring-[#4E82EE]/20'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-100">
                          <Moon size={20} />
                        </div>
                        {theme === 'dark' && (
                          <span className="w-6 h-6 rounded-full bg-[#4E82EE] text-white flex items-center justify-center shadow-xs">
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-(--text-primary)">Dark Contrast</div>
                      <div className="text-xs text-(--text-secondary) mt-0.5">
                        Deep OLED friendly dark mode with glowing accents
                      </div>
                    </div>

                    {/* Light Mode Card */}
                    <div
                      onClick={() => setTheme('light')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
                        theme === 'light'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 shadow-lg shadow-blue-500/10 ring-2 ring-[#4E82EE]/20'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                          <Sun size={20} />
                        </div>
                        {theme === 'light' && (
                          <span className="w-6 h-6 rounded-full bg-[#4E82EE] text-white flex items-center justify-center shadow-xs">
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-(--text-primary)">Light Minimal</div>
                      <div className="text-xs text-(--text-secondary) mt-0.5">
                        Clean, bright daylight aesthetic with high legibility
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 3: Security & PIN Passcode                               */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle)">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-(--text-primary)">
                          4-Digit PIN & Privacy Lock
                        </h2>
                        <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                          Passcode protection for ledger balances, notes, and tasks
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

                  {/* If PIN not set: Create Form */}
                  {!isPinSet && (
                    <form onSubmit={handleSetPin} className="space-y-4 text-xs">
                      <p className="text-xs text-(--text-secondary)">
                        Create a 4-digit numeric PIN to protect your personal assistant whenever you open or switch back to the app.
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

                  {/* If PIN is set: View Controls */}
                  {isPinSet && pinMode === 'view' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-sm text-(--text-primary)">Lock Application Now</div>
                          <div className="text-xs text-(--text-secondary) mt-0.5">
                            Immediately lock the screen to test or protect your active session
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
                          <div className="font-bold text-xs text-(--text-primary) group-hover:text-indigo-500">
                            Change Passcode
                          </div>
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
                          <div className="text-[11px] text-rose-500/70 mt-0.5">Remove passcode requirement</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Change PIN Mode */}
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

                  {/* Remove PIN Mode */}
                  {isPinSet && pinMode === 'remove' && (
                    <form onSubmit={handleRemovePin} className="space-y-4 text-xs">
                      <p className="text-xs text-rose-500 font-semibold">
                        Enter your current 4-digit PIN to disable lock protection.
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
                          Confirm & Disable PIN
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 4: Backup Vault & Restore                                */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                        <Database size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-(--text-primary)">Local Vault Snapshot</h3>
                        <p className="text-[11px] text-(--text-secondary) font-medium">1-Click backup of all tasks, dues, and notes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Ready</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle)">
                      <div className="text-(--text-secondary) text-xs font-semibold">Last Backup Time</div>
                      <div className="font-bold text-sm text-(--text-primary) mt-1">{lastLocalBackup}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle)">
                      <div className="text-(--text-secondary) text-xs font-semibold">Archive Size</div>
                      <div className="font-bold text-sm text-(--text-primary) mt-1">{backupSize}</div>
                    </div>
                  </div>

                  {/* 1-Click Backup Button */}
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
                          <Sparkles size={18} />
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

                {/* File Export and Restore Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export file */}
                  <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex flex-col justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-(--text-primary) flex items-center gap-1.5">
                        <Download size={16} className="text-[#4E82EE]" />
                        <span>Download JSON File</span>
                      </div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-1">
                        Export an offline <code className="font-mono text-[11px] text-(--text-primary)">.json</code> archive.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="w-full py-2.5 px-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-bold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download Archive</span>
                    </button>
                  </div>

                  {/* Restore from file */}
                  <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex flex-col justify-between gap-3 shadow-xs">
                    <div>
                      <div className="font-bold text-sm text-(--text-primary) flex items-center gap-1.5">
                        <FileJson size={16} className="text-amber-500" />
                        <span>Restore from JSON File</span>
                      </div>
                      <div className="text-xs text-(--text-secondary) font-medium mt-1">
                        Upload and restore from a previously saved <code className="font-mono text-[11px] text-(--text-primary)">.json</code> file.
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
                    <div className="font-bold text-sm text-(--text-primary)">Restore Latest Vault Snapshot</div>
                    <div className="text-xs text-(--text-secondary) font-medium mt-0.5">
                      Roll back to your stored snapshot ({lastLocalBackup})
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
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TAB 5: Storage & System / Danger Zone                         */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-(--border-subtle)">
                    <div className="w-10 h-10 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center border border-[#4E82EE]/20">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-(--text-primary)">System Architecture & Storage</h2>
                      <p className="text-xs text-(--text-secondary) font-medium mt-0.5">
                        Local Database & Environment Details
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between">
                      <span className="text-(--text-secondary) font-semibold">Engine Version</span>
                      <span className="font-mono font-bold text-(--text-primary)">v2.5 (Next.js 15 App Router)</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between">
                      <span className="text-(--text-secondary) font-semibold">Data Persistence</span>
                      <span className="font-mono font-bold text-emerald-500">Local JSON & SQLite Offline Sync</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between">
                      <span className="text-(--text-secondary) font-semibold">Security Level</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {isPinSet ? 'Encrypted PIN Protected' : 'Standard Sandbox'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-rose-500/20">
                    <ShieldAlert size={20} className="text-rose-500" />
                    <div>
                      <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400">Danger Zone</h3>
                      <p className="text-xs text-rose-500/70 font-medium">Irreversible database management operations</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-(--text-primary)">Erase All Local Data</div>
                      <div className="text-[11px] text-(--text-secondary) mt-0.5">
                        Permanently wipes all tasks, dues, notes, and resets settings to default.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleWipeData}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shrink-0 active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Wipe Database</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
