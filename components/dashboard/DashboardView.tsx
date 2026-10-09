'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  ArrowRight,
  CheckCircle2,
  HandCoins,
  TrendingUp,
  Sun,
  Wallet,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  ListTodo,
  CreditCard,
  Activity,
  DollarSign,
  FileText,
  Calendar,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

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
  try {
    return JSON.parse(localStorage.getItem(SPENDING_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function DashboardView() {
  const {
    user,
    tasks,
    ledgerEntries,
    setActiveTab,
    toggleTask,
  } = useApp();

  const [timeStr, setTimeStr] = useState('');
  const [spendingList, setSpendingList] = useState<SpendingEntry[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSpendingList(loadSpending());
  }, []);

  // ── 1. Task Velocity KPIs ───────────────────────────────────────
  const { totalTasks, completedTasks, pendingTasks, taskCompletionRate, highPriorityTasks } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed');
    const pending = tasks.filter((t) => t.status !== 'completed');
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const high = pending.filter((t) => t.priority === 'high' || t.priority === 'urgent');
    return { totalTasks: total, completedTasks: completed, pendingTasks: pending, taskCompletionRate: rate, highPriorityTasks: high };
  }, [tasks]);

  // ── 2. Financial & Spending KPIs ─────────────────────────────────
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

  // ── 3. 7-Day Spending Trend for Chart ───────────────────────────
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
      
      {/* ── Top Header Bar ── */}
      <div className="px-4 py-3 sm:px-6 sm:h-16 border-b border-(--border-subtle)/50 flex items-center justify-between shrink-0 bg-(--bg-primary)/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-md shadow-blue-500/20 shrink-0 select-none">
            <Sun size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="app-page-title truncate">
              {getGreeting()}, {user?.name || 'User'}
            </h1>
            <p className="app-page-subtitle truncate">
              {formattedDate} · <span className="font-cutive font-bold text-[#4E82EE]">{timeStr}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Executive Command Canvas ── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 custom-scrollbar pb-32 sm:pb-36 md:pb-12">

        {/* ── 1. Executive Summary Hero Card ── */}
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-[#4E82EE]/12 via-(--bg-card) to-[#9B72CF]/10 border border-[#4E82EE]/25 shadow-lg shadow-blue-500/5 space-y-3 sm:space-y-4 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold text-[#4E82EE] uppercase tracking-wider">
              <Activity size={14} className="text-[#4E82EE]" />
              <span>Executive Overview & Workspace</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-medium text-(--text-primary) leading-relaxed">
            You have <strong className="text-[#4E82EE] font-cutive">{pendingTasks.length} pending action items</strong>, today&apos;s spending stands at{' '}
            <strong className="text-emerald-500 font-cutive">₹{todaySpendingTotal.toLocaleString('en-IN')}</strong>, and you have{' '}
            <strong className="text-indigo-500 font-cutive">{duesStats.pendingCount} active balance settlements</strong>.
            {highPriorityTasks.length > 0 && (
              <span> Top priority: <strong className="text-(--text-primary)">&ldquo;{highPriorityTasks[0].title}&rdquo;</strong>.</span>
            )}
          </p>

          {/* Quick Action Buttons Grid */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className="px-3.5 py-2.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 group"
            >
              <CheckSquare size={14} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className="px-3.5 py-2.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-emerald-500/50 text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 group"
            >
              <CreditCard size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Log Expense</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className="px-3.5 py-2.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500/50 text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 group"
            >
              <FileText size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span>New Note</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className="px-3.5 py-2.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-indigo-500/50 text-xs font-bold text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 group"
            >
              <Calendar size={14} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        {/* ── 2. Master KPI Grid ── */}
        <div>
          <h2 className="app-section-title mb-2.5 px-1 flex items-center gap-1.5">
            <Activity size={14} className="text-[#4E82EE]" />
            Core Executive KPI Metrics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {/* KPI 1: Task Completion Rate */}
            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3.5 sm:p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-bold text-[11px] sm:text-xs truncate">Tasks</span>
                <ListTodo size={15} className="text-[#4E82EE]" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-(--text-primary) font-cutive">{taskCompletionRate}%</p>
                <div className="w-full h-1.5 rounded-full bg-(--bg-elevated) mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-[#4E82EE]" style={{ width: `${taskCompletionRate}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate font-medium">{completedTasks.length}/{totalTasks} completed</p>
            </div>

            {/* KPI 2: Today's Spending */}
            <div
              onClick={() => setActiveTab('ledger')}
              className="p-3.5 sm:p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-emerald-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-bold text-[11px] sm:text-xs truncate">Today Spend</span>
                <DollarSign size={15} className="text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-emerald-500/80">₹</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-500 truncate tracking-tight">
                  {todaySpendingTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate font-medium">Month: ₹{monthSpendingTotal.toLocaleString('en-IN')}</p>
            </div>

            {/* KPI 3: Net Ledger Due Balance */}
            <div
              onClick={() => setActiveTab('ledger')}
              className="p-3.5 sm:p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-indigo-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-bold text-[11px] sm:text-xs truncate">Net Dues</span>
                <HandCoins size={15} className="text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg sm:text-xl font-bold ${duesStats.net >= 0 ? 'text-[#4E82EE]/80' : 'text-rose-500/80'}`}>
                  {duesStats.net >= 0 ? '+' : ''}₹
                </span>
                <p className={`text-xl sm:text-2xl font-black truncate tracking-tight ${duesStats.net >= 0 ? 'text-[#4E82EE]' : 'text-rose-500'}`}>
                  {Math.abs(duesStats.net).toLocaleString('en-IN')}
                </p>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate font-medium">{duesStats.pendingCount} active dues</p>
            </div>

            {/* KPI 4: Pending Tasks Count */}
            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3.5 sm:p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-indigo-500/40 transition-all cursor-pointer shadow-xs space-y-1.5 group active:scale-98"
            >
              <div className="flex items-center justify-between text-xs text-(--text-muted)">
                <span className="font-bold text-[11px] sm:text-xs truncate">Pending Queue</span>
                <CheckSquare size={15} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-indigo-500 font-cutive">{pendingTasks.length}</p>
                <div className="w-full h-1.5 rounded-full bg-(--bg-elevated) mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, pendingTasks.length * 10)}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-(--text-muted) truncate font-medium">{highPriorityTasks.length} high priority</p>
            </div>
          </div>
        </div>

        {/* ── 3. Visual Charts & Analytics Section (2-Column) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Spending Trend Mini Bar Histogram */}
          <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="app-card-title flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-[#4E82EE]" />
                  7-Day Spending Velocity
                </h3>
                <p className="app-card-subtitle mt-0.5">Daily spend trends for the past week</p>
              </div>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-bold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
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
                    <span className="text-[9px] text-(--text-muted) font-cutive font-bold">
                      {val > 0 ? `₹${val.toLocaleString('en-IN')}` : ''}
                    </span>
                    <div className="w-full rounded-t-xl relative flex items-end" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          isToday ? 'bg-[#4E82EE]' : 'bg-(--bg-elevated) group-hover:bg-[#4E82EE]/50'
                        }`}
                        style={{ height: `${Math.max(pct, 8)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-[#4E82EE]' : 'text-(--text-muted)'}`}>
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
                <h3 className="app-card-title flex items-center gap-1.5">
                  <Wallet size={15} className="text-teal-500" />
                  Financial Health Overview
                </h3>
                <p className="app-card-subtitle mt-0.5">Dues, receivables, and net cashflow</p>
              </div>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-bold text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Dues</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                <div className="flex items-center justify-between text-xs text-(--text-muted)">
                  <span className="font-medium">You Need to Give</span>
                  <ArrowUpRight size={14} className="text-rose-500" />
                </div>
                <p className="text-xl font-bold text-rose-500 font-cutive">₹{duesStats.give.toLocaleString('en-IN')}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                <div className="flex items-center justify-between text-xs text-(--text-muted)">
                  <span className="font-medium">Owed to You</span>
                  <ArrowDownLeft size={14} className="text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-emerald-500 font-cutive">₹{duesStats.receive.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#4E82EE]/10 border border-[#4E82EE]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#4E82EE] text-white flex items-center justify-center">
                  <Zap size={13} />
                </div>
                <span className="text-xs font-semibold text-(--text-primary)">Optimal Smart Settlements Active</span>
              </div>
              <span className="text-xs font-cutive font-bold text-[#4E82EE]">DSA O(V log V)</span>
            </div>
          </div>
        </div>

        {/* ── 4. Priority Tasks Section ── */}
        <div className="p-5 rounded-3xl bg-(--bg-card) border border-(--border-subtle) space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="app-card-title flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500" />
              Priority Tasks Queue ({pendingTasks.length})
            </h3>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-[#4E82EE] font-bold hover:underline cursor-pointer"
            >
              View All Tasks
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-(--text-muted) font-medium col-span-full">
                All tasks completed for today!
              </div>
            ) : (
              pendingTasks.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id, t.status)}
                  className="p-3.5 rounded-2xl bg-(--bg-elevated) hover:bg-(--bg-elevated)/80 border border-(--border-subtle) transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-lg border border-(--border-subtle) flex items-center justify-center shrink-0">
                      {t.status === 'completed' && <span className="text-xs text-emerald-500 font-bold">✓</span>}
                    </div>
                    <span className="text-xs font-semibold text-(--text-primary) truncate">
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-(--bg-card) text-(--text-secondary) shrink-0 font-cutive">
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
