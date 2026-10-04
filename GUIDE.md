# À table

Carnet de recettes local, en français. Ouvrez `index.html` ou lancez `AtTable.exe` sous Windows; le lanceur ouvre la page dans Edge ou Chrome sur le port local stable `48173`. Si le port est occupé, fermez l’autre instance d’À table. Gardez le lanceur à côté de `index.html` et conservez les dossiers `Application`, `Donnees` et `Images`. Pour reconstruire le lanceur, exécutez `build-windows.ps1` dans Windows PowerShell. Les préférences et les listes restent dans le stockage du navigateur; l’ouverture directe par `file://` et celle du lanceur ont des stockages séparés. Elles ne sont pas incluses dans une sauvegarde GitHub du projet.

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

### Recettes de Nathalie

Dans l’onglet « Nathalie », choisir « Documents » au premier démarrage. L’application y crée `À table/recettes-nathalie.json` et y enregistre ses recettes; une copie datée est conservée dans `À table/Sauvegardes` avant chaque modification. Si le navigateur demande à nouveau l’autorisation, reconnecter le dossier Documents. Ces fichiers sont indépendants du cache et des données du navigateur; ils peuvent aussi être inclus dans une sauvegarde OneDrive.

Le carnet utilise JSON pour stocker des données; cela ne rend pas ses recettes moins officielles. Les fichiers `.js` du catalogue sont du code exécuté au démarrage pour enregistrer les recettes, alors que le JSON personnel est un format de données indépendant, adapté aux sauvegardes. Les nouvelles recettes personnelles suivent le schéma des recettes du catalogue. Le champ facultatif `aVerifier` conserve les incertitudes avec le chemin du champ concerné, une explication et, si disponible, l’extrait source.

Pour importer plusieurs recettes, glisser plusieurs fichiers `.docx` ou `.txt` dans la zone prévue, ou les choisir ensemble (15 Mo maximum par fichier). Un ancien fichier `.doc` doit être enregistré en `.docx`; les PDF et photos ne sont pas pris en charge. Les textes sont extraits sur cet appareil et affichés dans une file indépendante. On peut corriger le texte d’une fiche, puis convertir toutes les fiches prêtes en lot. La conversion du modèle local se fait une recette à la fois pour éviter que plusieurs générations se disputent la mémoire GPU; chaque recette garde son propre aperçu et son bouton d’ajout.

**Conversion avec l’assistant local :** pour le carnet, ouvrir `AtTable.exe` plutôt que `index.html`. Le fichier HTML s’ouvre, mais le navigateur bloque depuis `file://` la connexion à Ollama; le lanceur ouvre la même application à une adresse locale qui permet cette connexion. Ollama et un modèle installé traitent alors la recette sur l’ordinateur, sans compte ni transfert à un service d’IA. Installer Ollama depuis [ollama.com/download](https://ollama.com/download), l’ouvrir, puis exécuter une fois dans PowerShell `ollama pull qwen2.5:3b` (environ 1,9 Go) ou `ollama pull qwen2.5:7b` (environ 4,7 Go, demande plus de mémoire). Le gabarit demande au modèle de ne remplir comme faits que les informations clairement appuyées par la fiche et de mettre les doutes dans `aVerifier`. Toute valeur numérique signalée comme douteuse est retirée de son champ avant l’aperçu; sa note et son extrait restent attachés à la recette. Le programme ajoute aussi des alertes déterministes pour les quantités absentes, les durées/portions inconnues et les noms d’ingrédients qui semblent contenir des mesures. La flèche « À vérifier » est conservée dans la fiche sauvegardée. Ces contrôles réduisent les erreurs mais ne peuvent pas garantir qu’un modèle n’en fera aucune : relire les informations importantes avant d’ajouter la recette.

Après conversion locale, l’application vérifie la structure et affiche les ingrédients, les étapes et les notes. Ces contrôles ne garantissent pas que le modèle n’a rien oublié ou inventé : regarder les éléments signalés, puis choisir « Ajouter au carnet ». Le dossier Documents doit être connecté pour activer ce bouton. Cette sauvegarde directe par fichier fonctionne avec une version récente de Microsoft Edge ou Google Chrome. La conversion assistée nécessite Ollama; sans lui, le texte peut être importé et relu, mais pas converti automatiquement.

Les champs incertains sont neutralisés par des libellés visibles (« Ingrédient à vérifier », « Étape à vérifier ») et accompagnés d’une note dans la recette. Le champ facultatif `preuves` conserve les extraits cités pour chaque ingrédient, étape et valeur numérique contrôlée. Les nombres simples, fractions usuelles et durées exprimées en minutes sont normalisés; les formats ambigus restent à vérifier. L’application vérifie qu’un extrait apparaît dans le texte source, compare les nombres cités et contrôle quelques familles d’unités courantes sans les convertir. Cela ne prouve pas le sens complet de la citation; les unités rares ou les formulations inhabituelles peuvent encore nécessiter une vérification manuelle. Les allergènes absents de la fiche sont signalés comme non vérifiés, jamais comme une confirmation d’absence.

**Tests techniques :** ouvrir `Tests/verification-recettes.html` dans un navigateur récent pour lancer les tests locaux. Ils couvrent la préparation, les preuves, leur affichage sécurisé, les unités courantes et la sauvegarde/restauration sur un faux système de fichiers en mémoire. Ils n’ouvrent pas Documents et n’écrivent pas dans le carnet; ils ne remplacent pas un essai avec Ollama ni un contrôle de fichiers Word réels.

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
