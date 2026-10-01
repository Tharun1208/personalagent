'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Check,
  RotateCcw,
  Sparkles,
  Trash2,
  Calendar,
  CheckCircle2,
  Edit2,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Habit } from '@/types';
import { apiFetch, safeJson } from '@/lib/api';
import { useApp } from '@/lib/context/AppContext';

const HABITS_STORAGE_KEY = 'recall_habits';

function loadLocalHabits(): Habit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function HabitsView() {
  const { showConfirm } = useApp();
  const [habits, setHabits] = useState<Habit[]>(loadLocalHabits);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Form states for Add
  const [newTitle, setNewTitle] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly'>('daily');

  // Form states for Edit
  const [editTitle, setEditTitle] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly'>('daily');
  const [editStreak, setEditStreak] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Client hydration from localStorage
  useEffect(() => {
    const local = loadLocalHabits();
    if (local && local.length > 0) {
      setHabits(local);
    }
    setIsHydrated(true);
  }, []);

  // Auto-persist to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    } catch {}
  }, [habits, isHydrated]);

  const fetchHabits = async () => {
    try {
      const res = await apiFetch('/api/habits');
      const data = await safeJson(res);
      if (data?.habits && Array.isArray(data.habits)) {
        setHabits((prev) => {
          if (data.habits.length === 0 && prev.length > 0) {
            // Push local habits to server
            prev.forEach((h) => {
              apiFetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(h),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, Habit>();
          data.habits.forEach((h: Habit) => map.set(h.id, h));
          prev.forEach((h) => {
            if (!map.has(h.id)) {
              map.set(h.id, h);
              apiFetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(h),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to load habits from server', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tempId = `habit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newHabit: Habit = {
      id: tempId,
      userId: 'usr_primary_default',
      title: newTitle.trim(),
      frequency: newFrequency,
      streak: 0,
      history: [],
      createdAt: new Date().toISOString(),
    };

    setHabits((prev) => [newHabit, ...prev]);
    setNewTitle('');
    setNewFrequency('daily');
    setIsAddOpen(false);

    try {
      const res = await apiFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tempId, title: newHabit.title, frequency: newFrequency }),
      });
      const data = await safeJson(res);
      if (data?.habit) {
        setHabits((prev) => prev.map((h) => (h.id === tempId ? data.habit : h)));
      }
    } catch (err) {
      console.warn('Habit creation sync notice:', err);
    }
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditFrequency(habit.frequency || 'daily');
    setEditStreak(habit.streak || 0);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHabit || !editTitle.trim()) return;

    const updatedPatch: Partial<Habit> = {
      title: editTitle.trim(),
      frequency: editFrequency,
      streak: Math.max(0, editStreak),
    };

    setHabits((prev) =>
      prev.map((h) => (h.id === editingHabit.id ? { ...h, ...updatedPatch } : h))
    );
    const targetId = editingHabit.id;
    setEditingHabit(null);

    try {
      const res = await apiFetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, ...updatedPatch }),
      });
      const data = await safeJson(res);
      if (data?.habit) {
        setHabits((prev) => prev.map((h) => (h.id === targetId ? data.habit : h)));
      }
    } catch (err) {
      console.warn('Habit update sync notice:', err);
    }
  };

  const handleToggle = async (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const isDone = h.lastCompletedDate === todayStr;
        return {
          ...h,
          lastCompletedDate: isDone ? undefined : todayStr,
          streak: isDone ? Math.max(0, h.streak - 1) : h.streak + 1,
        };
      })
    );

    try {
      const res = await apiFetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, toggle: true }),
      });
      const data = await safeJson(res);
      if (data?.habit) {
        setHabits((prev) => prev.map((h) => (h.id === id ? data.habit : h)));
      }
    } catch (err) {
      console.warn('Habit toggle sync notice:', err);
    }
  };

  const handleDelete = async (id: string, title?: string) => {
    showConfirm({
      title: 'Delete Habit',
      message: `Are you sure you want to delete "${title || 'this habit'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        if (editingHabit?.id === id) {
          setEditingHabit(null);
        }
        try {
          await apiFetch(`/api/habits?id=${id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('Habit delete sync notice:', err);
        }
      },
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const totalStreaks = habits.reduce((acc, h) => acc + (h.streak || 0), 0);
  const completedTodayCount = habits.filter((h) => h.lastCompletedDate === todayStr).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-(--bg-primary) text-(--text-primary)">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 sm:pb-36 md:pb-12 space-y-6">
        {/* Top Header - Spacious and clean */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-md border border-amber-500/20">
              <Flame size={22} className="shrink-0" />
            </div>
            <div className="space-y-0.5">
              <h1 className="app-page-title text-xl sm:text-2xl font-bold tracking-tight">
                Habits & Daily Streaks
              </h1>
              <p className="app-page-subtitle text-xs sm:text-sm text-(--text-secondary)">
                Build consistency, maintain daily streaks, and track healthy routines.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-semibold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={16} />
            <span>New Habit</span>
          </button>
        </div>

        {/* Habit Consistency Metric Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1.5">
            {/* 1. Daily Consistency Header */}
            <div className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
              Daily Consistency
            </div>
            
            {/* 2. 0/0 Done and 0 habits */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-(--text-primary)">
                {completedTodayCount}/{habits.length} Done
              </span>
              <span className="text-xs sm:text-sm font-semibold text-(--text-muted)">
                ({habits.length} {habits.length === 1 ? 'habit' : 'habits'})
              </span>
            </div>

            <p className="text-[11px] text-(--text-muted)">
              {habits.length > 0 && completedTodayCount === habits.length
                ? 'All habits completed today! Fantastic job!'
                : `${habits.length - completedTodayCount} habits remaining for today`}
            </p>
          </div>

          {/* 3. Streaks with fire emoji without any background */}
          <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xl sm:text-2xl font-mono shrink-0">
            <span className="text-2xl leading-none select-none">🔥</span>
            <span>{totalStreaks} Total Streaks</span>
          </div>
        </div>

        {/* Habits List */}
        {habits.length === 0 ? (
          <div className="py-20 text-center text-xs text-(--text-muted) space-y-3 bg-(--bg-card) border border-(--border-subtle) rounded-3xl p-8">
            <div className="w-14 h-14 rounded-3xl bg-(--bg-elevated) flex items-center justify-center mx-auto text-(--text-muted)">
              <span className="text-2xl select-none">🔥</span>
            </div>
            <h3 className="font-bold text-base text-(--text-primary)">No Habits Created Yet</h3>
            <p className="text-xs text-(--text-muted) max-w-sm mx-auto">
              Start tracking daily routines like drinking water, morning exercise, reading, or coding.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Your First Habit</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit) => {
              const isCompletedToday = habit.lastCompletedDate === todayStr;

              return (
                <div
                  key={habit.id}
                  className={`p-5 rounded-3xl border transition-all flex items-center justify-between shadow-xs relative overflow-hidden group ${
                    isCompletedToday
                      ? 'bg-(--bg-card) border-emerald-500/40 shadow-emerald-500/5'
                      : 'bg-(--bg-card) border-(--border-subtle) hover:border-[#4E82EE]/40'
                  }`}
                >
                  {/* Left info: Title & streak badge */}
                  <div className="space-y-2 min-w-0 pr-3 flex-1">
                    <h3 className={`font-bold text-sm sm:text-base leading-snug truncate ${
                      isCompletedToday ? 'text-(--text-muted) line-through' : 'text-(--text-primary)'
                    }`}>
                      {habit.title}
                    </h3>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-amber-500">
                        <span className="text-sm select-none">🔥</span>
                        <span>{habit.streak || 0} day streak</span>
                      </span>

                      {habit.frequency === 'weekly' && (
                        <span className="text-[10px] uppercase font-semibold text-(--text-muted) bg-(--bg-elevated) px-2 py-0.5 rounded-full border border-(--border-subtle)">
                          Weekly
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Complete toggle, Edit, Delete */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Toggle Completion */}
                    <button
                      type="button"
                      onClick={() => handleToggle(habit.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95 ${
                        isCompletedToday
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : 'bg-(--bg-elevated) text-(--text-muted) hover:bg-emerald-500/20 hover:text-emerald-500'
                      }`}
                      title={isCompletedToday ? 'Completed today (Click to undo)' : 'Mark completed for today'}
                    >
                      <Check size={20} strokeWidth={isCompletedToday ? 3 : 2} />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(habit)}
                      className="p-2.5 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(habit.id, habit.title)}
                      className="p-2.5 rounded-xl text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 relative">
            <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="app-modal-title text-base font-bold">Add New Habit</h3>
                  <p className="app-card-subtitle text-xs text-(--text-muted)">Set up a consistent daily routine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-2 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Drink 3L water, Read 20 pages, Morning Run"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Frequency
                </label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as 'daily' | 'weekly')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none text-(--text-primary) cursor-pointer"
                >
                  <option value="daily">Daily Habit</option>
                  <option value="weekly">Weekly Routine</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-card) border border-(--border-subtle) cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold shadow-md hover:opacity-95 cursor-pointer transition-all"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Habit Modal with Delete Option */}
      {editingHabit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95 relative">
            <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center shrink-0 border border-[#4E82EE]/20">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="app-modal-title text-base font-bold">Edit Habit</h3>
                  <p className="app-card-subtitle text-xs text-(--text-muted)">Modify habit title, frequency or streak</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                className="p-2 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                    Frequency
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value as 'daily' | 'weekly')}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none text-(--text-primary) cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                    Streak Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editStreak}
                    onChange={(e) => setEditStreak(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                  />
                </div>
              </div>

              {/* Action Buttons: Delete Habit + Cancel + Save */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={() => handleDelete(editingHabit.id, editingHabit.title)}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHabit(null)}
                    className="px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-card) border border-(--border-subtle) cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold shadow-md hover:opacity-95 cursor-pointer transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
