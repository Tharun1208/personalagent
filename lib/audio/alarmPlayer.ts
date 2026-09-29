'use client';

let alarmAudioCtx: AudioContext | null = null;
let alarmIntervalId: any = null;

export type AlarmTone = 'digital' | 'chime' | 'radar' | 'gentle';

export function startAlarmSound(tone: AlarmTone = 'digital') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!alarmAudioCtx || alarmAudioCtx.state === 'closed') {
      alarmAudioCtx = new AudioCtx();
    }
    if (alarmAudioCtx.state === 'suspended') {
      alarmAudioCtx.resume();
    }

    const playTone = () => {
      if (!alarmAudioCtx || alarmAudioCtx.state !== 'running') return;
      const now = alarmAudioCtx.currentTime;

      if (tone === 'chime') {
        // Soft double harmonic bell
        [880, 1320].forEach((freq, idx) => {
          const osc = alarmAudioCtx!.createOscillator();
          const gain = alarmAudioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.3, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.9);
          osc.connect(gain);
          gain.connect(alarmAudioCtx!.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.95);
        });
      } else if (tone === 'gentle') {
        // Piano like smooth acoustic triad
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = alarmAudioCtx!.createOscillator();
          const gain = alarmAudioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.25, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 1.2);
          osc.connect(gain);
          gain.connect(alarmAudioCtx!.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 1.3);
        });
      } else if (tone === 'radar') {
        // Pulsing radar ping
        const osc = alarmAudioCtx.createOscillator();
        const gain = alarmAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(alarmAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Digital 3-beep alarm
        [0, 0.18, 0.36].forEach((offset) => {
          const osc = alarmAudioCtx!.createOscillator();
          const gain = alarmAudioCtx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(950, now + offset);
          osc.frequency.exponentialRampToValueAtTime(1400, now + offset + 0.12);
          gain.gain.setValueAtTime(0.35, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.12);
          osc.connect(gain);
          gain.connect(alarmAudioCtx!.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.14);
        });
      }
    };

    playTone();
    if (alarmIntervalId) clearInterval(alarmIntervalId);
    alarmIntervalId = setInterval(playTone, tone === 'chime' ? 2000 : 1500);
  } catch (err) {
    console.warn('Alarm sound error', err);
  }
}

export function stopAlarmSound() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
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
