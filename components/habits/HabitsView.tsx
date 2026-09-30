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
} from 'lucide-react';
import { Habit } from '@/types';
import { apiFetch, safeJson } from '@/lib/api';

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
  const [habits, setHabits] = useState<Habit[]>(loadLocalHabits);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
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
      frequency: 'daily',
      streak: 0,
      history: [],
      createdAt: new Date().toISOString(),
    };

    setHabits((prev) => [newHabit, ...prev]);
    setNewTitle('');
    setIsAddOpen(false);

    try {
      const res = await apiFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tempId, title: newHabit.title, frequency: 'daily' }),
      });
      const data = await safeJson(res);
      if (data?.habit) {
        setHabits((prev) => prev.map((h) => (h.id === tempId ? data.habit : h)));
      }
    } catch (err) {
      console.warn('Habit creation sync notice:', err);
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
        body: JSON.stringify({ id }),
      });
      const data = await safeJson(res);
      if (data?.habit) {
        setHabits((prev) => prev.map((h) => (h.id === id ? data.habit : h)));
      }
    } catch (err) {
      console.warn('Habit toggle sync notice:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await apiFetch(`/api/habits?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Habit delete sync notice:', err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Header */}
      <header className="h-16 px-6 border-b border-(--border-subtle)/50 flex items-center justify-between shrink-0 bg-(--bg-primary)/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 text-amber-500 flex items-center justify-center shadow-xs">
            <Flame size={18} />
          </div>
          <div>
            <h1 className="font-semibold text-base text-(--text-primary) flex items-center gap-2 font-sans">
              Habits & Daily Streaks
            </h1>
            <p className="text-[11px] text-(--text-muted)">
              Build consistency and maintain daily streaks
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold hover:opacity-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <Plus size={15} />
          <span>New Habit</span>
        </button>
      </header>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6 custom-scrollbar">
        {/* Habit Summary Card */}
        <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) flex items-center justify-between shadow-2xs">
          <div>
            <div className="font-bold text-base text-(--text-primary)">Daily Consistency</div>
            <div className="text-xs text-(--text-muted) mt-0.5">
              {habits.filter((h) => h.lastCompletedDate === todayStr).length} of {habits.length} habits completed today
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-xl font-mono">
            <Flame size={22} className="animate-pulse" />
            <span>{habits.reduce((acc, h) => acc + h.streak, 0)} Total Streaks</span>
          </div>
        </div>

        {/* Habits List */}
        {habits.length === 0 ? (
          <div className="py-20 text-center text-xs text-(--text-muted) space-y-3">
            <Flame size={32} className="mx-auto text-neutral-400 opacity-50" />
            <div>No habits created yet. Start tracking your first daily habit!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit) => {
              const isCompletedToday = habit.lastCompletedDate === todayStr;

              return (
                <div
                  key={habit.id}
                  className={`p-5 rounded-3xl border transition-all flex items-center justify-between shadow-2xs group ${
                    isCompletedToday
                      ? 'bg-(--bg-card) border-emerald-500/40'
                      : 'bg-(--bg-card) border-(--border-subtle) hover:border-[#4E82EE]/40'
                  }`}
                >
                  <div className="space-y-2 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-(--text-primary) truncate">
                        {habit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Flame size={13} />
                        <span>{habit.streak} day streak</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(habit.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-semibold text-xs transition-all cursor-pointer shadow-xs ${
                        isCompletedToday
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : 'bg-(--bg-elevated) text-(--text-muted) hover:bg-emerald-500/20 hover:text-emerald-500'
                      }`}
                      title={isCompletedToday ? 'Completed today' : 'Mark done for today'}
                    >
                      <Check size={20} />
                    </button>

                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="p-2 rounded-xl text-(--text-muted) hover:text-rose-500 hover:bg-(--bg-elevated) opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete habit"
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

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4">
            <h2 className="font-bold text-base text-(--text-primary)">Add New Daily Habit</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Code for 1 hour, Drink 3L water"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-sm focus:outline-none focus:border-[#4E82EE]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-card) border border-(--border-subtle) cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold hover:opacity-95 cursor-pointer"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
