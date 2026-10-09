'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

type SettingsViewType = 'main' | 'profile' | 'pin' | 'backup';

export default function SettingsView() {
  const {
    user,
    updateUser,
    refreshAll,
    showToast,
    showConfirm,
    isPinSet,
    setAppPin,
    lockApp,
  } = useApp();

  // Page view state
  const [currentView, setCurrentView] = useState<SettingsViewType>('main');

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || 'Personal User');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'user@example.com');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security PIN states
  const [pinMode, setPinMode] = useState<'create' | 'change' | 'remove'>('create');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Backup states
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Never');
  const [backupSize, setBackupSize] = useState<string>('0 KB');
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      if (user.name) setProfileName(user.name);
      if (user.email) setProfileEmail(user.email);
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
    setIsSavingProfile(true);
    try {
      await updateUser({ name: profileName.trim(), email: profileEmail.trim() });
      showToast('Profile updated successfully!', 'success');
      refreshAll();
      setCurrentView('main');
    } catch (err) {
      console.error('Failed to save profile', err);
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
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
    setCurrentView('main');
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
    setCurrentView('main');
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
    setCurrentView('main');
  };

  // ── Backup Handlers ──────────────────────────────────────────
  const handlePerformBackup = async () => {
    setIsBackingUp(true);
    setBackupStatusText('Packaging memories, notes, ledger & tasks...');

    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const data = await res.json();
      setBackupStatusText('Encrypting local snapshot...');

      const exportJson = JSON.stringify(data.export || {});
      const sizeBytes = new Blob([exportJson]).size;
      const formattedSize =
        sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;

      await new Promise((r) => setTimeout(r, 400));
      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      localStorage.setItem('recall_backup_local_time', timeStr);
      localStorage.setItem('recall_backup_size', formattedSize);
      localStorage.setItem('recall_cloud_backup_snapshot', exportJson);
      setLastLocalBackup(timeStr);
      setBackupSize(formattedSize);

      showToast(`Personal backup saved (${formattedSize})`, 'success');
    } catch (err) {
      console.error('Backup failed', err);
      showToast('Backup failed. Please try again.', 'error');
    } finally {
      setIsBackingUp(false);
      setBackupStatusText('');
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
            setCurrentView('main');
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
          setCurrentView('main');
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

  // ─────────────────────────────────────────────────────────────
  // SUB-PAGE 1: FULL PROFILE INFORMATION PAGE                    
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'profile') {
    return (
      <div className="flex-1 flex flex-col items-center h-full overflow-y-auto bg-[#F1F5F9] text-slate-900 select-none font-sans custom-scrollbar py-4 sm:py-6 pb-24 md:pb-12">
        <div className="w-full max-w-4xl space-y-4 px-3 sm:px-0 animate-in fade-in duration-200">
          
          {/* Header with Back button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="w-9 h-9 rounded-full bg-white text-slate-800 hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors cursor-pointer border border-slate-100"
              title="Back to Settings"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Profile Information
            </h1>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-[26px] p-5 sm:p-7 shadow-2xs border border-slate-100">
            <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  placeholder="Your Name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-[#1C73E8] text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:border-[#1C73E8] text-sm"
                />
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="py-3 px-6 rounded-xl bg-[#1C73E8] hover:bg-[#1557B0] text-white font-bold text-sm shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Back to Settings
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUB-PAGE 2: FULL 4-DIGIT PIN SECURITY PAGE                   
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'pin') {
    return (
      <div className="flex-1 flex flex-col items-center h-full overflow-y-auto bg-[#F1F5F9] text-slate-900 select-none font-sans custom-scrollbar py-4 sm:py-6 pb-24 md:pb-12">
        <div className="w-full max-w-4xl space-y-4 px-3 sm:px-0 animate-in fade-in duration-200">
          
          {/* Header with Back button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="w-9 h-9 rounded-full bg-white text-slate-800 hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors cursor-pointer border border-slate-100"
              title="Back to Settings"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              4-Digit PIN Security
            </h1>
          </div>

          {/* Security PIN Card */}
          <div className="bg-white rounded-[26px] p-5 sm:p-7 shadow-2xs border border-slate-100 max-w-lg space-y-5">
            
            {/* Current Status Pill */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Passcode Protection</p>
                  <p className="text-[11px] text-slate-400">
                    {isPinSet ? '4-digit PIN is currently active' : 'PIN is currently turned off'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isPinSet ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {isPinSet ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            <form
              onSubmit={
                pinMode === 'create'
                  ? handleSetPin
                  : pinMode === 'change'
                  ? handleChangePin
                  : handleRemovePin
              }
              className="space-y-4 text-xs"
            >
              {pinError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs">
                  {pinError}
                </div>
              )}

              {pinMode !== 'create' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Current PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    placeholder="••••"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              )}

              {pinMode !== 'remove' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">New 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Confirm PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {isPinSet && pinMode !== 'remove' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinError('');
                      setOldPin('');
                      setPinMode('remove');
                    }}
                    className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Disable PIN
                  </button>
                ) : <span />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('main')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold shadow-xs cursor-pointer"
                  >
                    {pinMode === 'remove' ? 'Confirm Disable' : 'Save PIN'}
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUB-PAGE 3: FULL CHAT & DATA BACKUP PAGE                     
  // ─────────────────────────────────────────────────────────────
  if (currentView === 'backup') {
    return (
      <div className="flex-1 flex flex-col items-center h-full overflow-y-auto bg-[#F1F5F9] text-slate-900 select-none font-sans custom-scrollbar py-4 sm:py-6 pb-24 md:pb-12">
        <div className="w-full max-w-4xl space-y-4 px-3 sm:px-0 animate-in fade-in duration-200">
          
          {/* Header with Back button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="w-9 h-9 rounded-full bg-white text-slate-800 hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors cursor-pointer border border-slate-100"
              title="Back to Settings"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Chat & Data Backup
            </h1>
          </div>

          {/* Backup Vault Card */}
          <div className="bg-white rounded-[26px] p-5 sm:p-7 shadow-2xs border border-slate-100 max-w-lg space-y-4">
            
            {/* Metrics */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Last Snapshot:</span>
                <span className="font-bold text-slate-800">{lastLocalBackup}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Archive Size:</span>
                <span className="font-bold text-slate-800">{backupSize}</span>
              </div>
            </div>

            {/* Primary Backup Button */}
            <button
              type="button"
              disabled={isBackingUp}
              onClick={handlePerformBackup}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#14B8A6] via-[#0EA5E9] to-[#8B5CF6] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{backupStatusText || 'Backing up...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>CREATE BACKUP SNAPSHOT</span>
                </>
              )}
            </button>

            {/* Restore from snapshot */}
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestoreFromSnapshot}
              className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isRestoring ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span>Restore from Latest Snapshot</span>
            </button>

            {/* Import .JSON file */}
            <label className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload size={15} />
              <span>Import .JSON Backup File</span>
              <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
            </label>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN SETTINGS PAGE                                            
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center h-full overflow-y-auto bg-[#F1F5F9] text-slate-900 select-none font-sans custom-scrollbar py-4 sm:py-6 pb-24 md:pb-12">
      <div className="w-full max-w-4xl space-y-4 px-3 sm:px-0 animate-in fade-in duration-200">
        
        {/* ── Settings Main White Card ── */}
        <div className="bg-white rounded-[26px] p-5 sm:p-7 shadow-2xs border border-slate-100 space-y-6">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 1: ACCOUNT SETTINGS                                   */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Account Settings
            </h3>

            <div className="space-y-1">
              {/* Item 1: Profile Information (Opens full Profile page) */}
              <button
                type="button"
                onClick={() => setCurrentView('profile')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#1C73E8] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <User size={18} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950 block">
                      Profile Information
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {profileEmail}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 2: SECURITY & PASSCODE                                */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Security & Passcode
            </h3>

            <div className="space-y-1">
              {/* Item 2: 4-Digit PIN Lock (Opens full PIN page) */}
              <button
                type="button"
                onClick={() => {
                  setPinError('');
                  setOldPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setPinMode(isPinSet ? 'change' : 'create');
                  setCurrentView('pin');
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Lock size={18} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950 block">
                      4-Digit PIN Lock
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isPinSet ? 'Passcode protection active' : 'Secure app with 4-digit code'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPinSet ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isPinSet ? 'ON' : 'OFF'}
                  </span>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </button>

              {/* Item 3: Lock App Now (if PIN is enabled) */}
              {isPinSet && (
                <button
                  type="button"
                  onClick={() => lockApp()}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone size={18} strokeWidth={2.2} />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950 block">
                        Lock App Now
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Require PIN to continue session
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold">
                    Lock
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 3: DATA & BACKUP VAULT                                */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Data & Backup
            </h3>

            <div className="space-y-1">
              {/* Item 4: Chat & Data Backup (Opens full Backup page) */}
              <button
                type="button"
                onClick={() => setCurrentView('backup')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#14B8A6] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Database size={18} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950 block">
                      Chat & Data Backup
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {lastLocalBackup ? `Last: ${lastLocalBackup}` : 'Snapshot and vault backup'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>

              {/* Item 5: Export Data (.json) */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Download size={18} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 group-hover:text-slate-950 block">
                      Export Data (.json)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Download portable backup archive
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION 4: OTHER                                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Other
            </h3>

            <div className="space-y-1">
              {/* Item 6: Clear All Local Data */}
              <button
                type="button"
                onClick={handleWipeData}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-rose-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#F43F5E] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Trash2 size={18} strokeWidth={2.2} />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-rose-600 block">
                      Clear All Local Data
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Reset tasks, dues & notes
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
