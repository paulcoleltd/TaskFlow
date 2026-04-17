import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('shows 4 stat cards', async ({ page }) => {
    const grid = page.locator('main .grid').first();
    const cards = grid.locator('> div');
    await expect(cards).toHaveCount(4);
  });

  test('stat card: Total Tasks shows a number', async ({ page }) => {
    const totalLabel = page.locator('main').getByText('Total Tasks');
    await expect(totalLabel).toBeVisible();
    // The card itself contains a large number
    const card = totalLabel.locator('../..');
    const num = card.locator('p').filter({ hasText: /^\d+$/ }).first();
    await expect(num).toBeVisible();
  });

  test('stat card: In Progress is visible', async ({ page }) => {
    await expect(page.locator('main').getByText('In Progress').first()).toBeVisible();
  });

  test('stat card: Completed is visible', async ({ page }) => {
    // Stat card title specifically
    const cards = page.locator('main .grid').first().locator('> div');
    const completedCard = cards.filter({ hasText: 'Completed' });
    await expect(completedCard.first()).toBeVisible();
  });

  test('My Active Tasks section is visible', async ({ page }) => {
    await expect(page.locator('main').getByText('My Active Tasks')).toBeVisible();
  });

  test('Tasks This Week chart is visible', async ({ page }) => {
    await expect(page.locator('main').getByText('Tasks Created — Last 7 Days')).toBeVisible();
  });

  test('By Status chart is visible', async ({ page }) => {
    await expect(page.locator('main').getByText('By Status')).toBeVisible();
  });

  test('Projects section is visible on dashboard', async ({ page }) => {
    // The right-column Projects heading
    await expect(page.locator('main').getByText('Projects').first()).toBeVisible();
  });

  test('Recharts SVG renders in bar chart', async ({ page }) => {
    const svg = page.locator('main .recharts-wrapper').first();
    await expect(svg).toBeVisible();
  });

  test('sidebar shows seeded project links', async ({ page }) => {
    // Projects listed in sidebar
    await expect(page.locator('aside').getByText('Product Redesign')).toBeVisible();
  });

  test('clicking a task in My Active Tasks opens TaskDetail panel', async ({ page }) => {
    // Click a known seeded task title — more reliable than CSS class matching.
    const taskRow = page.getByText('Design new onboarding flow').first();
    await expect(taskRow).toBeVisible({ timeout: 8000 });
    await taskRow.click();
    await expect(page.locator('[data-panel="task-detail"]')).toBeVisible();
  });
});
