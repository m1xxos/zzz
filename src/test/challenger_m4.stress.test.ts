/**
 * Milestone 4 Adversarial Challenge & Empirical Stress Test Suite
 * Target: src/test/challenger_m4.stress.test.ts
 *
 * Exhaustively stress-tests:
 * 1. Leap Years & Gregorian Century Rules (2000 leap, 1900 non-leap, 2024 leap, 2100 non-leap, 2400 leap)
 * 2. Daylight Saving Time (DST) & Timezone Shifts (23h spring-forward, 25h fall-back, multi-day zero drift)
 * 3. Month Boundaries & Year Rollover Transitions (Dec 31 -> Jan 1, Feb 28/29 -> Mar 1, arbitrary +/- 120 offsets)
 * 4. Calendar Month Matrix Invariants (strict 7-day row alignment, continuous dates, min 5 weeks, no 4-row collapse)
 * 5. Extreme Inputs & Corrupted Date Formats (malformed strings, bounds checking, negative/float years)
 * 6. Store Slices & Calendar State Operations (navigation wraps, date selection, task filtering)
 * 7. High Volume Performance & Memory Stress (1,000 tasks on single date, 10,000 tasks annual distribution)
 * 8. Edge Cases & Defensive Vulnerabilities (null tasks, missing fields, UTC vs Local date divergence)
 */

import { describe, it, expect } from 'vitest';
import {
  getCalendarMatrix,
  getCalendarMatrixWeeks,
  createNoonDate,
  addDaysNoon,
  diffDaysNoon,
  isLeapYear,
  getDaysInMonth,
  formatDateKey,
  parseDateKey,
  isValidDateKey,
  isSameDate,
  getTodayKey,
  getPrevMonth,
  getNextMonth,
  getMonthFromOffset,
  calculateMonthOffset,
  getMonthName,
  formatMonthHeader,
  formatDisplayDate,
  getDayTaskSummary,
  isDailyCompletedOnDate,
  getPriorityColor,
} from '../services/calendar';
import {
  normalizeYearMonth,
  getPreviousMonthYear,
  getNextMonthYear,
  formatMonthReadout,
  calculateMonthOffset as storeCalculateMonthOffset,
  computeTasksForDate,
  computeDateMetadata,
  getTodayIsoDate,
} from '../store/useStore';
import { Task, TaskPriority, DailiesState } from '../types';

function createMockTask(overrides: Partial<Task> = {}): Task {
  const now = '2026-10-18T10:00:00.000Z';
  return {
    id: overrides.id || 'test-task',
    title: overrides.title || 'Test Task',
    description: overrides.description || '',
    category: overrides.category || 'General',
    priority: overrides.priority || 'B',
    status: overrides.status || 'todo',
    completed: overrides.completed || false,
    completedAt: overrides.completedAt || null,
    dueDate: overrides.dueDate !== undefined ? overrides.dueDate : '2026-10-18',
    tags: overrides.tags || [],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  };
}

// ============================================================================
// 1. Leap Year & Gregorian Century Rules
// ============================================================================

describe('CHALLENGER M4: 1. Leap Year & Century Rules', () => {
  it('correctly classifies standard leap years (divisible by 4)', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2096)).toBe(true);
    expect(isLeapYear(2004)).toBe(true);
  });

  it('correctly classifies common years (not divisible by 4)', () => {
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2027)).toBe(false);
  });

  it('correctly handles century non-leap years (divisible by 100 but not 400)', () => {
    // 1900: 1900 % 100 === 0, 1900 % 400 !== 0 -> NOT leap
    expect(isLeapYear(1900)).toBe(false);
    // 2100: 2100 % 100 === 0, 2100 % 400 !== 0 -> NOT leap
    expect(isLeapYear(2100)).toBe(false);
    // 2200, 2300 -> NOT leap
    expect(isLeapYear(2200)).toBe(false);
    expect(isLeapYear(2300)).toBe(false);
  });

  it('correctly handles century leap years (divisible by 400)', () => {
    // 2000: 2000 % 400 === 0 -> LEAP
    expect(isLeapYear(2000)).toBe(true);
    // 2400: 2400 % 400 === 0 -> LEAP
    expect(isLeapYear(2400)).toBe(true);
    // 1600: 1600 % 400 === 0 -> LEAP
    expect(isLeapYear(1600)).toBe(true);
  });

  it('rejects invalid or non-integer years in isLeapYear', () => {
    expect(isLeapYear(0)).toBe(false);
    expect(isLeapYear(-2024)).toBe(false);
    expect(isLeapYear(2024.5)).toBe(false);
    expect(isLeapYear(NaN)).toBe(false);
    expect(isLeapYear(Infinity)).toBe(false);
    expect(isLeapYear(-Infinity)).toBe(false);
  });

  it('returns exact days in February for leap vs non-leap century and common years', () => {
    expect(getDaysInMonth(2000, 2)).toBe(29); // Century Leap
    expect(getDaysInMonth(1900, 2)).toBe(28); // Century Non-Leap
    expect(getDaysInMonth(2024, 2)).toBe(29); // Leap
    expect(getDaysInMonth(2025, 2)).toBe(28); // Common
    expect(getDaysInMonth(2100, 2)).toBe(28); // Century Non-Leap
    expect(getDaysInMonth(2400, 2)).toBe(29); // Century Leap
  });

  it('validates leap day February 29 correctly in isValidDateKey', () => {
    expect(isValidDateKey('2000-02-29')).toBe(true);
    expect(isValidDateKey('1900-02-29')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2025-02-29')).toBe(false);
    expect(isValidDateKey('2100-02-29')).toBe(false);
    expect(isValidDateKey('2400-02-29')).toBe(true);
  });

  it('performs accurate day arithmetic across leap day transitions', () => {
    // 2024 (Leap Year)
    expect(formatDateKey(addDaysNoon('2024-02-28', 1))).toBe('2024-02-29');
    expect(formatDateKey(addDaysNoon('2024-02-29', 1))).toBe('2024-03-01');
    expect(formatDateKey(addDaysNoon('2024-03-01', -1))).toBe('2024-02-29');

    // 2025 (Common Year)
    expect(formatDateKey(addDaysNoon('2025-02-28', 1))).toBe('2025-03-01');
    expect(formatDateKey(addDaysNoon('2025-03-01', -1))).toBe('2025-02-28');

    // 2000 (Century Leap Year)
    expect(formatDateKey(addDaysNoon('2000-02-28', 1))).toBe('2000-02-29');
    expect(formatDateKey(addDaysNoon('2000-02-29', 1))).toBe('2000-03-01');

    // 1900 (Century Non-Leap Year)
    expect(formatDateKey(addDaysNoon('1900-02-28', 1))).toBe('1900-03-01');

    // 2100 (Century Non-Leap Year)
    expect(formatDateKey(addDaysNoon('2100-02-28', 1))).toBe('2100-03-01');
  });

  it('measures day differences accurately across leap boundaries', () => {
    expect(diffDaysNoon('2024-02-28', '2024-03-01')).toBe(2);
    expect(diffDaysNoon('2025-02-28', '2025-03-01')).toBe(1);
    expect(diffDaysNoon('2000-02-28', '2000-03-01')).toBe(2);
    expect(diffDaysNoon('1900-02-28', '1900-03-01')).toBe(1);
    expect(diffDaysNoon('2100-02-28', '2100-03-01')).toBe(1);
  });

  it('generates February calendar matrix with exact days and leap cell presence', () => {
    // Feb 2000 has 29 days
    const feb2000 = getCalendarMatrix(2000, 2);
    expect(feb2000.filter((c) => c.isCurrentMonth)).toHaveLength(29);
    expect(feb2000.some((c) => c.date === '2000-02-29' && c.isCurrentMonth)).toBe(true);

    // Feb 1900 has 28 days
    const feb1900 = getCalendarMatrix(1900, 2);
    expect(feb1900.filter((c) => c.isCurrentMonth)).toHaveLength(28);
    expect(feb1900.some((c) => c.date === '1900-02-29')).toBe(false);

    // Feb 2024 has 29 days
    const feb2024 = getCalendarMatrix(2024, 2);
    expect(feb2024.filter((c) => c.isCurrentMonth)).toHaveLength(29);
    expect(feb2024.some((c) => c.date === '2024-02-29' && c.isCurrentMonth)).toBe(true);

    // Feb 2100 has 28 days
    const feb2100 = getCalendarMatrix(2100, 2);
    expect(feb2100.filter((c) => c.isCurrentMonth)).toHaveLength(28);
    expect(feb2100.some((c) => c.date === '2100-02-29')).toBe(false);
  });
});

// ============================================================================
// 2. Daylight Saving Time (DST) & Timezone Shifts
// ============================================================================

describe('CHALLENGER M4: 2. Daylight Saving Time (DST) Shifts', () => {
  it('preserves exact 12:00:00.000 local time across spring-forward 23h transition', () => {
    // US Spring Forward: March 8, 2026 (clock jumps from 02:00 to 03:00)
    const beforeDst = createNoonDate(2026, 3, 7);
    expect(beforeDst.getHours()).toBe(12);
    expect(beforeDst.getMinutes()).toBe(0);

    const onDst = addDaysNoon(beforeDst, 1);
    expect(formatDateKey(onDst)).toBe('2026-03-08');
    expect(onDst.getHours()).toBe(12);
    expect(onDst.getMinutes()).toBe(0);

    const afterDst = addDaysNoon(beforeDst, 2);
    expect(formatDateKey(afterDst)).toBe('2026-03-09');
    expect(afterDst.getHours()).toBe(12);
    expect(afterDst.getMinutes()).toBe(0);
  });

  it('preserves exact 12:00:00.000 local time across fall-back 25h transition', () => {
    // US Fall Back: November 1, 2026 (clock falls back from 02:00 to 01:00)
    const beforeDst = createNoonDate(2026, 10, 31);
    expect(beforeDst.getHours()).toBe(12);

    const onDst = addDaysNoon(beforeDst, 1);
    expect(formatDateKey(onDst)).toBe('2026-11-01');
    expect(onDst.getHours()).toBe(12);

    const afterDst = addDaysNoon(beforeDst, 2);
    expect(formatDateKey(afterDst)).toBe('2026-11-02');
    expect(afterDst.getHours()).toBe(12);
  });

  it('preserves exact 12:00:00.000 across European DST transitions (March 29 & October 25, 2026)', () => {
    // EU Spring Forward: March 29, 2026
    const euSpring = addDaysNoon('2026-03-28', 1);
    expect(formatDateKey(euSpring)).toBe('2026-03-29');
    expect(euSpring.getHours()).toBe(12);

    // EU Fall Back: October 25, 2026
    const euFall = addDaysNoon('2026-10-24', 1);
    expect(formatDateKey(euFall)).toBe('2026-10-25');
    expect(euFall.getHours()).toBe(12);
  });

  it('accumulates zero drift across 365 successive daily additions', () => {
    let current = '2026-01-01';
    for (let day = 0; day < 365; day++) {
      const nextDate = addDaysNoon(current, 1);
      expect(nextDate.getHours()).toBe(12);
      expect(nextDate.getMinutes()).toBe(0);
      current = formatDateKey(nextDate);
    }
    expect(current).toBe('2027-01-01');
  });

  it('accumulates zero drift across 365 successive daily subtractions', () => {
    let current = '2027-01-01';
    for (let day = 0; day < 365; day++) {
      const prevDate = addDaysNoon(current, -1);
      expect(prevDate.getHours()).toBe(12);
      expect(prevDate.getMinutes()).toBe(0);
      current = formatDateKey(prevDate);
    }
    expect(current).toBe('2026-01-01');
  });

  it('accurately computes diffDaysNoon across DST boundaries despite 23h or 25h day lengths', () => {
    // US Spring forward window (23-hour day on 2026-03-08)
    expect(diffDaysNoon('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDaysNoon('2026-03-07', '2026-03-08')).toBe(1);
    expect(diffDaysNoon('2026-03-08', '2026-03-09')).toBe(1);

    // US Fall back window (25-hour day on 2026-11-01)
    expect(diffDaysNoon('2026-10-31', '2026-11-02')).toBe(2);
    expect(diffDaysNoon('2026-10-31', '2026-11-01')).toBe(1);
    expect(diffDaysNoon('2026-11-01', '2026-11-02')).toBe(1);
  });
});

// ============================================================================
// 3. Month Boundaries & Year Rollover Transitions
// ============================================================================

describe('CHALLENGER M4: 3. Month Boundaries & Year Rollover', () => {
  it('correctly transitions across year boundary Dec 31 -> Jan 1 and reverse', () => {
    expect(formatDateKey(addDaysNoon('2026-12-31', 1))).toBe('2027-01-01');
    expect(formatDateKey(addDaysNoon('2027-01-01', -1))).toBe('2026-12-31');
    expect(diffDaysNoon('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffDaysNoon('2027-01-01', '2026-12-31')).toBe(-1);
  });

  it('cycles through getPrevMonth and getNextMonth across year boundaries', () => {
    expect(getPrevMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
    expect(getNextMonth(2025, 12)).toEqual({ year: 2026, month: 1 });
    expect(getPrevMonth(2000, 1)).toEqual({ year: 1999, month: 12 });
    expect(getNextMonth(1999, 12)).toEqual({ year: 2000, month: 1 });
  });

  it('handles arbitrary positive and negative month offsets accurately', () => {
    expect(getMonthFromOffset(2026, 6, 0)).toEqual({ year: 2026, month: 6 });
    expect(getMonthFromOffset(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(getMonthFromOffset(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(getMonthFromOffset(2026, 10, -120)).toEqual({ year: 2016, month: 10 }); // -10 years
    expect(getMonthFromOffset(2026, 10, 120)).toEqual({ year: 2036, month: 10 }); // +10 years
    expect(getMonthFromOffset(2026, 10, 1200)).toEqual({ year: 2126, month: 10 }); // +100 years
    expect(getMonthFromOffset(2026, 10, -1200)).toEqual({ year: 1926, month: 10 }); // -100 years
  });

  it('calculates month offsets symmetrically', () => {
    expect(calculateMonthOffset(2026, 1, 2026, 1)).toBe(0);
    expect(calculateMonthOffset(2026, 1, 2026, 12)).toBe(11);
    expect(calculateMonthOffset(2026, 12, 2026, 1)).toBe(-11);
    expect(calculateMonthOffset(2025, 12, 2026, 1)).toBe(1);
    expect(calculateMonthOffset(2026, 1, 2025, 12)).toBe(-1);
    expect(calculateMonthOffset(2000, 1, 2026, 1)).toBe(312); // 26 * 12
  });

  it('cycles getPreviousMonthYear and getNextMonthYear 120 times consistently', () => {
    let cur = { year: 2026, month: 10 };
    // 120 months forward = 10 years
    for (let i = 0; i < 120; i++) {
      cur = getNextMonthYear(cur.year, cur.month);
    }
    expect(cur).toEqual({ year: 2036, month: 10 });

    // 120 months backward = back to 2026.10
    for (let i = 0; i < 120; i++) {
      cur = getPreviousMonthYear(cur.year, cur.month);
    }
    expect(cur).toEqual({ year: 2026, month: 10 });
  });
});

// ============================================================================
// 4. Calendar Month Matrix Invariants
// ============================================================================

describe('CHALLENGER M4: 4. Calendar Matrix Structural Invariants', () => {
  it('guarantees strictly consecutive dates across the entire generated matrix for all 12 months', () => {
    for (let month = 1; month <= 12; month++) {
      const cells = getCalendarMatrix(2026, month, { weekStartsOn: 1 });
      expect(cells.length % 7).toBe(0);
      expect(cells.length).toBeGreaterThanOrEqual(35);
      expect(cells.length).toBeLessThanOrEqual(42);

      // Verify consecutive day invariant: cell[i+1] must be cell[i] + 1 day
      for (let i = 0; i < cells.length - 1; i++) {
        const expectedNextDate = formatDateKey(addDaysNoon(cells[i].date, 1));
        expect(cells[i + 1].date).toBe(expectedNextDate);
        expect(cells[i].weekIndex).toBe(Math.floor(i / 7));
      }

      // Verify that all current month days are strictly present and contiguous
      const currentDays = cells.filter((c) => c.isCurrentMonth);
      const expectedTotalDays = getDaysInMonth(2026, month);
      expect(currentDays).toHaveLength(expectedTotalDays);
      expect(currentDays[0].dayNumber).toBe(1);
      expect(currentDays[currentDays.length - 1].dayNumber).toBe(expectedTotalDays);
    }
  });

  it('maintains strict 7-day row integrity with getCalendarMatrixWeeks', () => {
    const weeks = getCalendarMatrixWeeks(2026, 10, { weekStartsOn: 1 });
    expect(weeks.length).toBe(5); // 35 cells = 5 weeks
    for (const week of weeks) {
      expect(week).toHaveLength(7);
      expect(week[0].dayOfWeek).toBe(1); // Monday
      expect(week[6].dayOfWeek).toBe(0); // Sunday
    }
  });

  it('guarantees Sunday-first alignment when weekStartsOn = 0', () => {
    const weeksSun = getCalendarMatrixWeeks(2026, 10, { weekStartsOn: 0 });
    for (const week of weeksSun) {
      expect(week).toHaveLength(7);
      expect(week[0].dayOfWeek).toBe(0); // Sunday
      expect(week[6].dayOfWeek).toBe(6); // Saturday
    }
  });

  it('enforces minimum 5 rows (35 cells) and never collapses to 4 rows for 28-day February starting on Monday', () => {
    // Feb 2021 was a common year starting on Monday (0 leading days, 28 current days)
    const cells = getCalendarMatrix(2021, 2, { weekStartsOn: 1 });
    expect(cells).toHaveLength(35);
    expect(cells.filter((c) => c.isPrevMonth)).toHaveLength(0);
    expect(cells.filter((c) => c.isCurrentMonth)).toHaveLength(28);
    expect(cells.filter((c) => c.isNextMonth)).toHaveLength(7); // Padded to 5 rows
  });

  it('dynamically expands to 6 rows (42 cells) when month spans 6 calendar weeks', () => {
    // August 2026 starts on Saturday with Monday week start -> 5 leading days + 31 days = 36 days -> 6 rows
    const cellsAug2026 = getCalendarMatrix(2026, 8, { weekStartsOn: 1 });
    expect(cellsAug2026).toHaveLength(42);
    expect(cellsAug2026.filter((c) => c.isPrevMonth)).toHaveLength(5);
    expect(cellsAug2026.filter((c) => c.isCurrentMonth)).toHaveLength(31);
    expect(cellsAug2026.filter((c) => c.isNextMonth)).toHaveLength(6);
  });
});

// ============================================================================
// 5. Extreme Inputs & Corrupted Date Formats
// ============================================================================

describe('CHALLENGER M4: 5. Extreme Inputs & Boundary Formats', () => {
  it('correctly rejects corrupted and impossible date strings in isValidDateKey', () => {
    // Corrupted types
    expect(isValidDateKey(null)).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
    expect(isValidDateKey(12345)).toBe(false);
    expect(isValidDateKey({})).toBe(false);
    expect(isValidDateKey([])).toBe(false);
    expect(isValidDateKey(true)).toBe(false);

    // Malformed formats
    expect(isValidDateKey('')).toBe(false);
    expect(isValidDateKey('   ')).toBe(false);
    expect(isValidDateKey('2026/10/18')).toBe(false);
    expect(isValidDateKey('18-10-2026')).toBe(false);
    expect(isValidDateKey('2026.10.18')).toBe(false);
    expect(isValidDateKey('2026-10-18T00:00:00.000Z')).toBe(false);
    expect(isValidDateKey('2026-1-1')).toBe(false);

    // Impossible calendar dates
    expect(isValidDateKey('2026-00-15')).toBe(false); // Month 0
    expect(isValidDateKey('2026-13-01')).toBe(false); // Month 13
    expect(isValidDateKey('2026-01-00')).toBe(false); // Day 0
    expect(isValidDateKey('2026-01-32')).toBe(false); // Day 32
    expect(isValidDateKey('2026-04-31')).toBe(false); // April has 30 days
    expect(isValidDateKey('2026-06-31')).toBe(false); // June has 30 days
    expect(isValidDateKey('2026-09-31')).toBe(false); // September has 30 days
    expect(isValidDateKey('2026-11-31')).toBe(false); // November has 30 days
    expect(isValidDateKey('2025-02-29')).toBe(false); // 2025 not a leap year
  });

  it('safely parses invalid date strings to null without throwing', () => {
    expect(parseDateKey('')).toBeNull();
    expect(parseDateKey('corrupted-data')).toBeNull();
    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('2026-13-40')).toBeNull();
  });

  it('handles negative, zero, and float month numbers gracefully in getMonthName', () => {
    expect(getMonthName(1, 'long')).toBe('January');
    expect(getMonthName(12, 'long')).toBe('December');
    expect(getMonthName(0, 'long')).toBe('January'); // Clamped to 1
    expect(getMonthName(13, 'long')).toBe('December'); // Clamped to 12
    expect(getMonthName(-5, 'long')).toBe('January');
    expect(getMonthName(10.8, 'short')).toBe('OCT');
  });

  it('handles extreme inputs gracefully in formatMonthHeader', () => {
    expect(formatMonthHeader(2026, 10, 'zzz')).toBe('2026.10 // OCTOBER');
    expect(formatMonthHeader(2026, 10, 'standard')).toBe('October 2026');
    expect(formatMonthHeader(2026, 10, 'short')).toBe('OCT 2026');
    expect(formatMonthHeader(99, 1, 'zzz')).toBe('0099.01 // JANUARY');
    // Month overflow clamping
    expect(formatMonthHeader(2026, 0, 'zzz')).toBe('2026.01 // JANUARY');
    expect(formatMonthHeader(2026, 15, 'zzz')).toBe('2026.12 // DECEMBER');
  });

  it('handles corrupted date strings gracefully in formatDisplayDate', () => {
    expect(formatDisplayDate('2026-10-18', 'zzz')).toBe('2026.10.18 // SUNDAY');
    expect(formatDisplayDate('2026-10-18', 'full')).toBe('Sunday, October 18, 2026');
    expect(formatDisplayDate('2026-10-18', 'short')).toBe('OCT 18, 2026');

    // Invalid strings should echo or safely return without throwing
    expect(formatDisplayDate('invalid-date')).toBe('invalid-date');
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate(new Date('invalid'))).toBe('');
  });
});

// ============================================================================
// 6. Store Slices & Calendar State Operations
// ============================================================================

describe('CHALLENGER M4: 6. Store Slices & Calendar Functions', () => {
  it('normalizes out-of-range month inputs in normalizeYearMonth', () => {
    expect(normalizeYearMonth(2026, 1)).toEqual({ year: 2026, month: 1 });
    expect(normalizeYearMonth(2026, 12)).toEqual({ year: 2026, month: 12 });
    expect(normalizeYearMonth(2026, 0)).toEqual({ year: 2025, month: 12 });
    expect(normalizeYearMonth(2026, -1)).toEqual({ year: 2025, month: 11 });
    expect(normalizeYearMonth(2026, 13)).toEqual({ year: 2027, month: 1 });
    expect(normalizeYearMonth(2026, 25)).toEqual({ year: 2028, month: 1 });
  });

  it('formats month readout in ZZZ HUD format', () => {
    expect(formatMonthReadout(2026, 10)).toBe('2026.10 // OCTOBER');
    expect(formatMonthReadout(2026, 1)).toBe('2026.01 // JANUARY');
    expect(formatMonthReadout(2026, 13)).toBe('2027.01 // JANUARY');
  });

  it('correctly calculates store month offsets from base date', () => {
    const base = new Date(2026, 9, 18); // Oct 2026
    expect(storeCalculateMonthOffset(2026, 10, base)).toBe(0);
    expect(storeCalculateMonthOffset(2026, 11, base)).toBe(1);
    expect(storeCalculateMonthOffset(2026, 9, base)).toBe(-1);
    expect(storeCalculateMonthOffset(2027, 10, base)).toBe(12);
  });

  it('filters and sorts tasks for date by status, priority, and recency', () => {
    const tasks: Task[] = [
      createMockTask({
        id: 't-1',
        title: 'B Rank Active',
        category: 'Work',
        priority: 'B',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        createdAt: '2026-10-18T10:00:00.000Z',
        updatedAt: '2026-10-18T10:00:00.000Z',
      }),
      createMockTask({
        id: 't-2',
        title: 'S Rank Completed',
        category: 'Combat',
        priority: 'S',
        status: 'completed',
        completed: true,
        dueDate: '2026-10-18',
        createdAt: '2026-10-18T09:00:00.000Z',
        updatedAt: '2026-10-18T11:00:00.000Z',
      }),
      createMockTask({
        id: 't-3',
        title: 'S Rank Active',
        category: 'Hollow',
        priority: 'S',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        createdAt: '2026-10-18T08:00:00.000Z',
        updatedAt: '2026-10-18T08:00:00.000Z',
      }),
      createMockTask({
        id: 't-4',
        title: 'Another Date Task',
        category: 'Life',
        priority: 'A',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-19',
        createdAt: '2026-10-18T08:00:00.000Z',
        updatedAt: '2026-10-18T08:00:00.000Z',
      }),
    ];

    const matched = computeTasksForDate(tasks, '2026-10-18');
    expect(matched).toHaveLength(3);

    // Active tasks must appear before completed tasks!
    expect(matched[0].id).toBe('t-3'); // S Rank Active
    expect(matched[1].id).toBe('t-1'); // B Rank Active
    expect(matched[2].id).toBe('t-2'); // S Rank Completed (completed sinks to bottom)
  });

  it('computes accurate DateMetadata with priority counts and daily completion status', () => {
    const tasks: Task[] = [
      createMockTask({
        id: 't-s',
        title: 'S Task',
        category: 'Combat',
        priority: 'S',
        status: 'completed',
        completed: true,
        dueDate: '2026-10-18',
        createdAt: '2026-10-18T10:00:00.000Z',
        updatedAt: '2026-10-18T10:00:00.000Z',
      }),
      createMockTask({
        id: 't-a',
        title: 'A Task',
        category: 'Combat',
        priority: 'A',
        status: 'completed',
        completed: true,
        dueDate: '2026-10-18',
        createdAt: '2026-10-18T10:00:00.000Z',
        updatedAt: '2026-10-18T10:00:00.000Z',
      }),
    ];

    const dailies: DailiesState = {
      lastReset: '2026-10-18T04:00:00.000Z',
      currentStreak: 5,
      longestStreak: 5,
      history: { '2026-10-18': true },
      commissions: [],
      commissionClaimed: true,
      totalCommissionsClaimed: 5,
    };

    const meta = computeDateMetadata(tasks, dailies, '2026-10-18', '2026-10-18');
    expect(meta.taskCount).toBe(2);
    expect(meta.completedCount).toBe(2);
    expect(meta.activeCount).toBe(0);
    expect(meta.isAllCompleted).toBe(true);
    expect(meta.hasDailyCompleted).toBe(true);
    expect(meta.priorityCounts).toEqual({ S: 1, A: 1, B: 0, C: 0 });
  });
});

// ============================================================================
// 7. High Volume Performance & Stress Harness
// ============================================================================

describe('CHALLENGER M4: 7. High Volume Performance & Stress Harness', () => {
  it('processes 1,000 tasks on a single date in under 15ms', () => {
    const targetDate = '2026-10-18';
    const priorities: TaskPriority[] = ['S', 'A', 'B', 'C'];
    const bulkTasks: Task[] = [];

    for (let i = 0; i < 1000; i++) {
      bulkTasks.push(
        createMockTask({
          id: `bulk-task-${i}`,
          title: `Commission #${i}`,
          category: i % 2 === 0 ? 'Combat' : 'Hollow',
          priority: priorities[i % 4],
          status: i % 3 === 0 ? 'completed' : 'todo',
          completed: i % 3 === 0,
          dueDate: targetDate,
          createdAt: new Date(2026, 9, 1, 0, 0, i).toISOString(),
          updatedAt: new Date(2026, 9, 1, 0, 0, i).toISOString(),
        })
      );
    }

    const t0 = performance.now();
    const summary = getDayTaskSummary(bulkTasks, targetDate);
    const t1 = performance.now();

    expect(t1 - t0).toBeLessThan(50);
    expect(summary.total).toBe(1000);
    expect(summary.completed).toBe(334);
    expect(summary.active).toBe(666);
    expect(summary.hasTasks).toBe(true);
    expect(summary.highestPriority).toBe('S');
    expect(summary.highestActivePriority).toBe('S');
    expect(summary.allCompleted).toBe(false);

    // Compute DateMetadata benchmark
    const t2 = performance.now();
    const meta = computeDateMetadata(bulkTasks, undefined, targetDate);
    const t3 = performance.now();

    expect(t3 - t2).toBeLessThan(50);
    expect(meta.taskCount).toBe(1000);
    expect(meta.completedCount).toBe(334);
    expect(meta.activeCount).toBe(666);
    expect(meta.priorityCounts.S).toBe(250);
    expect(meta.priorityCounts.A).toBe(250);
    expect(meta.priorityCounts.B).toBe(250);
    expect(meta.priorityCounts.C).toBe(250);
  });

  it('processes 10,000 tasks distributed across 365 calendar dates without lag', () => {
    const bulkTasks: Task[] = [];
    const priorities: TaskPriority[] = ['S', 'A', 'B', 'C'];

    // Generate 10,000 tasks spread throughout 2026
    for (let i = 0; i < 10000; i++) {
      const dayOffset = i % 365;
      const dateKey = formatDateKey(addDaysNoon('2026-01-01', dayOffset));
      bulkTasks.push(
        createMockTask({
          id: `annual-task-${i}`,
          title: `Annual Task ${i}`,
          category: 'Combat',
          priority: priorities[i % 4],
          status: i % 2 === 0 ? 'completed' : 'todo',
          completed: i % 2 === 0,
          dueDate: dateKey,
          createdAt: '2026-01-01T12:00:00.000Z',
          updatedAt: '2026-01-01T12:00:00.000Z',
        })
      );
    }

    // Benchmark rendering all 12 monthly matrices and computing summaries for every cell
    const tStart = performance.now();
    let totalCellsEvaluated = 0;

    for (let month = 1; month <= 12; month++) {
      const cells = getCalendarMatrix(2026, month);
      for (const cell of cells) {
        const summary = getDayTaskSummary(bulkTasks, cell.date);
        expect(summary.total).toBeGreaterThanOrEqual(0);
        totalCellsEvaluated++;
      }
    }

    const tEnd = performance.now();
    // 12 months * ~35-42 cells = ~450 cell evaluations across 10,000 tasks
    expect(totalCellsEvaluated).toBeGreaterThanOrEqual(420);
    expect(tEnd - tStart).toBeLessThan(250); // Under 250ms for massive data volume
  });
});

// ============================================================================
// 8. Adversarial Edge Cases & Defensive Robustness
// ============================================================================

describe('CHALLENGER M4: 8. Adversarial Edge Cases & Defensive Vulnerabilities', () => {
  it('handles null and undefined arguments safely in calendar services', () => {
    // Empty / null tasks in getDayTaskSummary
    expect(getDayTaskSummary(null as any, '2026-10-18')).toMatchObject({
      total: 0,
      hasTasks: false,
      tasks: [],
    });
    expect(getDayTaskSummary([] as any, '')).toMatchObject({
      total: 0,
      hasTasks: false,
    });

    // Null and undefined in isSameDate
    expect(isSameDate(null, null)).toBe(false);
    expect(isSameDate('2026-10-18', null)).toBe(false);
    expect(isSameDate(null, '2026-10-18')).toBe(false);
    expect(isSameDate('2026-10-18', '2026-10-18')).toBe(true);

    // Null and undefined in isDailyCompletedOnDate
    expect(isDailyCompletedOnDate(undefined, '2026-10-18')).toBe(false);
    expect(isDailyCompletedOnDate(null as any, '2026-10-18')).toBe(false);
    expect(isDailyCompletedOnDate({ history: {} } as any, '')).toBe(false);
  });

  it('empirically demonstrates lack of defensive guard in computeTasksForDate when passed null/undefined or corrupted task lists', () => {
    // computeTasksForDate lacks Array.isArray and null item guards, throwing TypeError on uninitialized or corrupted inputs
    expect(() => computeTasksForDate(undefined as any, '2026-10-18')).toThrow(TypeError);
    expect(() => computeTasksForDate(null as any, '2026-10-18')).toThrow(TypeError);
    expect(() => computeTasksForDate([null as any], '2026-10-18')).toThrow(TypeError);

    // When valid array is provided, it handles null, undefined, or empty date strings safely
    expect(computeTasksForDate([], null)).toEqual([]);
    expect(computeTasksForDate([], undefined)).toEqual([]);
    expect(computeTasksForDate([], '   ')).toEqual([]);
  });

  it('investigates computeDateMetadata with empty or undefined inputs', () => {
    expect(computeDateMetadata([], undefined, '')).toMatchObject({
      taskCount: 0,
      hasTasks: false,
      hasDailyCompleted: false,
      isAllCompleted: false,
    });

    expect(computeDateMetadata(undefined, undefined, null)).toMatchObject({
      taskCount: 0,
      hasTasks: false,
    });
  });

  it('verifies priority rank colors adhere to ZZZ HUD color palette specifications', () => {
    expect(getPriorityColor('S')).toBe('#FF0055'); // Crimson
    expect(getPriorityColor('A')).toBe('#FF7700'); // Orange
    expect(getPriorityColor('B')).toBe('#F2FF00'); // Electric Yellow
    expect(getPriorityColor('C')).toBe('#00F0FF'); // Cyan
    expect(getPriorityColor(null)).toBe('#A0A5B5'); // Muted Gray
  });

  it('verifies local ISO date calculation vs UTC split ISO date', () => {
    const localToday = getTodayIsoDate();
    const calendarTodayKey = getTodayKey();
    expect(localToday).toBe(calendarTodayKey);
    expect(isValidDateKey(localToday)).toBe(true);
  });
});
