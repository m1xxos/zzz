/**
 * ZZZTasks Bangboo Reactive Mood Engine & State Machine
 *
 * Implements:
 * - Priority-based mood transitions
 * - Event trigger handlers (onTaskCompleted, onCommissionClaimed, onStreakIncremented, onMascotPoked, onIdleTimeout)
 * - Timer mechanics (transient mood auto-revert to idle, inactivity sleep timer)
 * - Sound cue dispatch
 * - Clean lifecycle management and memory cleanup
 */

import {
  BangbooMood,
  BangbooDialogue,
  BangbooSoundCue,
  BangbooEngineState,
  BangbooEngineConfig,
  BangbooService,
} from '../types/bangboo';
import {
  getMoodConfig,
  selectDialogueForEvent,
  getRandomDialogue,
} from './bangbooDialogue';

export class BangbooEngine implements BangbooService {
  private state: BangbooEngineState;
  private config: Required<BangbooEngineConfig>;
  private revertTimeout: ReturnType<typeof setTimeout> | null = null;
  private sleepTimeout: ReturnType<typeof setTimeout> | null = null;
  private subStepTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: BangbooEngineConfig) {
    this.config = {
      sleepTimeoutMs: config?.sleepTimeoutMs ?? 60000,
      defaultDurationMs: config?.defaultDurationMs ?? 4000,
      enableAutoSleep: config?.enableAutoSleep ?? true,
      onStateChange: config?.onStateChange ?? (() => {}),
      onPlaySound: config?.onPlaySound ?? (() => {}),
    };

    this.state = {
      currentMood: 'idle',
      activeDialogue: null,
      lastInteractedAt: null,
      isSleeping: false,
      pokeCount: 0,
    };

    this.armSleepTimer();
  }

  // ==========================================================================
  // Public Accessors
  // ==========================================================================

  public getState(): BangbooEngineState {
    return { ...this.state };
  }

  // ==========================================================================
  // Sleep Inactivity Timer Mechanics
  // ==========================================================================

  private armSleepTimer(): void {
    this.clearSleepTimer();
    if (!this.config.enableAutoSleep || this.config.sleepTimeoutMs <= 0) {
      return;
    }

    this.sleepTimeout = setTimeout(() => {
      this.onIdleTimeout();
    }, this.config.sleepTimeoutMs);
  }

  private clearSleepTimer(): void {
    if (this.sleepTimeout) {
      clearTimeout(this.sleepTimeout);
      this.sleepTimeout = null;
    }
  }

  private clearRevertTimer(): void {
    if (this.revertTimeout) {
      clearTimeout(this.revertTimeout);
      this.revertTimeout = null;
    }
    if (this.subStepTimeout) {
      clearTimeout(this.subStepTimeout);
      this.subStepTimeout = null;
    }
  }

  // ==========================================================================
  // State Mutation & Notification Helper
  // ==========================================================================

  private updateState(partial: Partial<BangbooEngineState>): void {
    this.state = {
      ...this.state,
      ...partial,
      lastInteractedAt: new Date().toISOString(),
    };
    this.config.onStateChange(this.getState());
  }

  private canTransitionTo(newMood: BangbooMood): boolean {
    const currentConfig = getMoodConfig(this.state.currentMood);
    const newConfig = getMoodConfig(newMood);

    // If current is sleeping, any awake action can transition
    if (this.state.isSleeping) return true;

    // Higher or equal priority can always transition
    if (newConfig.priority >= currentConfig.priority) return true;

    // If active mood has elapsed its timer or is idle
    if (this.state.currentMood === 'idle') return true;

    return false;
  }

  private scheduleRevert(targetMood: BangbooMood, durationMs: number): void {
    this.clearRevertTimer();
    const config = getMoodConfig(targetMood);

    if (config.autoRevertTo && durationMs > 0) {
      this.revertTimeout = setTimeout(() => {
        this.clearRevertTimer();
        this.updateState({
          currentMood: config.autoRevertTo || 'idle',
          activeDialogue: null,
        });
        this.armSleepTimer();
      }, durationMs);
    }
  }

  // ==========================================================================
  // Event Triggers
  // ==========================================================================

  /**
   * Triggered when a Hollow Commission / Task is marked completed
   */
  public onTaskCompleted(context?: {
    title?: string;
    priority?: 'S' | 'A' | 'B' | 'C';
  }): void {
    this.wakeUp(false);
    this.armSleepTimer();

    const targetMood: BangbooMood = 'celebrating';
    if (!this.canTransitionTo(targetMood)) return;

    const entry = selectDialogueForEvent('task_completed', {
      taskTitle: context?.title,
      taskPriority: context?.priority,
    });

    const duration = entry.durationMs || 4500;
    const translation = context?.title
      ? `"${context.title}" completed! ${entry.translation}`
      : entry.translation;

    const dialogue: BangbooDialogue = {
      id: `task-${Date.now()}`,
      bangbooText: entry.bangbooText,
      translation,
      mood: entry.mood,
      soundCue: entry.soundCue as any,
      durationMs: duration,
    };

    this.clearRevertTimer();
    this.updateState({
      currentMood: targetMood,
      activeDialogue: dialogue,
      isSleeping: false,
    });

    if (entry.soundCue) {
      this.config.onPlaySound(entry.soundCue, targetMood);
    }

    this.scheduleRevert(targetMood, duration);
  }

  /**
   * Triggered when an Inter-Knot daily commission is claimed
   */
  public onCommissionClaimed(context?: {
    title?: string;
    allCompleted?: boolean;
  }): void {
    this.wakeUp(false);
    this.armSleepTimer();

    const allClear = Boolean(context?.allCompleted);
    const targetMood: BangbooMood = allClear ? 'triumphant' : 'celebrating';

    if (!this.canTransitionTo(targetMood)) return;

    const entry = selectDialogueForEvent('commission_claimed', {
      commissionTitle: context?.title,
      allCompleted: allClear,
    });

    const duration = entry.durationMs || (allClear ? 5500 : 4500);
    const dialogue: BangbooDialogue = {
      id: `comm-${Date.now()}`,
      bangbooText: entry.bangbooText,
      translation: entry.translation,
      mood: targetMood,
      soundCue: entry.soundCue as any,
      durationMs: duration,
    };

    this.clearRevertTimer();
    this.updateState({
      currentMood: targetMood,
      activeDialogue: dialogue,
      isSleeping: false,
    });

    if (entry.soundCue) {
      this.config.onPlaySound(entry.soundCue, targetMood);
    }

    this.scheduleRevert(targetMood, duration);
  }

  /**
   * Triggered when consecutive daily streak increments
   */
  public onStreakIncremented(streakCount: number): void {
    this.wakeUp(false);
    this.armSleepTimer();

    const targetMood: BangbooMood =
      streakCount >= 7 ? 'triumphant' : streakCount >= 4 ? 'celebrating' : 'happy';

    if (!this.canTransitionTo(targetMood)) return;

    const entry = selectDialogueForEvent('streak', { streakCount });
    const duration = entry.durationMs || 4500;

    const dialogue: BangbooDialogue = {
      id: `streak-${Date.now()}`,
      bangbooText: entry.bangbooText,
      translation: entry.translation,
      mood: targetMood,
      soundCue: entry.soundCue as any,
      durationMs: duration,
    };

    this.clearRevertTimer();
    this.updateState({
      currentMood: targetMood,
      activeDialogue: dialogue,
      isSleeping: false,
    });

    if (entry.soundCue) {
      this.config.onPlaySound(entry.soundCue, targetMood);
    }

    this.scheduleRevert(targetMood, duration);
  }

  /**
   * Triggered when the user clicks or pokes the mascot widget
   */
  public onMascotPoked(): void {
    const nextPokeCount = this.state.pokeCount + 1;
    this.clearRevertTimer();

    // Case 1: Currently Sleeping -> WAKE UP with surprise!
    if (this.state.isSleeping || this.state.currentMood === 'sleepy') {
      const wakeEntry = getRandomDialogue('wake');
      const wakeDuration = wakeEntry.durationMs || 3000;

      const dialogue: BangbooDialogue = {
        id: `wake-${Date.now()}`,
        bangbooText: wakeEntry.bangbooText,
        translation: wakeEntry.translation,
        mood: 'surprised',
        soundCue: wakeEntry.soundCue as any,
        durationMs: wakeDuration,
      };

      this.updateState({
        currentMood: 'surprised',
        activeDialogue: dialogue,
        isSleeping: false,
        pokeCount: nextPokeCount,
      });

      if (wakeEntry.soundCue) {
        this.config.onPlaySound(wakeEntry.soundCue, 'surprised');
      }

      // Step transition: surprised -> happy -> idle
      this.subStepTimeout = setTimeout(() => {
        this.updateState({ currentMood: 'happy' });
        this.revertTimeout = setTimeout(() => {
          this.updateState({ currentMood: 'idle', activeDialogue: null });
          this.armSleepTimer();
        }, 1500);
      }, wakeDuration);

      return;
    }

    // Case 2: Awake -> Cute poke reaction (80% happy, 20% surprised)
    this.armSleepTimer();
    const isSurprised = Math.random() < 0.2;
    const targetMood: BangbooMood = isSurprised ? 'surprised' : 'happy';

    const pokeEntry = getRandomDialogue('poke', (d) => d.mood === targetMood);
    const duration = pokeEntry.durationMs || (isSurprised ? 2500 : 4000);

    const dialogue: BangbooDialogue = {
      id: `poke-${Date.now()}`,
      bangbooText: pokeEntry.bangbooText,
      translation: pokeEntry.translation,
      mood: targetMood,
      soundCue: pokeEntry.soundCue as any,
      durationMs: duration,
    };

    this.updateState({
      currentMood: targetMood,
      activeDialogue: dialogue,
      pokeCount: nextPokeCount,
    });

    if (pokeEntry.soundCue) {
      this.config.onPlaySound(pokeEntry.soundCue, targetMood);
    }

    this.scheduleRevert(targetMood, duration);
  }

  /**
   * Triggered when user has been idle for sleepTimeoutMs
   */
  public onIdleTimeout(): void {
    // Only fall asleep if currently in idle state
    if (this.state.currentMood !== 'idle') return;

    const sleepEntry = getRandomDialogue('sleepy');
    const dialogue: BangbooDialogue = {
      id: `sleep-${Date.now()}`,
      bangbooText: sleepEntry.bangbooText,
      translation: sleepEntry.translation,
      mood: 'sleepy',
      soundCue: sleepEntry.soundCue as any,
    };

    this.clearRevertTimer();
    this.updateState({
      currentMood: 'sleepy',
      activeDialogue: dialogue,
      isSleeping: true,
    });

    if (sleepEntry.soundCue) {
      this.config.onPlaySound(sleepEntry.soundCue, 'sleepy');
    }
  }

  /**
   * Reset sleep timer on any general user activity (typing, clicking, navigating)
   */
  public onUserActivity(): void {
    this.armSleepTimer();
    if (this.state.isSleeping) {
      this.wakeUp(true);
    }
  }

  // ==========================================================================
  // Direct Controls
  // ==========================================================================

  public setMood(mood: BangbooMood, durationMs?: number): void {
    this.wakeUp(false);
    this.clearRevertTimer();

    const config = getMoodConfig(mood);
    const duration = durationMs ?? config.defaultDurationMs;

    this.updateState({
      currentMood: mood,
      isSleeping: mood === 'sleepy',
    });

    if (duration > 0 && config.autoRevertTo) {
      this.scheduleRevert(mood, duration);
    } else {
      this.armSleepTimer();
    }
  }

  public showDialogue(
    text: string,
    translation: string,
    mood?: BangbooMood,
    soundCue?: BangbooSoundCue,
    durationMs?: number
  ): void {
    const targetMood = mood || this.state.currentMood;
    const duration = durationMs ?? this.config.defaultDurationMs;

    const dialogue: BangbooDialogue = {
      id: `custom-${Date.now()}`,
      bangbooText: text,
      translation,
      mood: targetMood,
      soundCue: soundCue as any,
      durationMs: duration,
    };

    this.clearRevertTimer();
    this.updateState({
      currentMood: targetMood,
      activeDialogue: dialogue,
      isSleeping: false,
    });

    if (soundCue) {
      this.config.onPlaySound(soundCue, targetMood);
    }

    if (duration > 0) {
      this.scheduleRevert(targetMood, duration);
    }
  }

  public clearDialogue(): void {
    this.updateState({ activeDialogue: null });
  }

  public wakeUp(notifyState = true): void {
    this.clearSleepTimer();
    if (this.state.isSleeping || this.state.currentMood === 'sleepy') {
      this.clearRevertTimer();
      if (notifyState) {
        this.updateState({
          currentMood: 'idle',
          activeDialogue: null,
          isSleeping: false,
        });
      } else {
        this.state.isSleeping = false;
        if (this.state.currentMood === 'sleepy') {
          this.state.currentMood = 'idle';
          this.state.activeDialogue = null;
        }
      }
    }
    this.armSleepTimer();
  }

  public reset(): void {
    this.clearRevertTimer();
    this.clearSleepTimer();
    this.state = {
      currentMood: 'idle',
      activeDialogue: null,
      lastInteractedAt: null,
      isSleeping: false,
      pokeCount: 0,
    };
    this.armSleepTimer();
    this.config.onStateChange(this.getState());
  }

  public destroy(): void {
    this.clearRevertTimer();
    this.clearSleepTimer();
  }
}

export function createBangbooEngine(config?: BangbooEngineConfig): BangbooEngine {
  return new BangbooEngine(config);
}
