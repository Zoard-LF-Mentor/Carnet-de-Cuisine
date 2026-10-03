(function (app) {
  const e = app.escape;
  const { pantry } = app;
  const dialog = document.querySelector("#fenetre-selecteur-ingredients");

  function iconFor(name) {
    const value = app.normalize(name);
    if (/poulet|boeuf|porc|saumon|thon|poisson|crevette|tofu/.test(value)) return "🍗";
    if (/pomme|poire|banane|orange|citron|fraise|bleuet|cerise|ananas|fruit/.test(value)) return "🍎";
    if (/carotte|oignon|ail|tomate|poivron|epinard|chou|champignon|patate|asperge/.test(value)) return "🥕";
    if (/cannelle|poivre|paprika|cumin|persil|thym|gingembre|menthe|piment/.test(value)) return "🌿";
    return "🫙";
  }

  function openSelector(query = "") {
    const catalog = app.ingredientCatalog();
    const owned = new Set(pantry.ingredients.map(app.normalize));
    const normalizedQuery = app.normalize(query);
    const visibleCount = catalog.filter((item) => !normalizedQuery || app.normalize(item.name).includes(normalizedQuery)).length;
    dialog.innerHTML = `<button class="bouton-fermer-fenetre" type="button" aria-label="Fermer" data-close>×</button><div class="contenu-selecteur-ingredients"><header class="entete-selecteur-ingredients"><div><p class="surtitre">Sélection visuelle</p><h2 id="titre-selecteur-ingredients">Composez votre garde-manger<span>.</span></h2><p class="sous-titre-page">Les tuiles vertes sont déjà au garde-manger. Cliquez pour ajouter ou retirer un ingrédient.</p></div><div class="compteur-selecteur"><strong>${pantry.ingredients.length}</strong><span>dans votre garde-manger</span></div></header><label class="recherche-selecteur"><span aria-hidden="true">⌕</span><input type="search" data-catalog-search placeholder="Rechercher un ingrédient" value="${e(query)}"><span class="texte-masque">Filtrer les ingrédients</span></label><div class="actions-selecteur"><p class="resultat-selecteur"><span data-catalog-count>${visibleCount}</span> sur ${catalog.length} ingrédients</p><button class="bouton-secondaire" type="button" data-selector-action="add-all">Tout ajouter au garde-manger</button></div><div class="grille-selecteur-ingredients">${catalog.map((item) => {
      const name = app.normalize(item.name);
      const isOwned = owned.has(name);
      return `<button type="button" class="tuile-ingredient ${isOwned ? "tuile-ingredient-ajoutee" : ""}" data-catalog-item="${e(item.name)}" data-search-value="${e(name)}" aria-pressed="${isOwned}" aria-label="${e(`${item.name}. ${isOwned ? "Déjà au garde-manger. Cliquer pour retirer." : "Cliquer pour ajouter au garde-manger."}`)}"><span class="symbole-ingredient" aria-hidden="true">${iconFor(item.name)}</span><span class="nom-tuile-ingredient">${e(item.name)}</span><small>${isOwned ? "Au garde-manger ✓" : "Ajouter au garde-manger +"}</small></button>`;
    }).join("")}</div></div>`;
    if (!dialog.open) dialog.showModal();
    const search = dialog.querySelector("[data-catalog-search]");
    search.focus();
    search.setSelectionRange(query.length, query.length);
  }

  app.openSelector = openSelector;
  app.ingredientDialog = dialog;
})(window.AtTable = window.AtTable || {});
