/**
 * TESTS D'INTEGRATION — Module RENDEZ-VOUS
 * Couverture :
 *  - POST /api/rendezvous                   (reserver RDV)
 *  - GET  /api/rendezvous/mes-rdv           (mes rendez-vous)
 *  - GET  /api/rendezvous/:id               (details RDV)
 *  - DELETE /api/rendezvous/:id             (annuler RDV)
 *  - GET  /api/rendezvous/creneaux          (creneaux disponibles)
 *  - PUT  /api/rendezvous/agent/:id/present (agent marque present)
 *  - PUT  /api/rendezvous/agent/:id/termine (agent marque termine)
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
  sendRdvReminderEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../Backend/src/utils/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(true),
  sendQueueVotreTour: jest.fn().mockResolvedValue(true),
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
let creneauId;

// Helper pour creer un creneau de test directement en base
const creerCreneau = async (serviceId, overrides = {}) => {
  const Creneau = require('../../Backend/src/models/Creneau.model');
  const Calendrier = require('../../Backend/src/models/Calendrier.model');

  const cal = await Calendrier.create({
    agent: agent._id,
    service: serviceId,
    nom: 'Calendrier test',
  });

  const dateFuture = new Date();
  dateFuture.setDate(dateFuture.getDate() + 7);
  dateFuture.setHours(0, 0, 0, 0);

  return await Creneau.create({
    calendrier: cal._id,
    service: serviceId,
    date: dateFuture,
    heure_debut: '09:00',
    heure_fin: '09:30',
    duree_minutes: 30,
    statut: 'libre',
    ...overrides,
  });
};

beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  const User = require('../../Backend/src/models/User.model');

  const admin = await creerUtilisateur({ email: 'admin@test.com', role: 'admin_etablissement' });
  etab = await creerEtablissement(admin._id);
  await User.findByIdAndUpdate(admin._id, { etablissement_id: etab._id });

  service = await creerService(etab._id, { rdv_active: true, file_activee: false });

  citoyen = await creerUtilisateur({ email: 'citoyen@test.com', role: 'citoyen' });
  citoyenToken = genererToken(citoyen);

  // Agent avec service_id
  agent = await User.create({
    prenom: 'Agent', nom: 'RDV', email: 'agent@test.com',
    mot_de_passe: 'Password@123', telephone: '55001100',
    role: 'agent', statut: 'actif', email_verified: true,
    etablissement_id: etab._id, service_id: service._id, numero_guichet: 1,
  });
  agentToken = genererToken(agent);

  // Creer un creneau disponible
  const creneau = await creerCreneau(service._id);
  creneauId = creneau._id.toString();
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── POST /api/rendezvous ─────────────────────────────────────────────────────
describe('POST /api/rendezvous - Reserver un RDV', () => {
  test('OK - Citoyen reserve un RDV sur creneau libre - 201', async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString(), motif: 'Consultation generale' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statut).toBe('confirme');
    expect(res.body.data.citoyen).toBeTruthy();
  });

  test('OK - Creneau passe en statut occupe apres reservation', async () => {
    await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });

    const Creneau = require('../../Backend/src/models/Creneau.model');
    const creneau = await Creneau.findById(creneauId);
    expect(creneau.statut).toBe('occupe');
  });

  test('FAIL - Creneau deja pris - 400', async () => {
    // Premier citoyen prend le creneau
    await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });

    // Deuxieme citoyen essaie le meme creneau
    const citoyen2 = await creerUtilisateur({ email: 'citoyen2@test.com', role: 'citoyen' });
    const token2 = genererToken(citoyen2);

    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(token2))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('FAIL - Liste creneaux vide - 400', async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [], serviceId: service._id.toString() });

    expect(res.status).toBe(400);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/rendezvous/mes-rdv ──────────────────────────────────────────────
describe('GET /api/rendezvous/mes-rdv - Mes rendez-vous', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });
  });

  test('OK - Citoyen voit ses RDV confirmes - 200', async () => {
    const res = await request(app)
      .get('/api/rendezvous/mes-rdv')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].statut).toBe('confirme');
  });

  test('OK - Autre citoyen ne voit pas les RDV du premier - isolation', async () => {
    const citoyen2 = await creerUtilisateur({ email: 'citoyen2@test.com', role: 'citoyen' });
    const token2 = genererToken(citoyen2);

    const res = await request(app)
      .get('/api/rendezvous/mes-rdv')
      .set('Authorization', bearerToken(token2));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).get('/api/rendezvous/mes-rdv');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/rendezvous/:id ──────────────────────────────────────────────────
describe('GET /api/rendezvous/:id - Details RDV', () => {
  let rdvId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });
    rdvId = res.body.data._id;
  });

  test('OK - Citoyen voit les details de son RDV - 200', async () => {
    const res = await request(app)
      .get(`/api/rendezvous/${rdvId}`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id.toString()).toBe(rdvId.toString());
    expect(res.body.data).toHaveProperty('service');
    expect(res.body.data).toHaveProperty('etablissement');
  });

  test('FAIL - Autre citoyen ne peut pas voir le RDV - 404', async () => {
    const citoyen2 = await creerUtilisateur({ email: 'citoyen2@test.com', role: 'citoyen' });
    const token2 = genererToken(citoyen2);

    const res = await request(app)
      .get(`/api/rendezvous/${rdvId}`)
      .set('Authorization', bearerToken(token2));

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/rendezvous/:id ───────────────────────────────────────────────
describe('DELETE /api/rendezvous/:id - Annuler RDV', () => {
  let rdvId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });
    rdvId = res.body.data._id;
  });

  test('OK - Citoyen annule son RDV - statut = annule + creneau redevient libre', async () => {
    const res = await request(app)
      .delete(`/api/rendezvous/${rdvId}`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('annule');

    // Verifier que le creneau est redevenu libre
    const Creneau = require('../../Backend/src/models/Creneau.model');
    const creneau = await Creneau.findById(creneauId);
    expect(creneau.statut).toBe('libre');
  });

  test('FAIL - RDV inexistant ou appartenant a un autre - 404', async () => {
    const citoyen2 = await creerUtilisateur({ email: 'citoyen2@test.com', role: 'citoyen' });
    const token2 = genererToken(citoyen2);

    const res = await request(app)
      .delete(`/api/rendezvous/${rdvId}`)
      .set('Authorization', bearerToken(token2));

    expect(res.status).toBe(404);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).delete(`/api/rendezvous/${rdvId}`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/rendezvous/creneaux ─────────────────────────────────────────────
describe('GET /api/rendezvous/creneaux - Creneaux disponibles', () => {
  test('OK - Creneaux retournes pour un service et une date', async () => {
    const dateFuture = new Date();
    dateFuture.setDate(dateFuture.getDate() + 7);
    const dateStr = dateFuture.toISOString().split('T')[0];

    const res = await request(app)
      .get('/api/rendezvous/creneaux')
      .set('Authorization', bearerToken(citoyenToken))
      .query({ serviceId: service._id.toString(), date: dateStr });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('FAIL - serviceId manquant - 400', async () => {
    const res = await request(app)
      .get('/api/rendezvous/creneaux')
      .set('Authorization', bearerToken(citoyenToken))
      .query({ date: '2026-05-01' });

    expect(res.status).toBe(400);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app)
      .get('/api/rendezvous/creneaux')
      .query({ serviceId: service._id.toString(), date: '2026-05-01' });
    expect(res.status).toBe(401);
  });
});

// ─── Routes Agent ─────────────────────────────────────────────────────────────
describe('Agent - Gestion des RDV du jour', () => {
  let rdvId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/rendezvous')
      .set('Authorization', bearerToken(citoyenToken))
      .send({ creneauxIds: [creneauId], serviceId: service._id.toString() });
    rdvId = res.body.data._id;
  });

  test('OK - Agent voit les RDV du jour - 200', async () => {
    const res = await request(app)
      .get('/api/rendezvous/agent/jour')
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('FAIL - Citoyen ne peut pas voir les RDV agent - 403', async () => {
    const res = await request(app)
      .get('/api/rendezvous/agent/jour')
      .set('Authorization', bearerToken(citoyenToken));
    expect(res.status).toBe(403);
  });

  test('OK - Agent marque un RDV comme present - statut en_cours', async () => {
    const res = await request(app)
      .put(`/api/rendezvous/agent/${rdvId}/present`)
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('en_cours');
  });

  test('OK - Agent marque un RDV comme termine - statut termine', async () => {
    // D'abord marquer present
    await request(app)
      .put(`/api/rendezvous/agent/${rdvId}/present`)
      .set('Authorization', bearerToken(agentToken));

    const res = await request(app)
      .put(`/api/rendezvous/agent/${rdvId}/termine`)
      .set('Authorization', bearerToken(agentToken));

    expect(res.status).toBe(200);
    expect(res.body.data.statut).toBe('termine');
  });
});
