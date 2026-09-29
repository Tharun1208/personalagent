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

const isNative = () => Capacitor.isNativePlatform();

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionGranted !== null) return permissionGranted;

  try {
    if (isNative()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        permissionGranted = req.display === 'granted';
      } else {
        permissionGranted = true;
      }
      // Register the default channel once (Android 13+ shows a channel toggle)
      await LocalNotifications.createChannel({
        id: 'assistance-reminders',
        name: 'Reminders & Alarms',
        description: 'Scheduled reminders, alarms and task due dates',
        importance: 10 as any, // IMPORTANCE_HIGH → heads-up display + sound
        vibration: true,
        sound: 'notify.wav',
        visibility: 1, // PUBLIC — show on lock screen
      }).catch(() => {});
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = await Notification.requestPermission();
      permissionGranted = p === 'granted';
    } else {
      permissionGranted = false;
    }
  } catch {
    permissionGranted = false;
  }
  return permissionGranted;
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
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const now = Date.now();
  const upcoming = items
    .filter((i) => new Date(i.fireAt).getTime() > now + 1000)
    .slice(0, 40); // Android practical limit safety

  if (upcoming.length === 0) return;

  try {
    if (isNative()) {
      await LocalNotifications.schedule({
        notifications: upcoming.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          schedule: { at: new Date(item.fireAt), allowWhileIdle: true },
          channelId: 'assistance-reminders',
          smallIcon: 'ic_launcher',
          largeIcon: '/logo.svg',
        })),
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // Browser fallback: fire-and-forget timers for the near future only
      upcoming.slice(0, 10).forEach((item) => {
        const delay = new Date(item.fireAt).getTime() - now;
        setTimeout(() => {
          try {
            new Notification(item.title, { body: item.body, icon: '/logo.svg' });
          } catch {}
        }, Math.min(delay, 2 ** 31 - 1));
      });
    }
  } catch (err) {
    console.warn('Notification scheduling failed:', err);
  }
}

/** Cancel a scheduled notification (e.g. reminder deleted/completed) */
export async function cancelNotification(id: number): Promise<void> {
  try {
    if (isNative()) {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    }
  } catch {}
}
