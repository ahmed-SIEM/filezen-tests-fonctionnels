/**
 * TESTS D'INTEGRATION — Module TICKETS
 * Teste les endpoints API de gestion de la file d'attente
 *
 * Couverture :
 *  - POST /api/tickets                    (prise de ticket citoyen)
 *  - POST /api/tickets/agent/appeler      (agent appelle prochain)
 *  - PUT  /api/tickets/agent/:id/servi    (ticket servi)
 *  - PUT  /api/tickets/agent/:id/absent   (ticket no_show)
 */

const request = require('supertest');
const db = require('../setup/db');
const {
  creerUtilisateur,
  genererToken,
  bearerToken,
  creerEtablissement,
  creerService,
} = require('../setup/helpers');

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn(),
  })),
  emitQueueUpdate: jest.fn(),
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
  sendQueueBientotVotreTour: jest.fn().mockResolvedValue(true),
  getClient: jest.fn(() => null),
}));
jest.mock('../../Backend/src/utils/notification', () => ({
  creerNotification: jest.fn().mockResolvedValue(true),
  envoyerNotificationTempsReel: jest.fn().mockResolvedValue(true),
}));

process.env.JWT_SECRET = 'filezen_test_secret_jwt_2026';

let app;
let citoyen, citoyenToken;
let agent, agentToken;
let etab, service;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  const User = require('../../Backend/src/models/User.model');

  // Creer l'admin etablissement
  const admin = await creerUtilisateur({
    email: 'admin@test.com',
    role: 'admin_etablissement',
    statut: 'actif',
  });

  // Creer l'etablissement
  etab = await creerEtablissement(admin._id);

  // Creer le service de file d'attente
  service = await creerService(etab._id, { file_activee: true, rdv_active: false });

  // Creer le citoyen
  citoyen = await creerUtilisateur({
    email: 'citoyen@test.com',
    role: 'citoyen',
    statut: 'actif',
  });
  citoyenToken = genererToken(citoyen);

  // Creer l'agent avec service_id (requis pour appeler prochain)
  agent = await User.create({
    prenom: 'Agent',
    nom: 'Test',
    email: 'agent@test.com',
    mot_de_passe: 'Password@123',
    telephone: '55000001',
    role: 'agent',
    statut: 'actif',
    email_verified: true,
    etablissement_id: etab._id,
    service_id: service._id,
    numero_guichet: 1,
  });
  agentToken = genererToken(agent);
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── POST /api/tickets ────────────────────────────────────────────────────────
describe('POST /api/tickets - Prise de ticket', () => {
  test('OK - Citoyen prend un ticket - 201 + numero assigne', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('numero');
    expect(res.body.data.statut).toBe('en_attente');
  });

  test('FAIL - Citoyen prend un 2e ticket pour le meme service - 400', async () => {
    // Premier ticket
    await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    // Deuxieme tentative
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('FAIL - Sans authentification - 401', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ serviceId: service._id.toString() });

    expect(res.status).toBe(401);
  });

  test('FAIL - Service inexistant - 404', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('OK - Numeros de tickets incrementes correctement', async () => {
    const User = require('../../Backend/src/models/User.model');
    const citoyen2 = await creerUtilisateur({
      email: 'citoyen2@test.com',
      role: 'citoyen',
    });
    const token2 = genererToken(citoyen2);

    const res1 = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    const res2 = await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(token2))
      .send({ serviceId: service._id.toString() });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res2.body.data.numero).toBeGreaterThan(res1.body.data.numero);
  });
});

// ─── POST /api/tickets/agent/appeler ─────────────────────────────────────────
describe('POST /api/tickets/agent/appeler - Agent appelle le prochain ticket', () => {
  beforeEach(async () => {
    // Creer un ticket en attente
    await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });
  });

  test('OK - Agent appelle le prochain - statut = appele', async () => {
    const res = await request(app)
      .post('/api/tickets/agent/appeler')
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statut).toBe('appele');
  });

  test('FAIL - Citoyen ne peut pas appeler - 403', async () => {
    const res = await request(app)
      .post('/api/tickets/agent/appeler')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(403);
  });

  test('FAIL - Sans authentification - 401', async () => {
    const res = await request(app)
      .post('/api/tickets/agent/appeler');

    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/tickets/agent/:id/servi ────────────────────────────────────────
describe('PUT /api/tickets/agent/:id/servi - Ticket servi', () => {
  let ticketId;

  beforeEach(async () => {
    // Creer le ticket
    await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    // Agent appelle le ticket (statut: appele, agent assigne)
    const resAppel = await request(app)
      .post('/api/tickets/agent/appeler')
      .set('Authorization', bearerToken(agentToken));

    ticketId = resAppel.body.data._id;
  });

  test('OK - Ticket marque servi - statut = servi', async () => {
    const res = await request(app)
      .put(`/api/tickets/agent/${ticketId}/servi`)
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('servi');
  });

  test('FAIL - Citoyen ne peut pas marquer servi - 403', async () => {
    const res = await request(app)
      .put(`/api/tickets/agent/${ticketId}/servi`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(403);
  });
});

// ─── PUT /api/tickets/agent/:id/absent ───────────────────────────────────────
describe('PUT /api/tickets/agent/:id/absent - Ticket no-show', () => {
  let ticketId;

  beforeEach(async () => {
    await request(app)
      .post('/api/tickets')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ serviceId: service._id.toString() });

    const resAppel = await request(app)
      .post('/api/tickets/agent/appeler')
      .set('Authorization', bearerToken(agentToken));

    ticketId = resAppel.body.data._id;
  });

  test('OK - Ticket marque absent - statut = no_show', async () => {
    const res = await request(app)
      .put(`/api/tickets/agent/${ticketId}/absent`)
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('no_show');
  });
});
