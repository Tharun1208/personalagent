import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { ConversationModel, MessageModel } from '@/lib/db/models';
import { isMongoConfigured } from '@/lib/db/mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let conv = db.getConversationById(id, user.id);

  if (!conv && isMongoConfigured()) {
    try {
      const doc = await ConversationModel.findOne({ id }).lean();
      if (doc) {
        conv = JSON.parse(JSON.stringify(doc));
        if (conv) {
          conv.userId = user.id;
          db.createConversation(conv);
        }
      }
    } catch {}
  }

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  let messages = db.getMessages(id);
  if ((!messages || messages.length === 0) && isMongoConfigured()) {
    try {
      const msgDocs = await MessageModel.find({ conversationId: id }).sort({ createdAt: 1 }).lean();
      if (msgDocs && msgDocs.length > 0) {
        messages = msgDocs.map((m: any) => JSON.parse(JSON.stringify(m)));
      }
    } catch {}
  }

  return NextResponse.json({ conversation: conv, messages: messages || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updated = db.updateConversation(id, user.id, body);
  if (!updated) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  await flushDb();
  return NextResponse.json({ conversation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ok = db.deleteConversation(id, user.id);

  await flushDb();
  return NextResponse.json({ success: ok });
}
