'use client';

import React, { useState, useMemo } from 'react';
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
  Filter,
  DollarSign,
  AlertCircle,
  BellRing,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
  Wallet,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { LedgerEntry, LedgerType } from '@/types';
import { DebtGraph } from '@/lib/dsa/DebtGraph';

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

  const [activeFilter, setActiveFilter] = useState<'all' | 'give' | 'receive' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [showSimplifiedGraph, setShowSimplifiedGraph] = useState(false);

  // Modal Form State
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [type, setType] = useState<LedgerType>('give');
  const [category, setCategory] = useState('personal');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Calculations
  const stats = useMemo(() => {
    const pending = ledgerEntries.filter((e) => e.status === 'pending');
    const totalGive = pending
      .filter((e) => e.type === 'give')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalReceive = pending
      .filter((e) => e.type === 'receive')
      .reduce((sum, e) => sum + e.amount, 0);
    const net = totalReceive - totalGive;
    const settledCount = ledgerEntries.filter((e) => e.status === 'settled').length;

    return { totalGive, totalReceive, net, pendingCount: pending.length, settledCount };
  }, [ledgerEntries]);

  // DSA Min-Cash-Flow Simplified Settlements
  const simplifiedSettlement = useMemo(() => {
    const pending = ledgerEntries.filter((e) => e.status === 'pending');
    return DebtGraph.simplifyDebts(pending, 'You');
  }, [ledgerEntries]);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setPersonName('');
    setAmount('');
    setCurrency('₹');
    setType('give');
    setCategory('personal');
    setDueDate('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setPersonName(entry.personName);
    setAmount(entry.amount.toString());
    setCurrency(entry.currency || '₹');
    setType(entry.type);
    setCategory(entry.category || 'personal');
    setDueDate(entry.dueDate ? entry.dueDate.split('T')[0] : '');
    setDescription(entry.description || '');
    setIsModalOpen(true);
  };

  // Filtered List
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      // Status & type filter
      if (activeFilter === 'give' && (entry.type !== 'give' || entry.status === 'settled')) return false;
      if (activeFilter === 'receive' && (entry.type !== 'receive' || entry.status === 'settled')) return false;
      if (activeFilter === 'settled' && entry.status !== 'settled') return false;
      if (activeFilter === 'all' && entry.status === 'settled') return false; // Default 'all' shows active dues

      // Category filter
      if (selectedCategory !== 'all' && entry.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = entry.personName.toLowerCase().includes(q);
        const matchesDesc = entry.description?.toLowerCase().includes(q);
        const matchesCategory = entry.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
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
      await updateLedgerEntry(editingEntry.id, {
        personName: personName.trim(),
        amount: numAmount,
        type,
        currency,
        category,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
      });
    } else {
      await createLedgerEntry(personName.trim(), numAmount, type, {
        currency,
        category,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
      });
    }

    // Reset & Close
    setEditingEntry(null);
    setPersonName('');
    setAmount('');
    setDescription('');
    setDueDate('');
    setIsModalOpen(false);
  };

  const handleSetReminderForDue = async (entry: LedgerEntry) => {
    const defaultTime = entry.dueDate
      ? new Date(entry.dueDate).toISOString()
      : new Date(Date.now() + 24 * 3600000).toISOString();

    const title = entry.type === 'give'
      ? `Pay ${entry.currency}${entry.amount} to ${entry.personName}`
      : `Collect ${entry.currency}${entry.amount} from ${entry.personName}`;

    await createReminder(title, defaultTime, 'none');
    showToast(`Reminder set for "${title}"`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-(--bg-primary) text-(--text-primary)">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] flex items-center justify-center text-white shadow-md">
                <HandCoins size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Money Ledger & Dues</h1>
                <p className="text-xs sm:text-sm text-(--text-secondary)">
                  Track who you need to pay, who owes you, debts, and split expenses.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={16} />
            <span>Add Debt / Due</span>
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Money to Give (You Owe) */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                  You Need to Give (Payables)
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-rose-500 flex items-center gap-1">
                  <span>₹{stats.totalGive.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <ArrowUpRight size={20} />
              </div>
            </div>
            <p className="text-[11px] text-(--text-muted) mt-3">
              Total money you owe to friends, bills, or lenders.
            </p>
          </div>

          {/* 2. Money to Receive (They Owe You) */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                  Owed to You (Receivables)
                </span>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-500 flex items-center gap-1">
                  <span>₹{stats.totalReceive.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ArrowDownLeft size={20} />
              </div>
            </div>
            <p className="text-[11px] text-(--text-muted) mt-3">
              Money others have borrowed and need to return.
            </p>
          </div>

          {/* 3. Net Financial Balance */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                  Net Balance Position
                </span>
                <div className={`text-2xl sm:text-3xl font-bold flex items-center gap-1 ${
                  stats.net >= 0 ? 'text-[#4E82EE]' : 'text-rose-500'
                }`}>
                  <span>{stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center">
                <Wallet size={20} />
              </div>
            </div>
            <p className="text-[11px] text-(--text-muted) mt-3">
              {stats.net >= 0 ? '✓ You are in a positive net balance.' : '⚠️ You owe more than you are owed.'}
            </p>
          </div>
        </div>

        {/* DSA Graph Debt Simplification Visualizer */}
        {simplifiedSettlement.transactions.length > 0 && (
          <div className="bg-(--bg-card) p-4 rounded-2xl border border-(--border-subtle) shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="text-xs font-bold text-(--text-primary) flex items-center gap-2">
                    <span>DSA Smart Debt Settlement (Min-Cash-Flow)</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-mono">
                      O(V log V + E)
                    </span>
                  </h3>
                  <p className="text-[11px] text-(--text-muted)">
                    Simplified {simplifiedSettlement.originalTransactionsCount} bilateral transaction(s) into{' '}
                    <strong className="text-(--text-primary)">
                      {simplifiedSettlement.simplifiedTransactionsCount} optimal payment(s)
                    </strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimplifiedGraph(!showSimplifiedGraph)}
                className="px-3 py-1.5 rounded-xl bg-(--bg-elevated) hover:bg-indigo-500/15 text-indigo-500 text-xs font-semibold cursor-pointer transition-colors"
              >
                {showSimplifiedGraph ? 'Hide Optimal Plan' : 'View Optimal Plan'}
              </button>
            </div>

            {showSimplifiedGraph && (
              <div className="mt-3 pt-3 border-t border-(--border-subtle) space-y-2 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simplifiedSettlement.transactions.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-(--text-primary)">{t.from}</span>
                        <span className="text-(--text-muted)">pays</span>
                        <span className="font-semibold text-(--text-primary)">{t.to}</span>
                      </div>
                      <span className="font-bold text-emerald-500 font-mono">
                        {t.currency}{t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-(--bg-card) p-3 rounded-2xl border border-(--border-subtle)">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-xs'
                  : 'text-(--text-secondary) hover:bg-(--bg-elevated)'
              }`}
            >
              Active Dues ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('give')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'give'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-(--text-secondary) hover:bg-(--bg-elevated)'
              }`}
            >
              To Give (Payables)
            </button>
            <button
              onClick={() => setActiveFilter('receive')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'receive'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-(--text-secondary) hover:bg-(--bg-elevated)'
              }`}
            >
              To Receive (Receivables)
            </button>
            <button
              onClick={() => setActiveFilter('settled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'settled'
                  ? 'bg-(--bg-elevated) text-(--text-primary) border border-(--border-subtle) font-bold'
                  : 'text-(--text-secondary) hover:bg-(--bg-elevated)'
              }`}
            >
              Settled History ({stats.settledCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Search person or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE]"
            />
          </div>
        </div>

        {/* Ledger Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-(--border-subtle) bg-(--bg-card) p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4E82EE]/20 to-[#9B72CF]/20 text-[#4E82EE] flex items-center justify-center mx-auto">
              <HandCoins size={24} />
            </div>
            <h3 className="font-semibold text-base">No Dues in This View</h3>
            <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
              {searchQuery
                ? 'No matching entries found for your search query.'
                : 'Your financial ledger is clear! Use the "Add Debt / Due" button or tell the AI assistant in chat.'}
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
                  className={`rounded-3xl bg-(--bg-card) border p-5 shadow-xs transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                    isSettled
                      ? 'border-emerald-500/20 opacity-75'
                      : isGive
                      ? 'border-rose-500/30 hover:border-rose-500/50'
                      : 'border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  {/* Subtle Top Indicator Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isSettled ? 'bg-emerald-500' : isGive ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                          isSettled
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : isGive
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {entry.personName.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base truncate">{entry.personName}</h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isSettled
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : isGive
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isSettled ? '✓ Settled' : isGive ? 'You Owe' : 'Owed to You'}
                          </span>
                        </div>

                        {entry.category && (
                          <span className="text-[11px] text-(--text-muted) capitalize">
                            • {entry.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount Display */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xl font-extrabold ${
                          isSettled
                            ? 'text-(--text-muted) line-through'
                            : isGive
                            ? 'text-rose-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {isGive ? '-' : '+'}{entry.currency}{entry.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Description / Note */}
                  {entry.description && (
                    <p className="text-xs text-(--text-secondary) bg-(--bg-elevated) p-2.5 rounded-xl break-words">
                      {entry.description}
                    </p>
                  )}

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-(--border-subtle) flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Due Date Indicator */}
                    <div className="flex items-center gap-1.5 text-(--text-muted)">
                      {entry.dueDate ? (
                        <>
                          <Clock size={12} className="text-[#4E82EE]" />
                          <span>Due: {new Date(entry.dueDate).toLocaleDateString()}</span>
                        </>
                      ) : (
                        <span>Created: {new Date(entry.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isSettled && (
                        <>
                          {/* Settle / Mark Paid */}
                          <button
                            onClick={() => settleLedgerEntry(entry.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="Mark as paid / settled"
                          >
                            <CheckCircle2 size={12} />
                            <span>Settle</span>
                          </button>

                          {/* Set Reminder */}
                          <button
                            onClick={() => handleSetReminderForDue(entry)}
                            className="p-1.5 rounded-lg bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-[#4E82EE] transition-all cursor-pointer"
                            title="Set alarm reminder for this due"
                          >
                            <BellRing size={13} />
                          </button>

                          {/* Edit Entry Button */}
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="p-1.5 rounded-lg bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-[#4E82EE] transition-all cursor-pointer"
                            title="Edit this record"
                          >
                            <Edit2 size={13} />
                          </button>
                        </>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => {
                          showConfirm({
                            title: 'Remove Record',
                            message: `Remove the debt record for ${entry.personName} (${entry.currency}${entry.amount})?`,
                            confirmText: 'Remove',
                            type: 'danger',
                            onConfirm: () => deleteLedgerEntry(entry.id),
                          });
                        }}
                        className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Debt / Due Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle)">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/20 text-[#4E82EE] flex items-center justify-center">
                  <HandCoins size={16} />
                </div>
                <h2 className="text-lg font-bold">
                  {editingEntry ? 'Edit Money Due / Debt' : 'Add Money Due / Debt'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Type Switcher (To Give vs To Receive) */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('give')}
                    className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      type === 'give'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-(--bg-elevated) text-(--text-secondary) border-(--border-subtle)'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    <span>I Need to Give (I Owe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('receive')}
                    className={`py-2.5 px-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      type === 'receive'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-(--bg-elevated) text-(--text-secondary) border-(--border-subtle)'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    <span>I Need to Receive (Owed)</span>
                  </button>
                </div>
              </div>

              {/* Person Name & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
                    Person / Entity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul, Sarah, Landlord"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
                    Amount & Currency *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none"
                    >
                      <option value="₹">₹ (INR)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                      <option value="£">£ (GBP)</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none"
                  >
                    <option value="personal">Personal / Friends</option>
                    <option value="food">Food & Dining</option>
                    <option value="rent">Rent & Housing</option>
                    <option value="bills">Bills & Utilities</option>
                    <option value="travel">Travel & Transport</option>
                    <option value="loan">Loan / Borrowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none"
                  />
                </div>
              </div>

              {/* Description Note */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
                  Description / Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dinner split at barbecue, taxi fare, concert ticket..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-primary) focus:outline-none resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  {editingEntry ? 'Update Record' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
