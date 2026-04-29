/**
 * Configuration Playwright — FileZen Tests Fonctionnels
 * Avec reporter Allure pour dashboard visuel
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,

  // ── Reporters : liste console + Allure ────────────────────────────────────
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'API Tests',
      testMatch: '**/e2e/api/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.API_URL || 'http://localhost:5000',
      },
    },
    {
      name: 'UI Chrome',
      testMatch: '**/e2e/ui/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    },
    {
      name: 'UI Firefox',
      testMatch: '**/e2e/ui/**/*.spec.js',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    },
    {
      name: 'Mobile Chrome',
      testMatch: '**/e2e/ui/**/*.spec.js',
      use: {
        ...devices['Pixel 5'],
        baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    },
  ],
});
