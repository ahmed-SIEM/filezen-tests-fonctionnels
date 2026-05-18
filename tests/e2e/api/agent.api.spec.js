/**
 * TESTS E2E API — Module AGENTS (Playwright API Testing)
 * Teste la protection des routes agents contre le vrai serveur
 *
 * Pre-requis : serveur backend demarre sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Protection des routes agents ────────────────────────────────────────────

test.describe('AGENTS API — Protection des routes (acces non autorise)', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Agents API' },
  ],
}, () => {

  test('[AGT-001] POST /agents sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/agents`, {
      data: { prenom: 'Test', nom: 'Agent', email: 'agent@test.com', telephone: '55000000' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('[AGT-002] GET /agents sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/agents`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-003] PUT /agents/:id sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/agents/507f1f77bcf86cd799439011`, {
      data: { numero_guichet: 2 },
    });
    expect(res.status()).toBe(401);
  });

  test('[AGT-004] DELETE /agents/:id sans token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/agents/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-005] PUT /agents/:id/assigner-service sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/agents/507f1f77bcf86cd799439011/assigner-service`, {
      data: { service_id: '507f1f77bcf86cd799439012' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Protection des routes tickets agent ─────────────────────────────────────
test.describe('AGENTS API — Routes tickets agent protegees', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Agents API' },
  ],
}, () => {

  test('[AGT-006] GET /tickets/agent/file sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/tickets/agent/file`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-007] POST /tickets/agent/appeler sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/tickets/agent/appeler`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-008] PUT /tickets/agent/:id/servi sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/tickets/agent/507f1f77bcf86cd799439011/servi`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-009] PUT /tickets/agent/:id/absent sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/tickets/agent/507f1f77bcf86cd799439011/absent`);
    expect(res.status()).toBe(401);
  });

  test('[AGT-010] GET /tickets/agent/stats sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/tickets/agent/stats`);
    expect(res.status()).toBe(401);
  });
});

// ─── Format des erreurs ───────────────────────────────────────────────────────
test.describe('AGENTS API — Format des erreurs', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Agents API' },
  ],
}, () => {

  test('[AGT-011] Toutes les erreurs 401 ont success:false et message', async ({ request }) => {
    const routes = [
      { method: 'get', url: `${BASE_URL}/agents` },
      { method: 'post', url: `${BASE_URL}/agents` },
      { method: 'delete', url: `${BASE_URL}/agents/507f1f77bcf86cd799439011` },
    ];

    for (const route of routes) {
      const res = await request[route.method](route.url);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('message');
    }
  });
});
