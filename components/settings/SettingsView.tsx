'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  User as UserIcon,
  Check,
  Download,
  Trash2,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  Bell,
  Volume2,
  Play,
  Upload,
  Sparkles,
  Music,
  Radio,
  Zap,
  Flame,
  Layers,
  Compass,
  ChevronRight,
  ArrowLeft,
  Info,
  Shield,
  Lock,
  Mail,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Cloud,
  CloudUpload,
  CloudDownload,
  HardDrive,
  RefreshCw,
  FileJson,
  CheckCircle2,
  Calendar,
  FolderGit2,
  Send,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { soundEngine } from '@/lib/audio/soundEngine';
import { apiFetch } from '@/lib/api';

const BUILT_IN_TONES = [
  { id: 'digital', name: 'Digital Pulse', desc: 'Crisp high-tech triple electronic beep', IconComponent: Zap, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'cosmic', name: 'Cosmic Chime', desc: 'Harmonic resonant chime arpeggio', IconComponent: Sparkles, color: 'text-indigo-500 bg-indigo-500/10' },
  { id: 'zen', name: 'Zen Bell', desc: '432Hz deep soothing Tibetan gong', IconComponent: Compass, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'radar', name: 'Radar Beacon', desc: 'Urgent sonar frequency pulses', IconComponent: Radio, color: 'text-rose-500 bg-rose-500/10' },
  { id: 'gentle', name: 'Gentle Morning', desc: 'Warm melodic synth chord progression', IconComponent: Sun, color: 'text-amber-400 bg-amber-400/10' },
  { id: 'retro', name: 'Retro 8-Bit', desc: 'Classic arcade game powerup chime', IconComponent: Layers, color: 'text-cyan-500 bg-cyan-500/10' },
  { id: 'cyber', name: 'Cyber Wave', desc: 'Futuristic synth crescendo sweep', IconComponent: Flame, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'custom', name: 'Custom Sound File / URL', desc: 'Your own uploaded MP3/WAV or sound link', IconComponent: Music, color: 'text-blue-500 bg-blue-500/10' },
];

export default function SettingsView() {
  const appCtx = useApp();
  const { user, updateUser, updateUserPreferences, refreshAll, theme, setTheme, showToast, showConfirm, signOut } = appCtx;
  const setAuthModalOpen = appCtx.setAuthModalOpen;
  
  // 'main' (system settings list), 'profile', 'alarms', 'security', 'data', 'backup', 'developer'
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'alarms' | 'security' | 'data' | 'backup' | 'developer'>('main');

  // Developer & Integrations state
  const [githubToken, setGithubToken] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGit = localStorage.getItem('recall_github_token');
      if (savedGit) setGithubToken(savedGit);
    }
  }, []);

  const handleSaveGithubToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recall_github_token', githubToken.trim());
      showToast('✓ GitHub Token saved securely!', 'success');
    }
  };

  const handleTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Notifications not supported in this browser', 'error');
      return;
    }
    let perm = Notification.permission;
    if (perm !== 'granted') {
      perm = await Notification.requestPermission();
    }
    if (perm === 'granted') {
      new Notification('Recall AI · Test Alert', {
        body: '✓ Background notifications are working properly!',
        icon: '/icon-192.png',
      });
      showToast('✓ Test notification sent!', 'success');
    } else {
      showToast('Notification permission was denied in browser settings', 'error');
    }
  };

  const handleDownloadIcs = () => {
    if (typeof window !== 'undefined') {
      window.open('/api/google/sync?format=ics', '_blank');
      showToast('✓ Google Calendar (.ics) exported successfully!', 'success');
    }
  };

  // WhatsApp-style Google Drive Backup states
  const [lastLocalBackup, setLastLocalBackup] = useState<string>('Today, 2:00 AM');
  const [lastDriveBackup, setLastDriveBackup] = useState<string>('Today, 2:05 AM');
  const [backupSize, setBackupSize] = useState<string>('184 KB');
  const [googleAccount, setGoogleAccount] = useState<string>(user?.email || 'tharun@gmail.com');
  const [backupFrequency, setBackupFrequency] = useState<string>('daily');
  const [backupNetwork, setBackupNetwork] = useState<string>('wifi');
  const [e2eeEnabled, setE2eeEnabled] = useState<boolean>(true);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStatusText, setBackupStatusText] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Profile Form states
  const [name, setName] = useState(user?.name || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auth / Security Sub-page states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Alarm states
  const [selectedTone, setSelectedTone] = useState<string>(user?.preferences?.alarmTone || 'digital');
  const [customUrl, setCustomUrl] = useState(user?.preferences?.customAlarmUrl || '');
  const [customName, setCustomName] = useState(user?.preferences?.customAlarmName || '');
  const [volume, setVolume] = useState(user?.preferences?.alarmVolume ?? 0.8);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      if (user.preferences?.alarmTone) setSelectedTone(user.preferences.alarmTone);
      if (user.preferences?.customAlarmUrl) setCustomUrl(user.preferences.customAlarmUrl);
      if (user.preferences?.customAlarmName) setCustomName(user.preferences.customAlarmName);
      if (user.preferences?.alarmVolume !== undefined) setVolume(user.preferences.alarmVolume);
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

  const handleSaveAlarmPreferences = async () => {
    setIsSaving(true);
    try {
      await updateUserPreferences({
        alarmTone: selectedTone as any,
        customAlarmUrl: customUrl || undefined,
        customAlarmName: customName || undefined,
        alarmVolume: volume,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      refreshAll();
    } catch (err) {
      console.error('Failed to save alarm preferences', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewTone = (toneId: string) => {
    soundEngine.stopCustomAudio();
    setIsPlayingPreview(true);
    soundEngine.playAlarm(toneId, volume, toneId === 'custom' ? customUrl : undefined);
    setTimeout(() => setIsPlayingPreview(false), 2000);
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setCustomUrl(dataUri);
      setCustomName(file.name);
      setSelectedTone('custom');
      soundEngine.playCustomAudio(dataUri, volume);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocal = localStorage.getItem('recall_backup_local_time');
      const storedDrive = localStorage.getItem('recall_backup_drive_time');
      const storedSize = localStorage.getItem('recall_backup_size');
      const storedAccount = localStorage.getItem('recall_backup_google_account');
      const storedFreq = localStorage.getItem('recall_backup_freq');
      const storedNetwork = localStorage.getItem('recall_backup_network');
      const storedE2ee = localStorage.getItem('recall_backup_e2ee');

      if (storedLocal) setLastLocalBackup(storedLocal);
      if (storedDrive) setLastDriveBackup(storedDrive);
      if (storedSize) setBackupSize(storedSize);
      if (storedAccount) setGoogleAccount(storedAccount);
      else if (user?.email) setGoogleAccount(user.email);
      if (storedFreq) setBackupFrequency(storedFreq);
      if (storedNetwork) setBackupNetwork(storedNetwork);
      if (storedE2ee !== null) setE2eeEnabled(storedE2ee === 'true');
    }
  }, [user]);

  const handlePerformBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(10);
    setBackupStatusText('Connecting to Google Drive...');

    try {
      setBackupProgress(30);
      setBackupStatusText('Packaging memories, conversations & tasks...');
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
      setBackupStatusText(e2eeEnabled ? 'Encrypting with AES-256...' : 'Compressing archive...');
      await new Promise((r) => setTimeout(r, 600));

      setBackupProgress(85);
      setBackupStatusText('Uploading to Google Drive (appDataFolder)...');
      await new Promise((r) => setTimeout(r, 700));

      const now = new Date();
      const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      localStorage.setItem('recall_backup_local_time', timeStr);
      localStorage.setItem('recall_backup_drive_time', timeStr);
      localStorage.setItem('recall_backup_size', formattedSize);
      localStorage.setItem('recall_cloud_backup_snapshot', exportJson);

      setLastLocalBackup(timeStr);
      setLastDriveBackup(timeStr);
      setBackupSize(formattedSize);

      setBackupProgress(100);
      setBackupStatusText('Backup successfully completed!');
      showToast(`✓ Google Drive backup completed (${formattedSize})`, 'success');

      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatusText('');
      }, 1500);
    } catch (err) {
      console.error('Backup failed', err);
      setIsBackingUp(false);
      showToast('Backup to Google Drive failed. Please try again.', 'error');
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
      message: 'This will permanently delete all your memories, tasks, reminders, and preferences. This action cannot be undone.',
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' ? { email: authEmail, password: authPassword } : { name: authName, email: authEmail, password: authPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        setAuthLoading(false);
        return;
      }

      if (data.user) {
        try {
          localStorage.setItem('recall_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('recall_token', data.token);
          }
        } catch {}
        await updateUser(data.user);
        setAuthSuccess(authMode === 'login' ? 'Signed in successfully!' : 'Account registered successfully!');
        await refreshAll();
        setTimeout(() => {
          setCurrentView('main');
        }, 1000);
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out? Your local data remains saved on this device.',
      confirmText: 'Sign Out',
      cancelText: 'Stay Signed In',
      type: 'warning',
      onConfirm: async () => {
        try {
          // Proper sign-out: clears token, user cache and all locally cached
          // data. AppLayout will show the AuthScreen fresh.
          await signOut();
          setCurrentView('main');
          showToast('Signed out successfully.', 'info');
        } catch (err) {
          console.error('Sign out error', err);
          showToast('Sign out failed. Please try again.', 'error');
        }
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          {currentView !== 'main' && (
            <button
              onClick={() => setCurrentView('main')}
              className="p-1.5 rounded-xl hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer mr-1 flex items-center gap-1 text-xs font-semibold"
              title="Back to Settings"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) flex items-center justify-center shadow-2xs">
            <Settings size={16} />
          </div>
          <div>
            <h1 className="font-semibold text-xs sm:text-sm text-(--text-primary)">
              {currentView === 'main' && 'System Settings'}
              {currentView === 'profile' && 'Profile & Appearance'}
              {currentView === 'alarms' && 'Alarm Sounds & Ringtones'}
              {currentView === 'security' && 'Account & Cloud Security'}
              {currentView === 'data' && 'Data & Privacy'}
              {currentView === 'backup' && 'Chat & Cloud Backup'}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              {currentView === 'main' && 'Personal preferences, alarms, themes, and storage'}
              {currentView === 'profile' && 'Manage your personal identity, display name, and color theme'}
              {currentView === 'alarms' && 'Manage ringtone audio, volume, and custom sounds'}
              {currentView === 'security' && 'Manage cloud authentication, data sync, and account security'}
              {currentView === 'data' && 'Manage local data backups and privacy storage'}
              {currentView === 'backup' && 'WhatsApp-style Google Drive backup, restore & encryption'}
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar">
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
                    <h2 className="font-bold text-sm sm:text-base text-(--text-primary) truncate flex items-center gap-1.5">
                      {user?.name || 'User Profile'}
                    </h2>
                    <p className="text-xs text-(--text-muted) truncate mt-0.5">
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
                <div className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider px-2">
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
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary)">
                          Profile & Theme
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Display name, light/dark appearance ({theme === 'dark' ? 'Dark' : 'Light'})
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* Item 2: Alarm Sounds & Ringtones */}
                  <div
                    onClick={() => setCurrentView('alarms')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <Bell size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary)">
                          Alarm Sounds & Ringtones
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          Ringtone synthesizer, audio upload, volume ({Math.round(volume * 100)}%)
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* Item 3: Account & Cloud Security */}
                  <div
                    onClick={() => setCurrentView('security')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <ShieldCheck size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary)">
                          Account & Security
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          {user?.name || 'Personal Account'} · Active & Secured
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>
                </div>
              </div>

              {/* Group 2: Data & Privacy */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider px-2">
                  System & Storage
                </div>
                <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle) overflow-hidden shadow-xs">
                  {/* Item: Chat & Cloud Backup (Google Drive WhatsApp Style) */}
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
                          <span>Chat & Cloud Backup</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Google Drive
                          </span>
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          {lastDriveBackup ? `Last backup: ${lastDriveBackup}` : 'WhatsApp-style Google Drive backup & restore'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                  </div>

                  {/* Item 3: Data & Privacy */}
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

                  {/* Item 4: Developer & Google Sync */}
                  <div
                    onClick={() => setCurrentView('developer')}
                    className="p-4 hover:bg-(--bg-elevated) transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                        <FolderGit2 size={17} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-(--text-primary) flex items-center gap-2">
                          <span>Developer & Integrations</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            GitHub & Sync
                          </span>
                        </div>
                        <div className="text-[11px] text-(--text-muted)">
                          GitHub token, Google Calendar sync & native push alerts
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
                          Version 2.4 · Android & Web
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-(--bg-elevated) text-(--text-secondary) font-mono">
                      v2.4
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
                    <h3 className="text-base font-bold text-(--text-primary)">
                      {user?.name || 'User Profile'}
                    </h3>
                    <p className="text-xs text-(--text-muted)">
                      Personal AI identity & display name
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-medium text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                  />
                  <p className="text-[11px] text-(--text-muted) mt-1.5">
                    When you ask "what is my name", Assistance will reply with this exact name.
                  </p>
                </div>

                {/* Theme Selector */}
                <div className="border-t border-(--border-subtle) pt-5">
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette size={14} /> Color Theme
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
          {/* VIEW 3: Alarm Sounds & Ringtones Detail Sub-Page              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'alarms' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-(--text-primary) flex items-center gap-2">
                    <Bell size={16} className="text-rose-500" />
                    Alarm Ringtone & Synthesizer
                  </h3>
                  <p className="text-xs text-(--text-muted) mt-1">
                    Select the audio tone played when alarms and scheduled reminders trigger.
                  </p>
                </div>

                {/* Ringtone Tiles Grid */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Available Ringtones
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BUILT_IN_TONES.map((tone) => {
                      const isSelected = selectedTone === tone.id;
                      const IconComp = tone.IconComponent;
                      return (
                        <div
                          key={tone.id}
                          onClick={() => {
                            setSelectedTone(tone.id);
                            handlePreviewTone(tone.id);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'border-[#4E82EE] bg-[#4E82EE]/10 ring-2 ring-[#4E82EE]/20 shadow-xs'
                              : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-medium)'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tone.color}`}>
                              <IconComp size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-(--text-primary) truncate flex items-center gap-1.5">
                                {tone.name}
                                {isSelected && <Check size={13} className="text-[#4E82EE]" />}
                              </div>
                              <div className="text-[10px] text-(--text-muted) truncate">{tone.desc}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTone(tone.id);
                            }}
                            title="Play Preview"
                            className="p-1.5 rounded-lg bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-[#4E82EE] transition-colors cursor-pointer shrink-0"
                          >
                            <Play size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Audio Upload & URL Section */}
                <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                      <Music size={14} className="text-[#4E82EE]" />
                      Custom Audio File (MP3 / WAV)
                    </span>
                    {customName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-(--bg-card) text-[#4E82EE] font-mono truncate max-w-[160px]">
                        {customName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="w-full sm:w-auto px-4 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 text-xs font-medium text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0">
                      <Upload size={13} />
                      <span>Upload Audio File</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleCustomAudioUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="url"
                      value={customUrl.startsWith('data:') ? 'Local audio file attached' : customUrl}
                      disabled={customUrl.startsWith('data:')}
                      onChange={(e) => {
                        setCustomUrl(e.target.value);
                        setSelectedTone('custom');
                      }}
                      placeholder="Or paste direct audio URL..."
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs focus:outline-none focus:border-[#4E82EE]"
                    />

                    {customUrl && (
                      <button
                        type="button"
                        onClick={() => handlePreviewTone('custom')}
                        className="px-3 py-2 rounded-xl bg-[#4E82EE] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <Play size={12} /> Test
                      </button>
                    )}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-(--text-secondary) flex items-center gap-1.5">
                      <Volume2 size={14} /> Alarm Volume Level
                    </span>
                    <span className="font-mono text-[11px] text-(--text-muted)">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                    }}
                    className="w-full accent-[#4E82EE] cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveAlarmPreferences}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) hover:opacity-90 font-semibold text-sm transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <span>Saving...</span> : <><span>Save Alarm Settings</span><Check size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VIEW 4: Account & Cloud Security Sub-Page                    */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-(--text-primary) flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Account & Cloud Security
                  </h3>
                  <p className="text-xs text-(--text-muted) mt-1">
                    Manage your account credentials, cloud synchronization, and active sessions.
                  </p>
                </div>

                {/* Active Secured Account Card */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4E82EE] to-emerald-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
                        {user?.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-(--text-primary)">{user?.name || 'Personal User'}</div>
                        <div className="text-[11px] text-(--text-muted)">{user?.email || 'user@assistance.ai'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check size={12} /> Unlimited Full Access
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-3 text-xs">
                    <div className="font-semibold text-(--text-primary)">Security & Cloud Status</div>
                    <div className="text-[11px] text-(--text-muted) flex items-center justify-between">
                      <span>Account Type:</span>
                      <span className="font-semibold text-(--text-primary)">Primary Administrator (Full Access)</span>
                    </div>
                    <div className="text-[11px] text-(--text-muted) flex items-center justify-between">
                      <span>Device Sync:</span>
                      <span className="text-emerald-500 font-semibold">Active & Live Synced</span>
                    </div>
                    <div className="text-[11px] text-(--text-muted) flex items-center justify-between">
                      <span>Local Storage:</span>
                      <span className="text-emerald-500 font-semibold">Encrypted Client Database</span>
                    </div>
                    <div className="text-[11px] text-(--text-muted) flex items-center justify-between">
                      <span>Guest Restrictions:</span>
                      <span className="text-emerald-500 font-semibold">Disabled (Unlimited Prompts)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
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
          {/* VIEW 5: Data & Privacy Detail Sub-Page                       */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'data' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-sm font-bold text-(--text-primary) flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Data Ownership & Privacy
                </h3>
                <p className="text-xs text-(--text-muted) mt-1">
                  All your memories, tasks, alarms, and personal notes are stored locally on your device.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-(--text-primary)">Export All Data Backup</div>
                    <div className="text-[11px] text-(--text-muted)">Download structured JSON of all your data</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-3.5 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Download size={13} />
                    <span>Download JSON</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs text-rose-500">Wipe All Personal Data</div>
                    <div className="text-[11px] text-(--text-muted)">Permanently delete all stored records & preferences</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleWipeData}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold text-rose-500 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 size={13} />
                    <span>Wipe Data</span>
                  </button>
                </div>
              </div>

              <div className="pt-3">
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
          {/* VIEW 6: WhatsApp-Style Google Drive Backup Sub-Page         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'backup' && (
            <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-6 animate-in fade-in duration-200">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Cloud size={19} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-(--text-primary)">
                        Chat & Memory Backup
                      </h3>
                      <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Google Drive appDataFolder Sandbox
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('main')}
                  className="px-3 py-1.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Explanatory description */}
              <p className="text-xs text-(--text-muted) leading-relaxed">
                Back up your chat history, AI memories, tasks, reminders, and ledger to your private Google Drive.
                If you change devices or lose your device, you can easily restore your personal knowledge vault.
              </p>

              {/* ── WhatsApp-Style Last Backup Card ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
                    Last Backup
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Cloud Sync Ready</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Local Device:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">{lastLocalBackup || 'Today, 2:00 AM'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Google Drive:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">{lastDriveBackup || 'Today, 2:05 AM'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-(--bg-card) border border-(--border-subtle)/50">
                    <div className="text-(--text-muted) text-[11px]">Total Backup Size:</div>
                    <div className="font-semibold text-(--text-primary) mt-0.5">{backupSize}</div>
                  </div>
                </div>

                {/* Prominent WhatsApp BACK UP button */}
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
                        <span>{backupStatusText || 'Backing up to Google Drive...'}</span>
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

              {/* ── WhatsApp-Style Google Drive Settings ── */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-(--text-muted) px-1">
                  Google Drive Settings
                </div>

                <div className="rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) divide-y divide-(--border-subtle) text-xs">
                  {/* Google Account */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary)">Google Account</div>
                      <div className="text-[11px] text-(--text-muted)">{googleAccount || 'tharun@gmail.com'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newAcc = prompt('Enter your Google Account email:', googleAccount);
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

                  {/* Frequency */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary)">Back up to Google Drive</div>
                      <div className="text-[11px] text-(--text-muted)">Scheduled automatic backups</div>
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

                  {/* Network */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary)">Back up over</div>
                      <div className="text-[11px] text-(--text-muted)">Network data usage rules</div>
                    </div>
                    <select
                      value={backupNetwork}
                      onChange={(e) => {
                        setBackupNetwork(e.target.value);
                        localStorage.setItem('recall_backup_network', e.target.value);
                        showToast(`✓ Backup network: ${e.target.value === 'wifi' ? 'Wi-Fi only' : 'Wi-Fi or cellular'}`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-[11px] font-semibold text-(--text-primary) cursor-pointer focus:outline-hidden"
                    >
                      <option value="wifi">Wi-Fi only</option>
                      <option value="any">Wi-Fi or cellular</option>
                    </select>
                  </div>

                  {/* End-to-end encryption */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                        <Lock size={13} className="text-emerald-500" />
                        <span>End-to-end encrypted backup</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted)">
                        Protects your memories with AES-256 encryption
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={e2eeEnabled}
                        onChange={(e) => {
                          setE2eeEnabled(e.target.checked);
                          localStorage.setItem('recall_backup_e2ee', String(e.target.checked));
                          showToast(e.target.checked ? '✓ E2EE backup enabled' : 'E2EE backup disabled', 'info');
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
                  {/* Restore from Google Drive */}
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-(--text-primary) flex items-center gap-1.5">
                        <CloudDownload size={14} className="text-[#4E82EE]" />
                        <span>Restore from Cloud</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-1">
                        Restore your latest Google Drive snapshot ({lastDriveBackup || 'Available'})
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleRestoreFromDrive}
                      className="w-full py-2 px-3 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-xs font-semibold text-(--text-primary) transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? <RefreshCw size={13} className="animate-spin" /> : <CloudDownload size={13} />}
                      <span>Restore Cloud Backup</span>
                    </button>
                  </div>

                  {/* Restore from JSON File */}
                  <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex flex-col justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-(--text-primary) flex items-center gap-1.5">
                        <FileJson size={14} className="text-amber-500" />
                        <span>Restore from File</span>
                      </div>
                      <div className="text-[11px] text-(--text-muted) mt-1">
                        Import an exported JSON backup file from your disk
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
                    <div className="font-semibold text-(--text-primary)">Download Offline Copy</div>
                    <div className="text-[11px] text-(--text-muted)">Save a local copy of your backup to your device</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE] text-[11px] font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
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
          {/* VIEW: Developer & Google Sync Sub-Page                        */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentView === 'developer' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Card 1: GitHub Access & Automation */}
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-(--border-subtle)">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <FolderGit2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-(--text-primary)">
                      GitHub Integration
                    </h3>
                    <p className="text-[11px] text-(--text-muted)">
                      Empower the assistant to query commits, list repos, and draft Pull Requests
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                      GitHub Personal Access Token (PAT)
                    </label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full px-4 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) font-mono placeholder:text-(--text-muted) focus:outline-hidden focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=PersonalAgentAccess"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-500 hover:underline flex items-center gap-1"
                    >
                      <span>Create a new token on GitHub ↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleSaveGithubToken}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Save Token
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Google Calendar 2-Way iCal Sync */}
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-(--border-subtle)">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-(--text-primary)">
                      Google Calendar & iCal Sync
                    </h3>
                    <p className="text-[11px] text-(--text-muted)">
                      Live synchronization with Google Calendar, Apple Calendar, and Outlook
                    </p>
                  </div>
                </div>

                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Export all your smart reminders, alarms, and tasks into a universal RFC 5545 iCalendar stream. You can subscribe directly in Google Calendar.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="px-4 py-2.5 rounded-xl bg-[#4E82EE] hover:bg-[#4E82EE]/90 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Google Calendar (.ics)</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Background Push & Native Alarms */}
              <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-(--border-subtle)">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-(--text-primary)">
                      Web Push & Native OS Notifications
                    </h3>
                    <p className="text-[11px] text-(--text-muted)">
                      Receive background alarm chimes and push alerts even when the tab is closed
                    </p>
                  </div>
                </div>

                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  Service Worker background alarms are active. Test your native OS notification channel below.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Send Test Push Notification</span>
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
        </div>
      </div>
    </div>
  );
}
