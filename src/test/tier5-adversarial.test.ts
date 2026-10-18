import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundService } from '../services/sound';
import { calculateStreak, getPreviousDateString } from '../services/dailies';
import { validateBackup, importBackup, saveState, loadState, getDefaultState } from '../services/storage';

describe('Tier 5 Adversarial Coverage Hardening Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('D1: Audio Volume Extremes & AudioParam NaN Hardening', () => {
    it('handles NaN volume gracefully without throwing TypeError', () => {
      expect(() => soundService.setVolume(NaN)).not.toThrow();
      const vol = soundService.getVolume();
      expect(Number.isFinite(vol)).toBe(true);
      expect(vol).toBeGreaterThanOrEqual(0);
      expect(vol).toBeLessThanOrEqual(1);
    });

    it('clamps negative, excessive, and infinite volume inputs safely', () => {
      soundService.setVolume(-10);
      expect(soundService.getVolume()).toBe(0);

      soundService.setVolume(999);
      expect(soundService.getVolume()).toBe(1);

      soundService.setVolume(Infinity);
      expect(soundService.getVolume()).toBe(1);

      soundService.setVolume(-Infinity);
      expect(soundService.getVolume()).toBe(0);
    });

    it('survives rapid 100-burst sound synthesis triggers without uncaught rejections', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          soundService.playClick();
          soundService.playSwitch();
          soundService.playTaskComplete();
          soundService.playBangbooChirp();
        }
      }).not.toThrow();
    });
  });

  describe('D2: Streak Calculation & Infinite Loop Defense', () => {
    it('returns empty string on unparseable date in getPreviousDateString', () => {
      expect(getPreviousDateString('invalid-date')).toBe('');
      expect(getPreviousDateString('9999-99-99')).toBe('');
      expect(getPreviousDateString('')).toBe('');
    });

    it('does not hang in an infinite loop when history contains invalid date keys', () => {
      const corruptedHistory: Record<string, boolean> = {
        'invalid-date-string': true,
        '9999-99-99': true,
        'foo': true,
      };

      const start = Date.now();
      const result = calculateStreak(corruptedHistory, 'invalid-date-string');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(typeof result.currentStreak).toBe('number');
      expect(Number.isFinite(result.currentStreak)).toBe(true);
    });

    it('ignores inherited Object.prototype properties in streak history', () => {
      const history = Object.create({ toString: true, valueOf: true, constructor: true });
      history['2026-10-18'] = true;

      const result = calculateStreak(history, '2026-10-18');
      expect(result.currentStreak).toBe(1);
    });

    it('handles non-boolean truthy values in history without string coercion errors', () => {
      const history: any = {
        '2026-10-18': true,
        '2026-10-17': 'false', // string 'false' should not count as completed
        '2026-10-16': null,
        '2026-10-15': 0,
      };

      const result = calculateStreak(history, '2026-10-18');
      expect(result.currentStreak).toBe(1);
    });
  });

  describe('D3: Backup Prototype Pollution & Malicious Payloads', () => {
    it('detects and strips __proto__ and constructor prototype injection in backups', () => {
      const maliciousJson = JSON.stringify({
        app: 'ZZZTasks',
        version: 1,
        schemaVersion: '1.0.0',
        __proto__: { polluted: true },
        constructor: { prototype: { admin: true } },
        payload: {
          tasks: [
            {
              id: 'task-1',
              title: 'Clean Task',
              __proto__: { injected: true },
            },
          ],
          dailies: getDefaultState().dailies,
          settings: getDefaultState().settings,
        },
      });

      const validation = validateBackup(maliciousJson);
      expect(validation.valid).toBe(true);

      const imported = importBackup(validation.data!, 'overwrite');
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).admin).toBeUndefined();
      expect((Object.prototype as any).injected).toBeUndefined();
      expect(imported.tasks.length).toBeGreaterThan(0);
    });

    it('sanitizes script tags in task title without producing empty un-editable tasks', () => {
      const backupWithXss = JSON.stringify({
        tasks: [
          {
            id: 'xss-task',
            title: '<script>alert("xss")</script>',
            description: '<img src=x onerror=alert(1)>',
            category: 'Combat',
            priority: 'S',
            tags: ['<script>evil()</script>'],
          },
        ],
      });

      const validation = validateBackup(backupWithXss);
      expect(validation.valid).toBe(true);
      const imported = importBackup(validation.data!, 'overwrite');
      expect(imported.tasks[0].title).not.toContain('<script>');
      expect(imported.tasks[0].title.length).toBeGreaterThan(0);
      expect(imported.tasks[0].title).toBe('[Sanitized Commission]');
    });

    it('validates and falls back to tasks view when activeView in storage is corrupted', () => {
      const corruptedState = getDefaultState();
      (corruptedState as any).activeView = 'corrupted-view';
      localStorage.setItem('zzztasks_state', JSON.stringify(corruptedState));

      const loaded = loadState();
      expect(loaded.activeView).toBe('tasks');
    });
  });

  describe('D4: Storage Quota Exhaustion & Fallback State', () => {
    it('gracefully catches QuotaExceededError and preserves state in memory fallback', () => {
      const originalSetItem = localStorage.setItem;
      let eventDispatched = false;

      const handler = () => {
        eventDispatched = true;
      };
      window.addEventListener('zzztasks:quota-exceeded', handler);

      localStorage.setItem = vi.fn().mockImplementation(() => {
        const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw error;
      });

      const state = getDefaultState();
      state.tasks = [{
        id: 't-quota-1',
        title: 'InMemoryTask',
        description: 'Preserved telemetry data during storage quota exhaustion',
        priority: 'S',
        status: 'todo',
        category: 'Combat',
        completed: false,
        createdAt: '2026-10-18T12:00:00Z',
        updatedAt: '2026-10-18T12:00:00Z',
        completedAt: null,
        dueDate: null,
        tags: []
      }];

      const saved = saveState(state);
      expect(saved).toBe(false);
      expect(eventDispatched).toBe(true);

      // Verify loadState still recovers the state from memoryFallbackStore
      localStorage.setItem = originalSetItem;
      const reloaded = loadState();
      expect(reloaded.tasks.some(t => t.id === 't-quota-1')).toBe(true);

      window.removeEventListener('zzztasks:quota-exceeded', handler);
    });
  });
});
