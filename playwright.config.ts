import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  reporter: [
    ['json', { outputFile: 'e2e/results/test-results.json' }],
    ['html', { outputFolder: 'e2e/results/html-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5175',
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
  webServer: {
    command: 'npm run dev -- --port 5175',
    port: 5175,
    reuseExistingServer: true,
    timeout: 30000,
  },
  outputDir: 'e2e/results/artifacts',
});
