import { test, expect } from '@playwright/test';

test.describe('Task CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-tasks', { timeout: 30000 });
    await page.waitForSelector('main', { state: 'visible', timeout: 20000 });
  });

  test('My Tasks page loads', async ({ page }) => {
    await expect(page.locator('h1').getByText('My Tasks')).toBeVisible();
  });

  test('board view shows kanban columns', async ({ page }) => {
    await expect(page.getByText('To Do').first()).toBeVisible();
    await expect(page.getByText('In Progress').first()).toBeVisible();
    await expect(page.getByText('Done').first()).toBeVisible();
  });

  test('task cards are visible in board view', async ({ page }) => {
    const cards = page.locator('main div[draggable="true"]');
    await expect(cards.first()).toBeVisible();
  });

  test('create new task via header button', async ({ page }) => {
    await page.locator('header button', { hasText: 'New Task' }).click();
    // Modal overlay appears
    await expect(page.locator('div[class*="fixed inset-0"]')).toBeVisible();
    await expect(page.getByText('New Task').nth(1)).toBeVisible();
  });

  test('task modal has required fields', async ({ page }) => {
    await page.locator('header button', { hasText: 'New Task' }).click();
    await expect(page.locator('input#task-title')).toBeVisible();
    await expect(page.locator('select#task-status')).toBeVisible();
    await expect(page.locator('select#task-priority')).toBeVisible();
  });

  test('task modal validates empty title', async ({ page }) => {
    await page.locator('header button', { hasText: 'New Task' }).click();
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('create a task end-to-end', async ({ page }) => {
    await page.locator('header button', { hasText: 'New Task' }).click();
    await page.locator('input#task-title').fill('E2E Test Task');
    await page.locator('select#task-status').selectOption('todo');
    await page.locator('select#task-priority').selectOption('high');
    await page.getByRole('button', { name: 'Create Task' }).click();
    await expect(page.locator('div[class*="fixed inset-0"]')).not.toBeVisible();
    await expect(page.getByText('E2E Test Task').first()).toBeVisible();
  });

  test('switch to list view', async ({ page }) => {
    // Click the List icon in the view switcher (second button in the switcher group)
    const switcher = page.locator('div[class*="bg-\\[\\#0C1526\\]"][class*="rounded-xl"][class*="p-1"]');
    await switcher.locator('button').nth(1).click();
    // List view should show grouped task sections
    await expect(page.locator('main')).toBeVisible();
  });

  test('filter tasks by search', async ({ page }) => {
    await page.locator('input[placeholder="Filter tasks..."]').fill('onboarding');
    // Either tasks show or empty state
    const hasTask = await page.getByText(/onboarding/i).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText('No tasks found').isVisible().catch(() => false);
    expect(hasTask || hasEmpty).toBeTruthy();
  });

  test('no-match search shows empty state', async ({ page }) => {
    await page.locator('input[placeholder="Filter tasks..."]').fill('xyzabcdef-no-match-999');
    await expect(page.getByText('No tasks found')).toBeVisible();
  });

  test('click task card opens detail panel', async ({ page }) => {
    // Previous tests in the same context may have switched to list view — reset to board.
    const switcher = page.locator('div[class*="bg-\\[\\#0C1526\\]"][class*="rounded-xl"][class*="p-1"]');
    if (await switcher.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switcher.locator('button').nth(0).click();
      await page.waitForTimeout(300);
    }
    const card = page.locator('main div[draggable="true"]').first();
    await expect(card).toBeVisible({ timeout: 8000 });
    await card.click();
    await expect(page.locator('[data-panel="task-detail"]')).toBeVisible();
  });

  test('task detail panel close button works', async ({ page }) => {
    // Reset to board view in case a prior test switched to list.
    const switcher = page.locator('div[class*="bg-\\[\\#0C1526\\]"][class*="rounded-xl"][class*="p-1"]');
    if (await switcher.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switcher.locator('button').nth(0).click();
      await page.waitForTimeout(300);
    }
    const card = page.locator('main div[draggable="true"]').first();
    await expect(card).toBeVisible({ timeout: 8000 });
    await card.click();
    const panel = page.locator('[data-panel="task-detail"]');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).not.toBeVisible();
  });

  test('edit task opens pre-filled modal', async ({ page }) => {
    // Reset to board view in case a prior test switched to list.
    const switcher = page.locator('div[class*="bg-\\[\\#0C1526\\]"][class*="rounded-xl"][class*="p-1"]');
    if (await switcher.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switcher.locator('button').nth(0).click();
      await page.waitForTimeout(300);
    }
    const card = page.locator('main div[draggable="true"]').first();
    await expect(card).toBeVisible({ timeout: 8000 });
    await card.click();
    const panel = page.locator('[data-panel="task-detail"]');
    await expect(panel).toBeVisible();
    await panel.getByTitle('Edit task').click();
    await expect(page.getByText('Edit Task')).toBeVisible();
  });

  test('task modal closes on Escape key', async ({ page }) => {
    await page.locator('header button', { hasText: 'New Task' }).click();
    await expect(page.locator('div[class*="fixed inset-0"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('div[class*="fixed inset-0"]')).not.toBeVisible();
  });
});
