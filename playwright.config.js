/**
 * Configuration Playwright — FileZen Tests Fonctionnels
 * Avec reporter Allure pour dashboard visuel
 */
const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI || !!process.env.JENKINS_URL;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: isCI ? 120000 : 30000,   // 120s en CI, 30s en local
  expect: { timeout: isCI ? 15000 : 10000 },
  workers: 1,
  retries: isCI ? 1 : 0,            // 1 retry en CI pour absorber les flakys

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

    // Flags indispensables pour Chrome headless en CI (container Linux sans GPU)
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    },
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
        // Viewport stable pour CI
        viewport: { width: 1280, height: 720 },
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
