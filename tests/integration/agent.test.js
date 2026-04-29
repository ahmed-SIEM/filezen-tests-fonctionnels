/**
 * TESTS D'INTEGRATION — Module AGENTS
 * Couverture :
 *  - POST /api/agents              (creer agent - admin etab)
 *  - GET  /api/agents              (lister mes agents)
 *  - PUT  /api/agents/:id          (modifier agent)
 *  - DELETE /api/agents/:id        (supprimer agent)
 *  - PUT  /api/agents/:id/assigner-service (assigner service)
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
  sendRdvConfirmationEmail: jest.fn().mockResolvedValue(true),
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
let admin, adminToken;
let citoyen, citoyenToken;
let etab, service;
let agentId;

beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  const User = require('../../Backend/src/models/User.model');

  admin = await creerUtilisateur({ email: 'admin@test.com', role: 'admin_etablissement' });
  etab = await creerEtablissement(admin._id);
  await User.findByIdAndUpdate(admin._id, { etablissement_id: etab._id });
  admin = await User.findById(admin._id);
  adminToken = genererToken(admin);

  service = await creerService(etab._id);

  citoyen = await creerUtilisateur({ email: 'citoyen@test.com', role: 'citoyen' });
  citoyenToken = genererToken(citoyen);

  // Pre-creer un agent pour les tests de modification/suppression
  const resAgent = await request(app)
    .post('/api/agents')
    .set('Authorization', bearerToken(adminToken))
    .send({ prenom: 'Agent', nom: 'Test', email: 'agent@test.com', telephone: '55001122', service_id: service._id.toString(), numero_guichet: 1 });
  agentId = resAgent.body.data?._id;
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── POST /api/agents ─────────────────────────────────────────────────────────
describe('POST /api/agents - Creer agent', () => {
  test('OK - Admin cree un agent - 201 + invitation email envoye', async () => {
    const { sendAgentInviteEmail } = require('../../Backend/src/utils/email');

    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', bearerToken(adminToken))
      .send({ prenom: 'Nouveau', nom: 'Agent', email: 'nouveau.agent@test.com', telephone: '55002233' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('agent');
    expect(res.body.data.statut).toBe('en_attente');
    expect(sendAgentInviteEmail).toHaveBeenCalled();
  });

  test('OK - Agent cree avec service et guichet assigne', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', bearerToken(adminToken))
      .send({ prenom: 'Alice', nom: 'Martin', email: 'alice@test.com', telephone: '55003344', service_id: service._id.toString(), numero_guichet: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.numero_guichet).toBe(3);
  });

  test('FAIL - Email deja utilise - 400', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', bearerToken(adminToken))
      .send({ prenom: 'Double', nom: 'Agent', email: 'agent@test.com', telephone: '55009988' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('FAIL - Citoyen ne peut pas creer un agent - 403', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ prenom: 'Test', nom: 'Test', email: 'test2@test.com', telephone: '55007788' });
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .post('/api/agents')
      .send({ prenom: 'Test', nom: 'Test', email: 'test3@test.com', telephone: '55007789' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/agents ──────────────────────────────────────────────────────────
describe('GET /api/agents - Lister mes agents', () => {
  test('OK - Admin voit ses agents - 200', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Verifier qu'aucun agent d'un autre etablissement n'est dans la liste
    res.body.data.forEach(a => {
      expect(a.etablissement_id.toString()).toBe(etab._id.toString());
    });
  });

  test('FAIL - Citoyen ne peut pas lister - 403', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/agents/:id ──────────────────────────────────────────────────────
describe('PUT /api/agents/:id - Modifier agent', () => {
  test('OK - Admin modifie le guichet de son agent - 200', async () => {
    const res = await request(app)
      .put(`/api/agents/${agentId}`)
      .set('Authorization', bearerToken(adminToken))
      .send({ numero_guichet: 5, prenom: 'AgentModifie' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.numero_guichet).toBe(5);
    expect(res.body.data.prenom).toBe('AgentModifie');
  });

  test('FAIL - Agent inexistant ou autre etablissement - 404', async () => {
    const res = await request(app)
      .put('/api/agents/507f1f77bcf86cd799439011')
      .set('Authorization', bearerToken(adminToken))
      .send({ numero_guichet: 2 });
    expect(res.status).toBe(404);
  });

  test('FAIL - Citoyen ne peut pas modifier - 403', async () => {
    const res = await request(app)
      .put(`/api/agents/${agentId}`)
      .set('Authorization', bearerToken(citoyenToken))
      .send({ numero_guichet: 2 });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/agents/:id ───────────────────────────────────────────────────
describe('DELETE /api/agents/:id - Supprimer agent', () => {
  test('OK - Admin supprime son agent - 200', async () => {
    const res = await request(app)
      .delete(`/api/agents/${agentId}`)
      .set('Authorization', bearerToken(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifier que l'agent n'apparait plus dans la liste
    const liste = await request(app)
      .get('/api/agents')
      .set('Authorization', bearerToken(adminToken));
    const ids = liste.body.data.map(a => a._id.toString());
    expect(ids).not.toContain(agentId.toString());
  });

  test('FAIL - Agent inexistant - 404', async () => {
    const res = await request(app)
      .delete('/api/agents/507f1f77bcf86cd799439011')
      .set('Authorization', bearerToken(adminToken));
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/agents/:id/assigner-service ────────────────────────────────────
describe('PUT /api/agents/:id/assigner-service - Assigner service', () => {
  test('OK - Admin assigne un service a un agent - 200', async () => {
    const res = await request(app)
      .put(`/api/agents/${agentId}/assigner-service`)
      .set('Authorization', bearerToken(adminToken))
      .send({ service_id: service._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service_id).toBeTruthy();
  });

  test('OK - Desassigner le service (service_id null) - 200', async () => {
    const res = await request(app)
      .put(`/api/agents/${agentId}/assigner-service`)
      .set('Authorization', bearerToken(adminToken))
      .send({ service_id: null });

    expect(res.status).toBe(200);
    expect(res.body.data.service_id).toBeNull();
  });

  test('FAIL - Agent inexistant - 404', async () => {
    const res = await request(app)
      .put('/api/agents/507f1f77bcf86cd799439011/assigner-service')
      .set('Authorization', bearerToken(adminToken))
      .send({ service_id: service._id.toString() });
    expect(res.status).toBe(404);
  });
});
