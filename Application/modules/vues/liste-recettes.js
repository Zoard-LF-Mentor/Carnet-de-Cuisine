(function (app) {
  const e = app.escape;
  const { state, pantry } = app;

  function ingredientPills() {
    return pantry.ingredients.map((name) => `<button class="pastille-garde-manger" type="button" data-action="remove-pantry" data-name="${e(name)}"><span>${e(name)}</span><span aria-hidden="true">×</span></button>`).join("") || `<p class="texte-estompe garde-manger-vide">Ajoutez les ingrédients que vous avez sous la main.</p>`;
  }

  function checkboxOptions(label, values, selected, key) {
    return `<fieldset class="groupe-filtres"><legend>${e(label)}</legend><div class="liste-options">${values.map((value) => `<label class="option-bascule"><input type="checkbox" data-filter-list="${key}" value="${e(value)}" ${selected.includes(value) ? "checked" : ""}><span>${e(value)}</span></label>`).join("")}</div></fieldset>`;
  }

  function sidebar() {
    const collapsed = state.filtersCollapsed;
    return `<aside class="panneau-filtres-principal ${collapsed ? "panneau-replie" : ""}"><button class="bouton-replier-filtres" type="button" data-action="toggle-filters" aria-label="${collapsed ? "Afficher les filtres" : "Masquer les filtres"}" aria-expanded="${!collapsed}" title="${collapsed ? "Afficher les filtres" : "Masquer les filtres"}"><span aria-hidden="true">${collapsed ? "›" : "‹"}</span></button><div class="contenu-panneau-filtres">
      <section class="section-laterale"><div class="titre-lateral"><span class="numero-section">01</span><h2>Garde-manger</h2></div>
        <form class="formulaire-garde-manger" data-form="pantry"><label class="texte-masque" for="ajout-garde-manger">Ajouter un ingrédient</label><input id="ajout-garde-manger" name="ingredient" maxlength="60" placeholder="Ajouter un ingrédient" required><button class="bouton-icone" type="submit" aria-label="Ajouter">+</button></form>
        <button class="bouton-explorer-ingredients" type="button" data-action="open-selector">Explorer les ingrédients</button><div class="pastilles-garde-manger">${ingredientPills()}</div>
      </section>
      <section class="section-laterale"><div class="titre-lateral"><span class="numero-section">02</span><h2>Filtres</h2></div>
        ${checkboxOptions("Préférences alimentaires", app.preferences, state.preferences, "preferences")}
        <label class="commande-plage">Temps total maximum<output>${state.maxTime >= 360 ? "Sans limite" : `${state.maxTime} min`}</output><input class="curseur-plage" type="range" min="15" max="360" step="15" value="${state.maxTime}" data-filter="maxTime"></label>
        <label class="commande-plage">Préparation active<output>${state.maxPrep >= 180 ? "Sans limite" : `${state.maxPrep} min`}</output><input class="curseur-plage" type="range" min="15" max="180" step="15" value="${state.maxPrep}" data-filter="maxPrep"></label>
      </section>
    </div></aside>`;
  }

  function recipeCard(entry) {
    const recipe = entry.recipe;
    const percent = app.score(entry);
    const duration = app.totalTime(recipe);
    const image = /^https?:\/\//i.test(recipe.image || "") ? `<img src="${e(recipe.image)}" alt="" loading="lazy"><span class="image-par-defaut" hidden>À table</span>` : `<span class="image-par-defaut">À table</span>`;
    const favorite = state.favorites.includes(recipe.identifiant);
    return `<article class="carte-recette"><div class="image-recette">${image}${percent === null ? "" : `<span class="badge-score">${percent}<small>%</small></span>`}<button class="bouton-favori ${favorite ? "favori-actif" : ""}" type="button" data-action="favorite" data-id="${e(recipe.identifiant)}" aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}">${favorite ? "★" : "☆"}</button></div><div class="corps-carte-recette"><div class="metadonnees-recette"><span>${e(recipe.categorie || "Recette")}</span><span>${duration === null ? "Temps inconnu" : `${duration} min`}</span></div><button class="bouton-titre-recette" type="button" data-action="detail" data-id="${e(recipe.identifiant)}"><h3>${e(recipe.nom)}</h3></button><p class="description-recette">${e(recipe.description || recipe.cuisine || "")}</p><div class="actions-recette"><button class="action-texte" type="button" data-action="detail" data-id="${e(recipe.identifiant)}">Voir</button><button class="action-comparaison" type="button" data-action="add-shopping-recipe" data-id="${e(recipe.identifiant)}">Épicerie +</button><button class="action-preparation ${state.recipesToPrepare.includes(recipe.identifiant) ? "selectionnee" : ""}" type="button" data-action="toggle-preparation" data-id="${e(recipe.identifiant)}" aria-pressed="${state.recipesToPrepare.includes(recipe.identifiant)}">${state.recipesToPrepare.includes(recipe.identifiant) ? "Prévue ✓" : "Préparer +"}</button></div></div></article>`;
  }

  function renderRecipesView() {
    const entries = app.visibleRecipes();
    const results = entries.length
      ? `<div class="grille-recettes">${entries.map(recipeCard).join("")}</div>`
      : `<div class="etat-vide" role="status"><span class="symbole-etat-vide" aria-hidden="true">⌕</span><h3>Aucune recette trouvée</h3><p>Essayez une autre recherche ou élargissez vos filtres pour voir davantage de recettes.</p></div>`;
    return `<div class="espace-travail ${state.filtersCollapsed ? "filtres-replies" : ""}">${sidebar()}<section class="vue-principale"><header class="entete-page"><div><p class="surtitre">À partir de votre garde-manger</p><h1>Qu’est-ce qu’on cuisine<span>?</span></h1><p class="sous-titre-page">Des idées faites pour ce que vous avez et le temps dont vous disposez.</p></div><div class="repere-entete"><span>${app.recipes.length}</span><small>recettes<br>au carnet</small></div></header><div class="barre-outils"><label class="champ-recherche"><span aria-hidden="true">⌕</span><input type="search" data-search placeholder="Rechercher une recette" value="${e(state.search)}"></label><label class="etiquette-selection">Catégorie<select data-filter="category"><option value="toutes">Toutes les catégories</option>${app.categories().map((category) => `<option value="${e(category)}" ${category === state.category ? "selected" : ""}>${e(category)}</option>`).join("")}</select></label><label class="etiquette-selection">Trier<select data-filter="sort"><option value="score" ${state.sort === "score" ? "selected" : ""}>Meilleure correspondance</option><option value="temps" ${state.sort === "temps" ? "selected" : ""}>Plus rapide</option><option value="nom" ${state.sort === "nom" ? "selected" : ""}>Nom A–Z</option></select></label><label class="filtre-favoris"><input type="checkbox" data-filter="favoritesOnly" ${state.favoritesOnly ? "checked" : ""}> Favoris</label></div><div class="resume-resultats"><span><strong>${entries.length}</strong> recette${entries.length === 1 ? "" : "s"}</span><span>${pantry.ingredients.length ? "Classées selon vos ingrédients" : "Ajoutez vos ingrédients pour affiner les idées"}</span></div>${results}</section></div>`;
  }

  app.renderRecipesView = renderRecipesView;
  app.ingredientPills = ingredientPills;
})(window.AtTable = window.AtTable || {});
