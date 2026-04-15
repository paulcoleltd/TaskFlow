/**
 * Spec 13 — Public Project Sharing (Convex mode)
 *
 * Enables sharing on a project, reads the share URL from the clipboard,
 * and opens it in an unauthenticated context to verify public visibility.
 */
import { test, expect } from '@playwright/test';

test.describe('Public Project Sharing (Convex)', () => {
  test('enable sharing and view project publicly', async ({ page, browser }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Open the first project
    const projectCard = page.locator('[data-testid="project-card"]').first();
    await projectCard.click();
    await page.waitForLoadState('networkidle');

    // Grant clipboard permissions and click the share (Link2) button
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const shareBtn = page.locator('button[title="Copy share link"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Read the share URL from clipboard
    const shareUrl: string = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toMatch(/\/share\//);

    // Open the share URL in a fresh unauthenticated context
    const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anonPage = await anonContext.newPage();
    await anonPage.goto(shareUrl);
    await anonPage.waitForLoadState('networkidle');

    // Verify the public page renders without auth redirect
    await expect(anonPage.locator('h1')).toBeVisible();
    await expect(anonPage).not.toHaveURL(/\/login/);

    await anonContext.close();
  });
});
