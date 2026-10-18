import { type FC, useContext } from 'react';
import { X, Terminal, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { TaskPriority, TaskSortBy } from '../../types';
import { StoreContext } from '../../store/useStore';

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedStatus: 'all' | 'active' | 'completed' | 'overdue';
  onStatusChange: (status: 'all' | 'active' | 'completed' | 'overdue') => void;
  selectedPriority?: TaskPriority | 'all';
  onPriorityChange?: (priority: TaskPriority | 'all') => void;
  sortBy?: TaskSortBy;
  onSortByChange?: (sortBy: TaskSortBy) => void;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (dir: 'asc' | 'desc') => void;
  availableCategories?: string[];
  counts?: {
    all: number;
    active: number;
    completed: number;
    overdue: number;
  };
  className?: string;
}

const DEFAULT_CATEGORIES = [
  'ALL',
  'HOLLOW ZERO',
  'SHIYU DEFENSE',
  'STORY',
  'ERRANDS',
];

export const FilterBar: FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  selectedPriority = 'all',
  onPriorityChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  availableCategories = DEFAULT_CATEGORIES,
  counts,
  className = '',
}) => {
  const storeContext = useContext(StoreContext);
  const currentSortBy: TaskSortBy = sortBy ?? storeContext?.sortBy ?? 'createdAt';
  const currentSortDirection: 'asc' | 'desc' = sortDirection ?? storeContext?.sortDirection ?? 'desc';

  const handleSortByChange = (val: TaskSortBy) => {
    onSortByChange?.(val);
    if (storeContext && typeof storeContext.setSortBy === 'function') {
      storeContext.setSortBy(val);
    }
  };

  const handleSortDirectionToggle = () => {
    const nextDir = currentSortDirection === 'asc' ? 'desc' : 'asc';
    onSortDirectionChange?.(nextDir);
    if (storeContext && typeof storeContext.setSortDirection === 'function') {
      storeContext.setSortDirection(nextDir);
    }
  };

  // Merge default categories with any dynamically supplied categories
  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...availableCategories.map((c) => c.toUpperCase())])
  );

  return (
    <div className={`space-y-3 font-['Chakra_Petch',sans-serif] ${className}`}>
      {/* 1. Terminal Search Input & Priority Ranks Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Terminal Query Input Box */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#F2FF00] font-mono font-bold text-sm">
            <Terminal className="w-4 h-4 mr-1 text-[#F2FF00]" />
            <span>&gt;</span>
          </div>

          <input
            type="text"
            data-testid="task-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="QUERY COMMISSIONS..."
            className="w-full bg-[#0D0E12] border-2 border-[#2E3342] group-hover:border-[#4A5268] focus:border-[#F2FF00] text-white pl-9 pr-9 py-2 text-xs sm:text-sm rounded-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-[#F2FF00] transition-colors placeholder:text-[#5C6275]"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A0A5B5] hover:text-white"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Priority Filter Rank Buttons */}
        {onPriorityChange && (
          <div className="flex items-center gap-1 bg-[#16181D] p-1 border border-[#2E3342] rounded-sm">
            <span className="text-[10px] font-mono text-[#5C6275] px-1.5 uppercase hidden md:inline">
              RANK:
            </span>
            {(['all', 'S', 'A', 'B', 'C'] as const).map((rank) => (
              <button
                key={rank}
                type="button"
                onClick={() => onPriorityChange(rank)}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded-sm transition-all ${
                  selectedPriority === rank
                    ? rank === 'S'
                      ? 'bg-gradient-to-r from-[#B33BFF] to-[#FF3B30] text-white shadow-[0_0_8px_rgba(179,59,255,0.4)]'
                      : rank === 'A'
                      ? 'bg-[#F2FF00] text-[#0D0E12] shadow-[0_0_8px_rgba(242,255,0,0.4)]'
                      : rank === 'B'
                      ? 'bg-[#00F0FF] text-[#0D0E12] shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : rank === 'C'
                      ? 'bg-[#A0A5B5] text-[#0D0E12]'
                      : 'bg-white text-[#0D0E12]'
                    : 'text-[#A0A5B5] hover:text-white hover:bg-[#242831]'
                }`}
              >
                {rank === 'all' ? 'ALL' : rank}
              </button>
            ))}
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 bg-[#16181D] px-2 py-1 border border-[#2E3342] rounded-sm">
          <span className="text-[10px] font-mono text-[#5C6275] uppercase hidden md:inline">
            SORT:
          </span>
          <select
            data-testid="task-sort-select"
            value={currentSortBy}
            onChange={(e) => handleSortByChange(e.target.value as TaskSortBy)}
            className="bg-[#0D0E12] border border-[#2E3342] text-white text-[11px] font-mono px-2 py-1 rounded-sm focus:outline-none focus:border-[#F2FF00]"
            aria-label="Sort commissions by"
          >
            <option value="createdAt">CREATION DATE</option>
            <option value="dueDate">DUE DATE</option>
            <option value="priority">PRIORITY RANK</option>
            <option value="title">TITLE</option>
          </select>
          <button
            type="button"
            data-testid="task-sort-dir-btn"
            onClick={handleSortDirectionToggle}
            title={`Sort Direction: ${currentSortDirection.toUpperCase()}`}
            aria-label={`Toggle sort order, current: ${currentSortDirection}`}
            className="px-2 py-1 bg-[#242831] hover:bg-[#2E3342] text-[#F2FF00] text-[11px] font-mono font-bold rounded-sm border border-[#2E3342] transition-colors flex items-center gap-1"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{currentSortDirection === 'asc' ? 'ASC' : 'DESC'}</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Row: Status Tabs & Skewed Category Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        {/* Status Filter Tabs (Contract Selectors) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* ALL Filter */}
          <button
            type="button"
            data-testid="filter-status-all"
            onClick={() => onStatusChange('all')}
            className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-sm border transition-all ${
              selectedStatus === 'all'
                ? 'bg-[#F2FF00] text-[#0D0E12] border-[#F2FF00] shadow-[0_0_10px_rgba(242,255,0,0.35)]'
                : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
            }`}
          >
            ALL {counts && <span className="opacity-70 text-[10px]">({counts.all})</span>}
          </button>

          {/* ACTIVE Filter */}
          <button
            type="button"
            data-testid="filter-status-active"
            onClick={() => onStatusChange('active')}
            className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-sm border transition-all ${
              selectedStatus === 'active'
                ? 'bg-[#00F0FF] text-[#0D0E12] border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
            }`}
          >
            ACTIVE {counts && <span className="opacity-70 text-[10px]">({counts.active})</span>}
          </button>

          {/* COMPLETED Filter */}
          <button
            type="button"
            data-testid="filter-status-completed"
            onClick={() => onStatusChange('completed')}
            className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-sm border transition-all ${
              selectedStatus === 'completed'
                ? 'bg-[#B33BFF] text-white border-[#B33BFF] shadow-[0_0_10px_rgba(179,59,255,0.35)]'
                : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
            }`}
          >
            COMPLETED {counts && <span className="opacity-70 text-[10px]">({counts.completed})</span>}
          </button>

          {/* OVERDUE Filter */}
          <button
            type="button"
            data-testid="filter-status-overdue"
            onClick={() => onStatusChange('overdue')}
            className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider rounded-sm border transition-all flex items-center gap-1 ${
              selectedStatus === 'overdue'
                ? 'bg-[#FF3B30] text-white border-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.35)]'
                : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#FF3B30]/50 hover:text-[#FF3B30]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>OVERDUE {counts && <span className="opacity-70 text-[10px]">({counts.overdue})</span>}</span>
          </button>
        </div>

        {/* Skewed Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => {
            const isSelected =
              cat === 'ALL'
                ? selectedCategory === 'all' || selectedCategory === 'ALL' || !selectedCategory
                : selectedCategory.toUpperCase() === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat === 'ALL' ? 'all' : cat)}
                className={`transform -skew-x-12 px-3 py-1 text-xs font-mono font-bold uppercase border transition-all ${
                  isSelected
                    ? 'bg-[#F2FF00] border-[#F2FF00] text-[#0D0E12] shadow-[0_0_10px_rgba(242,255,0,0.3)]'
                    : 'bg-[#16181D] border-[#2E3342] text-[#A0A5B5] hover:text-white hover:border-[#4A5268]'
                }`}
              >
                <span className="inline-block transform skew-x-12 tracking-wider">
                  {cat}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
