import { NextRequest, NextResponse, after } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { withTimeout } from '@/lib/server/timeout';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { Conversation, Message, ToolExecutionStep } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** DB warm-up must never gate the model call. */
const DB_READY_BUDGET_MS = 1500;

export async function POST(req: NextRequest) {
  // A slow/unreachable Atlas cluster should not delay the reply: hydrate with a
  // small budget and continue with whatever is already in the local mirror.
  await withTimeout(ensureDbReady().catch(() => undefined), DB_READY_BUDGET_MS);

  const user = auth.getUserFromRequest(req) || {
    id: 'usr_default_main',
    email: 'guest@assistance.ai',
  };

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { conversationId, message, attachments, timezone } = body || {};
  const trimmed = typeof message === 'string' ? message.trim() : '';
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!trimmed && !hasAttachments) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const effectivePrompt =
    trimmed ||
    (hasAttachments
      ? attachments.length === 1
        ? `Analyze this file: ${attachments[0]?.name || 'attachment'}`
        : 'Analyze these attached files.'
      : '');

  // Resolve or create the conversation
  let conv: Conversation | null = null;
  if (conversationId) {
    conv = db.getConversationById(conversationId, user.id);
  }
  if (!conv) {
    conv = {
      id: conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      title: effectivePrompt.slice(0, 36) + (effectivePrompt.length > 36 ? '...' : ''),
      pinned: false,
      model: (user as any).preferences?.model || 'Recall Core Ultra',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.createConversation(conv);
  }

  const userMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: conv.id,
    userId: user.id,
    role: 'user',
    content: effectivePrompt,
    attachments: hasAttachments ? attachments : undefined,
    createdAt: new Date().toISOString(),
  };
  db.createMessage(userMessage);
  // Writes are queued in the background — do NOT block inference on Mongo.
  after(() => flushDb().catch(() => undefined));

  let reply = '';
  let toolSteps: ToolExecutionStep[] = [];
  let memorySaved: any[] = [];
  let requiresConfirmation = false;
  let confirmationPayload: any = null;

  try {
    const result = await AgentOrchestrator.run({
      userId: user.id,
      conversationId: conv.id,
      userPrompt: effectivePrompt,
      model: conv.model,
      attachments: hasAttachments ? attachments : [],
      timezone: timezone || 'Asia/Kolkata',
    });
    reply = result.reply;
    toolSteps = result.toolSteps || [];
    memorySaved = result.memorySaved || [];
    requiresConfirmation = !!result.requiresConfirmation;
    confirmationPayload = result.confirmationPayload || null;
  } catch (err: any) {
    reply = `I ran into an issue while processing your request: ${err?.message || 'Please try again.'}`;
    toolSteps = [
      {
        toolName: 'AgentOrchestrator',
        action: 'run',
        input: { message: effectivePrompt },
        status: 'failed',
        output: { error: err?.message },
      },
    ];
  }

  const assistantMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: conv.id,
    userId: 'assistant',
    role: 'assistant',
    content: reply,
    toolSteps,
    memorySaved: memorySaved as any,
    createdAt: new Date().toISOString(),
  };
  db.createMessage(assistantMessage);
  after(() => flushDb().catch(() => undefined));

  return NextResponse.json({
    success: true,
    conversationId: conv.id,
    userMessage,
    assistantMessage,
    requiresConfirmation,
    confirmationPayload,
  });
}
