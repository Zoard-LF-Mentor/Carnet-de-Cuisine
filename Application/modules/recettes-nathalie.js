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
  let lastBackupTimestamp = 0;

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
      throw new Error("La réponse n’est pas un JSON valide. Vérifiez le format JSON de la recette.");
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("Le résultat doit être un seul objet JSON de recette.");
    return document;
  }

  function reviewNotesFor(recipe) {
    const notes = Array.isArray(recipe.aVerifier) ? recipe.aVerifier.map((item) => ({
      champ: typeof item?.champ === "string" ? item.champ.trim() : "",
      note: typeof item?.note === "string" ? item.note.trim() : typeof item === "string" ? item.trim() : "",
      valeurLue: typeof item?.valeurLue === "string" ? item.valeurLue.trim() : ""
    })).filter((item) => item.note) : [];
    const addNote = (champ, note, valeurLue = "") => {
      if (!notes.some((item) => item.champ === champ)) notes.push({ champ, note, valeurLue });
    };

    (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).forEach((item, index) => {
      if (!item || typeof item.nom !== "string") return;
      const ingredientNumber = index + 1;
      if (/\d|\b(?:tasses?|cuill(?:e|è)res?|c\.|ml|cl|dl|litres?|g|kg|oz|lb|paquets?|bo[iî]tes?|tranches?)\b/i.test(item.nom)) {
        addNote(`ingredients[${index}].nom`, `Le nom de l’ingrédient ${ingredientNumber} semble contenir une quantité ou une unité; vérifier sa séparation.`, item.nom.trim());
      }
      if (item.quantite === null || item.quantite === undefined || item.quantite === "") {
        addNote(`ingredients[${index}].quantite`, `La quantité de l’ingrédient ${ingredientNumber} (${item.nom.trim()}) n’a pas été établie avec certitude.`);
      }
    });

    if (!String(recipe.categorie || "").trim()) addNote("categorie", "La fiche ne permet pas de classer la recette avec certitude.");
    if (!String(recipe.cuisine || "").trim()) addNote("cuisine", "Le type de cuisine n’est pas explicitement établi dans la fiche.");
    if (recipe.difficulte === null || recipe.difficulte === undefined || recipe.difficulte === "") {
      addNote("difficulte", "La fiche ne donne pas de niveau de difficulté explicite.");
    }
    if (!Array.isArray(recipe.allergenes) || !recipe.allergenes.length) {
      addNote("allergenes", "Aucun allergène n’est déclaré dans cette fiche; leur absence n’est pas confirmée.");
    }
    for (const field of ["preparation", "cuisson", "attente", "portions"]) {
      if (recipe[field] === null || recipe[field] === undefined || recipe[field] === "") {
        addNote(field, `La fiche ne permet pas d’établir ${field === "portions" ? "le nombre de portions" : `la durée de ${field}`} avec certitude.`);
      }
    }
    return notes;
  }

  function clearUncertainValues(recipe) {
    if (!Array.isArray(recipe.aVerifier)) return;
    const optionalTextFields = new Set(["categorie", "cuisine", "description", "image", "formatPortion", "avantDeCommencer", "observations"]);
    const nullableNumberFields = new Set(["difficulte", "preparation", "cuisson", "attente", "portions", "calories"]);
    for (const item of recipe.aVerifier) {
      const field = typeof item?.champ === "string" ? item.champ.trim() : "";
      const uncertainIngredient = field.match(/^ingredients\[(\d+)\](?:\.(nom|quantite|unite))?$/);
      if (uncertainIngredient) {
        const ingredient = recipe.ingredients?.[Number(uncertainIngredient[1])];
        if (ingredient) {
          const uncertainPart = uncertainIngredient[2];
          if (!uncertainPart || uncertainPart === "nom") {
            ingredient.nom = "Ingrédient à vérifier";
            ingredient.quantite = null;
            ingredient.unite = "";
          } else ingredient[uncertainPart] = uncertainPart === "quantite" ? null : "";
        }
        continue;
      }
      const uncertainStep = field.match(/^etapes\[(\d+)\]$/);
      if (uncertainStep && Array.isArray(recipe.etapes)) {
        recipe.etapes[Number(uncertainStep[1])] = "Étape à vérifier";
        continue;
      }
      if (nullableNumberFields.has(field)) recipe[field] = null;
      else if (optionalTextFields.has(field)) recipe[field] = "";
      else if (field === "preferences" || field === "allergenes") recipe[field] = [];
      else if (field === "valeurNutritive" || field === "source") recipe[field] = null;
    }
  }

  async function extractWordDocument(file) {
    if (!file || !/\.(docx|txt)$/i.test(file.name || "")) throw new Error("Choisissez une fiche au format .docx ou un fichier texte .txt.");
    if (file.size > 15 * 1024 * 1024) throw new Error("La fiche dépasse la limite de 15 Mo.");
    let sourceText;
    if (/\.txt$/i.test(file.name)) sourceText = await file.text();
    else {
      if (!window.mammoth || typeof window.mammoth.extractRawText !== "function") throw new Error("Le lecteur de fiches Word n’est pas chargé. Fermez puis rouvrez l’application.");
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      sourceText = result.value;
    }
    const text = sourceText
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([.!?])(?=[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ])/g, "$1 ")
      .replace(/([a-zàâçéèêëîïôùûüÿñæœ])(?=[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][a-zàâçéèêëîïôùûüÿñæœ])/g, "$1 ")
      .replace(/,([A-Za-zÀ-ÿ])/g, ", $1")
      .trim();
    if (text.length < 20) throw new Error("Aucun texte de recette lisible n’a été trouvé dans cette fiche Word.");
    return text;
  }

  function normalizeEvidence(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
  }

  function numericEvidenceValues(value) {
    const fractions = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };
    const normalized = String(value || "").replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => ` ${fractions[fraction]} `);
    return (normalized.match(/\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?/g) || []).map((token) => {
      if (token.includes("/")) {
        const [numerator, denominator] = token.split("/").map(Number);
        return denominator ? numerator / denominator : NaN;
      }
      return Number(token.replace(",", "."));
    }).filter(Number.isFinite);
  }

  function normalizeUnitPhrase(value) {
    return normalizeEvidence(value).replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  }

  function unitFamily(value) {
    const text = ` ${normalizeUnitPhrase(value)} `;
    const families = [
      ["cuillere-soupe", ["cuillere a soupe", "cuilleres a soupe", "c a soupe", "cuil a soupe", "tbsp", "tablespoon", "tablespoons"]],
      ["cuillere-the", ["cuillere a the", "cuilleres a the", "c a the", "cuil a the", "tsp", "teaspoon", "teaspoons"]],
      ["tasse", ["tasse", "tasses", "cup", "cups"]],
      ["millilitre", ["ml", "millilitre", "millilitres"]],
      ["centilitre", ["cl", "centilitre", "centilitres"]],
      ["decilitre", ["dl", "decilitre", "decilitres"]],
      ["litre", ["l", "litre", "litres"]],
      ["milligramme", ["mg", "milligramme", "milligrammes"]],
      ["gramme", ["g", "gramme", "grammes"]],
      ["kilogramme", ["kg", "kilogramme", "kilogrammes"]],
      ["once", ["oz", "once", "onces"]],
      ["livre", ["lb", "lbs", "livre", "livres"]]
    ];
    for (const [family, aliases] of families) {
      if (aliases.some((alias) => text.includes(` ${alias} `))) return family;
    }
    return "";
  }

  function parseNumericValue(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const fractions = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };
    const normalized = value.trim().replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => fractions[fraction]);
    const mixed = normalized.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed) {
      const denominator = Number(mixed[3]);
      return denominator ? Number(mixed[1]) + Math.sign(Number(mixed[1]) || 1) * Number(mixed[2]) / denominator : null;
    }
    const fraction = normalized.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
    if (!/^-?\d+(?:[.,]\d+)?$/.test(normalized)) return null;
    const number = Number(normalized.replace(",", "."));
    return Number.isFinite(number) ? number : null;
  }

  function normalizeModelNumbers(recipe) {
    if (!Array.isArray(recipe.aVerifier)) recipe.aVerifier = [];
    const addNote = (champ, note) => {
      if (!recipe.aVerifier.some((item) => item?.champ === champ)) recipe.aVerifier.push({ champ, note, valeurLue: "" });
    };
    if (Array.isArray(recipe.ingredients)) recipe.ingredients.forEach((ingredient, index) => {
      if (!ingredient || ingredient.quantite === null || ingredient.quantite === undefined || ingredient.quantite === "") return;
      const quantity = parseNumericValue(ingredient.quantite);
      if (quantity === null) {
        addNote(`ingredients[${index}].quantite`, "La quantité n’est pas un nombre simple reconnu; elle doit être vérifiée.");
        ingredient.quantite = null;
      } else ingredient.quantite = quantity;
    });
    for (const field of ["preparation", "cuisson", "attente", "portions"]) {
      const value = recipe[field];
      if (value === null || value === undefined || value === "") continue;
      const match = typeof value === "string" && field !== "portions"
        ? value.trim().match(/^(-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(?:minutes?|mins?|min)?$/i)
        : typeof value === "string" && field === "portions"
        ? value.trim().match(/^(-?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(?:portions?)?$/i)
        : null;
      const normalized = typeof value === "number" ? parseNumericValue(value) : match ? parseNumericValue(match[1]) : null;
      if (normalized === null) {
        addNote(field, `La valeur de ${field} n’est pas un nombre dans le format attendu; elle doit être vérifiée.`);
        recipe[field] = null;
      } else recipe[field] = normalized;
    }
  }

  function verifyReviewEvidence(recipe, sourceText) {
    const source = normalizeEvidence(sourceText);
    if (!Array.isArray(recipe.aVerifier)) recipe.aVerifier = [];
    const addNote = (champ, note, valeurLue = "") => {
      if (!recipe.aVerifier.some((item) => item?.champ === champ)) recipe.aVerifier.push({ champ, note, valeurLue });
    };
    const proofs = Array.isArray(recipe.preuves) ? recipe.preuves.filter((item) => item && typeof item.champ === "string" && typeof item.extrait === "string") : [];
    const requiredProofs = [
      ...(Array.isArray(recipe.ingredients) ? recipe.ingredients.map((_, index) => `ingredients[${index}]`) : []),
      ...(Array.isArray(recipe.etapes) ? recipe.etapes.map((_, index) => `etapes[${index}]`) : []),
      ...["preparation", "cuisson", "attente", "portions"].filter((field) => recipe[field] !== null && recipe[field] !== undefined && recipe[field] !== "")
    ];
    for (const field of requiredProofs) {
      const proof = proofs.find((item) => item.champ === field && item.extrait.trim());
      if (!proof) addNote(field, `Aucun extrait source n’a été fourni pour vérifier ${field}.`);
      else if (!source || !source.includes(normalizeEvidence(proof.extrait))) {
        addNote(field, source ? `L’extrait fourni pour ${field} n’a pas été retrouvé dans la fiche; la valeur est à vérifier.` : `Le texte original manque; l’extrait de ${field} ne peut pas être vérifié.`, proof.extrait.trim());
      } else {
        const ingredientField = field.match(/^ingredients\[(\d+)\]$/);
        const value = ingredientField ? recipe.ingredients[Number(ingredientField[1])]?.quantite : recipe[field];
        const citedNumbers = numericEvidenceValues(proof.extrait);
        if (value !== null && value !== undefined && value !== "" && citedNumbers.length && !citedNumbers.some((number) => Math.abs(number - Number(value)) < 0.0001)) {
          const targetField = ingredientField ? `${field}.quantite` : field;
          addNote(targetField, `La valeur numérique de ${targetField} ne correspond à aucun nombre de la citation source.`, proof.extrait.trim());
        }
        if (ingredientField) {
          const ingredient = recipe.ingredients[Number(ingredientField[1])];
          const ingredientUnit = typeof ingredient?.unite === "string" ? ingredient.unite.trim() : "";
          const citedFamily = unitFamily(proof.extrait);
          const expectedFamily = ingredientUnit ? unitFamily(ingredientUnit) : "";
          if (ingredientUnit && expectedFamily && citedFamily !== expectedFamily) {
            addNote(`${field}.unite`, `L’unité « ${ingredientUnit} » ne correspond pas à une unité de même famille dans la citation source.`, proof.extrait.trim());
          } else if (ingredientUnit && !expectedFamily) {
            const excerpt = ` ${normalizeUnitPhrase(proof.extrait)} `;
            if (!excerpt.includes(` ${normalizeUnitPhrase(ingredientUnit)} `)) {
              addNote(`${field}.unite`, `L’unité « ${ingredientUnit} » n’apparaît pas dans la citation source.`, proof.extrait.trim());
            }
          } else if (!ingredientUnit && citedFamily) {
            addNote(`${field}.unite`, "La citation contient une unité, mais aucune unité n’a été extraite.", proof.extrait.trim());
          }
        }
      }
    }
    for (const item of recipe.aVerifier) {
      if (!item || typeof item !== "object" || !item.valeurLue) continue;
      const excerpt = normalizeEvidence(item.valeurLue);
      if (!source) {
        item.note = `${item.note} Le texte source n’est pas disponible pour vérifier la citation.`.trim();
      } else if (!source.includes(excerpt)) {
        item.note = `${item.note} L’extrait cité n’a pas été retrouvé dans le texte source; ne pas le considérer comme une preuve.`.trim();
      }
    }
  }

  function prepareRecipe(text, sourceText = "") {
    const recipe = parseRecipeDocument(text);
    normalizeModelNumbers(recipe);
    verifyReviewEvidence(recipe, sourceText);
    clearUncertainValues(recipe);
    const errors = [];
    const categories = app.categories();
    const categoryIsUncertain = Array.isArray(recipe.aVerifier) && recipe.aVerifier.some((item) => item?.champ === "categorie");
    if (typeof recipe.nom !== "string" || !recipe.nom.trim()) errors.push("Ajoutez un nom de recette.");
    if (typeof recipe.categorie !== "string" || (recipe.categorie && !categories.includes(recipe.categorie)) || (!recipe.categorie && !categoryIsUncertain)) errors.push(`La catégorie doit être choisie parmi : ${categories.join(", " )}, ou laissée vide avec une note dans « À vérifier ».`);
    if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) errors.push("Ajoutez au moins un ingrédient.");
    else recipe.ingredients.forEach((item, index) => {
      const nameIsUncertain = Array.isArray(recipe.aVerifier) && recipe.aVerifier.some((note) => note?.champ === `ingredients[${index}].nom` || note?.champ === `ingredients[${index}]`);
      if (!item || typeof item.nom !== "string" || (!item.nom.trim() && !nameIsUncertain)) errors.push(`L’ingrédient ${index + 1} doit avoir un nom ou une note dans « À vérifier ».`);
      if (item && item.quantite !== null && item.quantite !== undefined && item.quantite !== "" && !Number.isFinite(Number(item.quantite))) errors.push(`La quantité de l’ingrédient ${index + 1} doit être numérique ou null.`);
    });
    if (!Array.isArray(recipe.etapes) || !recipe.etapes.length || recipe.etapes.some((step, index) => {
      const stepIsUncertain = Array.isArray(recipe.aVerifier) && recipe.aVerifier.some((note) => note?.champ === `etapes[${index}]`);
      return typeof step !== "string" || (!step.trim() && !stepIsUncertain);
    })) errors.push("Ajoutez les étapes sous forme de phrases ou signalez celles qui sont incertaines dans « À vérifier ».");
    for (const field of ["preparation", "cuisson", "attente"]) {
      if (recipe[field] !== null && recipe[field] !== undefined && recipe[field] !== "" && (!Number.isFinite(Number(recipe[field])) || Number(recipe[field]) < 0)) errors.push(`Le champ ${field} doit être un nombre de minutes ou null.`);
    }
    if (recipe.portions !== null && recipe.portions !== undefined && recipe.portions !== "" && (!Number.isFinite(Number(recipe.portions)) || Number(recipe.portions) <= 0)) errors.push("Le nombre de portions doit être positif ou null.");
    if (errors.length) throw new Error(errors.join(" "));

    const clean = {
      nom: recipe.nom.trim(),
      categorie: recipe.categorie,
      cuisine: typeof recipe.cuisine === "string" ? recipe.cuisine.trim() : "",
      description: typeof recipe.description === "string" ? recipe.description.trim() : "",
      image: typeof recipe.image === "string" && /^https?:\/\//i.test(recipe.image) ? recipe.image : "",
      preferences: Array.isArray(recipe.preferences) ? recipe.preferences.filter((item) => app.preferences.includes(item)) : [],
      allergenes: Array.isArray(recipe.allergenes) ? recipe.allergenes.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [],
      aVerifier: reviewNotesFor(recipe),
      difficulte: Number.isInteger(Number(recipe.difficulte)) && Number(recipe.difficulte) >= 1 && Number(recipe.difficulte) <= 3 ? Number(recipe.difficulte) : null,
      preparation: recipe.preparation === null || recipe.preparation === undefined || recipe.preparation === "" ? null : Number(recipe.preparation),
      cuisson: recipe.cuisson === null || recipe.cuisson === undefined || recipe.cuisson === "" ? null : Number(recipe.cuisson),
      attente: recipe.attente === null || recipe.attente === undefined || recipe.attente === "" ? null : Number(recipe.attente),
      portions: recipe.portions === null || recipe.portions === undefined || recipe.portions === "" ? null : Number(recipe.portions),
      calories: recipe.calories === null || recipe.calories === undefined || recipe.calories === "" || !Number.isFinite(Number(recipe.calories)) ? null : Number(recipe.calories),
      formatPortion: typeof recipe.formatPortion === "string" ? recipe.formatPortion.trim() : "",
      ingredients: recipe.ingredients.map((item) => ({
        nom: item.nom.trim(),
        quantite: item.quantite === null || item.quantite === undefined || item.quantite === "" ? null : Number(item.quantite),
        unite: typeof item.unite === "string" ? item.unite.trim() : ""
      })),
      preuves: Array.isArray(recipe.preuves) ? recipe.preuves.filter((item) => item && typeof item.champ === "string" && typeof item.extrait === "string").map((item) => ({ champ: item.champ.trim(), extrait: item.extrait.trim() })) : [],
      etapes: recipe.etapes.map((step) => step.trim()),
      avantDeCommencer: typeof recipe.avantDeCommencer === "string" ? recipe.avantDeCommencer.trim() : "",
      observations: typeof recipe.observations === "string" ? recipe.observations.trim() : "",
      valeurNutritive: recipe.valeurNutritive && typeof recipe.valeurNutritive === "object" && !Array.isArray(recipe.valeurNutritive) ? recipe.valeurNutritive : null,
      source: recipe.source && typeof recipe.source === "object" ? {
        nom: typeof recipe.source.nom === "string" ? recipe.source.nom.trim() : "",
        url: typeof recipe.source.url === "string" && /^https?:\/\//i.test(recipe.source.url) ? recipe.source.url : ""
      } : null
    };
    const slug = app.normalize(clean.nom).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "recette";
    clean.identifiant = `nathalie-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    return clean;
  }

  function validateSavedRecipe(recipe) {
    if (!recipe || typeof recipe !== "object" || Array.isArray(recipe) ||
      typeof recipe.identifiant !== "string" || !recipe.identifiant.startsWith("nathalie-") ||
      typeof recipe.nom !== "string" || !recipe.nom.trim() || typeof recipe.categorie !== "string" ||
      !Array.isArray(recipe.ingredients) || !recipe.ingredients.length ||
      !recipe.ingredients.every((item) => item && typeof item === "object" && typeof item.nom === "string" && item.nom.trim() &&
        (item.quantite === null || item.quantite === undefined || item.quantite === "" || Number.isFinite(Number(item.quantite))) &&
        (item.unite === undefined || typeof item.unite === "string")) ||
      !Array.isArray(recipe.etapes) || !recipe.etapes.length ||
      !recipe.etapes.every((step, index) => typeof step === "string" && (step.trim() || recipe.aVerifier?.some((note) => note?.champ === `etapes[${index}]`)))) return false;

    if (recipe.preferences !== undefined && (!Array.isArray(recipe.preferences) || !recipe.preferences.every((value) => typeof value === "string"))) return false;
    if (recipe.allergenes !== undefined && (!Array.isArray(recipe.allergenes) || !recipe.allergenes.every((value) => typeof value === "string"))) return false;
    if (recipe.aVerifier !== undefined && (!Array.isArray(recipe.aVerifier) || !recipe.aVerifier.every((note) =>
      typeof note === "string" || note && typeof note === "object" &&
      (note.champ === undefined || typeof note.champ === "string") &&
      (note.note === undefined || typeof note.note === "string") &&
      (note.valeurLue === undefined || typeof note.valeurLue === "string")))) return false;
    if (recipe.preuves !== undefined && (!Array.isArray(recipe.preuves) || !recipe.preuves.every((proof) =>
      proof && typeof proof === "object" && typeof proof.champ === "string" && typeof proof.extrait === "string"))) return false;

    const numericFields = ["preparation", "cuisson", "attente", "portions", "difficulte", "calories"];
    if (numericFields.some((field) => recipe[field] !== undefined && recipe[field] !== null && recipe[field] !== "" && !Number.isFinite(Number(recipe[field])))) return false;
    return true;
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
    lastBackupTimestamp = Math.max(Date.now(), lastBackupTimestamp + 1);
    const stamp = `${new Date(lastBackupTimestamp).toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
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
    for (const recipe of state.recipes) app.unregisterPersonalRecipe(recipe.identifiant);
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
      state.backupCount = (await listBackups(directory)).length;
      state.recipes = await readRecipes(directory);
      state.status = "connected";
      registerAll();
    } catch (error) {
      state.status = "error";
      state.message = messageOf(error);
    }
  }

  async function add(recipe) {
    if (!validateSavedRecipe(recipe)) throw new Error("La recette est incomplète et ne peut pas être sauvegardée. Vérifiez son nom, ses ingrédients, ses étapes et les notes associées.");
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
    app.saveState();
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
    state.status = "connected";
    state.message = "";
    const restoredIds = new Set(state.recipes.map((recipe) => recipe.identifiant));
    app.state.favorites = app.state.favorites.filter((id) => !id.startsWith("nathalie-") || restoredIds.has(id));
    app.state.recipesToPrepare = app.state.recipesToPrepare.filter((id) => !id.startsWith("nathalie-") || restoredIds.has(id));
    app.saveState();
  }

  app.personalRecipeStore = { state, prepare: prepareRecipe, validate: validateSavedRecipe, extractWordDocument, connect, initialize, add, remove, restoreLatest, dataFolderName };
  app.nathalieEditor = editor;
})(window.AtTable = window.AtTable || {});