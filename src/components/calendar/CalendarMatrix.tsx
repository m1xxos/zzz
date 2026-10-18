import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Disc,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  getCalendarMatrix,
  getWeekdayNames,
  CalendarDayCell,
} from '../../services/calendar';
import DayCell, { DayCellMetadata } from './DayCell';
import DateTaskDrawer from './DateTaskDrawer';
import { soundService } from '../../services/sound';
import { TaskPriority } from '../../types';

export interface CalendarMatrixProps {
  initialYear?: number;
  initialMonth?: number;
  onSelectDate?: (date: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

export const CalendarMatrix: React.FC<CalendarMatrixProps> = ({
  initialYear,
  initialMonth,
  onSelectDate,
  className = '',
}) => {
  const store = useStore();
  const {
    tasks = [],
    dailies,
    toggleTaskCompletion,
    setActiveView,
    setSearchQuery,
  } = store;

  // Viewport Month & Year State (supports store-driven or local fallback)
  const now = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (typeof initialYear === 'number') return initialYear;
    if (typeof (store as any).calendarViewYear === 'number') return (store as any).calendarViewYear;
    return now.getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (typeof initialMonth === 'number') return initialMonth;
    if (typeof (store as any).calendarViewMonth === 'number') return (store as any).calendarViewMonth;
    return now.getMonth() + 1; // 1-12
  });

  // Selected date state for drawer inspection
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    if (typeof (store as any).selectedCalendarDate === 'string') {
      return (store as any).selectedCalendarDate;
    }
    return null;
  });

  // Sync with store state if changed externally
  useEffect(() => {
    if (store.selectedCalendarDate !== undefined) {
      setSelectedDate(store.selectedCalendarDate);
    }
  }, [store.selectedCalendarDate]);

  useEffect(() => {
    if (initialYear === undefined && typeof store.calendarViewYear === 'number') {
      setCurrentYear(store.calendarViewYear);
    }
  }, [initialYear, store.calendarViewYear]);

  useEffect(() => {
    if (initialMonth === undefined && typeof store.calendarViewMonth === 'number') {
      setCurrentMonth(store.calendarViewMonth);
    }
  }, [initialMonth, store.calendarViewMonth]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    try {
      soundService.playSwitch();
    } catch {
      // Audio fallback
    }

    setCurrentMonth((prevMonth) => {
      if (prevMonth === 1) {
        setCurrentYear((prevYear) => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });

    if (typeof (store as any).prevCalendarMonth === 'function') {
      (store as any).prevCalendarMonth();
    }
  };

  const handleNextMonth = () => {
    try {
      soundService.playSwitch();
    } catch {
      // Audio fallback
    }

    setCurrentMonth((prevMonth) => {
      if (prevMonth === 12) {
        setCurrentYear((prevYear) => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });

    if (typeof (store as any).nextCalendarMonth === 'function') {
      (store as any).nextCalendarMonth();
    }
  };

  const handleJumpToday = () => {
    try {
      soundService.playSwitch();
    } catch {
      // Audio fallback
    }

    const todayDate = new Date();
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth() + 1);

    if (typeof (store as any).resetCalendarToToday === 'function') {
      (store as any).resetCalendarToToday();
    }
  };

  // Handle Cell Selection
  const handleCellClick = (date: string) => {
    const nextDate = selectedDate === date ? null : date;
    setSelectedDate(nextDate);

    if (typeof (store as any).setSelectedCalendarDate === 'function') {
      (store as any).setSelectedCalendarDate(nextDate);
    }
    if (typeof store.setSelectedDate === 'function' && nextDate) {
      store.setSelectedDate(nextDate);
    }
    onSelectDate?.(date);
  };

  // Generate Matrix Cells using Calendar Service
  const matrixCells: CalendarDayCell[] = useMemo(() => {
    try {
      return getCalendarMatrix(currentYear, currentMonth, { weekStartsOn: 1 });
    } catch (err) {
      // Graceful fallback if calendar service encounters unexpected input
      console.error('Failed to generate calendar matrix:', err);
      return [];
    }
  }, [currentYear, currentMonth]);

  // Compute Task & Daily Metadata per Date Key
  const computeCellMetadata = useCallback(
    (dateStr: string): DayCellMetadata => {
      // If store provides selector from explorer_m4_2, use it
      if (typeof (store as any).getDateMetadata === 'function') {
        return (store as any).getDateMetadata(dateStr);
      }

      // Fallback pure calculation
      const matchingTasks = tasks.filter((t) => t.dueDate === dateStr);
      const taskCount = matchingTasks.length;
      const priorityCounts = { S: 0, A: 0, B: 0, C: 0 };
      let completedCount = 0;

      for (const t of matchingTasks) {
        if (t.priority && t.priority in priorityCounts) {
          priorityCounts[t.priority as TaskPriority]++;
        } else {
          priorityCounts.C++;
        }
        if (t.completed) {
          completedCount++;
        }
      }

      const isAllCompleted = taskCount > 0 && completedCount === taskCount;

      // Check daily completed status
      const hasHistory = Boolean(dailies?.history && dailies.history[dateStr] === true);
      const isCurrentCycle = Boolean(store.currentCycleDate && dateStr === store.currentCycleDate);
      const hasClaimedToday = Boolean(isCurrentCycle && dailies?.commissionClaimed);
      const hasDailyCompleted = hasHistory || hasClaimedToday;

      return {
        taskCount,
        priorityCounts,
        isAllCompleted,
        hasDailyCompleted,
        hasTasks: taskCount > 0,
        tasks: matchingTasks,
      };
    },
    [tasks, dailies, store.currentCycleDate]
  );

  // Selected Date Task List for Drawer
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter((t) => t.dueDate === selectedDate);
  }, [tasks, selectedDate]);

  const selectedDateMetadata = useMemo(() => {
    if (!selectedDate) return undefined;
    return computeCellMetadata(selectedDate);
  }, [selectedDate, computeCellMetadata]);

  // Navigate to main task board with filter
  const handleNavigateToBoard = (date?: string) => {
    if (date) {
      setSearchQuery(date);
    }
    setActiveView('tasks');
  };

  // Formatted Cassette Deck Month Header Text
  const monthName = MONTH_NAMES[currentMonth - 1] || 'UNKNOWN';
  const monthHeaderText = `// ${currentYear} // ${String(currentMonth).padStart(2, '0')} // ${monthName}`;

  // Weekday column headers (Monday to Sunday)
  const weekdayNames = useMemo(() => {
    try {
      return getWeekdayNames(1);
    } catch {
      return ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    }
  }, []);

  return (
    <div
      data-testid="calendar-view-container"
      className={`space-y-6 bg-[#16181D] border-2 border-[#2E3342] zzz-corner-cut p-4 sm:p-6 shadow-xl relative ${className}`}
    >
      {/* Top Street Hazard Caution Line */}
      <div className="absolute top-0 inset-x-0 h-1.5 zzz-hazard-bar" />

      {/* 1. Cassette Deck Navigation Header */}
      <div
        data-testid="cal-cassette-deck"
        className="bg-[#0D0E12] border-2 border-[#2E3342] zzz-corner-cut p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner"
      >
        {/* Left: Cassette Deck OSD & Title */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Disc className="w-5 h-5 text-[#F2FF00] animate-spin-slow" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#F2FF00] font-black tracking-widest uppercase">
                CASSETTE DECK // TRACK 04
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-pulse" />
            </div>
            <h2 className="text-lg sm:text-xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white uppercase">
              SCHEDULE MATRIX
            </h2>
          </div>
        </div>

        {/* Center / Navigation Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-center">
          {/* Previous Month Button */}
          <button
            type="button"
            data-testid="cal-prev-month"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="flex items-center gap-1 px-3 py-1.5 bg-[#16181D] hover:bg-[#242831] border border-[#2E3342] hover:border-[#F2FF00] text-[#A0A5B5] hover:text-[#F2FF00] font-mono text-xs font-bold uppercase rounded-sm transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">&lt;&lt; PREV</span>
          </button>

          {/* Month & Year Readout Display */}
          <div className="px-3 sm:px-4 py-1.5 bg-[#16181D] border-2 border-[#2E3342] rounded-sm min-w-[200px] sm:min-w-[240px] text-center shadow-inner">
            <span
              data-testid="cal-month-header"
              className="font-mono text-xs sm:text-sm font-black tracking-widest text-[#F2FF00] uppercase"
            >
              {monthHeaderText}
            </span>
          </div>

          {/* Next Month Button */}
          <button
            type="button"
            data-testid="cal-next-month"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="flex items-center gap-1 px-3 py-1.5 bg-[#16181D] hover:bg-[#242831] border border-[#2E3342] hover:border-[#F2FF00] text-[#A0A5B5] hover:text-[#F2FF00] font-mono text-xs font-bold uppercase rounded-sm transition-all"
          >
            <span className="hidden sm:inline">NEXT &gt;&gt;</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to Today Button */}
          <button
            type="button"
            data-testid="cal-today-btn"
            onClick={handleJumpToday}
            aria-label="Jump to today"
            className="flex items-center gap-1 px-3 py-1.5 bg-[#242831] hover:bg-[#F2FF00] border border-[#2E3342] hover:border-[#F2FF00] text-white hover:text-[#0D0E12] font-mono text-xs font-black uppercase rounded-sm transition-all shadow-[0_0_8px_rgba(242,255,0,0.15)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>TODAY</span>
          </button>
        </div>
      </div>

      {/* 2. Priority & Status Dot Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-2 text-xs font-mono text-[#A0A5B5] border-b border-[#2E3342]/60 pb-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF0055] shadow-[0_0_6px_#FF0055]" />
            <span>S-RANK</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF7700] shadow-[0_0_6px_#FF7700]" />
            <span>A-RANK</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
            <span>B-RANK</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#A0A5B5] shadow-[0_0_4px_#A0A5B5]" />
            <span>C-RANK</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF] animate-pulse" />
            <span>DAILIES CLEARED</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 bg-[#F2FF00] border border-black rounded-xs" />
            <span className="text-[#F2FF00] font-bold">TODAY</span>
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 bg-[#242831] border border-[#00F0FF] rounded-xs" />
            <span className="text-[#00F0FF] font-bold">INSPECTED</span>
          </span>
        </div>
      </div>

      {/* 3. Seven-Day Column Headers (MON to SUN) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
        {weekdayNames.map((day, idx) => {
          const isWeekend = idx >= 5;
          return (
            <div
              key={day}
              data-testid={`cal-weekday-${day.toLowerCase()}`}
              className={`py-2 px-1 font-mono text-xs sm:text-sm font-black tracking-wider uppercase border-b-2 ${
                isWeekend
                  ? 'text-[#5C6275] border-[#2E3342] bg-[#0D0E12]/50'
                  : 'text-[#A0A5B5] border-[#2E3342] bg-[#16181D]'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* 4. Dynamic Monthly Day Cell Grid */}
      <div
        id="calendar-grid"
        data-testid="calendar-grid"
        className="grid grid-cols-7 gap-1 sm:gap-2 select-none"
      >
        {matrixCells.map((cell) => {
          const isSelected = selectedDate === cell.date;
          const metadata = computeCellMetadata(cell.date);

          return (
            <DayCell
              key={cell.date}
              cell={cell}
              isSelected={isSelected}
              metadata={metadata}
              onClick={handleCellClick}
            />
          );
        })}
      </div>

      {/* 5. Date Task Inspection Drawer */}
      <DateTaskDrawer
        isOpen={selectedDate !== null}
        selectedDate={selectedDate}
        tasks={selectedDateTasks}
        metadata={selectedDateMetadata}
        onClose={() => setSelectedDate(null)}
        onToggleTask={(taskId) => toggleTaskCompletion(taskId)}
        onNavigateToBoard={handleNavigateToBoard}
        onAddTask={(date) => {
          // Navigates to task board or opens modal
          handleNavigateToBoard(date);
        }}
      />
    </div>
  );
};

export default CalendarMatrix;
