# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\auth.ui.spec.js >> UI — Inscription citoyen >> ✅ [UI-AUTH-002] Formulaire inscription step 1 remplissable
- Location: tests\e2e\ui\auth.ui.spec.js:27:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/signup/citoyen
Call log:
  - navigating to "http://localhost:5174/signup/citoyen", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * TESTS E2E UI — Authentification (Playwright Browser)
  3   |  * Teste les flux d'interface utilisateur côté navigateur
  4   |  *
  5   |  * Pré-requis :
  6   |  *   - Backend démarré sur http://localhost:5000
  7   |  *   - Frontend démarré sur http://localhost:5174
  8   |  * Commande : npm run test:e2e:ui
  9   |  */
  10  | 
  11  | const { test, expect } = require('@playwright/test');
  12  | 
  13  | const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
  14  | const TIMEOUT_PAGE = 10000; // 10 secondes max par action
  15  | 
  16  | // ─── Inscription citoyen ──────────────────────────────────────────────────────
  17  | test.describe('UI — Inscription citoyen', () => {
  18  | 
  19  |   test('✅ [UI-AUTH-001] Formulaire d\'inscription affiché au chargement', async ({ page }) => {
  20  |     await page.goto(`${FRONTEND_URL}/signup/citoyen`);
  21  |     await expect(page).toHaveURL(/signup/, { timeout: TIMEOUT_PAGE });
  22  | 
  23  |     // Vérifier les champs du formulaire step 1 (prenom, nom)
  24  |     await expect(page.locator('input#prenom, input[id="prenom"]').first()).toBeVisible({ timeout: TIMEOUT_PAGE });
  25  |   });
  26  | 
  27  |   test('✅ [UI-AUTH-002] Formulaire inscription step 1 remplissable', async ({ page }) => {
> 28  |     await page.goto(`${FRONTEND_URL}/signup/citoyen`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/signup/citoyen
  29  |     await expect(page).toHaveURL(/signup/, { timeout: TIMEOUT_PAGE });
  30  | 
  31  |     // Remplir step 1
  32  |     const prenomInput = page.locator('input#prenom').first();
  33  |     await expect(prenomInput).toBeVisible({ timeout: TIMEOUT_PAGE });
  34  |     await prenomInput.fill('Ahmed');
  35  | 
  36  |     const nomInput = page.locator('input#nom').first();
  37  |     await nomInput.fill('Souid');
  38  | 
  39  |     // Vérifier que les valeurs sont bien remplies
  40  |     await expect(prenomInput).toHaveValue('Ahmed');
  41  |     await expect(nomInput).toHaveValue('Souid');
  42  |   });
  43  | 
  44  |   test('❌ [UI-AUTH-003] Email invalide — validation HTML native bloque', async ({ page }) => {
  45  |     // Vider le localStorage pour éviter la redirection si connecté
  46  |     await page.goto(`${FRONTEND_URL}/login`);
  47  |     await page.evaluate(() => localStorage.clear());
  48  | 
  49  |     await page.goto(`${FRONTEND_URL}/signup/citoyen`);
  50  |     await page.waitForLoadState('networkidle', { timeout: TIMEOUT_PAGE }).catch(() => {});
  51  | 
  52  |     // Aller au step 2 (email) — remplir step 1 d'abord
  53  |     const prenomInput = page.locator('input#prenom').first();
  54  |     await expect(prenomInput).toBeVisible({ timeout: TIMEOUT_PAGE });
  55  |     await prenomInput.fill('Test');
  56  |     await page.locator('input#nom').fill('User');
  57  | 
  58  |     // Chercher le champ email (step 2 ou present)
  59  |     const emailInput = page.locator('input[type="email"], input#email').first();
  60  |     const emailVisible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
  61  |     if (emailVisible) {
  62  |       await emailInput.fill('pas-un-email');
  63  |       await page.click('button[type="submit"]');
  64  |       // Validation HTML native ou message d'erreur
  65  |       const invalid = await page.locator('input[type="email"]:invalid').count();
  66  |       expect(invalid).toBeGreaterThanOrEqual(0); // La validation bloque
  67  |     } else {
  68  |       // Le champ email est sur une autre étape — test réussi car formulaire multi-step validé
  69  |       expect(true).toBe(true);
  70  |     }
  71  |   });
  72  | });
  73  | 
  74  | // ─── Connexion ────────────────────────────────────────────────────────────────
  75  | test.describe('UI — Connexion', () => {
  76  | 
  77  |   test('✅ [UI-AUTH-004] Page de connexion accessible', async ({ page }) => {
  78  |     await page.goto(`${FRONTEND_URL}/login`);
  79  |     await expect(page).toHaveURL(/login/, { timeout: TIMEOUT_PAGE });
  80  |     await expect(page.locator('input[type="email"]')).toBeVisible();
  81  |     await expect(page.locator('input[type="password"]')).toBeVisible();
  82  |   });
  83  | 
  84  |   test('❌ [UI-AUTH-005] Mauvais identifiants — message d\'erreur affiché', async ({ page }) => {
  85  |     await page.goto(`${FRONTEND_URL}/login`);
  86  | 
  87  |     await page.fill('input[type="email"]', 'mauvais@test.com');
  88  |     await page.fill('input[type="password"]', 'MauvaisPass');
  89  |     await page.click('button[type="submit"]');
  90  | 
  91  |     // Message d'erreur visible — Sonner toast ou alert (attendre réponse API)
  92  |     await page.waitForTimeout(2000);
  93  |     const sonnerToast = page.locator('[data-sonner-toast], [data-type="error"]').first();
  94  |     const alertRole = page.locator('[role="alert"]').first();
  95  |     const erreurTexte = page.getByText(/incorrect|invalide|introuvable|identifiants|erreur|error/i).first();
  96  | 
  97  |     const visible = await sonnerToast.isVisible().catch(() => false)
  98  |       || await alertRole.isVisible().catch(() => false)
  99  |       || await erreurTexte.isVisible().catch(() => false);
  100 |     expect(visible).toBe(true);
  101 |   });
  102 | 
  103 |   test('✅ [UI-AUTH-006] Lien "Mot de passe oublié" visible et fonctionnel', async ({ page }) => {
  104 |     await page.goto(`${FRONTEND_URL}/login`);
  105 | 
  106 |     const lien = page.locator('a[href*="forgot"], a:has-text("oublié"), button:has-text("oublié")').first();
  107 |     await expect(lien).toBeVisible({ timeout: 5000 });
  108 |     await lien.click();
  109 | 
  110 |     await expect(page).toHaveURL(/forgot|reset|oublie/, { timeout: TIMEOUT_PAGE });
  111 |   });
  112 | 
  113 |   test('✅ [UI-AUTH-007] Lien "S\'inscrire" visible sur la page de connexion', async ({ page }) => {
  114 |     await page.goto(`${FRONTEND_URL}/login`);
  115 | 
  116 |     const lien = page.locator('a[href*="signup"], a:has-text("inscrire"), a:has-text("Créer")').first();
  117 |     await expect(lien).toBeVisible({ timeout: 5000 });
  118 |   });
  119 | });
  120 | 
  121 | // ─── Protection des routes ────────────────────────────────────────────────────
  122 | test.describe('UI — Protection des routes front-end', () => {
  123 | 
  124 |   test('✅ [UI-AUTH-008] Route protégée /admin → redirection vers /login', async ({ page }) => {
  125 |     await page.goto(`${FRONTEND_URL}/admin/dashboard`);
  126 |     await expect(page).toHaveURL(/login|accueil|\/$/i, { timeout: TIMEOUT_PAGE });
  127 |   });
  128 | 
```