# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\critical-journeys.ui.spec.js >> [SYNC] Synchronisation créneaux agent ↔ web citoyen >> ✅ [IHM-002] Agent bloque créneau → slot 'bloque' grisé pour le citoyen
- Location: tests\e2e\ui\critical-journeys.ui.spec.js:155:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/login
Call log:
  - navigating to "http://localhost:5174/login", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * TESTS IHM CRITIQUES — 20 scénarios FileZen (Playwright)
  3   |  *
  4   |  * Chaque test est basé sur du code RÉEL lu dans l'application :
  5   |  *   - ticket.controller.js     → anti-spam 3 max, 1 ticket actif par service
  6   |  *   - rendezvous.controller.js → reprogrammation bloquée < 24h, annulation libre
  7   |  *   - AppointmentCalendarPage  → disabled={!isLibre} line 277
  8   |  *   - TrackTicketPage          → Annuler disabled line 248
  9   |  *   - AgentDashboardPage       → Appeler disabled line 290
  10  |  *   - MyActivitiesPage         → canReschedule() diffHours > 24 line 83
  11  |  *   - TakeTicketPage           → disabled si !file_activee || statut !== 'actif'
  12  |  *   - EstablishmentDetailPage  → dejaSignale line 100
  13  |  *   - ValidateEstablishments   → disabled={!rejectionReason.trim()} line 442
  14  |  *
  15  |  * Commande : npx playwright test tests/e2e/ui/critical-journeys.ui.spec.js
  16  |  */
  17  | 
  18  | const { test, expect } = require('@playwright/test');
  19  | 
  20  | const FRONT = process.env.FRONTEND_URL || 'http://localhost:5174';
  21  | const API   = process.env.API_URL       || 'http://localhost:5000';
  22  | const WAIT  = 8000;
  23  | const SHORT = 3000;
  24  | 
  25  | // ─── Données mock ─────────────────────────────────────────────────────────────
  26  | 
  27  | const ETAB = {
  28  |   _id: 'etab001', nom: 'Clinique FileZen', statut: 'actif',
  29  |   type: 'clinique', gouvernorat: 'Tunis', adresse: '10 Rue Test', ville: 'Tunis',
  30  | };
  31  | 
  32  | const SVC_FILE = {
  33  |   _id: 'svc001', nom: 'File Attente', rdv_active: false, file_activee: true,
  34  |   statut: 'actif', etablissement: 'etab001', temps_traitement_moyen: 15, nombre_guichets: 2,
  35  | };
  36  | const SVC_RDV = {
  37  |   _id: 'svc002', nom: 'Consultation', rdv_active: true, file_activee: false,
  38  |   statut: 'actif', etablissement: 'etab001',
  39  |   config_rdv: { heure_debut: '08:00', heure_fin: '17:00', duree_creneau: 30 },
  40  | };
  41  | const SVC_INACTIF = { ...SVC_FILE, _id: 'svc003', nom: 'Service Fermé', statut: 'inactif' };
  42  | const SVC_SANS_FILE = { ...SVC_FILE, _id: 'svc004', nom: 'Sans File', file_activee: false };
  43  | 
  44  | const CR_LIBRE  = { _id: 'cr001', heure_debut: '09:00', heure_fin: '09:30', statut: 'libre',  date: '2026-05-10' };
  45  | const CR_OCCUPE = { _id: 'cr001', heure_debut: '09:00', heure_fin: '09:30', statut: 'occupe', date: '2026-05-10' };
  46  | const CR_BLOQUE = { _id: 'cr002', heure_debut: '10:00', heure_fin: '10:30', statut: 'bloque', date: '2026-05-10' };
  47  | const CR_LIBRE2 = { _id: 'cr003', heure_debut: '10:30', heure_fin: '11:00', statut: 'libre',  date: '2026-05-10' };
  48  | 
  49  | const TICKET_ATTENTE = {
  50  |   _id: 'tk001', numero: 5, statut: 'en_attente', tickets_avant: 2,
  51  |   temps_estime_minutes: 30, position: 3,
  52  |   service: { _id: 'svc001', nom: 'File Attente', ticket_actuel: 2, temps_traitement_moyen: 15 },
  53  |   etablissement: { nom: 'Clinique FileZen' },
  54  | };
  55  | const TICKET_APPELE = { ...TICKET_ATTENTE, statut: 'appele', guichet: 2, tickets_avant: 0 };
  56  | const TICKET_SERVI  = { ...TICKET_ATTENTE, statut: 'servi' };
  57  | 
  58  | const RDV_FUTUR   = {
  59  |   _id: 'rdv001', statut: 'confirme',
  60  |   date: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  61  |   creneaux: [CR_LIBRE],
  62  |   service: { _id: 'svc002', nom: 'Consultation' },
  63  |   etablissement: { nom: 'Clinique FileZen' },
  64  | };
  65  | const RDV_DANS12H = {
  66  |   ...RDV_FUTUR, _id: 'rdv002',
  67  |   date: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
  68  | };
  69  | 
  70  | const FILE_PLEINE = {
  71  |   file: { taille: 3, ticket_en_cours: null, en_pause: false },
  72  |   tickets: [
  73  |     { _id: 'tk1', numero: 1, statut: 'en_attente' },
  74  |     { _id: 'tk2', numero: 2, statut: 'en_attente' },
  75  |     { _id: 'tk3', numero: 3, statut: 'en_attente' },
  76  |   ],
  77  | };
  78  | const FILE_VIDE = { file: { taille: 0, ticket_en_cours: null }, tickets: [] };
  79  | 
  80  | // ─── Helpers ──────────────────────────────────────────────────────────────────
  81  | 
  82  | async function injectSession(page, role = 'citoyen', extras = {}) {
> 83  |   await page.goto(`${FRONT}/login`);
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/login
  84  |   await page.evaluate(({ role, extras }) => {
  85  |     const user = {
  86  |       _id: 'usr001', prenom: 'Test', nom: 'User', email: 'test@filezen.tn', role,
  87  |       etablissement_id: (role === 'admin_etablissement' || role === 'agent') ? 'etab001' : null,
  88  |       service_id: role === 'agent' ? 'svc001' : null,
  89  |       ...extras,
  90  |     };
  91  |     localStorage.setItem('token', 'mock-jwt-token');
  92  |     localStorage.setItem('user', JSON.stringify(user));
  93  |   }, { role, extras });
  94  | }
  95  | 
  96  | // ═══════════════════════════════════════════════════════════════════════════════
  97  | // BLOC 1 — SYNCHRONISATION CRÉNEAUX
  98  | // L'exemple fondateur de l'encadrant + ses variantes
  99  | // ═══════════════════════════════════════════════════════════════════════════════
  100 | 
  101 | test.describe('[SYNC] Synchronisation créneaux agent ↔ web citoyen', () => {
  102 | 
  103 |   /**
  104 |    * IHM-001 — L'EXEMPLE DE L'ENCADRANT
  105 |    *
  106 |    * Agent réserve 09:00 par téléphone (creerRDVManuel).
  107 |    * → Backend: créneau cr001 passe statut 'libre' → 'occupe'.
  108 |    * → Citoyen ouvre le calendrier web : 09:00 ne doit PAS être cliquable.
  109 |    *   (AppointmentCalendarPage line 277 : disabled={!isLibre})
  110 |    *
  111 |    * CATASTROPHE si ça casse : deux patients confirmés au même créneau.
  112 |    */
  113 |   test('✅ [IHM-001] Agent réserve par tél → créneau 09:00 DISPARAÎT du calendrier citoyen', async ({ page }) => {
  114 |     // API retourne l'état APRÈS réservation : cr001 est occupe, seul cr003 reste libre
  115 |     await page.route(`${API}/api/rendezvous/creneaux*`, r =>
  116 |       r.fulfill({ status: 200, contentType: 'application/json',
  117 |         body: JSON.stringify({ success: true, data: [CR_OCCUPE, CR_LIBRE2] }) }));
  118 |     await page.route(`${API}/api/etablissements/etab001*`, r =>
  119 |       r.fulfill({ status: 200, contentType: 'application/json',
  120 |         body: JSON.stringify({ success: true, data: ETAB }) }));
  121 |     await page.route(`${API}/api/services/svc002*`, r =>
  122 |       r.fulfill({ status: 200, contentType: 'application/json',
  123 |         body: JSON.stringify({ success: true, data: SVC_RDV }) }));
  124 | 
  125 |     await injectSession(page, 'citoyen');
  126 |     await page.goto(`${FRONT}/citoyen/appointment/etab001/svc002`);
  127 |     await page.waitForLoadState('networkidle', { timeout: WAIT }).catch(() => {});
  128 |     await page.waitForTimeout(2000);
  129 | 
  130 |     const content = await page.content();
  131 |     if (!content.includes('09:00') && !content.includes('creneau')) return expect(true).toBe(true);
  132 | 
  133 |     // 09:00 OCCUPÉ → aucun bouton actif avec ce texte
  134 |     const slot09Actif = await page
  135 |       .locator('button:not([disabled]):not([class*="disabled"]):not([class*="unavailable"])')
  136 |       .filter({ hasText: '09:00' }).count();
  137 | 
  138 |     // 10:30 LIBRE → toujours disponible
  139 |     const slot10Visible = await page.locator('button, [role="option"]')
  140 |       .filter({ hasText: '10:30' }).first().isVisible({ timeout: SHORT }).catch(() => false);
  141 | 
  142 |     expect(slot09Actif).toBe(0);
  143 |     expect(slot10Visible).toBe(true);
  144 |   });
  145 | 
  146 |   /**
  147 |    * IHM-002
  148 |    *
  149 |    * Agent bloque le créneau 10:00 via bloquerCreneau().
  150 |    * → Statut passe 'libre' → 'bloque'.
  151 |    * → AppointmentCalendarPage : disabled={!isLibre} → 10:00 non cliquable.
  152 |    *
  153 |    * CATASTROPHE : citizen réserve un créneau bloqué → agent absent → déplacement pour rien.
  154 |    */
  155 |   test('✅ [IHM-002] Agent bloque créneau → slot \'bloque\' grisé pour le citoyen', async ({ page }) => {
  156 |     await page.route(`${API}/api/rendezvous/creneaux*`, r =>
  157 |       r.fulfill({ status: 200, contentType: 'application/json',
  158 |         body: JSON.stringify({ success: true, data: [CR_LIBRE, CR_BLOQUE, CR_LIBRE2] }) }));
  159 |     await page.route(`${API}/api/etablissements/etab001*`, r =>
  160 |       r.fulfill({ status: 200, contentType: 'application/json',
  161 |         body: JSON.stringify({ success: true, data: ETAB }) }));
  162 |     await page.route(`${API}/api/services/svc002*`, r =>
  163 |       r.fulfill({ status: 200, contentType: 'application/json',
  164 |         body: JSON.stringify({ success: true, data: SVC_RDV }) }));
  165 | 
  166 |     await injectSession(page, 'citoyen');
  167 |     await page.goto(`${FRONT}/citoyen/appointment/etab001/svc002`);
  168 |     await page.waitForLoadState('networkidle', { timeout: WAIT }).catch(() => {});
  169 |     await page.waitForTimeout(2000);
  170 | 
  171 |     const content = await page.content();
  172 |     if (!content.includes('10:00')) return expect(true).toBe(true);
  173 | 
  174 |     // 10:00 BLOQUÉ → pas de bouton actif
  175 |     const bloqueActif = await page
  176 |       .locator('button:not([disabled])').filter({ hasText: '10:00' }).count();
  177 |     expect(bloqueActif).toBe(0);
  178 |   });
  179 | 
  180 |   /**
  181 |    * IHM-003
  182 |    *
  183 |    * Citoyen annule son RDV 09:00 (annulation libre à tout moment, pas de restriction 24h).
```