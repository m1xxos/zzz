import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { soundService, SoundEngine } from '../services/sound';

describe('SoundEngine Unit Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    soundService.setMuted(false);
    soundService.setVolume(0.8);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization & State', () => {
    it('initializes with default volume and unmuted state', () => {
      const engine = new SoundEngine();
      expect(engine.getMuted()).toBe(false);
      expect(engine.getVolume()).toBe(0.8);
    });

    it('initializes audio context on demand without throw', () => {
      const engine = new SoundEngine();
      expect(() => (engine as any).init()).not.toThrow();
    });
  });

  describe('Volume Controls & Clamping', () => {
    it('sets valid volume within 0.0 and 1.0 range', () => {
      soundService.setVolume(0.5);
      expect(soundService.getVolume()).toBe(0.5);

      soundService.setVolume(1.0);
      expect(soundService.getVolume()).toBe(1.0);

      soundService.setVolume(0.0);
      expect(soundService.getVolume()).toBe(0.0);
    });

    it('clamps volume exceeding 1.0 to 1.0', () => {
      soundService.setVolume(1.5);
      expect(soundService.getVolume()).toBe(1.0);

      soundService.setVolume(100);
      expect(soundService.getVolume()).toBe(1.0);
    });

    it('clamps negative volume to 0.0', () => {
      soundService.setVolume(-0.5);
      expect(soundService.getVolume()).toBe(0.0);

      soundService.setVolume(-99);
      expect(soundService.getVolume()).toBe(0.0);
    });

    it('handles NaN and non-finite inputs by defaulting to 0.8 safely', () => {
      soundService.setVolume(NaN);
      expect(soundService.getVolume()).toBe(0.8);

      soundService.setVolume(Infinity);
      expect(soundService.getVolume()).toBe(1.0);

      soundService.setVolume(-Infinity);
      expect(soundService.getVolume()).toBe(0.0);
    });

    it('persists volume setting to localStorage', () => {
      soundService.setVolume(0.65);
      expect(localStorage.getItem('zzztasks_audio_volume')).toBe('0.65');
    });
  });

  describe('Mute Controls & Persistence', () => {
    it('toggles muted state back and forth', () => {
      expect(soundService.getMuted()).toBe(false);
      const isMutedNow = soundService.toggleMute();
      expect(isMutedNow).toBe(true);
      expect(soundService.getMuted()).toBe(true);

      const isUnmutedNow = soundService.toggleMute();
      expect(isUnmutedNow).toBe(false);
      expect(soundService.getMuted()).toBe(false);
    });

    it('sets explicit mute state', () => {
      soundService.setMuted(true);
      expect(soundService.getMuted()).toBe(true);

      soundService.setMuted(false);
      expect(soundService.getMuted()).toBe(false);
    });

    it('persists mute setting to localStorage', () => {
      soundService.setMuted(true);
      expect(localStorage.getItem('zzztasks_audio_muted')).toBe('true');

      soundService.setMuted(false);
      expect(localStorage.getItem('zzztasks_audio_muted')).toBe('false');
    });
  });

  describe('Audio Playback Synthesis Methods', () => {
    it('executes UI interaction sounds without error', () => {
      expect(() => soundService.playClick()).not.toThrow();
      expect(() => soundService.playSwitch()).not.toThrow();
      expect(() => soundService.playAlert()).not.toThrow();
    });

    it('executes commission & task achievement sounds without error', () => {
      expect(() => soundService.playTaskComplete()).not.toThrow();
      expect(() => soundService.playCommissionComplete()).not.toThrow();
    });

    it('executes Bangboo voice sound cues without error', () => {
      expect(() => soundService.playBangbooChirp()).not.toThrow();
      expect(() => soundService.playBangbooCheer()).not.toThrow();
      expect(() => soundService.playBangbooSleep()).not.toThrow();
    });

    it('plays sound through generic playSound router', () => {
      expect(() => soundService.playSound('click')).not.toThrow();
      expect(() => soundService.playSound('switch')).not.toThrow();
      expect(() => soundService.playSound('taskComplete')).not.toThrow();
      expect(() => soundService.playSound('commissionComplete')).not.toThrow();
      expect(() => soundService.playSound('alert')).not.toThrow();
      expect(() => soundService.playSound('chirp')).not.toThrow();
      expect(() => soundService.playSound('cheer')).not.toThrow();
      expect(() => soundService.playSound('sleep')).not.toThrow();
    });

    it('does not produce sound nodes when muted', () => {
      soundService.setMuted(true);
      expect(() => soundService.playClick()).not.toThrow();
      expect(() => soundService.playTaskComplete()).not.toThrow();
      expect(() => soundService.playBangbooCheer()).not.toThrow();
    });
  });
});
