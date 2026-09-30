import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Task } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = db.getTasks(user.id);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, title, description, priority, dueDate, projectId, tags } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Task title cannot be empty' }, { status: 400 });
  }

  const newTask: Task = {
    id: id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title.trim(),
    description,
    status: 'todo',
    priority: priority || 'medium',
    dueDate,
    projectId,
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };

  db.createTask(newTask);
  return NextResponse.json({ task: newTask }, { status: 201 });
}
