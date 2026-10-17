'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  CheckSquare,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  FileText,
  IndianRupee,
  Plus,
  Flame,
  ChevronRight,
  MessageSquare,
  Bell,
  Search,
  Edit2,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

// Storage key used across the application for daily spending entries
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

function normalizeDateStr(rawDate?: string): string | null {
  if (!rawDate) return null;
  const trimmed = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('T')) {
    const part = trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function loadSpending(): SpendingEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SPENDING_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

const ASSISTANCE_PROMPT_CHIPS = [
  { label: '⚡ Summarize today', prompt: 'Summarize my priorities and schedule for today' },
  { label: '📋 Pending tasks', prompt: 'What tasks are pending and high priority?' },
  { label: '📅 Upcoming events', prompt: 'What is on my calendar this week?' },
  { label: '💰 Check dues', prompt: 'How much do people owe me and what do I owe?' },
  { label: '📝 Quick note', prompt: "Take a quick note for me about today's key goals" },
];

export default function DashboardView() {
  const {
    user,
    tasks,
    ledgerEntries,
    reminders,
    setActiveTab,
    toggleTask,
    sendMessage,
    isSending,
  } = useApp();

  const [quickPrompt, setQuickPrompt] = useState('');
  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>(loadSpending);
  const [localNoteCount, setLocalNoteCount] = useState<number>(0);
  const [todayReminders, setTodayReminders] = useState<number>(0);

  // Dynamic greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Today's formatted display date
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const handleQuickSend = async (textToSend?: string) => {
    const text = (textToSend || quickPrompt).trim();
    if (!text || isSending) return;
    setQuickPrompt('');
    setActiveTab('chat');
    await sendMessage(text);
  };

  // Calculate today's reminders count
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const count =
      reminders?.filter((r) => {
        const due = r.dueDateTime;
        return due && new Date(due).toISOString().startsWith(todayStr);
      }).length || 0;
    setTodayReminders(count);
  }, [reminders]);

  // Sync latest spending and note counts from localStorage and realtime window events
  const syncStorageData = useCallback(() => {
    setSpendingEntries(loadSpending());
    try {
      const rawNotes = localStorage.getItem('recall_strategic_notes');
      if (rawNotes) {
        const parsed = JSON.parse(rawNotes);
        setLocalNoteCount(Array.isArray(parsed) ? parsed.length : 0);
      } else {
        setLocalNoteCount(0);
      }
    } catch {
      setLocalNoteCount(0);
    }
  }, []);

  useEffect(() => {
    syncStorageData();
    window.addEventListener('spending_updated', syncStorageData);
    window.addEventListener('storage', syncStorageData);
    window.addEventListener('focus', syncStorageData);
    return () => {
      window.removeEventListener('spending_updated', syncStorageData);
      window.removeEventListener('storage', syncStorageData);
      window.removeEventListener('focus', syncStorageData);
    };
  }, [syncStorageData]);

  // ── 1. KPI Counts ──────────────────────────────────────────────────
  const pendingTasksList = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);
  const completedTasksList = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);
  const pendingTasks = pendingTasksList.length;
  const totalNotes = localNoteCount;
  const pendingDues = useMemo(() => (ledgerEntries || []).filter((e) => e.status === 'pending'), [ledgerEntries]);
  const totalDueAmount = useMemo(() => {
    return pendingDues.reduce((sum, e) => sum + (e.amount - (e.paidAmount || 0)), 0);
  }, [pendingDues]);

  const taskCompletionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasksList.length / tasks.length) * 100);
  }, [tasks.length, completedTasksList.length]);

  // ── 2. Real Daily Spending Graph (Pulled from Ledger / Daily Spending) ──
  const last7DaysKeys = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
  }, []);

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    last7DaysKeys.forEach((d) => {
      map[d] = 0;
    });

    spendingEntries.forEach((e) => {
      const d = normalizeDateStr(e.date) || normalizeDateStr(e.createdAt);
      if (d && map[d] !== undefined) {
        map[d] += Number(e.amount) || 0;
      }
    });

    (ledgerEntries || []).forEach((e) => {
      if (e.type === 'give') {
        const d = normalizeDateStr(e.dueDate) || normalizeDateStr(e.createdAt);
        if (d && map[d] !== undefined) {
          map[d] += Number(e.amount) || 0;
        }
      }
      if (Array.isArray(e.payments)) {
        e.payments.forEach((p) => {
          const d = normalizeDateStr(p.date);
          if (d && map[d] !== undefined) {
            map[d] += Number(p.amount) || 0;
          }
        });
      }
    });

    return map;
  }, [spendingEntries, ledgerEntries, last7DaysKeys]);

  const maxDailySpend = Math.max(...Object.values(dailyTotals), 1);

  const spendingChartPoints = useMemo(() => {
    const width = 380;
    const height = 100;
    const padX = 20;
    const padY = 16;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const pts = last7DaysKeys.map((dateStr, i) => {
      const val = dailyTotals[dateStr] || 0;
      const x = padX + (i / (last7DaysKeys.length - 1)) * plotW;
      const y = padY + (1 - val / maxDailySpend) * plotH;
      const d = new Date(dateStr + 'T00:00:00');
      const dayLabel = d.toLocaleDateString([], { weekday: 'short' });
      return { x, y, val, date: dateStr, dayLabel };
    });

    // Smooth cubic bezier spline through points
    let smoothD = '';
    if (pts.length > 0) {
      smoothD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        smoothD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
    }

    const areaD = `${smoothD} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

    return { pts, pathD: smoothD, areaD, width, height };
  }, [last7DaysKeys, dailyTotals, maxDailySpend]);

  const total7DaySpend = useMemo(() => {
    return Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
  }, [dailyTotals]);

  // ── 3. Upcoming Schedule Data (Pure Reminders & Events) ──
  const upcomingScheduleItems = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'reminder';
      title: string;
      subtitle?: string;
      dateStr: string;
      rawDate?: Date;
      priority?: string;
      status?: string;
      isDone?: boolean;
      originalId: string;
    }> = [];

    (reminders || []).forEach((r) => {
      let dStr = 'Scheduled';
      let rDate: Date | undefined;
      const rawDue = r.dueDateTime || (r as any).dateTime || (r as any).time;
      if (rawDue) {
        try {
          const d = new Date(rawDue);
          if (!isNaN(d.getTime())) {
            rDate = d;
            dStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
        } catch {}
      }

      list.push({
        id: `rem_${r.id}`,
        type: 'reminder',
        title: r.title,
        subtitle: r.recurrence && r.recurrence !== 'none' ? `Recurs ${r.recurrence}` : (r.notes || 'Scheduled Event'),
        dateStr: dStr,
        rawDate: rDate,
        priority: (r.priority as string) || 'normal',
        status: r.status,
        isDone: (r as any).status === 'completed' || r.status === 'dismissed',
        originalId: r.id,
      });
    });

    list.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      if (a.rawDate && b.rawDate) return a.rawDate.getTime() - b.rawDate.getTime();
      if (a.rawDate) return -1;
      if (b.rawDate) return 1;
      return 0;
    });

    return list;
  }, [reminders]);

  const userName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="flex-1 flex overflow-hidden bg-transparent text-slate-900 select-none font-sans">
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8 no-scrollbar pb-36 md:pb-20 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 3. SEARCH PILL INPUT                                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickSend();
            }}
            className="relative flex items-center"
          >
            <div className="relative w-full">
              <div className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Search or ask AI anything..."
                disabled={isSending}
                className="w-full h-12.5 pl-12 pr-12 rounded-full bg-white border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]/20 transition-all"
              />
              {quickPrompt.trim() && (
                <button
                  type="submit"
                  disabled={isSending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8.5 h-8.5 rounded-full bg-[#1C1C1E] text-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-90 transition-all"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              )}
            </div>
          </form>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mt-1 pb-1">
            {ASSISTANCE_PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSend(chip.prompt)}
                className="shrink-0 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 4. FEATURED CARDS (NEW TEMPLATES SWIPABLE LEFT TO RIGHT)      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick Actions
              </span>
            </div>

            {/* Horizontal Carousel */}
            <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 pb-2.5 pt-1 px-1 sm:px-0 scroll-smooth">

              {/* ── CARD 1: Task Manager (Mint Pistachio Template) ── */}
              <div
                onClick={() => setActiveTab('tasks')}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start agent-mint-card p-6 min-h-[195px] flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
              >
                <div className="agent-mint-ripple" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white text-[#1C1C1E] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <CheckSquare size={20} className="stroke-[2.4]" />
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1E] tracking-tight leading-snug">
                    Task Manager
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E]/75 mt-0.5">
                    {pendingTasks} tasks due &amp; daily goals
                  </p>
                </div>

                <div className="flex items-center relative z-10 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1E]/80 bg-white/40 px-3 py-1 rounded-full backdrop-blur-xs">
                    Template
                  </span>
                </div>
              </div>

              {/* ── CARD 2: Personal AI (Lavender Periwinkle Template) ── */}
              <div
                onClick={() => setActiveTab('chat')}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start agent-lavender-card p-6 min-h-[195px] flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
              >
                <div className="agent-lavender-ripple" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-xs overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                      {userName[0]?.toUpperCase() || 'A'}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1E] tracking-tight leading-snug">
                    Personal AI
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E]/75 mt-0.5">
                    Continue daily workflow &amp; briefing
                  </p>
                </div>

                <div className="flex items-center relative z-10 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1E]/80 bg-white/40 px-3 py-1 rounded-full backdrop-blur-xs">
                    Personal AI
                  </span>
                </div>
              </div>

              {/* ── CARD 3: Ledger & Dues (Butter Yellow Template with Dot Matrix) ── */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start agent-yellow-card p-6 min-h-[195px] flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all"
              >
                <div className="agent-yellow-ripple" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white text-[#1C1C1E] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Wallet size={20} className="stroke-[2.4]" />
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1E] tracking-tight leading-snug">
                    Ledger &amp; Dues
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E]/75 mt-0.5">
                    ₹{totalDueAmount >= 100000 ? `${(totalDueAmount / 100000).toFixed(1)}L` : totalDueAmount.toLocaleString()} active due balance
                  </p>
                </div>

                <div className="flex items-center relative z-10 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1E]/80 bg-black/5 px-3 py-1 rounded-full backdrop-blur-xs">
                    Finance
                  </span>
                </div>
              </div>

              {/* ── CARD 4: My Schedule (Soft Coral Rose Template) ── */}
              <div
                onClick={() => setActiveTab('calendar')}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start agent-coral-card p-6 min-h-[195px] flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-2xs"
              >
                <div className="agent-coral-ripple" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white text-[#1C1C1E] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <Calendar size={20} className="stroke-[2.4]" />
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1E] tracking-tight leading-snug">
                    My Schedule
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E]/75 mt-0.5">
                    {todayReminders} reminders &amp; appointments today
                  </p>
                </div>

                <div className="flex items-center relative z-10 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1E]/80 bg-black/5 px-3 py-1 rounded-full backdrop-blur-xs">
                    Schedule
                  </span>
                </div>
              </div>

              {/* ── CARD 5: Notes & Ideas (Soft Lilac Template) ── */}
              <div
                onClick={() => setActiveTab('notes')}
                className="w-[280px] sm:w-[310px] shrink-0 snap-start agent-lilac-card p-6 min-h-[195px] flex flex-col justify-between cursor-pointer group active:scale-[0.98] transition-all shadow-2xs"
              >
                <div className="agent-lilac-ripple" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="w-11 h-11 rounded-full bg-white text-[#1C1C1E] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <FileText size={20} className="stroke-[2.4]" />
                  </div>
                </div>

                <div className="relative z-10 my-3">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1E] tracking-tight leading-snug">
                    Notes &amp; Ideas
                  </h3>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#1C1C1E]/75 mt-0.5">
                    {totalNotes} stored documents &amp; drafts
                  </p>
                </div>

                <div className="flex items-center relative z-10 pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1E]/80 bg-black/5 px-3 py-1 rounded-full backdrop-blur-xs">
                    Documents
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 5. SPENDING CARD (REAL MONEY SPENDING GRAPH)                  */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="rounded-[32px] bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#1C1C1E] tracking-tight">
                  Spending
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  7-day money spending trend
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Ledger</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Metrics Row */}
            <div className="pt-1 pb-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#1C1C1E]">
                    ₹{total7DaySpend >= 100000 ? `${(total7DaySpend / 100000).toFixed(1)}L` : total7DaySpend.toLocaleString()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8EE] text-[#1E9E4A] text-[11px] font-black flex items-center gap-1">
                    <TrendingUp size={12} className="stroke-[2.5]" />
                    <span>Last 7 days</span>
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Total weekly spend
                </p>
              </div>
            </div>

            {/* Enhanced Smooth Curve SVG Graph */}
            <div className="relative pt-3 pb-1">
              <svg
                viewBox="0 0 380 120"
                className="w-full h-32 sm:h-36 overflow-visible"
              >
                <defs>
                  <linearGradient id="spendingCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1C1C1E" stopOpacity="0.18" />
                    <stop offset="70%" stopColor="#1C1C1E" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#1C1C1E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle Horizontal Reference Guidelines */}
                <line x1="20" y1="20" x2="360" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="52" x2="360" y2="52" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="84" x2="360" y2="84" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />

                {/* Shaded Area fill under graph */}
                <path
                  d={spendingChartPoints.areaD}
                  fill="url(#spendingCurveGradient)"
                />

                {/* Main Smooth Spline Curve Line */}
                <path
                  d={spendingChartPoints.pathD}
                  fill="none"
                  stroke="#1C1C1E"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points and Weekday Labels */}
                {spendingChartPoints.pts.map((pt, idx) => {
                  const isLatest = idx === spendingChartPoints.pts.length - 1;
                  return (
                    <g key={idx}>
                      {isLatest && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="9"
                          className="fill-[#1C1C1E]/15 animate-ping"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isLatest ? "4.5" : "3.5"}
                        fill={isLatest ? "#1C1C1E" : "#FFFFFF"}
                        stroke="#1C1C1E"
                        strokeWidth={isLatest ? "2" : "2.4"}
                      />
                      <text
                        x={pt.x}
                        y={118}
                        textAnchor="middle"
                        className={`text-[10px] select-none ${
                          isLatest ? "font-black fill-slate-900" : "font-semibold fill-slate-400"
                        }`}
                      >
                        {pt.dayLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SECTION HEADER: LIVE ACTIVITY (MATCHES "LIVE SHIPMENTS")      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Live Activity
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time schedules and actionable to-dos
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white/60 px-3 py-1 rounded-full border border-white/80">
              {upcomingScheduleItems.filter((i) => !i.isDone).length + pendingTasks} items
            </span>
          </div>

          {/* TWO COLUMN SECTION: UPCOMING SCHEDULE & PENDING TASKS         */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">

            {/* ── LEFT: UPCOMING SCHEDULE ── */}
            <div className="p-6 sm:p-7 rounded-[32px] transio-glass-card space-y-4">
              <div className="flex items-center justify-between border-b border-white/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50/90 flex items-center justify-center text-blue-600 shadow-2xs">
                    <Calendar size={17} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      Upcoming Schedule
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50/80 text-blue-600 border border-blue-200/60 backdrop-blur-xs">
                        {upcomingScheduleItems.filter((i) => !i.isDone).length}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Reminders and scheduled calendar items
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Calendar</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* List of Upcoming Schedule Items */}
              {upcomingScheduleItems.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingScheduleItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveTab('calendar')}
                      className="p-3 sm:p-3.5 rounded-2xl transio-glass-chip cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0">
                          <Clock size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                              item.isDone
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 group-hover:text-blue-600'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="truncate font-medium text-slate-500">{item.dateStr}</span>
                            {item.subtitle && (
                              <span className="hidden sm:inline truncate text-slate-400">
                                · {item.subtitle}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 bg-blue-50/80 text-blue-700 border-blue-200/80 flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Scheduled
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700">No upcoming schedules! 🎉</p>
                  <p className="text-xs text-slate-400">You are completely caught up with your calendar and reminders.</p>
                </div>
              )}
            </div>

            {/* ── RIGHT: PENDING TASKS ── */}
            <div className="p-6 sm:p-7 rounded-[32px] transio-glass-card space-y-4">
              <div className="flex items-center justify-between border-b border-white/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50/90 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <CheckSquare size={17} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      Pending Tasks
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50/80 text-indigo-600 border border-indigo-200/60 backdrop-blur-xs">
                        {pendingTasks}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Actionable to-dos and project items
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* List of Pending Tasks */}
              {pendingTasksList.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingTasksList.slice(0, 5).map((task) => {
                    const isHigh = task.priority === 'high' || task.priority === 'urgent';
                    return (
                      <div
                        key={task.id}
                        className="p-3 sm:p-3.5 rounded-2xl transio-glass-chip transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task.id, task.status);
                            }}
                            className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-indigo-600 flex items-center justify-center text-transparent hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                            title="Mark complete"
                          >
                            <CheckCircle2 size={13} className="opacity-0 hover:opacity-100" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {task.dueDate && (
                                <span className="flex items-center gap-1 font-medium text-slate-500">
                                  <Clock size={10} />
                                  {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {task.description && (
                                <span className="hidden sm:inline truncate text-slate-400">
                                  · {task.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Priority Tag */}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1.5 shadow-2xs ${
                            isHigh
                              ? 'bg-rose-50/80 text-rose-600 border-rose-200/80'
                              : 'bg-slate-100/80 text-slate-600 border-slate-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHigh ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700">All tasks completed! 🚀</p>
                  <p className="text-xs text-slate-400">Great job! You have no pending to-dos right now.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
