/**
 * ZZZTasks Daily Reset, Streak & Commission Service
 *
 * Implements deterministic daily resets based on the 04:00 AM server cycle cutoff,
 * countdown timers, consecutive streak tracking, DST/leap-year safe date arithmetic,
 * and Inter-Knot themed commission presets.
 */

import {
  AppState,
  CommissionStatus,
  DailyCommission,
  DailiesState,
} from '../types';

// ============================================================================
// Types & Contracts
// ============================================================================

export interface ResetCountdown {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string; // 'HH:MM:SS'
  formattedText: string; // 'HHh MMm SSs'
}

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
}

export interface DailyResetResult {
  resetOccurred: boolean;
  previousCycleDate: string;
  currentCycleDate: string;
  updatedState: AppState;
}

// ============================================================================
// Inter-Knot Themed Preset Commissions
// ============================================================================

export const INTER_KNOT_PRESET_COMMISSIONS: DailyCommission[] = [
  {
    id: 'comm-coffee-cafe',
    title: 'Coff Cafe Double Shot',
    description: "Drink Tin Master's special energy brew to recharge proxy stamina.",
    category: 'Life',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Coffee Buff' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-howl-scratch',
    title: "Howl's Daily Scratch Ticket",
    description: 'Visit the Sixth Street newsstand and scratch your lucky ticket.',
    category: 'Inter-Knot',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Howl Lucky Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-vhs-archive',
    title: 'Random Play Video Tapes',
    description: 'Organize and rewind returned VHS tapes in the front counter.',
    category: 'Work',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Staff Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-hollow-patrol',
    title: 'Hollow Survey Verification',
    description: 'Review corruption telemetry report on the Inter-Knot forum.',
    category: 'Combat',
    reward: { exp: 150, denny: 10000, polychrome: 20, badgeName: 'Hollow Data Chip' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-waterfall-soup',
    title: 'Waterfall Soup Ramen Bowl',
    description: 'Order a hearty bowl of bone-broth noodles from General Chop.',
    category: 'Life',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'General Chop Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
];

// Alias for storage.ts compatibility
export const DEFAULT_COMMISSIONS = INTER_KNOT_PRESET_COMMISSIONS;

// ============================================================================
// Safe Date Formatting & Arithmetic Helpers
// ============================================================================

/**
 * Formats numeric year, month (1-12), and day (1-31) into 'YYYY-MM-DD'.
 */
export function formatDateString(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses 'YYYY-MM-DD' into components. Returns null if invalid format.
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  if (typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Returns the previous calendar day string ('YYYY-MM-DD').
 * Pinned to noon (12:00:00) to ensure complete immunity from DST shifts.
 */
export function getPreviousDateString(dateStr: string): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return formatDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Returns the next calendar day string ('YYYY-MM-DD').
 * Pinned to noon (12:00:00) to ensure complete immunity from DST shifts.
 */
export function getNextDateString(dateStr: string): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return formatDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function getPreviousCycleDate(dateStr: string): string {
  return getPreviousDateString(dateStr);
}

export function getNextCycleDate(dateStr: string): string {
  return getNextDateString(dateStr);
}

/**
 * Checks whether laterDate is exactly one calendar day after earlierDate.
 */
export function isDateConsecutive(earlierDate: string, laterDate: string): boolean {
  if (!earlierDate || !laterDate) return false;
  return getNextDateString(earlierDate) === laterDate;
}

// ============================================================================
// 1. Cycle Date Computation
// ============================================================================

/**
 * Converts a Date object into a YYYY-MM-DD string based on the cycle cutoff hour.
 * Default resetHour is 4 (04:00 AM local time).
 * Times before 04:00 AM (e.g. 03:59:59) belong to the previous day's cycle.
 *
 * @param date The timestamp to evaluate (defaults to current system time)
 * @param resetHour The hour of the day (0-23) when the daily reset occurs (default 4)
 * @returns YYYY-MM-DD date string of the corresponding cycle
 */
export function getCycleDate(date: Date = new Date(), resetHour = 4): string {
  const safeResetHour = Math.max(0, Math.min(23, Math.floor(Number.isFinite(resetHour) ? resetHour : 4)));
  const d = new Date(date.getTime());

  if (isNaN(d.getTime())) {
    return getCycleDate(new Date(), safeResetHour);
  }

  const hours = d.getHours();

  if (hours < safeResetHour) {
    // Before cutoff: belongs to previous calendar day cycle
    const calendarDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    calendarDate.setDate(calendarDate.getDate() - 1);
    return formatDateString(calendarDate.getFullYear(), calendarDate.getMonth() + 1, calendarDate.getDate());
  }

  // At or after cutoff: belongs to current calendar day cycle
  return formatDateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// ============================================================================
// 2. Countdown Calculator
// ============================================================================

/**
 * Computes the target Date of the upcoming reset cutoff.
 */
export function getNextResetDate(now: Date = new Date(), resetHour = 4): Date {
  const safeResetHour = Math.max(0, Math.min(23, Math.floor(Number.isFinite(resetHour) ? resetHour : 4)));
  const d = new Date(now.getTime());
  if (isNaN(d.getTime())) {
    return getNextResetDate(new Date(), safeResetHour);
  }

  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), safeResetHour, 0, 0, 0);
  if (d.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Computes remaining hours, minutes, seconds, and formatted string until next reset.
 * Supports polymorphic arguments:
 * - getTimeUntilReset(resetHour, now)
 * - getTimeUntilReset(now, resetHour)
 */
export function getTimeUntilReset(
  arg1?: number | Date,
  arg2?: Date | number
): ResetCountdown {
  let resetHour = 4;
  let now = new Date();

  if (arg1 instanceof Date) {
    now = arg1;
    if (typeof arg2 === 'number') resetHour = arg2;
  } else if (typeof arg1 === 'number') {
    resetHour = arg1;
    if (arg2 instanceof Date) now = arg2;
  } else if (arg2 instanceof Date) {
    now = arg2;
  } else if (typeof arg2 === 'number') {
    resetHour = arg2;
  }

  const nextReset = getNextResetDate(now, resetHour);
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const formattedText = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted,
    formattedText,
  };
}

// ============================================================================
// 3. Consecutive Streak Calculation
// ============================================================================

/**
 * Accurately computes currentStreak and longestStreak from daily completion history.
 *
 * Rules:
 * - If today's cycle date is completed in history, counts backward consecutive days ending today.
 * - If today's cycle date is not completed, checks yesterday: if yesterday was completed, keeps
 *   active streak alive (as today is still in progress).
 * - If neither today nor yesterday was completed, the streak is broken (0).
 * - Longest streak is computed over all historical consecutive chains and preserved from previousLongest.
 * - Same-day multiple commissions only register the single date key in history, preventing duplicate increments.
 *
 * @param history Map of 'YYYY-MM-DD' -> boolean (true if completed)
 * @param currentCycleDate Current cycle date 'YYYY-MM-DD'
 * @param previousLongest Historical peak streak count to preserve
 */
export function calculateStreak(
  history: Record<string, boolean> = {},
  currentCycleDate?: string,
  previousLongest: number = 0
): StreakCalculationResult {
  const today = currentCycleDate || getCycleDate(new Date());

  // 1. Current Streak Calculation
  let currentStreak = 0;
  let checkDate: string;

  if (Boolean(history[today])) {
    // Today completed: chain includes today
    currentStreak = 1;
    checkDate = getPreviousDateString(today);
    while (Boolean(history[checkDate])) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    // Today pending: check if yesterday was completed
    const yesterday = getPreviousDateString(today);
    if (Boolean(history[yesterday])) {
      currentStreak = 1;
      checkDate = getPreviousDateString(yesterday);
      while (Boolean(history[checkDate])) {
        currentStreak++;
        checkDate = getPreviousDateString(checkDate);
      }
    } else {
      // Streak broken
      currentStreak = 0;
    }
  }

  // 2. Longest Streak Calculation across entire history
  const validDates = Object.keys(history)
    .filter((d) => Boolean(history[d]) && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort(); // Lexicographical sort is chronological for YYYY-MM-DD

  let maxStreak = 0;
  let runningStreak = 0;
  let prevDate: string | null = null;

  for (const date of validDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else {
      if (isDateConsecutive(prevDate, date)) {
        runningStreak++;
      } else if (prevDate === date) {
        // duplicate key guard
      } else {
        // gap found
        runningStreak = 1;
      }
    }

    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }
    prevDate = date;
  }

  const longestStreak = Math.max(maxStreak, currentStreak, previousLongest || 0);

  return {
    currentStreak,
    longestStreak,
  };
}

// ============================================================================
// 4. Daily Reset Engine Lifecycle
// ============================================================================

/**
 * Checks if the system time has crossed into a new 04:00 AM cycle cutoff.
 * If so, rolls over commission statuses to PENDING (unless completed in the new cycle),
 * updates lastReset timestamp, and recalculates streak.
 *
 * @param state Current AppState
 * @param now Current timestamp (defaults to new Date())
 */
export function checkAndPerformDailyReset(
  state: AppState,
  now: Date = new Date()
): DailyResetResult {
  const resetHour = state.settings?.resetHour ?? 4;
  const currentCycleDate = getCycleDate(now, resetHour);

  let previousCycleDate = '';
  if (state.dailies?.lastReset) {
    const lastResetDate = new Date(state.dailies.lastReset);
    if (!isNaN(lastResetDate.getTime())) {
      previousCycleDate = getCycleDate(lastResetDate, resetHour);
    }
  }

  // If already reset for this cycle, return unchanged
  if (previousCycleDate === currentCycleDate) {
    return {
      resetOccurred: false,
      previousCycleDate,
      currentCycleDate,
      updatedState: state,
    };
  }

  // A reset has occurred: update commissions for today's cycle
  const currentCommissions = Array.isArray(state.dailies?.commissions) && state.dailies.commissions.length > 0
    ? state.dailies.commissions
    : INTER_KNOT_PRESET_COMMISSIONS.map((c) => ({ ...c }));

  const updatedCommissions = currentCommissions.map((commission) => {
    const isCompletedToday = Array.isArray(commission.completedDates) && commission.completedDates.includes(currentCycleDate);
    return {
      ...commission,
      status: (isCompletedToday ? 'COMPLETED' : 'PENDING') as CommissionStatus,
    };
  });

  const history = state.dailies?.history || {};
  const { currentStreak, longestStreak } = calculateStreak(
    history,
    currentCycleDate,
    state.dailies?.longestStreak || 0
  );

  const isTodayClaimed = Boolean(history[currentCycleDate]);

  const updatedDailies: DailiesState = {
    ...state.dailies,
    lastReset: now.toISOString(),
    currentStreak,
    longestStreak,
    commissionClaimed: isTodayClaimed,
    history,
    commissions: updatedCommissions,
    totalCommissionsClaimed: state.dailies?.totalCommissionsClaimed || 0,
  };

  const updatedState: AppState = {
    ...state,
    dailies: updatedDailies,
  };

  return {
    resetOccurred: true,
    previousCycleDate,
    currentCycleDate,
    updatedState,
  };
}

// ============================================================================
// 5. Commission Claiming & Unclaiming Actions
// ============================================================================

/**
 * Claims a daily commission for the current cycle.
 * Updates commission status to COMPLETED, records today's cycle date in completedDates,
 * adds cycle date to history, increments totalCommissionsClaimed, and recalculates streak.
 */
export function claimCommission(
  state: AppState,
  commissionId: string,
  customDate?: string
): AppState {
  const resetHour = state.settings?.resetHour ?? 4;
  const cycleDate = customDate || getCycleDate(new Date(), resetHour);

  const commissions = state.dailies?.commissions || [];
  const targetIndex = commissions.findIndex((c) => c.id === commissionId);
  if (targetIndex === -1) return state;

  const target = commissions[targetIndex];
  const completedDates = Array.isArray(target.completedDates) ? target.completedDates : [];
  const alreadyCompletedToday = completedDates.includes(cycleDate);

  if (alreadyCompletedToday && target.status === 'COMPLETED') {
    return state; // Already claimed today
  }

  const updatedDates = alreadyCompletedToday
    ? completedDates
    : [...completedDates, cycleDate];

  const updatedTarget: DailyCommission = {
    ...target,
    status: 'COMPLETED',
    completedDates: updatedDates,
  };

  const updatedCommissions = [...commissions];
  updatedCommissions[targetIndex] = updatedTarget;

  const newHistory: Record<string, boolean> = {
    ...(state.dailies?.history || {}),
    [cycleDate]: true,
  };

  const { currentStreak, longestStreak } = calculateStreak(
    newHistory,
    cycleDate,
    state.dailies?.longestStreak || 0
  );

  const totalCommissionsClaimed = (state.dailies?.totalCommissionsClaimed || 0) + 1;

  return {
    ...state,
    dailies: {
      ...state.dailies,
      commissions: updatedCommissions,
      history: newHistory,
      currentStreak,
      longestStreak,
      commissionClaimed: true,
      totalCommissionsClaimed,
    },
    bangboo: {
      ...state.bangboo,
      currentMood: 'celebrating',
      lastInteractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Unclaims a daily commission (reverts to PENDING).
 * If no other commissions remain completed on that cycle date, cleans up history
 * and updates the streak counter accordingly.
 */
export function unclaimCommission(
  state: AppState,
  commissionId: string,
  customDate?: string
): AppState {
  const resetHour = state.settings?.resetHour ?? 4;
  const cycleDate = customDate || getCycleDate(new Date(), resetHour);

  const commissions = state.dailies?.commissions || [];
  const targetIndex = commissions.findIndex((c) => c.id === commissionId);
  if (targetIndex === -1) return state;

  const target = commissions[targetIndex];
  const completedDates = Array.isArray(target.completedDates) ? target.completedDates : [];
  if (!completedDates.includes(cycleDate) && target.status === 'PENDING') {
    return state;
  }

  const updatedDates = completedDates.filter((d) => d !== cycleDate);
  const updatedTarget: DailyCommission = {
    ...target,
    status: 'PENDING',
    completedDates: updatedDates,
  };

  const updatedCommissions = [...commissions];
  updatedCommissions[targetIndex] = updatedTarget;

  // Check if any other commission is still completed for this cycle
  const anyOtherCompletedToday = updatedCommissions.some(
    (c) => Array.isArray(c.completedDates) && c.completedDates.includes(cycleDate)
  );

  const newHistory = { ...(state.dailies?.history || {}) };
  if (!anyOtherCompletedToday) {
    delete newHistory[cycleDate];
  }

  const { currentStreak, longestStreak } = calculateStreak(
    newHistory,
    cycleDate,
    state.dailies?.longestStreak || 0
  );

  const totalCommissionsClaimed = Math.max(
    0,
    (state.dailies?.totalCommissionsClaimed || 1) - 1
  );

  return {
    ...state,
    dailies: {
      ...state.dailies,
      commissions: updatedCommissions,
      history: newHistory,
      currentStreak,
      longestStreak,
      commissionClaimed: anyOtherCompletedToday,
      totalCommissionsClaimed,
    },
  };
}
