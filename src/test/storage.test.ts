/**
 * ZZZTasks Storage Service Unit Test Suite
 * Tests state persistence, corrupted JSON handling, quota fallback,
 * backup schema validation, XSS sanitization, and restore integrity.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadState,
  saveState,
  exportBackup,
  validateBackup,
  importBackup,
  getDefaultState,
  sanitizeInput,
  STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  APP_IDENTIFIER,
} from '../services/storage';
import { Task, ZZZTasksBackupData } from '../types';

describe('Milestone 2: Storage Service & Data Layer Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Initial State & Persistence (loadState & saveState)
  // ==========================================================================
  describe('1. State Persistence & Initialization', () => {
    it('returns clean default state when localStorage is empty', () => {
      const state = loadState();

      expect(state).toBeDefined();
      expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(state.tasks).toEqual([]);
      expect(state.dailies).toBeDefined();
      expect(state.dailies.commissions.length).toBe(4);
      expect(state.dailies.commissions[0].title).toBe('Coff Cafe Double Shot');
      expect(state.dailies.currentStreak).toBe(0);
      expect(state.settings.audio.muted).toBe(false);
      expect(state.settings.bangboo.mascotType).toBe('eous');
      expect(state.activeView).toBe('tasks');
    });

    it('saves state to localStorage under the zzztasks_state key', () => {
      const state = getDefaultState();
      const mockTask: Task = {
        id: 'task-1',
        title: 'Clear Hollow Zero Section 7',
        description: 'Defeat ethereal swarm before corruption level 4',
        category: 'Combat',
        priority: 'S',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-25',
        tags: ['outer-ring', 'urgent'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      state.tasks.push(mockTask);
      const saved = saveState(state);

      expect(saved).toBe(true);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.tasks.length).toBe(1);
      expect(parsed.tasks[0].title).toBe('Clear Hollow Zero Section 7');
      expect(parsed.tasks[0].priority).toBe('S');
    });

    it('loads previously saved state with 100% data fidelity', () => {
      const state = getDefaultState();
      state.tasks = [
        {
          id: 'task-s-rank',
          title: 'Operation Twin Ballet',
          description: 'Commission from Mayor of Lumina Square',
          category: 'Inter-Knot',
          priority: 'S',
          status: 'in_progress',
          completed: false,
          dueDate: '2026-10-30',
          tags: ['bounty', 'boss'],
          createdAt: '2026-10-18T10:00:00.000Z',
          updatedAt: '2026-10-18T11:00:00.000Z',
          completedAt: null,
        },
      ];
      state.dailies.currentStreak = 7;
      state.dailies.longestStreak = 12;
      state.settings.audio.muted = true;
      state.settings.audio.volume = 0.5;

      saveState(state);

      const loaded = loadState();
      expect(loaded.tasks.length).toBe(1);
      expect(loaded.tasks[0].id).toBe('task-s-rank');
      expect(loaded.tasks[0].priority).toBe('S');
      expect(loaded.tasks[0].status).toBe('in_progress');
      expect(loaded.dailies.currentStreak).toBe(7);
      expect(loaded.dailies.longestStreak).toBe(12);
      expect(loaded.settings.audio.muted).toBe(true);
      expect(loaded.settings.audio.volume).toBe(0.5);
    });

    it('automatically backfills missing properties from older partial state schemas', () => {
      // Simulate older version storage missing bangboo state and visual settings
      const legacyRaw = JSON.stringify({
        version: '0.9.0',
        tasks: [
          {
            id: 'legacy-1',
            title: 'Old Commission',
            priority: 'A',
            status: 'todo',
            completed: false,
          },
        ],
        dailies: {
          currentStreak: 3,
        },
      });

      localStorage.setItem(STORAGE_KEY, legacyRaw);

      const loaded = loadState();
      expect(loaded.tasks.length).toBe(1);
      expect(loaded.tasks[0].title).toBe('Old Commission');
      expect(loaded.dailies.currentStreak).toBe(3);
      // Backfilled properties
      expect(loaded.settings).toBeDefined();
      expect(loaded.settings.audio).toBeDefined();
      expect(loaded.settings.visual.crtOverlay).toBe(true);
      expect(loaded.settings.bangboo.mascotType).toBe('eous');
      expect(loaded.bangboo.currentMood).toBe('idle');
    });
  });

  // ==========================================================================
  // 2. Corrupted Data & Error Handling
  // ==========================================================================
  describe('2. Error Resilience & Quota Handling', () => {
    it('gracefully recovers default state when localStorage contains malformed JSON syntax', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem(STORAGE_KEY, '{ invalid_json ::: malformed !!!');

      const state = loadState();
      expect(state).toBeDefined();
      expect(state.tasks).toEqual([]);
      expect(state.version).toBe(CURRENT_SCHEMA_VERSION);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('gracefully recovers default state when localStorage contains non-object values', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('plain-string-instead-of-object'));
      expect(loadState().tasks).toEqual([]);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(12345));
      expect(loadState().tasks).toEqual([]);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(null));
      expect(loadState().tasks).toEqual([]);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(['array', 'instead', 'of', 'state']));
      expect(loadState().tasks).toEqual([]);
    });

    it('recovers empty tasks array if tasks property in storage is not an array', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks: 'not an array',
          version: '1.0.0',
        })
      );

      const state = loadState();
      expect(Array.isArray(state.tasks)).toBe(true);
      expect(state.tasks).toEqual([]);
    });

    it('handles QuotaExceededError in saveState without throwing unhandled exceptions', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      // Mock setItem to throw QuotaExceededError
      vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
        const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');
        throw quotaError;
      });

      const state = getDefaultState();
      const success = saveState(state);

      expect(success).toBe(false);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'zzztasks:quota-exceeded',
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 3. Backup Export
  // ==========================================================================
  describe('3. Backup Export Engine', () => {
    it('generates formatted JSON string adhering to ZZZTasksBackupData schema 1.0.0', () => {
      const state = getDefaultState();
      state.tasks = [
        {
          id: 'exp-task-1',
          title: 'Bangboo Firmware Update',
          description: 'Install patch 1.2 on Eous',
          category: 'Work',
          priority: 'B',
          status: 'completed',
          completed: true,
          dueDate: null,
          tags: ['tech'],
          createdAt: '2026-10-18T12:00:00.000Z',
          updatedAt: '2026-10-18T13:00:00.000Z',
          completedAt: '2026-10-18T13:00:00.000Z',
        },
      ];
      state.dailies.currentStreak = 5;

      const jsonString = exportBackup(state);

      expect(typeof jsonString).toBe('string');
      const parsed: ZZZTasksBackupData = JSON.parse(jsonString);

      expect(parsed.app).toBe(APP_IDENTIFIER);
      expect(parsed.version).toBe(1);
      expect(parsed.schemaVersion).toBe('1.0.0');
      expect(parsed.exportedAt).toBeTruthy();
      expect(new Date(parsed.exportedAt).getTime()).not.toBeNaN();
      expect(parsed.payload.tasks.length).toBe(1);
      expect(parsed.payload.tasks[0].title).toBe('Bangboo Firmware Update');
      expect(parsed.payload.dailies.currentStreak).toBe(5);
      expect(parsed.payload.settings).toBeDefined();
    });
  });

  // ==========================================================================
  // 4. Backup Schema Validation & XSS Sanitization
  // ==========================================================================
  describe('4. Backup Schema Validation & XSS Sanitization', () => {
    it('rejects empty, null, or whitespace-only backup input', () => {
      expect(validateBackup('').valid).toBe(false);
      expect(validateBackup('   ').valid).toBe(false);
      expect(validateBackup(null as any).valid).toBe(false);
    });

    it('rejects malformed JSON syntax with descriptive error message', () => {
      const res = validateBackup('{ broken_json ::: true ');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Malformed JSON syntax');
    });

    it('rejects JSON missing required tasks array and dailies object (e.g. { randomKey: 123 })', () => {
      const res = validateBackup(JSON.stringify({ randomKey: 123 }));
      expect(res.valid).toBe(false);
      expect(res.error).toContain('missing required tasks array or dailies object');
    });

    it('rejects tasks with empty or whitespace-only title', () => {
      const invalidBackup = {
        app: APP_IDENTIFIER,
        schemaVersion: '1.0.0',
        payload: {
          tasks: [
            {
              id: 'task-empty',
              title: '   ',
              priority: 'A',
            },
          ],
        },
      };

      const res = validateBackup(JSON.stringify(invalidBackup));
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty or missing title');
    });

    it('validates and accepts wrapped ZZZTasksBackupData backup files', () => {
      const validBackup: ZZZTasksBackupData = {
        app: APP_IDENTIFIER,
        version: 1,
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload: {
          tasks: [
            {
              id: 'task-valid',
              title: 'Valid S-Rank Task',
              description: 'Clear Hollow',
              category: 'Combat',
              priority: 'S',
              status: 'todo',
              completed: false,
              dueDate: '2026-10-31',
              tags: ['hollow'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: null,
            },
          ],
          dailies: getDefaultState().dailies,
          settings: getDefaultState().settings,
        },
      };

      const res = validateBackup(JSON.stringify(validBackup));
      expect(res.valid).toBe(true);
      expect(res.data).toBeDefined();
    });

    it('validates and accepts direct AppState raw snapshots', () => {
      const rawSnapshot = {
        tasks: [
          {
            id: 'raw-1',
            title: 'Snapshot Task',
            priority: 'B',
            status: 'todo',
            completed: false,
          },
        ],
        dailies: {
          currentStreak: 2,
        },
      };

      const res = validateBackup(JSON.stringify(rawSnapshot));
      expect(res.valid).toBe(true);
      expect(res.data).toBeDefined();
    });

    it('detects and neutralizes malicious XSS script injection vectors', () => {
      const xssBackup = {
        app: APP_IDENTIFIER,
        schemaVersion: '1.0.0',
        payload: {
          tasks: [
            {
              id: 'xss-1',
              title: '<script>alert("XSS-TITLE")</script>Dangerous Task',
              description: '<img src=x onerror=alert("XSS-DESC")>Details',
              category: 'Combat<iframe src="evil.com"></iframe>',
              tags: ['safe', '<script>alert("TAG")</script>tag2'],
              priority: 'S',
              status: 'todo',
              completed: false,
            },
          ],
        },
      };

      const res = validateBackup(JSON.stringify(xssBackup));
      expect(res.valid).toBe(true);

      const validatedTask = (res.data as ZZZTasksBackupData).payload.tasks[0];
      // <script> should be completely stripped
      expect(validatedTask.title).not.toContain('<script>');
      expect(validatedTask.title).not.toContain('alert("XSS-TITLE")');
      // Dangerous HTML characters should be escaped
      expect(validatedTask.description).not.toContain('<img');
      expect(validatedTask.tags).not.toContain('<script>');
    });

    it('sanitizeInput utility cleans malicious scripts and encodes entities', () => {
      const dirty = '<script>doBad()</script><b onclick="hack()">Test</b>';
      const clean = sanitizeInput(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('&lt;b');
    });
  });

  // ==========================================================================
  // 5. Backup Restore & Modes (Overwrite vs Merge)
  // ==========================================================================
  describe('5. Backup Import & Mode Mechanics', () => {
    it('restores state in overwrite mode, replacing all existing tasks and settings', () => {
      // Seed existing state with 2 tasks
      const current = getDefaultState();
      current.tasks = [
        {
          id: 'existing-1',
          title: 'Existing Task 1',
          description: '',
          category: 'Work',
          priority: 'B',
          status: 'todo',
          completed: false,
          dueDate: null,
          tags: [],
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];
      current.settings.audio.muted = false;
      saveState(current);

      // Prepare backup to import
      const backupToImport: ZZZTasksBackupData = {
        app: APP_IDENTIFIER,
        version: 1,
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload: {
          tasks: [
            {
              id: 'imported-1',
              title: 'Restored Secret Mission',
              description: 'Classified Lumina mission',
              category: 'Inter-Knot',
              priority: 'S',
              status: 'completed',
              completed: true,
              dueDate: '2026-11-01',
              tags: ['classified'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          ],
          dailies: {
            ...current.dailies,
            currentStreak: 10,
            longestStreak: 15,
          },
          settings: {
            ...current.settings,
            audio: { ...current.settings.audio, muted: true },
          },
        },
      };

      const restored = importBackup(backupToImport, 'overwrite');

      expect(restored.tasks.length).toBe(1);
      expect(restored.tasks[0].id).toBe('imported-1');
      expect(restored.tasks[0].title).toBe('Restored Secret Mission');
      expect(restored.dailies.currentStreak).toBe(10);
      expect(restored.dailies.longestStreak).toBe(15);
      expect(restored.settings.audio.muted).toBe(true);

      // Verify persisted to localStorage
      const reloaded = loadState();
      expect(reloaded.tasks.length).toBe(1);
      expect(reloaded.tasks[0].title).toBe('Restored Secret Mission');
    });

    it('merges state in merge mode, appending new tasks and resolving ID collisions', () => {
      const current = getDefaultState();
      current.tasks = [
        {
          id: 'task-collision',
          title: 'Existing Task (Will collide ID)',
          description: '',
          category: 'Life',
          priority: 'C',
          status: 'todo',
          completed: false,
          dueDate: null,
          tags: [],
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
        {
          id: 'task-unique-existing',
          title: 'Unique Existing Task',
          description: '',
          category: 'Work',
          priority: 'B',
          status: 'todo',
          completed: false,
          dueDate: null,
          tags: [],
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];
      current.dailies.longestStreak = 5;
      current.dailies.history = { '2026-10-16': true };
      saveState(current);

      const backupToMerge: ZZZTasksBackupData = {
        app: APP_IDENTIFIER,
        version: 1,
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload: {
          tasks: [
            {
              id: 'task-collision', // Colliding ID!
              title: 'Imported Task with Same ID',
              description: '',
              category: 'Combat',
              priority: 'S',
              status: 'in_progress',
              completed: false,
              dueDate: null,
              tags: [],
              createdAt: '',
              updatedAt: '',
              completedAt: null,
            },
            {
              id: 'task-brand-new',
              title: 'Brand New Imported Task',
              description: '',
              category: 'Hollow',
              priority: 'A',
              status: 'todo',
              completed: false,
              dueDate: null,
              tags: [],
              createdAt: '',
              updatedAt: '',
              completedAt: null,
            },
          ],
          dailies: {
            ...current.dailies,
            longestStreak: 12, // Higher longest streak!
            history: { '2026-10-17': true },
          },
          settings: current.settings,
        },
      };

      const merged = importBackup(backupToMerge, 'merge');

      // Total tasks should be 2 original + 2 imported = 4
      expect(merged.tasks.length).toBe(4);

      // Verify the colliding task received a cloned unique ID
      const collidingOriginal = merged.tasks.find((t) => t.id === 'task-collision');
      expect(collidingOriginal).toBeDefined();
      expect(collidingOriginal!.title).toBe('Existing Task (Will collide ID)');

      const collidingCloned = merged.tasks.find(
        (t) => t.id.startsWith('task-collision_imported_')
      );
      expect(collidingCloned).toBeDefined();
      expect(collidingCloned!.title).toBe('Imported Task with Same ID');

      // Verify streaks merged
      expect(merged.dailies.longestStreak).toBe(12);
      expect(merged.dailies.history['2026-10-16']).toBe(true);
      expect(merged.dailies.history['2026-10-17']).toBe(true);
    });

    it('throws error when importing invalid JSON string', () => {
      expect(() => {
        importBackup('{ bad json ::: malformed', 'overwrite');
      }).toThrow('Malformed JSON syntax');
    });
  });
});
