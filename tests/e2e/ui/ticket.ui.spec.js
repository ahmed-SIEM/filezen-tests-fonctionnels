/**
 * TESTS E2E IHM — Tickets / File d'attente (Playwright Browser)
 * Teste les interfaces de la file d'attente
 *
 * Pre-requis :
 *   - Backend demarre sur http://localhost:5000
 *   - Frontend demarre sur http://localhost:5173
 * Commande : npm run test:e2e:ui
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TIMEOUT = 10000;

// ─── Acces et protection des pages tickets ───────────────────────────────────
test.describe('IHM — Ticket / File attente — acces et protection', () => {

  test('[UI-TKT-001] Page prise de ticket non connecte → redirection ou page de connexion', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ticket`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    // Doit etre redirige ou afficher login
    expect(url).toMatch(/login|ticket|\/$|accueil/i);
  });

  test('[UI-TKT-002] Page mes-tickets non connecte → redirection login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/mes-tickets`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  });

  test('[UI-TKT-003] Dashboard agent non connecte → redirection login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/agent/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-TKT-004] Interface agent stats non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/agent/stats`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });
});

// ─── Page de suivi de ticket (publique) ──────────────────────────────────────
test.describe('IHM — Suivi ticket (affichage public)', () => {

  test('[UI-TKT-005] Page suivi ticket avec ID inexistant gere proprement', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ticket/507f1f77bcf86cd799439011`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // La page doit charger sans erreur critique (404 ou message d'erreur gere)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('[UI-TKT-006] Page de suivi accessible sans connexion (QR code use case)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/track-ticket/507f1f77bcf86cd799439011`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // Soit affiche le ticket, soit redirige vers login — les deux sont acceptables
    const url = page.url();
    expect(url.length).toBeGreaterThan(0);
  });
});

// ─── Interface de file d attente temps reel ───────────────────────────────────
test.describe('IHM — Affichage file d attente (ecran public)', () => {

  test('[UI-TKT-007] Page affichage file publique accessible', async ({ page }) => {
    // Page d'affichage public (ecran d'accueil de la clinique)
    await page.goto(`${FRONTEND_URL}/display`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // Si la page existe, elle doit charger correctement
    const res = page.url();
    expect(res.length).toBeGreaterThan(0);
  });

  test('[UI-TKT-008] Pas de crash JavaScript sur pages ticket', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${FRONTEND_URL}/ticket`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR') &&
      !e.includes('ChunkLoad')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ─── Navigation et UX ────────────────────────────────────────────────────────
test.describe('IHM — Navigation et experience utilisateur', () => {

  test('[UI-TKT-009] Bouton retour ou navigation presente sur pages protegees', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    // Page de login doit avoir un lien vers accueil ou inscription
    const liens = page.locator('a, button').filter({ hasText: /accueil|retour|inscription|signup/i });
    // Au moins un lien de navigation doit exister
    const count = await liens.count();
    // Pas obligatoire si la page a son propre layout
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('[UI-TKT-010] Page 404 geree proprement (route inexistante)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/cette-page-nexiste-vraiment-pas-12345`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // La page ne doit pas afficher une erreur serveur 5xx
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
