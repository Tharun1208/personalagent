'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  X,
  Save,
  BookOpen,
  Tag,
  Calendar,
  Sparkles,
  Layers,
  FileCode,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase,
  User,
  HeartPulse,
  Banknote,
  GraduationCap,
  Pin,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import {
  exportNoteToDocx,
  exportNoteToPdf,
  exportAllNotesToDocx,
  exportAllNotesToPdf,
  StandaloneNote,
} from '@/lib/utils/goalExport';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';

const NOTES_STORAGE_KEY = 'recall_strategic_notes';

function loadLocalNotes(): StandaloneNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const CATEGORY_META: Record<
  string,
  { label: string; Icon: React.ElementType; color: string; bg: string; border: string }
> = {
  general: {
    label: 'General & Ideas',
    Icon: BookOpen,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  career: {
    label: 'Work & Projects',
    Icon: Briefcase,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  learning: {
    label: 'Study & Research',
    Icon: GraduationCap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  finance: {
    label: 'Finance & Wealth',
    Icon: Banknote,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  health: {
    label: 'Health & Wellness',
    Icon: HeartPulse,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  personal: {
    label: 'Personal Growth',
    Icon: User,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
};

export default function NotesView() {
  const { showConfirm } = useApp();

  const [notes, setNotes] = useState<StandaloneNote[]>(loadLocalNotes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StandaloneNote | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('general');

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save notes locally', e);
    }
  }, [notes]);

  const openCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('general');
    setIsModalOpen(true);
  };

  const openEditModal = (note: StandaloneNote) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category || 'general');
    setIsModalOpen(true);
  };

  const handleSaveNote = () => {
    if (!formTitle.trim() && !formContent.trim()) return;

    const now = new Date().toISOString();
    const cleanTitle = formTitle.trim() || 'Untitled Note';

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: cleanTitle,
                content: formContent,
                category: formCategory,
                updatedAt: now,
              }
            : n
        )
      );
    } else {
      const newNote: StandaloneNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: cleanTitle,
        content: formContent,
        category: formCategory,
        createdAt: now,
        updatedAt: now,
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteNote = (id: string, title: string) => {
    showConfirm({
      title: 'Delete Note?',
      message: `Are you sure you want to delete "${title || 'Untitled Note'}"? This cannot be undone.`,
      confirmText: 'Delete Note',
      type: 'danger',
      onConfirm: () => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      },
    });
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || (n.category || 'general') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, searchQuery, selectedCategory]);

  const totalWords = useMemo(() => {
    return notes.reduce((acc, n) => {
      const words = n.content.trim() ? n.content.trim().split(/\s+/).length : 0;
      return acc + words;
    }, 0);
  }, [notes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-(--bg-primary) overflow-hidden font-sans">
      {/* ── Top Header ── */}
      <div className="shrink-0 p-4 md:p-6 border-b border-(--border-subtle) bg-(--bg-card)/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-(--text-primary)">
                  Notes & Documents
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                </span>
              </div>
              <p className="text-xs text-(--text-muted) mt-0.5 font-medium">
                Create, organize, and export your thoughts to formatted Word (.docx) and PDF documents
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {notes.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => exportAllNotesToDocx(notes)}
                  className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-blue-500/40 text-(--text-primary) text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:bg-(--bg-elevated)"
                  title="Download all notes as Word (.docx)"
                >
                  <FileCode size={14} className="text-blue-500" />
                  <span>Export All (.DOCX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportAllNotesToPdf(notes)}
                  className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/40 text-(--text-primary) text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:bg-(--bg-elevated)"
                  title="Download all notes as PDF"
                >
                  <Download size={14} className="text-rose-500" />
                  <span>Export All (.PDF)</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer hover:opacity-95 active:scale-95"
            >
              <Plus size={16} />
              <span>Create Note</span>
            </button>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="mt-4 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Search notes by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-[#4E82EE] transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Pills Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-xs'
                  : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              All Categories ({notes.length})
            </button>
            {Object.entries(CATEGORY_META).map(([key, cat]) => {
              const count = notes.filter((n) => (n.category || 'general') === key).length;
              const isSelected = selectedCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-xs'
                      : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-(--bg-elevated) text-(--text-muted)'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Notes Grid / List Content ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-(--border-subtle) bg-(--bg-card)/30">
            <div className="w-16 h-16 rounded-2xl bg-[#4E82EE]/10 text-[#4E82EE] flex items-center justify-center mb-3 border border-[#4E82EE]/20">
              <BookOpen size={28} />
            </div>
            <h3 className="text-base font-bold text-(--text-primary)">
              {searchQuery ? 'No matching notes found' : 'No notes created yet'}
            </h3>
            <p className="text-xs text-(--text-muted) max-w-sm mt-1 mb-4">
              {searchQuery
                ? 'Try adjusting your search terms or category filters.'
                : 'Write strategic plans, meeting notes, ideas, or study documents and export them directly to DOCX or PDF.'}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer hover:opacity-95 active:scale-95"
            >
              <Plus size={15} />
              <span>Create Your First Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const cat = CATEGORY_META[note.category || 'general'] || CATEGORY_META.general;
              const CatIcon = cat.Icon;
              const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;
              const dateFormatted = note.updatedAt
                ? new Date(note.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={note.id}
                  className="rounded-2xl border border-(--border-subtle) bg-(--bg-card) p-4.5 flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg transition-all group relative"
                >
                  <div>
                    {/* Top Row: Category + Actions */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${cat.bg} ${cat.color} ${cat.border} border`}
                      >
                        <CatIcon size={12} />
                        {cat.label}
                      </span>

                      {/* Top Action Icons */}
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => exportNoteToDocx(note)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer"
                          title="Export to Word (.docx)"
                        >
                          <FileCode size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportNoteToPdf(note)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Export to PDF"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(note)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Edit Note"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Note Title */}
                    <h3
                      onClick={() => openEditModal(note)}
                      className="text-sm font-bold text-(--text-primary) tracking-tight hover:text-amber-500 transition-colors cursor-pointer line-clamp-1 mb-1.5"
                    >
                      {note.title}
                    </h3>

                    {/* Note Content Preview */}
                    <p
                      onClick={() => openEditModal(note)}
                      className="text-xs text-(--text-secondary) line-clamp-4 leading-relaxed font-normal whitespace-pre-wrap cursor-pointer"
                    >
                      {note.content || <span className="italic text-(--text-muted)">Empty note...</span>}
                    </p>
                  </div>

                  {/* Footer Meta Row */}
                  <div className="mt-4 pt-3 border-t border-(--border-subtle)/50 flex items-center justify-between text-[11px] text-(--text-muted)">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>{dateFormatted}</span>
                    </div>
                    <div className="font-mono text-[10.5px]">
                      {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Note Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-14 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-2xl bg-(--bg-card) border border-(--border-subtle) rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-top-modal">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-(--border-subtle) flex items-center justify-between bg-(--bg-sidebar)">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-(--text-primary)">
                    {editingNote ? 'Edit Document & Note' : 'Create New Document'}
                  </h2>
                  <p className="text-[11px] text-(--text-muted)">
                    Full Markdown & Rich text storage with instant document download
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              {/* Title & Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Q4 Growth Roadmap & Architecture Plan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-semibold text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-amber-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    Category
                  </label>
                  <CustomSelect
                    value={formCategory}
                    onChange={(val) => setFormCategory(val)}
                    options={Object.entries(CATEGORY_META).map(([k, meta]) => ({
                      value: k,
                      label: meta.label,
                    }))}
                  />
                </div>
              </div>

              {/* Note Content Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    Document Content & Notes
                  </label>
                  <span className="text-[11px] text-(--text-muted) font-mono">
                    {formContent.length} chars  *  {formContent.trim() ? formContent.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Type your strategic notes, meeting action items, outlines, or knowledge base here..."
                  className="w-full p-3.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs leading-relaxed text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-amber-500 transition-all resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-5 border-t border-(--border-subtle) bg-(--bg-sidebar) flex flex-wrap items-center justify-between gap-3">
              {/* Direct Export Buttons from Modal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportNoteToDocx({
                      title: formTitle || 'Untitled Note',
                      content: formContent,
                      category: formCategory,
                      createdAt: editingNote?.createdAt || new Date().toISOString(),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-blue-500 text-(--text-primary) text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-(--bg-elevated)"
                >
                  <FileCode size={14} className="text-blue-500" />
                  <span>Download .DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportNoteToPdf({
                      title: formTitle || 'Untitled Note',
                      content: formContent,
                      category: formCategory,
                      createdAt: editingNote?.createdAt || new Date().toISOString(),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500 text-(--text-primary) text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-(--bg-elevated)"
                >
                  <Download size={14} className="text-rose-500" />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Cancel & Save */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary) text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer hover:opacity-95 active:scale-95"
                >
                  <Save size={15} />
                  <span>{editingNote ? 'Save Changes' : 'Create Note'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
