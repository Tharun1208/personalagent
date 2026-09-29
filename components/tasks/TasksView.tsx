'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Filter,
  X,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ListTodo,
  LayoutGrid,
  List,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { Task, SubTask } from '@/types';
import { KanbanBoard, type KanbanColumn, type KanbanTask } from '@/components/ui/kanban-board';

interface DateTaskGroup {
  id: string;
  title: string;
  subtitle?: string;
  type: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'no_date';
  tasks: Task[];
  dateSortKey: number;
}

function groupTasksByDate(tasksList: Task[]): DateTaskGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;

  const overdueGroup: DateTaskGroup = {
    id: 'overdue',
    title: 'Overdue',
    subtitle: 'Needs immediate attention',
    type: 'overdue',
    tasks: [],
    dateSortKey: -1,
  };

  const todayGroup: DateTaskGroup = {
    id: 'today',
    title: 'Today',
    subtitle: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    type: 'today',
    tasks: [],
    dateSortKey: startOfToday,
  };

  const tomorrowGroup: DateTaskGroup = {
    id: 'tomorrow',
    title: 'Tomorrow',
    subtitle: new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    type: 'tomorrow',
    tasks: [],
    dateSortKey: startOfTomorrow,
  };

  const noDateGroup: DateTaskGroup = {
    id: 'no_date',
    title: 'No Due Date',
    subtitle: 'Backlog & unscheduled items',
    type: 'no_date',
    tasks: [],
    dateSortKey: Number.MAX_SAFE_INTEGER,
  };

  const upcomingMap = new Map<string, DateTaskGroup>();

  for (const task of tasksList) {
    if (!task.dueDate) {
      noDateGroup.tasks.push(task);
      continue;
    }

    try {
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) {
        noDateGroup.tasks.push(task);
        continue;
      }
      const taskDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (taskDayStart < startOfToday && task.status !== 'completed') {
        overdueGroup.tasks.push(task);
      } else if (taskDayStart === startOfToday) {
        todayGroup.tasks.push(task);
      } else if (taskDayStart === startOfTomorrow) {
        tomorrowGroup.tasks.push(task);
      } else {
        const dateKey = `date_${taskDayStart}`;
        const dateTitle = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const dateSubtitle = d.toLocaleDateString('en-US', { year: 'numeric' });
        if (!upcomingMap.has(dateKey)) {
          upcomingMap.set(dateKey, {
            id: dateKey,
            title: dateTitle,
            subtitle: dateSubtitle,
            type: 'upcoming',
            tasks: [],
            dateSortKey: taskDayStart,
          });
        }
        upcomingMap.get(dateKey)!.tasks.push(task);
      }
    } catch {
      noDateGroup.tasks.push(task);
    }
  }

  const result: DateTaskGroup[] = [];
  if (overdueGroup.tasks.length > 0) result.push(overdueGroup);
  if (todayGroup.tasks.length > 0) result.push(todayGroup);
  if (tomorrowGroup.tasks.length > 0) result.push(tomorrowGroup);

  const upcomingSorted = Array.from(upcomingMap.values()).sort((a, b) => a.dateSortKey - b.dateSortKey);
  result.push(...upcomingSorted);

  if (noDateGroup.tasks.length > 0) result.push(noDateGroup);

  return result;
}

export default function TasksView() {
  const { tasks, createTask, toggleTask, updateTaskStatus, deleteTask, refreshAll } = useApp();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [dueDate, setDueDate] = useState('');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? t.status === 'todo' || t.status === 'in_progress'
        : t.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createTask(title.trim(), priority, dueDate || undefined);
    setTitle('');
    setDescription('');
    setDueDate('');
    setIsAddOpen(false);
  };

  const handleUpdateStatus = (taskId: string, newStatus: Task['status']) => {
    updateTaskStatus(taskId, newStatus);
  };

  const handleBreakdown = async (taskId: string) => {
    setBreakingDownId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/breakdown`, { method: 'POST' });
      const data = await res.json();
      if (data.task) {
        refreshAll();
      }
    } catch (err) {
      console.error('Failed to break down task', err);
    } finally {
      setBreakingDownId(null);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/breakdown`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId }),
      });
      refreshAll();
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">HIGH</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">MEDIUM</span>;
    }
  };

  const mapToKanban = (t: Task): KanbanTask => {
    const subtasks = t.subtasks || [];
    const completedCount = subtasks.filter((s) => s.completed).length;
    const progress = subtasks.length > 0 
      ? Math.round((completedCount / subtasks.length) * 100)
      : t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0;

    let dueText: string | undefined = undefined;
    let isDueSoon = false;
    if (t.dueDate) {
      try {
        const d = new Date(t.dueDate);
        dueText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const diff = d.getTime() - Date.now();
        if (diff > 0 && diff < 86400000 * 2) {
          isDueSoon = true;
        }
      } catch {
        dueText = t.dueDate;
      }
    }

    return {
      id: t.id,
      title: t.title,
      note: t.description || (subtasks.length > 0 ? `${completedCount}/${subtasks.length} subtasks completed` : undefined),
      priority: t.priority === 'urgent' ? 'urgent' : t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'normal',
      category: (t as any).category || (t.dueDate ? 'Scheduled' : 'Task'),
      icon: (t as any).category?.toLowerCase().includes('mobile') ? 'mobile' : (t as any).category?.toLowerCase().includes('infra') ? 'infra' : (t as any).category?.toLowerCase().includes('web') ? 'web' : 'dashboard',
      due: dueText,
      dueSoon: isDueSoon,
      progress,
    };
  };

  const kanbanColumns: KanbanColumn[] = React.useMemo(() => [
    {
      id: 'todo',
      name: 'To-Do',
      accent: 'blue',
      tasks: filteredTasks.filter((t) => t.status === 'todo').map(mapToKanban),
    },
    {
      id: 'in_progress',
      name: 'In Progress',
      accent: 'violet',
      tasks: filteredTasks.filter((t) => t.status === 'in_progress').map(mapToKanban),
    },
    {
      id: 'completed',
      name: 'Completed',
      accent: 'emerald',
      tasks: filteredTasks.filter((t) => t.status === 'completed').map(mapToKanban),
    },
  ], [filteredTasks]);

  const handleKanbanChange = (newCols: KanbanColumn[]) => {
    for (const col of newCols) {
      const targetStatus = col.id as Task['status'];
      for (const kTask of col.tasks) {
        const original = tasks.find((t) => t.id === kTask.id);
        if (original && original.status !== targetStatus) {
          updateTaskStatus(kTask.id, targetStatus);
        }
      }
    }
  };

  const dateGroups = React.useMemo(() => groupTasksByDate(filteredTasks), [filteredTasks]);

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header */}
      <header className="h-auto min-h-16 py-3 px-3 sm:px-6 border-b border-(--border-subtle) flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-xs border border-indigo-500/20 shrink-0">
            <CheckSquare size={17} />
          </div>
          <div>
            <h1 className="font-semibold text-sm sm:text-base text-(--text-primary) flex items-center gap-2">
              Task Management
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              {tasks.filter((t) => t.status !== 'completed').length} pending tasks with AI subtask checklists
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-(--bg-elevated) rounded-xl border border-(--border-subtle)">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-(--bg-card) text-(--text-primary) shadow-xs' : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
              title="List View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-(--bg-card) text-(--text-primary) shadow-xs' : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white hover:opacity-95 text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-6 pb-2 space-y-3 sm:space-y-4 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-(--bg-card) border border-(--border-subtle) focus:border-indigo-500 text-xs focus:outline-none text-(--text-primary)"
            />
          </div>

          {viewMode === 'list' && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { key: 'all', label: 'All Tasks' },
                { key: 'pending', label: 'Pending' },
                { key: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterStatus === f.key
                      ? 'bg-indigo-500 text-white shadow-xs'
                      : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-w-6xl mx-auto w-full custom-scrollbar">
        {filteredTasks.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <CheckSquare size={36} className="mx-auto text-(--text-muted) opacity-30" />
            <div className="text-base font-medium text-(--text-primary)">No tasks found</div>
            <p className="text-xs text-(--text-muted)">
              Ask Assistance *"Add a task to..."* or click "New Task" above.
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* MODERN FRAMER MOTION DRAGGABLE SQUIRCLE KANBAN BOARD */
          <div className="pb-16 pt-2">
            <KanbanBoard
              columns={kanbanColumns}
              onChange={handleKanbanChange}
              onAddTask={(colId) => {
                setIsAddOpen(true);
              }}
            />
          </div>
        ) : (
          /* STANDARD LIST VIEW - DIVIDED DATE WISE */
          <div className="space-y-8 pb-16">
            {dateGroups.map((group) => (
              <div key={group.id} className="space-y-3">
                {/* Date Group Header */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-(--border-subtle)">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-semibold ${
                        group.type === 'overdue'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                          : group.type === 'today'
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                          : group.type === 'tomorrow'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          : group.type === 'upcoming'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                      }`}
                    >
                      {group.type === 'overdue' ? (
                        <AlertCircle size={14} />
                      ) : group.type === 'today' ? (
                        <Calendar size={14} />
                      ) : group.type === 'tomorrow' ? (
                        <Clock size={14} />
                      ) : (
                        <CalendarDays size={14} />
                      )}
                    </div>
                    <div>
                      <h2
                        className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${
                          group.type === 'overdue'
                            ? 'text-rose-500'
                            : group.type === 'today'
                            ? 'text-indigo-400'
                            : 'text-(--text-primary)'
                        }`}
                      >
                        {group.title}
                      </h2>
                      {group.subtitle && (
                        <p className="text-[10px] sm:text-[11px] text-(--text-muted)">{group.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-(--bg-elevated) text-(--text-muted) border border-(--border-subtle)">
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {/* Tasks List within this Date Group */}
                <div className="space-y-3">
                  {group.tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    const subtasks = task.subtasks || [];
                    const completedSubtasks = subtasks.filter((s) => s.completed).length;

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 group shadow-2xs ${
                          isDone
                            ? 'bg-(--bg-card)/50 border-(--border-subtle) opacity-60'
                            : 'bg-(--bg-card) border-(--border-subtle) hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Parent Task Checkbox */}
                            <button
                              onClick={() => toggleTask(task.id, task.status)}
                              className="mt-0.5 text-(--text-muted) hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 size={20} className="text-emerald-500" />
                              ) : (
                                <Circle size={20} />
                              )}
                            </button>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-sm font-semibold ${
                                    isDone ? 'line-through text-(--text-muted)' : 'text-(--text-primary)'
                                  }`}
                                >
                                  {task.title}
                                </span>
                                {getPriorityBadge(task.priority)}
                              </div>

                              {task.description && (
                                <p className="text-xs text-(--text-secondary) leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-[11px] text-(--text-muted) pt-1">
                                {task.dueDate && (
                                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                                    <Calendar size={12} />
                                    Due: {new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                )}
                                <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* AI Breakdown Button */}
                            {!isDone && (
                              <button
                                onClick={() => handleBreakdown(task.id)}
                                disabled={breakingDownId === task.id}
                                className="px-3 py-1.5 rounded-xl bg-(--bg-elevated) hover:bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Sparkles size={13} className={breakingDownId === task.id ? 'animate-spin' : ''} />
                                <span>{breakingDownId === task.id ? 'Generating...' : 'AI Subtasks'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-2 text-rose-500/80 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Subtasks Checklist */}
                        {subtasks.length > 0 && (
                          <div className="ml-8 pt-2 border-t border-(--border-subtle) space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-(--text-muted) font-medium">
                              <span className="flex items-center gap-1">
                                <ListTodo size={13} /> Subtasks Checklist
                              </span>
                              <span>{completedSubtasks} / {subtasks.length} done</span>
                            </div>

                            <div className="space-y-1.5">
                              {subtasks.map((sub) => (
                                <div
                                  key={sub.id}
                                  onClick={() => handleToggleSubtask(task.id, sub.id)}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-(--bg-elevated)/60 hover:bg-(--bg-elevated) transition-colors cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={() => {}}
                                    className="rounded text-indigo-600 cursor-pointer"
                                  />
                                  <span className={sub.completed ? 'line-through text-(--text-muted)' : 'text-(--text-primary)'}>
                                    {sub.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <h3 className="font-bold text-base text-(--text-primary)">Create New Task</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-2 uppercase tracking-wider">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'low', label: 'Low', activeClass: 'border-slate-400 bg-slate-500/20 text-slate-200 ring-2 ring-slate-500/40 font-bold' },
                    { id: 'medium', label: 'Medium', activeClass: 'border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40 font-bold' },
                    { id: 'high', label: 'High', activeClass: 'border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40 font-bold' },
                    { id: 'urgent', label: 'Urgent', activeClass: 'border-rose-500 bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/40 font-bold' },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? p.activeClass
                            : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary)'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Due Date
                </label>
                {/* Date Quick Presets */}
                <div className="flex items-center gap-1.5 mb-2">
                  {[
                    { label: 'Today', getVal: () => { const d = new Date(); d.setHours(18,0,0,0); return d.toISOString().slice(0, 16); } },
                    { label: 'Tomorrow', getVal: () => { const d = new Date(Date.now() + 86400000); d.setHours(18,0,0,0); return d.toISOString().slice(0, 16); } },
                    { label: 'Next Week', getVal: () => { const d = new Date(Date.now() + 7 * 86400000); d.setHours(18,0,0,0); return d.toISOString().slice(0, 16); } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDueDate(preset.getVal())}
                      className="px-2.5 py-1 rounded-lg bg-(--bg-elevated) border border-(--border-subtle) text-[11px] font-medium text-(--text-secondary) hover:text-(--text-primary) hover:border-indigo-500/50 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="px-2 py-1 rounded-lg text-[11px] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Date</span>
                    <input
                      type="date"
                      value={dueDate ? dueDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const time = dueDate && dueDate.includes('T') ? dueDate.split('T')[1] : '18:00';
                        setDueDate(e.target.value ? `${e.target.value}T${time}` : '');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-(--text-muted) uppercase mb-1 block">Time</span>
                    <input
                      type="time"
                      value={dueDate && dueDate.includes('T') ? dueDate.split('T')[1].slice(0, 5) : '18:00'}
                      onChange={(e) => {
                        const date = dueDate && dueDate.includes('T') ? dueDate.split('T')[0] : new Date().toISOString().split('T')[0];
                        setDueDate(`${date}T${e.target.value}`);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-medium text-(--text-primary) focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-primary) border border-(--border-subtle) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-(--accent) text-(--accent-contrast) text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
