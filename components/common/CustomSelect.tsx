'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
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

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-(--border-medium) focus:border-[#4E82EE] text-xs font-semibold text-(--text-primary) flex items-center justify-between gap-2 transition-all cursor-pointer select-none shadow-2xs ${
          isOpen ? 'ring-2 ring-[#4E82EE]/30 border-[#4E82EE]' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.badgeColor && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: selectedOption.badgeColor }}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 text-(--text-muted)">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={`shrink-0 text-(--text-muted) transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#4E82EE]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto custom-scrollbar"
        >
          <div className="space-y-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#4E82EE]/15 to-[#9B72CF]/15 text-[#4E82EE] font-bold dark:text-[#a8c7fa]'
                      : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-elevated)'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {option.badgeColor && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: option.badgeColor }}
                      />
                    )}
                    {option.icon && (
                      <span className={`shrink-0 ${isSelected ? 'text-[#4E82EE]' : 'text-(--text-muted)'}`}>
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 truncate">
                      <div className="truncate">{option.label}</div>
                      {option.sublabel && (
                        <div className="text-[10px] text-(--text-muted) font-normal truncate">
                          {option.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="shrink-0 text-[#4E82EE] dark:text-[#a8c7fa]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
