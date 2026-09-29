import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Conversation } from '@/types';

export async function GET(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conversations = db.getConversations(user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, model, projectId } = await req.json();

  const newConv: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title || 'New Conversation',
    pinned: false,
    model: model || user.preferences.model || 'Recall Core Ultra',
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createConversation(newConv);
  return NextResponse.json({ conversation: newConv }, { status: 201 });
}
