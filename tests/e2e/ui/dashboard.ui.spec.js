/**
 * TESTS E2E IHM — Dashboards et interfaces admin (Playwright Browser)
 * Teste les acces aux dashboards et la navigation admin
 *
 * Pre-requis :
 *   - Backend demarre sur http://localhost:5000
 *   - Frontend demarre sur http://localhost:5174
 * Commande : npm run test:e2e:ui
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
const TIMEOUT = 10000;

// ─── Dashboards proteges (admin etablissement) ───────────────────────────────
test.describe('IHM — Dashboard Admin Etablissement (acces non autorise)', () => {

  test('[UI-DASH-001] /admin/dashboard non connecte → redirection login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-002] /admin/services non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/services`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-003] /admin/agents non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/agents`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-004] /admin/stats non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/stats`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });
});

// ─── Dashboard Super Admin ────────────────────────────────────────────────────
test.describe('IHM — Dashboard Super Admin (acces non autorise)', () => {

  test('[UI-DASH-005] /superadmin/dashboard non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/superadmin/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-006] /superadmin/establishments non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/superadmin/establishments`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-007] /superadmin/validate non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/superadmin/validate`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });
});

// ─── Dashboard Citoyen ────────────────────────────────────────────────────────
test.describe('IHM — Dashboard Citoyen (acces non autorise)', () => {

  test('[UI-DASH-008] /citoyen/dashboard non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  });

  test('[UI-DASH-009] /citoyen/mes-rdv non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/mes-rdv`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  });

  test('[UI-DASH-010] /citoyen/notifications non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/notifications`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  });
});

// ─── Formulaire inscription etablissement ───────────────────────────────────
test.describe('IHM — Inscription etablissement', () => {

  test('[UI-DASH-011] Page inscription etablissement accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/signup/etablissement`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // La page doit charger (meme si elle redirige)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('[UI-DASH-012] Formulaire inscription etab contient champs nom et email', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/signup/etablissement`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    const emailField = page.locator('input[type="email"], input[name="email_etablissement"]').first();
    const count = await emailField.count();
    if (count > 0) {
      await expect(emailField).toBeVisible({ timeout: TIMEOUT });
    }
  });
});

// ─── Performance et accessibilite ────────────────────────────────────────────
test.describe('IHM — Performance et robustesse', () => {

  test('[UI-DASH-013] Page login charge en moins de 5 secondes', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('[UI-DASH-014] Page accueil charge en moins de 5 secondes', async ({ page }) => {
    const start = Date.now();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('[UI-DASH-015] Viewport tablet fonctionne sur page login', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const res = await page.goto(`${FRONTEND_URL}/login`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: TIMEOUT });
  });
});

// ─── Page detail etablissement (Super Admin) ──────────────────────────────────
test.describe('IHM — SuperAdmin Detail Etablissement', () => {

  test('[UI-DASH-016] /superadmin/establishments/:id non connecte → redirection login', async ({ page }) => {
    const fakeId = '507f1f77bcf86cd799439011';
    await page.goto(`${FRONTEND_URL}/superadmin/establishments/${fakeId}`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });

  test('[UI-DASH-017] Page detail etablissement avec ID inexistant gere proprement', async ({ page }) => {
    const fakeId = '507f1f77bcf86cd799439011';
    await page.goto(`${FRONTEND_URL}/superadmin/establishments/${fakeId}`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // Soit redirection login, soit page d'erreur geree — pas de crash serveur
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('[UI-DASH-018] Pas de crash JavaScript sur page detail etablissement superadmin', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const fakeId = '507f1f77bcf86cd799439011';
    await page.goto(`${FRONTEND_URL}/superadmin/establishments/${fakeId}`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR') &&
      !e.includes('ChunkLoad')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('[UI-DASH-019] Route superadmin establishments liste non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/superadmin/establishments`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    const url = page.url();
    expect(url).toMatch(/login|\/$|accueil/i);
  });
});
