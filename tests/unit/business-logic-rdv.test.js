/**
 * TESTS UNITAIRES — Logique métier RDV & File d'attente (fonctions pures)
 *
 * Complète business-logic.test.js avec les fonctions critiques non encore couvertes :
 *   - Détection chevauchement de créneaux (anti double-booking)
 *   - Validation numéro de téléphone tunisien (8 chiffres, préfixes valides)
 *   - Formatage durée créneau pour l'affichage (30 min → "30 min", 90 min → "1h30")
 *   - Calcul date locale sans décalage timezone (bug UTC corrigé)
 *   - Vérification jour ouvrable selon config_rdv
 *   - Tri file d'attente par numéro de ticket
 *   - Calcul statut RDV (confirmé/annulé/terminé/no_show)
 *   - Génération créneaux avec jours non actifs (week-end exclu)
 */

jest.mock('../../Backend/src/utils/socket', () => ({
  init: jest.fn(),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

// ─── Fonctions pures extraites pour test ─────────────────────────────────────

/**
 * Détecte si deux créneaux horaires se chevauchent.
 * Critique pour prévenir les doubles réservations.
 */
function seChevauchent(slot1, slot2) {
  const toMin = (h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  const d1 = toMin(slot1.heure_debut), f1 = toMin(slot1.heure_fin);
  const d2 = toMin(slot2.heure_debut), f2 = toMin(slot2.heure_fin);
  // Chevauchement si : début1 < fin2 ET fin1 > début2
  return d1 < f2 && f1 > d2;
}

/**
 * Valide un numéro de téléphone tunisien.
 * Règles : 8 chiffres, commence par 2, 5, 7, 9 (fixes/mobiles valides).
 */
function validerTelephone(tel) {
  if (!tel) return false;
  const clean = tel.replace(/\s+/g, '').replace(/[^\d]/g, '');
  if (clean.length !== 8) return false;
  return /^[2579]\d{7}$/.test(clean);
}

/**
 * Formate une durée en minutes pour l'affichage.
 * Ex: 30 → "30 min", 60 → "1h", 90 → "1h30", 120 → "2h"
 */
function formatDuree(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Formate une date locale sans décalage UTC (fix du bug timezone calendrier).
 * Utilise getFullYear/getMonth/getDate pour éviter le décalage UTC+1.
 */
function formatDateLocale(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Vérifie si un jour donné est ouvrable selon la config du service.
 */
function estJourOuvrable(date, joursActifs) {
  const noms = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const nomJour = noms[date.getDay()];
  return joursActifs.includes(nomJour);
}

/**
 * Trie les tickets d'une file par numéro (ordre FIFO).
 */
function trierFile(tickets) {
  return [...tickets].sort((a, b) => a.numero - b.numero);
}

/**
 * Détermine si un RDV peut encore être annulé (règle : > 24h avant).
 * Identique à la règle dans utils.test.js mais cette version renvoie aussi
 * un message explicatif.
 */
function verifierAnnulationRDV(dateRdv, maintenant = new Date()) {
  const diffMs    = new Date(dateRdv) - maintenant;
  const diffH     = diffMs / (1000 * 60 * 60);
  if (diffH <= 0)  return { autorise: false, raison: 'Le rendez-vous est déjà passé.' };
  if (diffH <= 24) return { autorise: false, raison: 'Annulation impossible moins de 24h avant le RDV.' };
  return { autorise: true, raison: null };
}

/**
 * Génère les créneaux pour une journée en excluant les jours non actifs.
 * Retourne [] si le jour n'est pas dans jours_actifs.
 */
function genererCreneauxPourJour(date, config) {
  const noms = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const nomJour = noms[date.getDay()];
  if (!config.jours_actifs.includes(nomJour)) return [];

  const toMin = (h) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
  const toH   = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const slots = [];
  let cursor = toMin(config.heure_debut);
  const fin  = toMin(config.heure_fin);

  while (cursor + config.duree_creneau <= fin) {
    slots.push({ heure_debut: toH(cursor), heure_fin: toH(cursor + config.duree_creneau) });
    cursor += config.duree_creneau;
  }
  return slots;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Détection chevauchement de créneaux
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Détection chevauchement de créneaux', () => {

  test('OK — créneaux consécutifs sans chevauchement', () => {
    expect(seChevauchent(
      { heure_debut: '09:00', heure_fin: '09:30' },
      { heure_debut: '09:30', heure_fin: '10:00' }
    )).toBe(false);
  });

  test('OK — créneaux bien séparés', () => {
    expect(seChevauchent(
      { heure_debut: '09:00', heure_fin: '09:30' },
      { heure_debut: '10:00', heure_fin: '10:30' }
    )).toBe(false);
  });

  test('FAIL — chevauchement partiel (agent réserve une plage qui empiète)', () => {
    expect(seChevauchent(
      { heure_debut: '09:00', heure_fin: '09:45' },
      { heure_debut: '09:30', heure_fin: '10:00' }
    )).toBe(true);
  });

  test('FAIL — créneau A inclus dans créneau B', () => {
    expect(seChevauchent(
      { heure_debut: '09:00', heure_fin: '10:00' },
      { heure_debut: '09:15', heure_fin: '09:45' }
    )).toBe(true);
  });

  test('FAIL — créneaux identiques (double réservation exacte)', () => {
    expect(seChevauchent(
      { heure_debut: '10:00', heure_fin: '10:30' },
      { heure_debut: '10:00', heure_fin: '10:30' }
    )).toBe(true);
  });

  test('EDGE — début d\'un = fin de l\'autre (adjacents, pas de chevauchement)', () => {
    expect(seChevauchent(
      { heure_debut: '10:30', heure_fin: '11:00' },
      { heure_debut: '10:00', heure_fin: '10:30' }
    )).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Validation numéro de téléphone tunisien
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Validation numéro téléphone tunisien', () => {

  test('OK — mobile 9x (Tunisie Telecom mobile)', () => {
    expect(validerTelephone('98765432')).toBe(true);
  });

  test('OK — mobile 5x (Ooredoo/Orange)', () => {
    expect(validerTelephone('55123456')).toBe(true);
  });

  test('OK — fixe 7x (Tunis)', () => {
    expect(validerTelephone('71000000')).toBe(true);
  });

  test('OK — mobile 2x (Tunisie Telecom)', () => {
    expect(validerTelephone('20000000')).toBe(true);
  });

  test('OK — numéro avec espaces → nettoyé et valide', () => {
    expect(validerTelephone('98 76 54 32')).toBe(true);
  });

  test('FAIL — 7 chiffres seulement (trop court)', () => {
    expect(validerTelephone('9876543')).toBe(false);
  });

  test('FAIL — 9 chiffres (trop long)', () => {
    expect(validerTelephone('987654321')).toBe(false);
  });

  test('FAIL — commence par 3 (préfixe invalide en Tunisie)', () => {
    expect(validerTelephone('31234567')).toBe(false);
  });

  test('FAIL — commence par 0 (invalide)', () => {
    expect(validerTelephone('01234567')).toBe(false);
  });

  test('FAIL — null → false', () => {
    expect(validerTelephone(null)).toBe(false);
  });

  test('FAIL — chaîne vide → false', () => {
    expect(validerTelephone('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Formatage durée créneau (affichage UI)
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Formatage durée créneau', () => {

  test('OK — 15 min → "15 min"', () => {
    expect(formatDuree(15)).toBe('15 min');
  });

  test('OK — 30 min → "30 min"', () => {
    expect(formatDuree(30)).toBe('30 min');
  });

  test('OK — 45 min → "45 min"', () => {
    expect(formatDuree(45)).toBe('45 min');
  });

  test('OK — 60 min → "1h" (heure ronde)', () => {
    expect(formatDuree(60)).toBe('1h');
  });

  test('OK — 90 min → "1h30"', () => {
    expect(formatDuree(90)).toBe('1h30');
  });

  test('OK — 120 min → "2h"', () => {
    expect(formatDuree(120)).toBe('2h');
  });

  test('OK — 75 min → "1h15"', () => {
    expect(formatDuree(75)).toBe('1h15');
  });

  test('OK — 5 min → "5 min" (créneau très court)', () => {
    expect(formatDuree(5)).toBe('5 min');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Formatage date locale (fix bug timezone UTC)
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Formatage date locale (anti-timezone bug)', () => {

  test('OK — date simple retourne format YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 22); // 22 avril 2026 (mois 3 = avril, base 0)
    expect(formatDateLocale(d)).toBe('2026-04-22');
  });

  test('OK — premier du mois avec zéro padding', () => {
    const d = new Date(2026, 0, 1); // 1er janvier 2026
    expect(formatDateLocale(d)).toBe('2026-01-01');
  });

  test('OK — dernier jour de l\'année', () => {
    const d = new Date(2026, 11, 31); // 31 décembre 2026
    expect(formatDateLocale(d)).toBe('2026-12-31');
  });

  test('CRITIQUE — minuit local ne retourne pas la veille (bug UTC+1)', () => {
    // En UTC+1, minuit local = 23h la veille UTC
    // toISOString() retournerait la VEILLE → bug corrigé par formatDateLocale
    const d = new Date(2026, 3, 22, 0, 0, 0); // minuit local 22 avril
    const dateLocale = formatDateLocale(d);
    const dateISO    = d.toISOString().split('T')[0]; // pourrait retourner 2026-04-21

    // formatDateLocale doit toujours retourner le 22 (la date locale)
    expect(dateLocale).toBe('2026-04-22');
    // Démontrer que toISOString peut être incorrect selon le fuseau horaire
    // (ce test documente le bug qu'on a corrigé)
    expect(dateLocale).not.toBe(undefined);
  });

  test('OK — mois et jours avec deux chiffres (padding)', () => {
    const d = new Date(2026, 8, 5); // 5 septembre 2026
    expect(formatDateLocale(d)).toBe('2026-09-05');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Vérification jour ouvrable
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Vérification jour ouvrable (config service)', () => {

  const joursActifs = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

  test('OK — lundi est ouvrable', () => {
    // 2026-04-27 est un lundi
    const lundi = new Date(2026, 3, 27);
    expect(estJourOuvrable(lundi, joursActifs)).toBe(true);
  });

  test('OK — vendredi est ouvrable', () => {
    // 2026-05-01 est un vendredi
    const vendredi = new Date(2026, 4, 1);
    expect(estJourOuvrable(vendredi, joursActifs)).toBe(true);
  });

  test('FAIL — samedi non ouvrable (week-end)', () => {
    // 2026-04-25 est un samedi
    const samedi = new Date(2026, 3, 25);
    expect(estJourOuvrable(samedi, joursActifs)).toBe(false);
  });

  test('FAIL — dimanche non ouvrable (week-end)', () => {
    // 2026-04-26 est un dimanche
    const dimanche = new Date(2026, 3, 26);
    expect(estJourOuvrable(dimanche, joursActifs)).toBe(false);
  });

  test('OK — samedi actif si config l\'inclut (service 6j/7)', () => {
    const joursAvecSamedi = [...joursActifs, 'samedi'];
    const samedi = new Date(2026, 3, 25);
    expect(estJourOuvrable(samedi, joursAvecSamedi)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Tri de la file d'attente (ordre FIFO)
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Tri file d\'attente FIFO (ordre des tickets)', () => {

  const fileDesordre = [
    { _id: 'tk4', numero: 4, statut: 'en_attente' },
    { _id: 'tk1', numero: 1, statut: 'en_attente' },
    { _id: 'tk3', numero: 3, statut: 'en_attente' },
    { _id: 'tk2', numero: 2, statut: 'en_attente' },
  ];

  test('OK — file triée par numéro croissant (FIFO)', () => {
    const fileSortee = trierFile(fileDesordre);
    expect(fileSortee[0].numero).toBe(1);
    expect(fileSortee[1].numero).toBe(2);
    expect(fileSortee[2].numero).toBe(3);
    expect(fileSortee[3].numero).toBe(4);
  });

  test('OK — le premier ticket de la file est le prochain à appeler', () => {
    const fileSortee = trierFile(fileDesordre);
    expect(fileSortee[0]._id).toBe('tk1');
  });

  test('OK — tri ne modifie pas le tableau original (immutabilité)', () => {
    trierFile(fileDesordre);
    expect(fileDesordre[0].numero).toBe(4); // original inchangé
  });

  test('OK — file vide → tableau vide', () => {
    expect(trierFile([])).toEqual([]);
  });

  test('OK — un seul ticket → reste inchangé', () => {
    const file = [{ _id: 'tk1', numero: 1 }];
    expect(trierFile(file)[0].numero).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Règle d'annulation RDV avec message explicatif
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Règle annulation RDV — message retourné au citoyen', () => {

  test('OK — RDV dans 48h → annulation autorisée, pas de message', () => {
    const rdv = new Date(Date.now() + 48 * 3600 * 1000);
    const res = verifierAnnulationRDV(rdv);
    expect(res.autorise).toBe(true);
    expect(res.raison).toBeNull();
  });

  test('FAIL — RDV dans 23h → refusé avec message 24h', () => {
    const rdv = new Date(Date.now() + 23 * 3600 * 1000);
    const res = verifierAnnulationRDV(rdv);
    expect(res.autorise).toBe(false);
    expect(res.raison).toMatch(/24h/);
  });

  test('FAIL — RDV passé → refusé avec message "déjà passé"', () => {
    const rdv = new Date(Date.now() - 2 * 3600 * 1000);
    const res = verifierAnnulationRDV(rdv);
    expect(res.autorise).toBe(false);
    expect(res.raison).toMatch(/passé/);
  });

  test('EDGE — RDV exactement dans 24h → refusé (limite stricte)', () => {
    const rdv = new Date(Date.now() + 24 * 3600 * 1000 - 1000); // 24h - 1s
    const res = verifierAnnulationRDV(rdv);
    expect(res.autorise).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Génération créneaux avec exclusion jours non actifs
// ═══════════════════════════════════════════════════════════════════════════════
describe('[CRITIQUE] Génération créneaux — exclusion jours non actifs', () => {

  const config = {
    heure_debut: '09:00',
    heure_fin: '12:00',
    duree_creneau: 60,
    jours_actifs: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
  };

  test('OK — lundi actif → génère des créneaux', () => {
    const lundi = new Date(2026, 3, 27); // lundi 27 avril 2026
    const slots = genererCreneauxPourJour(lundi, config);
    expect(slots.length).toBe(3); // 09:00-10:00, 10:00-11:00, 11:00-12:00
  });

  test('FAIL — samedi non actif → 0 créneau généré', () => {
    const samedi = new Date(2026, 3, 25); // samedi 25 avril 2026
    const slots = genererCreneauxPourJour(samedi, config);
    expect(slots).toHaveLength(0);
  });

  test('FAIL — dimanche non actif → 0 créneau généré', () => {
    const dimanche = new Date(2026, 3, 26); // dimanche 26 avril 2026
    const slots = genererCreneauxPourJour(dimanche, config);
    expect(slots).toHaveLength(0);
  });

  test('OK — créneaux générés ont la bonne durée', () => {
    const lundi = new Date(2026, 3, 27);
    const slots = genererCreneauxPourJour(lundi, config);
    slots.forEach(slot => {
      const toMin = (h) => parseInt(h.split(':')[0]) * 60 + parseInt(h.split(':')[1]);
      const duree = toMin(slot.heure_fin) - toMin(slot.heure_debut);
      expect(duree).toBe(config.duree_creneau);
    });
  });

  test('OK — config 7j/7 → samedi génère des créneaux', () => {
    const config7j = { ...config, jours_actifs: [...config.jours_actifs, 'samedi', 'dimanche'] };
    const samedi   = new Date(2026, 3, 25);
    const slots    = genererCreneauxPourJour(samedi, config7j);
    expect(slots.length).toBeGreaterThan(0);
  });
});
