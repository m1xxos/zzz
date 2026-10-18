/**
 * Unit Tests for ZZZTasks Calendar Matrix & Date Calculations
 *
 * Verifies:
 * 1. 5-6 week dynamic grid sizing (35 or 42 cells, strict 7-day rows, no 28-cell collapse)
 * 2. Leap year handling (2024 29-day Feb vs 2025 28-day Feb, 400-year & 100-year century rules)
 * 3. Year boundary navigation (Dec -> Jan next year, Jan -> Dec previous year, arbitrary offsets)
 * 4. Noon-pinned Date arithmetic & DST resilience across spring-forward & fall-back transitions
 * 5. Formatting & validation helpers (ISO date parsing, ZZZ HUD header formatting, weekday names, display date)
 * 6. Task & Daily status summary integration (priority dots, completion mapping, active vs completed priority)
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
  getPrevMonth,
  getNextMonth,
  getCurrentMonthYear,
  getMonthFromOffset,
  calculateMonthOffset,
  formatMonthHeader,
  formatDisplayDate,
  getMonthName,
  getWeekdayNames,
  getDayTaskSummary,
  isDailyCompletedOnDate,
  getPriorityColor,
} from '../services/calendar';
import { Task, DailiesState } from '../types';

describe('Calendar Month Matrix Generator', () => {
  describe('Grid Sizing & Row Structure', () => {
    it('generates a 35-cell matrix (5 weeks) for October 2026 with Monday start', () => {
      // Oct 1, 2026 is Thursday. Monday start -> 3 leading days (Sep 28, 29, 30)
      // Oct has 31 days. 3 + 31 = 34 days -> 1 trailing day (Nov 1). Total = 35 cells.
      const cells = getCalendarMatrix(2026, 10, { weekStartsOn: 1 });

      expect(cells).toHaveLength(35);
      expect(cells.length % 7).toBe(0);

      // Check first leading cell
      expect(cells[0].date).toBe('2026-09-28');
      expect(cells[0].isCurrentMonth).toBe(false);
      expect(cells[0].isPrevMonth).toBe(true);
      expect(cells[0].dayOfWeek).toBe(1); // Monday

      // Check 1st of month
      const oct1 = cells.find((c) => c.date === '2026-10-01');
      expect(oct1).toBeDefined();
      expect(oct1?.isCurrentMonth).toBe(true);
      expect(oct1?.dayNumber).toBe(1);
      expect(oct1?.dayOfWeek).toBe(4); // Thursday

      // Check last of month
      const oct31 = cells.find((c) => c.date === '2026-10-31');
      expect(oct31).toBeDefined();
      expect(oct31?.isCurrentMonth).toBe(true);
      expect(oct31?.dayNumber).toBe(31);
      expect(oct31?.dayOfWeek).toBe(6); // Saturday

      // Check trailing padding cell
      expect(cells[34].date).toBe('2026-11-01');
      expect(cells[34].isCurrentMonth).toBe(false);
      expect(cells[34].isNextMonth).toBe(true);
      expect(cells[34].dayOfWeek).toBe(0); // Sunday
    });

    it('generates a 42-cell matrix (6 weeks) for months spanning across 6 calendar weeks', () => {
      // May 2021: May 1 was Saturday. Monday start -> Mon-Fri (5 leading days: Apr 26-30).
      // 5 leading + 31 days = 36 days. Exceeds 35 -> 42 cells (6 rows).
      const cells = getCalendarMatrix(2021, 5, { weekStartsOn: 1 });

      expect(cells).toHaveLength(42);
      expect(cells.length % 7).toBe(0);

      // First cell
      expect(cells[0].date).toBe('2021-04-26');
      expect(cells[0].isPrevMonth).toBe(true);

      // Trailing padding cells (Jun 1 to Jun 6)
      expect(cells[cells.length - 1].date).toBe('2021-06-06');
      expect(cells[cells.length - 1].isNextMonth).toBe(true);
    });

    it('generates a 42-cell matrix for August 2026 with Monday start', () => {
      // Aug 1, 2026 is Saturday -> 5 leading days. 5 + 31 = 36 -> 42 cells.
      const cells = getCalendarMatrix(2026, 8, { weekStartsOn: 1 });
      expect(cells).toHaveLength(42);
    });

    it('prevents 28-day February from collapsing into 4 rows by enforcing minimum 5 weeks (35 cells)', () => {
      // Feb 2021 was a common year starting on Monday (0 leading days, 28 current days).
      // Without minWeeks, 0 + 28 = 28 (4 rows), which looks broken in a standard calendar HUD.
      const cells = getCalendarMatrix(2021, 2, { weekStartsOn: 1 });

      expect(cells).toHaveLength(35);
      const currentMonthDays = cells.filter((c) => c.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(28);

      // Trailing padding must supply 7 days (March 1-7)
      const trailingDays = cells.filter((c) => c.isNextMonth);
      expect(trailingDays).toHaveLength(7);
      expect(trailingDays[0].date).toBe('2021-03-01');
      expect(trailingDays[6].date).toBe('2021-03-07');
    });

    it('honors fixedWeeks: true option to always return 42 cells', () => {
      // October 2026 normally fits in 35 cells
      const dynamicCells = getCalendarMatrix(2026, 10, { fixedWeeks: false });
      expect(dynamicCells).toHaveLength(35);

      const fixedCells = getCalendarMatrix(2026, 10, { fixedWeeks: true });
      expect(fixedCells).toHaveLength(42);
    });

    it('correctly handles Sunday start (weekStartsOn: 0)', () => {
      // Oct 1, 2026 is Thursday. Sunday start -> Sun, Mon, Tue, Wed (4 leading days: Sep 27-30)
      const cells = getCalendarMatrix(2026, 10, { weekStartsOn: 0 });
      expect(cells[0].date).toBe('2026-09-27');
      expect(cells[0].dayOfWeek).toBe(0); // Sunday
      expect(cells[3].date).toBe('2026-09-30');
      expect(cells[4].date).toBe('2026-10-01');
    });

    it('produces strictly consecutive days with zero gaps or duplicates across month boundaries', () => {
      const cells = getCalendarMatrix(2026, 10, { weekStartsOn: 1 });

      for (let i = 0; i < cells.length - 1; i++) {
        const curDate = parseDateKey(cells[i].date)!;
        const nextDate = parseDateKey(cells[i + 1].date)!;

        // Next day must be exactly 1 day after current day
        const diff = diffDaysNoon(curDate, nextDate);
        expect(diff).toBe(1);
      }
    });

    it('correctly marks isToday flag against reference date', () => {
      const cells = getCalendarMatrix(2026, 10, { today: '2026-10-18' });
      const todayCell = cells.find((c) => c.date === '2026-10-18');
      expect(todayCell).toBeDefined();
      expect(todayCell?.isToday).toBe(true);

      const otherCells = cells.filter((c) => c.date !== '2026-10-18');
      expect(otherCells.every((c) => !c.isToday)).toBe(true);
    });

    it('groups 2D matrix rows with getCalendarMatrixWeeks', () => {
      const weeks = getCalendarMatrixWeeks(2026, 10, { weekStartsOn: 1 });
      expect(weeks).toHaveLength(5);
      for (const row of weeks) {
        expect(row).toHaveLength(7);
      }
    });

    it('safely clamps month values outside 1-12 in getCalendarMatrix', () => {
      const cellsUnderflow = getCalendarMatrix(2026, 0);
      expect(cellsUnderflow[cellsUnderflow.length - 1].date.startsWith('2026-01') || cellsUnderflow[0].date.startsWith('2025-12')).toBe(true);

      const cellsOverflow = getCalendarMatrix(2026, 13);
      expect(cellsOverflow.some((c) => c.date.startsWith('2026-12'))).toBe(true);
    });
  });

  describe('Leap Year & Days In Month Rules', () => {
    it('accurately identifies 4-year leap cycles and century rules', () => {
      // Standard leap years
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2032)).toBe(true);

      // Common years
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);

      // Century divisible by 400 -> leap year
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2400)).toBe(true);

      // Century NOT divisible by 400 -> NOT leap year
      expect(isLeapYear(1900)).toBe(false);
      expect(isLeapYear(2100)).toBe(false);
      expect(isLeapYear(2200)).toBe(false);
      expect(isLeapYear(2300)).toBe(false);

      // Invalid inputs
      expect(isLeapYear(NaN)).toBe(false);
      expect(isLeapYear(-2024)).toBe(false);
    });

    it('returns exact days in February for leap vs common years', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(getDaysInMonth(2025, 2)).toBe(28);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2028, 2)).toBe(29);

      // Century rules
      expect(getDaysInMonth(2000, 2)).toBe(29);
      expect(getDaysInMonth(1900, 2)).toBe(28);
      expect(getDaysInMonth(2100, 2)).toBe(28);
    });

    it('returns correct days for all other months', () => {
      expect(getDaysInMonth(2026, 1)).toBe(31); // Jan
      expect(getDaysInMonth(2026, 3)).toBe(31); // Mar
      expect(getDaysInMonth(2026, 4)).toBe(30); // Apr
      expect(getDaysInMonth(2026, 5)).toBe(31); // May
      expect(getDaysInMonth(2026, 6)).toBe(30); // Jun
      expect(getDaysInMonth(2026, 7)).toBe(31); // Jul
      expect(getDaysInMonth(2026, 8)).toBe(31); // Aug
      expect(getDaysInMonth(2026, 9)).toBe(30); // Sep
      expect(getDaysInMonth(2026, 10)).toBe(31); // Oct
      expect(getDaysInMonth(2026, 11)).toBe(30); // Nov
      expect(getDaysInMonth(2026, 12)).toBe(31); // Dec
    });

    it('generates February 2024 matrix with 29 current month days including 2024-02-29', () => {
      const cells = getCalendarMatrix(2024, 2);
      const currentMonthDays = cells.filter((c) => c.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(29);

      const leapDay = cells.find((c) => c.date === '2024-02-29');
      expect(leapDay).toBeDefined();
      expect(leapDay?.dayNumber).toBe(29);
      expect(leapDay?.isCurrentMonth).toBe(true);
    });

    it('generates February 2000 matrix with 29 days (century leap rule)', () => {
      const cells = getCalendarMatrix(2000, 2);
      const currentMonthDays = cells.filter((c) => c.isCurrentMonth);
      expect(currentMonthDays).toHaveLength(29);
      expect(cells.some((c) => c.date === '2000-02-29')).toBe(true);
    });
  });

  describe('Month Boundary Navigation & Offset', () => {
    it('navigates previous month across year boundaries (Jan -> Dec prev year)', () => {
      const prev = getPrevMonth(2026, 1);
      expect(prev).toEqual({ year: 2025, month: 12 });
    });

    it('navigates next month across year boundaries (Dec -> Jan next year)', () => {
      const next = getNextMonth(2025, 12);
      expect(next).toEqual({ year: 2026, month: 1 });
    });

    it('navigates normal intermediate months', () => {
      expect(getPrevMonth(2026, 10)).toEqual({ year: 2026, month: 9 });
      expect(getNextMonth(2026, 10)).toEqual({ year: 2026, month: 11 });
    });

    it('retrieves current system month and year', () => {
      const now = new Date(2026, 9, 18); // Oct 18, 2026
      const result = getCurrentMonthYear(now);
      expect(result).toEqual({ year: 2026, month: 10 });
    });

    it('computes arbitrary month offsets accurately', () => {
      expect(getMonthFromOffset(2026, 10, 0)).toEqual({ year: 2026, month: 10 });
      expect(getMonthFromOffset(2026, 10, 1)).toEqual({ year: 2026, month: 11 });
      expect(getMonthFromOffset(2026, 10, 2)).toEqual({ year: 2026, month: 12 });
      expect(getMonthFromOffset(2026, 10, 3)).toEqual({ year: 2027, month: 1 });
      expect(getMonthFromOffset(2026, 10, 14)).toEqual({ year: 2027, month: 12 });
      expect(getMonthFromOffset(2026, 10, -1)).toEqual({ year: 2026, month: 9 });
      expect(getMonthFromOffset(2026, 10, -10)).toEqual({ year: 2025, month: 12 });
      expect(getMonthFromOffset(2026, 10, -22)).toEqual({ year: 2024, month: 12 });
      expect(getMonthFromOffset(2026, 10, -36)).toEqual({ year: 2023, month: 10 });
    });

    it('computes integer month difference with calculateMonthOffset', () => {
      expect(calculateMonthOffset(2026, 10, 2026, 10)).toBe(0);
      expect(calculateMonthOffset(2026, 10, 2026, 12)).toBe(2);
      expect(calculateMonthOffset(2026, 10, 2027, 1)).toBe(3);
      expect(calculateMonthOffset(2026, 10, 2025, 10)).toBe(-12);
    });
  });

  describe('Noon-Pinned Date Arithmetic & DST Resilience', () => {
    it('creates dates pinned strictly to 12:00:00.000 local time', () => {
      const date = createNoonDate(2026, 10, 18);
      expect(date.getHours()).toBe(12);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it('safely handles 2-digit years without 1900 remapping quirk', () => {
      const date = createNoonDate(99, 1, 1);
      expect(date.getFullYear()).toBe(99);
      expect(date.getHours()).toBe(12);
    });

    it('safely performs day addition across US Spring-Forward DST transition (March 2026)', () => {
      // US DST begins on second Sunday of March (March 8, 2026).
      // At 02:00 clocks advance to 03:00 (23-hour day).
      const dMarch7 = '2026-03-07';
      const dMarch8 = addDaysNoon(dMarch7, 1);
      expect(formatDateKey(dMarch8)).toBe('2026-03-08');
      expect(dMarch8.getHours()).toBe(12);

      const dMarch9 = addDaysNoon(dMarch8, 1);
      expect(formatDateKey(dMarch9)).toBe('2026-03-09');
      expect(dMarch9.getHours()).toBe(12);

      // Direct multi-day jump across the transition
      const dJump = addDaysNoon(dMarch7, 2);
      expect(formatDateKey(dJump)).toBe('2026-03-09');
      expect(diffDaysNoon(dMarch7, '2026-03-09')).toBe(2);
    });

    it('safely performs day addition across US Fall-Back DST transition (November 2026)', () => {
      // US DST ends on first Sunday of November (November 1, 2026).
      // Clocks repeat 01:00-02:00 (25-hour day).
      const dOct31 = '2026-10-31';
      const dNov1 = addDaysNoon(dOct31, 1);
      expect(formatDateKey(dNov1)).toBe('2026-11-01');
      expect(dNov1.getHours()).toBe(12);

      const dNov2 = addDaysNoon(dNov1, 1);
      expect(formatDateKey(dNov2)).toBe('2026-11-02');
      expect(dNov2.getHours()).toBe(12);

      expect(diffDaysNoon(dOct31, '2026-11-02')).toBe(2);
    });

    it('safely steps through European DST transitions (March 29 and October 25, 2026)', () => {
      // Spring forward: March 29, 2026
      const euSpring1 = addDaysNoon('2026-03-28', 1);
      expect(formatDateKey(euSpring1)).toBe('2026-03-29');
      const euSpring2 = addDaysNoon('2026-03-29', 1);
      expect(formatDateKey(euSpring2)).toBe('2026-03-30');

      // Fall back: October 25, 2026
      const euFall1 = addDaysNoon('2026-10-24', 1);
      expect(formatDateKey(euFall1)).toBe('2026-10-25');
      const euFall2 = addDaysNoon('2026-10-25', 1);
      expect(formatDateKey(euFall2)).toBe('2026-10-26');
    });

    it('prevents cumulative hour drift across 30 consecutive single-day additions', () => {
      let current = createNoonDate(2026, 3, 1); // March 1 (covers spring forward)
      for (let i = 0; i < 30; i++) {
        current = addDaysNoon(current, 1);
        expect(current.getHours()).toBe(12);
        expect(current.getMinutes()).toBe(0);
      }
      expect(formatDateKey(current)).toBe('2026-03-31');
    });

    it('computes exact day differences without fractional or rounding errors', () => {
      expect(diffDaysNoon('2026-01-01', '2026-01-01')).toBe(0);
      expect(diffDaysNoon('2026-01-01', '2026-01-02')).toBe(1);
      expect(diffDaysNoon('2026-01-02', '2026-01-01')).toBe(-1);
      expect(diffDaysNoon('2026-01-01', '2026-02-01')).toBe(31);
    });
  });

  describe('Formatting & Helper Functions', () => {
    it('formats ZZZ HUD month header, standard, and short headers', () => {
      expect(formatMonthHeader(2026, 10, 'zzz')).toBe('2026.10 // OCTOBER');
      expect(formatMonthHeader(2026, 10, 'standard')).toBe('October 2026');
      expect(formatMonthHeader(2026, 10, 'short')).toBe('OCT 2026');

      expect(formatMonthHeader(2027, 1, 'zzz')).toBe('2027.01 // JANUARY');
    });

    it('formats display dates in ZZZ HUD, full, and short styles with formatDisplayDate', () => {
      expect(formatDisplayDate('2026-10-18', 'zzz')).toBe('2026.10.18 // SUNDAY');
      expect(formatDisplayDate('2026-10-18', 'full')).toBe('Sunday, October 18, 2026');
      expect(formatDisplayDate('2026-10-18', 'short')).toBe('OCT 18, 2026');

      // Date object input
      const dateObj = createNoonDate(2026, 10, 18);
      expect(formatDisplayDate(dateObj, 'zzz')).toBe('2026.10.18 // SUNDAY');

      // Fallback for invalid input
      expect(formatDisplayDate('invalid-date')).toBe('invalid-date');
    });

    it('provides month names and weekday names correctly', () => {
      expect(getMonthName(1)).toBe('January');
      expect(getMonthName(10, 'long')).toBe('October');
      expect(getMonthName(10, 'short')).toBe('OCT');

      const monWeekdays = getWeekdayNames(1);
      expect(monWeekdays).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

      const sunWeekdays = getWeekdayNames(0);
      expect(sunWeekdays).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
    });

    it('validates ISO date keys strictly against calendar rules', () => {
      expect(isValidDateKey('2026-10-18')).toBe(true);
      expect(isValidDateKey('2024-02-29')).toBe(true); // leap year
      expect(isValidDateKey('2025-02-29')).toBe(false); // common year
      expect(isValidDateKey('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidDateKey('2026-13-01')).toBe(false); // invalid month
      expect(isValidDateKey('2026-00-10')).toBe(false);
      expect(isValidDateKey('2026-10-00')).toBe(false);
      expect(isValidDateKey('not-a-date')).toBe(false);
      expect(isValidDateKey('')).toBe(false);
      expect(isValidDateKey(null)).toBe(false);
    });

    it('parses and formats date keys without shifting', () => {
      const parsed = parseDateKey('2026-10-18');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9); // 0-based
      expect(parsed?.getDate()).toBe(18);

      const formatted = formatDateKey(parsed!);
      expect(formatted).toBe('2026-10-18');

      expect(parseDateKey('invalid-date')).toBeNull();
    });

    it('checks date equality correctly with isSameDate', () => {
      expect(isSameDate('2026-10-18', '2026-10-18')).toBe(true);
      expect(isSameDate('2026-10-18', '2026-10-19')).toBe(false);
      expect(isSameDate(new Date(2026, 9, 18), '2026-10-18')).toBe(true);
      expect(isSameDate(null, '2026-10-18')).toBe(false);
      expect(isSameDate(undefined, undefined)).toBe(false);
    });
  });

  describe('Task & Daily Status Integration', () => {
    const mockTasks: Task[] = [
      {
        id: 't-1',
        title: 'Task 1',
        description: '',
        category: 'Work',
        priority: 'B',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        tags: [],
        createdAt: '2026-10-18T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z',
        completedAt: null,
      },
      {
        id: 't-2',
        title: 'Task 2',
        description: '',
        category: 'Combat',
        priority: 'S',
        status: 'completed',
        completed: true,
        dueDate: '2026-10-18',
        tags: [],
        createdAt: '2026-10-18T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z',
        completedAt: '2026-10-18T05:00:00.000Z',
      },
      {
        id: 't-3',
        title: 'Task 3',
        description: '',
        category: 'Hollow',
        priority: 'A',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-15', // Past date
        tags: [],
        createdAt: '2026-10-15T00:00:00.000Z',
        updatedAt: '2026-10-15T00:00:00.000Z',
        completedAt: null,
      },
    ];

    it('summarizes tasks for a given date correctly with active vs overall priority', () => {
      const summary = getDayTaskSummary(mockTasks, '2026-10-18', '2026-10-18');
      expect(summary.total).toBe(2);
      expect(summary.completed).toBe(1);
      expect(summary.active).toBe(1);
      expect(summary.overdue).toBe(0);
      expect(summary.hasTasks).toBe(true);
      expect(summary.hasActiveTasks).toBe(true);
      expect(summary.allCompleted).toBe(false);
      expect(summary.highestPriority).toBe('S'); // S > B (overall)
      expect(summary.highestActivePriority).toBe('B'); // B is highest uncompleted

      const pastSummary = getDayTaskSummary(mockTasks, '2026-10-15', '2026-10-18');
      expect(pastSummary.total).toBe(1);
      expect(pastSummary.active).toBe(1);
      expect(pastSummary.overdue).toBe(1);
      expect(pastSummary.hasOverdueTasks).toBe(true);
      expect(pastSummary.highestPriority).toBe('A');
      expect(pastSummary.highestActivePriority).toBe('A');

      const emptySummary = getDayTaskSummary(mockTasks, '2026-10-25', '2026-10-18');
      expect(emptySummary.total).toBe(0);
      expect(emptySummary.hasTasks).toBe(false);
      expect(emptySummary.allCompleted).toBe(false);
      expect(emptySummary.highestPriority).toBeNull();
      expect(emptySummary.highestActivePriority).toBeNull();
    });

    it('correctly sets allCompleted flag when all scheduled tasks are done', () => {
      const allDoneTasks: Task[] = [
        {
          ...mockTasks[1],
          id: 'done-1',
          priority: 'A',
          dueDate: '2026-10-20',
          completed: true,
        },
      ];
      const summary = getDayTaskSummary(allDoneTasks, '2026-10-20', '2026-10-20');
      expect(summary.total).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.active).toBe(0);
      expect(summary.allCompleted).toBe(true);
      expect(summary.hasActiveTasks).toBe(false);
      expect(summary.highestActivePriority).toBeNull();
    });

    it('checks daily commission claim status in history map and DailiesState source', () => {
      const history = {
        '2026-10-17': true,
        '2026-10-18': true,
        '2026-10-19': false,
      };

      expect(isDailyCompletedOnDate(history, '2026-10-18')).toBe(true);
      expect(isDailyCompletedOnDate(history, '2026-10-17')).toBe(true);
      expect(isDailyCompletedOnDate(history, '2026-10-19')).toBe(false);
      expect(isDailyCompletedOnDate(history, '2026-10-20')).toBe(false);
      expect(isDailyCompletedOnDate(undefined, '2026-10-18')).toBe(false);

      // Support passing DailiesState directly
      const mockDailiesState: Partial<DailiesState> = {
        history: { '2026-10-18': true },
      };
      expect(isDailyCompletedOnDate(mockDailiesState as DailiesState, '2026-10-18')).toBe(true);
      expect(isDailyCompletedOnDate(mockDailiesState as DailiesState, '2026-10-19')).toBe(false);
    });

    it('returns appropriate ZZZ theme color for priority ranks', () => {
      expect(getPriorityColor('S')).toBe('#FF0055');
      expect(getPriorityColor('A')).toBe('#FF7700');
      expect(getPriorityColor('B')).toBe('#F2FF00');
      expect(getPriorityColor('C')).toBe('#00F0FF');
      expect(getPriorityColor(null)).toBe('#A0A5B5');
    });
  });
});
