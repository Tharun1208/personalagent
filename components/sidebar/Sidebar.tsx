'use client';

import React from 'react';
import {
  AudioLines,
  Flame,
  Settings,
  X,
  Database,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Target,
  FileText,
  Wallet,
  Boxes,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

// ── Nav Items with Lucide Icons & Theme Gradients ─────────────
const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    title: 'Executive KPI',
    subtitle: 'Daily overview & metrics',
    icon: LayoutDashboard,
    gradient: 'from-blue-600 to-cyan-500',
    glow: 'shadow-blue-500/25',
  },
  {
    key: 'chat',
    title: 'AI Intelligence',
    subtitle: 'Assistant & voice brain',
    icon: Sparkles,
    gradient: 'from-purple-600 via-indigo-600 to-pink-500',
    glow: 'shadow-purple-500/25',
  },
  {
    key: 'tasks',
    title: 'Tasks & Todos',
    subtitle: 'Action items & priorities',
    icon: CheckSquare,
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/25',
  },
  {
    key: 'habits',
    title: 'Habits & Streaks',
    subtitle: 'Daily routine tracker',
    icon: Flame,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-500/25',
  },
  {
    key: 'goals',
    title: 'Goals & Strategic OKRs',
    subtitle: 'Objectives & milestones',
    icon: Target,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'shadow-cyan-500/25',
  },
  {
    key: 'notes',
    title: 'Notes & Documents',
    subtitle: 'Drafts, research & exports',
    icon: FileText,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/25',
  },
  {
    key: 'ledger',
    title: 'Ledger & Spending',
    subtitle: 'Dues & daily expenses',
    icon: Wallet,
    gradient: 'from-emerald-600 to-teal-600',
    glow: 'shadow-teal-500/25',
  },
  {
    key: 'calendar',
    title: 'Calendar & Schedule',
    subtitle: 'Events & timeline',
    icon: Calendar,
    gradient: 'from-indigo-600 to-blue-600',
    glow: 'shadow-indigo-500/25',
  },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    tasks,
    goals,
    ledgerEntries,
    user,
    setLiveVoiceOpen,
    setFocusTimerOpen,
  } = useApp();

  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingLedgerCount = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const getBadge = (key: string) => {
    if (key === 'tasks') return pendingTaskCount;
    if (key === 'ledger') return pendingLedgerCount;
    if (key === 'goals') return goals.length;
    return 0;
  };

  return (
    <aside className="w-full md:w-[275px] bg-(--bg-sidebar) flex flex-col h-full select-none shrink-0 border-r border-(--border-subtle) font-sans overflow-hidden">
      
      {/* ── Brand Header ── */}
      <div className="shrink-0 p-4 pb-3 border-b border-(--border-subtle)/50">
        <div className="flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onClose) onClose();
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="font-bold text-lg tracking-tight text-(--text-primary) group-hover:text-[#4E82EE] transition-colors">
              Assistance
            </span>
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

      {/* ── Main Navigation List (Scrollable on mobile & desktop) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="px-3 pt-0.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer group relative ${
                isActive
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-md ${item.glow}`
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
              }`}
            >
              {/* Clean Lucide Icon */}
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <Icon
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${
                    isActive
                      ? 'text-white'
                      : 'text-(--text-secondary) group-hover:text-(--text-primary)'
                  }`}
                />
              </div>

              {/* Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13.5px] font-bold tracking-tight truncate ${
                    isActive ? 'text-white' : 'text-(--text-primary)'
                  }`}
                >
                  {item.title}
                </div>
                <div
                  className={`text-[11px] truncate font-medium ${
                    isActive ? 'text-white/85' : 'text-(--text-muted)'
                  }`}
                >
                  {item.subtitle}
                </div>
              </div>

              {/* Counter Badge */}
              {badge > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0 shadow-xs ${
                    isActive
                      ? 'bg-white text-slate-900'
                      : 'bg-(--bg-elevated) text-[#4E82EE] border border-[#4E82EE]/30'
                  }`}
                >
                  {badge}
                </span>
              )}

              {isActive && (
                <ChevronRight size={15} className="text-white/80 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Quick Tools Row ── */}
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
            <span>Focus Timer</span>
          </button>
        </div>

        {/* Cloud Sync Status Pill */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <Database size={13} className="shrink-0" />
            <span>Database</span>
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
