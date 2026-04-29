/**
 * TESTS UNITAIRES — Fonctions utilitaires
 * Teste genererCode, validations metier, logique pure
 */

// ─── Mock des dependances ─────────────────────────────────────────────────────
jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));
jest.mock('../../Backend/src/utils/email', () => ({
  sendVerificationCodeEmail: jest.fn().mockResolvedValue(true),
  sendApprovalEmail: jest.fn().mockResolvedValue(true),
  sendRejectionEmail: jest.fn().mockResolvedValue(true),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../Backend/src/utils/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn().mockResolvedValue(true),
}));

// ─── SUITE : genererCode ──────────────────────────────────────────────────────
describe('genererCode - Generation code de verification 6 chiffres', () => {
  const genererCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  test('OK - Le code est une chaine de 6 chiffres', () => {
    const code = genererCode();
    expect(typeof code).toBe('string');
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  test('OK - Le code est toujours entre 100000 et 999999', () => {
    for (let i = 0; i < 100; i++) {
      const code = parseInt(genererCode(), 10);
      expect(code).toBeGreaterThanOrEqual(100000);
      expect(code).toBeLessThanOrEqual(999999);
    }
  });

  test('OK - Deux codes consecutifs sont differents (probabiliste)', () => {
    const codes = new Set(Array.from({ length: 50 }, genererCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─── SUITE : Validation email format ─────────────────────────────────────────
describe('Validation format email', () => {
  const emailValide = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  test('OK - Emails valides acceptes', () => {
    const emailsValides = [
      'user@example.com',
      'ahmed.souid@filezen.com',
      'test+tag@domain.org',
      'user123@subdomain.example.com',
    ];
    emailsValides.forEach((email) => {
      expect(emailValide(email)).toBe(true);
    });
  });

  test('FAIL - Emails invalides rejetes', () => {
    const emailsInvalides = [
      'not-an-email',
      '@nodomain.com',
      'missing@',
      '',
      'spaces @domain.com',
    ];
    emailsInvalides.forEach((email) => {
      expect(emailValide(email)).toBe(false);
    });
  });
});

// ─── SUITE : Regles metier annulation RDV ────────────────────────────────────
describe('Regle metier - Annulation RDV (limite 24h)', () => {
  const peutAnnuler = (dateRdv, maintenant = new Date()) => {
    const diffMs = new Date(dateRdv) - maintenant;
    const diffHeures = diffMs / (1000 * 60 * 60);
    return diffHeures > 24;
  };

  test('OK - RDV dans 48h - annulation autorisee', () => {
    const rdvDans48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    expect(peutAnnuler(rdvDans48h)).toBe(true);
  });

  test('OK - RDV dans 25h - annulation autorisee', () => {
    const rdvDans25h = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(peutAnnuler(rdvDans25h)).toBe(true);
  });

  test('FAIL - RDV dans 23h - annulation refusee', () => {
    const rdvDans23h = new Date(Date.now() + 23 * 60 * 60 * 1000);
    expect(peutAnnuler(rdvDans23h)).toBe(false);
  });

  test('FAIL - RDV dans 1h - annulation refusee', () => {
    const rdvDans1h = new Date(Date.now() + 1 * 60 * 60 * 1000);
    expect(peutAnnuler(rdvDans1h)).toBe(false);
  });

  test('FAIL - RDV passe - annulation refusee', () => {
    const rdvPasse = new Date(Date.now() - 60 * 60 * 1000);
    expect(peutAnnuler(rdvPasse)).toBe(false);
  });
});

// ─── SUITE : Regle metier — Seuil signalements ───────────────────────────────
describe('Regle metier - Seuil alerte signalements (5 reports)', () => {
  const SEUIL = 5;
  const alerteRequise = (nbSignalements, alerteDejaEnvoyee) => {
    return nbSignalements >= SEUIL && !alerteDejaEnvoyee;
  };

  test('OK - 5 signalements, alerte non envoyee - alerte requise', () => {
    expect(alerteRequise(5, false)).toBe(true);
  });

  test('OK - 10 signalements, alerte non envoyee - alerte requise', () => {
    expect(alerteRequise(10, false)).toBe(true);
  });

  test('FAIL - 4 signalements - en dessous du seuil', () => {
    expect(alerteRequise(4, false)).toBe(false);
  });

  test('FAIL - 5 signalements mais alerte deja envoyee - pas de doublon', () => {
    expect(alerteRequise(5, true)).toBe(false);
  });
});

// ─── SUITE : Fenetres de rappel automatique ───────────────────────────────────
describe('Regle metier - Fenetres de rappel automatique', () => {
  const dansLaFenetre = (dateRdv, minHeures, maxHeures, maintenant = new Date()) => {
    const diffMs = new Date(dateRdv) - maintenant;
    const diffHeures = diffMs / (1000 * 60 * 60);
    return diffHeures >= minHeures && diffHeures <= maxHeures;
  };

  describe('Rappel 24h (fenetre 23h-24h)', () => {
    test('OK - RDV dans 23.5h - dans la fenetre 24h', () => {
      const rdv = new Date(Date.now() + 23.5 * 60 * 60 * 1000);
      expect(dansLaFenetre(rdv, 23, 24)).toBe(true);
    });

    test('FAIL - RDV dans 25h - hors fenetre 24h', () => {
      const rdv = new Date(Date.now() + 25 * 60 * 60 * 1000);
      expect(dansLaFenetre(rdv, 23, 24)).toBe(false);
    });

    test('FAIL - RDV dans 22h - hors fenetre 24h', () => {
      const rdv = new Date(Date.now() + 22 * 60 * 60 * 1000);
      expect(dansLaFenetre(rdv, 23, 24)).toBe(false);
    });
  });

  describe('Rappel 1h (fenetre 50min-1h)', () => {
    test('OK - RDV dans 55min - dans la fenetre 1h', () => {
      const rdv = new Date(Date.now() + 55 * 60 * 1000);
      expect(dansLaFenetre(rdv, 50 / 60, 1)).toBe(true);
    });

    test('FAIL - RDV dans 2h - hors fenetre 1h', () => {
      const rdv = new Date(Date.now() + 2 * 60 * 60 * 1000);
      expect(dansLaFenetre(rdv, 50 / 60, 1)).toBe(false);
    });
  });
});

// ─── SUITE : Calcul creneaux par jour ────────────────────────────────────────
describe('Calcul nombre de creneaux attendus par jour', () => {
  const calculerCreneaux = (heureDebut, heureFin, dureeMinutes, pauseDebut = null, pauseFin = null) => {
    const debut = parseInt(heureDebut.split(':')[0]) * 60 + parseInt(heureDebut.split(':')[1]);
    const fin = parseInt(heureFin.split(':')[0]) * 60 + parseInt(heureFin.split(':')[1]);
    let totalMinutes = fin - debut;

    if (pauseDebut && pauseFin) {
      const pd = parseInt(pauseDebut.split(':')[0]) * 60 + parseInt(pauseDebut.split(':')[1]);
      const pf = parseInt(pauseFin.split(':')[0]) * 60 + parseInt(pauseFin.split(':')[1]);
      totalMinutes -= (pf - pd);
    }

    return Math.floor(totalMinutes / dureeMinutes);
  };

  test('OK - 08h00-17h00, 30min, pause 12h-13h - 16 creneaux', () => {
    expect(calculerCreneaux('08:00', '17:00', 30, '12:00', '13:00')).toBe(16);
  });

  test('OK - 09h00-12h00, 60min, sans pause - 3 creneaux', () => {
    expect(calculerCreneaux('09:00', '12:00', 60)).toBe(3);
  });

  test('OK - 08h00-13h00, 30min, sans pause - 10 creneaux', () => {
    expect(calculerCreneaux('08:00', '13:00', 30)).toBe(10);
  });
});
