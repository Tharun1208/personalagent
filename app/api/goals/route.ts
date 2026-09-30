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

  try {
    const { id, title, description, category, targetDate, milestones } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Goal title cannot be empty' }, { status: 400 });
    }

    const goalMilestones = Array.isArray(milestones)
      ? milestones.map((m: any, idx: number) => ({
          id: m.id || `m_${Date.now()}_${idx}`,
          title: m.title || '',
          completed: Boolean(m.completed),
          targetDate: m.targetDate,
        }))
      : [];

    const completedMilestones = goalMilestones.filter((m: any) => m.completed).length;
    const progress = goalMilestones.length > 0 ? Math.round((completedMilestones / goalMilestones.length) * 100) : 0;

    const newGoal: Goal = {
      id: id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      title: title.trim(),
      description: description || '',
      category: category || 'personal',
      targetDate,
      progress,
      milestones: goalMilestones,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = db.createGoal(newGoal);
    return NextResponse.json({ goal: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create goal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, milestoneId, toggleMilestone, ...patch } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    if (toggleMilestone && milestoneId) {
      const updated = db.toggleGoalMilestone(id, milestoneId, user.id);
      if (!updated) return NextResponse.json({ error: 'Goal or milestone not found' }, { status: 404 });
      return NextResponse.json({ goal: updated });
    }

    const updated = db.updateGoal(id, user.id, patch);
    if (!updated) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    return NextResponse.json({ goal: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });

  const success = db.deleteGoal(id, user.id);
  return NextResponse.json({ success });
}
