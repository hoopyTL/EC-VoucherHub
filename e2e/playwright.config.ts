import { defineConfig } from '@playwright/test'

const backendUrl = 'http://127.0.0.1:4100'
const frontendUrl = 'http://127.0.0.1:5174'
const rootDir = process.cwd()

export default defineConfig({
  globalSetup: './setup-e2e-db.ts',
  testDir: '.',
  testMatch: ['*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  outputDir: '../test-results/e2e',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      cwd: rootDir,
      url: `${backendUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: '4100',
        NODE_ENV: 'test',
        CORS_ORIGIN: frontendUrl
      }
    },
    {
      command: 'npm run dev --workspace=frontend -- --host 127.0.0.1 --port 5174 --strictPort',
      cwd: rootDir,
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_PROXY_TARGET: backendUrl
      }
    }
  ]
})
