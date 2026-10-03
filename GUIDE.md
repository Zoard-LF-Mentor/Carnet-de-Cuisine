# À table

Carnet de recettes local, en français. Ouvrez `index.html` ou lancez `AtTable.exe` sous Windows; l’EXE ouvre la page dans le navigateur par défaut. Gardez le lanceur à côté de `index.html` et conservez les dossiers `Application`, `Donnees` et `Images`. Pour reconstruire le lanceur, exécutez `build-windows.ps1` dans Windows PowerShell. Les préférences et les listes restent dans le stockage local du navigateur, pas dans une sauvegarde GitHub du projet.

## Utiliser le carnet

### Trouver une recette

La recherche porte sur le nom, la description, la catégorie et le type de cuisine. On peut aussi filtrer par catégorie, préférences alimentaires, temps total ou temps de préparation active, puis trier par correspondance avec le garde-manger, durée ou nom. Les favoris peuvent être affichés seuls.

Les préférences sélectionnées doivent toutes correspondre aux étiquettes de la recette. Ce sont des indications provenant des données, pas une garantie médicale ou une certification. Il n’y a pas de filtre de difficulté.

Le pourcentage de correspondance compare les noms d’ingrédients de la recette à ceux du garde-manger; quelques synonymes sont reconnus. Il ne tient compte ni des quantités ni des ingrédients que vous devez acheter. Sans ingrédient au garde-manger, aucun pourcentage n’est affiché.

Le bouton « Explorer les ingrédients » ouvre le catalogue : les tuiles vertes sont au garde-manger; cliquer une tuile ajoute ou retire l’ingrédient. « Tout ajouter au garde-manger » ajoute d’un coup les ingrédients du catalogue. Le panneau de filtres de gauche peut être replié avec sa flèche pour agrandir la grille des recettes.

### Garde-manger et épicerie

Ajoutez les ingrédients que vous avez à la main, soit en les saisissant, soit en les choisissant dans le catalogue. Le catalogue est construit à partir des ingrédients des recettes. Retirer un ingrédient du garde-manger ne le retire pas automatiquement de la liste d’achats.

La liste d’achats est distincte. On peut y ajouter des articles, ajouter à la liste les ingrédients d’une recette qui ne figurent pas déjà au garde-manger, puis exporter la liste en CSV. Cocher un article le transfère au garde-manger et le retire de la liste. La liste contient des noms d’articles, pas leurs quantités de recette.

### Fiche recette

Une fiche présente les ingrédients, les portions, les étapes et, lorsqu’elle est fournie, la source. Les cases à côté des ingrédients servent à suivre la préparation et leur état est conservé.

Modifier les portions recalcule les quantités numériques au prorata, arrondies à deux décimales. Les étapes et les durées restent celles de la recette d’origine; elles ne sont pas recalculées. Le récipient, l’épaisseur des aliments ou le volume peuvent demander une adaptation ou plusieurs fournées. Pour les viandes, volailles et poissons, vérifier la cuisson avec un thermomètre et consulter les [températures sécuritaires de Santé Canada](https://www.canada.ca/fr/sante-canada/services/conseils-generaux-salubrite/temperatures-securitaires-cuisson-interne.html).

### Préparer plusieurs recettes

Sur une carte, « Préparer + » ajoute ou retire la recette du plan. La page « Préparation » présente les recettes choisies et regroupe les ingrédients portant le même nom. Cochez « Prêt » pour suivre l’avancement; créez des groupes pour organiser le travail, puis glissez-y les ingrédients ou choisissez leur groupe dans le menu. Développer une carte montre les quantités séparément par recette, sans additionner des unités qui pourraient être différentes. Pour chaque ingrédient manquant, cochez « Ajouter au garde-manger » ou « Ajouter à l’épicerie ». Un ingrédient déjà au garde-manger peut en être retiré directement depuis sa carte.

## À garder en tête

Les préférences alimentaires reposent sur les étiquettes des recettes; elles ne constituent ni une garantie médicale ni une certification. Toujours vérifier les ingrédients et les allergènes sur les emballages.

Les recettes et le catalogue sont locaux. Une image ou une source externe peut nécessiter une connexion Internet; seules les adresses HTTP(S) sont utilisées comme liens ou images. Le fonctionnement de la sauvegarde dépend du navigateur et de ses réglages. Pour conserver vos listes, réutilisez le même navigateur et évitez d’effacer ses données de site.

## Repères pour modifier le projet

- `index.html` est le point d’entrée; il charge les scripts dans un ordre précis pour permettre l’ouverture directe en `file://`.
- `Donnees/Recettes/manifeste.js` énumère les fichiers de recettes à charger. Chaque recette du dossier `Donnees/Recettes/` s’enregistre avec `enregistrerRecette(...)`.
- `Donnees/Recettes/modele-recette.js` fournit un exemple de structure. Certains champs facultatifs présents dans les données (calories, format de portion, notes préalables, observations et détails nutritifs) ne sont pas affichés dans les fiches.
- `Application/modules/catalogue-recettes.js` contient l’inscription, la recherche, les filtres et les calculs; `Application/modules/etat.js` gère l’état et sa sauvegarde.
- `Application/modules/vues/` contient les écrans et dialogues, dont `preparation.js` pour le plan multi-recettes; `Application/modules/assemblage-vues.js` les relie. `Application/modules/application.js` gère les interactions et le démarrage.
- `apparence.css` importe les feuilles thématiques de `Apparence/`. Modifier la feuille correspondant à l’écran ou au composant visé, sans déplacer les imports hors de ce point d’entrée.

Pour ajouter une recette, copier le modèle, lui donner un identifiant unique et ajouter son chemin au manifeste. Après une modification, ouvrir ou recharger `index.html` et vérifier la console, la recherche, une fiche, le garde-manger, l’épicerie et un écran étroit. Aucun test automatisé n’est configuré.
