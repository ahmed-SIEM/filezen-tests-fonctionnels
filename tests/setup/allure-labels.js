/**
 * Helper Allure — Organisation hiérarchique des tests dans le rapport
 *
 * API allure-jest v3 : les fonctions epic/feature/story/step sont importées
 * depuis 'allure-js-commons' (pas sur un objet allure global)
 *
 * Résultat dans Allure > onglet "Behaviors" :
 *   Epic    → dossier principal (Unitaires / Intégration / E2E API / E2E IHM)
 *   Feature → sous-dossier (Auth, Tickets, RDV, etc.)
 *   Story   → groupe de tests
 */
let _epic, _feature, _story, _step;
try {
  const allureCommons = require('allure-js-commons');
  _epic    = allureCommons.epic;
  _feature = allureCommons.feature;
  _story   = allureCommons.story;
  _step    = allureCommons.step;
} catch (_) {
  _epic = _feature = _story = () => {};
  _step = async (_name, fn) => fn && fn();
}

/**
 * Enregistre les labels Allure pour tous les tests du describe courant.
 * Doit être appelé DANS un describe(), pas en dehors.
 */
function withAllureLabels(epicName, featureName, storyName = null) {
  beforeEach(() => {
    try {
      _epic(epicName);
      _feature(featureName);
      if (storyName) _story(storyName);
    } catch (_) {}
  });
}

/**
 * Wrapper allure.step() pour ajouter des logs dans le rapport
 */
async function allureStep(name, fn) {
  try {
    return await _step(name, fn);
  } catch (_) {
    return fn && fn();
  }
}

module.exports = { withAllureLabels, allureStep };
