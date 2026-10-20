import { NextRequest, after } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { withTimeout } from '@/lib/server/timeout';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { Conversation, Message, ToolExecutionStep } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Long enough for a cold Atlas connection (TLS + auth) to finish, otherwise
 * the first message after a cold start answers "storage is offline" even when
 * the database is healthy.
 */
const DB_READY_BUDGET_MS = 8000;

/**
 * Newline-delimited JSON stream of chat events:
 *   { type: 'start', conversationId, userMessage }
 *   { type: 'delta', text }
 *   { type: 'done', assistantMessage, requiresConfirmation, confirmationPayload }
 *   { type: 'error', message }
 */
export async function POST(req: NextRequest) {
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
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const effectivePrompt =
    trimmed ||
    (hasAttachments
      ? attachments.length === 1
        ? `Analyze this file: ${attachments[0]?.name || 'attachment'}`
        : 'Analyze these attached files.'
      : '');

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
  after(() => flushDb().catch(() => undefined));

  const resolvedConversationId = conv.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const send = (payload: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        } catch {
          closed = true;
        }
      };

      // Flush headers + conversation metadata immediately (< 1s first paint).
      send({ type: 'start', conversationId: resolvedConversationId, userMessage });

      let streamedText = '';
      let emitted = false;

      let reply = '';
      let toolSteps: ToolExecutionStep[] = [];
      let memorySaved: any[] = [];
      let requiresConfirmation = false;
      let confirmationPayload: any = null;

      try {
        const result = await AgentOrchestrator.run({
          userId: user.id,
          conversationId: resolvedConversationId,
          userPrompt: effectivePrompt,
          model: conv!.model,
          attachments: hasAttachments ? attachments : [],
          timezone: timezone || 'Asia/Kolkata',
          onToken: (chunk: string) => {
            if (!chunk) return;
            emitted = true;
            streamedText += chunk;
            send({ type: 'delta', text: chunk });
          },
        });

        reply = result.reply || streamedText;
        toolSteps = result.toolSteps || [];
        memorySaved = result.memorySaved || [];
        requiresConfirmation = !!result.requiresConfirmation;
        confirmationPayload = result.confirmationPayload || null;

        // Non-LLM branches (fast tool replies) never stream — send them whole.
        if (!emitted) {
          send({ type: 'delta', text: reply });
        } else if (reply.startsWith(streamedText) && reply.length > streamedText.length) {
          const remainder = reply.slice(streamedText.length);
          streamedText += remainder;
          send({ type: 'delta', text: remainder });
        }
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
        if (!emitted) send({ type: 'delta', text: reply });
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId: resolvedConversationId,
        userId: 'assistant',
        role: 'assistant',
        content: reply,
        toolSteps,
        memorySaved: memorySaved as any,
        createdAt: new Date().toISOString(),
      };
      db.createMessage(assistantMessage);
      after(() => flushDb().catch(() => undefined));

      send({
        type: 'done',
        messageId: assistantMessage.id,
        assistantMessage,
        requiresConfirmation,
        confirmationPayload,
      });

      closed = true;
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
