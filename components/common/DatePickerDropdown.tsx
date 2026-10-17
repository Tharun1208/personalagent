'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const parts = value.split('T')[0].split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export default function DatePickerDropdown({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  required = false,
  disabled = false,
}: DatePickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);

  const initial = useMemo(() => {
    if (value) {
      const parts = value.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [value, today]);

  const [viewMonth, setViewMonth] = useState<Date>(initial);

  useEffect(() => {
    if (isOpen) {
      setViewMonth(initial);
      setShowMonthPicker(false);
    }
  }, [isOpen, initial]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.left;
      setAlign(spaceRight < 288 ? 'right' : 'left');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const todayStr = toDateString(today);

  const dayCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay(); // Sunday-first
    const cells: { day: number; type: 'prev' | 'cur' | 'next' }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, type: 'prev' });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'cur' });
    let next = 1;
    while (cells.length % 7 !== 0) cells.push({ day: next++, type: 'next' });
    return cells;
  }, [year, month]);

  const handleSelect = (cell: { day: number; type: 'prev' | 'cur' | 'next' }) => {
    let target: Date;
    if (cell.type === 'prev') target = new Date(year, month - 1, cell.day);
    else if (cell.type === 'next') target = new Date(year, month + 1, cell.day);
    else target = new Date(year, month, cell.day);
    onChange(toDateString(target));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 rounded-xl bg-slate-50 border text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer select-none ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-md'
            : required && !value
              ? 'border-red-300 hover:border-red-400'
              : 'border-slate-200 hover:border-blue-500/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'}`}
      >
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400 font-normal'}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarDays size={14} className={`shrink-0 ${isOpen ? 'text-blue-600' : 'text-slate-400'}`} />
      </button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.16),0_4px_12px_rgba(0,0,0,0.06)] p-3 select-none ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {!showMonthPicker ? (
              <>
                {/* Header: Month, Year + up/down arrows */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <button
                    type="button"
                    onClick={() => setShowMonthPicker(true)}
                    className="flex items-center gap-1 text-sm font-extrabold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {MONTH_NAMES[month]}, {year}
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                      className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                      className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-[11px] font-bold text-slate-500 text-center py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-y-0.5">
                  {dayCells.map((cell, idx) => {
                    const dateStr = toDateString(
                      cell.type === 'prev'
                        ? new Date(year, month - 1, cell.day)
                        : cell.type === 'next'
                          ? new Date(year, month + 1, cell.day)
                          : new Date(year, month, cell.day)
                    );
                    const isSelected = dateStr === value;
                    const isToday = dateStr === todayStr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelect(cell)}
                        className={`w-9 h-9 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30'
                            : cell.type !== 'cur'
                              ? 'text-slate-300 hover:bg-slate-50'
                              : isToday
                                ? 'text-blue-600 font-bold bg-blue-50 hover:bg-blue-100'
                                : 'text-slate-700 font-medium hover:bg-slate-100'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                {/* Footer: Clear / Today */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(todayStr);
                      setIsOpen(false);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Month / Year picker */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <button
                    type="button"
                    aria-label="Previous year"
                    onClick={() => setViewMonth(new Date(year - 1, month, 1))}
                    className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-extrabold text-slate-800">{year}</span>
                  <button
                    type="button"
                    aria-label="Next year"
                    onClick={() => setViewMonth(new Date(year + 1, month, 1))}
                    className="w-7 h-7 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_NAMES.map((name, i) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setViewMonth(new Date(year, i, 1));
                        setShowMonthPicker(false);
                      }}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        i === month
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
