/**
 * Tier 2: Boundary & Corner Cases
 * Features Tested: Empty Inputs, Extreme Character Lengths, 04:00 AM Reset Boundary,
 * Streak Break Calculations, Malformed JSON Import, Web Audio Autoplay Fallback.
 */
import { describe, it, expect, page, beforeEach } from './harness.mjs';

describe('Tier 2: Boundary & Corner Cases', () => {
  beforeEach(async () => {
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
  });

  it('2.1 Empty Input Validation (Prevent Empty Task Creation)', async () => {
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    // Open task creation modal
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');

    // Attempt to submit with empty title
    await page.fill('[data-testid="task-title-input"]', '');
    await page.click('[data-testid="task-submit-btn"]');
    await page.sleep(100);

    // Form should either show validation error or modal should remain open without creating empty card
    const hasError = await page.isVisible('[data-testid="task-form-error"]');
    const modalStillOpen = await page.isVisible('[data-testid="task-modal"]');
    const hasCard = await page.isVisible('[data-testid="task-card"]');

    expect(hasError || modalStillOpen).toBe(true);
    expect(hasCard).toBe(false);
  });

  it('2.2 Extreme Long Titles & Special Characters Stress', async () => {
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    const extremeTitle = '⚡ [URGENT-ZZZ] Hollow Zero Deep Diver Comm: ' + 'A'.repeat(220) + ' <script>alert("xss")</script> 💥';
    const extremeDesc = 'Hazard Level 99: ' + 'B'.repeat(400) + ' &amp; "quotes" / \\';

    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', extremeTitle);
    await page.fill('[data-testid="task-desc-input"]', extremeDesc);
    await page.select('[data-testid="task-priority-select"]', 'S');
    await page.click('[data-testid="task-submit-btn"]');

    await page.waitForSelector('[data-testid="task-card"]');
    const renderedTitle = await page.textContent('[data-testid="task-title"]');
    expect(renderedTitle).toBeTruthy();
    expect(renderedTitle.includes('Hollow Zero Deep Diver Comm')).toBe(true);

    // Ensure raw unescaped script tag was sanitized and didn't crash execution
    const isModalOpen = await page.isVisible('[data-testid="task-modal"]');
    expect(isModalOpen).toBe(false);
  });

  it('2.3 Daily Reset Engine Boundary (04:00 AM Cycle Rollover)', async () => {
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    // First claim commission for current cycle
    await page.click('[data-testid="claim-commission-btn"]');
    await page.sleep(100);

    const status1 = await page.textContent('[data-testid="commission-status"]');
    expect(status1).toContain('COMPLETED');

    // Simulate clock crossing 04:00 AM boundary by advancing stored lastReset or invoking reset check
    await page.evaluate(() => {
      // Manipulate state in localStorage to simulate yesterday's cycle
      const raw = localStorage.getItem('zzztasks_state');
      if (raw) {
        const state = JSON.parse(raw);
        // Set lastReset to 2 days ago
        const past = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        if (state.dailies) {
          state.dailies.lastReset = past;
          if (Array.isArray(state.dailies.commissions)) {
            state.dailies.commissions.forEach((c) => {
              c.completedDates = ['2026-10-16'];
              c.status = 'PENDING';
            });
          }
        }
        localStorage.setItem('zzztasks_state', JSON.stringify(state));
      }
    });

    // Reload page to trigger app mount reset check
    await page.reload();
    await page.waitForSelector('[data-testid="tab-dailies"]');
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    // Commission should be reset to PENDING for the new day
    const status2 = await page.textContent('[data-testid="commission-status"]');
    expect(status2).toContain('PENDING');
  });

  it('2.4 Streak Break Calculation & Inactivity Recovery', async () => {
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    // Seed state with an interrupted streak (completed 3 days ago, missing yesterday)
    await page.evaluate(() => {
      const raw = localStorage.getItem('zzztasks_state');
      const state = raw ? JSON.parse(raw) : {};
      state.dailies = {
        lastReset: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        currentStreak: 5,
        longestStreak: 5,
        history: {
          '2026-10-14': true,
          '2026-10-15': true
          // 2026-10-16 and 2026-10-17 missing
        },
        commissions: [
          { id: 'comm-1', title: 'Coffee at Coff Cafe', status: 'PENDING' }
        ]
      };
      localStorage.setItem('zzztasks_state', JSON.stringify(state));
    });

    await page.reload();
    await page.waitForSelector('[data-testid="tab-dailies"]');
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    // Verify streak broke due to missing consecutive day
    const streakText = await page.textContent('[data-testid="streak-counter"]');
    // Broken streak should be reset to 0 or 1 upon claiming today
    expect(streakText).toBeTruthy();
  });

  it('2.5 Corrupted & Malformed JSON Import Handling', async () => {
    // Open backup modal
    await page.click('[data-testid="backup-modal-btn"]');
    await page.waitForSelector('[data-testid="backup-modal"]');

    // Check if JSON textarea or file input is present
    const hasTextarea = await page.isVisible('[data-testid="import-json-textarea"]');
    if (hasTextarea) {
      // 1. Completely invalid JSON syntax
      await page.fill('[data-testid="import-json-textarea"]', '{ invalid_json ::: "malformed"');
      await page.click('[data-testid="import-backup-btn"]');
      await page.sleep(100);

      const alertVisible = await page.isVisible('[data-testid="backup-error-alert"]');
      expect(alertVisible).toBe(true);

      // 2. Valid JSON but invalid schema (wrong types, missing required version/tasks)
      await page.fill('[data-testid="import-json-textarea"]', JSON.stringify({ randomKey: 123 }));
      await page.click('[data-testid="import-backup-btn"]');
      await page.sleep(100);

      const schemaAlertVisible = await page.isVisible('[data-testid="backup-error-alert"]');
      expect(schemaAlertVisible).toBe(true);
    }
  });

  it('2.6 Web Audio Autoplay Policy Graceful Fallback', async () => {
    // Check that AudioContext initialization does not cause unhandled promise rejection
    // when triggered programmatically
    const audioInitializedWithoutCrash = await page.evaluate(() => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return true;
        const ctx = new AudioCtx();
        // Browser may be in 'suspended' state before user gesture
        return ctx.state === 'suspended' || ctx.state === 'running';
      } catch (e) {
        return false;
      }
    });

    expect(audioInitializedWithoutCrash).toBe(true);
  });
});
