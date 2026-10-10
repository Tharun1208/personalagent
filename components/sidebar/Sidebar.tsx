'use client';

import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Wallet,
  Calendar,
  Bell,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Zap,
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
  badgeType?: 'tasks' | 'ledger' | 'notifications';
}

// ── Asklepios v3 Modern Navigation Modules ──
const MAIN_NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    title: 'Overview',
    subtitle: 'Daily focus & activity',
    icon: LayoutDashboard,
  },
  {
    key: 'tasks',
    title: 'Tasks & Goals',
    subtitle: 'Track your priorities',
    icon: CheckSquare,
    badgeType: 'tasks',
  },
  {
    key: 'notes',
    title: 'Notes & Journal',
    subtitle: 'Ideas and documents',
    icon: FileText,
  },
  {
    key: 'ledger',
    title: 'Ledger & Dues',
    subtitle: 'Finances & payables',
    icon: Wallet,
    badgeType: 'ledger',
  },
  {
    key: 'calendar',
    title: 'Calendar & Plan',
    subtitle: 'Events & reminders',
    icon: Calendar,
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Alerts & updates',
    icon: Bell,
    badgeType: 'notifications',
  },
];

export default function Sidebar({ onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    tasks,
    ledgerEntries,
    unreadNotificationCount,
    user,
  } = useApp();

  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingLedgerCount = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const getBadge = (badgeType?: 'tasks' | 'ledger' | 'notifications') => {
    if (badgeType === 'tasks') return pendingTaskCount;
    if (badgeType === 'ledger') return pendingLedgerCount;
    if (badgeType === 'notifications') return unreadNotificationCount;
    return 0;
  };

  return (
    <aside
      className={`h-full select-none shrink-0 flex flex-col font-sans transition-all duration-300 ease-in-out border-r border-slate-200/80 bg-white shadow-xs ${
        isCollapsed ? 'w-[76px]' : 'w-full md:w-[272px]'
      }`}
    >
      {/* ── Brand Header ── */}
      <div className="shrink-0 h-16 px-4 flex items-center justify-between border-b border-slate-100">
        {!isCollapsed ? (
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onClose) onClose();
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-slate-200/80 p-1 shadow-2xs shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Assistance"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              Assistance
            </span>
          </div>
        ) : (
          <div
            onClick={() => {
              setActiveTab('dashboard');
              if (onClose) onClose();
            }}
            className="w-full flex justify-center cursor-pointer group"
            title="Assistance"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/80 p-1 shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Assistance"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors md:hidden cursor-pointer"
            title="Close menu"
          >
            <X size={18} />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {onToggleCollapse && !onClose && (
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* ── Main Navigation ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {!isCollapsed && (
          <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Menu
          </div>
        )}

        {MAIN_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          const badge = getBadge(item.badgeType);
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key as any);
                if (onClose) onClose();
              }}
              title={isCollapsed ? item.title : undefined}
              className={`w-full flex items-center rounded-2xl transition-all duration-200 cursor-pointer group relative ${
                isCollapsed
                  ? 'h-12 justify-center'
                  : 'px-3.5 py-2.5 gap-3'
              } ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <div
                className={`flex items-center justify-center shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600 group-hover:scale-110'
                }`}
              >
                <Icon size={19} className="stroke-[2.2]" />
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[13.5px] truncate">
                      {item.title}
                    </div>
                    <div
                      className={`text-[10.5px] truncate ${
                        isActive ? 'text-indigo-100/90' : 'text-slate-400'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>

                  {badge > 0 && (
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 tracking-tight font-mono ${
                        isActive
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}

              {/* Collapsed dot badge */}
              {isCollapsed && badge > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── System Status Widget (Asklepios Soft Health & Sync Card) ── */}
      {!isCollapsed && (
        <div className="p-3 mx-3 mb-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-slate-600 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Database size={13} className="text-indigo-500" />
              Local Storage
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready
            </span>
          </div>
          <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full w-[100%]" />
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            100% offline-ready & private
          </p>
        </div>
      )}

      {/* ── Footer Profile & Settings ── */}
      <div className="shrink-0 p-3 border-t border-slate-100 bg-white">
        <button
          onClick={() => {
            setActiveTab('settings');
            if (onClose) onClose();
          }}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-2xl transition-all duration-200 cursor-pointer ${
            isCollapsed
              ? 'h-12 justify-center'
              : 'px-3 py-2.5 gap-3'
          } ${
            activeTab === 'settings'
              ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
              : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
          }`}
        >
          {/* Avatar with subtle gradient ring */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          {!isCollapsed && (
            <>
              <div className="text-left min-w-0 flex-1">
                <div className="text-[13px] font-bold truncate text-slate-900">
                  {user?.name || 'Personal Account'}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-medium">
                  Settings & Preferences
                </div>
              </div>

              <Settings
                size={17}
                className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform hover:rotate-45"
              />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
