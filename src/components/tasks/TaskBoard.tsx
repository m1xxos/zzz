import { useState, useMemo, useContext, type FC } from 'react';
import { Plus, Radio, Inbox } from 'lucide-react';
import { Task, TaskPriority } from '../../types';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import FilterBar from './FilterBar';
import { StoreContext } from '../../store/useStore';

export interface TaskBoardProps {
  tasks?: Task[];
  onCreateTask?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onToggleComplete?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  selectedStatus?: 'all' | 'active' | 'completed' | 'overdue';
  onStatusChange?: (status: 'all' | 'active' | 'completed' | 'overdue') => void;
  selectedPriority?: TaskPriority | 'all';
  onPriorityChange?: (priority: TaskPriority | 'all') => void;
  className?: string;
}

export const TaskBoard: FC<TaskBoardProps> = ({
  tasks: propTasks,
  onCreateTask: propOnCreateTask,
  onUpdateTask: propOnUpdateTask,
  onToggleComplete: propOnToggleComplete,
  onDeleteTask: propOnDeleteTask,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  selectedCategory: externalCategory,
  onCategoryChange: externalOnCategoryChange,
  selectedStatus: externalStatus,
  onStatusChange: externalOnStatusChange,
  selectedPriority: externalPriority,
  onPriorityChange: externalOnPriorityChange,
  className = '',
}) => {
  // Safe inspection of StoreContext if mounted inside StoreProvider
  const store = useContext(StoreContext);

  // Local state fallbacks if uncontrolled and outside store
  const [internalSearch, setInternalSearch] = useState('');
  const [internalCategory, setInternalCategory] = useState('all');
  const [internalStatus, setInternalStatus] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [internalPriority, setInternalPriority] = useState<TaskPriority | 'all'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Determine active task source
  const tasks = propTasks !== undefined ? propTasks : store?.tasks ?? [];

  // Actions
  const handleCreate = propOnCreateTask || (store ? (payload: any) => store.createTask(payload) : undefined);
  const handleUpdate = propOnUpdateTask || (store ? (id: string, updates: any) => store.updateTask(id, updates) : undefined);
  const handleToggle = propOnToggleComplete || (store ? (id: string) => store.toggleTaskCompletion(id) : undefined);
  const handleDelete = propOnDeleteTask || (store ? (id: string) => store.deleteTask(id) : undefined);

  // Filter & Search Controls
  const searchQuery = externalSearchQuery !== undefined
    ? externalSearchQuery
    : (store ? store.searchQuery : internalSearch);
  const onSearchChange = externalOnSearchChange || (store ? store.setSearchQuery : setInternalSearch);

  const selectedCategory = externalCategory !== undefined
    ? externalCategory
    : (store ? store.selectedCategory : internalCategory);
  const onCategoryChange = externalOnCategoryChange || (store ? store.setCategory : setInternalCategory);

  const selectedStatus = externalStatus !== undefined
    ? externalStatus
    : (store ? store.filterStatus : internalStatus);
  const onStatusChange = externalOnStatusChange || (store ? store.setFilterStatus : setInternalStatus);

  const selectedPriority = externalPriority !== undefined
    ? externalPriority
    : (store ? store.selectedPriority : internalPriority);
  const onPriorityChange = externalOnPriorityChange || (store ? store.setPriority : setInternalPriority);

  // Filter tasks
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      active: tasks.filter((t) => !t.completed).length,
      completed: tasks.filter((t) => t.completed).length,
      overdue: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length,
    };
  }, [tasks, todayStr]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Status Filter
      if (selectedStatus === 'active' && task.completed) return false;
      if (selectedStatus === 'completed' && !task.completed) return false;
      if (selectedStatus === 'overdue') {
        if (task.completed || !task.dueDate || task.dueDate >= todayStr) return false;
      }

      // 2. Category Filter
      if (
        selectedCategory &&
        selectedCategory !== 'all' &&
        task.category?.toUpperCase() !== selectedCategory.toUpperCase()
      ) {
        return false;
      }

      // 3. Priority Filter
      if (selectedPriority && selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // 4. Search Query Filter (Title, Description, Tags, Category)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query);
        const catMatch = task.category?.toLowerCase().includes(query);
        const tagsMatch = task.tags?.some((t) => t.toLowerCase().includes(query));
        if (!titleMatch && !descMatch && !catMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, selectedStatus, selectedCategory, selectedPriority, searchQuery, todayStr]);

  // Handle modal submit
  const handleModalSubmit = (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    category: string;
    dueDate: string | null;
    tags: string[];
  }) => {
    if (editingTask) {
      handleUpdate?.(editingTask.id, taskData);
      setEditingTask(null);
    } else {
      handleCreate?.({
        ...taskData,
        status: 'todo',
        completed: false,
      });
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  return (
    <div
      data-testid="tasks-view"
      className={`min-h-full flex flex-col space-y-6 font-['Chakra_Petch',sans-serif] ${className}`}
    >
      {/* 1. HUD OSD Banner & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#16181D] border-2 border-[#2E3342] zzz-corner-cut p-4 shadow-xl">
        {/* Left: OSD Status & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#242831] border border-[#F2FF00] rounded-sm flex items-center justify-center text-[#F2FF00] shadow-[0_0_10px_rgba(242,255,0,0.3)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest text-[#F2FF00] font-bold uppercase">
                PROXY FREQUENCY // ACTIVE
              </span>
              <span className="text-[#5C6275]">|</span>
              <span className="font-mono text-[10px] text-[#A0A5B5] uppercase">
                SECTOR: HOLLOW ZERO 06
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white uppercase flex items-center gap-2">
              <span>COMMISSION DISPATCH BOARD</span>
            </h1>
          </div>
        </div>

        {/* Right: Metrics & Create Task Action */}
        <div className="flex items-center gap-3">
          {/* Quick HUD Metrics */}
          <div className="hidden sm:flex items-center gap-2 bg-[#0D0E12] px-3 py-1.5 rounded-sm border border-[#2E3342] text-xs font-mono">
            <span className="text-[#A0A5B5]">ACTIVE:</span>
            <span className="text-[#00F0FF] font-bold">{counts.active}</span>
            <span className="text-[#5C6275]">/</span>
            <span className="text-[#A0A5B5]">TOTAL:</span>
            <span className="text-white font-bold">{counts.all}</span>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            data-testid="create-task-btn"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F2FF00] hover:bg-[#CBE300] text-[#0D0E12] font-mono font-black text-xs sm:text-sm tracking-wider uppercase rounded-sm border border-[#F2FF00] shadow-[0_0_15px_rgba(242,255,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ DISPATCH COMMISSION</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-[#16181D]/80 border border-[#2E3342] p-4 rounded-sm shadow-md">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          selectedPriority={selectedPriority}
          onPriorityChange={onPriorityChange}
          counts={counts}
        />
      </div>

      {/* 3. Task List or Empty State */}
      {filteredTasks.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#16181D]/50 border-2 border-dashed border-[#2E3342] rounded-sm text-center min-h-[320px]">
          <div className="w-16 h-16 bg-[#242831] border border-[#2E3342] rounded-full flex items-center justify-center mb-4 text-[#5C6275]">
            <Inbox className="w-8 h-8 text-[#A0A5B5]" />
          </div>

          {/* Exact required text from prompt */}
          <h2 className="text-lg sm:text-xl font-bold tracking-wider text-white uppercase mb-2 font-['Chakra_Petch',sans-serif]">
            NO ACTIVE COMMISSIONS FOUND // READY FOR DISPATCH
          </h2>

          <p className="text-xs sm:text-sm text-[#A0A5B5] max-w-md mb-6 font-sans">
            All Hollow routes are secured and no commissions match current query parameters.
            Submit a new commission request or adjust your filters.
          </p>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#242831] hover:bg-[#2E3342] text-[#F2FF00] border border-[#F2FF00]/40 rounded-sm font-mono text-xs font-bold tracking-wider uppercase transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>DISPATCH NEW COMMISSION</span>
          </button>
        </div>
      ) : (
        /* Task Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggle}
              onEdit={handleEditClick}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 4. Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleModalSubmit}
        initialTask={editingTask}
      />
    </div>
  );
};

export default TaskBoard;
