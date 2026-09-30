'use client';

import React, { useState } from 'react';
import {
  Plus,
  SquarePen,
  Pin,
  Trash2,
  Edit2,
  Check,
  MoreVertical,
  X,
  Settings,
  AudioLines,
  Flame,
  Sparkles,
  Compass,
  ListTodo,
  AlarmClock,
  Trophy,
  Calendar,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { renderTextWithIosEmojis } from '@/lib/utils/iosEmoji';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Modern & Sleek Nav Items (Pure Lucide Icons) ───────────────────────────
const NAV_ITEMS = [
  { key: 'chat',      title: 'Chat',            icon: Sparkles },
  { key: 'dashboard', title: 'Executive KPI',   icon: Compass },
  { key: 'tasks',     title: 'Tasks',           icon: ListTodo },
  { key: 'habits',    title: 'Habits & Streaks', icon: Flame },
  { key: 'reminders', title: 'Alarms & Alerts', icon: AlarmClock },
  { key: 'goals',     title: 'Goals & OKRs',    icon: Trophy },
  { key: 'calendar',  title: 'Calendar',        icon: Calendar },
  { key: 'ledger',    title: 'Ledger & Spending', icon: CreditCard },
] as const;

export default function Sidebar({ onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const {
    activeTab,
    setActiveTab,
    conversations,
    activeConversationId,
    setActiveConversationId,
    startNewChat,
    deleteConversation,
    renameConversation,
    tasks,
    reminders,
    goals,
    ledgerEntries,
    user,
    setLiveVoiceOpen,
    setFocusTimerOpen,
  } = useApp();

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editTitle, setEditTitle]   = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const pendingTaskCount     = tasks.filter((t) => t.status !== 'completed').length;
  const pendingReminderCount = reminders.filter((r) => r.status === 'pending').length;
  const pendingLedgerCount   = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const getBadge = (key: string) => {
    if (key === 'tasks')     return pendingTaskCount;
    if (key === 'reminders') return pendingReminderCount;
    if (key === 'ledger')    return pendingLedgerCount;
    if (key === 'goals')     return goals.length;
    return 0;
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) renameConversation(id, editTitle.trim());
    setEditingId(null);
  };

  return (
    <aside className="w-full md:w-[260px] bg-(--bg-sidebar) flex flex-col h-screen select-none shrink-0 border-r border-(--border-subtle) font-sans">
      
      {/* ── Top Header & New Chat ── */}
      <div className="shrink-0 p-3 space-y-2">
        {/* Brand & Mobile Close */}
        <div className="flex items-center justify-between px-1 h-9">
          <button
            onClick={() => {
              setActiveTab('chat');
              if (onClose) onClose();
            }}
            className="flex items-center cursor-pointer group"
          >
            <span className="font-bold text-base tracking-tight text-(--text-primary)">
              Assistance
            </span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer md:hidden"
              title="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* New Chat Button (ChatGPT style) */}
        <button
          onClick={() => {
            startNewChat();
            if (onClose) onClose();
          }}
          className="w-full h-10 px-3 rounded-xl bg-(--bg-card) hover:bg-(--bg-elevated) border border-(--border-subtle) hover:border-(--border-medium) text-(--text-primary) text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <SquarePen size={15} className="text-(--text-muted) group-hover:text-[#4E82EE] transition-colors" />
            <span>New chat</span>
          </div>
          <span className="text-[10px] font-mono text-(--text-muted) px-1.5 py-0.5 rounded bg-(--bg-elevated)">
            +
          </span>
        </button>
      </div>

      {/* ── Primary Navigation (Claude/ChatGPT clean list) ── */}
      <div className="px-2 py-1 space-y-0.5 shrink-0">
        {NAV_ITEMS.map(({ key, title, icon: Icon }) => {
          const isActive = activeTab === key;
          const badge = getBadge(key);

          return (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as any);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer group ${
                isActive
                  ? 'bg-(--bg-elevated) text-(--text-primary) font-semibold shadow-2xs'
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)/60 font-medium'
              }`}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-[#4E82EE]' : 'text-(--text-muted) group-hover:text-(--text-primary)'
                }`}
              />
              <span className="flex-1 truncate">{title}</span>
              {badge > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                    isActive
                      ? 'bg-[#4E82EE]/15 text-[#4E82EE]'
                      : 'bg-(--bg-elevated) text-(--text-muted)'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Subtle Divider ── */}
      <div className="px-4 py-2">
        <div className="h-px bg-(--border-subtle)/60" />
      </div>

      {/* ── Quick Tools Row ── */}
      <div className="px-2 grid grid-cols-2 gap-1.5 shrink-0">
        <button
          onClick={() => {
            setLiveVoiceOpen(true);
            if (onClose) onClose();
          }}
          className="h-8 px-2.5 rounded-lg bg-(--bg-card) border border-(--border-subtle) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-[#4E82EE] transition-all text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <AudioLines size={13} className="text-(--text-muted)" />
          <span>Live Voice</span>
        </button>
        <button
          onClick={() => {
            setFocusTimerOpen(true);
            if (onClose) onClose();
          }}
          className="h-8 px-2.5 rounded-lg bg-(--bg-card) border border-(--border-subtle) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-amber-500 transition-all text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Flame size={13} className="text-(--text-muted)" />
          <span>Focus 25m</span>
        </button>
      </div>

      {/* ── Recent Chats Section (ChatGPT / Claude style) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 mt-3 space-y-0.5">
        <div className="px-3 pt-1 pb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-(--text-muted) tracking-tight">
            Recent
          </span>
          <span className="text-[10px] font-mono text-(--text-muted)">
            {conversations.length}
          </span>
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-(--text-muted)">No chats yet</p>
          </div>
        ) : (
          conversations.map((c) => {
            const isSelected = activeTab === 'chat' && activeConversationId === c.id;

            if (editingId === c.id) {
              return (
                <form
                  key={c.id}
                  onSubmit={(e) => handleSaveRename(c.id, e)}
                  className="px-2 py-1 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 px-2.5 py-1 text-xs bg-(--bg-card) border border-[#4E82EE] rounded-lg focus:outline-none text-(--text-primary)"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/15 cursor-pointer"
                    title="Save"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded-md text-(--text-muted) hover:bg-(--bg-elevated) cursor-pointer"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </form>
              );
            }

            const isMenuOpen = menuOpenId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  setActiveTab('chat');
                  if (onClose) onClose();
                }}
                className={`group relative flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-(--bg-elevated) text-(--text-primary) font-semibold shadow-2xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)/60 font-normal'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                  {c.pinned && <Pin size={11} className="text-amber-500 shrink-0 rotate-45" />}
                  <span className="truncate">{renderTextWithIosEmojis(c.title)}</span>
                </div>

                {/* 3 Dots Options Button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === c.id ? null : c.id));
                    }}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      isMenuOpen
                        ? 'opacity-100 text-(--text-primary) bg-(--bg-card)'
                        : 'opacity-70 md:opacity-0 group-hover:opacity-100 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-card)'
                    }`}
                    title="Chat options"
                  >
                    <MoreVertical size={13} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(null);
                        }}
                      />
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 w-32 bg-(--bg-card) border border-(--border-subtle) rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            setEditingId(c.id);
                            setEditTitle(c.title);
                          }}
                          className="w-full px-3 py-1.5 text-left text-(--text-primary) hover:bg-(--bg-elevated) flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Edit2 size={12} className="text-[#4E82EE]" />
                          <span>Rename</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            deleteConversation(c.id);
                          }}
                          className="w-full px-3 py-1.5 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer User Profile (Claude / ChatGPT style) ── */}
      <div className="shrink-0 p-2 border-t border-(--border-subtle)/60">
        <button
          onClick={() => {
            setActiveTab('settings');
            if (onClose) onClose();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-(--bg-elevated) text-(--text-primary)'
              : 'hover:bg-(--bg-elevated)/70 text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-(--bg-sidebar)" />
          </div>

          {/* User Info (Name only, email removed) */}
          <div className="text-left min-w-0 flex-1">
            <div className="text-xs font-semibold truncate text-(--text-primary)">
              {user?.name || 'Personal Account'}
            </div>
          </div>

          <Settings size={15} className="text-(--text-muted) shrink-0 hover:rotate-45 transition-transform" />
        </button>
      </div>

    </aside>
  );
}
