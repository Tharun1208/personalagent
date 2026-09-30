/**
 * High-Performance HTML5 Audio Engine & PCM Synthesizer
 * Generates custom alarm tones, sound effects, and reliable mobile-style alarm loops.
 * 100% compliant with browser autoplay policies — completely avoids AudioContext console errors.
 */

// Synthesize high-quality PCM WAV audio data URIs for all mobile alarm tones
function createWavDataUri(generator: (sampleRate: number, duration: number) => Float32Array, duration = 1.0): string {
  if (typeof window === 'undefined') return '';
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = generator(sampleRate, duration);

  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] || 0));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Generate Tone WAVs
const TONE_GENERATORS: Record<string, (sr: number, dur: number) => Float32Array> = {
  // Classic 4-Pulse Loud Digital Clock Alarm
  digital: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    const pulseLen = 0.08;
    const pulseGap = 0.04;
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      const cycleTime = t % 0.5;
      const isPulse = (cycleTime < pulseLen) ||
        (cycleTime >= 0.12 && cycleTime < 0.12 + pulseLen) ||
        (cycleTime >= 0.24 && cycleTime < 0.24 + pulseLen) ||
        (cycleTime >= 0.36 && cycleTime < 0.36 + pulseLen);
      if (isPulse && t < 0.9) {
        // Dual harmonic square/sine mix (1046.5Hz C6 + 2093Hz)
        arr[i] = (Math.sin(2 * Math.PI * 1046.5 * t) * 0.7 + (Math.sin(2 * Math.PI * 2093 * t) > 0 ? 0.3 : -0.3)) * 0.85;
      }
    }
    return arr;
  },

  // Sonar Radar Sweep
  radar: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      const sweepTime = t % 0.45;
      if (sweepTime < 0.35) {
        const freq = 1400 - (sweepTime / 0.35) * 600;
        const env = Math.exp(-sweepTime * 7);
        arr[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
      }
    }
    return arr;
  },

  // Harmonic Bell Chime
  chime: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      let val = 0;
      freqs.forEach((f, idx) => {
        const offset = idx * 0.12;
        if (t >= offset) {
          const dt = t - offset;
          val += Math.sin(2 * Math.PI * f * dt) * Math.exp(-dt * 3.5) * 0.3;
        }
      });
      arr[i] = val;
    }
    return arr;
  },

  // Gentle Acoustic Triad
  gentle: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    const freqs = [440, 554.37, 659.25];
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      let val = 0;
      freqs.forEach((f, idx) => {
        const offset = idx * 0.15;
        if (t >= offset) {
          const dt = t - offset;
          val += Math.sin(2 * Math.PI * f * dt) * Math.exp(-dt * 2.2) * 0.35;
        }
      });
      arr[i] = val;
    }
    return arr;
  },

  // Zen 432Hz Calm Bowl
  zen: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 1.5);
      arr[i] = (Math.sin(2 * Math.PI * 432 * t) * 0.7 + Math.sin(2 * Math.PI * 864 * t) * 0.3) * env * 0.8;
    }
    return arr;
  },

  // Retro 8-bit Arcade Beep
  retro: (sr, dur) => {
    const num = Math.floor(sr * dur);
    const arr = new Float32Array(num);
    const freqs = [440, 660, 880, 1320];
    for (let i = 0; i < num; i++) {
      const t = i / sr;
      const step = Math.floor((t % 0.6) / 0.15);
      const f = freqs[Math.min(step, freqs.length - 1)];
      const sq = Math.sin(2 * Math.PI * f * t) > 0 ? 0.6 : -0.6;
      arr[i] = sq * 0.7;
    }
    return arr;
  },
};

class SoundEngine {
  private activeAudioElement: HTMLAudioElement | null = null;
  private isLooping = false;
  private pendingLoopConfig: { tone: string; volume: number; customUrl?: string } | null = null;
  private uriCache: Map<string, string> = new Map();
  private listeners: Set<(unlocked: boolean) => void> = new Set();
  private isUnlockedState = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockEvents = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'] as const;
      const unlockListener = () => {
        if (this.isUnlockedState) return;
        this.isUnlockedState = true;
        this.notifyState();
        unlockEvents.forEach((evt) => {
          window.removeEventListener(evt, unlockListener, { capture: true });
        });
        if (this.pendingLoopConfig && this.isLooping) {
          const { tone, volume, customUrl } = this.pendingLoopConfig;
          this.pendingLoopConfig = null;
          this.startLoudAlarmLoop(tone, volume, customUrl);
        }
      };

      // Listen on any real user gesture to unlock HTML5 audio playback immediately
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, unlockListener, { capture: true, passive: true });
      });
    }
  }

  public subscribeState(cb: (unlocked: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isUnlocked());
    return () => this.listeners.delete(cb);
  }

  private notifyState(): void {
    const unlocked = this.isUnlocked();
    this.listeners.forEach((cb) => {
      try { cb(unlocked); } catch {}
    });
  }

  public isUnlocked(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isUnlockedState) return true;
    if (
      typeof navigator !== 'undefined' &&
      'userActivation' in navigator &&
      (navigator as any).userActivation?.hasBeenActive
    ) {
      return true;
    }
    return false;
  }

  public unlockAudio(): void {
    this.isUnlockedState = true;
    this.notifyState();
    if (this.pendingLoopConfig && this.isLooping) {
      const { tone, volume, customUrl } = this.pendingLoopConfig;
      this.pendingLoopConfig = null;
      this.startLoudAlarmLoop(tone, volume, customUrl);
    }
  }

  private getAudioUri(tone: string = 'digital'): string {
    if (this.uriCache.has(tone)) {
      return this.uriCache.get(tone)!;
    }
    const gen = TONE_GENERATORS[tone] || TONE_GENERATORS.digital;
    const uri = createWavDataUri(gen, tone === 'zen' ? 2.5 : 1.2);
    this.uriCache.set(tone, uri);
    return uri;
  }

  /**
   * Play single alarm preview tone
   */
  public playAlarm(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    if (typeof window === 'undefined') return;
    try {
      this.stopCustomAudio();
      const url = tone === 'custom' && customUrl ? customUrl : this.getAudioUri(tone);
      const audio = new Audio(url);
      audio.volume = Math.min(1.0, Math.max(0.1, volume));
      const p = audio.play();
      if (p) {
        p.then(() => {
          this.isUnlockedState = true;
          this.notifyState();
        }).catch(() => {
          // Autoplay blocked until gesture
        });
      }
      this.activeAudioElement = audio;
    } catch {}
  }

  /**
   * Continuous Loud Mobile Alarm Loop
   * Uses HTML5 audio looping to avoid AudioContext restrictions completely!
   */
  public startLoudAlarmLoop(tone: string = 'digital', volume: number = 1.0, customUrl?: string): void {
    this.stopLoudAlarmLoop();
    this.isLooping = true;
    this.pendingLoopConfig = { tone, volume, customUrl };

    if (typeof window === 'undefined') return;

    try {
      const url = tone === 'custom' && customUrl ? customUrl : this.getAudioUri(tone);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = Math.min(1.0, Math.max(0.1, volume));

      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.isUnlockedState = true;
            this.pendingLoopConfig = null;
            this.notifyState();
          })
          .catch(() => {
            // Autoplay blocked — user will see "Tap to unmute" on mobile alarm screen
            this.isUnlockedState = false;
            this.notifyState();
          });
      }

      this.activeAudioElement = audio;
    } catch {}
  }

  /**
   * Stop alarm immediately
   */
  public stopLoudAlarmLoop(): void {
    this.isLooping = false;
    this.pendingLoopConfig = null;
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
      } catch {}
      this.activeAudioElement = null;
    }
  }

  public playCustomAudio(url: string, volume: number = 1.0): void {
    this.playAlarm('custom', volume, url);
  }

  public stopCustomAudio(): void {
    this.stopLoudAlarmLoop();
  }
}

export const soundEngine = new SoundEngine();
