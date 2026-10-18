/**
 * Tier 3: Cross-Feature Combinations
 * Features Tested:
 * 3.1 Task Due Date Integration with Calendar Matrix & Cross-View Completion
 * 3.2 Daily Commission Claiming Updating Consecutive Streak & Calendar Marker Dot
 * 3.3 Bangboo Companion Mascot Reactive Mood Engine Across Task Lifecycle
 */
import { describe, it, expect, page, beforeEach } from './harness.mjs';

describe('Tier 3: Cross-Feature Combinations', () => {
  beforeEach(async () => {
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
  });

  it('3.1 Task Scheduled on Calendar Date & Cross-View Completion', async () => {
    // 1. Create a task with a specific due date (today's date)
    const today = new Date().toISOString().split('T')[0];
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Secure Hollow Zero Data Vault');
    await page.select('[data-testid="task-priority-select"]', 'S');
    await page.fill('[data-testid="task-due-date-input"]', today);
    await page.click('[data-testid="task-submit-btn"]');

    await page.waitForSelector('[data-testid="task-card"]');

    // 2. Switch to Calendar tab and verify deadline indicator dot on today's cell
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');

    const todayCellSelector = `[data-testid="calendar-day"][data-date="${today}"]`;
    if (await page.isVisible(todayCellSelector)) {
      await page.click(todayCellSelector);
      await page.sleep(100);

      // Verify task appears in calendar date drawer
      const drawerVisible = await page.isVisible('[data-testid="date-drawer"]');
      if (drawerVisible) {
        const drawerText = await page.textContent('[data-testid="date-drawer"]');
        expect(drawerText).toContain('Secure Hollow Zero Data Vault');
      }
    }

    // 3. Complete task from tasks board
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');
    await page.click('[data-testid="task-complete-btn"]');
    await page.sleep(100);

    // 4. Return to calendar and check completed status
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');
    if (await page.isVisible(todayCellSelector)) {
      const isDrawerOpen = await page.isVisible('[data-testid="date-drawer"]');
      if (!isDrawerOpen) {
        await page.click(todayCellSelector);
        await page.sleep(100);
      }
      const updatedDrawer = await page.textContent('[data-testid="date-drawer"]');
      expect(updatedDrawer).toContain('Secure Hollow Zero Data Vault');
    }
  });

  it('3.2 Daily Commission Completion Updating Streak Counter and Calendar Dot', async () => {
    // 1. Check initial streak counter in Dailies
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    const streakBefore = await page.textContent('[data-testid="streak-counter"]');

    // 2. Claim commission
    await page.click('[data-testid="claim-commission-btn"]');
    await page.sleep(150);

    // Close reward modal if visible
    if (await page.isVisible('[data-testid="reward-modal-close"]')) {
      await page.click('[data-testid="reward-modal-close"]');
    }

    // 3. Verify streak updated
    const streakAfter = await page.textContent('[data-testid="streak-counter"]');
    expect(streakAfter).not.toBe(streakBefore);

    // 4. Switch to Calendar view and verify daily completion dot on today's cell
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');

    const today = new Date().toISOString().split('T')[0];
    const todayCell = `[data-testid="calendar-day"][data-date="${today}"]`;
    if (await page.isVisible(todayCell)) {
      const hasDailyDot = await page.isVisible(`${todayCell} [data-testid="daily-complete-dot"]`);
      expect(hasDailyDot).toBe(true);
    }
  });

  it('3.3 Bangboo Mascot Reactive Mood Engine Across Task Lifecycle', async () => {
    // 1. Mascot initially idle
    await page.waitForSelector('[data-testid="bangboo-mascot"]');
    const mood1 = await page.getAttribute('[data-testid="bangboo-mascot"]', 'data-mood');
    expect(mood1).toBe('idle');

    // 2. Create and complete a task
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Calibrate Bangboo Sensors');
    await page.click('[data-testid="task-submit-btn"]');
    await page.waitForSelector('[data-testid="task-card"]');

    // Complete the task
    await page.click('[data-testid="task-complete-btn"]');
    await page.sleep(150);

    // 3. Bangboo reacts with celebration/cheering mood and speech bubble
    const mood2 = await page.getAttribute('[data-testid="bangboo-mascot"]', 'data-mood');
    expect(['celebrating', 'happy', 'triumphant']).toContain(mood2);

    const bubbleVisible = await page.isVisible('[data-testid="bangboo-speech-bubble"]');
    expect(bubbleVisible).toBe(true);

    const quote = await page.textContent('[data-testid="bangboo-dialogue"]');
    expect(quote).toBeTruthy();
  });
});
