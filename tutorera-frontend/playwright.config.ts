import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';

export default defineConfig({
  // Keep legacy feature suites and the newer validation suites in one run.
  // A narrow testDir previously silently excluded ./e2e from `npm run test:e2e`.
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/e2e/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3100',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, NEXT_DIST_DIR: '.next-e2e' },
  },
});
