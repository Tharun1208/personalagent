'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  RotateCcw,
  Check,
  X,
  AlarmClock,
  Filter,
  Layers,
  CalendarDays,
  CalendarRange,
  Grid3X3,
  ListTodo,
  Trash2,
  Video,
  MapPin,
  Tag,
  Zap,
  ArrowRight,
  Download,
  Share2,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import {
  getHolidayForDate,
  getHolidaysForYear,
  getHolidaysForMonth,
  isGovernmentHoliday,
  GovtHoliday,
  GOVT_HOLIDAYS,
} from '@/lib/calendar/holidays';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Local date YYYY-MM-DD formatter (avoids UTC toISOString timezone off-by-one day bugs)
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarView() {
  const { tasks, reminders, createTask, createReminder, toggleTask, deleteTask, deleteReminder } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerAnchorRef = useRef<HTMLDivElement>(null);
  const [datePickerAlign, setDatePickerAlign] = useState<'left' | 'right'>('left');

  const pickAlign = (el: HTMLElement | null, panelWidth: number): 'left' | 'right' => {
    if (!el || typeof window === 'undefined') return 'left';
    const rect = el.getBoundingClientRect();
    return window.innerWidth - rect.left >= panelWidth + 12 ? 'left' : 'right';
  };

  const toggleDatePicker = () => {
    if (!datePickerOpen) setDatePickerAlign(pickAlign(datePickerAnchorRef.current, 240));
    setDatePickerOpen((o) => !o);
  };
  const [filterType, setFilterType] = useState<'all' | 'tasks' | 'reminders' | 'holidays' | 'completed'>('all');
  
  // Quick natural language input
  const [quickInput, setQuickInput] = useState('');

  // Day Details Modal state (Mobile & Desktop interactive sheet)
  const [isDayDetailsModalOpen, setIsDayDetailsModalOpen] = useState(false);

  // Event Scheduling Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDate, setModalDate] = useState(() => toLocalDateString(new Date()));
  const [modalTime, setModalTime] = useState('10:00');
  const [modalDuration, setModalDuration] = useState('60'); // minutes
  const [modalType, setModalType] = useState<'event' | 'task' | 'alarm'>('event');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [modalRecurrence, setModalRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [modalLocation, setModalLocation] = useState('');
  const [modalNotes, setModalNotes] = useState('');

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
        if (filterType === 'reminders') return item.type === 'reminder';
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
      const targetMonth = nextDate.getMonth() - 1;
      nextDate.setDate(1);
      nextDate.setMonth(targetMonth);
    }
    else if (viewMode === 'year') nextDate.setFullYear(nextDate.getFullYear() - 1);
    setSelectedDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(selectedDate);
    if (viewMode === 'day') nextDate.setDate(nextDate.getDate() + 1);
    else if (viewMode === 'week') nextDate.setDate(nextDate.getDate() + 7);
    else if (viewMode === 'month') {
      const targetMonth = nextDate.getMonth() + 1;
      nextDate.setDate(1);
      nextDate.setMonth(targetMonth);
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
    setModalNotes('');
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
    setModalNotes('');
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

  // Hours array 6:00 AM to 11:00 PM
  const exportIcsCalendar = () => {
    let icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Recall AI//Assistant Calendar//EN',
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
        `UID:${item.id}@recall.ai`,
        `DTSTAMP:${startStr}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${item.title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:Scheduled in Recall Assistant`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsData.push('END:VCALENDAR');
    const blob = new Blob([icsData.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `schedule-${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Hours array 6:00 AM to 11:00 PM
  const hoursGrid: number[] = Array.from({ length: 18 }, (_, i) => i + 6);
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      {/* Top Header */}
      <header className="h-auto min-h-16 py-3 px-3 sm:px-6 border-b border-(--border-subtle)/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-(--bg-primary)/90 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-[#4E82EE]/20 via-[#9B72CF]/20 to-[#F27878]/20 border border-[#4E82EE]/30 text-[#4E82EE] dark:text-[#a8c7fa] flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon size={17} />
          </div>
          <div>
            <h1 className="font-semibold text-sm sm:text-base text-(--text-primary) flex items-center gap-2 font-sans">
              Schedule & Calendar
            </h1>
            <p className="text-[10px] sm:text-[11px] text-(--text-muted)">
              Visual Day, Week, Month & Year Event Management
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pb-1 sm:pb-0 flex-wrap">
          {/* ── View Mode Segmented Control (1-Click Instant Switching) ── */}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-(--bg-card) text-[#4E82EE] shadow-2xs font-bold'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Export Calendar (.ics) Button */}
          <button
            onClick={exportIcsCalendar}
            title="Export to Apple Calendar / Google Calendar (.ics)"
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary) text-[11px] sm:text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Download size={14} />
            <span className="hidden lg:inline">Export .ics</span>
          </button>

          {/* Schedule Event Action Button */}
          <button
            onClick={() => openScheduleModal()}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-[11px] sm:text-xs font-semibold hover:opacity-95 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus size={15} />
            <span>Schedule Event</span>
          </button>
        </div>
      </header>

      {/* Date Navigation & Quick NL Event Scheduler Bar */}
      <div className="px-3 sm:px-6 py-2.5 border-b border-(--border-subtle)/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-(--bg-sidebar)/40">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="font-semibold text-xs sm:text-sm text-(--text-primary) flex items-center gap-1.5 flex-wrap">
            {/* ── Unified Date & Month Popover ── */}
            <div className="relative" ref={datePickerAnchorRef}>
              <button
                onClick={toggleDatePicker}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/40 text-(--text-primary) text-xs font-bold transition-all cursor-pointer shadow-2xs group"
              >
                <span>
                  {viewMode === 'day'
                    ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
                    : viewMode === 'week'
                    ? weekDays[0] && weekDays[6]
                      ? weekDays[0].date.getMonth() === weekDays[6].date.getMonth()
                        ? `${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].date.getDate()} – ${weekDays[6].date.getDate()}, ${weekDays[6].date.getFullYear()}`
                        : `${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].date.getDate()} – ${MONTH_NAMES[weekDays[6].date.getMonth()]} ${weekDays[6].date.getDate()}, ${weekDays[6].date.getFullYear()}`
                      : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                    : viewMode === 'year'
                    ? `${selectedDate.getFullYear()}`
                    : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                </span>
                <ChevronDown size={13} className={`text-(--text-muted) group-hover:text-[#4E82EE] transition-transform duration-200 ${datePickerOpen ? 'rotate-180 text-[#4E82EE]' : ''}`} />
              </button>

              {datePickerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDatePickerOpen(false)} />
                  <div
                    className={`absolute top-full mt-2 z-40 w-64 p-3 rounded-2xl border border-(--border-subtle) bg-(--bg-card) shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
                      datePickerAlign === 'right' ? 'right-0' : 'left-0'
                    }`}
                  >
                    {/* Year Header Navigator */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-(--border-subtle)">
                      <button
                        onClick={() => {
                          const d = new Date(selectedDate);
                          d.setFullYear(d.getFullYear() - 1);
                          setSelectedDate(d);
                        }}
                        className="p-1 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                        title="Previous Year"
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
                        className="p-1 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
                        title="Next Year"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* 12 Months Grid */}
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

            {!isToday && (
              <button
                onClick={handleToday}
                className="text-[10px] px-2 py-0.5 rounded-full bg-(--bg-elevated) hover:bg-[#4E82EE]/10 text-(--text-muted) hover:text-[#4E82EE] transition-colors border border-(--border-subtle) cursor-pointer"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Quick Event Scheduling Bar */}
        <form onSubmit={handleQuickSchedule} className="flex-1 max-w-md flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Quick schedule: e.g. Team Sync tomorrow at 3pm..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-[#4E82EE]"
            />
            <Zap size={13} className="absolute left-2.5 top-2.5 text-amber-500" />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full bg-(--bg-card) border border-(--border-subtle) hover:border-[#4E82EE]/50 text-xs font-semibold text-(--text-primary) hover:text-[#4E82EE] transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            Schedule
          </button>
        </form>

        {/* Filter Badges */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'tasks', 'reminders', 'holidays', 'completed'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-2.5 py-1 rounded-full text-[11px] capitalize transition-all cursor-pointer flex items-center gap-1 ${
                filterType === ft
                  ? 'bg-[#4E82EE]/15 text-[#4E82EE] dark:text-[#a8c7fa] font-bold border border-[#4E82EE]/30'
                  : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
              }`}
            >
              {ft === 'holidays' ? (
                <>
                  <span>🏛️</span>
                  <span>Govt Holidays</span>
                </>
              ) : (
                ft
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 custom-scrollbar">
        {/* ── 1. MONTH VIEW ─────────────────────────────────────── */}
        {viewMode === 'month' && (
          <div className="max-w-6xl mx-auto space-y-2 sm:space-y-3">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-semibold text-(--text-muted) uppercase tracking-wider py-1">
              {SHORT_WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Monthly Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthDays.map((day, idx) => {
                const dayNum = day.date.getDate();
                const isSelected = day.date.toDateString() === selectedDate.toDateString();
                const holiday = getHolidayForDate(day.date);

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day.date)}
                    className={`min-h-[68px] sm:min-h-[110px] p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative active:scale-98 ${
                      isSelected
                        ? 'border-[#4E82EE] bg-[#4E82EE]/5 ring-1 sm:ring-2 ring-[#4E82EE]/20 shadow-xs'
                        : holiday
                        ? 'bg-(--bg-card) border-rose-500/30 hover:border-rose-500/60'
                        : day.isCurrentMonth
                        ? 'bg-(--bg-card) border-(--border-subtle) hover:border-[#4E82EE]/40 hover:bg-(--bg-elevated)'
                        : 'bg-(--bg-sidebar)/30 border-(--border-subtle)/30 opacity-40'
                    }`}
                  >
                    {/* Header: Date Number + Quick Add Button + Holiday Tag */}
                    <div className="flex items-center justify-between pointer-events-none">
                      <span
                        className={`text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                          day.isToday
                            ? 'bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white shadow-xs'
                            : isSelected
                            ? 'text-[#4E82EE] font-black'
                            : holiday
                            ? 'text-rose-500 font-bold'
                            : 'text-(--text-primary)'
                        }`}
                      >
                        {dayNum}
                      </span>

                      <div className="flex items-center gap-1">
                        {holiday && (
                          <span
                            className="text-xs leading-none select-none inline-block"
                            title={`Government Holiday: ${holiday.name} (${holiday.type.toUpperCase()})`}
                          >
                            {holiday.emoji || '🏛️'}
                          </span>
                        )}
                        {day.items.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[#4E82EE]/15 text-[#4E82EE] font-bold">
                            {day.items.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Dots & Holiday View (<sm) */}
                    <div className="flex sm:hidden items-center justify-center gap-1 my-1 flex-wrap pointer-events-none">
                      {holiday && (
                        <span className="text-[10px] leading-none" title={holiday.name}>
                          {holiday.emoji || '🏛️'}
                        </span>
                      )}
                      {day.items.slice(0, holiday ? 3 : 4).map((item) => (
                        <span
                          key={item.id}
                          className={`w-2 h-2 rounded-full ring-1 ring-black/10 ${
                            item.status === 'completed'
                              ? 'bg-emerald-500'
                              : item.type === 'task'
                              ? 'bg-[#4E82EE]'
                              : 'bg-amber-500'
                          }`}
                        />
                      ))}
                      {day.items.length > 4 && (
                        <span className="text-[8px] font-bold text-(--text-muted)">+</span>
                      )}
                    </div>

                    {/* Tablet/Desktop Day Events Stack (>=sm) */}
                    <div className="hidden sm:block space-y-1 my-1 flex-1 overflow-hidden pointer-events-none">
                      {holiday && (
                        <div
                          className="text-[10px] sm:text-[11px] truncate px-1.5 py-0.5 rounded-md flex items-center gap-1 font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-2xs"
                          title={`🏛️ Official Govt Holiday: ${holiday.name} (${holiday.type.toUpperCase()})`}
                        >
                          <span className="text-xs shrink-0">{holiday.emoji || '🏛️'}</span>
                          <span className="truncate">{holiday.name}</span>
                        </div>
                      )}
                      {day.items.slice(0, holiday ? 1 : 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-[11px] truncate px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium ${
                            item.status === 'completed'
                              ? 'bg-(--bg-elevated) text-(--text-muted) line-through'
                              : item.type === 'task'
                              ? 'bg-[#4E82EE]/15 text-[#4E82EE] dark:text-[#a8c7fa]'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}
                          title={item.title}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                      {day.items.length > (holiday ? 1 : 2) && (
                        <div className="text-[10px] text-(--text-muted) font-medium pl-1">
                          +{day.items.length - (holiday ? 1 : 2)} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="hidden sm:flex text-[10px] text-(--text-muted) opacity-0 group-hover:opacity-100 transition-opacity justify-between items-center">
                      <span className="text-[#4E82EE] font-semibold hover:underline">
                        Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 2. YEAR VIEW (12-MONTH MATRIX & HEATMAP) ────────── */}
        {viewMode === 'year' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Year Annual Stats Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs">
              <div className="p-3">
                <span className="text-[11px] font-semibold text-(--text-muted) uppercase">Total Scheduled</span>
                <p className="text-2xl font-bold text-(--text-primary) font-mono mt-0.5">{yearMetrics.total}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-[#4E82EE] uppercase">Tasks with Deadlines</span>
                <p className="text-2xl font-bold text-[#4E82EE] font-mono mt-0.5">{yearMetrics.tasks}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-amber-500 uppercase">Alarms & Reminders</span>
                <p className="text-2xl font-bold text-amber-500 font-mono mt-0.5">{yearMetrics.alarms}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-emerald-500 uppercase">Completed</span>
                <p className="text-2xl font-bold text-emerald-500 font-mono mt-0.5">{yearMetrics.completed}</p>
              </div>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {yearMonths.map((m) => {
                const isSelectedMonth =
                  selectedDate.getFullYear() === selectedDate.getFullYear() &&
                  selectedDate.getMonth() === m.monthIndex;
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
                    className={`p-4 rounded-3xl border transition-all cursor-pointer hover:shadow-md ${
                      isSelectedMonth
                        ? 'bg-(--bg-card) border-[#4E82EE] shadow-xs'
                        : 'bg-(--bg-card) border-(--border-subtle) hover:border-[#4E82EE]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-(--text-primary)">{m.monthName}</h3>
                      <div className="flex items-center gap-1">
                        {monthHolidays.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold" title={`${monthHolidays.length} Govt Holidays`}>
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

                    {/* Mini Month Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-(--text-muted) mb-1 font-mono">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                        <span key={i}>{w}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                      {Array.from({ length: m.startingDay }).map((_, i) => (
                        <span key={`empty_${i}`} className="opacity-0">0</span>
                      ))}

                      {Array.from({ length: m.totalDays }).map((_, dIdx) => {
                        const dayNum = dIdx + 1;
                        const cellDate = new Date(selectedDate.getFullYear(), m.monthIndex, dayNum);
                        const isDayToday = cellDate.toDateString() === new Date().toDateString();
                        const isCellHoliday = isGovernmentHoliday(cellDate);

                        const cellItems = m.items.filter(
                          (it) => it.dateTime.getDate() === dayNum
                        );
                        const hasEvents = cellItems.length > 0;

                        return (
                          <div
                            key={`d_${dayNum}`}
                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-mono ${
                              isDayToday
                                ? 'bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white font-bold'
                                : isCellHoliday
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold ring-1 ring-rose-500/40'
                                : hasEvents
                                ? 'bg-[#4E82EE]/20 text-[#4E82EE] font-bold ring-1 ring-[#4E82EE]/40'
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

            {/* Year Govt Holidays Showcase */}
            <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-(--border-subtle)">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-sm">
                    🏛️
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-(--text-primary)">
                      Government & Public Holidays ({selectedDate.getFullYear()})
                    </h3>
                    <p className="text-[11px] text-(--text-muted)">
                      National, gazetted, and cultural holidays for the year
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  {getHolidaysForYear(selectedDate.getFullYear()).length} Holidays
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {getHolidaysForYear(selectedDate.getFullYear()).map((h) => {
                  const d = new Date(h.date);
                  const isPast = d.getTime() < new Date().setHours(0, 0, 0, 0);
                  const isTodayHol = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={h.date}
                      onClick={() => {
                        setSelectedDate(d);
                        setViewMode('month');
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isTodayHol
                          ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20'
                          : isPast
                          ? 'border-(--border-subtle)/50 bg-(--bg-elevated)/40 opacity-60'
                          : 'border-(--border-subtle) bg-(--bg-elevated) hover:border-rose-500/40 hover:bg-(--bg-card)'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{h.emoji || '🎉'}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-(--text-primary) truncate">
                            {h.name}
                          </div>
                          <div className="text-[10px] text-(--text-muted) font-mono">
                            {d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-(--bg-card) text-rose-500 border border-rose-500/20">
                        {h.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. WEEK VIEW (ROW PER DAY) ───────────────────────── */}
        {viewMode === 'week' && (
          <div className="max-w-5xl mx-auto space-y-2.5">
            {/* Week header — date range */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                {weekDays[0] && weekDays[6]
                  ? weekDays[0].date.getMonth() === weekDays[6].date.getMonth()
                    ? `${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].date.getDate()} – ${weekDays[6].date.getDate()}, ${weekDays[6].date.getFullYear()}`
                    : `${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].date.getDate()} – ${MONTH_NAMES[weekDays[6].date.getMonth()]} ${weekDays[6].date.getDate()}, ${weekDays[6].date.getFullYear()}`
                  : ''}
              </span>
              <span className="text-[11px] text-(--text-muted)">
                {weekDays.reduce((sum, d) => sum + d.items.length, 0)} events this week
              </span>
            </div>

            {weekDays.map((w, wIdx) => {
              const isSelected = w.date.toDateString() === selectedDate.toDateString();
              const dayLabel = SHORT_WEEKDAYS[w.date.getDay()];
              const isWeekend = w.date.getDay() === 0 || w.date.getDay() === 6;
              const holiday = getHolidayForDate(w.date);

              return (
                <div
                  key={wIdx}
                  className={`flex gap-0 rounded-2xl border overflow-hidden transition-all ${
                    isSelected
                      ? 'border-[#4E82EE] shadow-md ring-2 ring-[#4E82EE]/15'
                      : holiday
                      ? 'border-rose-500/30'
                      : 'border-(--border-subtle) hover:border-[#4E82EE]/30'
                  } ${isWeekend ? 'opacity-80' : ''}`}
                >
                  {/* Day Label Column */}
                  <div
                    onClick={() => {
                      setSelectedDate(w.date);
                      setViewMode('day');
                    }}
                    className={`w-20 sm:w-24 flex-shrink-0 flex flex-col items-center justify-center py-4 border-r border-(--border-subtle) cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#4E82EE]/8'
                        : holiday
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : 'bg-(--bg-elevated) hover:bg-(--bg-card)'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      w.isToday ? 'text-[#4E82EE]' : holiday ? 'text-rose-500' : 'text-(--text-muted)'
                    }`}>
                      {dayLabel}
                    </span>
                    <div className={`w-9 h-9 mt-1 rounded-full flex items-center justify-center font-bold text-base ${
                      w.isToday
                        ? 'bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white shadow-sm'
                        : isSelected
                        ? 'text-[#4E82EE] bg-[#4E82EE]/10'
                        : holiday
                        ? 'text-rose-500 bg-rose-500/15'
                        : 'text-(--text-primary)'
                    }`}>
                      {w.date.getDate()}
                    </div>
                    {holiday && (
                      <span className="mt-1 text-[10px]" title={holiday.name}>
                        {holiday.emoji || '🏛️'}
                      </span>
                    )}
                    {w.items.length > 0 && (
                      <span className="mt-1 text-[9px] font-semibold text-(--text-muted)">
                        {w.items.length} event{w.items.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Events Row */}
                  <div
                    className={`flex-1 flex items-center gap-2 px-3 py-3 overflow-x-auto custom-scrollbar min-h-[76px] ${
                      isSelected ? 'bg-[#4E82EE]/4' : 'bg-(--bg-card)'
                    }`}
                  >
                    {holiday && (
                      <div
                        onClick={() => handleDayClick(w.date)}
                        className="flex-shrink-0 flex flex-col justify-between px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 min-w-[130px] max-w-[180px] transition-all cursor-pointer hover:border-rose-500/60 shadow-2xs"
                        title={`Government Holiday: ${holiday.name} (${holiday.type.toUpperCase()})`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-mono font-bold text-rose-500 uppercase">
                            Govt Holiday
                          </span>
                          <span className="text-xs">{holiday.emoji || '🏛️'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 line-clamp-2">
                          {holiday.name}
                        </div>
                      </div>
                    )}

                    {w.items.length === 0 && !holiday ? (
                      <button
                        onClick={() => openScheduleModal(w.date)}
                        className="flex items-center gap-1.5 text-[11px] text-(--text-muted) hover:text-[#4E82EE] transition-colors cursor-pointer group"
                      >
                        <div className="w-6 h-6 rounded-lg border border-dashed border-(--border-subtle) group-hover:border-[#4E82EE]/40 flex items-center justify-center transition-colors">
                          <Plus size={12} className="text-(--text-muted) group-hover:text-[#4E82EE]" />
                        </div>
                        <span>No events · Add one</span>
                      </button>
                    ) : (
                      <>
                        {w.items.map((item) => {
                          const timeStr = item.dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                          const isCompleted = item.status === 'completed';
                          return (
                            <div
                              key={item.id}
                              className={`flex-shrink-0 flex flex-col justify-between px-3 py-2.5 rounded-xl border min-w-[130px] max-w-[180px] transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-(--bg-elevated) border-(--border-subtle) opacity-50'
                                  : item.type === 'task'
                                  ? 'bg-[#4E82EE]/10 border-[#4E82EE]/25 hover:border-[#4E82EE]/60'
                                  : 'bg-amber-500/10 border-amber-500/25 hover:border-amber-500/60'
                              }`}
                              onClick={() => handleDayClick(w.date)}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className={`text-[9px] font-mono font-bold ${
                                  isCompleted ? 'text-(--text-muted)' : item.type === 'task' ? 'text-[#4E82EE]' : 'text-amber-500'
                                }`}>
                                  {timeStr}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isCompleted ? 'bg-emerald-500' : item.type === 'task' ? 'bg-[#4E82EE]' : 'bg-amber-500'
                                }`}></span>
                              </div>
                              <div className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                                isCompleted
                                  ? 'line-through text-(--text-muted)'
                                  : item.type === 'task'
                                  ? 'text-[#4E82EE] dark:text-[#a8c7fa]'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}>
                                {item.title}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add event button at end of row */}
                        <button
                          onClick={() => openScheduleModal(w.date)}
                          className="flex-shrink-0 w-8 h-8 rounded-xl border border-dashed border-(--border-subtle) hover:border-[#4E82EE]/40 flex items-center justify-center text-(--text-muted) hover:text-[#4E82EE] transition-all cursor-pointer"
                          title="Add event"
                        >
                          <Plus size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 4. DAY VIEW (HOUR-BY-HOUR TIMELINE) ──────────────── */}
        {viewMode === 'day' && (
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Day Govt Holiday Banner if applicable */}
            {getHolidayForDate(selectedDate) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-emerald-500/15 border border-rose-500/30 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0 select-none">
                    {getHolidayForDate(selectedDate)?.emoji || '🏛️'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-(--text-primary)">
                        {getHolidayForDate(selectedDate)?.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono">
                        Official Government Holiday ({getHolidayForDate(selectedDate)?.type})
                      </span>
                    </div>
                    {getHolidayForDate(selectedDate)?.description && (
                      <p className="text-xs text-(--text-muted) mt-0.5">
                        {getHolidayForDate(selectedDate)?.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {hoursGrid.map((hour) => {
              const hourItems = selectedDayItems.filter((item) => item.dateTime.getHours() === hour);
              const hourLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

              return (
                <div key={hour} className="flex gap-4 group min-h-[60px]">
                  {/* Hour Label */}
                  <div className="w-20 text-xs font-mono text-(--text-muted) shrink-0 pt-2 text-right">
                    {hourLabel}
                  </div>

                  {/* Horizontal Line / Event Container */}
                  <div className="flex-1 border-t border-(--border-subtle)/60 pt-2 relative">
                    {hourItems.length === 0 ? (
                      <div className="h-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <button
                          onClick={() => openScheduleModal(selectedDate, hour)}
                          className="text-[11px] text-[#4E82EE] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> Schedule at {hourLabel}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {hourItems.map((item) => {
                          const isCompleted = item.status === 'completed';

                          return (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                isCompleted
                                  ? 'bg-(--bg-elevated)/40 border-(--border-subtle) opacity-60'
                                  : item.type === 'task'
                                  ? 'bg-[#4E82EE]/10 border-[#4E82EE]/30'
                                  : 'bg-amber-500/10 border-amber-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    item.type === 'task'
                                      ? 'bg-[#4E82EE]/20 text-[#4E82EE]'
                                      : 'bg-amber-500/20 text-amber-500'
                                  }`}
                                >
                                  {item.type === 'task' ? (
                                    <ListTodo size={16} />
                                  ) : (
                                    <AlarmClock size={16} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className={`font-semibold text-xs sm:text-sm text-(--text-primary) truncate ${
                                      isCompleted ? 'line-through text-(--text-muted)' : ''
                                    }`}
                                  >
                                    {item.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-(--text-muted) font-mono">
                                    <span>{hourLabel}</span>
                                    <span>•</span>
                                    <span className="capitalize">{item.priority} Priority</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {item.type === 'task' && (
                                  <button
                                    onClick={() => toggleTask(item.id, item.status)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                                      isCompleted
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-(--bg-elevated) hover:bg-[#4E82EE]/15 hover:text-[#4E82EE] text-(--text-secondary)'
                                    }`}
                                  >
                                    {isCompleted ? '✓ Done' : 'Mark Done'}
                                  </button>
                                )}
                                {item.type === 'reminder' && (
                                  <button
                                    onClick={() => deleteReminder(item.id)}
                                    className="p-1.5 rounded-full text-(--text-muted) hover:text-red-500 hover:bg-(--bg-card) transition-colors cursor-pointer"
                                    title="Delete reminder"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Day Details Interactive Modal (Mobile & Desktop) ── */}
      {isDayDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3 shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E82EE]">
                  {SHORT_WEEKDAYS[selectedDate.getDay()]}
                </span>
                <h2 className="font-bold text-base text-(--text-primary)">
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

            {/* Top Holiday Notification inside Modal */}
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

            {/* List of events on this day */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar py-1">
              {selectedDayItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-(--bg-elevated) text-(--text-muted) flex items-center justify-center">
                    <CalendarIcon size={22} />
                  </div>
                  <p className="text-xs text-(--text-muted) font-medium">
                    No scheduled events or tasks for this day.
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
                          ? 'bg-[#4E82EE]/10 border-[#4E82EE]/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            item.type === 'task'
                              ? 'bg-[#4E82EE]/20 text-[#4E82EE]'
                              : 'bg-amber-500/20 text-amber-500'
                          }`}
                        >
                          {item.type === 'task' ? <ListTodo size={16} /> : <AlarmClock size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`font-semibold text-xs sm:text-sm text-(--text-primary) truncate ${
                              isCompleted ? 'line-through text-(--text-muted)' : ''
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-(--text-muted) font-mono">
                            <span>{timeStr}</span>
                            <span>•</span>
                            <span className="capitalize">{item.priority} Priority</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.type === 'task' && (
                          <button
                            onClick={() => toggleTask(item.id, item.status)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                              isCompleted
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-(--bg-elevated) hover:bg-[#4E82EE]/15 hover:text-[#4E82EE] text-(--text-secondary)'
                            }`}
                          >
                            {isCompleted ? '✓ Done' : 'Mark Done'}
                          </button>
                        )}
                        {item.type === 'reminder' && (
                          <button
                            onClick={() => deleteReminder(item.id)}
                            className="p-1.5 rounded-full text-(--text-muted) hover:text-red-500 hover:bg-(--bg-card) transition-colors cursor-pointer"
                            title="Delete reminder"
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
            <div className="pt-3 border-t border-(--border-subtle) flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsDayDetailsModalOpen(false);
                  openScheduleModal(selectedDate);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold hover:opacity-95 shadow-xs transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>+ Schedule on This Day</span>
              </button>
              <button
                onClick={() => {
                  setIsDayDetailsModalOpen(false);
                  setViewMode('day');
                }}
                className="py-2.5 px-4 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Full Hourly Timeline</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comprehensive Schedule Event Modal ────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#4E82EE]/15 text-[#4E82EE] flex items-center justify-center">
                  <CalendarIcon size={16} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-(--text-primary)">
                    Schedule Calendar Event
                  </h2>
                  <p className="text-[11px] text-(--text-muted)">
                    Add an event, task deadline, or reminder alarm
                  </p>
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
              {/* Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                  Event Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType('event')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalType === 'event'
                        ? 'bg-[#4E82EE]/15 border-[#4E82EE] text-[#4E82EE] dark:text-[#a8c7fa] shadow-2xs'
                        : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-muted)'
                    }`}
                  >
                    <span>📅 Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('alarm')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalType === 'alarm'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-2xs'
                        : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-muted)'
                    }`}
                  >
                    <span>⏰ Alarm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('task')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalType === 'task'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                        : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-muted)'
                    }`}
                  >
                    <span>✅ Task</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                  Title & Purpose
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Q3 Roadmap Review, Client Demo, Dentist..."
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-none focus:border-[#4E82EE]"
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
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-none"
                  />
                </div>
              </div>

              {/* Location / Meeting link */}
              <div>
                <label className="block text-xs font-semibold text-(--text-secondary) mb-1 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={12} /> Location / Video Link (Optional)
                </label>
                <input
                  type="text"
                  value={modalLocation}
                  onChange={(e) => setModalLocation(e.target.value)}
                  placeholder="e.g. Google Meet, Zoom, Main Conference Room..."
                  className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-none"
                />
              </div>

              {/* Recurrence / Priority */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                    Recurrence
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'none', label: 'Once' },
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'monthly', label: 'Monthly' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setModalRecurrence(opt.id as any)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          modalRecurrence === opt.id
                            ? 'border-[#4E82EE] bg-[#4E82EE]/20 text-[#4E82EE] dark:text-[#a8c7fa] ring-2 ring-[#4E82EE]/30 font-bold'
                            : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary)'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 uppercase tracking-wider">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'low', label: 'Low', activeClass: 'border-slate-400 bg-slate-500/20 text-slate-200 ring-2 ring-slate-500/40 font-bold' },
                      { id: 'medium', label: 'Medium', activeClass: 'border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40 font-bold' },
                      { id: 'high', label: 'High', activeClass: 'border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40 font-bold' },
                      { id: 'urgent', label: 'Urgent', activeClass: 'border-rose-500 bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/40 font-bold' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setModalPriority(p.id as any)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                          modalPriority === p.id
                            ? p.activeClass
                            : 'border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary)'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-(--border-subtle)">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-(--bg-elevated) text-xs font-semibold text-(--text-secondary) hover:bg-(--bg-card) border border-(--border-subtle) transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold hover:opacity-95 shadow-sm transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
