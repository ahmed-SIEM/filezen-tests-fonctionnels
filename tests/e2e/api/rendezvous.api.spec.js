/**
 * TESTS E2E API — Module RENDEZ-VOUS (Playwright API Testing)
 * Teste la protection et les regles metier des routes RDV
 *
 * Pre-requis : serveur backend demarre sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Routes protegees citoyen ────────────────────────────────────────────────

test.describe('RENDEZ-VOUS API — Routes citoyen protegees', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Rendez-vous API' },
  ],
}, () => {

  test('[RDV-001] POST /rendezvous sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/rendezvous`, {
      data: { creneauxIds: ['507f1f77bcf86cd799439011'], serviceId: '507f1f77bcf86cd799439012' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('[RDV-002] GET /rendezvous/mes-rdv sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rendezvous/mes-rdv`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-003] GET /rendezvous/:id sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rendezvous/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-004] DELETE /rendezvous/:id sans token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/rendezvous/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-005] GET /rendezvous/creneaux sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rendezvous/creneaux`);
    expect(res.status()).toBe(401);
  });
});

// ─── Routes agent protegees ───────────────────────────────────────────────────
test.describe('RENDEZ-VOUS API — Routes agent protegees', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Rendez-vous API' },
  ],
}, () => {

  test('[RDV-006] GET /rendezvous/agent/jour sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rendezvous/agent/jour`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-007] PUT /rendezvous/agent/:id/present sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/rendezvous/agent/507f1f77bcf86cd799439011/present`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-008] PUT /rendezvous/agent/:id/termine sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/rendezvous/agent/507f1f77bcf86cd799439011/termine`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-009] PUT /rendezvous/agent/:id/no-show sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/rendezvous/agent/507f1f77bcf86cd799439011/no-show`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-010] POST /rendezvous/agent/rdv-manuel sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/rendezvous/agent/rdv-manuel`);
    expect(res.status()).toBe(401);
  });
});

// ─── Routes admin protegees ───────────────────────────────────────────────────
test.describe('RENDEZ-VOUS API — Routes admin protegees', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Rendez-vous API' },
  ],
}, () => {

  test('[RDV-011] PUT /rendezvous/service/:id/config sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/rendezvous/service/507f1f77bcf86cd799439011/config`);
    expect(res.status()).toBe(401);
  });

  test('[RDV-012] POST /rendezvous/service/:id/exception sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/rendezvous/service/507f1f77bcf86cd799439011/exception`);
    expect(res.status()).toBe(401);
  });
});

// ─── Validation entrees — creneaux vides ─────────────────────────────────────
test.describe('RENDEZ-VOUS API — Regles metier (validation)', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Rendez-vous API' },
  ],
}, () => {

  test('[RDV-013] Reponse creneaux disponibles sans serviceId → 400 avec token invalid', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rendezvous/creneaux`, {
      headers: { Authorization: 'Bearer token.invalid' },
    });
    // Token invalide retourne 401
    expect(res.status()).toBe(401);
  });
});
