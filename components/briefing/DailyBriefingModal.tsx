'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  X,
  Target,
  CheckSquare,
  Clock,
  HandCoins,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyBriefingModal({ isOpen, onClose }: DailyBriefingModalProps) {
  const { user, tasks, reminders, goals, ledgerEntries } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const activeGoals = goals.filter((g) => g.status === 'active' || g.progress < 100);
  const pendingDues = (ledgerEntries || []).filter((l) => l.status === 'pending');

  // Generate intelligent daily briefing text
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const userName = user?.name ? user.name.split(' ')[0] : 'there';

    let text = `${greeting}, ${userName}. Here is your executive daily briefing. `;

    if (pendingTasks.length > 0) {
      text += `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}. Your top priority is ${pendingTasks[0].title}. `;
    } else {
      text += `Your task list is clear today. `;
    }

    if (activeGoals.length > 0) {
      text += `You are actively pursuing ${activeGoals.length} key objective${activeGoals.length > 1 ? 's' : ''}. Your current focus is ${activeGoals[0].title}, currently at ${activeGoals[0].progress} percent progress. `;
    }

    if (pendingReminders.length > 0) {
      const firstReminder = pendingReminders[0];
      const timeStr = new Date(firstReminder.dueDateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      text += `You have an upcoming alarm scheduled for ${timeStr} regarding ${firstReminder.title}. `;
    }

    if (pendingDues.length > 0) {
      const giveTotal = pendingDues.filter((d) => d.type === 'give').reduce((acc, d) => acc + d.amount, 0);
      const receiveTotal = pendingDues.filter((d) => d.type === 'receive').reduce((acc, d) => acc + d.amount, 0);
      if (giveTotal > 0 || receiveTotal > 0) {
        text += `In financial dues, you have pending settlements to review. `;
      }
    }

    text += `Have a productive and focused day!`;
    setBriefingText(text);
  }, [isOpen, user, tasks, reminders, goals, ledgerEntries]);

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(briefingText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // Pick best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleRestart = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setTimeout(() => handlePlayPause(), 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-(--bg-card) border border-(--border-subtle) rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="app-modal-title">Morning Audio Briefing</h2>
              <p className="app-card-subtitle">Voice-synthesized executive summary</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="p-1.5 rounded-full text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-secondary) cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audio Visualizer Wave Animation */}
        <div className="p-6 rounded-2xl bg-(--bg-secondary)/60 border border-(--border-subtle) flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-center gap-1.5 h-12">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35].map((height, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-[#4E82EE] to-[#9B72CF] animate-pulse'
                    : 'bg-(--text-muted)/30'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(15, Math.floor(height * Math.random()))}%` : '20%',
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestart}
              title="Restart Briefing"
              className="p-2.5 rounded-full bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:scale-105 transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={handlePlayPause}
              className="px-6 py-2.5 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-95 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause size={16} />
                  <span>Pause Audio</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Play Voice Briefing</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-(--bg-secondary)/40 border border-(--border-subtle)/70 flex items-center gap-2">
            <CheckSquare size={16} className="text-[#4E82EE] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-(--text-muted)">Tasks Pending</div>
              <div className="font-bold text-(--text-primary) truncate">{pendingTasks.length} items</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-(--bg-secondary)/40 border border-(--border-subtle)/70 flex items-center gap-2">
            <Target size={16} className="text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-(--text-muted)">Active Goals</div>
              <div className="font-bold text-(--text-primary) truncate">{activeGoals.length} objectives</div>
            </div>
          </div>
        </div>

        {/* Written Transcript Card */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
            Generated Voice Transcript
          </span>
          <div className="p-3.5 rounded-xl bg-(--bg-secondary)/30 border border-(--border-subtle) text-xs text-(--text-secondary) leading-relaxed max-h-32 overflow-y-auto custom-scrollbar italic">
            "{briefingText}"
          </div>
        </div>
      </div>
    </div>
  );
}
