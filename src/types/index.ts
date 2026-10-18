/**
 * ZZZTasks Domain Models & Core Type Definitions
 * Inspired by the visual aesthetic and commission mechanics of Zenless Zone Zero (ZZZ)
 */

// ============================================================================
// 1. Task Ranks & Status
// ============================================================================

export type TaskPriority = 'S' | 'A' | 'B' | 'C';

export interface PriorityDefinition {
  label: string;
  rankTitle: string;
  weight: number;
  color: string;
  badgeBg: string;
  borderColor: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityDefinition> = {
  S: {
    label: 'S-Rank',
    rankTitle: 'Urgent Hollow Hazard',
    weight: 4,
    color: '#FF0055',
    badgeBg: 'rgba(255, 0, 85, 0.15)',
    borderColor: '#FF0055',
  },
  A: {
    label: 'A-Rank',
    rankTitle: 'High Priority Commission',
    weight: 3,
    color: '#FF7700',
    badgeBg: 'rgba(255, 119, 0, 0.15)',
    borderColor: '#FF7700',
  },
  B: {
    label: 'B-Rank',
    rankTitle: 'Standard Assignment',
    weight: 2,
    color: '#F2FF00',
    badgeBg: 'rgba(242, 255, 0, 0.15)',
    borderColor: '#F2FF00',
  },
  C: {
    label: 'C-Rank',
    rankTitle: 'Low Priority Routine',
    weight: 1,
    color: '#00F0FF',
    badgeBg: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
};

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: string; // Unique UUID v4 or nanoid
  title: string; // Non-empty sanitized string
  description: string; // Markdown or plain text description
  category: string; // e.g., 'Combat', 'Hollow', 'Inter-Knot', 'Work', 'Life'
  priority: TaskPriority; // 'S' | 'A' | 'B' | 'C'
  status: TaskStatus; // 'todo' | 'in_progress' | 'completed'
  completed: boolean; // Convenience boolean flag for UI checks
  dueDate: string | null; // ISO Date 'YYYY-MM-DD' or null
  tags: string[]; // Normalized tag strings (e.g., ['outer-ring', 'bounty'])
  createdAt: string; // ISO 8601 UTC timestamp
  updatedAt: string; // ISO 8601 UTC timestamp
  completedAt: string | null; // ISO 8601 UTC timestamp or null
}

export type TaskFilterStatus = 'all' | 'active' | 'completed' | 'overdue';
export type TaskSortBy = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface TaskFilterOptions {
  searchQuery: string;
  category: string | 'all';
  priority: TaskPriority | 'all';
  status: TaskFilterStatus;
  dueDate?: string | null;
}

// ============================================================================
// 2. Dailies, Commissions & Streak Tracker
// ============================================================================

export type CommissionStatus = 'PENDING' | 'COMPLETED';

export interface CommissionReward {
  exp: number; // Inter-Knot Reputation EXP
  denny: number; // Denny currency
  polychrome: number; // Polychrome gacha currency
  badgeName?: string; // e.g., 'Master Proxy Seal'
}

export interface DailyCommission {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: CommissionReward;
  status: CommissionStatus;
  completedDates: string[]; // Array of 'YYYY-MM-DD' completion dates
  isCustom: boolean; // User created commission vs preset
  createdAt: string; // ISO 8601 UTC timestamp
  archived?: boolean;
}

export interface DailiesState {
  lastReset: string; // ISO 8601 UTC timestamp of last daily reset cycle
  currentStreak: number; // Active consecutive completed days
  longestStreak: number; // Peak all-time consecutive streak
  history: Record<string, boolean>; // 'YYYY-MM-DD' -> true if completed
  commissions: DailyCommission[]; // List of current daily commissions
  commissionClaimed?: boolean; // Convenience boolean for today's overall claim status
  totalCommissionsClaimed?: number; // Lifetime count of claimed commissions
}

// ============================================================================
// 3. Bangboo Companion Mascot
// ============================================================================

export type BangbooMood =
  | 'idle' // Default swaying, blinking, observing
  | 'happy' // Cheerful hop, ears perked
  | 'celebrating' // Joyful celebration with confetti & high bounce
  | 'triumphant' // Victorious pose on all commissions cleared
  | 'thinking' // Pondering, tapping chin
  | 'sleepy' // Late night droop or finished queue
  | 'surprised'; // Click/poke startled wobble

export type BangbooMascotType = 'eous' | 'amillion' | 'sharkboo' | 'luckyboo';

export interface BangbooDialogue {
  id: string;
  bangbooText: string; // Bangboo dialect, e.g. "Eh-nah! En-nah!"
  translation: string; // English translation subtitle for Proxy
  mood: BangbooMood;
  soundCue?: 'chirp' | 'cheer' | 'chime' | 'giggle';
  durationMs?: number; // Display duration (default 4000ms)
}

export interface BangbooPreferences {
  enabled: boolean; // Mascot widget visibility
  mascotType: BangbooMascotType; // Mascot skin/type
  voiceEnabled: boolean; // Voice chirps enabled
  minimized: boolean; // Docked as compact icon vs full mascot
  position: 'bottom-right' | 'bottom-left';
}

export interface BangbooState {
  currentMood: BangbooMood;
  activeDialogue: BangbooDialogue | null;
  lastInteractedAt: string | null;
}

// ============================================================================
// 4. Audiovisual & Application Settings
// ============================================================================

export interface AudioPreferences {
  muted: boolean; // Master mute toggle
  volume: number; // Master volume: 0.0 to 1.0
  sfxVolume: number; // SFX volume: 0.0 to 1.0
  sfxEnabled: boolean; // Enable procedural synthesizer
}

export interface VisualPreferences {
  crtOverlay: boolean; // CRT scanlines & vignette
  glitchEffects: boolean; // Micro-glitch interaction effects
  highContrast: boolean; // Ultra high-contrast mode
  reducedMotion: boolean; // Disable heavy animations for accessibility
}

export interface AppSettings {
  resetHour: number; // Hour of day for daily rollover (default 4 for 04:00 AM)
  weekStartsOn: 0 | 1; // 0: Sunday, 1: Monday (default 1)
  audio: AudioPreferences;
  visual: VisualPreferences;
  bangboo: BangbooPreferences;
}

// ============================================================================
// 5. Complete Root Application State
// ============================================================================

export type ActiveView = 'tasks' | 'dailies' | 'calendar';

export interface AppState {
  version: string; // Semantic version, e.g. "1.0.0"
  tasks: Task[]; // Task items
  dailies: DailiesState; // Dailies, reset cycle, and streak history
  settings: AppSettings; // User configuration preferences
  bangboo: BangbooState; // Mascot mood & dialogue state
  activeView: ActiveView; // Current active navigation tab
  selectedDate: string; // Currently inspected date 'YYYY-MM-DD'
  searchQuery: string; // Search query filter
  selectedCategory: string | 'all'; // Category filter
  selectedPriority: TaskPriority | 'all'; // Priority filter
  filterStatus: TaskFilterStatus; // Status filter (all/active/completed/overdue)
  sortBy: TaskSortBy; // Sorting key
  sortDirection: SortDirection; // Sorting direction
  currentMonthOffset: number; // Month offset for calendar view (-1, 0, +1, etc.)
}

// ============================================================================
// 6. JSON Backup & Schema Export/Import
// ============================================================================

export interface ZZZTasksBackupData {
  app: 'ZZZTasks';
  version: number; // Backup file format version (1)
  schemaVersion: '1.0.0';
  exportedAt: string; // ISO 8601 UTC timestamp
  payload: {
    tasks: Task[];
    dailies: DailiesState;
    settings: AppSettings;
    bangboo?: BangbooState;
    version?: string;
  };
}

export type BackupImportMode = 'overwrite' | 'merge';

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: ZZZTasksBackupData | AppState;
  warnings?: string[];
}
