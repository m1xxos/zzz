/**
 * ZZZTasks Bangboo Dialogue Catalog & Mood Configuration
 *
 * Implements:
 * - Authentic Zenless Zone Zero Bangboo dialect phrases
 * - Proxy English translation subtitles
 * - Mood mapping and procedural audio sound cues
 * - Selection utilities for events and context
 */

import {
  BangbooMood,
  BangbooEyeGlyph,
  BangbooDialogueCategory,
  BangbooDialogueEntry,
  BangbooEventContext,
  MoodConfig,
} from '../types/bangboo';

// ============================================================================
// 1. Mood Configuration Matrix
// ============================================================================

export const MOOD_CONFIGS: Record<BangbooMood, MoodConfig> = {
  idle: {
    mood: 'idle',
    defaultDurationMs: 0,
    priority: 0,
    eyeGlyph: 'dot',
    autoRevertTo: null,
  },
  happy: {
    mood: 'happy',
    defaultDurationMs: 4000,
    priority: 60,
    eyeGlyph: 'happy',
    autoRevertTo: 'idle',
  },
  celebrating: {
    mood: 'celebrating',
    defaultDurationMs: 4500,
    priority: 80,
    eyeGlyph: 'star',
    autoRevertTo: 'idle',
  },
  triumphant: {
    mood: 'triumphant',
    defaultDurationMs: 5500,
    priority: 100,
    eyeGlyph: 'star',
    autoRevertTo: 'idle',
  },
  thinking: {
    mood: 'thinking',
    defaultDurationMs: 3000,
    priority: 40,
    eyeGlyph: 'thinking',
    autoRevertTo: 'idle',
  },
  sleepy: {
    mood: 'sleepy',
    defaultDurationMs: 0,
    priority: 30,
    eyeGlyph: 'line',
    autoRevertTo: null,
  },
  surprised: {
    mood: 'surprised',
    defaultDurationMs: 2500,
    priority: 70,
    eyeGlyph: 'exclamation',
    autoRevertTo: 'happy',
  },
};

export function getMoodConfig(mood: BangbooMood): MoodConfig {
  return MOOD_CONFIGS[mood] || MOOD_CONFIGS.idle;
}

export function getEyeGlyphForMood(mood: BangbooMood): BangbooEyeGlyph {
  return getMoodConfig(mood).eyeGlyph;
}

// ============================================================================
// 2. Comprehensive Bangboo Dialogue Catalog
// ============================================================================

export const BANGBOO_DIALOGUE_CATALOG: BangbooDialogueEntry[] = [
  // --------------------------------------------------------------------------
  // Category: Task Completed (General & S-Rank)
  // --------------------------------------------------------------------------
  {
    id: 'task-comp-1',
    category: 'task_completed',
    bangbooText: 'Eh-nah! En-nah!',
    translation: 'Commission finished! Excellent work, Proxy!',
    mood: 'celebrating',
    soundCue: 'chime',
    durationMs: 4500,
    priority: 80,
  },
  {
    id: 'task-comp-2',
    category: 'task_completed',
    bangbooText: 'En-na na! Cleared!',
    translation: 'Target neutralized! EXP uploaded to Inter-Knot!',
    mood: 'celebrating',
    soundCue: 'chirp',
    durationMs: 4500,
    priority: 80,
  },
  {
    id: 'task-comp-3',
    category: 'task_completed',
    bangbooText: 'Eh-nah!! ★',
    translation: 'S-Rank efficiency! You made that look easy, Proxy!',
    mood: 'celebrating',
    soundCue: 'cheer',
    durationMs: 4500,
    priority: 85,
    priorityRank: 'S',
  },
  {
    id: 'task-comp-4',
    category: 'task_completed',
    bangbooText: 'Nyah-nah! Checklist down!',
    translation: 'Commission archived! One step closer to Hollow Zero mastery!',
    mood: 'celebrating',
    soundCue: 'chirp',
    durationMs: 4500,
    priority: 80,
  },
  {
    id: 'task-comp-5',
    category: 'task_completed',
    bangbooText: 'Eh-ne-nah! Splendid!',
    translation: 'Task status: RESOLVED. Eous is taking notes on your technique!',
    mood: 'celebrating',
    soundCue: 'chime',
    durationMs: 4500,
    priority: 80,
  },

  // --------------------------------------------------------------------------
  // Category: Commission Claimed (Single Bounty)
  // --------------------------------------------------------------------------
  {
    id: 'comm-single-1',
    category: 'commission_claimed',
    bangbooText: 'En-na na! Daily rewards secured!',
    translation: 'Daily bounty claimed! Dennies and Inter-Knot EXP credited!',
    mood: 'celebrating',
    soundCue: 'chime',
    durationMs: 4500,
    priority: 80,
  },
  {
    id: 'comm-single-2',
    category: 'commission_claimed',
    bangbooText: 'Eh-nah! Commission payout!',
    translation: 'Proxy payout incoming! Keep up the momentum!',
    mood: 'celebrating',
    soundCue: 'chirp',
    durationMs: 4500,
    priority: 80,
  },
  {
    id: 'comm-single-3',
    category: 'commission_claimed',
    bangbooText: 'Nyah-nah! Polychromes inside!',
    translation: 'Rewards unboxed! Check your Dennies stash, Proxy!',
    mood: 'celebrating',
    soundCue: 'chime',
    durationMs: 4500,
    priority: 80,
  },

  // --------------------------------------------------------------------------
  // Category: All Commissions Claimed (Triumphant All-Clear)
  // --------------------------------------------------------------------------
  {
    id: 'comm-all-1',
    category: 'commission_claimed',
    bangbooText: 'En-nah-en!! ★★★ ALL CLEAR!',
    translation: 'Proxy, all daily commissions cleared! Triumphant victory!',
    mood: 'triumphant',
    soundCue: 'fanfare',
    durationMs: 5500,
    priority: 100,
  },
  {
    id: 'comm-all-2',
    category: 'commission_claimed',
    bangbooText: 'Eh-nah! Eh-nah! 100% COMPLETE!',
    translation: 'All Hollow dailies finished for this cycle! Master Proxy status confirmed!',
    mood: 'triumphant',
    soundCue: 'fanfare',
    durationMs: 5500,
    priority: 100,
  },
  {
    id: 'comm-all-3',
    category: 'commission_claimed',
    bangbooText: 'En-na-na-na!! MAXIMUM REWARDS!',
    translation: 'Daily quota 100% fulfilled! Hollow Zero perimeter is secure for today!',
    mood: 'triumphant',
    soundCue: 'fanfare',
    durationMs: 5500,
    priority: 100,
  },

  // --------------------------------------------------------------------------
  // Category: Consecutive Daily Streak
  // --------------------------------------------------------------------------
  {
    id: 'streak-early-1',
    category: 'streak',
    bangbooText: 'Eh-nah! Proxy streak blazing!',
    translation: 'Consecutive daily cycle maintained! Keep the fire burning, Proxy!',
    mood: 'happy',
    soundCue: 'cheer',
    durationMs: 4000,
    priority: 75,
    minStreak: 1,
  },
  {
    id: 'streak-early-2',
    category: 'streak',
    bangbooText: 'En-na! Consecutive login!',
    translation: 'Inter-Knot reputation rising! Consistency is a Proxy’s greatest asset!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 75,
    minStreak: 2,
  },
  {
    id: 'streak-mid',
    category: 'streak',
    bangbooText: 'En-na-na!! On a roll!',
    translation: 'Consecutive cycles climbing! The Hollow Commission is taking notice!',
    mood: 'celebrating',
    soundCue: 'cheer',
    durationMs: 4500,
    priority: 85,
    minStreak: 4,
  },
  {
    id: 'streak-high',
    category: 'streak',
    bangbooText: 'Eh-nah!! LEGENDARY PROXY STREAK!',
    translation: '7+ day consecutive milestone! Unstoppable Hollow investigator!',
    mood: 'triumphant',
    soundCue: 'fanfare',
    durationMs: 5500,
    priority: 95,
    minStreak: 7,
  },

  // --------------------------------------------------------------------------
  // Category: Mascot Poke Interactivity
  // --------------------------------------------------------------------------
  {
    id: 'poke-1',
    category: 'poke',
    bangbooText: 'Eh-nah? Need help, Proxy?',
    translation: 'Eous is ready! Need help checking Hollow coordinates?',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 60,
  },
  {
    id: 'poke-2',
    category: 'poke',
    bangbooText: 'Nyah-nah! Chirp chirp!',
    translation: '*happily wiggles ears* Eous is on standby for your next order!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 60,
  },
  {
    id: 'poke-3',
    category: 'poke',
    bangbooText: 'Eh-nah! En-nah!',
    translation: 'Proxy, ready for dispatch to New Eridu!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 60,
  },
  {
    id: 'poke-4',
    category: 'poke',
    bangbooText: 'En-na en-nah!',
    translation: 'Hollow Zero telemetry clear! All circuits nominal!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 60,
  },
  {
    id: 'poke-tickle',
    category: 'poke',
    bangbooText: 'Eh-ne-nah! Hehehe!',
    translation: '*giggles and hops* That tickles my metallic chassis, Proxy!',
    mood: 'happy',
    soundCue: 'giggle',
    durationMs: 4000,
    priority: 65,
  },
  {
    id: 'poke-surprise',
    category: 'poke',
    bangbooText: 'Eh-nah?! Wobbly antennas!',
    translation: '*startled wobble* Whoa! You startled my sensor array, Proxy!',
    mood: 'surprised',
    soundCue: 'gasp',
    durationMs: 2500,
    priority: 70,
  },

  // --------------------------------------------------------------------------
  // Category: Sleepy (Inactivity Timeout)
  // --------------------------------------------------------------------------
  {
    id: 'sleep-1',
    category: 'sleepy',
    bangbooText: 'Zzz... eh-nah... zzz...',
    translation: '*drooping ears* Zzz... Eous is taking a quick power-nap...',
    mood: 'sleepy',
    soundCue: 'sleep',
    durationMs: 0,
    priority: 30,
  },
  {
    id: 'sleep-2',
    category: 'sleepy',
    bangbooText: 'Ehhh-nah... *yawn*',
    translation: 'Hollow monitoring is quiet... time to recharge capacitors...',
    mood: 'sleepy',
    soundCue: 'sleep',
    durationMs: 0,
    priority: 30,
  },
  {
    id: 'sleep-3',
    category: 'sleepy',
    bangbooText: 'En-na... drowsy...',
    translation: '*nodding off* Let me know when the next commission arrives, Proxy...',
    mood: 'sleepy',
    soundCue: 'sleep',
    durationMs: 0,
    priority: 30,
  },

  // --------------------------------------------------------------------------
  // Category: Wake Up (Poke while sleepy)
  // --------------------------------------------------------------------------
  {
    id: 'wake-1',
    category: 'wake',
    bangbooText: 'Eh-nah?! System reboot!',
    translation: '*blinks and perks up* I’m awake! Ready for Hollow dispatch, Proxy!',
    mood: 'surprised',
    soundCue: 'chirp',
    durationMs: 3000,
    priority: 75,
  },
  {
    id: 'wake-2',
    category: 'wake',
    bangbooText: 'En-na! Full power restored!',
    translation: 'Capacitors recharged! Let’s get back to work!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 3000,
    priority: 70,
  },

  // --------------------------------------------------------------------------
  // Category: Thinking / Processing
  // --------------------------------------------------------------------------
  {
    id: 'think-1',
    category: 'thinking',
    bangbooText: 'Eh-nah...? Analyzing...',
    translation: 'Querying Inter-Knot database records for relevant commissions...',
    mood: 'thinking',
    soundCue: 'chirp',
    durationMs: 3000,
    priority: 40,
  },
  {
    id: 'think-2',
    category: 'thinking',
    bangbooText: 'En-na... calculating...',
    translation: 'Recalculating hazard levels and commission deadlines...',
    mood: 'thinking',
    soundCue: 'chirp',
    durationMs: 3000,
    priority: 40,
  },

  // --------------------------------------------------------------------------
  // Category: Idle Greeting (App Mount)
  // --------------------------------------------------------------------------
  {
    id: 'greet-1',
    category: 'idle_greeting',
    bangbooText: 'Eh-nah! Inter-Knot online!',
    translation: 'Welcome back, Proxy! Eous is ready for today’s commissions!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 50,
  },
  {
    id: 'greet-2',
    category: 'idle_greeting',
    bangbooText: 'En-na! Commission board ready!',
    translation: 'All operational circuits online. Let’s conquer the Hollow!',
    mood: 'happy',
    soundCue: 'chirp',
    durationMs: 4000,
    priority: 50,
  },
];

// ============================================================================
// 3. Selection Utilities
// ============================================================================

export function getDialoguesByCategory(
  category: BangbooDialogueCategory
): BangbooDialogueEntry[] {
  return BANGBOO_DIALOGUE_CATALOG.filter((d) => d.category === category);
}

export function getRandomDialogue(
  category: BangbooDialogueCategory,
  predicate?: (entry: BangbooDialogueEntry) => boolean
): BangbooDialogueEntry {
  let pool = getDialoguesByCategory(category);
  if (predicate) {
    const filtered = pool.filter(predicate);
    if (filtered.length > 0) pool = filtered;
  }
  if (pool.length === 0) {
    return {
      id: 'fallback-eh-nah',
      category,
      bangbooText: 'Eh-nah! En-nah!',
      translation: 'Proxy, operational circuits nominal!',
      mood: 'idle',
      soundCue: 'chirp',
      durationMs: 4000,
      priority: 50,
    };
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

export function selectDialogueForEvent(
  category: BangbooDialogueCategory,
  context?: BangbooEventContext
): BangbooDialogueEntry {
  // S-Rank task completion override
  if (category === 'task_completed' && context?.taskPriority === 'S') {
    const sRank = BANGBOO_DIALOGUE_CATALOG.find(
      (d) => d.category === 'task_completed' && d.priorityRank === 'S'
    );
    if (sRank) return sRank;
  }

  // Commission Claimed: Distinct pools for all-clear vs single bounty
  if (category === 'commission_claimed') {
    if (context?.allCompleted) {
      const allClearPool = BANGBOO_DIALOGUE_CATALOG.filter(
        (d) => d.category === 'commission_claimed' && d.mood === 'triumphant'
      );
      if (allClearPool.length > 0) {
        return allClearPool[Math.floor(Math.random() * allClearPool.length)];
      }
    } else {
      const singlePool = BANGBOO_DIALOGUE_CATALOG.filter(
        (d) => d.category === 'commission_claimed' && d.mood === 'celebrating'
      );
      if (singlePool.length > 0) {
        return singlePool[Math.floor(Math.random() * singlePool.length)];
      }
    }
  }

  // Streak-specific tier matching
  if (category === 'streak' && typeof context?.streakCount === 'number') {
    const streak = context.streakCount;
    if (streak >= 7) {
      const high = BANGBOO_DIALOGUE_CATALOG.find((d) => d.id === 'streak-high');
      if (high) return high;
    } else if (streak >= 4) {
      const mid = BANGBOO_DIALOGUE_CATALOG.find((d) => d.id === 'streak-mid');
      if (mid) return mid;
    }
  }

  // Default random selection within category
  return getRandomDialogue(category);
}
