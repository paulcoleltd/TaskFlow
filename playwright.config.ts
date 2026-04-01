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
    baseURL: 'http://localhost:5175',
    storageState: 'e2e/auth-state.json',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5175',
      port: 5175,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      // Auth (POST /api/auth/login) and WebSocket now require the server to be up.
      command: 'npm run dev:server',
      port: 3002,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
  outputDir: 'e2e/results/artifacts',
});
