'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  X,
  ArrowRight,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';

export default function NotificationDrawer() {
  const {
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    setActiveTab,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [showAllView, setShowAllView] = useState(false);

  if (!notificationDrawerOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const displayedNotifications = showAllView
    ? filteredNotifications
    : filteredNotifications.slice(0, 5);

  const getAvatarForNotif = (notif: any) => {
    const title = (notif.title || '').toLowerCase();
    const type = notif.type || '';

    if (title.includes('mom') || title.includes('mother')) {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-200',
        emoji: '👩',
      };
    }
    if (title.includes('dad') || title.includes('father')) {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-200',
        emoji: '👨',
      };
    }
    if (title.includes('pool') || title.includes('family') || title.includes('home') || title.includes('house')) {
      return {
        bg: 'bg-cyan-100 text-cyan-900 border-cyan-200',
        emoji: '🏠',
      };
    }
    if (title.includes('dog') || title.includes('pet') || title.includes('radouane') || title.includes('khiri')) {
      return {
        bg: 'bg-yellow-100 text-yellow-900 border-yellow-200',
        emoji: '🐶',
      };
    }
    if (type === 'reminder' || title.includes('reminder') || title.includes('alarm')) {
      return {
        bg: 'bg-rose-100 text-rose-900 border-rose-200',
        emoji: '⏰',
      };
    }
    if (type === 'task_deadline' || title.includes('task')) {
      return {
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        emoji: '📋',
      };
    }
    if (type === 'ledger' || title.includes('due') || title.includes('payment')) {
      return {
        bg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
        emoji: '💳',
      };
    }

    return {
      bg: 'bg-slate-100 text-slate-800 border-slate-200',
      emoji: '✨',
    };
  };

  const handleAction = (notif: any) => {
    markNotificationRead(notif.id);
    if (notif.actionUrl === '/reminders') {
      setActiveTab('calendar');
    } else if (notif.actionUrl === '/tasks') {
      setActiveTab('tasks');
    } else if (notif.actionUrl === '/ledger') {
      setActiveTab('ledger');
    }
    setNotificationDrawerOpen(false);
  };

  return (
    <div
      data-modal-backdrop="true"
      onClick={() => setNotificationDrawerOpen(false)}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-[32px] border border-slate-200/80 shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header matching Reference */}
        <div className="pt-6 px-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-[#1C1C1E] tracking-tight">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs sm:text-[13px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Segmented Tab Switcher (ALL / UNREAD) */}
        <div className="px-6 pb-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setShowAllView(false);
              }}
              className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('unread');
                setShowAllView(false);
              }}
              className={`flex-1 py-2 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeFilter === 'unread'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>UNREAD</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar max-h-[380px]">
          {displayedNotifications.length === 0 ? (
            <div className="py-14 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-2xl mx-auto mb-3 shadow-2xs">
                🔔
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeFilter === 'unread'
                  ? "You've read all your notifications."
                  : 'Important updates and scheduled reminders will appear here.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => {
              const avatar = getAvatarForNotif(notif);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleAction(notif)}
                  className={`px-6 py-4 flex items-center gap-3.5 transition-colors cursor-pointer group relative ${
                    !notif.read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  {/* Left Circular Avatar with 3D/Emoji Graphic */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 border ${avatar.bg} shadow-2xs relative`}
                  >
                    <span>{avatar.emoji}</span>
                    {!notif.read && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-blue-600 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Title & Message Preview */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Right Arrow Navigation Indicator */}
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight
                      size={18}
                      className="text-slate-700 group-hover:translate-x-1 group-hover:text-blue-600 transition-transform stroke-[2.2]"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: "See all" or "Clear all" */}
        {filteredNotifications.length > 5 && !showAllView ? (
          <div className="border-t border-slate-100 bg-slate-50/60 text-center">
            <button
              type="button"
              onClick={() => setShowAllView(true)}
              className="w-full py-3.5 text-xs sm:text-sm font-extrabold text-slate-800 hover:text-slate-950 hover:bg-slate-100/70 transition-colors cursor-pointer"
            >
              See all ({filteredNotifications.length})
            </button>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex items-center justify-between text-xs">
            {showAllView && (
              <button
                type="button"
                onClick={() => setShowAllView(false)}
                className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Show less
              </button>
            )}
            <button
              type="button"
              onClick={clearAllNotifications}
              className="font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
