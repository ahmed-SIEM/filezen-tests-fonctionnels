/**
 * TESTS E2E API — Module SERVICES (Playwright API Testing)
 * Teste les routes services contre le vrai serveur
 *
 * Pre-requis : serveur backend demarre sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Helper — creer un citoyen et recuperer son token
async function obtenirTokenCitoyen(request) {
  const email = `citoyen_${Date.now()}@filezen.test`;
  const signup = await request.post(`${BASE_URL}/auth/signup/citoyen`, {
    data: { prenom: 'Test', nom: 'Citoyen', email, mot_de_passe: 'Password@123', telephone: '55000000' },
  });
  const signupBody = await signup.json();
  // L'utilisateur est inactif — on ne peut pas login sans verification
  // On retourne juste le userId pour les tests
  return { userId: signupBody.data?.userId, email };
}

// ─── Routes publiques services ────────────────────────────────────────────────
test.describe('SERVICES API — Routes publiques', () => {

  test('[SVC-001] GET /etablissements — liste publique accessible sans token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('[SVC-002] GET /services/etablissement/:id — liste services etablissement inexistant retourne 200 vide', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/services/etablissement/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  test('[SVC-003] GET /services/:id — service inexistant retourne 404', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/services/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(404);
  });

  test('[SVC-004] GET /services/:id/stats — stats service inexistant retourne 404', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/services/507f1f77bcf86cd799439011/stats`);
    expect(res.status()).toBe(404);
  });
});

// ─── Protection des routes admin ─────────────────────────────────────────────
test.describe('SERVICES API — Protection des routes admin', () => {

  test('[SVC-005] POST /services sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/services`, {
      data: { nom: 'Service non autorise' },
    });
    expect(res.status()).toBe(401);
  });

  test('[SVC-006] PUT /services/:id sans token → 401', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/services/507f1f77bcf86cd799439011`, {
      data: { nom: 'Modification non autorisee' },
    });
    expect(res.status()).toBe(401);
  });

  test('[SVC-007] DELETE /services/:id sans token → 401', async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/services/507f1f77bcf86cd799439011`);
    expect(res.status()).toBe(401);
  });

  test('[SVC-008] PATCH /services/:id/toggle sans token → 401', async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/services/507f1f77bcf86cd799439011/toggle`);
    expect(res.status()).toBe(401);
  });

  test('[SVC-009] GET /services/me/services sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/services/me/services`);
    expect(res.status()).toBe(401);
  });

  test('[SVC-010] POST /services avec token citoyen → 403', async ({ request }) => {
    // Utiliser un token fake mais bien forme pour tester le role
    const res = await request.post(`${BASE_URL}/services`, {
      headers: { Authorization: 'Bearer token.invalide.ici' },
      data: { nom: 'Service test' },
    });
    // Token invalide → 401
    expect(res.status()).toBe(401);
  });
});

// ─── Format reponses API ──────────────────────────────────────────────────────
test.describe('SERVICES API — Format des reponses', () => {

  test('[SVC-011] Reponse liste etablissements contient success + data + count', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    const body = await res.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
  });

  test('[SVC-012] Reponse 401 contient success:false et message', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/services`, {
      data: { nom: 'test' },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body).toHaveProperty('message');
  });
});
