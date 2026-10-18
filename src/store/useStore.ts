/**
 * ZZZTasks Central State Store (React Context & Hook)
 *
 * Implements the unified state container for tasks, active views, filters,
 * real-time search, settings, and mascot interactions.
 * Features debounced auto-persistence via storageService.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  AppState,
  AppSettings,
  Task,
  TaskPriority,
  TaskStatus,
  TaskFilterStatus,
  TaskSortBy,
  SortDirection,
  ActiveView,
  BangbooMood,
} from '../types';
import { loadState, saveState, getDefaultState } from '../services/storage';

// ============================================================================
// Types & Payloads
// ============================================================================

export interface CreateTaskPayload {
  title: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  status?: TaskStatus;
}

export type UpdateTaskPayload = Partial<
  Omit<Task, 'id' | 'createdAt'>
>;

export interface StoreContextType extends AppState {
  // Task CRUD Actions
  createTask: (payload: CreateTaskPayload) => Task;
  updateTask: (id: string, updates: UpdateTaskPayload) => Task | null;
  toggleTaskCompletion: (id: string) => Task | null;
  deleteTask: (id: string) => boolean;

  // Filter & Search Controls
  setSearchQuery: (query: string) => void;
  setCategory: (category: string | 'all') => void;
  setPriority: (priority: TaskPriority | 'all') => void;
  setFilterStatus: (status: TaskFilterStatus) => void;
  setSortBy: (sortBy: TaskSortBy) => void;
  setSortDirection: (direction: SortDirection) => void;

  // Navigation & Date Inspection
  setActiveView: (view: ActiveView) => void;
  setSelectedDate: (date: string) => void;
  setCurrentMonthOffset: (offset: number) => void;

  // Settings & Audio Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleAudioMute: () => boolean;
  setAudioVolume: (volume: number) => void;

  // Mascot Actions
  setBangbooMood: (mood: BangbooMood) => void;

  // Persistence & Reset
  importState: (newState: AppState) => void;
  resetState: () => void;
  flushSave: () => void;

  // Computed Selectors
  filteredTasks: Task[];
  taskCounts: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  categories: string[];
  tasksByDate: Record<string, Task[]>;
  overdueTasks: Task[];
  getTaskById: (id: string) => Task | undefined;
}

// ============================================================================
// Pure Domain Helper Functions
// ============================================================================

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'zzz-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

export function isTaskOverdue(task: Task, todayDate: string = getTodayIsoDate()): boolean {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < todayDate;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Combat',
  'Hollow',
  'Story',
  'Errands',
  'Inter-Knot',
  'Work',
  'Life',
];

export function filterAndSortTasks(
  tasks: Task[],
  filters: {
    status: TaskFilterStatus;
    category: string | 'all';
    priority: TaskPriority | 'all';
    searchQuery: string;
    sortBy?: TaskSortBy;
    sortDirection?: SortDirection;
    todayDate?: string;
  }
): Task[] {
  const today = filters.todayDate ?? getTodayIsoDate();
  const trimmedQuery = filters.searchQuery.trim().toLowerCase();
  const sortBy = filters.sortBy ?? 'createdAt';
  const sortDirection = filters.sortDirection ?? 'desc';

  return tasks
    .filter((task) => {
      // 1. Status Filter
      if (filters.status === 'active' && task.completed) return false;
      if (filters.status === 'completed' && !task.completed) return false;
      if (filters.status === 'overdue' && !isTaskOverdue(task, today)) return false;

      // 2. Category Filter (Case-insensitive)
      if (filters.category !== 'all') {
        if (task.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // 3. Priority Rank Filter
      if (filters.priority !== 'all') {
        if (task.priority !== filters.priority) {
          return false;
        }
      }

      // 4. Search Query Matching (Substring matching across title, description, and tags)
      if (trimmedQuery.length > 0) {
        const titleMatch = task.title.toLowerCase().includes(trimmedQuery);
        const descMatch = (task.description || '').toLowerCase().includes(trimmedQuery);
        const tagsMatch = (task.tags || []).some((tag) =>
          tag.toLowerCase().includes(trimmedQuery)
        );

        if (!titleMatch && !descMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // In 'all' view, completed tasks are pushed to the bottom
      if (filters.status === 'all' && a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      let diff = 0;
      switch (sortBy) {
        case 'priority': {
          const priorityWeight: Record<TaskPriority, number> = { S: 4, A: 3, B: 2, C: 1 };
          const weightA = priorityWeight[a.priority] ?? 0;
          const weightB = priorityWeight[b.priority] ?? 0;
          diff = weightA - weightB; // High priority first when sorted desc
          break;
        }
        case 'dueDate': {
          if (a.dueDate && b.dueDate) {
            diff = a.dueDate.localeCompare(b.dueDate);
          } else if (a.dueDate && !b.dueDate) {
            diff = -1; // Has date comes first
          } else if (!a.dueDate && b.dueDate) {
            diff = 1;
          } else {
            diff = 0;
          }
          break;
        }
        case 'title': {
          diff = a.title.localeCompare(b.title);
          break;
        }
        case 'createdAt':
        default: {
          diff = a.createdAt.localeCompare(b.createdAt);
          break;
        }
      }

      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }

      // Stable secondary tie-breaker: S > A > B > C rank
      const priorityOrder: Record<TaskPriority, number> = { S: 0, A: 1, B: 2, C: 3 };
      const pDiff = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pDiff !== 0) return pDiff;

      // Tertiary tie-breaker: newest createdAt first
      return b.createdAt.localeCompare(a.createdAt);
    });
}

// ============================================================================
// Context & Provider Setup
// ============================================================================

export const StoreContext = createContext<StoreContextType | null>(null);

export interface StoreProviderProps {
  children?: React.ReactNode;
  initialState?: Partial<AppState>;
  debounceMs?: number;
  autoSaveDisabled?: boolean;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({
  children,
  initialState,
  debounceMs = 300,
  autoSaveDisabled = false,
}) => {
  // Initialize state from storageService or defaults
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    return {
      ...loaded,
      ...(initialState || {}),
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save function
  const scheduleSave = useCallback(
    (immediate = false) => {
      if (autoSaveDisabled) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (immediate) {
        try {
          saveState(stateRef.current);
        } catch (err) {
          console.error('[Store] Immediate save failed:', err);
        }
        return;
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          saveState(stateRef.current);
        } catch (err) {
          console.error('[Store] Debounced auto-save failed:', err);
        }
        saveTimeoutRef.current = null;
      }, debounceMs);
    },
    [debounceMs, autoSaveDisabled]
  );

  // Trigger debounced save when persistent properties change
  useEffect(() => {
    scheduleSave(false);
  }, [state.tasks, state.dailies, state.settings, scheduleSave]);

  // Flush on unmount or beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveState(stateRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        try {
          saveState(stateRef.current);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const flushSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveState(stateRef.current);
  }, []);

  // ==========================================================================
  // Task CRUD Actions
  // ==========================================================================

  const createTask = useCallback((payload: CreateTaskPayload): Task => {
    const trimmedTitle = (payload.title || '').trim();
    if (!trimmedTitle) {
      throw new Error('Task title cannot be empty.');
    }

    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateTaskId(),
      title: trimmedTitle,
      description: (payload.description || '').trim(),
      category: (payload.category || 'General').trim(),
      priority: payload.priority || 'B',
      status: payload.status || 'todo',
      completed: payload.status === 'completed',
      dueDate: payload.dueDate ? payload.dueDate.trim() : null,
      tags: Array.isArray(payload.tags)
        ? payload.tags.map((t) => t.trim()).filter(Boolean)
        : [],
      createdAt: now,
      updatedAt: now,
      completedAt: payload.status === 'completed' ? now : null,
    };

    stateRef.current = {
      ...stateRef.current,
      tasks: [newTask, ...stateRef.current.tasks],
    };

    setState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));

    return newTask;
  }, []);

  const updateTask = useCallback(
    (id: string, updates: UpdateTaskPayload): Task | null => {
      const currentTask = stateRef.current.tasks.find((t) => t.id === id);
      if (!currentTask) return null;

      const newTitle =
        updates.title !== undefined ? updates.title.trim() : currentTask.title;
      if (!newTitle) {
        throw new Error('Task title cannot be empty.');
      }

      const now = new Date().toISOString();
      let newStatus = updates.status !== undefined ? updates.status : currentTask.status;
      let newCompleted =
        updates.completed !== undefined ? updates.completed : currentTask.completed;

      // Synchronize status and completed boolean
      if (updates.completed !== undefined && updates.status === undefined) {
        newStatus = updates.completed ? 'completed' : 'todo';
      } else if (updates.status !== undefined && updates.completed === undefined) {
        newCompleted = updates.status === 'completed';
      }

      let completedAt = currentTask.completedAt;
      if (newCompleted && !currentTask.completed) {
        completedAt = now;
      } else if (!newCompleted) {
        completedAt = null;
      }

      const updatedTask: Task = {
        ...currentTask,
        ...updates,
        title: newTitle,
        description:
          updates.description !== undefined
            ? updates.description.trim()
            : currentTask.description,
        category:
          updates.category !== undefined
            ? updates.category.trim()
            : currentTask.category,
        priority: updates.priority || currentTask.priority,
        status: newStatus,
        completed: newCompleted,
        completedAt,
        dueDate:
          updates.dueDate !== undefined ? updates.dueDate : currentTask.dueDate,
        tags:
          updates.tags !== undefined
            ? updates.tags.map((t) => t.trim()).filter(Boolean)
            : currentTask.tags,
        updatedAt: now,
      };

      stateRef.current = {
        ...stateRef.current,
        tasks: stateRef.current.tasks.map((t) => (t.id === id ? updatedTask : t)),
      };

      setState((prev) => {
        const index = prev.tasks.findIndex((t) => t.id === id);
        if (index === -1) return prev;
        const updatedList = [...prev.tasks];
        updatedList[index] = updatedTask;
        return {
          ...prev,
          tasks: updatedList,
        };
      });

      return updatedTask;
    },
    []
  );

  const toggleTaskCompletion = useCallback((id: string): Task | null => {
    const current = stateRef.current.tasks.find((t) => t.id === id);
    if (!current) return null;

    const now = new Date().toISOString();
    const nextCompleted = !current.completed;
    const nextStatus: TaskStatus = nextCompleted ? 'completed' : 'todo';
    const completedAt = nextCompleted ? now : null;

    const result: Task = {
      ...current,
      completed: nextCompleted,
      status: nextStatus,
      completedAt,
      updatedAt: now,
    };

    const bangbooMood: BangbooMood = nextCompleted ? 'celebrating' : stateRef.current.bangboo.currentMood;

    stateRef.current = {
      ...stateRef.current,
      tasks: stateRef.current.tasks.map((t) => (t.id === id ? result : t)),
      bangboo: {
        ...stateRef.current.bangboo,
        currentMood: bangbooMood,
        lastInteractedAt: now,
      },
    };

    setState((prev) => {
      const index = prev.tasks.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      const updatedList = [...prev.tasks];
      updatedList[index] = result;

      return {
        ...prev,
        tasks: updatedList,
        bangboo: {
          ...prev.bangboo,
          currentMood: bangbooMood,
          lastInteractedAt: now,
        },
      };
    });

    return result;
  }, []);

  const deleteTask = useCallback((id: string): boolean => {
    const exists = stateRef.current.tasks.some((t) => t.id === id);
    if (!exists) return false;

    stateRef.current = {
      ...stateRef.current,
      tasks: stateRef.current.tasks.filter((t) => t.id !== id),
    };

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));

    return true;
  }, []);

  // ==========================================================================
  // Filter & Search Actions
  // ==========================================================================

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setCategory = useCallback((category: string | 'all') => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const setPriority = useCallback((priority: TaskPriority | 'all') => {
    setState((prev) => ({ ...prev, selectedPriority: priority }));
  }, []);

  const setFilterStatus = useCallback((status: TaskFilterStatus) => {
    setState((prev) => ({ ...prev, filterStatus: status }));
  }, []);

  const setSortBy = useCallback((sortBy: TaskSortBy) => {
    setState((prev) => ({ ...prev, sortBy }));
  }, []);

  const setSortDirection = useCallback((sortDirection: SortDirection) => {
    setState((prev) => ({ ...prev, sortDirection }));
  }, []);

  // ==========================================================================
  // Navigation & View Actions
  // ==========================================================================

  const setActiveView = useCallback((view: ActiveView) => {
    setState((prev) => ({ ...prev, activeView: view }));
  }, []);

  const setSelectedDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, selectedDate: date }));
  }, []);

  const setCurrentMonthOffset = useCallback((offset: number) => {
    setState((prev) => ({ ...prev, currentMonthOffset: offset }));
  }, []);

  // ==========================================================================
  // Settings & Audio Actions
  // ==========================================================================

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
        audio: {
          ...prev.settings.audio,
          ...(updates.audio || {}),
        },
        visual: {
          ...prev.settings.visual,
          ...(updates.visual || {}),
        },
        bangboo: {
          ...prev.settings.bangboo,
          ...(updates.bangboo || {}),
        },
      },
    }));
  }, []);

  const toggleAudioMute = useCallback((): boolean => {
    const nextMuted = !stateRef.current.settings.audio.muted;
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        audio: {
          ...prev.settings.audio,
          muted: nextMuted,
        },
      },
    }));
    return nextMuted;
  }, []);

  const setAudioVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        audio: {
          ...prev.settings.audio,
          volume: clamped,
        },
      },
    }));
  }, []);

  const setBangbooMood = useCallback((mood: BangbooMood) => {
    setState((prev) => ({
      ...prev,
      bangboo: {
        ...prev.bangboo,
        currentMood: mood,
        lastInteractedAt: new Date().toISOString(),
      },
    }));
  }, []);

  // ==========================================================================
  // Import & Reset Actions
  // ==========================================================================

  const importState = useCallback((newState: AppState) => {
    setState(newState);
    saveState(newState);
  }, []);

  const resetState = useCallback(() => {
    const defaults = getDefaultState();
    setState(defaults);
    saveState(defaults);
  }, []);

  // ==========================================================================
  // Computed Selectors
  // ==========================================================================

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(state.tasks, {
      status: state.filterStatus,
      category: state.selectedCategory,
      priority: state.selectedPriority,
      searchQuery: state.searchQuery,
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
    });
  }, [
    state.tasks,
    state.filterStatus,
    state.selectedCategory,
    state.selectedPriority,
    state.searchQuery,
    state.sortBy,
    state.sortDirection,
  ]);

  const taskCounts = useMemo(() => {
    const today = getTodayIsoDate();
    let total = 0;
    let active = 0;
    let completed = 0;
    let overdue = 0;

    for (const task of state.tasks) {
      total++;
      if (task.completed) {
        completed++;
      } else {
        active++;
        if (isTaskOverdue(task, today)) {
          overdue++;
        }
      }
    }

    return { total, active, completed, overdue };
  }, [state.tasks]);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const t of state.tasks) {
      if (t.category) {
        set.add(t.category);
      }
    }
    return Array.from(set);
  }, [state.tasks]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of state.tasks) {
      if (task.dueDate) {
        if (!map[task.dueDate]) {
          map[task.dueDate] = [];
        }
        map[task.dueDate].push(task);
      }
    }
    return map;
  }, [state.tasks]);

  const overdueTasks = useMemo(() => {
    const today = getTodayIsoDate();
    return state.tasks.filter((t) => isTaskOverdue(t, today));
  }, [state.tasks]);

  const getTaskById = useCallback(
    (id: string): Task | undefined => {
      return state.tasks.find((t) => t.id === id);
    },
    [state.tasks]
  );

  const contextValue: StoreContextType = {
    ...state,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    setSearchQuery,
    setCategory,
    setPriority,
    setFilterStatus,
    setSortBy,
    setSortDirection,
    setActiveView,
    setSelectedDate,
    setCurrentMonthOffset,
    updateSettings,
    toggleAudioMute,
    setAudioVolume,
    setBangbooMood,
    importState,
    resetState,
    flushSave,
    filteredTasks,
    taskCounts,
    categories,
    tasksByDate,
    overdueTasks,
    getTaskById,
  };

  return React.createElement(StoreContext.Provider, { value: contextValue }, children);
};

// ============================================================================
// Hook
// ============================================================================

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export default useStore;
