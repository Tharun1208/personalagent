/**
 * Web Audio API & HTML5 Audio Sound Synthesizer Engine
 * Generates custom alarm tones, sound effects, and reliable mobile-style alarm loops.
 * Strictly compliant with browser Autoplay policies (Chrome, Safari, Edge, Android/iOS).
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
  private fallbackAudio: HTMLAudioElement | null = null;
  private alarmLoopTimer: any = null;
  private isLooping = false;
  private unlocked = false;
  private pendingAlarm: { tone: string; volume: number; customUrl?: string } | null = null;
  private listeners: Set<(unlocked: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockFromUserGesture();
      };

      const events = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
      events.forEach((evt) => {
        window.addEventListener(evt, unlockHandler, { passive: true, capture: true });
      });
    }
  }

  public subscribeState(cb: (unlocked: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isUnlocked());
    return () => this.listeners.delete(cb);
  }

  private notifyState(): void {
    const isUnlocked = this.isUnlocked();
    this.listeners.forEach((cb) => {
      try {
        cb(isUnlocked);
      } catch {}
    });
  }

  public isUnlocked(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return true;
    if (
      typeof navigator !== 'undefined' &&
      'userActivation' in navigator &&
      (navigator as any).userActivation?.hasBeenActive
    ) {
      return true;
    }
    return this.unlocked;
  }

  private canActivateAudio(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.unlocked && this.ctx && this.ctx.state === 'running') return true;
    if (
      typeof navigator !== 'undefined' &&
      'userActivation' in navigator &&
      (navigator as any).userActivation?.hasBeenActive
    ) {
      return true;
    }
    return false;
  }

  /**
   * Unlock Web Audio directly from a user gesture (trusted interaction)
   */
  public unlockFromUserGesture(): void {
    if (typeof window === 'undefined') return;

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }

      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx
            .resume()
            .then(() => {
              this.unlocked = true;
              this.playSilentBuffer();
              this.notifyState();
              this.startPendingLoopIfAny();
            })
            .catch(() => {});
        } else if (this.ctx.state === 'running') {
          this.unlocked = true;
          this.notifyState();
          this.startPendingLoopIfAny();
        }
      }
    } catch {}
  }

  /**
   * Public unlock handler (safe to call anywhere)
   */
  public unlockAudio(): void {
    this.unlockFromUserGesture();
  }

  /**
   * Play silent 1-sample buffer to warm up mobile WebAudio output
   */
  private playSilentBuffer(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch {}
  }

  private startPendingLoopIfAny(): void {
    if (this.pendingAlarm && this.isLooping) {
      const { tone, volume, customUrl } = this.pendingAlarm;
      this.pendingAlarm = null;
      this.executeLoop(tone, volume, customUrl);
    }
  }

  private getContextSafe(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    // Only create AudioContext if browser allows it without user gesture error
    if (!this.ctx && this.canActivateAudio()) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {}
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && this.canActivateAudio()) {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Play synthesized alarm tone by key or custom URL
   */
  public playAlarm(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    if (tone === 'custom' && customUrl) {
      this.playCustomAudio(customUrl, volume);
      return;
    }

    const ctx = this.getContextSafe();
    if (!ctx || ctx.state !== 'running') {
      // AudioContext is not ready yet - only play fallback if permitted
      if (this.canActivateAudio()) {
        this.playFallbackBeep(volume);
      }
      return;
    }

    try {
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
          [0, 0.12, 0.24, 0.36].forEach((delay) => {
            const osc = ctx.createOscillator();
            const oscGain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1046.5, now + delay);
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
    } catch {
      if (this.canActivateAudio()) {
        this.playFallbackBeep(volume);
      }
    }
  }

  /**
   * Fallback loud audio element beep
   */
  public playFallbackBeep(volume: number = 1.0): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.fallbackAudio) {
        const wavUri = generateAlarmWavUri(987.77, 0.5);
        this.fallbackAudio = new Audio(wavUri);
      }
      this.fallbackAudio.volume = Math.min(1.0, Math.max(0.1, volume));
      this.fallbackAudio.currentTime = 0;
      const playPromise = this.fallbackAudio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.unlocked = true;
            this.notifyState();
          })
          .catch(() => {});
      }
    } catch {}
  }

  /**
   * Continuous Loud Mobile Alarm Loop
   * Rings continuously until stopped
   */
  public startLoudAlarmLoop(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    this.stopLoudAlarmLoop();
    this.isLooping = true;
    this.pendingAlarm = { tone, volume, customUrl };

    if (!this.canActivateAudio()) {
      // Audio is restricted by browser autoplay policy until user gesture
      // DO NOT call AudioContext.resume() or new AudioContext() here to avoid console errors!
      this.notifyState();
      return;
    }

    this.executeLoop(tone, volume, customUrl);
  }

  private executeLoop(tone: string, volume: number, customUrl?: string): void {
    if (!this.isLooping) return;

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
    };

    ring();
    if (!this.alarmLoopTimer) {
      this.alarmLoopTimer = setInterval(ring, 1200);
    }
  }

  /**
   * Stop the loud alarm loop immediately
   */
  public stopLoudAlarmLoop(): void {
    this.isLooping = false;
    this.pendingAlarm = null;
    if (this.alarmLoopTimer) {
      clearInterval(this.alarmLoopTimer);
      this.alarmLoopTimer = null;
    }
    this.stopCustomAudio();
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
        this.fallbackAudio.currentTime = 0;
      } catch {}
    }
  }

  public playCustomAudio(url: string, volume: number = 1.0): void {
    try {
      this.stopCustomAudio();
      const audio = new Audio(url);
      audio.volume = Math.min(1.0, Math.max(0.1, volume));
      const p = audio.play();
      if (p) {
        p.then(() => {
          this.unlocked = true;
          this.notifyState();
        }).catch(() => {
          if (this.canActivateAudio()) {
            this.playFallbackBeep(volume);
          }
        });
      }
      this.currentCustomAudio = audio;
    } catch {
      if (this.canActivateAudio()) {
        this.playFallbackBeep(volume);
      }
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
