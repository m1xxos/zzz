import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayCell, DayCellMetadata } from '../components/calendar/DayCell';
import { DateTaskDrawer } from '../components/calendar/DateTaskDrawer';
import { CalendarMatrix } from '../components/calendar/CalendarMatrix';
import { StoreProvider } from '../store/useStore';
import { Task } from '../types';
import { CalendarDayCell } from '../services/calendar';

// Mock soundService to prevent Web Audio exceptions in test runner
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

const mockCell: CalendarDayCell = {
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

const mockTasks: Task[] = [
  {
    id: 'task-s-1',
    title: 'Secure Hollow Zero Data Vault',
    description: 'Retrieve encryption core before corruption overflow.',
    category: 'Hollow',
    priority: 'S',
    status: 'todo',
    completed: false,
    dueDate: '2026-10-18',
    tags: ['urgent', 'hollow'],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
    completedAt: null,
  },
  {
    id: 'task-a-1',
    title: 'Inspect Video Archive VHS Tapes',
    description: 'Catalog incoming retro cassette shipments.',
    category: 'Story',
    priority: 'A',
    status: 'completed',
    completed: true,
    dueDate: '2026-10-18',
    tags: ['store'],
    createdAt: '2026-10-18T11:00:00Z',
    updatedAt: '2026-10-18T12:00:00Z',
    completedAt: '2026-10-18T12:00:00Z',
  },
];

describe('DayCell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar day cell with basic attributes and day number', () => {
    const handleClick = vi.fn();
    render(<DayCell cell={mockCell} onClick={handleClick} />);

    const cellEl = screen.getByTestId('calendar-day');
    expect(cellEl).toBeInTheDocument();
    expect(cellEl).toHaveAttribute('data-date', '2026-10-18');
    expect(cellEl).toHaveTextContent('18');
    expect(cellEl).toHaveAttribute('role', 'button');
    expect(cellEl).toHaveAttribute('tabIndex', '0');
  });

  it('renders today indicator when cell.isToday is true', () => {
    const todayCell: CalendarDayCell = { ...mockCell, isToday: true };
    render(<DayCell cell={todayCell} />);

    const todayIndicator = screen.getByTestId('today-indicator');
    expect(todayIndicator).toBeInTheDocument();
    expect(todayIndicator).toHaveTextContent('TODAY');
  });

  it('renders task count badge and priority rank dots when tasks exist', () => {
    const metadata: DayCellMetadata = {
      taskCount: 3,
      priorityCounts: { S: 1, A: 1, B: 1, C: 0 },
      isAllCompleted: false,
      hasDailyCompleted: false,
      hasTasks: true,
    };

    render(<DayCell cell={mockCell} metadata={metadata} />);

    // Task count badge
    const badge = screen.getByTestId('task-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');

    // Priority rank dots
    expect(screen.getByTestId('priority-dot-S')).toBeInTheDocument();
    expect(screen.getByTestId('priority-dot-A')).toBeInTheDocument();
    expect(screen.getByTestId('priority-dot-B')).toBeInTheDocument();
    expect(screen.queryByTestId('priority-dot-C')).not.toBeInTheDocument();

    // General deadline dot
    expect(screen.getByTestId('deadline-dot')).toBeInTheDocument();
  });

  it('renders daily-complete-dot when hasDailyCompleted is true', () => {
    const metadata: DayCellMetadata = {
      taskCount: 0,
      priorityCounts: { S: 0, A: 0, B: 0, C: 0 },
      isAllCompleted: false,
      hasDailyCompleted: true,
      hasTasks: false,
    };

    render(<DayCell cell={mockCell} metadata={metadata} />);

    const dailyDot = screen.getByTestId('daily-complete-dot');
    expect(dailyDot).toBeInTheDocument();
  });

  it('applies selected styling and aria-selected when isSelected is true', () => {
    render(<DayCell cell={mockCell} isSelected={true} />);

    const cellEl = screen.getByTestId('calendar-day');
    expect(cellEl).toHaveAttribute('aria-selected', 'true');
    expect(cellEl.className).toContain('border-[#00F0FF]');
  });

  it('triggers onClick callback on mouse click and on keyboard Enter/Space', () => {
    const handleClick = vi.fn();
    render(<DayCell cell={mockCell} onClick={handleClick} />);

    const cellEl = screen.getByTestId('calendar-day');

    // Mouse click
    fireEvent.click(cellEl);
    expect(handleClick).toHaveBeenCalledWith('2026-10-18');

    // Keyboard Enter
    fireEvent.keyDown(cellEl, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    // Keyboard Space
    fireEvent.keyDown(cellEl, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});

describe('DateTaskDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DateTaskDrawer
        isOpen={false}
        selectedDate="2026-10-18"
        tasks={mockTasks}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();
  });

  it('renders date drawer with header and tasks when open', () => {
    const handleClose = vi.fn();
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={mockTasks}
        onClose={handleClose}
      />
    );

    const drawer = screen.getByTestId('date-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent('COMMISSIONS FOR 2026-10-18');
    expect(drawer).toHaveTextContent('Secure Hollow Zero Data Vault');
    expect(drawer).toHaveTextContent('Inspect Video Archive VHS Tapes');
  });

  it('renders empty state when selected date has no tasks', () => {
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-19"
        tasks={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('date-drawer-empty')).toBeInTheDocument();
    expect(screen.getByText(/No scheduled commissions on 2026-10-19/i)).toBeInTheDocument();
  });

  it('calls onToggleTask when completion button is clicked', () => {
    const handleToggle = vi.fn();
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={mockTasks}
        onClose={vi.fn()}
        onToggleTask={handleToggle}
      />
    );

    const completeBtns = screen.getAllByTestId('task-complete-btn');
    expect(completeBtns.length).toBeGreaterThan(0);

    fireEvent.click(completeBtns[0]);
    expect(handleToggle).toHaveBeenCalledWith('task-s-1');
  });

  it('calls onClose when close button is clicked or Escape key pressed', () => {
    const handleClose = vi.fn();
    render(
      <DateTaskDrawer
        isOpen={true}
        selectedDate="2026-10-18"
        tasks={mockTasks}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByTestId('date-drawer-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});

describe('CalendarMatrix Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders cassette deck navigation header and 7 weekday columns', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    // Navigation Controls
    expect(screen.getByTestId('cal-prev-month')).toBeInTheDocument();
    expect(screen.getByTestId('cal-next-month')).toBeInTheDocument();
    expect(screen.getByTestId('cal-today-btn')).toBeInTheDocument();

    // Month Header
    const monthHeader = screen.getByTestId('cal-month-header');
    expect(monthHeader).toBeInTheDocument();
    expect(monthHeader.textContent).toContain('2026');
    expect(monthHeader.textContent).toContain('10');
    expect(monthHeader.textContent).toContain('OCTOBER');

    // Weekday column headers
    expect(screen.getByTestId('cal-weekday-mon')).toBeInTheDocument();
    expect(screen.getByTestId('cal-weekday-sun')).toBeInTheDocument();

    // Grid container
    const grid = screen.getByTestId('calendar-grid');
    expect(grid).toBeInTheDocument();

    // Calendar day cells
    const dayCells = screen.getAllByTestId('calendar-day');
    expect(dayCells.length).toBeGreaterThanOrEqual(35);
  });

  it('navigates to next and previous months when buttons are clicked', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    const monthHeader = screen.getByTestId('cal-month-header');
    expect(monthHeader.textContent).toContain('OCTOBER');

    // Next month (November)
    fireEvent.click(screen.getByTestId('cal-next-month'));
    expect(monthHeader.textContent).toContain('NOVEMBER');

    // Prev month (back to October)
    fireEvent.click(screen.getByTestId('cal-prev-month'));
    expect(monthHeader.textContent).toContain('OCTOBER');
  });

  it('handles year boundary rollover when navigating past December or January', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={12} />
      </StoreProvider>
    );

    const monthHeader = screen.getByTestId('cal-month-header');
    expect(monthHeader.textContent).toContain('DECEMBER');
    expect(monthHeader.textContent).toContain('2026');

    // Navigate to January 2027
    fireEvent.click(screen.getByTestId('cal-next-month'));
    expect(monthHeader.textContent).toContain('JANUARY');
    expect(monthHeader.textContent).toContain('2027');

    // Navigate back to December 2026
    fireEvent.click(screen.getByTestId('cal-prev-month'));
    expect(monthHeader.textContent).toContain('DECEMBER');
    expect(monthHeader.textContent).toContain('2026');
  });

  it('opens and closes DateTaskDrawer when selecting a day cell', () => {
    render(
      <StoreProvider>
        <CalendarMatrix initialYear={2026} initialMonth={10} />
      </StoreProvider>
    );

    // Date drawer initially closed
    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();

    // Click on day cell 2026-10-18
    const day18 = screen.getByTestId('day-cell-2026-10-18');
    fireEvent.click(day18);

    // Drawer should open
    expect(screen.getByTestId('date-drawer')).toBeInTheDocument();

    // Close drawer
    fireEvent.click(screen.getByTestId('date-drawer-close'));
    expect(screen.queryByTestId('date-drawer')).not.toBeInTheDocument();
  });
});
