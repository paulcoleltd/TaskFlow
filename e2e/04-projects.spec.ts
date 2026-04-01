import { test, expect } from '@playwright/test';

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('All Projects page loads', async ({ page }) => {
    await expect(page.locator('h1').getByText('All Projects')).toBeVisible();
  });

  test('shows seeded projects in grid', async ({ page }) => {
    // Project cards are in the grid
    const cards = page.locator('main .grid > div');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('project names are visible', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Product Redesign' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Bug Backlog' })).toBeVisible();
  });

  test('project cards have progress bars', async ({ page }) => {
    const progressBars = page.locator('div[class*="rounded-full"][class*="overflow-hidden"]');
    await expect(progressBars.first()).toBeVisible();
  });

  test('filter tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'all' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'completed' })).toBeVisible();
  });

  test('New Project button opens modal', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'New Project' }).click();
    await expect(page.getByText('New Project').nth(1)).toBeVisible();
    await expect(page.locator('input[placeholder*="Launch"]')).toBeVisible();
  });

  test('create a new project', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'New Project' }).click();
    await page.locator('input[placeholder*="Launch"]').fill('E2E Test Project');
    await page.locator('textarea').fill('Created by E2E test');
    await page.getByRole('button', { name: 'Create Project' }).click();
    await expect(page.locator('h3', { hasText: 'E2E Test Project' })).toBeVisible();
  });

  test('click project card navigates to project detail', async ({ page }) => {
    await page.locator('h3', { hasText: 'Product Redesign' }).click();
    await expect(page).toHaveURL(/\/projects\/proj-1/);
  });

  test('project detail shows stats grid', async ({ page }) => {
    await page.locator('h3', { hasText: 'Product Redesign' }).click();
    await page.waitForURL(/\/projects\//);
    await page.waitForSelector('main', { state: 'visible' });
    await expect(page.getByText('Total').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Members').first()).toBeVisible({ timeout: 15000 });
  });

  test('project detail shows task board', async ({ page }) => {
    await page.locator('h3', { hasText: 'Engineering Sprint Q2' }).click();
    await page.waitForURL(/\/projects\//);
    await page.waitForSelector('main', { state: 'visible' });
    await expect(page.getByText('To Do').first()).toBeVisible({ timeout: 15000 });
  });

  test('project detail has Add Task button', async ({ page }) => {
    await page.locator('h3', { hasText: 'Product Redesign' }).click();
    await page.waitForURL(/\/projects\//);
    await page.waitForSelector('main', { state: 'visible' });
    await expect(page.getByRole('button', { name: 'Add Task', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('back to All Projects link works', async ({ page }) => {
    await page.locator('h3', { hasText: 'Product Redesign' }).click();
    // Back button in main content (not sidebar)
    await page.locator('main button', { hasText: 'All Projects' }).click();
    await expect(page).toHaveURL('/projects');
  });

  test('completed filter shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'completed' }).click();
    await expect(page.getByText('No projects')).toBeVisible();
  });
});
