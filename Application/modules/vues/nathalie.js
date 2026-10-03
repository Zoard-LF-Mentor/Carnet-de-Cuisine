(function (app) {
  const e = app.escape;

  function makePrompt(sourceText) {
    const categories = app.categories().join(" | ");
    return `Tu aides à mettre une recette au propre pour un carnet de cuisine en français. Convertis la recette ci-dessous en UN seul objet JSON valide, sans Markdown, sans commentaire et sans texte avant ou après. N’invente aucune quantité, durée, portion, température ni source. Si une information manque, utilise null pour les nombres et une chaîne vide pour les textes. Garde toutes les étapes et tous les ingrédients fournis. Les noms de catégories doivent être exactement l’une de celles-ci : ${categories}.\n\nFormat requis :\n{"nom":"","categorie":"","cuisine":"","description":"","preferences":[],"preparation":null,"cuisson":null,"attente":null,"portions":null,"ingredients":[{"nom":"","quantite":null,"unite":""}],"etapes":[""],"observations":"","source":{"nom":"","url":""}}\n\nRègles : quantite est un nombre ou null; preparation, cuisson et attente sont des minutes, nombre ou null; portions est un nombre ou null. Utilise une chaîne vide si l’unité est inconnue. preferences doit contenir uniquement ces étiquettes si elles sont clairement justifiées : ${app.preferences.join(", ")}. Mets source à null si elle est inconnue.\n\nRecette à convertir :\n${String(sourceText || "").trim()}`;
  }

  function renderRecipe(recipe) {
    const minutes = app.totalTime(recipe);
    return `<li class="carte-recette-nathalie"><div><span>${e(recipe.categorie)}${minutes === null ? "" : ` · ${minutes} min`}</span><button type="button" class="recette-nathalie-nom" data-action="detail" data-id="${e(recipe.identifiant)}">${e(recipe.nom)}</button></div><button class="bouton-retirer-recette-nathalie" type="button" data-action="remove-nathalie-recipe" data-id="${e(recipe.identifiant)}" aria-label="Retirer ${e(recipe.nom)}" title="Retirer la recette">×</button></li>`;
  }

  function renderNathalieView() {
    const { state, prepare } = app.personalRecipeStore;
    const editor = app.nathalieEditor;
    const recipes = state.recipes;
    const categories = app.categories();
    const status = state.status === "connected"
      ? `<p class="etat-fichier-nathalie fichier-connecte">Fichier connecté : <strong>Documents/À table/recettes-nathalie.json</strong><br>Chaque modification crée une copie datée dans <strong>Documents/À table/Sauvegardes</strong>.</p>`
      : `<p class="etat-fichier-nathalie">${e(state.message || "Choisissez Documents. L’application y créera À table et ses sauvegardes automatiquement.")}</p>`;
    const pending = editor.pendingRecipe
      ? `<aside class="apercu-recette-nathalie"><h3>À enregistrer : ${e(editor.pendingRecipe.nom)}</h3><p>${editor.pendingRecipe.ingredients.length} ingrédients · ${editor.pendingRecipe.etapes.length} étapes · ${e(editor.pendingRecipe.categorie)}</p><button type="button" class="bouton-principal" data-action="save-nathalie-recipe" ${state.status !== "connected" ? "disabled" : ""}>Confirmer et enregistrer</button></aside>`
      : "";
    const message = editor.message ? `<p class="message-nathalie" role="status">${e(editor.message)}</p>` : "";
    const restore = state.status === "connected" && state.backupCount
      ? `<button class="bouton-secondaire bouton-restaurer-nathalie" type="button" data-action="restore-nathalie-backup">Restaurer la dernière copie (${state.backupCount})</button>`
      : "";
    return `<section class="vue-nathalie contenu-vue"><header class="entete-page"><div><p class="surtitre">Carnet personnel</p><h1>Recettes de Nathalie<span>.</span></h1><p class="sous-titre-page">Ses recettes sont conservées dans un fichier sur son ordinateur, séparé de l’application.</p></div></header><section class="stockage-nathalie"><div><h2>Fichier de recettes</h2>${status}${restore}</div><button class="bouton-secondaire" type="button" data-action="connect-nathalie-recipes">${state.status === "connected" ? "Choisir un autre dossier" : "Choisir mon dossier Documents"}</button></section>${state.status === "unsupported" ? "" : `<section class="assistant-recette-nathalie"><header><span>01</span><div><h2>Mettre une recette au propre avec ChatGPT</h2><p>Copiez la recette originale, demandez sa mise en forme, puis collez le résultat ici.</p></div></header><label for="texte-source-nathalie">Recette originale</label><textarea id="texte-source-nathalie" data-nathalie-draft="sourceText" rows="5" placeholder="Collez ici une recette copiée d’un livre, d’un courriel ou d’un site…">${e(editor.sourceText)}</textarea><button class="bouton-secondaire" type="button" data-action="copy-nathalie-prompt">Copier la demande et la recette pour ChatGPT</button><form data-form="nathalie-recipe-import"><label for="reponse-chatgpt-nathalie">Réponse JSON de ChatGPT</label><textarea id="reponse-chatgpt-nathalie" data-nathalie-draft="responseText" name="recipe-json" rows="8" placeholder="Collez ici le JSON renvoyé par ChatGPT…">${e(editor.responseText)}</textarea><button class="bouton-principal" type="submit">Vérifier la recette</button></form>${pending}${message}</section>`}<section class="liste-recettes-nathalie"><header><div><p class="surtitre">Collection personnelle</p><h2>Recettes de Nathalie <span>${recipes.length}</span></h2></div><p>Ces recettes peuvent aussi apparaître dans la recherche générale.</p></header>${recipes.length ? `<ul>${recipes.map(renderRecipe).join("")}</ul>` : `<p class="collection-nathalie-vide">Aucune recette personnelle pour le moment.</p>`}</section><details class="format-recette-nathalie"><summary>Qu’est-ce que ChatGPT prépare pour moi?</summary><p>Il renvoie un objet JSON avec le nom, la catégorie (${e(categories.join(", "))}), les portions, les durées, les ingrédients avec quantités et unités, les étapes, les préférences et la source si elle est indiquée dans la recette originale. L’application vérifie les champs avant l’enregistrement.</p></details></section>`;
  }

  app.makeNathaliePrompt = makePrompt;
  app.renderNathalieView = renderNathalieView;
})(window.AtTable = window.AtTable || {});