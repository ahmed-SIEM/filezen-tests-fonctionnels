# Matrice de Criticité — FileZen

> **Projet** : FileZen — Système de gestion de files d'attente et rendez-vous  
> **Date** : 2026-04-26  
> **Version** : 1.0  

---

## Légende des niveaux de criticité

| Niveau | Label | Définition | Impact en cas de défaillance |
|--------|-------|------------|------------------------------|
| **P0** | CRITIQUE | Bloque complètement un parcours métier | Système inutilisable pour tous les utilisateurs |
| **P1** | HAUTE | Dégrade fortement l'expérience | Perte de fonctionnalité majeure, contournement difficile |
| **P2** | MOYENNE | Impact visible mais contournable | Gêne utilisateur, alternatives possibles |
| **P3** | FAIBLE | Amélioration qualité / confort | Aucun impact opérationnel |

---

## 1. Authentification & Gestion des sessions

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| A-01 | Connexion citoyen / admin / agent | **P0** | Porte d'entrée unique — sans connexion, rien ne fonctionne | UI-AUTH-004, UI-AUTH-005, IHM-CRIT-020 |
| A-02 | Inscription citoyen (multi-étapes) | **P0** | Sans compte, impossible de prendre ticket ou RDV | UI-AUTH-001, UI-AUTH-002, IHM-CRIT-020 |
| A-03 | Protection des routes (guard) | **P0** | Faille = accès non autorisé aux dashboards admin/agent | UI-AUTH-008, UI-AUTH-009, UI-AUTH-010, IHM-CRIT-003 |
| A-04 | Réinitialisation mot de passe | **P1** | Bloque les utilisateurs ayant oublié leur mot de passe | UI-AUTH-006 |
| A-05 | Inscription établissement | **P1** | Processus d'onboarding admin — critique au démarrage | — |
| A-06 | Vérification email | **P2** | Sécurise les comptes mais ne bloque pas immédiatement | — |
| A-07 | Configuration mot de passe agent (lien invite) | **P1** | Seul moyen pour un agent de créer son compte | — |

---

## 2. Gestion des tickets (file d'attente)

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| T-01 | Prise de ticket par le citoyen | **P0** | Fonctionnalité cœur — raison d'être principale de l'app | IHM-CRIT-001, IHM-CRIT-002, INT-TKT-* |
| T-02 | Appel du ticket suivant par l'agent | **P0** | Action fondamentale de l'agent, déclenche WhatsApp + Socket | IHM-CRIT-011, IHM-CRIT-012 |
| T-03 | Marquage "Servi" / "Absent" | **P0** | Libère la file — sans ça, la file se bloque | IHM-CRIT-012 |
| T-04 | Suivi en temps réel (position file) | **P0** | Le citoyen doit savoir quand venir — supprime les files physiques | IHM-CRIT-005 |
| T-05 | Annulation ticket par le citoyen | **P1** | Libère le slot pour d'autres — important pour l'efficacité | IHM-CRIT-004, IHM-CRIT-009 |
| T-06 | Notifications WhatsApp (tour approche) | **P1** | Valeur ajoutée clé — alertes automatiques au citoyen | Unit: formatTunisianPhone |
| T-07 | Affichage file d'attente (stats) | **P1** | L'agent doit voir la file pour décider d'appeler | IHM-CRIT-011, IHM-CRIT-014 |
| T-08 | Export / historique tickets | **P3** | Utile pour rapports mais non bloquant | — |

---

## 3. Gestion des rendez-vous (RDV)

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| R-01 | Calendrier de prise de RDV | **P0** | Interface principale de réservation citoyen | IHM-CRIT-006 |
| R-02 | Génération des créneaux horaires | **P0** | Logique métier critique — sans créneaux, pas de RDV possible | Unit: genererSlotsHoraires |
| R-03 | Confirmation après réservation | **P0** | Le citoyen doit avoir une preuve de sa réservation | IHM-CRIT-007 |
| R-04 | Annulation RDV par le citoyen | **P1** | Libère le créneau — important pour la disponibilité | IHM-CRIT-009 |
| R-05 | Planning RDV de l'agent | **P1** | L'agent doit anticiper sa journée | IHM-CRIT-013 |
| R-06 | Email de confirmation RDV | **P1** | Preuve de réservation hors app | Integration: rendezvous |
| R-07 | Notification fermeture exceptionnelle | **P1** | Informe les citoyens d'annulations imprévues | — |
| R-08 | Gestion des exceptions (fermetures/horaires modifiés) | **P1** | Permet à l'admin d'adapter les créneaux aux imprévus | — |
| R-09 | Rappel RDV (J-1) | **P2** | Améliore le taux de présence | — |

---

## 4. Configuration établissement (Admin)

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| C-01 | Configuration horaires d'ouverture | **P0** | Sans horaires, pas de tickets ni RDV | IHM-CRIT-016 |
| C-02 | Gestion des services | **P0** | Sans services, pas de tickets ni de file | IHM-CRIT-018 |
| C-03 | Configuration créneaux RDV (durée, pause) | **P1** | Détermine tous les créneaux disponibles | IHM-CRIT-017 |
| C-04 | Gestion des agents (invitation) | **P1** | Sans agents, la file d'attente n'est pas gérée | IHM-CRIT-019 |
| C-05 | Dashboard admin (KPIs) | **P1** | Visibilité opérationnelle de l'établissement | IHM-CRIT-015 |
| C-06 | Statistiques détaillées | **P2** | Reporting utile mais non bloquant | INT-STATS-* |
| C-07 | Profile admin | **P3** | Paramètres personnels — non critique | — |

---

## 5. SuperAdmin (Validation établissements)

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| S-01 | Validation / rejet inscription établissement | **P1** | Sans validation, les admins ne peuvent pas utiliser le système | INT-ETAB-* |
| S-02 | Liste des établissements en attente | **P1** | Vue de travail du superadmin | UI-DASH-* |
| S-03 | Accès document PDF de l'établissement | **P2** | Vérifie la légitimité — important mais pas bloquant | — |
| S-04 | Suspension/activation établissement | **P1** | Contrôle de qualité plateforme | — |

---

## 6. Notifications & Communication

| ID | Fonctionnalité | Criticité | Justification | Tests associés |
|----|---------------|-----------|---------------|----------------|
| N-01 | Notification temps réel (Socket.io) | **P1** | Mise à jour file sans rechargement — UX critique | Unit: socket mock |
| N-02 | WhatsApp — tour approche (2 tickets avant) | **P1** | Signature différenciante de l'app | Unit: formatTunisianPhone |
| N-03 | WhatsApp — c'est votre tour | **P0** | Sans ça, le citoyen ne sait pas qu'il doit venir | Unit: formatTunisianPhone |
| N-04 | Email invitation agent | **P1** | Seul moyen de créer un compte agent | — |
| N-05 | Notifications in-app | **P2** | Confort UX — non bloquant | INT-NOTIF-* |

---

## 7. Récapitulatif par niveau

| Criticité | Nb fonctionnalités | Pourcentage |
|-----------|-------------------|-------------|
| **P0 — Critique** | 13 | 32% |
| **P1 — Haute** | 16 | 39% |
| **P2 — Moyenne** | 6 | 15% |
| **P3 — Faible** | 3 | 7% |
| **Non classé** | 3 | 7% |
| **Total** | **41** | 100% |

---

## 8. Correspondance tests — couverture par criticité

| Niveau | Type de test | Couverture actuelle |
|--------|-------------|---------------------|
| P0 | Unitaire + Intégration + IHM | ✅ Couverts (business-logic, integration, critical-journeys) |
| P1 | Intégration + IHM | ✅ Partiellement couverts |
| P2 | API E2E | ⚠️ Partiellement |
| P3 | Manuel / non prioritaire | ❌ Non automatisé |

---

## 9. Risques identifiés (P0 non couverts ou fragiles)

| Risque | Description | Mitigation |
|--------|-------------|------------|
| **Timezone bug** | Décalage UTC/local dans l'API de créneaux | Fix appliqué (getFullYear/getMonth/getDate) |
| **MongoDB Date vs string** | Comparaison `$gte` sur champ Date avec string | Fix appliqué (new Date() + setHours) |
| **Socket déconnexion** | File d'attente non mise à jour si Socket.io tombe | Polling de secours (setInterval 5s) |
| **WhatsApp non connecté** | Notifications WhatsApp non envoyées si QR non scanné | Graceful fail (log uniquement) |
| **Créneaux désync** | Créneaux stale si configuration modifiée | Fix appliqué (deleteMany + régénération) |
