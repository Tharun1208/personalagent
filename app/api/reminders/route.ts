import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Reminder } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reminders = db.getReminders(user.id);
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, dueDateTime, recurrence, priority, notes, projectId } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Reminder title cannot be empty' }, { status: 400 });
  }

  const newReminder: Reminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title.trim(),
    dueDateTime: dueDateTime || new Date(Date.now() + 3600000).toISOString(),
    recurrence: recurrence || 'none',
    priority: priority || 'medium',
    notes,
    projectId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.createReminder(newReminder);
  return NextResponse.json({ reminder: newReminder }, { status: 201 });
}
