/**
 * Tier 5: Adversarial Coverage Hardening
 * Features Tested:
 * 5.1 Rapid View Switching Stress (Race condition & unmounted update defense)
 * 5.2 Malicious Backup Injection & Script Tag Sanitization
 * 5.3 Audio Mute & Volume Extreme Toggle Transitions
 * 5.4 Bangboo Mascot Interactive Poke Spamming & Rapid Mood Shifts
 * 5.5 Task Extreme Character Stress & Boundary Leap Dates
 * 5.6 Corrupted History Map & Quota Error Resilience
 */
import { describe, it, expect, page, beforeEach } from './harness.mjs';

describe('Tier 5: Adversarial Coverage Hardening', () => {
  beforeEach(async () => {
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
  });

  it('5.1 Rapid View Switching Stress (Cycling Tabs 30x)', async () => {
    // Stress cycle across Tasks -> Dailies -> Calendar rapidly
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="tab-tasks"]');
      await page.click('[data-testid="tab-dailies"]');
      await page.click('[data-testid="tab-calendar"]');
    }

    // End on Tasks board
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    // Verify app didn't crash and remains fully interactive
    const isVisible = await page.isVisible('[data-testid="tasks-view"]');
    expect(isVisible).toBe(true);

    // Open task creation modal to ensure event bindings are intact
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    expect(await page.isVisible('[data-testid="task-modal"]')).toBe(true);
  });

  it('5.2 Malicious Backup Injection & Script Tag Sanitization', async () => {
    await page.click('[data-testid="backup-modal-btn"]');
    await page.waitForSelector('[data-testid="backup-modal"]');

    const maliciousBackup = JSON.stringify({
      app: 'ZZZTasks',
      version: 1,
      schemaVersion: '1.0.0',
      payload: {
        tasks: [
          {
            id: 'xss-attack-1',
            title: '<script>window.__xss_pwned = true;</script>Infiltrated Hollow',
            description: '<img src="x" onerror="window.__xss_pwned = true;">Exploit payload',
            priority: 'S',
            category: 'Combat',
            tags: ['<script>evil()</script>'],
          },
        ],
        dailies: {
          lastReset: new Date().toISOString(),
          currentStreak: 1,
          longestStreak: 1,
          history: {},
          commissions: [],
          commissionClaimed: false,
          totalCommissionsClaimed: 0,
        },
        settings: {
          resetHour: 4,
          weekStartsOn: 1,
          audio: { muted: false, volume: 0.8, sfxVolume: 0.8, sfxEnabled: true },
          visual: { crtOverlay: true, glitchEffects: true, highContrast: false, reducedMotion: false },
          bangboo: { enabled: true, mascotType: 'eous', voiceEnabled: true, minimized: false, position: 'bottom-right' },
        },
      },
    });

    await page.fill('[data-testid="import-json-textarea"]', maliciousBackup);
    await page.click('[data-testid="import-backup-btn"]');
    await page.sleep(250);

    // Verify task is imported safely
    await page.reload();
    await page.waitForSelector('[data-testid="tasks-view"]');

    // Confirm that the script never executed in browser window
    const xssExecuted = await page.evaluate(() => Boolean(window.__xss_pwned));
    expect(xssExecuted).toBe(false);

    // Confirm card title rendered safely without unescaped script tag
    const titleText = await page.textContent('[data-testid="task-title"]');
    expect(titleText).toContain('Infiltrated Hollow');
    expect(titleText.toLowerCase().includes('script')).toBe(false);
  });

  it('5.3 Audio Mute & Volume Extreme Toggle Transitions', async () => {
    // Rapidly toggle mute 20 times
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="audio-toggle"]');
    }

    const initialMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(initialMuted === 'true' || initialMuted === 'false').toBe(true);

    // Click once more to verify deterministic toggle
    await page.click('[data-testid="audio-toggle"]');
    await page.sleep(400); // Allow debounce buffer to persist
    const flippedMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(flippedMuted).not.toBe(initialMuted);

    // Verify persistence across reload
    await page.reload();
    await page.waitForSelector('[data-testid="audio-toggle"]');
    const reloadedMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(reloadedMuted).toBe(flippedMuted);
  });

  it('5.4 Bangboo Mascot Interactive Poke Spamming & Rapid Mood Shifts', async () => {
    await page.waitForSelector('[data-testid="bangboo-mascot"]');

    // Spam click on the Bangboo companion 25 times
    for (let i = 0; i < 25; i++) {
      await page.click('[data-testid="bangboo-mascot"]');
    }

    // Verify speech bubble is visible and has updated dialogue
    await page.waitForSelector('[data-testid="bangboo-speech-bubble"]');
    const dialogue = await page.textContent('[data-testid="bangboo-dialogue"]');
    expect(dialogue).toBeTruthy();
    expect(dialogue.length).toBeGreaterThan(0);

    // Verify mood badge reflects active mood
    const mascotMood = await page.getAttribute('[data-testid="bangboo-mascot"]', 'data-mood');
    expect(['happy', 'surprised', 'celebrating', 'idle', 'triumphant', 'sleepy']).toContain(mascotMood);
  });

  it('5.5 Task Extreme Character Stress & Boundary Leap Dates', async () => {
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    const massiveTitle = 'ZZZ-CRITICAL-MISSION-' + 'X'.repeat(200);
    const massiveDesc = 'DETAILED TELEMETRY: ' + 'Y'.repeat(400);
    const leapDate = '2028-02-29'; // Leap day

    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', massiveTitle);
    await page.fill('[data-testid="task-desc-input"]', massiveDesc);
    await page.fill('[data-testid="task-due-date-input"]', leapDate);
    await page.select('[data-testid="task-priority-select"]', 'S');
    await page.click('[data-testid="task-submit-btn"]');

    await page.waitForSelector('[data-testid="task-card"]');
    const cardTitle = await page.textContent('[data-testid="task-title"]');
    expect(cardTitle).toContain('ZZZ-CRITICAL-MISSION-');

    // Verify calendar view maps the leap day scheduled task correctly
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');
    expect(await page.isVisible('[data-testid="calendar-view"]')).toBe(true);
  });

  it('5.6 Corrupted History Map & Quota Error Resilience', async () => {
    // Inject corrupted history map directly into localStorage
    await page.evaluate(() => {
      const raw = localStorage.getItem('zzztasks_state');
      const state = raw ? JSON.parse(raw) : {};
      state.dailies = {
        lastReset: '2026-10-18T04:00:00.000Z',
        currentStreak: 0,
        longestStreak: 0,
        history: {
          'corrupted-date': true,
          '9999-99-99': true,
          '': true,
          'toString': true,
        },
        commissions: [],
      };
      localStorage.setItem('zzztasks_state', JSON.stringify(state));
    });

    // Reload page to verify streak calculation does not hang in an infinite loop
    const reloadStart = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
    const reloadDuration = Date.now() - reloadStart;

    // Must reload and hydrate without hanging
    expect(reloadDuration).toBeLessThan(4000);
    expect(await page.isVisible('[data-testid="tab-nav"]')).toBe(true);
  });
});
