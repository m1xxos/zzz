/**
 * ZZZTasks LocalStorage & Backup Service
 * Provides safe browser persistence, quota fallback, formatted backup export,
 * robust JSON schema validation, XSS sanitization, and merge/overwrite restore.
 */

import {
  AppState,
  AppSettings,
  BackupImportMode,
  BackupValidationResult,
  DailyCommission,
  DailiesState,
  Task,
  TaskPriority,
  ZZZTasksBackupData,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

export const STORAGE_KEY = 'zzztasks_state';
export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const APP_IDENTIFIER = 'ZZZTasks';

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_SETTINGS: AppSettings = {
  resetHour: 4, // 04:00 AM local reset cycle
  weekStartsOn: 1, // Monday
  audio: {
    muted: false,
    volume: 0.8,
    sfxVolume: 0.8,
    sfxEnabled: true,
  },
  visual: {
    crtOverlay: true,
    glitchEffects: true,
    highContrast: false,
    reducedMotion: false,
  },
  bangboo: {
    enabled: true,
    mascotType: 'eous',
    voiceEnabled: true,
    minimized: false,
    position: 'bottom-right',
  },
};

export const DEFAULT_COMMISSIONS: DailyCommission[] = [
  {
    id: 'comm-coffee-cafe',
    title: 'Coff Cafe Double Shot',
    description: "Drink Tin Master's special energy brew to recharge proxy stamina.",
    category: 'Life',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Coffee Buff' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-howl-scratch',
    title: "Howl's Daily Scratch Ticket",
    description: 'Visit the Sixth Street newsstand and scratch your lucky ticket.',
    category: 'Inter-Knot',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Howl Lucky Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-vhs-archive',
    title: 'Random Play Video Tapes',
    description: 'Organize and rewind returned VHS tapes in the front counter.',
    category: 'Work',
    reward: { exp: 100, denny: 5000, polychrome: 10, badgeName: 'Staff Stamp' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
  {
    id: 'comm-hollow-patrol',
    title: 'Hollow Survey Verification',
    description: 'Review corruption telemetry report on the Inter-Knot forum.',
    category: 'Combat',
    reward: { exp: 150, denny: 10000, polychrome: 20, badgeName: 'Hollow Data Chip' },
    status: 'PENDING',
    completedDates: [],
    isCustom: false,
    createdAt: '2026-10-18T04:00:00.000Z',
  },
];

export const DEFAULT_DAILIES_STATE: DailiesState = {
  lastReset: new Date().toISOString(),
  currentStreak: 0,
  longestStreak: 0,
  history: {},
  commissions: DEFAULT_COMMISSIONS,
  commissionClaimed: false,
  totalCommissionsClaimed: 0,
};

export function getDefaultState(): AppState {
  const today = new Date().toISOString().split('T')[0];
  return {
    version: CURRENT_SCHEMA_VERSION,
    tasks: [],
    dailies: {
      ...DEFAULT_DAILIES_STATE,
      commissions: DEFAULT_COMMISSIONS.map((c) => ({ ...c })),
    },
    settings: {
      ...DEFAULT_SETTINGS,
      audio: { ...DEFAULT_SETTINGS.audio },
      visual: { ...DEFAULT_SETTINGS.visual },
      bangboo: { ...DEFAULT_SETTINGS.bangboo },
    },
    bangboo: {
      currentMood: 'idle',
      activeDialogue: null,
      lastInteractedAt: null,
    },
    activeView: 'tasks',
    selectedDate: today,
    searchQuery: '',
    selectedCategory: 'all',
    selectedPriority: 'all',
    filterStatus: 'all',
    sortBy: 'createdAt',
    sortDirection: 'desc',
    currentMonthOffset: 0,
    selectedCalendarDate: null,
    calendarViewYear: new Date().getFullYear(),
    calendarViewMonth: new Date().getMonth() + 1,
  };
}

// ============================================================================
// Storage Availability & Quota Detection
// ============================================================================

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__zzztasks_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function isQuotaExceededError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014)
  );
}

// In-memory fallback if localStorage is disabled or restricted
let memoryFallbackStore: Record<string, string> = {};

// ============================================================================
// XSS Sanitization
// ============================================================================

/**
 * Strips script tags, evil event handlers, and encodes dangerous HTML characters
 * to ensure imported or stored user inputs cannot execute arbitrary JavaScript.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove script tags and embedded javascript: schemes
  let cleaned = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '');

  // Escape HTML control characters
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return cleaned.trim();
}

function sanitizeTask(task: Task): Task {
  const sanitizedTitle = sanitizeInput(task.title);
  const title = sanitizedTitle.length > 0 ? sanitizedTitle : '[Sanitized Commission]';
  return {
    ...task,
    id: String(task.id || ''),
    title,
    description: sanitizeInput(task.description),
    category: sanitizeInput(task.category || 'General'),
    priority: (['S', 'A', 'B', 'C'].includes(task.priority) ? task.priority : 'B') as TaskPriority,
    status: (['todo', 'in_progress', 'completed'].includes(task.status)
      ? task.status
      : 'todo'),
    completed: Boolean(task.completed),
    dueDate: task.dueDate ? String(task.dueDate).trim() : null,
    tags: Array.isArray(task.tags) ? task.tags.map(sanitizeInput).filter(Boolean) : [],
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
  };
}

// ============================================================================
// State Persistence (loadState & saveState)
// ============================================================================

export function loadState(): AppState {
  const defaults = getDefaultState();

  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        raw = memoryFallbackStore[STORAGE_KEY] || null;
      }
    } else {
      raw = memoryFallbackStore[STORAGE_KEY] || null;
    }

    if (!raw && memoryFallbackStore[STORAGE_KEY]) {
      raw = memoryFallbackStore[STORAGE_KEY];
    }

    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaults;
    }

    const validViews = ['tasks', 'dailies', 'calendar'];
    const activeView = validViews.includes(parsed.activeView) ? parsed.activeView : 'tasks';

    // Deep merge to guarantee schema compliance
    const merged: AppState = {
      ...defaults,
      ...parsed,
      activeView,
      version: typeof parsed.version === 'string' ? parsed.version : CURRENT_SCHEMA_VERSION,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(sanitizeTask) : [],
      dailies: {
        ...defaults.dailies,
        ...(parsed.dailies && typeof parsed.dailies === 'object' ? parsed.dailies : {}),
        history:
          parsed.dailies && typeof parsed.dailies.history === 'object' && parsed.dailies.history !== null
            ? parsed.dailies.history
            : {},
        commissions:
          parsed.dailies && Array.isArray(parsed.dailies.commissions)
            ? parsed.dailies.commissions.map((c: any) => ({
                id: String(c.id || ''),
                title: sanitizeInput(c.title),
                description: sanitizeInput(c.description),
                category: sanitizeInput(c.category || 'General'),
                reward: c.reward && typeof c.reward === 'object' ? c.reward : { exp: 100, denny: 5000, polychrome: 10 },
                status: c.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
                completedDates: Array.isArray(c.completedDates) ? c.completedDates : [],
                isCustom: Boolean(c.isCustom),
                createdAt: c.createdAt || new Date().toISOString(),
                archived: Boolean(c.archived),
              }))
            : defaults.dailies.commissions,
      },
      settings: {
        ...defaults.settings,
        ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
        audio: {
          ...defaults.settings.audio,
          ...(parsed.settings?.audio && typeof parsed.settings.audio === 'object'
            ? parsed.settings.audio
            : {}),
          // Support flat settings.muted legacy format
          ...(typeof parsed.settings?.muted === 'boolean' ? { muted: parsed.settings.muted } : {}),
        },
        visual: {
          ...defaults.settings.visual,
          ...(parsed.settings?.visual && typeof parsed.settings.visual === 'object'
            ? parsed.settings.visual
            : {}),
        },
        bangboo: {
          ...defaults.settings.bangboo,
          ...(parsed.settings?.bangboo && typeof parsed.settings.bangboo === 'object'
            ? parsed.settings.bangboo
            : {}),
        },
      },
      bangboo: {
        ...defaults.bangboo,
        ...(parsed.bangboo && typeof parsed.bangboo === 'object' ? parsed.bangboo : {}),
      },
      selectedCalendarDate:
        typeof parsed.selectedCalendarDate === 'string'
          ? sanitizeInput(parsed.selectedCalendarDate)
          : null,
      calendarViewYear:
        typeof parsed.calendarViewYear === 'number' && Number.isFinite(parsed.calendarViewYear)
          ? parsed.calendarViewYear
          : defaults.calendarViewYear,
      calendarViewMonth:
        typeof parsed.calendarViewMonth === 'number' && parsed.calendarViewMonth >= 1 && parsed.calendarViewMonth <= 12
          ? parsed.calendarViewMonth
          : defaults.calendarViewMonth,
    };

    return merged;
  } catch (err) {
    console.warn('[ZZZTasks Storage] Failed to load state, reverting to defaults:', err);
    return defaults;
  }
}

export function saveState(state: AppState): boolean {
  const serialized = JSON.stringify(state);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.error('[ZZZTasks Storage] LocalStorage Quota Exceeded! Preserving in-memory state.', err);
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(
            new CustomEvent('zzztasks:quota-exceeded', {
              detail: { error: 'QuotaExceededError' },
            })
          );
        }
      } else {
        console.error('[ZZZTasks Storage] Failed to save state:', err);
      }
      memoryFallbackStore[STORAGE_KEY] = serialized;
      return false;
    }
  } else {
    memoryFallbackStore[STORAGE_KEY] = serialized;
    return false;
  }
}

// ============================================================================
// Backup Export
// ============================================================================

export function exportBackup(state: AppState): string {
  const backup: ZZZTasksBackupData = {
    app: APP_IDENTIFIER,
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    payload: {
      tasks: state.tasks,
      dailies: state.dailies,
      settings: state.settings,
      bangboo: state.bangboo,
      version: state.version,
    },
  };

  return JSON.stringify(backup, null, 2);
}

// ============================================================================
// Backup Schema Validation
// ============================================================================

export function validateBackup(jsonString: string): BackupValidationResult {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return { valid: false, error: 'Backup data is empty or invalid string' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e: any) {
    return {
      valid: false,
      error: `Malformed JSON syntax: ${e?.message || 'Unexpected token'}`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Backup root must be a JSON object' };
  }

  // Determine format: Wrapped ZZZTasksBackupData vs Direct AppState snapshot
  const isWrapped =
    parsed.app === APP_IDENTIFIER ||
    (typeof parsed.schemaVersion === 'string' && parsed.payload);

  let payload = isWrapped ? parsed.payload : parsed;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: 'Invalid backup format: payload object is missing or not an object',
    };
  }

  // Must have at least tasks or dailies
  if (!Array.isArray(payload.tasks) && (!payload.dailies || typeof payload.dailies !== 'object')) {
    return {
      valid: false,
      error: 'Invalid backup schema: missing required tasks array or dailies object',
    };
  }

  // Validate tasks array if present
  if (payload.tasks !== undefined) {
    if (!Array.isArray(payload.tasks)) {
      return { valid: false, error: 'Schema error: tasks must be an array' };
    }

    for (let i = 0; i < payload.tasks.length; i++) {
      const t = payload.tasks[i];
      if (!t || typeof t !== 'object') {
        return { valid: false, error: `Schema error: task at index ${i} is not an object` };
      }
      if (!t.title || typeof t.title !== 'string' || !t.title.trim()) {
        return { valid: false, error: `Schema error: task at index ${i} has empty or missing title` };
      }
    }
  }

  // Sanitize all task objects
  const sanitizedTasks = Array.isArray(payload.tasks)
    ? payload.tasks.map(sanitizeTask)
    : [];

  const sanitizedPayload = {
    ...payload,
    tasks: sanitizedTasks,
  };

  const finalData: ZZZTasksBackupData = isWrapped
    ? {
        app: APP_IDENTIFIER,
        version: parsed.version || 1,
        schemaVersion: parsed.schemaVersion || CURRENT_SCHEMA_VERSION,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        payload: sanitizedPayload,
      }
    : {
        app: APP_IDENTIFIER,
        version: 1,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        payload: sanitizedPayload,
      };

  return {
    valid: true,
    data: finalData,
  };
}

// ============================================================================
// Backup Import (Overwrite & Merge)
// ============================================================================

export function importBackup(
  backup: ZZZTasksBackupData | AppState | string,
  mode: BackupImportMode = 'overwrite'
): AppState {
  let validatedData: ZZZTasksBackupData;

  if (typeof backup === 'string') {
    const valResult = validateBackup(backup);
    if (!valResult.valid || !valResult.data) {
      throw new Error(valResult.error || 'Invalid backup payload');
    }
    validatedData = valResult.data as ZZZTasksBackupData;
  } else if ('app' in backup && (backup as ZZZTasksBackupData).app === APP_IDENTIFIER) {
    validatedData = backup as ZZZTasksBackupData;
  } else {
    // Treat as raw AppState, convert through validateBackup stringification
    const str = JSON.stringify(backup);
    const valResult = validateBackup(str);
    if (!valResult.valid || !valResult.data) {
      throw new Error(valResult.error || 'Invalid backup payload');
    }
    validatedData = valResult.data as ZZZTasksBackupData;
  }

  const incomingPayload = validatedData.payload;
  const current = loadState();

  if (mode === 'overwrite') {
    const newState: AppState = {
      ...current,
      tasks: incomingPayload.tasks.map(sanitizeTask),
      dailies: incomingPayload.dailies
        ? {
            ...current.dailies,
            ...incomingPayload.dailies,
            history: {
              ...(current.dailies.history || {}),
              ...(incomingPayload.dailies.history || {}),
            },
          }
        : current.dailies,
      settings: incomingPayload.settings
        ? {
            ...current.settings,
            ...incomingPayload.settings,
            audio: {
              ...current.settings.audio,
              ...(incomingPayload.settings.audio || {}),
            },
            visual: {
              ...current.settings.visual,
              ...(incomingPayload.settings.visual || {}),
            },
            bangboo: {
              ...current.settings.bangboo,
              ...(incomingPayload.settings.bangboo || {}),
            },
          }
        : current.settings,
      bangboo: incomingPayload.bangboo || current.bangboo,
    };

    saveState(newState);
    return newState;
  }

  // Mode: 'merge'
  const existingIds = new Set(current.tasks.map((t) => t.id));
  const newTasks: Task[] = [];

  for (const t of incomingPayload.tasks) {
    const sanitized = sanitizeTask(t);
    if (existingIds.has(sanitized.id)) {
      // Collision detected: generate unique cloned ID
      const mergedTask: Task = {
        ...sanitized,
        id: `${sanitized.id}_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      newTasks.push(mergedTask);
    } else {
      newTasks.push(sanitized);
      existingIds.add(sanitized.id);
    }
  }

  const mergedHistory: Record<string, boolean> = {
    ...(current.dailies.history || {}),
    ...(incomingPayload.dailies?.history || {}),
  };

  const longestStreak = Math.max(
    current.dailies.longestStreak || 0,
    incomingPayload.dailies?.longestStreak || 0
  );

  const mergedState: AppState = {
    ...current,
    tasks: [...current.tasks, ...newTasks],
    dailies: {
      ...current.dailies,
      history: mergedHistory,
      longestStreak,
      totalCommissionsClaimed:
        (current.dailies.totalCommissionsClaimed || 0) +
        (incomingPayload.dailies?.totalCommissionsClaimed || 0),
    },
  };

  saveState(mergedState);
  return mergedState;
}
