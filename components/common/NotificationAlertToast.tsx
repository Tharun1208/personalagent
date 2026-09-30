'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  AlarmClock,
  Radio,
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
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live clock for mobile alarm screen
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

        // Start loud looping mobile alarm tone
        soundEngine.startLoudAlarmLoop(
          user?.preferences?.alarmTone || 'digital',
          user?.preferences?.alarmVolume ?? 1.0,
          user?.preferences?.customAlarmUrl
        );

        // Native Mobile Haptic Vibration loop
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          try {
            navigator.vibrate([400, 150, 400, 150, 600]);
          } catch {}
        }

        // Native OS Desktop & Mobile Push Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          newItems.forEach((item) => {
            try {
              new Notification(item.title || 'Assistance Alarm', {
                body: item.message,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: item.id,
                requireInteraction: true,
              });
            } catch {}
          });
        }
      }
    } else if (activeAlerts.length === 0) {
      soundEngine.stopLoudAlarmLoop();
    }
  }, [notifications, dismissedIds, activeAlerts, user]);

  // Periodic mobile vibration while ringing
  useEffect(() => {
    if (activeAlerts.length === 0) return;
    const vibInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try {
          navigator.vibrate([400, 150, 400, 150, 600]);
        } catch {}
      }
    }, 1800);
    return () => clearInterval(vibInterval);
  }, [activeAlerts.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopLoudAlarmLoop();
    };
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    const next = activeAlerts.filter((a) => a.id !== id);
    setActiveAlerts(next);
    markNotificationRead(id);
    if (next.length === 0) {
      soundEngine.stopLoudAlarmLoop();
    }
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

  // The primary active alarm
  const primaryAlert = activeAlerts[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-300">
      
      {/* Top Header: Brand & Dismiss */}
      <div className="w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
            Alarm Ringing
          </span>
        </div>
        <button
          onClick={() => handleDismiss(primaryAlert.id)}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X size={20} />
        </button>
      </div>

      {/* Center: Mobile Alarm Clock UI */}
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-6 my-auto">
        
        {/* Pulsing Animated Bell Ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full bg-rose-500/20 animate-ping" />
          <div className="absolute w-28 h-28 rounded-full bg-rose-500/30 animate-pulse" />
          <div className="relative w-22 h-22 rounded-full bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-2xl shadow-rose-500/50">
            <AlarmClock size={44} className="animate-bounce" />
          </div>
        </div>

        {/* Live Digital Clock Digits (Mobile Alarm Clock style) */}
        <div className="space-y-1">
          <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white drop-shadow-md">
            {currentTime || '09:00:00 AM'}
          </div>
          <div className="text-xs text-rose-300/80 font-medium tracking-wide">
            Assistance Mobile Alarm Clock
          </div>
        </div>

        {/* Alarm Title & Message */}
        <div className="space-y-2 px-4 max-w-sm">
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
            {primaryAlert.title.replace(/^Reminder:\s*/i, '')}
          </h2>
          {primaryAlert.message && (
            <p className="text-sm text-white/75 font-medium leading-relaxed">
              {primaryAlert.message}
            </p>
          )}
        </div>

        {/* Sound & Audio Visualizer Status */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md">
          <Volume2 size={15} className="text-rose-400 animate-pulse" />
          <span>Loud Alarm Tone Ringing</span>
        </div>
      </div>

      {/* Bottom: Mobile Touch Action Buttons */}
      <div className="w-full max-w-md space-y-3">
        {/* Big Stop Alarm Button (Full Width Mobile Style) */}
        <button
          onClick={() => handleDismiss(primaryAlert.id)}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-base tracking-wide transition-all shadow-xl shadow-rose-600/40 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer"
        >
          <VolumeX size={20} />
          <span>STOP ALARM</span>
        </button>

        {/* Snooze & Complete Row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSnooze(primaryAlert)}
            className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw size={15} className="text-amber-400" />
            <span>Snooze (5m)</span>
          </button>

          <button
            onClick={() => handleComplete(primaryAlert)}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-emerald-600/30"
          >
            <CheckCircle2 size={15} />
            <span>Done / Complete</span>
          </button>
        </div>
      </div>

    </div>
  );
}
