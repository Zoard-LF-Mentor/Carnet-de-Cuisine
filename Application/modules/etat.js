(function (app) {
  const APP_KEY = "EtatCuisineV2";
  const PANTRY_KEY = "EtatEpicerieV1";
  const PREFERENCES = ["sans-gluten", "sans-lactose", "végétarien"];

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  const saved = readJson(APP_KEY, readJson("aTableStateV1", {}));
  const state = {
    view: saved.vue || saved.view || "recettes",
    search: saved.recherche || saved.query || "",
    category: saved.categorie || saved.category || "toutes",
    sort: saved.tri || saved.sort || "score",
    maxTime: Math.min(360, Math.max(15, Number(saved.tempsMax ?? saved.maxTime ?? 360) || 360)),
    maxPrep: Math.min(180, Math.max(15, Number(saved.preparationMax ?? saved.maxPrep ?? 180) || 180)),
    preferences: Array.isArray(saved.preferences) ? saved.preferences.filter((value) => PREFERENCES.includes(value)) : [],
    favoritesOnly: Boolean(saved.favorisSeulement ?? saved.favoritesOnly),
    favorites: Array.isArray(saved.favoris || saved.favorites) ? (saved.favoris || saved.favorites) : [],
    recipesToPrepare: Array.isArray(saved.recettesAPreparer) ? saved.recettesAPreparer : [],
    preparationItems: saved.articlesPreparation && typeof saved.articlesPreparation === "object" && !Array.isArray(saved.articlesPreparation) ? saved.articlesPreparation : {},
    preparationGroups: Array.isArray(saved.groupesPreparation) ? saved.groupesPreparation.filter((group) => group && typeof group.id === "string" && typeof group.name === "string") : [],
    filtersCollapsed: Boolean(saved.filtresReplis),
    portions: saved.portions && typeof saved.portions === "object" ? saved.portions : {},
    checkedIngredients: saved.ingredientsCoches && typeof saved.ingredientsCoches === "object" && !Array.isArray(saved.ingredientsCoches) ? saved.ingredientsCoches : {}
  };

  const savedPantry = readJson(PANTRY_KEY, {});
  const legacy = readJson(APP_KEY, readJson("aTableStateV1", {}));
  const pantry = {
    ingredients: Array.isArray(savedPantry.gardeManger || legacy.gardeManger || legacy.pantry)
      ? [...new Set(savedPantry.gardeManger || legacy.gardeManger || legacy.pantry)].filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim())
      : [],
    shopping: Array.isArray(savedPantry.liste) ? savedPantry.liste.filter((item) => item && typeof item.nom === "string").map((item) => ({ name: item.nom, checked: Boolean(item.checked) })) : []
  };

  function saveState() {
    const payload = {
      vue: state.view, recherche: state.search, categorie: state.category, tri: state.sort,
      tempsMax: state.maxTime, preparationMax: state.maxPrep, difficulteMax: state.maxDifficulty,
      preferences: state.preferences, favorisSeulement: state.favoritesOnly,
      favoris: state.favorites, recettesAPreparer: state.recipesToPrepare, filtresReplis: state.filtersCollapsed,
      articlesPreparation: state.preparationItems, groupesPreparation: state.preparationGroups,
      portions: state.portions, ingredientsCoches: state.checkedIngredients
    };
    try { localStorage.setItem(APP_KEY, JSON.stringify(payload)); } catch { /* Storage can be disabled by the browser. */ }
  }

  function savePantry() {
    try {
      localStorage.setItem(PANTRY_KEY, JSON.stringify({ gardeManger: pantry.ingredients, liste: pantry.shopping.map((item) => ({ nom: item.name, checked: item.checked })) }));
    } catch { /* Storage can be disabled by the browser. */ }
  }

  app.preferences = PREFERENCES;
  app.state = state;
  app.pantry = pantry;
  app.saveState = saveState;
  app.savePantry = savePantry;
})(window.AtTable = window.AtTable || {});
