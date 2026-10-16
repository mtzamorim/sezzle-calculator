import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const baseURL = 'http://127.0.0.1:8080'
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../reports/e2e', open: 'never' }],
    ['json', { outputFile: '../reports/e2e-results.json' }],
  ],
  outputDir: '../reports/e2e-artifacts',
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // Test the production React build against the actual Go API, without mock calculations.
  // Do not silently attach to an unrelated service occupying the same port.
  webServer: {
    command: 'go run ./cmd/server',
    cwd: '../backend',
    env: { PORT: '8080', STATIC_DIR: fileURLToPath(new URL('./dist', import.meta.url)) },
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
})
