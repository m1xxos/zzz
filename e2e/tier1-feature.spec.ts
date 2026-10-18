/**
 * Tier 1: Core Feature Coverage (Happy Path)
 * Features Tested: F01-F05 (Task CRUD), F10 (Dailies), F14-F17 (Calendar), F24-F25 (Audio), F26-F29 (Bangboo)
 */
import { describe, it, expect, page, beforeEach } from './harness.mjs';

describe('Tier 1: Core Feature Coverage', () => {
  beforeEach(async () => {
    // Reset state before each test
    await page.clearLocalStorage();
    await page.reload();
    await page.waitForSelector('[data-testid="tab-nav"]');
  });

  it('1.1 Task CRUD Lifecycle (Create, Read, Update, Complete, Delete)', async () => {
    // Navigate to tasks tab
    await page.click('[data-testid="tab-tasks"]');
    await page.waitForSelector('[data-testid="tasks-view"]');

    // 1. Create Task
    await page.click('[data-testid="create-task-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Eliminate Ethereal Swarm in Hollow Zero');
    await page.fill('[data-testid="task-desc-input"]', 'Clear Section 7 of the Outer Ring hollow before corruption level 4.');
    await page.select('[data-testid="task-priority-select"]', 'S');
    await page.fill('[data-testid="task-category-input"]', 'Combat');
    await page.fill('[data-testid="task-due-date-input"]', '2026-10-25');
    await page.click('[data-testid="task-submit-btn"]');

    // 2. Read Task
    await page.waitForSelector('[data-testid="task-card"]');
    const taskTitle = await page.textContent('[data-testid="task-title"]');
    expect(taskTitle).toContain('Eliminate Ethereal Swarm');

    const priorityBadge = await page.textContent('[data-testid="task-priority-badge"]');
    expect(priorityBadge).toContain('S');

    // 3. Update Task
    await page.click('[data-testid="task-edit-btn"]');
    await page.waitForSelector('[data-testid="task-modal"]');
    await page.fill('[data-testid="task-title-input"]', 'Eliminate Greater Ethereal Swarm in Hollow Zero [UPDATED]');
    await page.click('[data-testid="task-submit-btn"]');

    await page.sleep(100);
    const updatedTitle = await page.textContent('[data-testid="task-title"]');
    expect(updatedTitle).toContain('[UPDATED]');

    // 4. Complete Task Toggle
    await page.click('[data-testid="task-complete-btn"]');
    await page.sleep(150);
    const isCompleted = await page.getAttribute('[data-testid="task-card"]', 'data-completed');
    expect(isCompleted).toBe('true');

    // 5. Delete Task
    await page.click('[data-testid="task-delete-btn"]');
    await page.sleep(150);
    const cardExists = await page.isVisible('[data-testid="task-card"]');
    expect(cardExists).toBe(false);
  });

  it('1.2 Dailies Check-In & Commission Claim', async () => {
    // Navigate to dailies tab
    await page.click('[data-testid="tab-dailies"]');
    await page.waitForSelector('[data-testid="dailies-view"]');

    // Verify initial streak and commission card
    await page.waitForSelector('[data-testid="commission-card"]');
    const statusBefore = await page.textContent('[data-testid="commission-status"]');
    expect(statusBefore).toContain('PENDING');

    // Claim daily commission
    await page.click('[data-testid="claim-commission-btn"]');
    await page.sleep(150);

    // Verify reward modal popup
    const rewardModalVisible = await page.isVisible('[data-testid="reward-modal"]');
    expect(rewardModalVisible).toBe(true);

    // Close reward modal if close button is present
    const hasClose = await page.isVisible('[data-testid="reward-modal-close"]');
    if (hasClose) {
      await page.click('[data-testid="reward-modal-close"]');
    }

    // Verify commission status updated to COMPLETED
    const statusAfter = await page.textContent('[data-testid="commission-status"]');
    expect(statusAfter).toContain('COMPLETED');
  });

  it('1.3 Calendar Date Navigation and Inspection', async () => {
    // Switch to calendar tab
    await page.click('[data-testid="tab-calendar"]');
    await page.waitForSelector('[data-testid="calendar-view"]');

    // Verify month header renders
    const monthHeader = await page.textContent('[data-testid="cal-month-header"]');
    expect(monthHeader).toBeTruthy();

    // Navigate to next month
    await page.click('[data-testid="cal-next-month"]');
    await page.sleep(100);
    const nextMonthHeader = await page.textContent('[data-testid="cal-month-header"]');
    expect(nextMonthHeader).not.toBe(monthHeader);

    // Jump back to today
    await page.click('[data-testid="cal-today-btn"]');
    await page.sleep(100);
    const restoredHeader = await page.textContent('[data-testid="cal-month-header"]');
    expect(restoredHeader).toBe(monthHeader);

    // Select today's date cell
    const today = new Date().toISOString().split('T')[0];
    const todayCell = `[data-testid="calendar-day"][data-date="${today}"]`;
    if (await page.isVisible(todayCell)) {
      await page.click(todayCell);
      await page.waitForSelector('[data-testid="date-drawer"]');
      const drawerVisible = await page.isVisible('[data-testid="date-drawer"]');
      expect(drawerVisible).toBe(true);
    }
  });

  it('1.4 Audio Mute Toggle and State Persistence', async () => {
    // Locate global audio mute button
    await page.waitForSelector('[data-testid="audio-toggle"]');
    const initialMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');

    // Click mute toggle
    await page.click('[data-testid="audio-toggle"]');
    await page.sleep(100);

    // Verify attribute toggled
    const newMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(newMuted).not.toBe(initialMuted);

    // Verify persistence across reload
    await page.reload();
    await page.waitForSelector('[data-testid="audio-toggle"]');
    const persistedMuted = await page.getAttribute('[data-testid="audio-toggle"]', 'data-muted');
    expect(persistedMuted).toBe(newMuted);
  });

  it('1.5 Bangboo Mascot Rendering & Interactive Poke', async () => {
    // Verify mascot presence and initial idle mood
    await page.waitForSelector('[data-testid="bangboo-mascot"]');
    const initialMood = await page.getAttribute('[data-testid="bangboo-mascot"]', 'data-mood');
    expect(initialMood).toBe('idle');

    // Verify SVG avatar is rendered
    const svgVisible = await page.isVisible('[data-testid="bangboo-svg"]');
    expect(svgVisible).toBe(true);

    // Poke / Click the Bangboo mascot
    await page.click('[data-testid="bangboo-mascot"]');
    await page.sleep(150);

    // Verify mood changes to cheerful or happy state
    const reactedMood = await page.getAttribute('[data-testid="bangboo-mascot"]', 'data-mood');
    expect(['happy', 'celebrating', 'triumphant', 'surprised']).toContain(reactedMood);

    // Verify speech bubble displays dialect and translation
    const bubbleVisible = await page.isVisible('[data-testid="bangboo-speech-bubble"]');
    expect(bubbleVisible).toBe(true);

    const dialectText = await page.textContent('[data-testid="bangboo-dialogue"]');
    expect(dialectText).toBeTruthy();
    expect(dialectText.length).toBeGreaterThan(0);
  });
});
