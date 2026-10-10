'use client';

import React from 'react';
import {
  AlignLeft,
  Search,
  Bell,
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
    unreadNotificationCount,
    setNotificationDrawerOpen,
    setCommandPaletteOpen,
    user,
  } = useApp();

  return (
    <header className="h-14 md:h-16 px-3.5 sm:px-6 border-b border-(--border-subtle)/50 flex items-center justify-between shrink-0 bg-(--bg-primary)/90 backdrop-blur-xl z-30 select-none">
      {/* Left Area: Distinct Sidebar Toggle & Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-2xl bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-all cursor-pointer shadow-2xs flex items-center justify-center active:scale-95 group"
          title="Open Navigation Menu"
        >
          <AlignLeft size={18} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
        </button>

        {/* Desktop Sidebar Toggle (shown when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-2 rounded-2xl bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-all cursor-pointer shadow-2xs items-center justify-center mr-1 group active:scale-95"
            title="Expand Sidebar"
          >
            <AlignLeft size={18} className="text-[#4E82EE] group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Branding */}
        <div
          onClick={() => {
            setActiveTab('dashboard');
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
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Assistance
          </span>
        </div>
      </div>

      {/* Right Action Icons & Profile Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search (⌘K) Button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer active:scale-95"
          title="Search anything (⌘K)"
        >
          <Search size={17} />
        </button>

        {/* Notifications Bell Button */}
        <button
          onClick={() => setActiveTab('notifications')}
          className={`relative p-2 rounded-xl transition-colors cursor-pointer active:scale-95 ${
            activeTab === 'notifications'
              ? 'text-blue-600 bg-blue-50'
              : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
          }`}
          title="Notifications & Updates"
        >
          <Bell size={17} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-(--bg-primary) animate-pulse" />
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-1 sm:pr-3 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 transition-all cursor-pointer shadow-2xs group active:scale-95"
          title={`Profile: ${user?.name || 'User'} (Click to open Settings)`}
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
