/**
 * ZZZTasks Bangboo Companion Mascot Types & Domain Models
 *
 * Expands core Bangboo definitions with:
 * - 7 Reactive Mood States (idle, happy, celebrating, triumphant, thinking, sleepy, surprised)
 * - Visor Eye Glyphs (dot, happy, star, exclamation, line, thinking)
 * - Event Trigger Types & Payloads
 * - Dialogue Catalog Schema (authentic dialect + English translation subtitles)
 * - Priority & State Machine Interfaces
 */

// Re-export base types from central types module for backward compatibility
export type {
  BangbooMood,
  BangbooMascotType,
  BangbooDialogue,
  BangbooPreferences,
  BangbooState,
} from './index';

import type {
  BangbooMood,
  BangbooDialogue,
  BangbooState,
} from './index';

// ============================================================================
// 1. Visor Eye Glyphs & Visual Indicators
// ============================================================================

export type BangbooEyeGlyph =
  | 'dot' // Neutral open eyes: ● ●
  | 'happy' // Arched happy eyes: ^ ^
  | 'star' // Star celebration eyes: ★ ★
  | 'exclamation' // Alert / startled eyes: ! !
  | 'line' // Sleepy / closed line eyes: - -
  | 'thinking'; // Pondering / spiral eyes: ~ ~

// ============================================================================
// 2. Dialogue Categories & Sound Cues
// ============================================================================

export type BangbooDialogueCategory =
  | 'task_completed'
  | 'commission_claimed'
  | 'streak'
  | 'poke'
  | 'idle_greeting'
  | 'sleepy'
  | 'wake'
  | 'thinking'
  | 'system';

export type BangbooSoundCue =
  | 'chirp'
  | 'cheer'
  | 'chime'
  | 'giggle'
  | 'fanfare'
  | 'sleep'
  | 'gasp'
  | 'punch';

// ============================================================================
// 3. Event Triggers & Action Contexts
// ============================================================================

export type BangbooEventType =
  | 'TASK_COMPLETED'
  | 'COMMISSION_CLAIMED'
  | 'ALL_COMMISSIONS_CLAIMED'
  | 'STREAK_INCREMENTED'
  | 'MASCOT_POKED'
  | 'IDLE_TIMEOUT'
  | 'THINKING_START'
  | 'USER_ACTIVE'
  | 'RESET_TO_IDLE';

export interface BangbooEventContext {
  taskTitle?: string;
  taskPriority?: 'S' | 'A' | 'B' | 'C';
  commissionTitle?: string;
  allCompleted?: boolean;
  streakCount?: number;
  pokeCount?: number;
  customDialogue?: Partial<BangbooDialogue>;
}

// ============================================================================
// 4. Dialogue Catalog Entry Definition
// ============================================================================

export interface BangbooDialogueEntry {
  id: string;
  category: BangbooDialogueCategory;
  bangbooText: string; // Authentic dialect ("Eh-nah! En-nah!")
  translation: string; // English subtitle ("Commission finished! Great job, Proxy!")
  mood: BangbooMood;
  soundCue?: BangbooSoundCue;
  durationMs?: number; // Display duration (default 4000ms)
  priority?: number; // Priority rank (0-100)
  minStreak?: number; // For streak-specific quotes
  priorityRank?: 'S' | 'A' | 'B' | 'C'; // For rank-specific quotes
}

// ============================================================================
// 5. Mood Configuration Matrix
// ============================================================================

export interface MoodConfig {
  mood: BangbooMood;
  defaultDurationMs: number;
  priority: number;
  eyeGlyph: BangbooEyeGlyph;
  autoRevertTo: BangbooMood | null; // null if persistent (e.g., idle, sleepy)
}

// ============================================================================
// 6. State Machine Engine Options & Contracts
// ============================================================================

export interface BangbooEngineConfig {
  sleepTimeoutMs?: number; // Inactivity timeout before falling asleep (default 60,000ms)
  defaultDurationMs?: number; // Default dialogue duration (default 4000ms)
  enableAutoSleep?: boolean; // Whether sleep timeout is active (default true)
  onStateChange?: (state: BangbooState) => void;
  onPlaySound?: (soundCue: BangbooSoundCue, mood: BangbooMood) => void;
}

export interface BangbooEngineState extends BangbooState {
  isSleeping: boolean;
  pokeCount: number;
}

export interface BangbooService {
  getState(): BangbooEngineState;
  onTaskCompleted(context?: { title?: string; priority?: 'S' | 'A' | 'B' | 'C' }): void;
  onCommissionClaimed(context?: { title?: string; allCompleted?: boolean }): void;
  onStreakIncremented(streakCount: number): void;
  onMascotPoked(): void;
  onIdleTimeout(): void;
  onUserActivity(): void;
  setMood(mood: BangbooMood, durationMs?: number): void;
  showDialogue(
    text: string,
    translation: string,
    mood?: BangbooMood,
    soundCue?: BangbooSoundCue,
    durationMs?: number
  ): void;
  clearDialogue(): void;
  wakeUp(): void;
  reset(): void;
  destroy(): void;
}
