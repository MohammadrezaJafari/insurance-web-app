import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8100;
const WEB_PORT = 9200;

/**
 * End-to-end tests run against their own API (fresh demo database, see e2e/serve-api.sh)
 * and their own SSR dev server, so they never touch development data.
 * Tests share one database and run in order.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    locale: 'fa-IR',
    trace: 'retain-on-failure',
    // Uses the locally installed Chrome; in CI run `npx playwright install chromium` and
    // set E2E_BROWSER_CHANNEL= (empty) to use Playwright's bundled browser instead.
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /directory\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'sh e2e/serve-api.sh',
      url: `http://127.0.0.1:${API_PORT}/up`,
      env: { E2E_API_PORT: String(API_PORT) },
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `npx quasar dev -m ssr --port ${WEB_PORT}`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      env: { API_INTERNAL_URL: `http://127.0.0.1:${API_PORT}` },
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
