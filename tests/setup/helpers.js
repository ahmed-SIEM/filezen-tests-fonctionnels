/**
 * Helpers partagés pour les tests d'intégration
 * Création de données de test, génération de tokens, etc.
 */
const jwt = require('jsonwebtoken');
const User = require('../../Backend/src/models/User.model');
const Etablissement = require('../../Backend/src/models/Etablissement.model');
const Service = require('../../Backend/src/models/Service.model');

// JWT_SECRET pour les tests
const JWT_SECRET = process.env.JWT_SECRET || 'filezen_test_secret_jwt_2026';

/**
 * Créer un utilisateur de test directement en base (sans passer par l'API)
 */
const creerUtilisateur = async ({
  prenom = 'Test',
  nom = 'User',
  nom_complet = null,
  email = 'test@filezen.com',
  mot_de_passe = 'Password@123',
  role = 'citoyen',
  statut = 'actif',
  email_verified = true,
  etablissement_id = null,
} = {}) => {
  const userData = {
    email,
    mot_de_passe,
    telephone: '55000000',
    role,
    statut,
    email_verified,
    etablissement_id,
  };

  if (role === 'admin_etablissement') {
    userData.nom_complet = nom_complet || 'Admin Complet Test';
  } else {
    userData.prenom = prenom;
    userData.nom = nom;
  }

  const user = await User.create(userData);
  return user;
};

/**
 * Générer un token JWT valide pour un utilisateur de test
 */
const genererToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      etablissement_id: user.etablissement_id || null,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

/**
 * Header Authorization Bearer
 */
const bearerToken = (token) => `Bearer ${token}`;

/**
 * Créer un établissement de test
 */
const creerEtablissement = async (adminId, overrides = {}) => {
  return await Etablissement.create({
    nom: 'Clinique Test Alpha',
    type: 'clinique',
    description: 'Établissement de test',
    gouvernorat: 'Tunis',
    adresse: '10 Rue de Test',
    ville: 'Tunis',
    telephone_etablissement: '71000000',
    email_etablissement: 'clinique@test.com',
    admin: adminId,
    statut: 'actif',
    ...overrides,
  });
};

/**
 * Créer un service de test
 */
const creerService = async (etablissementId, overrides = {}) => {
  return await Service.create({
    nom: 'Service Test',
    description: 'Service de test',
    etablissement: etablissementId,
    file_activee: true,
    rdv_active: false,
    statut: 'actif',
    ...overrides,
  });
};

/**
 * Créer un super admin de test
 */
const creerSuperAdmin = async () => {
  return creerUtilisateur({
    prenom: 'Super',
    nom: 'Admin',
    email: 'superadmin@test.com',
    role: 'super_admin',
    statut: 'actif',
  });
};

/**
 * Créer un admin établissement de test
 */
const creerAdminEtablissement = async (etablissementId) => {
  return creerUtilisateur({
    prenom: 'Admin',
    nom: 'Etab',
    email: 'admin@test.com',
    role: 'admin_etablissement',
    statut: 'actif',
    etablissement_id: etablissementId,
  });
};

/**
 * Créer un agent de test
 */
const creerAgent = async (etablissementId) => {
  return creerUtilisateur({
    prenom: 'Agent',
    nom: 'Test',
    email: 'agent@test.com',
    role: 'agent',
    statut: 'actif',
    etablissement_id: etablissementId,
  });
};

module.exports = {
  creerUtilisateur,
  genererToken,
  bearerToken,
  creerEtablissement,
  creerService,
  creerSuperAdmin,
  creerAdminEtablissement,
  creerAgent,
  JWT_SECRET,
};
