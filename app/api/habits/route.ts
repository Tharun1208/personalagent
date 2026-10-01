import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Habit } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const habits = db.getHabits(user.id);
  return NextResponse.json({ habits });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, frequency = 'daily' } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const newHabit: Habit = {
    id: body.id || `habit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title.trim(),
    frequency,
    streak: 0,
    history: [],
    createdAt: new Date().toISOString(),
  };

  db.createHabit(newHabit);
  return NextResponse.json({ habit: newHabit }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, frequency, streak, toggle } = body;

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  if (toggle || (title === undefined && frequency === undefined && streak === undefined)) {
    const updated = db.toggleHabit(id, user.id);
    if (!updated) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    return NextResponse.json({ habit: updated });
  }

  const patch: Partial<Habit> = {};
  if (title !== undefined) patch.title = title.trim();
  if (frequency !== undefined) patch.frequency = frequency;
  if (streak !== undefined) patch.streak = Number(streak);

  const updated = db.updateHabit(id, user.id, patch);
  if (!updated) return NextResponse.json({ error: 'Habit not found' }, { status: 404 });

  return NextResponse.json({ habit: updated });
}

export async function DELETE(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const deleted = db.deleteHabit(id, user.id);
  return NextResponse.json({ success: deleted });
}
