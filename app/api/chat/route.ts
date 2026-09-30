import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { Message, Conversation } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req) || {
      id: 'usr_default_main',
      name: 'User',
      email: 'user@assistance.ai',
      preferences: {
        model: 'Recall Core Ultra',
        theme: 'dark',
        accentColor: '#4E82EE',
        codeTheme: 'default',
        fontSize: 'medium',
        notificationsEnabled: true,
      },
    };


    const { conversationId: rawConvId, message: userPromptRaw, model, attachments } = await req.json();

    const userPrompt = userPromptRaw?.trim() || (attachments && attachments.length > 0 ? (attachments.length === 1 ? `Please analyze this attached file: ${attachments[0].name}` : 'Please analyze these attached files.') : '');

    if (!userPrompt) {
      return NextResponse.json({ error: 'Message content or file attachment is required' }, { status: 400 });
    }

    let conversationId = rawConvId;

    // 1. Ensure conversation exists or create new one
    let conv = conversationId ? db.getConversationById(conversationId, user.id) : null;
    if (!conv) {
      // Auto-generate title from first prompt
      const title = userPrompt.trim().slice(0, 42) + (userPrompt.length > 42 ? '...' : '');
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      conv = {
        id: conversationId,
        userId: user.id,
        title,
        pinned: false,
        model: model || user.preferences?.model || 'Recall Core Ultra',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.createConversation(conv);
    }

    // 2. Save User Message
    const userMsg: Message = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      userId: user.id,
      role: 'user',
      content: userPrompt.trim(),
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
    };
    db.createMessage(userMsg);

    // 3. Run Agent Orchestrator
    const agentResult = await AgentOrchestrator.run({
      userId: user.id,
      conversationId,
      userPrompt: userPrompt.trim(),
      model: model || conv.model,
      attachments,
    });

    // 4. Save Assistant Message with Tool Steps and Memory Badges
    const assistantMsg: Message = {
      id: `msg_ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      userId: user.id,
      role: 'assistant',
      content: agentResult.reply,
      toolSteps: agentResult.toolSteps,
      memorySaved: agentResult.memorySaved,
      createdAt: new Date().toISOString(),
    };
    db.createMessage(assistantMsg);

    const res = NextResponse.json({
      success: true,
      conversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      requiresConfirmation: agentResult.requiresConfirmation,
      confirmationPayload: agentResult.confirmationPayload,
    });

    if (!req.cookies.get(auth.getCookieName())?.value) {
      const token = auth.signToken({ userId: user.id, email: user.email || 'user@recall.ai' });
      res.cookies.set(auth.getCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 86400,
        path: '/',
      });
    }

    return res;
  } catch (error: any) {
    console.error('Chat API error:', error);
    const fallbackId = `conv_${Date.now()}`;
    const fallbackAssistantMsg: Message = {
      id: `msg_ast_${Date.now()}`,
      conversationId: fallbackId,
      userId: 'usr_main',
      role: 'assistant',
      content: `I encountered an unexpected issue while communicating with the model, but your workspace is intact. Please try sending your message again!`,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({
      success: true,
      conversationId: fallbackId,
      assistantMessage: fallbackAssistantMsg,
      userMessage: {
        id: `msg_user_${Date.now()}`,
        conversationId: fallbackId,
        userId: 'usr_main',
        role: 'user',
        content: 'Query',
        createdAt: new Date().toISOString(),
      },
    }, { status: 200 });
  }
}
