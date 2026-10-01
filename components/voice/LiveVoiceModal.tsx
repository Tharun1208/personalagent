'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';
import { apiFetch } from '@/lib/api';

export default function LiveVoiceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [statusText, setStatusText] = useState('Listening...');
  const [audioBars, setAudioBars] = useState<number[]>([40, 65, 30, 85, 50, 95, 60, 45]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const isSessionActiveRef = useRef(false);

  // Equalizer visual animation loop
  useEffect(() => {
    let animId: any;
    if (isListening || isSpeaking) {
      const updateBars = () => {
        setAudioBars([
          Math.floor(Math.random() * 60 + 30),
          Math.floor(Math.random() * 70 + 25),
          Math.floor(Math.random() * 80 + 20),
          Math.floor(Math.random() * 95 + 15),
          Math.floor(Math.random() * 85 + 20),
          Math.floor(Math.random() * 75 + 25),
          Math.floor(Math.random() * 65 + 30),
          Math.floor(Math.random() * 55 + 35),
        ]);
        animId = setTimeout(updateBars, 120);
      };
      updateBars();
    } else {
      setAudioBars([20, 20, 20, 20, 20, 20, 20, 20]);
    }
    return () => clearTimeout(animId);
  }, [isListening, isSpeaking]);

  const speakResponse = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;
    synthRef.current.cancel();

    // Temporarily pause recognition while AI speaks to prevent feedback loop
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.08;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsListening(false);
      setStatusText('Assistance speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (isSessionActiveRef.current) {
        setStatusText('Listening to you...');
        setUserTranscript('');
        // Auto-resume full-duplex listening
        try {
          recognitionRef.current?.start();
          setIsListening(true);
        } catch {}
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isSessionActiveRef.current) {
        setStatusText('Listening to you...');
        try {
          recognitionRef.current?.start();
          setIsListening(true);
        } catch {}
      }
    };

    synthRef.current.speak(utterance);
  }, []);

  const handleSendVoice = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatusText('Thinking...');
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), conversationId: 'conv_voice_live' }),
      });
      const data = await res.json();
      const reply = data?.assistantMessage?.content || '';

      if (reply) {
        const cleanReply = reply.replace(/[#*_`|]/g, '').trim();
        setAiResponse(cleanReply);
        speakResponse(cleanReply);
      }
    } catch (err) {
      console.error('Voice chat error', err);
      setStatusText('Error getting response. Retrying...');
    }
  }, [speakResponse]);

  const startListening = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        isSessionActiveRef.current = true;
        setStatusText('Listening to you...');
      } catch (err) {
        console.warn('Voice recognition start notice:', err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    isSessionActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
      setStatusText('Paused');
    }
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    clearTimeout(silenceTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      isSessionActiveRef.current = true;
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setUserTranscript(transcript);
              clearTimeout(silenceTimeoutRef.current);
              handleSendVoice(transcript);
            } else {
              interim += transcript;
              setUserTranscript(interim);
              // Auto-silence debounce (after 1.5s silence, send turn)
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = setTimeout(() => {
                if (interim.trim().length > 2 && isSessionActiveRef.current && !isSpeaking) {
                  handleSendVoice(interim);
                }
              }, 1600);
            }
          }
        };

        rec.onerror = () => {
          if (isSessionActiveRef.current && !isSpeaking) {
            try { rec.start(); } catch {}
          }
        };

        rec.onend = () => {
          if (isSessionActiveRef.current && !isSpeaking) {
            try { rec.start(); } catch {}
          }
        };

        recognitionRef.current = rec;
        startListening();
      }
    }

    return () => {
      isSessionActiveRef.current = false;
      stopListening();
    };
  }, [isOpen, handleSendVoice, startListening, stopListening, isSpeaking]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#131314]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 animate-in fade-in duration-300 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center font-bold text-xs shadow-md">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="font-semibold text-base text-white font-sans flex items-center gap-2">
              Assistance Live Voice
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Full Duplex
              </span>
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            stopListening();
            onClose();
          }}
          className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Center Animated Gemini Waveform / Orb */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-xl mx-auto">
        <div className="relative flex items-center justify-center">
          {/* Glowing Outer Rings */}
          <div
            className={`absolute w-64 h-64 rounded-full bg-gradient-to-r from-[#4E82EE]/30 via-[#9B72CF]/30 to-[#F27878]/30 blur-3xl transition-all duration-500 ${
              isSpeaking || isListening ? 'scale-125 opacity-100' : 'scale-90 opacity-30'
            }`}
          />

          {/* Central Pulsing Sphere */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-40 h-40 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] p-1 shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer ${
              isSpeaking ? 'scale-110' : isListening ? 'scale-105' : 'scale-95 opacity-75'
            }`}
          >
            <div className="w-full h-full rounded-full bg-[#1e1f20] flex flex-col items-center justify-center text-white gap-2">
              {isSpeaking ? (
                <Volume2 size={44} className="text-[#9B72CF] animate-pulse" />
              ) : isListening ? (
                <Mic size={44} className="text-[#4E82EE] animate-bounce" />
              ) : (
                <MicOff size={44} className="text-neutral-500" />
              )}
            </div>
          </button>
        </div>

        {/* Live Visualizer Waves */}
        <div className="flex items-center justify-center gap-1.5 h-12 w-48">
          {audioBars.map((height, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? 'bg-gradient-to-t from-[#9B72CF] to-[#F27878]'
                  : isListening
                  ? 'bg-gradient-to-t from-[#4E82EE] to-[#9B72CF]'
                  : 'bg-neutral-700'
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Live Status */}
        <div className="space-y-1.5">
          <div className="text-lg font-medium text-white tracking-wide">{statusText}</div>
          <div className="text-xs text-neutral-400">
            {isSpeaking
              ? 'Tap orb to interrupt anytime'
              : isListening
              ? 'Hands-free mode active — talk naturally'
              : 'Tap orb to resume conversation'}
          </div>
        </div>

        {/* Subtitles Box */}
        {(userTranscript || aiResponse) && (
          <div className="w-full p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-left space-y-2.5 max-h-44 overflow-y-auto custom-scrollbar backdrop-blur-sm">
            {userTranscript && (
              <div className="text-xs text-neutral-300 leading-relaxed">
                <span className="font-bold text-[#4E82EE]">You: </span>
                <span>{userTranscript}</span>
              </div>
            )}
            {aiResponse && (
              <div className="text-xs text-neutral-200 leading-relaxed">
                <span className="font-bold text-[#9B72CF]">Assistance: </span>
                <span>{aiResponse}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-8 py-3.5 rounded-full font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
              : 'bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white shadow-lg hover:opacity-95'
          }`}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{isListening ? 'Mute' : 'Resume Mic'}</span>
        </button>

        <button
          onClick={() => {
            stopListening();
            onClose();
          }}
          className="px-6 py-3.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
