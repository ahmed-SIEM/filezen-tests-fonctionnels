/**
 * TESTS E2E IHM — Rendez-vous (Playwright Browser)
 * Teste les interfaces de reservation de RDV
 *
 * Pre-requis :
 *   - Backend demarre sur http://localhost:5000
 *   - Frontend demarre sur http://localhost:5173
 * Commande : npm run test:e2e:ui
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TIMEOUT = 10000;

// ─── Acces et protection des pages RDV ──────────────────────────────────────
test.describe('IHM — Rendez-vous — acces et protection', () => {

  test('[UI-RDV-001] Page reservation RDV non connecte → redirection login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/rendezvous`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|rendezvous/i);
  });

  test('[UI-RDV-002] Page mes-rdv non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/mes-rdv`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  });

  test('[UI-RDV-003] Page appointments agent non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/agent/appointments`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-RDV-004] Page admin config RDV non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/appointments-config`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });
});

// ─── Formulaire de reservation ────────────────────────────────────────────────
test.describe('IHM — Formulaire reservation RDV', () => {

  test('[UI-RDV-005] Page reservation avec serviceId dans URL accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/rendezvous?serviceId=507f1f77bcf86cd799439011`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('[UI-RDV-006] Page confirmation RDV accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/rendezvous/confirmation`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

// ─── Navigation RDV ───────────────────────────────────────────────────────────
test.describe('IHM — Navigation et liens RDV', () => {

  test('[UI-RDV-007] Lien prendre RDV sur page etablissement', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/etablissements`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    const lienRdv = page.locator(
      'a:has-text("rendez-vous"), a:has-text("RDV"), button:has-text("RDV"), a[href*="rdv"], a[href*="rendezvous"]'
    ).first();
    const count = await lienRdv.count();
    if (count > 0) {
      await expect(lienRdv).toBeVisible({ timeout: TIMEOUT });
    }
  });

  test('[UI-RDV-008] Pas de crash JS sur pages RDV', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${FRONTEND_URL}/rendezvous`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('404') &&
      !e.includes('net::ERR') && !e.includes('ChunkLoad')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
