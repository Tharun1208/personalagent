import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Goal } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goals = db.getGoals(user.id);
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, title, description, notes, category, targetDate, milestones } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Goal title cannot be empty' }, { status: 400 });
  }

  const newGoal: Goal = {
    id: id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title.trim(),
    description: description?.trim() || undefined,
    notes: notes?.trim() || undefined,
    category: category || 'personal',
    targetDate: targetDate || undefined,
    progress: 0,
    milestones: Array.isArray(milestones) ? milestones : [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createGoal(newGoal);
  return NextResponse.json({ goal: newGoal }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, milestoneId, toggleMilestone, ...patch } = body;

  if (!id) {
    return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
  }

  if (toggleMilestone && milestoneId) {
    const updated = db.toggleGoalMilestone(id, milestoneId, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Goal or milestone not found' }, { status: 404 });
    }
    return NextResponse.json({ goal: updated });
  }

  const updated = db.updateGoal(id, user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  return NextResponse.json({ goal: updated });
}

export async function DELETE(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
  }

  const success = db.deleteGoal(id, user.id);
  return NextResponse.json({ success });
}
