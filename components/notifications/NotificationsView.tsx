'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  Search,
  ArrowRight,
  Trash2,
  CheckCheck,
  X,
  CheckSquare,
  Wallet,
  Calendar,
  Sparkles,
  Clock,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';

export default function NotificationsView() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    setActiveTab,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<'all' | 'unread' | 'reminder' | 'task' | 'ledger'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueNotifications = useMemo(() => {
    const map = new Map<string, any>();
    (notifications || []).forEach((n) => {
      if (n && n.id) map.set(n.id, n);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  const unreadCount = useMemo(
    () => uniqueNotifications.filter((n) => !n.read).length,
    [uniqueNotifications]
  );

  const filteredNotifications = useMemo(() => {
    return uniqueNotifications.filter((n) => {
      // Category filter
      if (activeCategory === 'unread' && n.read) return false;
      if (activeCategory === 'reminder') {
        const isReminder = n.type === 'reminder' || (n.title && n.title.toLowerCase().includes('reminder'));
        if (!isReminder) return false;
      }
      if (activeCategory === 'task') {
        const isTask = n.type === 'task_deadline' || (n.title && n.title.toLowerCase().includes('task'));
        if (!isTask) return false;
      }
      if (activeCategory === 'ledger') {
        const isLedger = n.type === 'ledger' || (n.title && (n.title.toLowerCase().includes('due') || n.title.toLowerCase().includes('payment') || n.title.toLowerCase().includes('spend')));
        if (!isLedger) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [uniqueNotifications, activeCategory, searchQuery]);

  const getCategoryMeta = (notif: any) => {
    const title = (notif.title || '').toLowerCase();
    const type = notif.type || '';

    if (type === 'reminder' || title.includes('reminder') || title.includes('schedule') || notif.actionUrl === '/reminders') {
      return {
        label: 'Schedule',
        icon: Calendar,
        bg: 'bg-blue-50 text-blue-600 border-blue-100',
        badgeBg: 'bg-blue-50 text-blue-700',
        actionText: 'View Schedule',
        targetTab: 'calendar',
      };
    }

    if (type === 'task_deadline' || title.includes('task') || title.includes('deadline') || notif.actionUrl === '/tasks') {
      return {
        label: 'Task',
        icon: CheckSquare,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        badgeBg: 'bg-emerald-50 text-emerald-700',
        actionText: 'Open Task',
        targetTab: 'tasks',
      };
    }

    if (type === 'ledger' || title.includes('due') || title.includes('payment') || title.includes('spend') || notif.actionUrl === '/ledger') {
      return {
        label: 'Finance',
        icon: Wallet,
        bg: 'bg-amber-50 text-amber-600 border-amber-100',
        badgeBg: 'bg-amber-50 text-amber-700',
        actionText: 'Check Ledger',
        targetTab: 'ledger',
      };
    }

    return {
      label: 'Assistant',
      icon: Sparkles,
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badgeBg: 'bg-indigo-50 text-indigo-700',
      actionText: 'Ask Assistant',
      targetTab: 'chat',
    };
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleAction = (notif: any) => {
    markNotificationRead(notif.id);
    const meta = getCategoryMeta(notif);
    if (meta.targetTab) {
      setActiveTab(meta.targetTab as any);
    }
  };

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread', badge: unreadCount > 0 ? unreadCount : undefined },
    { key: 'reminder', label: 'Reminders' },
    { key: 'task', label: 'Tasks' },
    { key: 'ledger', label: 'Ledger' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F9FA] overflow-y-auto no-scrollbar font-sans select-none">
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 space-y-5">

        {/* ── 1. Top Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1E] tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black shadow-xs">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Scheduled reminders, task deadlines, and financial updates
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Mark all as read"
              >
                <CheckCheck size={14} className="text-blue-600" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            {uniqueNotifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="p-2 rounded-xl bg-white border border-slate-200/90 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Clear all notifications"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Search Bar ── */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-200/90 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={18} />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── 3. Category Filter Chips ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key as any)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-[#1C1C1E] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <span>{cat.label}</span>
                {cat.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 4. Notification Items List ── */}
        <div className="space-y-3 pt-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center rounded-[32px] bg-white border border-slate-200/80 p-8 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <Bell size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {activeCategory === 'unread'
                  ? 'No unread notifications'
                  : searchQuery
                  ? 'No matching notifications'
                  : 'All caught up'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeCategory === 'unread'
                  ? 'You have reviewed all your alerts and scheduled updates.'
                  : searchQuery
                  ? `No notifications found matching "${searchQuery}".`
                  : 'New schedule reminders, due balances, and task deadlines will appear here.'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notif, index) => {
                const meta = getCategoryMeta(notif);
                const Icon = meta.icon;
                const isUnread = !notif.read;

                return (
                  <motion.div
                    key={`${notif.id}_${index}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => handleAction(notif)}
                    className={`p-4 sm:p-5 rounded-[26px] border transition-all cursor-pointer group relative shadow-2xs hover:shadow-xs ${
                      isUnread
                        ? 'bg-blue-50/30 border-blue-200/80'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Icon Avatar */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg} shadow-2xs group-hover:scale-105 transition-transform`}
                      >
                        <Icon size={20} className="stroke-[2.2]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.badgeBg}`}>
                              {meta.label}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock size={11} />
                              <span>{formatRelativeTime(notif.createdAt)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              title="Delete notification"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-sm font-extrabold text-[#1C1C1E] tracking-tight truncate group-hover:text-blue-600 transition-colors">
                          {notif.title}
                        </h4>

                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>

                        {/* Action Link Button */}
                        <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                          <span>{meta.actionText}</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
  );
}
