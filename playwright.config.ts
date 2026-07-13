import { defineConfig } from '@playwright/test';

// Smoke tests run against the dev server in local/seed mode (no Supabase env
// vars), so they are deterministic and need no secrets in CI.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    // Sandboxes with a pre-installed Chromium can point at it via
    // PLAYWRIGHT_CHROMIUM_PATH; CI installs browsers normally.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Force mock/seed mode even if a local .env configures Supabase.
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
