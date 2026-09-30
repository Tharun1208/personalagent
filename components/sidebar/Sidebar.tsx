'use client';

import React from 'react';
import {
  Compass,
  Sparkles,
  ListTodo,
  AlarmClock,
  Flame,
  Trophy,
  CreditCard,
  Calendar,
  AudioLines,
  Timer,
  Settings,
  X,
  Database,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Decorative Nav Items with Dedicated Theme Gradients ───────────────────────
const NAV_ITEMS = [
  {
    key: 'dashboard',
    title: 'Executive KPI',
    subtitle: 'Daily overview & metrics',
    icon: Compass,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    activeBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/25',
  },
  {
    key: 'chat',
    title: 'AI Intelligence',
    subtitle: 'Assistant & voice brain',
    icon: Sparkles,
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    activeBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/25',
  },
  {
    key: 'tasks',
    title: 'Tasks & Todos',
    subtitle: 'Action items & priorities',
    icon: ListTodo,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
  },
  {
    key: 'reminders',
    title: 'Alarms & Alerts',
    subtitle: 'Real-time notifications',
    icon: AlarmClock,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    activeBg: 'bg-amber-600 text-white shadow-md shadow-amber-500/25',
  },
  {
    key: 'habits',
    title: 'Habits & Streaks',
    subtitle: 'Daily routine tracker',
    icon: Flame,
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-500/25',
  },
  {
    key: 'goals',
    title: 'Goals & OKRs',
    subtitle: 'Strategic milestones',
    icon: Trophy,
    color: 'text-cyan-500 dark:text-cyan-400',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    activeBg: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25',
  },
  {
    key: 'ledger',
    title: 'Ledger & Dues',
    subtitle: 'Debts & receivables',
    icon: CreditCard,
    color: 'text-teal-500 dark:text-teal-400',
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    activeBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/25',
  },
  {
    key: 'apps',
    title: 'Dynamic Apps',
    subtitle: 'Interactive tools & AI sandbox',
    icon: Zap,
    color: 'text-violet-500 dark:text-violet-400',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    activeBg: 'bg-violet-600 text-white shadow-md shadow-violet-500/25',
  },
  {
    key: 'calendar',
    title: 'Calendar & Schedule',
    subtitle: 'Events & timeline',
    icon: Calendar,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    activeBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25',
  },
] as const;

export default function Sidebar({ onClose }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    tasks,
    reminders,
    goals,
    ledgerEntries,
    user,
    setLiveVoiceOpen,
    setFocusTimerOpen,
  } = useApp();

  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingReminderCount = reminders.filter((r) => r.status === 'pending').length;
  const pendingLedgerCount = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const getBadge = (key: string) => {
    if (key === 'tasks') return pendingTaskCount;
    if (key === 'reminders') return pendingReminderCount;
    if (key === 'ledger') return pendingLedgerCount;
    if (key === 'goals') return goals.length;
    return 0;
  };

  return (
    <aside className="w-full md:w-[275px] bg-(--bg-sidebar) flex flex-col h-screen select-none shrink-0 border-r border-(--border-subtle) font-sans overflow-hidden">
      
      {/* ── Brand Header ── */}
      <div className="shrink-0 p-4 pb-3 border-b border-(--border-subtle)/50">
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onClose) onClose();
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] p-0.5 shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-(--bg-card) rounded-[14px] flex items-center justify-center overflow-hidden p-1">
                <img
                  src="/logo.png"
                  alt="Assistance Logo"
                  className="w-full h-full object-contain rounded-[10px]"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[15px] tracking-tight text-(--text-primary) group-hover:text-[#4E82EE] transition-colors">
                  Assistance
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#4E82EE]/15 text-[#4E82EE]">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-(--text-muted) font-medium">
                Personal Life OS
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer md:hidden"
              title="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Navigation List ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        <div className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-(--text-muted)">
          Workspace Modules
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          const badge = getBadge(item.key);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key as any);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer group relative ${
                isActive
                  ? item.activeBg
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
              }`}
            >
              {/* Icon with Glowing Badge */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'bg-white/20 text-white' : `${item.bg} ${item.color}`
                }`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </div>

              {/* Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13.5px] font-semibold tracking-tight truncate ${
                    isActive ? 'text-white' : 'text-(--text-primary)'
                  }`}
                >
                  {item.title}
                </div>
                <div
                  className={`text-[11px] truncate font-normal ${
                    isActive ? 'text-white/80' : 'text-(--text-muted)'
                  }`}
                >
                  {item.subtitle}
                </div>
              </div>

              {/* Counter Badge */}
              {badge > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 shadow-2xs ${
                    isActive
                      ? 'bg-white text-slate-900'
                      : 'bg-(--bg-elevated) text-[#4E82EE] border border-[#4E82EE]/20'
                  }`}
                >
                  {badge}
                </span>
              )}

              {isActive && (
                <ChevronRight size={14} className="text-white/60 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Quick Tools Row (Glassmorphic Cards) ── */}
      <div className="p-3 pt-2 border-t border-(--border-subtle)/50 space-y-2 shrink-0 bg-(--bg-card)/30">
        <div className="text-[10px] font-bold uppercase tracking-wider text-(--text-muted) px-1">
          Quick Launch
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setLiveVoiceOpen(true);
              if (onClose) onClose();
            }}
            className="h-10 px-3 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 hover:bg-(--bg-elevated) text-(--text-primary) transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
          >
            <AudioLines size={15} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
            <span>Live Voice</span>
          </button>

          <button
            onClick={() => {
              setFocusTimerOpen(true);
              if (onClose) onClose();
            }}
            className="h-10 px-3 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-amber-500/50 hover:bg-(--bg-elevated) text-(--text-primary) transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
          >
            <Flame size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Focus 25m</span>
          </button>
        </div>

        {/* Cloud Sync Status Pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <Database size={13} className="shrink-0" />
            <span>MongoDB Cloud</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Synced
          </span>
        </div>
      </div>

      {/* ── Footer Profile & Settings ── */}
      <div className="shrink-0 p-3 border-t border-(--border-subtle) bg-(--bg-sidebar)">
        <button
          onClick={() => {
            setActiveTab('settings');
            if (onClose) onClose();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-(--bg-elevated) text-(--text-primary) shadow-sm'
              : 'hover:bg-(--bg-elevated)/80 text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-(--bg-sidebar)" />
          </div>

          {/* User Info */}
          <div className="text-left min-w-0 flex-1">
            <div className="text-[13px] font-bold truncate text-(--text-primary)">
              {user?.name || 'Personal Account'}
            </div>
            <div className="text-[11px] text-(--text-muted) truncate font-medium">
              System Settings & Backup
            </div>
          </div>

          <Settings size={17} className="text-(--text-muted) shrink-0 hover:rotate-45 transition-transform" />
        </button>
      </div>

    </aside>
  );
}
