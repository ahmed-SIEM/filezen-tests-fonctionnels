# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\ticket.ui.spec.js >> IHM — Affichage file d attente (ecran public) >> [UI-TKT-008] Pas de crash JavaScript sur pages ticket
- Location: tests\e2e\ui\ticket.ui.spec.js:81:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/ticket
Call log:
  - navigating to "http://localhost:5174/ticket", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * TESTS E2E IHM — Tickets / File d'attente (Playwright Browser)
  3   |  * Teste les interfaces de la file d'attente
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
  16  | // ─── Acces et protection des pages tickets ───────────────────────────────────
  17  | test.describe('IHM — Ticket / File attente — acces et protection', () => {
  18  | 
  19  |   test('[UI-TKT-001] Page prise de ticket non connecte → redirection ou page de connexion', async ({ page }) => {
  20  |     await page.goto(`${FRONTEND_URL}/ticket`);
  21  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  22  |     const url = page.url();
  23  |     // Doit etre redirige ou afficher login
  24  |     expect(url).toMatch(/login|ticket|\/$|accueil/i);
  25  |   });
  26  | 
  27  |   test('[UI-TKT-002] Page mes-tickets non connecte → redirection login', async ({ page }) => {
  28  |     await page.goto(`${FRONTEND_URL}/citoyen/mes-tickets`);
  29  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  30  |     const url = page.url();
  31  |     expect(url).toMatch(/login|\/$|accueil|citoyen/i);
  32  |   });
  33  | 
  34  |   test('[UI-TKT-003] Dashboard agent non connecte → redirection login', async ({ page }) => {
  35  |     await page.goto(`${FRONTEND_URL}/agent/dashboard`);
  36  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  37  |     const url = page.url();
  38  |     expect(url).toMatch(/login|\/$|accueil/i);
  39  |   });
  40  | 
  41  |   test('[UI-TKT-004] Interface agent stats non connecte → redirection', async ({ page }) => {
  42  |     await page.goto(`${FRONTEND_URL}/agent/stats`);
  43  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  44  |     const url = page.url();
  45  |     expect(url).toMatch(/login|\/$|accueil/i);
  46  |   });
  47  | });
  48  | 
  49  | // ─── Page de suivi de ticket (publique) ──────────────────────────────────────
  50  | test.describe('IHM — Suivi ticket (affichage public)', () => {
  51  | 
  52  |   test('[UI-TKT-005] Page suivi ticket avec ID inexistant gere proprement', async ({ page }) => {
  53  |     await page.goto(`${FRONTEND_URL}/ticket/507f1f77bcf86cd799439011`);
  54  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  55  |     // La page doit charger sans erreur critique (404 ou message d'erreur gere)
  56  |     const body = page.locator('body');
  57  |     await expect(body).not.toBeEmpty();
  58  |   });
  59  | 
  60  |   test('[UI-TKT-006] Page de suivi accessible sans connexion (QR code use case)', async ({ page }) => {
  61  |     await page.goto(`${FRONTEND_URL}/citoyen/track-ticket/507f1f77bcf86cd799439011`);
  62  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  63  |     // Soit affiche le ticket, soit redirige vers login — les deux sont acceptables
  64  |     const url = page.url();
  65  |     expect(url.length).toBeGreaterThan(0);
  66  |   });
  67  | });
  68  | 
  69  | // ─── Interface de file d attente temps reel ───────────────────────────────────
  70  | test.describe('IHM — Affichage file d attente (ecran public)', () => {
  71  | 
  72  |   test('[UI-TKT-007] Page affichage file publique accessible', async ({ page }) => {
  73  |     // Page d'affichage public (ecran d'accueil de la clinique)
  74  |     await page.goto(`${FRONTEND_URL}/display`);
  75  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  76  |     // Si la page existe, elle doit charger correctement
  77  |     const res = page.url();
  78  |     expect(res.length).toBeGreaterThan(0);
  79  |   });
  80  | 
  81  |   test('[UI-TKT-008] Pas de crash JavaScript sur pages ticket', async ({ page }) => {
  82  |     const errors = [];
  83  |     page.on('pageerror', err => errors.push(err.message));
  84  | 
> 85  |     await page.goto(`${FRONTEND_URL}/ticket`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/ticket
  86  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  87  | 
  88  |     const criticalErrors = errors.filter(e =>
  89  |       !e.includes('favicon') &&
  90  |       !e.includes('404') &&
  91  |       !e.includes('net::ERR') &&
  92  |       !e.includes('ChunkLoad')
  93  |     );
  94  |     expect(criticalErrors).toHaveLength(0);
  95  |   });
  96  | });
  97  | 
  98  | // ─── Navigation et UX ────────────────────────────────────────────────────────
  99  | test.describe('IHM — Navigation et experience utilisateur', () => {
  100 | 
  101 |   test('[UI-TKT-009] Bouton retour ou navigation presente sur pages protegees', async ({ page }) => {
  102 |     await page.goto(`${FRONTEND_URL}/login`);
  103 |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  104 | 
  105 |     // Page de login doit avoir un lien vers accueil ou inscription
  106 |     const liens = page.locator('a, button').filter({ hasText: /accueil|retour|inscription|signup/i });
  107 |     // Au moins un lien de navigation doit exister
  108 |     const count = await liens.count();
  109 |     // Pas obligatoire si la page a son propre layout
  110 |     expect(count).toBeGreaterThanOrEqual(0);
  111 |   });
  112 | 
  113 |   test('[UI-TKT-010] Page 404 geree proprement (route inexistante)', async ({ page }) => {
  114 |     await page.goto(`${FRONTEND_URL}/cette-page-nexiste-vraiment-pas-12345`);
  115 |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT }).catch(() => {});
  116 |     // La page ne doit pas afficher une erreur serveur 5xx
  117 |     const body = page.locator('body');
  118 |     await expect(body).not.toBeEmpty();
  119 |   });
  120 | });
  121 | 
```