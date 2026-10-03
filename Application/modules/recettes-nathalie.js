(function (app) {
  const databaseName = "ATableNathalieV1";
  const databaseStore = "handles";
  const handleKey = "recipe-folder";
  const dataFileName = "recettes-nathalie.json";
  const dataFolderName = "À table";
  const backupFolderName = "Sauvegardes";
  const maxBackups = 30;
  const state = { recipes: [], directory: null, status: "disconnected", message: "", backupCount: 0 };
  const editor = { sourceText: "", responseText: "", pendingRecipe: null, message: "" };

  function escapeHtml(value) { return app.escape(value); }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(databaseStore);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Impossible d’ouvrir le stockage des autorisations."));
    });
  }

  async function handleTransaction(mode, operation) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(databaseStore, mode);
      const request = operation(transaction.objectStore(databaseStore));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Impossible de mémoriser le dossier."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    });
  }

  function messageOf(error) {
    if (error && error.name === "NotAllowedError") return "Autorisation refusée. Choisissez le dossier de recettes pour continuer.";
    return error && error.message ? error.message : "Une erreur a empêché l’enregistrement.";
  }

  function parseRecipeDocument(text) {
    let document;
    try {
      document = JSON.parse(String(text).replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""));
    } catch {
      throw new Error("La réponse n’est pas un JSON valide. Copiez uniquement l’objet JSON renvoyé par ChatGPT.");
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("Le résultat doit être un seul objet JSON de recette.");
    return document;
  }

  function prepareRecipe(text) {
    const recipe = parseRecipeDocument(text);
    const errors = [];
    const categories = app.categories();
    if (typeof recipe.nom !== "string" || !recipe.nom.trim()) errors.push("Ajoutez un nom de recette.");
    if (typeof recipe.categorie !== "string" || !categories.includes(recipe.categorie)) errors.push(`La catégorie doit être choisie parmi : ${categories.join(", " )}.`);
    if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) errors.push("Ajoutez au moins un ingrédient.");
    else recipe.ingredients.forEach((item, index) => {
      if (!item || typeof item.nom !== "string" || !item.nom.trim()) errors.push(`L’ingrédient ${index + 1} doit avoir un nom.`);
      if (item && item.quantite !== null && item.quantite !== undefined && item.quantite !== "" && !Number.isFinite(Number(item.quantite))) errors.push(`La quantité de l’ingrédient ${index + 1} doit être numérique ou null.`);
    });
    if (!Array.isArray(recipe.etapes) || !recipe.etapes.length || recipe.etapes.some((step) => typeof step !== "string" || !step.trim())) errors.push("Ajoutez les étapes sous forme de liste de phrases.");
    for (const field of ["preparation", "cuisson", "attente"]) {
      if (recipe[field] !== null && recipe[field] !== undefined && recipe[field] !== "" && (!Number.isFinite(Number(recipe[field])) || Number(recipe[field]) < 0)) errors.push(`Le champ ${field} doit être un nombre de minutes ou null.`);
    }
    if (recipe.portions !== null && recipe.portions !== undefined && recipe.portions !== "" && (!Number.isFinite(Number(recipe.portions)) || Number(recipe.portions) <= 0)) errors.push("Le nombre de portions doit être positif ou null.");
    if (errors.length) throw new Error(errors.join(" "));

    const clean = {
      nom: recipe.nom.trim(),
      categorie: recipe.categorie,
      cuisine: typeof recipe.cuisine === "string" ? recipe.cuisine.trim() : "Familiale",
      description: typeof recipe.description === "string" ? recipe.description.trim() : "",
      image: typeof recipe.image === "string" && /^https?:\/\//i.test(recipe.image) ? recipe.image : "",
      preferences: Array.isArray(recipe.preferences) ? recipe.preferences.filter((item) => app.preferences.includes(item)) : [],
      preparation: recipe.preparation === null || recipe.preparation === undefined || recipe.preparation === "" ? null : Number(recipe.preparation),
      cuisson: recipe.cuisson === null || recipe.cuisson === undefined || recipe.cuisson === "" ? null : Number(recipe.cuisson),
      attente: recipe.attente === null || recipe.attente === undefined || recipe.attente === "" ? null : Number(recipe.attente),
      portions: recipe.portions === null || recipe.portions === undefined || recipe.portions === "" ? null : Number(recipe.portions),
      ingredients: recipe.ingredients.map((item) => ({
        nom: item.nom.trim(),
        quantite: item.quantite === null || item.quantite === undefined || item.quantite === "" ? null : Number(item.quantite),
        unite: typeof item.unite === "string" ? item.unite.trim() : ""
      })),
      etapes: recipe.etapes.map((step) => step.trim()),
      observations: typeof recipe.observations === "string" ? recipe.observations.trim() : "",
      source: recipe.source && typeof recipe.source === "object" ? {
        nom: typeof recipe.source.nom === "string" ? recipe.source.nom.trim() : "",
        url: typeof recipe.source.url === "string" && /^https?:\/\//i.test(recipe.source.url) ? recipe.source.url : ""
      } : null
    };
    const slug = app.normalize(clean.nom).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "recette";
    clean.identifiant = `nathalie-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    clean.portions = clean.portions || 1;
    return clean;
  }

  function validateSavedRecipe(recipe) {
    return recipe && typeof recipe.identifiant === "string" && recipe.identifiant.startsWith("nathalie-") &&
      typeof recipe.nom === "string" && recipe.nom.trim() && typeof recipe.categorie === "string" &&
      Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 &&
      recipe.ingredients.every((item) => item && typeof item.nom === "string" && item.nom.trim()) &&
      Array.isArray(recipe.etapes) && recipe.etapes.length > 0 && recipe.etapes.every((step) => typeof step === "string" && step.trim());
  }

  async function getDataFile(directory, create) {
    return directory.getFileHandle(dataFileName, { create });
  }

  async function readRecipes(directory) {
    const fileHandle = await getDataFile(directory, true);
    const file = await fileHandle.getFile();
    if (!file.size) return [];
    let data;
    try { data = JSON.parse(await file.text()); }
    catch { throw new Error(`Le fichier ${dataFileName} n’est pas un JSON valide. Il n’a pas été remplacé.`); }
    if (!data || data.version !== 1 || !Array.isArray(data.recettes)) throw new Error(`Le fichier ${dataFileName} n’a pas le format attendu. Il n’a pas été remplacé.`);
    if (data.recettes.some((recipe) => !validateSavedRecipe(recipe))) throw new Error("Certaines recettes du fichier sont incomplètes. Le fichier n’a pas été remplacé.");
    return data.recettes;
  }

  async function writeText(directory, fileName, text) {
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  async function createBackup(directory) {
    const handle = await getDataFile(directory, true);
    const file = await handle.getFile();
    if (!file.size) return;
    const backups = await directory.getDirectoryHandle(backupFolderName, { create: true });
    const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
    await writeText(backups, `recettes-nathalie-${stamp}.json`, await file.text());
    const names = [];
    for await (const [name, entry] of backups.entries()) if (entry.kind === "file" && /^recettes-nathalie-.*\.json$/.test(name)) names.push(name);
    names.sort();
    for (const name of names.slice(0, Math.max(0, names.length - maxBackups))) await backups.removeEntry(name);
  }

  async function listBackups(directory) {
    let backups;
    try { backups = await directory.getDirectoryHandle(backupFolderName); }
    catch (error) { if (error.name === "NotFoundError") return []; throw error; }
    const names = [];
    for await (const [name, entry] of backups.entries()) if (entry.kind === "file" && /^recettes-nathalie-.*\.json$/.test(name)) names.push(name);
    return names.sort().reverse();
  }

  async function ensureWritePermission(directory) {
    let permission = await directory.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") permission = await directory.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") throw new DOMException("Autorisez l’accès au dossier de recettes pour enregistrer.", "NotAllowedError");
  }

  function registerAll() {
    for (const recipe of state.recipes) app.registerRecipe(recipe, { owner: "Nathalie" });
  }

  async function connect() {
    if (typeof window.showDirectoryPicker !== "function") throw new Error("Cette fonction requiert Microsoft Edge ou Google Chrome à jour.");
    const documents = await window.showDirectoryPicker({ id: "at-table-nathalie", mode: "readwrite", startIn: "documents" });
    await ensureWritePermission(documents);
    const directory = await documents.getDirectoryHandle(dataFolderName, { create: true });
    await ensureWritePermission(directory);
    const recipes = await readRecipes(directory);
    await handleTransaction("readwrite", (store) => store.put(directory, handleKey));
    state.directory = directory;
    state.recipes = recipes;
    state.status = "connected";
    state.backupCount = (await listBackups(directory)).length;
    state.message = "";
    registerAll();
    if (!(await (await getDataFile(directory, true)).getFile()).size) await persist(recipes, false);
  }

  async function persist(recipes, backup = true) {
    if (!state.directory) throw new Error("Choisissez d’abord le dossier de recettes de Nathalie.");
    await ensureWritePermission(state.directory);
    if (backup) await createBackup(state.directory);
    const data = JSON.stringify({ version: 1, recettes: recipes }, null, 2);
    await writeText(state.directory, dataFileName, data);
    state.backupCount = (await listBackups(state.directory)).length;
  }

  async function initialize() {
    if (typeof window.showDirectoryPicker !== "function") {
      state.status = "unsupported";
      state.message = "La sauvegarde directe par fichier nécessite Microsoft Edge ou Google Chrome à jour.";
      return;
    }
    try {
      const directory = await handleTransaction("readonly", (store) => store.get(handleKey));
      if (!directory) return;
      const permission = await directory.queryPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        state.status = "permission-needed";
        state.message = "Le fichier reste sur l’ordinateur. Reconnectez son dossier pour charger les recettes.";
        return;
      }
      state.directory = directory;
      state.recipes = await readRecipes(directory);
      state.status = "connected";
      state.backupCount = (await listBackups(directory)).length;
      registerAll();
    } catch (error) {
      state.status = "error";
      state.message = messageOf(error);
    }
  }

  async function add(recipe) {
    if (state.recipes.some((item) => app.normalize(item.nom) === app.normalize(recipe.nom))) throw new Error("Une recette de Nathalie porte déjà ce nom.");
    const next = state.recipes.concat(recipe);
    await persist(next);
    state.recipes = next;
    app.registerRecipe(recipe, { owner: "Nathalie" });
  }

  async function remove(id) {
    const next = state.recipes.filter((recipe) => recipe.identifiant !== id);
    if (next.length === state.recipes.length) return;
    await persist(next);
    state.recipes = next;
    app.unregisterPersonalRecipe(id);
    app.state.favorites = app.state.favorites.filter((favorite) => favorite !== id);
    app.state.recipesToPrepare = app.state.recipesToPrepare.filter((recipeId) => recipeId !== id);
  }

  async function restoreLatest() {
    if (!state.directory) throw new Error("Reconnectez d’abord le dossier Documents de Nathalie.");
    const names = await listBackups(state.directory);
    if (!names.length) throw new Error("Aucune copie de sauvegarde n’est disponible pour le moment.");
    const backupFolder = await state.directory.getDirectoryHandle(backupFolderName);
    const backupFile = await (await backupFolder.getFileHandle(names[0])).getFile();
    let data;
    try { data = JSON.parse(await backupFile.text()); }
    catch { throw new Error("La dernière copie est illisible. Aucune recette n’a été modifiée."); }
    if (!data || data.version !== 1 || !Array.isArray(data.recettes) || data.recettes.some((recipe) => !validateSavedRecipe(recipe))) {
      throw new Error("La dernière copie est invalide. Aucune recette n’a été modifiée.");
    }
    await persist(data.recettes);
    for (const recipe of state.recipes) app.unregisterPersonalRecipe(recipe.identifiant);
    state.recipes = data.recettes;
    registerAll();
  }

  app.personalRecipeStore = { state, prepare: prepareRecipe, connect, initialize, add, remove, restoreLatest, dataFolderName };
  app.nathalieEditor = editor;
})(window.AtTable = window.AtTable || {});