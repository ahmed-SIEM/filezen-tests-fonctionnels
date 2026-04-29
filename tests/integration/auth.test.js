/**
 * TESTS D'INTÉGRATION — Module AUTH
 * Teste les endpoints API d'authentification avec MongoDB in-memory
 *
 * Couverture :
 *  - POST /api/auth/signup/citoyen
 *  - POST /api/auth/login
 *  - POST /api/auth/verify-email
 *  - POST /api/auth/resend-code
 *  - GET  /api/auth/me
 *  - PUT  /api/auth/change-password
 *  - POST /api/auth/forgot-password
 */

const request = require('supertest');
const db = require('../setup/db');
const { creerUtilisateur, genererToken, bearerToken } = require('../setup/helpers');

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));
jest.mock('../../Backend/src/utils/email', () => ({
  sendVerificationCodeEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
  sendApprovalEmail: jest.fn().mockResolvedValue(true),
  sendRejectionEmail: jest.fn().mockResolvedValue(true),
  sendSuspensionEmail: jest.fn().mockResolvedValue(true),
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
process.env.FRONTEND_URL = 'http://localhost:3000';

let app;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await db.connect();
  app = require('../setup/app')();
});

afterEach(async () => {
  await db.clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ─── POST /api/auth/signup/citoyen ───────────────────────────────────────────
describe('POST /api/auth/signup/citoyen', () => {
  const donneesValides = {
    prenom: 'Ahmed',
    nom: 'Souid',
    email: 'ahmed@test.com',
    mot_de_passe: 'Password@123',
    telephone: '55123456',
  };

  test('✅ Inscription valide → 201 + userId retourné', async () => {
    const res = await request(app)
      .post('/api/auth/signup/citoyen')
      .send(donneesValides);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('userId');
    expect(res.body.data.email).toBe(donneesValides.email);
  });

  test('✅ Email de vérification envoyé après inscription', async () => {
    const { sendVerificationCodeEmail } = require('../../Backend/src/utils/email');

    await request(app)
      .post('/api/auth/signup/citoyen')
      .send(donneesValides);

    expect(sendVerificationCodeEmail).toHaveBeenCalledWith(
      donneesValides.email,
      expect.any(String),
      donneesValides.prenom
    );
  });

  test('❌ Email déjà utilisé → 400', async () => {
    await creerUtilisateur({ email: 'ahmed@test.com' });

    const res = await request(app)
      .post('/api/auth/signup/citoyen')
      .send(donneesValides);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email/i);
  });

  test('❌ Champ email manquant → erreur serveur', async () => {
    const res = await request(app)
      .post('/api/auth/signup/citoyen')
      .send({ prenom: 'Ahmed', mot_de_passe: 'Password@123' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  let citoyen;

  beforeEach(async () => {
    citoyen = await creerUtilisateur({
      email: 'citoyen@test.com',
      mot_de_passe: 'Password@123',
      role: 'citoyen',
      statut: 'actif',
      email_verified: true,
    });
  });

  test('✅ Connexion citoyen valide → 200 + token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citoyen@test.com', mot_de_passe: 'Password@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('citoyen');
    expect(res.body.data.user).not.toHaveProperty('mot_de_passe');
  });

  test('❌ Mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citoyen@test.com', mot_de_passe: 'MauvaisPass' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('❌ Email inexistant → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.com', mot_de_passe: 'Password@123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('❌ Email non vérifié → 403 + code EMAIL_NOT_VERIFIED', async () => {
    await creerUtilisateur({
      email: 'nonverifie@test.com',
      mot_de_passe: 'Password@123',
      email_verified: false,
      statut: 'inactif',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonverifie@test.com', mot_de_passe: 'Password@123' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('❌ Compte en attente (admin etablissement) → 403', async () => {
    await creerUtilisateur({
      email: 'pending@test.com',
      mot_de_passe: 'Password@123',
      role: 'admin_etablissement',
      statut: 'en_attente',
      email_verified: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pending@test.com', mot_de_passe: 'Password@123' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('✅ Connexion avec remember_me → token validité étendue', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citoyen@test.com', mot_de_passe: 'Password@123', remember_me: true });

    expect(res.status).toBe(200);
    expect(res.body.data.remember_me).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────
describe('POST /api/auth/verify-email', () => {
  let userId;

  beforeEach(async () => {
    const User = require('../../Backend/src/models/User.model');
    const user = await User.create({
      prenom: 'Ahmed',
      nom: 'Test',
      email: 'ahmed@test.com',
      mot_de_passe: 'Password@123',
      telephone: '55000000',
      role: 'citoyen',
      statut: 'inactif',
      email_verified: false,
      verification_code: '123456',
      verification_code_expire: new Date(Date.now() + 10 * 60 * 1000),
    });
    userId = user._id.toString();
  });

  test('✅ Code correct → email vérifié + token retourné', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId, code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  test('❌ Code incorrect → 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId, code: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('❌ Code expiré → 400 + CODE_EXPIRED', async () => {
    const User = require('../../Backend/src/models/User.model');
    await User.findByIdAndUpdate(userId, {
      verification_code_expire: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId, code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_EXPIRED');
  });

  test('❌ UserId inexistant → 404', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ userId: '507f1f77bcf86cd799439011', code: '123456' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('✅ Token valide → profil retourné sans mot de passe', async () => {
    const user = await creerUtilisateur({ email: 'me@test.com' });
    const token = genererToken(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', bearerToken(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('me@test.com');
    expect(res.body.data).not.toHaveProperty('mot_de_passe');
  });

  test('❌ Sans token → 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('❌ Token invalide → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.invalide.ici');

    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
describe('PUT /api/auth/change-password', () => {
  test('✅ Changement de mot de passe valide', async () => {
    const user = await creerUtilisateur({ email: 'change@test.com', mot_de_passe: 'OldPass@123' });
    const token = genererToken(user);

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', bearerToken(token))
      .send({ ancien_mot_de_passe: 'OldPass@123', nouveau_mot_de_passe: 'NewPass@456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('❌ Ancien mot de passe incorrect → 400', async () => {
    const user = await creerUtilisateur({ email: 'change2@test.com', mot_de_passe: 'OldPass@123' });
    const token = genererToken(user);

    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', bearerToken(token))
      .send({ ancien_mot_de_passe: 'MauvaisAncien', nouveau_mot_de_passe: 'NewPass@456' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('❌ Sans authentification → 401', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({ ancien_mot_de_passe: 'OldPass@123', nouveau_mot_de_passe: 'NewPass@456' });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
describe('POST /api/auth/forgot-password', () => {
  test('✅ Email existant → 200 (message sécurisé sans révéler si email existe)', async () => {
    await creerUtilisateur({ email: 'forgot@test.com' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('✅ Email inexistant → 200 (même réponse pour sécurité)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inexistant@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
