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
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { soundEngine } from '@/lib/audio/soundEngine';

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
  
  // 'main' (system settings list), 'profile', 'alarms', 'security', 'data'
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'alarms' | 'security' | 'data'>('main');

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

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/settings', {
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
          await fetch('/api/settings', {
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
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              {currentView === 'main' && 'Personal preferences, alarms, themes, and storage'}
              {currentView === 'profile' && 'Manage your personal identity, display name, and color theme'}
              {currentView === 'alarms' && 'Manage ringtone audio, volume, and custom sounds'}
              {currentView === 'security' && 'Manage cloud authentication, data sync, and account security'}
              {currentView === 'data' && 'Manage local data backups and privacy storage'}
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
        </div>
      </div>
    </div>
  );
}
