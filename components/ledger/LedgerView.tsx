'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
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
  ArrowRightLeft,
  Sparkles,
  Target,
  Calculator,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingDown,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { LedgerEntry, LedgerType, SpendingEntry } from '@/types';
import { apiFetch } from '@/lib/api';
import { DebtGraph } from '@/lib/dsa/DebtGraph';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';
import DatePickerDropdown from '@/components/common/DatePickerDropdown';

const BUDGET_STORAGE_KEY = 'assistance_monthly_budget';

function loadBudget(): number {
  if (typeof window === 'undefined') return 30000;
  try {
    const val = localStorage.getItem(BUDGET_STORAGE_KEY);
    return val ? Math.max(100, Number(val)) : 30000;
  } catch {
    return 30000;
  }
}

const LEDGER_CATEGORIES: SelectOption[] = [
  { value: 'personal', label: 'Personal / Friends' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'rent', label: 'Rent & Housing' },
  { value: 'bills', label: 'Bills & Utilities' },
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'loan', label: 'Loan / Borrowed' },
];

const DUE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'give', label: 'You Owe (Give)', badgeColor: '#EA580C' },
  { value: 'receive', label: 'Owed to You (Receive)', badgeColor: '#10B981' },
];

// ── Daily Spending Types ──────────────────────────────────────────────────────

const SPENDING_CATEGORIES = [
  { key: 'food',      label: 'Food & Beverages', icon: Utensils,      color: '#A855F7', bg: 'bg-purple-500' },
  { key: 'coffee',    label: 'Coffee & Snacks',  icon: Coffee,        color: '#F97316', bg: 'bg-orange-500' },
  { key: 'transport', label: 'Entertainment',    icon: Bus,           color: '#3B82F6', bg: 'bg-blue-500' },
  { key: 'shopping',  label: 'Shopping',         icon: ShoppingBag,   color: '#EC4899', bg: 'bg-pink-500' },
  { key: 'groceries', label: 'Investment & Sav', icon: ShoppingCart,  color: '#10B981', bg: 'bg-emerald-500' },
  { key: 'bills',     label: 'Bills & Utilities',icon: Zap,           color: '#8B5CF6', bg: 'bg-violet-500' },
  { key: 'rent',      label: 'Rent & Housing',   icon: Home,          color: '#64748B', bg: 'bg-slate-500' },
  { key: 'health',    label: 'Health & Medical', icon: Heart,         color: '#EF4444', bg: 'bg-rose-500' },
  { key: 'phone',     label: 'Phone & Internet', icon: Smartphone,    color: '#06B6D4', bg: 'bg-cyan-500' },
  { key: 'other',     label: 'Other',            icon: MoreHorizontal,color: '#94A3B8', bg: 'bg-slate-400' },
] as const;

const SPENDING_SELECT_OPTIONS: SelectOption[] = SPENDING_CATEGORIES.map((c) => ({
  value: c.key,
  label: c.label,
  badgeColor: c.color,
}));

const getCatMeta = (key: string) =>
  SPENDING_CATEGORIES.find((c) => c.key === key) ?? SPENDING_CATEGORIES[SPENDING_CATEGORIES.length - 1];

const STORAGE_KEY = 'assistance_daily_spending';
let lastSyncedSpending: Map<string, string> | null = null;

function loadSpending(): SpendingEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

/** Push local changes to the server so the AI and other devices see them. */
function syncSpendingToServer(data: SpendingEntry[]) {
  if (typeof window === 'undefined' || !lastSyncedSpending) return;
  const next = new Map(data.map((entry) => [entry.id, JSON.stringify(entry)]));
  const changed = data.filter((entry) => lastSyncedSpending!.get(entry.id) !== next.get(entry.id));
  const removed = [...lastSyncedSpending.keys()].filter((id) => !next.has(id));
  lastSyncedSpending = next;

  changed.forEach((entry) => {
    apiFetch('/api/spending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  });
  removed.forEach((id) => {
    apiFetch(`/api/spending?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  });
}

function saveSpending(data: SpendingEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('spending_updated', { detail: data }));
  syncSpendingToServer(data);
}

function toLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() { return toLocalDateString(new Date()); }

export default function LedgerView() {
  const {
    user,
    ledgerEntries,
    createLedgerEntry,
    updateLedgerEntry,
    settleLedgerEntry,
    recordPartialPayment,
    deleteLedgerEntry,
    showToast,
  } = useApp();

  // Strictly 2 tabs: Dues & Ledger OR Daily Expenses
  const [activeTab, setActiveTab] = useState<'investment' | 'expenses'>('investment');
  const [activeFilter, setActiveFilter] = useState<'all' | 'give' | 'receive' | 'settled'>('all');
  const [planningViewFilter, setPlanningViewFilter] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [isDueModalOpen, setIsDueModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showSimplifiedGraph, setShowSimplifiedGraph] = useState(false);

  // Partial Payment Modal State
  const [partialPaymentEntry, setPartialPaymentEntry] = useState<LedgerEntry | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialNote, setPartialNote] = useState('');

  // Daily spending data & editing state
  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>(loadSpending);
  const [editingSpendingEntry, setEditingSpendingEntry] = useState<SpendingEntry | null>(null);

  // Toggle for hiding/showing spending history (default: hidden)
  const [showSpendingHistory, setShowSpendingHistory] = useState(false);

  // Dedicated Full Transaction History Page
  const [isTransactionHistoryPageOpen, setIsTransactionHistoryPageOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');
  const [historySortBy, setHistorySortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

  // Monthly Budget state & modal
  const [monthlyBudget, setMonthlyBudget] = useState<number>(loadBudget);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Month & Day Spent Calculator State
  const [calcDate, setCalcDate] = useState<string>(todayStr());
  const [calcMonth, setCalcMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [simulatedExpense, setSimulatedExpense] = useState('');
  const [activeCalculatorTab, setActiveCalculatorTab] = useState<'day' | 'month' | 'simulate'>('day');

  // Add / Edit Due form state
  const [personName, setPersonName] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueCurrency, setDueCurrency] = useState('₹');
  const [dueType, setDueType] = useState<LedgerType>('give');
  const [dueCategory, setDueCategory] = useState('personal');
  const [dueDate, setDueDate] = useState('');
  const [dueDescription, setDueDescription] = useState('');

  // Add / Edit Expense form state
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('food');
  const [expNote, setExpNote] = useState('');
  const [expDate, setExpDate] = useState(todayStr());

  useEffect(() => {
    const handleSync = () => setSpendingEntries(loadSpending());
    window.addEventListener('spending_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('spending_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Hydrate expenses from the server (includes expenses logged by the AI).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/spending');
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.spending)) return;

        const serverEntries: SpendingEntry[] = data.spending;
        const serverIds = new Set(serverEntries.map((entry) => entry.id));
        const merged = new Map(serverEntries.map((entry) => [entry.id, entry]));
        loadSpending().forEach((entry) => {
          if (!merged.has(entry.id)) merged.set(entry.id, entry);
        });
        const all = Array.from(merged.values());
        lastSyncedSpending = new Map(all.map((entry) => [entry.id, JSON.stringify(entry)]));

        // Upload expenses that only exist on this device yet.
        const localOnly = all.filter((entry) => !serverIds.has(entry.id));
        localOnly.forEach((entry) => {
          apiFetch('/api/spending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          }).catch(() => {});
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        setSpendingEntries(all);
      } catch {
        /* keep the local cache when the server is unreachable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const pending = (ledgerEntries || []).filter((e) => e.status === 'pending');
    const totalGive = pending.filter((e) => e.type === 'give').reduce((s, e) => s + (e.amount - (e.paidAmount || 0)), 0);
    const totalReceive = pending.filter((e) => e.type === 'receive').reduce((s, e) => s + (e.amount - (e.paidAmount || 0)), 0);
    const net = totalReceive - totalGive;
    const settledCount = (ledgerEntries || []).filter((e) => e.status === 'settled').length;

    // Daily spending total for today
    const tStr = todayStr();
    const todaySpend = spendingEntries
      .filter((e) => e.date === tStr || (e.createdAt && e.createdAt.startsWith(tStr)))
      .reduce((sum, e) => sum + e.amount, 0);

    return { totalGive, totalReceive, net, pendingCount: pending.length, settledCount, todaySpend };
  }, [ledgerEntries, spendingEntries]);

  // Comprehensive Monthly, Weekly & Daily Budget Metrics
  const budgetMetrics = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

    // Current month expenses
    const monthExpenses = spendingEntries.filter((e) => {
      const d = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
      return d.startsWith(currentMonthPrefix);
    });
    const monthSpent = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Today expenses
    const tStr = todayStr();
    const todayExpenses = spendingEntries.filter((e) => {
      const d = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
      return d === tStr;
    });
    const todaySpent = todayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Current week expenses (Monday to Sunday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekExpenses = spendingEntries.filter((e) => {
      const dStr = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
      if (!dStr) return false;
      const d = new Date(dStr + 'T00:00:00');
      return d >= monday && d <= sunday;
    });
    const weekSpent = weekExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Calculations
    const remainingMonthBudget = monthlyBudget - monthSpent;
    const monthPct = Math.min(100, Math.round((monthSpent / monthlyBudget) * 100));

    // Weekly Target: monthlyBudget / (totalDaysInMonth / 7)
    const weeksInMonth = totalDaysInMonth / 7;
    const weeklyBudget = Math.round(monthlyBudget / weeksInMonth);
    const remainingWeekBudget = weeklyBudget - weekSpent;
    const weekPct = Math.min(100, Math.round((weekSpent / weeklyBudget) * 100));

    // Baseline daily allowance: monthlyBudget / totalDaysInMonth
    const baselineDailyBudget = Math.round(monthlyBudget / totalDaysInMonth);

    // Dynamic daily allowance for the remaining days:
    const dailyAllowance =
      remainingDays > 0 ? Math.max(0, Math.round(remainingMonthBudget / remainingDays)) : 0;
    const remainingToday = dailyAllowance - todaySpent;
    const todayPct =
      dailyAllowance > 0 ? Math.min(100, Math.round((todaySpent / dailyAllowance) * 100)) : 100;

    return {
      monthlyBudget,
      monthSpent,
      remainingMonthBudget,
      monthPct,
      weeklyBudget,
      weekSpent,
      remainingWeekBudget,
      weekPct,
      baselineDailyBudget,
      dailyAllowance,
      todaySpent,
      remainingToday,
      todayPct,
      totalDaysInMonth,
      currentDay,
      remainingDays,
      monthExpensesCount: monthExpenses.length,
      todayExpensesCount: todayExpenses.length,
    };
  }, [monthlyBudget, spendingEntries]);

  // Only today's logged expenses (for the "Today's Expenses" card)
  const todaysExpenseList = useMemo(() => {
    const t = todayStr();
    return spendingEntries
      .filter((e) => (e.date || (e.createdAt ? e.createdAt.split('T')[0] : '')) === t)
      .sort((a, b) => {
        const aKey = a.createdAt || a.date || '';
        const bKey = b.createdAt || b.date || '';
        return bKey.localeCompare(aKey);
      });
  }, [spendingEntries]);

  // Derived Calculator Results
  const dayCalculatorResult = useMemo(() => {
    const list = spendingEntries.filter(
      (e) => (e.date || e.createdAt?.split('T')[0]) === calcDate
    );
    const total = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { list, total, count: list.length };
  }, [spendingEntries, calcDate]);

  const monthCalculatorResult = useMemo(() => {
    const list = spendingEntries.filter((e) =>
      (e.date || e.createdAt?.split('T')[0])?.startsWith(calcMonth)
    );
    const total = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const parts = calcMonth.split('-');
    const daysInCalcMonth = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10),
      0
    ).getDate();
    const avgPerDay = Math.round(total / (daysInCalcMonth || 30));
    return { list, total, count: list.length, avgPerDay };
  }, [spendingEntries, calcMonth]);

  const simulationResult = useMemo(() => {
    const simAmount = parseFloat(simulatedExpense);
    if (isNaN(simAmount) || simAmount <= 0) return null;
    const newRemainingMonth = budgetMetrics.remainingMonthBudget - simAmount;
    const newDailyAllowance =
      budgetMetrics.remainingDays > 0
        ? Math.max(0, Math.round(newRemainingMonth / budgetMetrics.remainingDays))
        : 0;
    return {
      simAmount,
      newRemainingMonth,
      newDailyAllowance,
      diff: newDailyAllowance - budgetMetrics.dailyAllowance,
    };
  }, [simulatedExpense, budgetMetrics]);

  // DSA Debt Simplification
  const simplifiedSettlement = useMemo(() => {
    const pending = (ledgerEntries || []).filter((e) => e.status === 'pending');
    return DebtGraph.simplifyDebts(pending, 'You');
  }, [ledgerEntries]);

  // Filtered Dues Entries
  const filteredEntries = useMemo(() => {
    return (ledgerEntries || []).filter((entry) => {
      if (activeFilter === 'give' && (entry.type !== 'give' || entry.status === 'settled')) return false;
      if (activeFilter === 'receive' && (entry.type !== 'receive' || entry.status === 'settled')) return false;
      if (activeFilter === 'settled' && entry.status !== 'settled') return false;
      if (activeFilter === 'all' && entry.status === 'settled') return false;
      if (selectedCategory !== 'all' && entry.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!entry.personName.toLowerCase().includes(q) && !entry.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ledgerEntries, activeFilter, selectedCategory, searchQuery]);

  // Handlers
  const handleOpenAddDue = () => {
    setEditingEntry(null);
    setPersonName('');
    setDueAmount('');
    setDueCurrency('₹');
    setDueType('give');
    setDueCategory('personal');
    setDueDate('');
    setDueDescription('');
    setIsDueModalOpen(true);
  };

  const handleOpenEditDue = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setPersonName(entry.personName);
    setDueAmount(entry.amount.toString());
    setDueCurrency(entry.currency || '₹');
    setDueType(entry.type);
    setDueCategory(entry.category || 'personal');
    setDueDate(entry.dueDate ? entry.dueDate.split('T')[0] : '');
    setDueDescription(entry.description || '');
    setIsDueModalOpen(true);
  };

  const handleSaveDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !dueAmount) return;
    const num = parseFloat(dueAmount);
    if (isNaN(num) || num <= 0) return;

    if (editingEntry) {
      await updateLedgerEntry(editingEntry.id, {
        personName: personName.trim(),
        amount: num,
        type: dueType,
        currency: dueCurrency,
        category: dueCategory,
        dueDate: dueDate || undefined,
        description: dueDescription.trim() || undefined,
      });
    } else {
      await createLedgerEntry(personName.trim(), num, dueType, {
        currency: dueCurrency,
        category: dueCategory,
        dueDate: dueDate || undefined,
        description: dueDescription.trim() || undefined,
      });
    }

    setIsDueModalOpen(false);
  };

  const handleOpenAddExpense = () => {
    setEditingSpendingEntry(null);
    setExpAmount('');
    setExpCategory('food');
    setExpNote('');
    setExpDate(todayStr());
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (item: SpendingEntry) => {
    setEditingSpendingEntry(item);
    setExpAmount(item.amount.toString());
    setExpCategory(item.category || 'food');
    setExpNote(item.note || '');
    setExpDate(item.date || todayStr());
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expAmount);
    if (isNaN(num) || num <= 0) return;

    if (editingSpendingEntry) {
      const updated = spendingEntries.map((item) =>
        item.id === editingSpendingEntry.id
          ? {
              ...item,
              amount: num,
              category: expCategory,
              note: expNote.trim(),
              date: expDate || todayStr(),
            }
          : item
      );
      setSpendingEntries(updated);
      saveSpending(updated);
      setIsExpenseModalOpen(false);
      setEditingSpendingEntry(null);
      setExpAmount('');
      setExpNote('');
      showToast(`Updated expense: ₹${num.toLocaleString()}`, 'success');
    } else {
      const newEntry: SpendingEntry = {
        id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: user?.id || '',
        amount: num,
        category: expCategory,
        note: expNote.trim(),
        date: expDate || todayStr(),
        createdAt: new Date().toISOString(),
      };

      const updated = [newEntry, ...spendingEntries];
      setSpendingEntries(updated);
      saveSpending(updated);
      setIsExpenseModalOpen(false);
      setExpAmount('');
      setExpNote('');
      showToast(`Logged ₹${num.toLocaleString()} for ${getCatMeta(expCategory).label}`, 'success');
    }
  };

  const handleDeleteExpense = (id: string) => {
    const item = spendingEntries.find((e) => e.id === id);
    const updated = spendingEntries.filter((e) => e.id !== id);
    setSpendingEntries(updated);
    saveSpending(updated);
    showToast(`Removed expense of ₹${item?.amount || 0}`, 'info');
  };

  const handleOpenBudgetModal = () => {
    setBudgetInput(monthlyBudget.toString());
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(budgetInput);
    if (!isNaN(num) && num > 0) {
      setMonthlyBudget(num);
      try {
        localStorage.setItem(BUDGET_STORAGE_KEY, num.toString());
      } catch {}
      setIsBudgetModalOpen(false);
      showToast(`Monthly budget updated to ₹${num.toLocaleString()}`, 'success');
    }
  };

  const handleOpenPartialPayment = (entry: LedgerEntry) => {
    setPartialPaymentEntry(entry);
    const remaining = Math.max(0, entry.amount - (entry.paidAmount || 0));
    setPartialAmount(remaining > 0 ? remaining.toString() : '');
    setPartialNote('');
  };

  const handlePartialPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialPaymentEntry) return;
    const num = parseFloat(partialAmount);
    if (isNaN(num) || num <= 0) return;

    await recordPartialPayment(partialPaymentEntry.id, num, partialNote);
    showToast(`Logged payment of ${partialPaymentEntry.currency}${num}`, 'success');
    setPartialPaymentEntry(null);
  };

  // ── Dedicated Full Transaction History Page ──
  if (isTransactionHistoryPageOpen) {
    let filteredSpending = spendingEntries.filter((e) => {
      if (historyCategoryFilter !== 'all' && e.category !== historyCategoryFilter) return false;
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase();
      return (
        (e.note || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q) ||
        String(e.amount).includes(q) ||
        (e.date || '').includes(q)
      );
    });

    if (historySortBy === 'highest') {
      filteredSpending = [...filteredSpending].sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (historySortBy === 'lowest') {
      filteredSpending = [...filteredSpending].sort((a, b) => Number(a.amount) - Number(b.amount));
    } else {
      filteredSpending = [...filteredSpending].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    const totalSpendingSum = spendingEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const maxSpend = spendingEntries.length > 0 ? Math.max(...spendingEntries.map((e) => Number(e.amount) || 0)) : 0;
    const avgSpend = spendingEntries.length > 0 ? Math.round(totalSpendingSum / spendingEntries.length) : 0;

    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-[#F5F6F8] text-slate-900 font-sans select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-32 md:pb-20">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-20 backdrop-blur-md bg-[#F5F6F8]/90 border-b border-slate-200/60 pb-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsTransactionHistoryPageOpen(false)}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200/90 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
            >
              <ArrowLeft size={16} />
              <span>Back to Planner</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddExpense}
              className="px-4 py-2 rounded-2xl bg-[#1C1C1E] text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
          {/* Page Hero Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
                Ledger Audit
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] tracking-tight mt-2">
                All Transaction Details
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Complete historical record of every expense entry
              </p>
            </div>
            <span className="text-xs font-extrabold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-2xs self-start sm:self-auto">
              {filteredSpending.length} of {spendingEntries.length} Records
            </span>
          </div>

          {/* 4 Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 sm:p-5 rounded-[26px] bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block mb-1">
                Total Expenses
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                ₹{totalSpendingSum >= 100000 ? `${(totalSpendingSum / 100000).toFixed(2)}L` : totalSpendingSum.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Lifetime logged outflow</p>
            </div>

            <div className="p-4 sm:p-5 rounded-[26px] bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block mb-1">
                Total Records
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                {spendingEntries.length}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Individual receipts</p>
            </div>

            <div className="p-4 sm:p-5 rounded-[26px] bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
                Average / Entry
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                ₹{avgSpend.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Mean expense ticket</p>
            </div>

            <div className="p-4 sm:p-5 rounded-[26px] bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block mb-1">
                Highest Spend
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#1C1C1E]">
                ₹{maxSpend.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Single largest item</p>
            </div>
          </div>

          {/* Search Bar & Sort Dropdown */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search by note, category or amount..."
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]/20"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Sort Buttons */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/90 shrink-0 shadow-2xs">
                {(['newest', 'highest', 'lowest'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHistorySortBy(mode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                      historySortBy === mode
                        ? 'bg-[#1C1C1E] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'newest' ? 'Newest' : mode === 'highest' ? 'Highest ₹' : 'Lowest ₹'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setHistoryCategoryFilter('all')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  historyCategoryFilter === 'all'
                    ? 'bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <span>All ({spendingEntries.length})</span>
              </button>

              {SPENDING_CATEGORIES.map((cat) => {
                const count = spendingEntries.filter((e) => e.category === cat.key).length;
                if (count === 0 && historyCategoryFilter !== cat.key) return null;
                const Icon = cat.icon;
                const isSel = historyCategoryFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setHistoryCategoryFilter(cat.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={13} style={{ color: isSel ? '#FFFFFF' : cat.color }} />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transactions List */}
          {filteredSpending.length > 0 ? (
            <div className="space-y-3">
              {filteredSpending.map((entry) => {
                const meta = getCatMeta(entry.category);
                const Icon = meta.icon;
                return (
                  <div
                    key={entry.id}
                    className="p-4 sm:p-5 rounded-[26px] bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 font-bold shadow-2xs"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-black text-[#1C1C1E] tracking-tight truncate">
                          {entry.note || meta.label}
                        </h4>
                        <div className="text-xs text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-600">{meta.label}</span>
                          <span>·</span>
                          <span>{entry.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                        -₹{Number(entry.amount).toLocaleString()}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExpense(entry)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(entry.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-[32px] bg-white border border-slate-200/80 p-8 space-y-3 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No transactions match your search</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {historySearchQuery || historyCategoryFilter !== 'all'
                  ? 'Try clearing your search query or choosing another category filter.'
                  : 'You have not recorded any daily expense entries yet.'}
              </p>
              {(historySearchQuery || historyCategoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryCategoryFilter('all');
                  }}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-transparent text-slate-900 font-sans select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 pb-36 md:pb-20">

        {/* ── 1. Main 2-Way Segmented Tab Switcher (Dues vs Daily Expenses) ── */}
        <div className="p-1.5 rounded-2xl transio-glass-chip flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('investment')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'investment'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet size={15} />
            <span>Dues & Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart size={15} />
            <span>Daily Expenses</span>
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: DUES & LEDGER (SHOWS ONLY DUES & BORROW/LEND DATA)     */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'investment' && (
          <div className="space-y-4">
            {/* Quick Action Buttons for Dues */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
              <button
                type="button"
                onClick={handleOpenAddDue}
                className="p-3.5 sm:p-4 rounded-2xl transio-glass-card flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100/90 text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Add Due</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('receive')}
                className="p-3.5 sm:p-4 rounded-2xl transio-glass-card flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100/90 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowDownLeft size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Receive</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('give')}
                className="p-3.5 sm:p-4 rounded-2xl transio-glass-card flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-rose-100/90 text-rose-600 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowUpRight size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">You Owe</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSimplifiedGraph(!showSimplifiedGraph)}
                className="p-3.5 sm:p-4 rounded-2xl transio-glass-card flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100/90 text-purple-600 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowRightLeft size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Settle</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 transio-glass-card p-3 rounded-2xl">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { key: 'all', label: `Active (${stats.pendingCount})` },
                  { key: 'give', label: `You Owe (₹${stats.totalGive.toLocaleString()})` },
                  { key: 'receive', label: `Owed to You (₹${stats.totalReceive.toLocaleString()})` },
                  { key: 'settled', label: `Settled (${stats.settledCount})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setActiveFilter(f.key as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === f.key
                        ? 'bg-[#EA580C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search person or note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] focus:bg-white"
                />
              </div>
            </div>

            {/* Smart Debt Simplification Panel */}
            {showSimplifiedGraph && simplifiedSettlement.transactions.length > 0 && (
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#EA580C]" />
                    <span>Optimized Debt Settlement Plan (DSA Graph)</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {simplifiedSettlement.simplifiedTransactionsCount} optimal transfers
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {simplifiedSettlement.transactions.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{t.from}</span>
                        <span className="text-slate-400">pays</span>
                        <span className="font-bold text-slate-900">{t.to}</span>
                      </div>
                      <span className="font-bold text-emerald-600 font-mono">{t.currency}{t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entries List */}
            {filteredEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredEntries.map((entry) => {
                  const isGive = entry.type === 'give';
                  const isSettled = entry.status === 'settled';
                  const paid = entry.paidAmount || 0;
                  const remaining = Math.max(0, entry.amount - paid);

                  return (
                    <div
                      key={entry.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{entry.personName}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {entry.dueDate ? `Due ${new Date(entry.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'No due date'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-extrabold font-mono ${isGive ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isGive ? '-' : '+'}₹{entry.amount.toLocaleString()}
                            </span>
                            {paid > 0 && !isSettled && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                ₹{remaining.toLocaleString()} left
                              </p>
                            )}
                          </div>
                        </div>

                        {entry.description && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {entry.description}
                          </p>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          {!isSettled && (
                            <button
                              type="button"
                              onClick={() => handleOpenPartialPayment(entry)}
                              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                            >
                              Partial Pay
                            </button>
                          )}
                          {!isSettled && (
                            <button
                              type="button"
                              onClick={() => settleLedgerEntry(entry.id)}
                              className="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition-colors cursor-pointer border border-emerald-200"
                            >
                              Settle
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDue(entry)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLedgerEntry(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-2 shadow-xs">
                <p className="text-sm font-bold text-slate-700">No dues recorded in this view</p>
                <p className="text-xs text-slate-400">Add entries to track what you owe or are owed.</p>
                <button
                  type="button"
                  onClick={handleOpenAddDue}
                  className="mt-2 px-4 py-2 rounded-full bg-[#EA580C] text-white text-xs font-bold cursor-pointer hover:bg-[#C2410C]"
                >
                  + Add Debt / Due
                </button>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: DAILY EXPENSES & MONTHLY BUDGET PLANNER                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: DAILY EXPENSES & MONTHLY BUDGET PLANNER                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-[32px] border border-slate-200/80 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#1C1C1E] text-white flex items-center justify-center shadow-xs">
                    <Target size={18} />
                  </div>
                  <h2 className="text-lg font-black text-[#1C1C1E] tracking-tight">Daily Spending & Budget</h2>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Dynamic pacing for Month, Week, and Day with real-time daily dynamic allowance.
                </p>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleOpenBudgetModal}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                >
                  <Edit2 size={14} />
                  <span>Set Budget</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddExpense}
                  className="px-4.5 py-2.5 rounded-2xl bg-[#1C1C1E] hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                  <span>Add Expense</span>
                </button>
              </div>
            </div>

            {/* ── Month, Week, Daily Filter Options Switcher & View History Link ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 px-1">
              <div>
                <h3 className="text-sm font-black text-[#1C1C1E] tracking-tight">
                  Budget &amp; Expense Planning
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Select time horizon to view detailed pacing breakdown
                </p>
              </div>

              <div className="flex items-center gap-3.5 self-start sm:self-auto flex-wrap">
                {/* Segmented Filter Pills */}
                <div className="p-1 rounded-2xl bg-white border border-slate-200/90 inline-flex items-center gap-1 shadow-2xs">
                  {[
                    { key: 'all', label: 'All View' },
                    { key: 'month', label: 'Monthly' },
                    { key: 'week', label: 'Weekly' },
                    { key: 'day', label: 'Daily' },
                  ].map((item) => {
                    const isSel = planningViewFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPlanningViewFilter(item.key as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#1C1C1E] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Plain Text Link: View history (not in button) */}
                <button
                  type="button"
                  onClick={() => setIsTransactionHistoryPageOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>View history</span>
                  <ArrowRight size={13} className="stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* 3-Way Planning Cards: Month, Week, Day Breakdown (Filtered) */}
            <div className={`grid gap-4 ${
              planningViewFilter === 'all'
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 max-w-xl mx-auto w-full'
            }`}>
              {/* 1. Monthly Card */}
              {(planningViewFilter === 'all' || planningViewFilter === 'month') && (
                <div className="p-6 rounded-[30px] bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center font-bold">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Monthly Plan</span>
                        <p className="text-xs font-bold text-slate-800">₹{budgetMetrics.monthlyBudget.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${
                      budgetMetrics.monthPct > 90 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      budgetMetrics.monthPct > 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        budgetMetrics.monthPct > 90 ? 'bg-rose-500 animate-pulse' :
                        budgetMetrics.monthPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {budgetMetrics.monthPct}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-[#1C1C1E] font-mono">
                        ₹{budgetMetrics.monthSpent.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ₹{budgetMetrics.remainingMonthBudget.toLocaleString()} left
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2.5 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetMetrics.monthPct > 90 ? 'bg-rose-500' :
                          budgetMetrics.monthPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, budgetMetrics.monthPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                    <span>Day {budgetMetrics.currentDay} of {budgetMetrics.totalDaysInMonth}</span>
                    <span className="font-semibold text-slate-700">{budgetMetrics.remainingDays} days left</span>
                  </div>
                </div>
              )}

              {/* 2. Weekly Card */}
              {(planningViewFilter === 'all' || planningViewFilter === 'week') && (
                <div className="p-6 rounded-[30px] bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Clock size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">This Week</span>
                        <p className="text-xs font-bold text-slate-800">₹{budgetMetrics.weeklyBudget.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${
                      budgetMetrics.weekPct > 90 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      budgetMetrics.weekPct > 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        budgetMetrics.weekPct > 90 ? 'bg-rose-500 animate-pulse' :
                        budgetMetrics.weekPct > 75 ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      {budgetMetrics.weekPct}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-[#1C1C1E] font-mono">
                        ₹{budgetMetrics.weekSpent.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ₹{budgetMetrics.remainingWeekBudget.toLocaleString()} left
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2.5 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetMetrics.weekPct > 90 ? 'bg-rose-500' :
                          budgetMetrics.weekPct > 75 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, budgetMetrics.weekPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                    <span>Weekly Pace</span>
                    <span className="font-semibold text-slate-700">Mon – Sun window</span>
                  </div>
                </div>
              )}

              {/* 3. Daily Allowance Card */}
              {(planningViewFilter === 'all' || planningViewFilter === 'day') && (
                <div className="p-6 rounded-[30px] bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">Daily Allowance</span>
                        <p className="text-xs font-bold text-slate-800">₹{budgetMetrics.dailyAllowance.toLocaleString()} / day</p>
                      </div>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border shadow-2xs flex items-center gap-1.5 ${
                      budgetMetrics.todayPct > 100 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      budgetMetrics.todayPct > 75 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        budgetMetrics.todayPct > 100 ? 'bg-rose-500 animate-pulse' :
                        budgetMetrics.todayPct > 75 ? 'bg-amber-500' : 'bg-purple-500'
                      }`} />
                      {budgetMetrics.todayPct}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-[#1C1C1E] font-mono">
                        ₹{budgetMetrics.todaySpent.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {budgetMetrics.remainingToday >= 0
                          ? `₹${budgetMetrics.remainingToday.toLocaleString()} left`
                          : `₹${Math.abs(budgetMetrics.remainingToday).toLocaleString()} over`}
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2.5 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetMetrics.todayPct > 100 ? 'bg-rose-500' :
                          budgetMetrics.todayPct > 75 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${Math.min(100, budgetMetrics.todayPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                    <span>Dynamic Allowance</span>
                    <span className="font-semibold text-slate-700">
                      {budgetMetrics.remainingToday >= 0 ? '✓ On track today' : '⚠ Over daily target'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Today's Daily Spending List ── */}
            <div className="rounded-[32px] bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1C1C1E] tracking-tight">
                    Today&apos;s Expenses
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {todaysExpenseList.length > 0
                      ? `${todaysExpenseList.length} logged today · ₹${todaysExpenseList
                          .reduce((s, e) => s + (Number(e.amount) || 0), 0)
                          .toLocaleString()}`
                      : 'No expenses logged today'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddExpense}
                    className="px-3.5 py-1.5 rounded-xl bg-[#1C1C1E] text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>Log</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTransactionHistoryPageOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    View all &rarr;
                  </button>
                </div>
              </div>

              {/* Items List */}
              {todaysExpenseList.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {todaysExpenseList.slice(0, 6).map((item) => {
                    const meta = getCatMeta(item.category);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xs flex items-center justify-between gap-3 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs font-bold"
                            style={{ backgroundColor: meta.color }}
                          >
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {item.note || meta.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="font-semibold text-slate-600">{meta.label}</span>
                              <span>·</span>
                              <span>{item.date}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-black font-mono text-rose-600">
                            -₹{Number(item.amount).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit expense"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete expense"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-700">No expenses logged today</p>
                  <p className="text-xs text-slate-400">Log today&apos;s coffee, food, or shopping spending.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddExpense}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#1C1C1E] text-white text-xs font-bold cursor-pointer hover:bg-slate-800"
                  >
                    + Log Expense
                  </button>
                </div>
              )}
            </div>

            {/* ── Compact What-If Simulator ── */}
            <div className="p-5 sm:p-6 rounded-[28px] bg-white border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calculator size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#1C1C1E] tracking-tight">What-If Spending Simulator</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Test how an upcoming expense affects your daily allowance</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-60">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter amount (e.g. 1500)"
                    value={simulatedExpense}
                    onChange={(e) => setSimulatedExpense(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]/20"
                  />
                </div>

                {simulationResult && (
                  <div className="w-full sm:flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-slate-400">New Daily Allowance: </span>
                      <span className="font-mono font-black text-slate-900">
                        ₹{simulationResult.newDailyAllowance.toLocaleString()} / day
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Impact: </span>
                      <span className="font-semibold text-rose-600 font-mono">
                        {simulationResult.diff < 0
                          ? `-₹${Math.abs(simulationResult.diff).toLocaleString()} / day`
                          : `+₹${simulationResult.diff.toLocaleString()} / day`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── Modal: Add / Edit Due ── */}
      {isDueModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDueModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {editingEntry ? 'Edit Due / Debt' : 'Add Debt / Due'}
              </h2>
              <button
                type="button"
                onClick={() => setIsDueModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDue} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Person Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe, Landlord"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={dueAmount}
                    onChange={(e) => setDueAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Type</label>
                  <CustomSelect
                    value={dueType}
                    onChange={(val) => setDueType(val as any)}
                    options={DUE_TYPE_OPTIONS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Due Date</label>
                  <DatePickerDropdown
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <CustomSelect
                    value={dueCategory}
                    onChange={(val) => setDueCategory(val)}
                    options={LEDGER_CATEGORIES}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner split, loan"
                  value={dueDescription}
                  onChange={(e) => setDueDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDueModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-md cursor-pointer"
                >
                  Save Due
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit Daily Expense ── */}
      {isExpenseModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            setIsExpenseModalOpen(false);
            setEditingSpendingEntry(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {editingSpendingEntry ? 'Edit Daily Expense' : 'Log Daily Expense'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsExpenseModalOpen(false);
                  setEditingSpendingEntry(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <CustomSelect
                    value={expCategory}
                    onChange={(val) => setExpCategory(val)}
                    options={SPENDING_SELECT_OPTIONS}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date</label>
                  <DatePickerDropdown
                    value={expDate}
                    onChange={setExpDate}
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Note</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks coffee, Groceries"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpenseModalOpen(false);
                    setEditingSpendingEntry(null);
                  }}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-md cursor-pointer"
                >
                  {editingSpendingEntry ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Monthly Budget Target ── */}
      {isBudgetModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBudgetModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Target size={16} className="text-[#EA580C]" />
                <span>Set Monthly Budget Target</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Monthly Budget Limit (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="e.g. 30000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  We will automatically calculate your weekly targets and daily dynamic allowance based on remaining days.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Quick presets:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[15000, 25000, 35000, 50000, 75000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBudgetInput(preset.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      ₹{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-md cursor-pointer"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Partial Payment ── */}
      {partialPaymentEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPartialPaymentEntry(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Log Partial Payment
              </h2>
              <button
                type="button"
                onClick={() => setPartialPaymentEntry(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePartialPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Payment Amount for {partialPaymentEntry.personName}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Installment 1, GPay"
                  value={partialNote}
                  onChange={(e) => setPartialNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPartialPaymentEntry(null)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-md cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
