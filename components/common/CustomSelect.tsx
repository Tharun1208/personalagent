'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badgeColor?: string;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setFilterQuery('');
      }
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

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500/50 text-xs font-semibold text-slate-800 flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer select-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] ${
          isOpen
            ? 'ring-2 ring-blue-500/20 border-blue-500 shadow-md'
            : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          {selectedOption?.badgeColor && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
              style={{ backgroundColor: selectedOption.badgeColor }}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-400">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-250 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 right-0 mt-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] max-h-64 overflow-y-auto custom-scrollbar ring-1 ring-black/5"
          >
            {options.length > 5 && (
              <div className="p-1 mb-1 border-b border-slate-100 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 rounded-xl bg-slate-50 border-none text-[11px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-3 px-2 text-center text-xs text-slate-400 italic">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                        setFilterQuery('');
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer text-left group ${
                        isSelected
                          ? 'bg-blue-50 text-[#1C73E8] font-bold shadow-xs'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        {option.badgeColor && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: option.badgeColor }}
                          />
                        )}
                        {option.icon && (
                          <span
                            className={`shrink-0 ${
                              isSelected ? 'text-[#1C73E8]' : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            {option.icon}
                          </span>
                        )}
                        <div className="min-w-0 truncate">
                          <div className="truncate">{option.label}</div>
                          {option.sublabel && (
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {option.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check size={14} className="shrink-0 text-[#1C73E8] stroke-[2.5]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
