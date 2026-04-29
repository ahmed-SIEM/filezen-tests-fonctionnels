/**
 * TESTS D'INTEGRATION — Module NOTIFICATIONS
 * Couverture :
 *  - GET  /api/notifications           (mes notifications)
 *  - PUT  /api/notifications/:id/lire  (marquer lue)
 *  - PUT  /api/notifications/tout-lire (marquer toutes lues)
 *  - DELETE /api/notifications/:id     (supprimer)
 */

const request = require('supertest');
const db = require('../setup/db');
const { creerUtilisateur, genererToken, bearerToken } = require('../setup/helpers');

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
let citoyen, citoyenToken;
let autreUser, autreToken;
let notifId1, notifId2, notifId3;

const creerNotifDirecte = async (destinataireId, overrides = {}) => {
  const Notification = require('../../Backend/src/models/Notification.model');
  return await Notification.create({
    destinataire: destinataireId,
    type: 'info',
    titre: 'Notification test',
    message: 'Message de test',
    lu: false,
    ...overrides,
  });
};

beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

beforeEach(async () => {
  citoyen = await creerUtilisateur({ email: 'citoyen@test.com', role: 'citoyen' });
  citoyenToken = genererToken(citoyen);

  autreUser = await creerUtilisateur({ email: 'autre@test.com', role: 'citoyen' });
  autreToken = genererToken(autreUser);

  // Creer 3 notifications pour citoyen
  const n1 = await creerNotifDirecte(citoyen._id, { titre: 'Notif 1', lu: false });
  const n2 = await creerNotifDirecte(citoyen._id, { titre: 'Notif 2', lu: false });
  const n3 = await creerNotifDirecte(citoyen._id, { titre: 'Notif 3', lu: true });
  notifId1 = n1._id.toString();
  notifId2 = n2._id.toString();
  notifId3 = n3._id.toString();

  // 1 notification pour l'autre user
  await creerNotifDirecte(autreUser._id, { titre: 'Notif autre user' });
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── GET /api/notifications ───────────────────────────────────────────────────
describe('GET /api/notifications - Mes notifications', () => {
  test('OK - Citoyen recoit uniquement ses notifications - 200', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    // Toutes appartiennent au citoyen
    res.body.data.forEach(n => {
      expect(n.destinataire.toString()).toBe(citoyen._id.toString());
    });
  });

  test('OK - Compteur non_lues correct - 2 non lues', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.non_lues).toBe(2);
  });

  test('OK - Chaque user voit uniquement ses notifs (isolation)', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(autreToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].titre).toBe('Notif autre user');
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/notifications/:id/lire ─────────────────────────────────────────
describe('PUT /api/notifications/:id/lire - Marquer comme lue', () => {
  test('OK - Notification non lue devient lue - 200', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notifId1}/lire`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifier que le compteur est mis a jour
    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));
    expect(check.body.non_lues).toBe(1);
  });

  test('OK - User ne peut pas marquer la notif de quelqu un d autre - 200 silencieux', async () => {
    // L'API retourne 200 meme si la notif n'appartient pas au user (findOneAndUpdate null = silencieux)
    const res = await request(app)
      .put(`/api/notifications/${notifId1}/lire`)
      .set('Authorization', bearerToken(autreToken));

    expect(res.status).toBe(200);

    // La notif originale reste non lue pour citoyen
    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));
    expect(check.body.non_lues).toBe(2);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).put(`/api/notifications/${notifId1}/lire`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/notifications/tout-lire ────────────────────────────────────────
describe('PUT /api/notifications/tout-lire - Marquer toutes comme lues', () => {
  test('OK - Toutes les notifications marquees lues - non_lues = 0', async () => {
    const res = await request(app)
      .put('/api/notifications/tout-lire')
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifier que toutes sont lues
    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));
    expect(check.body.non_lues).toBe(0);
  });

  test('OK - Isolation : les notifs des autres users restent non lues', async () => {
    await request(app)
      .put('/api/notifications/tout-lire')
      .set('Authorization', bearerToken(citoyenToken));

    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(autreToken));
    expect(check.body.non_lues).toBe(1);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).put('/api/notifications/tout-lire');
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
describe('DELETE /api/notifications/:id - Supprimer notification', () => {
  test('OK - Notification supprimee - 200 + plus dans la liste', async () => {
    const res = await request(app)
      .delete(`/api/notifications/${notifId1}`)
      .set('Authorization', bearerToken(citoyenToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifier que la liste a 2 notifs maintenant
    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));
    expect(check.body.data).toHaveLength(2);
    const ids = check.body.data.map(n => n._id.toString());
    expect(ids).not.toContain(notifId1);
  });

  test('OK - User ne peut pas supprimer la notif d un autre - 200 silencieux', async () => {
    // Tenter de supprimer notif1 (appartient a citoyen) avec autreToken
    await request(app)
      .delete(`/api/notifications/${notifId1}`)
      .set('Authorization', bearerToken(autreToken));

    // La notif doit encore exister pour citoyen
    const check = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearerToken(citoyenToken));
    expect(check.body.data).toHaveLength(3);
  });

  test('FAIL - Sans token - 401', async () => {
    const res = await request(app).delete(`/api/notifications/${notifId1}`);
    expect(res.status).toBe(401);
  });
});
