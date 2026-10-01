'use client';

import React, { useState, useEffect } from 'react';
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
  VolumeX,
  Plus,
  Minus,
  Sliders,
  Bell,
} from 'lucide-react';
import { startAlarmSound, stopAlarmSound } from '@/lib/audio/alarmPlayer';

export default function TimerWidget({ onClose }: { onClose?: () => void }) {
  // Timer settings
  const [timerTitle, setTimerTitle] = useState('Deep Focus');
  const [inputMinutes, setInputMinutes] = useState<number>(25);
  const [inputSeconds, setInputSeconds] = useState<number>(0);

  // Runtime states
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Quick preset options
  const PRESETS = [
    { label: '10m', mins: 10 },
    { label: '15m', mins: 15 },
    { label: '25m', mins: 25 },
    { label: '30m', mins: 30 },
    { label: '45m', mins: 45 },
    { label: '60m', mins: 60 },
  ];

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (soundEnabled) {
        startAlarmSound('chime');
        setTimeout(() => stopAlarmSound(), 6000);
      }
      setSessionsCompleted((p) => p + 1);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, soundEnabled]);

  const handleStartCustomTimer = () => {
    const total = Math.max(1, inputMinutes * 60 + inputSeconds);
    setTotalSeconds(total);
    setTimeLeft(total);
    setIsRunning(true);
    setIsConfiguring(false);
  };

  const handleApplyPreset = (mins: number) => {
    setInputMinutes(mins);
    setInputSeconds(0);
    const total = mins * 60;
    setTotalSeconds(total);
    setTimeLeft(total);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
    }
    setIsRunning((p) => !p);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
  };

  const handleAddMinutes = (extraMins: number) => {
    setTimeLeft((prev) => prev + extraMins * 60);
    setTotalSeconds((prev) => Math.max(prev, timeLeft + extraMins * 60));
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const strokeDashoffset = 283 - (283 * progress) / 100;

  return (
    <div className="w-full max-w-sm rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-2xl p-5 sm:p-6 space-y-5 text-(--text-primary) backdrop-blur-2xl animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--border-subtle)/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            <TimerIcon size={18} />
          </div>
          <div>
            <h3 className="app-modal-title text-sm sm:text-base font-bold">Custom Focus Timer</h3>
            <p className="app-card-subtitle text-[11px] text-(--text-muted)">
              {isRunning ? 'Timer Running' : 'Create & execute focus sessions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              soundEnabled
                ? 'text-[#4E82EE] hover:bg-[#4E82EE]/10'
                : 'text-(--text-muted) hover:bg-(--bg-elevated)'
            }`}
            title={soundEnabled ? 'Alarm sound enabled' : 'Alarm sound muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-elevated) transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {isConfiguring ? (
        /* Custom Timer Creator View */
        <div className="space-y-4 animate-in fade-in">
          <div>
            <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1">
              Focus Session Title
            </label>
            <input
              type="text"
              value={timerTitle}
              onChange={(e) => setTimerTitle(e.target.value)}
              placeholder="e.g. Deep Work, Code Review, Reading"
              className="w-full px-3.5 py-2 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4E82EE]/30 text-(--text-primary)"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-(--text-muted) uppercase mb-1.5">
              Set Duration (Minutes & Seconds)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center bg-(--bg-elevated) border border-(--border-subtle) rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={inputMinutes}
                  onChange={(e) => setInputMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none text-(--text-primary)"
                />
                <span className="text-[11px] font-semibold text-(--text-muted)">mins</span>
              </div>

              <div className="flex items-center bg-(--bg-elevated) border border-(--border-subtle) rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={inputSeconds}
                  onChange={(e) => setInputSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none text-(--text-primary)"
                />
                <span className="text-[11px] font-semibold text-(--text-muted)">secs</span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[10px] font-semibold text-(--text-muted) uppercase mb-1">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.mins}
                  type="button"
                  onClick={() => {
                    setInputMinutes(p.mins);
                    setInputSeconds(0);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    inputMinutes === p.mins && inputSeconds === 0
                      ? 'bg-[#4E82EE] text-white border-[#4E82EE] shadow-xs'
                      : 'bg-(--bg-elevated) border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex gap-2 pt-2 border-t border-(--border-subtle)">
            <button
              type="button"
              onClick={() => setIsConfiguring(false)}
              className="flex-1 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold cursor-pointer hover:bg-(--bg-card) transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartCustomTimer}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play size={14} fill="currentColor" />
              <span>Start Timer</span>
            </button>
          </div>
        </div>
      ) : (
        /* Running / Standby Timer Display */
        <div className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1 bg-(--bg-elevated) p-1 rounded-2xl border border-(--border-subtle) overflow-x-auto scrollbar-none">
            {PRESETS.map((p) => (
              <button
                key={p.mins}
                type="button"
                onClick={() => handleApplyPreset(p.mins)}
                className={`flex-1 min-w-[42px] py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  totalSeconds === p.mins * 60 && !isRunning
                    ? 'bg-(--bg-card) text-[#4E82EE] shadow-xs font-bold'
                    : 'text-(--text-muted) hover:text-(--text-primary)'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsConfiguring(true)}
              className="px-2 py-1 rounded-xl text-[11px] font-semibold text-[#4E82EE] hover:bg-(--bg-card) transition-colors cursor-pointer flex items-center gap-0.5 shrink-0"
              title="Configure custom timer"
            >
              <Sliders size={12} />
              <span>Custom</span>
            </button>
          </div>

          {/* Circular Countdown Ring */}
          <div className="relative flex flex-col items-center justify-center py-3">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-(--border-subtle)"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="text-[#4E82EE] transition-all duration-1000 ease-linear"
                  strokeWidth="6"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>

              {/* Centered Timer Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-(--text-primary)">
                  {formattedTime}
                </span>
                <span className="text-[11px] font-semibold text-[#4E82EE] truncate max-w-[110px] mt-0.5">
                  {timerTitle || 'Focus Session'}
                </span>
                <span className="text-[10px] text-(--text-muted)">
                  {isRunning ? 'Running' : timeLeft === 0 ? '✓ Complete!' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Adjustment Bumps */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleAddMinutes(1)}
              className="px-2.5 py-1 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-[11px] font-semibold text-(--text-secondary) cursor-pointer transition-colors"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => handleAddMinutes(5)}
              className="px-2.5 py-1 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-[11px] font-semibold text-(--text-secondary) cursor-pointer transition-colors"
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => setIsConfiguring(true)}
              className="px-2.5 py-1 rounded-xl bg-(--bg-elevated) hover:bg-(--bg-card) border border-(--border-subtle) text-[11px] font-semibold text-[#4E82EE] cursor-pointer transition-colors flex items-center gap-1"
            >
              <Sliders size={11} />
              <span>Edit</span>
            </button>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={toggleTimer}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold text-sm shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              {isRunning ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
              <span>{isRunning ? 'Pause Timer' : timeLeft === 0 ? 'Restart Session' : 'Start Focus'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-card) transition-all cursor-pointer active:scale-95"
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Footer Stats */}
          <div className="pt-3 border-t border-(--border-subtle)/50 flex items-center justify-between text-xs text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <Flame size={14} className="text-amber-500" />
              <span>Sessions Completed:</span>
            </span>
            <span className="font-bold text-(--text-primary) font-mono">
              {sessionsCompleted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
