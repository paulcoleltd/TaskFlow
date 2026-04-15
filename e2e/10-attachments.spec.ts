/**
 * Spec 10 — File Attachments (Convex mode)
 *
 * Verifies that files can be uploaded to Convex storage via TaskDetail,
 * appear in the attachment list, and can be deleted.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Attachments (Convex)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('upload a file, verify it appears, then delete it', async ({ page }) => {
    // Open the first task in the list
    const taskCard = page.locator('[data-testid="task-card"]').first();
    await taskCard.click();

    // Wait for the task detail panel
    const panel = page.locator('[data-testid="task-detail"]');
    await expect(panel).toBeVisible();

    // Find the file input and upload a small text file
    const fileInput = panel.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'sample.txt');
    await fileInput.setInputFiles(filePath);

    // Wait for the attachment to appear
    const attachment = panel.locator('[data-testid="attachment-item"]').first();
    await expect(attachment).toBeVisible({ timeout: 15000 });
    await expect(attachment).toContainText('sample.txt');

    // Delete the attachment
    const deleteBtn = attachment.locator('[data-testid="attachment-delete"]');
    await deleteBtn.click();

    // Verify it's gone
    await expect(panel.locator('[data-testid="attachment-item"]')).toHaveCount(0, { timeout: 10000 });
  });
});
