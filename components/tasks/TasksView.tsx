'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List,
  Sparkles,
  Calendar,
  Clock,
  TrendingUp,
  CheckSquare,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Task, SubTask } from '@/types';
import { KanbanBoard, type KanbanColumn, type KanbanTask } from '@/components/ui/kanban-board';

function formatDisplayDateRange(task: Task): string {
  const parseD = (d?: string) => {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date;
  };

  const start = parseD(task.createdAt) || new Date();
  const end = parseD(task.dueDate) || new Date(start.getTime() + 6 * 86400000);

  const formatSingle = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return `${formatSingle(start)} - ${formatSingle(end)}`;
}

export default function TasksView() {
  const {
    tasks,
    createTask,
    updateTask,
    toggleTask,
    updateTaskStatus,
    deleteTask,
    showToast,
    showConfirm,
    setActiveTab,
  } = useApp();

  // Active Filter Tab: 'all' | 'ongoing' | 'completed'
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [viewLayout, setViewLayout] = useState<'mobile_card' | 'kanban'>('mobile_card');

  // Create Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [newDueDate, setNewDueDate] = useState('');

  // Selected / Editing Task State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [editDueDate, setEditDueDate] = useState('');

  // Use real tasks from AppContext
  const allTasksList = useMemo(() => tasks || [], [tasks]);

  // Filter tasks based on active segmented tab
  const displayTasks = useMemo(() => {
    if (activeFilterTab === 'ongoing') {
      return allTasksList.filter((t) => t.status === 'todo' || t.status === 'in_progress');
    }
    if (activeFilterTab === 'completed') {
      return allTasksList.filter((t) => t.status === 'completed');
    }
    return allTasksList;
  }, [allTasksList, activeFilterTab]);

  // Metrics for header
  const totalCount = allTasksList.length;
  const completedCount = allTasksList.filter((t) => t.status === 'completed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Handle Create Task
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createTask(newTitle.trim(), newPriority, newDueDate || undefined);
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setIsAddOpen(false);
    showToast('Task added successfully', 'success');
  };

  // Open Edit for task
  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority((task.priority as any) || 'high');
    setEditDueDate(task.dueDate ? (task.dueDate.includes('T') ? task.dueDate.slice(0, 16) : task.dueDate) : '');
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;

    await updateTask(selectedTask.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priority: editPriority,
      dueDate: editDueDate || undefined,
    });
    showToast('Task updated', 'success');
    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  // Toggle Task Status
  const handleToggleStatus = (task: Task) => {
    toggleTask(task.id, task.status);
  };

  // Delete Task
  const handleDelete = (task: Task) => {
    showConfirm({
      title: 'Delete Task',
      message: `Delete "${task.title}"?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        await deleteTask(task.id);
        setSelectedTask(null);
        showToast('Task removed', 'info');
      },
    });
  };

  // Kanban Board Columns (if toggled)
  const mapToKanban = (t: Task): KanbanTask => ({
    id: t.id,
    title: t.title,
    note: t.description,
    priority: t.priority === 'urgent' ? 'urgent' : t.priority === 'high' ? 'high' : 'normal',
    category: 'Design',
    icon: 'mobile',
    progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
  });

  const kanbanColumns: KanbanColumn[] = useMemo(() => [
    {
      id: 'todo',
      name: 'To-Do',
      accent: 'blue',
      tasks: allTasksList.filter((t) => t.status === 'todo').map(mapToKanban),
    },
    {
      id: 'in_progress',
      name: 'On-going',
      accent: 'violet',
      tasks: allTasksList.filter((t) => t.status === 'in_progress').map(mapToKanban),
    },
    {
      id: 'completed',
      name: 'Completed',
      accent: 'emerald',
      tasks: allTasksList.filter((t) => t.status === 'completed').map(mapToKanban),
    },
  ], [allTasksList]);

  return (
    <div className="flex-1 min-h-screen w-full bg-[#F4F5F8] text-slate-900 flex justify-center items-start pt-4 sm:pt-6 px-3 sm:px-4 overflow-y-auto font-sans select-none pb-28 md:pb-16">
      {/* Responsive Container */}
      <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. TOP HEADER BAR: CLEAN TITLE & ACTION BUTTONS               */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-7 rounded-[30px] bg-white border border-slate-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight flex items-center gap-2.5">
              <span>Task Manager</span>
              <CheckSquare size={22} className="text-[#1C73E8]" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Organize your to-dos, daily focus, and ongoing projects
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0">
            {/* View Switcher Button */}
            <button
              type="button"
              onClick={() => setViewLayout((p) => (p === 'mobile_card' ? 'kanban' : 'mobile_card'))}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98 min-h-[44px]"
              title={viewLayout === 'mobile_card' ? 'Switch to Kanban View' : 'Switch to List View'}
            >
              {viewLayout === 'mobile_card' ? (
                <>
                  <LayoutGrid size={17} />
                  <span>Kanban</span>
                </>
              ) : (
                <>
                  <List size={17} />
                  <span>List</span>
                </>
              )}
            </button>

            {/* Create Task Button */}
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-[#1C73E8] hover:bg-[#1557B0] text-white text-xs sm:text-sm font-bold shadow-sm shadow-[#1C73E8]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 min-h-[44px]"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. THREE REAL TASK METRIC CARDS (MATCHING REFERENCE DESIGN)   */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1: Pending */}
          <div className="p-4 sm:p-5 min-h-[140px] sm:min-h-[155px] rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#5B67F6] uppercase tracking-wider">
                PENDING
              </span>
              <Clock size={17} className="text-[#5B67F6]" strokeWidth={2.5} />
            </div>
            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {totalCount - completedCount}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-400 font-medium truncate mt-1">
                Active to-dos
              </p>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div className="p-4 sm:p-5 min-h-[140px] sm:min-h-[155px] rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">
                COMPLETED
              </span>
              <CheckCircle2 size={17} className="text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {completedCount}
              </span>
              <p className="text-xs sm:text-[13px] text-slate-400 font-medium truncate mt-1">
                Finished tasks
              </p>
            </div>
          </div>

          {/* Card 3: Progress */}
          <div className="p-4 sm:p-5 min-h-[140px] sm:min-h-[155px] rounded-[26px] sm:rounded-[28px] bg-white border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#1C73E8] uppercase tracking-wider">
                PROGRESS
              </span>
              <TrendingUp size={17} className="text-[#1C73E8]" strokeWidth={2.5} />
            </div>
            <div className="mt-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {progressPercent}%
              </span>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className="bg-[#1C73E8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. SEGMENTED TABS & TASK LIST CONTAINER                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-[30px] border border-slate-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
          
          {/* Segmented Filter Tab Bar */}
          <div className="border-b border-slate-100 flex items-stretch bg-slate-50/50">
            <button
              type="button"
              onClick={() => setActiveFilterTab('all')}
              className="flex-1 py-4 text-center cursor-pointer transition-all border-r border-slate-100/90"
            >
              <span
                className={`text-xs sm:text-sm font-bold transition-colors ${
                  activeFilterTab === 'all' ? 'text-[#1C73E8]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Tasks ({totalCount})
              </span>
              <div
                className={`w-12 h-[3px] rounded-full mx-auto mt-1.5 transition-all ${
                  activeFilterTab === 'all' ? 'bg-[#1C73E8]' : 'bg-transparent'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('ongoing')}
              className="flex-1 py-4 text-center cursor-pointer transition-all border-r border-slate-100/90"
            >
              <span
                className={`text-xs sm:text-sm font-bold transition-colors ${
                  activeFilterTab === 'ongoing' ? 'text-[#1C73E8]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                On-going ({totalCount - completedCount})
              </span>
              <div
                className={`w-12 h-[3px] rounded-full mx-auto mt-1.5 transition-all ${
                  activeFilterTab === 'ongoing' ? 'bg-[#1C73E8]' : 'bg-transparent'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('completed')}
              className="flex-1 py-4 text-center cursor-pointer transition-all"
            >
              <span
                className={`text-xs sm:text-sm font-bold transition-colors ${
                  activeFilterTab === 'completed' ? 'text-[#1C73E8]' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Completed ({completedCount})
              </span>
              <div
                className={`w-12 h-[3px] rounded-full mx-auto mt-1.5 transition-all ${
                  activeFilterTab === 'completed' ? 'bg-[#1C73E8]' : 'bg-transparent'
                }`}
              />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar">
            {viewLayout === 'kanban' ? (
              <div className="pt-2">
                <KanbanBoard
                  columns={kanbanColumns}
                  onChange={(cols) => {
                    cols.forEach((col) => {
                      const status = col.id as Task['status'];
                      col.tasks.forEach((kt) => {
                        const original = tasks.find((t) => t.id === kt.id);
                        if (original && original.status !== status) {
                          updateTaskStatus(kt.id, status);
                        }
                      });
                    });
                  }}
                  onAddTask={() => setIsAddOpen(true)}
                />
              </div>
            ) : (
              /* ENHANCED TALLER TASK CARDS LIST */
              displayTasks.length > 0 ? (
                <div className="space-y-4">
                  {displayTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenEdit(task)}
                        className="bg-white rounded-[28px] p-6 sm:p-8 min-h-[150px] sm:min-h-[165px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                      >
                        {/* Top Line: Title & Status Badge */}
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <h3 className="text-lg sm:text-[19px] font-bold text-slate-800 tracking-tight leading-snug group-hover:text-[#1C73E8] transition-colors">
                            {task.title}
                          </h3>
                          <span
                            className={`text-xs sm:text-[13px] font-bold shrink-0 px-2.5 py-1 rounded-full ${
                              isDone ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                            }`}
                          >
                            {isDone ? 'Completed' : 'On-going'}
                          </span>
                        </div>

                        {/* Middle Line: Description Snippet */}
                        {task.description && (
                          <p className="text-sm sm:text-base text-slate-500 font-normal leading-relaxed line-clamp-2 mt-3">
                            {task.description}
                          </p>
                        )}

                        {/* Bottom Line: Date Range & Quick Actions */}
                        <div className="flex items-center justify-between mt-5 pt-1 border-t border-slate-50">
                          <p className="text-xs sm:text-sm text-slate-400 font-medium">
                            {formatDisplayDateRange(task)}
                          </p>

                          <div className="flex items-center gap-2 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStatus(task);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#1C73E8] hover:bg-slate-50 transition-colors"
                              title={isDone ? 'Mark as on-going' : 'Mark as completed'}
                            >
                              {isDone ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 rounded-[26px] bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1C73E8] flex items-center justify-center mx-auto">
                    <CheckSquare size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">No tasks found</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {activeFilterTab === 'completed'
                        ? 'You have not completed any tasks yet.'
                        : activeFilterTab === 'ongoing'
                        ? 'You have no active ongoing tasks.'
                        : 'Your task list is empty. Click "+ New Task" to create one.'}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CREATE NEW TASK MODAL                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isAddOpen && (
        <div data-modal-backdrop="true" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#1C73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Task description..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#1C73E8] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#1C73E8]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#1C73E8] text-white text-xs font-bold hover:bg-[#1557B0] shadow-xs"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EDIT / DETAIL TASK MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isEditModalOpen && selectedTask && (
        <div data-modal-backdrop="true" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Task Details</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTask(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:border-[#1C73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#1C73E8] resize-none"
                />
              </div>

              {/* Status Toggle in Modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Status</span>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedTask)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedTask.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedTask.status === 'completed' ? 'Completed' : 'On-going'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedTask)}
                  className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedTask(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#1C73E8] text-white text-xs font-bold hover:bg-[#1557B0]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
