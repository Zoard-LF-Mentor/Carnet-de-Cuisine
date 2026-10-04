(function (app) {
  const e = app.escape;
  const { state } = app;
  const dialog = document.querySelector("#fenetre-recette");

  function openRecipe(id) {
    const recipe = app.recipes.find((entry) => entry.recipe.identifiant === id)?.recipe;
    if (!recipe) return;
    const knownServings = Number.isFinite(Number(recipe.portions)) && Number(recipe.portions) > 0;
    const servings = knownServings ? Number(state.portions[id] || recipe.portions) : 1;
    const base = knownServings ? Number(recipe.portions) : servings;
    const image = /^https?:\/\//i.test(recipe.image || "") ? `<img class="image-fenetre" src="${e(recipe.image)}" alt="${e(recipe.nom)}">` : "";
    const checkedIngredients = Array.isArray(state.checkedIngredients[id]) ? state.checkedIngredients[id] : [];
    const ingredients = (recipe.ingredients || []).map((item) => {
      const scaled = { ...item, quantite: typeof item.quantite === "number" ? Math.round(item.quantite * servings / base * 100) / 100 : item.quantite };
      const index = (recipe.ingredients || []).indexOf(item);
      const checked = checkedIngredients.includes(index);
      return `<li class="ingredient-detail${checked ? " ingredient-omis" : ""}"><label><input type="checkbox" data-recipe-id="${e(id)}" data-ingredient-check="${index}"${checked ? " checked" : ""}><span>${e(app.labelIngredient(scaled))}</span></label></li>`;
    }).join("");
    const steps = (recipe.etapes || []).map((step) => `<li>${e(step)}</li>`).join("");
    const reviewNotes = Array.isArray(recipe.aVerifier) ? recipe.aVerifier.filter((note) => note && typeof note.note === "string" && note.note.trim()) : [];
    const reviewSection = reviewNotes.length ? `<details class="notes-a-verifier"><summary>À vérifier · ${reviewNotes.length}</summary><ul>${reviewNotes.map((note) => `<li><strong>${e(note.champ || "Information")}</strong> : ${e(note.note)}${note.valeurLue ? `<span>Fiche source : « ${e(note.valeurLue)} »</span>` : ""}</li>`).join("")}</ul></details>` : "";
    const declaredAllergens = Array.isArray(recipe.allergenes) ? recipe.allergenes.filter((item) => typeof item === "string" && item.trim()) : [];
    const allergenSection = `<section class="notes-prealables"><h3>Allergènes déclarés dans la fiche</h3><p>${declaredAllergens.length ? e(declaredAllergens.join(", ")) : "Aucun renseignement déclaré."}</p><p>Cette fiche ne confirme pas l’absence d’allergènes ou de traces. Vérifiez les ingrédients et les emballages.</p></section>`;
    const proofs = Array.isArray(recipe.preuves) ? recipe.preuves.filter((proof) => proof && typeof proof.champ === "string" && proof.champ.trim() && typeof proof.extrait === "string" && proof.extrait.trim()) : [];
    const evidenceSection = proofs.length ? `<details class="notes-a-verifier"><summary>Extraits cités · ${proofs.length}</summary><ul>${proofs.map((proof) => `<li><strong>${e(proof.champ)}</strong> : « ${e(proof.extrait)} »</li>`).join("")}</ul></details>` : "";
    const source = /^https?:\/\//i.test(recipe.source?.url || "") ? `<p><a href="${e(recipe.source.url)}" target="_blank" rel="noopener noreferrer">Source : ${e(recipe.source.nom || "Consulter la source")}</a></p>` : "";
    const prep = app.minutes(recipe, "preparation");
    const cook = app.minutes(recipe, "cuisson");
    const portionNotice = !knownServings
      ? "Le nombre de portions d’origine est inconnu; les quantités ne peuvent pas être recalculées. "
      : servings === base
      ? "Les quantités suivent le nombre de portions, mais les étapes et la durée affichées ne sont pas recalculées."
      : "Portions modifiées : les quantités sont recalculées, mais les étapes et la durée affichées restent celles de la recette d’origine.";
    const cookingNotice = `${portionNotice} Selon le volume, l’épaisseur et le récipient, il peut falloir adapter le mode ou la durée de cuisson, ou procéder en plusieurs fournées. Vérifiez la cuisson réelle; pour les viandes, volailles et poissons, contrôlez la température à cœur. <a href="https://www.canada.ca/fr/sante-canada/services/conseils-generaux-salubrite/temperatures-securitaires-cuisson-interne.html" target="_blank" rel="noopener noreferrer">Températures sécuritaires de Santé Canada</a>.`;
    dialog.innerHTML = `<button class="bouton-fermer-fenetre" type="button" aria-label="Fermer" data-close>×</button><article class="contenu-fenetre-recette">${image}<p class="surtitre">${e(recipe.categorie || "Catégorie à vérifier")}</p><h2 id="titre-fenetre">${e(recipe.nom)}</h2><p class="description-fenetre">${e(recipe.description || "")}</p><div class="donnees-fenetre">${knownServings ? `<label>Portions <input type="number" min="1" max="40" value="${servings}" data-servings="${e(id)}"></label>` : `<span>Portions : inconnues</span>`}<span>Préparation : ${prep ?? "inconnue"} min</span><span>Cuisson : ${cook ?? "inconnue"} min</span></div>${reviewSection}${evidenceSection}${allergenSection}<div class="colonnes-fenetre"><section><h3>Ingrédients</h3><ul class="ingredients-detail">${ingredients}</ul></section><section><h3>Préparation</h3><ol class="etapes-detail">${steps}</ol></section></div>${recipe.avantDeCommencer ? `<section class="notes-prealables"><h3>Avant de commencer</h3><p>${e(recipe.avantDeCommencer)}</p></section>` : ""}${recipe.observations ? `<section class="notes-prealables"><h3>Observations</h3><p>${e(recipe.observations)}</p></section>` : ""}<p class="note-adaptation-cuisson"><strong>À propos des portions et de la cuisson.</strong> ${cookingNotice}</p>${source}</article>`;
    dialog.showModal();
  }

  app.openRecipe = openRecipe;
  app.recipeDialog = dialog;
})(window.AtTable = window.AtTable || {});
