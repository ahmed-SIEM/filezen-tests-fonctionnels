/**
 * Instance Express isolée pour les tests d'intégration
 * Pointe vers le repo Backend situé dans le dossier parent
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn(),
  })),
  emitQueueUpdate: jest.fn(),
  emitTicketCalled: jest.fn(),
  emitTicketUpdate: jest.fn(),
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
  sendAgentInviteEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../Backend/src/utils/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(true),
  sendQueueBientotVotreTour: jest.fn().mockResolvedValue(true),
  sendQueueVotreTour: jest.fn().mockResolvedValue(true),
  sendRdvFermetureExceptionnelle: jest.fn().mockResolvedValue(true),
  sendRdvHoraireModifie: jest.fn().mockResolvedValue(true),
  getClient: jest.fn(() => null),
}));

jest.mock('../../Backend/src/utils/notification', () => ({
  creerNotification: jest.fn().mockResolvedValue(true),
  envoyerNotificationTempsReel: jest.fn().mockResolvedValue(true),
}));

const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => res.json({ message: 'FileZen API Test', status: 'OK' }));

  app.use('/api/auth',           require('../../Backend/src/routes/auth.routes'));
  app.use('/api/etablissements', require('../../Backend/src/routes/etablissement.routes'));
  app.use('/api/services',       require('../../Backend/src/routes/service.routes'));
  app.use('/api/tickets',        require('../../Backend/src/routes/ticket.routes'));
  app.use('/api/rendezvous',     require('../../Backend/src/routes/rendezvous.routes'));
  app.use('/api/agents',         require('../../Backend/src/routes/agent.routes'));
  app.use('/api/notifications',  require('../../Backend/src/routes/notification.routes'));
  app.use('/api/stats',          require('../../Backend/src/routes/stats.routes'));

  app.use((req, res) => res.status(404).json({ success: false, message: 'Route non trouvée' }));

  return app;
};

module.exports = createApp;
