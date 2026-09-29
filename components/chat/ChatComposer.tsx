'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Plus,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { MessageAttachment } from '@/types';

import { Trie, TrieNodeValue } from '@/lib/dsa/Trie';

// Initialize global DSA Trie for O(L) slash command lookups
const slashTrie = new Trie<{ template: string; action?: string }>();
slashTrie.insert('/task', { template: 'task is to ' }, 'Create a new task with priority and deadline', 'CheckSquare');
slashTrie.insert('/alarm', { template: 'set an alarm at ' }, 'Schedule an alarm or reminder alert', 'Clock');
slashTrie.insert('/brief', { template: 'generate my daily executive brief and schedule summary' }, 'Synthesize today\'s schedule and overview', 'Sparkles');
slashTrie.insert('/ledger', { template: 'lent $ with ' }, 'Log a debt or receivable with a friend', 'CreditCard');
slashTrie.insert('/date', { template: 'what is today\'s date, day, and current local time?' }, 'Check real-world date, day, and time', 'Calendar');
slashTrie.insert('/clear', { template: 'clear' }, 'Start a fresh conversation session', 'RotateCcw');
slashTrie.insert('/help', { template: 'what can you do and what tools are available?' }, 'Explore all assistant features', 'Brain');

interface ChatComposerProps {
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => void;
  disabled?: boolean;
}

export default function ChatComposer({ onSendMessage, disabled }: ChatComposerProps) {
  const { user, startNewChat } = useApp();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestions, setSuggestions] = useState<TrieNodeValue[]>([]);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Instant Trie Slash Command Lookup
  useEffect(() => {
    if (input.startsWith('/')) {
      const matched = slashTrie.getSuggestions(input, 6);
      setSuggestions(matched);
      setSelectedSlashIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [input]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setInput((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Recording start error', err);
      }
    }
  };

  // Clipboard Paste (Ctrl+V) for instant image/file attachment
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1 || item.type.indexOf('pdf') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const resultStr = event.target?.result as string;
            const newAtt: MessageAttachment = {
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: file.name || `Pasted_Image_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
              type: file.type || 'image/png',
              size: file.size,
              url: resultStr,
              content: resultStr,
            };
            setAttachments((prev) => [...prev, newAtt]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultStr = event.target?.result as string;
        const newAtt: MessageAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          type: file.type || (isPdf ? 'application/pdf' : isImg ? 'image/jpeg' : 'document'),
          size: file.size,
          url: resultStr,
          content: resultStr,
        };
        setAttachments((prev) => [...prev, newAtt]);
      };

      // Read as Data URL (Base64) for images, PDFs, and binary docs
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const selectSlashCommand = (item: TrieNodeValue) => {
    if (item.key === '/clear') {
      startNewChat();
      setInput('');
      setSuggestions([]);
      return;
    }
    setInput(item.data?.template || `${item.key} `);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || disabled) return;

    if (input.trim() === '/clear') {
      startNewChat();
      setInput('');
      setSuggestions([]);
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    onSendMessage(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    setSuggestions([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && suggestions[selectedSlashIndex])) {
        e.preventDefault();
        selectSlashCommand(suggestions[selectedSlashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* File Attachments Pill Bar */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 w-full px-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs shadow-2xs"
            >
              {att.url ? (
                <ImageIcon size={14} className="text-(--text-muted)" />
              ) : (
                <FileText size={14} className="text-(--text-muted)" />
              )}
              <span className="max-w-[180px] truncate font-medium text-(--text-primary)">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 hover:text-red-500 rounded cursor-pointer ml-1 text-(--text-muted)"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Dictation Active Banner */}
      {isRecording && (
        <div className="flex items-center justify-between w-full px-4 py-2 mb-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span>Listening... speak naturally</span>
          </div>
          <button
            onClick={toggleRecording}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium cursor-pointer hover:bg-rose-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Trie-Powered Instant Slash Commands Autocomplete Menu */}
      {suggestions.length > 0 && (
        <div className="w-full mb-2 bg-(--bg-card) border border-(--border-subtle) rounded-2xl shadow-xl overflow-hidden p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-1 text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider flex items-center justify-between border-b border-(--border-subtle)/40 mb-1">
            <span>⚡ Instant Commands (Trie O(L))</span>
            <span className="text-[10px] lowercase font-normal opacity-70">↑↓ to navigate, tab/enter to select</span>
          </div>
          <div className="space-y-0.5">
            {suggestions.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectSlashCommand(item)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs ${
                  idx === selectedSlashIndex
                    ? 'bg-[#4E82EE]/15 text-[#4E82EE] font-medium'
                    : 'hover:bg-(--bg-elevated) text-(--text-primary)'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-[#4E82EE]">{item.key}</span>
                  <span className="text-(--text-muted) text-xs">{item.description}</span>
                </div>
                <span className="text-[10px] text-(--text-muted) font-mono opacity-60">select ↵</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The Iconic Gemini Capsule Input — compact */}
      <div className="w-full rounded-[22px] bg-(--bg-composer) border border-(--border-composer) shadow-sm focus-within:border-[#4E82EE]/50 focus-within:ring-2 focus-within:ring-[#4E82EE]/15 transition-all px-2 py-1 flex flex-col backdrop-blur-xl">
        {/* Textarea Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask Assistance anything or type '/' for commands..."
          rows={1}
          disabled={disabled}
          className="w-full px-2.5 pt-1.5 pb-0.5 text-[14px] bg-transparent border-none resize-none focus:outline-none placeholder:text-(--text-muted) leading-[1.5] max-h-[120px] custom-scrollbar text-(--text-primary)"
        />

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-0.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />

            {/* Plus / Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              title="Add images or files"
            >
              <Plus size={16} />
            </button>

            {/* Voice Dictation Mic */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
              }`}
              title={isRecording ? 'Stop voice recording' : 'Use microphone'}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Right Circular Send / Loading Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={(!input.trim() && attachments.length === 0) || disabled}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              disabled
                ? 'bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white shadow-sm cursor-wait'
                : input.trim() || attachments.length > 0
                ? 'bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white hover:opacity-95 shadow-sm cursor-pointer'
                : 'bg-transparent text-(--text-muted) opacity-40 cursor-not-allowed'
            }`}
            title={disabled ? 'Assistance is thinking...' : 'Send prompt'}
          >
            {disabled ? (
              <Loader2 size={16} className="animate-spin text-white" strokeWidth={2.5} />
            ) : (
              <ArrowUp size={16} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Assistance Disclaimer Footer */}
      <div className="text-[10px] text-(--text-muted) text-center mt-1 tracking-tight font-normal">
        Assistance can make mistakes. Verify important information.
      </div>
    </div>
  );
}
