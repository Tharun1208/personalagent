'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  RotateCcw,
  AlarmClock,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { AppNotification } from '@/types';
import { soundEngine } from '@/lib/audio/soundEngine';

export default function NotificationAlertToast() {
  const {
    user,
    notifications,
    markNotificationRead,
    createReminder,
    toggleTask,
    tasks,
  } = useApp();

  const [activeAlerts, setActiveAlerts] = useState<AppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const mountTimeRef = React.useRef<number>(Date.now());

  // Check unread notifications and pop them up as subtle top banner alerts
  useEffect(() => {
    const now = Date.now();
    const freshAlarms = notifications.filter((n) => {
      if (n.read || dismissedIds.has(n.id)) return false;
      if (n.type !== 'reminder' && !n.id.startsWith('notif_alarm_')) return false;
      if (n.id.startsWith('notif_missed_')) return false;

      const createdAt = new Date(n.createdAt).getTime();
      if (isNaN(createdAt)) return false;

      // Must be created in the last 60 seconds and after this session mounted
      const isRecent = now - createdAt < 60000;
      const isAfterMount = createdAt >= mountTimeRef.current - 5000;
      return isRecent && isAfterMount;
    });

    if (freshAlarms.length > 0) {
      const newItems = freshAlarms.filter((n) => !activeAlerts.some((a) => a.id === n.id));
      if (newItems.length > 0) {
        setActiveAlerts((prev) => [...newItems, ...prev]);

        // Play gentle chime sound once instead of loud continuous siren
        try {
          soundEngine.playAlarm('gentle', 0.5);
        } catch {}

        // Native OS Desktop & Mobile Push Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          newItems.forEach((item) => {
            try {
              new Notification(item.title || 'Reminder', {
                body: item.message,
                icon: '/icon.png',
                tag: item.id,
              });
            } catch {}
          });
        }
      }
    }
  }, [notifications, dismissedIds, activeAlerts, user]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
    markNotificationRead(id);
  };

  const handleComplete = (alert: AppNotification) => {
    const alertTitle = alert.title.toLowerCase();
    const matchedTask = tasks.find(
      (t) =>
        t.status !== 'completed' &&
        (alertTitle.includes(t.title.toLowerCase()) || t.title.toLowerCase().includes(alertTitle))
    );
    if (matchedTask) {
      toggleTask(matchedTask.id, matchedTask.status);
    }
    handleDismiss(alert.id);
  };

  const handleSnooze = (alert: AppNotification) => {
    const snoozeTime = new Date(Date.now() + 5 * 60000).toISOString();
    createReminder(`(Snoozed) ${alert.title.replace(/^Reminder:\s*/i, '')}`, snoozeTime, 'none');
    handleDismiss(alert.id);
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none space-y-2.5">
      {activeAlerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto w-full bg-(--bg-card) border border-(--border-subtle) rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 animate-in slide-in-from-top-6 duration-200 text-(--text-primary)"
        >
          {/* Squircle Alarm Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlarmClock size={20} />
          </div>

          {/* Alert Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">
                  Reminder Alarm
                </h4>
              </div>
              <span className="text-[10px] font-mono text-(--text-muted)">
                {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-sm font-bold text-(--text-primary) mt-1 truncate">
              {alert.title.replace(/^Reminder:\s*/i, '')}
            </div>

            {alert.message && (
              <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2 leading-relaxed">
                {alert.message}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-(--border-subtle)">
              <button
                type="button"
                onClick={() => handleSnooze(alert)}
                className="px-3 py-1.5 rounded-lg bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCcw size={12} className="text-amber-500" />
                <span>Snooze (5m)</span>
              </button>

              <button
                type="button"
                onClick={() => handleComplete(alert)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle2 size={12} />
                <span>Mark Done</span>
              </button>

              <button
                type="button"
                onClick={() => handleDismiss(alert.id)}
                className="ml-auto p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
