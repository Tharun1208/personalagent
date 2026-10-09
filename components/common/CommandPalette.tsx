'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckSquare,
  Clock,
  Settings,
  ArrowRight,
  FileText,
  Calendar,
  HandCoins,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

export default function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveTab,
    tasks,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const actions = [
    {
      id: 'nav_dashboard',
      title: 'Go to Executive KPI Dashboard',
      category: 'Navigation',
      icon: CheckSquare,
      run: () => {
        setActiveTab('dashboard');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_tasks',
      title: 'Go to Tasks & Todos',
      category: 'Navigation',
      icon: CheckSquare,
      run: () => {
        setActiveTab('tasks');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_notes',
      title: 'Go to Notes & Documents',
      category: 'Navigation',
      icon: FileText,
      run: () => {
        setActiveTab('notes');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_ledger',
      title: 'Go to Ledger & Spending',
      category: 'Navigation',
      icon: HandCoins,
      run: () => {
        setActiveTab('ledger');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_calendar',
      title: 'Go to Calendar & Schedule',
      category: 'Navigation',
      icon: Calendar,
      run: () => {
        setActiveTab('calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav_settings',
      title: 'Open Settings',
      category: 'Navigation',
      icon: Settings,
      run: () => {
        setActiveTab('settings');
        setCommandPaletteOpen(false);
      },
    },
  ];

  const taskMatches = tasks
    .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      title: `Task: ${t.title}`,
      category: 'Tasks',
      icon: CheckSquare,
      run: () => {
        setActiveTab('tasks');
        setCommandPaletteOpen(false);
      },
    }));

  const allItems = [
    ...actions.filter((a) => a.title.toLowerCase().includes(query.toLowerCase())),
    ...taskMatches,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4 z-50 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-(--bg-card) border border-(--border-medium) rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-(--border-subtle)">
          <Search size={16} className="text-(--text-muted) shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search tasks..."
            className="w-full text-sm bg-transparent border-none focus:outline-none placeholder:text-(--text-muted)"
          />
          <span className="text-[10px] text-(--text-muted) px-1.5 py-0.5 rounded bg-(--bg-secondary) border border-(--border-subtle) font-mono">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-(--text-muted)">
              No matching commands or tasks found
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-(--bg-secondary) text-(--text-primary) font-semibold'
                      : 'text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={14} className="text-(--text-muted) shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-(--text-muted)">
                    <span>{item.category}</span>
                    {isSelected && <ArrowRight size={12} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Guide */}
        <div className="px-4 py-2 bg-(--bg-secondary)/50 border-t border-(--border-subtle) flex items-center justify-between text-[11px] text-(--text-muted)">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Personal Assistant Workspace</span>
        </div>
      </div>
    </div>
  );
}
