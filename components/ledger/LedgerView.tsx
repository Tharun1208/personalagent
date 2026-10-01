'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  BellRing,
  X,
  Wallet,
  ShoppingCart,
  Utensils,
  Bus,
  Coffee,
  Smartphone,
  ShoppingBag,
  Home,
  Zap,
  Heart,
  MoreHorizontal,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { LedgerEntry, LedgerType } from '@/types';
import { DebtGraph } from '@/lib/dsa/DebtGraph';

// ── Daily Spending Types ──────────────────────────────────────────────────────
interface SpendingEntry {
  id: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
}

const SPENDING_CATEGORIES = [
  { key: 'food',      label: 'Food & Dining',    icon: Utensils,      color: '#F59E0B' },
  { key: 'coffee',    label: 'Coffee & Snacks',   icon: Coffee,        color: '#92400E' },
  { key: 'transport', label: 'Transport',         icon: Bus,           color: '#3B82F6' },
  { key: 'shopping',  label: 'Shopping',          icon: ShoppingBag,   color: '#EC4899' },
  { key: 'groceries', label: 'Groceries',         icon: ShoppingCart,  color: '#10B981' },
  { key: 'bills',     label: 'Bills & Utilities', icon: Zap,           color: '#8B5CF6' },
  { key: 'rent',      label: 'Rent & Housing',    icon: Home,          color: '#6B7280' },
  { key: 'health',    label: 'Health & Medical',  icon: Heart,         color: '#EF4444' },
  { key: 'phone',     label: 'Phone & Internet',  icon: Smartphone,    color: '#06B6D4' },
  { key: 'other',     label: 'Other',             icon: MoreHorizontal, color: '#9CA3AF' },
] as const;

const getCatMeta = (key: string) =>
  SPENDING_CATEGORIES.find((c) => c.key === key) ?? SPENDING_CATEGORIES[SPENDING_CATEGORIES.length - 1];

const STORAGE_KEY = 'assistance_daily_spending';

function loadSpending(): SpendingEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveSpending(data: SpendingEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Helper ─────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ── Spending Panel ─────────────────────────────────────────────────────────────
function DailySpendingPanel({ currency }: { currency: string }) {
  const [entries, setEntries] = useState<SpendingEntry[]>(loadSpending);
  const [spendingView, setSpendingView] = useState<'daily' | 'monthly' | 'analytics'>('daily');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'donut'>('line');
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  // Guarantee instant load on client mount / hard refresh
  useEffect(() => {
    const loaded = loadSpending();
    if (loaded && loaded.length > 0) {
      setEntries(loaded);
    }
  }, []);

  // Month Report Selector State
  const now = useMemo(() => new Date(), []);
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth()); // 0-11
  const [monthlyFilterCat, setMonthlyFilterCat] = useState<string>('all');

  // Form state
  const [amount, setAmount]   = useState('');
  const [cat, setCat]         = useState('food');
  const [note, setNote]       = useState('');
  const [formDate, setFormDate] = useState(todayStr());
  const [editId, setEditId]   = useState<string | null>(null);

  const days = useMemo(() => last7Days(), []);

  // 7-day totals
  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((d) => { map[d] = 0; });
    entries.forEach((e) => { if (map[e.date] !== undefined) map[e.date] += e.amount; });
    return map;
  }, [entries, days]);

  const maxDay = Math.max(...Object.values(dailyTotals), 1);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, selectedDate]
  );

  const dayTotal = dayEntries.reduce((s, e) => s + e.amount, 0);
  const todayTotal = entries.filter((e) => e.date === todayStr()).reduce((s, e) => s + e.amount, 0);

  // Category breakdown for selected day
  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    dayEntries.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [dayEntries]);

  // ── Monthly Report Metrics & Calculations ──────────────────────────────────
  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      const [y, m] = e.date.split('-').map(Number);
      return y === reportYear && m - 1 === reportMonth;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [entries, reportYear, reportMonth]);

  const monthTotal = useMemo(() => {
    return monthEntries.reduce((s, e) => s + e.amount, 0);
  }, [monthEntries]);

  const daysInReportMonth = new Date(reportYear, reportMonth + 1, 0).getDate();

  // Daily spend across the entire month (1..daysInMonth)
  const monthlyDailyHistogram = useMemo(() => {
    const arr = Array.from({ length: daysInReportMonth }, (_, i) => {
      const dayNum = i + 1;
      const dayStr = `${reportYear}-${String(reportMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const daySpend = monthEntries.filter((e) => e.date === dayStr).reduce((s, e) => s + e.amount, 0);
      return { dayNum, dayStr, amount: daySpend };
    });
    return arr;
  }, [monthEntries, reportYear, reportMonth, daysInReportMonth]);

  const maxMonthlyDaySpend = Math.max(...monthlyDailyHistogram.map((d) => d.amount), 1);

  const peakDayInfo = useMemo(() => {
    if (monthEntries.length === 0) return null;
    let max = { dayStr: '', amount: 0 };
    monthlyDailyHistogram.forEach((d) => {
      if (d.amount > max.amount) max = { dayStr: d.dayStr, amount: d.amount };
    });
    return max.amount > 0 ? max : null;
  }, [monthlyDailyHistogram, monthEntries]);

  // Category distribution for selected month
  const monthlyCategoryDistribution = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    monthEntries.forEach((e) => {
      if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
      map[e.category].total += e.amount;
      map[e.category].count += 1;
    });
    return Object.entries(map)
      .map(([catKey, data]) => ({
        key: catKey,
        meta: getCatMeta(catKey),
        total: data.total,
        count: data.count,
        percent: monthTotal > 0 ? Math.round((data.total / monthTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthEntries, monthTotal]);

  const topCategory = monthlyCategoryDistribution[0] || null;

  const averageDailySpend = useMemo(() => {
    if (monthTotal === 0) return 0;
    const isCurrentMonth = reportYear === now.getFullYear() && reportMonth === now.getMonth();
    const divisor = isCurrentMonth ? Math.max(now.getDate(), 1) : daysInReportMonth;
    return Math.round(monthTotal / divisor);
  }, [monthTotal, reportYear, reportMonth, daysInReportMonth, now]);

  // Filtered monthly entries for listing
  const filteredMonthEntries = useMemo(() => {
    if (monthlyFilterCat === 'all') return monthEntries;
    return monthEntries.filter((e) => e.category === monthlyFilterCat);
  }, [monthEntries, monthlyFilterCat]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openAdd = (presetDate?: string) => {
    setEditId(null);
    setAmount('');
    setCat('food');
    setNote('');
    setFormDate(presetDate || selectedDate || todayStr());
    setShowForm(true);
  };

  const openEdit = (e: SpendingEntry) => {
    setEditId(e.id);
    setAmount(e.amount.toString());
    setCat(e.category);
    setNote(e.note);
    setFormDate(e.date);
    setShowForm(true);
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    let updated: SpendingEntry[];
    if (editId) {
      updated = entries.map((e) =>
        e.id === editId ? { ...e, amount: num, category: cat, note: note.trim(), date: formDate } : e
      );
    } else {
      const entry: SpendingEntry = {
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: num,
        currency,
        category: cat,
        note: note.trim(),
        date: formDate || selectedDate,
        createdAt: new Date().toISOString(),
      };
      updated = [entry, ...entries];
    }
    setEntries(updated);
    saveSpending(updated);
    setShowForm(false);
    setAmount('');
    setNote('');
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveSpending(updated);
  };

  const goDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handlePrevMonth = () => {
    if (reportMonth === 0) {
      setReportMonth(11);
      setReportYear((y) => y - 1);
    } else {
      setReportMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (reportMonth === 11) {
      setReportMonth(0);
      setReportYear((y) => y + 1);
    } else {
      setReportMonth((m) => m + 1);
    }
  };

  // ── SVG Line Chart Path Helpers (7-Day Trend) ─────────────────────────────
  const linePoints = useMemo(() => {
    const width = 500;
    const height = 130;
    const padX = 24;
    const padY = 20;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const pts = days.map((d, i) => {
      const val = dailyTotals[d] || 0;
      const x = padX + (i / (days.length - 1)) * plotW;
      const y = padY + (1 - val / maxDay) * plotH;
      return { x, y, val, date: d };
    });

    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${height - padY + 10} L ${pts[0].x.toFixed(1)} ${height - padY + 10} Z`;

    return { pts, pathD, areaD, width, height };
  }, [days, dailyTotals, maxDay]);

  // ── SVG Donut Chart Calculation ──────────────────────────────────────────
  const donutSlices = useMemo(() => {
    const radius = 55;
    const circ = 2 * Math.PI * radius;
    let accumulated = 0;

    const slices = monthlyCategoryDistribution.map((c) => {
      const strokeLen = (c.percent / 100) * circ;
      const offset = -accumulated;
      accumulated += strokeLen;
      return {
        ...c,
        strokeDasharray: `${strokeLen.toFixed(2)} ${(circ - strokeLen).toFixed(2)}`,
        strokeDashoffset: offset.toFixed(2),
      };
    });

    return { slices, radius, circ };
  }, [monthlyCategoryDistribution]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-(--text-muted) font-semibold uppercase tracking-wider">
            {spendingView === 'monthly' ? `${MONTH_NAMES[reportMonth]} ${reportYear} Total` : "Today's Spending"}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#4E82EE]">{currency}</span>
            <span className="text-3xl font-extrabold text-(--text-primary) tracking-tight">
              {(spendingView === 'monthly' ? monthTotal : todayTotal).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub Tabs */}
          <div className="flex items-center gap-1 bg-(--bg-card) border border-(--border-subtle) rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setSpendingView('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                spendingView === 'daily'
                  ? 'bg-[#4E82EE] text-white shadow-xs font-bold'
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              Daily Log
            </button>
            <button
              onClick={() => setSpendingView('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                spendingView === 'monthly'
                  ? 'bg-[#4E82EE] text-white shadow-xs font-bold'
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              Monthly Report
            </button>
            <button
              onClick={() => setSpendingView('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                spendingView === 'analytics'
                  ? 'bg-[#4E82EE] text-white shadow-xs font-bold'
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              Category Trends
            </button>
          </div>

          <button
            onClick={() => openAdd()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-semibold text-xs shadow-md hover:opacity-90 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. DAILY LOG VIEW                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {spendingView === 'daily' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Interactive Graph Card (Line / Bar / Donut Switcher) */}
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-bold text-(--text-primary) uppercase tracking-wider">
                  Spending Visualization
                </p>
                <p className="text-[11px] text-(--text-muted)">
                  {chartType === 'line'
                    ? '7-Day Smooth Spend Curve'
                    : chartType === 'bar'
                    ? '7-Day Bar Histogram'
                    : 'Category Distribution Donut'}
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    chartType === 'line'
                      ? 'bg-(--bg-card) text-[#4E82EE] shadow-2xs font-bold'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  <TrendingUp size={13} />
                  <span>Line</span>
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    chartType === 'bar'
                      ? 'bg-(--bg-card) text-[#4E82EE] shadow-2xs font-bold'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  <CalendarDays size={13} />
                  <span>Bar</span>
                </button>
                <button
                  onClick={() => setChartType('donut')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    chartType === 'donut'
                      ? 'bg-(--bg-card) text-[#4E82EE] shadow-2xs font-bold'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  <Wallet size={13} />
                  <span>Donut</span>
                </button>
              </div>
            </div>

            {/* ── 1.A: Line & Area Chart ── */}
            {chartType === 'line' && (
              <div className="w-full pt-2">
                <div className="relative w-full h-36">
                  <svg
                    viewBox={`0 0 ${linePoints.width} ${linePoints.height}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="spendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4E82EE" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4E82EE" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area Fill */}
                    <path d={linePoints.areaD} fill="url(#spendAreaGrad)" />

                    {/* Main Line Stroke */}
                    <path
                      d={linePoints.pathD}
                      fill="none"
                      stroke="#4E82EE"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interactive Points */}
                    {linePoints.pts.map((p) => {
                      const isSelected = p.date === selectedDate;
                      return (
                        <g
                          key={p.date}
                          className="cursor-pointer"
                          onClick={() => setSelectedDate(p.date)}
                        >
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isSelected ? 6 : 4}
                            fill={isSelected ? '#4E82EE' : '#ffffff'}
                            stroke="#4E82EE"
                            strokeWidth={isSelected ? 3 : 2}
                            className="transition-all hover:scale-125"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Day Labels below chart */}
                <div className="flex justify-between px-2 pt-1 border-t border-(--border-subtle)">
                  {days.map((d) => {
                    const isToday = d === todayStr();
                    const isSelected = d === selectedDate;
                    const val = dailyTotals[d] || 0;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(d)}
                        className="flex flex-col items-center cursor-pointer group"
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-[#4E82EE]' : 'text-(--text-muted)'}`}>
                          {isToday ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                        </span>
                        <span className="text-[9px] font-mono text-(--text-muted) group-hover:text-(--text-primary)">
                          {val > 0 ? `${currency}${val.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 1.B: Bar Histogram ── */}
            {chartType === 'bar' && (
              <div className="flex items-end gap-2 h-28 pt-2">
                {days.map((d) => {
                  const val = dailyTotals[d] || 0;
                  const pct = (val / maxDay) * 100;
                  const isToday = d === todayStr();
                  const isSelected = d === selectedDate;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <span className="text-[9px] text-(--text-muted) font-mono">
                        {val > 0 ? `${currency}${val.toLocaleString('en-IN')}` : ''}
                      </span>
                      <div className="w-full rounded-t-lg relative flex items-end" style={{ height: '70px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isSelected
                              ? 'bg-[#4E82EE]'
                              : isToday
                              ? 'bg-[#4E82EE]/60'
                              : 'bg-(--bg-elevated) group-hover:bg-[#4E82EE]/40'
                          }`}
                          style={{ height: `${Math.max(pct, 6)}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-semibold ${isSelected ? 'text-[#4E82EE]' : 'text-(--text-muted)'}`}>
                        {isToday ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── 1.C: Category Donut Ring ── */}
            {chartType === 'donut' && (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                {/* SVG Donut Circle */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r={donutSlices.radius}
                      fill="none"
                      stroke="var(--bg-elevated)"
                      strokeWidth="16"
                    />
                    {donutSlices.slices.map((slice) => (
                      <circle
                        key={slice.key}
                        cx="70"
                        cy="70"
                        r={donutSlices.radius}
                        fill="none"
                        stroke={slice.meta.color}
                        strokeWidth="16"
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        className="transition-all duration-500 hover:opacity-80"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] text-(--text-muted) uppercase font-semibold">Total</span>
                    <span className="text-sm font-extrabold text-(--text-primary) font-mono">
                      {currency}{monthTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="grid grid-cols-2 gap-2 flex-1 max-w-sm">
                  {monthlyCategoryDistribution.slice(0, 6).map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.meta.color }} />
                      <span className="truncate text-(--text-secondary)">{item.meta.label}</span>
                      <span className="text-[11px] font-mono text-(--text-muted) ml-auto">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date navigator */}
          <div className="flex items-center justify-between bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-4 py-3 shadow-xs">
            <button
              onClick={() => goDate(-1)}
              className="p-1.5 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-(--text-primary)">{fmtDate(selectedDate)}</p>
              <p className="text-xs text-(--text-muted)">{selectedDate === todayStr() ? 'Today' : selectedDate}</p>
            </div>
            <button
              onClick={() => goDate(1)}
              disabled={selectedDate >= todayStr()}
              className="p-1.5 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day total + category breakdown */}
          {dayTotal > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-4 shadow-xs">
                <p className="text-xs text-(--text-muted) font-semibold uppercase tracking-wider mb-1">Day Total</p>
                <p className="text-2xl font-extrabold text-[#4E82EE]">{currency}{dayTotal.toLocaleString('en-IN')}</p>
                <p className="text-xs text-(--text-muted) mt-1">{dayEntries.length} transactions recorded</p>
              </div>
              <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-4 space-y-2 shadow-xs">
                <p className="text-xs text-(--text-muted) font-semibold uppercase tracking-wider">By Category</p>
                {catBreakdown.map(([key, val]) => {
                  const meta = getCatMeta(key);
                  const Icon = meta.icon;
                  const pct = Math.round((val / dayTotal) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Icon size={12} style={{ color: meta.color }} className="shrink-0" />
                      <span className="text-[11px] text-(--text-primary) w-24 truncate">{meta.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-(--bg-elevated) overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                      <span className="text-[10px] text-(--text-muted) w-16 text-right font-mono">
                        {currency}{val.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entries list for selected date */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-(--text-primary)">
                {dayEntries.length === 0 ? 'No expenses' : `${dayEntries.length} expense${dayEntries.length > 1 ? 's' : ''} on this day`}
              </p>
            </div>
            {dayEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-(--border-subtle) p-10 text-center space-y-2 bg-(--bg-card)">
                <ShoppingCart size={28} className="text-(--text-muted) mx-auto" />
                <p className="text-sm font-semibold text-(--text-muted)">No expenses recorded for this day</p>
                <p className="text-xs text-(--text-muted)">Tap &ldquo;Add Expense&rdquo; to record what you spent.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((e) => {
                  const meta = getCatMeta(e.category);
                  const Icon = meta.icon;
                  return (
                    <div key={e.id} className="flex items-center gap-3 bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-4 py-3 shadow-xs group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-(--text-primary) capitalize">{meta.label}</p>
                        {e.note && <p className="text-xs text-(--text-muted) truncate">{e.note}</p>}
                      </div>
                      <p className="text-sm font-bold text-[#4E82EE] shrink-0 font-mono">
                        {currency}{e.amount.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-1.5 pl-2 border-l border-(--border-subtle) ml-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg bg-(--bg-elevated) border border-(--border-subtle) text-(--text-secondary) hover:text-[#4E82EE] transition-all cursor-pointer"
                          title="Edit expense"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MONTHLY REPORT VIEW                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {spendingView === 'monthly' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Month Navigator Header */}
          <div className="flex items-center justify-between bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-5 py-3 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-base sm:text-lg font-bold text-(--text-primary)">
                {MONTH_NAMES[reportMonth]} {reportYear}
              </h2>
              <p className="text-xs text-(--text-muted)">
                {monthEntries.length} total transaction{monthEntries.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Spent */}
            <div className="bg-(--bg-card) border border-(--border-subtle) p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">Total Spent</span>
              <p className="text-2xl font-bold text-(--text-primary) font-mono">
                {currency}{monthTotal.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-(--text-muted)">in {MONTH_NAMES[reportMonth]}</p>
            </div>

            {/* Daily Average */}
            <div className="bg-(--bg-card) border border-(--border-subtle) p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-[#4E82EE] uppercase tracking-wider">Daily Average</span>
              <p className="text-2xl font-bold text-[#4E82EE] font-mono">
                {currency}{averageDailySpend.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-(--text-muted)">per active day</p>
            </div>

            {/* Highest Day */}
            <div className="bg-(--bg-card) border border-(--border-subtle) p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Peak Spend Day</span>
              <p className="text-2xl font-bold text-rose-500 font-mono">
                {peakDayInfo ? `${currency}${peakDayInfo.amount.toLocaleString('en-IN')}` : '—'}
              </p>
              <p className="text-[11px] text-(--text-muted)">
                {peakDayInfo ? fmtDate(peakDayInfo.dayStr) : 'No spends'}
              </p>
            </div>

            {/* Top Category */}
            <div className="bg-(--bg-card) border border-(--border-subtle) p-4 rounded-2xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Top Category</span>
              <p className="text-xl font-bold text-(--text-primary) truncate">
                {topCategory ? topCategory.meta.label : '—'}
              </p>
              <p className="text-[11px] text-(--text-muted)">
                {topCategory ? `${topCategory.percent}% of month spend` : 'No category data'}
              </p>
            </div>
          </div>

          {/* 30-Day Histogram Bar Graph */}
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-(--text-primary)">
                  Full Month Daily Distribution
                </h3>
                <p className="text-xs text-(--text-muted)">
                  Visual daily timeline for {MONTH_NAMES[reportMonth]} {reportYear}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-md bg-(--bg-elevated) text-(--text-secondary)">
                Peak: {currency}{maxMonthlyDaySpend > 1 ? maxMonthlyDaySpend.toLocaleString('en-IN') : 0}
              </span>
            </div>

            {/* Graph Bars */}
            <div className="flex items-end gap-1 h-32 pt-4 overflow-x-auto pb-2 custom-scrollbar">
              {monthlyDailyHistogram.map(({ dayNum, dayStr, amount: dayAmount }) => {
                const heightPct = (dayAmount / maxMonthlyDaySpend) * 100;
                const hasSpend = dayAmount > 0;
                const isSelected = selectedDate === dayStr;

                return (
                  <button
                    key={dayStr}
                    onClick={() => {
                      setSelectedDate(dayStr);
                      setSpendingView('daily');
                    }}
                    title={`${fmtDate(dayStr)}: ${currency}${dayAmount.toLocaleString('en-IN')}`}
                    className="flex-1 min-w-[14px] flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="w-full h-24 flex items-end justify-center">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#4E82EE]'
                            : hasSpend
                            ? 'bg-[#4E82EE]/70 group-hover:bg-[#4E82EE]'
                            : 'bg-(--bg-elevated) group-hover:bg-[#4E82EE]/30'
                        }`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-(--text-muted) font-mono">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown & Spend Distribution */}
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-(--text-primary)">
              Category Breakdown & Shares
            </h3>

            {monthlyCategoryDistribution.length === 0 ? (
              <p className="text-xs text-(--text-muted) py-4 text-center">
                No spending recorded for this month.
              </p>
            ) : (
              <div className="space-y-3">
                {monthlyCategoryDistribution.map((item) => {
                  const Icon = item.meta.icon;
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: `${item.meta.color}20` }}
                          >
                            <Icon size={13} style={{ color: item.meta.color }} />
                          </span>
                          <span className="font-semibold text-(--text-primary)">{item.meta.label}</span>
                          <span className="text-[10px] text-(--text-muted)">({item.count} items)</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-xs font-bold text-(--text-primary)">
                            {currency}{item.total.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-(--text-muted) w-10 text-right">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-(--bg-elevated) overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.percent}%`, background: item.meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly Transactions List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-(--text-primary)">
                {MONTH_NAMES[reportMonth]} Transactions ({filteredMonthEntries.length})
              </h3>

              {/* Filter by Category */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setMonthlyFilterCat('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    monthlyFilterCat === 'all'
                      ? 'bg-[#4E82EE]/15 text-[#4E82EE]'
                      : 'text-(--text-muted) hover:bg-(--bg-elevated)'
                  }`}
                >
                  All
                </button>
                {monthlyCategoryDistribution.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setMonthlyFilterCat(c.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                      monthlyFilterCat === c.key
                        ? 'bg-[#4E82EE]/15 text-[#4E82EE]'
                        : 'text-(--text-muted) hover:bg-(--bg-elevated)'
                    }`}
                  >
                    {c.meta.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredMonthEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-(--border-subtle) p-8 text-center bg-(--bg-card)">
                <p className="text-xs text-(--text-muted)">No entries match the selected filter.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMonthEntries.map((e) => {
                  const meta = getCatMeta(e.category);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-4 py-3 shadow-xs group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}18` }}
                      >
                        <Icon size={18} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-(--text-primary) capitalize">{meta.label}</p>
                          <span className="text-[10px] text-(--text-muted) font-mono">{fmtDate(e.date)}</span>
                        </div>
                        {e.note && <p className="text-xs text-(--text-muted) truncate">{e.note}</p>}
                      </div>
                      <p className="text-sm font-bold text-[#4E82EE] shrink-0 font-mono">
                        {currency}{e.amount.toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-1.5 pl-2 border-l border-(--border-subtle) ml-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg bg-(--bg-elevated) border border-(--border-subtle) text-(--text-secondary) hover:text-[#4E82EE] transition-all cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. CATEGORY TRENDS & ALL-TIME ANALYTICS                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {spendingView === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-(--text-primary) mb-1">All-Time Category Analytics</h3>
            <p className="text-xs text-(--text-muted) mb-4">Cumulative distribution across all logged expenses</p>

            {entries.length === 0 ? (
              <p className="text-xs text-(--text-muted) text-center py-6">No expenses logged yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SPENDING_CATEGORIES.map(({ key, label, icon: Icon, color }) => {
                  const catSpends = entries.filter((e) => e.category === key);
                  const catTotal = catSpends.reduce((s, e) => s + e.amount, 0);
                  const totalAll = entries.reduce((s, e) => s + e.amount, 0);
                  const pct = totalAll > 0 ? Math.round((catTotal / totalAll) * 100) : 0;

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${color}20` }}
                        >
                          <Icon size={18} style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-(--text-primary) truncate">{label}</p>
                          <p className="text-[10px] text-(--text-muted)">{catSpends.length} records · {pct}%</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-(--text-primary) font-mono">
                        {currency}{catTotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Add / Edit Expense Modal                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle) mb-4">
              <h2 className="app-modal-title">
                {editId ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted) font-semibold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) text-lg font-bold focus:outline-none focus:border-[#4E82EE]"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE] text-xs font-mono"
                />
              </div>

              {/* Category grid */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">Category</label>
                <div className="grid grid-cols-5 gap-2">
                  {SPENDING_CATEGORIES.map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCat(key)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                        cat === key
                          ? 'border-[#4E82EE] bg-[#4E82EE]/10'
                          : 'border-(--border-subtle) hover:bg-(--bg-elevated)'
                      }`}
                    >
                      <Icon
                        size={16}
                        style={{ color: cat === key ? color : undefined }}
                        className={cat !== key ? 'text-(--text-muted)' : ''}
                      />
                      <span className="text-[9px] text-center leading-tight text-(--text-muted) hidden sm:block">
                        {label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#4E82EE] font-semibold mt-1.5">{getCatMeta(cat).label}</p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch at office, Auto to metro..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE] text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(editId);
                      setShowForm(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-semibold text-sm cursor-pointer transition-colors flex items-center justify-center shrink-0"
                    title="Delete this expense"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) font-semibold text-sm cursor-pointer hover:bg-(--bg-card) transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold text-sm shadow-md hover:opacity-90 transition-all cursor-pointer"
                >
                  {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LedgerView
// ─────────────────────────────────────────────────────────────────────────────
export default function LedgerView() {
  const {
    ledgerEntries,
    createLedgerEntry,
    updateLedgerEntry,
    settleLedgerEntry,
    deleteLedgerEntry,
    createReminder,
    showToast,
    showConfirm,
  } = useApp();

  // Top-level tabs
  const [mainTab, setMainTab] = useState<'dues' | 'spending'>('dues');

  const [activeFilter, setActiveFilter] = useState<'all' | 'give' | 'receive' | 'settled'>('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showSimplifiedGraph, setShowSimplifiedGraph] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setOpenMenuId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Modal Form State
  const [personName, setPersonName] = useState('');
  const [amount, setAmount]         = useState('');
  const [currency, setCurrency]     = useState('₹');
  const [type, setType]             = useState<LedgerType>('give');
  const [category, setCategory]     = useState('personal');
  const [dueDate, setDueDate]       = useState('');
  const [description, setDescription] = useState('');

  const stats = useMemo(() => {
    const pending = ledgerEntries.filter((e) => e.status === 'pending');
    const totalGive    = pending.filter((e) => e.type === 'give').reduce((s, e) => s + e.amount, 0);
    const totalReceive = pending.filter((e) => e.type === 'receive').reduce((s, e) => s + e.amount, 0);
    const net = totalReceive - totalGive;
    const settledCount = ledgerEntries.filter((e) => e.status === 'settled').length;
    return { totalGive, totalReceive, net, pendingCount: pending.length, settledCount };
  }, [ledgerEntries]);

  const simplifiedSettlement = useMemo(() => {
    const pending = ledgerEntries.filter((e) => e.status === 'pending');
    return DebtGraph.simplifyDebts(pending, 'You');
  }, [ledgerEntries]);

  const handleOpenAdd = () => {
    setEditingEntry(null); setPersonName(''); setAmount(''); setCurrency('₹');
    setType('give'); setCategory('personal'); setDueDate(''); setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry); setPersonName(entry.personName);
    setAmount(entry.amount.toString()); setCurrency(entry.currency || '₹');
    setType(entry.type); setCategory(entry.category || 'personal');
    setDueDate(entry.dueDate ? entry.dueDate.split('T')[0] : '');
    setDescription(entry.description || ''); setIsModalOpen(true);
  };

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (activeFilter === 'give'     && (entry.type !== 'give'    || entry.status === 'settled')) return false;
      if (activeFilter === 'receive'  && (entry.type !== 'receive' || entry.status === 'settled')) return false;
      if (activeFilter === 'settled'  && entry.status !== 'settled') return false;
      if (activeFilter === 'all'      && entry.status === 'settled') return false;
      if (selectedCategory !== 'all'  && entry.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!entry.personName.toLowerCase().includes(q) &&
            !entry.description?.toLowerCase().includes(q) &&
            !entry.category?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ledgerEntries, activeFilter, selectedCategory, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (editingEntry) {
      await updateLedgerEntry(editingEntry.id, { personName: personName.trim(), amount: numAmount, type, currency, category, dueDate: dueDate || undefined, description: description.trim() || undefined });
    } else {
      await createLedgerEntry(personName.trim(), numAmount, type, { currency, category, dueDate: dueDate || undefined, description: description.trim() || undefined });
    }
    setEditingEntry(null); setPersonName(''); setAmount(''); setDescription(''); setDueDate(''); setIsModalOpen(false);
  };

  const handleSetReminderForDue = async (entry: LedgerEntry) => {
    const defaultTime = entry.dueDate ? new Date(entry.dueDate).toISOString() : new Date(Date.now() + 86400000).toISOString();
    const title = entry.type === 'give' ? `Pay ${entry.currency}${entry.amount} to ${entry.personName}` : `Collect ${entry.currency}${entry.amount} from ${entry.personName}`;
    await createReminder(title, defaultTime, 'none');
    showToast(`Reminder set for "${title}"`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-(--bg-primary) text-(--text-primary)">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 sm:pb-36 md:pb-12 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] flex items-center justify-center text-white shadow-md">
              <HandCoins size={22} />
            </div>
            <div>
              <h1 className="app-page-title">Money Ledger</h1>
              <p className="app-page-subtitle">Track dues, debts, and daily spending</p>
            </div>
          </div>
          {mainTab === 'dues' && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={16} /> Add Debt / Due
            </button>
          )}
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-(--bg-card) border border-(--border-subtle) rounded-2xl p-1.5 w-fit">
          <button
            onClick={() => setMainTab('dues')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              mainTab === 'dues'
                ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-sm'
                : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            <Wallet size={15} /> Dues & Debts
          </button>
          <button
            onClick={() => setMainTab('spending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              mainTab === 'spending'
                ? 'bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white shadow-sm'
                : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            <ShoppingCart size={15} /> Daily Spending
          </button>
        </div>

        {/* ── DAILY SPENDING TAB ── */}
        {mainTab === 'spending' && <DailySpendingPanel currency="₹" />}

        {/* ── DUES & DEBTS TAB ── */}
        {mainTab === 'dues' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">You Need to Give</span>
                    <div className="text-2xl sm:text-3xl font-bold text-rose-500">₹{stats.totalGive.toLocaleString()}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-(--text-muted) mt-3">Total money you owe to others.</p>
              </div>
              <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Owed to You</span>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-500">₹{stats.totalReceive.toLocaleString()}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <ArrowDownLeft size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-(--text-muted) mt-3">Money others owe you.</p>
              </div>
              <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Net Balance</span>
                    <div className={`text-2xl sm:text-3xl font-bold ${stats.net >= 0 ? 'text-[#4E82EE]' : 'text-rose-500'}`}>
                      {stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                </div>
                <p className="text-[11px] text-(--text-muted) mt-3">
                  {stats.net >= 0 ? '✓ Positive net balance.' : '⚠️ You owe more than you are owed.'}
                </p>
              </div>
            </div>

            {/* Smart Debt Settlement */}
            {simplifiedSettlement.transactions.length > 0 && (
              <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border-subtle) shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0">⚡</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-(--text-primary)">
                          DSA Smart Debt Settlement
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-mono whitespace-nowrap">
                          O(V log V)
                        </span>
                      </div>
                      <p className="text-[11px] text-(--text-muted) truncate">
                        Simplified to <strong className="text-(--text-primary)">{simplifiedSettlement.simplifiedTransactionsCount} optimal payment(s)</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSimplifiedGraph(!showSimplifiedGraph)}
                    className="px-3.5 py-1.5 rounded-xl bg-(--bg-elevated) hover:bg-indigo-500/15 text-indigo-500 text-xs font-semibold cursor-pointer transition-colors shrink-0 self-start sm:self-auto"
                  >
                    {showSimplifiedGraph ? 'Hide Plan' : 'View Plan'}
                  </button>
                </div>
                {showSimplifiedGraph && (
                  <div className="mt-3 pt-3 border-t border-(--border-subtle) grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {simplifiedSettlement.transactions.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.from}</span>
                          <span className="text-(--text-muted)">pays</span>
                          <span className="font-semibold">{t.to}</span>
                        </div>
                        <span className="font-bold text-emerald-500 font-mono">{t.currency}{t.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filter + Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-(--bg-card) p-3 rounded-2xl border border-(--border-subtle)">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { key: 'all',     label: `Active (${stats.pendingCount})`,       cls: 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-xs' },
                  { key: 'give',    label: 'To Give',                              cls: 'bg-rose-600 text-white shadow-xs' },
                  { key: 'receive', label: 'To Receive',                           cls: 'bg-emerald-600 text-white shadow-xs' },
                  { key: 'settled', label: `Settled (${stats.settledCount})`,      cls: 'bg-(--bg-elevated) text-(--text-primary) border border-(--border-subtle)' },
                ].map(({ key, label, cls }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${activeFilter === key ? cls : 'text-(--text-secondary) hover:bg-(--bg-elevated)'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  type="text" placeholder="Search person or note..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE]"
                />
              </div>
            </div>

            {/* Entries */}
            {filteredEntries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-(--border-subtle) bg-(--bg-card) p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center mx-auto"><HandCoins size={24} /></div>
                <h3 className="font-semibold text-base">No Dues in This View</h3>
                <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
                  {searchQuery ? 'No matching entries found.' : 'Add a debt or due using the button above.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEntries.map((entry) => {
                  const isGive = entry.type === 'give';
                  const isSettled = entry.status === 'settled';
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-3xl bg-(--bg-card) border p-5 shadow-xs flex flex-col justify-between gap-4 relative transition-all card-lift animate-fade-in-up ${
                        isSettled
                          ? 'border-(--border-subtle) opacity-65 bg-(--bg-card)/60'
                          : isGive
                          ? 'border-(--border-subtle) hover:border-rose-500/40 shadow-xs'
                          : 'border-(--border-subtle) hover:border-emerald-500/40 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="app-card-title truncate text-base font-bold text-(--text-primary)">
                            {entry.personName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isSettled
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : isGive
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isSettled ? '✓ Settled' : isGive ? 'You Owe' : 'Owed to You'}
                            </span>
                            {entry.category && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-(--bg-elevated) text-(--text-muted) capitalize border border-(--border-subtle)">
                                {entry.category}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-xl sm:text-2xl font-black flex items-baseline justify-end gap-0.5 tracking-tight ${
                              isSettled
                                ? 'text-(--text-muted) line-through'
                                : isGive
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <span className="text-base sm:text-lg opacity-85">{entry.currency}</span>
                            <span>{entry.amount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-(--text-muted) text-[11px] font-cutive">
                          {entry.dueDate ? (
                            <>
                              <Clock size={12} className="text-[#4E82EE]" />
                              <span>Due: {new Date(entry.dueDate).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <span>Created: {new Date(entry.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* 3-Dots Options Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                            }}
                            className="p-1.5 sm:p-2 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer active:scale-95 shadow-2xs"
                            title="More options"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === entry.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-44 rounded-2xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-1.5 z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                            >
                              {!isSettled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      settleLedgerEntry(entry.id);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                                  >
                                    <CheckCircle2 size={15} className="text-emerald-500" />
                                    <span>Settle Due</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleSetReminderForDue(entry);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-primary) font-semibold text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                                  >
                                    <BellRing size={15} className="text-[#4E82EE]" />
                                    <span>Set Reminder</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleOpenEdit(entry);
                                    }}
                                    className="w-full px-3 py-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-primary) font-semibold text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                                  >
                                    <Edit2 size={15} className="text-amber-500" />
                                    <span>Edit Due</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  showConfirm({
                                    title: 'Remove Record',
                                    message: `Remove ${entry.personName} (${entry.currency}${entry.amount}) from dues ledger?`,
                                    confirmText: 'Remove',
                                    type: 'danger',
                                    onConfirm: () => deleteLedgerEntry(entry.id),
                                  });
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                              >
                                <Trash2 size={15} className="text-rose-500" />
                                <span>Delete Record</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Dues Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/20 text-[#4E82EE] flex items-center justify-center"><HandCoins size={16} /></div>
                <h2 className="app-modal-title">{editingEntry ? 'Edit Due / Debt' : 'Add Due / Debt'}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType('give')} className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${type === 'give' ? 'bg-rose-600 text-white border-rose-600' : 'bg-(--bg-elevated) text-(--text-secondary) border-(--border-subtle)'}`}>
                  <ArrowUpRight size={14} /> I Owe
                </button>
                <button type="button" onClick={() => setType('receive')} className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${type === 'receive' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-(--bg-elevated) text-(--text-secondary) border-(--border-subtle)'}`}>
                  <ArrowDownLeft size={14} /> Owed to Me
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">Person / Entity *</label>
                  <input type="text" required placeholder="e.g. Rahul, Landlord" value={personName} onChange={(e) => setPersonName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">Amount *</label>
                  <div className="flex gap-2">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-2.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none">
                      <option value="₹">₹</option><option value="$">$</option><option value="€">€</option><option value="£">£</option>
                    </select>
                    <input type="number" step="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE]" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none">
                    <option value="personal">Personal / Friends</option>
                    <option value="food">Food & Dining</option>
                    <option value="rent">Rent & Housing</option>
                    <option value="bills">Bills & Utilities</option>
                    <option value="travel">Travel & Transport</option>
                    <option value="loan">Loan / Borrowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none" />
                </div>
              </div>
              <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) font-semibold cursor-pointer hover:bg-(--bg-card) transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold shadow-md hover:opacity-95 transition-all cursor-pointer">
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
