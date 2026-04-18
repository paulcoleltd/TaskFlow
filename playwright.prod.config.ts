import { defineConfig } from '@playwright/test';

/**
 * Minimal config for production smoke tests only.
 * Run with: npx playwright test --config playwright.prod.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /prod-smoke\.spec\.ts/,
  timeout: 60000,
  retries: 1,
  workers: 3,
  reporter: 'list',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
