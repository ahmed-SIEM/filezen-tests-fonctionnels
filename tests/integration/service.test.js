/**
 * TESTS D'INTEGRATION — Module SERVICES
 * Couverture :
 *  - GET  /api/services/etablissement/:id  (liste publique)
 *  - GET  /api/services/:id                (details public)
 *  - GET  /api/services/:id/stats          (stats publiques)
 *  - GET  /api/services/me/services        (mes services - admin)
 *  - POST /api/services                    (creer service)
 *  - PUT  /api/services/:id                (modifier service)
 *  - DELETE /api/services/:id              (supprimer service)
 *  - PATCH /api/services/:id/toggle        (activer/desactiver)
 */

const request = require('supertest');
const db = require('../setup/db');
const { creerUtilisateur, genererToken, bearerToken, creerEtablissement } = require('../setup/helpers');

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
let admin, adminToken;
let citoyen, citoyenToken;
let etab;
let serviceId;

beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  admin = await creerUtilisateur({ email: 'admin@test.com', role: 'admin_etablissement' });
  etab = await creerEtablissement(admin._id);

  const User = require('../../Backend/src/models/User.model');
  await User.findByIdAndUpdate(admin._id, { etablissement_id: etab._id });
  admin = await User.findById(admin._id);
  adminToken = genererToken(admin);

  citoyen = await creerUtilisateur({ email: 'citoyen@test.com', role: 'citoyen' });
  citoyenToken = genererToken(citoyen);

  // Pre-creer un service pour les tests
  const resService = await request(app)
    .post('/api/services')
    .set('Authorization', bearerToken(adminToken))
    .send({ nom: 'Service Test', description: 'Description test', file_activee: true, rdv_active: false, nombre_guichets: 2 });
  serviceId = resService.body.data?._id;
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── GET /api/services/etablissement/:id ─────────────────────────────────────
describe('GET /api/services/etablissement/:id - Liste publique', () => {
  test('OK - Liste des services actifs retournee - 200', async () => {
    const res = await request(app).get(`/api/services/etablissement/${etab._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('OK - Route publique - aucun token requis', async () => {
    const res = await request(app).get(`/api/services/etablissement/${etab._id}`);
    expect(res.status).toBe(200);
  });

  test('OK - Etablissement inexistant retourne liste vide', async () => {
    const res = await request(app).get('/api/services/etablissement/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── GET /api/services/:id ────────────────────────────────────────────────────
describe('GET /api/services/:id - Details service', () => {
  test('OK - Details service retournes avec etablissement populate', async () => {
    const res = await request(app).get(`/api/services/${serviceId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('nom', 'Service Test');
    expect(res.body.data).toHaveProperty('etablissement');
  });

  test('FAIL - Service inexistant - 404', async () => {
    const res = await request(app).get('/api/services/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/services/:id/stats ─────────────────────────────────────────────
describe('GET /api/services/:id/stats - Stats publiques', () => {
  test('OK - Stats retournees avec compteurs file attente', async () => {
    const res = await request(app).get(`/api/services/${serviceId}/stats`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('nombre_en_attente');
    expect(res.body.data).toHaveProperty('temps_attente_estime');
    expect(res.body.data).toHaveProperty('guichets_actifs');
  });

  test('FAIL - Service inexistant - 404', async () => {
    const res = await request(app).get('/api/services/507f1f77bcf86cd799439011/stats');
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/services/me/services ───────────────────────────────────────────
describe('GET /api/services/me/services - Mes services (admin)', () => {
  test('OK - Admin voit ses services - 200', async () => {
    const res = await request(app)
      .get('/api/services/me/services')
      .set('Authorization', bearerToken(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('FAIL - Citoyen ne peut pas acceder - 403', async () => {
    const res = await request(app)
      .get('/api/services/me/services')
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).get('/api/services/me/services');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/services ───────────────────────────────────────────────────────
describe('POST /api/services - Creer service', () => {
  test('OK - Admin cree un service avec file - 201', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', bearerToken(adminToken))
      .send({ nom: 'Cardiologie', description: 'Consultations cardio', file_activee: true, rdv_active: false, nombre_guichets: 3 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('nom', 'Cardiologie');
    expect(res.body.data.nombre_guichets).toBe(3);
  });

  test('OK - Admin cree service RDV - 201', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', bearerToken(adminToken))
      .send({ nom: 'Medecine generale', file_activee: false, rdv_active: true });

    expect(res.status).toBe(201);
    expect(res.body.data.rdv_active).toBe(true);
  });

  test('FAIL - Citoyen ne peut pas creer un service - 403', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ nom: 'Service test' });
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .post('/api/services')
      .send({ nom: 'Service test' });
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/services/:id ────────────────────────────────────────────────────
describe('PUT /api/services/:id - Modifier service', () => {
  test('OK - Admin modifie son service - 200 + donnees mises a jour', async () => {
    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', bearerToken(adminToken))
      .send({ nom: 'Service Modifie', temps_traitement_moyen: 20 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nom).toBe('Service Modifie');
    expect(res.body.data.temps_traitement_moyen).toBe(20);
  });

  test('FAIL - Service appartenant a un autre etablissement - 404', async () => {
    const autreAdmin = await creerUtilisateur({ email: 'autre@test.com', role: 'admin_etablissement' });
    const autreEtab = await creerEtablissement(autreAdmin._id);
    const User = require('../../Backend/src/models/User.model');
    await User.findByIdAndUpdate(autreAdmin._id, { etablissement_id: autreEtab._id });
    const autreAdminFrais = await User.findById(autreAdmin._id);
    const autreToken = genererToken(autreAdminFrais);

    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', bearerToken(autreToken))
      .send({ nom: 'Tentative de vol' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/services/:id ─────────────────────────────────────────────────
describe('DELETE /api/services/:id - Supprimer service', () => {
  test('OK - Admin supprime son service - 200', async () => {
    const res = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifier que le service n'existe plus
    const verify = await request(app).get(`/api/services/${serviceId}`);
    expect(verify.status).toBe(404);
  });

  test('FAIL - Service inexistant - 404', async () => {
    const res = await request(app)
      .delete('/api/services/507f1f77bcf86cd799439011')
      .set('Authorization', bearerToken(adminToken));
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/services/:id/toggle ──────────────────────────────────────────
describe('PATCH /api/services/:id/toggle - Activer/Desactiver', () => {
  test('OK - Service actif devient inactif apres toggle', async () => {
    const res = await request(app)
      .patch(`/api/services/${serviceId}/toggle`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('inactif');
  });

  test('OK - Double toggle remet service actif', async () => {
    await request(app)
      .patch(`/api/services/${serviceId}/toggle`)
      .set('Authorization', bearerToken(adminToken));

    const res = await request(app)
      .patch(`/api/services/${serviceId}/toggle`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('actif');
  });
});
