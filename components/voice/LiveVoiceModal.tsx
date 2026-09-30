'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
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
  const { user, sendMessage } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [statusText, setStatusText] = useState('Tap to start voice conversation');

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = async (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setUserTranscript(transcript);
              setStatusText('Thinking...');
              handleSendVoice(transcript);
            } else {
              interim += transcript;
              setUserTranscript(interim);
            }
          }
        };

        rec.onerror = () => {
          setIsListening(false);
          setStatusText('Listening paused');
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setStatusText('Listening to you...');
      } catch (err) {
        console.warn('Voice recognition already started', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setStatusText('Paused');
      } catch {}
    }
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendVoice = async (text: string) => {
    if (!text.trim()) return;
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
      setStatusText('Error getting response');
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText('Assistance is speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusText('Listening to you...');
      setUserTranscript('');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatusText('Ready');
    };

    synthRef.current.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#131314]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 animate-in fade-in duration-300 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] text-white flex items-center justify-center font-bold text-xs shadow-md">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-base text-white font-sans">
            Assistance Live Voice
          </span>
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
            className={`absolute w-56 h-56 rounded-full bg-gradient-to-r from-[#4E82EE]/30 via-[#9B72CF]/30 to-[#F27878]/30 blur-2xl transition-all duration-700 ${
              isSpeaking || isListening ? 'scale-125 opacity-100 animate-pulse' : 'scale-90 opacity-40'
            }`}
          />

          {/* Central Pulsing Sphere */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-36 h-36 rounded-full bg-gradient-to-tr from-[#4E82EE] via-[#9B72CF] to-[#F27878] p-1 shadow-2xl transition-transform duration-300 hover:scale-105 cursor-pointer ${
              isSpeaking ? 'animate-spin' : isListening ? 'scale-110' : 'scale-100'
            }`}
          >
            <div className="w-full h-full rounded-full bg-[#1e1f20] flex items-center justify-center text-white">
              {isListening ? (
                <Mic size={40} className="text-[#4E82EE] animate-bounce" />
              ) : (
                <MicOff size={40} className="text-neutral-500" />
              )}
            </div>
          </button>
        </div>

        {/* Live Status */}
        <div className="space-y-2">
          <div className="text-lg font-medium text-white">{statusText}</div>
          <div className="text-xs text-neutral-400">
            {isListening
              ? 'Speak naturally — Assistance will answer automatically'
              : 'Click the orb to start talking'}
          </div>
        </div>

        {/* Subtitles Box */}
        {(userTranscript || aiResponse) && (
          <div className="w-full p-4 rounded-3xl bg-neutral-900/80 border border-neutral-800 text-left space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {userTranscript && (
              <div className="text-xs text-neutral-300">
                <span className="font-bold text-[#4E82EE]">You: </span>
                <span>{userTranscript}</span>
              </div>
            )}
            {aiResponse && (
              <div className="text-xs text-neutral-200">
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
          <span>{isListening ? 'Mute Mic' : 'Start Talking'}</span>
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
