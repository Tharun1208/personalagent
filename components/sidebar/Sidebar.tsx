'use client';

import React, { useState } from 'react';
import {
  Plus,
  Pin,
  Trash2,
  Edit2,
  SquarePen,
  MoreHorizontal,
  X,
  ArrowUpRight,
  Settings,
  Mic,
  Timer,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingReminderCount = reminders.filter((r) => r.status === 'pending').length;
  const pendingLedgerCount = (ledgerEntries || []).filter((l) => l.status === 'pending').length;

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // STRATOTECH-style nav model: big label + sub items
  const NAV_SECTIONS = [
    {
      label: 'Workspace',
      items: [
        { key: 'chat', title: 'Chat', count: conversations.length },
        { key: 'dashboard', title: 'Daily Brief', count: 0 },
      ],
    },
    {
      label: 'Plan',
      items: [
        { key: 'tasks', title: 'Tasks', count: pendingTaskCount },
        { key: 'reminders', title: 'Alarms', count: pendingReminderCount },
        { key: 'goals', title: 'Goals', count: goals.length },
        { key: 'calendar', title: 'Calendar', count: 0 },
      ],
    },
    {
      label: 'Money',
      items: [{ key: 'ledger', title: 'Ledger & Dues', count: pendingLedgerCount }],
    },
  ];

  const renderNavItem = (item: { key: string; title: string; count: number }) => {
    const isActive = activeTab === item.key;
    return (
      <button
        key={item.key}
        onClick={() => {
          setActiveTab(item.key as any);
          if (onClose) onClose();
        }}
        className={`group w-full flex items-center justify-between py-1.5 text-left cursor-pointer transition-colors ${
          isActive ? 'text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`text-[15px] transition-all ${
              isActive ? 'font-semibold' : 'font-normal'
            }`}
          >
            {item.title}
          </span>
          {item.count > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-(--bg-elevated) text-(--text-secondary)">
              {item.count}
            </span>
          )}
        </span>
        <ArrowUpRight
          size={14}
          className={`shrink-0 transition-all duration-200 ${
            isActive
              ? 'text-[#4E82EE] opacity-100 translate-x-0'
              : 'text-(--text-muted) opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0'
          }`}
        />
      </button>
    );
  };

  return (
    <aside className="w-full md:w-72 bg-(--bg-sidebar) flex flex-col h-screen select-none shrink-0">
      {/* ── Header: brand + close ── */}
      <div className="shrink-0 h-16 px-5 flex items-center justify-between">
        <div
          onClick={() => {
            setActiveTab('chat');
            if (onClose) onClose();
          }}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-[#0c111d]">
            <img src="/logo.svg" alt="Assistance" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm tracking-wide text-(--text-primary) uppercase">
              Assistance
            </span>
            <span className="text-[9px] uppercase tracking-[0.12em] text-(--text-muted)">
              Personal AI Agent
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
            title="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Scrollable middle: everything between header and footer */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* New chat — pill like the reference "Contact" chip */}
        <div className="px-5 pt-2 pb-4">
          <button
            onClick={() => {
              startNewChat();
              if (onClose) onClose();
            }}
            className="w-full h-10 rounded-full bg-(--bg-elevated) hover:bg-[#4E82EE] hover:text-white text-(--text-primary) text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            New chat
          </button>
        </div>

        {/* ── Nav sections, STRATOTECH typography ── */}
        <nav className="px-5 space-y-6 pb-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <h2 className="text-[22px] font-bold tracking-tight text-(--text-primary) leading-tight mb-1">
                {section.label}
              </h2>
              <div className="space-y-0.5 pl-0.5">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}

          {/* Quick utilities row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                setLiveVoiceOpen(true);
                if (onClose) onClose();
              }}
              className="h-9 rounded-full border border-(--border-subtle) text-(--text-secondary) hover:border-[#4E82EE]/50 hover:text-[#4E82EE] transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Mic size={13} />
              Live Voice
            </button>
            <button
              onClick={() => {
                setFocusTimerOpen(true);
                if (onClose) onClose();
              }}
              className="h-9 rounded-full border border-(--border-subtle) text-(--text-secondary) hover:border-amber-500/50 hover:text-amber-600 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Timer size={13} />
              Focus 25m
            </button>
          </div>
        </nav>

        {/* ── Recent chats ── */}
        <div className="px-5 mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[22px] font-bold tracking-tight text-(--text-primary) leading-tight">
              History
            </h2>
            <span className="text-[11px] font-mono text-(--text-muted)">
              {conversations.length}
            </span>
          </div>

          {conversations.length === 0 ? (
            <p className="text-xs text-(--text-muted) py-4">
              No conversations yet — start one above.
            </p>
          ) : (
            <div className="space-y-0.5 pb-4">
              {conversations.map((c) => {
                const isSelected = activeTab === 'chat' && activeConversationId === c.id;
                const isMenuOpen = menuOpenId === c.id;

                if (editingId === c.id) {
                  return (
                    <form key={c.id} onSubmit={(e) => handleSaveRename(c.id, e)} className="py-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        onBlur={() => setEditingId(null)}
                        className="w-full px-2.5 py-1.5 text-xs bg-(--bg-card) border border-(--border-medium) rounded-lg focus:outline-none"
                      />
                    </form>
                  );
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConversationId(c.id);
                      setActiveTab('chat');
                      if (onClose) onClose();
                    }}
                    className={`group flex items-center justify-between gap-2 py-1.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'text-(--text-primary) font-medium'
                        : 'text-(--text-muted) hover:text-(--text-primary)'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                      {c.pinned && <Pin size={11} className="text-amber-500 shrink-0 rotate-45" />}
                      <span className="text-[13px] truncate">{c.title}</span>
                    </div>

                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId((prev) => (prev === c.id ? null : c.id));
                        }}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          isMenuOpen
                            ? 'text-(--text-primary) bg-(--bg-elevated)'
                            : 'text-(--text-muted) opacity-0 group-hover:opacity-100'
                        }`}
                        title="Chat options"
                      >
                        <MoreHorizontal size={13} />
                      </button>

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
                            className="absolute right-0 top-full mt-1 w-36 bg-(--bg-card) border border-(--border-subtle) rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-150"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                setEditingId(c.id);
                                setEditTitle(c.title);
                              }}
                              className="w-full px-3 py-2 text-left text-(--text-primary) hover:bg-(--bg-elevated) flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} className="text-[#4E82EE]" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                deleteConversation(c.id);
                              }}
                              className="w-full px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer profile, pinned bottom ── */}
      <div className="shrink-0 border-t border-(--border-subtle) px-5 py-3">
        <button
          onClick={() => {
            setActiveTab('settings');
            if (onClose) onClose();
          }}
          className={`w-full flex items-center justify-between py-1.5 cursor-pointer transition-colors ${
            activeTab === 'settings'
              ? 'text-(--text-primary)'
              : 'text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-(--border-subtle)"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-(--bg-sidebar)" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-sm font-semibold truncate text-(--text-primary)">
                {user?.name || 'User'}
              </div>
              <div className="text-[10px] text-(--text-muted) truncate">
                {user?.email || '—'}
              </div>
            </div>
          </div>
          <Settings size={16} className="text-(--text-muted) shrink-0" />
        </button>
      </div>
    </aside>
  );
}
