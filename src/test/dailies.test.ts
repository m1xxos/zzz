/**
 * ZZZTasks Dailies, Streaks & Reset Engine Unit Tests
 * Target File: src/test/dailies.test.ts
 *
 * Verifies cycle rollover, midnight vs 04:00 AM cutoff, countdown accuracy,
 * streak increments, streak break on missed day, longest streak preservation,
 * duplicate claim prevention, DST edge cases, leap years, and commission state transitions.
 */

import { describe, it, expect } from 'vitest';
import {
  getCycleDate,
  getTimeUntilReset,
  calculateStreak,
  checkAndPerformDailyReset,
  claimCommission,
  unclaimCommission,
  getPreviousDateString,
  getNextDateString,
  isDateConsecutive,
  parseDateString,
  formatDateString,
  INTER_KNOT_PRESET_COMMISSIONS,
} from '../services/dailies';
import { AppState, DailyCommission } from '../types';

// Helper to construct a mock AppState for testing
function createMockAppState(overrides: Partial<AppState> = {}): AppState {
  const defaultCommissions: DailyCommission[] = INTER_KNOT_PRESET_COMMISSIONS.map((c) => ({
    ...c,
    completedDates: [...c.completedDates],
  }));

  return {
    version: '1.0.0',
    tasks: [],
    dailies: {
      lastReset: '2026-10-17T04:00:00.000Z',
      currentStreak: 1,
      longestStreak: 1,
      history: { '2026-10-17': true },
      commissions: defaultCommissions,
      commissionClaimed: true,
      totalCommissionsClaimed: 1,
    },
    settings: {
      resetHour: 4,
      weekStartsOn: 1,
      audio: { muted: false, volume: 0.8, sfxVolume: 0.8, sfxEnabled: true },
      visual: { crtOverlay: true, glitchEffects: true, highContrast: false, reducedMotion: false },
      bangboo: { enabled: true, mascotType: 'eous', voiceEnabled: true, minimized: false, position: 'bottom-right' },
    },
    bangboo: { currentMood: 'idle', activeDialogue: null, lastInteractedAt: null },
    activeView: 'dailies',
    selectedDate: '2026-10-18',
    searchQuery: '',
    selectedCategory: 'all',
    selectedPriority: 'all',
    filterStatus: 'all',
    sortBy: 'createdAt',
    sortDirection: 'desc',
    currentMonthOffset: 0,
    ...overrides,
  };
}

describe('1. Cycle Date Computation (getCycleDate)', () => {
  it('assigns timestamps before 04:00 AM to previous calendar day cycle', () => {
    // 03:59:59 on October 18 belongs to October 17 cycle
    const date = new Date(2026, 9, 18, 3, 59, 59, 999);
    expect(getCycleDate(date, 4)).toBe('2026-10-17');
  });

  it('assigns timestamps at exactly 04:00:00 AM to current day cycle', () => {
    const date = new Date(2026, 9, 18, 4, 0, 0, 0);
    expect(getCycleDate(date, 4)).toBe('2026-10-18');
  });

  it('assigns timestamps after 04:00:00 AM through 23:59:59 to current day cycle', () => {
    const afternoon = new Date(2026, 9, 18, 15, 30, 0);
    const lateNight = new Date(2026, 9, 18, 23, 59, 59);
    expect(getCycleDate(afternoon, 4)).toBe('2026-10-18');
    expect(getCycleDate(lateNight, 4)).toBe('2026-10-18');
  });

  it('assigns midnight (00:00:00) through 03:59:59 to previous day cycle (04:00 cutoff)', () => {
    const midnight = new Date(2026, 9, 19, 0, 0, 0);
    const earlyMorning = new Date(2026, 9, 19, 2, 45, 0);
    expect(getCycleDate(midnight, 4)).toBe('2026-10-18');
    expect(getCycleDate(earlyMorning, 4)).toBe('2026-10-18');
  });

  it('supports configurable resetHour = 0 (standard midnight reset)', () => {
    const justBeforeMidnight = new Date(2026, 9, 18, 23, 59, 59);
    const exactlyMidnight = new Date(2026, 9, 19, 0, 0, 0);
    expect(getCycleDate(justBeforeMidnight, 0)).toBe('2026-10-18');
    expect(getCycleDate(exactlyMidnight, 0)).toBe('2026-10-19');
  });

  it('supports custom resetHour (e.g. 6 AM cutoff)', () => {
    const at559 = new Date(2026, 9, 18, 5, 59, 59);
    const at600 = new Date(2026, 9, 18, 6, 0, 0);
    expect(getCycleDate(at559, 6)).toBe('2026-10-17');
    expect(getCycleDate(at600, 6)).toBe('2026-10-18');
  });

  it('handles month boundary rollover correctly', () => {
    // Nov 1 at 03:00 AM -> Oct 31 cycle
    const date = new Date(2026, 10, 1, 3, 0, 0);
    expect(getCycleDate(date, 4)).toBe('2026-10-31');
  });

  it('handles year boundary rollover correctly', () => {
    // Jan 1, 2026 at 02:00 AM -> Dec 31, 2025 cycle
    const date = new Date(2026, 0, 1, 2, 0, 0);
    expect(getCycleDate(date, 4)).toBe('2025-12-31');
  });

  it('handles leap year February 29 rollover', () => {
    // March 1, 2024 (leap year) at 03:00 AM -> Feb 29, 2024
    const leapDate = new Date(2024, 2, 1, 3, 0, 0);
    expect(getCycleDate(leapDate, 4)).toBe('2024-02-29');

    // March 1, 2025 (non-leap year) at 03:00 AM -> Feb 28, 2025
    const nonLeapDate = new Date(2025, 2, 1, 3, 0, 0);
    expect(getCycleDate(nonLeapDate, 4)).toBe('2025-02-28');
  });

  it('handles invalid date objects gracefully without throwing', () => {
    const invalidDate = new Date('invalid date');
    const result = getCycleDate(invalidDate, 4);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('2. Countdown Calculator (getTimeUntilReset)', () => {
  it('returns exactly 1 second when 1 second before reset cutoff (03:59:59)', () => {
    const now = new Date(2026, 9, 18, 3, 59, 59, 0);
    const countdown = getTimeUntilReset(4, now);
    expect(countdown.hours).toBe(0);
    expect(countdown.minutes).toBe(0);
    expect(countdown.seconds).toBe(1);
    expect(countdown.totalSeconds).toBe(1);
    expect(countdown.formatted).toBe('00:00:01');
  });

  it('returns 24 hours countdown at exactly reset cutoff (04:00:00)', () => {
    const now = new Date(2026, 9, 18, 4, 0, 0, 0);
    const countdown = getTimeUntilReset(4, now);
    expect(countdown.hours).toBe(24);
    expect(countdown.minutes).toBe(0);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe('24:00:00');
  });

  it('returns accurate countdown at midnight (00:00:00) with 04:00 cutoff', () => {
    const now = new Date(2026, 9, 18, 0, 0, 0, 0);
    const countdown = getTimeUntilReset(4, now);
    expect(countdown.hours).toBe(4);
    expect(countdown.minutes).toBe(0);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe('04:00:00');
  });

  it('returns accurate countdown during daytime / evening', () => {
    // 20:30:15 -> reset at 04:00:00 next day (7h 29m 45s)
    const now = new Date(2026, 9, 18, 20, 30, 15, 0);
    const countdown = getTimeUntilReset(4, now);
    expect(countdown.hours).toBe(7);
    expect(countdown.minutes).toBe(29);
    expect(countdown.seconds).toBe(45);
    expect(countdown.formatted).toBe('07:29:45');
  });

  it('supports custom resetHour (e.g. midnight resetHour = 0)', () => {
    const now = new Date(2026, 9, 18, 22, 15, 0, 0);
    const countdown = getTimeUntilReset(0, now);
    expect(countdown.hours).toBe(1);
    expect(countdown.minutes).toBe(45);
    expect(countdown.seconds).toBe(0);
    expect(countdown.formatted).toBe('01:45:00');
  });
});

describe('3. Safe Date Arithmetic Helpers', () => {
  it('parses valid date strings and rejects invalid inputs', () => {
    expect(parseDateString('2026-10-18')).toEqual({ year: 2026, month: 10, day: 18 });
    expect(parseDateString('invalid')).toBeNull();
    expect(parseDateString('2026-13-01')).toBeNull(); // month > 12
    expect(parseDateString('2026-00-01')).toBeNull(); // month < 1
  });

  it('formats numeric components with leading zeros', () => {
    expect(formatDateString(2026, 4, 7)).toBe('2026-04-07');
    expect(formatDateString(2026, 12, 31)).toBe('2026-12-31');
  });

  it('calculates previous and next dates across month boundaries', () => {
    expect(getPreviousDateString('2026-11-01')).toBe('2026-10-31');
    expect(getNextDateString('2026-10-31')).toBe('2026-11-01');
  });

  it('calculates previous and next dates across year boundaries', () => {
    expect(getPreviousDateString('2026-01-01')).toBe('2025-12-31');
    expect(getNextDateString('2025-12-31')).toBe('2026-01-01');
  });

  it('handles leap year transitions (Feb 28/29/Mar 1)', () => {
    // 2024 leap year
    expect(getNextDateString('2024-02-28')).toBe('2024-02-29');
    expect(getNextDateString('2024-02-29')).toBe('2024-03-01');
    expect(getPreviousDateString('2024-03-01')).toBe('2024-02-29');

    // 2025 non-leap year
    expect(getNextDateString('2025-02-28')).toBe('2025-03-01');
    expect(getPreviousDateString('2025-03-01')).toBe('2025-02-28');
  });

  it('verifies date consecutiveness accurately', () => {
    expect(isDateConsecutive('2026-10-17', '2026-10-18')).toBe(true);
    expect(isDateConsecutive('2026-10-18', '2026-10-17')).toBe(false); // Inverted
    expect(isDateConsecutive('2026-10-18', '2026-10-18')).toBe(false); // Same date
    expect(isDateConsecutive('2026-10-16', '2026-10-18')).toBe(false); // 2 days gap
  });
});

describe('4. Streak Calculation Engine (calculateStreak)', () => {
  it('returns 0 streak for empty history', () => {
    const result = calculateStreak({}, '2026-10-18');
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('returns 1 streak when today is completed (first day)', () => {
    const history = { '2026-10-18': true };
    const result = calculateStreak(history, '2026-10-18');
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it('preserves active streak from yesterday when today is pending', () => {
    // Completed yesterday (2026-10-17), today (2026-10-18) not yet completed
    const history = { '2026-10-17': true };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('increments streak when today is completed on top of yesterday', () => {
    const history = { '2026-10-17': true, '2026-10-18': true };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it('computes consecutive multi-day streaks ending today', () => {
    const history = {
      '2026-10-14': true,
      '2026-10-15': true,
      '2026-10-16': true,
      '2026-10-17': true,
      '2026-10-18': true,
    };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('computes consecutive multi-day streaks ending yesterday when today pending', () => {
    const history = {
      '2026-10-13': true,
      '2026-10-14': true,
      '2026-10-15': true,
      '2026-10-16': true,
      '2026-10-17': true,
      // 2026-10-18 is pending
    };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('detects broken streak when yesterday was missed and today is pending', () => {
    // Completed 15 and 16, but 17 was missed. Today is 18 (pending).
    const history = {
      '2026-10-15': true,
      '2026-10-16': true,
      // 2026-10-17 missing
      // 2026-10-18 pending
    };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2); // Preserves previous streak
  });

  it('restarts streak at 1 after a missed day once today is completed', () => {
    // Completed 15 and 16. Missed 17. Completed 18.
    const history = {
      '2026-10-15': true,
      '2026-10-16': true,
      // 2026-10-17 missing
      '2026-10-18': true,
    };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2); // Preserves peak 2 days
  });

  it('preserves peak longestStreak even when current streak drops', () => {
    // 7-day streak in early October, followed by gap, then 2-day current streak
    const history = {
      '2026-10-01': true,
      '2026-10-02': true,
      '2026-10-03': true,
      '2026-10-04': true,
      '2026-10-05': true,
      '2026-10-06': true,
      '2026-10-07': true,
      // gap: 8 to 16 missed
      '2026-10-17': true,
      '2026-10-18': true,
    };
    const result = calculateStreak(history, '2026-10-18');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(7);
  });

  it('updates longestStreak when current streak exceeds previous record', () => {
    const history = {
      '2026-10-15': true,
      '2026-10-16': true,
      '2026-10-17': true,
      '2026-10-18': true,
    };
    // previousLongest was 3; current is 4
    const result = calculateStreak(history, '2026-10-18', 3);
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  it('prevents duplicate streak increments on same calendar date', () => {
    const history = { '2026-10-18': true };
    const run1 = calculateStreak(history, '2026-10-18');
    const run2 = calculateStreak(history, '2026-10-18');
    expect(run1).toEqual(run2);
    expect(run1.currentStreak).toBe(1);
  });

  it('maintains streak continuity across leap year February 29th', () => {
    const history = {
      '2024-02-28': true,
      '2024-02-29': true,
      '2024-03-01': true,
    };
    const result = calculateStreak(history, '2024-03-01');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('maintains streak continuity across year boundaries', () => {
    const history = {
      '2025-12-30': true,
      '2025-12-31': true,
      '2026-01-01': true,
    };
    const result = calculateStreak(history, '2026-01-01');
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });
});

describe('5. Daily Reset Engine Lifecycle (checkAndPerformDailyReset)', () => {
  it('triggers reset when timestamp crosses 04:00 AM cycle cutoff', () => {
    const initialState = createMockAppState({
      dailies: {
        lastReset: '2026-10-17T04:00:00.000Z',
        currentStreak: 1,
        longestStreak: 1,
        history: { '2026-10-17': true },
        commissions: [
          {
            ...INTER_KNOT_PRESET_COMMISSIONS[0],
            status: 'COMPLETED',
            completedDates: ['2026-10-17'],
          },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 1,
      },
    });

    // Advance clock to October 18 at 04:30 AM
    const now = new Date(2026, 9, 18, 4, 30, 0);
    const result = checkAndPerformDailyReset(initialState, now);

    expect(result.resetOccurred).toBe(true);
    expect(result.previousCycleDate).toBe('2026-10-17');
    expect(result.currentCycleDate).toBe('2026-10-18');

    // Commission should be reset to PENDING for today
    expect(result.updatedState.dailies.commissions[0].status).toBe('PENDING');
    // History should retain previous completion
    expect(result.updatedState.dailies.history['2026-10-17']).toBe(true);
    // Streak is preserved from yesterday (1)
    expect(result.updatedState.dailies.currentStreak).toBe(1);
    // commissionClaimed flag is reset to false for new day
    expect(result.updatedState.dailies.commissionClaimed).toBe(false);
  });

  it('is idempotent on repeated calls within the same cycle date', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T05:00:00.000Z',
        currentStreak: 1,
        longestStreak: 1,
        history: { '2026-10-18': true },
        commissions: INTER_KNOT_PRESET_COMMISSIONS,
        commissionClaimed: true,
        totalCommissionsClaimed: 1,
      },
    });

    const now = new Date(2026, 9, 18, 14, 0, 0);
    const result = checkAndPerformDailyReset(state, now);

    expect(result.resetOccurred).toBe(false);
    expect(result.updatedState).toBe(state); // Unmodified reference
  });

  it('breaks streak when resetting if yesterday was not completed', () => {
    const state = createMockAppState({
      dailies: {
        // Last reset 3 days ago, missed yesterday
        lastReset: '2026-10-15T04:00:00.000Z',
        currentStreak: 3,
        longestStreak: 3,
        history: { '2026-10-13': true, '2026-10-14': true, '2026-10-15': true },
        commissions: INTER_KNOT_PRESET_COMMISSIONS,
        commissionClaimed: false,
        totalCommissionsClaimed: 3,
      },
    });

    const now = new Date(2026, 9, 18, 10, 0, 0);
    const result = checkAndPerformDailyReset(state, now);

    expect(result.resetOccurred).toBe(true);
    expect(result.updatedState.dailies.currentStreak).toBe(0);
    expect(result.updatedState.dailies.longestStreak).toBe(3); // Preserved
  });
});

describe('6. Commission Claiming & Unclaiming Actions', () => {
  it('marks commission COMPLETED and increments streak on first claim of the day', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 0,
        longestStreak: 0,
        history: {},
        commissions: [
          {
            ...INTER_KNOT_PRESET_COMMISSIONS[0],
            status: 'PENDING',
            completedDates: [],
          },
        ],
        commissionClaimed: false,
        totalCommissionsClaimed: 0,
      },
    });

    const updated = claimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');

    expect(updated.dailies.commissions[0].status).toBe('COMPLETED');
    expect(updated.dailies.commissions[0].completedDates).toContain('2026-10-18');
    expect(updated.dailies.history['2026-10-18']).toBe(true);
    expect(updated.dailies.currentStreak).toBe(1);
    expect(updated.dailies.longestStreak).toBe(1);
    expect(updated.dailies.totalCommissionsClaimed).toBe(1);
    expect(updated.bangboo.currentMood).toBe('celebrating');
  });

  it('prevents duplicate streak increment when claiming multiple commissions on the same day', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 0,
        longestStreak: 0,
        history: {},
        commissions: [
          { ...INTER_KNOT_PRESET_COMMISSIONS[0], status: 'PENDING', completedDates: [] },
          { ...INTER_KNOT_PRESET_COMMISSIONS[1], status: 'PENDING', completedDates: [] },
        ],
        commissionClaimed: false,
        totalCommissionsClaimed: 0,
      },
    });

    // Claim first commission
    const afterFirst = claimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(afterFirst.dailies.currentStreak).toBe(1);
    expect(afterFirst.dailies.totalCommissionsClaimed).toBe(1);

    // Claim second commission on same cycle date
    const afterSecond = claimCommission(afterFirst, INTER_KNOT_PRESET_COMMISSIONS[1].id, '2026-10-18');
    expect(afterSecond.dailies.currentStreak).toBe(1); // Streak did NOT increment again
    expect(afterSecond.dailies.totalCommissionsClaimed).toBe(2); // Total claimed DID increment
    expect(afterSecond.dailies.commissions[0].status).toBe('COMPLETED');
    expect(afterSecond.dailies.commissions[1].status).toBe('COMPLETED');
  });

  it('is a no-op when claiming an already claimed commission for today', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 1,
        longestStreak: 1,
        history: { '2026-10-18': true },
        commissions: [
          {
            ...INTER_KNOT_PRESET_COMMISSIONS[0],
            status: 'COMPLETED',
            completedDates: ['2026-10-18'],
          },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 1,
      },
    });

    const result = claimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(result).toBe(state); // No-op, same reference
  });

  it('unclaims commission and reverts streak when sole commission is toggled off', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 2, // 1 from yesterday, 1 from today
        longestStreak: 2,
        history: { '2026-10-17': true, '2026-10-18': true },
        commissions: [
          {
            ...INTER_KNOT_PRESET_COMMISSIONS[0],
            status: 'COMPLETED',
            completedDates: ['2026-10-17', '2026-10-18'],
          },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 2,
      },
    });

    const reverted = unclaimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');

    expect(reverted.dailies.commissions[0].status).toBe('PENDING');
    expect(reverted.dailies.commissions[0].completedDates).not.toContain('2026-10-18');
    expect(reverted.dailies.history['2026-10-18']).toBeUndefined();
    // Reverts to yesterday's streak (1)
    expect(reverted.dailies.currentStreak).toBe(1);
    expect(reverted.dailies.longestStreak).toBe(2);
    expect(reverted.dailies.totalCommissionsClaimed).toBe(1);
  });

  it('keeps today in history if unclaiming one commission while another remains completed', () => {
    const state = createMockAppState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 1,
        longestStreak: 1,
        history: { '2026-10-18': true },
        commissions: [
          { ...INTER_KNOT_PRESET_COMMISSIONS[0], status: 'COMPLETED', completedDates: ['2026-10-18'] },
          { ...INTER_KNOT_PRESET_COMMISSIONS[1], status: 'COMPLETED', completedDates: ['2026-10-18'] },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 2,
      },
    });

    const reverted = unclaimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');

    expect(reverted.dailies.commissions[0].status).toBe('PENDING');
    expect(reverted.dailies.commissions[1].status).toBe('COMPLETED');
    expect(reverted.dailies.history['2026-10-18']).toBe(true);
    expect(reverted.dailies.currentStreak).toBe(1);
  });
});

describe('7. Daylight Saving Time (DST) Resilience', () => {
  it('handles US spring-forward transition (23-hour day) without off-by-one shifts', () => {
    // 2024-03-10 was US Spring Forward
    const march9 = '2024-03-09';
    const march10 = '2024-03-10';
    const march11 = '2024-03-11';

    expect(getNextDateString(march9)).toBe(march10);
    expect(getNextDateString(march10)).toBe(march11);
    expect(getPreviousDateString(march11)).toBe(march10);
    expect(getPreviousDateString(march10)).toBe(march9);

    const history = {
      [march9]: true,
      [march10]: true,
      [march11]: true,
    };
    const streak = calculateStreak(history, march11);
    expect(streak.currentStreak).toBe(3);
    expect(streak.longestStreak).toBe(3);
  });

  it('handles US fall-back transition (25-hour day) without off-by-one shifts', () => {
    // 2024-11-03 was US Fall Back
    const nov2 = '2024-11-02';
    const nov3 = '2024-11-03';
    const nov4 = '2024-11-04';

    expect(getNextDateString(nov2)).toBe(nov3);
    expect(getNextDateString(nov3)).toBe(nov4);
    expect(getPreviousDateString(nov4)).toBe(nov3);
    expect(getPreviousDateString(nov3)).toBe(nov2);

    const history = {
      [nov2]: true,
      [nov3]: true,
      [nov4]: true,
    };
    const streak = calculateStreak(history, nov4);
    expect(streak.currentStreak).toBe(3);
    expect(streak.longestStreak).toBe(3);
  });
});

describe('8. Inter-Knot Preset Commissions Specification', () => {
  it('defines valid Inter-Knot themed commissions with unique IDs and rewards', () => {
    expect(INTER_KNOT_PRESET_COMMISSIONS.length).toBeGreaterThanOrEqual(4);

    const ids = new Set<string>();
    for (const comm of INTER_KNOT_PRESET_COMMISSIONS) {
      expect(comm.id).toBeTruthy();
      expect(ids.has(comm.id)).toBe(false);
      ids.add(comm.id);

      expect(comm.title.length).toBeGreaterThan(0);
      expect(comm.description.length).toBeGreaterThan(0);
      expect(comm.category.length).toBeGreaterThan(0);
      expect(comm.reward.exp).toBeGreaterThan(0);
      expect(comm.reward.denny).toBeGreaterThan(0);
      expect(comm.reward.polychrome).toBeGreaterThan(0);
      expect(comm.status).toBe('PENDING');
      expect(comm.completedDates).toEqual([]);
    }
  });

  it('includes iconic ZZZ locations (Coff Cafe, Howl Scratch Ticket, Random Play)', () => {
    const titles = INTER_KNOT_PRESET_COMMISSIONS.map((c) => c.title);
    expect(titles.some((t) => t.includes('Coff Cafe'))).toBe(true);
    expect(titles.some((t) => t.includes('Howl'))).toBe(true);
    expect(titles.some((t) => t.includes('Random Play'))).toBe(true);
  });
});
