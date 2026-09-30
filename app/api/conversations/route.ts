import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { ConversationModel, MessageModel } from '@/lib/db/models';
import { isMongoConfigured } from '@/lib/db/mongodb';
import { Conversation } from '@/types';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req) || { id: 'usr_default_main', email: 'guest@assistance.ai' };
  const isGuest = !user || user.id === 'usr_default_main' || user.id.includes('guest') || user.email?.includes('guest');

  let conversations = db.getConversations(user.id);

  if (isMongoConfigured()) {
    try {
      const filter = isGuest
        ? {
            $or: [
              { userId: user.id },
              { userId: 'usr_default_main' },
              { userId: { $regex: /guest/i } },
              { userId: { $exists: false } },
            ],
          }
        : {
            $or: [{ userId: user.id }, { userId: { $exists: false } }],
          };

      const mongoDocs = await ConversationModel.find(filter)
        .sort({ updatedAt: -1 })
        .lean();

      if (mongoDocs && mongoDocs.length > 0) {
        const enriched = await Promise.all(
          mongoDocs.map(async (c: any) => {
            const count = await MessageModel.countDocuments({ conversationId: c.id });
            const lastMsg = (await MessageModel.findOne({ conversationId: c.id })
              .sort({ createdAt: -1 })
              .lean()) as any;
            return {
              ...JSON.parse(JSON.stringify(c)),
              messageCount: count,
              lastMessageSnippet: lastMsg ? lastMsg.content?.slice(0, 75) : undefined,
            };
          })
        );
        conversations = enriched;
      }
    } catch {}
  }

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, model, projectId } = await req.json();

  const newConv: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: title || 'New Conversation',
    pinned: false,
    model: model || user.preferences?.model || 'Recall Core Ultra',
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.createConversation(newConv);
  await flushDb();
  return NextResponse.json({ conversation: newConv }, { status: 201 });
}
