/**
 * Procedural Web Audio API Sound Synthesizer (Zero-Asset Audio Engine)
 * Implements tactile audio feedback for Zenless Zone Zero streetwear HUD:
 * - Button clicks, tab switches
 * - Commission completion chime (ascending 4-tone arpeggio C5-E5-G5-C6)
 * - Triumphant all-clear fanfare (rich chord progression with sub-bass punch)
 * - Task completion punch (808 sub kick + crisp chime)
 * - Warning/error alert tone
 * - Cute Bangboo vocal chirps
 * Fully offline, zero audio files required, headless/SSR safe.
 */

export const AUDIO_MUTED_KEY = 'zzztasks_audio_muted';
export const AUDIO_VOLUME_KEY = 'zzztasks_audio_volume';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private muted = false;
  private volume = 0.8;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedMuted = window.localStorage.getItem(AUDIO_MUTED_KEY);
        if (storedMuted !== null) {
          this.muted = storedMuted === 'true';
        }
        const storedVolume = window.localStorage.getItem(AUDIO_VOLUME_KEY);
        if (storedVolume !== null) {
          const parsed = parseFloat(storedVolume);
          if (!isNaN(parsed)) {
            this.volume = Math.max(0, Math.min(1, parsed));
          }
        }
      } catch {
        // Safe fallback if localStorage is blocked
      }
    }
  }

  private init() {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      // Unlock autoplay on user gesture
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    } catch {
      // AudioContext unavailable or restricted
    }
  }

  private ensureReady(): boolean {
    if (this.muted || this.volume <= 0) return false;
    this.init();
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  // ==========================================================================
  // Global Audio Controller (Contract: toggleMute, setVolume, getMuted, getVolume)
  // ==========================================================================

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUDIO_MUTED_KEY, String(this.muted));
      } catch {}
    }
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUDIO_MUTED_KEY, String(this.muted));
      } catch {}
    }
  }

  public setVolume(vol: number): void {
    if (typeof vol !== 'number' || Number.isNaN(vol)) {
      vol = 0.8;
    }
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {}
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUDIO_VOLUME_KEY, String(this.volume));
      } catch {}
    }
  }

  public playSound(
    name: 'click' | 'switch' | 'taskComplete' | 'commissionComplete' | 'alert' | 'chirp' | 'cheer' | 'sleep' | string,
    customVolume?: number
  ): void {
    switch (name) {
      case 'click':
        return this.playClick(customVolume);
      case 'switch':
        return this.playSwitch(customVolume);
      case 'taskComplete':
        return this.playTaskComplete(customVolume);
      case 'commissionComplete':
        return this.playCommissionComplete(customVolume);
      case 'alert':
        return this.playAlert(customVolume);
      case 'chirp':
        return this.playBangbooChirp(customVolume);
      case 'cheer':
        return this.playBangbooCheer(customVolume);
      case 'sleep':
        return this.playBangbooSleep(customVolume);
      default:
        return this.playClick(customVolume);
    }
  }

  public getMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  // ==========================================================================
  // Sound Synthesis Methods
  // ==========================================================================

  /**
   * Tactile Button Click
   */
  public playClick(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.4) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.03);

      gain.gain.setValueAtTime(0.12 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  /**
   * View / Tab Switch Chirp
   */
  public playSwitch(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.4) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gain.gain.setValueAtTime(0.15 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  /**
   * Commission Completion Chime (Ascending 4-tone arpeggio)
   * Frequencies: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
   */
  public playCommissionComplete(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.8) * this.volume;
      const now = this.ctx!.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.3 * vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.38);
      });
    } catch {}
  }

  /**
   * Triumphant Fanfare (All Daily Commissions Cleared)
   * 4-chord progression + sub-bass 808 kick punch
   */
  public playTriumphantFanfare(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.8) * this.volume;
      const now = this.ctx!.currentTime;

      // Sub-bass 808 kick punch
      const kickOsc = this.ctx!.createOscillator();
      const kickGain = this.ctx!.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4);
      kickGain.gain.setValueAtTime(0.5 * vol, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain!);
      kickOsc.start(now);
      kickOsc.stop(now + 0.45);

      // Chords
      const chords = [
        [523.25, 659.25, 783.99],  // C Major
        [587.33, 739.99, 880.0],   // D Major
        [659.25, 830.61, 987.77],  // E Major
        [1046.5, 1318.5, 1567.98], // High C Major Fanfare
      ];

      chords.forEach((chord, step) => {
        const stepTime = now + step * 0.13;
        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, stepTime);

          const isLast = step === chords.length - 1;
          const sustain = isLast ? 0.9 : 0.28;

          gain.gain.setValueAtTime(0.001, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.2 * vol, stepTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, stepTime + sustain);

          osc.connect(gain);
          gain.connect(this.masterGain!);

          osc.start(stepTime);
          osc.stop(stepTime + sustain + 0.05);
        });
      });
    } catch {}
  }

  /**
   * Task Completion Punch (808 sub punch / crisp rising chirp)
   */
  public playTaskComplete(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.7) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);

      gain.gain.setValueAtTime(0.25 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  /**
   * Warning / Error Alert Tone
   */
  public playAlert(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.5) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.1);

      gain.gain.setValueAtTime(0.15 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  /**
   * Cute Bangboo Vocal Chirp
   */
  public playBangbooChirp(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.6) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.16);

      gain.gain.setValueAtTime(0.2 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  /**
   * Cheerful Bangboo Celebration Micro-Melody ("En-na na! ★")
   * 4-note rapid staccato micro-fanfare: G5 -> C6 -> E6 -> G6
   */
  public playBangbooCheer(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.65) * this.volume;
      const now = this.ctx!.currentTime;
      const notes = [783.99, 1046.5, 1318.51, 1567.98];

      notes.forEach((freq, idx) => {
        const startTime = now + idx * 0.06;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.25 * vol, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.14);
      });
    } catch {}
  }

  /**
   * Gentle Bangboo Sleepy Tone ("Zzz... En-nah...")
   * Soft descending tone mimicking a cute mascot yawn or nap
   */
  public playBangbooSleep(customVolume?: number): void {
    if (!this.ensureReady()) return;

    try {
      const vol = (customVolume !== undefined ? customVolume : 0.5) * this.volume;
      const now = this.ctx!.currentTime;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 * vol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  /**
   * Bangboo Vocal Router
   */
  public playBangbooVocal(
    cue: 'chirp' | 'cheer' | 'chime' | 'sleep' | 'giggle' = 'chirp',
    customVolume?: number
  ): void {
    switch (cue) {
      case 'cheer':
      case 'chime':
        this.playBangbooCheer(customVolume);
        break;
      case 'sleep':
        this.playBangbooSleep(customVolume);
        break;
      case 'chirp':
      case 'giggle':
      default:
        this.playBangbooChirp(customVolume);
        break;
    }
  }
}

export const soundService = new SoundEngine();
export default soundService;
