# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\etablissement.ui.spec.js >> IHM — Page d accueil et navigation >> [UI-ETAB-006] Navigation vers page etablissements depuis accueil
- Location: tests\e2e\ui\etablissement.ui.spec.js:76:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/
Call log:
  - navigating to "http://localhost:5174/", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * TESTS E2E IHM — Etablissements (Playwright Browser)
  3   |  * Teste les pages publiques de recherche et details etablissements
  4   |  *
  5   |  * Pre-requis :
  6   |  *   - Backend demarre sur http://localhost:5000
  7   |  *   - Frontend demarre sur http://localhost:5174
  8   |  * Commande : npm run test:e2e:ui
  9   |  */
  10  | 
  11  | const { test, expect } = require('@playwright/test');
  12  | 
  13  | const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
  14  | const TIMEOUT = 10000;
  15  | 
  16  | // ─── Page de recherche etablissements ────────────────────────────────────────
  17  | test.describe('IHM — Recherche etablissements (page publique)', () => {
  18  | 
  19  |   test('[UI-ETAB-001] Page etablissements accessible sans connexion', async ({ page }) => {
  20  |     const res = await page.goto(`${FRONTEND_URL}/etablissements`);
  21  |     // La page doit charger (pas de redirection vers login)
  22  |     expect(res?.status()).toBeLessThan(400);
  23  |     await expect(page.locator('body')).not.toBeEmpty();
  24  |   });
  25  | 
  26  |   test('[UI-ETAB-002] Liste des etablissements visible sur la page', async ({ page }) => {
  27  |     await page.goto(`${FRONTEND_URL}/etablissements`);
  28  |     // Attendre que la page charge
  29  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  30  |     // La page doit avoir du contenu
  31  |     await expect(page.locator('body')).not.toBeEmpty();
  32  |   });
  33  | 
  34  |   test('[UI-ETAB-003] Barre de recherche ou filtre presente', async ({ page }) => {
  35  |     await page.goto(`${FRONTEND_URL}/etablissements`);
  36  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  37  | 
  38  |     // Chercher un champ de recherche ou filtre
  39  |     const searchInput = page.locator(
  40  |       'input[type="search"], input[placeholder*="recherch"], input[placeholder*="Recherch"], input[name="search"], input[name="q"]'
  41  |     ).first();
  42  | 
  43  |     // Si la barre de recherche existe, elle doit etre visible
  44  |     const count = await searchInput.count();
  45  |     if (count > 0) {
  46  |       await expect(searchInput).toBeVisible({ timeout: TIMEOUT });
  47  |     }
  48  |     // Si pas de barre de recherche, le test passe quand meme
  49  |   });
  50  | 
  51  |   test('[UI-ETAB-004] Page details etablissement accessible via URL', async ({ page }) => {
  52  |     await page.goto(`${FRONTEND_URL}/etablissements`);
  53  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  54  | 
  55  |     // Chercher un lien vers un etablissement
  56  |     const lien = page.locator('a[href*="/etablissement"], a[href*="/etab"], .card a, .etablissement a').first();
  57  |     const count = await lien.count();
  58  | 
  59  |     if (count > 0) {
  60  |       await lien.click();
  61  |       await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  62  |       // Verifier qu'on est sur une page de detail
  63  |       expect(page.url()).toContain('etablissement');
  64  |     }
  65  |   });
  66  | });
  67  | 
  68  | // ─── Page d'accueil avec etablissements ──────────────────────────────────────
  69  | test.describe('IHM — Page d accueil et navigation', () => {
  70  | 
  71  |   test('[UI-ETAB-005] Page accueil chargee sans erreur', async ({ page }) => {
  72  |     const res = await page.goto(FRONTEND_URL);
  73  |     expect(res?.status()).toBeLessThan(400);
  74  |   });
  75  | 
  76  |   test('[UI-ETAB-006] Navigation vers page etablissements depuis accueil', async ({ page }) => {
> 77  |     await page.goto(FRONTEND_URL);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/
  78  | 
  79  |     // Chercher un lien de navigation vers etablissements
  80  |     const navLink = page.locator(
  81  |       'a[href*="etablissement"], nav a:has-text("etablissement"), nav a:has-text("Etablissement"), a:has-text("Trouver")'
  82  |     ).first();
  83  | 
  84  |     const count = await navLink.count();
  85  |     if (count > 0) {
  86  |       await navLink.click();
  87  |       await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  88  |       expect(page.url()).toMatch(/etablissement|service|recherch/i);
  89  |     }
  90  |   });
  91  | 
  92  |   test('[UI-ETAB-007] Pas d erreur JavaScript sur la page d accueil', async ({ page }) => {
  93  |     const errors = [];
  94  |     page.on('pageerror', err => errors.push(err.message));
  95  | 
  96  |     await page.goto(FRONTEND_URL);
  97  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  98  | 
  99  |     // Filtrer les erreurs critiques (exclure les warnings 404 d'assets)
  100 |     const criticalErrors = errors.filter(e =>
  101 |       !e.includes('favicon') &&
  102 |       !e.includes('404') &&
  103 |       !e.includes('net::ERR')
  104 |     );
  105 |     expect(criticalErrors).toHaveLength(0);
  106 |   });
  107 | 
  108 |   test('[UI-ETAB-008] Page responsive — viewport mobile fonctionne', async ({ page }) => {
  109 |     await page.setViewportSize({ width: 375, height: 812 });
  110 |     const res = await page.goto(FRONTEND_URL);
  111 |     expect(res?.status()).toBeLessThan(400);
  112 |     await expect(page.locator('body')).not.toBeEmpty();
  113 |   });
  114 | });
  115 | 
  116 | // ─── Page de prise de ticket citoyen ─────────────────────────────────────────
  117 | test.describe('IHM — File d attente (vue citoyen)', () => {
  118 | 
  119 |   test('[UI-ETAB-009] Page file d attente accessible (publique ou protegee)', async ({ page }) => {
  120 |     await page.goto(`${FRONTEND_URL}/file-attente`);
  121 |     // Soit la page charge, soit redirection login
  122 |     const url = page.url();
  123 |     const status = url.includes('login') || url.includes('file-attente') || url.includes('/');
  124 |     expect(status).toBe(true);
  125 |   });
  126 | 
  127 |   test('[UI-ETAB-010] Tentative acces dashboard citoyen non connecte → redirection', async ({ page }) => {
  128 |     await page.goto(`${FRONTEND_URL}/citoyen/dashboard`);
  129 |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  130 |     // Doit etre redirige vers login ou accueil
  131 |     const url = page.url();
  132 |     expect(url).toMatch(/login|accueil|\/$|citoyen/i);
  133 |   });
  134 | });
  135 | 
```