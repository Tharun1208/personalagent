'use client';

import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Bell,
  Trash2,
  Calendar,
  Repeat,
  AlertCircle,
  X,
  CheckCircle2,
  Edit2,
  Check,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Reminder } from '@/types';
import { renderTextWithIosEmojis } from '@/lib/utils/iosEmoji';

export default function RemindersView() {
  const { reminders, createReminder, updateReminder, deleteReminder } = useApp();
  
  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dateVal, setDateVal] = useState(new Date().toISOString().split('T')[0]);
  const [timeVal, setTimeVal] = useState('09:00');
  const [recurrence, setRecurrence] = useState('none');

  // Edit Modal State
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDateVal, setEditDateVal] = useState('');
  const [editTimeVal, setEditTimeVal] = useState('09:00');
  const [editRecurrence, setEditRecurrence] = useState('none');

  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const triggeredReminders = reminders.filter((r) => r.status !== 'pending');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateVal || !timeVal) return;

    const combinedIso = new Date(`${dateVal}T${timeVal}`).toISOString();
    await createReminder(title.trim(), combinedIso, recurrence);
    setTitle('');
    setDateVal(new Date().toISOString().split('T')[0]);
    setTimeVal('09:00');
    setRecurrence('none');
    setIsAddOpen(false);
  };

  const handleStartEdit = (rem: Reminder) => {
    setEditingReminder(rem);
    setEditTitle(rem.title);
    try {
      const d = new Date(rem.dueDateTime);
      setDateVal(d.toISOString().split('T')[0]);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setEditDateVal(d.toISOString().split('T')[0]);
      setEditTimeVal(`${hh}:${mm}`);
    } catch {
      setEditDateVal(new Date().toISOString().split('T')[0]);
      setEditTimeVal('09:00');
    }
    setEditRecurrence(rem.recurrence || 'none');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReminder || !editTitle.trim() || !editDateVal || !editTimeVal) return;

    const combinedIso = new Date(`${editDateVal}T${editTimeVal}`).toISOString();
    await updateReminder(editingReminder.id, {
      title: editTitle.trim(),
      dueDateTime: combinedIso,
      recurrence: editRecurrence as any,
    });
    setEditingReminder(null);
  };

  const applyPreset = (minutesFromNow: number) => {
    const target = new Date(Date.now() + minutesFromNow * 60000);
    const dStr = target.toISOString().split('T')[0];
    const hh = String(target.getHours()).padStart(2, '0');
    const mm = String(target.getMinutes()).padStart(2, '0');
    setDateVal(dStr);
    setTimeVal(`${hh}:${mm}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-2xs">
            <Clock size={17} />
          </div>
          <div>
            <h1 className="font-semibold text-xs sm:text-sm text-(--text-primary)">Alarms & Reminders</h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              {pendingReminders.length} upcoming scheduled reminders
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const now = new Date(Date.now() + 15 * 60000);
            setDateVal(now.toISOString().split('T')[0]);
            setTimeVal(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            setIsAddOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-(--accent) text-(--accent-contrast) hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-opacity"
        >
          <Plus size={15} />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Reminders Content Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full space-y-6 custom-scrollbar">
        {/* Pending Reminders Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
            Upcoming ({pendingReminders.length})
          </h2>

          {pendingReminders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-(--bg-card) border border-(--border-subtle) text-center space-y-2">
              <Bell size={26} className="mx-auto text-(--text-muted) opacity-30" />
              <div className="text-xs font-semibold text-(--text-primary)">No upcoming alarms or reminders</div>
              <p className="text-[11px] text-(--text-muted)">
                Schedule a reminder using the button above or ask Assistance in chat.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 shadow-2xs transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0 mt-0.5">
                        <Clock size={15} />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-(--text-primary) block truncate">
                          {renderTextWithIosEmojis(rem.title)}
                        </span>
                        {rem.notes && (
                          <p className="text-[11px] text-(--text-secondary) mt-0.5 line-clamp-2">
                            {renderTextWithIosEmojis(rem.notes)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Edit and Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(rem)}
                        className="p-1.5 rounded-lg text-(--text-muted) hover:text-[#4E82EE] hover:bg-(--bg-elevated) transition-colors cursor-pointer"
                        title="Edit reminder"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete reminder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-(--border-subtle)/60 text-[11px]">
                    <span className="font-semibold text-rose-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(rem.dueDateTime).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>

                    {rem.recurrence && rem.recurrence !== 'none' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-(--bg-elevated) border border-(--border-subtle) text-[10px] font-semibold capitalize text-(--text-secondary)">
                        <Repeat size={10} />
                        {rem.recurrence}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Triggered History Section */}
        {triggeredReminders.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Past / Triggered
            </h2>
            <div className="space-y-2">
              {triggeredReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3.5 rounded-2xl bg-(--bg-card)/60 border border-(--border-subtle) flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="font-medium text-(--text-primary) truncate">{rem.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(rem)}
                      className="p-1.5 rounded-lg text-(--text-muted) hover:text-[#4E82EE] hover:bg-(--bg-elevated) transition-colors cursor-pointer"
                      title="Edit reminder"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteReminder(rem.id)}
                      className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete reminder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Reminder Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <h3 className="font-bold text-base text-(--text-primary)">Schedule Reminder</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Review project submission"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-medium focus:outline-none focus:border-[#4E82EE]"
                />
              </div>

              {/* Clean Date & Time Split Selector with Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    Date & Time
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPreset(15)}
                      className="px-2 py-0.5 rounded-md bg-(--bg-elevated) border border-(--border-subtle) text-[10px] font-medium text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(60)}
                      className="px-2 py-0.5 rounded-md bg-(--bg-elevated) border border-(--border-subtle) text-[10px] font-medium text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                    >
                      +1hr
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date(Date.now() + 86400000);
                        setDateVal(tomorrow.toISOString().split('T')[0]);
                        setTimeVal('09:00');
                      }}
                      className="px-2 py-0.5 rounded-md bg-(--bg-elevated) border border-(--border-subtle) text-[10px] font-medium text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                    >
                      Tomorrow 9AM
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Date</span>
                    <input
                      type="date"
                      value={dateVal}
                      onChange={(e) => setDateVal(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Time</span>
                    <input
                      type="time"
                      value={timeVal}
                      onChange={(e) => setTimeVal(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Recurrence
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'none', label: 'Once' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRecurrence(opt.id)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                        recurrence === opt.id
                          ? 'border-[#4E82EE] bg-[#4E82EE]/20 text-[#4E82EE] dark:text-[#a8c7fa] ring-2 ring-[#4E82EE]/30 font-bold'
                          : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary)'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-primary) border border-(--border-subtle) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Schedule Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {editingReminder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <h3 className="font-bold text-base text-(--text-primary)">Edit Reminder</h3>
              <button
                onClick={() => setEditingReminder(null)}
                className="p-1 text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Reminder title..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-medium focus:outline-none focus:border-[#4E82EE]"
                />
              </div>

              {/* Clean Date & Time Split Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                  Date & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Date</span>
                    <input
                      type="date"
                      value={editDateVal}
                      onChange={(e) => setEditDateVal(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Time</span>
                    <input
                      type="time"
                      value={editTimeVal}
                      onChange={(e) => setEditTimeVal(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Recurrence
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'none', label: 'Once' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEditRecurrence(opt.id)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                        editRecurrence === opt.id
                          ? 'border-[#4E82EE] bg-[#4E82EE]/20 text-[#4E82EE] dark:text-[#a8c7fa] ring-2 ring-[#4E82EE]/30 font-bold'
                          : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary)'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReminder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-primary) border border-(--border-subtle) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
