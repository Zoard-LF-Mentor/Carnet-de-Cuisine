(function (app) {
  const recipes = [];
  const synonyms = {};

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function register(recipe, metadata = {}) {
    if (!recipe || typeof recipe !== "object" || !recipe.identifiant || !recipe.nom || recipes.some((item) => item.recipe.identifiant === recipe.identifiant)) return;
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.some((item) => !item || typeof item.nom !== "string")) return;
    recipes.push({ recipe, metadata });
    Object.assign(synonyms, metadata.synonymes || {});
  }

  function unregisterPersonalRecipe(id) {
    const index = recipes.findIndex((entry) => entry.recipe.identifiant === id && entry.metadata.owner === "Nathalie");
    if (index >= 0) recipes.splice(index, 1);
  }

  function minutes(recipe, field) {
    if (recipe[field] === null || recipe[field] === undefined || recipe[field] === "") return null;
    const value = Number(recipe[field]);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function totalTime(recipe) {
    const prep = minutes(recipe, "preparation");
    const cook = minutes(recipe, "cuisson");
    const wait = minutes(recipe, "attente") || 0;
    return prep === null && cook === null ? null : (prep || 0) + (cook || 0) + wait;
  }

  function hasPantryIngredient(name) {
    const pantry = app.pantry.ingredients.map(normalize);
    const target = normalize(name);
    if (pantry.includes(target)) return true;
    return Object.entries(synonyms).some(([alias, canonical]) =>
      (normalize(canonical) === target && pantry.includes(normalize(alias))) ||
      (normalize(alias) === target && pantry.includes(normalize(canonical)))
    );
  }

  function score(entry) {
    const list = entry.recipe.ingredients || [];
    if (!app.pantry.ingredients.length || !list.length) return null;
    return Math.round(list.filter((item) => hasPantryIngredient(item.nom)).length / list.length * 100);
  }

  function visible() {
    const state = app.state;
    const filtered = recipes.filter((entry) => {
      const recipe = entry.recipe;
      const preferences = (recipe.preferences || []).map(normalize);
      if (state.preferences.some((preference) => !preferences.includes(normalize(preference)))) return false;
      if (state.category !== "toutes" && recipe.categorie !== state.category) return false;
      if (state.favoritesOnly && !state.favorites.includes(recipe.identifiant)) return false;
      const prep = minutes(recipe, "preparation");
      const total = totalTime(recipe);
      if (state.maxPrep < 180 && prep !== null && prep > state.maxPrep) return false;
      if (state.maxTime < 360 && total !== null && total > state.maxTime) return false;
      const text = normalize(`${recipe.nom} ${recipe.description || ""} ${recipe.categorie || ""} ${recipe.cuisine || ""}`);
      return !state.search || text.includes(normalize(state.search));
    });
    const comparators = {
      nom: (a, b) => a.recipe.nom.localeCompare(b.recipe.nom, "fr"),
      temps: (a, b) => (totalTime(a.recipe) ?? Infinity) - (totalTime(b.recipe) ?? Infinity),
      score: (a, b) => (score(b) ?? -1) - (score(a) ?? -1) || a.recipe.nom.localeCompare(b.recipe.nom, "fr")
    };
    return filtered.sort(comparators[state.sort] || comparators.score);
  }

  function categories() {
    return [...new Set(recipes.map(({ recipe }) => recipe.categorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  }

  function ingredientCatalog() {
    const counts = new Map();
    for (const { recipe } of recipes) for (const ingredient of recipe.ingredients || []) {
      const key = normalize(ingredient.nom);
      if (!key) continue;
      const item = counts.get(key) || { name: ingredient.nom.trim(), count: 0 };
      item.count += 1;
      counts.set(key, item);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  }

  function labelIngredient(item) {
    const amount = item.quantite === null || item.quantite === undefined || item.quantite === "" ? "" : `${item.quantite} `;
    return `${amount}${item.unite ? `${item.unite} ` : ""}${item.nom}`.trim();
  }

  app.recipes = recipes;
  app.registerRecipe = register;
  app.unregisterPersonalRecipe = unregisterPersonalRecipe;
  app.normalize = normalize;
  app.escape = escape;
  app.minutes = minutes;
  app.totalTime = totalTime;
  app.score = score;
  app.hasPantryIngredient = hasPantryIngredient;
  app.visibleRecipes = visible;
  app.categories = categories;
  app.ingredientCatalog = ingredientCatalog;
  app.labelIngredient = labelIngredient;
  window.enregistrerRecette = register;
})(window.AtTable = window.AtTable || {});
