'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
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
  List,
  ListOrdered,
  Grid,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';
import {
  exportNoteToDocx,
  exportNoteToPdf,
  StandaloneNote,
} from '@/lib/utils/goalExport';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';
import MarkdownNoteRenderer from './MarkdownNoteRenderer';
import VisualTableModal from './VisualTableModal';

const NOTES_STORAGE_KEY = 'recall_strategic_notes';
const FOLDERS_STORAGE_KEY = 'recall_note_folders';
const FOLDERS_INIT_KEY = 'recall_note_folders_initialized';
const NOTES_INIT_KEY = 'recall_strategic_notes_initialized';

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

// Personal agent crisp cards with pastel accents
const NOTE_COLOR_THEMES = {
  cream: {
    id: 'cream',
    name: 'Classic White',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200/80',
    titleColor: 'text-[#1C1C1E]',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-amber-400',
  },
  mint: {
    id: 'mint',
    name: 'Fresh Mint',
    cardBg: 'bg-[#B8F2A6]/25',
    cardBorder: 'border-[#B8F2A6]',
    titleColor: 'text-[#1C1C1E]',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-emerald-500',
  },
  peach: {
    id: 'peach',
    name: 'Butter Yellow',
    cardBg: 'bg-[#FEF9D9]',
    cardBorder: 'border-[#F4EBAC]',
    titleColor: 'text-[#1C1C1E]',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-amber-500',
  },
  lavender: {
    id: 'lavender',
    name: 'Soft Lavender',
    cardBg: 'bg-[#B5C4FF]/25',
    cardBorder: 'border-[#B5C4FF]',
    titleColor: 'text-[#1C1C1E]',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-indigo-500',
  },
  slate: {
    id: 'slate',
    name: 'Pure Slate',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200/80',
    titleColor: 'text-[#1C1C1E]',
    textColor: 'text-slate-600',
    timeColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
  },
};

const FOLDER_COLOR_THEMES = {
  amber: {
    bg: 'bg-white',
    border: 'border-slate-200/80',
    titleColor: 'text-[#1C1C1E]',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-700',
  },
  peach: {
    bg: 'bg-[#FEF9D9]/50',
    border: 'border-[#F4EBAC]',
    titleColor: 'text-[#1C1C1E]',
    pillBg: 'bg-amber-100/70',
    pillText: 'text-amber-800',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-slate-200/80',
    titleColor: 'text-[#1C1C1E]',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-700',
  },
  mint: {
    bg: 'bg-[#B8F2A6]/20',
    border: 'border-[#B8F2A6]/60',
    titleColor: 'text-[#1C1C1E]',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
  },
  lavender: {
    bg: 'bg-[#B5C4FF]/20',
    border: 'border-[#B5C4FF]/60',
    titleColor: 'text-[#1C1C1E]',
    pillBg: 'bg-indigo-50',
    pillText: 'text-indigo-700',
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
    const isInit = localStorage.getItem(FOLDERS_INIT_KEY);
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!isInit) {
      localStorage.setItem(FOLDERS_INIT_KEY, 'true');
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalNotes(): AppNote[] {
  if (typeof window === 'undefined') return DEFAULT_NOTES;
  try {
    const isInit = localStorage.getItem(NOTES_INIT_KEY);
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!isInit) {
      localStorage.setItem(NOTES_INIT_KEY, 'true');
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(DEFAULT_NOTES));
      return DEFAULT_NOTES;
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
  const {
    showConfirm,
    showToast,
    notes,
    noteFolders,
    createNote,
    updateNote,
    deleteNote,
    createNoteFolder,
    deleteNoteFolder,
  } = useApp();

  // Notes & folders are now shared (DB-backed) so the AI agent can edit them.
  const folders = noteFolders as NoteFolder[];

  // Active view: 'home' | 'folder' | 'editor' | 'all'
  const [viewMode, setViewMode] = useState<'home' | 'folder' | 'editor' | 'all'>('home');
  const [homeSubTab, setHomeSubTab] = useState<'notes' | 'folders'>('notes');
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
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

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

  // One-time migration: move notes previously stored in this browser into the
  // shared database so the AI agent (and other devices) can read/edit them.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current || typeof window === 'undefined') return;
    const flag = localStorage.getItem('recall_notes_db_migrated');
    const rawNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    const rawFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (flag) return;
    if (!rawNotes && !rawFolders) {
      localStorage.setItem('recall_notes_db_migrated', 'true');
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      migratedRef.current = true;
      try {
        if (rawFolders) {
          const parsedFolders = JSON.parse(rawFolders) as NoteFolder[];
          for (const folder of parsedFolders) {
            if (!noteFolders.some((f) => f.id === folder.id)) {
              await createNoteFolder(folder);
            }
          }
        }
        if (rawNotes) {
          const parsedNotes = JSON.parse(rawNotes) as AppNote[];
          for (const note of parsedNotes) {
            if (!notes.some((n) => n.id === note.id)) {
              await createNote(note as any);
            }
          }
        }
        localStorage.setItem('recall_notes_db_migrated', 'true');
      } catch (err) {
        console.warn('Local notes migration skipped', err);
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived active folder
  const activeFolder = useMemo(() => {
    if (activeFolderId === '__unassigned__') {
      return {
        id: '__unassigned__',
        name: 'Quick Notes (No Folder)',
        icon: '📄',
        themeColor: 'slate' as const,
        createdAt: '',
      };
    }
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

  const unassignedNotesCount = useMemo(() => {
    return notes.filter((n) => !n.folderId).length;
  }, [notes]);

  const folderNotes = useMemo(() => {
    if (!activeFolderId) return [];
    return notes.filter((n) => {
      const matchFolder =
        activeFolderId === '__unassigned__' ? !n.folderId : n.folderId === activeFolderId;
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

  // Hide bottom bar when inside editor view mode
  useEffect(() => {
    if (viewMode === 'editor') {
      window.dispatchEvent(new CustomEvent('app_modal_state', { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('app_modal_state', { detail: { open: false } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('app_modal_state', { detail: { open: false } }));
    };
  }, [viewMode]);

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
    // If not specified or called from home, default to unassigned (no folder)
    const initialFolder =
      folderIdToUse !== undefined
        ? folderIdToUse
        : activeFolderId && activeFolderId !== '__unassigned__'
        ? activeFolderId
        : '';
    setEditorFolderId(initialFolder);
    setEditorColor('cream');
    setShowColorPicker(false);
    setViewMode('editor');
  };

  const handleEditNote = (note: AppNote) => {
    setCurrentEditingNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorFolderId(note.folderId || '');
    setEditorColor(note.color || 'cream');
    setShowColorPicker(false);
    setViewMode('editor');
  };

  // Auto-save state
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist editor contents without leaving the editor (used by auto-save + Done)
  const persistEditorNote = (): boolean => {
    if (!editorTitle.trim() && !editorContent.trim()) return false;

    const now = new Date().toISOString();
    const cleanTitle = editorTitle.trim() || 'Untitled Note';
    const finalFolderId = editorFolderId.trim() ? editorFolderId.trim() : undefined;

    if (currentEditingNote) {
      void updateNote(currentEditingNote.id, {
        title: cleanTitle,
        content: editorContent,
        folderId: finalFolderId,
        color: editorColor,
      });
      setCurrentEditingNote({
        ...currentEditingNote,
        title: cleanTitle,
        content: editorContent,
        folderId: finalFolderId,
        color: editorColor,
        updatedAt: now,
      });
    } else {
      const newNote: AppNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: cleanTitle,
        content: editorContent,
        folderId: finalFolderId,
        color: editorColor,
        createdAt: now,
        updatedAt: now,
      };
      void createNote(newNote as any);
      setCurrentEditingNote(newNote);
    }

    setLastSavedAt(now);
    return true;
  };

  // Auto-save: debounce 800ms after the last keystroke
  useEffect(() => {
    if (viewMode !== 'editor') return;
    if (!editorTitle.trim() && !editorContent.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persistEditorNote();
    }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorTitle, editorContent, editorFolderId, editorColor, viewMode]);

  const handleSaveEditorNote = () => {
    if (!editorTitle.trim() && !editorContent.trim()) {
      setViewMode(activeFolderId ? 'folder' : 'home');
      return;
    }

    const isNew = !currentEditingNote;
    persistEditorNote();
    showToast?.(isNew ? 'Note created' : 'Note updated', 'success');

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
        void deleteNote(noteId);
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
    void createNoteFolder(newF);
    setNewFolderName('');
    setNewFolderBadge('');
    setIsFolderModalOpen(false);
    showToast?.(`Folder "${newF.name}" created`, 'success');
  };

  const handleDeleteFolder = (folder: NoteFolder) => {
    if (folder.id === '__unassigned__') return;
    showConfirm({
      title: 'Delete Folder?',
      message: `Delete folder "${folder.name}"? Notes inside will become unassigned.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => {
        void deleteNoteFolder(folder.id);
        showToast?.('Folder deleted', 'info');
        if (activeFolderId === folder.id) {
          setActiveFolderId(null);
          setViewMode('home');
        }
      },
    });
  };

  // Smart List Formatting: Bullet & Numbered lists
  const toggleLinePrefix = (type: 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Expand selection to include full lines
    const textBefore = editorContent.substring(0, start);
    const lineStart = textBefore.lastIndexOf('\n') + 1;
    const textAfter = editorContent.substring(end);
    const lineEnd = end + (textAfter.indexOf('\n') === -1 ? textAfter.length : textAfter.indexOf('\n'));

    const selectedLinesText = editorContent.substring(lineStart, lineEnd);
    const lines = selectedLinesText.split('\n');

    let isAllAlreadyFormatted = true;
    for (const line of lines) {
      if (type === 'bullet' && !line.match(/^\s*•\s+/)) {
        isAllAlreadyFormatted = false;
        break;
      }
      if (type === 'number' && !line.match(/^\s*\d+\.\s+/)) {
        isAllAlreadyFormatted = false;
        break;
      }
    }

    let modifiedLines: string[];
    if (isAllAlreadyFormatted) {
      // Toggle OFF: remove bullet or number prefix
      modifiedLines = lines.map((line) => {
        if (type === 'bullet') return line.replace(/^(\s*)•\s+/, '$1');
        return line.replace(/^(\s*)\d+\.\s+/, '$1');
      });
    } else {
      // Toggle ON: apply bullet or number (also replace existing bullets/numbers)
      let startNum = 1;
      if (type === 'number') {
        const linesBefore = editorContent.substring(0, lineStart).split('\n');
        for (let i = linesBefore.length - 1; i >= 0; i--) {
          const match = linesBefore[i].match(/^\s*(\d+)\.\s+/);
          if (match) {
            startNum = parseInt(match[1], 10) + 1;
            break;
          }
        }
      }

      modifiedLines = lines.map((line, idx) => {
        // Strip any existing bullet, number, or checklist prefix
        const clean = line
          .replace(/^(\s*)[•\-\*]\s+/, '$1')
          .replace(/^(\s*)\d+[\.\)]\s+/, '$1')
          .replace(/^(\s*)-\s\[[ xX]\]\s+/, '$1');

        const indentMatch = clean.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const contentOnly = clean.substring(indent.length);

        if (type === 'bullet') {
          return `${indent}• ${contentOnly}`;
        } else {
          return `${indent}${startNum + idx}. ${contentOnly}`;
        }
      });
    }

    const replacement = modifiedLines.join('\n');
    const newContent =
      editorContent.substring(0, lineStart) + replacement + editorContent.substring(lineEnd);
    setEditorContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }, 50);
  };

  const insertBulletItem = () => toggleLinePrefix('bullet');
  const insertNumberedItem = () => toggleLinePrefix('number');

  // Smart keyboard handling for notes: auto-continue bullets, numbers, and checklists
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === 'Enter') {
      const cursor = textarea.selectionStart;
      const textBeforeCursor = editorContent.substring(0, cursor);
      const textAfterCursor = editorContent.substring(cursor);

      // Find the current line the user is typing on
      const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

      // 1. Checklist item (- [ ] or - [x])
      const checkMatch = currentLine.match(/^(\s*)-\s\[([ xX])\]\s*(.*)$/);
      if (checkMatch) {
        e.preventDefault();
        const indent = checkMatch[1] || '';
        const itemText = checkMatch[3] || '';
        if (itemText.trim().length === 0) {
          // Empty checklist item: Clear the checklist prefix and make it a clean line
          const newBefore = textBeforeCursor.substring(0, lastNewlineIndex + 1) + indent;
          const newContent = newBefore + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newBefore.length;
          }, 0);
        } else {
          // Continue checklist
          const insertText = `\n${indent}- [ ] `;
          const newContent = textBeforeCursor + insertText + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursor + insertText.length;
          }, 0);
        }
        return;
      }

      // 2. Bullet list item (• or - or *)
      const bulletMatch = currentLine.match(/^(\s*)([•\-\*])\s*(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1] || '';
        const bulletChar = bulletMatch[2] === '-' || bulletMatch[2] === '*' ? '•' : bulletMatch[2];
        const itemText = bulletMatch[3] || '';
        if (itemText.trim().length === 0) {
          // Empty bullet item: Clear the bullet prefix
          const newBefore = textBeforeCursor.substring(0, lastNewlineIndex + 1) + indent;
          const newContent = newBefore + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newBefore.length;
          }, 0);
        } else {
          // Continue bullet list
          const insertText = `\n${indent}${bulletChar} `;
          const newContent = textBeforeCursor + insertText + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursor + insertText.length;
          }, 0);
        }
        return;
      }

      // 3. Numbered list item (e.g. "1. " or "1) ")
      const numMatch = currentLine.match(/^(\s*)(\d+)[\.\)]\s*(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1] || '';
        const currentNum = parseInt(numMatch[2], 10);
        const itemText = numMatch[3] || '';
        if (itemText.trim().length === 0) {
          // Empty numbered item: Clear the number prefix
          const newBefore = textBeforeCursor.substring(0, lastNewlineIndex + 1) + indent;
          const newContent = newBefore + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newBefore.length;
          }, 0);
        } else {
          // Continue numbered list with next number
          const insertText = `\n${indent}${currentNum + 1}. `;
          const newContent = textBeforeCursor + insertText + textAfterCursor;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = cursor + insertText.length;
          }, 0);
        }
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const cursor = textarea.selectionStart;
      const textBeforeCursor = editorContent.substring(0, cursor);
      const textAfterCursor = editorContent.substring(cursor);
      const newContent = textBeforeCursor + '  ' + textAfterCursor;
      setEditorContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursor + 2;
      }, 0);
    }
  };

  const insertTableTemplate = () => {
    setIsTableModalOpen(true);
  };

  return (
    <div data-notes-view="true" className="flex-1 flex flex-col h-full bg-transparent text-[#2C2416] overflow-hidden font-sans select-none sm:select-auto">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 1: "MY NOTES" HOME SCREEN                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'home' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
          {/* Top Header */}
          <div className="shrink-0 pt-6 px-6 md:px-10 pb-2 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1E] tracking-tight">
                  My Notes
                </h1>
              </div>

              {/* Note / Folder switcher — switching only */}
              <div className="flex items-center p-1 rounded-full transio-glass-chip">
                <button
                  type="button"
                  onClick={() => setHomeSubTab('notes')}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    homeSubTab === 'notes'
                      ? 'bg-[#1C73E8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <FileText size={14} strokeWidth={2.5} />
                  Note
                </button>
                <button
                  type="button"
                  onClick={() => setHomeSubTab('folders')}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    homeSubTab === 'folders'
                      ? 'bg-[#1C73E8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <FolderPlus size={14} strokeWidth={2.5} />
                  Folder
                </button>
              </div>
            </div>

            {/* Clean White Search Bar */}
            <div className="mt-5 relative">
              <input
                type="text"
                placeholder="Search your notes"
                value={homeSearchQuery}
                onChange={(e) => setHomeSearchQuery(e.target.value)}
                className="w-full pl-6 pr-12 py-3.5 rounded-full transio-glass-input text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
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
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-32 md:pb-20 max-w-4xl w-full mx-auto custom-scrollbar">
            
            {/* ── Recent Notes Section (Active when Note tab is selected) ── */}
            {homeSubTab === 'notes' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-extrabold text-[#1C1C1E] tracking-tight">
                      Recent
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleCreateNewNote()}
                      className="w-8 h-8 rounded-full bg-[#1C73E8] hover:bg-[#1557B0] text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
                      title="Create note"
                      aria-label="Create note"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
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
                  <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-sm font-semibold text-slate-700">No notes found</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Click the + button to create your first note.</p>
                    <button
                      type="button"
                      onClick={() => handleCreateNewNote()}
                      className="px-4 py-2 rounded-full bg-[#1C73E8] hover:bg-[#1557B0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Create Note</span>
                    </button>
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
                          className={`rounded-[24px] p-4.5 sm:p-5 border ${theme.cardBg} ${theme.cardBorder} shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3.5 group relative`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-2xl transio-glass-icon-circle flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                              <FileText size={20} className="stroke-[2.2]" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-sm sm:text-base font-extrabold tracking-tight truncate ${theme.titleColor}`}>
                                  {note.title || 'Untitled Document'}
                                </h3>
                                {note.isPinned && (
                                  <Pin size={13} className="text-blue-500 shrink-0 fill-current" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                <span>{formatRelativeTime(note.updatedAt)}</span>
                                <span>·</span>
                                <span>{note.content ? `${note.content.length} chars` : 'Empty file'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500/80 group-hover:scale-125 transition-transform" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Folder Section (Active when Folder tab is selected) ── */}
            {homeSubTab === 'folders' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-extrabold text-[#1C1C1E] tracking-tight">
                      Folder
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(true)}
                      className="w-8 h-8 rounded-full bg-[#1C73E8] hover:bg-[#1557B0] text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
                      title="Create folder"
                      aria-label="Create folder"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {unassignedNotesCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleOpenFolder('__unassigned__')}
                      className="rounded-[28px] p-4.5 border bg-white border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-2xs shrink-0">
                          <span>📄</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-tight bg-slate-100 text-slate-700">
                              {unassignedNotesCount} {unassignedNotesCount === 1 ? 'Note' : 'Notes'}
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold tracking-tight mt-1 text-slate-900">
                            Quick Notes (No folder)
                          </h3>
                        </div>
                      </div>
                    </motion.div>
                  )}
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
                  {folders.length === 0 && unassignedNotesCount === 0 && (
                    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-sm font-semibold text-slate-700">No folders yet</p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">Click the + button to create your first folder.</p>
                      <button
                        type="button"
                        onClick={() => setIsFolderModalOpen(true)}
                        className="px-4 py-2 rounded-full bg-[#1C73E8] hover:bg-[#1557B0] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                        <span>Create Folder</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN 2: NOTE WRITING / EDITOR SCREEN                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'editor' && (
        <div
          data-notes-editor="true"
          className="flex-1 flex flex-col h-full bg-white overflow-hidden text-slate-900"
        >
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
                    { value: '', label: 'No folder (Unassigned)', icon: <span>📄</span> },
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

            <div className="flex-1 flex flex-col min-h-0">
              {/* Note Content Textarea */}
              <textarea
                ref={textareaRef}
                placeholder="Write your note content here..."
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onFocus={() =>
                  window.dispatchEvent(
                    new CustomEvent('app_modal_state', { detail: { open: true } })
                  )
                }
                className="flex-1 min-h-[220px] w-full bg-transparent border-none text-sm sm:text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none font-normal"
              />

              {/* Live Formatted Table Preview in Write Mode if note contains a table */}
              {editorContent.includes('|') && (
                <div className="mt-4 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Grid size={14} className="text-blue-600" />
                      <span>Rendered Table Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTableModalOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Edit in Table Builder &rarr;
                    </button>
                  </div>
                  <MarkdownNoteRenderer content={editorContent} />
                </div>
              )}
            </div>
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
                onClick={insertBulletItem}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Bullet Points"
              >
                <List size={18} />
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <button
                type="button"
                onClick={insertNumberedItem}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered size={18} />
              </button>
            </div>

            {/* Auto-save Status & Word Count */}
            <div className="flex items-center gap-3">
              {lastSavedAt && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={13} strokeWidth={3} />
                  Auto-saved
                </span>
              )}
              <div className="text-[11px] font-medium text-slate-400">
                {editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0} words
              </div>
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateNewNote(activeFolder.id)}
                    className="h-9 px-3.5 rounded-2xl bg-[#1C73E8] hover:bg-[#1557B0] text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Add note to this folder"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>New Note</span>
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
          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 pb-32 md:pb-20 max-w-4xl w-full mx-auto custom-scrollbar">
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
                      className={`rounded-[24px] p-4.5 sm:p-5 border ${theme.cardBg} ${theme.cardBorder} shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3.5 group relative`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl transio-glass-icon-circle flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                          <FileText size={20} className="stroke-[2.2]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm sm:text-base font-extrabold tracking-tight truncate ${theme.titleColor}`}>
                            {note.title || 'Untitled Document'}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{formatRelativeTime(note.updatedAt)}</span>
                            <span>·</span>
                            <span>{note.content ? `${note.content.length} chars` : 'Empty file'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCurrentNote(note.id, note.title);
                          }}
                          className="opacity-0 group-hover:opacity-80 hover:opacity-100 p-2 rounded-xl hover:bg-slate-100 text-rose-600 transition-opacity"
                          title="Delete note"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
              <button
                type="button"
                onClick={() => handleCreateNewNote()}
                className="w-9 h-9 rounded-2xl bg-[#1C73E8] hover:bg-[#1557B0] text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
                title="Create note"
                aria-label="Create note"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
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

          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-4 pb-32 md:pb-20 max-w-4xl w-full mx-auto custom-scrollbar">
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
                      className={`rounded-[24px] p-4.5 border ${theme.cardBg} ${theme.cardBorder} shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl transio-glass-icon-circle flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                          <FileText size={18} className="stroke-[2.2]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {folder && (
                            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mb-0.5 truncate">
                              {folder.icon} {folder.name}
                            </span>
                          )}
                          <h3 className={`text-sm font-extrabold tracking-tight truncate ${theme.titleColor}`}>
                            {note.title || 'Untitled Note'}
                          </h3>
                          <p className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{formatRelativeTime(note.updatedAt)}</span>
                            <span>·</span>
                            <span>{note.content ? `${note.content.length} chars` : 'Empty file'}</span>
                          </p>
                        </div>
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

      {/* ── Modal: Visual Table Builder ── */}
      <VisualTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        initialMarkdown={editorContent.includes('|') ? editorContent : undefined}
        onInsertTable={(markdownTable) => {
          const textarea = textareaRef.current;
          if (!textarea) {
            setEditorContent((prev) => `${prev}\n${markdownTable}\n`);
            return;
          }
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const before = editorContent.substring(0, start);
          const after = editorContent.substring(end);
          const needNewlineBefore = before.length > 0 && !before.endsWith('\n');
          const needNewlineAfter = after.length > 0 && !after.startsWith('\n');
          const fullInsert = `${needNewlineBefore ? '\n' : ''}${markdownTable}${needNewlineAfter ? '\n' : ''}`;
          const newContent = before + fullInsert + after;
          setEditorContent(newContent);
          setTimeout(() => {
            textarea.focus();
            const pos = start + fullInsert.length;
            textarea.setSelectionRange(pos, pos);
          }, 50);
          showToast?.('Table inserted into note', 'success');
        }}
      />

    </div>
  );
}
