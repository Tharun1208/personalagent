'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * OS-level notification support (like native apps).
 *
 * - Requests POST_NOTIFICATIONS permission (Android 13+) once
 * - Schedules reminders / task due dates as exact alarms — they fire even
 *   when the app is closed or the device is locked
 * - Idempotent: scheduling the same id+time twice does not duplicate
 *
 * Falls back to the Web Notification API inside browsers (the dev preview),
 * where exact alarms aren't available.
 */

let permissionGranted: boolean | null = null;

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    if (isNative()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          permissionGranted = req.display === 'granted';
        } else {
          permissionGranted = true;
        }
      } catch (permErr) {
        console.warn('LocalNotifications permission check failed:', permErr);
        permissionGranted = false;
      }

      // Register the default channel once with safe Android importance (5 = IMPORTANCE_HIGH)
      try {
        await LocalNotifications.createChannel({
          id: 'assistance-reminders',
          name: 'Reminders & Alarms',
          description: 'Scheduled reminders, alarms and task due dates',
          importance: 5, // Android IMPORTANCE_HIGH (valid 1-5)
          vibration: true,
          sound: 'notify.wav',
          visibility: 1, // PUBLIC — show on lock screen
        });
      } catch (channelErr) {
        console.warn('Channel creation error (ignored):', channelErr);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const p = await Notification.requestPermission();
        permissionGranted = p === 'granted';
      } catch {
        permissionGranted = false;
      }
    } else {
      permissionGranted = false;
    }
  } catch {
    permissionGranted = false;
  }
  return permissionGranted || false;
}

export interface ScheduledItem {
  /** Stable unique id (max 9 digits for Android int ids) */
  id: number;
  title: string;
  body: string;
  /** ISO timestamp when the notification should fire */
  fireAt: string;
}

/** Android int ids must fit in 31 bits — hash the string id deterministically */
export function notificationIdFromString(str: string): number {
  if (!str) return Math.floor(Math.random() * 1000000);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2000000000;
}

/**
 * Sync a list of upcoming items with the OS scheduler.
 * Cancels nothing (ids are stable), re-schedules everything in the future.
 */
export async function scheduleNotifications(items: ScheduledItem[]): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    const now = Date.now();
    const upcoming = (items || [])
      .filter((i) => i && i.fireAt && !isNaN(new Date(i.fireAt).getTime()) && new Date(i.fireAt).getTime() > now + 1000)
      .slice(0, 40); // Android practical limit safety

    if (upcoming.length === 0) return;

    if (isNative()) {
      try {
        await LocalNotifications.schedule({
          notifications: upcoming.map((item) => ({
            id: Number(item.id) || Math.floor(Math.random() * 1000000),
            title: String(item.title || 'Scheduled Reminder').slice(0, 100),
            body: String(item.body || 'Due now').slice(0, 200),
            schedule: { at: new Date(item.fireAt), allowWhileIdle: true },
            channelId: 'assistance-reminders',
            smallIcon: 'ic_launcher',
          })),
        });
      } catch (nativeErr) {
        console.warn('Native LocalNotifications.schedule failed:', nativeErr);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // Browser fallback: fire-and-forget timers for the near future only
      upcoming.slice(0, 10).forEach((item) => {
        const delay = new Date(item.fireAt).getTime() - now;
        setTimeout(() => {
          try {
            new Notification(item.title, { body: item.body });
          } catch {}
        }, Math.min(delay, 2 ** 31 - 1));
      });
    }
  } catch (err) {
    console.warn('Notification scheduling safe catch:', err);
  }
}

/** Cancel a scheduled notification (e.g. reminder deleted/completed) */
export async function cancelNotification(id: number): Promise<void> {
  try {
    if (isNative()) {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    }
  } catch (err) {
    console.warn('Notification cancellation error:', err);
  }
}
