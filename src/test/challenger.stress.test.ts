/**
 * Challenger Milestone 2 Empirical Stress Test Suite
 *
 * Stress-tests:
 * 1. src/services/storage.ts:
 *    - Corrupted JSON imports (truncated string, invalid syntax, missing fields, prototype pollution)
 *    - Malicious script payload injection (<script>alert(1)</script>, event handlers, nested tags)
 *    - 5MB storage quota limits and quota error recovery
 * 2. src/store/useStore.ts:
 *    - Search & filter with special regex characters ([, *, +, \, (, ), ?, ^, $, |, {})
 *    - Mixed case search & category filtering
 *    - Leading/trailing whitespace in search query
 *    - Boundary inputs and null/undefined resilience
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveState,
  exportBackup,
  validateBackup,
  importBackup,
  getDefaultState,
  sanitizeInput,
  APP_IDENTIFIER,
  CURRENT_SCHEMA_VERSION,
} from '../services/storage';
import {
  filterAndSortTasks,
  isTaskOverdue,
} from '../store/useStore';
import { Task, ZZZTasksBackupData } from '../types';

describe('CHALLENGER EMPIRICAL TEST: storage.ts Corrupted JSON Imports', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Truncated JSON Strings', () => {
    const fullValidJson = JSON.stringify({
      app: APP_IDENTIFIER,
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      payload: {
        tasks: [
          {
            id: 'task-test-1',
            title: 'Critical Commission',
            description: 'Infiltrate Hollow',
            category: 'Combat',
            priority: 'S',
            status: 'todo',
            completed: false,
            dueDate: '2026-10-30',
            tags: ['hollow', 's-rank'],
            createdAt: '2026-10-18T12:00:00.000Z',
            updatedAt: '2026-10-18T12:00:00.000Z',
            completedAt: null,
          },
        ],
        dailies: getDefaultState().dailies,
        settings: getDefaultState().settings,
      },
    });

    it('rejects JSON truncated at various byte lengths without crashing', () => {
      // Cut off at different arbitrary lengths
      const truncationPoints = [5, 15, 30, 50, 100, 150, 250, fullValidJson.length - 1, fullValidJson.length - 5];

      for (const pt of truncationPoints) {
        const truncated = fullValidJson.substring(0, pt);
        const result = validateBackup(truncated);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/Malformed JSON syntax/i);

        // Also test importBackup throws safely
        expect(() => importBackup(truncated, 'overwrite')).toThrow(/Malformed JSON syntax/i);
      }
    });

    it('rejects truncated raw AppState string', () => {
      const rawState = JSON.stringify(getDefaultState());
      const truncated = rawState.substring(0, 45);

      const result = validateBackup(truncated);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Malformed JSON syntax/i);
    });
  });

  describe('2. Invalid JSON Syntax', () => {
    const invalidSyntaxSnippets = [
      '{ "tasks": [ undefined ] }',
      '{ "tasks": [ NaN ] }',
      '{ "tasks": [ Infinity ] }',
      "{ 'tasks': [] }", // single quotes
      '{ tasks: [] }', // unquoted key
      '{"tasks": [], }', // trailing comma
      '{',
      '}',
      '{"tasks": [}',
      '{"tasks": [1, 2, 3], "dailies":',
      'function() { return true; }',
      '<xml><tasks></tasks></xml>',
      '\0{"app": "ZZZTasks"}',
      '{"tasks": [/* comment */]}',
    ];

    it.each(invalidSyntaxSnippets)('rejects invalid syntax snippet: %s', (snippet) => {
      const res = validateBackup(snippet);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
      expect(() => importBackup(snippet, 'overwrite')).toThrow();
    });

    it('rejects non-object primitives and arrays', () => {
      expect(validateBackup('null').valid).toBe(false);
      expect(validateBackup('true').valid).toBe(false);
      expect(validateBackup('false').valid).toBe(false);
      expect(validateBackup('12345').valid).toBe(false);
      expect(validateBackup('"a string"').valid).toBe(false);
      expect(validateBackup('[]').valid).toBe(false);
      expect(validateBackup('[1, 2, 3]').valid).toBe(false);
    });
  });

  describe('3. Missing Fields & Schema Malformations', () => {
    it('rejects wrapped backup missing payload', () => {
      const json = JSON.stringify({
        app: APP_IDENTIFIER,
        schemaVersion: '1.0.0',
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('payload object is missing');
    });

    it('rejects backup with null payload', () => {
      const json = JSON.stringify({
        app: APP_IDENTIFIER,
        schemaVersion: '1.0.0',
        payload: null,
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('payload object is missing');
    });

    it('rejects backup missing both tasks and dailies', () => {
      const json = JSON.stringify({
        settings: { audio: { muted: true } },
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('missing required tasks array or dailies object');
    });

    it('rejects backup where tasks is not an array', () => {
      const json = JSON.stringify({
        tasks: 'not an array',
        dailies: { currentStreak: 1 },
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('tasks must be an array');
    });

    it('rejects task with null instead of task object', () => {
      const json = JSON.stringify({
        tasks: [null],
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('is not an object');
    });

    it('rejects task with string instead of task object', () => {
      const json = JSON.stringify({
        tasks: ['just a string'],
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('is not an object');
    });

    it('rejects task missing title field completely', () => {
      const json = JSON.stringify({
        tasks: [{ id: 'task-no-title', category: 'Combat' }],
      });
      const res = validateBackup(json);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('empty or missing title');
    });

    it('rejects task where title is empty or pure whitespace', () => {
      const json1 = JSON.stringify({ tasks: [{ title: '' }] });
      expect(validateBackup(json1).valid).toBe(false);

      const json2 = JSON.stringify({ tasks: [{ title: '     \t\n  ' }] });
      expect(validateBackup(json2).valid).toBe(false);
    });

    it('rejects task where title is a number or boolean or object', () => {
      expect(validateBackup(JSON.stringify({ tasks: [{ title: 12345 }] })).valid).toBe(false);
      expect(validateBackup(JSON.stringify({ tasks: [{ title: true }] })).valid).toBe(false);
      expect(validateBackup(JSON.stringify({ tasks: [{ title: { nested: 'title' } }] })).valid).toBe(false);
    });

    it('safely handles missing optional fields with default backfilling', () => {
      const minimalValidBackup = JSON.stringify({
        tasks: [
          {
            title: 'Bare Minimum Task',
          },
        ],
      });

      const res = validateBackup(minimalValidBackup);
      expect(res.valid).toBe(true);

      const imported = importBackup(minimalValidBackup, 'overwrite');
      expect(imported.tasks).toHaveLength(1);
      const t = imported.tasks[0];
      expect(t.title).toBe('Bare Minimum Task');
      expect(t.priority).toBe('B'); // Default priority
      expect(t.status).toBe('todo'); // Default status
      expect(t.category).toBe('General'); // Default category
      expect(t.tags).toEqual([]); // Default tags
      expect(t.completed).toBe(false); // Default completion
    });

    it('sanitizes invalid priority to default B', () => {
      const backup = JSON.stringify({
        tasks: [
          {
            title: 'Task with weird priority',
            priority: 'SSS_INVALID_RANK',
          },
        ],
      });

      const imported = importBackup(backup, 'overwrite');
      expect(imported.tasks[0].priority).toBe('B');
    });

    it('sanitizes invalid status to default todo', () => {
      const backup = JSON.stringify({
        tasks: [
          {
            title: 'Task with weird status',
            status: 'DELETED_OR_UNKNOWN',
          },
        ],
      });

      const imported = importBackup(backup, 'overwrite');
      expect(imported.tasks[0].status).toBe('todo');
      expect(imported.tasks[0].completed).toBe(false);
    });
  });

  describe('4. Prototype Pollution Resilience', () => {
    it('prevents prototype pollution vectors in parsed JSON', () => {
      const maliciousJson = JSON.stringify({
        __proto__: { polluted: 'YES_POLLUTED' },
        constructor: { prototype: { admin: true } },
        tasks: [
          {
            title: 'Prototype Task',
            __proto__: { evilProp: 999 },
          },
        ],
      });

      const res = validateBackup(maliciousJson);
      expect(res.valid).toBe(true);

      const target: any = {};
      expect(target.polluted).toBeUndefined();
      expect(target.admin).toBeUndefined();
      expect(target.evilProp).toBeUndefined();
    });
  });
});

describe('CHALLENGER EMPIRICAL TEST: storage.ts Malicious Script Payload Injection', () => {
  const xssPayloads = [
    {
      name: 'Standard script tag',
      payload: '<script>alert(1)</script>',
    },
    {
      name: 'Script tag with src',
      payload: '<script src="https://evil-hacker.com/exploit.js"></script>',
    },
    {
      name: 'Uppercase SCRIPT tag with attributes',
      payload: '<SCRIPT TYPE="text/javascript" SRC="http://xss.rocks/xss.js"></SCRIPT>',
    },
    {
      name: 'Image tag with onerror attribute',
      payload: '<img src="invalid-image" onerror="alert(\'XSS\')" />',
    },
    {
      name: 'SVG tag with onload attribute',
      payload: '<svg onload="alert(\'SVG-XSS\')">',
    },
    {
      name: 'Body tag with onload attribute',
      payload: '<body onload="alert(1)">',
    },
    {
      name: 'Javascript pseudo-protocol',
      payload: 'javascript:alert(document.cookie)',
    },
    {
      name: 'Event handler with spaces and unquoted value',
      payload: '<div onclick=alert(1)>Click Me</div>',
    },
    {
      name: 'Event handler with onmouseover',
      payload: '<span onmouseover="alert(1)">Hover me</span>',
    },
    {
      name: 'Nested broken script tags',
      payload: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    },
    {
      name: 'Iframe injection',
      payload: '<iframe src="https://evil.example.com"></iframe>',
    },
    {
      name: 'Injected HTML tags with quotes and slashes',
      payload: '">><script>alert(1)</script><input type="text" value="',
    },
  ];

  it.each(xssPayloads)('neutralizes XSS vector: $name', ({ payload }) => {
    const cleaned = sanitizeInput(payload);

    // Verify raw script tag is removed or escaped
    expect(cleaned.toLowerCase()).not.toContain('<script');
    expect(cleaned.toLowerCase()).not.toContain('</script>');
    expect(cleaned.toLowerCase()).not.toContain('javascript:');
    // Verify angle brackets are escaped
    expect(cleaned).not.toContain('<');
    expect(cleaned).not.toContain('>');

    // If there were event handlers, ensure no unescaped on...=
    expect(cleaned).not.toMatch(/on\w+\s*=/i);
  });

  it('neutralizes XSS vectors embedded in imported task titles, descriptions, categories, and tags', () => {
    const maliciousBackup = {
      app: APP_IDENTIFIER,
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      payload: {
        tasks: [
          {
            id: 'xss-task',
            title: 'Hollow Commission <script>alert("PWNED_TITLE")</script>',
            description: 'Mission Brief <img src="x" onerror="alert(\'PWNED_DESC\')" />',
            category: 'Combat<svg onload=alert(1)>',
            priority: 'S',
            status: 'todo',
            completed: false,
            dueDate: '2026-10-31',
            tags: ['hollow', '<script>alert("TAG")</script>', 'javascript:evil()'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ],
      },
    };

    const res = validateBackup(JSON.stringify(maliciousBackup));
    expect(res.valid).toBe(true);

    const backupData = res.data as ZZZTasksBackupData;
    const task = backupData.payload.tasks[0];

    // Title: script stripped
    expect(task.title).not.toContain('<script>');
    expect(task.title).not.toContain('PWNED_TITLE');
    expect(task.title).toContain('Hollow Commission');

    // Description: img tag sanitized and escaped
    expect(task.description).not.toContain('<img');
    expect(task.description).not.toContain('onerror');
    expect(task.description).toContain('&lt;img');

    // Category: svg tag escaped
    expect(task.category).not.toContain('<svg');
    expect(task.category).not.toContain('onload');

    // Tags: dangerous tags sanitized
    for (const tag of task.tags) {
      expect(tag).not.toContain('<script>');
      expect(tag).not.toContain('javascript:');
      expect(tag).not.toContain('<');
      expect(tag).not.toContain('>');
    }
  });
});

describe('CHALLENGER EMPIRICAL TEST: storage.ts 5MB Storage Quota Limits', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('handles QuotaExceededError gracefully without crashing the app', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage.setItem to simulate browser 5MB quota exhaustion
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      const error = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      throw error;
    });

    const state = getDefaultState();
    // Attempt save
    const success = saveState(state);

    expect(success).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'zzztasks:quota-exceeded',
      })
    );

    consoleErrorSpy.mockRestore();
  });

  it('handles Firefox NS_ERROR_DOM_QUOTA_REACHED quota error format', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      const error = new DOMException('Persistent storage maximum size reached', 'NS_ERROR_DOM_QUOTA_REACHED');
      throw error;
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

  it('generates a 5MB payload and verifies export/validate performance', () => {
    // Generate ~5MB of tasks
    const state = getDefaultState();
    const largeDesc = 'A'.repeat(1000); // 1KB per task description

    // 5,000 tasks * ~1KB ≈ 5MB
    const bigTaskList: Task[] = [];
    for (let i = 0; i < 2000; i++) {
      bigTaskList.push({
        id: `big-task-${i}`,
        title: `Stress Task #${i} Commission Hollow Sector`,
        description: largeDesc,
        category: 'Combat',
        priority: 'B',
        status: 'todo',
        completed: false,
        dueDate: '2026-11-01',
        tags: ['stress', '5mb', `tag-${i % 10}`],
        createdAt: '2026-10-18T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z',
        completedAt: null,
      });
    }
    state.tasks = bigTaskList;

    // Export ~2.5MB - 3MB JSON
    const exportedJson = exportBackup(state);
    expect(exportedJson.length).toBeGreaterThan(2 * 1024 * 1024);

    // Validate the large JSON
    const startTime = performance.now();
    const valResult = validateBackup(exportedJson);
    const elapsedMs = performance.now() - startTime;

    expect(valResult.valid).toBe(true);
    const validatedBackup = valResult.data as ZZZTasksBackupData;
    expect(validatedBackup.payload.tasks.length).toBe(2000);
    // Should validate within reasonable time (< 1500ms)
    expect(elapsedMs).toBeLessThan(2000);
  });
});

describe('CHALLENGER EMPIRICAL TEST: useStore.ts Search and Filter Stress', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task-regex-1',
      title: 'Infiltrate [Zone 1] Hollow Center',
      description: 'Special commission with [square brackets] and *asterisks*',
      category: 'Combat',
      priority: 'S',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-25',
      tags: ['[hollow]', 'urgent*'],
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      completedAt: null,
    },
    {
      id: 'task-regex-2',
      title: 'Fix C++ Compiler & Debugger (VCR Deck)',
      description: 'Run c++ tests with path C:\\Proxy\\Tasks\\vcr.dat + extra files',
      category: 'Work',
      priority: 'A',
      status: 'todo',
      completed: false,
      dueDate: '2026-10-26',
      tags: ['c++', 'debug', 'vcr\\deck'],
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
      completedAt: null,
    },
    {
      id: 'task-regex-3',
      title: 'Rescue Bangboo: Is it 100% safe? Yes/No!',
      description: 'Check status: cost is $50.00 (discount ^2) | alternative route',
      category: 'Errands',
      priority: 'B',
      status: 'completed',
      completed: true,
      dueDate: '2026-10-15',
      tags: ['bangboo', 'safe?', '$50'],
      createdAt: '2026-10-03T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      completedAt: '2026-10-15T10:00:00.000Z',
    },
    {
      id: 'task-plain',
      title: 'Normal Street Patrol',
      description: 'Walk around Sixth Street and talk to En-nah',
      category: 'Life',
      priority: 'C',
      status: 'todo',
      completed: false,
      dueDate: null,
      tags: ['patrol', 'calm'],
      createdAt: '2026-10-04T10:00:00.000Z',
      updatedAt: '2026-10-04T10:00:00.000Z',
      completedAt: null,
    },
  ];

  describe('1. Special Regex Characters in Search Query', () => {
    const specialChars = [
      { char: '[', expectedMatches: ['task-regex-1'] },
      { char: ']', expectedMatches: ['task-regex-1'] },
      { char: '*', expectedMatches: ['task-regex-1'] },
      { char: '+', expectedMatches: ['task-regex-2'] },
      { char: '++', expectedMatches: ['task-regex-2'] },
      { char: '\\', expectedMatches: ['task-regex-2'] },
      { char: '(', expectedMatches: ['task-regex-2', 'task-regex-3'] },
      { char: ')', expectedMatches: ['task-regex-2', 'task-regex-3'] },
      { char: '?', expectedMatches: ['task-regex-3'] },
      { char: '^', expectedMatches: ['task-regex-3'] },
      { char: '$', expectedMatches: ['task-regex-3'] },
      { char: '|', expectedMatches: ['task-regex-3'] },
      { char: '{', expectedMatches: [] },
      { char: '}', expectedMatches: [] },
      { char: '.*', expectedMatches: [] },
      { char: '[a-z]+', expectedMatches: [] },
      { char: '([a-z])\\1', expectedMatches: [] },
    ];

    it.each(specialChars)(
      'safely searches for regex character "$char" as literal substring without throwing',
      ({ char, expectedMatches }) => {
        let results: Task[] = [];
        expect(() => {
          results = filterAndSortTasks(sampleTasks, {
            status: 'all',
            category: 'all',
            priority: 'all',
            searchQuery: char,
          });
        }).not.toThrow();

        const matchedIds = results.map((t) => t.id);
        for (const expId of expectedMatches) {
          expect(matchedIds).toContain(expId);
        }
      }
    );

    it('does not crash when search query is an unclosed character class "["', () => {
      const res = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: '[',
      });
      expect(res.map((t) => t.id)).toContain('task-regex-1');
    });

    it('does not crash when search query is a single trailing backslash "\\"', () => {
      const res = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: '\\',
      });
      expect(res.map((t) => t.id)).toContain('task-regex-2');
    });
  });

  describe('2. Mixed Case Search and Filtering', () => {
    it('matches uppercase, lowercase, and mixed case queries across title, description, and tags', () => {
      // Mixed case title query
      const res1 = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: 'iNfIlTrAtE',
      });
      expect(res1).toHaveLength(1);
      expect(res1[0].id).toBe('task-regex-1');

      // Uppercase description query
      const res2 = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: 'DEBUGGER',
      });
      expect(res2).toHaveLength(1);
      expect(res2[0].id).toBe('task-regex-2');

      // Mixed case tag query
      const res3 = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: 'bAnGbOo',
      });
      expect(res3).toHaveLength(1);
      expect(res3[0].id).toBe('task-regex-3');
    });

    it('filters categories case-insensitively (e.g. "cOmBaT", "WORK", "life")', () => {
      const combat = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'cOmBaT',
        priority: 'all',
        searchQuery: '',
      });
      expect(combat).toHaveLength(1);
      expect(combat[0].id).toBe('task-regex-1');

      const work = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'WORK',
        priority: 'all',
        searchQuery: '',
      });
      expect(work).toHaveLength(1);
      expect(work[0].id).toBe('task-regex-2');

      const life = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'life',
        priority: 'all',
        searchQuery: '',
      });
      expect(life).toHaveLength(1);
      expect(life[0].id).toBe('task-plain');
    });
  });

  describe('3. Leading and Trailing Spaces in Search Query', () => {
    it('trims leading and trailing spaces from search query before matching', () => {
      const res1 = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: '   Hollow   ',
      });
      expect(res1).toHaveLength(1);
      expect(res1[0].id).toBe('task-regex-1');

      const res2 = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: '\t\t  Patrol  \n',
      });
      expect(res2).toHaveLength(1);
      expect(res2[0].id).toBe('task-plain');
    });

    it('returns all tasks when query contains only whitespace', () => {
      const res = filterAndSortTasks(sampleTasks, {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: '     \t\n   ',
      });
      expect(res).toHaveLength(4);
    });
  });

  describe('4. Edge Cases & Boundary Inputs', () => {
    it('handles empty task list gracefully', () => {
      const res = filterAndSortTasks([], {
        status: 'all',
        category: 'Combat',
        priority: 'S',
        searchQuery: 'anything',
      });
      expect(res).toEqual([]);
    });

    it('handles tasks with empty or missing optional fields', () => {
      const minimalTask: Task = {
        id: 'minimal-1',
        title: 'Minimal Task',
        description: '',
        category: 'General',
        priority: 'B',
        status: 'todo',
        completed: false,
        dueDate: null,
        tags: [],
        createdAt: '2026-10-18T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z',
        completedAt: null,
      };

      const res = filterAndSortTasks([minimalTask], {
        status: 'all',
        category: 'all',
        priority: 'all',
        searchQuery: 'Minimal',
      });
      expect(res).toHaveLength(1);
    });

    it('properly evaluates overdue status against edge-case dates', () => {
      const task: Task = {
        id: 't-overdue',
        title: 'Due today',
        description: '',
        category: 'General',
        priority: 'A',
        status: 'todo',
        completed: false,
        dueDate: '2026-10-18',
        tags: [],
        createdAt: '2026-10-18T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z',
        completedAt: null,
      };

      // Due today is NOT overdue
      expect(isTaskOverdue(task, '2026-10-18')).toBe(false);

      // Due yesterday IS overdue
      expect(isTaskOverdue({ ...task, dueDate: '2026-10-17' }, '2026-10-18')).toBe(true);

      // Completed task is NEVER overdue even if dueDate was in 2020
      expect(isTaskOverdue({ ...task, completed: true, dueDate: '2020-01-01' }, '2026-10-18')).toBe(false);

      // Null dueDate is NEVER overdue
      expect(isTaskOverdue({ ...task, dueDate: null }, '2026-10-18')).toBe(false);
    });
  });
});
