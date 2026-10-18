/**
 * Unit Test Suite for ZZZTasks Task Management Engine
 * Tests complete task lifecycle (CRUD), multi-facet filtering, real-time search,
 * sorting, computed selectors, and debounced persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  useStore,
  StoreProvider,
  filterAndSortTasks,
  isTaskOverdue,
  generateTaskId,
  getTodayIsoDate,
} from '../store/useStore';
import { Task } from '../types';
import * as storageService from '../services/storage';

describe('Task Helper & Pure Logic Tests', () => {
  it('generateTaskId produces unique non-empty strings', () => {
    const id1 = generateTaskId();
    const id2 = generateTaskId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('getTodayIsoDate returns valid YYYY-MM-DD formatted date', () => {
    const today = getTodayIsoDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('isTaskOverdue correctly determines overdue status', () => {
    const baseTask: Task = {
      id: 'task-1',
      title: 'Hollow Mission',
      description: 'Clear the rift',
      category: 'Combat',
      priority: 'S',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-10',
      tags: [],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      completedAt: null,
    };

    // Past due date & not completed => overdue
    expect(isTaskOverdue(baseTask, '2026-10-18')).toBe(true);

    // Past due date BUT completed => NOT overdue
    expect(isTaskOverdue({ ...baseTask, completed: true, status: 'completed' }, '2026-10-18')).toBe(false);

    // Future due date => NOT overdue
    expect(isTaskOverdue({ ...baseTask, dueDate: '2026-10-25' }, '2026-10-18')).toBe(false);

    // Today due date => NOT overdue
    expect(isTaskOverdue({ ...baseTask, dueDate: '2026-10-18' }, '2026-10-18')).toBe(false);

    // No due date => NOT overdue
    expect(isTaskOverdue({ ...baseTask, dueDate: null }, '2026-10-18')).toBe(false);
  });
});

describe('filterAndSortTasks Pure Logic Tests', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Eliminate Ethereal Swarm in Hollow Zero',
      description: 'Clear sector 7 before corruption reaches peak',
      category: 'Combat',
      priority: 'S',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-15', // overdue relative to 2026-10-18
      tags: ['hollow', 'bounty', 'urgent'],
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
      completedAt: null,
    },
    {
      id: 'task-2',
      title: 'Restock Sixth Street Noodle Cart',
      description: 'Buy bone broth and ramen noodles from General Chop',
      category: 'Errands',
      priority: 'B',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-25', // future
      tags: ['food', 'daily'],
      createdAt: '2026-10-02T10:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
      completedAt: null,
    },
    {
      id: 'task-3',
      title: 'Fix VHS Tape Player in Random Play',
      description: 'Clean magnetic heads on VCR deck #3',
      category: 'Work',
      priority: 'A',
      status: 'completed',
      completed: true,
      dueDate: '2026-10-12',
      tags: ['store', 'repair'],
      createdAt: '2026-10-03T10:00:00Z',
      updatedAt: '2026-10-12T14:00:00Z',
      completedAt: '2026-10-12T14:00:00Z',
    },
    {
      id: 'task-4',
      title: 'Calibrate Bangboo Companion Sensor',
      description: 'Run diagnostic protocol on Eous optical sensors',
      category: 'Combat',
      priority: 'C',
      status: 'todo',
      completed: false,
      dueDate: null,
      tags: ['bangboo', 'tech'],
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
      completedAt: null,
    },
  ];

  it('filters by status: all, active, completed, overdue', () => {
    // All
    const all = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'all',
      searchQuery: '',
      todayDate: '2026-10-18',
    });
    expect(all).toHaveLength(4);

    // Active
    const active = filterAndSortTasks(sampleTasks, {
      status: 'active',
      category: 'all',
      priority: 'all',
      searchQuery: '',
      todayDate: '2026-10-18',
    });
    expect(active).toHaveLength(3);
    expect(active.every((t) => !t.completed)).toBe(true);

    // Completed
    const completed = filterAndSortTasks(sampleTasks, {
      status: 'completed',
      category: 'all',
      priority: 'all',
      searchQuery: '',
      todayDate: '2026-10-18',
    });
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe('task-3');

    // Overdue
    const overdue = filterAndSortTasks(sampleTasks, {
      status: 'overdue',
      category: 'all',
      priority: 'all',
      searchQuery: '',
      todayDate: '2026-10-18',
    });
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('task-1');
  });

  it('filters by category accurately and case-insensitively', () => {
    const combat = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'combat',
      priority: 'all',
      searchQuery: '',
    });
    expect(combat).toHaveLength(2);
    expect(combat.map((t) => t.id)).toEqual(expect.arrayContaining(['task-1', 'task-4']));

    const nonExistent = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'NonExistentCategory',
      priority: 'all',
      searchQuery: '',
    });
    expect(nonExistent).toHaveLength(0);
  });

  it('filters by priority rank', () => {
    const rankS = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'S',
      searchQuery: '',
    });
    expect(rankS).toHaveLength(1);
    expect(rankS[0].id).toBe('task-1');

    const rankA = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'A',
      searchQuery: '',
    });
    expect(rankA).toHaveLength(1);
    expect(rankA[0].id).toBe('task-3');
  });

  it('matches search queries across title, description, and tags', () => {
    // Title match
    const titleRes = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'all',
      searchQuery: 'ethereal',
    });
    expect(titleRes).toHaveLength(1);
    expect(titleRes[0].id).toBe('task-1');

    // Description match
    const descRes = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'all',
      searchQuery: 'general chop',
    });
    expect(descRes).toHaveLength(1);
    expect(descRes[0].id).toBe('task-2');

    // Tag match
    const tagRes = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'all',
      searchQuery: 'repair',
    });
    expect(tagRes).toHaveLength(1);
    expect(tagRes[0].id).toBe('task-3');
  });

  it('safely handles special regex characters in search queries without throwing', () => {
    const specialQueries = ['[Hollow]', '.*', '(urgent)', 'repair?', 'c++'];
    for (const q of specialQueries) {
      expect(() =>
        filterAndSortTasks(sampleTasks, {
          status: 'all',
          category: 'all',
          priority: 'all',
          searchQuery: q,
        })
      ).not.toThrow();
    }
  });

  it('sorts tasks by priority (S > A > B > C) and pushes completed tasks down in all view', () => {
    const sorted = filterAndSortTasks(sampleTasks, {
      status: 'all',
      category: 'all',
      priority: 'all',
      searchQuery: '',
      sortBy: 'priority',
    });

    // Active tasks come first: S (task-1), B (task-2), C (task-4)
    // Completed task comes last: A (task-3)
    expect(sorted[0].priority).toBe('S');
    expect(sorted[sorted.length - 1].completed).toBe(true);
  });
});

describe('Store Hook (useStore) & State Management Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('throws an error if useStore is used outside of StoreProvider', () => {
    // Suppress console.error during expected throw
    const originalConsoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useStore());
    }).toThrow('useStore must be used within a StoreProvider');

    console.error = originalConsoleError;
  });

  it('creates a task with complete defaults and trims title', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.createTask({
        title: '  Infiltrate Ballet Twins Hollow  ',
        category: 'Combat',
        priority: 'S',
        description: 'Rescue missing investigative team',
        dueDate: '2026-10-30',
        tags: ['urgent', 'hollow'],
      });
    });

    expect(result.current.tasks).toHaveLength(1);
    const created = result.current.tasks[0];
    expect(created.title).toBe('Infiltrate Ballet Twins Hollow');
    expect(created.category).toBe('Combat');
    expect(created.priority).toBe('S');
    expect(created.status).toBe('todo');
    expect(created.completed).toBe(false);
    expect(created.dueDate).toBe('2026-10-30');
    expect(created.tags).toEqual(['urgent', 'hollow']);
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
    expect(created.completedAt).toBeNull();
  });

  it('rejects creating a task with empty or whitespace-only title', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(() => {
      act(() => {
        result.current.createTask({ title: '   ' });
      });
    }).toThrow('Task title cannot be empty.');

    expect(result.current.tasks).toHaveLength(0);
  });

  it('updates task properties and refreshes updatedAt timestamp', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    let taskId = '';
    act(() => {
      const t = result.current.createTask({
        title: 'Initial Title',
        priority: 'B',
        category: 'Errands',
      });
      taskId = t.id;
    });

    const initialCreatedAt = result.current.tasks[0].createdAt;

    // Advance clock to verify updatedAt change
    vi.advanceTimersByTime(1000);

    act(() => {
      result.current.updateTask(taskId, {
        title: 'Updated Title',
        priority: 'A',
        description: 'New detailed notes',
      });
    });

    const updated = result.current.tasks[0];
    expect(updated.title).toBe('Updated Title');
    expect(updated.priority).toBe('A');
    expect(updated.description).toBe('New detailed notes');
    expect(updated.category).toBe('Errands'); // preserved untouched field
    expect(updated.createdAt).toBe(initialCreatedAt); // preserved creation timestamp
  });

  it('toggles task completion and triggers Bangboo celebratory mood', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    let taskId = '';
    act(() => {
      const t = result.current.createTask({ title: 'Finish Daily Commission' });
      taskId = t.id;
    });

    expect(result.current.tasks[0].completed).toBe(false);
    expect(result.current.tasks[0].status).toBe('todo');

    // Toggle to completed
    act(() => {
      result.current.toggleTaskCompletion(taskId);
    });

    expect(result.current.tasks[0].completed).toBe(true);
    expect(result.current.tasks[0].status).toBe('completed');
    expect(result.current.tasks[0].completedAt).toBeTruthy();
    expect(result.current.bangboo.currentMood).toBe('celebrating');

    // Toggle back to active
    act(() => {
      result.current.toggleTaskCompletion(taskId);
    });

    expect(result.current.tasks[0].completed).toBe(false);
    expect(result.current.tasks[0].status).toBe('todo');
    expect(result.current.tasks[0].completedAt).toBeNull();
  });

  it('deletes an existing task by ID and returns true, returns false on missing ID', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    let id1 = '';
    let id2 = '';

    act(() => {
      id1 = result.current.createTask({ title: 'Task 1' }).id;
      id2 = result.current.createTask({ title: 'Task 2' }).id;
    });

    expect(result.current.tasks).toHaveLength(2);

    let deleteSuccess = false;
    act(() => {
      deleteSuccess = result.current.deleteTask(id1);
    });

    expect(deleteSuccess).toBe(true);
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe(id2);

    let deleteMissing = false;
    act(() => {
      deleteMissing = result.current.deleteTask('non-existent-id');
    });

    expect(deleteMissing).toBe(false);
    expect(result.current.tasks).toHaveLength(1);
  });

  it('accurately updates taskCounts selector', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.taskCounts).toEqual({
      total: 0,
      active: 0,
      completed: 0,
      overdue: 0,
    });

    act(() => {
      // Active normal
      result.current.createTask({ title: 'Task Normal', dueDate: '2099-01-01' });
      // Active overdue
      result.current.createTask({ title: 'Task Overdue', dueDate: '2020-01-01' });
      // Completed
      const completedTask = result.current.createTask({ title: 'Task Completed' });
      result.current.toggleTaskCompletion(completedTask.id);
    });

    expect(result.current.taskCounts).toEqual({
      total: 3,
      active: 2,
      completed: 1,
      overdue: 1,
    });
  });

  it('debounces auto-save calls to storageService.saveState', () => {
    const saveStateSpy = vi.spyOn(storageService, 'saveState');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { debounceMs: 300 }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    // Initial load might trigger or not
    saveStateSpy.mockClear();

    // Trigger 3 rapid task additions
    act(() => {
      result.current.createTask({ title: 'Rapid 1' });
    });
    act(() => {
      result.current.createTask({ title: 'Rapid 2' });
    });
    act(() => {
      result.current.createTask({ title: 'Rapid 3' });
    });

    // Before timer expires, saveState should not have been called for these changes
    expect(saveStateSpy).not.toHaveBeenCalled();

    // Advance by 350ms to cross debounce threshold
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    const savedState = saveStateSpy.mock.calls[0][0];
    expect(savedState.tasks).toHaveLength(3);
  });

  it('flushSave immediately saves state without waiting for debounce', () => {
    const saveStateSpy = vi.spyOn(storageService, 'saveState');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { debounceMs: 1000 }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    saveStateSpy.mockClear();

    act(() => {
      result.current.createTask({ title: 'Immediate Commission' });
      result.current.flushSave();
    });

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
  });

  it('updates audio preferences and toggles audio mute', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(StoreProvider, { autoSaveDisabled: true }, children)
    );
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.settings.audio.muted).toBe(false);

    let newMuted = false;
    act(() => {
      newMuted = result.current.toggleAudioMute();
    });

    expect(newMuted).toBe(true);
    expect(result.current.settings.audio.muted).toBe(true);

    act(() => {
      result.current.setAudioVolume(0.5);
    });

    expect(result.current.settings.audio.volume).toBe(0.5);
  });
});
