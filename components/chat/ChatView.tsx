'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Plus,
  Loader2,
  ArrowLeft,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  History,
  Trash2,
  Search,
  MessageSquare,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch, safeJson } from '@/lib/api';
import MarkdownNoteRenderer from '@/components/notes/MarkdownNoteRenderer';
import TaskConfirmationCard from './TaskConfirmationCard';
import { Message, Conversation, MessageAttachment } from '@/types';

const SUGGESTIONS = [
  'Summarize my tasks for today',
  'What is on my calendar this week?',
  'Add a task to pay the electricity bill tomorrow',
  'Remind me to call mom at 6pm',
  'How much do I owe people right now?',
];

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB (base64 payload stays within API limits)
const MAX_ATTACHMENTS = 5;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatConversationDate(iso?: string): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isSupportedAttachment(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.type.startsWith('image/') ||
    file.type.startsWith('text/') ||
    /\.(pdf|png|jpe?g|webp|gif|txt|md|csv|json)$/i.test(file.name)
  );
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
    deleteConversation,
    showToast,
    setActiveTab,
  } = useApp() as any;

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages, isSending]);

  const sortedConversations: Conversation[] = useMemo(() => {
    return [...((conversations || []) as Conversation[])].sort((a, b) => {
      const aKey = a.updatedAt || a.createdAt || '';
      const bKey = b.updatedAt || b.createdAt || '';
      return bKey.localeCompare(aKey);
    });
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter((c) => (c.title || 'New Chat').toLowerCase().includes(q));
  }, [sortedConversations, historyQuery]);

  const handleSend = async () => {
    const content = input.trim();
    if ((!content && attachments.length === 0) || isSending || isReadingFiles) return;
    const outgoing = attachments;
    setInput('');
    setAttachments([]);
    await sendMessage(content, outgoing.length > 0 ? outgoing : undefined);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsReadingFiles(true);
    const accepted: MessageAttachment[] = [];

    for (const file of files) {
      if (!isSupportedAttachment(file)) {
        showToast(`${file.name}: unsupported file type`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showToast(`${file.name} is larger than 3 MB`, 'error');
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        accepted.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
          size: file.size,
          url: dataUrl,
          content: dataUrl,
        });
      } catch {
        showToast(`${file.name} could not be read`, 'error');
      }
    }

    if (accepted.length > 0) {
      setAttachments((prev) => {
        const merged = [...prev, ...accepted];
        if (merged.length > MAX_ATTACHMENTS) {
          showToast(`Up to ${MAX_ATTACHMENTS} files per message`, 'info');
        }
        return merged.slice(0, MAX_ATTACHMENTS);
      });
      textareaRef.current?.focus();
    }
    setIsReadingFiles(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleNewChat = async () => {
    setActiveConversationId(null);
    if (setMessages) setMessages([]);
    setInput('');
    setAttachments([]);
    setShowHistory(false);
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

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (typeof deleteConversation === 'function') {
      await deleteConversation(id);
      showToast('Conversation deleted', 'info');
    }
  };

  const isEmpty = messages.length === 0;
  const greetingName = user?.name?.split(' ')?.[0] || 'there';
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isSending && !isReadingFiles;

  return (
    <div className="relative flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-8 py-3.5 border-b border-white/60 bg-white/70 backdrop-blur-2xl flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="md:hidden p-2 -ml-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft size={19} className="stroke-[2.2]" />
          </button>
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              showHistory
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
            title="Chat history"
            aria-label="Chat history"
          >
            <History size={17} strokeWidth={2.2} />
          </button>
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
      </div>

      {/* Chat history drawer (scoped to the AI tab) */}
      {showHistory && (
        <>
          <div
            className="absolute inset-0 bg-slate-900/20 z-20 backdrop-blur-[1px]"
            onClick={() => setShowHistory(false)}
          />
          <aside className="absolute top-0 left-0 bottom-0 w-76 max-w-[85%] z-30 bg-white border-r border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="shrink-0 px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-slate-500" />
                <h2 className="text-sm font-extrabold text-slate-900">Chat History</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {sortedConversations.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                aria-label="Close history"
              >
                <X size={16} />
              </button>
            </div>

            <div className="shrink-0 px-3 pt-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 transition-colors cursor-pointer mb-1"
              >
                <Plus size={15} /> New chat
              </button>

              {filteredConversations.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <p className="text-xs font-semibold text-slate-500">
                    {sortedConversations.length === 0 ? 'No conversations yet' : 'No matches'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {sortedConversations.length === 0
                      ? 'Start chatting and your history will appear here.'
                      : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const active = conversation.id === activeConversationId;
                  return (
                    <div
                      key={conversation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectConversation(conversation.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelectConversation(conversation.id);
                      }}
                      className={`group w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        active ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <MessageSquare size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{conversation.title || 'New Chat'}</p>
                        <p className={`text-[10px] mt-0.5 ${active ? 'text-white/60' : 'text-slate-400'}`}>
                          {formatConversationDate(conversation.updatedAt || conversation.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, conversation.id)}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                          active ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}

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
                I can manage your tasks, take notes, read PDFs and images, schedule events, track
                finances, and remember what matters to you.
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
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs max-w-full"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    {att.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold text-slate-800 truncate max-w-[160px]">
                      {att.name}
                    </span>
                    <span className="block text-[9px] text-slate-400">{formatFileSize(att.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    aria-label={`Remove ${att.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 p-1.5 pl-2 rounded-full bg-white border border-slate-200/90 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*,.pdf,.txt,.md,.csv,.json"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFiles || isSending || attachments.length >= MAX_ATTACHMENTS}
              className="shrink-0 w-9 h-9 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
              title="Attach a PDF, image, or text file"
              aria-label="Attach a file"
            >
              {isReadingFiles ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={attachments.length > 0 ? 'Ask about the attached file...' : 'Message your assistant...'}
              className="flex-1 resize-none max-h-40 bg-transparent py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none custom-scrollbar"
              style={{ minHeight: '36px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="shrink-0 w-9.5 h-9.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/25"
              title="Send"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[10.5px] font-medium text-slate-400">
            Attach PDFs, images, or text files · Your assistant can take real actions on your tasks,
            notes, calendar &amp; ledger.
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
        <div className="max-w-[80%] min-w-0">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end mb-1.5">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 border border-blue-100 text-blue-700 shadow-2xs"
                >
                  {att.type.startsWith('image/') ? <ImageIcon size={11} /> : <FileText size={11} />}
                  <span className="text-[10px] font-bold truncate max-w-[150px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 rounded-[22px] rounded-tr-sm bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
            <p className="mt-1 text-[10px] text-white/70 text-right font-mono">
              {formatTime(message.createdAt)}
            </p>
          </div>
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

          {message.confirmation && (
            <TaskConfirmationCard
              toolName={message.confirmation.toolName}
              action={message.confirmation.action}
              payload={message.confirmation.payload}
            />
          )}
        </div>

        <p className="mt-1 text-[10px] text-slate-400 font-mono">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
