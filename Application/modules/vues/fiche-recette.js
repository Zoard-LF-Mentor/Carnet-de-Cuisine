(function (app) {
  const e = app.escape;
  const { state } = app;
  const dialog = document.querySelector("#fenetre-recette");

  function openRecipe(id) {
    const recipe = app.recipes.find((entry) => entry.recipe.identifiant === id)?.recipe;
    if (!recipe) return;
    const servings = Number(state.portions[id] || recipe.portions || 1);
    const base = Number(recipe.portions) || servings;
    const image = /^https?:\/\//i.test(recipe.image || "") ? `<img class="image-fenetre" src="${e(recipe.image)}" alt="${e(recipe.nom)}">` : "";
    const checkedIngredients = Array.isArray(state.checkedIngredients[id]) ? state.checkedIngredients[id] : [];
    const ingredients = (recipe.ingredients || []).map((item) => {
      const scaled = { ...item, quantite: typeof item.quantite === "number" ? Math.round(item.quantite * servings / base * 100) / 100 : item.quantite };
      const index = (recipe.ingredients || []).indexOf(item);
      const checked = checkedIngredients.includes(index);
      return `<li class="ingredient-detail${checked ? " ingredient-omis" : ""}"><label><input type="checkbox" data-recipe-id="${e(id)}" data-ingredient-check="${index}"${checked ? " checked" : ""}><span>${e(app.labelIngredient(scaled))}</span></label></li>`;
    }).join("");
    const steps = (recipe.etapes || []).map((step) => `<li>${e(step)}</li>`).join("");
    const source = /^https?:\/\//i.test(recipe.source?.url || "") ? `<p><a href="${e(recipe.source.url)}" target="_blank" rel="noopener noreferrer">Source : ${e(recipe.source.nom || "Consulter la source")}</a></p>` : "";
    const prep = app.minutes(recipe, "preparation");
    const cook = app.minutes(recipe, "cuisson");
    const portionNotice = servings === base
      ? "Les quantités suivent le nombre de portions, mais les étapes et la durée affichées ne sont pas recalculées."
      : "Portions modifiées : les quantités sont recalculées, mais les étapes et la durée affichées restent celles de la recette d’origine.";
    const cookingNotice = `${portionNotice} Selon le volume, l’épaisseur et le récipient, il peut falloir adapter le mode ou la durée de cuisson, ou procéder en plusieurs fournées. Vérifiez la cuisson réelle; pour les viandes, volailles et poissons, contrôlez la température à cœur. <a href="https://www.canada.ca/fr/sante-canada/services/conseils-generaux-salubrite/temperatures-securitaires-cuisson-interne.html" target="_blank" rel="noopener noreferrer">Températures sécuritaires de Santé Canada</a>.`;
    dialog.innerHTML = `<button class="bouton-fermer-fenetre" type="button" aria-label="Fermer" data-close>×</button><article class="contenu-fenetre-recette">${image}<p class="surtitre">${e(recipe.categorie || "Recette")}</p><h2 id="titre-fenetre">${e(recipe.nom)}</h2><p class="description-fenetre">${e(recipe.description || "")}</p><div class="donnees-fenetre"><label>Portions <input type="number" min="1" max="40" value="${servings}" data-servings="${e(id)}"></label><span>Préparation : ${prep ?? "inconnue"} min</span><span>Cuisson : ${cook ?? "inconnue"} min</span></div><div class="colonnes-fenetre"><section><h3>Ingrédients</h3><ul class="ingredients-detail">${ingredients}</ul></section><section><h3>Préparation</h3><ol class="etapes-detail">${steps}</ol></section></div><p class="note-adaptation-cuisson"><strong>À propos des portions et de la cuisson.</strong> ${cookingNotice}</p>${source}</article>`;
    dialog.showModal();
  }

  app.openRecipe = openRecipe;
  app.recipeDialog = dialog;
})(window.AtTable = window.AtTable || {});
