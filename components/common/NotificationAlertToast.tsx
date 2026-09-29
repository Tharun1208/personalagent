'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlarmClock,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { AppNotification } from '@/types';
import { soundEngine } from '@/lib/audio/soundEngine';

let alarmIntervalId: any = null;

function startAlarmSound(tone: string = 'digital', volume: number = 0.8, customUrl?: string) {
  try {
    const play = () => soundEngine.playAlarm(tone, volume, customUrl);
    play();
    if (alarmIntervalId) clearInterval(alarmIntervalId);
    alarmIntervalId = setInterval(play, 2000);
  } catch (err) {
    console.warn('Alarm audio error', err);
  }
}

function stopAlarmSound() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  soundEngine.stopCustomAudio();
}

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

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Check unread notifications and pop them up as real native alerts
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read && !dismissedIds.has(n.id));
    if (unread.length > 0) {
      const newItems = unread.filter((n) => !activeAlerts.some((a) => a.id === n.id));
      if (newItems.length > 0) {
        setActiveAlerts((prev) => [...newItems, ...prev]);

        // Start loud looping alarm with user's selected tone
        startAlarmSound(
          user?.preferences?.alarmTone || 'digital',
          user?.preferences?.alarmVolume ?? 0.8,
          user?.preferences?.customAlarmUrl
        );

        // Native Haptic Vibration for Mobile
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          try {
            navigator.vibrate([250, 100, 250, 100, 400]);
          } catch {}
        }

        // Native OS Desktop & Mobile Push Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          newItems.forEach((item) => {
            try {
              new Notification(item.title || 'Assistance Alarm', {
                body: item.message,
                icon: '/logo.svg',
                badge: '/logo.svg',
                tag: item.id,
                requireInteraction: true,
              });
            } catch {
              // silent fallback
            }
          });
        }
      }
    } else if (activeAlerts.length === 0) {
      stopAlarmSound();
    }
  }, [notifications, dismissedIds, activeAlerts, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    const next = activeAlerts.filter((a) => a.id !== id);
    setActiveAlerts(next);
    markNotificationRead(id);
    if (next.length === 0) {
      stopAlarmSound();
    }
  };

  const handleComplete = (alert: AppNotification) => {
    // Try to find matching pending task to complete as well
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
    <div className="fixed top-3 sm:top-5 inset-x-3 sm:inset-x-0 mx-auto max-w-lg z-50 pointer-events-auto flex flex-col gap-2.5 animate-in slide-in-from-top-4 duration-250">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="w-full rounded-3xl bg-(--bg-card) border border-[#4E82EE]/40 shadow-2xl p-4 sm:p-5 text-(--text-primary) backdrop-blur-xl relative overflow-hidden"
        >
          {/* Top glowing ambient gradient banner */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] animate-pulse" />

          {/* Top Row: App Icon, Brand, Time, Close */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlarmClock size={18} className="animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight text-(--text-primary)">
                    Assistance Alarm
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                </div>
                <div className="text-[10px] text-(--text-muted) font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(alert.id)}
              className="p-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          {/* Alert Title & Message */}
          <div className="space-y-0.5 mb-3.5 pl-0.5">
            <h3 className="font-bold text-sm sm:text-base text-(--text-primary) leading-snug">
              {alert.title.replace(/^Reminder:\s*/i, '')}
            </h3>
            {alert.message && (
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                {alert.message}
              </p>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDismiss(alert.id)}
              className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
            >
              <VolumeX size={14} />
              <span>Stop</span>
            </button>

            <button
              onClick={() => handleSnooze(alert)}
              className="py-2 px-3 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCcw size={13} className="text-[#4E82EE]" />
              <span>Snooze 5m</span>
            </button>

            <button
              onClick={() => handleComplete(alert)}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
            >
              <CheckCircle2 size={13} />
              <span>Done</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
