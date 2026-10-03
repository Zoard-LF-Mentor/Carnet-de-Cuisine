(function (app) {
  const e = app.escape;

  function selectedRecipes() {
    return app.state.recipesToPrepare
      .map((id) => app.recipes.find((entry) => entry.recipe.identifiant === id))
      .filter(Boolean)
      .map((entry) => entry.recipe);
  }

  function scaledIngredient(recipe, ingredient) {
    const servings = Number(app.state.portions[recipe.identifiant] || recipe.portions || 1);
    const base = Number(recipe.portions) || servings;
    const quantity = typeof ingredient.quantite === "number"
      ? Math.round(ingredient.quantite * servings / base * 100) / 100
      : ingredient.quantite;
    return { ...ingredient, quantite: quantity };
  }

  function ingredientGroups(recipes) {
    const groups = new Map();
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients || []) {
        const key = app.normalize(ingredient.nom);
        if (!key) continue;
        const group = groups.get(key) || { key, name: ingredient.nom.trim(), entries: [] };
        group.entries.push({ recipe, ingredient: scaledIngredient(recipe, ingredient) });
        groups.set(key, group);
      }
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  function renderIngredient(group, groups) {
    const inPantry = app.hasPantryIngredient(group.name);
    const normalized = app.normalize(group.name);
    const inShopping = app.pantry.shopping.some((item) => app.normalize(item.name) === normalized);
    const preparation = app.state.preparationItems[group.key] || {};
    const sources = group.entries.map(({ recipe, ingredient }) => `<li><span>${e(recipe.nom)}</span><strong>${e(app.labelIngredient(ingredient))}</strong></li>`).join("");
    const destinations = inPantry
      ? `<button class="action-retirer-garde-manger" type="button" data-action="remove-preparation-pantry" data-name="${e(group.name)}">Retirer du garde-manger</button>`
      : `<div class="actions-destination-ingredient"><label><input type="checkbox" data-preparation-destination="pantry" data-ingredient="${e(group.name)}"> Ajouter au garde-manger</label><label><input type="checkbox" data-preparation-destination="shopping" data-ingredient="${e(group.name)}" ${inShopping ? "checked" : ""}> Ajouter à l’épicerie</label></div>`;
    const groupOptions = [`<option value="" ${!preparation.groupId ? "selected" : ""}>Sans groupe</option>`, ...groups.map((item) => `<option value="${e(item.id)}" ${preparation.groupId === item.id ? "selected" : ""}>${e(item.name)}</option>`)].join("");
    const status = inPantry ? "Au garde-manger" : inShopping ? "Dans l’épicerie" : "À obtenir";
    return `<li class="carte-ingredient-plan ${preparation.ready ? "ingredient-plan-pret" : ""}" data-ingredient-key="${e(group.key)}" draggable="true"><div class="entete-ingredient-plan"><span class="poignee-deplacement" title="Glisser pour déplacer dans un groupe" aria-hidden="true">⠿</span><div class="identite-ingredient-plan"><h4>${e(group.name)}</h4><span class="statut-ingredient-plan ${inPantry ? "statut-disponible" : inShopping ? "statut-liste" : "statut-manquant"}">${status}</span></div><label class="case-ingredient-pret"><input type="checkbox" data-preparation-ready data-ingredient-key="${e(group.key)}" ${preparation.ready ? "checked" : ""}><span>Prêt</span></label></div><div class="actions-ingredient-plan">${destinations}</div><div class="outils-ingredient-plan"><label>Groupe<select data-preparation-group data-ingredient-key="${e(group.key)}">${groupOptions}</select></label><details class="utilisations-ingredient"><summary>${group.entries.length} recette${group.entries.length === 1 ? "" : "s"} · quantités</summary><ul>${sources}</ul></details></div></li>`;
  }

  function renderIngredientGroup(group, ingredients, custom = false) {
    const items = ingredients.filter((item) => (app.state.preparationItems[item.key]?.groupId || "") === group.id);
    const content = items.length
      ? `<ul class="grille-ingredients-plan">${items.map((item) => renderIngredient(item, app.state.preparationGroups)).join("")}</ul>`
      : `<p class="zone-depot-vide">Déposez ici un ingrédient pour le regrouper.</p>`;
    return `<section class="groupe-ingredients-plan ${custom ? "groupe-personnalise-plan" : ""}" data-drop-group="${e(group.id)}"><header class="entete-groupe-plan"><div><h3>${e(group.name)}</h3><span>${items.length} ingrédient${items.length === 1 ? "" : "s"}</span></div>${custom ? `<button class="bouton-retirer-groupe" type="button" data-action="remove-preparation-group" data-id="${e(group.id)}" aria-label="Supprimer le groupe ${e(group.name)}" title="Supprimer le groupe">×</button>` : ""}</header>${content}</section>`;
  }

  function renderPreparationView() {
    const recipes = selectedRecipes();
    const groups = ingredientGroups(recipes);
    const header = app.viewUtils.pageHeader("Votre plan de cuisine", "Préparation", `${recipes.length} recette${recipes.length === 1 ? "" : "s"} dans votre plan.`);
    if (!recipes.length) {
      return `<section class="vue-preparation contenu-vue">${header}<div class="etat-vide"><span class="symbole-etat-vide" aria-hidden="true">＋</span><h2>Aucune recette sélectionnée</h2><p>Parcourez le carnet et choisissez les recettes que vous souhaitez préparer. Leurs ingrédients seront réunis ici.</p><button class="bouton-secondaire" type="button" data-view="recettes">Parcourir les recettes</button></div></section>`;
    }
    const recipeList = recipes.map((recipe, index) => `<li class="carte-recette-plan"><span class="numero-recette-plan">${String(index + 1).padStart(2, "0")}</span><div class="infos-recette-plan"><span>${e(recipe.categorie || "Recette")} · ${Number(app.state.portions[recipe.identifiant] || recipe.portions || 1)} portions</span><button class="recette-preparee-nom" type="button" data-action="detail" data-id="${e(recipe.identifiant)}">${e(recipe.nom)}</button></div><button class="retirer-recette-preparee" type="button" data-action="remove-preparation" data-id="${e(recipe.identifiant)}" aria-label="Retirer ${e(recipe.nom)}" title="Retirer la recette">×</button></li>`).join("");
    const readyCount = groups.filter((group) => app.state.preparationItems[group.key]?.ready).length;
    const inPantryCount = groups.filter((group) => app.hasPantryIngredient(group.name)).length;
    const missingCount = groups.length - inPantryCount;
    const progress = groups.length ? Math.round(readyCount / groups.length * 100) : 0;
    const boardGroups = [
      renderIngredientGroup({ id: "", name: "À organiser" }, groups),
      ...app.state.preparationGroups.map((group) => renderIngredientGroup(group, groups, true))
    ].join("");
    return `<section class="vue-preparation contenu-vue">${header}<section class="section-recettes-preparees"><header class="entete-recettes-plan"><div><p class="surtitre">Votre sélection</p><h2>Recettes choisies <span>${recipes.length}</span></h2></div><button class="bouton-discret" type="button" data-action="clear-preparation">Effacer le plan</button></header><ul class="liste-recettes-preparees">${recipeList}</ul></section><section class="resume-preparation"><div class="progression-preparation"><div><strong>${readyCount}</strong><span>sur ${groups.length} ingrédients prêts</span></div><progress max="${Math.max(groups.length, 1)}" value="${readyCount}" aria-label="Progression de la préparation"></progress></div><div class="compteurs-preparation"><div><strong>${groups.length}</strong><span>ingrédients</span></div><div><strong>${inPantryCount}</strong><span>au garde-manger</span></div><div><strong>${missingCount}</strong><span>à obtenir</span></div></div></section><section class="section-ingredients-preparees"><header class="entete-ingredients-plan"><div><p class="surtitre">Votre plan de travail</p><h2>Ingrédients</h2></div><form class="formulaire-groupe-preparation" data-form="preparation-group"><label class="texte-masque" for="nom-groupe-preparation">Nom du groupe</label><input id="nom-groupe-preparation" name="group" maxlength="32" placeholder="Ex. Sauce ou légumes" required><button type="submit" aria-label="Créer le groupe" title="Créer le groupe">+</button></form></header><p class="aide-glisser-plan">Les groupes sont des colonnes facultatives pour classer vos ingrédients, par exemple « Sauce » ou « Légumes ». Sinon, laissez-les dans « À organiser ». Déplacez une carte en la glissant ou avec son menu.</p><div class="tableau-ingredients-plan">${boardGroups}</div></section></section>`;
  }

  app.renderPreparationView = renderPreparationView;
})(window.AtTable = window.AtTable || {});
