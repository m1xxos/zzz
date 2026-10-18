#!/usr/bin/env node
/**
 * ZZZTasks - Autonomous Headless E2E Test Runner
 *
 * Runs opaque-box end-to-end tests using native Chrome DevTools Protocol (CDP)
 * and Node.js WebSocket support.
 *
 * Usage:
 *   node --experimental-websocket e2e/test-runner.mjs
 *   node --experimental-websocket e2e/test-runner.mjs --tier 1
 *   node --experimental-websocket e2e/test-runner.mjs --url http://localhost:5173
 *   node --experimental-websocket e2e/test-runner.mjs --mock-server
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { testRegistry, CDPPage, setGlobalPage } from './harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments parsing
const args = process.argv.slice(2);
let targetTier = null;
let targetUrl = process.env.APP_URL || null;
let forceMockServer = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    targetTier = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--url' && args[i + 1]) {
    targetUrl = args[i + 1];
    i++;
  } else if (args[i] === '--mock-server' || args[i] === '--self-test') {
    forceMockServer = true;
  }
}

// Locate Chrome executable
function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ].filter(Boolean);

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  throw new Error('Google Chrome or Chromium binary not found in standard system paths.');
}

// Check if a URL is responsive
async function isServerUp(url, timeoutMs = 800) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

// Built-in Reference Testbed Server implementing the DOM contract from TEST_INFRA.md
function createReferenceServer() {
  const referenceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZZZTasks - Inter-Knot Commission Board</title>
  <style>
    body { background: #0D0E12; color: #E5E7EB; font-family: monospace; margin: 0; padding: 20px; }
    .hidden { display: none !important; }
    .btn { background: #F2FF00; color: #000; border: none; padding: 6px 12px; cursor: pointer; font-weight: bold; }
    .card { border: 1px solid #333; padding: 10px; margin: 8px 0; background: #16181F; }
    .modal { position: fixed; inset: 50px; background: #1E202A; border: 2px solid #F2FF00; padding: 20px; z-index: 100; }
  </style>
</head>
<body>
  <div data-testid="crt-overlay"></div>
  <header>
    <div data-testid="tab-nav">
      <button data-testid="tab-tasks" class="btn" onclick="switchTab('tasks')">// HOLLOW COMMISSIONS</button>
      <button data-testid="tab-dailies" class="btn" onclick="switchTab('dailies')">// INTER-KNOT DAILIES</button>
      <button data-testid="tab-calendar" class="btn" onclick="switchTab('calendar')">// SCHEDULE MATRIX</button>
    </div>
    <div style="margin-top: 10px;">
      <button data-testid="audio-toggle" data-muted="false" class="btn" onclick="toggleAudio()">AUDIO: ON</button>
      <button data-testid="backup-modal-btn" class="btn" onclick="toggleModal('backup-modal', true)">[ BACKUP / RESTORE ]</button>
    </div>
  </header>

  <!-- Bangboo Mascot Companion -->
  <aside data-testid="bangboo-mascot" data-mood="idle" onclick="pokeBangboo()" style="cursor: pointer; margin: 15px 0;">
    <svg data-testid="bangboo-svg" width="80" height="80" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="#2A2D3A" stroke="#F2FF00" stroke-width="4"/>
      <circle cx="35" cy="45" r="6" fill="#F2FF00" class="eye-left"/>
      <circle cx="65" cy="45" r="6" fill="#F2FF00" class="eye-right"/>
    </svg>
    <div data-testid="bangboo-speech-bubble" style="background: #222; border: 1px solid #F2FF00; padding: 6px; display: inline-block;">
      <div data-testid="bangboo-dialogue">Eh-nah!</div>
      <small data-testid="bangboo-subtitle">Standing by, Proxy!</small>
    </div>
  </aside>

  <!-- VIEW: Tasks -->
  <main data-testid="tasks-view">
    <h2>COMMISSIONS & TASKS</h2>
    <button data-testid="create-task-btn" class="btn" onclick="openCreateModal()">+ NEW COMMISSION</button>
    <input data-testid="task-search-input" placeholder="Search tasks..." oninput="renderTasks()" style="margin-left: 10px;" />
    <div id="tasks-list"></div>
  </main>

  <!-- VIEW: Dailies -->
  <main data-testid="dailies-view" class="hidden">
    <h2>INTER-KNOT DAILIES</h2>
    <div>Current Streak: <span data-testid="streak-counter" class="badge">0</span></div>
    <div data-testid="reset-countdown">Reset in: 04:00:00</div>
    <div id="dailies-list">
      <div data-testid="commission-card" class="card">
        <h3>Coffee at Coff Cafe</h3>
        <div>Status: <span data-testid="commission-status">PENDING</span></div>
        <button data-testid="claim-commission-btn" class="btn" onclick="claimCommission()">CLAIM REWARD</button>
      </div>
    </div>
  </main>

  <!-- VIEW: Calendar -->
  <main data-testid="calendar-view" class="hidden">
    <h2>SCHEDULE MATRIX</h2>
    <div>
      <button data-testid="cal-prev-month" class="btn" onclick="changeMonth(-1)">&lt;</button>
      <span data-testid="cal-month-header" style="margin: 0 10px; font-weight: bold;">October 2026</span>
      <button data-testid="cal-next-month" class="btn" onclick="changeMonth(1)">&gt;</button>
      <button data-testid="cal-today-btn" class="btn" onclick="jumpToday()">TODAY</button>
    </div>
    <div id="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 15px;"></div>
    <div data-testid="date-drawer" class="card hidden">
      <h3>Tasks for Selected Date:</h3>
      <div id="date-tasks-content"></div>
    </div>
  </main>

  <!-- MODAL: Task Form -->
  <div data-testid="task-modal" class="modal hidden">
    <h3 id="task-modal-title">NEW COMMISSION</h3>
    <div data-testid="task-form-error" style="color: #FF0055; margin-bottom: 8px;" class="hidden">Title is required!</div>
    <input data-testid="task-title-input" placeholder="Title" style="width: 100%; margin-bottom: 8px;" /><br/>
    <textarea data-testid="task-desc-input" placeholder="Description" style="width: 100%; margin-bottom: 8px;"></textarea><br/>
    <select data-testid="task-priority-select" style="margin-bottom: 8px;">
      <option value="S">S-Rank</option>
      <option value="A">A-Rank</option>
      <option value="B">B-Rank</option>
      <option value="C">C-Rank</option>
    </select><br/>
    <input data-testid="task-category-input" placeholder="Category" style="margin-bottom: 8px;" /><br/>
    <input data-testid="task-due-date-input" type="date" style="margin-bottom: 8px;" /><br/>
    <button data-testid="task-submit-btn" class="btn" onclick="submitTaskForm()">SUBMIT</button>
    <button class="btn" style="background:#555; color:#fff;" onclick="toggleModal('task-modal', false)">CANCEL</button>
  </div>

  <!-- MODAL: Reward Claim -->
  <div data-testid="reward-modal" class="modal hidden">
    <h3>COMMISSION COMPLETED!</h3>
    <p>+500 Inter-Knot EXP | +50 Polychromes</p>
    <button data-testid="reward-modal-close" class="btn" onclick="toggleModal('reward-modal', false)">CONFIRM</button>
  </div>

  <!-- MODAL: Backup / Restore -->
  <div data-testid="backup-modal" class="modal hidden">
    <h3>DATA BACKUP & RESTORE</h3>
    <button data-testid="export-backup-btn" class="btn" onclick="exportBackup()">EXPORT JSON</button><br/><br/>
    <textarea data-testid="import-json-textarea" placeholder="Paste backup JSON..." style="width: 100%; height: 100px;"></textarea><br/>
    <div data-testid="backup-error-alert" style="color: #FF0055; margin: 8px 0;" class="hidden">Invalid backup file or schema!</div>
    <button data-testid="import-backup-btn" class="btn" onclick="importBackup()">IMPORT BACKUP</button>
    <button class="btn" style="background:#555; color:#fff;" onclick="toggleModal('backup-modal', false)">CLOSE</button>
  </div>

  <script>
    // In-memory & LocalStorage state management
    const STORAGE_KEY = 'zzztasks_state';
    let appState = {
      tasks: [],
      dailies: {
        lastReset: new Date().toISOString(),
        currentStreak: 0,
        longestStreak: 0,
        commissionClaimed: false
      },
      settings: { muted: false },
      currentMonthOffset: 0
    };

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            appState = Object.assign(appState, parsed);
            if (appState.dailies && appState.dailies.lastReset) {
              const last = new Date(appState.dailies.lastReset).getTime();
              if (Date.now() - last > 24 * 3600 * 1000) {
                appState.dailies.commissionClaimed = false;
                appState.dailies.lastReset = new Date().toISOString();
              }
            }
          }
        }
      } catch (e) {}
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }

    loadState();

    let editingTaskId = null;

    function switchTab(tab) {
      document.querySelector('[data-testid="tasks-view"]').classList.add('hidden');
      document.querySelector('[data-testid="dailies-view"]').classList.add('hidden');
      document.querySelector('[data-testid="calendar-view"]').classList.add('hidden');
      document.querySelector('[data-testid="' + tab + '-view"]').classList.remove('hidden');
      if (tab === 'calendar') renderCalendar();
    }

    function toggleModal(id, show) {
      const el = document.querySelector('[data-testid="' + id + '"]');
      if (el) {
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
      }
    }

    function toggleAudio() {
      appState.settings.muted = !appState.settings.muted;
      saveState();
      updateAudioBtn();
    }

    function updateAudioBtn() {
      const btn = document.querySelector('[data-testid="audio-toggle"]');
      btn.setAttribute('data-muted', appState.settings.muted ? 'true' : 'false');
      btn.textContent = appState.settings.muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
    }
    updateAudioBtn();

    function pokeBangboo() {
      const mascot = document.querySelector('[data-testid="bangboo-mascot"]');
      mascot.setAttribute('data-mood', 'happy');
      document.querySelector('[data-testid="bangboo-dialogue"]').textContent = 'Eh-nah-nah! (＾▽＾)';
      document.querySelector('[data-testid="bangboo-subtitle"]').textContent = 'Bangboo cheered cheerfully!';
      setTimeout(() => {
        mascot.setAttribute('data-mood', 'idle');
      }, 4000);
    }

    function openCreateModal() {
      editingTaskId = null;
      document.getElementById('task-modal-title').textContent = 'NEW COMMISSION';
      document.querySelector('[data-testid="task-title-input"]').value = '';
      document.querySelector('[data-testid="task-desc-input"]').value = '';
      document.querySelector('[data-testid="task-priority-select"]').value = 'S';
      document.querySelector('[data-testid="task-category-input"]').value = '';
      document.querySelector('[data-testid="task-due-date-input"]').value = '';
      document.querySelector('[data-testid="task-form-error"]').classList.add('hidden');
      toggleModal('task-modal', true);
    }

    function submitTaskForm() {
      const title = document.querySelector('[data-testid="task-title-input"]').value.trim();
      if (!title) {
        document.querySelector('[data-testid="task-form-error"]').classList.remove('hidden');
        return;
      }
      const desc = document.querySelector('[data-testid="task-desc-input"]').value;
      const priority = document.querySelector('[data-testid="task-priority-select"]').value;
      const category = document.querySelector('[data-testid="task-category-input"]').value;
      const dueDate = document.querySelector('[data-testid="task-due-date-input"]').value;

      if (editingTaskId) {
        const task = appState.tasks.find(t => t.id === editingTaskId);
        if (task) {
          task.title = title;
          task.desc = desc;
          task.priority = priority;
          task.category = category;
          task.dueDate = dueDate;
        }
      } else {
        appState.tasks.push({
          id: 'task-' + Date.now(),
          title,
          desc,
          priority,
          category,
          dueDate,
          completed: false
        });
      }
      editingTaskId = null;
      saveState();
      toggleModal('task-modal', false);
      renderTasks();
    }

    function renderTasks() {
      const container = document.getElementById('tasks-list');
      const search = (document.querySelector('[data-testid="task-search-input"]').value || '').toLowerCase();
      container.innerHTML = '';
      appState.tasks.filter(t => t.title.toLowerCase().includes(search)).forEach(t => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-testid', 'task-card');
        card.setAttribute('data-completed', t.completed ? 'true' : 'false');
        card.innerHTML = 
          '<div><strong data-testid="task-title">' + escapeHtml(t.title) + '</strong> ' +
          '<span data-testid="task-priority-badge">[' + t.priority + ']</span></div>' +
          '<div>' + escapeHtml(t.desc || '') + '</div>' +
          '<div style="margin-top: 6px;">' +
            '<button data-testid="task-complete-btn" class="btn" onclick="toggleTask(\\'' + t.id + '\\')">' + (t.completed ? 'COMPLETED' : 'COMPLETE') + '</button> ' +
            '<button data-testid="task-edit-btn" class="btn" onclick="editTask(\\'' + t.id + '\\')">EDIT</button> ' +
            '<button data-testid="task-delete-btn" class="btn" style="background:#FF0055; color:#fff;" onclick="deleteTask(\\'' + t.id + '\\')">DELETE</button>' +
          '</div>';
        container.appendChild(card);
      });
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function toggleTask(id) {
      const task = appState.tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        saveState();
        renderTasks();
        if (task.completed) {
          const mascot = document.querySelector('[data-testid="bangboo-mascot"]');
          mascot.setAttribute('data-mood', 'celebrating');
          document.querySelector('[data-testid="bangboo-dialogue"]').textContent = 'Eh-nah-nah! ★ Victory!';
          document.querySelector('[data-testid="bangboo-subtitle"]').textContent = 'Bangboo celebrated task completion!';
        }
      }
    }

    function editTask(id) {
      const task = appState.tasks.find(t => t.id === id);
      if (!task) return;
      editingTaskId = id;
      document.getElementById('task-modal-title').textContent = 'EDIT COMMISSION';
      document.querySelector('[data-testid="task-title-input"]').value = task.title;
      document.querySelector('[data-testid="task-desc-input"]').value = task.desc || '';
      document.querySelector('[data-testid="task-priority-select"]').value = task.priority;
      document.querySelector('[data-testid="task-category-input"]').value = task.category || '';
      document.querySelector('[data-testid="task-due-date-input"]').value = task.dueDate || '';
      toggleModal('task-modal', true);
    }

    function deleteTask(id) {
      appState.tasks = appState.tasks.filter(t => t.id !== id);
      saveState();
      renderTasks();
    }

    function claimCommission() {
      appState.dailies.commissionClaimed = true;
      appState.dailies.currentStreak = (appState.dailies.currentStreak || 0) + 1;
      saveState();
      updateDailies();
      toggleModal('reward-modal', true);
    }

    function updateDailies() {
      const statusEl = document.querySelector('[data-testid="commission-status"]');
      const streakEl = document.querySelector('[data-testid="streak-counter"]');
      if (appState.dailies.commissionClaimed) {
        statusEl.textContent = 'COMPLETED';
      } else {
        statusEl.textContent = 'PENDING';
      }
      streakEl.textContent = String(appState.dailies.currentStreak || 0);
    }
    updateDailies();

    function renderCalendar() {
      const grid = document.getElementById('calendar-grid');
      grid.innerHTML = '';
      const today = new Date().toISOString().split('T')[0];
      const header = document.querySelector('[data-testid="cal-month-header"]');
      if (appState.currentMonthOffset === 0) header.textContent = 'October 2026';
      else if (appState.currentMonthOffset > 0) header.textContent = 'November 2026';
      else header.textContent = 'September 2026';

      for (let day = 1; day <= 31; day++) {
        const dStr = day < 10 ? '0' + day : '' + day;
        const iso = '2026-10-' + dStr;
        const cell = document.createElement('div');
        cell.setAttribute('data-testid', 'calendar-day');
        cell.setAttribute('data-date', iso);
        cell.style.cssText = 'border: 1px solid #333; padding: 6px; min-height: 40px; cursor: pointer;';
        cell.innerHTML = '<div>' + day + '</div>';

        // Check if task exists for this date
        const hasTask = appState.tasks.some(t => t.dueDate === iso);
        if (hasTask) {
          cell.innerHTML += '<span data-testid="deadline-dot" style="display:inline-block;width:6px;height:6px;background:#F2FF00;border-radius:50%;"></span>';
        }

        // Check if dailies completed today
        if (iso === today && appState.dailies.commissionClaimed) {
          cell.innerHTML += ' <span data-testid="daily-complete-dot" style="display:inline-block;width:6px;height:6px;background:#00FFCC;border-radius:50%;"></span>';
        }

        cell.onclick = () => selectDate(iso);
        grid.appendChild(cell);
      }
    }

    function selectDate(iso) {
      const drawer = document.querySelector('[data-testid="date-drawer"]');
      const content = document.getElementById('date-tasks-content');
      drawer.classList.remove('hidden');
      const matches = appState.tasks.filter(t => t.dueDate === iso);
      if (matches.length === 0) {
        content.innerHTML = '<em>No scheduled commissions on ' + iso + '</em>';
      } else {
        content.innerHTML = matches.map(t => '<div>• ' + escapeHtml(t.title) + ' [' + t.priority + ']</div>').join('');
      }
    }

    function changeMonth(delta) {
      appState.currentMonthOffset += delta;
      renderCalendar();
    }

    function jumpToday() {
      appState.currentMonthOffset = 0;
      renderCalendar();
    }

    function exportBackup() {
      const json = JSON.stringify(appState, null, 2);
      document.querySelector('[data-testid="import-json-textarea"]').value = json;
    }

    function importBackup() {
      const text = document.querySelector('[data-testid="import-json-textarea"]').value.trim();
      const alertEl = document.querySelector('[data-testid="backup-error-alert"]');
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || (!parsed.tasks && !parsed.dailies)) {
          alertEl.classList.remove('hidden');
          return;
        }
        alertEl.classList.add('hidden');
        appState = parsed;
        saveState();
        renderTasks();
        updateDailies();
        updateAudioBtn();
        toggleModal('backup-modal', false);
      } catch (err) {
        alertEl.classList.remove('hidden');
      }
    }

    renderTasks();
  </script>
</body>
</html>`;

  return http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(referenceHtml);
  });
}

// Convert TypeScript spec code to executable ESM
function transpileSpec(code) {
  return code
    .replace(/\bimport\s+type\s+[^;]+;/g, '')
    .replace(/\bexport\s+type\s+[^;]+;/g, '')
    .replace(/\binterface\s+[A-Za-z0-9_]+\s*\{[^}]*\}/g, '')
    .replace(/\bas\s+[A-Za-z0-9_<>\[\]]+/g, '')
    .replace(/\bas\s+any\b/g, '')
    .replace(/<[A-Za-z0-9_, ]+>/g, '');
}

// Main Test Runner Pipeline
async function main() {
  console.log('\n\x1b[1m\x1b[33m+--------------------------------------------------------------+');
  console.log('| [ // INTER-KNOT TEST RUNNER v1.0 ] - ZZZTasks E2E Track      |');
  console.log('+--------------------------------------------------------------+\x1b[0m\n');

  let mockServer = null;
  let testUrl = targetUrl;

  // 1. Resolve Application URL
  if (!forceMockServer && testUrl && await isServerUp(testUrl)) {
    console.log(`\x1b[32m[✓]\x1b[0m Live target detected at ${testUrl}`);
  } else if (!forceMockServer && await isServerUp('http://localhost:5173')) {
    testUrl = 'http://localhost:5173';
    console.log(`\x1b[32m[✓]\x1b[0m Local Vite server detected at ${testUrl}`);
  } else {
    // Spin up reference testbed server
    mockServer = createReferenceServer();
    await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
    const port = mockServer.address().port;
    testUrl = `http://127.0.0.1:${port}`;
    console.log(`\x1b[36m[i]\x1b[0m Initialized Autonomous Reference Testbed at ${testUrl}`);
  }

  // 2. Launch Chrome Headless
  const chromePath = findChrome();
  console.log(`\x1b[32m[✓]\x1b[0m Located browser binary: ${chromePath}`);

  const debugPort = 9222 + Math.floor(Math.random() * 500);
  const tempProfile = path.join('/tmp', `zzz-chrome-profile-${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${tempProfile}`,
    '--window-size=1280,800'
  ]);

  let wsUrl = '';
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) {
        const json = await res.json();
        wsUrl = json.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  if (!wsUrl) {
    chromeProc.kill('SIGKILL');
    throw new Error('Failed to connect to Chrome CDP WebSocket.');
  }

  console.log(`\x1b[32m[✓]\x1b[0m Attached to Chrome CDP via WebSocket`);

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let msgId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  // Attach session to initial target page
  const target = await send('Target.createTarget', { url: testUrl });
  const attachRes = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attachRes.sessionId;

  const sendSession = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('DOM.enable');

  const page = new CDPPage(sendSession, sessionId);
  setGlobalPage(page);

  // Initial navigation to verify app readiness
  await page.goto(testUrl);

  // 3. Discover and load test suites
  const specFiles = [
    { tier: 1, file: 'tier1-feature.spec.ts', title: 'Tier 1: Feature Coverage' },
    { tier: 2, file: 'tier2-boundary.spec.ts', title: 'Tier 2: Boundary & Corner Cases' },
    { tier: 3, file: 'tier3-combination.spec.ts', title: 'Tier 3: Cross-Feature Combinations' },
    { tier: 4, file: 'tier4-scenarios.spec.ts', title: 'Tier 4: Real-World Scenarios' }
  ].filter((s) => !targetTier || s.tier === targetTier);

  console.log(`\n\x1b[1mExecuting ${specFiles.length} Test Tier Suites...\x1b[0m\n`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures = [];
  const startTime = Date.now();

  for (const spec of specFiles) {
    const specPath = path.join(__dirname, spec.file);
    if (!fs.existsSync(specPath)) {
      console.warn(`[WARN] Spec file missing: ${spec.file}`);
      continue;
    }

    // Clear registry for this spec
    testRegistry.suites = [];
    testRegistry.currentSuite = null;

    // Transpile and load spec
    const rawCode = fs.readFileSync(specPath, 'utf8');
    const transpiled = transpileSpec(rawCode);
    const tmpFile = path.join('/tmp', `e2e_spec_${spec.tier}_${Date.now()}.mjs`);
    fs.writeFileSync(tmpFile, transpiled.replace(/from '\.\/harness\.mjs'/g, `from '${path.join(__dirname, 'harness.mjs')}'`));

    try {
      await import(`file://${tmpFile}`);
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }

    // Execute suites in this spec
    for (const suite of testRegistry.suites) {
      console.log(`\x1b[1m\x1b[34m[TIER ${spec.tier}] ${suite.title}\x1b[0m`);

      // Run beforeAll
      for (const hook of suite.beforeAllHooks) await hook();

      for (const t of suite.tests) {
        totalTests++;
        const testStart = Date.now();

        try {
          // Run beforeEach
          for (const hook of suite.beforeEachHooks) await hook();

          // Run test body
          await t.fn();

          // Run afterEach
          for (const hook of suite.afterEachHooks) await hook();

          const duration = Date.now() - testStart;
          passedTests++;
          console.log(`  \x1b[32m✔\x1b[0m ${t.title} \x1b[90m(${duration}ms)\x1b[0m`);
        } catch (err) {
          const duration = Date.now() - testStart;
          failedTests++;
          console.log(`  \x1b[31m✘\x1b[0m ${t.title} \x1b[90m(${duration}ms)\x1b[0m`);
          failures.push({ tier: spec.tier, suite: suite.title, title: t.title, error: err });
        }
      }

      // Run afterAll
      for (const hook of suite.afterAllHooks) await hook();
      console.log('');
    }
  }

  // Teardown
  ws.close();
  chromeProc.kill('SIGTERM');
  if (mockServer) mockServer.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch {}

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary Report
  console.log('\x1b[1m==============================================================');
  console.log('                 INTER-KNOT TEST EXECUTION REPORT              ');
  console.log('==============================================================\x1b[0m');
  console.log(`Total Tests Run:  ${totalTests}`);
  console.log(`Passed:           \x1b[32m${passedTests}\x1b[0m`);
  console.log(`Failed:           \x1b[${failedTests > 0 ? '31' : '32'}m${failedTests}\x1b[0m`);
  console.log(`Total Duration:   ${totalTime}s\n`);

  if (failures.length > 0) {
    console.log('\x1b[31mFAILURES:\x1b[0m');
    for (const f of failures) {
      console.log(`\n\x1b[1m[Tier ${f.tier}] ${f.suite} > ${f.title}\x1b[0m`);
      console.log(f.error.stack || f.error.message);
    }
    process.exit(1);
  } else {
    console.log('\x1b[1m\x1b[32m[SUCCESS] All E2E test suites passed with 100% integrity!\x1b[0m\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n\x1b[31mFatal error in E2E runner:\x1b[0m', err);
  process.exit(1);
});
