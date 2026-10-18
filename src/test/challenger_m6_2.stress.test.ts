import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateBackup,
  importBackup,
  saveState,
  loadState,
  getDefaultState,
  STORAGE_KEY,
} from '../services/storage';
import {
  calculateStreak,
  checkAndPerformDailyReset,
  getPreviousDateString,
} from '../services/dailies';
import { Task, ZZZTasksBackupData } from '../types';

describe('CHALLENGER M6.2: State Corruption, Malicious Payloads & Quota Exhaustion Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // CHALLENGE 1: validateBackup and importBackup Stress
  // ==========================================================================
  describe('1. validateBackup and importBackup Malicious & Corrupted Payloads', () => {
    describe('1.1 Prototype Pollution Vectors', () => {
      it('prevents prototype pollution via __proto__ and constructor at root and nested levels', () => {
        // Clean prototype before test
        delete (Object.prototype as any).pollutedRoot;
        delete (Object.prototype as any).pollutedCtor;
        delete (Object.prototype as any).pollutedTask;
        delete (Object.prototype as any).pollutedDailies;
        delete (Object.prototype as any).pollutedHistory;

        const maliciousJson = JSON.stringify({
          app: 'ZZZTasks',
          version: 1,
          schemaVersion: '1.0.0',
          __proto__: { pollutedRoot: 'hacked' },
          constructor: { prototype: { pollutedCtor: 'hacked' } },
          payload: {
            tasks: [
              {
                id: 'task-proto-1',
                title: 'Normal Title',
                description: 'Attempting task prototype override',
                category: 'Combat',
                priority: 'S',
                __proto__: { pollutedTask: 'hacked' },
              },
            ],
            dailies: {
              ...getDefaultState().dailies,
              __proto__: { pollutedDailies: 'hacked' },
              history: {
                '2026-10-18': true,
                __proto__: { pollutedHistory: 'hacked' },
              },
            },
            settings: getDefaultState().settings,
          },
        });

        const validation = validateBackup(maliciousJson);
        expect(validation.valid).toBe(true);
        expect(validation.data).toBeDefined();

        // Test overwrite mode
        const overwriteResult = importBackup(validation.data!, 'overwrite');
        expect((Object.prototype as any).pollutedRoot).toBeUndefined();
        expect((Object.prototype as any).pollutedCtor).toBeUndefined();
        expect((Object.prototype as any).pollutedTask).toBeUndefined();
        expect((Object.prototype as any).pollutedDailies).toBeUndefined();
        expect((Object.prototype as any).pollutedHistory).toBeUndefined();
        expect(overwriteResult.tasks.length).toBe(1);

        // Test merge mode
        const mergeResult = importBackup(validation.data!, 'merge');
        expect((Object.prototype as any).pollutedRoot).toBeUndefined();
        expect((Object.prototype as any).pollutedCtor).toBeUndefined();
        expect((Object.prototype as any).pollutedTask).toBeUndefined();
        expect(mergeResult.tasks.length).toBe(2); // Initial 1 + merged copy with unique ID
      });

      it('prevents prototype pollution via raw direct AppState payload string', () => {
        delete (Object.prototype as any).directProto;

        const rawStateJson = JSON.stringify({
          version: '1.0.0',
          __proto__: { directProto: 'pwned' },
          tasks: [
            {
              id: 'task-direct-1',
              title: 'Direct Task',
              category: 'Life',
              priority: 'A',
            },
          ],
          dailies: getDefaultState().dailies,
          settings: getDefaultState().settings,
        });

        const validation = validateBackup(rawStateJson);
        expect(validation.valid).toBe(true);

        const imported = importBackup(rawStateJson, 'overwrite');
        expect((Object.prototype as any).directProto).toBeUndefined();
        expect(imported.tasks.length).toBe(1);
      });
    });

    describe('1.2 Malicious XSS & Code Injection Vectors', () => {
      it('sanitizes script tags, event handlers, and javascript: protocols across all task fields', () => {
        const xssPayload = JSON.stringify({
          app: 'ZZZTasks',
          version: 1,
          schemaVersion: '1.0.0',
          payload: {
            tasks: [
              {
                id: 'xss-1',
                title: '<script>alert("XSS-TITLE")</script>',
                description: '<img src=x onerror="alert(\'XSS-DESC\')">',
                category: 'javascript:alert(1)',
                priority: 'S',
                tags: ['<svg onload=alert(2)>', 'javascript:void(0)', '<script src="evil.js"></script>'],
                dueDate: '<script>2026-10-18</script>',
              },
              {
                id: 'xss-2',
                title: 'Clean Prefix <b onmouseover="steal()">bold</b> <iframe src="evil.html"></iframe>',
                description: '<a href="javascript:alert(3)">Click</a>',
                category: 'Combat',
                priority: 'B',
                tags: ['normal-tag'],
              },
            ],
            dailies: getDefaultState().dailies,
            settings: getDefaultState().settings,
          },
        });

        const validation = validateBackup(xssPayload);
        expect(validation.valid).toBe(true);

        const imported = importBackup(validation.data!, 'overwrite');
        const task1 = imported.tasks.find((t) => t.id === 'xss-1')!;
        const task2 = imported.tasks.find((t) => t.id === 'xss-2')!;

        // Task 1: Title was entirely script tag -> must fall back to '[Sanitized Commission]'
        expect(task1.title).toBe('[Sanitized Commission]');
        expect(task1.title).not.toContain('<script>');

        // Task 1: Description had onerror handler -> stripped and encoded
        expect(task1.description).not.toContain('onerror=');
        expect(task1.description).not.toContain('<img');

        // Task 1: Category had javascript: scheme -> stripped
        expect(task1.category).not.toContain('javascript:');

        // Task 1: Tags had onload and script tags -> stripped
        for (const tag of task1.tags) {
          expect(tag).not.toContain('<script');
          expect(tag).not.toContain('onload=');
        }

        // Task 2: Title had onmouseover handler -> handler removed
        expect(task2.title).not.toContain('onmouseover=');
        expect(task2.title).toContain('Clean Prefix');

        // Task 2: Description had javascript: scheme -> stripped
        expect(task2.description).not.toContain('javascript:');
      });

      it('sanitizes daily commissions when loading corrupted state', () => {
        const corruptedState = getDefaultState();
        corruptedState.dailies.commissions = [
          {
            id: 'comm-xss',
            title: '<script>alert("evil")</script>',
            description: '<img src=x onerror=alert(1)>',
            category: 'javascript:evil()',
            reward: { exp: 100, denny: 5000, polychrome: 10 },
            status: 'PENDING',
            completedDates: [],
            isCustom: false,
            createdAt: '2026-10-18T04:00:00.000Z',
          },
        ];

        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedState));
        const loaded = loadState();
        const comm = loaded.dailies.commissions[0];
        expect(comm.title).not.toContain('<script>');
        expect(comm.description).not.toBe('');
        expect(comm.description).not.toContain('onerror=');
      });
    });

    describe('1.3 Massive JSON Payloads (10,000 Tasks)', () => {
      it('validates, serializes, and imports 10,000 tasks within acceptable performance limits', () => {
        const count = 10000;
        const tasks: Task[] = [];
        const priorities: ('S' | 'A' | 'B' | 'C')[] = ['S', 'A', 'B', 'C'];
        const categories = ['Combat', 'Life', 'Work', 'Inter-Knot', 'Hollow'];

        for (let i = 0; i < count; i++) {
          tasks.push({
            id: `bulk-task-${i}`,
            title: `Commission #${i} - Eliminate Ethereals in Sector ${i % 100}`,
            description: `Hollow survey details for proxy operation ${i}. Defend civilians and retrieve supplies.`,
            category: categories[i % categories.length],
            priority: priorities[i % priorities.length],
            status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'todo',
            completed: i % 3 === 0,
            dueDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
            tags: [`tag-${i % 20}`, `sector-${i % 50}`],
            createdAt: '2026-10-18T04:00:00.000Z',
            updatedAt: '2026-10-18T04:00:00.000Z',
            completedAt: i % 3 === 0 ? '2026-10-18T05:00:00.000Z' : null,
          });
        }

        const largeBackupJson = JSON.stringify({
          app: 'ZZZTasks',
          version: 1,
          schemaVersion: '1.0.0',
          payload: {
            tasks,
            dailies: getDefaultState().dailies,
            settings: getDefaultState().settings,
          },
        });

        // Benchmark validateBackup
        const t0 = performance.now();
        const validation = validateBackup(largeBackupJson);
        const tValidate = performance.now() - t0;

        expect(validation.valid).toBe(true);
        expect((validation.data as ZZZTasksBackupData)?.payload.tasks.length).toBe(count);
        expect(tValidate).toBeLessThan(1500); // 10,000 tasks validated in under 1.5s

        // Benchmark importBackup ('overwrite')
        const t1 = performance.now();
        const imported = importBackup(validation.data!, 'overwrite');
        const tImport = performance.now() - t1;

        expect(imported.tasks.length).toBe(count);
        expect(tImport).toBeLessThan(1000); // 10,000 tasks imported in under 1s

        // Verify task fidelity
        expect(imported.tasks[0].id).toBe('bulk-task-0');
        expect(imported.tasks[9999].id).toBe('bulk-task-9999');
        expect(imported.tasks[500].priority).toBe(tasks[500].priority);
      });
    });

    describe('1.4 Corrupted Types, Missing Fields & Schema Violations', () => {
      it('rejects backup when tasks is a string, number, or object instead of an array', () => {
        // Direct format
        const directStringTasks = JSON.stringify({ tasks: 'not an array' });
        expect(validateBackup(directStringTasks).valid).toBe(false);

        // When dailies is absent, rejected because tasks array is missing/invalid
        const wrappedStringTasks = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: 'not an array' },
        });
        const wrappedRes = validateBackup(wrappedStringTasks);
        expect(wrappedRes.valid).toBe(false);
        expect(wrappedRes.error).toContain('missing required tasks array or dailies object');

        // When dailies is present but tasks is invalid type, rejected with explicit tasks array schema error
        const tasksWithDailies = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: 'not an array', dailies: {} },
        });
        const tasksWithDailiesRes = validateBackup(tasksWithDailies);
        expect(tasksWithDailiesRes.valid).toBe(false);
        expect(tasksWithDailiesRes.error).toContain('tasks must be an array');

        const numberTasks = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: 42 },
        });
        expect(validateBackup(numberTasks).valid).toBe(false);

        const objectTasks = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: { id: '1' } },
        });
        expect(validateBackup(objectTasks).valid).toBe(false);
      });

      it('rejects backup when tasks array contains null, undefined, or primitives', () => {
        const nullTask = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: [null] },
        });
        const nullRes = validateBackup(nullTask);
        expect(nullRes.valid).toBe(false);
        expect(nullRes.error).toContain('is not an object');

        const numberInTasks = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: [12345] },
        });
        expect(validateBackup(numberInTasks).valid).toBe(false);

        const stringInTasks = JSON.stringify({
          app: 'ZZZTasks',
          payload: { tasks: ['string task'] },
        });
        expect(validateBackup(stringInTasks).valid).toBe(false);
      });

      it('rejects backup when a task has empty, missing, or whitespace-only title', () => {
        const missingTitle = JSON.stringify({
          app: 'ZZZTasks',
          payload: {
            tasks: [{ id: 't1', description: 'desc' }],
          },
        });
        const missingRes = validateBackup(missingTitle);
        expect(missingRes.valid).toBe(false);
        expect(missingRes.error).toContain('empty or missing title');

        const emptyTitle = JSON.stringify({
          app: 'ZZZTasks',
          payload: {
            tasks: [{ id: 't2', title: '' }],
          },
        });
        expect(validateBackup(emptyTitle).valid).toBe(false);

        const whitespaceTitle = JSON.stringify({
          app: 'ZZZTasks',
          payload: {
            tasks: [{ id: 't3', title: '    \t\n   ' }],
          },
        });
        expect(validateBackup(whitespaceTitle).valid).toBe(false);
      });

      it('rejects non-object root payloads: primitives, empty strings, invalid JSON', () => {
        expect(validateBackup('').valid).toBe(false);
        expect(validateBackup('   ').valid).toBe(false);
        expect(validateBackup('null').valid).toBe(false);
        expect(validateBackup('12345').valid).toBe(false);
        expect(validateBackup('"a string"').valid).toBe(false);
        expect(validateBackup('true').valid).toBe(false);
        expect(validateBackup('[]').valid).toBe(false);
        expect(validateBackup('{ broken json').valid).toBe(false);
      });

      it('rejects backup when both tasks and dailies are missing or null', () => {
        const emptyPayload = JSON.stringify({ app: 'ZZZTasks', payload: {} });
        expect(validateBackup(emptyPayload).valid).toBe(false);
        expect(validateBackup(emptyPayload).error).toContain('missing required tasks array or dailies object');

        const nullFields = JSON.stringify({ app: 'ZZZTasks', payload: { tasks: null, dailies: null } });
        expect(validateBackup(nullFields).valid).toBe(false);
      });

      it('normalizes out-of-spec priorities and statuses to defaults during sanitization', () => {
        const weirdValues = JSON.stringify({
          app: 'ZZZTasks',
          payload: {
            tasks: [
              {
                id: 'weird-1',
                title: 'Weird Task',
                priority: 'SUPER_URGENT', // Invalid priority
                status: 'halfway_done', // Invalid status
                completed: 1, // Number instead of boolean
                tags: 'not-an-array', // String instead of array
              },
            ],
          },
        });

        const validation = validateBackup(weirdValues);
        expect(validation.valid).toBe(true);

        const imported = importBackup(validation.data!, 'overwrite');
        const task = imported.tasks[0];
        expect(task.priority).toBe('B'); // Fallback to B
        expect(task.status).toBe('todo'); // Fallback to todo
        expect(task.completed).toBe(true); // Coerced to boolean
        expect(Array.isArray(task.tags)).toBe(true);
        expect(task.tags).toEqual([]); // Non-array fallback to []
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 2: calculateStreak and checkAndPerformDailyReset Stress
  // ==========================================================================
  describe('2. calculateStreak and checkAndPerformDailyReset Resilience', () => {
    describe('2.1 Corrupted History Map & Cycle Safety', () => {
      it('never hangs or exceeds loop limit when history contains prototype keys or circular patterns', () => {
        const corruptedHistory: Record<string, boolean> = {
          '': true,
          'undefined': true,
          'null': true,
          'NaN': true,
          '2026-10-18': true,
          '2026-10-17': true,
          '2026-10-16': true,
        };

        const t0 = performance.now();
        const res = calculateStreak(corruptedHistory, '2026-10-18');
        const duration = performance.now() - t0;

        expect(duration).toBeLessThan(10); // Runs instantly
        expect(res.currentStreak).toBe(3);
        expect(res.longestStreak).toBe(3);
      });

      it('handles prototype keys like toString, valueOf, constructor without crash', () => {
        const protoHistory = Object.create({
          toString: () => 'malicious',
          valueOf: () => 123,
          constructor: Object,
          hasOwnProperty: () => true,
        });

        protoHistory['2026-10-18'] = true;
        protoHistory['2026-10-17'] = true;

        const res = calculateStreak(protoHistory, '2026-10-18');
        expect(res.currentStreak).toBe(2);
        expect(res.longestStreak).toBe(2);
      });

      it('safely handles empty strings and unparseable date keys', () => {
        const weirdDatesHistory = {
          '': true,
          '   ': true,
          'not-a-date': true,
          'invalid': true,
        };

        expect(() => calculateStreak(weirdDatesHistory, '')).not.toThrow();
        const res = calculateStreak(weirdDatesHistory, '');
        expect(res.currentStreak).toBe(0);
        expect(res.longestStreak).toBe(0);
      });

      it('documents regex behavior on dummy numeric date keys (e.g., 9999-99-99)', () => {
        // Empirical observation: /^\d{4}-\d{2}-\d{2}$/ accepts syntactically matching 4-2-2 digits
        const impossibleDates = {
          '9999-99-99': true,
          '0000-00-00': true,
        };
        const res = calculateStreak(impossibleDates, '');
        // Neither 0000-00-00 nor 9999-99-99 are consecutive, so longest chain is 1
        expect(res.currentStreak).toBe(0);
        expect(res.longestStreak).toBe(1);
      });

      it('safely calculates streak over 1,000 consecutive days without stack overflow', () => {
        const longHistory: Record<string, boolean> = {};
        let d = '2026-10-18';
        for (let i = 0; i < 1000; i++) {
          longHistory[d] = true;
          d = getPreviousDateString(d);
        }

        const t0 = performance.now();
        const res = calculateStreak(longHistory, '2026-10-18');
        const duration = performance.now() - t0;

        expect(duration).toBeLessThan(50);
        expect(res.currentStreak).toBe(1000);
        expect(res.longestStreak).toBe(1000);
      });
    });

    describe('2.2 Non-Boolean Truthy/Falsy Values in History Map', () => {
      it('evaluates non-boolean values strictly: "false", 0, null, undefined', () => {
        const nonBoolHistory: any = {
          '2026-10-18': true,
          '2026-10-17': 'false', // String 'false'
          '2026-10-16': 0, // Number 0
          '2026-10-15': null, // null
          '2026-10-14': undefined, // undefined
          '2026-10-13': 'true', // String 'true'
          '2026-10-12': 1, // Number 1
        };

        const res = calculateStreak(nonBoolHistory, '2026-10-18');
        // '2026-10-17' has value 'false' which is not strict === true
        // Therefore currentStreak must stop at 1
        expect(res.currentStreak).toBe(1);
      });
    });

    describe('2.3 checkAndPerformDailyReset State Corruption Resilience', () => {
      it('survives corrupted state with missing or broken dailies properties', () => {
        const corruptedState: any = {
          version: '1.0.0',
          tasks: [],
          dailies: {
            lastReset: 'broken-timestamp-string',
            commissions: null, // Null instead of array
            history: null, // Null instead of map
            currentStreak: NaN,
            longestStreak: -5,
          },
          settings: { resetHour: NaN }, // Broken resetHour
        };

        expect(() => checkAndPerformDailyReset(corruptedState, new Date())).not.toThrow();
        const result = checkAndPerformDailyReset(corruptedState, new Date());
        expect(result.resetOccurred).toBe(true);
        expect(Array.isArray(result.updatedState.dailies.commissions)).toBe(true);
        expect(Number.isFinite(result.updatedState.dailies.currentStreak)).toBe(true);
        expect(Number.isFinite(result.updatedState.dailies.longestStreak)).toBe(true);
        expect(result.updatedState.dailies.commissions.length).toBeGreaterThan(0);
      });

      it('handles future and epoch timestamps in lastReset gracefully', () => {
        const state = getDefaultState();
        state.dailies.lastReset = '1970-01-01T00:00:00.000Z';

        const result = checkAndPerformDailyReset(state, new Date());
        expect(result.resetOccurred).toBe(true);

        // Call again with current cycle date
        const secondResult = checkAndPerformDailyReset(result.updatedState, new Date());
        expect(secondResult.resetOccurred).toBe(false);
      });
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Storage Quota Exhaustion & Memory Fallback Store
  // ==========================================================================
  describe('3. Storage Quota Exhaustion & In-Memory Fallback Resilience', () => {
    it('seamlessly falls back to memory store on QuotaExceededError and notifies listeners', () => {
      let eventDetail: any = null;
      const onQuota = (e: any) => {
        eventDetail = e.detail;
      };
      window.addEventListener('zzztasks:quota-exceeded', onQuota);

      const originalSetItem = localStorage.setItem;
      let quotaCount = 0;

      localStorage.setItem = vi.fn().mockImplementation(() => {
        quotaCount++;
        const domEx = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw domEx;
      });

      const state = getDefaultState();
      state.tasks = [
        {
          id: 'quota-task-persist',
          title: 'Surviving In Memory Commission',
          description: 'This state must persist across memory store despite local storage quota block.',
          category: 'Combat',
          priority: 'S',
          status: 'todo',
          completed: false,
          dueDate: null,
          tags: ['quota-safe'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
      ];

      // Save state under quota exhaustion
      const saveSuccess = saveState(state);
      expect(saveSuccess).toBe(false);
      expect(quotaCount).toBe(1);
      expect(eventDetail).toBeDefined();
      expect(eventDetail.error).toBe('QuotaExceededError');

      // Now restore localStorage.setItem and verify loadState retrieves from memory fallback
      localStorage.setItem = originalSetItem;
      const loaded = loadState();
      expect(loaded.tasks.some((t) => t.id === 'quota-task-persist')).toBe(true);
      expect(loaded.tasks.find((t) => t.id === 'quota-task-persist')?.title).toBe('Surviving In Memory Commission');

      window.removeEventListener('zzztasks:quota-exceeded', onQuota);
    });

    it('recovers when window.localStorage throws on read (SecurityError / private browsing)', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new DOMException('SecurityError', 'SecurityError');
      });

      const state = loadState();
      expect(state).toBeDefined();
      // Should not throw, should return a valid AppState object
      expect(state.activeView).toBe('tasks');
      expect(Array.isArray(state.tasks)).toBe(true);

      localStorage.getItem = originalGetItem;
    });

    it('maintains state across multiple operations solely in memoryFallbackStore', () => {
      // Force localStorage to always fail
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;

      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });
      localStorage.getItem = vi.fn().mockImplementation(() => {
        return null;
      });

      const state1 = getDefaultState();
      state1.tasks = [
        {
          id: 'mem-1',
          title: 'Memory Commission 1',
          description: '',
          category: 'Life',
          priority: 'A',
          status: 'todo',
          completed: false,
          dueDate: null,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        },
      ];

      saveState(state1);
      const loaded1 = loadState();
      expect(loaded1.tasks.some((t) => t.id === 'mem-1')).toBe(true);

      // Add second task
      state1.tasks.push({
        id: 'mem-2',
        title: 'Memory Commission 2',
        description: '',
        category: 'Combat',
        priority: 'S',
        status: 'completed',
        completed: true,
        dueDate: null,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      saveState(state1);
      const loaded2 = loadState();
      expect(loaded2.tasks.length).toBeGreaterThanOrEqual(2);
      expect(loaded2.tasks.some((t) => t.id === 'mem-2')).toBe(true);

      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
    });
  });
});
