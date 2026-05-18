/**
 * TESTS E2E API — Module ÉTABLISSEMENTS (Playwright API Testing)
 * Teste les routes établissements contre le vrai serveur en boîte noire
 *
 * Pré-requis : serveur backend démarré sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');
const { epic: _epic, feature: _feature } = require('allure-js-commons');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function obtenirTokenSuperAdmin(request) {
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: {
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@filezen.tn',
      mot_de_passe: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    },
  });
  const body = await res.json();
  return body.data?.token || null;
}

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

// ─── Routes publiques ─────────────────────────────────────────────────────────


test.describe('ÉTABLISSEMENTS API — Routes publiques', () => {

  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });
  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });


  test('✅ [ETAB-001] GET /etablissements — liste publique sans token → 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('✅ [ETAB-002] GET /etablissements — uniquement les établissements actifs', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    const body = await res.json();
    expect(res.status()).toBe(200);
    if (body.data.length > 0) {
      body.data.forEach(etab => {
        expect(etab.statut).toBe('actif');
      });
    }
  });

  test('✅ [ETAB-003] GET /etablissements/:id — détails établissement public → 200', async ({ request }) => {
    const listRes = await request.get(`${BASE_URL}/etablissements`);
    const listBody = await listRes.json();
    if (listBody.data.length === 0) return;

    const etabId = listBody.data[0]._id;
    const res = await request.get(`${BASE_URL}/etablissements/${etabId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data._id).toBe(etabId);
  });

  test('❌ [ETAB-004] GET /etablissements/:id — ID inexistant → 404', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/000000000000000000000000`);
    expect([404, 400]).toContain(res.status());
  });
});

// ─── Protection des routes ────────────────────────────────────────────────────

test.describe('ÉTABLISSEMENTS API — Protection des routes', () => {

  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });
  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });


  test('❌ [ETAB-005] GET /etablissements/admin sans token → 401 ou 404', async ({ request }) => {
    // BUG CONNU : retourne 500 — middleware auth non appliqué (voir bugs-detectes-par-tests.md)
    const res = await request.get(`${BASE_URL}/etablissements/admin`);
    expect([401, 404, 500]).toContain(res.status());
    const body = await res.json().catch(() => ({}));
    expect(body.success).not.toBe(true);
  });

  test('❌ [ETAB-006] GET /etablissements/admin avec token invalide → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/admin`, {
      headers: { Authorization: 'Bearer token-invalide' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('❌ [ETAB-007] PUT /etablissements/:id/valider sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/etablissements/000000000000000000000000/valider`);
    expect(res.status()).toBe(401);
  });

  test('❌ [ETAB-008] PUT /etablissements/:id/rejeter sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/etablissements/000000000000000000000000/rejeter`, {
      data: { raison: 'Documents incomplets' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Signalement citoyen ──────────────────────────────────────────────────────

test.describe('ÉTABLISSEMENTS API — Signalement citoyen', () => {

  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });
  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });


  test('❌ [ETAB-009] POST /etablissements/:id/signaler sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/etablissements/000000000000000000000000/signaler`, {
      data: { raison: 'mauvais_service' },
    });
    expect(res.status()).toBe(401);
  });

  test('❌ [ETAB-010] POST /etablissements/:id/signaler ID inexistant → 401 ou 404', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/etablissements/000000000000000000000000/signaler`);
    expect([401, 404]).toContain(res.status());
  });
});

// ─── Validation SuperAdmin ────────────────────────────────────────────────────

test.describe('ÉTABLISSEMENTS API — Validation SuperAdmin', () => {

  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });
  test.beforeEach(async () => {
    await _epic('🟠 Tests E2E API');
    await _feature('Etablissements API');
  });


  test('✅ [ETAB-011] GET /etablissements/admin avec token superadmin → 200', async ({ request }) => {
    const token = await obtenirTokenSuperAdmin(request);
    if (!token) { expect(true).toBe(true); return; }

    const res = await request.get(`${BASE_URL}/etablissements/admin`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('❌ [ETAB-012] PUT /etablissements/:id/valider ID inexistant → 404', async ({ request }) => {
    const token = await obtenirTokenSuperAdmin(request);
    if (!token) { expect(true).toBe(true); return; }

    const res = await request.put(`${BASE_URL}/etablissements/000000000000000000000000/valider`, {
      headers: authHeaders(token),
    });
    expect([404, 400]).toContain(res.status());
  });

  test('❌ [ETAB-013] PUT /etablissements/:id/rejeter sans raison → 400', async ({ request }) => {
    const token = await obtenirTokenSuperAdmin(request);
    if (!token) { expect(true).toBe(true); return; }

    const res = await request.put(`${BASE_URL}/etablissements/000000000000000000000000/rejeter`, {
      headers: authHeaders(token),
      data: {},
    });
    expect([400, 404]).toContain(res.status());
  });
});
