enregistrerRecette(
  {
    // --- Obligatoire ---
    identifiant: "id-recette",              // minuscules, tirets; doit égaler le nom du fichier
    nom: "Nom de la recette",
    categorie: "categorie",                 // plat-principal | salade | dessert | collation | soupe | condiment | 
    cuisine: "Type de cuisine",
    image: "url-image",                     // http(s) obligatoire
    preferences: [],                        // sans-gluten | sans-lactose | végétarien | Sans Reflux |
     difficulte: x,                          
    preparation: x,                        
    cuisson: x,                            
    portions: x,                            // nombre > 0, ou null si inconnu
    ingredients: [
      { nom: "ingrédient", quantite: x, unite: "unité" }
    ],
    etapes: [
      "Étape."
    ],

    // --- Facultatif (supprimer les lignes non utilisées) ---
    attente: x,                             // minutes de repos/réfrigération
    calories: x,                            // par portion
    formatPortion: "x g",
    description: "Courte présentation affichée en haut de la fiche.",
    avantDeCommencer: "Matériel ou préparation requise.",
    observations: "Conservation, variantes ou remarques.",
    valeurNutritive: {
      lipides: "x g",
      grasSatures: "x g",
      grasTrans: "x g",
      cholesterol: "x mg",
      sodium: "x mg",
      glucides: "x g",
      fibres: "x g",
      sucres: "x g",
      glucidesNets: "x g",
      proteines: "x g",
      vitamineA: "x %",
      vitamineC: "x %",
      calcium: "x %",
      fer: "x %"
    },
    source: {
      nom: "Nom de la source",
      url: "url-source"
    }
  },
  {
    // --- 2e argument entièrement facultatif ---
    synonymes: {
      "autre nom de l'ingrédient": "ingrédient"
    }
  }
);