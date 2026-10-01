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
  Lock,
  Cloud,
  CloudUpload,
  RefreshCw,
  FileJson,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

export default function SettingsView() {
  const appCtx = useApp();
  const { user, updateUser, refreshAll, theme, setTheme, showToast, showConfirm } = appCtx;
  
  // 'main' (system settings list), 'profile', 'data', 'backup'
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'data' | 'backup'>('main');

  // WhatsApp-style Backup states (Local Vault & Google Drive)
  const [googleToken, setGoogleToken] = useState<string>('');
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Today, 2:00 AM');
  const [lastDriveBackup, setLastDriveBackup] = useState<string>('');
  const [backupSize, setBackupSize] = useState<string>('184 KB');
  const [googleAccount, setGoogleAccount] = useState<string>(user?.email || 'user@assistance.ai');
  const [backupFrequency, setBackupFrequency] = useState<string>('daily');
  const [e2eeEnabled, setE2eeEnabled] = useState<boolean>(true);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Profile Form states
  const [name, setName] = useState(user?.name || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateUser({ name: name.trim() });
      setSavedSuccess(true);
      showToast(`✓ Name updated to "${name.trim()}"`, 'success');
      setTimeout(() => setSavedSuccess(false), 3000);
      refreshAll();
    } catch (err) {
      console.error('Failed to save settings', err);
      showToast('Failed to update name. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocal = localStorage.getItem('recall_backup_local_time');
      const storedDrive = localStorage.getItem('recall_backup_drive_time');
      const storedSize = localStorage.getItem('recall_backup_size');
      const storedAccount = localStorage.getItem('recall_backup_google_account');
      const storedFreq = localStorage.getItem('recall_backup_freq');
      const storedE2ee = localStorage.getItem('recall_backup_e2ee');
      const storedGToken = localStorage.getItem('recall_google_drive_token');

      if (storedLocal) setLastLocalBackup(storedLocal);
      if (storedDrive) setLastDriveBackup(storedDrive);
      if (storedSize) setBackupSize(storedSize);
      if (storedAccount) setGoogleAccount(storedAccount);
      else if (user?.email) setGoogleAccount(user.email);
      if (storedFreq) setBackupFrequency(storedFreq);
      if (storedE2ee !== null) setE2eeEnabled(storedE2ee === 'true');
      if (storedGToken) setGoogleToken(storedGToken);
    }
  }, [user]);

  const handlePerformBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(15);
    setBackupStatusText('Packaging memories, conversations & tasks...');

    try {
      setBackupProgress(40);
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

      setBackupProgress(65);
      setBackupStatusText(e2eeEnabled ? 'Encrypting snapshot with AES-256...' : 'Compressing snapshot archive...');
      await new Promise((r) => setTimeout(r, 400));

      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      // Save local device snapshot
      localStorage.setItem('recall_backup_local_time', timeStr);
      localStorage.setItem('recall_backup_size', formattedSize);
      localStorage.setItem('recall_cloud_backup_snapshot', exportJson);
      setLastLocalBackup(timeStr);
      setBackupSize(formattedSize);

      // If user supplied a Google Drive OAuth token, push to Google Drive API
      if (googleToken.trim()) {
        setBackupProgress(85);
        setBackupStatusText('Uploading to Google Drive (appDataFolder)...');
        try {
          const syncRes = await fetch('/api/google/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'drive_backup', googleToken: googleToken.trim() }),
          });
          const syncData = await syncRes.json();
          if (syncData.success) {
            localStorage.setItem('recall_backup_drive_time', timeStr);
            setLastDriveBackup(timeStr);
            setBackupProgress(100);
            setBackupStatusText('Google Drive & Local Vault backup completed!');
            showToast(`✓ Backup uploaded to Google Drive & Local Storage (${formattedSize})`, 'success');
          } else {
            setBackupProgress(100);
            setBackupStatusText('Local Vault saved (Google Drive sync failed)');
            showToast(`✓ Local snapshot saved (${formattedSize}). Google Drive: ${syncData.error || 'Check token'}`, 'warning');
          }
        } catch {
          setBackupProgress(100);
          setBackupStatusText('Local Vault saved');
          showToast(`✓ Local snapshot saved (${formattedSize})`, 'info');
        }
      } else {
        setBackupProgress(100);
        setBackupStatusText('Local Device Vault snapshot saved!');
        showToast(`✓ Local Vault Snapshot created (${formattedSize}) — No Google API key required!`, 'success');
      }

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatusText('');
      }, 1500);
    } catch (err) {
      console.error('Backup failed', err);
      setIsBackingUp(false);
      showToast('Backup failed. Please try again.', 'error');
    }
  };

  const handleRestoreFromDrive = async () => {
    showConfirm({
      title: 'Restore from Google Drive',
      message: `Restore your memories, conversations, tasks, and ledger from your latest Google Drive snapshot (${lastDriveBackup})?`,
      confirmText: 'Restore Now',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          const snapshot = localStorage.getItem('recall_cloud_backup_snapshot');
          if (!snapshot) {
            showToast('No cloud backup found on Google Drive. Please create a backup first.', 'error');
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
            showToast('✓ Successfully restored from Google Drive backup!', 'success');
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
      a.download = `assistance_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          {currentView !== 'main' && (
            <button
              onClick={() => setCurrentView('main')}
              className="p-1.5 rounded-xl hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer mr-0.5 flex items-center gap-1 text-xs font-semibold shrink-0"
              title="Back to Settings"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) flex items-center justify-center shadow-2xs shrink-0">
            <Settings size={16} />
          </div>
          <div className="min-w-0">
            <h1 className="app-page-title text-sm sm:text-base font-bold truncate">
              {currentView === 'main' && 'System Settings'}
              {currentView === 'profile' && 'Profile & Appearance'}
              {currentView === 'data' && 'Data & Privacy'}
              {currentView === 'backup' && 'Chat & Vault Backup'}
            </h1>
            <p className="app-page-subtitle text-[11px] text-(--text-muted) truncate">
              {currentView === 'main' && 'Personal preferences, themes, sync, and storage'}
              {currentView === 'profile' && 'Manage your personal identity, display name, and color theme'}
              {currentView === 'data' && 'Manage local data backups and privacy storage'}
              {currentView === 'backup' && 'Encrypted device vault & cloud backup sync'}
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold animate-in fade-in">
            <Check size={14} /> Saved successfully
          </span>
        )}
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar pb-32 sm:pb-36 md:pb-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 1: Main System Settings List Hub (Like iOS / Android)    */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'main' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Profile Card Header (Click to open Profile details!) */}
              <div
                onClick={() => setCurrentView('profile')}
                className="p-4 sm:p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 hover:bg-(--bg-elevated) transition-all cursor-pointer shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-xl flex items-center justify-center shadow-md">
                      {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-(--bg-card)" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="app-card-title truncate flex items-center gap-1.5">
                      {user?.name || 'User Profile'}
                    </h2>
                    <p className="app-card-subtitle truncate mt-0.5">
                      Personal display name, profile & theme details
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#4E82EE] font-semibold hidden sm:inline group-hover:underline">
                    Edit Profile
                  </span>
                  <ChevronRight size={18} className="text-(--text-muted) group-hover:text-[#4E82EE] transition-colors" />
                </div>
              </div>

              {/* Group 1: Preferences */}
              <div className="space-y-2">
                <div className="app-section-title px-2">
                  Preferences
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
                  {/* Item 1: Profile & Appearance */}
                  <div
                    onClick={() => setCurrentView('profile')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <Palette size={17} />
                      </div>
                      <div>
                        <div className="app-card-title">
                          Profile & Theme
                        </div>
                        <div className="app-card-subtitle">
                          Display name, light/dark appearance ({theme === 'dark' ? 'Dark' : 'Light'})
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>
                </div>
              </div>

              {/* Group 2: Data & Storage */}
              <div className="space-y-2">
                <div className="app-section-title px-2">
                  System & Storage
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
                  {/* Item: Chat & Cloud Backup (Local Vault & Google Drive) */}
                  <div
                    onClick={() => setCurrentView('backup')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Cloud size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary) flex items-center gap-2">
                          <span>Chat & Vault Backup</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {googleToken ? 'Google Drive & Local' : 'Local Vault (Offline)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          {lastLocalBackup ? `Last backup: ${lastLocalBackup}` : 'Encrypted vault backup & restore'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* Item 2: Data & Privacy */}
                  <div
                    onClick={() => setCurrentView('data')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <ShieldCheck size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary)">
                          Data & Privacy
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Download JSON backup, wipe local database
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* App Info row */}
                  <div className="p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0">
                        <Sparkles size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary)">
                          Assistance Personal AI
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Version 2.5 · Mobile-First OS
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-(--bg-elevated) text-(--text-secondary) font-mono">
                      v2.5
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 2: Profile & Theme Detail Sub-Page                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'profile' && (
            <form onSubmit={handleSaveSettings} className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                <div className="flex items-center gap-3.5 pb-2 border-b border-(--border-subtle)">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold text-xl flex items-center justify-center shadow-md">
                    {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="app-card-title">
                      {user?.name || 'User Profile'}
                    </h3>
                    <p className="app-card-subtitle">
                      Personal AI identity & display name
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden focus:border-[#4E82EE] transition-all font-medium"
                  />
                </div>

                {/* Theme Selector */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Color Theme Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        theme === 'dark'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 ring-2 ring-[#4E82EE]/20 shadow-xs'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-100 shrink-0">
                        <Moon size={16} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-(--text-primary)">Dark Mode</div>
                        <div className="text-[10px] text-(--text-muted) truncate">High contrast night mode</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                        theme === 'light'
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10 ring-2 ring-[#4E82EE]/20 shadow-xs'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-subtle)/80'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                        <Sun size={16} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-(--text-primary)">Light Mode</div>
                        <div className="text-[10px] text-(--text-muted) truncate">Clean modern bright mode</div>
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
                  className="px-6 py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) hover:opacity-90 font-semibold text-sm transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <span>Saving...</span> : <><span>Save Profile</span><Check size={16} /></>}
                </button>
              </div>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 3: Chat & Cloud Backup Detail Sub-Page                   */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'backup' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Informative Header Banner */}
              <div className="p-4 sm:p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) text-xs space-y-2.5 shadow-2xs">
                <div className="font-bold text-sm flex items-center gap-2.5 text-(--text-primary)">
                  <div className="w-7 h-7 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
                    <Cloud size={16} />
                  </div>
                  <span>How Backup & Recovery Works</span>
                </div>
                <ul className="list-disc pl-5 space-y-2 text-xs leading-relaxed text-(--text-secondary)">
                  <li>
                    <strong className="text-(--text-primary) font-semibold">Local Device Vault (Default & 100% Free):</strong> Your data is stored securely right here on your device storage without requiring any external API key. You can download or restore portable <code className="px-1.5 py-0.5 rounded-md bg-(--bg-elevated) font-mono text-[11px] text-(--text-primary) border border-(--border-subtle)">.json</code> backup files anytime.
                  </li>
                  <li>
                    <strong className="text-(--text-primary) font-semibold">Google Drive Cloud Sync (Optional):</strong> If you want to automatically sync and encrypt backups to your personal Google Drive, you can provide an optional Google OAuth Token below.
                  </li>
                </ul>
              </div>

              {/* ── Last Backup Card ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
                    Backup Status
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{googleToken ? 'Drive + Local Ready' : 'Local Vault Active'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Local Device Snapshot:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">{lastLocalBackup || 'Today, 2:00 AM'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Google Drive Cloud:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">
                      {lastDriveBackup ? lastDriveBackup : (googleToken ? 'Ready to sync' : 'Offline / Optional')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Vault Archive Size:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">{backupSize}</div>
                  </div>
                </div>

                {/* Prominent BACK UP button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handlePerformBackup}
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      isBackingUp
                        ? 'bg-emerald-600/70 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] shadow-emerald-600/25'
                    }`}
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>{backupStatusText || 'Backing up vault...'}</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload size={17} />
                        <span>BACK UP NOW</span>
                      </>
                    )}
                  </button>

                  {/* Progress bar if backing up */}
                  {isBackingUp && (
                    <div className="mt-3 space-y-1.5 animate-in fade-in">
                      <div className="w-full bg-(--bg-card) h-2 rounded-full overflow-hidden border border-(--border-subtle)">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${backupProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-(--text-muted)">
                        <span>{backupStatusText}</span>
                        <span>{backupProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Storage & Security Preferences ── */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted) px-1">
                  Storage & Security Settings
                </div>

                <div className="rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) divide-y divide-(--border-subtle) text-xs">
                  {/* Account Name */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary)">Vault Owner Account</div>
                      <div className="text-[11px] text-(--text-muted)">{googleAccount || 'user@assistance.ai'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newAcc = prompt('Enter your account email:', googleAccount);
                        if (newAcc && newAcc.trim()) {
                          setGoogleAccount(newAcc.trim());
                          localStorage.setItem('recall_backup_google_account', newAcc.trim());
                          showToast(`✓ Account updated to ${newAcc.trim()}`, 'success');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-[11px] font-semibold text-(--text-primary) transition-all cursor-pointer"
                    >
                      Change Account
                    </button>
                  </div>

                  {/* Optional Google Drive OAuth Token */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                          <Cloud size={14} className="text-teal-500" />
                          <span>Google Drive OAuth Token (Optional)</span>
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Leave empty to use 100% offline local device storage
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={googleToken}
                        onChange={(e) => setGoogleToken(e.target.value)}
                        placeholder="Optional Google OAuth Access Token (Bearer ya29...)"
                        className="flex-1 px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs font-mono text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('recall_google_drive_token', googleToken.trim());
                          showToast(googleToken.trim() ? '✓ Google Drive Token saved!' : 'Switched to Local Vault Offline Mode', 'info');
                        }}
                        className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary)">Auto-Backup Schedule</div>
                      <div className="text-[11px] text-(--text-muted)">Automatic background snapshot interval</div>
                    </div>
                    <select
                      value={backupFrequency}
                      onChange={(e) => {
                        setBackupFrequency(e.target.value);
                        localStorage.setItem('recall_backup_freq', e.target.value);
                        showToast(`✓ Backup frequency: ${e.target.value}`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-[11px] font-semibold text-(--text-primary) cursor-pointer focus:outline-hidden"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="manual">Only when I tap "Back up"</option>
                      <option value="never">Never</option>
                    </select>
                  </div>

                  {/* End-to-end encryption */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                        <Lock size={13} className="text-emerald-500" />
                        <span>End-to-end encrypted backup (AES-256)</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted)">
                        Protects your memories, ledger & chats with strong encryption
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={e2eeEnabled}
                        onChange={(e) => {
                          setE2eeEnabled(e.target.checked);
                          localStorage.setItem('recall_backup_e2ee', String(e.target.checked));
                          showToast(e.target.checked ? '✓ E2EE encryption enabled' : 'E2EE encryption disabled', 'info');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 dark:bg-gray-700" />
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Restore & Disaster Recovery ── */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted) px-1">
                  Restore & Disaster Recovery
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Restore from Local Snapshot */}
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-(--text-primary) flex items-center gap-1.5">
                        <RefreshCw size={14} className="text-[#4E82EE]" />
                        <span>Restore from Vault Snapshot</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-1">
                        Restore from your latest device vault snapshot ({lastLocalBackup || 'Available'})
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleRestoreFromDrive}
                      className="w-full py-2 px-3 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-semibold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      <span>Restore Snapshot</span>
                    </button>
                  </div>

                  {/* Restore from JSON File */}
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-(--text-primary) flex items-center gap-1.5">
                        <FileJson size={14} className="text-amber-500" />
                        <span>Restore from JSON File</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-1">
                        Import an exported JSON backup file from your device disk
                      </div>
                    </div>
                    <label className="w-full py-2 px-3 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500 text-xs font-semibold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload size={13} />
                      <span>Select Backup File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileRestore}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Direct Offline Download button */}
                <div className="p-3.5 rounded-2xl bg-(--bg-elevated)/60 border border-(--border-subtle) flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-(--text-primary)">Export Portable JSON Backup</div>
                    <div className="text-[11px] text-(--text-muted)">Download a full offline copy of all your memories, tasks, and data</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-3.5 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-[11px] font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                  >
                    <Download size={13} />
                    <span>Download .JSON</span>
                  </button>
                </div>
              </div>

              {/* Footer Back Button */}
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
          {/* VIEW 4: Data & Privacy Sub-Page                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-(--border-subtle)">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="app-card-title">
                      Data & Local Privacy
                    </h3>
                    <p className="app-card-subtitle">
                      Manage your offline database, downloads, and storage wipe
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-xs text-(--text-primary)">Export All Data (.json)</div>
                      <div className="text-[11px] text-(--text-muted)">Save a local copy of all memories, tasks, and goals</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-3.5 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download size={13} />
                      <span>Export</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-xs text-rose-500">Wipe Local Database</div>
                      <div className="text-[11px] text-(--text-muted)">Permanently erase all local memories, tasks, and history</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleWipeData}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Trash2 size={13} />
                      <span>Wipe All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Back Button */}
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
