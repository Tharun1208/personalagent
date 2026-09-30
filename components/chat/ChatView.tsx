'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Clock,
  CheckSquare,
  FolderGit2,
  Globe,
  GitPullRequest,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Send,
  Zap,
  PanelLeftOpen,
  PanelLeftClose,
  SquarePen,
  Search,
  Bell,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Code2,
  Mic,
  Timer,
  Calendar,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Message, ToolExecutionStep } from '@/types';
import ChatComposer from './ChatComposer';
import { renderTextWithIosEmojis, renderChildrenWithIosEmoji } from '@/lib/utils/iosEmoji';

export default function ChatView() {
  const {
    messages,
    isSending,
    sendMessage,
    startNewChat,
    currentConversation,
    user,
    confirmAction,
    unreadNotificationCount,
    setNotificationDrawerOpen,
    setCommandPaletteOpen,
    setLiveVoiceOpen,
    setFocusTimerOpen,
    setActiveTab,
  } = useApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Groq Llama 3.3');

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`]/g, ''));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackMap((prev) => ({
      ...prev,
      [id]: prev[id] === type ? (null as any) : type,
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Messages Thread Canvas */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-28 sm:pb-32 space-y-8 custom-scrollbar">
        {messages.length === 0 ? (
          /* Gemini Empty State / Hero Screen */
          <div className="max-w-3xl mx-auto min-h-[50vh] flex flex-col justify-center text-left space-y-8 animate-in fade-in duration-300">
            {/* Gemini Iconic Greeting */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight">
                <span className="bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] bg-clip-text text-transparent">
                  Hello, {user?.name || 'there'}
                </span>
              </h1>
              <div className="text-3xl sm:text-4xl md:text-5xl font-medium text-[#c4c7c5] dark:text-[#727775]">
                How can I help you today?
              </div>
            </div>

            {/* Compact suggestion chips */}
            <div className="flex flex-wrap gap-2 w-full pt-2">
              {[
                {
                  icon: '⏰',
                  label: 'Task & alarm',
                  desc: 'task is to complete the UID assignment\ndue is today 6pm\npriority is high\nand remind me at 6pm',
                },
                {
                  icon: '📅',
                  label: "Today's date & time",
                  desc: "What is today's date, day, and current time?",
                },
                {
                  icon: '📋',
                  label: 'Pending tasks',
                  desc: 'Show all my current tasks and scheduled alarms',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(item.desc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 hover:bg-(--bg-elevated) transition-all text-left cursor-pointer shadow-2xs"
                >
                  <span className="text-[13px]">{item.icon}</span>
                  <span className="text-xs font-medium text-(--text-secondary) group-hover:text-(--text-primary)">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Render Messages */
          messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`max-w-3xl mx-auto flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                } group animate-in fade-in duration-150`}
              >
                {/* User Message Bubble */}
                {isUser ? (
                  <div className="max-w-[85%] md:max-w-[75%] px-5 py-3.5 rounded-[24px] bg-(--bg-bubble-user) text-(--text-primary) text-[16px] leading-[1.65] font-normal shadow-2xs">
                    {/* Attachments pills if any */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {msg.attachments.map((att) => {
                          const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(att.name);
                          const isPdf = att.type === 'application/pdf' || att.name?.toLowerCase().endsWith('.pdf');
                          const src = att.url || att.content;

                          if (isImg && src) {
                            return (
                              <div key={att.id} className="relative group/img overflow-hidden rounded-xl border border-(--border-subtle) bg-black/5 max-w-[240px]">
                                <img
                                  src={src}
                                  alt={att.name}
                                  className="max-h-48 w-auto object-cover rounded-xl"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 truncate">
                                  {att.name}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={att.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs font-medium shadow-2xs"
                            >
                              {isPdf ? (
                                <FileText size={15} className="text-red-500 shrink-0" />
                              ) : (
                                <Paperclip size={14} className="text-(--text-muted) shrink-0" />
                              )}
                              <span className="truncate max-w-[180px] text-(--text-primary)">{att.name}</span>
                              {isPdf && (
                                <span className="text-[10px] uppercase font-bold text-red-500/80 bg-red-500/10 px-1.5 py-0.2 rounded">
                                  PDF
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{renderTextWithIosEmojis(msg.content)}</div>
                  </div>
                ) : (
                  /* Assistant Message Clean Gemini Layout */
                  <div className="w-full flex items-start gap-4">
                    {/* Gemini Sparkle 4-point Icon */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4E82EE]/20 via-[#9B72CF]/20 to-[#F27878]/20 border border-[#4E82EE]/30 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                      <Sparkles size={16} className="text-[#4E82EE] dark:text-[#a8c7fa]" />
                    </div>

                    <div className="flex-1 min-w-0 text-(--text-primary) space-y-3">
                      {/* Memory Saved Badge */}
                      {msg.memorySaved && msg.memorySaved.length > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--memory-badge-bg) border border-(--memory-badge-border) text-(--memory-badge-text) text-xs font-medium">
                          <CheckCircle2 size={15} />
                          <span>Saved to memory: "{renderTextWithIosEmojis(msg.memorySaved[0].content)}"</span>
                        </div>
                      )}

                      {/* Clean Markdown Body */}
                      <div className="prose-recall leading-[1.75]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p({ children, ...props }: any) {
                              return <p {...props}>{renderChildrenWithIosEmoji(children)}</p>;
                            },
                            li({ children, ...props }: any) {
                              return <li {...props}>{renderChildrenWithIosEmoji(children)}</li>;
                            },
                            h1({ children, ...props }: any) {
                              return <h1 {...props}>{renderChildrenWithIosEmoji(children)}</h1>;
                            },
                            h2({ children, ...props }: any) {
                              return <h2 {...props}>{renderChildrenWithIosEmoji(children)}</h2>;
                            },
                            h3({ children, ...props }: any) {
                              return <h3 {...props}>{renderChildrenWithIosEmoji(children)}</h3>;
                            },
                            strong({ children, ...props }: any) {
                              return <strong {...props}>{renderChildrenWithIosEmoji(children)}</strong>;
                            },
                            em({ children, ...props }: any) {
                              return <em {...props}>{renderChildrenWithIosEmoji(children)}</em>;
                            },
                            span({ children, ...props }: any) {
                              return <span {...props}>{renderChildrenWithIosEmoji(children)}</span>;
                            },
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');

                              if (!inline && match) {
                                return (
                                  <CodeBlock
                                    language={match[1]}
                                    value={codeString}
                                  />
                                );
                              }
                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                    {/* Action Confirmation Safeguard Card */}
                    {msg.toolSteps?.some((s) => s.status === 'requires_confirmation') && (
                      <div className="p-4 rounded-2xl bg-(--bg-card) border border-amber-500/30 text-(--text-primary) space-y-3 mt-3 shadow-xs">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          <ShieldAlert size={18} />
                          <span>Action Confirmation Required</span>
                        </div>
                        <p className="text-xs text-(--text-secondary) leading-relaxed">
                          This tool requires your explicit confirmation before making changes.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => confirmAction('GitHubTool', 'createPullRequest', {}, true)}
                            className="px-4 py-2 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 cursor-pointer shadow-xs transition-opacity"
                          >
                            Confirm & Execute
                          </button>
                          <button
                            onClick={() => confirmAction('GitHubTool', 'createPullRequest', {}, false)}
                            className="px-4 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium hover:bg-(--bg-card) cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Assistant Action Bar */}
                    <div className="flex items-center gap-1 text-(--text-muted) text-xs pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="p-1.5 hover:text-(--text-primary) rounded-lg hover:bg-(--bg-elevated) cursor-pointer transition-colors"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                      </button>

                      <button
                        onClick={() => handleSpeak(msg.content, msg.id)}
                        className={`p-1.5 rounded-lg hover:bg-(--bg-elevated) cursor-pointer transition-colors ${
                          speakingId === msg.id ? 'text-indigo-600' : 'hover:text-(--text-primary)'
                        }`}
                        title="Read aloud"
                      >
                        {speakingId === msg.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>

                      <button
                        onClick={() => handleFeedback(msg.id, 'up')}
                        className={`p-1.5 rounded-lg hover:bg-(--bg-elevated) cursor-pointer transition-colors ${
                          feedbackMap[msg.id] === 'up' ? 'text-emerald-600' : 'hover:text-(--text-primary)'
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp size={15} />
                      </button>

                      <button
                        onClick={() => handleFeedback(msg.id, 'down')}
                        className={`p-1.5 rounded-lg hover:bg-(--bg-elevated) cursor-pointer transition-colors ${
                          feedbackMap[msg.id] === 'down' ? 'text-rose-600' : 'hover:text-(--text-primary)'
                        }`}
                        title="Bad response"
                      >
                        <ThumbsDown size={15} />
                      </button>

                      <button
                        onClick={() => sendMessage(msg.content)}
                        className="p-1.5 hover:text-(--text-primary) rounded-lg hover:bg-(--bg-elevated) cursor-pointer transition-colors"
                        title="Regenerate response"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
            );
          })
        )}

        {/* Streaming / Thinking State */}
        {isSending && (
          <div className="max-w-3xl mx-auto flex items-center gap-3 animate-in fade-in">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center font-bold text-xs shadow-xs animate-pulse">
              <Sparkles size={14} />
            </div>
            <div className="text-sm text-(--text-muted) flex items-center gap-2">
              <span className="font-medium">Assistance is processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Composer with Gradient Mask */}
      <div className="absolute bottom-0 left-0 right-0 composer-gradient-fade pt-2 pb-1.5 sm:pb-2.5 px-3 sm:px-4 md:px-6 pointer-events-none z-10">
        <div className="pointer-events-auto">
          <ChatComposer onSendMessage={sendMessage} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}

/* Custom Markdown CodeBlock with Copy Code Button */
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="chat-code-block">
      <div className="chat-code-header">
        <span className="font-mono">{language || 'code'}</span>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>
      <div className="chat-code-content">
        <pre className="!bg-transparent !p-0 !m-0 !border-none">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}
