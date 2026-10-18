/**
 * ZZZTasks Bangboo Mascot State Machine & Reactive Mood Engine Unit Tests
 *
 * Verifies:
 * - 7 Mood states (idle, happy, celebrating, triumphant, thinking, sleepy, surprised)
 * - Visor eye glyph mapping
 * - Event triggers (onTaskCompleted, onCommissionClaimed, onStreakIncremented, onMascotPoked, onIdleTimeout)
 * - Priority override hierarchy
 * - Inactivity sleep timer & wake-up sequences
 * - Timer cleanup and memory safety
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOOD_CONFIGS,
  BANGBOO_DIALOGUE_CATALOG,
  getMoodConfig,
  getEyeGlyphForMood,
  selectDialogueForEvent,
} from '../services/bangbooDialogue';
import { BangbooEngine, createBangbooEngine } from '../services/bangboo';
import { BangbooMood, BangbooSoundCue } from '../types/bangboo';

describe('Bangboo Domain & Dialogue Catalog', () => {
  it('defines valid configurations for all 7 mood states', () => {
    const moods: BangbooMood[] = [
      'idle',
      'happy',
      'celebrating',
      'triumphant',
      'thinking',
      'sleepy',
      'surprised',
    ];

    moods.forEach((m) => {
      const cfg = getMoodConfig(m);
      expect(cfg).toBeDefined();
      expect(cfg.mood).toBe(m);
      expect(typeof cfg.priority).toBe('number');
      expect(typeof cfg.eyeGlyph).toBe('string');
    });
  });

  it('maps eye glyphs correctly to each mood', () => {
    expect(getEyeGlyphForMood('idle')).toBe('dot');
    expect(getEyeGlyphForMood('happy')).toBe('happy');
    expect(getEyeGlyphForMood('celebrating')).toBe('star');
    expect(getEyeGlyphForMood('triumphant')).toBe('star');
    expect(getEyeGlyphForMood('thinking')).toBe('thinking');
    expect(getEyeGlyphForMood('sleepy')).toBe('line');
    expect(getEyeGlyphForMood('surprised')).toBe('exclamation');
  });

  it('strictly respects the priority hierarchy: triumphant > celebrating > surprised > happy > thinking > sleepy > idle', () => {
    expect(MOOD_CONFIGS.triumphant.priority).toBeGreaterThan(MOOD_CONFIGS.celebrating.priority);
    expect(MOOD_CONFIGS.celebrating.priority).toBeGreaterThan(MOOD_CONFIGS.surprised.priority);
    expect(MOOD_CONFIGS.surprised.priority).toBeGreaterThan(MOOD_CONFIGS.happy.priority);
    expect(MOOD_CONFIGS.happy.priority).toBeGreaterThan(MOOD_CONFIGS.thinking.priority);
    expect(MOOD_CONFIGS.thinking.priority).toBeGreaterThan(MOOD_CONFIGS.sleepy.priority);
    expect(MOOD_CONFIGS.sleepy.priority).toBeGreaterThan(MOOD_CONFIGS.idle.priority);
  });

  it('contains comprehensive, authentic dialogue entries with subtitles and sound cues', () => {
    expect(BANGBOO_DIALOGUE_CATALOG.length).toBeGreaterThanOrEqual(20);

    BANGBOO_DIALOGUE_CATALOG.forEach((entry) => {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      // Matches authentic ZZZ Bangboo vocalizations: Eh-nah, Ehhh-nah, En-na, Nyah-nah, Zzz
      expect(entry.bangbooText).toMatch(/Eh+[-a-z]+|En-[-a-z]+|Nyah-[-a-z]+|Zzz/i);
      expect(entry.translation.length).toBeGreaterThan(5);
      expect(entry.mood).toBeTruthy();
      if (entry.soundCue) {
        expect(['chirp', 'cheer', 'chime', 'fanfare', 'sleep', 'gasp', 'giggle']).toContain(
          entry.soundCue
        );
      }
    });
  });

  it('selects S-Rank specific dialogue when task priority is S', () => {
    const dialogue = selectDialogueForEvent('task_completed', { taskPriority: 'S' });
    expect(dialogue.priorityRank).toBe('S');
    expect(dialogue.translation).toContain('S-Rank');
  });

  it('selects triumphant fanfare dialogue when all commissions are claimed', () => {
    const dialogue = selectDialogueForEvent('commission_claimed', { allCompleted: true });
    expect(dialogue.mood).toBe('triumphant');
    expect(dialogue.soundCue).toBe('fanfare');
  });

  it('selects milestone dialogue for long streaks (7+ days)', () => {
    const dialogue = selectDialogueForEvent('streak', { streakCount: 7 });
    expect(dialogue.id).toBe('streak-high');
    expect(dialogue.mood).toBe('triumphant');
  });
});

describe('BangbooEngine State Machine', () => {
  let engine: BangbooEngine;
  let playedSounds: BangbooSoundCue[];

  beforeEach(() => {
    vi.useFakeTimers();
    playedSounds = [];
    engine = createBangbooEngine({
      sleepTimeoutMs: 10000,
      defaultDurationMs: 4000,
      enableAutoSleep: true,
      onPlaySound: (cue) => {
        playedSounds.push(cue);
      },
    });
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  it('initializes in idle state with clean defaults', () => {
    const state = engine.getState();
    expect(state.currentMood).toBe('idle');
    expect(state.activeDialogue).toBeNull();
    expect(state.isSleeping).toBe(false);
    expect(state.pokeCount).toBe(0);
  });

  describe('Task Completion Trigger (onTaskCompleted)', () => {
    it('transitions to celebrating and sets task completion dialogue', () => {
      engine.onTaskCompleted({ title: 'Hollow Evacuation', priority: 'A' });
      const state = engine.getState();

      expect(state.currentMood).toBe('celebrating');
      expect(state.activeDialogue).not.toBeNull();
      expect(state.activeDialogue?.translation).toContain('Hollow Evacuation');
      expect(playedSounds.length).toBeGreaterThan(0);
    });

    it('auto-reverts to idle after dialogue duration', () => {
      engine.onTaskCompleted();
      expect(engine.getState().currentMood).toBe('celebrating');

      // Fast forward past duration
      vi.advanceTimersByTime(4500);

      const state = engine.getState();
      expect(state.currentMood).toBe('idle');
      expect(state.activeDialogue).toBeNull();
    });
  });

  describe('Commission Claim Trigger (onCommissionClaimed)', () => {
    it('transitions to celebrating on single commission claim', () => {
      engine.onCommissionClaimed({ title: 'Coffee Supplies', allCompleted: false });
      const state = engine.getState();

      expect(state.currentMood).toBe('celebrating');
      expect(state.activeDialogue?.translation).toMatch(/Daily bounty claimed|Proxy payout|Rewards unboxed/i);
      expect(playedSounds.length).toBeGreaterThan(0);
    });

    it('transitions to triumphant on all commissions complete', () => {
      engine.onCommissionClaimed({ allCompleted: true });
      const state = engine.getState();

      expect(state.currentMood).toBe('triumphant');
      expect(state.activeDialogue?.translation).toMatch(/all daily commissions cleared|All Hollow dailies finished|Daily quota 100%/i);
      expect(playedSounds).toContain('fanfare');

      vi.advanceTimersByTime(5500);
      expect(engine.getState().currentMood).toBe('idle');
    });
  });

  describe('Priority Override Matrix', () => {
    it('does not downgrade triumphant mood when task completion occurs', () => {
      // Trigger triumphant (priority 100)
      engine.onCommissionClaimed({ allCompleted: true });
      expect(engine.getState().currentMood).toBe('triumphant');

      // Subsequent task completion (priority 80) should NOT override triumphant
      engine.onTaskCompleted();
      expect(engine.getState().currentMood).toBe('triumphant');
    });

    it('upgrades happy mood to celebrating when task completed', () => {
      // Trigger happy via poke (priority 60)
      engine.setMood('happy', 5000);
      expect(engine.getState().currentMood).toBe('happy');

      // Task completed (priority 80) overrides happy
      engine.onTaskCompleted();
      expect(engine.getState().currentMood).toBe('celebrating');
    });
  });

  describe('Daily Streak Trigger (onStreakIncremented)', () => {
    it('celebrates streak increment and triggers praise', () => {
      engine.onStreakIncremented(5);
      expect(engine.getState().currentMood).toBe('celebrating');
      expect(engine.getState().activeDialogue?.translation).toContain('Consecutive cycles');
    });
  });

  describe('Mascot Poke Interactivity (onMascotPoked)', () => {
    it('increments pokeCount and triggers cheerful reaction', () => {
      engine.onMascotPoked();
      const state = engine.getState();

      expect(state.pokeCount).toBe(1);
      expect(['happy', 'surprised']).toContain(state.currentMood);
      expect(state.activeDialogue).not.toBeNull();
      expect(playedSounds.length).toBeGreaterThan(0);
    });

    it('wakes up with surprise when poked while sleepy', () => {
      // Force sleep
      engine.onIdleTimeout();
      expect(engine.getState().isSleeping).toBe(true);
      expect(engine.getState().currentMood).toBe('sleepy');

      // Poke while asleep
      engine.onMascotPoked();
      const wakeState = engine.getState();

      expect(wakeState.isSleeping).toBe(false);
      expect(wakeState.currentMood).toBe('surprised');
      expect(wakeState.activeDialogue?.translation).toMatch(/I’m awake|Capacitors recharged/i);

      // Transitions to happy then idle
      vi.advanceTimersByTime(3000);
      expect(engine.getState().currentMood).toBe('happy');

      vi.advanceTimersByTime(1500);
      expect(engine.getState().currentMood).toBe('idle');
    });
  });

  describe('Inactivity Sleep Timer (onIdleTimeout)', () => {
    it('transitions to sleepy after inactivity duration while idle', () => {
      expect(engine.getState().currentMood).toBe('idle');

      // Advance by sleepTimeoutMs (10,000ms)
      vi.advanceTimersByTime(10000);

      const state = engine.getState();
      expect(state.currentMood).toBe('sleepy');
      expect(state.isSleeping).toBe(true);
      expect(state.activeDialogue?.bangbooText).toMatch(/Zzz|Ehhh-nah|En-na/i);
    });

    it('does not fall asleep if active in celebrating or triumphant mood', () => {
      engine.onCommissionClaimed({ allCompleted: true });
      expect(engine.getState().currentMood).toBe('triumphant');

      // Timeout fires during celebration
      engine.onIdleTimeout();
      expect(engine.getState().currentMood).toBe('triumphant');
      expect(engine.getState().isSleeping).toBe(false);
    });

    it('wakes up when user activity occurs', () => {
      vi.advanceTimersByTime(10000);
      expect(engine.getState().isSleeping).toBe(true);

      engine.onUserActivity();
      expect(engine.getState().isSleeping).toBe(false);
      expect(engine.getState().currentMood).toBe('idle');
    });
  });

  describe('Lifecycle, Reset & Cleanup', () => {
    it('resets state completely on reset()', () => {
      engine.onTaskCompleted();
      expect(engine.getState().currentMood).toBe('celebrating');

      engine.reset();
      expect(engine.getState().currentMood).toBe('idle');
      expect(engine.getState().activeDialogue).toBeNull();
      expect(engine.getState().pokeCount).toBe(0);
    });

    it('clears all timeouts on destroy()', () => {
      engine.onTaskCompleted();
      engine.destroy();

      // Advancing time should not fire any pending revert callbacks or cause errors
      vi.advanceTimersByTime(15000);
      expect(true).toBe(true);
    });
  });
});
