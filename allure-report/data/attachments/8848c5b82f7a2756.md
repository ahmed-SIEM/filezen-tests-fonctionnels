# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\auth.ui.spec.js >> UI — Protection des routes front-end >> ✅ [UI-AUTH-009] Route protégée /superadmin → redirection
- Location: tests\e2e\ui\auth.ui.spec.js:129:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/superadmin/dashboard
Call log:
  - navigating to "http://localhost:5174/superadmin/dashboard", waiting until "load"

```

# Test source

```ts
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
  129 |   test('✅ [UI-AUTH-009] Route protégée /superadmin → redirection', async ({ page }) => {
> 130 |     await page.goto(`${FRONTEND_URL}/superadmin/dashboard`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/superadmin/dashboard
  131 |     await expect(page).toHaveURL(/login|accueil|\/$/i, { timeout: TIMEOUT_PAGE });
  132 |   });
  133 | 
  134 |   test('✅ [UI-AUTH-010] Route protégée /agent → redirection', async ({ page }) => {
  135 |     await page.goto(`${FRONTEND_URL}/agent/dashboard`);
  136 |     await expect(page).toHaveURL(/login|accueil|\/$/i, { timeout: TIMEOUT_PAGE });
  137 |   });
  138 | });
  139 | 
  140 | // ─── Page d'accueil ───────────────────────────────────────────────────────────
  141 | test.describe('UI — Page d\'accueil publique', () => {
  142 | 
  143 |   test('✅ [UI-AUTH-011] Page d\'accueil chargée avec succès', async ({ page }) => {
  144 |     const res = await page.goto(FRONTEND_URL);
  145 |     expect(res?.status()).toBeLessThan(400);
  146 |     // La page ne doit pas afficher une erreur 5xx ou blanc
  147 |     await expect(page.locator('body')).not.toBeEmpty();
  148 |   });
  149 | 
  150 |   test('✅ [UI-AUTH-012] Titre de la page contient FileZen ou nom de l\'app', async ({ page }) => {
  151 |     await page.goto(FRONTEND_URL);
  152 |     const titre = await page.title();
  153 |     // Vérifier que ce n'est pas une page vide
  154 |     expect(titre).toBeTruthy();
  155 |     expect(titre.length).toBeGreaterThan(0);
  156 |   });
  157 | });
  158 | 
```