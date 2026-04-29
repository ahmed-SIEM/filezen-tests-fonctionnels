/**
 * Variables d'environnement pour les tests
 * Chargé avant chaque suite de tests via jest.config.js setupFiles
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'filezen_test_secret_jwt_2026';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/filezen_test'; // Remplacé par mongodb-memory-server

// Email — désactivé en test (mocks utilisés)
process.env.MAIL_HOST = 'smtp.mailtrap.io';
process.env.MAIL_PORT = '2525';
process.env.MAIL_USER = 'test_user';
process.env.MAIL_PASS = 'test_pass';
process.env.MAIL_FROM = 'noreply@filezen.test';

// Cloudinary — désactivé en test
process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_key';
process.env.CLOUDINARY_API_SECRET = 'test_secret';
