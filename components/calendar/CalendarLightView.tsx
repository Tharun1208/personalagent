'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  Search,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Bell,
  Video,
  Gift,
  Briefcase,
  Users,
  MapPin,
  Repeat,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  ListTodo,
  Tag,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';
import { Reminder, Task } from '@/types';
import CustomSelect, { SelectOption } from '@/components/common/CustomSelect';

export type CalendarViewMode = 'day' | 'week' | 'month';

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'normal', label: 'Normal Priority', badgeColor: '#3b82f6' },
  { value: 'high', label: 'High Priority', badgeColor: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', badgeColor: '#ef4444' },
];

const TASK_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low Priority', badgeColor: '#64748b' },
  { value: 'medium', label: 'Medium Priority', badgeColor: '#3b82f6' },
  { value: 'high', label: 'High Priority', badgeColor: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', badgeColor: '#ef4444' },
];

const RECURRENCE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'One-time event' },
  { value: 'daily', label: 'Repeats Daily' },
  { value: 'weekly', label: 'Repeats Weekly' },
  { value: 'monthly', label: 'Repeats Monthly' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface FormattedEvent {
  id: string;
  itemType: 'reminder' | 'task';
  title: string;
  dateStr: string;
  timeStr: string;
  rawDate: Date;
  recurrence?: string;
  notes?: string;
  priority?: string;
  category?: 'meeting' | 'birthday' | 'task' | 'general' | 'reminder';
  colorBg: string;
  colorBorder: string;
  colorText: string;
  isDone: boolean;
  originalReminder?: Reminder;
  originalTask?: Task;
}

export default function CalendarLightView() {
  const {
    tasks,
    createTask,
    reminders,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleTask,
    deleteTask,
    showToast,
  } = useApp();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dropdown states
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  
  // Modals state
  const [selectedEvent, setSelectedEvent] = useState<FormattedEvent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDayAgendaModalOpen, setIsDayAgendaModalOpen] = useState(false);
  
  // Schedule / Reminder Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('14:00');
  const [formRecurrence, setFormRecurrence] = useState('none');
  const [formNotes, setFormNotes] = useState('');
  const [formPriority, setFormPriority] = useState('normal');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  // Safe date parser
  const parseDateSafe = (dateStr?: string): Date => {
    if (!dateStr) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: Format events list from reminders + tasks
  const allEvents = useMemo(() => {
    const list: FormattedEvent[] = [];

    // Reminders
    (reminders || []).forEach((r) => {
      const rawDateStr = r.dueDateTime || (r as any).dateTime || (r as any).time;
      const d = parseDateSafe(rawDateStr);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      let colorBg = 'bg-blue-50';
      let colorBorder = 'border-blue-200';
      let colorText = 'text-[#1C73E8]';
      let category: FormattedEvent['category'] = 'meeting';

      const lower = (r.title + ' ' + (r.notes || '')).toLowerCase();
      if (lower.includes('birthday') || lower.includes('party') || lower.includes('anniversary')) {
        category = 'birthday';
        colorBg = 'bg-amber-50';
        colorBorder = 'border-amber-200';
        colorText = 'text-amber-800';
      } else if (lower.includes('zoom') || lower.includes('call') || lower.includes('meet') || lower.includes('sync')) {
        category = 'meeting';
        colorBg = 'bg-blue-50';
        colorBorder = 'border-blue-200';
        colorText = 'text-[#1C73E8]';
      } else if (lower.includes('exam') || lower.includes('assignment') || lower.includes('project') || lower.includes('deadline')) {
        category = 'task';
        colorBg = 'bg-indigo-50';
        colorBorder = 'border-indigo-200';
        colorText = 'text-indigo-800';
      }

      list.push({
        id: `reminder_${r.id}`,
        itemType: 'reminder',
        title: r.title,
        dateStr,
        timeStr,
        rawDate: d,
        recurrence: r.recurrence,
        notes: r.notes,
        priority: (r as any).priority || 'normal',
        category,
        colorBg,
        colorBorder,
        colorText,
        isDone: false,
        originalReminder: r,
      });
    });

    // Tasks
    (tasks || []).forEach((t) => {
      const d = parseDateSafe(t.dueDate || t.createdAt);
      const timeStr = 'All day';
      const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      list.push({
        id: `task_${t.id}`,
        itemType: 'task',
        title: t.title,
        dateStr,
        timeStr,
        rawDate: d,
        notes: t.description,
        priority: t.priority,
        category: 'task',
        colorBg: 'bg-indigo-50',
        colorBorder: 'border-indigo-200',
        colorText: 'text-indigo-800',
        isDone: t.status === 'completed',
        originalTask: t,
      });
    });

    list.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    return list;
  }, [reminders, tasks]);

  // Filtered by Search Query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const q = searchQuery.toLowerCase();
    return allEvents.filter((e) => e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)));
  }, [allEvents, searchQuery]);

  // Selected Day Weekdays Strip (7 days)
  const currentWeekDays = useMemo(() => {
    const start = new Date(selectedDate);
    const dayIndex = start.getDay();
    start.setDate(start.getDate() - dayIndex);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isToday = new Date().toDateString() === d.toDateString();
      const isSelected = selectedDate.toDateString() === d.toDateString();

      return {
        date: d,
        dayName: WEEKDAY_NAMES[d.getDay()],
        dayNum: d.getDate(),
        isToday,
        isSelected,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [selectedDate]);

  // Calendar Grid for Month View
  const monthCalendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        isSelected: isSameDay(d, selectedDate),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        isToday: isSameDay(d, new Date()),
        isSelected: isSameDay(d, selectedDate),
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        isToday: isSameDay(d, new Date()),
        isSelected: isSameDay(d, selectedDate),
      });
    }

    return days;
  }, [year, month, selectedDate]);

  // Handlers for month navigation
  const handlePrev = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleSelectMonth = (mIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), mIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const handleStepYear = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear() + delta, currentDate.getMonth(), 1));
  };

  // Open modals
  const handleTogglePlusMenu = () => {
    setIsPlusMenuOpen((prev) => !prev);
    setIsMonthPickerOpen(false);
  };

  const openScheduleCreateModal = () => {
    setIsPlusMenuOpen(false);
    setIsEditingSchedule(false);
    setEditingScheduleId(null);
    setFormTitle('');
    
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    setFormDate(`${yyyy}-${mm}-${dd}`);
    setFormTime('14:00');
    setFormRecurrence('none');
    setFormNotes('');
    setFormPriority('normal');
    setIsScheduleModalOpen(true);
  };

  const openTaskCreateModal = () => {
    setIsPlusMenuOpen(false);
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('medium');
    
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    setTaskDueDate(`${yyyy}-${mm}-${dd}`);
    setIsTaskModalOpen(true);
  };

  const openEditModal = (ev: FormattedEvent) => {
    setIsDetailsOpen(false);
    if (ev.itemType === 'reminder' && ev.originalReminder) {
      setIsEditingSchedule(true);
      setEditingScheduleId(ev.originalReminder.id);
      setFormTitle(ev.title);
      const d = ev.rawDate;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setFormDate(`${yyyy}-${mm}-${dd}`);
      setFormTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setFormRecurrence(ev.recurrence || 'none');
      setFormNotes(ev.notes || '');
      setFormPriority(ev.priority || 'normal');
      setIsScheduleModalOpen(true);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const dueDateTime = `${formDate}T${formTime}:00`;

    if (isEditingSchedule && editingScheduleId) {
      await updateReminder(editingScheduleId, {
        title: formTitle.trim(),
        dueDateTime,
        recurrence: formRecurrence as any,
        notes: formNotes.trim() || undefined,
        priority: formPriority as any,
      });
      showToast?.('Schedule event updated', 'success');
    } else {
      await createReminder(
        formTitle.trim(),
        dueDateTime,
        formRecurrence,
        formNotes.trim() || undefined
      );
      showToast?.('Schedule event created', 'success');
    }

    setIsScheduleModalOpen(false);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await createTask(
      taskTitle.trim(),
      taskPriority,
      taskDueDate || undefined
    );
    showToast?.('Task created successfully', 'success');
    setIsTaskModalOpen(false);
  };

  const handleDeleteEvent = async (ev: FormattedEvent) => {
    if (ev.itemType === 'reminder' && ev.originalReminder) {
      await deleteReminder(ev.originalReminder.id);
      showToast?.('Schedule event removed', 'info');
    } else if (ev.itemType === 'task' && ev.originalTask) {
      await deleteTask(ev.originalTask.id);
      showToast?.('Task removed', 'info');
    }
    setIsDetailsOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-slate-900 select-none font-sans relative">
      
      {/* ── 1. Top Header ── */}
      <header className="relative z-30 px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        {/* Left: Year & Month Title with interactive dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsMonthPickerOpen((p) => !p);
                setIsPlusMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer group"
            >
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>{year} {MONTH_NAMES[month]}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 group-hover:text-slate-900 transition-transform duration-200 ${
                    isMonthPickerOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </h1>
            </button>

            {/* Interactive Month & Year Picker Dropdown */}
            <AnimatePresence>
              {isMonthPickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={() => setIsMonthPickerOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-full mt-2 z-50 w-72 p-3.5 rounded-3xl bg-white border border-slate-200 shadow-[0_20px_45px_rgba(0,0,0,0.16)] ring-1 ring-black/5"
                  >
                    {/* Year Switcher */}
                    <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleStepYear(-1)}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-sm font-extrabold text-slate-900">
                        {year}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStepYear(1)}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {/* 12 Months Grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {SHORT_MONTH_NAMES.map((mName, idx) => {
                        const isCurrent = idx === month;
                        return (
                          <button
                            key={mName}
                            type="button"
                            onClick={() => handleSelectMonth(idx)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {mName}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200 shadow-2xs transition-all cursor-pointer ml-1 active:scale-95"
            >
              Today
            </button>
          </div>
        </div>

        {/* Right: Search & Plus Button with Elevated Dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search schedule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-full text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-44 transition-all"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleTogglePlusMenu}
              className={`w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:opacity-95 ${
                isPlusMenuOpen ? 'ring-3 ring-blue-500/30 scale-105' : ''
              }`}
              title="Create Event or Task"
            >
              <Plus
                size={20}
                className={`transition-transform duration-250 ${isPlusMenuOpen ? 'rotate-45' : ''}`}
              />
            </button>

            {/* ── Elevated "Add to Calendar" Dropdown Menu ── */}
            <AnimatePresence>
              {isPlusMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/25"
                    onClick={() => setIsPlusMenuOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2.5 z-50 w-72 rounded-3xl bg-white border border-slate-200/90 shadow-[0_24px_60px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.06)] p-2.5 space-y-1.5 ring-1 ring-black/5 origin-top-right"
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        Add to Calendar
                      </span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>

                    {/* Option 1: Schedule Event */}
                    <button
                      type="button"
                      onClick={openScheduleCreateModal}
                      className="w-full p-3 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-between group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                          <CalendarIcon size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            New Event
                          </p>
                          <p className="text-[10.5px] text-slate-400 leading-tight">
                            Meetings, alarms & reminders
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* Option 2: Task */}
                    <button
                      type="button"
                      onClick={openTaskCreateModal}
                      className="w-full p-3 rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-between group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                          <CheckSquare size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            New Task
                          </p>
                          <p className="text-[10.5px] text-slate-400 leading-tight">
                            To-dos, priorities & goals
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ── 2. View Mode Selector (Day, Week, Month) ── */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          {[
            { key: 'day', label: 'Day', icon: Clock },
            { key: 'week', label: 'Week', icon: SlidersHorizontal },
            { key: 'month', label: 'Month', icon: CalendarIcon },
          ].map((mode) => {
            const isActive = viewMode === mode.key;
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setViewMode(mode.key as CalendarViewMode)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">
          {filteredEvents.length} items scheduled
        </span>
      </div>

      {/* ── 3. Horizontal Weekday Selector Strip (Day & Week views) ── */}
      {viewMode !== 'month' && (
        <div className="px-4 sm:px-6 py-3 bg-[#F8FAFC] border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-2xl mx-auto">
            {currentWeekDays.map((item, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(item.date)}
                  className="flex flex-col items-center gap-1.5 py-1.5 rounded-2xl transition-all cursor-pointer group"
                >
                  <span
                    className={`text-[11px] font-bold tracking-wider ${
                      item.isWeekend ? 'text-rose-500 font-extrabold' : 'text-slate-500'
                    }`}
                  >
                    {item.dayName}
                  </span>

                  <span
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-200 ${
                      item.isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                        : item.isToday
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'text-slate-800 hover:bg-slate-200/60'
                    }`}
                  >
                    {item.dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Main Scrollable Content Area ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 py-4 pb-20">
        <div className="max-w-3xl mx-auto">

          {/* VIEW 1: DAY VIEW */}
          {viewMode === 'day' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {filteredEvents.filter((e) => isSameDay(e.rawDate, selectedDate)).length} scheduled items
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openScheduleCreateModal}
                    className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Item</span>
                  </button>
                </div>

                {filteredEvents.filter((e) => isSameDay(e.rawDate, selectedDate)).length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    {filteredEvents
                      .filter((e) => isSameDay(e.rawDate, selectedDate))
                      .map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setIsDetailsOpen(true);
                          }}
                          className={`p-3.5 rounded-2xl border ${ev.colorBg} ${ev.colorBorder} ${ev.colorText} flex items-center justify-between cursor-pointer hover:shadow-xs transition-all`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {ev.itemType === 'task' ? <CheckSquare size={17} /> : <CalendarIcon size={17} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{ev.title}</p>
                              <p className="text-xs opacity-80 mt-0.5">{ev.timeStr} {ev.notes ? `· ${ev.notes}` : ''}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/80 uppercase shrink-0 ml-2">
                            {ev.itemType}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    No events or tasks scheduled for this day. Click "+ Add Item" above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              {currentWeekDays.map((dayItem, idx) => {
                const dayEvents = filteredEvents.filter((e) => isSameDay(e.rawDate, dayItem.date));
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-3xl border transition-all ${
                      dayItem.isSelected
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold ${dayItem.isWeekend ? 'text-rose-500' : 'text-slate-500'}`}>
                          {dayItem.dayName}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {dayItem.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {dayEvents.length} items
                      </span>
                    </div>

                    {dayEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        {dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => {
                              setSelectedEvent(ev);
                              setIsDetailsOpen(true);
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-semibold ${ev.colorBg} ${ev.colorBorder} ${ev.colorText} flex items-center justify-between cursor-pointer`}
                          >
                            <span className="truncate">{ev.title}</span>
                            <span className="text-[10px] opacity-75 shrink-0 ml-2">{ev.timeStr}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-1">No items</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="space-y-4">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 pb-1">
                {WEEKDAY_NAMES.map((wd, i) => (
                  <div key={wd} className={i === 0 || i === 6 ? 'text-rose-500' : ''}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Month Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {monthCalendarDays.map((cell, idx) => {
                  const dayEvents = filteredEvents.filter((e) => isSameDay(e.rawDate, cell.date));
                  const isSelected = isSameDay(cell.date, selectedDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        if (dayEvents.length > 0) {
                          setIsDayAgendaModalOpen(true);
                        }
                      }}
                      className={`min-h-[80px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30'
                          : cell.isCurrentMonth
                          ? 'bg-white border-slate-200/70 hover:border-slate-300'
                          : 'bg-slate-50/50 border-transparent opacity-40'
                      }`}
                    >
                      {/* Top Date Number */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            cell.isToday
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-800'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>

                      {/* Event Chips Preview */}
                      <div className="space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md truncate ${ev.colorBg} ${ev.colorText}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] font-extrabold text-blue-600 pl-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── 5. MODAL: CREATE TASK POP-UP ── */}
      {isTaskModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsTaskModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 text-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckSquare size={18} />
                </div>
                <h3 className="text-base font-extrabold">Create New Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete financial audit presentation"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Priority
                  </label>
                  <CustomSelect
                    value={taskPriority}
                    onChange={(val) => setTaskPriority(val as any)}
                    options={TASK_PRIORITY_OPTIONS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                  Description / Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Add notes, sub-goals or checklist items..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-normal focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-md shadow-indigo-500/25 cursor-pointer hover:opacity-95 active:scale-95"
                >
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── 6. MODAL: CREATE / EDIT SCHEDULE EVENT ── */}
      {isScheduleModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 text-slate-900 space-y-4"
          >
            <div className="px-1 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue-600" />
                <span>{isEditingSchedule ? 'Edit Schedule Event' : 'New Schedule Event'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zoom sync with product lead"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Recurrence
                  </label>
                  <CustomSelect
                    value={formRecurrence}
                    onChange={(val) => setFormRecurrence(val)}
                    options={RECURRENCE_OPTIONS}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                    Priority
                  </label>
                  <CustomSelect
                    value={formPriority}
                    onChange={(val) => setFormPriority(val as any)}
                    options={PRIORITY_OPTIONS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider">
                  Notes / Location
                </label>
                <textarea
                  rows={3}
                  placeholder="Meeting agenda, links or location..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 cursor-pointer hover:opacity-95 active:scale-95"
                >
                  {isEditingSchedule ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── 7. MODAL: EVENT DETAILS ── */}
      {isDetailsOpen && selectedEvent && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDetailsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 text-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide">
                {selectedEvent.itemType === 'task' ? 'Task Details' : 'Event Details'}
              </h2>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className={`p-4.5 rounded-2xl ${selectedEvent.itemType === 'task' ? 'bg-indigo-50 border border-indigo-200' : 'bg-blue-50 border border-blue-200'} space-y-2`}>
              <h3 className="text-base font-extrabold leading-snug">
                {selectedEvent.title}
              </h3>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-90">
                <Clock size={14} />
                <span>
                  {selectedEvent.rawDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, {selectedEvent.timeStr}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {selectedEvent.notes && (
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block">Notes</span>
                  <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed font-normal">
                    {selectedEvent.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              {selectedEvent.itemType === 'reminder' && (
                <button
                  type="button"
                  onClick={() => openEditModal(selectedEvent)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent)}
                className="flex-1 py-2.5 rounded-full border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── 8. MODAL: DAY AGENDA POP-UP ── */}
      {isDayAgendaModalOpen && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDayAgendaModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 text-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue-600" />
                <h2 className="text-sm font-extrabold uppercase tracking-wide">
                  {selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDayAgendaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
              {filteredEvents
                .filter((e) => isSameDay(e.rawDate, selectedDate))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setIsDayAgendaModalOpen(false);
                      setSelectedEvent(ev);
                      setIsDetailsOpen(true);
                    }}
                    className={`p-3.5 rounded-2xl border ${ev.colorBg} ${ev.colorBorder} ${ev.colorText} flex items-center justify-between cursor-pointer hover:shadow-xs transition-all`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {ev.itemType === 'task' ? <CheckSquare size={17} /> : <CalendarIcon size={17} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{ev.title}</p>
                        <p className="text-xs opacity-80 mt-0.5">{ev.timeStr} {ev.notes ? `· ${ev.notes}` : ''}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/80 uppercase shrink-0 ml-2">
                      {ev.itemType}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDayAgendaModalOpen(false);
                  openScheduleCreateModal();
                }}
                className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDayAgendaModalOpen(false)}
                className="px-5 py-2 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
