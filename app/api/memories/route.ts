import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Memory } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memories = db.getMemories(user.id);
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, category, tags, type, pinned, projectId } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Memory content cannot be empty' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newMemory: Memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    content: content.trim(),
    type: type || 'personal',
    category: category || 'general',
    tags: tags || [],
    confidence: 1.0,
    pinned: pinned ?? false,
    projectId,
    createdAt: now,
    updatedAt: now,
  };

  const saved = db.saveMemory(newMemory);
  return NextResponse.json({ memory: saved }, { status: 201 });
}
