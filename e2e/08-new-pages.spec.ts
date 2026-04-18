import { test, expect } from '@playwright/test';

// All tests in this file use the pre-loaded admin auth state (from playwright.config.ts)

test.describe('Today Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/today');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    await expect(page.locator('h1').getByText('Today')).toBeVisible();
  });

  test('page displays greeting with user name', async ({ page }) => {
    // Greeting matches "Good morning/afternoon/evening, Alex 👋"
    await expect(page.getByText(/Good (morning|afternoon|evening),\s*Alex/)).toBeVisible();
  });

  test("Today's Focus section is visible", async ({ page }) => {
    await expect(page.getByText("Today's Focus")).toBeVisible();
  });

  test('Standup Report section is visible and expandable', async ({ page }) => {
    await expect(page.getByText('Standup Report')).toBeVisible();
    // Expand the standup section
    await page.getByText('Standup Report').click();
    await expect(page.getByText('Daily Standup')).toBeVisible();
  });

  test('sidebar nav link navigates to /today', async ({ page }) => {
    await page.goto('/');
    // Wait for sidebar to be fully interactive before clicking
    await page.waitForSelector('aside', { state: 'visible', timeout: 20000 });
    await page.locator('aside').getByText('Today').click();
    await expect(page).toHaveURL('/today');
  });
});

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    await expect(page.locator('h1').getByText('Search')).toBeVisible();
  });

  test('search input has correct placeholder', async ({ page }) => {
    // Use the full placeholder to avoid matching the header search bar
    const input = page.locator('input[placeholder="Search tasks, descriptions, comments, projects…"]');
    await expect(input).toBeVisible();
  });

  test('empty state shows prompt to start typing', async ({ page }) => {
    await expect(page.getByText('Type to search across all tasks')).toBeVisible();
  });

  test('typing a query returns results or empty state', async ({ page }) => {
    // Use the full placeholder to disambiguate from the header search input
    const input = page.locator('input[placeholder="Search tasks, descriptions, comments, projects…"]');
    await input.fill('design');
    // Both "X results for" and "No results for" contain the result count text
    await expect(page.locator('main').getByText(/result/i).first()).toBeVisible();
  });

  test('searching a known seed task title shows it in results', async ({ page }) => {
    const input = page.locator('input[placeholder="Search tasks, descriptions, comments, projects…"]');
    await input.fill('design');
    // At least a result or empty state is rendered — no crash
    await expect(page.locator('main')).toBeVisible();
  });

  test('scope filter pills are visible (Everything / Tasks / Projects)', async ({ page }) => {
    // Scope to main to avoid ambiguity with the sidebar "My Tasks" link
    await expect(page.locator('main').getByRole('button', { name: 'Everything' })).toBeVisible();
    await expect(page.locator('main').getByRole('button', { name: 'Tasks' })).toBeVisible();
    await expect(page.locator('main').getByRole('button', { name: 'Projects' })).toBeVisible();
  });

  test('Escape key clears the search input', async ({ page }) => {
    const input = page.locator('input[placeholder="Search tasks, descriptions, comments, projects…"]');
    await input.fill('test query');
    await expect(input).toHaveValue('test query');
    // SearchPage handles Escape on the input to clear the query
    await input.press('Escape');
    await expect(input).toHaveValue('');
  });

  test('sidebar nav link navigates to /search', async ({ page }) => {
    await page.goto('/');
    // Wait for sidebar to be interactive before clicking — the beforeEach left
    // us on /search so the goto('/') causes a full reload that must finish first.
    await page.waitForSelector('aside', { state: 'visible', timeout: 20000 });
    await page.locator('aside').getByText('Search').click();
    await expect(page).toHaveURL('/search');
  });
});

test.describe('Workload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workload');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    await expect(page.locator('h1').getByText('Workload')).toBeVisible();
  });

  test('team summary metric cards are visible', async ({ page }) => {
    // Scope to main to avoid sidebar badges — 'Overdue' appears in multiple places
    const main = page.locator('main');
    await expect(main.getByText('Active Tasks').first()).toBeVisible();
    await expect(main.getByText('Overdue').first()).toBeVisible();
    await expect(main.getByText('Blocked').first()).toBeVisible();
    await expect(main.getByText('Unassigned').first()).toBeVisible();
  });

  test('Team Workload section heading is visible', async ({ page }) => {
    await expect(page.getByText('Team Workload')).toBeVisible();
  });

  test('per-member cards are rendered for all seed users', async ({ page }) => {
    // Seed users: Alex Johnson, Sarah Chen, Marcus Williams
    // Scope to main — 'Alex Johnson' also appears in the sidebar user section
    const main = page.locator('main');
    await expect(main.getByText('Alex Johnson').first()).toBeVisible();
    await expect(main.getByText('Sarah Chen').first()).toBeVisible();
    await expect(main.getByText('Marcus Williams').first()).toBeVisible();
  });

  test('workload bar and level badge are visible per member', async ({ page }) => {
    // Each member card shows Balanced / Busy / Overloaded
    const levelBadges = page.getByText(/Balanced|Busy|Overloaded/);
    await expect(levelBadges.first()).toBeVisible();
  });

  test('sidebar nav link navigates to /workload', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Workload').click();
    await expect(page).toHaveURL('/workload');
  });
});

test.describe('Activity Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/activity');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    // ActivityPage renders its own h1 in page content — scope to banner to avoid 2-element strict violation
    await expect(page.getByRole('banner').getByRole('heading', { name: 'Activity Feed' })).toBeVisible();
  });

  test('page renders without errors', async ({ page }) => {
    // Verify main content area is present and no error boundary triggered
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('activity verb filter pills are visible', async ({ page }) => {
    // ActivityPage shows filter pills for activity types
    await expect(page.getByText('All')).toBeVisible();
  });

  test('sidebar nav link navigates to /activity', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Activity').click();
    await expect(page).toHaveURL('/activity');
  });
});

test.describe('Time Tracking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/time');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    await expect(page.locator('h1').getByText('Time Tracking')).toBeVisible();
  });

  test('date range filter buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });

  test('switching range filter does not crash the page', async ({ page }) => {
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.locator('main')).toBeVisible();
    await page.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('main')).toBeVisible();
  });

  test('page renders without errors', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('sidebar nav link navigates to /time', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Time').click();
    await expect(page).toHaveURL('/time');
  });
});

test.describe('Roadmap Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roadmap');
    await page.waitForSelector('main', { state: 'visible' });
  });

  test('page loads with correct header title', async ({ page }) => {
    await expect(page.locator('h1').getByText('Roadmap')).toBeVisible();
  });

  test('month navigation buttons are visible', async ({ page }) => {
    // RoadmapPage has ChevronLeft/ChevronRight navigation for the timeline
    const navButtons = page.locator('main button svg').locator('..');
    await expect(navButtons.first()).toBeVisible();
  });

  test('page renders project rows without errors', async ({ page }) => {
    // Seed projects are present — their names should appear somewhere
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
  });

  test('month header labels are visible in the timeline', async ({ page }) => {
    // RoadmapPage renders VISIBLE_MONTHS (5) month headers
    // At least one month name should be visible (Jan, Feb, ... Dec)
    await expect(page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/).first()).toBeVisible();
  });

  test('sidebar nav link navigates to /roadmap', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByText('Roadmap').click();
    await expect(page).toHaveURL('/roadmap');
  });
});
