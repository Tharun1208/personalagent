import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const conv = db.getConversationById(id, user.id);
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const messages = db.getMessages(id);
  return NextResponse.json({ conversation: conv, messages });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updated = db.updateConversation(id, user.id, body);
  if (!updated) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  return NextResponse.json({ conversation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ok = db.deleteConversation(id, user.id);
  return NextResponse.json({ success: ok });
}
