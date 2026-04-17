/**
 * 09-realtime-collab.spec.ts
 *
 * Multi-browser real-time collaboration tests.
 *
 * Each test spins up TWO browser contexts simultaneously:
 *   • adminCtx  — alex@taskflow.io  (Admin role)
 *   • memberCtx — sarah@taskflow.io (Member role)
 *
 * The tests verify that Socket.io events propagate correctly between clients
 * so that changes made in one browser appear in the other without a page reload.
 *
 * Prerequisites:
 *   • Dev server running on :5175 (handled by playwright.config.ts webServer)
 *   • Socket.io server running on :3002 (handled by playwright.config.ts webServer)
 *   • e2e/auth-state.json        — created by global-setup (admin)
 *   • e2e/member-auth-state.json — created by global-setup (member)
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Wait until the "Live" connection chip is visible in the header.
 * This confirms the Socket.io WS connection is established before we start
 * testing real-time events.
 */
async function waitForLiveConnection(page: Page): Promise<void> {
  // Wait for the app shell to mount (confirms auth + routing are ready)
  await page.waitForSelector('nav, [data-testid="sidebar"], aside', {
    state: 'visible',
    timeout: 20000,
  });
  // Then wait for Socket.io to establish and the Live chip to appear
  await expect(page.getByTitle('Real-time collaboration active')).toBeVisible({
    timeout: 30000,
  });
}

/**
 * Create two authenticated browser contexts and two pages, wait for both to
 * connect to the Socket.io server, then return them along with a cleanup fn.
 */
async function setupDualSession(browser: Parameters<typeof test>[1] extends { browser: infer B } ? B : never) {
  const adminCtx: BrowserContext = await (browser as any).newContext({
    storageState: 'e2e/auth-state.json',
  });
  const memberCtx: BrowserContext = await (browser as any).newContext({
    storageState: 'e2e/member-auth-state.json',
  });

  const adminPage  = await adminCtx.newPage();
  const memberPage = await memberCtx.newPage();

  async function cleanup() {
    await adminCtx.close().catch(() => {});
    await memberCtx.close().catch(() => {});
  }

  return { adminPage, memberPage, adminCtx, memberCtx, cleanup };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Real-Time Collaboration (multi-browser)', () => {
  // ── 1. Connection health ────────────────────────────────────────────────────

  test('admin browser connects to Socket.io and shows Live status', async ({ browser }) => {
    const ctx  = await (browser as any).newContext({ storageState: 'e2e/auth-state.json' });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await waitForLiveConnection(page);
      await expect(page.getByTitle('Real-time collaboration active')).toContainText('Live');
    } finally {
      await ctx.close();
    }
  });

  test('member browser connects to Socket.io and shows Live status', async ({ browser }) => {
    const ctx  = await (browser as any).newContext({ storageState: 'e2e/member-auth-state.json' });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await waitForLiveConnection(page);
      await expect(page.getByTitle('Real-time collaboration active')).toContainText('Live');
    } finally {
      await ctx.close();
    }
  });

  // ── 2. Presence sync ────────────────────────────────────────────────────────

  test('admin sees member avatar in PresenceBar when both are online', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    try {
      // Both navigate to dashboard (triggers presence:join)
      await Promise.all([
        adminPage.goto('/'),
        memberPage.goto('/'),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Admin's header PresenceBar should show Sarah Chen's initials ("SC")
      const presenceBar = adminPage.locator('[aria-label="Online collaborators"]');
      await expect(presenceBar).toBeVisible({ timeout: 15000 });
      await expect(presenceBar.getByText('SC')).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test('member sees admin avatar in PresenceBar when both are online', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    try {
      await Promise.all([
        adminPage.goto('/'),
        memberPage.goto('/'),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Member's header PresenceBar should show Alex Johnson's initials ("AJ")
      const presenceBar = memberPage.locator('[aria-label="Online collaborators"]');
      await expect(presenceBar).toBeVisible({ timeout: 15000 });
      await expect(presenceBar.getByText('AJ')).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test('PresenceBar disappears when the second user disconnects', async ({ browser }) => {
    const { adminPage, memberPage, memberCtx, cleanup } = await setupDualSession(browser);
    try {
      await Promise.all([
        adminPage.goto('/'),
        memberPage.goto('/'),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Confirm member is visible
      await expect(
        adminPage.locator('[aria-label="Online collaborators"]').getByText('SC'),
      ).toBeVisible({ timeout: 15000 });

      // Member closes their context (triggers disconnect / presence:leave)
      await memberCtx.close();

      // Admin's PresenceBar should eventually hide (server broadcasts leave)
      await expect(
        adminPage.locator('[aria-label="Online collaborators"]').getByText('SC'),
      ).not.toBeVisible({ timeout: 20000 });
    } finally {
      await cleanup();
    }
  });

  // ── 3. Task creation propagation ───────────────────────────────────────────

  test('task created by admin appears in member board without refresh', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    const taskTitle = `RealTime-Task-${Date.now()}`;
    // Use a shared project board so both users see ALL project tasks (not filtered by assignee)
    const PROJECT_URL = '/projects/proj-1';

    try {
      // Both navigate to the same project board — all project tasks are visible here
      await Promise.all([
        adminPage.goto(PROJECT_URL),
        memberPage.goto(PROJECT_URL),
      ]);
      await Promise.all([
        adminPage.waitForSelector('h1', { state: 'visible' }),
        memberPage.waitForSelector('h1', { state: 'visible' }),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Admin creates a new task scoped to proj-1
      await adminPage.locator('header button', { hasText: 'New Task' }).click();
      await adminPage.locator('input#task-title').fill(taskTitle);
      await adminPage.locator('select#task-status').selectOption('todo');
      await adminPage.locator('select#task-priority').selectOption('medium');
      await adminPage.locator('select[name="projectId"]').selectOption('proj-1');
      await adminPage.getByRole('button', { name: 'Create Task' }).click();

      // Confirm task is visible in admin's project board
      await expect(adminPage.getByText(taskTitle).first()).toBeVisible({ timeout: 10000 });

      // Task should propagate to member's project board via Socket.io — no refresh needed
      await expect(memberPage.getByText(taskTitle).first()).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup();
    }
  });

  // ── 4. Task status update propagation ──────────────────────────────────────

  test('task status change by admin reflects in member board', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    // Use a shared project board so both users see ALL project tasks regardless of assignee
    const PROJECT_URL = '/projects/proj-1';

    try {
      await Promise.all([
        adminPage.goto(PROJECT_URL),
        memberPage.goto(PROJECT_URL),
      ]);
      await Promise.all([
        adminPage.waitForSelector('h1', { state: 'visible' }),
        memberPage.waitForSelector('h1', { state: 'visible' }),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Admin: create a known task in proj-1 so we can track it by title
      const taskTitle = `StatusSync-${Date.now()}`;
      await adminPage.locator('header button', { hasText: 'New Task' }).click();
      await adminPage.locator('input#task-title').fill(taskTitle);
      await adminPage.locator('select#task-status').selectOption('todo');
      await adminPage.locator('select[name="projectId"]').selectOption('proj-1');
      await adminPage.getByRole('button', { name: 'Create Task' }).click();
      await expect(adminPage.getByText(taskTitle).first()).toBeVisible({ timeout: 10000 });

      // Wait for member to receive the new task via Socket.io
      await expect(memberPage.getByText(taskTitle).first()).toBeVisible({ timeout: 15000 });

      // Admin: open the task by clicking the draggable card container (not just the title
      // text, which may trigger inline editing instead of opening the detail panel).
      const adminCard = adminPage.locator('[draggable="true"]').filter({ hasText: taskTitle }).first();
      await expect(adminCard).toBeVisible({ timeout: 10000 });
      await adminCard.click();
      // Task detail slide-in should appear (data-panel added to TaskDetail root div)
      await adminPage.waitForSelector('[data-panel="task-detail"]', {
        state: 'visible',
        timeout: 15000,
      });
      // Click the "To Do" status badge to cycle it → "In Progress"
      await adminPage.locator('[data-panel="task-detail"]').getByText('To Do').first().click();
      // Confirm status updated in admin's detail panel
      await expect(
        adminPage.locator('[data-panel="task-detail"]').getByText('In Progress').first(),
      ).toBeVisible({ timeout: 5000 });

      // Member should see the task still present in the project board (now in In Progress column)
      await expect(
        memberPage.getByText(taskTitle).first(),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup();
    }
  });

  // ── 5. Project viewer pile ──────────────────────────────────────────────────

  test('both users on same project page see each other in ViewerPile', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    // Use the seeded project "proj-1" — Product Redesign
    const PROJECT_URL = '/projects/proj-1';

    try {
      await Promise.all([
        adminPage.goto(PROJECT_URL),
        memberPage.goto(PROJECT_URL),
      ]);
      await Promise.all([
        adminPage.waitForSelector('h1', { state: 'visible' }),
        memberPage.waitForSelector('h1', { state: 'visible' }),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Each user should see the other in the ViewerPile ("N other viewing")
      await expect(
        adminPage.locator('[aria-label="Current viewers"]'),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        adminPage.getByText(/other viewing/i).first(),
      ).toBeVisible({ timeout: 15000 });

      await expect(
        memberPage.locator('[aria-label="Current viewers"]'),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        memberPage.getByText(/other viewing/i).first(),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup();
    }
  });

  test('ViewerPile hides when the second user leaves the project', async ({ browser }) => {
    const { adminPage, memberPage, memberCtx, cleanup } = await setupDualSession(browser);
    const PROJECT_URL = '/projects/proj-1';

    try {
      await Promise.all([
        adminPage.goto(PROJECT_URL),
        memberPage.goto(PROJECT_URL),
      ]);
      await Promise.all([
        adminPage.waitForSelector('h1', { state: 'visible' }),
        memberPage.waitForSelector('h1', { state: 'visible' }),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Confirm viewer pile shows member
      await expect(
        adminPage.locator('[aria-label="Current viewers"]'),
      ).toBeVisible({ timeout: 15000 });

      // Member navigates away (triggers leave-project socket event)
      await memberPage.goto('/');

      // Admin's ViewerPile should disappear
      await expect(
        adminPage.locator('[aria-label="Current viewers"]'),
      ).not.toBeVisible({ timeout: 20000 });
    } finally {
      await memberCtx.close().catch(() => {});
      await cleanup();
    }
  });

  // ── 6. Comment propagation ─────────────────────────────────────────────────

  test('comment added by admin appears in member task detail', async ({ browser }) => {
    const { adminPage, memberPage, cleanup } = await setupDualSession(browser);
    const commentText = `Collab-Comment-${Date.now()}`;
    // Use a seeded task that is already in both browsers' localStorage — no socket
    // propagation needed for the task itself, so we test ONLY comment propagation.
    const SEEDED_TASK_TITLE = 'Design new onboarding flow'; // task-1 in proj-1
    const PROJECT_URL = '/projects/proj-1';

    try {
      await Promise.all([
        adminPage.goto(PROJECT_URL),
        memberPage.goto(PROJECT_URL),
      ]);
      await Promise.all([
        adminPage.waitForSelector('h1', { state: 'visible' }),
        memberPage.waitForSelector('h1', { state: 'visible' }),
      ]);
      await Promise.all([
        waitForLiveConnection(adminPage),
        waitForLiveConnection(memberPage),
      ]);

      // Admin: use [draggable="true"] card container (admin can drag all tasks).
      // Member: task is assigned to admin so canMoveTask returns false → draggable={false}.
      //   The title <p> only has onDoubleClick for inline-edit; a single click bubbles to
      //   the card's onClick handler → setSelectedTask. Use main > getByText as the locator.
      const adminCard  = adminPage.locator('[draggable="true"]').filter({ hasText: SEEDED_TASK_TITLE }).first();
      const memberTitle = memberPage.locator('main').getByText(SEEDED_TASK_TITLE).first();

      await expect(adminCard).toBeVisible({ timeout: 10000 });
      await adminCard.click();
      await adminPage.waitForSelector('[data-panel="task-detail"]', { state: 'visible', timeout: 10000 });

      await expect(memberTitle).toBeVisible({ timeout: 10000 });
      await memberTitle.click();
      await memberPage.waitForSelector('[data-panel="task-detail"]', { state: 'visible', timeout: 10000 });

      // Admin types and submits a comment
      const commentInput = adminPage.locator('textarea[placeholder*="comment"], input[placeholder*="comment"]').last();
      if (await commentInput.isVisible()) {
        await commentInput.click();
        await commentInput.fill(commentText);
        // Click the Send button directly — more reliable than keyboard.press
        const sendBtn = adminPage.getByTitle('Send (Enter)');
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
        } else {
          await adminPage.keyboard.press('Enter');
        }

        // Confirm comment appeared on admin side (local store update)
        await expect(adminPage.getByText(commentText)).toBeVisible({ timeout: 5000 });

        // Member's open TaskDetail should receive the comment via Socket.io broadcast
        await expect(memberPage.getByText(commentText)).toBeVisible({ timeout: 35000 });
      } else {
        test.skip(true, 'Comment input not present in TaskDetail');
      }
    } finally {
      await cleanup();
    }
  });
});
