(function (app) {
  const { root, state, pantry, render, openSelector, openRecipe, ingredientDialog, recipeDialog, normalize } = app;

  function addUnique(list, value) {
    const name = String(value || "").trim();
    if (!name || list.some((item) => normalize(typeof item === "string" ? item : item.name) === normalize(name))) return false;
    list.push(list === pantry.shopping ? { name, checked: false } : name);
    return true;
  }

  function updatePreparationItem(key, values) {
    const current = state.preparationItems[key] && typeof state.preparationItems[key] === "object"
      ? state.preparationItems[key]
      : {};
    state.preparationItems[key] = { ...current, ...values };
  }

  function setView(view) {
    state.view = view;
    app.saveState();
    render();
    document.querySelector("#bouton-guide-entete")?.setAttribute("aria-pressed", String(view === "guide"));
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const nav = target.closest("[data-view]");
    if (nav) { setView(nav.dataset.view); return; }
    const control = target.closest("[data-action]");
    if (!control) return;
    const { action, id, name, index } = control.dataset;
    if (action === "connect-nathalie-recipes") {
      app.personalRecipeStore.connect().then(() => {
        app.nathalieEditor.message = "Le fichier de recettes de Nathalie est prêt. Les modifications seront enregistrées dans ce dossier.";
        render();
      }).catch((error) => {
        app.nathalieEditor.message = error.name === "AbortError" ? "Choix du dossier annulé." : error.message;
        render();
      });
      return;
    }
    if (action === "copy-nathalie-prompt") {
      navigator.clipboard.writeText(app.makeNathaliePrompt(app.nathalieEditor.sourceText)).then(() => {
        app.nathalieEditor.message = "La demande est copiée. Collez-la dans ChatGPT, puis copiez sa réponse JSON ici.";
        render();
      }).catch(() => {
        app.nathalieEditor.message = "La copie automatique est indisponible. Sélectionnez et copiez le texte de la recette, puis ajoutez-le à la demande ChatGPT.";
        render();
      });
      return;
    }
    if (action === "save-nathalie-recipe") {
      if (!app.nathalieEditor.pendingRecipe) return;
      app.personalRecipeStore.add(app.nathalieEditor.pendingRecipe).then(() => {
        app.nathalieEditor.sourceText = "";
        app.nathalieEditor.responseText = "";
        app.nathalieEditor.pendingRecipe = null;
        app.nathalieEditor.message = "Recette ajoutée et sauvegardée dans le dossier de Nathalie.";
        app.saveState();
        render();
      }).catch((error) => {
        app.nathalieEditor.message = error.message;
        render();
      });
      return;
    }
    if (action === "remove-nathalie-recipe") {
      if (!window.confirm("Retirer cette recette du carnet de Nathalie? Une copie datée sera conservée dans Sauvegardes.")) return;
      app.personalRecipeStore.remove(id).then(() => {
        app.nathalieEditor.message = "Recette retirée. La sauvegarde précédente est conservée.";
        render();
      }).catch((error) => {
        app.nathalieEditor.message = error.message;
        render();
      });
      return;
    }
    if (action === "restore-nathalie-backup") {
      if (!window.confirm("Remplacer la collection actuelle par la dernière copie? L’état actuel sera d’abord sauvegardé.")) return;
      app.personalRecipeStore.restoreLatest().then(() => {
        app.nathalieEditor.message = "La dernière copie a été restaurée. L’état précédent a aussi été sauvegardé.";
        render();
      }).catch((error) => {
        app.nathalieEditor.message = error.message;
        render();
      });
      return;
    }
    if (action === "open-selector") { openSelector(); return; }
    if (action === "toggle-filters") { state.filtersCollapsed = !state.filtersCollapsed; app.saveState(); render(); return; }
    if (action === "detail") { openRecipe(id); return; }
    if (action === "toggle-preparation") {
      state.recipesToPrepare = state.recipesToPrepare.includes(id)
        ? state.recipesToPrepare.filter((recipeId) => recipeId !== id)
        : state.recipesToPrepare.concat(id);
      app.saveState(); render(); return;
    }
    if (action === "remove-preparation") {
      state.recipesToPrepare = state.recipesToPrepare.filter((recipeId) => recipeId !== id);
      app.saveState(); render(); return;
    }
    if (action === "clear-preparation") { state.recipesToPrepare = []; state.preparationItems = {}; state.preparationGroups = []; app.saveState(); render(); return; }
    if (action === "remove-preparation-pantry") {
      pantry.ingredients = pantry.ingredients.filter((item) => normalize(item) !== normalize(name));
      app.savePantry(); render(); return;
    }
    if (action === "remove-preparation-group") {
      const groupId = id;
      for (const item of Object.values(state.preparationItems)) {
        if (item.groupId === groupId) item.groupId = "";
      }
      state.preparationGroups = state.preparationGroups.filter((group) => group.id !== groupId);
      app.saveState(); render(); return;
    }
    if (action === "favorite") {
      state.favorites = state.favorites.includes(id) ? state.favorites.filter((value) => value !== id) : state.favorites.concat(id);
      app.saveState(); render(); return;
    }
    if (action === "remove-pantry") pantry.ingredients = pantry.ingredients.filter((item) => normalize(item) !== normalize(name));
    if (action === "remove-shopping") pantry.shopping.splice(Number(index), 1);
    if (action === "clear-shopping") pantry.shopping = [];
    if (action === "add-shopping-recipe") {
      const recipe = app.recipes.find((entry) => entry.recipe.identifiant === id)?.recipe;
      for (const ingredient of recipe?.ingredients || []) {
        if (!pantry.ingredients.some((item) => normalize(item) === normalize(ingredient.nom))) addUnique(pantry.shopping, ingredient.nom);
      }
      app.savePantry(); render(); return;
    }
    if (action === "export-shopping") { exportShopping(); return; }
    app.saveState();
    app.savePantry();
    render();
  });

  document.querySelector("#bouton-guide-entete")?.addEventListener("click", () => setView(state.view === "guide" ? "recettes" : "guide"));

  root.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const kind = form.dataset.form;
    if (!kind) return;
    event.preventDefault();
    if (kind === "nathalie-recipe-import") {
      try {
        app.nathalieEditor.responseText = String(new FormData(form).get("recipe-json") || "");
        app.nathalieEditor.pendingRecipe = app.personalRecipeStore.prepare(app.nathalieEditor.responseText);
        app.nathalieEditor.message = "Vérifiez le nom, les ingrédients et les étapes avant de confirmer l’ajout.";
      } catch (error) {
        app.nathalieEditor.pendingRecipe = null;
        app.nathalieEditor.message = error.message;
      }
      render();
      return;
    }
    const value = new FormData(form).get("ingredient");
    if (kind === "preparation-group") {
      const name = String(new FormData(form).get("group") || "").trim();
      if (!name) return;
      const normalized = normalize(name);
      if (state.preparationGroups.some((group) => normalize(group.name) === normalized)) return;
      state.preparationGroups.push({ id: `g-${Date.now().toString(36)}`, name });
      app.saveState(); render(); return;
    }
    if (kind === "pantry") addUnique(pantry.ingredients, value);
    else if (kind === "shopping") addUnique(pantry.shopping, value);
    app.savePantry();
    render();
  });

  root.addEventListener("input", (event) => {
    if (event.target instanceof HTMLTextAreaElement && event.target.matches("[data-nathalie-draft]")) {
      app.nathalieEditor[event.target.dataset.nathalieDraft] = event.target.value;
      return;
    }
    if (!(event.target instanceof HTMLInputElement) || !event.target.matches("[data-search]")) return;
    state.search = event.target.value;
    app.saveState();
    const cursor = event.target.selectionStart;
    render();
    const search = root.querySelector("[data-search]");
    search?.focus({ preventScroll: true });
    if (cursor !== null) search?.setSelectionRange(cursor, cursor);
  });

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target.matches("[data-preparation-destination]")) {
      const name = target.dataset.ingredient;
      const normalized = normalize(name);
      if (target.dataset.preparationDestination === "pantry") {
        if (target.checked) {
          addUnique(pantry.ingredients, name);
          pantry.shopping = pantry.shopping.filter((item) => normalize(item.name) !== normalized);
        } else pantry.ingredients = pantry.ingredients.filter((item) => normalize(item) !== normalized);
      } else if (target.checked) addUnique(pantry.shopping, name);
      else pantry.shopping = pantry.shopping.filter((item) => normalize(item.name) !== normalized);
      app.savePantry(); render(); return;
    }
    if (target.matches("[data-preparation-ready]")) {
      updatePreparationItem(target.dataset.ingredientKey, { ready: target.checked });
      app.saveState(); render(); return;
    }
    if (target.matches("[data-preparation-group]")) {
      updatePreparationItem(target.dataset.ingredientKey, { groupId: target.value });
      app.saveState(); render(); return;
    }
    if (target.matches("[data-filter-list]")) {
      const list = state[target.dataset.filterList];
      state[target.dataset.filterList] = target.checked ? list.concat(target.value) : list.filter((value) => value !== target.value);
    } else if (target.matches("[data-filter]")) {
      const key = target.dataset.filter;
      state[key] = target.type === "checkbox" ? target.checked : key === "category" || key === "sort" ? target.value : Number(target.value);
    } else if (target.matches("[data-shopping-check]")) {
      const itemIndex = Number(target.dataset.shoppingCheck);
      if (target.checked) addUnique(pantry.ingredients, pantry.shopping[itemIndex]?.name);
      pantry.shopping.splice(itemIndex, 1);
      app.savePantry();
    } else return;
    app.saveState();
    render();
  });

  root.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest("[data-ingredient-key]");
    if (!item || !event.dataTransfer) return;
    event.dataTransfer.setData("text/plain", item.dataset.ingredientKey);
    event.dataTransfer.effectAllowed = "move";
    item.classList.add("ingredient-en-deplacement");
  });

  root.addEventListener("dragend", (event) => {
    const target = event.target;
    if (target instanceof Element) target.closest("[data-ingredient-key]")?.classList.remove("ingredient-en-deplacement");
    root.querySelectorAll(".zone-depot-active").forEach((zone) => zone.classList.remove("zone-depot-active"));
  });

  root.addEventListener("dragover", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const zone = target.closest("[data-drop-group]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.add("zone-depot-active");
  });

  root.addEventListener("dragleave", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const zone = target.closest("[data-drop-group]");
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("zone-depot-active");
  });

  root.addEventListener("drop", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !event.dataTransfer) return;
    const zone = target.closest("[data-drop-group]");
    const key = event.dataTransfer.getData("text/plain");
    if (!zone || !key) return;
    event.preventDefault();
    updatePreparationItem(key, { groupId: zone.dataset.dropGroup || "" });
    app.saveState(); render();
  });

  recipeDialog.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches("[data-servings]")) {
      state.portions[target.dataset.servings] = Math.max(1, Math.min(40, Number(target.value) || 1));
      app.saveState();
      openRecipe(target.dataset.servings);
      recipeDialog.querySelector("[data-servings]")?.focus();
      return;
    }
    if (!target.matches("[data-ingredient-check]")) return;
    const recipeId = target.dataset.recipeId;
    const ingredientIndex = Number(target.dataset.ingredientCheck);
    const checked = Array.isArray(state.checkedIngredients[recipeId]) ? state.checkedIngredients[recipeId] : [];
    state.checkedIngredients[recipeId] = target.checked
      ? [...new Set(checked.concat(ingredientIndex))]
      : checked.filter((index) => index !== ingredientIndex);
    target.closest(".ingredient-detail")?.classList.toggle("ingredient-omis", target.checked);
    app.saveState();
  });

  ingredientDialog.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target === ingredientDialog || target.closest("[data-close]")) { ingredientDialog.close(); return; }
    if (target.closest('[data-selector-action="add-all"]')) {
      const catalog = app.ingredientCatalog();
      for (const item of catalog) {
        if (!pantry.ingredients.some((name) => normalize(name) === normalize(item.name))) pantry.ingredients.push(item.name);
      }
      app.savePantry(); render();
      ingredientDialog.querySelectorAll("[data-catalog-item]").forEach((tile) => setIngredientTileState(tile, true));
      ingredientDialog.querySelector(".compteur-selecteur strong").textContent = String(pantry.ingredients.length);
      return;
    }
    const tile = target.closest("[data-catalog-item]");
    if (!tile) return;
    const name = tile.dataset.catalogItem;
    const normalized = normalize(name);
    const inPantry = pantry.ingredients.some((item) => normalize(item) === normalized);
    if (inPantry) {
      pantry.ingredients = pantry.ingredients.filter((item) => normalize(item) !== normalized);
    } else pantry.ingredients.push(name);
    app.savePantry(); render();
    setIngredientTileState(tile, !inPantry);
    ingredientDialog.querySelector(".compteur-selecteur strong").textContent = String(pantry.ingredients.length);
  });

  function setIngredientTileState(tile, added) {
    const name = tile.dataset.catalogItem;
    tile.classList.toggle("tuile-ingredient-ajoutee", added);
    tile.setAttribute("aria-pressed", String(added));
    tile.setAttribute("aria-label", `${name}. ${added ? "Déjà au garde-manger. Cliquer pour retirer." : "Cliquer pour ajouter au garde-manger."}`);
    tile.querySelector("small").textContent = added ? "Au garde-manger ✓" : "Ajouter au garde-manger +";
  }

  ingredientDialog.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches("[data-catalog-search]")) return;
    const query = normalize(input.value);
    let visible = 0;
    for (const tile of ingredientDialog.querySelectorAll("[data-catalog-item]")) {
      tile.hidden = Boolean(query) && !tile.dataset.searchValue.includes(query);
      if (!tile.hidden) visible += 1;
    }
    ingredientDialog.querySelector("[data-catalog-count]").textContent = String(visible);
  });

  recipeDialog.addEventListener("click", (event) => {
    const target = event.target;
    if (target === recipeDialog || (target instanceof Element && target.closest("[data-close]"))) recipeDialog.close();
  });

  root.addEventListener("error", (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    image.hidden = true;
    const fallback = image.nextElementSibling;
    if (fallback instanceof HTMLElement) fallback.hidden = false;
  }, true);

  async function loadRecipeScripts() {
    const files = window.MANIFESTE_RECETTES?.fichiers || [];
    for (const path of files) {
      if (typeof path !== "string" || !/^[\w./-]+\.js$/.test(path) || path.includes("..")) continue;
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = path;
        script.onload = resolve;
        script.onerror = resolve;
        document.head.append(script);
      });
    }
  }

  function exportShopping() {
    const csv = ["Article", ...pantry.shopping.map((item) => `"${item.name.replace(/"/g, '""')}"`)].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "liste-epicerie.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadRecipeScripts();
    await app.personalRecipeStore.initialize();
    if (app.state.view === "planifiees" || app.state.view === "comparaison") app.state.view = "recettes";
    render();
  }, { once: true });
})(window.AtTable = window.AtTable || {});
