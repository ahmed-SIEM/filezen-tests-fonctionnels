/**
 * TESTS E2E API — Module TICKETS (Playwright API Testing)
 * Teste le cycle complet de gestion des tickets en boîte noire
 *
 * Pré-requis : serveur backend démarré + données de test en place
 * Commande   : npm run test:e2e:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Connexion et récupération du token JWT
 */
const seConnecter = async (request, email, motDePasse) => {
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: { email, mot_de_passe: motDePasse },
  });
  const body = await res.json();
  return body.data?.token || null;
};

/**
 * Headers avec token Bearer
 */
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

// ─── Tests tickets ────────────────────────────────────────────────────────────

test.describe('TICKETS API — Gestion de la file d\'attente', () => {

  test('❌ [TKT-001] Prise de ticket sans authentification → 401', async ({ request }) => {
    const fakeServiceId = '507f1f77bcf86cd799439011';
    const res = await request.post(`${BASE_URL}/tickets`, {
      data: { service_id: fakeServiceId },
    });
    expect(res.status()).toBe(401);
  });

  test('❌ [TKT-002] Service inexistant → 404', async ({ request }) => {
    // Ce test nécessite un token valide — skipped si pas de serveur live
    test.skip(
      !process.env.TEST_CITOYEN_TOKEN,
      'Token de test requis (TEST_CITOYEN_TOKEN env var)'
    );

    const res = await request.post(`${BASE_URL}/tickets`, {
      headers: authHeaders(process.env.TEST_CITOYEN_TOKEN),
      data: { service_id: '507f1f77bcf86cd799439011' },
    });
    expect(res.status()).toBe(404);
  });

  test('❌ [TKT-003] Appel prochain ticket sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/tickets/agent/appeler`);
    expect(res.status()).toBe(401);
  });

  test('❌ [TKT-004] Marquer ticket servi sans token → 401', async ({ request }) => {
    const fakeTicketId = '507f1f77bcf86cd799439011';
    const res = await request.put(`${BASE_URL}/tickets/agent/${fakeTicketId}/servi`);
    expect(res.status()).toBe(401);
  });

  test('❌ [TKT-005] Ticket absent sans token → 401', async ({ request }) => {
    const fakeTicketId = '507f1f77bcf86cd799439011';
    const res = await request.put(`${BASE_URL}/tickets/agent/${fakeTicketId}/absent`);
    expect(res.status()).toBe(401);
  });
});

// ─── Tests établissements API ─────────────────────────────────────────────────
test.describe('ETABLISSEMENTS API — Accès public et filtres', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Tickets API' },
  ],
}, () => {

  test('✅ [ETAB-001] Liste publique accessible sans token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('✅ [ETAB-002] Filtre type appliqué correctement', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements?type=clinique`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Tous les résultats doivent être de type clinique (ou liste vide si pas de data)
    body.data.forEach((e) => {
      expect(e.type).toBe('clinique');
    });
  });

  test('❌ [ETAB-003] Demandes en attente sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/etablissements/en-attente`);
    expect(res.status()).toBe(401);
  });

  test('❌ [ETAB-004] Signalement sans token → 401', async ({ request }) => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request.post(`${BASE_URL}/etablissements/${fakeId}/signaler`, {
      data: { raison: 'service_mediocre' },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Tests services API ───────────────────────────────────────────────────────
test.describe('SERVICES API — Accès protégé', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Tickets API' },
  ],
}, () => {

  test('❌ [SVC-001] Création service sans token → 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/services`, {
      data: {
        nom: 'Service Test',
        etablissement: '507f1f77bcf86cd799439011',
        file_activee: true,
      },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Tests notifications API ──────────────────────────────────────────────────
test.describe('NOTIFICATIONS API — Accès protégé', {
  annotation: [
    { type: 'epic',    value: '🟠 Tests E2E API' },
    { type: 'feature', value: 'Tickets API' },
  ],
}, () => {

  test('❌ [NOTIF-001] Liste notifications sans token → 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/notifications`);
    expect(res.status()).toBe(401);
  });

  test('❌ [NOTIF-002] Marquer notification lue sans token → 401', async ({ request }) => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request.put(`${BASE_URL}/notifications/${fakeId}/lire`);
    expect(res.status()).toBe(401);
  });
});
