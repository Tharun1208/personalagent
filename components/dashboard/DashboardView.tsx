'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  TrendingDown,
  Sun,
  Timer,
  Check,
  Wallet,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  ListTodo,
  AlarmClock,
  Trophy,
  CreditCard,
  Layers,
  Activity,
  ChevronRight,
  CloudSun,
  Globe,
  DollarSign,
  RefreshCw,
  Wind,
  Droplets,
  Newspaper,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Habit } from '@/types';
import DailyBriefingModal from '@/components/briefing/DailyBriefingModal';
import { apiFetch } from '@/lib/api';


// Storage key for daily spending to pull real-time financial KPI
const SPENDING_STORAGE_KEY = 'assistance_daily_spending';

interface SpendingEntry {
  id: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string;
  createdAt: string;
}

function loadSpending(): SpendingEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SPENDING_STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function DashboardView() {
  const {
    user,
    tasks,
    reminders,
    goals,
    ledgerEntries,
    conversations,
    setActiveTab,
    sendMessage,
    toggleTask,
    setFocusTimerOpen,
    setLiveVoiceOpen,
  } = useApp();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [timeStr, setTimeStr] = useState('');
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [spendingList, setSpendingList] = useState<SpendingEntry[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000); // 30-sec tick instead of 1-sec to eliminate mobile lag
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSpendingList(loadSpending());
  }, []);

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await apiFetch('/api/habits');
        const data = await res.json();
        if (data.habits) setHabits(data.habits);
      } catch {}
    };
    fetchHabits();
  }, []);

  const handleToggleHabit = async (id: string) => {
    try {
      const res = await apiFetch('/api/habits', {
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

  // ── KPI Calculations (Memoized for zero-lag mobile performance) ──────────────
  const { totalTasks, completedTasks, pendingTasks, taskCompletionRate, highPriorityTasks } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed');
    const pending = tasks.filter((t) => t.status !== 'completed');
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const high = pending.filter((t) => t.priority === 'high' || t.priority === 'urgent');
    return { totalTasks: total, completedTasks: completed, pendingTasks: pending, taskCompletionRate: rate, highPriorityTasks: high };
  }, [tasks]);

  // 2. Alarms & Reminders KPIs
  const { pendingReminders, nextReminder } = useMemo(() => {
    const pending = reminders.filter((r) => r.status === 'pending');
    const sorted = pending
      .slice()
      .sort((a, b) => new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime());
    return { pendingReminders: pending, nextReminder: sorted[0] };
  }, [reminders]);


  // 3. Financial & Spending KPIs
  const todaySpendingTotal = useMemo(() => {
    return spendingList.filter((e) => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  }, [spendingList, todayStr]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthSpendingTotal = useMemo(() => {
    return spendingList
      .filter((e) => {
        const [y, m] = e.date.split('-').map(Number);
        return y === currentYear && m - 1 === currentMonth;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [spendingList, currentYear, currentMonth]);

  const duesStats = useMemo(() => {
    const pending = (ledgerEntries || []).filter((e) => e.status === 'pending');
    const give = pending.filter((e) => e.type === 'give').reduce((s, e) => s + e.amount, 0);
    const receive = pending.filter((e) => e.type === 'receive').reduce((s, e) => s + e.amount, 0);
    const net = receive - give;
    return { give, receive, net, pendingCount: pending.length };
  }, [ledgerEntries]);

  // 4. Goals & Milestone KPIs
  const activeGoals = goals.filter((g) => g.status === 'active');
  const goalsMilestonesCompleted = useMemo(() => {
    let totalM = 0;
    let compM = 0;
    goals.forEach((g) => {
      if (g.milestones) {
        totalM += g.milestones.length;
        compM += g.milestones.filter((m) => m.completed).length;
      }
    });
    return { totalM, compM, pct: totalM > 0 ? Math.round((compM / totalM) * 100) : 0 };
  }, [goals]);

  // 5. Habits KPIs
  const habitsCompletedToday = habits.filter((h) => h.lastCompletedDate === todayStr).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((habitsCompletedToday / habits.length) * 100) : 0;

  // 6. 7-Day Spending Trend for Mini Chart
  const past7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }, []);

  const weeklySpendValues = useMemo(() => {
    return past7Days.map((dateStr) => {
      return spendingList.filter((e) => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
    });
  }, [past7Days, spendingList]);

  const maxWeeklySpend = Math.max(...weeklySpendValues, 1);

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
      
      {/* ── Top Header Toolbar (Mobile Optimized) ── */}
      <div className="px-4 py-3 sm:px-6 sm:h-16 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0 select-none">
            <Sun size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-base text-(--text-primary) truncate">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted) truncate">
              {formattedDate} · <span className="font-mono font-semibold">{timeStr}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setBriefingOpen(true)}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] text-white text-[11px] sm:text-xs font-semibold hover:opacity-95 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Volume2 size={13} />
            <span>Briefing</span>
          </button>
        </div>
      </div>

      {/* ── Main KPI Canvas (Mobile-First Scrollable View) ── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 custom-scrollbar pb-24 md:pb-8">

        {/* ── 1. Executive Intelligence Card (Mobile Streamlined) ── */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#4E82EE]/10 via-(--bg-card) to-[#9B72CF]/10 border border-[#4E82EE]/25 shadow-xs space-y-3 sm:space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#4E82EE] uppercase tracking-wider">
              <Sparkles size={14} className="text-[#4E82EE]" />
              <span>Executive Daily Briefing</span>
            </div>
            <button
              onClick={() => {
                setActiveTab('chat');
                sendMessage('Analyze my tasks, financial dues, and today\'s schedule. Give me a 3-point action plan.');
              }}
              className="text-[11px] sm:text-xs font-semibold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>AI Plan</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <p className="text-xs sm:text-sm font-medium text-(--text-primary) leading-relaxed">
            You have <strong className="text-[#4E82EE]">{pendingTasks.length} pending tasks</strong>,{' '}
            <strong className="text-rose-500">{pendingReminders.length} alarms</strong>, and today&apos;s spending stands at{' '}
            <strong className="text-emerald-500">₹{todaySpendingTotal.toLocaleString('en-IN')}</strong>.
            {highPriorityTasks.length > 0 && (
              <span> Focus on high priority: <strong className="text-(--text-primary)">&ldquo;{highPriorityTasks[0].title}&rdquo;</strong>.</span>
            )}
            {nextReminder && (
              <span> Next reminder is at <strong>{new Date(nextReminder.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.</span>
            )}
          </p>

          {/* Quick Action Buttons Grid (Mobile 2-Row / Desktop Row) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
            >
              <CheckSquare size={13} className="text-[#4E82EE]" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-emerald-500/50 text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
            >
              <CreditCard size={13} className="text-emerald-500" />
              <span>Log Expense</span>
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/50 text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
            >
              <AlarmClock size={13} className="text-rose-500" />
              <span>Set Alarm</span>
            </button>
            <button
              onClick={() => setFocusTimerOpen(true)}
              className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500/50 text-xs font-semibold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
            >
              <Flame size={13} className="text-amber-500" />
              <span>Focus 25m</span>
            </button>
          </div>
        </div>

        {/* ── 2. Master KPI Metrics Grid (Mobile 2-Column / Desktop 6-Column) ── */}
        <div>
          <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-(--text-muted) mb-2.5 px-1 flex items-center gap-1.5">
            <Activity size={14} className="text-[#4E82EE]" />
            Key Performance Indicators (KPIs)
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* KPI 1: Task Completion Rate */}
            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Tasks</span>
                <ListTodo size={14} className="text-[#4E82EE]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-(--text-primary) font-mono">{taskCompletionRate}%</p>
                <div className="w-full h-1.5 rounded-full bg-(--bg-elevated) mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#4E82EE]" style={{ width: `${taskCompletionRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">{completedTasks.length}/{totalTasks} done</p>
            </div>

            {/* KPI 2: Today's Spending */}
            <div
              onClick={() => setActiveTab('ledger')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Today Spend</span>
                <DollarSign size={14} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-500 font-mono truncate">₹{todaySpendingTotal.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">Month: ₹{monthSpendingTotal.toLocaleString('en-IN')}</p>
            </div>

            {/* KPI 3: Net Ledger Due Balance */}
            <div
              onClick={() => setActiveTab('ledger')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-indigo-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Net Dues</span>
                <HandCoins size={14} className="text-indigo-500" />
              </div>
              <div>
                <p className={`text-xl sm:text-2xl font-black font-mono truncate ${duesStats.net >= 0 ? 'text-[#4E82EE]' : 'text-rose-500'}`}>
                  {duesStats.net >= 0 ? '+' : ''}₹{duesStats.net.toLocaleString('en-IN')}
                </p>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">{duesStats.pendingCount} active dues</p>
            </div>

            {/* KPI 4: Alarms & Alerts */}
            <div
              onClick={() => setActiveTab('reminders')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Alarms</span>
                <AlarmClock size={14} className="text-rose-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-(--text-primary) font-mono">{pendingReminders.length}</p>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">
                {nextReminder ? new Date(nextReminder.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None active'}
              </p>
            </div>

            {/* KPI 5: Goal Milestones */}
            <div
              onClick={() => setActiveTab('goals')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-purple-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Goals</span>
                <Target size={14} className="text-purple-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-purple-500 font-mono">{activeGoals.length}</p>
                <div className="w-full h-1.5 rounded-full bg-(--bg-elevated) mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${goalsMilestonesCompleted.pct}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">{goalsMilestonesCompleted.compM}/{goalsMilestonesCompleted.totalM || 1} milestones</p>
            </div>

            {/* KPI 6: Habits & Daily Streak */}
            <div
              onClick={() => setActiveTab('habits')}
              className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-semibold text-[11px] sm:text-xs truncate">Habit Streak</span>
                <Flame size={14} className="text-amber-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-500 font-mono">{habitCompletionRate}%</p>
                <div className="w-full h-1.5 rounded-full bg-(--bg-elevated) mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${habitCompletionRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate">{habitsCompletedToday}/{habits.length || 1} done today</p>
            </div>
          </div>
        </div>

        {/* ── 3. Visual Charts & Analytics Section (2-Column) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Spending Trend Mini Bar Histogram */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-primary) flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#4E82EE]" />
                  7-Day Spending Velocity
                </h3>
                <p className="text-[11px] text-(--text-muted)">Daily spend trends for the past week</p>
              </div>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-semibold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Ledger</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* 7-Day Mini Histogram */}
            <div className="flex items-end gap-2 h-28 pt-3">
              {past7Days.map((d, i) => {
                const val = weeklySpendValues[i];
                const pct = (val / maxWeeklySpend) * 100;
                const isToday = d === todayStr;

                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-(--text-muted) font-mono">
                      {val > 0 ? `₹${val.toLocaleString('en-IN')}` : ''}
                    </span>
                    <div className="w-full rounded-t-lg relative flex items-end" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isToday ? 'bg-[#4E82EE]' : 'bg-(--bg-elevated) group-hover:bg-[#4E82EE]/50'
                        }`}
                        style={{ height: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold ${isToday ? 'text-[#4E82EE]' : 'text-(--text-muted)'}`}>
                      {isToday ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Dues & Smart Settlement Summary */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-primary) flex items-center gap-1.5">
                  <Wallet size={14} className="text-teal-500" />
                  Financial Health Overview
                </h3>
                <p className="text-[11px] text-(--text-muted)">Dues, receivables, and net cashflow</p>
              </div>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-semibold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Dues</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                <div className="flex items-center justify-between text-xs text-(--text-muted)">
                  <span>You Need to Give</span>
                  <ArrowUpRight size={13} className="text-rose-500" />
                </div>
                <p className="text-xl font-bold text-rose-500 font-mono">₹{duesStats.give.toLocaleString('en-IN')}</p>
              </div>

              <div className="p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                <div className="flex items-center justify-between text-xs text-(--text-muted)">
                  <span>Owed to You</span>
                  <ArrowDownLeft size={13} className="text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-emerald-500 font-mono">₹{duesStats.receive.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#4E82EE]/10 border border-[#4E82EE]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#4E82EE] text-white flex items-center justify-center">
                  <Zap size={13} />
                </div>
                <span className="text-xs font-semibold text-(--text-primary)">Optimal Smart Settlements Active</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#4E82EE]">DSA O(V log V)</span>
            </div>
          </div>
        </div>

        {/* ── 4. Detailed Sections: Priority Tasks & Alarms ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Priority Tasks Column */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Priority Tasks ({pendingTasks.length})
              </span>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs text-[#4E82EE] font-semibold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {pendingTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--text-muted)">
                  All tasks completed for today!
                </div>
              ) : (
                pendingTasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(t.id, t.status)}
                    className="p-3 rounded-2xl bg-(--bg-elevated) hover:bg-(--bg-elevated)/80 border border-(--border-subtle) transition-all cursor-pointer flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-lg border border-(--border-subtle) flex items-center justify-center shrink-0">
                        {t.status === 'completed' && <span className="text-xs text-emerald-500">✓</span>}
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

          {/* Upcoming Alarms Column */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <AlarmClock size={14} className="text-rose-500" />
                Upcoming Alarms ({pendingReminders.length})
              </span>
              <button
                onClick={() => setActiveTab('reminders')}
                className="text-xs text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {pendingReminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--text-muted)">
                  No upcoming alarms scheduled
                </div>
              ) : (
                pendingReminders.slice(0, 4).map((r) => (
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

        {/* ── 5. Habit Streaks Section ── */}
        {habits.length > 0 && (
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                Habit Streak & Daily Progress
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
                      <span className="text-xs font-bold">✓</span>
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
