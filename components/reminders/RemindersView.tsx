'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Bell,
  Trash2,
  Calendar,
  Repeat,
  X,
  CheckCircle2,
  Edit2,
  Volume2,
  Play,
  Square,
  Sparkles,
  AlarmClock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Reminder } from '@/types';
import { soundEngine } from '@/lib/audio/soundEngine';

function formatAlarmTime(isoString: string) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { timeStr: '09:00', ampm: 'AM', fullDate: '' };
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes}`;
    const fullDate = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return { timeStr, ampm, fullDate };
  } catch {
    return { timeStr: '09:00', ampm: 'AM', fullDate: '' };
  }
}

function getTimeUntil(isoString: string): string {
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Passed';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0 && minutes === 0) return 'Rings in less than a minute';
    if (hours === 0) return `Rings in ${minutes}m`;
    return `Rings in ${hours}h ${minutes}m`;
  } catch {
    return '';
  }
}

export default function RemindersView() {
  const { reminders, createReminder, updateReminder, deleteReminder, user, showToast } = useApp();

  // Current Live Clock
  const [currentClock, setCurrentClock] = useState<{ time: string; ampm: string; sec: string; date: string }>({
    time: '',
    ampm: '',
    sec: '',
    date: '',
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setCurrentClock({
        time: `${String(h).padStart(2, '0')}:${m}`,
        ampm,
        sec: s,
        date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [timeVal, setTimeVal] = useState('07:00');
  const [ampmVal, setAmpmVal] = useState<'AM' | 'PM'>('AM');
  const [dateVal, setDateVal] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('daily');
  const [selectedTone, setSelectedTone] = useState<string>('digital');
  const [previewingTone, setPreviewingTone] = useState<string | null>(null);

  // Edit Modal State
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTimeVal, setEditTimeVal] = useState('07:00');
  const [editAmpmVal, setEditAmpmVal] = useState<'AM' | 'PM'>('AM');
  const [editDateVal, setEditDateVal] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<'none' | 'daily' | 'weekly'>('daily');

  // Tone preview helper
  const handlePreviewTone = (toneName: string) => {
    if (previewingTone === toneName) {
      soundEngine.stopLoudAlarmLoop();
      setPreviewingTone(null);
    } else {
      soundEngine.unlockAudio();
      soundEngine.playAlarm(toneName, 1.0);
      setPreviewingTone(toneName);
      setTimeout(() => {
        setPreviewingTone(null);
      }, 2500);
    }
  };

  // Convert 12h time to ISO
  const computeNextIso = (hourMinute: string, ampm: 'AM' | 'PM', specificDate?: string): string => {
    const [hStr, mStr] = hourMinute.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    const now = new Date();
    let target = specificDate ? new Date(specificDate) : new Date();
    target.setHours(h, m, 0, 0);

    // If no specific date was given and target time has already passed today, set for tomorrow
    if (!specificDate && target.getTime() <= now.getTime()) {
      target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
    }

    return target.toISOString();
  };

  const handleCreateAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !timeVal) return;

    const alarmTitle = title.trim() || 'Scheduled Alarm';
    const isoDateTime = computeNextIso(timeVal, ampmVal, dateVal);

    await createReminder(alarmTitle, isoDateTime, recurrence);
    showToast(`✓ Alarm set: ${timeVal} ${ampmVal} (${getTimeUntil(isoDateTime)})`, 'success');

    setTitle('');
    setIsAddOpen(false);
  };

  // Quick 1-tap alarm creation preset (like power nap or test alarm)
  const handleQuickPreset = async (minutes: number, label: string) => {
    const target = new Date(Date.now() + minutes * 60000);
    const iso = target.toISOString();
    await createReminder(label, iso, 'none');
    showToast(`✓ Alarm set for ${minutes} min from now`, 'success');
  };

  // Toggle alarm on/off (Mobile switch behavior)
  const handleToggleAlarm = async (rem: Reminder) => {
    const isCurrentlyActive = rem.status === 'pending';
    if (isCurrentlyActive) {
      // Turn OFF
      await updateReminder(rem.id, { status: 'dismissed' });
      showToast('Alarm turned off', 'info');
    } else {
      // Turn ON: if time was in the past, reschedule for today/tomorrow at the same time
      const d = new Date(rem.dueDateTime);
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const now = new Date();
      let nextTarget = new Date();
      nextTarget.setHours(hours, minutes, 0, 0);
      if (nextTarget.getTime() <= now.getTime()) {
        nextTarget = new Date(nextTarget.getTime() + 24 * 60 * 60 * 1000);
      }
      const newIso = nextTarget.toISOString();
      await updateReminder(rem.id, { status: 'pending', dueDateTime: newIso });
      showToast(`✓ Alarm set for ${getTimeUntil(newIso)}`, 'success');
    }
  };

  const handleStartEdit = (rem: Reminder) => {
    setEditingReminder(rem);
    setEditTitle(rem.title);
    try {
      const d = new Date(rem.dueDateTime);
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setEditTimeVal(`${String(h).padStart(2, '0')}:${m}`);
      setEditAmpmVal(ampm);
      setEditDateVal(d.toISOString().split('T')[0]);
      setEditRecurrence((rem.recurrence as any) || 'daily');
    } catch {
      setEditTimeVal('07:00');
      setEditAmpmVal('AM');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder) return;

    const iso = computeNextIso(editTimeVal, editAmpmVal, editDateVal);
    await updateReminder(editingReminder.id, {
      title: editTitle.trim() || 'Alarm',
      dueDateTime: iso,
      recurrence: editRecurrence,
      status: 'pending',
    });
    setEditingReminder(null);
    showToast(`✓ Alarm updated: ${editTimeVal} ${editAmpmVal}`, 'success');
  };

  const activeAlarms = reminders.filter((r) => r.status === 'pending');
  const inactiveAlarms = reminders.filter((r) => r.status !== 'pending');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* ── Top Header Toolbar ── */}
      <div className="h-16 px-4 sm:px-8 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <AlarmClock size={20} />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-(--text-primary)">Mobile Alarm & Clock</h1>
            <p className="text-[10px] sm:text-xs text-(--text-muted)">
              {activeAlarms.length} active alarm{activeAlarms.length === 1 ? '' : 's'} scheduled
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const now = new Date();
            let h = now.getHours();
            const m = String(now.getMinutes()).padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            setTimeVal(`${String(h).padStart(2, '0')}:${m}`);
            setAmpmVal(ampm);
            setIsAddOpen(true);
          }}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span>Add Alarm</span>
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full space-y-8 custom-scrollbar">
        
        {/* ── 1. Live Giant Mobile Digital Clock ── */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-(--bg-card) to-(--bg-elevated) border border-(--border-subtle) shadow-xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Local Device Time</span>
          </div>

          <div className="flex items-baseline justify-center gap-2 select-none">
            <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-(--text-primary) drop-shadow-sm">
              {currentClock.time || '07:00'}
            </div>
            <div className="flex flex-col items-start font-mono">
              <span className="text-xl sm:text-2xl font-black text-rose-500">{currentClock.ampm || 'AM'}</span>
              <span className="text-xs font-bold text-(--text-muted)">:{currentClock.sec || '00'}</span>
            </div>
          </div>

          <div className="text-xs sm:text-sm font-medium text-(--text-muted)">
            {currentClock.date || 'Wednesday, September 30'}
          </div>

          {/* Quick Presets Pills */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-semibold text-(--text-muted) mr-1 flex items-center gap-1">
              <Zap size={13} className="text-amber-500" /> Quick Add:
            </span>
            {[
              { mins: 1, label: '1m Test Alarm' },
              { mins: 5, label: '5m Power Nap' },
              { mins: 15, label: '15m Break' },
              { mins: 30, label: '30m Focus' },
            ].map((preset) => (
              <button
                key={preset.mins}
                onClick={() => handleQuickPreset(preset.mins, preset.label)}
                className="px-3 py-1.5 rounded-full bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/50 hover:bg-rose-500/10 text-[11px] font-semibold text-(--text-primary) transition-all cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <span>+{preset.mins}m</span>
                <span className="text-(--text-muted) hidden sm:inline">({preset.label.split(' ')[1]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Active Alarms List (True Mobile Cards) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-(--text-muted) flex items-center gap-1.5">
              <span>Alarms ({activeAlarms.length})</span>
            </h2>
            <span className="text-[11px] text-(--text-muted)">
              Toggle switch to turn alarms on or off
            </span>
          </div>

          {activeAlarms.length === 0 ? (
            <div className="p-8 rounded-3xl bg-(--bg-card) border border-(--border-subtle) text-center space-y-3">
              <AlarmClock size={36} className="mx-auto text-(--text-muted) opacity-30" />
              <div className="font-bold text-sm text-(--text-primary)">No Active Alarms</div>
              <p className="text-xs text-(--text-muted) max-w-sm mx-auto">
                Tap <strong>"Add Alarm"</strong> above or use one of the quick presets to set your mobile alarm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAlarms.map((rem) => {
                const { timeStr, ampm, fullDate } = formatAlarmTime(rem.dueDateTime);
                const timeUntil = getTimeUntil(rem.dueDateTime);

                return (
                  <div
                    key={rem.id}
                    className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/40 shadow-sm transition-all space-y-4 relative overflow-hidden group"
                  >
                    {/* Top Row: Big Mobile Time & Toggle Switch */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-mono font-black tracking-tight text-(--text-primary)">
                          {timeStr}
                        </span>
                        <span className="text-lg font-mono font-bold text-rose-500">{ampm}</span>
                      </div>

                      {/* iOS / Android Style Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rem.status === 'pending'}
                          onChange={() => handleToggleAlarm(rem)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner" />
                      </label>
                    </div>

                    {/* Middle: Label & Countdown */}
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-(--text-primary) truncate">
                        {rem.title}
                      </div>
                      <div className="text-xs text-rose-500 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>{timeUntil}</span>
                        <span className="text-(--text-muted) font-normal">· {fullDate}</span>
                      </div>
                    </div>

                    {/* Bottom Toolbar: Repeat Badge, Sound Preview, Edit, Delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-(--border-subtle)/60 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-[11px] font-semibold text-(--text-secondary) capitalize">
                        <Repeat size={11} />
                        {rem.recurrence && rem.recurrence !== 'none' ? rem.recurrence : 'Ring once'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Tone Preview Button */}
                        <button
                          type="button"
                          onClick={() => handlePreviewTone(user?.preferences?.alarmTone || 'digital')}
                          className="p-2 rounded-xl bg-(--bg-elevated) hover:bg-rose-500/10 hover:text-rose-500 text-(--text-muted) transition-colors cursor-pointer"
                          title="Preview alarm sound"
                        >
                          {previewingTone ? <Square size={13} className="text-rose-500" /> : <Volume2 size={13} />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(rem)}
                          className="p-2 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                          title="Edit alarm"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteReminder(rem.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                          title="Delete alarm"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 3. Inactive / Past Alarms Section ── */}
        {inactiveAlarms.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-(--border-subtle)">
            <h2 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">
              Inactive / Paused Alarms ({inactiveAlarms.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
              {inactiveAlarms.map((rem) => {
                const { timeStr, ampm } = formatAlarmTime(rem.dueDateTime);
                return (
                  <div
                    key={rem.id}
                    className="p-4 rounded-2xl bg-(--bg-card)/60 border border-(--border-subtle) flex items-center justify-between text-xs transition-all hover:opacity-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xl font-mono font-bold text-(--text-muted)">
                        {timeStr} <span className="text-xs font-semibold">{ampm}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-(--text-primary) truncate">{rem.title}</div>
                        <div className="text-[10px] text-(--text-muted)">Off · Tap switch to enable</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleAlarm(rem)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete alarm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Alarm Modal ── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2">
                <AlarmClock size={20} className="text-rose-500" />
                <h3 className="font-bold text-base text-(--text-primary)">Set New Alarm</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlarm} className="space-y-4">
              {/* Giant Mobile Time Picker */}
              <div className="p-5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-center gap-3">
                <input
                  type="time"
                  required
                  value={(() => {
                    const [h, m] = timeVal.split(':');
                    let hr = parseInt(h, 10);
                    if (ampmVal === 'PM' && hr < 12) hr += 12;
                    if (ampmVal === 'AM' && hr === 12) hr = 0;
                    return `${String(hr).padStart(2, '0')}:${m || '00'}`;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [hStr, mStr] = val.split(':');
                    let hr = parseInt(hStr, 10);
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    hr = hr % 12 || 12;
                    setTimeVal(`${String(hr).padStart(2, '0')}:${mStr}`);
                    setAmpmVal(ampm);
                  }}
                  className="text-4xl sm:text-5xl font-mono font-black text-(--text-primary) bg-transparent focus:outline-hidden cursor-pointer"
                />

                {/* AM / PM Toggle */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setAmpmVal('AM')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ampmVal === 'AM'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-(--bg-card) text-(--text-muted) hover:text-(--text-primary)'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmpmVal('PM')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ampmVal === 'PM'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-(--bg-card) text-(--text-muted) hover:text-(--text-primary)'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Alarm Label Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Alarm Label / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g., Morning Workout, Medication, Meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Repeat Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary)">Repeat Schedule</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'daily', label: 'Everyday' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'none', label: 'Once' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRecurrence(item.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        recurrence === item.id
                          ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                          : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Ringtone Selector with Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-(--text-secondary) flex items-center justify-between">
                  <span>Ringtone Sound</span>
                  <span className="text-[11px] text-rose-500 font-semibold cursor-pointer" onClick={() => handlePreviewTone(selectedTone)}>
                    ▶ Test Sound
                  </span>
                </label>
                <select
                  value={selectedTone}
                  onChange={(e) => {
                    setSelectedTone(e.target.value);
                    handlePreviewTone(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-primary) focus:border-rose-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="digital">Digital (Classic 4-Pulse Loud Beep)</option>
                  <option value="radar">Radar (Pulsing Sonar)</option>
                  <option value="chime">Chime (Harmonic Bell)</option>
                  <option value="gentle">Gentle (Acoustic Triad)</option>
                  <option value="zen">Zen (432Hz Calm Bowl)</option>
                  <option value="retro">Retro (8-Bit Arcade)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Save Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Alarm Modal ── */}
      {editingReminder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <h3 className="font-bold text-base text-(--text-primary)">Edit Alarm</h3>
              <button
                onClick={() => setEditingReminder(null)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-center gap-3">
                <input
                  type="time"
                  required
                  value={(() => {
                    const [h, m] = editTimeVal.split(':');
                    let hr = parseInt(h, 10);
                    if (editAmpmVal === 'PM' && hr < 12) hr += 12;
                    if (editAmpmVal === 'AM' && hr === 12) hr = 0;
                    return `${String(hr).padStart(2, '0')}:${m || '00'}`;
                  })()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [hStr, mStr] = val.split(':');
                    let hr = parseInt(hStr, 10);
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    hr = hr % 12 || 12;
                    setEditTimeVal(`${String(hr).padStart(2, '0')}:${mStr}`);
                    setEditAmpmVal(ampm);
                  }}
                  className="text-3xl font-mono font-black text-(--text-primary) bg-transparent focus:outline-hidden cursor-pointer"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setEditAmpmVal('AM')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold cursor-pointer ${
                      editAmpmVal === 'AM' ? 'bg-rose-500 text-white' : 'bg-(--bg-card) text-(--text-muted)'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAmpmVal('PM')}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold cursor-pointer ${
                      editAmpmVal === 'PM' ? 'bg-rose-500 text-white' : 'bg-(--bg-card) text-(--text-muted)'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-(--text-secondary)">Label</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReminder(null)}
                  className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
