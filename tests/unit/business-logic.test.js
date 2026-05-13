/**
 * TESTS UNITAIRES — Logique métier critique FileZen
 *
 * Couvre les fonctions pures les plus critiques :
 *   - Génération de créneaux horaires (cœur du système RDV)
 *   - Formatage numéro WhatsApp tunisien
 *   - Calcul position file d'attente
 *   - Règles de validation mot de passe
 *   - Calcul temps d'attente estimé
 */

jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

// ─── Import depuis le vrai fichier backend (génère la couverture réelle) ──────
const {
  genererSlotsHoraires,
  formatTunisianPhone,
  calculerTempsAttente,
  validerMotDePasse,
} = require('../../Backend/src/utils/business-logic');

const { withAllureLabels } = require('../setup/allure-labels');
let _step;
try { _step = require('allure-js-commons').step; } catch(_) { _step = async (_n, fn) => fn && fn(); }

// ─── SUITE 1 : Génération de créneaux horaires ───────────────────────────────
describe('[CRITIQUE] Génération créneaux horaires', () => {
  withAllureLabels('🔵 Tests Unitaires', 'Logique Métier Core', 'Génération Créneaux');

  test('OK — 08:00-17:00 durée 30min sans pause → 18 créneaux', async () => {
    let slots;
    await _step('Étape 1 — Appel de genererSlotsHoraires(08:00, 17:00, 30)', async () => {
      slots = genererSlotsHoraires('08:00', '17:00', 30);
    });
    await _step('Étape 2 — Vérifier le nombre de créneaux (attendu: 18)', async () => {
      expect(slots).toHaveLength(18);
    });
    await _step('Étape 3 — Vérifier le premier et dernier créneau', async () => {
      expect(slots[0]).toEqual({ heure_debut: '08:00', heure_fin: '08:30' });
      expect(slots[17]).toEqual({ heure_debut: '16:30', heure_fin: '17:00' });
    });
  });

  test('OK — 08:00-17:00 durée 30min avec pause 12:00-13:00 → 16 créneaux', () => {
    const slots = genererSlotsHoraires('08:00', '17:00', 30, '12:00', '13:00');
    expect(slots).toHaveLength(16);
    // Vérifier qu'aucun créneau ne chevauche la pause
    const chevauchePause = slots.some(s => {
      const d = parseInt(s.heure_debut.replace(':', ''));
      const f = parseInt(s.heure_fin.replace(':', ''));
      return d < 1300 && f > 1200;
    });
    expect(chevauchePause).toBe(false);
  });

  test('OK — 09:00-12:00 durée 60min → 3 créneaux', () => {
    const slots = genererSlotsHoraires('09:00', '12:00', 60);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ heure_debut: '09:00', heure_fin: '10:00' });
  });

  test('OK — durée personnalisée 45min → créneaux cohérents', () => {
    const slots = genererSlotsHoraires('08:00', '12:00', 45);
    expect(slots).toHaveLength(5); // 08:00-08:45, 08:45-09:30, 09:30-10:15, 10:15-11:00, 11:00-11:45
    slots.forEach(s => {
      const duree = (parseInt(s.heure_fin.split(':')[0]) * 60 + parseInt(s.heure_fin.split(':')[1]))
                  - (parseInt(s.heure_debut.split(':')[0]) * 60 + parseInt(s.heure_debut.split(':')[1]));
      expect(duree).toBe(45);
    });
  });

  test('FAIL — heure début = heure fin → 0 créneaux', () => {
    const slots = genererSlotsHoraires('09:00', '09:00', 30);
    expect(slots).toHaveLength(0);
  });

  test('FAIL — durée > plage horaire → 0 créneaux', () => {
    const slots = genererSlotsHoraires('09:00', '09:20', 30);
    expect(slots).toHaveLength(0);
  });
});

// ─── SUITE 2 : Formatage numéro WhatsApp tunisien ────────────────────────────
describe('[CRITIQUE] Formatage numéro WhatsApp tunisien', () => {
  withAllureLabels('🔵 Tests Unitaires', 'Logique Métier Core', 'Formatage WhatsApp');

  test('OK — numéro 8 chiffres → 21612345678@c.us', () => {
    expect(formatTunisianPhone('12345678')).toBe('21612345678@c.us');
  });

  test('OK — numéro avec préfixe +216 → format correct', () => {
    expect(formatTunisianPhone('+21698765432')).toBe('21698765432@c.us');
  });

  test('OK — numéro avec préfixe 216 → format correct', () => {
    expect(formatTunisianPhone('21698765432')).toBe('21698765432@c.us');
  });

  test('OK — numéro avec espaces → nettoyé', () => {
    expect(formatTunisianPhone('98 76 54 32')).toBe('21698765432@c.us');
  });

  test('FAIL — numéro null → null', () => {
    expect(formatTunisianPhone(null)).toBeNull();
  });

  test('FAIL — numéro vide → null', () => {
    expect(formatTunisianPhone('')).toBeNull();
  });

  test('FAIL — numéro invalide (trop court) → null', () => {
    expect(formatTunisianPhone('1234')).toBeNull();
  });
});

// ─── SUITE 3 : Calcul temps d'attente ────────────────────────────────────────
describe('[CRITIQUE] Calcul temps d\'attente estimé', () => {
  withAllureLabels('🔵 Tests Unitaires', 'Logique Métier Core', 'Calcul Temps Attente');

  test('OK — 5 personnes avant, 15 min/ticket → 75 min', () => {
    expect(calculerTempsAttente(5, 15)).toBe(75);
  });

  test('OK — 0 personnes avant → 0 min (prochain)', () => {
    expect(calculerTempsAttente(0, 15)).toBe(0);
  });

  test('OK — 1 personne avant → temps = durée 1 ticket', () => {
    expect(calculerTempsAttente(1, 20)).toBe(20);
  });

  test('OK — 10 personnes, 10 min/ticket → 100 min', () => {
    expect(calculerTempsAttente(10, 10)).toBe(100);
  });

  test('EDGE — position négative → 0 (pas de temps négatif)', () => {
    expect(calculerTempsAttente(-1, 15)).toBe(0);
  });
});

// ─── SUITE 4 : Validation mot de passe ───────────────────────────────────────
describe('[CRITIQUE] Validation mot de passe', () => {
  withAllureLabels('🔵 Tests Unitaires', 'Logique Métier Core', 'Validation Sécurité');

  test('OK — mot de passe 6 caractères → valide', () => {
    expect(validerMotDePasse('abc123')).toBe(true);
  });

  test('OK — mot de passe long → valide', () => {
    expect(validerMotDePasse('SuperSecurePassword@2026')).toBe(true);
  });

  test('FAIL — mot de passe 5 caractères → invalide', () => {
    expect(validerMotDePasse('abc12')).toBe(false);
  });

  test('FAIL — mot de passe vide → invalide', () => {
    expect(validerMotDePasse('')).toBe(false);
  });

  test('FAIL — mot de passe null → invalide', () => {
    expect(validerMotDePasse(null)).toBe(false);
  });
});

// ─── SUITE 5 : Continuité des créneaux ───────────────────────────────────────
describe('[CRITIQUE] Continuité et non-chevauchement des créneaux', () => {
  withAllureLabels('🔵 Tests Unitaires', 'Logique Métier Core', 'Continuité Créneaux');

  test('OK — créneaux consécutifs (fin du précédent = début du suivant)', () => {
    const slots = genererSlotsHoraires('08:00', '12:00', 30);
    for (let i = 0; i < slots.length - 1; i++) {
      expect(slots[i].heure_fin).toBe(slots[i + 1].heure_debut);
    }
  });

  test('OK — pas de chevauchement entre créneaux', () => {
    const slots = genererSlotsHoraires('08:00', '17:00', 45, '12:00', '13:00');
    const toMin = (h) => parseInt(h.split(':')[0]) * 60 + parseInt(h.split(':')[1]);
    for (let i = 0; i < slots.length - 1; i++) {
      expect(toMin(slots[i].heure_fin)).toBeLessThanOrEqual(toMin(slots[i + 1].heure_debut));
    }
  });
});
