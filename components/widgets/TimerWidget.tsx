'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';
import { startAlarmSound, stopAlarmSound } from '@/lib/audio/alarmPlayer';

export default function TimerWidget({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<'pomodoro' | 'short_break' | 'long_break'>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const initialTime =
    mode === 'pomodoro' ? 25 * 60 : mode === 'short_break' ? 5 * 60 : 15 * 60;

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      startAlarmSound('chime');
      if (mode === 'pomodoro') {
        setSessionsCompleted((p) => p + 1);
      }
      setTimeout(() => stopAlarmSound(), 5000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const toggleTimer = () => {
    setIsRunning((p) => !p);
  };

  const resetTimer = (newMode = mode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(
      newMode === 'pomodoro' ? 25 * 60 : newMode === 'short_break' ? 5 * 60 : 15 * 60
    );
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="w-full max-w-sm rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-6 space-y-6 text-(--text-primary) backdrop-blur-xl animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-(--border-subtle)/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4E82EE] to-[#9B72CF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <TimerIcon size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-(--text-primary)">Focus Timer</h3>
            <p className="text-[10px] text-(--text-muted)">Pomodoro Focus & Productivity</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Mode Pills */}
      <div className="flex rounded-full bg-(--bg-elevated) p-1 border border-(--border-subtle)">
        {[
          { id: 'pomodoro', label: '25m Focus' },
          { id: 'short_break', label: '5m Break' },
          { id: 'long_break', label: '15m Rest' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => resetTimer(m.id as any)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              mode === m.id
                ? 'bg-(--bg-card) text-(--text-primary) shadow-2xs font-bold'
                : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Circular Countdown Progress Display */}
      <div className="relative flex flex-col items-center justify-center py-4">
        <div className="text-5xl font-extrabold font-mono tracking-tighter bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] bg-clip-text text-transparent select-none">
          {formattedTime}
        </div>
        <div className="text-xs text-(--text-muted) font-medium mt-1">
          {isRunning ? (mode === 'pomodoro' ? '🎯 Stay in deep focus' : '☕ Relax and recharge') : 'Ready to start'}
        </div>

        {/* Linear Progress bar */}
        <div className="w-full bg-(--bg-elevated) h-2 rounded-full mt-5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] h-full transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleTimer}
          className="px-6 py-3 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
        </button>

        <button
          onClick={() => resetTimer(mode)}
          className="p-3 rounded-full bg-(--bg-elevated) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer"
          title="Reset timer"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Sessions Completed Stat */}
      <div className="pt-3 border-t border-(--border-subtle)/50 flex items-center justify-between text-xs text-(--text-muted)">
        <span className="flex items-center gap-1.5">
          <Flame size={14} className="text-amber-500" />
          <span>Sessions today:</span>
        </span>
        <span className="font-bold text-(--text-primary) font-mono">{sessionsCompleted} completed</span>
      </div>
    </div>
  );
}
