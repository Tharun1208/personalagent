'use client';

import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  CheckSquare,
  Sparkles,
  GitPullRequest,
  ArrowRight,
  Trash2,
} from 'lucide-react';
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

  if (!notificationDrawerOpen) return null;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock size={14} className="text-rose-500" />;
      case 'task_deadline':
        return <CheckSquare size={14} className="text-amber-500" />;
      case 'github':
        return <GitPullRequest size={14} className="text-purple-500" />;
      default:
        return <Sparkles size={14} className="text-[#4E82EE]" />;
    }
  };

  const handleAction = (notif: any) => {
    markNotificationRead(notif.id);
    if (notif.actionUrl === '/reminders') {
      setActiveTab('reminders');
    } else if (notif.actionUrl === '/tasks') {
      setActiveTab('tasks');
    }
    setNotificationDrawerOpen(false);
  };

  return (
    <div
      onClick={() => setNotificationDrawerOpen(false)}
      className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex justify-end animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-(--bg-card) border-l border-(--border-subtle) h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#4E82EE]" />
            <h2 className="font-semibold text-xs text-(--text-primary)">Notification Center</h2>
            {notifications.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-(--bg-elevated) text-(--text-muted) font-mono">
                {notifications.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && (
              <>
                {notifications.some((n) => !n.read) && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span>Read</span>
                  </button>
                )}
                <button
                  onClick={clearAllNotifications}
                  className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 size={13} />
                  <span>Clear All</span>
                </button>
              </>
            )}
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="p-1.5 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) rounded-lg cursor-pointer transition-colors ml-1"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Bell size={28} className="mx-auto text-(--text-muted) opacity-30" />
              <div className="text-xs font-medium text-(--text-primary)">No notifications</div>
              <p className="text-[11px] text-(--text-muted)">
                When scheduled reminders trigger, you will be notified here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleAction(notif)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 group relative ${
                  notif.read
                    ? 'bg-(--bg-secondary)/30 border-(--border-subtle) opacity-75 hover:opacity-100'
                    : 'bg-(--bg-elevated) border-[#4E82EE]/30 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-xs text-(--text-primary)">
                    {getNotifIcon(notif.type)}
                    {notif.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-(--text-muted)">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 rounded-md text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-(--text-secondary) leading-relaxed">
                  {notif.message}
                </p>

                {notif.actionUrl && (
                  <div className="pt-0.5 flex items-center gap-1 text-[11px] text-[#4E82EE] font-medium">
                    <span>View details</span>
                    <ArrowRight size={11} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
