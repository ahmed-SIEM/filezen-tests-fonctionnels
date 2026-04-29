/**
 * TESTS E2E API — Module NOTIFICATIONS (Playwright API Testing)
 * Teste la protection et le format des routes notifications
 *
 * Pre-requis : serveur backend demarre sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Protection des routes notifications ─────────────────────────────────────
test.describe('NOTIFICATIONS API — Protection (non authentifie)', () => {

  test('[NOTIF-001] GET /notifications sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/notifications`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('[NOTIF-002] PUT /notifications/tout-lire sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/notifications/tout-lire`);
    expect(res.status()).toBe(401);
  });

  test('[NOTIF-003] PUT /notifications/:id/lire sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/notifications/507f1f77bcf86cd799439011/lire`);
    expect(res.status()).toBe(401);
  });

  test('[NOTIF-004] DELETE /notifications/:id sans token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/notifications/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });
});

// ─── Token invalide ───────────────────────────────────────────────────────────
test.describe('NOTIFICATIONS API — Token invalide', () => {

  test('[NOTIF-005] GET /notifications avec token falsifie → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: 'Bearer token.falsifie.ici' },
    });
    expect(res.status()).toBe(401);
  });

  test('[NOTIF-006] PUT /notifications/tout-lire avec token expire → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/notifications/tout-lire`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Format des reponses ──────────────────────────────────────────────────────
test.describe('NOTIFICATIONS API — Format des reponses', () => {

  test('[NOTIF-007] Toutes les erreurs 401 ont la structure standard', async ({ request }) => {
    const routes = [
      () => request.get(`${BASE_URL}/notifications`),
      () => request.put(`${BASE_URL}/notifications/tout-lire`),
      () => request.delete(`${BASE_URL}/notifications/507f1f77bcf86cd799439011`),
    ];

    for (const makeRequest of routes) {
      const res = await makeRequest();
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('message');
    }
  });
});
