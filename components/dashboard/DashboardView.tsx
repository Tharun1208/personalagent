'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Flame,
  Volume2,
  Plus,
  HandCoins,
  TrendingUp,
  Sun,
  Timer,
  Check,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Habit } from '@/types';
import DailyBriefingModal from '@/components/briefing/DailyBriefingModal';

export default function DashboardView() {
  const {
    user,
    tasks,
    reminders,
    goals,
    ledgerEntries,
    setActiveTab,
    sendMessage,
    toggleTask,
    setFocusTimerOpen,
  } = useApp();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [timeStr, setTimeStr] = useState('');
  const [briefingOpen, setBriefingOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await fetch('/api/habits');
        const data = await res.json();
        if (data.habits) setHabits(data.habits);
      } catch {}
    };
    fetchHabits();
  }, []);

  const handleToggleHabit = async (id: string) => {
    try {
      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.habit) {
        setHabits((prev) => prev.map((h) => (h.id === id ? data.habit : h)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const activeGoals = goals.filter((g) => g.status === 'active');
  const pendingDues = (ledgerEntries || []).filter((l) => l.status === 'pending');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header Toolbar */}
      <div className="h-14 px-4 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Sun size={17} />
          </div>
          <div>
            <h1 className="font-semibold text-xs sm:text-sm text-(--text-primary)">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              {formattedDate} · {timeStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBriefingOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Volume2 size={14} />
            <span>Audio Briefing</span>
          </button>
        </div>
      </div>

      {/* Main Briefing Dashboard Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6 custom-scrollbar">
        {/* Executive Summary Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#4E82EE]/10 via-(--bg-card) to-[#9B72CF]/10 border border-[#4E82EE]/25 shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4E82EE] uppercase tracking-wider">
              <Sparkles size={15} />
              <span>Today's Executive Intelligence</span>
            </div>
            <button
              onClick={() => {
                setActiveTab('chat');
                sendMessage('Give me a quick 3-point action plan for today.');
              }}
              className="text-xs font-semibold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>AI Action Plan</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <p className="text-sm font-medium text-(--text-primary) leading-relaxed">
            You currently have <strong>{pendingTasks.length} pending tasks</strong> and{' '}
            <strong>{pendingReminders.length} scheduled alarms</strong> for today.
            {pendingTasks[0] && (
              <span> Top priority item is <span className="text-[#4E82EE] font-semibold">"{pendingTasks[0].title}"</span>.</span>
            )}
            {pendingReminders[0] && (
              <span> Next reminder is set for <strong>{new Date(pendingReminders[0].dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.</span>
            )}
          </p>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-[11px] text-(--text-muted) mb-1">
                <span>Tasks Due</span>
                <CheckSquare size={13} className="text-[#4E82EE]" />
              </div>
              <div className="text-lg font-bold text-(--text-primary)">{pendingTasks.length}</div>
            </div>

            <div
              onClick={() => setActiveTab('reminders')}
              className="p-3 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/40 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-[11px] text-(--text-muted) mb-1">
                <span>Alarms</span>
                <Clock size={13} className="text-rose-500" />
              </div>
              <div className="text-lg font-bold text-(--text-primary)">{pendingReminders.length}</div>
            </div>

            <div
              onClick={() => setActiveTab('habits')}
              className="p-3 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500/40 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-[11px] text-(--text-muted) mb-1">
                <span>Habits</span>
                <Flame size={13} className="text-amber-500" />
              </div>
              <div className="text-lg font-bold text-(--text-primary)">{habits.length}</div>
            </div>

            <div
              onClick={() => setActiveTab('goals')}
              className="p-3 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-purple-500/40 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-[11px] text-(--text-muted) mb-1">
                <span>Active Goals</span>
                <Target size={13} className="text-purple-500" />
              </div>
              <div className="text-lg font-bold text-(--text-primary)">{activeGoals.length}</div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Today's Tasks & Upcoming Alarms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tasks Column */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <CheckSquare size={15} className="text-[#4E82EE]" />
                Today's Priority Tasks
              </span>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-[#4E82EE] font-semibold hover:underline cursor-pointer"
              >
                Open Tasks
              </button>
            </div>

            <div className="space-y-2">
              {pendingTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--text-muted)">
                  All tasks completed for today!
                </div>
              ) : (
                pendingTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(t.id, t.status)}
                    className="p-3 rounded-2xl bg-(--bg-elevated) hover:bg-(--bg-elevated)/80 border border-(--border-subtle) transition-all cursor-pointer flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-lg border border-(--border-subtle) flex items-center justify-center shrink-0">
                        {t.status === 'completed' && <Check size={12} className="text-emerald-500" />}
                      </div>
                      <span className="text-xs font-medium text-(--text-primary) truncate">
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase bg-(--bg-card) text-(--text-secondary) shrink-0 font-mono">
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alarms & Reminders Column */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <Clock size={15} className="text-rose-500" />
                Upcoming Alarms & Reminders
              </span>
              <button
                onClick={() => setActiveTab('reminders')}
                className="text-xs text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                Open Alarms
              </button>
            </div>

            <div className="space-y-2">
              {pendingReminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--text-muted)">
                  No upcoming alarms scheduled
                </div>
              ) : (
                pendingReminders.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      <span className="text-xs font-medium text-(--text-primary) truncate">
                        {r.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-rose-500 shrink-0 font-mono">
                      {new Date(r.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Habit Trackers Section */}
        {habits.length > 0 && (
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <Flame size={15} className="text-amber-500" />
                Today's Habit Check-in
              </span>
              <button
                onClick={() => setActiveTab('habits')}
                className="text-xs text-amber-500 font-semibold hover:underline cursor-pointer"
              >
                Manage Habits
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {habits.map((habit) => {
                const isCompletedToday = habit.lastCompletedDate === todayStr;
                return (
                  <div
                    key={habit.id}
                    onClick={() => handleToggleHabit(habit.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isCompletedToday
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-(--border-medium)'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-xs text-(--text-primary) truncate">
                        {habit.title}
                      </div>
                      <div className="text-[10px] text-(--text-muted)">
                        {habit.streak || 0} day streak
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isCompletedToday
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-(--bg-card) border border-(--border-subtle) text-transparent'
                      }`}
                    >
                      <Check size={13} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Audio Daily Briefing Modal */}
      {briefingOpen && (
        <DailyBriefingModal isOpen={briefingOpen} onClose={() => setBriefingOpen(false)} />
      )}
    </div>
  );
}
