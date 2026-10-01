'use client';

import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Flame,
  Wallet,
  Calendar,
  Settings,
  Menu,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface MobileTabBarProps {
  onOpenMobileMenu: () => void;
}

export default function MobileTabBar({ onOpenMobileMenu }: MobileTabBarProps) {
  const { activeTab, setActiveTab, tasks, ledgerEntries } = useApp();

  const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
  const pendingLedger = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const tabs = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      key: 'chat',
      label: 'AI Brain',
      icon: Sparkles,
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: pendingTasks,
    },
    {
      key: 'habits',
      label: 'Habits',
      icon: Flame,
    },
    {
      key: 'ledger',
      label: 'Ledger',
      icon: Wallet,
      badge: pendingLedger,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-(--bg-card)/90 backdrop-blur-xl border-t border-(--border-subtle)/60 px-2 py-1.5 flex items-center justify-around select-none safe-area-bottom shadow-lg">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 touch-manipulation ${
              isActive
                ? 'text-[#4E82EE]'
                : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            {/* Active Pill Glow */}
            {isActive && (
              <span className="absolute -top-1 w-7 h-1 rounded-full bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] shadow-xs shadow-blue-500/50" />
            )}

            <div className="relative">
              <Icon
                size={21}
                className={`transition-transform duration-200 ${
                  isActive ? 'scale-110 text-[#4E82EE]' : ''
                }`}
              />

              {/* Badge Counter */}
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-xs">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              ) : null}
            </div>

            <span
              className={`text-[10px] font-semibold mt-0.5 tracking-tight ${
                isActive ? 'font-bold text-[#4E82EE]' : 'text-(--text-muted)'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
