/**
 * Spec 11 — AI Subtask Suggestions (Convex mode)
 *
 * Clicks the "Suggest" button in TaskDetail and verifies that subtasks are added.
 * Marked slow because the Claude API call takes a few seconds.
 */
import { test, expect } from '@playwright/test';

test.describe('AI Suggestions (Convex)', () => {
  test.slow(); // extends default timeout × 3

  test('suggest subtasks button adds subtasks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open the first task
    const taskCard = page.locator('[data-testid="task-card"]').first();
    await taskCard.click();

    const panel = page.locator('[data-testid="task-detail"]');
    await expect(panel).toBeVisible();

    // Count existing subtasks
    const initialCount = await panel.locator('[data-testid="subtask-item"]').count();

    // Click "Suggest" button
    const suggestBtn = panel.getByRole('button', { name: /suggest/i });
    await expect(suggestBtn).toBeVisible();
    await suggestBtn.click();

    // Wait for AI to respond and subtasks to appear
    await expect(panel.locator('[data-testid="subtask-item"]')).toHaveCount(
      initialCount + 1,
      { timeout: 30000 }
    );
  });
});
