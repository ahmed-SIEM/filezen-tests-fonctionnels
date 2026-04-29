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
  ],

  // ── Allure : via testEnvironment (allure-jest v3) ─────────────────────────
  testEnvironment: 'allure-jest/node',
  testEnvironmentOptions: {
    resultsDir: 'allure-results',
  },

  // ── Résolution des chemins vers le Backend ────────────────────────────────
  moduleNameMapper: {
    '^../../Backend/(.*)$':   '<rootDir>/../Backend/$1',
    '^../../../Backend/(.*)$': '<rootDir>/../Backend/$1',
    // Forcer une seule instance mongoose partagée entre tests et Backend
    '^mongoose$': '<rootDir>/../Backend/node_modules/mongoose',
  },

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
