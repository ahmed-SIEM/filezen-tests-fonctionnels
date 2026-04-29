/**
 * Configuration Jest — FileZen Tests Fonctionnels
 * Avec reporter Allure pour dashboard visuel
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
  testTimeout: 30000,
  verbose: true,
  setupFiles: ['./tests/setup/env.js'],

  // ── Reporters : console + Allure ──────────────────────────────────────────
  reporters: [
    'default',
    [
      'allure-jest',
      {
        resultsDir: 'allure-results',
        testMode: true,
      },
    ],
  ],

  // ── Couverture de code ─────────────────────────────────────────────────────
  collectCoverageFrom: [
    '../Backend/src/**/*.js',
    '!../Backend/src/server.js',
    '!../Backend/src/utils/whatsapp.js',
    '!../Backend/src/jobs/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};
