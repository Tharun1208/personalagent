import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { sendTelegramAlert } from '@/lib/notifications/telegram';

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady().catch(() => {});
    const user = auth.getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ notifications: [] });
    }

    // Auto-check for triggered reminders safely
    try {
      const reminders = db.getReminders(user.id) || [];
      const existingNotifs = db.getNotifications(user.id) || [];
      const now = new Date().getTime();

      for (const rem of reminders) {
        if (rem && rem.status === 'pending' && rem.dueDateTime) {
          const dueTime = new Date(rem.dueDateTime).getTime();
          if (!isNaN(dueTime) && dueTime <= now) {
            const notifId = `notif_rem_${rem.id}`;
            const alreadyExists = existingNotifs.some(
              (n) => n.id === notifId || n.id.startsWith(`notif_rem_${rem.id}`)
            );

            db.updateReminder(rem.id, user.id, {
              status: 'triggered',
              lastTriggeredAt: new Date().toISOString(),
            });

            if (!alreadyExists) {
              db.createNotification({
                id: notifId,
                userId: user.id,
                title: rem.title || 'Reminder',
                message: rem.notes || `Your reminder "${rem.title || 'Reminder'}" is due now!`,
                type: 'reminder',
                read: false,
                actionUrl: '/reminders',
                createdAt: new Date().toISOString(),
              });

              if (user.preferences?.telegramBotToken && user.preferences?.telegramChatId) {
                sendTelegramAlert({
                  botToken: user.preferences.telegramBotToken,
                  chatId: user.preferences.telegramChatId,
                  title: rem.title || 'Reminder',
                  message: rem.notes || `Your reminder "${rem.title || 'Reminder'}" is due now!`,
                  type: 'reminder',
                }).catch(() => {});
              }
            }
          }
        }
      }
    } catch (reminderError) {
      console.warn('Reminder check warning in notifications route:', reminderError);
    }

    const notifications = db.getNotifications(user.id) || [];
    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ notifications: [], error: error?.message || 'Internal Error' }, { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, markAll } = body || {};

    if (markAll) {
      db.markAllNotificationsRead(user.id);
      try {
        const reminders = db.getReminders(user.id) || [];
        reminders.forEach((r) => {
          if (r.status === 'triggered') {
            db.updateReminder(r.id, user.id, { status: 'dismissed' });
          }
        });
      } catch {}
      await flushDb();
      return NextResponse.json({ success: true });
    }

    if (id) {
      db.markNotificationRead(id, user.id);

      try {
        if (id.startsWith('notif_rem_') || id.startsWith('notif_alarm_') || id.startsWith('notif_missed_')) {
          const remId = id.replace(/^(notif_rem_|notif_alarm_|notif_missed_)/, '').split('_')[0];
          if (remId) {
            db.updateReminder(remId, user.id, { status: 'dismissed' });
          }
        }

        const notifications = db.getNotifications(user.id) || [];
        const targetNotif = notifications.find((n) => n.id === id);
        if (targetNotif && targetNotif.type === 'reminder') {
          const cleanTitle = (targetNotif.title || '').replace(/^Reminder:\s*/i, '').trim().toLowerCase();
          const reminders = db.getReminders(user.id) || [];
          reminders.forEach((r) => {
            if (
              r.status !== 'dismissed' &&
              (r.title.toLowerCase().trim() === cleanTitle ||
                cleanTitle.includes(r.title.toLowerCase().trim()) ||
                r.title.toLowerCase().trim().includes(cleanTitle))
            ) {
              db.updateReminder(r.id, user.id, { status: 'dismissed' });
            }
          });
        }
      } catch {}

      await flushDb();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', success: false }, { status: 200 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      db.deleteNotification(id, user.id);
    } else {
      db.clearAllNotifications(user.id);
    }

    await flushDb();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/notifications:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', success: false }, { status: 200 });
  }
}
