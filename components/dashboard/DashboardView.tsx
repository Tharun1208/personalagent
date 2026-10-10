'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wifi,
  MoreHorizontal,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Zap,
  Sliders,
  QrCode,
  Layers,
  Lightbulb,
  Radio,
  Wind,
  Wallet,
  FileText,
  IndianRupee,
} from 'lucide-react';
import { useApp, AppTab } from '@/lib/context/AppContext';

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

export default function DashboardView() {
  const {
    tasks,
    ledgerEntries,
    reminders,
    setActiveTab,
    toggleTask,
  } = useApp();

  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>(loadSpending);
  const [localNoteCount, setLocalNoteCount] = useState<number>(0);

  // Toggle states for the bento cards
  const [socketToggle, setSocketToggle] = useState(true);
  const [purifierToggle, setPurifierToggle] = useState(false);
  const [lampToggle, setLampToggle] = useState(true);

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
  const pendingTasksList = tasks.filter((t) => t.status !== 'completed');
  const completedTasksList = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = pendingTasksList.length;
  const totalNotes = localNoteCount;
  const pendingDues = (ledgerEntries || []).filter((e) => e.status === 'pending');
  const totalDueAmount = pendingDues.reduce((sum, e) => sum + (e.amount - (e.paidAmount || 0)), 0);

  // ── 1.1 7-Day Activity Pill Heights for Hero Lime Card ─────────────
  const weekDayStats = useMemo(() => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const todayDay = new Date().getDay();
    const counts = [0, 0, 0, 0, 0, 0, 0];

    // Compute task counts across days of week
    tasks.forEach((t) => {
      const dateStr = t.dueDate || t.createdAt || (t as any).updatedAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          counts[d.getDay()] += 1;
        }
      }
    });

    const maxCount = Math.max(...counts, 1);

    return days.map((day, idx) => {
      const isToday = idx === todayDay;
      const count = counts[idx];
      // Normalize height between 35% and 92%
      const pct = Math.round(35 + (count / maxCount) * 55);
      const height = `${Math.min(95, Math.max(30, count === 0 ? (isToday ? 85 : 45 + (idx * 7) % 35) : pct))}%`;
      return {
        day,
        height,
        count,
        isHatched: isToday,
      };
    });
  }, [tasks]);

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
    last7DaysKeys.forEach((d) => { map[d] = 0; });
    
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

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

    return { pts, pathD, areaD, width, height };
  }, [last7DaysKeys, dailyTotals, maxDailySpend]);

  const total7DaySpend = useMemo(() => {
    return Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
  }, [dailyTotals]);

  // ── 3. Upcoming Schedule Data (Pure Reminders & Events, No Tasks) ──
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

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F4F5F8] text-slate-900 select-none font-sans">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 no-scrollbar pb-32 md:pb-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 1. TOP CARDS: 1st RECTANGLE, MIDDLE 2 SQUARES, LAST RECTANGLE  */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4.5 items-stretch">

            {/* ── 1. FIRST CARD: Tasks & Activity (Indigo Accent) ── */}
            <div
              onClick={() => setActiveTab('tasks')}
              className="col-span-2 lg:col-span-6 rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100 hover:border-indigo-200 shadow-2xs hover:shadow-md transition-all cursor-pointer p-4.5 sm:p-5 flex flex-col justify-between group overflow-hidden min-h-[160px] sm:min-h-[195px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                    <CheckSquare size={19} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      Tasks & Activity
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                      Weekly completion & streak
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/70 shrink-0">
                  {pendingTasks} Due
                </span>
              </div>

              {/* Metrics Row */}
              <div className="pt-3 flex items-end justify-between">
                <div className="flex flex-col justify-end">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                      {pendingTasks}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">pending to-dos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    <span className="text-indigo-600 font-bold">{completedTasksList.length}</span> completed of {tasks.length} tasks
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs shrink-0">
                  <span>View Tasks</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>

              {/* Minimal Progress Line */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-2">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{
                    width: tasks.length > 0 ? `${Math.round((completedTasksList.length / tasks.length) * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* ── 2. MIDDLE CARD 1: Ledger & Dues (Emerald Accent) ── */}
            <div
              onClick={() => setActiveTab('ledger')}
              className="col-span-1 lg:col-span-3 rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100 hover:border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer p-4 sm:p-5 flex flex-col justify-between group overflow-hidden min-h-[160px] sm:min-h-[195px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                  <Wallet size={19} strokeWidth={2.2} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/70 shrink-0">
                  Dues
                </span>
              </div>

              <div className="pt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight block truncate">
                  ₹{totalDueAmount >= 100000 ? `${(totalDueAmount / 100000).toFixed(1)}L` : totalDueAmount.toLocaleString()}
                </span>
                <div className="mt-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">
                    Ledger & Dues
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {pendingDues.length > 0 ? `${pendingDues.length} active dues` : 'No dues'}
                  </p>
                </div>
              </div>

              <div className="pt-1.5 flex items-center justify-between text-[11px] font-semibold text-emerald-600 border-t border-slate-100/80">
                <span>Manage</span>
                <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* ── 3. MIDDLE CARD 2: Schedule (Royal Blue Accent) ── */}
            <div
              onClick={() => setActiveTab('calendar')}
              className="col-span-1 lg:col-span-3 rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100 hover:border-blue-200 shadow-2xs hover:shadow-md transition-all cursor-pointer p-4 sm:p-5 flex flex-col justify-between group overflow-hidden min-h-[160px] sm:min-h-[195px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                  <Calendar size={19} strokeWidth={2.2} />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100/70 shrink-0">
                  Events
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {upcomingScheduleItems.filter((i) => !i.isDone).length}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium">upcoming</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                    Schedule
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {upcomingScheduleItems.length} total events
                  </p>
                </div>
              </div>

              <div className="pt-1.5 flex items-center justify-between text-[11px] font-semibold text-blue-600 border-t border-slate-100/80">
                <span>Calendar</span>
                <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* ── 4. LAST CARD: Notes (Amber Accent) ── */}
            <div
              onClick={() => setActiveTab('notes')}
              className="col-span-2 lg:col-span-12 rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100 hover:border-amber-200 shadow-2xs hover:shadow-md transition-all cursor-pointer p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group overflow-hidden min-h-[100px]"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                  <FileText size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      Notes
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100/70">
                      Notes
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {totalNotes > 0 ? `${totalNotes} notes, documents & memories stored` : 'No notes saved yet'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {totalNotes}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium ml-1">Saved</span>
                </div>

                <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs">
                  <span>Open Notes</span>
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </div>

          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2. DAILY SPENDING LINE GRAPH (7-DAY TREND FROM LEDGER)        */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold tracking-tight text-slate-900">
                    Daily Spending Trend
                  </h2>
                  <span
                    onClick={() => setActiveTab('ledger')}
                    className="text-[11px] font-semibold text-[#1C73E8] cursor-pointer hover:underline"
                  >
                    Manage &rarr;
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  7-Day Real Expense Trend from your Ledger
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-slate-900 font-mono">
                  ₹{total7DaySpend.toLocaleString()}
                </span>
                <p className="text-[10px] text-slate-400">past 7 days</p>
              </div>
            </div>

            {/* Sparkline Canvas Area */}
            <div className="relative pt-2 pb-1">
              <svg
                viewBox={`0 0 ${spendingChartPoints.width} ${spendingChartPoints.height}`}
                className="w-full h-32 sm:h-36 overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="dashboardSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1="0" y1="20" x2="380" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="380" y2="50" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="380" y2="80" stroke="#F1F5F9" strokeWidth="1" />

                {/* Area Gradient */}
                <path d={spendingChartPoints.areaD} fill="url(#dashboardSpendGrad)" />

                {/* Line Graph */}
                <path
                  d={spendingChartPoints.pathD}
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {spendingChartPoints.pts.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke="#A855F7"
                    strokeWidth="2"
                    className="cursor-pointer hover:scale-125 transition-transform"
                  />
                ))}
              </svg>

              {/* Day Labels & Spend Amounts */}
              <div className="flex justify-between px-2 pt-2 text-[11px] font-bold text-slate-600">
                {spendingChartPoints.pts.map((pt, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span>{pt.dayLabel}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      {pt.val > 0 ? `₹${pt.val}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 3. UPCOMING SCHEDULE (PURE REMINDERS & CALENDAR EVENTS)       */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5B67F6]">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Upcoming Schedule
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#5B67F6]/10 text-[#5B67F6]">
                      {upcomingScheduleItems.filter((i) => !i.isDone).length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Scheduled reminders, meetings, and calendar events
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="text-xs font-semibold text-[#5B67F6] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Calendar & Schedule</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* List of Upcoming Schedule Items */}
            {upcomingScheduleItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingScheduleItems.slice(0, 6).map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveTab('calendar')}
                      className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-violet-100/80 text-violet-600 flex items-center justify-center shrink-0 shadow-xs">
                          <Clock size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold truncate transition-colors ${
                              item.isDone
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 group-hover:text-[#5B67F6]'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate font-medium text-slate-500">{item.dateStr}</span>
                            {item.subtitle && (
                              <span className="hidden sm:inline truncate text-slate-400">
                                · {item.subtitle}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Tag Badge */}
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 bg-violet-50 text-violet-700 border-violet-100">
                        SCHEDULE
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">No upcoming schedules! 🎉</p>
                <p className="text-xs text-slate-400">You are completely caught up with your calendar and reminders.</p>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 4. PENDING TASKS SECTION (COMES DIRECTLY AFTER SCHEDULE)      */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5000]">
                  <CheckSquare size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Pending Tasks
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FF5000]/10 text-[#FF5000]">
                      {pendingTasks}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Actionable to-dos and project task items
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-semibold text-[#FF5000] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all tasks</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* List of Pending Tasks */}
            {pendingTasksList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingTasksList.slice(0, 6).map((task) => {
                  const isHigh = task.priority === 'high' || task.priority === 'urgent';
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/70 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTask(task.id, task.status);
                          }}
                          className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-[#FF5000] flex items-center justify-center text-transparent hover:text-[#FF5000] transition-colors shrink-0 cursor-pointer"
                          title="Mark complete"
                        >
                          <CheckCircle2 size={13} className="opacity-0 hover:opacity-100" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-[#FF5000] transition-colors truncate">
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
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 uppercase ${
                          isHigh
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {task.priority || 'Normal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">All tasks completed! 🚀</p>
                <p className="text-xs text-slate-400">Great job! You have no pending to-dos right now.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
