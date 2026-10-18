import React from 'react';
import { CalendarDayCell } from '../../services/calendar';
import { soundService } from '../../services/sound';
import { Task } from '../../types';

export interface PriorityCounts {
  S: number;
  A: number;
  B: number;
  C: number;
}

export interface DayCellMetadata {
  taskCount: number;
  priorityCounts: PriorityCounts;
  isAllCompleted: boolean;
  hasDailyCompleted: boolean;
  hasTasks: boolean;
  tasks?: Task[];
}

export interface DayCellProps {
  cell: CalendarDayCell;
  isSelected?: boolean;
  metadata?: DayCellMetadata;
  onClick?: (date: string) => void;
  className?: string;
}

export const DayCell: React.FC<DayCellProps> = ({
  cell,
  isSelected = false,
  metadata,
  onClick,
  className = '',
}) => {
  const taskCount = metadata?.taskCount ?? 0;
  const priorityCounts = metadata?.priorityCounts ?? { S: 0, A: 0, B: 0, C: 0 };
  const hasDailyCompleted = Boolean(metadata?.hasDailyCompleted);
  const isAllCompleted = Boolean(metadata?.isAllCompleted);
  const hasTasks = taskCount > 0;

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      soundService.playClick();
    } catch {
      // Audio fallback in silent/headless environments
    }
    onClick?.(cell.date);
  };

  return (
    <div
      data-testid="calendar-day"
      data-date={cell.date}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      aria-label={`Calendar day ${cell.date}${cell.isToday ? ' (Today)' : ''}${
        hasTasks ? `, ${taskCount} scheduled commissions` : ''
      }`}
      className={`relative p-2 min-h-[76px] sm:min-h-[88px] cursor-pointer transition-all duration-150 flex flex-col justify-between border zzz-corner-cut group select-none ${
        isSelected
          ? 'border-[#00F0FF] bg-[#242831] shadow-[0_0_12px_rgba(0,240,255,0.4)] ring-2 ring-[#00F0FF]'
          : cell.isToday
          ? 'border-[#F2FF00] bg-[#16181D] shadow-[0_0_10px_rgba(242,255,0,0.25)]'
          : cell.isCurrentMonth
          ? 'border-[#2E3342] bg-[#16181D] hover:border-[#4A5268] hover:bg-[#1E2127]'
          : 'border-[#242831]/60 bg-[#0D0E12]/60 text-[#5C6275] opacity-40 hover:opacity-75'
      } ${className}`}
    >
      {/* Inner Day Cell Container */}
      <div
        data-testid={`day-cell-${cell.date}`}
        className="w-full h-full flex flex-col justify-between"
      >
        {/* Top Header: Day Number & Badges */}
        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-xs sm:text-sm font-bold tracking-tight ${
              cell.isToday
                ? 'text-[#F2FF00] font-black'
                : isSelected
                ? 'text-[#00F0FF] font-black'
                : cell.isCurrentMonth
                ? 'text-white group-hover:text-[#F2FF00]'
                : 'text-[#5C6275]'
            }`}
          >
            {cell.dayNumber}
          </span>

          {/* Right Status Indicators (TODAY badge and Task count badge) */}
          <div className="flex items-center gap-1">
            {cell.isToday && (
              <span
                data-testid="today-indicator"
                className="text-[9px] font-mono px-1 py-0.2 rounded-sm bg-[#F2FF00] text-[#0D0E12] font-black uppercase tracking-tighter"
              >
                TODAY
              </span>
            )}
            {hasTasks && (
              <span
                data-testid="task-count-badge"
                title={`${taskCount} commissions scheduled`}
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-sm border font-bold ${
                  isAllCompleted
                    ? 'bg-[#F2FF00]/15 text-[#F2FF00] border-[#F2FF00]/40'
                    : 'bg-[#242831] text-[#A0A5B5] border-[#2E3342]'
                }`}
              >
                {taskCount}
              </span>
            )}
          </div>
        </div>

        {/* Center / Bottom: Priority Dots & Daily Marker */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#2E3342]/40">
          {/* Priority Rank Dots */}
          <div className="flex items-center gap-1 flex-wrap min-h-[10px]">
            {/* S-Rank Dot (#FF0055) */}
            {priorityCounts.S > 0 && (
              <span
                data-testid="priority-dot-S"
                title={`S-Rank (${priorityCounts.S})`}
                className="w-2 h-2 rounded-full bg-[#FF0055] shadow-[0_0_6px_#FF0055]"
              />
            )}
            {/* A-Rank Dot (#FF7700) */}
            {priorityCounts.A > 0 && (
              <span
                data-testid="priority-dot-A"
                title={`A-Rank (${priorityCounts.A})`}
                className="w-2 h-2 rounded-full bg-[#FF7700] shadow-[0_0_6px_#FF7700]"
              />
            )}
            {/* B-Rank Dot (#00F0FF) */}
            {priorityCounts.B > 0 && (
              <span
                data-testid="priority-dot-B"
                title={`B-Rank (${priorityCounts.B})`}
                className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]"
              />
            )}
            {/* C-Rank Dot (#A0A5B5) */}
            {priorityCounts.C > 0 && (
              <span
                data-testid="priority-dot-C"
                title={`C-Rank (${priorityCounts.C})`}
                className="w-2 h-2 rounded-full bg-[#A0A5B5] shadow-[0_0_4px_#A0A5B5]"
              />
            )}

            {/* General Deadline Dot Indicator (Yellow glow) for E2E suites */}
            {hasTasks && (
              <span
                data-testid="deadline-dot"
                title={`${taskCount} scheduled commissions`}
                className="w-1.5 h-1.5 rounded-full bg-[#F2FF00] shadow-[0_0_6px_#F2FF00]"
              />
            )}
          </div>

          {/* Daily Commission Completed Marker Dot */}
          {hasDailyCompleted && (
            <span
              data-testid="daily-complete-dot"
              title="Daily Commissions Cleared"
              className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] border border-[#0D0E12] shadow-[0_0_8px_#00F0FF] flex items-center justify-center animate-pulse"
            >
              <span className="w-1 h-1 rounded-full bg-white" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayCell;
