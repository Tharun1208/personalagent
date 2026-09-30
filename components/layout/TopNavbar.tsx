'use client';

import React from 'react';
import {
  AlignLeft,
  SquarePen,
  Search,
  Bell,
  Mic,
  Timer,
  Plus,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface TopNavbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}

export default function TopNavbar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileMenu,
}: TopNavbarProps) {
  const {
    activeTab,
    setActiveTab,
    startNewChat,
    unreadNotificationCount,
    setNotificationDrawerOpen,
    setCommandPaletteOpen,
    setLiveVoiceOpen,
    setFocusTimerOpen,
    user,
  } = useApp();

  const getTabLabel = () => {
    switch (activeTab) {
      case 'chat':
        return 'Assistance';
      case 'calendar':
        return 'Calendar';
      case 'tasks':
        return 'Tasks';
      case 'habits':
        return 'Habits';
      case 'reminders':
        return 'Reminders';
      case 'goals':
        return 'Goals (OKRs)';
      case 'ledger':
        return 'Ledger';
      case 'dashboard':
        return 'Dashboard';
      case 'actions':
        return 'Audit Log';
      case 'settings':
        return 'Settings';
      default:
        return 'Assistance';
    }
  };

  return (
    <header className="h-14 md:h-16 px-3 sm:px-5 border-b border-(--border-subtle)/40 flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-xl z-30 select-none">
      {/* Left Area: Distinct Sidebar Toggle & Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Toggle Button with Sleek Styled Icon */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-all cursor-pointer shadow-2xs flex items-center justify-center group"
          title="Open Navigation Menu"
        >
          <AlignLeft size={18} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
        </button>

        {/* Desktop Sidebar Toggle (shown when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-all cursor-pointer shadow-2xs items-center justify-center mr-1 group"
            title="Expand Sidebar"
          >
            <AlignLeft size={18} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Branding */}
        <div
          onClick={() => {
            if (activeTab !== 'chat') {
              setActiveTab('chat');
            } else {
              startNewChat();
            }
          }}
          className="flex items-center cursor-pointer group"
        >
          <span className="font-bold text-base sm:text-lg tracking-tight text-(--text-primary) font-sans">
            Assistance
          </span>
        </div>

        {/* Quick New Chat Button */}
        <button
          onClick={() => {
            setActiveTab('chat');
            startNewChat();
          }}
          className="hidden sm:flex p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer ml-1"
          title="Start New Chat"
        >
          <SquarePen size={16} />
        </button>
      </div>

      {/* Right Action Icons & Profile Avatar */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Focus Timer Button */}
        <button
          onClick={() => setFocusTimerOpen(true)}
          className="p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
          title="Focus & Pomodoro Timer"
        >
          <Timer size={17} />
        </button>

        {/* Search (⌘K) Button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
          title="Search anything (⌘K)"
        >
          <Search size={17} />
        </button>

        {/* Notifications & Alarms Bell Button */}
        <button
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
          title="Alarms & Notifications"
        >
          <Bell size={17} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-(--bg-primary) animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-1 sm:pr-2.5 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 transition-all cursor-pointer shadow-2xs group"
          title={`Profile: ${user?.name || 'User'} (Click to open Profile Settings)`}
        >
          <div className="relative shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-2xs">
              {user?.name?.[0] ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-(--bg-card)" />
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-(--text-primary) max-w-[90px] truncate">
            {user?.name || 'User'}
          </span>
        </button>
      </div>
    </header>
  );
}
