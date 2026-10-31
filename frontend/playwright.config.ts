import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    channel: 'chrome',
  },
  projects: [
    {
      name: 'Mobile-360',
      use: {
        viewport: { width: 360, height: 800 },
        channel: 'chrome',
      },
    },
    {
      name: 'Desktop-1280',
      use: {
        viewport: { width: 1280, height: 900 },
        channel: 'chrome',
      },
    },
  ],
});
