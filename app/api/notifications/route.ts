import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { sendTelegramAlert } from '@/lib/notifications/telegram';

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized', notifications: [] }, { status: 401 });

    // Auto-check for triggered reminders
    const reminders = db.getReminders(user.id) || [];
    const now = new Date().getTime();
    for (const rem of reminders) {
      if (rem && rem.status === 'pending' && rem.dueDateTime) {
        const dueTime = new Date(rem.dueDateTime).getTime();
        if (!isNaN(dueTime) && dueTime <= now) {
          db.updateReminder(rem.id, user.id, { status: 'triggered' });
          db.createNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

    const notifications = db.getNotifications(user.id) || [];
    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', notifications: [] }, { status: 500 });
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
      return NextResponse.json({ success: true });
    }

    if (id) {
      db.markNotificationRead(id, user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/notifications:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
