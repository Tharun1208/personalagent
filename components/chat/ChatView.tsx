'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch, safeJson } from '@/lib/api';
import MarkdownNoteRenderer from '@/components/notes/MarkdownNoteRenderer';
import { Message, Conversation } from '@/types';

const SUGGESTIONS = [
  'Summarize my tasks for today',
  'What is on my calendar this week?',
  'Add a task to pay the electricity bill tomorrow',
  'Remind me to call mom at 6pm',
  'How much do I owe people right now?',
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatView() {
  const {
    user,
    messages,
    setMessages,
    isSending,
    sendMessage,
    setActiveConversationId,
    activeConversationId,
    conversations,
    showToast,
  } = useApp() as any;

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages, isSending]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    await sendMessage(content);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    setActiveConversationId(null);
    if (setMessages) setMessages([]);
    setInput('');
    textareaRef.current?.focus();
    try {
      const res = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await safeJson(res);
      if (res.ok && data?.conversation?.id) {
        setActiveConversationId(data.conversation.id);
      }
    } catch {
      setActiveConversationId(null);
    }
  };

  const isEmpty = messages.length === 0;
  const greetingName = user?.name?.split(' ')?.[0] || 'there';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-8 py-3.5 border-b border-white/60 bg-white/70 backdrop-blur-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
            <Bot size={22} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                Assistance
              </h1>
            </div>
            <p className="text-[11px] font-medium text-slate-400 truncate">
              {activeConversationId
                ? conversations.find((c: Conversation) => c.id === activeConversationId)?.title || 'Conversation'
                : 'Autonomous AI Agent · Connected to your life'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="w-9 h-9 rounded-full bg-[#1C73E8] hover:bg-[#1557B0] text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
          title="New conversation"
          aria-label="New conversation"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 md:px-8 py-6"
      >
        <div className="max-w-3xl mx-auto w-full">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center text-center pt-10 sm:pt-16">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30"
              >
                <Bot size={32} className="stroke-[2.2]" />
              </motion.div>
              <h2 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
                Hi {greetingName}, how can I help?
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 max-w-md">
                I can manage your tasks, take notes, schedule events, track finances, and remember
                what matters to you.
              </p>


              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-[13px] font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg: Message) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isSending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot size={15} className="stroke-[2.2]" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 sm:px-6 md:px-8 pb-4 pt-2 bg-gradient-to-t from-white/90 via-white/50 to-transparent">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 p-1.5 pl-4 rounded-full bg-white border border-slate-200/90 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message your assistant..."
              className="flex-1 resize-none max-h-40 bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none custom-scrollbar"
              style={{ minHeight: '36px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="shrink-0 w-9.5 h-9.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/25"
              title="Send"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10.5px] font-medium text-slate-400">
            Your assistant can take real actions on your tasks, notes, calendar &amp; ledger.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] px-4 py-3 rounded-[22px] rounded-tr-sm bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="mt-1 text-[10px] text-white/70 text-right font-mono">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs">
        <Bot size={16} className="stroke-[2.2]" />
      </div>

      <div className="max-w-[85%] min-w-0">
        <div className="px-4.5 py-3.5 rounded-[22px] rounded-tl-sm bg-white border border-slate-200/80 shadow-2xs text-slate-900">
          <MarkdownNoteRenderer content={message.content} className="text-sm" />
        </div>

        <p className="mt-1 text-[10px] text-slate-400 font-mono">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
