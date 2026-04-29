/**
 * TESTS UNITAIRES - Auth Middleware
 * Teste verifierToken et verifierRole en isolation totale (sans DB)
 */

const jwt = require('jsonwebtoken');

jest.mock('../../Backend/src/models/User.model');
jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

const User = require('../../Backend/src/models/User.model');
const { verifierToken, verifierRole } = require('../../Backend/src/middlewares/auth.middleware');

const JWT_SECRET = 'filezen_test_secret';
process.env.JWT_SECRET = JWT_SECRET;

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// ============================================================
// SUITE : verifierToken
// ============================================================
describe('Middleware verifierToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('OK - Token valide - next() appele et req.user defini', async () => {
    const utilisateurMock = {
      _id: 'userId123',
      email: 'citoyen@test.com',
      role: 'citoyen',
      statut: 'actif',
    };
    User.findById = jest.fn().mockResolvedValue(utilisateurMock);

    const token = jwt.sign({ userId: 'userId123', role: 'citoyen' }, JWT_SECRET, { expiresIn: '1d' });
    const req = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(utilisateurMock);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('FAIL - Aucun token - 401 Token manquant', async () => {
    const req = { header: jest.fn().mockReturnValue(undefined) };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Token') })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - Token JWT invalide (falsifie) - 401', async () => {
    const req = { header: jest.fn().mockReturnValue('Bearer token.invalide.ici') };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - Token expire - 401', async () => {
    const tokenExpire = jwt.sign({ userId: 'userId123' }, JWT_SECRET, { expiresIn: '-1s' });
    const req = { header: jest.fn().mockReturnValue(`Bearer ${tokenExpire}`) };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - Utilisateur introuvable en base - 401', async () => {
    User.findById = jest.fn().mockResolvedValue(null);

    const token = jwt.sign({ userId: 'userInexistant' }, JWT_SECRET, { expiresIn: '1d' });
    const req = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - Compte suspendu - 403', async () => {
    const utilisateurSuspendu = {
      _id: 'userId123',
      role: 'citoyen',
      statut: 'suspendu',
    };
    User.findById = jest.fn().mockResolvedValue(utilisateurSuspendu);

    const token = jwt.sign({ userId: 'userId123' }, JWT_SECRET, { expiresIn: '1d' });
    const req = { header: jest.fn().mockReturnValue(`Bearer ${token}`) };
    const res = mockResponse();

    await verifierToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ============================================================
// SUITE : verifierRole
// ============================================================
describe('Middleware verifierRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('OK - Role autorise - next() appele', () => {
    const req = { user: { role: 'super_admin' } };
    const res = mockResponse();
    const middleware = verifierRole('super_admin', 'admin_etablissement');

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('OK - Tous les roles autorises passent', () => {
    const roles = ['citoyen', 'agent', 'admin_etablissement', 'super_admin'];
    const middleware = verifierRole(...roles);

    roles.forEach((role) => {
      jest.clearAllMocks();
      const req = { user: { role } };
      const res = mockResponse();
      middleware(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  test('FAIL - Role non autorise - 403 Permissions insuffisantes', () => {
    const req = { user: { role: 'citoyen' } };
    const res = mockResponse();
    const middleware = verifierRole('super_admin');

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - Agent essaie une route super_admin - 403', () => {
    const req = { user: { role: 'agent' } };
    const res = mockResponse();
    const middleware = verifierRole('super_admin');

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('FAIL - req.user absent - 401', () => {
    const req = {};
    const res = mockResponse();
    const middleware = verifierRole('citoyen');

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
