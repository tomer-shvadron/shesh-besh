import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Non-desktop viewports run a focused subset — the responsive/settings-
    // behaviour specs — so we don't force every older spec to know about every
    // viewport. Desktop (chromium) continues to run the full suite.
    {
      name: 'mobile-portrait',
      use: { ...devices['Pixel 5'] },
      testMatch: /(responsive|settings-behavior|app-loads)\.spec\.ts/,
    },
    {
      name: 'mobile-landscape',
      // Avoid Pixel 5 landscape's unusually short 293px height — use a more
      // common phone-landscape viewport running on Chromium.
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 812, height: 375 },
        hasTouch: true,
        isMobile: false,
      },
      testMatch: /(responsive|settings-behavior|app-loads)\.spec\.ts/,
    },
    {
      name: 'tablet',
      // Use iPad Pro 11's viewport but force the Chromium engine so we don't
      // require webkit browsers in CI.
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1194 },
        hasTouch: true,
        isMobile: false,
      },
      testMatch: /(responsive|settings-behavior|app-loads)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm preview',
    port: 4173,
    reuseExistingServer: !process.env['CI'],
  },
});
