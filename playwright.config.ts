import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  retries: 1,
  reporter: [
    ['json', { outputFile: 'e2e/results/test-results.json' }],
    ['html', { outputFolder: 'e2e/results/html-report', open: 'never' }],
    ['list'],
  ],
  expect: {
    timeout: 15000,
  },
  use: {
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    // ── Local mode (original 9 specs, no Convex) ────────────────────────────────
    {
      name: 'chromium',
      testMatch: /0[1-9]-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5175',
        storageState: 'e2e/auth-state.json',
      },
    },
    // ── Convex mode (new specs 10–14) ────────────────────────────────────────────
    {
      name: 'chromium-convex',
      testMatch: /1[0-4]-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5176',
        storageState: 'e2e/convex-auth-state.json',
      },
    },
  ],
  webServer: [
    {
      // Force LOCAL mode for the original 9 specs.
      command: 'npm run dev -- --port 5175',
      port: 5175,
      env: { VITE_CONVEX_URL: '' },
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      // Socket.io server for local-mode auth.
      command: 'npm run dev:server',
      port: 3002,
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      // Convex mode server for specs 10–14.
      command: 'npm run dev -- --port 5176',
      port: 5176,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
  outputDir: 'e2e/results/artifacts',
});
