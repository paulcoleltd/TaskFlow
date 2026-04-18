/**
 * e2e/15-new-features.spec.ts
 *
 * Tests for features shipped in the security + admin feature session:
 *
 * A. Security — login page credential handling
 *    A1. Demo panel hidden in production (simulated: we verify no password text is rendered)
 *    A2. Demo panel shown in dev builds with "Click to fill" label (never shows password)
 *
 * B. Project creation — admin flow
 *    B1. "New Project" button visible in sidebar for admin
 *    B2. "New Project" button visible on All Projects page for admin
 *    B3. New Project modal opens and has required fields
 *    B4. Admin can create a project end-to-end
 *
 * C. User management — admin flow (Settings page)
 *    C1. Settings → Team Members section renders existing users
 *    C2. "Add Member" button is visible for admin
 *    C3. InviteUserModal opens with expected fields
 *    C4. Form validates required fields (name, email)
 *    C5. Admin can add a new team member end-to-end
 *    C6. Newly added user appears in the team list
 *    C7. Remove button visible on non-self members (admin only)
 *    C8. Newly added user appears in task assignee dropdown
 */
import { test, expect } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Wait for main content to be visible (used in beforeEach). */
async function waitForMain(page: import('@playwright/test').Page, path = '/') {
  await page.goto(path, { timeout: 30000 });
  // Give the page up to 30 s to render; on slow CI the 20 s budget was too tight.
  await page.waitForSelector('main', { state: 'visible', timeout: 30000 });
}

// ═════════════════════════════════════════════════════════════════════════════
// A. Security — login page
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Security — Login Page Credential Handling', () => {
  test('login page loads and shows sign-in form', async ({ page }) => {
    await page.goto('/login', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('plaintext password strings are NOT rendered in the login page DOM', async ({ page }) => {
    await page.goto('/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    const pageText = await page.locator('body').innerText();

    // The three known demo passwords must never appear as visible text
    expect(pageText).not.toContain('Admin1234!');
    expect(pageText).not.toContain('Member1234!');
    expect(pageText).not.toContain('Viewer1234!');
  });

  test('demo account buttons show "Click to fill" not the password', async ({ page }) => {
    await page.goto('/login', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    // In dev mode the demo panel should be present; each card shows "Click to fill"
    const demoSection = page.getByText('Demo accounts');
    const hasDemoPanel = await demoSection.isVisible().catch(() => false);

    if (hasDemoPanel) {
      // Password strings must not be in the visible button text
      const buttons = page.locator('button').filter({ hasText: /@taskflow\.io/ });
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const btnText = await buttons.nth(i).innerText();
        expect(btnText).not.toMatch(/Admin1234!|Member1234!|Viewer1234!/);
        expect(btnText).toContain('Click to fill');
      }
    }
    // If the panel is absent (production build) — pass silently; passwords are simply gone
  });

  test('demo button fills email and password fields without exposing password in UI', async ({ page }) => {
    await page.goto('/login', { timeout: 30000 });
    const demoSection = page.getByText('Demo accounts');
    const hasDemoPanel = await demoSection.isVisible().catch(() => false);
    if (!hasDemoPanel) return; // production build — skip

    // Click the first demo account button (Alex / Admin)
    const firstBtn = page.locator('button').filter({ hasText: 'alex@taskflow.io' }).first();
    await expect(firstBtn).toBeVisible();
    await firstBtn.click();

    // Email field should be filled
    await expect(page.locator('input[type="email"]')).toHaveValue('alex@taskflow.io');

    // Password field should be filled (hidden input — value present but not visible text)
    const pwInput = page.locator('input[type="password"]');
    const pwValue = await pwInput.inputValue();
    expect(pwValue.length).toBeGreaterThan(0); // has a value

    // But the password is never rendered as visible text anywhere in the DOM
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain(pwValue);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B. Project creation — admin flow
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Admin — Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForMain(page, '/');
  });

  test('sidebar shows "+ New Project" button for admin', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    // Admin (alex) sees the New Project shortcut in the sidebar
    await expect(sidebar.getByRole('button', { name: /new project/i })).toBeVisible({ timeout: 8000 });
  });

  test('All Projects page shows "New Project" button for admin', async ({ page }) => {
    await waitForMain(page, '/projects');
    await expect(page.locator('button', { hasText: 'New Project' })).toBeVisible({ timeout: 8000 });
  });

  test('New Project modal opens with required fields', async ({ page }) => {
    await waitForMain(page, '/projects');
    await page.locator('button', { hasText: 'New Project' }).first().click();

    // Modal should appear
    await expect(page.getByText('New Project').nth(1)).toBeVisible({ timeout: 8000 });
    await expect(page.getByPlaceholder(/Q3 Product Launch/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('admin can create a new project end-to-end', async ({ page }) => {
    await waitForMain(page, '/projects');

    const projectName = `E2E-Project-${Date.now()}`;

    // Open modal
    await page.locator('button', { hasText: 'New Project' }).first().click();
    await expect(page.getByPlaceholder(/Q3 Product Launch/i)).toBeVisible({ timeout: 8000 });

    // Fill the form
    await page.getByPlaceholder(/Q3 Product Launch/i).fill(projectName);

    // Submit
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Modal should close
    await expect(page.getByRole('button', { name: 'Create Project' })).not.toBeVisible({ timeout: 8000 });

    // New project card should be visible on the All Projects page
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 10000 });
  });

  test('New Project modal validates empty name', async ({ page }) => {
    await waitForMain(page, '/projects');
    await page.locator('button', { hasText: 'New Project' }).first().click();
    await expect(page.getByRole('button', { name: 'Create Project' })).toBeVisible({ timeout: 8000 });

    // Submit without filling name
    await page.getByRole('button', { name: 'Create Project' }).click();
    // Validation error should appear
    await expect(page.getByText(/name is required/i)).toBeVisible({ timeout: 5000 });
  });

  test('New Project modal can be cancelled', async ({ page }) => {
    await waitForMain(page, '/projects');
    await page.locator('button', { hasText: 'New Project' }).first().click();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Create Project' })).not.toBeVisible({ timeout: 5000 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C. User management — admin flow
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Admin — User Management (Settings)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForMain(page, '/settings');
  });

  test('Settings page loads', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /settings/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Team Members section is visible', async ({ page }) => {
    await expect(page.getByText('Team Members')).toBeVisible({ timeout: 8000 });
  });

  test('seeded users are listed in Team Members', async ({ page }) => {
    // Scope to the Team Members section (inside main) to avoid strict-mode violations
    const teamSection = page.locator('main');
    await expect(teamSection.getByText('Alex Johnson').first()).toBeVisible({ timeout: 8000 });
    await expect(teamSection.getByText('Sarah Chen').first()).toBeVisible();
    await expect(teamSection.getByText('Marcus Williams').first()).toBeVisible();
  });

  test('member count label is visible', async ({ page }) => {
    await expect(page.getByText(/\d+ members?/).first()).toBeVisible({ timeout: 8000 });
  });

  test('"Add Member" button is visible for admin', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add member/i })).toBeVisible({ timeout: 8000 });
  });

  test('InviteUserModal opens when Add Member clicked', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();

    // Modal title
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    // Required form fields
    await expect(page.getByPlaceholder(/jamie rivera/i)).toBeVisible();
    await expect(page.getByPlaceholder(/jamie@company\.com/i)).toBeVisible();

    // Role selector buttons
    await expect(page.getByRole('button', { name: /^admin$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^member$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^viewer$/i })).toBeVisible();

    // Colour palette
    await expect(page.getByRole('button', { name: /add member/i }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('InviteUserModal validates empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    // Submit without filling anything
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /add member/i });
    await submitBtn.click();

    // Both name and email errors should appear
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('InviteUserModal validates email format', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder(/jamie rivera/i).fill('Test User');
    await page.getByPlaceholder(/jamie@company\.com/i).fill('not-an-email');

    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /add member/i });
    await submitBtn.click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('modal shows live preview when name is typed', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder(/jamie rivera/i).fill('Preview User');

    // Preview section should appear with the name
    await expect(page.getByText('Preview User')).toBeVisible({ timeout: 5000 });
  });

  test('admin can add a new team member end-to-end', async ({ page }) => {
    const userName  = `E2E User ${Date.now()}`;
    const userEmail = `e2e-${Date.now()}@test.io`;

    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    // Fill form
    await page.getByPlaceholder(/jamie rivera/i).fill(userName);
    await page.getByPlaceholder(/jamie@company\.com/i).fill(userEmail);

    // Change role to viewer for variety
    await page.getByRole('button', { name: /^viewer$/i }).click();

    // Submit
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /add member/i });
    await submitBtn.click();

    // Modal closes
    await expect(page.getByText('Add Team Member')).not.toBeVisible({ timeout: 8000 });

    // Success toast
    await expect(page.getByText(new RegExp(`${userName}.*added`, 'i'))).toBeVisible({ timeout: 8000 });
  });

  test('newly added member appears in team list', async ({ page }) => {
    const userName  = `E2E-Listed-${Date.now()}`;
    const userEmail = `listed-${Date.now()}@test.io`;

    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder(/jamie rivera/i).fill(userName);
    await page.getByPlaceholder(/jamie@company\.com/i).fill(userEmail);

    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /add member/i });
    await submitBtn.click();

    // Wait for modal to close
    await expect(page.getByText('Add Team Member')).not.toBeVisible({ timeout: 8000 });

    // User should now appear in the team list
    await expect(page.getByText(userName).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(userEmail).first()).toBeVisible();
  });

  test('remove (UserMinus) button visible on non-self members', async ({ page }) => {
    // Wait for the team list to fully render (Zustand hydration may be async)
    await expect(page.getByText('Team Members')).toBeVisible({ timeout: 8000 });
    // Sarah Chen and Marcus Williams should both have Remove buttons
    await expect(page.locator('[title="Remove Sarah Chen"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[title="Remove Marcus Williams"]')).toBeVisible({ timeout: 8000 });
  });

  test('member count increments after adding a user', async ({ page }) => {
    // Get initial count text
    const countEl = page.getByText(/\d+ members?/).first();
    await expect(countEl).toBeVisible({ timeout: 8000 });
    const initialText = await countEl.innerText();
    const initialCount = parseInt(initialText.match(/\d+/)?.[0] ?? '0');

    // Add a user
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/jamie rivera/i).fill('Count Test User');
    await page.getByPlaceholder(/jamie@company\.com/i).fill(`count-${Date.now()}@test.io`);
    await page.locator('button[type="submit"]').filter({ hasText: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).not.toBeVisible({ timeout: 8000 });

    // Count should have incremented
    await expect(page.getByText(new RegExp(`${initialCount + 1} members?`))).toBeVisible({ timeout: 8000 });
  });

  test('duplicate email is rejected', async ({ page }) => {
    // Wait for seeded users to appear (ensures Zustand hydration is complete)
    await expect(page.locator('main').getByText('Alex Johnson').first()).toBeVisible({ timeout: 10000 });

    // Try to add a user with an email that already exists (Alex's email)
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder(/jamie rivera/i).fill('Duplicate Alex');
    await page.getByPlaceholder(/jamie@company\.com/i).fill('alex@taskflow.io');

    await page.locator('button[type="submit"]').filter({ hasText: /add member/i }).click();

    // Should show duplicate error toast
    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 10000 });

    // Modal stays open
    await expect(page.getByText('Add Team Member')).toBeVisible();
  });

  test('Cancel button closes the modal without saving', async ({ page }) => {
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });

    await page.getByPlaceholder(/jamie rivera/i).fill('Unsaved User');
    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByText('Add Team Member')).not.toBeVisible({ timeout: 5000 });
    // User should NOT be in the list
    await expect(page.getByText('Unsaved User')).not.toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D. Cross-feature — new user appears in task assignee dropdown
// ═════════════════════════════════════════════════════════════════════════════

test.describe('New User Propagation — Assignee Dropdown', () => {
  test('user added in Settings appears in New Task assignee dropdown', async ({ page }) => {
    const userName  = `Assignee Test ${Date.now()}`;
    const userEmail = `assignee-${Date.now()}@test.io`;

    // Step 1: Add the user in Settings
    await waitForMain(page, '/settings');
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/jamie rivera/i).fill(userName);
    await page.getByPlaceholder(/jamie@company\.com/i).fill(userEmail);
    await page.locator('button[type="submit"]').filter({ hasText: /add member/i }).click();
    await expect(page.getByText('Add Team Member')).not.toBeVisible({ timeout: 8000 });

    // Step 2: Navigate to My Tasks and open New Task modal
    await waitForMain(page, '/my-tasks');
    await page.locator('header button', { hasText: 'New Task' }).click();

    // Wait for modal overlay
    await expect(page.locator('div[class*="fixed inset-0"]')).toBeVisible({ timeout: 8000 });

    // The assignee <select> has name="assigneeId" (from RHF register)
    // Native <option> elements are read via allInnerTexts() since they are not "visible" until select opens
    const assigneeSelect = page.locator('select[name="assigneeId"]');
    await expect(assigneeSelect).toBeVisible({ timeout: 8000 });

    const optionTexts = await assigneeSelect.locator('option').allInnerTexts();
    expect(optionTexts.some(t => t.includes(userName))).toBeTruthy();
  });
});
