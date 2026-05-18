/**
 * TESTS E2E API — Module STATISTIQUES (Playwright API Testing)
 * Teste la protection des routes stats et le format des reponses
 *
 * Pre-requis : serveur backend demarre sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Protection des routes stats etablissement ───────────────────────────────

test.describe('STATS API — Dashboard etablissement protege', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Statistiques API' },
  ],
}, () => {

  test('[STATS-001] GET /stats/etablissement/:id/dashboard sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/etablissement/507f1f77bcf86cd799439011/dashboard`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('[STATS-002] GET /stats/etablissement/:id/dashboard token invalide → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/etablissement/507f1f77bcf86cd799439011/dashboard`, {
      headers: { Authorization: 'Bearer token.invalide.ici' },
    });
    expect(res.status()).toBe(401);
  });

  test('[STATS-003] GET /stats/etablissement/:id stats detaillees sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/etablissement/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });
});

// ─── Protection des routes stats plateforme ──────────────────────────────────
test.describe('STATS API — Dashboard plateforme super admin protege', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Statistiques API' },
  ],
}, () => {

  test('[STATS-004] GET /stats/plateforme/dashboard sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/plateforme/dashboard`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('[STATS-005] GET /stats/plateforme/dashboard token invalide → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/plateforme/dashboard`, {
      headers: { Authorization: 'Bearer token.falsifie' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Format des reponses d erreur ────────────────────────────────────────────
test.describe('STATS API — Format standard des erreurs', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Statistiques API' },
  ],
}, () => {

  test('[STATS-006] Toutes les routes stats retournent success:false + message en cas 401', async ({ request }) => {
    const routes = [
      `${BASE_URL}/stats/etablissement/507f1f77bcf86cd799439011/dashboard`,
      `${BASE_URL}/stats/plateforme/dashboard`,
      `${BASE_URL}/stats/etablissement/507f1f77bcf86cd799439011`,
    ];

    for (const url of routes) {
      const res = await request.get(url);
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('message');
      expect(typeof body.message).toBe('string');
    }
  });

  test('[STATS-007] En-tete Content-Type est application/json', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/stats/plateforme/dashboard`);
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});

// ─── Routes etablissements (liees aux stats) ─────────────────────────────────
test.describe('STATS API — Routes etablissements liees', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Statistiques API' },
  ],
}, () => {

  test('[STATS-008] GET /etablissements/en-attente sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/en-attente`);
    expect(res.status()).toBe(401);
  });

  test('[STATS-009] GET /etablissements/tous sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/tous`);
    expect(res.status()).toBe(401);
  });

  test('[STATS-010] GET /etablissements/signales sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/signales`);
    expect(res.status()).toBe(401);
  });
});
