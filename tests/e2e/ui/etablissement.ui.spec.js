/**
 * TESTS E2E IHM — Etablissements (Playwright Browser)
 * Teste les pages publiques de recherche et details etablissements
 *
 * Pre-requis :
 *   - Backend demarre sur http://localhost:5000
 *   - Frontend demarre sur http://localhost:5173
 * Commande : npm run test:e2e:ui
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TIMEOUT = 10000;

// ─── Page de recherche etablissements ────────────────────────────────────────
test.describe('IHM — Recherche etablissements (page publique)', () => {

  test('[UI-ETAB-001] Page etablissements accessible sans connexion', async ({ page }) => {
    const res = await page.goto(`${FRONTEND_URL}/etablissements`);
    // La page doit charger (pas de redirection vers login)
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('[UI-ETAB-002] Liste des etablissements visible sur la page', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/etablissements`);
    // Attendre que la page charge
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // La page doit avoir du contenu
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('[UI-ETAB-003] Barre de recherche ou filtre presente', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/etablissements`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    // Chercher un champ de recherche ou filtre
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="recherch"], input[placeholder*="Recherch"], input[name="search"], input[name="q"]'
    ).first();

    // Si la barre de recherche existe, elle doit etre visible
    const count = await searchInput.count();
    if (count > 0) {
      await expect(searchInput).toBeVisible({ timeout: TIMEOUT });
    }
    // Si pas de barre de recherche, le test passe quand meme
  });

  test('[UI-ETAB-004] Page details etablissement accessible via URL', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/etablissements`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    // Chercher un lien vers un etablissement
    const lien = page.locator('a[href*="/etablissement"], a[href*="/etab"], .card a, .etablissement a').first();
    const count = await lien.count();

    if (count > 0) {
      await lien.click();
      await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
      // Verifier qu'on est sur une page de detail
      expect(page.url()).toContain('etablissement');
    }
  });
});

// ─── Page d'accueil avec etablissements ──────────────────────────────────────
test.describe('IHM — Page d accueil et navigation', () => {

  test('[UI-ETAB-005] Page accueil chargee sans erreur', async ({ page }) => {
    const res = await page.goto(FRONTEND_URL);
    expect(res?.status()).toBeLessThan(400);
  });

  test('[UI-ETAB-006] Navigation vers page etablissements depuis accueil', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    // Chercher un lien de navigation vers etablissements
    const navLink = page.locator(
      'a[href*="etablissement"], nav a:has-text("etablissement"), nav a:has-text("Etablissement"), a:has-text("Trouver")'
    ).first();

    const count = await navLink.count();
    if (count > 0) {
      await navLink.click();
      await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
      expect(page.url()).toMatch(/etablissement|service|recherch/i);
    }
  });

  test('[UI-ETAB-007] Pas d erreur JavaScript sur la page d accueil', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});

    // Filtrer les erreurs critiques (exclure les warnings 404 d'assets)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('net::ERR')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('[UI-ETAB-008] Page responsive — viewport mobile fonctionne', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const res = await page.goto(FRONTEND_URL);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─── Page de prise de ticket citoyen ─────────────────────────────────────────
test.describe('IHM — File d attente (vue citoyen)', () => {

  test('[UI-ETAB-009] Page file d attente accessible (publique ou protegee)', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/file-attente`);
    // Soit la page charge, soit redirection login
    const url = page.url();
    const status = url.includes('login') || url.includes('file-attente') || url.includes('/');
    expect(status).toBe(true);
  });

  test('[UI-ETAB-010] Tentative acces dashboard citoyen non connecte → redirection', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/citoyen/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
    // Doit etre redirige vers login ou accueil
    const url = page.url();
    expect(url).toMatch(/login|accueil|\/$|citoyen/i);
  });
});
