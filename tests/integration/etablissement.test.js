/**
 * TESTS D'INTÉGRATION — Module ETABLISSEMENT
 * Teste le cycle de vie complet d'un établissement
 *
 * Couverture :
 *  - GET  /api/etablissements              (liste publique)
 *  - GET  /api/etablissements/en-attente   (super admin)
 *  - PUT  /api/etablissements/:id/valider  (approbation)
 *  - PUT  /api/etablissements/:id/rejeter  (rejet)
 *  - PUT  /api/etablissements/:id/suspendre
 *  - PUT  /api/etablissements/:id/activer
 *  - POST /api/etablissements/:id/signaler (signalement citoyen)
 */

const request = require('supertest');
const db = require('../setup/db');
const {
  creerUtilisateur,
  genererToken,
  bearerToken,
  creerEtablissement,
} = require('../setup/helpers');

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn(),
  })),
}));
jest.mock('../../Backend/src/utils/email', () => ({
  sendVerificationCodeEmail: jest.fn().mockResolvedValue(true),
  sendApprovalEmail: jest.fn().mockResolvedValue(true),
  sendRejectionEmail: jest.fn().mockResolvedValue(true),
  sendSuspensionEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendRdvConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendRdvReminderEmail: jest.fn().mockResolvedValue(true),
  sendRdvCancellationEmail: jest.fn().mockResolvedValue(true),
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
let etabActif, etabEnAttente;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  superAdmin = await creerUtilisateur({
    email: 'superadmin@test.com',
    role: 'super_admin',
  });
  superAdminToken = genererToken(superAdmin);

  admin = await creerUtilisateur({
    email: 'admin@test.com',
    role: 'admin_etablissement',
  });
  adminToken = genererToken(admin);

  citoyen = await creerUtilisateur({
    email: 'citoyen@test.com',
    role: 'citoyen',
  });
  citoyenToken = genererToken(citoyen);

  etabActif = await creerEtablissement(admin._id, { statut: 'actif' });
  etabEnAttente = await creerEtablissement(admin._id, {
    statut: 'en_attente',
    nom: 'Etab En Attente',
    email_etablissement: 'attente@test.com',
  });

  // Mettre à jour l'admin avec l'etabId
  const User = require('../../Backend/src/models/User.model');
  await User.findByIdAndUpdate(admin._id, { etablissement_id: etabActif._id });
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── GET /api/etablissements ──────────────────────────────────────────────────
describe('GET /api/etablissements — Liste publique', () => {
  test('✅ Liste publique retourne uniquement les établissements actifs', async () => {
    const res = await request(app).get('/api/etablissements');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statuts = res.body.data.map((e) => e.statut);
    statuts.forEach((s) => expect(s).toBe('actif'));
  });

  test('✅ Filtre par type fonctionne', async () => {
    const res = await request(app)
      .get('/api/etablissements')
      .query({ type: 'clinique' });

    expect(res.status).toBe(200);
    const types = res.body.data.map((e) => e.type);
    types.forEach((t) => expect(t).toBe('clinique'));
  });

  test('✅ Route publique — pas de token requis', async () => {
    const res = await request(app).get('/api/etablissements');
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/etablissements/en-attente ───────────────────────────────────────
describe('GET /api/etablissements/en-attente — Super Admin', () => {
  test('✅ Super admin voit les demandes en attente', async () => {
    const res = await request(app)
      .get('/api/etablissements/en-attente')
      .set('Authorization', bearerToken(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statuts = res.body.data.map((e) => e.statut);
    statuts.forEach((s) => expect(s).toBe('en_attente'));
  });

  test('❌ Citoyen ne peut pas accéder aux demandes en attente → 403', async () => {
    const res = await request(app)
      .get('/api/etablissements/en-attente')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(403);
  });

  test('❌ Sans token → 401', async () => {
    const res = await request(app).get('/api/etablissements/en-attente');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/etablissements/:id/valider ─────────────────────────────────────
describe('PUT /api/etablissements/:id/valider — Approbation', () => {
  test('✅ Super admin approuve un établissement en_attente → statut actif', async () => {
    const res = await request(app)
      .put(`/api/etablissements/${etabEnAttente._id}/valider`)
      .set('Authorization', bearerToken(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statut).toBe('actif');
  });

  test("OK - Email d'approbation envoye", async () => {
    const { sendApprovalEmail } = require('../../Backend/src/utils/email');

    await request(app)
      .put(`/api/etablissements/${etabEnAttente._id}/valider`)
      .set('Authorization', bearerToken(superAdminToken));

    expect(sendApprovalEmail).toHaveBeenCalled();
  });

  test('❌ Citoyen ne peut pas approuver → 403', async () => {
    const res = await request(app)
      .put(`/api/etablissements/${etabEnAttente._id}/valider`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/etablissements/:id/rejeter ─────────────────────────────────────
describe('PUT /api/etablissements/:id/rejeter — Rejet', () => {
  test('✅ Rejet avec motif → statut = rejete + motif sauvegardé', async () => {
    const res = await request(app)
      .put(`/api/etablissements/${etabEnAttente._id}/rejeter`)
      .set('Authorization', bearerToken(superAdminToken))
      .send({ raison: 'Documents insuffisants' });

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('rejete');
    expect(res.body.data.raison_rejet).toBe('Documents insuffisants');
  });

  test('✅ Email de rejet envoyé', async () => {
    const { sendRejectionEmail } = require('../../Backend/src/utils/email');

    await request(app)
      .put(`/api/etablissements/${etabEnAttente._id}/rejeter`)
      .set('Authorization', bearerToken(superAdminToken))
      .send({ raison: 'Documents insuffisants' });

    expect(sendRejectionEmail).toHaveBeenCalled();
  });
});

// ─── PUT /api/etablissements/:id/suspendre ────────────────────────────────────
describe('PUT /api/etablissements/:id/suspendre — Suspension', () => {
  test('✅ Établissement actif suspendu → statut = suspendu', async () => {
    const res = await request(app)
      .put(`/api/etablissements/${etabActif._id}/suspendre`)
      .set('Authorization', bearerToken(superAdminToken))
      .send({ raison: 'Signalements multiples' });

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('suspendu');
  });

  test('✅ Établissement suspendu absent de la liste publique', async () => {
    // Suspendre
    await request(app)
      .put(`/api/etablissements/${etabActif._id}/suspendre`)
      .set('Authorization', bearerToken(superAdminToken))
      .send({ raison: 'Test suspension' });

    // Vérifier liste publique
    const res = await request(app).get('/api/etablissements');
    const ids = res.body.data.map((e) => e._id.toString());
    expect(ids).not.toContain(etabActif._id.toString());
  });

  test('❌ Citoyen ne peut pas suspendre → 403', async () => {
    const res = await request(app)
      .put(`/api/etablissements/${etabActif._id}/suspendre`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/etablissements/:id/signaler ────────────────────────────────────
describe('POST /api/etablissements/:id/signaler — Signalement citoyen', () => {
  test('✅ Citoyen signale un établissement → 200', async () => {
    const res = await request(app)
      .post(`/api/etablissements/${etabActif._id}/signaler`)
      .set('Authorization', bearerToken(citoyenToken))
      .send({ raison: 'service_mediocre', commentaire: 'Service vraiment mauvais' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('❌ Citoyen signale deux fois le même établissement → 400', async () => {
    await request(app)
      .post(`/api/etablissements/${etabActif._id}/signaler`)
      .set('Authorization', bearerToken(citoyenToken))
      .send({ raison: 'service_mediocre' });

    const res2 = await request(app)
      .post(`/api/etablissements/${etabActif._id}/signaler`)
      .set('Authorization', bearerToken(citoyenToken))
      .send({ raison: 'attente_excessive' });

    expect(res2.status).toBe(400);
  });

  test('❌ Sans authentification → 401', async () => {
    const res = await request(app)
      .post(`/api/etablissements/${etabActif._id}/signaler`)
      .send({ raison: 'service_mediocre' });

    expect(res.status).toBe(401);
  });

  test('✅ Alerte super admin déclenchée à 5 signalements', async () => {
    const { creerNotification } = require('../../Backend/src/utils/notification');

    // Créer 5 citoyens différents et signaler
    for (let i = 1; i <= 5; i++) {
      const cit = await creerUtilisateur({
        email: `citoyen${i}@test.com`,
        role: 'citoyen',
      });
      const tok = genererToken(cit);
      await request(app)
        .post(`/api/etablissements/${etabActif._id}/signaler`)
        .set('Authorization', bearerToken(tok))
        .send({ raison: 'service_mediocre' });
    }

    // La notification d'alerte doit avoir été créée
    expect(creerNotification).toHaveBeenCalled();
  });
});
