'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  CheckSquare,
  Plus,
  X,
  AlarmClock,
  ListTodo,
  Trash2,
  MapPin,
  Zap,
  Download,
  Check,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import {
  getHolidayForDate,
  getHolidaysForYear,
  getHolidaysForMonth,
  isGovernmentHoliday,
} from '@/lib/calendar/holidays';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Local date YYYY-MM-DD formatter (avoids UTC toISOString timezone off-by-one day bugs)
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarView() {
  const { tasks, reminders, createTask, createReminder, toggleTask, deleteReminder } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerAnchorRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'events' | 'tasks' | 'holidays' | 'completed'>('all');
  
  // Quick natural language input
  const [quickInput, setQuickInput] = useState('');

  // Day Details Modal state
  const [isDayDetailsModalOpen, setIsDayDetailsModalOpen] = useState(false);

  // Event Scheduling Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDate, setModalDate] = useState(() => toLocalDateString(new Date()));
  const [modalTime, setModalTime] = useState('10:00');
  const [modalType, setModalType] = useState<'event' | 'task' | 'alarm'>('event');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [modalRecurrence, setModalRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [modalLocation, setModalLocation] = useState('');

  // Current time tracker for red line indicator in Week/Day views
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Combined timeline items
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      type: 'task' | 'reminder';
      dateTime: Date;
      priority: string;
      status: string;
      original: any;
    }> = [];

    tasks.forEach((t) => {
      if (t.dueDate) {
        items.push({
          id: t.id,
          title: t.title,
          type: 'task',
          dateTime: new Date(t.dueDate),
          priority: t.priority || 'medium',
          status: t.status,
          original: t,
        });
      }
    });

    reminders.forEach((r) => {
      items.push({
        id: r.id,
        title: r.title,
        type: 'reminder',
        dateTime: new Date(r.dueDateTime),
        priority: r.priority || 'high',
        status: r.status,
        original: r,
      });
    });

    return items
      .filter((item) => {
        if (filterType === 'tasks') return item.type === 'task' && item.status !== 'completed';
        if (filterType === 'events') return item.type === 'reminder' || item.type === 'task';
        if (filterType === 'completed') return item.status === 'completed';
        return true;
      })
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [tasks, reminders, filterType]);

  // Selected Day Items
  const selectedDayItems = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return timelineItems.filter(
      (item) =>
        item.dateTime.getTime() >= startOfDay.getTime() &&
        item.dateTime.getTime() <= endOfDay.getTime()
    );
  }, [timelineItems, selectedDate]);

  // Navigation Handlers
  const handlePrev = () => {
    const nextDate = new Date(selectedDate);
    if (viewMode === 'day') nextDate.setDate(nextDate.getDate() - 1);
    else if (viewMode === 'week') nextDate.setDate(nextDate.getDate() - 7);
    else if (viewMode === 'month') {
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() - 1);
    }
    else if (viewMode === 'year') nextDate.setFullYear(nextDate.getFullYear() - 1);
    setSelectedDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(selectedDate);
    if (viewMode === 'day') nextDate.setDate(nextDate.getDate() + 1);
    else if (viewMode === 'week') nextDate.setDate(nextDate.getDate() + 7);
    else if (viewMode === 'month') {
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    else if (viewMode === 'year') nextDate.setFullYear(nextDate.getFullYear() + 1);
    setSelectedDate(nextDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const openScheduleModal = (date?: Date, hour?: number) => {
    const targetDate = date || selectedDate;
    setModalDate(toLocalDateString(targetDate));
    if (hour !== undefined) {
      setModalTime(`${hour.toString().padStart(2, '0')}:00`);
    } else {
      const now = new Date();
      setModalTime(`${now.getHours().toString().padStart(2, '0')}:00`);
    }
    setModalTitle('');
    setModalLocation('');
    setIsAddModalOpen(true);
  };

  const handleDayClick = (dayDate: Date) => {
    setSelectedDate(dayDate);
    setIsDayDetailsModalOpen(true);
  };

  // Quick NL scheduler
  const handleQuickSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const lower = quickInput.toLowerCase();
    let scheduledDate = new Date(selectedDate);
    let timeHours = 10;
    let timeMins = 0;

    if (lower.includes('tomorrow')) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      timeHours = h;
      timeMins = m;
    }

    scheduledDate.setHours(timeHours, timeMins, 0, 0);

    const isTask = lower.includes('task') || lower.includes('todo') || lower.includes('finish') || lower.includes('submit');
    
    if (isTask) {
      await createTask(quickInput.trim(), 'medium', scheduledDate.toISOString());
    } else {
      await createReminder(quickInput.trim(), scheduledDate.toISOString(), 'none');
    }

    setQuickInput('');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const [year, month, day] = modalDate.split('-').map(Number);
    const [hours, minutes] = modalTime.split(':').map(Number);
    const dueTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    let fullTitle = modalTitle.trim();
    if (modalLocation.trim()) {
      fullTitle += ` 📍 ${modalLocation.trim()}`;
    }

    if (modalType === 'task') {
      await createTask(fullTitle, modalPriority, dueTime.toISOString());
    } else {
      await createReminder(fullTitle, dueTime.toISOString(), modalRecurrence);
    }

    setModalTitle('');
    setModalLocation('');
    setIsAddModalOpen(false);
  };

  // Month Grid Calculator
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayIndex = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: typeof timelineItems;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const start = new Date(d).setHours(0, 0, 0, 0);
      const end = new Date(d).setHours(23, 59, 59, 999);
      const dayItems = timelineItems.filter(
        (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
      );
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === new Date().toDateString(),
        items: dayItems,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const start = new Date(d).setHours(0, 0, 0, 0);
      const end = new Date(d).setHours(23, 59, 59, 999);
      const dayItems = timelineItems.filter(
        (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
      );
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === new Date().toDateString(),
        items: dayItems,
      });
    }

    // Next month padding to fill complete grid of 35 or 42
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const start = new Date(d).setHours(0, 0, 0, 0);
      const end = new Date(d).setHours(23, 59, 59, 999);
      const dayItems = timelineItems.filter(
        (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
      );
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === new Date().toDateString(),
        items: dayItems,
      });
    }

    return days;
  }, [selectedDate, timelineItems]);

  // Week Grid Calculator (7 days)
  const weekDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const dayOfWeek = selectedDate.getDay(); // 0 = Sun, 6 = Sat

    // Start of the current week (Sunday)
    const startOfWeek = new Date(year, month, day - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + i
      );
      const start = new Date(dayDate).setHours(0, 0, 0, 0);
      const end = new Date(dayDate).setHours(23, 59, 59, 999);
      const dayItems = timelineItems.filter(
        (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
      );
      days.push({
        date: dayDate,
        isToday: dayDate.toDateString() === new Date().toDateString(),
        items: dayItems,
      });
    }
    return days;
  }, [selectedDate, timelineItems]);

  // Year View: 12 Month Matrix Data
  const yearMonths = useMemo(() => {
    const year = selectedDate.getFullYear();
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthFirst = new Date(year, monthIdx, 1);
      const monthLast = new Date(year, monthIdx + 1, 0);
      const totalDays = monthLast.getDate();
      const startingDay = monthFirst.getDay();

      const start = new Date(year, monthIdx, 1).setHours(0, 0, 0, 0);
      const end = new Date(year, monthIdx + 1, 0).setHours(23, 59, 59, 999);

      const monthItems = timelineItems.filter(
        (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
      );

      return {
        monthIndex: monthIdx,
        monthName: MONTH_NAMES[monthIdx],
        totalDays,
        startingDay,
        itemsCount: monthItems.length,
        items: monthItems,
      };
    });
  }, [selectedDate, timelineItems]);

  // Year metrics
  const yearMetrics = useMemo(() => {
    const year = selectedDate.getFullYear();
    const start = new Date(year, 0, 1).setHours(0, 0, 0, 0);
    const end = new Date(year, 11, 31).setHours(23, 59, 59, 999);
    const inYear = timelineItems.filter(
      (it) => it.dateTime.getTime() >= start && it.dateTime.getTime() <= end
    );

    return {
      total: inYear.length,
      tasks: inYear.filter((t) => t.type === 'task').length,
      alarms: inYear.filter((t) => t.type === 'reminder').length,
      completed: inYear.filter((t) => t.status === 'completed').length,
    };
  }, [selectedDate, timelineItems]);

  const exportIcsCalendar = () => {
    let icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Google Calendar Format//Assistance OS//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    timelineItems.forEach((item) => {
      const dt = item.dateTime;
      const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDt = new Date(dt.getTime() + 60 * 60 * 1000);
      const endStr = endDt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsData.push(
        'BEGIN:VEVENT',
        `UID:${item.id}@assistance.ai`,
        `DTSTAMP:${startStr}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${item.title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:Scheduled in Assistance Calendar`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsData.push('END:VCALENDAR');
    const blob = new Blob([icsData.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendar-${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Hours array for Day/Week timeline (12 AM to 11 PM)
  const hoursGrid: number[] = Array.from({ length: 24 }, (_, i) => i);
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary) text-(--text-primary) font-sans">
      
      {/* ── 1. Google Calendar Style Main Top Header Bar ── */}
      <header className="h-16 px-3 sm:px-6 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-card)/70 backdrop-blur-md z-20">
        
        {/* Left: Branding, Today Button, Navigation & Current Month Display */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-[#4E82EE] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20 shrink-0">
              <CalendarIcon size={18} />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight hidden md:inline text-(--text-primary)">
              Calendar
            </span>
          </div>

          {/* Today Button (Google Calendar style outlined pill) */}
          <button
            onClick={handleToday}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isToday
                ? 'border-[#4E82EE]/50 bg-[#4E82EE]/10 text-[#4E82EE]'
                : 'border-(--border-subtle) bg-(--bg-card) hover:bg-(--bg-elevated) text-(--text-primary)'
            }`}
          >
            Today
          </button>

          {/* Arrows (< >) */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-full hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={19} />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-full hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={19} />
            </button>
          </div>

          {/* Large Month & Year Title with Popover Selector */}
          <div className="relative" ref={datePickerAnchorRef}>
            <button
              onClick={() => setDatePickerOpen((o) => !o)}
              className="flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-(--bg-elevated) text-(--text-primary) text-base sm:text-lg font-bold transition-all cursor-pointer group"
            >
              <span className="tracking-tight">
                {viewMode === 'day'
                  ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
                  : viewMode === 'week'
                  ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                  : viewMode === 'year'
                  ? `${selectedDate.getFullYear()}`
                  : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
              </span>
              <ChevronDown size={15} className={`text-(--text-muted) group-hover:text-[#4E82EE] transition-transform duration-200 ${datePickerOpen ? 'rotate-180 text-[#4E82EE]' : ''}`} />
            </button>

            {/* Quick Month / Year Picker Popover */}
            {datePickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDatePickerOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-40 w-64 p-3.5 rounded-3xl border border-(--border-subtle) bg-(--bg-card) shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-(--border-subtle)">
                    <button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setFullYear(d.getFullYear() - 1);
                        setSelectedDate(d);
                      }}
                      className="p-1 rounded-xl hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-bold font-mono text-(--text-primary)">
                      {selectedDate.getFullYear()}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setFullYear(d.getFullYear() + 1);
                        setSelectedDate(d);
                      }}
                      className="p-1 rounded-xl hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((m, idx) => {
                      const isSelected = idx === selectedDate.getMonth();
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(1);
                            d.setMonth(idx);
                            setSelectedDate(d);
                            setDatePickerOpen(false);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#4E82EE] text-white shadow-xs font-bold'
                              : 'text-(--text-secondary) hover:bg-(--bg-elevated) hover:text-(--text-primary)'
                          }`}
                        >
                          {m.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Search + View Mode Selector + Google-Style Create Button */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Quick NL Input (compact) */}
          <form onSubmit={handleQuickSchedule} className="hidden xl:flex items-center relative w-64">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick add: e.g. Sync tomorrow 3pm..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-[#4E82EE]"
            />
            <Zap size={13} className="absolute left-2.5 top-2.5 text-amber-500" />
          </form>

          {/* Export ICS */}
          <button
            onClick={exportIcsCalendar}
            title="Export Calendar (.ics)"
            className="p-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-medium"
          >
            <Download size={14} />
            <span className="hidden lg:inline">.ics</span>
          </button>

          {/* View Mode Segmented Control (Google Calendar Dropdown / Tab style) */}
          <div className="flex items-center p-1 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) shadow-2xs">
            {(
              [
                { mode: 'day',   label: 'Day' },
                { mode: 'week',  label: 'Week' },
                { mode: 'month', label: 'Month' },
                { mode: 'year',  label: 'Year' },
              ] as const
            ).map(({ mode, label }) => {
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-(--bg-card) text-[#4E82EE] shadow-xs font-bold'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Google Calendar Style + Create Event Button */}
          <button
            onClick={() => openScheduleModal()}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </header>

      {/* ── Filter Bar (Govt Holidays, Events, Tasks, Completed) ── */}
      <div className="px-3 sm:px-6 py-2 border-b border-(--border-subtle) bg-(--bg-sidebar)/30 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5">
          {(['all', 'events', 'tasks', 'holidays', 'completed'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === ft
                  ? 'bg-[#4E82EE]/15 text-[#4E82EE] dark:text-[#a8c7fa] font-bold border border-[#4E82EE]/30'
                  : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
              }`}
            >
              {ft === 'holidays' ? <span>🏛️ Govt Holidays</span> : ft}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-(--text-muted) font-medium hidden md:inline shrink-0">
          {timelineItems.length} items scheduled
        </span>
      </div>

      {/* ── Main Google Calendar Viewport ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 sm:pb-36 md:pb-12 flex flex-col">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. GOOGLE CALENDAR MONTH VIEW                                 */}
        {/* ───────────────────────────────────────────────────────────── */}
        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col min-h-[580px] p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
            
            {/* Weekday Header Row (SUN, MON, TUE, WED, THU, FRI, SAT) */}
            <div className="grid grid-cols-7 border-b border-(--border-subtle) text-center py-2 shrink-0">
              {SHORT_WEEKDAYS.map((day, dIdx) => (
                <div
                  key={day}
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    dIdx === 0 || dIdx === 6 ? 'text-(--text-muted)' : 'text-(--text-secondary)'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Continuous Clean Google Calendar Grid Cells */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 border-l border-t border-(--border-subtle) bg-(--bg-card) rounded-2xl overflow-hidden shadow-xs mt-1">
              {monthDays.map((day, idx) => {
                const dayNum = day.date.getDate();
                const isSelected = day.date.toDateString() === selectedDate.toDateString();
                const holiday = getHolidayForDate(day.date);
                const isFirstDayOfMonth = dayNum === 1;

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day.date)}
                    className={`min-h-[85px] sm:min-h-[115px] p-1 sm:p-1.5 border-r border-b border-(--border-subtle) transition-all cursor-pointer flex flex-col justify-between group relative select-none hover:bg-(--bg-elevated)/60 ${
                      isSelected
                        ? 'bg-[#4E82EE]/8'
                        : holiday
                        ? 'bg-rose-500/8 dark:bg-rose-950/20'
                        : day.isCurrentMonth
                        ? 'bg-(--bg-card)'
                        : 'bg-(--bg-sidebar)/30 opacity-45'
                    }`}
                  >
                    {/* Top Row: Date Number & Holiday Indicator */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs font-bold rounded-full flex items-center justify-center transition-all ${
                            day.isToday
                              ? 'w-6 h-6 bg-[#4E82EE] text-white shadow-xs'
                              : isSelected
                              ? 'w-6 h-6 bg-(--bg-elevated) text-[#4E82EE] font-black border border-[#4E82EE]/40'
                              : holiday
                              ? 'text-rose-600 dark:text-rose-400 font-bold px-1'
                              : day.isCurrentMonth
                              ? 'text-(--text-primary) px-1'
                              : 'text-(--text-muted) px-1'
                          }`}
                        >
                          {isFirstDayOfMonth ? `${MONTH_NAMES[day.date.getMonth()].slice(0, 3)} ${dayNum}` : dayNum}
                        </span>
                      </div>

                      {holiday && (
                        <span className="text-xs shrink-0 select-none" title={holiday.name}>
                          {holiday.emoji || '🏛️'}
                        </span>
                      )}
                    </div>

                    {/* Google Calendar Style Event Chips / Strips */}
                    <div className="flex-1 space-y-1 overflow-hidden pointer-events-none">
                      {/* Government Holiday Strip (Top priority) */}
                      {holiday && (
                        <div
                          className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md truncate bg-rose-500/20 text-rose-700 dark:text-rose-300 border-l-[3px] border-rose-500 flex items-center gap-1 shadow-2xs"
                          title={`🏛️ Govt Holiday: ${holiday.name}`}
                        >
                          <span className="truncate">{holiday.name}</span>
                        </div>
                      )}

                      {/* Day Scheduled Events */}
                      {day.items.slice(0, holiday ? 2 : 3).map((item) => {
                        const isCompleted = item.status === 'completed';
                        return (
                          <div
                            key={item.id}
                            className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 shadow-2xs ${
                              isCompleted
                                ? 'bg-(--bg-elevated) text-(--text-muted) line-through border-l-[3px] border-gray-400'
                                : item.type === 'task'
                                ? 'bg-[#9B72CF]/15 text-[#9B72CF] dark:text-[#d1b8f0] border-l-[3px] border-[#9B72CF]'
                                : 'bg-[#4E82EE]/15 text-[#4E82EE] dark:text-[#a8c7fa] border-l-[3px] border-[#4E82EE]'
                            }`}
                            title={item.title}
                          >
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}

                      {/* +N more indicator */}
                      {day.items.length > (holiday ? 2 : 3) && (
                        <div className="text-[10px] text-(--text-muted) font-semibold pl-1">
                          +{day.items.length - (holiday ? 2 : 3)} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. GOOGLE CALENDAR WEEK VIEW (Time-Grid Column Layout)        */}
        {/* ───────────────────────────────────────────────────────────── */}
        {viewMode === 'week' && (
          <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
            
            {/* Week Columns Header (7 Days) */}
            <div className="grid grid-cols-8 border-b border-(--border-subtle) pb-2 text-center shrink-0">
              <div className="w-14 sm:w-16" /> {/* Time gutter spacer */}
              {weekDays.map((w, wIdx) => {
                const holiday = getHolidayForDate(w.date);
                const isSelected = w.date.toDateString() === selectedDate.toDateString();
                return (
                  <div
                    key={wIdx}
                    onClick={() => {
                      setSelectedDate(w.date);
                      setViewMode('day');
                    }}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-(--text-muted) uppercase">
                      {SHORT_WEEKDAYS[w.date.getDay()]}
                    </span>
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 mt-0.5 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all ${
                        w.isToday
                          ? 'bg-[#4E82EE] text-white shadow-sm'
                          : isSelected
                          ? 'bg-(--bg-elevated) text-[#4E82EE] border border-[#4E82EE]'
                          : holiday
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-(--text-primary) group-hover:bg-(--bg-elevated)'
                      }`}
                    >
                      {w.date.getDate()}
                    </div>
                    {holiday && (
                      <span className="text-[10px] text-rose-500 font-bold truncate max-w-[80px]" title={holiday.name}>
                        {holiday.emoji || '🏛️'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-(--border-subtle)/50 border-t border-(--border-subtle)">
              {hoursGrid.map((hour) => {
                const hourLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[56px] group relative">
                    {/* Time Gutter Label */}
                    <div className="w-14 sm:w-16 pr-2 text-right text-[11px] font-mono text-(--text-muted) -mt-2 select-none shrink-0">
                      {hourLabel}
                    </div>

                    {/* 7 Day Columns for this hour */}
                    {weekDays.map((w, wIdx) => {
                      const hourItems = w.items.filter((it) => it.dateTime.getHours() === hour);
                      return (
                        <div
                          key={wIdx}
                          onClick={() => openScheduleModal(w.date, hour)}
                          className="border-l border-(--border-subtle)/50 p-1 hover:bg-[#4E82EE]/5 transition-colors cursor-pointer relative min-h-[56px]"
                        >
                          {hourItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDayClick(w.date);
                              }}
                              className={`p-1.5 rounded-lg text-xs font-semibold shadow-2xs mb-1 truncate ${
                                item.status === 'completed'
                                  ? 'bg-(--bg-elevated) text-(--text-muted) line-through'
                                  : item.type === 'task'
                                  ? 'bg-[#9B72CF]/20 text-[#9B72CF] dark:text-[#d1b8f0] border-l-2 border-[#9B72CF]'
                                  : 'bg-[#4E82EE]/20 text-[#4E82EE] dark:text-[#a8c7fa] border-l-2 border-[#4E82EE]'
                              }`}
                            >
                              <div className="truncate font-bold">{item.title}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. GOOGLE CALENDAR DAY VIEW (Hourly Schedule)                 */}
        {/* ───────────────────────────────────────────────────────────── */}
        {viewMode === 'day' && (
          <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
            
            {/* Day Header Banner with Holiday */}
            <div className="p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                  isToday ? 'bg-[#4E82EE] text-white' : 'bg-(--bg-elevated) text-(--text-primary)'
                }`}>
                  {selectedDate.getDate()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-(--text-primary)">
                    {SHORT_WEEKDAYS[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
                  </h2>
                  <p className="text-xs text-(--text-secondary) font-medium">
                    {selectedDayItems.length} items scheduled for today
                  </p>
                </div>
              </div>

              {getHolidayForDate(selectedDate) && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0">
                  <span>{getHolidayForDate(selectedDate)?.emoji || '🏛️'}</span>
                  <span>{getHolidayForDate(selectedDate)?.name}</span>
                </div>
              )}
            </div>

            {/* Time Grid (12 AM - 11 PM) */}
            <div className="rounded-3xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle)/50 overflow-hidden shadow-xs">
              {hoursGrid.map((hour) => {
                const hourItems = selectedDayItems.filter((item) => item.dateTime.getHours() === hour);
                const hourLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

                return (
                  <div key={hour} className="flex min-h-[60px] group hover:bg-(--bg-elevated)/40 transition-colors">
                    {/* Time Label Gutter */}
                    <div className="w-20 text-xs font-mono text-(--text-muted) shrink-0 p-3 text-right border-r border-(--border-subtle)/50 select-none">
                      {hourLabel}
                    </div>

                    {/* Hourly Content */}
                    <div className="flex-1 p-2 flex items-center justify-between">
                      {hourItems.length === 0 ? (
                        <button
                          onClick={() => openScheduleModal(selectedDate, hour)}
                          className="opacity-0 group-hover:opacity-100 text-[11px] text-[#4E82EE] font-semibold flex items-center gap-1 hover:underline transition-opacity cursor-pointer"
                        >
                          <Plus size={12} /> Schedule at {hourLabel}
                        </button>
                      ) : (
                        <div className="w-full space-y-1.5">
                          {hourItems.map((item) => (
                            <div
                              key={item.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs ${
                                item.status === 'completed'
                                  ? 'bg-(--bg-elevated) text-(--text-muted) line-through border-(--border-subtle)'
                                  : item.type === 'task'
                                  ? 'bg-[#9B72CF]/15 border-[#9B72CF]/30 text-[#9B72CF] dark:text-[#d1b8f0]'
                                  : 'bg-[#4E82EE]/15 border-[#4E82EE]/30 text-[#4E82EE] dark:text-[#a8c7fa]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="font-bold text-xs sm:text-sm truncate">
                                  {item.title}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.type === 'task' && (
                                  <button
                                    onClick={() => toggleTask(item.id, item.status)}
                                    className="px-3 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) text-xs font-bold hover:border-emerald-500 transition-colors cursor-pointer"
                                  >
                                    {item.status === 'completed' ? '✓ Completed' : 'Mark Done'}
                                  </button>
                                )}
                                {item.type === 'reminder' && (
                                  <button
                                    onClick={() => deleteReminder(item.id)}
                                    className="p-1.5 rounded-full hover:bg-rose-500/10 text-(--text-muted) hover:text-rose-500 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. GOOGLE CALENDAR YEAR VIEW (12-Month Matrix)                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {viewMode === 'year' && (
          <div className="flex-1 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
            
            {/* Year Header Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs">
              <div className="p-3">
                <span className="text-[11px] font-semibold text-(--text-muted) uppercase">Scheduled Events</span>
                <p className="text-2xl font-bold text-(--text-primary) font-mono mt-0.5">{yearMetrics.total}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-[#4E82EE] uppercase">Tasks Due</span>
                <p className="text-2xl font-bold text-[#4E82EE] font-mono mt-0.5">{yearMetrics.tasks}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-amber-500 uppercase">Reminders</span>
                <p className="text-2xl font-bold text-amber-500 font-mono mt-0.5">{yearMetrics.alarms}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-emerald-500 uppercase">Completed</span>
                <p className="text-2xl font-bold text-emerald-500 font-mono mt-0.5">{yearMetrics.completed}</p>
              </div>
            </div>

            {/* 12 Mini Calendar Month Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {yearMonths.map((m) => {
                const monthHolidays = getHolidaysForMonth(selectedDate.getFullYear(), m.monthIndex);

                return (
                  <div
                    key={m.monthIndex}
                    onClick={() => {
                      const newD = new Date(selectedDate);
                      newD.setMonth(m.monthIndex);
                      setSelectedDate(newD);
                      setViewMode('month');
                    }}
                    className="p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-(--text-primary)">{m.monthName}</h3>
                      <div className="flex items-center gap-1">
                        {monthHolidays.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold">
                            🏛️ {monthHolidays.length}
                          </span>
                        )}
                        {m.itemsCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#4E82EE]/15 text-[#4E82EE] font-semibold">
                            {m.itemsCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini Weekday Row */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-(--text-muted) mb-1 font-mono">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                        <span key={i}>{w}</span>
                      ))}
                    </div>

                    {/* Mini Month Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                      {Array.from({ length: m.startingDay }).map((_, i) => (
                        <span key={`empty_${i}`} className="opacity-0">0</span>
                      ))}

                      {Array.from({ length: m.totalDays }).map((_, dIdx) => {
                        const dayNum = dIdx + 1;
                        const cellDate = new Date(selectedDate.getFullYear(), m.monthIndex, dayNum);
                        const isDayToday = cellDate.toDateString() === new Date().toDateString();
                        const isCellHoliday = isGovernmentHoliday(cellDate);

                        return (
                          <div
                            key={`d_${dayNum}`}
                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-mono ${
                              isDayToday
                                ? 'bg-[#4E82EE] text-white font-bold'
                                : isCellHoliday
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-(--text-muted) hover:bg-(--bg-elevated)'
                            }`}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── 5. Google Calendar Style Day Details Modal ────────────── */}
      {isDayDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3 shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E82EE]">
                  {SHORT_WEEKDAYS[selectedDate.getDay()]}
                </span>
                <h2 className="app-modal-title">
                  {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                </h2>
              </div>
              <button
                onClick={() => setIsDayDetailsModalOpen(false)}
                className="p-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Govt Holiday Banner */}
            {getHolidayForDate(selectedDate) && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 shrink-0">
                <span className="text-2xl shrink-0">{getHolidayForDate(selectedDate)?.emoji || '🏛️'}</span>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span>{getHolidayForDate(selectedDate)?.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 uppercase font-bold">Govt Holiday</span>
                  </div>
                  <p className="text-[11px] text-(--text-muted) mt-0.5">
                    {getHolidayForDate(selectedDate)?.description || 'Official Public Holiday'}
                  </p>
                </div>
              </div>
            )}

            {/* Event List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar py-1">
              {selectedDayItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-(--bg-elevated) text-(--text-muted) flex items-center justify-center">
                    <CalendarIcon size={22} />
                  </div>
                  <p className="text-xs text-(--text-muted) font-medium">
                    No events scheduled for this day.
                  </p>
                </div>
              ) : (
                selectedDayItems.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const timeStr = item.dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isCompleted
                          ? 'bg-(--bg-elevated)/40 border-(--border-subtle) opacity-60'
                          : item.type === 'task'
                          ? 'bg-[#9B72CF]/15 border-[#9B72CF]/30 text-[#9B72CF] dark:text-[#d1b8f0]'
                          : 'bg-[#4E82EE]/15 border-[#4E82EE]/30 text-[#4E82EE] dark:text-[#a8c7fa]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-(--bg-elevated) flex items-center justify-center shrink-0">
                          {item.type === 'task' ? <ListTodo size={16} /> : <AlarmClock size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-xs sm:text-sm truncate ${isCompleted ? 'line-through' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-(--text-muted) font-mono">
                            {timeStr} • {item.priority} priority
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.type === 'task' && (
                          <button
                            onClick={() => toggleTask(item.id, item.status)}
                            className="px-3 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold hover:border-emerald-500 transition-all cursor-pointer"
                          >
                            {isCompleted ? '✓ Done' : 'Mark Done'}
                          </button>
                        )}
                        {item.type === 'reminder' && (
                          <button
                            onClick={() => deleteReminder(item.id)}
                            className="p-1.5 rounded-full text-(--text-muted) hover:text-red-500 hover:bg-(--bg-card) transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-(--border-subtle) flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsDayDetailsModalOpen(false);
                  openScheduleModal(selectedDate);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold hover:opacity-95 shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Event on This Day</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Google Calendar Style Event Creation Modal ─────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/15 text-[#4E82EE] flex items-center justify-center">
                  <CalendarIcon size={16} />
                </div>
                <div>
                  <h2 className="app-modal-title">Create Calendar Event</h2>
                  <p className="app-card-subtitle">Add event, task deadline, or reminder</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalType('event')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalType === 'event'
                      ? 'bg-[#4E82EE]/15 border-[#4E82EE] text-[#4E82EE] dark:text-[#a8c7fa] shadow-2xs font-bold'
                      : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-muted)'
                  }`}
                >
                  <CalendarIcon size={14} />
                  <span>Calendar Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('task')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalType === 'task'
                      ? 'bg-[#9B72CF]/15 border-[#9B72CF] text-[#9B72CF] dark:text-[#d1b8f0] shadow-2xs font-bold'
                      : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-muted)'
                  }`}
                >
                  <CheckSquare size={14} />
                  <span>Task Deadline</span>
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                  Add Title
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Project Review, Lunch with Team..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden focus:border-[#4E82EE]"
                />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                    Date
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                    Time
                  </label>
                  <input
                    type="time"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} /> Add Location / Video Call Link
                </label>
                <input
                  type="text"
                  value={modalLocation}
                  onChange={(e) => setModalLocation(e.target.value)}
                  placeholder="e.g. Google Meet, Conference Room 2B..."
                  className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden"
                />
              </div>

              {/* Recurrence & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                    Recurrence
                  </label>
                  <select
                    value={modalRecurrence}
                    onChange={(e) => setModalRecurrence(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-primary) focus:outline-hidden"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold text-(--text-primary) focus:outline-hidden"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-3 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-card) border border-(--border-subtle) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold hover:opacity-95 shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check size={15} />
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
