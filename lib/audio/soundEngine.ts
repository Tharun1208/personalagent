/**
 * Web Audio API Sound Synthesizer Engine
 * Generates custom alarm tones, sound effects, and plays custom audio URLs reliably without external dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentCustomAudio: HTMLAudioElement | null = null;

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
   * Play synthesized alarm tone by key or custom URL
   */
  public playAlarm(tone: string = 'digital', volume: number = 0.8, customUrl?: string): void {
    if (tone === 'custom' && customUrl) {
      this.playCustomAudio(customUrl, volume);
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.4, now);
    gainNode.connect(ctx.destination);

    switch (tone) {
      case 'chime':
      case 'cosmic': {
        // Cosmic Harmonic Chime (3 overlapping soothing sines)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          
          oscGain.gain.setValueAtTime(0, now + i * 0.12);
          oscGain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.12 + 0.05);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 1.2);

          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 1.3);
        });
        break;
      }

      case 'zen': {
        // Tibetan Zen Bell (432Hz deep soothing gong)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, now);
        osc.frequency.exponentialRampToValueAtTime(430, now + 2.5);

        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + 2.6);
        break;
      }

      case 'radar': {
        // Radar / Sonar Ping (Two rapid chirps)
        [0, 0.22, 0.44].forEach((delay) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now + delay);
          osc.frequency.exponentialRampToValueAtTime(800, now + delay + 0.18);

          oscGain.gain.setValueAtTime(volume * 0.35, now + delay);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now + delay);
          osc.stop(now + delay + 0.2);
        });
        break;
      }

      case 'gentle': {
        // Gentle Morning Chords (Warm triangle progression)
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          oscGain.gain.setValueAtTime(0, now + idx * 0.15);
          oscGain.gain.linearRampToValueAtTime(volume * 0.3, now + idx * 0.15 + 0.08);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 1.5);

          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 1.6);
        });
        break;
      }

      case 'retro': {
        // Retro 8-Bit Arcade alert (Square wave arpeggio)
        [220, 440, 660, 880, 1100, 1320].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          oscGain.gain.setValueAtTime(volume * 0.15, now + idx * 0.06);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.08);

          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.09);
        });
        break;
      }

      case 'cyber': {
        // Cyber Wave Pulse (Sawtooth sweep)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

        oscGain.gain.setValueAtTime(volume * 0.25, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }

      case 'digital':
      default: {
        // Triple High-Tech Beep
        [0, 0.12, 0.24].forEach((delay) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1046.5, now + delay); // C6

          oscGain.gain.setValueAtTime(volume * 0.35, now + delay);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

          osc.connect(oscGain);
          oscGain.connect(gainNode);
          osc.start(now + delay);
          osc.stop(now + delay + 0.09);
        });
        break;
      }
    }
  }

  /**
   * Play custom uploaded audio / URL
   */
  public playCustomAudio(url: string, volume: number = 0.8): void {
    try {
      this.stopCustomAudio();
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, volume));
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
      this.currentCustomAudio.pause();
      this.currentCustomAudio.currentTime = 0;
      this.currentCustomAudio = null;
    }
  }
}

export const soundEngine = new SoundEngine();
