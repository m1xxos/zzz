import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles, Calendar, Tag, ShieldAlert } from 'lucide-react';
import { Task, TaskPriority } from '../../types';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    category: string;
    dueDate: string | null;
    tags: string[];
  }) => void;
  initialTask?: Task | null;
}

const CATEGORY_PRESETS = [
  'Hollow Zero',
  'Shiyu Defense',
  'Story',
  'Errands',
  'Combat',
  'Store',
];

const PRIORITY_OPTIONS: Array<{ rank: TaskPriority; label: string; desc: string; color: string }> = [
  { rank: 'S', label: 'S-RANK', desc: 'Critical Danger / High Priority', color: 'border-[#B33BFF] text-[#B33BFF]' },
  { rank: 'A', label: 'A-RANK', desc: 'Standard High Priority', color: 'border-[#F2FF00] text-[#F2FF00]' },
  { rank: 'B', label: 'B-RANK', desc: 'Medium Priority / Routine', color: 'border-[#00F0FF] text-[#00F0FF]' },
  { rank: 'C', label: 'C-RANK', desc: 'Low Priority / Minor Errand', color: 'border-[#A0A5B5] text-[#A0A5B5]' },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('B');
  const [category, setCategory] = useState('Hollow Zero');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state with initialTask when editing or resetting
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'B');
      setCategory(initialTask.category || 'Hollow Zero');
      setDueDate(initialTask.dueDate || '');
      setTagsInput(initialTask.tags ? initialTask.tags.join(', ') : '');
      setError(null);
    } else {
      setTitle('');
      setDescription('');
      setPriority('B');
      setCategory('Hollow Zero');
      setDueDate('');
      setTagsInput('');
      setError(null);
    }
  }, [initialTask, isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('COMMISSION TITLE REQUIRED // INPUT MISSING');
      return;
    }

    // Parse tags (split by comma, trim, deduplicate)
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      priority,
      category: category.trim() || 'General',
      dueDate: dueDate || null,
      tags: Array.from(new Set(parsedTags)),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog Card */}
      <div
        data-testid="task-modal"
        className="relative w-full max-w-xl bg-[#16181D] border-2 border-[#2E3342] zzz-corner-cut shadow-2xl overflow-hidden flex flex-col font-['Chakra_Petch',sans-serif]"
      >
        {/* Top Caution Hazard Tape Bar */}
        <div className="h-2 zzz-hazard-bar w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E3342] bg-[#1A1D24]">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F2FF00] animate-pulse" />
            <span className="font-mono text-xs tracking-widest text-[#F2FF00] uppercase font-bold">
              {initialTask ? 'COMMISSION REVISION // RECORD EDIT' : 'COMMISSION DISPATCH // NEW ASSIGNMENT'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#A0A5B5] hover:text-[#FF3B30] hover:bg-[#242831] p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Validation Error Alert */}
          {error && (
            <div
              data-testid="task-form-error"
              className="flex items-center gap-2.5 p-3 bg-[#FF3B30]/15 border border-[#FF3B30] text-[#FF3B30] text-xs font-mono rounded-sm animate-glitch"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-mono uppercase text-[#A0A5B5]">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#F2FF00]" />
                COMMISSION TITLE <span className="text-[#FF3B30]">*</span>
              </span>
              <span className="text-[10px] text-[#5C6275]">REQUIRED</span>
            </label>
            <input
              type="text"
              data-testid="task-title-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Eliminate Ethereal Swarm in Hollow Zero"
              className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#F2FF00] text-white px-3.5 py-2.5 text-sm rounded-sm font-sans focus:outline-none focus:ring-1 focus:ring-[#F2FF00] transition-colors"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase text-[#A0A5B5]">
              BRIEFING DETAILS // OBJECTIVES
            </label>
            <textarea
              data-testid="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Operational briefing, target coordinates, hazard level notes..."
              className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#F2FF00] text-white px-3.5 py-2.5 text-sm rounded-sm font-sans focus:outline-none focus:ring-1 focus:ring-[#F2FF00] transition-colors resize-none"
            />
          </div>

          {/* Priority & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-[#A0A5B5]">
                DANGER RATING // PRIORITY
              </label>
              <select
                data-testid="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#F2FF00] text-white px-3 py-2 text-sm rounded-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#F2FF00] uppercase"
              >
                <option value="S">S-RANK // CRITICAL DANGER</option>
                <option value="A">A-RANK // HIGH PRIORITY</option>
                <option value="B">B-RANK // MEDIUM / ROUTINE</option>
                <option value="C">C-RANK // LOW / MINOR</option>
              </select>

              {/* Visual Rank Chips */}
              <div className="flex gap-1.5 pt-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.rank}
                    type="button"
                    onClick={() => setPriority(opt.rank)}
                    className={`flex-1 py-1 text-xs font-mono font-bold border rounded-sm transition-all ${
                      priority === opt.rank
                        ? `${opt.color} bg-[#242831] shadow-[0_0_8px_rgba(255,255,255,0.15)]`
                        : 'border-[#2E3342] text-[#5C6275] bg-[#0D0E12] hover:border-[#4A5268]'
                    }`}
                  >
                    {opt.rank}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-[#A0A5B5]">
                COMMISSION CATEGORY
              </label>
              <input
                type="text"
                data-testid="task-category-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Hollow Zero, Combat, Story"
                className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#F2FF00] text-white px-3.5 py-2 text-sm rounded-sm font-sans focus:outline-none focus:ring-1 focus:ring-[#F2FF00] transition-colors"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              {/* Preset Category Pills */}
              <div className="flex flex-wrap gap-1 pt-1">
                {CATEGORY_PRESETS.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border transition-colors ${
                      category === cat
                        ? 'border-[#F2FF00] text-[#F2FF00] bg-[#F2FF00]/10'
                        : 'border-[#2E3342] text-[#A0A5B5] bg-[#0D0E12] hover:border-[#4A5268]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date Input */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#A0A5B5]">
                <Calendar className="w-3.5 h-3.5 text-[#00F0FF]" />
                DEADLINE // DUE DATE
              </label>
              <input
                type="date"
                data-testid="task-due-date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#00F0FF] text-white px-3 py-2 text-sm rounded-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-colors"
              />
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#A0A5B5]">
                <Tag className="w-3.5 h-3.5 text-[#B33BFF]" />
                TAGS (COMMA-SEPARATED)
              </label>
              <input
                type="text"
                data-testid="task-tags-input"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. bounty, outer-ring, urgent"
                className="w-full bg-[#0D0E12] border border-[#2E3342] focus:border-[#B33BFF] text-white px-3.5 py-2 text-sm rounded-sm font-sans focus:outline-none focus:ring-1 focus:ring-[#B33BFF] transition-colors"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2E3342]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase text-[#A0A5B5] bg-[#0D0E12] hover:bg-[#242831] hover:text-white border border-[#2E3342] rounded-sm transition-colors"
            >
              ABORT // CANCEL
            </button>
            <button
              type="submit"
              data-testid="task-submit-btn"
              className="flex items-center gap-2 px-5 py-2 text-xs font-mono font-black tracking-wider uppercase text-[#0D0E12] bg-[#F2FF00] hover:bg-[#CBE300] border border-[#F2FF00] rounded-sm shadow-[0_0_12px_rgba(242,255,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{initialTask ? 'CONFIRM CHANGES // SAVE' : 'DISPATCH COMMISSION // SUBMIT'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
