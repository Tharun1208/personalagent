'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimePickerDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default function TimePickerDropdown({
  value,
  onChange,
  placeholder = 'Select time',
  className = '',
  required = false,
  disabled = false,
}: TimePickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const [selHour, setSelHour] = useState(0);
  const [selMinute, setSelMinute] = useState(0);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h)) setSelHour(h);
      if (!isNaN(m)) setSelMinute(m);
    }
  }, [value]);

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

  // Scroll selected values into view on open
  useEffect(() => {
    if (isOpen) {
      const scrollSelected = (ref: React.RefObject<HTMLDivElement | null>) => {
        const el = ref.current;
        if (!el) return;
        const target = el.querySelector('[data-selected="true"]') as HTMLElement | null;
        if (target) {
          el.scrollTop = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2;
        }
      };
      scrollSelected(hourRef);
      scrollSelected(minuteRef);
    }
  }, [isOpen]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const display = value ? value : '';

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
        <span className={`truncate ${display ? 'text-slate-800' : 'text-slate-400 font-normal'}`}>
          {display || placeholder}
        </span>
        <Clock size={14} className={`shrink-0 ${isOpen ? 'text-blue-600' : 'text-slate-400'}`} />
      </button>

      {/* Popup: hour + minute columns */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 mt-2 w-44 rounded-2xl bg-white border border-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.16),0_4px_12px_rgba(0,0,0,0.06)] p-2 select-none"
          >
            <div className="grid grid-cols-2 gap-1">
              {/* Hours */}
              <div
                ref={hourRef}
                className="h-44 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5"
              >
                {hours.map((h) => {
                  const isSelected = h === selHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => {
                        setSelHour(h);
                        onChange(`${pad2(h)}:${pad2(selMinute)}`);
                      }}
                      className={`w-full py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white ring-2 ring-slate-900/70 shadow-md'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pad2(h)}
                    </button>
                  );
                })}
              </div>

              {/* Minutes */}
              <div
                ref={minuteRef}
                className="h-44 overflow-y-auto custom-scrollbar space-y-0.5 pl-0.5"
              >
                {minutes.map((m) => {
                  const isSelected = m === selMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => {
                        setSelMinute(m);
                        onChange(`${pad2(selHour)}:${pad2(m)}`);
                        setIsOpen(false);
                      }}
                      className={`w-full py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white ring-2 ring-slate-900/70 shadow-md'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pad2(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
