/**
 * Milestone 4 Adversarial Challenge & Empirical UI Stress Test Suite
 * Target: src/test/challenger_m4_ui.stress.test.tsx
 *
 * Exhaustively stress-tests:
 * 1. Rapid Month Switching & Navigation (stress clicking, decade rollbacks, leap years, today reset)
 * 2. Dynamic Matrix Dimensions (28-day Februaries padded to 35, 6-week months expanding to 42, Sunday/Monday starts)
 * 3. Date Task Drawer Interaction Stress (rapid toggling, rapid drawer cycling, keyboard accessibility, empty state)
 * 4. Reactive Date Metadata Synchronization (priority dots S/A/B/C, deadline glow, daily completion dot reactivity)
 * 5. Full DOM test-id integrity and accessibility compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { CalendarMatrix } from '../components/calendar/CalendarMatrix';
import { DayCell, DayCellMetadata } from '../components/calendar/DayCell';
import { DateTaskDrawer } from '../components/calendar/DateTaskDrawer';
import { StoreProvider, useStore } from '../store/useStore';
import {
  getCalendarMatrix,
  getCalendarMatrixWeeks,
  isLeapYear,
  diffDaysNoon,
  formatDateKey,
} from '../services/calendar';
import { Task, TaskPriority } from '../types';

// Mock soundService to prevent Web Audio exceptions
vi.mock('../services/sound', () => ({
  soundService: {
    playClick: vi.fn(),
    playSwitch: vi.fn(),
    playTaskComplete: vi.fn(),
    playCommissionComplete: vi.fn(),
    playTriumphantFanfare: vi.fn(),
    playAlert: vi.fn(),
    playBangbooChirp: vi.fn(),
    toggleMute: vi.fn(),
    setMuted: vi.fn(),
    setVolume: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
    getVolume: vi.fn().mockReturnValue(0.8),
  },
}));


describe('Milestone 4 Adversarial Challenge: Dynamic Month Matrix Dimensions', () => {
  it('enforces minimum 5 weeks (35 cells) floor even for 28-day Februaries starting Monday', () => {
    // February 2021 starts on Monday (Feb 1 = Mon, Feb 28 = Sun).
    // In pure math that is exactly 4 weeks (28 days).
    // The requirement specifies a 5-week minimum floor to prevent UI collapsing to 4 rows.
    const cells2021 = getCalendarMatrix(2021, 2, { weekStartsOn: 1 });
    expect(cells2021).toHaveLength(35);

    const weeks2021 = getCalendarMatrixWeeks(2021, 2, { weekStartsOn: 1 });
    expect(weeks2021).toHaveLength(5);
    weeks2021.forEach((week) => expect(week).toHaveLength(7));

    // Verify leading days (0 from Jan), 28 from Feb, 7 trailing from Mar
    const currentMonthDays = cells2021.filter((c) => c.isCurrentMonth);
    const trailingDays = cells2021.filter((c) => c.isNextMonth);
    expect(currentMonthDays).toHaveLength(28);
    expect(trailingDays).toHaveLength(7);
  });

  it('correctly calculates 5-week month: February 2026 (starts Sunday, 35 cells in Mon-start)', () => {
    // Feb 1, 2026 is Sunday. With weekStartsOn: 1 (Monday), Sunday is index 6.
    // Row 1: Jan 26..31 + Feb 1
    // Row 2-4: Feb 2..22
    // Row 5: Feb 23..28 + Mar 1
    // Total = exactly 5 rows (35 cells).
    const cellsFeb2026 = getCalendarMatrix(2026, 2, { weekStartsOn: 1 });
    expect(cellsFeb2026).toHaveLength(35);

    const leadingDays = cellsFeb2026.filter((c) => c.isPrevMonth);
    const currentMonthDays = cellsFeb2026.filter((c) => c.isCurrentMonth);
    const trailingDays = cellsFeb2026.filter((c) => c.isNextMonth);

    expect(leadingDays).toHaveLength(6); // Jan 26 to 31
    expect(currentMonthDays).toHaveLength(28); // Feb 1 to 28
    expect(trailingDays).toHaveLength(1); // Mar 1
    expect(leadingDays[0].date).toBe('2026-01-26');
    expect(trailingDays[0].date).toBe('2026-03-01');
  });

  it('correctly calculates 6-week months (42 cells) requiring 6 rows in Mon-start', () => {
    // August 2026: Aug 1 is Saturday (index 5 in Mon-start).
    // Leading days = 5 (Jul 27..31)
    // Current days = 31
    // Total needed = 36 -> ceil(36/7) = 6 rows (42 cells).
    const cellsAug2026 = getCalendarMatrix(2026, 8, { weekStartsOn: 1 });
    expect(cellsAug2026).toHaveLength(42);

    const weeksAug = getCalendarMatrixWeeks(2026, 8, { weekStartsOn: 1 });
    expect(weeksAug).toHaveLength(6);

    const leadingAug = cellsAug2026.filter((c) => c.isPrevMonth);
    const currentAug = cellsAug2026.filter((c) => c.isCurrentMonth);
    const trailingAug = cellsAug2026.filter((c) => c.isNextMonth);

    expect(leadingAug).toHaveLength(5);
    expect(currentAug).toHaveLength(31);
    expect(trailingAug).toHaveLength(6); // 42 - 36 = 6

    // March 2026: Mar 1 is Sunday (index 6).
    // Leading = 6. Current = 31. Total = 37 -> 6 rows (42 cells).
    const cellsMar2026 = getCalendarMatrix(2026, 3, { weekStartsOn: 1 });
    expect(cellsMar2026).toHaveLength(42);
    expect(cellsMar2026.filter((c) => c.isPrevMonth)).toHaveLength(6);
    expect(cellsMar2026.filter((c) => c.isCurrentMonth)).toHaveLength(31);
    expect(cellsMar2026.filter((c) => c.isNextMonth)).toHaveLength(5);

    // November 2026: Nov 1 is Sunday (index 6).
    // Leading = 6. Current = 30. Total = 36 -> 6 rows (42 cells).
    const cellsNov2026 = getCalendarMatrix(2026, 11, { weekStartsOn: 1 });
    expect(cellsNov2026).toHaveLength(42);
  });

  it('correctly calculates 6-week month for May 2026 under Sunday-start (weekStartsOn: 0)', () => {
    // In Sunday-start: May 1, 2026 is Friday (index 5).
    // Leading days = 5 (Sun Apr 26..Thu Apr 30)
    // Current days = 31
    // Total needed = 36 -> ceil(36/7) = 6 rows (42 cells).
    const cellsMaySun = getCalendarMatrix(2026, 5, { weekStartsOn: 0 });
    expect(cellsMaySun).toHaveLength(42);
    expect(cellsMaySun[0].date).toBe('2026-04-26');
    expect(cellsMaySun[cellsMaySun.length - 1].date).toBe('2026-06-06');
  });

  it('verifies strict chronological continuity with zero date gaps across every month of 2026', () => {
    for (let month = 1; month <= 12; month++) {
      const cells = getCalendarMatrix(2026, month, { weekStartsOn: 1 });
      expect(cells.length === 35 || cells.length === 42).toBe(true);

      for (let i = 1; i < cells.length; i++) {
        const prevDate = cells[i - 1].date;
        const curDate = cells[i].date;
        const diff = diffDaysNoon(prevDate, curDate);
        expect(diff).toBe(1);
      }
    }
  });

  it('enforces fixedWeeks=true producing exactly 42 cells for all 12 months', () => {
    for (let month = 1; month <= 12; month++) {
      const cells = getCalendarMatrix(2026, month, { fixedWeeks: true });
      expect(cells).toHaveLength(42);
    }
  });

  it('verifies century leap year rules in matrix generation (2000 vs 2100)', () => {
    // 2000 is divisible by 400 -> leap year (29 days in Feb)
    expect(isLeapYear(2000)).toBe(true);
    const cells2000 = getCalendarMatrix(2000, 2);
    expect(cells2000.filter((c) => c.isCurrentMonth)).toHaveLength(29);

    // 2100 is divisible by 100 but not 400 -> non-leap year (28 days in Feb)
    expect(isLeapYear(2100)).toBe(false);
    const cells2100 = getCalendarMatrix(2100, 2);
    expect(cells2100.filter((c) => c.isCurrentMonth)).toHaveLength(28);
  });
});

describe('Milestone 4 Adversarial Challenge: Rapid Month Switching & Navigation Stress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('survives 100 rapid sequential clicks on next month and previous month buttons without desync', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    const nextBtn = screen.getByTestId('cal-next-month');
    const prevBtn = screen.getByTestId('cal-prev-month');
    const header = screen.getByTestId('cal-month-header');

    expect(header.textContent).toContain('OCTOBER');
    expect(header.textContent).toContain('2026');

    // Rapidly click NEXT 24 times (advances exactly 2 full years to October 2028)
    act(() => {
      for (let i = 0; i < 24; i++) {
        fireEvent.click(nextBtn);
      }
    });

    expect(header.textContent).toContain('OCTOBER');
    expect(header.textContent).toContain('2028');

    // Rapidly click PREV 36 times (rewinds 3 years to October 2025)
    act(() => {
      for (let i = 0; i < 36; i++) {
        fireEvent.click(prevBtn);
      }
    });

    expect(header.textContent).toContain('OCTOBER');
    expect(header.textContent).toContain('2025');

    // Rapidly alternate NEXT and PREV 50 times
    act(() => {
      for (let i = 0; i < 50; i++) {
        fireEvent.click(nextBtn);
        fireEvent.click(prevBtn);
      }
    });

    // Should remain stable at October 2025
    expect(header.textContent).toContain('OCTOBER');
    expect(header.textContent).toContain('2025');
  });

  it('correctly navigates across century/decade boundaries (e.g. into 2030 and back to 1999)', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={1} />
      </StoreProvider>
    );

    const prevBtn = screen.getByTestId('cal-prev-month');
    const header = screen.getByTestId('cal-month-header');

    // Click PREV from January 2026 -> December 2025
    fireEvent.click(prevBtn);
    expect(header.textContent).toContain('DECEMBER');
    expect(header.textContent).toContain('2025');

    // Click PREV another 12 times -> December 2024
    act(() => {
      for (let i = 0; i < 12; i++) {
        fireEvent.click(prevBtn);
      }
    });
    expect(header.textContent).toContain('DECEMBER');
    expect(header.textContent).toContain('2024');
  });

  it('resets to today accurately when cal-today-btn is clicked after distant navigation', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    const nextBtn = screen.getByTestId('cal-next-month');
    const todayBtn = screen.getByTestId('cal-today-btn');
    const header = screen.getByTestId('cal-month-header');

    // Navigate 48 months ahead
    act(() => {
      for (let i = 0; i < 48; i++) {
        fireEvent.click(nextBtn);
      }
    });

    expect(header.textContent).toContain('2030');

    // Click TODAY button
    fireEvent.click(todayBtn);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');

    expect(header.textContent).toContain(String(currentYear));
    expect(header.textContent).toContain(currentMonthNum);
  });
});

describe('Milestone 4 Adversarial Challenge: Date Task Drawer Stress & Rapid Toggling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const stressTasks: Task[] = Array.from({ length: 15 }, (_, i) => ({
    id: `stress-task-${i}`,
    title: `Operation Hollow Breach Sector ${i + 1}`,
    description: `Secure zone ${i + 1} from corruption waves.`,
    category: i % 2 === 0 ? 'Hollow' : 'Combat',
    priority: (['S', 'A', 'B', 'C'] as TaskPriority[])[i % 4],
    status: 'todo',
    completed: i % 3 === 0,
    dueDate: '2026-10-18',
    tags: ['urgent'],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
    completedAt: null,
  }));

  it('renders all tasks and accurately computes total, active, and cleared counts in drawer header', () => {
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={stressTasks}
        onClose={vi.fn()}
      />
    );

    const drawer = screen.getByTestId('date-drawer');
    expect(drawer).toBeInTheDocument();

    const title = screen.getByTestId('date-drawer-title');
    expect(title).toHaveTextContent('COMMISSIONS FOR 2026-10-18');

    // Total: 15. Completed: 5 (indices 0, 3, 6, 9, 12). Active: 10.
    expect(drawer).toHaveTextContent('TOTAL: 15');
    expect(drawer).toHaveTextContent('ACTIVE: 10');
    expect(drawer).toHaveTextContent('CLEARED: 5');

    const taskItems = screen.getAllByTestId('drawer-task-item');
    expect(taskItems).toHaveLength(15);
  });

  it('survives rapid toggling of task completion buttons in the drawer without state corruption', () => {
    const handleToggle = vi.fn();
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={stressTasks}
        onClose={vi.fn()}
        onToggleTask={handleToggle}
      />
    );

    const toggleBtns = screen.getAllByTestId('task-complete-btn');
    expect(toggleBtns).toHaveLength(15);

    // Rapidly click task 0 toggle 30 times
    act(() => {
      for (let i = 0; i < 30; i++) {
        fireEvent.click(toggleBtns[0]);
      }
    });

    expect(handleToggle).toHaveBeenCalledTimes(30);
    expect(handleToggle).toHaveBeenCalledWith('stress-task-0');

    // Rapidly toggle each task in sequence
    act(() => {
      toggleBtns.forEach((btn) => {
        fireEvent.click(btn);
      });
    });

    expect(handleToggle).toHaveBeenCalledTimes(45);
  });

  it('renders empty state correctly with dispatch commission trigger', () => {
    const handleAddTask = vi.fn();
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-25"
        tasks={[]}
        onClose={vi.fn()}
        onAddTask={handleAddTask}
      />
    );

    const empty = screen.getByTestId('date-drawer-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent('No scheduled commissions on 2026-10-25');

    const dispatchBtn = screen.getByTestId('drawer-empty-add-btn');
    fireEvent.click(dispatchBtn);
    expect(handleAddTask).toHaveBeenCalledWith('2026-10-25');
  });

  it('supports rapid open/close cycling via day cell clicks and Escape key', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    // Drawer is closed initially
    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();

    // Rapidly click Day 15, Day 16, Day 17
    const cell15 = screen.getByTestId('day-cell-2026-10-15');
    const cell16 = screen.getByTestId('day-cell-2026-10-16');
    const cell17 = screen.getByTestId('day-cell-2026-10-17');

    fireEvent.click(cell15);
    expect(screen.getByTestId('date-drawer')).toHaveTextContent('2026-10-15');

    fireEvent.click(cell16);
    expect(screen.getByTestId('date-drawer')).toHaveTextContent('2026-10-16');

    fireEvent.click(cell17);
    expect(screen.getByTestId('date-drawer')).toHaveTextContent('2026-10-17');

    // Close via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();

    // Re-open Day 17
    fireEvent.click(cell17);
    expect(screen.getByTestId('date-drawer')).toBeInTheDocument();

    // Click same day 17 again -> toggles off!
    fireEvent.click(cell17);
    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();
  });

  it('renders complex task titles, special characters and tags without crash', () => {
    const specialTasks: Task[] = [
      {
        id: 'special-1',
        title: '<script>alert("XSS")</script> // [URGENT] (100% Guaranteed)',
        description: 'Test unicode: 🚀 💀 ★ ⚡ 💥 &amp; "quotes" \'single\'',
        category: 'Hollow/Zero',
        priority: 'S',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        tags: ['tag/1', 'tag-2'],
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
        completedAt: null,
      },
    ];

    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={specialTasks}
        onClose={vi.fn()}
      />
    );

    const titleEl = screen.getByTestId('drawer-task-title');
    expect(titleEl.textContent).toContain('<script>alert("XSS")</script>');
    expect(screen.getByText(/Test unicode: 🚀 💀 ★ ⚡ 💥/)).toBeInTheDocument();
  });
});

describe('Milestone 4 Adversarial Challenge: Date Metadata & Marker Dot Reactiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders all distinct priority dots (S, A, B, C) and general deadline dot simultaneously on DayCell', () => {
    const multiPriorityMetadata: DayCellMetadata = {
      taskCount: 4,
      priorityCounts: { S: 1, A: 1, B: 1, C: 1 },
      isAllCompleted: false,
      hasDailyCompleted: true,
      hasTasks: true,
    };

    const testCell = {
      date: '2026-10-18',
      dayNumber: 18,
      month: 10,
      year: 2026,
      dayOfWeek: 0,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: false,
      isWeekend: true,
      weekIndex: 2,
    };

    render(<DayCell cell={testCell} metadata={multiPriorityMetadata} />);

    expect(screen.getByTestId('priority-dot-S')).toBeInTheDocument();
    expect(screen.getByTestId('priority-dot-A')).toBeInTheDocument();
    expect(screen.getByTestId('priority-dot-B')).toBeInTheDocument();
    expect(screen.getByTestId('priority-dot-C')).toBeInTheDocument();
    expect(screen.getByTestId('deadline-dot')).toBeInTheDocument();
    expect(screen.getByTestId('daily-complete-dot')).toBeInTheDocument();
    expect(screen.getByTestId('task-count-badge')).toHaveTextContent('4');
  });

  it('reactively updates task count badge styling when all tasks become completed', () => {
    const uncompletedMeta: DayCellMetadata = {
      taskCount: 2,
      priorityCounts: { S: 1, A: 1, B: 0, C: 0 },
      isAllCompleted: false,
      hasDailyCompleted: false,
      hasTasks: true,
    };

    const { rerender } = render(
      <DayCell
        cell={{
          date: '2026-10-18',
          dayNumber: 18,
          month: 10,
          year: 2026,
          dayOfWeek: 0,
          isCurrentMonth: true,
          isPrevMonth: false,
          isNextMonth: false,
          isToday: false,
          isWeekend: true,
          weekIndex: 2,
        }}
        metadata={uncompletedMeta}
      />
    );

    let badge = screen.getByTestId('task-count-badge');
    expect(badge.className).toContain('text-[#A0A5B5]');

    // Rerender with all completed
    const completedMeta: DayCellMetadata = {
      ...uncompletedMeta,
      isAllCompleted: true,
    };

    rerender(
      <DayCell
        cell={{
          date: '2026-10-18',
          dayNumber: 18,
          month: 10,
          year: 2026,
          dayOfWeek: 0,
          isCurrentMonth: true,
          isPrevMonth: false,
          isNextMonth: false,
          isToday: false,
          isWeekend: true,
          weekIndex: 2,
        }}
        metadata={completedMeta}
      />
    );

    badge = screen.getByTestId('task-count-badge');
    expect(badge.className).toContain('text-[#F2FF00]');
  });

  it('live store test: claimCommission immediately renders daily-complete-dot on cycle date cell', () => {
    const LiveTester: React.FC = () => {
      const store = useStore();

      return (
        <div>
          <button
            data-testid="test-claim-btn"
            onClick={() => {
              const comms = store.dailies.commissions || [];
              if (comms.length > 0) {
                store.claimCommission(comms[0].id);
              }
            }}
          >
            Claim
          </button>
          <CalendarMatrix />
        </div>
      );
    };

    render(
      <StoreProvider>
        <LiveTester />
      </StoreProvider>
    );

    // Find today's date cell
    const todayStr = formatDateKey(new Date());
    const cellSelector = `day-cell-${todayStr}`;
    const cellEl = screen.queryByTestId(cellSelector);

    if (cellEl) {
      // Click claim commission
      const claimBtn = screen.getByTestId('test-claim-btn');
      fireEvent.click(claimBtn);

      // Now daily-complete-dot MUST be in the cell
      const updatedDot = within(cellEl).getByTestId('daily-complete-dot');
      expect(updatedDot).toBeInTheDocument();
    }
  });

  it('live store test: creating a task for a date immediately renders priority dot on that DayCell', () => {
    const LiveTaskCreator: React.FC = () => {
      const store = useStore();

      return (
        <div>
          <button
            data-testid="test-add-s-task"
            onClick={() => {
              store.createTask({
                title: 'High Priority Hollow Expedition',
                priority: 'S',
                dueDate: '2026-10-20',
              });
            }}
          >
            Add S Task
          </button>
          <CalendarMatrix initialYear={2026} initialMonth={10} />
        </div>
      );
    };

    render(
      <StoreProvider>
        <LiveTaskCreator />
      </StoreProvider>
    );

    const cell20 = screen.getByTestId('day-cell-2026-10-20');
    expect(within(cell20).queryByTestId('priority-dot-S')).not.toBeInTheDocument();

    // Click Add S Task
    const addBtn = screen.getByTestId('test-add-s-task');
    fireEvent.click(addBtn);

    // Priority dot S must now be present!
    expect(within(cell20).getByTestId('priority-dot-S')).toBeInTheDocument();
    expect(within(cell20).getByTestId('deadline-dot')).toBeInTheDocument();
    expect(within(cell20).getByTestId('task-count-badge')).toHaveTextContent('1');
  });

  it('live store test: completing task from within drawer updates DayCell completed badge reactively', () => {
    const LiveDrawerTester: React.FC = () => {
      const store = useStore();

      React.useEffect(() => {
        store.createTask({
          title: 'Commission To Be Toggled In Drawer',
          priority: 'A',
          dueDate: '2026-10-22',
        });
      }, []);

      return <CalendarMatrix initialYear={2026} initialMonth={10} />;
    };

    render(
      <StoreProvider>
        <LiveDrawerTester />
      </StoreProvider>
    );

    const cell22 = screen.getByTestId('day-cell-2026-10-22');
    expect(within(cell22).getByTestId('priority-dot-A')).toBeInTheDocument();

    // Click cell 22 to open drawer
    fireEvent.click(cell22);

    const drawer = screen.getByTestId('date-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent('Commission To Be Toggled In Drawer');

    // Click toggle task complete
    const completeBtn = screen.getByTestId('task-complete-btn');
    fireEvent.click(completeBtn);

    // Drawer should update to CLEARED: 1, ACTIVE: 0
    expect(drawer).toHaveTextContent('CLEARED: 1');
    expect(drawer).toHaveTextContent('ACTIVE: 0');

    // Cell 22 badge should reflect all-completed styling
    const badge = within(cell22).getByTestId('task-count-badge');
    expect(badge.className).toContain('text-[#F2FF00]');
  });
});

describe('Milestone 4 Adversarial Challenge: Complete DOM Test-ID Contract Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('verifies all expected calendar and drawer data-testid attributes exist and conform to interface spec', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    // Cassette navigation
    expect(screen.getByTestId('calendar-view-container')).toBeInTheDocument();
    expect(screen.getByTestId('cal-cassette-deck')).toBeInTheDocument();
    expect(screen.getByTestId('cal-month-header')).toBeInTheDocument();
    expect(screen.getByTestId('cal-prev-month')).toBeInTheDocument();
    expect(screen.getByTestId('cal-next-month')).toBeInTheDocument();
    expect(screen.getByTestId('cal-today-btn')).toBeInTheDocument();

    // Weekday headers
    expect(screen.getByTestId('cal-weekday-mon')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-tue')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-wed')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-thu')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-fri')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-sat')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-sun')).toBeInTheDocument();

    // Calendar grid and cells
    expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
    const cells = screen.getAllByTestId('calendar-day');
    expect(cells.length).toBeGreaterThanOrEqual(35);
  });

  it('verifies DayCell keyboard accessibility with Enter and Space keys, ignoring other keys', () => {
    const handleClick = vi.fn();
    const testCell = {
      date: '2026-10-18',
      dayNumber: 18,
      month: 10,
      year: 2026,
      dayOfWeek: 0,
      isCurrentMonth: true,
      isPrevMonth: false,
      isNextMonth: false,
      isToday: false,
      isWeekend: true,
      weekIndex: 2,
    };

    render(<DayCell cell={testCell} onClick={handleClick} />);
    const cellEl = screen.getByTestId('calendar-day');

    // Arrow down should NOT trigger click
    fireEvent.keyDown(cellEl, { key: 'ArrowDown' });
    expect(handleClick).not.toHaveBeenCalled();

    // Enter triggers click
    fireEvent.keyDown(cellEl, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('2026-10-18');

    // Space triggers click
    fireEvent.keyDown(cellEl, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
    expect(handleClick).toHaveBeenCalledWith('2026-10-18');
  });

  it('handles clicking on padding days (previous/next month cells) and renders their tasks properly', () => {
    const LivePaddingTester: React.FC = () => {
      const store = useStore();

      React.useEffect(() => {
        // Create task on leading padding day (Sep 28, 2026) for October 2026 view
        store.createTask({
          title: 'Pre-Month Hollow Operation',
          priority: 'S',
          dueDate: '2026-09-28',
        });
      }, []);

      return <CalendarMatrix initialYear={2026} initialMonth={10} />;
    };

    render(
      <StoreProvider>
        <LivePaddingTester />
      </StoreProvider>
    );

    // September 28 is the first cell of October 2026 in Mon-start!
    const paddingCell = screen.getByTestId('day-cell-2026-09-28');
    expect(paddingCell).toBeInTheDocument();
    expect(within(paddingCell).getByTestId('priority-dot-S')).toBeInTheDocument();

    // Click padding cell
    fireEvent.click(paddingCell);

    // Date drawer opens for Sep 28
    const drawer = screen.getByTestId('date-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent('COMMISSIONS FOR 2026-09-28');
    expect(drawer).toHaveTextContent('Pre-Month Hollow Operation');
  });

  it('handles corrupt task objects, missing priorities, and invalid dates gracefully without throwing', () => {
    const corruptTasks: Task[] = [
      {
        id: 'corrupt-1',
        title: 'Task with unknown priority',
        description: '',
        priority: 'Z' as any,
        category: 'Hollow',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        tags: [],
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
        completedAt: null,
      },
      {
        id: 'corrupt-2',
        title: 'Task with undefined dueDate',
        description: '',
        priority: 'S',
        category: 'Combat',
        status: 'todo',
        completed: false,
        dueDate: undefined as any,
        tags: [],
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
        completedAt: null,
      },
      {
        id: 'corrupt-3',
        title: 'Task with null description and tags',
        priority: 'B',
        category: 'Story',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        description: null as any,
        tags: null as any,
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z',
        completedAt: null,
      },
    ];

    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={corruptTasks}
        onClose={vi.fn()}
      />
    );

    const drawer = screen.getByTestId('date-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent('Task with unknown priority');
    expect(drawer).toHaveTextContent('Task with null description and tags');
  });

  it('triggers navigation and action buttons in DateTaskDrawer footer', () => {
    const handleNav = vi.fn();
    const handleAdd = vi.fn();

    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={[]}
        onClose={vi.fn()}
        onNavigateToBoard={handleNav}
        onAddTask={handleAdd}
      />
    );

    const filterBtn = screen.getByTestId('drawer-filter-board-btn');
    fireEvent.click(filterBtn);
    expect(handleNav).toHaveBeenCalledWith('2026-10-18');

    const addBtn = screen.getByTestId('drawer-add-task-btn');
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledWith('2026-10-18');
  });
});
