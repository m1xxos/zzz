/**
 * Tier 4: Real-World Application Scenarios
 * Scenario: Complete Daily Routine, Mission Planning, and Disaster Recovery via Backup
 */
import { describe, it, expect, page, beforeEach } from './harness.mjs';

describe('Tier 4: Real-World Application Scenarios', () => {
  beforeEach(async () => {
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
  });

  it('4.1 Full Daily Routine: Commissions, Schedule Inspection, Audio Preference & Disaster Recovery', async () => {
    const today = new Date().toISOString().split('T')[0];

    // --- STEP 1: Commission / Task Creation ---
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    // Create Task 1 (S-Rank Urgent)
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Operation Hollow Zero: Core Assault');
    await page.select('[data-testid="task-priority-select"]', 'S');
    await page.fill('[data-testid="task-category-input"]', 'Combat');
    await page.fill('[data-testid="task-due-date-input"]', today);
    await page.click('[data-testid="task-submit-btn"]');
    await page.sleep(100);

    // Create Task 2 (A-Rank High)
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Inspect Sixth Street Video Store Inventory');
    await page.select('[data-testid="task-priority-select"]', 'A');
    await page.fill('[data-testid="task-category-input"]', 'Store');
    await page.click('[data-testid="task-submit-btn"]');
    await page.sleep(100);

    // Complete Task 2
    const completeBtns = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[data-testid="task-complete-btn"]'));
      if (btns.length > 1) {
        (btns[1] as HTMLElement).click();
        return true;
      }
      return false;
    });
    if (!completeBtns) {
      await page.click('[data-testid="task-complete-btn"]');
    }
    await page.sleep(100);

    // --- STEP 2: Inter-Knot Dailies Check-In ---
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    await page.click('[data-testid="claim-commission-btn"]');
    await page.sleep(150);

    // Dismiss reward popup if open
    if (await page.isVisible('[data-testid="reward-modal-close"]')) {
      await page.click('[data-testid="reward-modal-close"]');
    }

    const streakVal = await page.textContent('[data-testid="streak-counter"]');
    expect(streakVal).toBeTruthy();

    // --- STEP 3: Schedule Matrix & Calendar Verification ---
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');

    const todayCell = `[data-testid="calendar-day"][data-date="${today}"]`;
    if (await page.isVisible(todayCell)) {
      const dailyDot = await page.isVisible(`${todayCell} [data-testid="daily-complete-dot"]`);
      expect(dailyDot).toBe(true);
    }

    // --- STEP 4: Modify Audio Settings ---
    await page.click('[data-testid="audio-toggle"]');
    await page.sleep(100);
    const mutedSetting = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');

    // --- STEP 5: Export Full Backup ---
    let exportedJson = await page.evaluate(() => {
      const state = localStorage.getItem('zzztasks_state');
      return state;
    });

    // Also trigger export button in UI if available
    await page.click('[data-testid="backup-modal-btn"]');
    await page.waitForSelector('[data-testid="backup-modal"]');
    await page.click('[data-testid="export-backup-btn"]');
    await page.sleep(100);

    // Ensure we have a valid backup snapshot
    expect(exportedJson).toBeTruthy();

    // --- STEP 6: Catastrophic State Loss (Wipe State & Refresh) ---
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');

    // Verify tasks are gone
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');
    const hasCardAfterWipe = await page.isVisible('[data-testid="task-card"]');
    expect(hasCardAfterWipe).toBe(false);

    // --- STEP 7: Disaster Recovery via Backup Import ---
    await page.click('[data-testid="backup-modal-btn"]');
    await page.waitForSelector('[data-testid="backup-modal"]');

    // Restore via import textarea or localStorage injection
    if (await page.isVisible('[data-testid="import-json-textarea"]')) {
      await page.fill('[data-testid="import-json-textarea"]', exportedJson);
      await page.click('[data-testid="import-backup-btn"]');
      await page.sleep(200);
    } else {
      await page.setLocalStorage('zzztasks_state', exportedJson);
      await page.reload();
    }

    // --- STEP 8: Verify Complete Restoration of State ---
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    // Task 1 restored
    await page.waitForSelector('[data-testid="task-card"]');
    const allTaskText = await page.textContent('[data-testid="tasks-view"]');
    expect(allTaskText).toContain('Operation Hollow Zero: Core Assault');

    // Audio setting restored
    const restoredMute = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(restoredMute).toBe(mutedSetting);

    // Dailies & streak restored
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');
    const restoredStreak = await page.textContent('[data-testid="streak-counter"]');
    expect(restoredStreak).toBe(streakVal);
  });
});
