import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      command: 'pnpm --filter @orquesta/platform-dashboard dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'pnpm --filter @orquesta/seller-portal dev',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'pnpm --filter @orquesta/demo-checkout dev',
      url: 'http://localhost:3002',
      reuseExistingServer: true,
      timeout: 120000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
