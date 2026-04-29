# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\dashboard.ui.spec.js >> IHM — Dashboard Admin Etablissement (acces non autorise) >> [UI-DASH-001] /admin/dashboard non connecte → redirection login
- Location: tests\e2e\ui\dashboard.ui.spec.js:19:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/admin/dashboard
Call log:
  - navigating to "http://localhost:5174/admin/dashboard", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * TESTS E2E IHM — Dashboards et interfaces admin (Playwright Browser)
  3   |  * Teste les acces aux dashboards et la navigation admin
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
  16  | // ─── Dashboards proteges (admin etablissement) ───────────────────────────────
  17  | test.describe('IHM — Dashboard Admin Etablissement (acces non autorise)', () => {
  18  | 
  19  |   test('[UI-DASH-001] /admin/dashboard non connecte → redirection login', async ({ page }) => {
> 20  |     await page.goto(`${FRONTEND_URL}/admin/dashboard`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/admin/dashboard
  21  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  22  |     const url = page.url();
  23  |     expect(url).toMatch(/login|\/$|accueil/i);
  24  |   });
  25  | 
  26  |   test('[UI-DASH-002] /admin/services non connecte → redirection', async ({ page }) => {
  27  |     await page.goto(`${FRONTEND_URL}/admin/services`);
  28  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  29  |     const url = page.url();
  30  |     expect(url).toMatch(/login|\/$|accueil/i);
  31  |   });
  32  | 
  33  |   test('[UI-DASH-003] /admin/agents non connecte → redirection', async ({ page }) => {
  34  |     await page.goto(`${FRONTEND_URL}/admin/agents`);
  35  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  36  |     const url = page.url();
  37  |     expect(url).toMatch(/login|\/$|accueil/i);
  38  |   });
  39  | 
  40  |   test('[UI-DASH-004] /admin/stats non connecte → redirection', async ({ page }) => {
  41  |     await page.goto(`${FRONTEND_URL}/admin/stats`);
  42  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  43  |     const url = page.url();
  44  |     expect(url).toMatch(/login|\/$|accueil/i);
  45  |   });
  46  | });
  47  | 
  48  | // ─── Dashboard Super Admin ────────────────────────────────────────────────────
  49  | test.describe('IHM — Dashboard Super Admin (acces non autorise)', () => {
  50  | 
  51  |   test('[UI-DASH-005] /superadmin/dashboard non connecte → redirection', async ({ page }) => {
  52  |     await page.goto(`${FRONTEND_URL}/superadmin/dashboard`);
  53  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  54  |     const url = page.url();
  55  |     expect(url).toMatch(/login|\/$|accueil/i);
  56  |   });
  57  | 
  58  |   test('[UI-DASH-006] /superadmin/establishments non connecte → redirection', async ({ page }) => {
  59  |     await page.goto(`${FRONTEND_URL}/superadmin/establishments`);
  60  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  61  |     const url = page.url();
  62  |     expect(url).toMatch(/login|\/$|accueil/i);
  63  |   });
  64  | 
  65  |   test('[UI-DASH-007] /superadmin/validate non connecte → redirection', async ({ page }) => {
  66  |     await page.goto(`${FRONTEND_URL}/superadmin/validate`);
  67  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  68  |     const url = page.url();
  69  |     expect(url).toMatch(/login|\/$|accueil/i);
  70  |   });
  71  | });
  72  | 
  73  | // ─── Dashboard Citoyen ────────────────────────────────────────────────────────
  74  | test.describe('IHM — Dashboard Citoyen (acces non autorise)', () => {
  75  | 
  76  |   test('[UI-DASH-008] /citoyen/dashboard non connecte → redirection', async ({ page }) => {
  77  |     await page.goto(`${FRONTEND_URL}/citoyen/dashboard`);
  78  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  79  |     const url = page.url();
  80  |     expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  81  |   });
  82  | 
  83  |   test('[UI-DASH-009] /citoyen/mes-rdv non connecte → redirection', async ({ page }) => {
  84  |     await page.goto(`${FRONTEND_URL}/citoyen/mes-rdv`);
  85  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  86  |     const url = page.url();
  87  |     expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  88  |   });
  89  | 
  90  |   test('[UI-DASH-010] /citoyen/notifications non connecte → redirection', async ({ page }) => {
  91  |     await page.goto(`${FRONTEND_URL}/citoyen/notifications`);
  92  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  93  |     const url = page.url();
  94  |     expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  95  |   });
  96  | });
  97  | 
  98  | // ─── Formulaire inscription etablissement ───────────────────────────────────
  99  | test.describe('IHM — Inscription etablissement', () => {
  100 | 
  101 |   test('[UI-DASH-011] Page inscription etablissement accessible', async ({ page }) => {
  102 |     await page.goto(`${FRONTEND_URL}/signup/etablissement`);
  103 |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  104 |     // La page doit charger (meme si elle redirige)
  105 |     const body = page.locator('body');
  106 |     await expect(body).not.toBeEmpty();
  107 |   });
  108 | 
  109 |   test('[UI-DASH-012] Formulaire inscription etab contient champs nom et email', async ({ page }) => {
  110 |     await page.goto(`${FRONTEND_URL}/signup/etablissement`);
  111 |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  112 | 
  113 |     const emailField = page.locator('input[type="email"], input[name="email_etablissement"]').first();
  114 |     const count = await emailField.count();
  115 |     if (count > 0) {
  116 |       await expect(emailField).toBeVisible({ timeout: TIMEOUT });
  117 |     }
  118 |   });
  119 | });
  120 | 
```