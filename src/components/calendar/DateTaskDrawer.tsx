import React, { useEffect } from 'react';
import { X, Check, Calendar, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { Task, PRIORITY_CONFIG } from '../../types';
import { DayCellMetadata } from './DayCell';
import { soundService } from '../../services/sound';

export interface DateTaskDrawerProps {
  isOpen: boolean;
  selectedDate: string | null;
  tasks: Task[];
  metadata?: DayCellMetadata;
  onClose: () => void;
  onToggleTask?: (taskId: string) => void;
  onNavigateToBoard?: (date?: string) => void;
  onAddTask?: (date: string) => void;
  className?: string;
}

export const DateTaskDrawer: React.FC<DateTaskDrawerProps> = ({
  isOpen,
  selectedDate,
  tasks,
  metadata,
  onClose,
  onToggleTask,
  onNavigateToBoard,
  onAddTask,
  className = '',
}) => {
  // Listen for Escape key to close drawer (WCAG 2.1 AA)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !selectedDate) {
    return null;
  }

  const handleClose = () => {
    try {
      soundService.playClick();
    } catch {
      // Audio fallback
    }
    onClose();
  };

  const handleToggle = (taskId: string, currentCompleted: boolean) => {
    try {
      if (!currentCompleted) {
        soundService.playTaskComplete();
      } else {
        soundService.playClick();
      }
    } catch {
      // Audio fallback
    }
    onToggleTask?.(taskId);
  };

  const handleFilterBoard = () => {
    try {
      soundService.playSwitch();
    } catch {
      // Audio fallback
    }
    onNavigateToBoard?.(selectedDate);
  };

  const handleAddNew = () => {
    try {
      soundService.playClick();
    } catch {
      // Audio fallback
    }
    onAddTask?.(selectedDate);
  };

  // Formatted date string with day of week
  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dayName = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    : '';

  const totalCount = metadata?.taskCount ?? tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;

  return (
    <div
      data-testid="date-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={`Commissions scheduled for ${selectedDate}`}
      className={`bg-[#16181D] border-2 border-[#00F0FF] zzz-corner-cut p-4 sm:p-6 shadow-[0_0_25px_rgba(0,240,255,0.2)] relative transition-all duration-200 mt-6 animate-fadeIn ${className}`}
    >
      {/* Top Street Hazard Stripe Accent */}
      <div className="absolute top-0 left-0 right-12 h-1 zzz-hazard-bar-cyan" />

      {/* Drawer Header */}
      <div className="flex items-start justify-between border-b border-[#2E3342] pb-3 mb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#00F0FF] tracking-wider uppercase">
              // TIMELINE TELEMETRY
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#242831] border border-[#2E3342] text-[#A0A5B5]">
              {dayName}
            </span>
          </div>

          <h3
            data-testid="date-drawer-title"
            className="text-lg sm:text-xl font-black font-['Chakra_Petch',sans-serif] uppercase tracking-wide flex items-center gap-2 text-white"
          >
            <Calendar className="w-5 h-5 text-[#00F0FF]" />
            <span>COMMISSIONS FOR {selectedDate}</span>
          </h3>

          <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-[#A0A5B5]">
            <span>
              TOTAL: <strong className="text-white">{totalCount}</strong>
            </span>
            <span>•</span>
            <span>
              ACTIVE: <strong className="text-[#F2FF00]">{activeCount}</strong>
            </span>
            <span>•</span>
            <span>
              CLEARED: <strong className="text-[#00F0FF]">{completedCount}</strong>
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          data-testid="date-drawer-close"
          onClick={handleClose}
          aria-label="Close date inspection drawer"
          className="p-1.5 bg-[#242831] hover:bg-[#2E3342] border border-[#2E3342] hover:border-[#00F0FF] text-[#A0A5B5] hover:text-[#00F0FF] rounded-sm transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div id="date-tasks-content" className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div
            data-testid="date-drawer-empty"
            className="flex flex-col items-center justify-center p-8 bg-[#0D0E12] border border-[#2E3342] zzz-corner-cut text-center"
          >
            <AlertCircle className="w-8 h-8 text-[#5C6275] mb-2" />
            <p className="font-mono text-sm text-[#A0A5B5] font-bold">
              <em>No scheduled commissions on {selectedDate}</em>
            </p>
            <p className="text-xs text-[#5C6275] mt-1 font-sans">
              Proxy terminal idle. No Hollow operations logged for this date.
            </p>
            {onAddTask && (
              <button
                type="button"
                data-testid="drawer-empty-add-btn"
                onClick={handleAddNew}
                className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-[#242831] hover:bg-[#00F0FF] hover:text-[#0D0E12] border border-[#2E3342] hover:border-[#00F0FF] text-white font-mono text-xs font-bold uppercase transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ DISPATCH COMMISSION</span>
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => {
            const config = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.B;
            const isCompleted = Boolean(task.completed);

            return (
              <div
                key={task.id}
                data-testid="drawer-task-item"
                data-task-id={task.id}
                className={`flex items-start justify-between gap-3 p-3.5 bg-[#0D0E12] border transition-all zzz-corner-cut ${
                  isCompleted
                    ? 'border-[#2E3342] opacity-70'
                    : 'border-[#2E3342] hover:border-[#00F0FF] shadow-sm'
                }`}
              >
                {/* Checkbox Quick Toggle */}
                <button
                  type="button"
                  data-testid="task-complete-btn"
                  onClick={() => handleToggle(task.id, isCompleted)}
                  aria-label={isCompleted ? `Mark ${task.title} active` : `Mark ${task.title} complete`}
                  className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-[#00F0FF] border-[#00F0FF] text-[#0D0E12]'
                      : 'border-[#4A5268] bg-[#16181D] hover:border-[#00F0FF] text-transparent hover:text-[#00F0FF]/40'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Rank Badge */}
                    <span
                      data-testid="drawer-task-priority"
                      className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: config.badgeBg,
                        color: config.color,
                        border: `1px solid ${config.borderColor}`,
                      }}
                    >
                      {task.priority}-RANK
                    </span>

                    {/* Category */}
                    {task.category && (
                      <span className="text-[10px] font-mono text-[#A0A5B5] bg-[#16181D] px-1.5 py-0.2 rounded-sm border border-[#2E3342] uppercase">
                        // {task.category}
                      </span>
                    )}

                    {/* ID */}
                    <span className="text-[10px] font-mono text-[#5C6275]">
                      #{task.id.slice(0, 6)}
                    </span>
                  </div>

                  <h4
                    data-testid="drawer-task-title"
                    className={`font-['Chakra_Petch',sans-serif] text-sm font-bold tracking-tight break-words leading-tight ${
                      isCompleted ? 'line-through text-[#5C6275]' : 'text-white'
                    }`}
                  >
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-xs text-[#A0A5B5] mt-1 line-clamp-2 font-sans leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Action Bar / Footer */}
      <div className="flex items-center justify-between pt-3 mt-4 border-t border-[#2E3342] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onNavigateToBoard && (
            <button
              type="button"
              data-testid="drawer-filter-board-btn"
              onClick={handleFilterBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242831] hover:bg-[#2E3342] border border-[#2E3342] hover:border-[#00F0FF] text-[#00F0FF] rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              <span>VIEW IN COMMISSIONS BOARD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onAddTask && (
          <button
            type="button"
            data-testid="drawer-add-task-btn"
            onClick={handleAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00F0FF] hover:bg-[#00D0DF] text-[#0D0E12] font-mono text-xs font-black uppercase tracking-wider rounded-sm transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ NEW COMMISSION</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DateTaskDrawer;
