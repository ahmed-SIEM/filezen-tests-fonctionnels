/**
 * TESTS D'INTEGRATION — Module STATISTIQUES
 * Couverture :
 *  - GET /api/stats/etablissement/:id/dashboard  (admin dashboard)
 *  - GET /api/stats/plateforme/dashboard          (super admin)
 *  - GET /api/stats/etablissement/:id             (stats detaillees)
 */

const request = require('supertest');
const db = require('../setup/db');
const { creerUtilisateur, genererToken, bearerToken, creerEtablissement, creerService } = require('../setup/helpers');

jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
  emitQueueUpdate: jest.fn(),
  emitTicketCalled: jest.fn(),
}));
jest.mock('../../Backend/src/utils/email', () => ({
  sendVerificationCodeEmail: jest.fn().mockResolvedValue(true),
  sendApprovalEmail: jest.fn().mockResolvedValue(true),
  sendRejectionEmail: jest.fn().mockResolvedValue(true),
  sendSuspensionEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendAgentInviteEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../Backend/src/utils/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(true),
  getClient: jest.fn(() => null),
}));
jest.mock('../../Backend/src/utils/notification', () => ({
  creerNotification: jest.fn().mockResolvedValue(true),
  envoyerNotificationTempsReel: jest.fn().mockResolvedValue(true),
}));

process.env.JWT_SECRET = 'filezen_test_secret_jwt_2026';

let app;
let superAdmin, superAdminToken;
let admin, adminToken;
let citoyen, citoyenToken;
let etab;

beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  const User = require('../../Backend/src/models/User.model');

  superAdmin = await creerUtilisateur({ email: 'superadmin@test.com', role: 'super_admin' });
  superAdminToken = genererToken(superAdmin);

  admin = await creerUtilisateur({ email: 'admin@test.com', role: 'admin_etablissement' });
  etab = await creerEtablissement(admin._id, { statut: 'actif' });
  await User.findByIdAndUpdate(admin._id, { etablissement_id: etab._id });
  admin = await User.findById(admin._id);
  adminToken = genererToken(admin);

  citoyen = await creerUtilisateur({ email: 'citoyen@test.com', role: 'citoyen' });
  citoyenToken = genererToken(citoyen);

  // Creer quelques services pour avoir des stats non nulles
  await creerService(etab._id, { statut: 'actif', file_activee: true });
  await creerService(etab._id, { nom: 'Service RDV', statut: 'actif', rdv_active: true });
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── GET /api/stats/etablissement/:id/dashboard ───────────────────────────────
describe('GET /api/stats/etablissement/:id/dashboard - Dashboard admin', () => {
  test('OK - Admin voit son dashboard - 200 avec tous les compteurs', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}/dashboard`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tickets_aujourdhui');
    expect(res.body.data).toHaveProperty('rdv_aujourdhui');
    expect(res.body.data).toHaveProperty('services_actifs');
    expect(res.body.data).toHaveProperty('agents_actifs');
    expect(res.body.data).toHaveProperty('temps_attente_moyen');
    expect(res.body.data).toHaveProperty('satisfaction');
    // Verifier les valeurs numeriques
    expect(typeof res.body.data.tickets_aujourdhui).toBe('number');
    expect(res.body.data.services_actifs).toBe(2);
  });

  test('FAIL - Admin essaie de voir le dashboard d un autre etablissement - 403', async () => {
    const autreAdmin = await creerUtilisateur({ email: 'autre@test.com', role: 'admin_etablissement' });
    const autreEtab = await creerEtablissement(autreAdmin._id, { statut: 'actif' });
    const User = require('../../Backend/src/models/User.model');
    await User.findByIdAndUpdate(autreAdmin._id, { etablissement_id: autreEtab._id });
    const autreAdminFrais = await User.findById(autreAdmin._id);
    const autreToken = genererToken(autreAdminFrais);

    // autreAdmin essaie de voir le dashboard de etab
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}/dashboard`)
      .set('Authorization', bearerToken(autreToken));

    expect(res.status).toBe(403);
  });

  test('FAIL - Citoyen ne peut pas voir le dashboard - 403', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}/dashboard`)
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}/dashboard`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/stats/plateforme/dashboard ──────────────────────────────────────
describe('GET /api/stats/plateforme/dashboard - Dashboard super admin', () => {
  test('OK - Super admin voit les stats plateforme - 200', async () => {
    const res = await request(app)
      .get('/api/stats/plateforme/dashboard')
      .set('Authorization', bearerToken(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_etablissements');
    expect(res.body.data).toHaveProperty('citoyens_inscrits');
    expect(res.body.data).toHaveProperty('tickets_aujourd_hui');
    // Au moins 1 etablissement actif (cree en beforeEach)
    expect(res.body.data.total_etablissements).toBeGreaterThanOrEqual(1);
  });

  test('FAIL - Admin etablissement ne peut pas voir stats plateforme - 403', async () => {
    const res = await request(app)
      .get('/api/stats/plateforme/dashboard')
      .set('Authorization', bearerToken(adminToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Citoyen ne peut pas voir stats plateforme - 403', async () => {
    const res = await request(app)
      .get('/api/stats/plateforme/dashboard')
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).get('/api/stats/plateforme/dashboard');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/stats/etablissement/:id - Stats detaillees ─────────────────────
describe('GET /api/stats/etablissement/:id - Stats detaillees', () => {
  test('OK - Admin voit les stats detaillees de son etablissement - 200', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('FAIL - Citoyen ne peut pas voir les stats - 403', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}`)
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .get(`/api/stats/etablissement/${etab._id}`);
    expect(res.status).toBe(401);
  });
});
