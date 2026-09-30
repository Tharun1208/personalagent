'use client';

import { soundEngine } from './soundEngine';

export type AlarmTone = 'digital' | 'chime' | 'radar' | 'gentle';

export function startAlarmSound(tone: AlarmTone = 'digital') {
  soundEngine.startLoudAlarmLoop(tone, 1.0);
}

export function stopAlarmSound() {
  soundEngine.stopLoudAlarmLoop();
}

export function announceAlarmVoice(userName: string, title: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const name = userName ? userName.split(' ')[0] : 'there';
    const cleanTitle = title.replace(/[#*_`]/g, '').replace(/^(?:reminder|alarm):\s*/i, '');
    const text = `Attention ${name}, your scheduled alarm for ${cleanTitle} is ringing now.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Voice announcement error', err);
  }
}
