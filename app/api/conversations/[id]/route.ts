import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb, isStorageDegraded } from '@/lib/db';
import { ConversationModel, MessageModel } from '@/lib/db/models';
import { isMongoConfigured } from '@/lib/db/mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req) || {
    id: 'usr_default_main',
    email: 'guest@assistance.ai',
  };

  const { id } = await params;
  let conv = db.getConversationById(id, user.id);
  if (!conv) {
    conv = db.getConversationById(id, 'usr_primary_default');
  }

  if (!conv && isMongoConfigured()) {
    try {
      const doc = await ConversationModel.findOne({ id }).lean();
      if (doc) {
        conv = JSON.parse(JSON.stringify(doc));
        if (conv) {
          db.createConversation(conv);
        }
      }
    } catch {}
  }

  let messages = db.getMessages(id);
  if ((!messages || messages.length === 0) && isMongoConfigured()) {
    try {
      const msgDocs = await MessageModel.find({ conversationId: id }).sort({ createdAt: 1 }).lean();
      if (msgDocs && msgDocs.length > 0) {
        messages = msgDocs.map((m: any) => JSON.parse(JSON.stringify(m)));
      }
    } catch {}
  }

  // Resilient auto-recovery: if conversation document is missing, self-heal rather than 404ing
  if (!conv) {
    conv = {
      id,
      userId: user.id,
      title: messages && messages.length > 0 ? (messages[0].content?.slice(0, 40) || 'Conversation') : 'New Conversation',
      createdAt: (messages && messages[0]?.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: (user as any).preferences?.model || 'Recall Core Ultra',
      pinned: false,
    };
    db.createConversation(conv);
    await flushDb();
  }

  return NextResponse.json({ conversation: conv, messages: messages || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req) || {
    id: 'usr_default_main',
    email: 'guest@assistance.ai',
  };

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = db.updateConversation(id, user.id, body) || db.updateConversation(id, 'usr_primary_default', body);
  if (!updated) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  await flushDb();
  return NextResponse.json({ conversation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req) || {
    id: 'usr_default_main',
    email: 'guest@assistance.ai',
  };
  if (isStorageDegraded()) {
    return NextResponse.json({ error: 'Storage temporarily unavailable', success: false }, { status: 503 });
  }

  const { id } = await params;
  const ok = db.deleteConversation(id, user.id) || db.deleteConversation(id, 'usr_primary_default');

  await flushDb();
  return NextResponse.json({ success: ok });
}
