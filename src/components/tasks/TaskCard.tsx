import React from 'react';
import { Check, Edit3, Trash2, Calendar, AlertTriangle, Tag, Clock } from 'lucide-react';
import { Task, TaskPriority } from '../../types';

export interface TaskCardProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string; borderClass: string; glowClass: string }
> = {
  S: {
    label: 'S',
    badgeClass: 'bg-gradient-to-r from-[#B33BFF] to-[#FF3B30] text-white font-black shadow-[0_0_12px_rgba(179,59,255,0.5)] border border-[#FF3B30]/60',
    borderClass: 'border-l-4 border-l-[#B33BFF]',
    glowClass: 'hover:shadow-[0_0_20px_rgba(179,59,255,0.25)]',
  },
  A: {
    label: 'A',
    badgeClass: 'bg-[#F2FF00] text-[#0D0E12] font-black shadow-[0_0_10px_rgba(242,255,0,0.4)] border border-[#CBE300]',
    borderClass: 'border-l-4 border-l-[#F2FF00]',
    glowClass: 'hover:shadow-[0_0_20px_rgba(242,255,0,0.2)]',
  },
  B: {
    label: 'B',
    badgeClass: 'bg-[#00F0FF] text-[#0D0E12] font-black shadow-[0_0_10px_rgba(0,240,255,0.4)] border border-[#00C2CF]',
    borderClass: 'border-l-4 border-l-[#00F0FF]',
    glowClass: 'hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]',
  },
  C: {
    label: 'C',
    badgeClass: 'bg-[#242831] text-[#A0A5B5] font-bold border border-[#4A5268]',
    borderClass: 'border-l-4 border-l-[#5C6275]',
    glowClass: 'hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  className = '',
}) => {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.B;
  const isCompleted = Boolean(task.completed);

  // Check overdue status
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = Boolean(task.dueDate && task.dueDate < todayStr && !isCompleted);
  const isDueToday = Boolean(task.dueDate && task.dueDate === todayStr && !isCompleted);

  return (
    <div
      data-testid="task-card"
      data-completed={isCompleted ? 'true' : 'false'}
      className={`relative group bg-[#16181D] border border-[#2E3342] zzz-corner-cut transition-all duration-200 overflow-hidden flex flex-col justify-between p-4 ${priority.borderClass} ${priority.glowClass} ${
        isCompleted ? 'opacity-75 bg-[#121418]' : ''
      } ${className}`}
    >
      {/* Top Technical Metadata Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#2E3342]/60 text-xs font-mono">
        <div className="flex items-center gap-2">
          {/* Priority Rank Badge */}
          <span
            data-testid="task-priority-badge"
            className={`px-2 py-0.5 text-xs rounded-sm tracking-wider uppercase ${priority.badgeClass}`}
          >
            {task.priority}-RANK
          </span>

          {/* Category Tag */}
          {task.category && (
            <span className="text-[#A0A5B5] bg-[#242831] px-2 py-0.5 rounded-sm border border-[#2E3342] font-semibold text-[11px] tracking-wide uppercase">
              // {task.category}
            </span>
          )}
        </div>

        {/* Due Date Indicator */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-sm font-mono ${
              isOverdue
                ? 'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40 font-bold animate-pulse'
                : isDueToday
                ? 'bg-[#F2FF00]/15 text-[#F2FF00] border border-[#F2FF00]/30 font-bold'
                : 'text-[#A0A5B5] bg-[#0D0E12] border border-[#2E3342]'
            }`}
          >
            {isOverdue ? <AlertTriangle className="w-3 h-3 text-[#FF3B30]" /> : <Calendar className="w-3 h-3" />}
            <span>{isOverdue ? `OVERDUE: ${task.dueDate}` : isDueToday ? `DUE TODAY: ${task.dueDate}` : task.dueDate}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex items-start gap-3 my-1">
        {/* Completion Checkbox Button */}
        <button
          type="button"
          data-testid="task-complete-btn"
          onClick={() => onToggleComplete?.(task.id)}
          aria-label={isCompleted ? 'Mark commission incomplete' : 'Mark commission completed'}
          className={`mt-0.5 w-6 h-6 flex-shrink-0 rounded-sm border-2 flex items-center justify-center transition-all duration-150 ${
            isCompleted
              ? 'bg-[#F2FF00] border-[#F2FF00] text-[#0D0E12] shadow-[0_0_10px_rgba(242,255,0,0.5)]'
              : 'border-[#4A5268] bg-[#0D0E12] hover:border-[#F2FF00] text-transparent hover:text-[#F2FF00]/40'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <h3
            data-testid="task-title"
            className={`font-['Chakra_Petch',sans-serif] text-base font-bold tracking-wide break-words leading-snug transition-colors ${
              isCompleted ? 'line-through text-[#5C6275]' : 'text-white group-hover:text-[#F2FF00]'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p
              className={`mt-1.5 text-xs text-[#A0A5B5] break-words line-clamp-3 font-sans leading-relaxed ${
                isCompleted ? 'text-[#5C6275]' : ''
              }`}
            >
              {task.description}
            </p>
          )}

          {/* Tags List */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {task.tags.map((tag, idx) => (
                <span
                  key={`${task.id}-tag-${idx}`}
                  className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#0D0E12] text-[#00F0FF] px-2 py-0.5 rounded-sm border border-[#00F0FF]/30 tracking-tight"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>#{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completion Stamp Overlay when completed */}
      {isCompleted && (
        <div className="absolute right-4 bottom-12 pointer-events-none select-none transform rotate-[-12deg] border-2 border-[#F2FF00] text-[#F2FF00] font-['Chakra_Petch',Impact,sans-serif] font-black text-xs px-2.5 py-0.5 tracking-widest bg-[#0D0E12]/90 shadow-[0_0_15px_rgba(242,255,0,0.4)] opacity-90 animate-stamp">
          CLEARED // ARCHIVED
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-[#2E3342]/40 text-xs font-mono">
        <span className="text-[10px] text-[#5C6275] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>ID: {task.id.slice(0, 8)}</span>
        </span>

        <div className="flex items-center gap-1.5">
          {/* Edit Action Button */}
          <button
            type="button"
            data-testid="task-edit-btn"
            onClick={() => onEdit?.(task)}
            title="Edit Commission"
            className="p-1.5 text-[#A0A5B5] hover:text-[#00F0FF] hover:bg-[#242831] rounded-sm transition-colors border border-transparent hover:border-[#00F0FF]/40"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Action Button */}
          <button
            type="button"
            data-testid="task-delete-btn"
            onClick={() => onDelete?.(task.id)}
            title="Purge Commission"
            className="p-1.5 text-[#A0A5B5] hover:text-[#FF3B30] hover:bg-[#242831] rounded-sm transition-colors border border-transparent hover:border-[#FF3B30]/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
