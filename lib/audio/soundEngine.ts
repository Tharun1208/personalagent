/**
 * Web Audio API & HTML5 Audio Sound Synthesizer Engine
 * Generates custom alarm tones, sound effects, and reliable mobile-style alarm loops.
 */

function generateAlarmWavUri(freq = 880, duration = 0.5): string {
  if (typeof window === 'undefined') return '';
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Rapid dual pulse alarm beep (classic mobile phone clock pattern)
    const isBeeping = (t % 0.25) < 0.12;
    const sample = isBeeping ? Math.sin(2 * Math.PI * freq * t) * 0.9 : 0;
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentCustomAudio: HTMLAudioElement | null = null;
  private fallbackAlarmAudio: HTMLAudioElement | null = null;
  private alarmLoopTimer: any = null;
  private isLooping = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  public unlockAudio(): void {
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play synthesized alarm tone by key or custom URL (Loud & Clear)
   */
  public playAlarm(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    if (tone === 'custom' && customUrl) {
      this.playCustomAudio(customUrl, volume);
      return;
    }

    const ctx = this.getContext();
    if (!ctx) {
      this.playFallbackBeep(volume);
      return;
    }

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      const effectiveVol = Math.min(1.0, Math.max(0.1, volume));
      gainNode.gain.setValueAtTime(effectiveVol * 0.9, now);
      gainNode.connect(ctx.destination);

      switch (tone) {
        case 'chime':
        case 'cosmic': {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            oscGain.gain.setValueAtTime(0, now + i * 0.12);
            oscGain.gain.linearRampToValueAtTime(effectiveVol * 0.6, now + i * 0.12 + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 1.2);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 1.3);
          });
          break;
        }

        case 'zen': {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(432, now);
          osc.frequency.exponentialRampToValueAtTime(430, now + 2.5);
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(effectiveVol * 0.8, now + 0.04);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now);
          osc.stop(now + 2.6);
          break;
        }

        case 'radar': {
          [0, 0.22, 0.44].forEach((delay) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400, now + delay);
            osc.frequency.exponentialRampToValueAtTime(800, now + delay + 0.18);
            oscGain.gain.setValueAtTime(effectiveVol * 0.8, now + delay);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start(now + delay);
            osc.stop(now + delay + 0.2);
          });
          break;
        }

        case 'gentle': {
          [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            oscGain.gain.setValueAtTime(0, now + idx * 0.15);
            oscGain.gain.linearRampToValueAtTime(effectiveVol * 0.7, now + idx * 0.15 + 0.08);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.5);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 1.6);
          });
          break;
        }

        case 'retro': {
          [440, 660, 880, 1100, 1320].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            oscGain.gain.setValueAtTime(effectiveVol * 0.4, now + idx * 0.08);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.1);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.12);
          });
          break;
        }

        case 'digital':
        default: {
          // Classic loud 4-pulse digital alarm clock beep
          [0, 0.12, 0.24, 0.36].forEach((delay) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1046.5, now + delay); // C6
            oscGain.gain.setValueAtTime(effectiveVol * 0.5, now + delay);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start(now + delay);
            osc.stop(now + delay + 0.09);
          });
          break;
        }
      }
    } catch (e) {
      this.playFallbackBeep(volume);
    }
  }

  /**
   * Fallback loud audio element beep if Web Audio context is restricted
   */
  public playFallbackBeep(volume: number = 1.0): void {
    try {
      if (typeof window === 'undefined') return;
      const wavUri = generateAlarmWavUri(987.77, 0.5);
      const audio = new Audio(wavUri);
      audio.volume = Math.min(1.0, Math.max(0.1, volume));
      audio.play().catch(() => {});
    } catch {}
  }

  /**
   * Continuous Loud Mobile Alarm Loop
   * Rings continuously until stopped (just like iOS / Android alarm clock)
   */
  public startLoudAlarmLoop(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    this.stopLoudAlarmLoop();
    this.isLooping = true;
    this.unlockAudio();

    if (tone === 'custom' && customUrl) {
      this.playCustomAudio(customUrl, volume);
      if (this.currentCustomAudio) {
        this.currentCustomAudio.loop = true;
      }
      return;
    }

    const ring = () => {
      if (!this.isLooping) return;
      this.playAlarm(tone, volume);
      this.playFallbackBeep(volume);
    };

    ring();
    this.alarmLoopTimer = setInterval(ring, 1200);
  }

  /**
   * Stop the loud alarm loop immediately
   */
  public stopLoudAlarmLoop(): void {
    this.isLooping = false;
    if (this.alarmLoopTimer) {
      clearInterval(this.alarmLoopTimer);
      this.alarmLoopTimer = null;
    }
    this.stopCustomAudio();
    if (this.fallbackAlarmAudio) {
      try {
        this.fallbackAlarmAudio.pause();
        this.fallbackAlarmAudio = null;
      } catch {}
    }
  }

  /**
   * Play custom uploaded audio / URL
   */
  public playCustomAudio(url: string, volume: number = 1.0): void {
    try {
      this.stopCustomAudio();
      const audio = new Audio(url);
      audio.volume = Math.min(1.0, Math.max(0.1, volume));
      audio.play().catch((err) => {
        console.warn('Audio playback error, falling back to synthesizer:', err);
        this.playAlarm('digital', volume);
      });
      this.currentCustomAudio = audio;
    } catch {
      this.playAlarm('digital', volume);
    }
  }

  public stopCustomAudio(): void {
    if (this.currentCustomAudio) {
      try {
        this.currentCustomAudio.pause();
        this.currentCustomAudio.currentTime = 0;
      } catch {}
      this.currentCustomAudio = null;
    }
  }
}

export const soundEngine = new SoundEngine();
