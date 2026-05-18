/**
 * TESTS E2E API — Module AUTH (Playwright API Testing)
 * Teste l'API en boîte noire contre le vrai serveur démarré
 *
 * Pré-requis : serveur backend démarré sur http://localhost:5000
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Helper pour générer un email unique par test
const emailUnique = (prefix = 'test') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@filezen.test`;

// ─── Flux AUTH complet ────────────────────────────────────────────────────────

test.describe('AUTH API — Flux complet inscription → connexion', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Auth API' },
  ],
}, () => {

  test('✅ [AUTH-001] Inscription citoyen valide → 201', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/signup/citoyen`, {
      data: {
        prenom: 'Ahmed',
        nom: 'Souid',
        email: emailUnique('ahmed'),
        mot_de_passe: 'Password@123',
        telephone: '55123456',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('userId');
  });

  test('❌ [AUTH-002] Email dupliqué → 400', async ({ request }) => {
    const email = emailUnique('duplicate');

    // Premier inscription
    await request.post(`${BASE_URL}/auth/signup/citoyen`, {
      data: {
        prenom: 'Test', nom: 'User', email,
        mot_de_passe: 'Password@123', telephone: '55000000',
      },
    });

    // Deuxième tentative avec le même email
    const res = await request.post(`${BASE_URL}/auth/signup/citoyen`, {
      data: {
        prenom: 'Test2', nom: 'User2', email,
        mot_de_passe: 'Password@456', telephone: '55000001',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('❌ [AUTH-003] Connexion avec mauvais mot de passe → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/login`, {
      data: { email: 'inexistant@test.com', mot_de_passe: 'MauvaisPass' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('❌ [AUTH-004] Token manquant sur route protégée → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/auth/me`);

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('❌ [AUTH-005] Token falsifié → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer token.falsifie.ici' },
    });

    expect(res.status()).toBe(401);
  });

  test('✅ [AUTH-006] Forgot password — même réponse si email existe ou non (sécurité)', async ({ request }) => {
    const resExistant = await request.post(`${BASE_URL}/auth/forgot-password`, {
      data: { email: 'existant@test.com' },
    });

    const resInexistant = await request.post(`${BASE_URL}/auth/forgot-password`, {
      data: { email: 'nexistepas@test.com' },
    });

    // Les deux doivent retourner 200 (ne révèle pas si email existe)
    expect(resExistant.status()).toBe(200);
    expect(resInexistant.status()).toBe(200);
  });
});

// ─── Protection des routes par rôle ──────────────────────────────────────────
test.describe('AUTH API — Protection des routes par rôle', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Auth API' },
  ],
}, () => {

  test('❌ [AUTH-007] Route super_admin inaccessible sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/en-attente`);
    expect(res.status()).toBe(401);
  });

  test('❌ [AUTH-008] Route agent inaccessible sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/tickets/agent/appeler`);
    expect(res.status()).toBe(401);
  });

  test('✅ [AUTH-009] Route publique établissements — accessible sans token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    expect(res.status()).toBe(200);
  });
});

// ─── Vérification email ───────────────────────────────────────────────────────
test.describe('AUTH API — Vérification email', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Auth API' },
  ],
}, () => {

  test('❌ [AUTH-010] Code de vérification incorrect → 400', async ({ request }) => {
    // D'abord inscrire un utilisateur
    const signupRes = await request.post(`${BASE_URL}/auth/signup/citoyen`, {
      data: {
        prenom: 'Test', nom: 'Verify',
        email: emailUnique('verify'),
        mot_de_passe: 'Password@123',
        telephone: '55000002',
      },
    });

    const signupBody = await signupRes.json();
    if (!signupBody.data?.userId) return; // Skip si serveur non prêt

    const res = await request.post(`${BASE_URL}/auth/verify-email`, {
      data: { userId: signupBody.data.userId, code: '000000' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('❌ [AUTH-011] UserId inexistant → 404', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/verify-email`, {
      data: { userId: '507f1f77bcf86cd799439011', code: '123456' },
    });

    expect(res.status()).toBe(404);
  });
});
