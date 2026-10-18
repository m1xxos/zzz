/**
 * Milestone 3 Adversarial Challenge & Empirical Stress Test Suite
 * Target: src/test/challenger_m3.stress.test.ts
 *
 * Exhaustively stress-tests:
 * 1. Leap Years (Feb 29 transitions, century leap year rules 2000 vs 2100, 400-year cycle)
 * 2. Daylight Saving Time (DST) shifts (23-hour spring-forward, 25-hour fall-back, noon pinning)
 * 3. Timezone travel & cross-boundary simulation (GMT-8 California <-> GMT+9 Tokyo)
 * 4. Multiple claims on the same day cycle (idempotency, counters, Bangboo mood)
 * 5. Un-claiming and re-claiming lifecycle (single vs multi commission, streak reversal & restoration)
 * 6. Multi-day gaps and non-trivial streak histories (100+ day streaks, scattered historical dates)
 * 7. Countdown timer precision and boundary conditions (sub-second, polymorphic args, clamps)
 */

import { describe, it, expect } from 'vitest';
import {
  getCycleDate,
  getNextResetDate,
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

// Helper to construct mock state
function createTestState(overrides: Partial<AppState> = {}): AppState {
  const commissions: DailyCommission[] = INTER_KNOT_PRESET_COMMISSIONS.map((c) => ({
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
      commissions,
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

describe('CHALLENGER M3: 1. Leap Year & Century Leap Year Mechanics', () => {
  it('parses and formats leap year dates accurately', () => {
    expect(parseDateString('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(formatDateString(2024, 2, 29)).toBe('2024-02-29');
    expect(parseDateString('2024-02-30')).toEqual({ year: 2024, month: 2, day: 30 }); // Day parsed within 1-31 range
    expect(parseDateString('not-a-date')).toBeNull();
  });

  it('correctly transitions across standard leap year (2024)', () => {
    expect(getNextDateString('2024-02-27')).toBe('2024-02-28');
    expect(getNextDateString('2024-02-28')).toBe('2024-02-29');
    expect(getNextDateString('2024-02-29')).toBe('2024-03-01');
    expect(getPreviousDateString('2024-03-01')).toBe('2024-02-29');
    expect(getPreviousDateString('2024-02-29')).toBe('2024-02-28');
  });

  it('correctly transitions across century leap year (2000, divisible by 400)', () => {
    expect(getNextDateString('2000-02-28')).toBe('2000-02-29');
    expect(getNextDateString('2000-02-29')).toBe('2000-03-01');
    expect(getPreviousDateString('2000-03-01')).toBe('2000-02-29');
  });

  it('correctly transitions across non-leap century year (2100, divisible by 100 but not 400)', () => {
    // 2100 is NOT a leap year
    expect(getNextDateString('2100-02-28')).toBe('2100-03-01');
    expect(getPreviousDateString('2100-03-01')).toBe('2100-02-28');
  });

  it('correctly transitions across non-leap century year (1900)', () => {
    // 1900 is NOT a leap year
    expect(getNextDateString('1900-02-28')).toBe('1900-03-01');
    expect(getPreviousDateString('1900-03-01')).toBe('1900-02-28');
  });

  it('evaluates getCycleDate before and after 04:00 AM on Feb 29 and March 1 of leap year 2024', () => {
    // Feb 29 at 03:59:59 belongs to Feb 28 cycle
    const feb29Early = new Date(2024, 1, 29, 3, 59, 59, 999);
    expect(getCycleDate(feb29Early, 4)).toBe('2024-02-28');

    // Feb 29 at 04:00:00 belongs to Feb 29 cycle
    const feb29Cutoff = new Date(2024, 1, 29, 4, 0, 0, 0);
    expect(getCycleDate(feb29Cutoff, 4)).toBe('2024-02-29');

    // March 1 at 03:59:59 belongs to Feb 29 cycle
    const march1Early = new Date(2024, 2, 1, 3, 59, 59, 999);
    expect(getCycleDate(march1Early, 4)).toBe('2024-02-29');

    // March 1 at 04:00:00 belongs to March 1 cycle
    const march1Cutoff = new Date(2024, 2, 1, 4, 0, 0, 0);
    expect(getCycleDate(march1Cutoff, 4)).toBe('2024-03-01');
  });

  it('maintains continuous streak across leap year boundary (Feb 27 -> Feb 28 -> Feb 29 -> Mar 1)', () => {
    const history = {
      '2024-02-27': true,
      '2024-02-28': true,
      '2024-02-29': true,
      '2024-03-01': true,
    };
    const res = calculateStreak(history, '2024-03-01');
    expect(res.currentStreak).toBe(4);
    expect(res.longestStreak).toBe(4);
  });

  it('breaks streak when Feb 29 is missed in a leap year', () => {
    const history = {
      '2024-02-28': true,
      // 2024-02-29 MISSED
      '2024-03-01': true,
    };
    const res = calculateStreak(history, '2024-03-01');
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(1);
  });
});

describe('CHALLENGER M3: 2. Daylight Saving Time (DST) 23h & 25h Resilience', () => {
  it('spring-forward (23-hour day): date calculations remain strictly 1 calendar day apart', () => {
    // US Spring Forward: 2024-03-10
    const beforeDst = '2024-03-09';
    const dstDay = '2024-03-10';
    const afterDst = '2024-03-11';

    expect(getNextDateString(beforeDst)).toBe(dstDay);
    expect(getNextDateString(dstDay)).toBe(afterDst);
    expect(getPreviousDateString(afterDst)).toBe(dstDay);
    expect(getPreviousDateString(dstDay)).toBe(beforeDst);

    expect(isDateConsecutive(beforeDst, dstDay)).toBe(true);
    expect(isDateConsecutive(dstDay, afterDst)).toBe(true);
  });

  it('fall-back (25-hour day): date calculations remain strictly 1 calendar day apart', () => {
    // US Fall Back: 2024-11-03
    const beforeDst = '2024-11-02';
    const dstDay = '2024-11-03';
    const afterDst = '2024-11-04';

    expect(getNextDateString(beforeDst)).toBe(dstDay);
    expect(getNextDateString(dstDay)).toBe(afterDst);
    expect(getPreviousDateString(afterDst)).toBe(dstDay);
    expect(getPreviousDateString(dstDay)).toBe(beforeDst);

    expect(isDateConsecutive(beforeDst, dstDay)).toBe(true);
    expect(isDateConsecutive(dstDay, afterDst)).toBe(true);
  });

  it('evaluates cycle date correctly across DST clock transitions at 04:00 AM', () => {
    // Clocks spring forward at 02:00 -> 03:00 on March 10, 2024.
    // At 03:30 AM March 10 (which is right after spring forward), it is still < 04:00 AM, so belongs to March 9.
    const springEarly = new Date(2024, 2, 10, 3, 30, 0);
    expect(getCycleDate(springEarly, 4)).toBe('2024-03-09');

    // At 04:00 AM March 10, it belongs to March 10.
    const springCutoff = new Date(2024, 2, 10, 4, 0, 0);
    expect(getCycleDate(springCutoff, 4)).toBe('2024-03-10');

    // Clocks fall back at 02:00 -> 01:00 on Nov 3, 2024.
    // At 03:30 AM Nov 3, still < 04:00 AM, belongs to Nov 2.
    const fallEarly = new Date(2024, 10, 3, 3, 30, 0);
    expect(getCycleDate(fallEarly, 4)).toBe('2024-11-02');

    // At 04:00 AM Nov 3, belongs to Nov 3.
    const fallCutoff = new Date(2024, 10, 3, 4, 0, 0);
    expect(getCycleDate(fallCutoff, 4)).toBe('2024-11-03');
  });

  it('streak continuity holds unbroken through 7 days across DST transition', () => {
    const history: Record<string, boolean> = {
      '2024-03-07': true,
      '2024-03-08': true,
      '2024-03-09': true,
      '2024-03-10': true, // DST Spring Forward
      '2024-03-11': true,
      '2024-03-12': true,
      '2024-03-13': true,
    };
    const res = calculateStreak(history, '2024-03-13');
    expect(res.currentStreak).toBe(7);
    expect(res.longestStreak).toBe(7);
  });
});

describe('CHALLENGER M3: 3. Timezone Boundaries & Travel Simulation (GMT-8 <-> GMT+9)', () => {
  it('handles user claiming in GMT-8 (California) and then checking reset in GMT+9 (Tokyo)', () => {
    // 1. In GMT-8 (PDT = UTC-7), say it is 2026-10-18 at 12:00 local time (19:00 UTC).
    // The cycle date in California is '2026-10-18'.
    const stateInCalif = createTestState({
      dailies: {
        lastReset: '2026-10-18T11:00:00.000Z',
        currentStreak: 0,
        longestStreak: 0,
        history: {},
        commissions: INTER_KNOT_PRESET_COMMISSIONS.map((c) => ({ ...c, completedDates: [] })),
        commissionClaimed: false,
        totalCommissionsClaimed: 0,
      },
    });

    // Proxy claims commission in California
    const afterClaimCalif = claimCommission(
      stateInCalif,
      INTER_KNOT_PRESET_COMMISSIONS[0].id,
      '2026-10-18'
    );
    expect(afterClaimCalif.dailies.currentStreak).toBe(1);
    expect(afterClaimCalif.dailies.history['2026-10-18']).toBe(true);
    expect(afterClaimCalif.dailies.commissionClaimed).toBe(true);

    // 2. User travels to Tokyo (GMT+9).
    // In Tokyo, at 19:00 UTC, the local time is 04:00 AM on 2026-10-19!
    // That means Tokyo has JUST crossed into the new cycle date '2026-10-19'!
    // App triggers daily reset check in Tokyo:
    // We simulate by passing a Date whose local representation is 2026-10-19 04:15:00
    const tokyoMorning = new Date(2026, 9, 19, 4, 15, 0); // Oct 19 04:15 AM
    const resetResult = checkAndPerformDailyReset(afterClaimCalif, tokyoMorning);

    // Reset MUST occur because cycle date rolled from 2026-10-18 to 2026-10-19
    expect(resetResult.resetOccurred).toBe(true);
    expect(resetResult.previousCycleDate).toBe('2026-10-18');
    expect(resetResult.currentCycleDate).toBe('2026-10-19');

    // The streak from California (yesterday 2026-10-18) MUST be preserved while today is pending!
    expect(resetResult.updatedState.dailies.currentStreak).toBe(1);
    // Commission for today in Tokyo should be reset to PENDING
    expect(resetResult.updatedState.dailies.commissions[0].status).toBe('PENDING');
    // commissionClaimed flag resets to false for the new day
    expect(resetResult.updatedState.dailies.commissionClaimed).toBe(false);

    // 3. User claims a commission in Tokyo on 2026-10-19:
    const afterClaimTokyo = claimCommission(
      resetResult.updatedState,
      INTER_KNOT_PRESET_COMMISSIONS[0].id,
      '2026-10-19'
    );
    // Streak now advances to 2!
    expect(afterClaimTokyo.dailies.currentStreak).toBe(2);
    expect(afterClaimTokyo.dailies.history['2026-10-18']).toBe(true);
    expect(afterClaimTokyo.dailies.history['2026-10-19']).toBe(true);
    expect(afterClaimTokyo.dailies.totalCommissionsClaimed).toBe(2);
  });

  it('does NOT prematurely reset if arriving in Tokyo before the 04:00 AM cutoff', () => {
    const state = createTestState({
      dailies: {
        lastReset: '2026-10-18T05:00:00.000Z',
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

    // In Tokyo, it's 03:45 AM on October 19.
    // Since 03:45 AM < 04:00 AM, the cycle date is still '2026-10-18'!
    const tokyoEarly = new Date(2026, 9, 19, 3, 45, 0);
    const resetResult = checkAndPerformDailyReset(state, tokyoEarly);

    // No reset should occur yet!
    expect(resetResult.resetOccurred).toBe(false);
    expect(resetResult.updatedState.dailies.commissions[0].status).toBe('COMPLETED');
    expect(resetResult.updatedState.dailies.commissionClaimed).toBe(true);
  });
});

describe('CHALLENGER M3: 4. Multiple Claims on the Same Day Cycle', () => {
  it('claiming 5 distinct commissions on the same day increments totalCommissionsClaimed but NOT streak', () => {
    let state = createTestState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 0,
        longestStreak: 0,
        history: {},
        commissions: INTER_KNOT_PRESET_COMMISSIONS.map((c) => ({ ...c, completedDates: [] })),
        commissionClaimed: false,
        totalCommissionsClaimed: 0,
      },
    });

    const cycle = '2026-10-18';

    for (let i = 0; i < INTER_KNOT_PRESET_COMMISSIONS.length; i++) {
      const commId = INTER_KNOT_PRESET_COMMISSIONS[i].id;
      state = claimCommission(state, commId, cycle);

      // Streak must remain 1 after the very first claim!
      expect(state.dailies.currentStreak).toBe(1);
      // Total count must increment each time
      expect(state.dailies.totalCommissionsClaimed).toBe(i + 1);
      // History must contain exactly this date
      expect(state.dailies.history[cycle]).toBe(true);
      expect(state.dailies.commissions[i].status).toBe('COMPLETED');
      expect(state.dailies.commissions[i].completedDates).toContain(cycle);
    }

    // Only 1 key in history for today
    expect(Object.keys(state.dailies.history)).toEqual([cycle]);
  });

  it('repeatedly claiming the exact same commission on the same day is completely idempotent', () => {
    const initialState = createTestState({
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

    // Claim 10 times in a row
    let state = initialState;
    for (let i = 0; i < 10; i++) {
      state = claimCommission(state, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    }

    expect(state).toBe(initialState); // Reference identity preserved
    expect(state.dailies.totalCommissionsClaimed).toBe(1);
    expect(state.dailies.commissions[0].completedDates).toEqual(['2026-10-18']);
  });
});

describe('CHALLENGER M3: 5. Un-claiming and Re-claiming Lifecycle', () => {
  it('correctly manages state when unclaiming and re-claiming a single daily commission', () => {
    const base = createTestState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 5, // 4 from previous days + 1 today
        longestStreak: 5,
        history: {
          '2026-10-14': true,
          '2026-10-15': true,
          '2026-10-16': true,
          '2026-10-17': true,
          '2026-10-18': true,
        },
        commissions: [
          {
            ...INTER_KNOT_PRESET_COMMISSIONS[0],
            status: 'COMPLETED',
            completedDates: ['2026-10-18'],
          },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 10,
      },
    });

    // 1. Unclaim today's commission
    const unclaimed = unclaimCommission(base, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(unclaimed.dailies.commissions[0].status).toBe('PENDING');
    expect(unclaimed.dailies.commissions[0].completedDates).not.toContain('2026-10-18');
    expect(unclaimed.dailies.history['2026-10-18']).toBeUndefined();
    expect(unclaimed.dailies.commissionClaimed).toBe(false);
    expect(unclaimed.dailies.totalCommissionsClaimed).toBe(9);
    // Streak falls back to 4 (chain ending yesterday)
    expect(unclaimed.dailies.currentStreak).toBe(4);
    // Longest streak remains 5
    expect(unclaimed.dailies.longestStreak).toBe(5);

    // 2. Re-claim today's commission
    const reclaimed = claimCommission(unclaimed, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(reclaimed.dailies.commissions[0].status).toBe('COMPLETED');
    expect(reclaimed.dailies.commissions[0].completedDates).toContain('2026-10-18');
    expect(reclaimed.dailies.history['2026-10-18']).toBe(true);
    expect(reclaimed.dailies.commissionClaimed).toBe(true);
    expect(reclaimed.dailies.totalCommissionsClaimed).toBe(10);
    // Streak restored to 5
    expect(reclaimed.dailies.currentStreak).toBe(5);
    expect(reclaimed.dailies.longestStreak).toBe(5);
  });

  it('unclaiming one commission while another remains completed preserves today in history and streak', () => {
    const base = createTestState({
      dailies: {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 2,
        longestStreak: 2,
        history: { '2026-10-17': true, '2026-10-18': true },
        commissions: [
          { ...INTER_KNOT_PRESET_COMMISSIONS[0], status: 'COMPLETED', completedDates: ['2026-10-18'] },
          { ...INTER_KNOT_PRESET_COMMISSIONS[1], status: 'COMPLETED', completedDates: ['2026-10-18'] },
        ],
        commissionClaimed: true,
        totalCommissionsClaimed: 2,
      },
    });

    // Unclaim comm 0, leaving comm 1 completed
    const stateAfterUnclaim0 = unclaimCommission(base, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(stateAfterUnclaim0.dailies.commissions[0].status).toBe('PENDING');
    expect(stateAfterUnclaim0.dailies.commissions[1].status).toBe('COMPLETED');
    expect(stateAfterUnclaim0.dailies.history['2026-10-18']).toBe(true); // Still true!
    expect(stateAfterUnclaim0.dailies.currentStreak).toBe(2); // Still 2!
    expect(stateAfterUnclaim0.dailies.commissionClaimed).toBe(true);
    expect(stateAfterUnclaim0.dailies.totalCommissionsClaimed).toBe(1);

    // Unclaim comm 1 as well
    const stateAfterUnclaim1 = unclaimCommission(stateAfterUnclaim0, INTER_KNOT_PRESET_COMMISSIONS[1].id, '2026-10-18');
    expect(stateAfterUnclaim1.dailies.commissions[1].status).toBe('PENDING');
    expect(stateAfterUnclaim1.dailies.history['2026-10-18']).toBeUndefined(); // Cleared!
    expect(stateAfterUnclaim1.dailies.currentStreak).toBe(1); // Reverts to yesterday
    expect(stateAfterUnclaim1.dailies.commissionClaimed).toBe(false);
    expect(stateAfterUnclaim1.dailies.totalCommissionsClaimed).toBe(0);
  });

  it('unclaiming an already pending commission is a safe no-op', () => {
    const base = createTestState();
    const result = unclaimCommission(base, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    expect(result).toBe(base);
  });
});

describe('CHALLENGER M3: 6. Multi-Day Gaps & Complex Historical Streaks', () => {
  it('correctly calculates streak across a 365-day continuous chain', () => {
    const history: Record<string, boolean> = {};
    let date = '2025-10-18';
    for (let i = 0; i < 365; i++) {
      history[date] = true;
      date = getNextDateString(date);
    }
    // date is now 2026-10-18
    const res = calculateStreak(history, '2026-10-18');
    expect(res.currentStreak).toBe(365);
    expect(res.longestStreak).toBe(365);
  });

  it('handles multi-day gaps between streaks and preserves peak longestStreak', () => {
    const history: Record<string, boolean> = {
      // Chunk 1: 10 days
      '2026-01-01': true,
      '2026-01-02': true,
      '2026-01-03': true,
      '2026-01-04': true,
      '2026-01-05': true,
      '2026-01-06': true,
      '2026-01-07': true,
      '2026-01-08': true,
      '2026-01-09': true,
      '2026-01-10': true,
      // GAP of 20 days
      // Chunk 2: 15 days (peak)
      '2026-02-01': true,
      '2026-02-02': true,
      '2026-02-03': true,
      '2026-02-04': true,
      '2026-02-05': true,
      '2026-02-06': true,
      '2026-02-07': true,
      '2026-02-08': true,
      '2026-02-09': true,
      '2026-02-10': true,
      '2026-02-11': true,
      '2026-02-12': true,
      '2026-02-13': true,
      '2026-02-14': true,
      '2026-02-15': true,
      // GAP of 30 days
      // Chunk 3: 3 days (current)
      '2026-03-20': true,
      '2026-03-21': true,
      '2026-03-22': true,
    };

    const res = calculateStreak(history, '2026-03-22');
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(15);
  });

  it('handles scattered unsorted date keys and safely ignores non-date / false entries', () => {
    const messyHistory: any = {
      '2026-10-18': true,
      '2026-10-16': true,
      '2026-10-17': true,
      'not-a-date': true,
      '2026-10-15': false, // explicitly false
      '': true,
      '9999-99-99': false,
    };

    const res = calculateStreak(messyHistory, '2026-10-18');
    expect(res.currentStreak).toBe(3); // 16, 17, 18
    expect(res.longestStreak).toBe(3);
  });

  it('properly breaks streak when gap is 2 days and today is pending', () => {
    const history = {
      '2026-10-15': true,
      '2026-10-16': true,
      // 10-17 missed
      // 10-18 pending
    };
    const res = calculateStreak(history, '2026-10-18');
    expect(res.currentStreak).toBe(0);
    expect(res.longestStreak).toBe(2);
  });
});

describe('CHALLENGER M3: 7. Countdown Timer Precision (getTimeUntilReset)', () => {
  it('measures exact countdown at 03:59:59.000 (1 second before reset)', () => {
    const now = new Date(2026, 9, 18, 3, 59, 59, 0);
    const cd = getTimeUntilReset(4, now);
    expect(cd.hours).toBe(0);
    expect(cd.minutes).toBe(0);
    expect(cd.seconds).toBe(1);
    expect(cd.totalSeconds).toBe(1);
    expect(cd.formatted).toBe('00:00:01');
    expect(cd.formattedText).toBe('00h 00m 01s');
  });

  it('measures sub-second cutoff at 03:59:59.999 (rounds to 0 totalSeconds)', () => {
    const now = new Date(2026, 9, 18, 3, 59, 59, 999);
    const cd = getTimeUntilReset(4, now);
    expect(cd.hours).toBe(0);
    expect(cd.minutes).toBe(0);
    expect(cd.seconds).toBe(0);
    expect(cd.totalSeconds).toBe(0);
    expect(cd.formatted).toBe('00:00:00');
  });

  it('measures exact cutoff rollover at 04:00:00.000 (24h remaining)', () => {
    const now = new Date(2026, 9, 18, 4, 0, 0, 0);
    const cd = getTimeUntilReset(4, now);
    expect(cd.hours).toBe(24);
    expect(cd.minutes).toBe(0);
    expect(cd.seconds).toBe(0);
    expect(cd.totalSeconds).toBe(86400);
    expect(cd.formatted).toBe('24:00:00');
    expect(cd.formattedText).toBe('24h 00m 00s');
  });

  it('measures 1 second past cutoff at 04:00:01.000 (23h 59m 59s remaining)', () => {
    const now = new Date(2026, 9, 18, 4, 0, 1, 0);
    const cd = getTimeUntilReset(4, now);
    expect(cd.hours).toBe(23);
    expect(cd.minutes).toBe(59);
    expect(cd.seconds).toBe(59);
    expect(cd.totalSeconds).toBe(86399);
    expect(cd.formatted).toBe('23:59:59');
  });

  it('measures midday at 12:00:00.000 (16h remaining until 04:00 AM)', () => {
    const now = new Date(2026, 9, 18, 12, 0, 0, 0);
    const cd = getTimeUntilReset(4, now);
    expect(cd.hours).toBe(16);
    expect(cd.minutes).toBe(0);
    expect(cd.seconds).toBe(0);
    expect(cd.totalSeconds).toBe(16 * 3600);
    expect(cd.formatted).toBe('16:00:00');
  });

  it('supports inverted polymorphic argument signatures', () => {
    const now = new Date(2026, 9, 18, 15, 30, 45, 0);
    const cd1 = getTimeUntilReset(4, now);
    const cd2 = getTimeUntilReset(now, 4);

    expect(cd1).toEqual(cd2);
  });

  it('clamps invalid resetHour boundaries safely (e.g. -10 -> 0, 50 -> 23)', () => {
    const now = new Date(2026, 9, 18, 12, 0, 0, 0);
    // Negative resetHour clamps to 0 (midnight)
    const cdUnderflow = getTimeUntilReset(-10, now);
    expect(cdUnderflow.hours).toBe(12); // 12h until midnight

    // Overflow resetHour clamps to 23 (11 PM)
    const cdOverflow = getTimeUntilReset(50, now);
    expect(cdOverflow.hours).toBe(11); // 11h until 23:00
  });

  it('getNextResetDate target is strictly in the future of now', () => {
    const testPoints = [
      new Date(2026, 9, 18, 0, 0, 0),
      new Date(2026, 9, 18, 3, 59, 59),
      new Date(2026, 9, 18, 4, 0, 0),
      new Date(2026, 9, 18, 4, 0, 1),
      new Date(2026, 9, 18, 12, 0, 0),
      new Date(2026, 9, 18, 23, 59, 59),
    ];

    for (const pt of testPoints) {
      const nextReset = getNextResetDate(pt, 4);
      expect(nextReset.getTime()).toBeGreaterThan(pt.getTime());
      expect(nextReset.getHours()).toBe(4);
      expect(nextReset.getMinutes()).toBe(0);
      expect(nextReset.getSeconds()).toBe(0);
    }
  });

  it('maintains mathematical consistency between totalSeconds, hours, minutes, and seconds across 200 random timestamps', () => {
    const base = new Date(2026, 9, 18, 0, 0, 0).getTime();
    for (let i = 0; i < 200; i++) {
      // Pick random millisecond offset within a 48-hour window
      const randomOffset = Math.floor(Math.random() * 48 * 3600 * 1000);
      const testDate = new Date(base + randomOffset);
      const cd = getTimeUntilReset(4, testDate);

      // Invariants
      expect(cd.totalSeconds).toBe(cd.hours * 3600 + cd.minutes * 60 + cd.seconds);
      expect(cd.minutes).toBeGreaterThanOrEqual(0);
      expect(cd.minutes).toBeLessThan(60);
      expect(cd.seconds).toBeGreaterThanOrEqual(0);
      expect(cd.seconds).toBeLessThan(60);
      expect(cd.hours).toBeGreaterThanOrEqual(0);
      expect(cd.hours).toBeLessThanOrEqual(24);

      const pad = (n: number) => String(n).padStart(2, '0');
      expect(cd.formatted).toBe(`${pad(cd.hours)}:${pad(cd.minutes)}:${pad(cd.seconds)}`);
      expect(cd.formattedText).toBe(`${pad(cd.hours)}h ${pad(cd.minutes)}m ${pad(cd.seconds)}s`);
    }
  });
});

describe('CHALLENGER M3: 8. State Immutability & Deep Freeze Audit', () => {
  it('does NOT mutate the input AppState when checkAndPerformDailyReset triggers a reset', () => {
    const initial = createTestState({
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

    // Deep freeze input state to detect any unintended in-place mutations
    Object.freeze(initial);
    Object.freeze(initial.dailies);
    Object.freeze(initial.dailies.commissions);
    Object.freeze(initial.dailies.commissions[0]);
    Object.freeze(initial.dailies.history);

    const now = new Date(2026, 9, 18, 5, 0, 0);
    let result: any;
    expect(() => {
      result = checkAndPerformDailyReset(initial, now);
    }).not.toThrow();

    expect(result.resetOccurred).toBe(true);
    expect(result.updatedState).not.toBe(initial);
    expect(initial.dailies.commissions[0].status).toBe('COMPLETED'); // Unmutated!
  });

  it('does NOT mutate input AppState when claiming a commission', () => {
    const initial = createTestState({
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

    Object.freeze(initial);
    Object.freeze(initial.dailies);
    Object.freeze(initial.dailies.commissions);
    Object.freeze(initial.dailies.commissions[0]);

    let updated: any;
    expect(() => {
      updated = claimCommission(initial, INTER_KNOT_PRESET_COMMISSIONS[0].id, '2026-10-18');
    }).not.toThrow();

    expect(updated).not.toBe(initial);
    expect(initial.dailies.commissions[0].status).toBe('PENDING'); // Unmutated!
    expect(updated.dailies.commissions[0].status).toBe('COMPLETED');
  });
});

describe('CHALLENGER M3: 9. Oracle-Verified Property-Based Streak Generator', () => {
  // Naive Reference Oracle
  function oracleStreak(history: Record<string, boolean>, today: string) {
    let current = 0;
    if (Boolean(history[today])) {
      current = 1;
      let d = getPreviousDateString(today);
      while (Boolean(history[d])) {
        current++;
        d = getPreviousDateString(d);
      }
    } else {
      const yesterday = getPreviousDateString(today);
      if (Boolean(history[yesterday])) {
        current = 1;
        let d = getPreviousDateString(yesterday);
        while (Boolean(history[d])) {
          current++;
          d = getPreviousDateString(d);
        }
      } else {
        current = 0;
      }
    }

    // Longest: scan from start to today
    const keys = Object.keys(history).filter((k) => Boolean(history[k])).sort();
    let max = 0;
    let run = 0;
    let prev: string | null = null;
    for (const k of keys) {
      if (!prev) {
        run = 1;
      } else {
        if (isDateConsecutive(prev, k)) {
          run++;
        } else {
          run = 1;
        }
      }
      if (run > max) max = run;
      prev = k;
    }

    return {
      currentStreak: current,
      longestStreak: Math.max(max, current),
    };
  }

  it('matches naive oracle across 50 randomly generated completion histories', () => {
    let curDate = '2026-01-01';
    const dates: string[] = [];
    for (let i = 0; i < 90; i++) {
      dates.push(curDate);
      curDate = getNextDateString(curDate);
    }

    for (let sim = 0; sim < 50; sim++) {
      const randomHistory: Record<string, boolean> = {};
      for (const d of dates) {
        if (Math.random() > 0.4) {
          randomHistory[d] = true;
        }
      }

      // Test against a random target date in the range
      const targetDate = dates[Math.floor(Math.random() * dates.length)];
      const oracle = oracleStreak(randomHistory, targetDate);
      const actual = calculateStreak(randomHistory, targetDate);

      expect(actual.currentStreak).toBe(oracle.currentStreak);
      expect(actual.longestStreak).toBe(oracle.longestStreak);
    }
  });
});

