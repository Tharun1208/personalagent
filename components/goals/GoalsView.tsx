'use client';

import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  Trash2,
  X,
  TrendingUp,
  Award,
  ChevronRight,
  Flame,
  CheckSquare,
  Clock,
  Briefcase,
  HeartPulse,
  Banknote,
  GraduationCap,
  User as UserIcon,
  Layers,
  ArrowRight,
  Check,
  Edit2,
  Lightbulb,
  FileText,
  Download,
  FileCode,
  Save,
  ChevronDown,
  StickyNote,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Goal } from '@/types';
import {
  exportGoalToDocx,
  exportGoalToPdf,
  exportAllGoalsToDocx,
  exportAllGoalsToPdf,
} from '@/lib/utils/goalExport';

const CATEGORY_META: Record<
  string,
  { label: string; Icon: React.ElementType; color: string; bg: string; border: string; ringColor: string }
> = {
  career: {
    label: 'Career & Work',
    Icon: Briefcase,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    ringColor: '#3B82F6',
  },
  health: {
    label: 'Health & Fitness',
    Icon: HeartPulse,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    ringColor: '#10B981',
  },
  finance: {
    label: 'Financial Wealth',
    Icon: Banknote,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    ringColor: '#F59E0B',
  },
  learning: {
    label: 'Learning & Skills',
    Icon: GraduationCap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    ringColor: '#8B5CF6',
  },
  personal: {
    label: 'Personal Growth',
    Icon: UserIcon,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    ringColor: '#EC4899',
  },
};

export default function GoalsView() {
  const { goals, createGoal, updateGoal, toggleGoalMilestone, deleteGoal, sendMessage, setActiveTab, showConfirm } = useApp();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Note Modal & Editor states
  const [noteGoal, setNoteGoal] = useState<Goal | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Global Export dropdown state
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Card-specific active note preview/edit accordion ID
  const [expandedNoteGoalId, setExpandedNoteGoalId] = useState<string | null>(null);
  const [cardNoteDraft, setCardNoteDraft] = useState<Record<string, string>>({});
  const [cardNoteSaved, setCardNoteSaved] = useState<Record<string, boolean>>({});

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<Goal['category']>('career');
  const [targetDate, setTargetDate] = useState('');
  const [milestonesInput, setMilestonesInput] = useState<string[]>(['', '']);

  // Inline new milestone input per goal
  const [inlineMilestoneGoalId, setInlineMilestoneGoalId] = useState<string | null>(null);
  const [inlineMilestoneText, setInlineMilestoneText] = useState('');

  const filteredGoals = goals.filter((g) => {
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
    return true;
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed' || g.progress === 100).length;
  const totalMilestones = goals.reduce((acc, g) => acc + (g.milestones?.length || 0), 0);
  const completedMilestones = goals.reduce(
    (acc, g) => acc + (g.milestones?.filter((m) => m.completed).length || 0),
    0
  );
  const averageProgress =
    totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0;

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setNotes('');
    setCategory('career');
    setTargetDate('');
    setMilestonesInput(['', '']);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setNotes(goal.notes || '');
    setCategory(goal.category || 'career');
    setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setMilestonesInput(
      goal.milestones && goal.milestones.length > 0 ? goal.milestones.map((m) => m.title) : ['', '']
    );
    setIsModalOpen(true);
  };

  const handleAddMilestoneField = () => {
    setMilestonesInput([...milestonesInput, '']);
  };

  const handleMilestoneChange = (index: number, val: string) => {
    const updated = [...milestonesInput];
    updated[index] = val;
    setMilestonesInput(updated);
  };

  const handleRemoveMilestoneField = (index: number) => {
    setMilestonesInput(milestonesInput.filter((_, i) => i !== index));
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validMilestones = milestonesInput.map((m) => m.trim()).filter(Boolean);

    if (editingGoal) {
      const formattedMilestones = validMilestones.map((m, idx) => {
        const existing = editingGoal.milestones?.find((em) => em.title === m);
        return {
          id: existing?.id || `m_${Date.now()}_${idx}`,
          title: m,
          completed: existing ? existing.completed : false,
        };
      });

      const completedCount = formattedMilestones.filter((m) => m.completed).length;
      const progress = formattedMilestones.length > 0 ? Math.round((completedCount / formattedMilestones.length) * 100) : 0;

      await updateGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        category,
        targetDate: targetDate || undefined,
        milestones: formattedMilestones,
        progress,
        status: progress === 100 ? 'completed' : 'active',
      });
    } else {
      await createGoal(
        title.trim(),
        description.trim() || undefined,
        category,
        targetDate || undefined,
        validMilestones,
        notes.trim() || undefined
      );
    }

    setIsModalOpen(false);
  };

  const handleAddInlineMilestone = async (goal: Goal) => {
    if (!inlineMilestoneText.trim()) return;
    const newM = {
      id: `m_${Date.now()}`,
      title: inlineMilestoneText.trim(),
      completed: false,
    };
    const updatedMilestones = [...(goal.milestones || []), newM];
    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);

    await updateGoal(goal.id, {
      milestones: updatedMilestones,
      progress,
      status: progress === 100 ? 'completed' : 'active',
    });

    setInlineMilestoneText('');
    setInlineMilestoneGoalId(null);
  };

  const askAiCoach = (goal: Goal) => {
    setActiveTab('chat');
    sendMessage(
      `I am executing my strategic goal "${goal.title}" (${goal.progress}% complete, category: ${goal.category}). Here are my current milestones: ${goal.milestones?.map((m) => `[${m.completed ? 'DONE' : 'PENDING'}] ${m.title}`).join(', ')}. What are the top 3 high-impact tactical actions I should execute next?`
    );
  };

  // Open note modal
  const handleOpenNoteModal = (goal: Goal) => {
    setNoteGoal(goal);
    setNoteContent(goal.notes || '');
    setNoteSavedFeedback(false);
  };

  // Save note from modal
  const handleSaveModalNote = async () => {
    if (!noteGoal) return;
    setIsSavingNote(true);
    await updateGoal(noteGoal.id, { notes: noteContent });
    setNoteGoal({ ...noteGoal, notes: noteContent });
    setIsSavingNote(false);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2500);
  };

  // Save inline card note
  const handleSaveCardNote = async (goal: Goal) => {
    const text = cardNoteDraft[goal.id] !== undefined ? cardNoteDraft[goal.id] : goal.notes || '';
    await updateGoal(goal.id, { notes: text });
    setCardNoteSaved((prev) => ({ ...prev, [goal.id]: true }));
    setTimeout(() => {
      setCardNoteSaved((prev) => ({ ...prev, [goal.id]: false }));
    }, 2500);
  };

  // Export single goal
  const handleExportGoalDocx = async (goal: Goal) => {
    try {
      setIsExporting(true);
      await exportGoalToDocx(goal);
    } catch (e) {
      console.error('Failed to export DOCX:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGoalPdf = (goal: Goal) => {
    try {
      exportGoalToPdf(goal);
    } catch (e) {
      console.error('Failed to export PDF:', e);
    }
  };

  // Export all goals
  const handleExportAllDocx = async () => {
    try {
      setIsExporting(true);
      await exportAllGoalsToDocx(goals);
      setIsExportDropdownOpen(false);
    } catch (e) {
      console.error('Failed to export all DOCX:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllPdf = () => {
    try {
      exportAllGoalsToPdf(goals);
      setIsExportDropdownOpen(false);
    } catch (e) {
      console.error('Failed to export all PDF:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-(--bg-primary) text-(--text-primary)">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 sm:pb-36 md:pb-12 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Logo Badge - Spacious, non-congested with shrink-0 and clean padding */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] flex items-center justify-center text-white shadow-md shrink-0 border border-white/15">
              <Target size={22} className="shrink-0" />
            </div>
            <div className="space-y-0.5">
              <h1 className="app-page-title text-xl sm:text-2xl font-bold tracking-tight">
                Goals & Strategic OKRs
              </h1>
              <p className="app-page-subtitle text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
                Set measurable objectives, track key milestones, record strategic notes, and export reports.
              </p>
            </div>
          </div>

          {/* Action Buttons: Export & Create Objective */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Global Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                disabled={goals.length === 0 || isExporting}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:bg-(--bg-elevated) text-(--text-primary) font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer ${
                  goals.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Export Goals & Strategic Notes"
              >
                <Download size={15} className="text-[#4E82EE]" />
                <span>Export OKRs</span>
                <ChevronDown size={14} className="text-(--text-muted)" />
              </button>

              {isExportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-(--bg-card) border border-(--border-subtle) rounded-2xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                      Export Full Portfolio
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAllDocx}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <FileText size={13} />
                      </div>
                      <div>
                        <div className="font-semibold">Download as .docx</div>
                        <div className="text-[10px] text-(--text-muted)">Word Document with notes</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAllPdf}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <FileCode size={13} />
                      </div>
                      <div>
                        <div className="font-semibold">Download as .pdf</div>
                        <div className="text-[10px] text-(--text-muted)">Printable PDF report</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Create Objective Button */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-semibold text-xs sm:text-sm shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={16} />
              <span>Create Objective</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Overall Progress Ring */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                Overall Progress
              </span>
              <div className="text-3xl font-extrabold text-(--text-primary)">{averageProgress}%</div>
              <p className="text-[11px] text-(--text-muted)">
                {completedMilestones} of {totalMilestones} milestones completed
              </p>
            </div>
            {/* SVG Circular Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-(--border-subtle)"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#4E82EE] transition-all duration-500 ease-out"
                  strokeDasharray={`${averageProgress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <TrendingUp size={16} className="absolute text-[#4E82EE]" />
            </div>
          </div>

          {/* Card 2: Completed Goals */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                Objectives Achieved
              </span>
              <div className="text-3xl font-extrabold text-emerald-500">
                {completedGoals} <span className="text-sm font-normal text-(--text-muted)">/ {totalGoals}</span>
              </div>
              <p className="text-[11px] text-(--text-muted)">
                {totalGoals - completedGoals} active objectives in progress
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Award size={24} />
            </div>
          </div>

          {/* Card 3: AI Strategic Insights */}
          <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                Strategic Notes & AI
              </span>
              <div className="text-sm font-bold text-(--text-primary)">Strategy Journaling</div>
              <p className="text-[11px] text-(--text-muted)">
                Add notes, action plans & export as .docx / PDF
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4E82EE]/20 to-[#9B72CF]/20 text-[#4E82EE] flex items-center justify-center shrink-0">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-gradient-to-r from-[#4E82EE] to-[#9B72CF] text-white shadow-xs'
                : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-elevated)'
            }`}
          >
            All Objectives ({totalGoals})
          </button>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = goals.filter((g) => g.category === key).length;
            const Icon = meta.Icon;
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  categoryFilter === key
                    ? `${meta.bg} ${meta.color} border ${meta.border} shadow-xs font-bold`
                    : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-elevated)'
                }`}
              >
                <Icon size={13} />
                <span>{meta.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Goals Cards List */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16 bg-(--bg-card) border border-(--border-subtle) rounded-3xl p-8 space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-(--bg-elevated) flex items-center justify-center mx-auto text-(--text-muted) shrink-0">
              <Target size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-(--text-primary)">No Objectives in this Category</h3>
              <p className="text-xs text-(--text-muted) max-w-sm mx-auto">
                Define your career, health, finance, or learning goals to break them into achievable milestones and save strategic notes.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Your First Goal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const meta = CATEGORY_META[goal.category || 'personal'] || CATEGORY_META.personal;
              const Icon = meta.Icon;
              const isDone = goal.status === 'completed' || goal.progress === 100;
              const milestones = goal.milestones || [];
              const completedCount = milestones.filter((m) => m.completed).length;
              const hasNotes = Boolean(goal.notes && goal.notes.trim().length > 0);
              const isNoteAccordionOpen = expandedNoteGoalId === goal.id;
              const currentNoteVal =
                cardNoteDraft[goal.id] !== undefined ? cardNoteDraft[goal.id] : goal.notes || '';

              return (
                <div
                  key={goal.id}
                  className={`p-5 rounded-3xl bg-(--bg-card) border transition-all flex flex-col justify-between relative overflow-hidden group shadow-xs ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                      : 'border-(--border-subtle) hover:border-[#4E82EE]/40'
                  }`}
                >
                  {/* Top Bar: Category Chip & Action Buttons */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}
                      >
                        <Icon size={12} />
                        <span>{meta.label}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {/* Note Action Button */}
                        <button
                          onClick={() => handleOpenNoteModal(goal)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                            hasNotes
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                              : 'bg-(--bg-elevated) hover:bg-amber-500/10 hover:text-amber-500 text-(--text-secondary) border-(--border-subtle)'
                          }`}
                          title={hasNotes ? 'View/Edit Strategic Notes' : 'Add Strategic Note'}
                        >
                          <StickyNote size={12} />
                          <span>{hasNotes ? 'Notes ✓' : 'Add Note'}</span>
                        </button>

                        {/* Ask AI Coach */}
                        <button
                          onClick={() => askAiCoach(goal)}
                          className="px-2.5 py-1 rounded-lg bg-(--bg-elevated) hover:bg-[#4E82EE]/10 text-[#4E82EE] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-(--border-subtle)"
                          title="Generate actionable strategy with AI"
                        >
                          <Sparkles size={12} />
                          <span>AI Coach</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(goal)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
                          title="Edit Objective"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            showConfirm({
                              title: 'Delete Objective',
                              message: `Are you sure you want to delete "${goal.title}" and all its milestones? This cannot be undone.`,
                              confirmText: 'Delete',
                              type: 'danger',
                              onConfirm: () => deleteGoal(goal.id),
                            });
                          }}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Objective"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Goal Title & Description */}
                    <div className="space-y-1 mb-4">
                      <h3
                        className={`font-bold text-base leading-snug ${
                          isDone ? 'text-(--text-muted) line-through' : 'text-(--text-primary)'
                        }`}
                      >
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-(--text-secondary) line-clamp-2 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    {/* Linear Progress Indicator */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-(--text-primary)">
                          {goal.progress || 0}% Completed
                        </span>
                        <span className="text-[11px] text-(--text-muted)">
                          {completedCount} / {milestones.length} Milestones
                        </span>
                      </div>
                      <div className="w-full h-2 bg-(--bg-elevated) rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${goal.progress || 0}%`,
                            background: isDone
                              ? '#10B981'
                              : 'linear-gradient(90deg, #4E82EE, #9B72CF)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Milestones Checklist Section */}
                    {milestones.length > 0 && (
                      <div className="space-y-2 mb-4 bg-(--bg-elevated)/60 p-3 rounded-2xl border border-(--border-subtle)/50">
                        <div className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider px-1">
                          Key Milestones
                        </div>
                        <div className="space-y-1.5">
                          {milestones.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleGoalMilestone(goal.id, m.id)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-(--bg-card) transition-colors cursor-pointer group/item"
                            >
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  m.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-(--border-subtle) group-hover/item:border-[#4E82EE]'
                                }`}
                              >
                                {m.completed && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span
                                className={`text-xs flex-1 truncate ${
                                  m.completed
                                    ? 'line-through text-(--text-muted)'
                                    : 'text-(--text-primary) font-medium'
                                }`}
                              >
                                {m.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Add Milestone */}
                    {inlineMilestoneGoalId === goal.id ? (
                      <div className="flex items-center gap-2 mb-4 animate-in fade-in">
                        <input
                          type="text"
                          autoFocus
                          value={inlineMilestoneText}
                          onChange={(e) => setInlineMilestoneText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddInlineMilestone(goal);
                            if (e.key === 'Escape') setInlineMilestoneGoalId(null);
                          }}
                          placeholder="New milestone title..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddInlineMilestone(goal)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineMilestoneGoalId(null)}
                          className="p-1.5 text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineMilestoneGoalId(goal.id);
                          setInlineMilestoneText('');
                        }}
                        className="text-[11px] font-semibold text-[#4E82EE] hover:underline flex items-center gap-1 mb-4 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add next milestone</span>
                      </button>
                    )}

                    {/* Inline Strategic Notes Card Drawer Toggle */}
                    <div className="mb-4 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedNoteGoalId(isNoteAccordionOpen ? null : goal.id);
                          if (!cardNoteDraft[goal.id] && goal.notes) {
                            setCardNoteDraft((prev) => ({ ...prev, [goal.id]: goal.notes || '' }));
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-(--bg-elevated)/70 hover:bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <StickyNote size={13} className={hasNotes ? 'text-amber-500' : 'text-(--text-muted)'} />
                          <span className="text-(--text-secondary)">
                            {hasNotes ? 'Strategic Note Attached' : 'Quick Note & Reflections'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#4E82EE]">
                          <span>{isNoteAccordionOpen ? 'Hide' : hasNotes ? 'View/Edit' : '+ Type Note'}</span>
                          <ChevronDown
                            size={13}
                            className={`transition-transform duration-200 ${isNoteAccordionOpen ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {isNoteAccordionOpen && (
                        <div className="mt-2 p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-2.5 animate-in fade-in">
                          <textarea
                            rows={3}
                            value={currentNoteVal}
                            onChange={(e) =>
                              setCardNoteDraft((prev) => ({ ...prev, [goal.id]: e.target.value }))
                            }
                            placeholder="Type strategic notes, insights, blockers, or execution next steps..."
                            className="w-full p-2.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 resize-y"
                          />

                          <div className="flex items-center justify-between gap-2 pt-1">
                            {/* Save button */}
                            <button
                              type="button"
                              onClick={() => handleSaveCardNote(goal)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4E82EE] hover:bg-[#3b6ecc] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              <Save size={13} />
                              <span>{cardNoteSaved[goal.id] ? 'Saved ✓' : 'Save Note'}</span>
                            </button>

                            {/* Download buttons for this goal */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleExportGoalDocx(goal)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-(--bg-card) hover:bg-(--bg-elevated) border border-(--border-subtle) text-[11px] font-semibold text-(--text-secondary) hover:text-blue-500 transition-colors cursor-pointer"
                                title="Download as .docx"
                              >
                                <FileText size={12} className="text-blue-500" />
                                <span>.docx</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportGoalPdf(goal)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-(--bg-card) hover:bg-(--bg-elevated) border border-(--border-subtle) text-[11px] font-semibold text-(--text-secondary) hover:text-rose-500 transition-colors cursor-pointer"
                                title="Download as PDF"
                              >
                                <FileCode size={12} className="text-rose-500" />
                                <span>.pdf</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Footer: Target Date & Quick Downloads */}
                  <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between text-[11px] text-(--text-muted)">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-[#4E82EE]" />
                      {goal.targetDate ? (
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      ) : (
                        <span>No deadline set</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct export buttons in footer */}
                      <button
                        type="button"
                        onClick={() => handleExportGoalDocx(goal)}
                        className="hover:text-blue-500 transition-colors cursor-pointer p-1"
                        title="Download Note & Objective as .docx"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportGoalPdf(goal)}
                        className="hover:text-rose-500 transition-colors cursor-pointer p-1"
                        title="Download Note & Objective as .pdf"
                      >
                        <Download size={13} />
                      </button>

                      {isDone ? (
                        <span className="text-emerald-500 font-semibold ml-1">✓ Done</span>
                      ) : (
                        <span className="font-medium text-(--text-secondary) ml-1">Active</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dedicated Strategic Note Modal */}
      {noteGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-xl shadow-2xl p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle) shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <StickyNote size={20} />
                </div>
                <div>
                  <h2 className="app-modal-title text-base sm:text-lg font-bold">
                    Strategic Notes & Action Plan
                  </h2>
                  <p className="app-card-subtitle text-xs text-(--text-muted) truncate max-w-sm">
                    {noteGoal.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoteGoal(null)}
                className="p-2 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Note Editor Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4">
              {/* Goal metadata preview badge */}
              <div className="p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-(--text-muted) uppercase">Objective</div>
                  <div className="font-bold text-(--text-primary)">{noteGoal.title}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[11px] font-semibold text-(--text-muted) uppercase">Progress</div>
                  <div className="font-bold text-[#4E82EE]">{noteGoal.progress || 0}%</div>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1.5">
                  Type your strategic notes, key takeaways & execution reflections:
                </label>
                <textarea
                  rows={9}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record strategic insights, decisions made, obstacles encountered, tactical next steps, or meeting notes for this objective..."
                  className="w-full p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-xs sm:text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 resize-none font-mono sm:font-sans leading-relaxed"
                />
              </div>

              {/* Download Option Section */}
              <div className="p-4 rounded-2xl bg-(--bg-elevated)/60 border border-(--border-subtle) space-y-2.5">
                <div className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                  Download Objective & Note
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleExportGoalDocx(noteGoal)}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-blue-500/50 hover:bg-(--bg-card) text-xs font-semibold text-(--text-primary) shadow-xs transition-all cursor-pointer"
                  >
                    <FileText size={15} className="text-blue-500" />
                    <span>Download .docx</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportGoalPdf(noteGoal)}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-rose-500/50 hover:bg-(--bg-card) text-xs font-semibold text-(--text-primary) shadow-xs transition-all cursor-pointer"
                  >
                    <FileCode size={15} className="text-rose-500" />
                    <span>Download .pdf</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-(--border-subtle) flex items-center justify-between shrink-0">
              <div className="text-xs text-emerald-500 font-semibold">
                {noteSavedFeedback && '✓ Note saved successfully!'}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoteGoal(null)}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalNote}
                  disabled={isSavingNote}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  <Save size={14} />
                  <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Objective Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-(--border-subtle) shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="app-modal-title">
                    {editingGoal ? 'Edit Objective' : 'New Objective (OKR)'}
                  </h2>
                  <p className="app-card-subtitle">
                    Set measurable strategic goals with milestone tracking & notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-(--text-muted) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4">
              {/* Objective Title */}
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Objective Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Master System Design & Advanced Algorithms"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Why is this goal important? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Essential for senior engineering interviews and building high-scale distributed systems."
                  className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary) resize-none"
                />
              </div>

              {/* Strategic Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                  Strategic Notes & Action Plan (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Focus 1 hour every morning on distributed databases and system caching patterns."
                  className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary) resize-none"
                />
              </div>

              {/* Category & Target Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none text-(--text-primary) cursor-pointer"
                  >
                    <option value="career">Career & Work</option>
                    <option value="health">Health & Fitness</option>
                    <option value="finance">Financial Wealth</option>
                    <option value="learning">Learning & Skills</option>
                    <option value="personal">Personal Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none text-(--text-primary)"
                  />
                </div>
              </div>

              {/* Milestones Builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-(--text-muted) uppercase">
                    Milestones / Key Results
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMilestoneField}
                    className="text-[11px] text-[#4E82EE] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Milestone
                  </button>
                </div>

                <div className="space-y-2">
                  {milestonesInput.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-mono text-(--text-muted)">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => handleMilestoneChange(idx, e.target.value)}
                        placeholder={`Milestone ${idx + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
                      />
                      {milestonesInput.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestoneField(idx)}
                          className="p-2 text-(--text-muted) hover:text-rose-500 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-(--border-subtle) flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  {editingGoal ? 'Update Objective' : 'Create Objective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
