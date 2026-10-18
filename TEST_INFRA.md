# ZZZTasks E2E Testing Infrastructure Specification

## 1. Testing Philosophy & Dual-Track Principles

### 1.1 Opaque-Box & Requirement-Driven Testing
The end-to-end (E2E) test suite is designed around the principles of **opaque-box testing**. Tests interact exclusively with the application through:
1. **DOM elements and user input events** (clicks, keystrokes, form submissions, focus/blur).
2. **Standard browser web APIs** (DOM queries, `localStorage`, `window.location`, Web Audio state inspection).
3. **User-visible outputs** (rendered text, accessibility attributes, visual badge states, modal appearances, and comic dialogue bubbles).

Internal component implementation details (React hooks, internal state setters, specific CSS class names) are treated as opaque implementation details. The test suite verifies that the software satisfies user requirements as specified in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### 1.2 Dual-Track Verification
The development of ZZZTasks follows a dual-track architecture:
- **Implementation Track**: Progresses milestone by milestone (M1 Scaffolding -> M2 Task Engine -> M3 Dailies & Streaks -> M4 Calendar Matrix -> M5 Audiovisual & Bangboo Mascot).
- **E2E Testing Track (M0)**: Authors independent, executable E2E test suites covering all four tiers of requirements. The test runner is self-contained and autonomous, functioning as both an active test harness against a running dev server and an executable specification with an integrated reference testbed for milestone verification.

---

## 2. DOM Interface Contract & Selector Dictionary

All UI components must adhere to the standardized `data-testid` attributes below. This establishes an unambiguous contract between UI implementers and test automation.

### 2.1 Navigation & Shell (`src/components/layout/`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Main Navigation Bar | `[data-testid="tab-nav"]` | Container for primary view tabs |
| Hollow Commissions Tab | `[data-testid="tab-tasks"]` | Button to switch to Task Board view |
| Inter-Knot Dailies Tab | `[data-testid="tab-dailies"]` | Button to switch to Dailies view |
| Schedule Matrix Tab | `[data-testid="tab-calendar"]` | Button to switch to Calendar view |
| CRT Scanline Overlay | `[data-testid="crt-overlay"]` | Global retro scanline visual effect |
| Global Audio Toggle | `[data-testid="audio-toggle"]` | Button toggling global sound mute state |
| Audio Mute Indicator | `[data-testid="audio-toggle"][data-muted="true"\|"false"]` | Attribute reflecting current mute state |
| Backup Modal Trigger | `[data-testid="backup-modal-btn"]` | Button opening Data Management modal |

### 2.2 Task Management (`src/components/tasks/`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Task Board View | `[data-testid="tasks-view"]` | Main container for task list & controls |
| Create Task Button | `[data-testid="create-task-btn"]` | Opens task creation modal/form |
| Task Form Modal | `[data-testid="task-modal"]` | Dialog for creating/editing task |
| Title Input | `[data-testid="task-title-input"]` | Text input for task title |
| Description Input | `[data-testid="task-desc-input"]` | Textarea for task description |
| Priority Selector | `[data-testid="task-priority-select"]` | Select/dropdown for ranks: `S`, `A`, `B`, `C` |
| Category Input | `[data-testid="task-category-input"]` | Input or select for task category |
| Due Date Input | `[data-testid="task-due-date-input"]` | Date input (`YYYY-MM-DD`) |
| Tags Input | `[data-testid="task-tags-input"]` | Input for comma-separated or pill tags |
| Form Submit Button | `[data-testid="task-submit-btn"]` | Button submitting task form |
| Form Validation Error | `[data-testid="task-form-error"]` | Error text displayed on invalid submission |
| Task Card | `[data-testid="task-card"]` | Individual task entry card |
| Task Title Display | `[data-testid="task-title"]` | Rendered title element |
| Task Completion Checkbox | `[data-testid="task-complete-btn"]` | Toggle button/checkbox for task completion |
| Task Edit Button | `[data-testid="task-edit-btn"]` | Button opening edit modal for task |
| Task Delete Button | `[data-testid="task-delete-btn"]` | Button deleting task |
| Task Priority Badge | `[data-testid="task-priority-badge"]` | Badge displaying rank (`S`, `A`, `B`, `C`) |
| Task Search Input | `[data-testid="task-search-input"]` | Real-time search filter input |
| Status Filter: All | `[data-testid="filter-status-all"]` | Filter showing all tasks |
| Status Filter: Active | `[data-testid="filter-status-active"]` | Filter showing pending tasks |
| Status Filter: Completed | `[data-testid="filter-status-completed"]` | Filter showing completed tasks |

### 2.3 Inter-Knot Dailies & Commissions (`src/components/dailies/`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Dailies View Container | `[data-testid="dailies-view"]` | Main container for commissions and streaks |
| Streak Counter Badge | `[data-testid="streak-counter"]` | Element displaying current consecutive streak |
| Commission Card | `[data-testid="commission-card"]` | Individual daily commission card |
| Claim Commission Button | `[data-testid="claim-commission-btn"]` | Button to complete/claim daily reward |
| Commission Status Badge | `[data-testid="commission-status"]` | Badge showing `PENDING` or `COMPLETED` |
| Reward Claim Modal | `[data-testid="reward-modal"]` | Celebratory pop-up on daily completion |
| Reward Modal Close Button | `[data-testid="reward-modal-close"]` | Button dismissing reward popup |
| Daily Reset Countdown | `[data-testid="reset-countdown"]` | Timer display counting down to 04:00 AM reset |

### 2.4 Schedule Matrix & Calendar (`src/components/calendar/`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Calendar View Container | `[data-testid="calendar-view"]` | Main monthly grid container |
| Month/Year Header | `[data-testid="cal-month-header"]` | Text displaying active month and year |
| Previous Month Button | `[data-testid="cal-prev-month"]` | Cassette style button navigating to previous month |
| Next Month Button | `[data-testid="cal-next-month"]` | Cassette style button navigating to next month |
| Today Jump Button | `[data-testid="cal-today-btn"]` | Button jumping back to current date |
| Calendar Day Cell | `[data-testid="calendar-day"][data-date="YYYY-MM-DD"]` | Individual day cell with ISO date attribute |
| Deadline Indicator Dot | `[data-testid="deadline-dot"]` | Color-coded marker on day with scheduled tasks |
| Daily Completion Indicator | `[data-testid="daily-complete-dot"]` | Stamp/marker indicating completed dailies |
| Selected Date Task Drawer | `[data-testid="date-drawer"]` | Panel listing tasks scheduled for clicked day |

### 2.5 Bangboo Mascot Companion (`src/components/bangboo/`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Bangboo Mascot Container | `[data-testid="bangboo-mascot"]` | Interactive mascot container with `data-mood` |
| Bangboo SVG Avatar | `[data-testid="bangboo-svg"]` | Scalable animated vector artwork (Eous) |
| Speech Bubble | `[data-testid="bangboo-speech-bubble"]` | Comic dialogue balloon |
| Dialect Dialogue Text | `[data-testid="bangboo-dialogue"]` | Text containing Bangboo quote ("Eh-nah!") |
| English Subtitle Text | `[data-testid="bangboo-subtitle"]` | Subtitle translation of Bangboo phrase |

### 2.6 Backup & State Persistence (`src/components/common/` & `storage.ts`)
| Element | Selector / `data-testid` | Description |
|---|---|---|
| Backup Modal Dialog | `[data-testid="backup-modal"]` | Container for export/import actions |
| Export Backup Button | `[data-testid="export-backup-btn"]` | Button triggering JSON download / export text |
| Import File Input | `[data-testid="import-file-input"]` | Hidden/visible `<input type="file">` |
| Import JSON Textarea | `[data-testid="import-json-textarea"]` | Textarea allowing direct JSON paste |
| Import Submit Button | `[data-testid="import-backup-btn"]` | Button applying imported backup |
| Import Error Alert | `[data-testid="backup-error-alert"]` | Notice shown on invalid JSON / schema error |
| Storage State Key | `localStorage.getItem('zzztasks_state')` | Standard key holding serialized state |

---

## 3. Coverage Tiers & Feature Inventory Mapping

The test suite is organized into 4 progressive tiers ensuring 100% functional, edge-case, and integration coverage.

```
+-------------------------------------------------------------------------------+
|                             TEST SUITE ARCHITECTURE                          |
+-------------------------------------------------------------------------------+
| Tier 1: Core Feature Coverage (Happy Path)                                    |
|   - Task CRUD Lifecycle (F01, F02, F03, F04, F05)                             |
|   - Dailies Check-In & Claim (F10, F13)                                       |
|   - Calendar Date Navigation & Filter (F14, F15, F17)                         |
|   - Audio Mute Toggle & Persist (F24, F25)                                    |
|   - Bangboo Mascot Rendering & Poke Reaction (F26, F28, F29)                  |
+-------------------------------------------------------------------------------+
| Tier 2: Boundary & Corner Cases                                               |
|   - Empty Input Validation (F01)                                              |
|   - Extreme Long Titles & Character Stress (F01, F02, F22)                    |
|   - 04:00 AM Daily Reset Boundary (F11)                                       |
|   - Consecutive Streak Break Handling (F12)                                   |
|   - Malformed & Schema-Violating JSON Import (F21, F32)                       |
|   - Web Audio Autoplay Policy Fallback (F24, F25)                             |
+-------------------------------------------------------------------------------+
| Tier 3: Cross-Feature Combinations                                            |
|   - Scheduled Task Lifecycle Across Board & Calendar Matrix (F01, F16, F17)   |
|   - Daily Commission Claim Updating Streak & Calendar Day Marker (F10, F12, F18)
|   - Bangboo Mood State Transitions Across Task Lifecycle (F01, F03, F27, F28) |
+-------------------------------------------------------------------------------+
| Tier 4: Real-World Scenarios                                                  |
|   - Full Daily Routine: Commissions, Schedule Inspection, Audio Preference,   |
|     Disaster Recovery via Backup Export, LocalStorage Wipe & 100% Restore     |
+-------------------------------------------------------------------------------+
```

### Coverage Matrix
| Tier | Test Case | Target Features | Requirements | Pass Threshold |
|---|---|---|---|---|
| **Tier 1** | Task CRUD Lifecycle | F01, F02, F03, F04, F05 | R1 | 100% Pass |
| **Tier 1** | Dailies Check-In & Claim | F10, F13 | R1 | 100% Pass |
| **Tier 1** | Calendar Date Navigation & Filter | F14, F15, F17 | R1 | 100% Pass |
| **Tier 1** | Audio Mute Toggle & Persistence | F24, F25 | R2 | 100% Pass |
| **Tier 1** | Bangboo Mascot Rendering & Poke Reaction | F26, F28, F29 | R2 | 100% Pass |
| **Tier 2** | Empty Input Prevention | F01 | R1 | 100% Pass |
| **Tier 2** | Extreme Title & Description Length | F01, F02, F22 | R1, R2 | 100% Pass |
| **Tier 2** | 04:00 AM Cycle Reset Boundary | F11 | R1 | 100% Pass |
| **Tier 2** | Streak Break Computation | F12 | R1 | 100% Pass |
| **Tier 2** | Invalid JSON Import Validation | F21, F32 | R1, R3 | 100% Pass |
| **Tier 2** | Audio Autoplay Graceful Fallback | F24, F25 | R2 | 100% Pass |
| **Tier 3** | Scheduled Task on Calendar Matrix | F01, F16, F17 | R1 | 100% Pass |
| **Tier 3** | Daily Claim Updates Streak & Calendar | F10, F12, F18 | R1 | 100% Pass |
| **Tier 3** | Reactive Bangboo Mood Engine | F01, F03, F27, F28 | R1, R2 | 100% Pass |
| **Tier 4** | Complete Daily Routine & Backup Disaster Recovery | F01-F30 | R1, R2, R3 | 100% Pass |

---

## 4. Test Runner Architecture & Execution Setup

### 4.1 Headless Chrome & CDP Engine
The autonomous runner (`e2e/test-runner.mjs`) controls modern headless Chrome using the **Chrome DevTools Protocol (CDP)** directly over Node.js's native WebSocket implementation (`--experimental-websocket`).

Key architectural advantages:
1. **Zero External Runtime Dependencies**: Does not require heavy browser install scripts or package manager installations. Uses the host's installed Google Chrome / Chromium.
2. **Deterministic Speed**: Instantaneous CDP socket connection and message passing with sub-millisecond roundtrips.
3. **True Opaque-Box DOM Control**: Real clicks, keystrokes, page reloads, and local storage queries run inside an authentic browser process.
4. **Dual Mode Execution**:
   - **Live Target Mode**: Connects to the Vite dev server (`http://localhost:5173` or `APP_URL`).
   - **Self-Test / Reference Mode**: Runs against an internal reference DOM server verifying all tier test assertions, runner mechanics, and reporting before M1-M5 builds complete.

### 4.2 How to Execute

#### Run All Tiers (Headless Chrome):
```bash
node --experimental-websocket e2e/test-runner.mjs
```

#### Run a Specific Tier:
```bash
node --experimental-websocket e2e/test-runner.mjs --tier 1
node --experimental-websocket e2e/test-runner.mjs --tier 2
node --experimental-websocket e2e/test-runner.mjs --tier 3
node --experimental-websocket e2e/test-runner.mjs --tier 4
```

#### Run Against Custom URL:
```bash
node --experimental-websocket e2e/test-runner.mjs --url http://localhost:5173
```

#### Run in Self-Test Mode (Verification of Testbed):
```bash
node --experimental-websocket e2e/test-runner.mjs --mock-server
```

---

## 5. Expected Output Derivation & Authoritative Sources

| Test Tier | Test Case | Authoritative Source of Truth | Expected Output Behavior |
|---|---|---|---|
| Tier 1 | Task CRUD | `PROJECT.md` § Feature Inventory F01-F05 | Task added to DOM with rank S; editing updates title text; clicking complete marks done; deleting removes card from DOM. |
| Tier 1 | Dailies Check-In | `ORIGINAL_REQUEST.md` R1 & `PROJECT.md` F10, F13 | Clicking claim button changes badge to COMPLETED; triggers reward feedback modal. |
| Tier 1 | Calendar Navigation | `PROJECT.md` F14, F15, F17 | Clicking next advances month in header; clicking day filters date drawer for that day. |
| Tier 1 | Audio Mute Toggle | `ORIGINAL_REQUEST.md` R2 & `PROJECT.md` F25 | Clicking mute button toggles `data-muted` from `false` to `true` and saves setting in storage. |
| Tier 1 | Bangboo Interaction | `ORIGINAL_REQUEST.md` Follow-up & `PROJECT.md` F26, F29 | Mascot is visible; clicking mascot changes mood/dialogue and plays cheer response. |
| Tier 2 | Empty Input | `ORIGINAL_REQUEST.md` R1 | Submitting blank title displays `task-form-error` and does not append task card. |
| Tier 2 | Long Titles | `PROJECT.md` F22 Streetwear HUD | 300-char string renders with ellipsis/wrap without displacing adjacent HUD controls. |
| Tier 2 | 04:00 AM Reset | `PROJECT.md` § Core Modules 3, F11 | Advancing clock past 04:00 AM resets daily commission status to pending. |
| Tier 2 | Streak Break | `PROJECT.md` F12 & Interface Contract 2 | Consecutive days increment streak; a gap day resets current streak. |
| Tier 2 | Corrupted Backup | `PROJECT.md` F21, F32 & Storage Contract | Malformed JSON string shows `backup-error-alert` without modifying existing state. |
| Tier 2 | Autoplay Fallback | `PROJECT.md` F24, F25 | Audio engine swallows `NotAllowedError` safely; mute toggle functions without error. |
| Tier 3 | Task on Calendar | `ORIGINAL_REQUEST.md` R1 & `PROJECT.md` F16, F17 | Scheduled task displays deadline dot on corresponding date; completing updates both views. |
| Tier 3 | Daily & Calendar Dot | `PROJECT.md` F12, F18 | Claiming commission updates streak badge and adds `daily-complete-dot` to calendar day. |
| Tier 3 | Bangboo Reaction | `ORIGINAL_REQUEST.md` Follow-up & `PROJECT.md` F27 | Completing task sets mascot `data-mood="celebrating"` with dialogue balloon. |
| Tier 4 | Daily Routine Routine | `ORIGINAL_REQUEST.md` All Requirements | Full workflow: Tasks + Dailies + Calendar + Backup -> Clear State -> Restore -> Verify 100% data fidelity. |
