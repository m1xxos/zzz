/**
 * ZZZTasks Calendar Month Matrix Generator & Date Arithmetic Service
 *
 * Implements deterministic monthly matrix grids (5-6 week dynamic rows, 35 or 42 cells),
 * leap-year safe calculations, noon-pinned Date arithmetic (immune to DST 23h/25h shifts),
 * cassette-deck month navigation, ZZZ HUD display formatting, and task/daily status mapping.
 */

import { Task, TaskPriority, DailiesState } from '../types';

// ============================================================================
// Types & Contracts
// ============================================================================

export interface CalendarDayCell {
  /** ISO Date string: 'YYYY-MM-DD' */
  date: string;
  /** Day of the month: 1-31 */
  dayNumber: number;
  /** Month number: 1-12 */
  month: number;
  /** Full 4-digit year */
  year: number;
  /** Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
  dayOfWeek: number;
  /** True if this day belongs to the target month being displayed */
  isCurrentMonth: boolean;
  /** True if this day is leading padding from the previous month */
  isPrevMonth: boolean;
  /** True if this day is trailing padding to the next month */
  isNextMonth: boolean;
  /** True if date matches today's date (local system date) */
  isToday: boolean;
  /** True if day is Saturday or Sunday */
  isWeekend: boolean;
  /** 0-indexed row (week) index in the rendered grid (0 to 4 or 5) */
  weekIndex: number;
}

export interface CalendarMatrixOptions {
  /** First day of the week: 0 = Sunday, 1 = Monday. Defaults to 1 (Monday). */
  weekStartsOn?: 0 | 1;
  /**
   * If true, always outputs exactly 42 cells (6 rows).
   * If false (default), outputs 35 or 42 cells dynamically (5 or 6 rows) as needed.
   */
  fixedWeeks?: boolean;
  /**
   * Minimum number of weeks to generate (defaults to 5).
   * Ensures the grid never shrinks awkwardly to 4 rows for 28-day Februaries.
   */
  minWeeks?: number;
  /**
   * Reference date for computing `isToday`.
   * Accepts ISO string 'YYYY-MM-DD', Date object, or defaults to current system date.
   */
  today?: string | Date;
}

export interface MonthYear {
  year: number;
  month: number; // 1-12
}

export interface DayTaskSummary {
  date: string;
  total: number;
  completed: number;
  active: number;
  overdue: number;
  hasTasks: boolean;
  hasActiveTasks: boolean;
  hasOverdueTasks: boolean;
  allCompleted: boolean;
  highestPriority: TaskPriority | null;
  highestActivePriority: TaskPriority | null;
  tasks: Task[];
}

// ============================================================================
// 1. Noon-Pinned Date Construction & Arithmetic
// ============================================================================

/**
 * Creates a Date instance pinned strictly to 12:00:00.000 (noon) local time.
 *
 * Why noon?
 * In JavaScript, midnight (`00:00:00`) dates are vulnerable to Daylight Saving Time (DST)
 * transitions (23-hour spring-forward and 25-hour fall-back days), which can shift dates
 * into the previous or next day upon addition or subtraction.
 * By pinning hour to 12 (noon), even a +/- 1 hour DST shift leaves the clock at 11:00 or 13:00,
 * solidly within the exact intended calendar date.
 *
 * @param year Full year (e.g. 2026)
 * @param month 1-based month (1 = January, 12 = December)
 * @param day Day of the month (1-31)
 */
export function createNoonDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  // Guard against JS 2-digit year remapping (years 0..99 -> 1900..1999)
  if (year >= 0 && year < 100) {
    date.setFullYear(year);
  }
  return date;
}

/**
 * Adds or subtracts days from a given Date or ISO date string using noon-pinning.
 * Always re-pins to 12:00:00.000 to prevent multi-step drift across successive additions.
 */
export function addDaysNoon(date: Date | string, days: number): Date {
  let base: Date;
  if (typeof date === 'string') {
    const parsed = parseDateKey(date);
    base = parsed ? parsed : createNoonDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  } else {
    base = createNoonDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  base.setDate(base.getDate() + days);
  // Re-pin strictly to 12:00:00.000
  return createNoonDate(base.getFullYear(), base.getMonth() + 1, base.getDate());
}

/**
 * Computes the exact integer difference in days between two dates.
 * (date2 - date1)
 */
export function diffDaysNoon(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseDateKey(date1) : createNoonDate(date1.getFullYear(), date1.getMonth() + 1, date1.getDate());
  const d2 = typeof date2 === 'string' ? parseDateKey(date2) : createNoonDate(date2.getFullYear(), date2.getMonth() + 1, date2.getDate());

  if (!d1 || !d2) return 0;
  const msDiff = d2.getTime() - d1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// 2. Leap Year & Days In Month
// ============================================================================

/**
 * Determines whether a given year is a leap year according to the Gregorian calendar rules:
 * - A year is a leap year if divisible by 4,
 * - EXCEPT century years (divisible by 100), which are NOT leap years,
 * - UNLESS the century year is also divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year) || year <= 0) return false;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the exact number of calendar days in a given month (1-12) and year.
 * Deterministic lookup with leap-year February calculation.
 */
export function getDaysInMonth(year: number, month: number): number {
  const safeMonth = Math.floor(month);
  if (safeMonth === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (safeMonth === 4 || safeMonth === 6 || safeMonth === 9 || safeMonth === 11) {
    return 30;
  }
  if (safeMonth >= 1 && safeMonth <= 12) {
    return 31;
  }
  // Fallback to Date math if invalid month
  return new Date(year, safeMonth, 0, 12, 0, 0, 0).getDate();
}

// ============================================================================
// 3. Date Key Formatting & Parsing
// ============================================================================

/**
 * Formats a Date object into an ISO date key 'YYYY-MM-DD'.
 */
export function formatDateKey(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates whether a string is a strictly valid 'YYYY-MM-DD' calendar date.
 * Validates real calendar bounds (e.g. rejects 2025-02-29, 2026-13-01, 2026-04-31).
 */
export function isValidDateKey(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return false;

  return true;
}

/**
 * Parses an ISO 'YYYY-MM-DD' string into a noon-pinned Date instance.
 * Returns null if the string is not a valid calendar date.
 */
export function parseDateKey(dateStr: string): Date | null {
  if (!isValidDateKey(dateStr)) return null;
  const parts = dateStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return createNoonDate(year, month, day);
}

/**
 * Checks if two dates represent the same calendar day ('YYYY-MM-DD').
 */
export function isSameDate(
  d1: Date | string | null | undefined,
  d2: Date | string | null | undefined
): boolean {
  if (!d1 || !d2) return false;
  const str1 = typeof d1 === 'string' ? d1.trim() : formatDateKey(d1);
  const str2 = typeof d2 === 'string' ? d2.trim() : formatDateKey(d2);
  return str1 === str2;
}

/**
 * Returns today's ISO date string 'YYYY-MM-DD' in local time.
 */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

// ============================================================================
// 4. Month Navigation & Offset Calculations
// ============================================================================

/**
 * Returns the previous month and year tuple.
 * Properly wraps December <- January across year boundaries.
 */
export function getPrevMonth(year: number, month: number): MonthYear {
  if (month <= 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns the next month and year tuple.
 * Properly wraps December -> January across year boundaries.
 */
export function getNextMonth(year: number, month: number): MonthYear {
  if (month >= 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Returns the current month (1-12) and year based on the local system time or provided date.
 */
export function getCurrentMonthYear(now: Date = new Date()): MonthYear {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Calculates the target { year, month } given a base month and an integer month offset.
 * e.g., offset = +1 -> next month, offset = -1 -> previous month, offset = +14 -> +1 year, +2 months.
 */
export function getMonthFromOffset(baseYear: number, baseMonth: number, offset: number): MonthYear {
  const totalMonths = baseYear * 12 + (baseMonth - 1) + offset;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12 + 1;
  return { year, month };
}

/**
 * Calculates the integer month difference between a target month/year and a base month/year.
 */
export function calculateMonthOffset(
  baseYear: number,
  baseMonth: number,
  targetYear: number,
  targetMonth: number
): number {
  return (targetYear - baseYear) * 12 + (targetMonth - baseMonth);
}

// ============================================================================
// 5. Display Formatting
// ============================================================================

export const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_NAMES_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export const WEEKDAY_NAMES_MON = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export const WEEKDAY_NAMES_SUN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export const WEEKDAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Formats a month name in long or short style.
 * @param month 1-12
 */
export function getMonthName(month: number, format: 'long' | 'short' = 'long'): string {
  const index = Math.max(1, Math.min(12, Math.floor(month))) - 1;
  return format === 'long' ? MONTH_NAMES_LONG[index] : MONTH_NAMES_SHORT[index];
}

/**
 * Returns formatted weekday header abbreviations based on the starting day of the week.
 */
export function getWeekdayNames(weekStartsOn: 0 | 1 = 1): readonly string[] {
  return weekStartsOn === 1 ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN;
}

/**
 * Formats the calendar header string.
 *
 * Styles:
 * - 'zzz' (default): "2026.10 // OCTOBER"
 * - 'standard': "October 2026"
 * - 'short': "OCT 2026"
 */
export function formatMonthHeader(
  year: number,
  month: number,
  style: 'zzz' | 'standard' | 'short' = 'zzz'
): string {
  const safeMonth = Math.max(1, Math.min(12, Math.floor(month)));
  const yStr = String(year).padStart(4, '0');
  const mStr = String(safeMonth).padStart(2, '0');
  const longName = MONTH_NAMES_LONG[safeMonth - 1].toUpperCase();

  switch (style) {
    case 'standard':
      return `${MONTH_NAMES_LONG[safeMonth - 1]} ${yStr}`;
    case 'short':
      return `${MONTH_NAMES_SHORT[safeMonth - 1]} ${yStr}`;
    case 'zzz':
    default:
      return `${yStr}.${mStr} // ${longName}`;
  }
}

/**
 * Formats a date string 'YYYY-MM-DD' or Date object for display in the ZZZ HUD drawer or headers.
 * Styles:
 * - 'zzz': "2026.10.18 // SUNDAY"
 * - 'full': "Sunday, October 18, 2026"
 * - 'short': "Oct 18, 2026"
 */
export function formatDisplayDate(
  dateInput: string | Date,
  style: 'zzz' | 'full' | 'short' = 'zzz'
): string {
  const date = typeof dateInput === 'string' ? parseDateKey(dateInput) : dateInput;
  if (!date || isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayOfWeek = date.getDay();

  const yStr = String(y).padStart(4, '0');
  const mStr = String(m).padStart(2, '0');
  const dStr = String(d).padStart(2, '0');
  const weekdayName = WEEKDAY_NAMES_LONG[dayOfWeek].toUpperCase();

  switch (style) {
    case 'full':
      return `${WEEKDAY_NAMES_LONG[dayOfWeek]}, ${MONTH_NAMES_LONG[m - 1]} ${d}, ${y}`;
    case 'short':
      return `${MONTH_NAMES_SHORT[m - 1]} ${d}, ${y}`;
    case 'zzz':
    default:
      return `${yStr}.${mStr}.${dStr} // ${weekdayName}`;
  }
}

// ============================================================================
// 6. Calendar Month Matrix Generator
// ============================================================================

/**
 * Generates a complete array of `CalendarDayCell` objects representing a monthly calendar grid.
 *
 * Algorithm details:
 * - All date computations are strictly pinned to 12:00:00.000 noon, eliminating DST drift.
 * - Handles leading padding from the previous month to complete the first 7-day row.
 * - Adds all days of the current month.
 * - Handles trailing padding from the next month to complete the final 7-day row.
 * - Default dynamic rows (5 or 6 rows: 35 or 42 cells). Enforces minimum 5 rows (35 cells)
 *   so the grid never collapses awkwardly to 4 rows for 28-day Februaries.
 * - If `fixedWeeks: true`, always pads to exactly 42 cells (6 rows).
 *
 * @param year Full 4-digit year (e.g. 2026)
 * @param month 1-based month (1 = January, 12 = December)
 * @param options Matrix configuration options
 */
export function getCalendarMatrix(
  year: number,
  month: number,
  options: CalendarMatrixOptions = {}
): CalendarDayCell[] {
  const safeMonth = Math.max(1, Math.min(12, Math.floor(month)));
  const weekStartsOn: 0 | 1 = options.weekStartsOn ?? 1;
  const fixedWeeks = options.fixedWeeks ?? false;
  const minWeeks = options.minWeeks ?? 5;

  const todayStr = options.today
    ? typeof options.today === 'string'
      ? options.today.trim()
      : formatDateKey(options.today)
    : getTodayKey();

  const daysInCurrentMonth = getDaysInMonth(year, safeMonth);
  const firstDayOfMonth = createNoonDate(year, safeMonth, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Calculate leading days from previous month
  // If weekStartsOn === 1 (Monday): Monday is index 0 -> (firstDayOfWeek + 6) % 7
  // If weekStartsOn === 0 (Sunday): Sunday is index 0 -> firstDayOfWeek
  const leadingDaysCount =
    weekStartsOn === 1 ? (firstDayOfWeek + 6) % 7 : firstDayOfWeek;

  // Previous month parameters
  const prev = getPrevMonth(year, safeMonth);
  const daysInPrevMonth = getDaysInMonth(prev.year, prev.month);

  // Next month parameters
  const next = getNextMonth(year, safeMonth);

  // Determine total required cells
  const totalDaysNeeded = leadingDaysCount + daysInCurrentMonth;
  let totalWeeks = Math.ceil(totalDaysNeeded / 7);

  if (fixedWeeks) {
    totalWeeks = 6;
  } else if (totalWeeks < minWeeks) {
    totalWeeks = minWeeks;
  }

  const totalCells = totalWeeks * 7;
  const trailingDaysCount = totalCells - totalDaysNeeded;

  const cells: CalendarDayCell[] = [];

  // 1. Leading days from previous month
  for (let i = leadingDaysCount - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const noonDate = createNoonDate(prev.year, prev.month, dayNumber);
    const dateStr = formatDateKey(noonDate);
    const dayOfWeek = noonDate.getDay();

    cells.push({
      date: dateStr,
      dayNumber,
      month: prev.month,
      year: prev.year,
      dayOfWeek,
      isCurrentMonth: false,
      isPrevMonth: true,
      isNextMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      weekIndex: Math.floor(cells.length / 7),
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const noonDate = createNoonDate(year, safeMonth, day);
    const dateStr = formatDateKey(noonDate);
    const dayOfWeek = noonDate.getDay();

    cells.push({
      date: dateStr,
      dayNumber: day,
      month: safeMonth,
      year,
      dayOfWeek,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      weekIndex: Math.floor(cells.length / 7),
    });
  }

  // 3. Trailing days to next month
  for (let day = 1; day <= trailingDaysCount; day++) {
    const noonDate = createNoonDate(next.year, next.month, day);
    const dateStr = formatDateKey(noonDate);
    const dayOfWeek = noonDate.getDay();

    cells.push({
      date: dateStr,
      dayNumber: day,
      month: next.month,
      year: next.year,
      dayOfWeek,
      isCurrentMonth: false,
      isPrevMonth: false,
      isNextMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      weekIndex: Math.floor(cells.length / 7),
    });
  }

  return cells;
}

/**
 * Generates the calendar matrix grouped as a 2D array of weeks (rows of 7 cells).
 */
export function getCalendarMatrixWeeks(
  year: number,
  month: number,
  options: CalendarMatrixOptions = {}
): CalendarDayCell[][] {
  const flat = getCalendarMatrix(year, month, options);
  const weeks: CalendarDayCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}

// ============================================================================
// 7. Task & Daily Status Integration Helpers
// ============================================================================

/**
 * Priority rank weights for determining highest priority task on a date.
 */
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};

/**
 * Summarizes tasks scheduled on a given date key ('YYYY-MM-DD').
 * Accurately determines highest priority across all tasks, highest priority across active tasks,
 * completion counts, and overdue flags.
 */
export function getDayTaskSummary(
  tasks: Task[] = [],
  dateKey: string,
  todayKey: string = getTodayKey()
): DayTaskSummary {
  if (!Array.isArray(tasks) || !dateKey) {
    return {
      date: dateKey || '',
      total: 0,
      completed: 0,
      active: 0,
      overdue: 0,
      hasTasks: false,
      hasActiveTasks: false,
      hasOverdueTasks: false,
      allCompleted: false,
      highestPriority: null,
      highestActivePriority: null,
      tasks: [],
    };
  }

  const matches = tasks.filter((t) => t && t.dueDate === dateKey);
  let completed = 0;
  let active = 0;
  let overdue = 0;
  let highestPriority: TaskPriority | null = null;
  let highestActivePriority: TaskPriority | null = null;
  let highestWeight = 0;
  let highestActiveWeight = 0;

  for (const t of matches) {
    const weight = (t.priority && PRIORITY_WEIGHTS[t.priority]) || 0;

    if (weight > highestWeight) {
      highestWeight = weight;
      highestPriority = t.priority;
    }

    if (t.completed) {
      completed++;
    } else {
      active++;
      if (t.dueDate && t.dueDate < todayKey) {
        overdue++;
      }
      if (weight > highestActiveWeight) {
        highestActiveWeight = weight;
        highestActivePriority = t.priority;
      }
    }
  }

  const total = matches.length;
  return {
    date: dateKey,
    total,
    completed,
    active,
    overdue,
    hasTasks: total > 0,
    hasActiveTasks: active > 0,
    hasOverdueTasks: overdue > 0,
    allCompleted: total > 0 && completed === total,
    highestPriority,
    highestActivePriority,
    tasks: matches,
  };
}

/**
 * Checks whether daily commissions were claimed/completed on a given date key.
 * Accepts either a raw history map or a DailiesState object.
 */
export function isDailyCompletedOnDate(
  source: Record<string, boolean> | DailiesState | undefined,
  dateKey: string
): boolean {
  if (!source || !dateKey) {
    return false;
  }
  const history = 'history' in source ? source.history : source;
  if (!history || typeof history !== 'object') {
    return false;
  }
  return Boolean(history[dateKey]);
}

/**
 * Returns ZZZ accent color corresponding to priority rank.
 */
export function getPriorityColor(priority: TaskPriority | null): string {
  switch (priority) {
    case 'S':
      return '#FF0055'; // Neon Crimson
    case 'A':
      return '#FF7700'; // Electric Orange
    case 'B':
      return '#F2FF00'; // Electric Yellow
    case 'C':
      return '#00F0FF'; // Cyber Cyan
    default:
      return '#A0A5B5'; // Muted Gray
  }
}
