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
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { LedgerEntry, LedgerType } from '@/types';
import { DebtGraph } from '@/lib/dsa/DebtGraph';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';

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

function loadSpending(): SpendingEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveSpending(data: SpendingEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('spending_updated', { detail: data }));
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

  // Daily spending data
  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>(loadSpending);

  // Add / Edit Due form state
  const [personName, setPersonName] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueCurrency, setDueCurrency] = useState('₹');
  const [dueType, setDueType] = useState<LedgerType>('give');
  const [dueCategory, setDueCategory] = useState('personal');
  const [dueDate, setDueDate] = useState('');
  const [dueDescription, setDueDescription] = useState('');

  // Add Expense form state
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

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expAmount);
    if (isNaN(num) || num <= 0) return;

    const newEntry: SpendingEntry = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: num,
      currency: '₹',
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
    showToast(`Logged ₹${num} for ${getCatMeta(expCategory).label}`, 'success');
  };

  const handleDeleteExpense = (id: string) => {
    const updated = spendingEntries.filter((e) => e.id !== id);
    setSpendingEntries(updated);
    saveSpending(updated);
    showToast('Expense removed', 'info');
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-[#F8FAFC] text-slate-900 font-sans select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-32 md:pb-16 space-y-6">

        {/* ── 1. Main 2-Way Segmented Tab Switcher (Dues vs Daily Expenses) ── */}
        <div className="p-1.5 rounded-2xl bg-slate-200/70 border border-slate-300/60 flex items-center gap-1.5 shadow-2xs">
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
                className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Add Due</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('receive')}
                className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowDownLeft size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Receive</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('give')}
                className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowUpRight size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">You Owe</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSimplifiedGraph(!showSimplifiedGraph)}
                className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                  <ArrowRightLeft size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Settle</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
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
        {/* TAB 2: DAILY EXPENSES (SHOWS ONLY DAILY EXPENSE DATA)          */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="space-y-5">
            {/* Daily Spending Consumption Bar - ONLY here on expenses tab */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Today's Expense Total</p>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">
                    ₹{stats.todaySpend.toLocaleString()} <span className="text-xs font-normal text-slate-400">Goal: ₹1,300 / day</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  + Add Spend
                </button>
              </div>

              {/* Multi-Colored Segmented Progress Bar */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5 p-0.5">
                <div className="h-full rounded-full bg-emerald-500 w-[45%]" />
                <div className="h-full rounded-full bg-blue-500 w-[25%]" />
                <div className="h-full rounded-full bg-purple-500 w-[20%]" />
                <div className="h-full rounded-full bg-amber-500 w-[10%]" />
              </div>

              {/* Category Badges */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Food</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Shopping</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Bills</span>
                </span>
              </div>
            </div>

            {/* List of Logged Daily Expenses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Expense History</h2>
                  <p className="text-xs text-slate-400">{spendingEntries.length} logged expense items</p>
                </div>
              </div>

              {spendingEntries.length > 0 ? (
                <div className="space-y-2.5">
                  {spendingEntries.map((item) => {
                    const meta = getCatMeta(item.category);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: meta.color }}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.note || meta.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{meta.label} · {item.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-mono font-bold text-slate-900">
                            -₹{item.amount.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-2 shadow-xs">
                  <p className="text-sm font-bold text-slate-700">No daily expenses logged yet</p>
                  <p className="text-xs text-slate-400">Log your daily coffee, food, or shopping spending.</p>
                </div>
              )}
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
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white"
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

      {/* ── Modal: Add Daily Expense ── */}
      {isExpenseModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsExpenseModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 text-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Log Daily Expense
              </h2>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
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
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:bg-white"
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
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-md cursor-pointer"
                >
                  Log Expense
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
