'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Download,
  Trash2,
  X,
  FileCode,
  FileText,
  ChevronDown,
  Pin,
  ArrowLeft,
  Check,
  Type,
  List,
  Grid,
  CheckSquare,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';
import {
  exportNoteToDocx,
  exportNoteToPdf,
  StandaloneNote,
} from '@/lib/utils/goalExport';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';

const NOTES_STORAGE_KEY = 'recall_strategic_notes';
const FOLDERS_STORAGE_KEY = 'recall_note_folders';

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  themeColor: 'amber' | 'peach' | 'slate' | 'mint' | 'lavender';
  createdAt: string;
}

export interface AppNote extends StandaloneNote {
  folderId?: string;
  color?: 'cream' | 'mint' | 'peach' | 'lavender' | 'slate';
  isPinned?: boolean;
}

// Clean White cards with subtle category accent dots
const NOTE_COLOR_THEMES = {
  cream: {
    id: 'cream',
    name: 'Classic White',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-amber-400',
  },
  mint: {
    id: 'mint',
    name: 'Fresh Mint',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-emerald-500',
  },
  peach: {
    id: 'peach',
    name: 'Coral Peach',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-rose-500',
  },
  lavender: {
    id: 'lavender',
    name: 'Soft Violet',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-indigo-500',
  },
  slate: {
    id: 'slate',
    name: 'Pure Slate',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    titleColor: 'text-slate-900',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
  },
};

const FOLDER_COLOR_THEMES = {
  amber: {
    bg: 'bg-white',
    border: 'border-slate-200',
    titleColor: 'text-slate-900',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-700',
  },
  peach: {
    bg: 'bg-white',
    border: 'border-slate-200',
    titleColor: 'text-slate-900',
    pillBg: 'bg-rose-50',
    pillText: 'text-rose-700',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-slate-200',
    titleColor: 'text-slate-900',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-700',
  },
  mint: {
    bg: 'bg-white',
    border: 'border-slate-200',
    titleColor: 'text-slate-900',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
  },
  lavender: {
    bg: 'bg-white',
    border: 'border-slate-200',
    titleColor: 'text-slate-900',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
  },
};

const DEFAULT_FOLDERS: NoteFolder[] = [
  {
    id: 'folder_achievement',
    name: 'Achievement',
    icon: '🏆',
    themeColor: 'amber',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'folder_space',
    name: 'I & You Space',
    icon: '🍁',
    badge: 'Shared note',
    themeColor: 'peach',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'folder_selfdev',
    name: 'Self development',
    icon: '📝',
    themeColor: 'slate',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTES: AppNote[] = [
  {
    id: 'note_wish_18',
    title: 'Wish at 18th ✨',
    content:
      'Thanks god, at my 17th very challenging.\nI hope at my 18th very challenging & happiness tho.\n\nYou did it and ur journey still continues, be a grateful person!😉',
    color: 'cream',
    folderId: 'folder_achievement',
    category: 'personal',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'note_moms_shop',
    title: "Mom's shop 👩🏻",
    content: '• Fish 1/4 kg\n• Chicken 1/2 kg\n• Garlic & Shallots\n• Fresh spinach & tomatoes',
    color: 'mint',
    folderId: 'folder_selfdev',
    category: 'general',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'note_our_journey',
    title: 'Our journey 🧸',
    content:
      'We meet at 2018, yap... And we meet again in 2022.\n\nTo be continue...',
    color: 'cream',
    folderId: 'folder_space',
    category: 'personal',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'note_planning_place',
    title: 'Planning place 📍',
    content:
      '• Jombang, East Java\n• Malang, East Java\n• Batu, East Java',
    color: 'cream',
    folderId: 'folder_space',
    category: 'general',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

function loadLocalFolders(): NoteFolder[] {
  if (typeof window === 'undefined') return DEFAULT_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FOLDERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch {
    return DEFAULT_FOLDERS;
  }
}

function loadLocalNotes(): AppNote[] {
  if (typeof window === 'undefined') return DEFAULT_NOTES;
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_NOTES;
  } catch {
    return DEFAULT_NOTES;
  }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `Edited ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Edited ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `Edited ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export default function NotesView() {
  const { showConfirm, showToast } = useApp();

  const [notes, setNotes] = useState<AppNote[]>(loadLocalNotes);
  const [folders, setFolders] = useState<NoteFolder[]>(loadLocalFolders);

  // Active view: 'home' | 'folder' | 'editor' | 'all'
  const [viewMode, setViewMode] = useState<'home' | 'folder' | 'editor' | 'all'>('home');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [currentEditingNote, setCurrentEditingNote] = useState<AppNote | null>(null);

  // Search queries
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');

  // Editor form state
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorFolderId, setEditorFolderId] = useState<string>('');
  const [editorColor, setEditorColor] = useState<keyof typeof NOTE_COLOR_THEMES>('cream');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [newFolderTheme, setNewFolderTheme] = useState<'amber' | 'peach' | 'slate' | 'mint' | 'lavender'>('amber');
  const [newFolderBadge, setNewFolderBadge] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };
    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  // Persist notes & folders
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save notes locally', e);
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed to save folders locally', e);
    }
  }, [folders]);

  // Derived active folder
  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);

  // Counts
  const folderNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    folders.forEach((f) => {
      counts[f.id] = notes.filter((n) => n.folderId === f.id).length;
    });
    return counts;
  }, [folders, notes]);

  const folderNotes = useMemo(() => {
    if (!activeFolderId) return [];
    return notes.filter((n) => {
      const matchFolder = n.folderId === activeFolderId;
      const matchSearch =
        !folderSearchQuery.trim() ||
        n.title.toLowerCase().includes(folderSearchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(folderSearchQuery.toLowerCase());
      return matchFolder && matchSearch;
    });
  }, [notes, activeFolderId, folderSearchQuery]);

  const recentNotes = useMemo(() => {
    const filtered = notes.filter((n) => {
      if (!homeSearchQuery.trim()) return true;
      return (
        n.title.toLowerCase().includes(homeSearchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(homeSearchQuery.toLowerCase())
      );
    });
    return filtered.slice(0, 6);
  }, [notes, homeSearchQuery]);

  // Handlers
  const handleOpenFolder = (folderId: string) => {
    setActiveFolderId(folderId);
    setFolderSearchQuery('');
    setViewMode('folder');
  };

  const handleCreateNewNote = (folderIdToUse?: string) => {
    setCurrentEditingNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorFolderId(folderIdToUse || activeFolderId || folders[0]?.id || '');
    setEditorColor('cream');
    setShowColorPicker(false);
    setViewMode('editor');
  };

  const handleEditNote = (note: AppNote) => {
    setCurrentEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolderId(note.folderId || folders[0]?.id || '');
    setEditorColor(note.color || 'cream');
    setShowColorPicker(false);
    setViewMode('editor');
  };

  const handleSaveEditorNote = () => {
    if (!editorTitle.trim() && !editorContent.trim()) {
      setViewMode(activeFolderId ? 'folder' : 'home');
      return;
    }

    const now = new Date().toISOString();
    const cleanTitle = editorTitle.trim() || 'Untitled Note';

    if (currentEditingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === currentEditingNote.id
            ? {
                ...n,
                title: cleanTitle,
                content: editorContent,
                folderId: editorFolderId,
                color: editorColor,
                updatedAt: now,
              }
            : n
        )
      );
      showToast?.('Note updated', 'success');
    } else {
      const newNote: AppNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: cleanTitle,
        content: editorContent,
        folderId: editorFolderId,
        color: editorColor,
        createdAt: now,
        updatedAt: now,
      };
      setNotes((prev) => [newNote, ...prev]);
      showToast?.('Note created', 'success');
    }

    if (activeFolderId) {
      setViewMode('folder');
    } else {
      setViewMode('home');
    }
  };

  const handleDeleteCurrentNote = (noteId: string, noteTitle: string) => {
    showConfirm({
      title: 'Delete Note?',
      message: `Delete "${noteTitle || 'Untitled Note'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast?.('Note deleted', 'info');
        if (viewMode === 'editor') {
          setViewMode(activeFolderId ? 'folder' : 'home');
        }
      },
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newF: NoteFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: newFolderName.trim(),
      icon: newFolderIcon || '📁',
      themeColor: newFolderTheme,
      badge: newFolderBadge.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, newF]);
    setNewFolderName('');
    setNewFolderBadge('');
    setIsFolderModalOpen(false);
    showToast?.(`Folder "${newF.name}" created`, 'success');
  };

  const handleDeleteFolder = (folder: NoteFolder) => {
    showConfirm({
      title: 'Delete Folder?',
      message: `Delete folder "${folder.name}"? Notes inside will become unassigned.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        setFolders((prev) => prev.filter((f) => f.id !== folder.id));
        setNotes((prev) =>
          prev.map((n) => (n.folderId === folder.id ? { ...n, folderId: undefined } : n))
        );
        showToast?.('Folder deleted', 'info');
        if (activeFolderId === folder.id) {
          setActiveFolderId(null);
          setViewMode('home');
        }
      },
    });
  };

  // Editor formatting tools
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorContent.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent =
      editorContent.substring(0, start) + replacement + editorContent.substring(end);
    setEditorContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 50);
  };

  const insertBulletItem = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const before = editorContent.substring(0, start);
    const after = editorContent.substring(start);
    const needNewline = before.length > 0 && !before.endsWith('\n');
    const newContent = `${before}${needNewline ? '\n' : ''}• ${after}`;
    setEditorContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const pos = start + (needNewline ? 3 : 2);
      textarea.setSelectionRange(pos, pos);
    }, 50);
  };

  const insertTableTemplate = () => {
    const tableStr = '\n| Item | Description | Status |\n| --- | --- | --- |\n| Item 1 | Details here | Done |\n';
    insertFormatting(tableStr);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FFFFFF] text-[#2C2416] overflow-hidden font-sans select-none sm:select-auto">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 1: "MY NOTES" HOME SCREEN                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Top Header */}
          <div className="shrink-0 pt-6 px-6 md:px-10 pb-2 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1E] tracking-tight">
                  My Notes
                </h1>
              </div>
            </div>

            {/* Clean White Search Bar */}
            <div className="mt-5 relative">
              <input
                type="text"
                placeholder="Search your notes"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                className="w-full pl-6 pr-12 py-3.5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search size={20} strokeWidth={2.5} />
              </div>
              {homeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setHomeSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-28 max-w-4xl w-full mx-auto custom-scrollbar">
            
            {/* ── Recent Section ── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-extrabold text-[#1C1C1E] tracking-tight">
                  Recent
                </h2>
                {notes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className="text-xs font-bold text-[#8E8E93] hover:text-[#1C1C1E] transition-colors cursor-pointer"
                  >
                    See all
                  </button>
                )}
              </div>

              {recentNotes.length === 0 ? (
                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500">No matching notes found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentNotes.map((note) => {
                    const themeKey = (note.color as keyof typeof NOTE_COLOR_THEMES) || 'cream';
                    const theme = NOTE_COLOR_THEMES[themeKey] || NOTE_COLOR_THEMES.cream;

                    return (
                      <motion.div
                        key={note.id}
                        whileHover={{ y: -2 }}
                        onClick={() => handleEditNote(note)}
                        className={`rounded-[26px] p-5 border ${theme.cardBg} ${theme.cardBorder} shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[140px] group relative`}
                      >
                        <div>
                          {/* Note Title */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className={`text-base font-extrabold tracking-tight line-clamp-1 ${theme.titleColor}`}>
                              {note.title || 'Untitled'}
                            </h3>
                            {note.isPinned && (
                              <Pin size={13} className="text-blue-500 shrink-0 fill-current" />
                            )}
                          </div>

                          {/* Note Content Preview */}
                          <p className={`text-xs sm:text-[13px] font-normal leading-relaxed line-clamp-3 whitespace-pre-wrap ${theme.textColor}`}>
                            {note.content || <span className="italic opacity-60">Empty note...</span>}
                          </p>
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className={theme.timeColor}>
                            {formatRelativeTime(note.updatedAt)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Folder Section ── */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-extrabold text-[#1C1C1E] tracking-tight">
                  Folder
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(true)}
                  className="w-7 h-7 rounded-full border border-slate-300 hover:border-slate-500 bg-white text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Add folder"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>

              <div className="space-y-3.5">
                {folders.map((folder) => {
                  const count = folderNoteCounts[folder.id] || 0;
                  const themeKey = folder.themeColor || 'amber';
                  const theme = FOLDER_COLOR_THEMES[themeKey] || FOLDER_COLOR_THEMES.amber;

                  return (
                    <motion.div
                      key={folder.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOpenFolder(folder.id)}
                      className={`rounded-[28px] p-4.5 border ${theme.bg} ${theme.border} shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Folder Icon container */}
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-2xs shrink-0 relative">
                          <span>{folder.icon || '📁'}</span>
                          {folder.badge && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full" />
                          )}
                        </div>

                        {/* Title & Count Badge */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-tight ${theme.pillBg} ${theme.pillText}`}
                            >
                              {count} {count === 1 ? 'Note' : 'Notes'}
                            </span>
                            {folder.badge && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {folder.badge}
                              </span>
                            )}
                          </div>
                          <h3 className={`text-base font-extrabold tracking-tight mt-1 ${theme.titleColor}`}>
                            {folder.name}
                          </h3>
                        </div>
                      </div>

                      {/* Delete action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className="opacity-0 group-hover:opacity-80 hover:opacity-100 p-2 rounded-xl hover:bg-slate-100 text-rose-600 transition-opacity"
                        title="Delete folder"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating Action Button (FAB) */}
          <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-30">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleCreateNewNote()}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex items-center justify-center border-2 border-white cursor-pointer transition-colors"
              title="Create note"
            >
              <Edit3 size={24} className="stroke-[2.2]" />
            </motion.button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 2: NOTE WRITING / EDITOR SCREEN                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'editor' && (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-slate-900">
          {/* Top Bar Navigation */}
          <div className="shrink-0 px-5 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode(activeFolderId ? 'folder' : 'home')}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
              {/* Folder selection dropdown */}
              <div className="w-36 sm:w-44">
                <CustomSelect
                  value={editorFolderId}
                  onChange={(val) => setEditorFolderId(val)}
                  options={[
                    { value: '', label: 'Unassigned', icon: <span>📁</span> },
                    ...folders.map((f) => ({
                      value: f.id,
                      label: f.name,
                      icon: <span>{f.icon || '📁'}</span>,
                    })),
                  ]}
                />
              </div>

              {/* Download Dropdown */}
              <div className="relative" ref={downloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                  title="Download Note Options"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Download</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 text-slate-400 ${
                      isDownloadMenuOpen ? 'rotate-180 text-slate-700' : ''
                    }`}
                  />
                </button>

                {isDownloadMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        exportNoteToPdf({
                          title: editorTitle || 'Untitled Note',
                          content: editorContent,
                          category: 'general',
                          createdAt: currentEditingNote?.createdAt || new Date().toISOString(),
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText size={13} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">PDF</div>
                        <div className="text-[10px] text-slate-400 font-normal">.pdf document</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadMenuOpen(false);
                        exportNoteToDocx({
                          title: editorTitle || 'Untitled Note',
                          content: editorContent,
                          category: 'general',
                          createdAt: currentEditingNote?.createdAt || new Date().toISOString(),
                        });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileCode size={13} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Document</div>
                        <div className="text-[10px] text-slate-400 font-normal">.docx Word file</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete */}
              {currentEditingNote && (
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteCurrentNote(currentEditingNote.id, currentEditingNote.title)
                  }
                  className="p-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Done button */}
              <button
                type="button"
                onClick={handleSaveEditorNote}
                className="px-5 py-2 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 flex flex-col p-6 md:p-10 max-w-3xl w-full mx-auto overflow-y-auto custom-scrollbar">
            {/* Note Title Input */}
            <input
              type="text"
              placeholder="Note Title..."
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 placeholder:text-slate-300 bg-transparent border-none focus:outline-none mb-5 tracking-tight"
            />

            {/* Note Content Textarea */}
            <textarea
              ref={textareaRef}
              placeholder="Write your note content here..."
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="flex-1 w-full bg-transparent border-none text-sm sm:text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none font-normal"
            />
          </div>

          {/* Reference Bottom Toolbar Strip */}
          <div className="shrink-0 px-4 py-3 border-t border-slate-200/60 bg-white/85 backdrop-blur-xl flex items-center justify-between max-w-3xl w-full mx-auto">
            {/* Reference Segmented Formatting Bar */}
            <div className="inline-flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={insertTableTemplate}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Table Template"
              >
                <Grid size={18} />
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                title="Bold Text (Aa)"
              >
                <Type size={18} />
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <button
                type="button"
                onClick={insertBulletItem}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Bullet List"
              >
                <List size={18} />
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <button
                type="button"
                onClick={() => insertFormatting('- [ ] ')}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Checklist Item"
              >
                <CheckSquare size={18} />
              </button>
            </div>

            {/* Word Count */}
            <div className="text-[11px] font-medium text-slate-400">
              {editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0} words
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 3: FOLDER VIEW                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'folder' && activeFolder && (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          {/* Clean White/Light Header Banner */}
          <div className="shrink-0 bg-slate-50 pt-7 px-6 md:px-10 pb-5 relative overflow-hidden border-b border-slate-200">
            <div className="max-w-4xl w-full mx-auto">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewMode('home')}
                  className="w-9 h-9 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer border border-slate-200"
                  title="Back to My Notes"
                >
                  <ArrowLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteFolder(activeFolder)}
                  className="p-2 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-slate-200"
                  title="Delete Folder"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Title, Badge & Icon */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-xs shrink-0 relative">
                  <span>{activeFolder.icon || '📁'}</span>
                  {activeFolder.badge && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-extrabold text-slate-500 tracking-wide uppercase">
                    {activeFolder.badge || 'Folder'}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {activeFolder.name}
                  </h1>
                </div>
              </div>

              {/* White Search Bar */}
              <div className="mt-5 relative">
                <input
                  type="text"
                  placeholder="Search your notes"
                  value={folderSearchQuery}
                  onChange={(e) => setFolderSearchQuery(e.target.value)}
                  className="w-full pl-6 pr-12 py-3.5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Search size={20} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>

          {/* Folder Notes Stack */}
          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 pb-28 max-w-4xl w-full mx-auto custom-scrollbar">
            {folderNotes.length === 0 ? (
              <div className="p-10 rounded-[28px] bg-slate-50 border border-slate-200 text-center max-w-md mx-auto mt-6">
                <div className="text-3xl mb-2">{activeFolder.icon || '📝'}</div>
                <h3 className="text-sm font-bold text-slate-900">
                  No notes in this folder
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Add your first note to this space.
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateNewNote(activeFolder.id)}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  + Add Note
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {folderNotes.map((note) => {
                  const themeKey = (note.color as keyof typeof NOTE_COLOR_THEMES) || 'cream';
                  const theme = NOTE_COLOR_THEMES[themeKey] || NOTE_COLOR_THEMES.cream;

                  return (
                    <motion.div
                      key={note.id}
                      whileHover={{ y: -2 }}
                      onClick={() => handleEditNote(note)}
                      className={`rounded-[28px] p-6 border ${theme.cardBg} ${theme.cardBorder} shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative`}
                    >
                      <div>
                        {/* Note Title */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h3 className={`text-base font-extrabold tracking-tight line-clamp-1 ${theme.titleColor}`}>
                            {note.title || 'Untitled Note'}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCurrentNote(note.id, note.title);
                            }}
                            className="opacity-0 group-hover:opacity-80 hover:opacity-100 p-1.5 rounded-xl hover:bg-slate-100 text-rose-600 transition-opacity"
                            title="Delete note"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Note Content */}
                        <p className={`text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-wrap ${theme.textColor}`}>
                          {note.content || <span className="italic opacity-60">Empty note...</span>}
                        </p>
                      </div>

                      {/* Footer relative time */}
                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className={theme.timeColor}>
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FAB in folder */}
          <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-30">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleCreateNewNote(activeFolder.id)}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] flex items-center justify-center border-2 border-white cursor-pointer transition-colors"
              title="Add note to folder"
            >
              <Edit3 size={24} className="stroke-[2.2]" />
            </motion.button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 4: ALL NOTES GRID VIEW (from "See all")                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'all' && (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
          <div className="shrink-0 pt-7 px-6 md:px-10 pb-3 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewMode('home')}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-extrabold text-[#1C1C1E]">
                All Notes ({notes.length})
              </h1>
              <div className="w-9" />
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search across all notes..."
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                className="w-full pl-6 pr-12 py-3.5 rounded-full bg-white border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search size={20} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-4 pb-28 max-w-4xl w-full mx-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes
                .filter(
                  (n) =>
                    !homeSearchQuery.trim() ||
                    n.title.toLowerCase().includes(homeSearchQuery.toLowerCase()) ||
                    n.content.toLowerCase().includes(homeSearchQuery.toLowerCase())
                )
                .map((note) => {
                  const themeKey = (note.color as keyof typeof NOTE_COLOR_THEMES) || 'cream';
                  const theme = NOTE_COLOR_THEMES[themeKey] || NOTE_COLOR_THEMES.cream;
                  const folder = folders.find((f) => f.id === note.folderId);

                  return (
                    <motion.div
                      key={note.id}
                      whileHover={{ y: -2 }}
                      onClick={() => handleEditNote(note)}
                      className={`rounded-[26px] p-5 border ${theme.cardBg} ${theme.cardBorder} shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[140px]`}
                    >
                      <div>
                        {folder && (
                          <span className="text-[10.5px] font-extrabold text-blue-600 uppercase tracking-wider block mb-1">
                            {folder.icon} {folder.name}
                          </span>
                        )}
                        <h3 className={`text-sm font-extrabold tracking-tight line-clamp-1 mb-1.5 ${theme.titleColor}`}>
                          {note.title || 'Untitled Note'}
                        </h3>
                        <p className={`text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap ${theme.textColor}`}>
                          {note.content}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
                        <span className={theme.timeColor}>
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE NEW FOLDER                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isFolderModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-white rounded-[28px] p-6 border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                New Folder
              </h3>
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Folder Icon & Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Folder Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderIcon}
                    onChange={(e) => setNewFolderIcon(e.target.value)}
                    className="w-12 text-center py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xl"
                    title="Emoji icon"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    placeholder="e.g. Vacation Plans, Personal Space"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {/* Subtitle / Badge */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Badge Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shared note, Secret space"
                  value={newFolderBadge}
                  onChange={(e) => setNewFolderBadge(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
