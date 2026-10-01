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
  Search,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import {
  getHolidayForDate,
  getAllHolidaysForDate,
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
  const [viewModeDropdownOpen, setViewModeDropdownOpen] = useState(false);
  const datePickerAnchorRef = useRef<HTMLDivElement>(null);
  const viewModeAnchorRef = useRef<HTMLDivElement>(null);
  

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

    return items.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [tasks, reminders]);

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


  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const [h, m] = modalTime.split(':').map(Number);
    const eventDateTime = new Date(modalDate);
    eventDateTime.setHours(h || 10, m || 0, 0, 0);

    if (modalType === 'task') {
      await createTask(
        modalTitle,
        modalPriority,
        eventDateTime.toISOString()
      );
    } else {
      await createReminder(
        modalTitle,
        eventDateTime.toISOString(),
        modalRecurrence,
        modalLocation ? `📍 Location: ${modalLocation}` : undefined
      );
    }

    setIsAddModalOpen(false);
    setModalTitle('');
    setModalLocation('');
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
      holidays: ReturnType<typeof getAllHolidaysForDate>;
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
        holidays: getAllHolidaysForDate(d),
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
        holidays: getAllHolidaysForDate(d),
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
        holidays: getAllHolidaysForDate(d),
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
        holidays: getAllHolidaysForDate(dayDate),
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-(--bg-primary) text-(--text-primary) font-sans select-none">
      
      {/* ── Google Calendar Header Bar (Single Clean Header Row) ── */}
      <header className="h-14 px-2 sm:px-4 border-b border-(--border-subtle) bg-(--bg-card) flex items-center justify-between gap-1 shrink-0 z-30">
        
        {/* Left: Google Calendar Brand Icon, Title, Today Button, Arrows, Month/Year */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
          {/* Google Calendar Blue Logo Tile (Hidden on mobile to ensure zero overlap) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {new Date().getDate()}
            </div>
            <span className="font-semibold text-base sm:text-lg tracking-tight hidden md:inline text-(--text-primary)">
              Calendar
            </span>
          </div>

          {/* Today Button (Google Calendar style outlined pill) */}
          <button
            onClick={handleToday}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-2xs shrink-0 ${
              isToday
                ? 'border-[#1a73e8] text-[#1a73e8] bg-[#1a73e8]/10 font-semibold'
                : 'border-(--border-subtle) text-(--text-primary) hover:bg-(--bg-elevated)'
            }`}
          >
            Today
          </button>

          {/* Previous / Next Arrows (< >) */}
          <div className="flex items-center shrink-0">
            <button
              onClick={handlePrev}
              className="p-1 sm:p-1.5 rounded-full hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={handleNext}
              className="p-1 sm:p-1.5 rounded-full hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Month & Year Title Dropdown */}
          <div className="relative" ref={datePickerAnchorRef}>
            <button
              onClick={() => setDatePickerOpen((o) => !o)}
              className="flex items-center gap-1 py-1 px-1.5 sm:px-2 rounded-lg hover:bg-(--bg-elevated) text-(--text-primary) text-sm sm:text-base md:text-lg font-bold transition-colors cursor-pointer group"
            >
              <span className="tracking-tight whitespace-nowrap">
                {viewMode === 'day'
                  ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
                  : `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
              </span>
              <ChevronDown size={14} className={`text-(--text-muted) transition-transform duration-200 ${datePickerOpen ? 'rotate-180 text-[#1a73e8]' : ''}`} />
            </button>

            {/* Google Month / Year Selector Popover */}
            {datePickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDatePickerOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-40 w-64 p-3.5 rounded-2xl border border-(--border-subtle) bg-(--bg-card) shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-(--border-subtle)">
                    <button
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setFullYear(d.getFullYear() - 1);
                        setSelectedDate(d);
                      }}
                      className="p-1 rounded-lg hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
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
                          className={`py-2 px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#1a73e8] text-white shadow-xs font-bold'
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

        {/* Right: Export .ics, Google-Style View Switcher Dropdown & Create Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Export ICS */}
          <button
            onClick={exportIcsCalendar}
            title="Export Calendar (.ics)"
            className="p-1.5 sm:p-2 rounded-full hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors cursor-pointer hidden sm:block"
          >
            <Download size={18} />
          </button>

          {/* Google Calendar Style View Selector Dropdown [Month ▾] */}
          <div className="relative shrink-0" ref={viewModeAnchorRef}>
            <button
              onClick={() => setViewModeDropdownOpen((o) => !o)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-card) hover:bg-(--bg-elevated) text-xs sm:text-sm font-medium text-(--text-primary) transition-colors cursor-pointer shadow-2xs capitalize shrink-0"
            >
              <span>{viewMode}</span>
              <ChevronDown size={13} className={`text-(--text-muted) transition-transform duration-200 ${viewModeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {viewModeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setViewModeDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-40 w-36 py-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-card) shadow-2xl animate-in fade-in zoom-in-95 duration-100 divide-y divide-(--border-subtle)/40">
                  {(
                    [
                      { mode: 'day', label: 'Day', shortcut: 'D' },
                      { mode: 'week', label: 'Week', shortcut: 'W' },
                      { mode: 'month', label: 'Month', shortcut: 'M' },
                      { mode: 'year', label: 'Year', shortcut: 'Y' },
                    ] as const
                  ).map(({ mode, label, shortcut }) => {
                    const isActive = viewMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          setViewModeDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#1a73e8]/10 text-[#1a73e8] font-bold'
                            : 'text-(--text-primary) hover:bg-(--bg-elevated)'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-[10px] text-(--text-muted) font-mono">{shortcut}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Google Calendar Style + Create Event Button */}
          <button
            onClick={() => openScheduleModal()}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-semibold hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-1 shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Create</span>
          </button>
        </div>
      </header>

      {/* ── Main Google Calendar Viewport (Full Screen Height, No Extra Filter Bar) ── */}
      <div className="flex-1 overflow-hidden flex flex-col pb-16 sm:pb-4">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. GOOGLE CALENDAR MONTH VIEW (Exact Replica)                 */}
        {/* ───────────────────────────────────────────────────────────── */}
        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-(--bg-primary)">
            
            {/* Weekday Columns Header Row (SUN, MON, TUE, WED, THU, FRI, SAT) */}
            <div className="grid grid-cols-7 border-b border-(--border-subtle) text-center py-1.5 shrink-0 bg-(--bg-card)">
              {SHORT_WEEKDAYS.map((day, dIdx) => (
                <div
                  key={day}
                  className="text-[11px] font-semibold text-(--text-muted) tracking-wider uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Full Screen Continuous Google Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6 divide-x divide-y divide-(--border-subtle) border-b border-(--border-subtle) bg-(--bg-card) overflow-y-auto">
              {monthDays.map((day, idx) => {
                const dayNum = day.date.getDate();
                const isSelected = day.date.toDateString() === selectedDate.toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day.date)}
                    className={`min-h-[80px] sm:min-h-[105px] p-1 sm:p-1.5 transition-colors cursor-pointer flex flex-col justify-start relative group select-none hover:bg-(--bg-elevated)/40 ${
                      isSelected
                        ? 'bg-[#1a73e8]/5'
                        : day.isCurrentMonth
                        ? 'bg-(--bg-card)'
                        : 'bg-(--bg-sidebar)/20 opacity-40'
                    }`}
                  >
                    {/* Centered Date Number Header */}
                    <div className="flex items-center justify-center mb-1 shrink-0">
                      {day.isToday ? (
                        <span className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          {dayNum}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium text-center ${
                            day.isCurrentMonth
                              ? 'text-(--text-primary)'
                              : 'text-(--text-muted)'
                          }`}
                        >
                          {dayNum}
                        </span>
                      )}
                    </div>

                    {/* Google Calendar Solid Event & Holiday Strips */}
                    <div className="flex-1 space-y-1 overflow-hidden w-full">
                      {/* 1. Indian Government Holidays & Festivals (Solid High-Contrast Green Strips) */}
                      {day.holidays.map((h, hIdx) => (
                        <div
                          key={`h_${hIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day.date);
                          }}
                          className="bg-[#0b8043] dark:bg-[#137333] hover:bg-[#188038] text-white text-[10.5px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-[3px] truncate block w-full leading-tight cursor-pointer transition-colors shadow-none"
                          title={`🏛️ ${h.name}`}
                        >
                          <span className="truncate">{h.name}</span>
                        </div>
                      ))}

                      {/* 2. Scheduled Events & Tasks (Solid High-Contrast Strips) */}
                      {day.items.slice(0, Math.max(1, 3 - day.holidays.length)).map((item) => {
                        const isCompleted = item.status === 'completed';
                        const isTask = item.type === 'task';

                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDayClick(day.date);
                            }}
                            className={`text-[10.5px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-[3px] truncate block w-full leading-tight cursor-pointer transition-colors shadow-none text-white ${
                              isCompleted
                                ? 'bg-neutral-600 text-neutral-300 line-through opacity-70'
                                : isTask
                                ? 'bg-[#8e24aa] dark:bg-[#8e24aa] hover:bg-[#7b1fa2]'
                                : 'bg-[#1a73e8] dark:bg-[#1a73e8] hover:bg-[#1557b0]'
                            }`}
                            title={item.title}
                          >
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}

                      {/* +N more Indicator */}
                      {day.items.length + day.holidays.length > 3 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day.date);
                          }}
                          className="text-[10px] font-semibold text-(--text-muted) hover:text-[#1a73e8] pl-1 cursor-pointer leading-tight truncate"
                        >
                          +{day.items.length + day.holidays.length - 3} more
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
          <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-(--bg-primary)">
            
            {/* Week Columns Header (7 Days) */}
            <div className="grid grid-cols-8 border-b border-(--border-subtle) py-2 text-center shrink-0 bg-(--bg-card)">
              <div className="w-12 sm:w-16" /> {/* Time gutter spacer */}
              {weekDays.map((w, wIdx) => {
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
                    <span className="text-[10px] sm:text-xs font-semibold text-(--text-muted) uppercase">
                      {SHORT_WEEKDAYS[w.date.getDay()]}
                    </span>
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 mt-0.5 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-colors ${
                        w.isToday
                          ? 'bg-[#1a73e8] text-white shadow-xs'
                          : isSelected
                          ? 'bg-(--bg-elevated) text-[#1a73e8] border border-[#1a73e8]'
                          : 'text-(--text-primary) group-hover:bg-(--bg-elevated)'
                      }`}
                    >
                      {w.date.getDate()}
                    </div>
                    {w.holidays.length > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-[80px]" title={w.holidays[0].name}>
                        {w.holidays[0].name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-(--border-subtle)/50 border-t border-(--border-subtle) bg-(--bg-card)">
              {hoursGrid.map((hour) => {
                const hourLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[52px] group relative">
                    {/* Time Gutter Label */}
                    <div className="w-12 sm:w-16 pr-2 text-right text-[10px] sm:text-[11px] font-mono text-(--text-muted) -mt-2 select-none shrink-0">
                      {hourLabel}
                    </div>

                    {/* 7 Day Columns for this hour */}
                    {weekDays.map((w, wIdx) => {
                      const hourItems = w.items.filter((it) => it.dateTime.getHours() === hour);
                      return (
                        <div
                          key={wIdx}
                          onClick={() => openScheduleModal(w.date, hour)}
                          className="border-l border-(--border-subtle)/50 p-1 hover:bg-[#1a73e8]/5 transition-colors cursor-pointer relative min-h-[52px]"
                        >
                          {hourItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDayClick(w.date);
                              }}
                              className={`p-1 rounded text-[11px] font-medium shadow-2xs mb-1 truncate text-white ${
                                item.status === 'completed'
                                  ? 'bg-neutral-600 text-neutral-300 line-through'
                                  : item.type === 'task'
                                  ? 'bg-[#8e24aa]'
                                  : 'bg-[#1a73e8]'
                              }`}
                            >
                              <div className="truncate font-semibold">{item.title}</div>
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
          <div className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4 overflow-y-auto">
            
            {/* Day Header Banner with Holiday */}
            <div className="p-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                  isToday ? 'bg-[#1a73e8] text-white' : 'bg-(--bg-elevated) text-(--text-primary)'
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

              {getAllHolidaysForDate(selectedDate).length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b8043]/15 border border-[#0b8043]/30 text-[#0b8043] dark:text-emerald-400 font-bold text-xs shrink-0">
                  <span>🏛️</span>
                  <span>{getAllHolidaysForDate(selectedDate)[0].name}</span>
                </div>
              )}
            </div>

            {/* Time Grid (12 AM - 11 PM) */}
            <div className="rounded-2xl bg-(--bg-card) border border-(--border-subtle) divide-y divide-(--border-subtle)/50 overflow-hidden shadow-xs">
              {hoursGrid.map((hour) => {
                const hourItems = selectedDayItems.filter((item) => item.dateTime.getHours() === hour);
                const hourLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

                return (
                  <div key={hour} className="flex min-h-[56px] group hover:bg-(--bg-elevated)/40 transition-colors">
                    {/* Time Label Gutter */}
                    <div className="w-20 text-xs font-mono text-(--text-muted) shrink-0 p-3 text-right border-r border-(--border-subtle)/50 select-none">
                      {hourLabel}
                    </div>

                    {/* Hourly Content */}
                    <div className="flex-1 p-2 flex items-center justify-between">
                      {hourItems.length === 0 ? (
                        <button
                          onClick={() => openScheduleModal(selectedDate, hour)}
                          className="opacity-0 group-hover:opacity-100 text-[11px] text-[#1a73e8] font-semibold flex items-center gap-1 hover:underline transition-opacity cursor-pointer"
                        >
                          <Plus size={12} /> Schedule at {hourLabel}
                        </button>
                      ) : (
                        <div className="w-full space-y-1.5">
                          {hourItems.map((item) => (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) flex items-center justify-between gap-3 shadow-2xs ${
                                item.status === 'completed' ? 'opacity-60' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  item.type === 'task' ? 'bg-[#8e24aa]' : 'bg-[#1a73e8]'
                                }`} />
                                <div className={`font-semibold text-xs sm:text-sm text-(--text-primary) truncate ${item.status === 'completed' ? 'line-through text-(--text-muted)' : ''}`}>
                                  {item.title}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.type === 'task' && (
                                  <button
                                    onClick={() => toggleTask(item.id, item.status)}
                                    className="px-3 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold text-(--text-primary) hover:border-emerald-500 transition-colors cursor-pointer"
                                  >
                                    {item.status === 'completed' ? '✓ Done' : 'Mark Done'}
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
          <div className="flex-1 p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
            
            {/* Year Header Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) shadow-xs">
              <div className="p-3">
                <span className="text-[11px] font-semibold text-(--text-muted) uppercase">Scheduled Events</span>
                <p className="text-2xl font-bold text-(--text-primary) font-mono mt-0.5">{yearMetrics.total}</p>
              </div>
              <div className="p-3">
                <span className="text-[11px] font-semibold text-[#1a73e8] uppercase">Tasks Due</span>
                <p className="text-2xl font-bold text-[#1a73e8] font-mono mt-0.5">{yearMetrics.tasks}</p>
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
                    className="p-4 rounded-2xl bg-(--bg-card) border border-(--border-subtle) hover:border-[#1a73e8]/50 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-(--text-primary)">{m.monthName}</h3>
                      <div className="flex items-center gap-1">
                        {monthHolidays.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                            🏛️ {monthHolidays.length}
                          </span>
                        )}
                        {m.itemsCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#1a73e8]/15 text-[#1a73e8] font-semibold">
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
                                ? 'bg-[#1a73e8] text-white font-bold'
                                : isCellHoliday
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
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

      {/* ── Day Details Modal (Google Calendar View Details) ────────────── */}
      {isDayDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3 shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1a73e8]">
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

            {/* Govt Holidays List Banner */}
            {getAllHolidaysForDate(selectedDate).map((h, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center gap-3.5 shrink-0 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  {h.emoji || '🏛️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-(--text-primary) truncate">{h.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0b8043] text-white shrink-0">
                      Holiday
                    </span>
                  </div>
                  <p className="text-xs text-(--text-muted) mt-0.5 truncate">
                    {h.description || 'Public Holiday & Observance'}
                  </p>
                </div>
              </div>
            ))}

            {/* Event List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar py-1">
              {selectedDayItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-(--bg-elevated) text-(--text-muted) flex items-center justify-center">
                    <CalendarIcon size={22} />
                  </div>
                  <p className="text-xs text-(--text-muted) font-medium">
                    No tasks or appointments scheduled for this day.
                  </p>
                </div>
              ) : (
                selectedDayItems.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const timeStr = item.dateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) flex items-center justify-between gap-3 transition-all shadow-2xs ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          item.type === 'task'
                            ? 'bg-[#8e24aa]/15 text-[#8e24aa] dark:text-[#ce93d8]'
                            : 'bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#90caf9]'
                        }`}>
                          {item.type === 'task' ? <ListTodo size={17} /> : <AlarmClock size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-xs sm:text-sm text-(--text-primary) truncate ${isCompleted ? 'line-through text-(--text-muted)' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-(--text-muted) font-mono mt-0.5 flex items-center gap-2">
                            <span>{timeStr}</span>
                            <span>•</span>
                            <span className="capitalize">{item.priority} priority</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.type === 'task' && (
                          <button
                            onClick={() => toggleTask(item.id, item.status)}
                            className="px-3 py-1 rounded-full bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold text-(--text-primary) hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
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

      {/* ── Event Creation Modal (Google Calendar Style) ─────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1a73e8]/15 text-[#1a73e8] flex items-center justify-center">
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
                      ? 'bg-[#1a73e8]/15 border-[#1a73e8] text-[#1a73e8] dark:text-[#a8c7fa] shadow-2xs font-bold'
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
                      ? 'bg-[#8e24aa]/15 border-[#8e24aa] text-[#8e24aa] dark:text-[#d1b8f0] shadow-2xs font-bold'
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
                  className="w-full px-4 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-sm text-(--text-primary) focus:outline-hidden focus:border-[#1a73e8]"
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
