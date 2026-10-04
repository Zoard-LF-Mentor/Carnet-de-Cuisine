# Analyse globale du projet À table

## Résumé exécutif

À table est un carnet culinaire local en français, devenu une petite application de cuisine complète : catalogue de recettes, recherche, garde-manger, épicerie, préparation multi-recettes et carnet personnel alimenté depuis des fiches Word ou texte. Son ambition distinctive n’est pas de « laisser l’IA cuisiner à votre place », mais de rendre les recettes consultables et les imports moins laborieux tout en gardant la personne responsable de la vérification.

Le projet est fonctionnel et possède une identité d’usage claire. Le sous-système d’import personnel est particulièrement travaillé : extraits cités, notes d’incertitude, contrôle de certains nombres et unités, aperçu humain, sauvegardes et restauration. Après les améliorations décrites plus bas, les tests locaux exécutés dans le navigateur affichent 16 succès et 0 échec. Cela valide une tranche réelle du système, pas toute l’application.

La faiblesse la plus préoccupante identifiée était la persistance sous le lanceur Windows : un port choisi dynamiquement changeait l’origine du navigateur entre les exécutions. Le lanceur utilise maintenant le port stable `48173`, et son code compile avec succès. Il reste à vérifier sur des lancements réels successifs que les préférences et l’autorisation du dossier personnel sont bien retrouvées.

Autre problème de récupération confirmé par le code : si le fichier JSON personnel est invalide, l’initialisation passe en état d’erreur; l’interface ne propose la restauration de sauvegarde que lorsque l’état est « connecté ». La sauvegarde peut donc exister, mais devenir inaccessible par le parcours normal au moment même où elle est nécessaire.

Cette analyse distingue les constats observés, les risques à reproduire, les choix de périmètre documentés et les propositions de produit. Elle ne constitue ni un audit de sécurité exhaustif, ni une validation culinaire ou juridique de toutes les recettes.

## 1. Direction et proposition du produit

### Ce que le projet cherche à accomplir

- Trouver une recette selon le nom, la catégorie, les préférences déclarées, les durées et les ingrédients disponibles.
- Tenir séparément un inventaire domestique et une liste d’achats.
- Passer d’une idée à un plan de cuisine avec plusieurs recettes, des ingrédients regroupés et un suivi d’avancement.
- Importer des recettes personnelles depuis `.docx` ou `.txt`, en laissant la personne relire et accepter le résultat.
- Garder les données personnelles hors du dépôt du catalogue : le carnet Nathalie est stocké dans un fichier JSON choisi dans Documents, avec des copies de sauvegarde. (completement optionel, les recettes personnelles pourrait aussi etre ajouter a lapplication meme)
- Offrir un parcours unique de conversion assistée avec Ollama sur l’ordinateur; le parcours distant de copie/collage a été retiré conformément à l’orientation du projet.

### Positionnement que je lis dans le code

Le projet privilégie la simplicité de déploiement, la maîtrise locale des données et une interaction compréhensible au quotidien. Il ne tente pas de devenir une plateforme sociale, un service de planification nutritionnelle certifiée ou un gestionnaire d’achats complet. Cette sobriété est une force tant qu’elle est intentionnelle : mieux vaut un périmètre modeste cohérent qu’une accumulation de fonctions non fiables.

La meilleure idée de produit est le principe de **l’incertitude visible**. `aVerifier` n’est pas un simple champ technique : il transforme les lacunes en information que la personne peut traiter. Les preuves citées ne sont pas présentées comme une garantie sémantique; le texte de référence reconnaît explicitement leurs limites.

### Direction créative proposée

Faire évoluer le carnet vers une « cuisine de confiance » : chaque fonction devrait aider à décider sans prétendre savoir ce qu’elle ne sait pas. Une future expérience pourrait distinguer visuellement trois états de connaissance : **confirmé par la fiche**, **déduit avec prudence**, **à vérifier**. Le concept peut s’étendre du carnet personnel aux allergènes, quantités, temps et disponibilité au garde-manger, sans transformer l’interface en tableau de bord anxiogène.

## 2. Carte du système

| Couche | Responsabilité observée | Principaux repères |
|---|---|---|
| Entrée et chargement | Ordre des scripts et structure initiale de la page | [index.html](index.html) |
| État utilisateur | Vue courante, filtres, favoris, portions et listes locales | [etat.js](Application/modules/etat.js) |
| Catalogue métier | Inscription, normalisation, recherche, temps, score et catalogue d’ingrédients | [catalogue-recettes.js](Application/modules/catalogue-recettes.js) |
| Données de recettes | Manifeste de scripts et forme de recette | [manifeste.js](Donnees/Recettes/manifeste.js), [modele-recette.js](Donnees/Recettes/modele-recette.js) |
| Interactions | Événements délégués, navigation, opérations de cuisine et démarrage | [application.js](Application/modules/application.js) |
| Rendu | Vues de recettes, épicerie, préparation, guide, import et fiches | [liste-recettes.js](Application/modules/vues/liste-recettes.js) |
| Stockage personnel | Extraction, validation, preuves, permissions, fichier JSON et sauvegardes | [recettes-nathalie.js](Application/modules/recettes-nathalie.js) |
| Présentation | Feuilles thématiques importées par un point d’entrée CSS | [apparence.css](apparence.css), [fondations.css](Apparence/fondations.css) |
| Distribution | Lanceur Windows et archive distribuable | [build-windows.ps1](build-windows.ps1), [pack-windows.ps1](pack-windows.ps1) |
| Vérification | Tests de navigateur orientés import et stockage simulé | [verification-recettes.html](Tests/verification-recettes.html) |

L’application utilise des scripts classiques partageant `window.AtTable`. Les recettes du catalogue sont elles-mêmes des scripts enregistrés au chargement par `enregistrerRecette(...)`; elles ne sont pas simplement lues comme des fichiers JSON. Le mode direct `file://` est une contrainte assumée par l’organisation actuelle. Le lanceur fournit en plus une origine HTTP locale nécessaire à certaines API du navigateur et à l’accès à Ollama.

Ce choix réduit les dépendances et rend le projet facile à ouvrir; en échange, l’ordre de chargement est important, le contrat entre modules est implicite et la compilation ne détecte pas certains problèmes de forme avant exécution.

## 3. Invariants et règles qui structurent le projet

### Données

- Une recette statique est enregistrée avec un identifiant unique, un nom et une liste d’ingrédients acceptable.
- Les noms sont comparés après normalisation : casse, accents et ponctuation ne doivent pas créer artificiellement des identités différentes.
- Les recettes personnelles portent des notes d’incertitude et, lorsque disponibles, des extraits provenant du texte source.
- Une quantité ambiguë, une valeur numérique incohérente ou une unité contradictoire ne devrait pas être transformée silencieusement en fait.
- Une fiche ne déclarant pas d’allergène ne confirme pas son absence.
- Les fichiers personnels sont distincts des données du catalogue et ne sont pas inclus dans la sauvegarde GitHub du projet.

### Usages culinaires

- Les filtres alimentaires sélectionnés sont cumulatifs : chaque préférence choisie doit correspondre aux étiquettes de la recette.
- Le score garde-manger compare les noms d’ingrédients. Il ne mesure ni les quantités suffisantes ni le coût d’achat.
- La liste d’épicerie ne conserve que des noms d’articles, pas les quantités requises.
- Le plan de préparation regroupe des noms d’ingrédients, mais conserve leurs quantités par recette au lieu de faire une somme potentiellement fausse.
- Le changement de portions recalcule les nombres d’ingrédients, pas les durées ni les étapes.
- Le garde-manger et l’épicerie sont des états distincts; les transitions explicites sont documentées dans le guide.

### Confiance et sécurité d’usage

- L’import assisté est une proposition à relire, pas une publication automatique.
- Une citation retrouvée dans la source prouve seulement la présence du texte cité, pas que son interprétation par le modèle est correcte.
- Les valeurs numériques et les unités couvertes par des contrôles déterministes reçoivent un traitement plus strict; les formulations non reconnues doivent rester vérifiables manuellement.
- Les contenus visibles provenant des recettes et des preuves sont échappés dans les vues inspectées; un test vérifie qu’un extrait ressemblant à une balise de script reste affiché comme du texte.

## 4. Réussites à conserver

1. **Parcours métier complet.** Le projet relie découverte, sélection, préparation et achats au lieu de s’arrêter à un écran de catalogue.
2. **Périmètre local lisible.** Les listes et préférences utilisent le stockage du navigateur; les recettes personnelles sont persistées dans un fichier distinct que la personne peut sauvegarder avec ses documents.
3. **Réversibilité des changements personnels.** Les mutations créent une copie datée, limitent l’historique à 30 copies et proposent une restauration avec sauvegarde de l’état courant.
4. **Import prudent.** Le système nettoie le texte extrait, impose une limite de taille, accepte un ensemble précis de formats, valide le JSON et garde les incertitudes.
5. **Contrôles plus forts que le seul prompt.** Le code confronte les citations à la source, vérifie les nombres et quelques familles d’unités, et neutralise certaines valeurs au lieu de faire confiance au modèle.
6. **Échappement cohérent dans les vues examinées.** Les textes dynamiques sont généralement passés par `app.escape`; un test de sécurité de rendu est présent.
7. **Plan de cuisine prudent.** Les ingrédients identiques sont groupés sans convertir ni additionner des unités incompatibles; le menu de groupe offre une alternative au glisser-déposer.
8. **Identité visuelle propre au domaine.** Les styles ne ressemblent pas à un gabarit SaaS générique; les feuilles sont ventilées par thème et incluent des adaptations mobiles et une préférence de mouvement réduit.
9. **Données vérifiées structurellement.** L’examen élargi rapporte 67 recettes énumérées et chargées, sans référence manquante ni identifiant dupliqué; les fiches possèdent des ingrédients et des étapes.
10. **Tests utiles déjà présents.** La page ouverte rapporte maintenant 16 tests réussis, incluant les régressions ajoutées pour la récupération, le schéma personnel, l’assistant unique et l’affichage prudent des allergènes.

## 5. À corriger en priorité

Les niveaux décrivent la gravité potentielle et la confiance dans le constat, pas une estimation précise d’effort.

### P0 — Stabiliser l’origine et la persistance du lanceur — implémenté, test de relance restant

**Correctif appliqué.** Le lanceur écoute maintenant sur le port fixe `48173`; son chemin aléatoire ne change pas l’origine du navigateur. Le build a été exécuté avec succès. L’ouverture directe par `file://` reste une origine distincte et possède donc un stockage séparé.

**Validation restante :** définir une préférence et connecter Documents, fermer l’application, relancer `AtTable.exe`, puis confirmer la récupération sur Edge et Chrome. Un port occupé empêche maintenant le lancement plutôt que de basculer silencieusement sur une autre origine.

**Protection du build :** l’exécutable est produit dans un fichier temporaire et ne remplace l’ancien qu’après compilation réussie.

### P0 — Rendre les sauvegardes récupérables quand le fichier courant est invalide — correctif de parcours appliqué

**Correctif appliqué.** L’initialisation charge maintenant le nombre de sauvegardes avant de lire le fichier courant; si la lecture échoue, l’interface garde l’accès au dossier et présente la restauration en état d’erreur. Une restauration valide remet le carnet à l’état connecté. Une régression de navigateur vérifie l’affichage et le retour à cet état.

**Validation restante :** vérifier le flux avec un vrai fichier JSON corrompu, une vraie permission Documents et une sauvegarde sur disque. Le fichier courant est copié par le mécanisme de sauvegarde avant son remplacement, mais aucun scénario de corruption physique n’a été exécuté ici.

### P1 — Ne pas masquer l’échec de chargement du catalogue — implémenté

**Correctif appliqué.** Les chemins de manifeste invalides et les scripts qui échouent au chargement sont enregistrés. Chaque vue affiche un avertissement accessible `role="alert"` indiquant le nombre d’échecs et jusqu’à trois chemins. Le démarrage normal a été rechargé avec 67 recettes et sans avertissement.

**Amélioration future :** ajouter un test contrôlé avec un chemin de manifeste volontairement absent et éventuellement un bouton de copie du rapport détaillé.

### P1 — Renforcer la validation des recettes personnelles — première tranche implémentée

**Correctif appliqué.** La validation vérifie maintenant les formes des ingrédients, préférences, allergènes, notes, preuves, étapes et valeurs numériques. Une régression confirme qu’une chaîne utilisée à la place du tableau `preferences` est rejetée.

**À poursuivre :** formaliser un schéma partagé entre catalogue statique, import et chargement personnel; la validation actuelle demeure une fonction JavaScript locale et n’a pas encore de couverture exhaustive de chaque champ facultatif.

### P1 — Protéger les livrables existants pendant le build et le packaging — implémenté

**Correctif appliqué et exécuté.** Le build compile vers un exécutable temporaire avant remplacement. Le packaging compresse vers un ZIP temporaire. Si le ZIP courant est verrouillé, il est conservé et le nouveau paquet est créé sous un nom horodaté; ce scénario a été reproduit avec succès.

**Validation restante :** provoquer un échec de compilation et de compression pour confirmer que les anciens artefacts restent intacts dans ces chemins d’échec.

## 6. À réparer ou vérifier par des scénarios ciblés

Ces points sont importants, mais nécessitent soit un essai reproductible, soit une décision de comportement avant de devenir un correctif certain.

- **Sauvegardes et permissions réelles :** tester refus d’autorisation, autorisation révoquée, fichier JSON invalide, dossier de sauvegarde absent, sauvegarde invalide, disque plein et relance de la restauration.
- **Mutations concurrentes :** vérifier deux ajouts presque simultanés et l’ajout pendant une conversion. Sérialiser les écritures si les opérations peuvent partir de la même collection avant que la précédente soit terminée.
- **Double conversion locale :** le bouton de conversion simple n’est pas clairement désactivé pendant une requête. Reproduire les clics rapides et les réponses qui terminent dans le désordre; ajouter un état de chargement et une protection contre l’écrasement d’un aperçu plus récent si nécessaire.
- **Filtre de durée et valeurs inconnues :** une recette sans temps demeure visible lorsqu’un maximum est choisi, car seule une durée connue dépassant le seuil est exclue. Décider si « maximum » signifie strictement « durée connue sous ce seuil » ou « durée inconnue tolérée mais signalée ».
- **Étiquettes sans reflux :** aucune recette du catalogue ne portait cette préférence; le filtre a été retiré de la liste proposée jusqu’à ce que des données fiables et non médicales puissent l’étayer.
- **Focus après rendu :** l’assemblage remplace le contenu principal par `innerHTML`. Après certaines actions qui déclenchent un rendu complet, le contrôle focalisé peut être supprimé. Tester le parcours clavier et restaurer le focus pertinent ou limiter le rendu aux zones modifiées.
- **Annonces aux lecteurs d’écran :** un conteneur `#annonce-vocale` existe, mais l’usage cohérent de cette région n’est pas établi. Vérifier l’annonce des résultats de recherche, de la conversion et des sauvegardes avec une technologie d’assistance.
- **Export CSV :** le fichier est construit à partir de noms cités correctement, mais un test d’ouverture dans Excel/LibreOffice devrait confirmer l’encodage, les séparateurs attendus en contexte francophone et le comportement avec noms contenant des retours à la ligne.
- **Lanceur et serveur local :** vérifier la persistance sur plusieurs relances, le cas du port fixe occupé, l’arrêt après inactivité, l’accès à Ollama et une demande malformée. README et guide indiquent maintenant Edge/Chrome et le port stable; le lancement réel n’a pas été testé de bout en bout.

## 7. À ajouter : évolutions produit à valeur forte

Ces éléments ne sont pas des bugs. Ils étendent le produit et devraient suivre la stabilisation de la persistance et des données.

### 7.1 Atelier de vérification de recettes

Transformer `aVerifier` en file de travail : filtre « à vérifier », filtres par type (quantité, allergène, durée, source), compteur d’incertitudes, comparaison côte à côte avec l’extrait, et statut explicite après correction. Cela donne une forme visible à l’avantage distinctif du projet.

### 7.2 Allergenes et déclarations de confiance

Les fiches présentent maintenant « Allergènes déclarés dans la fiche » et précisent que l’absence de renseignements ne confirme pas l’absence d’allergènes ou de traces. L’évolution restante est d’indiquer la provenance et le niveau de vérification de chaque déclaration; ne jamais en faire une garantie d’innocuité.

### 7.3 Difficulté et critères de sélection plus transparents

Le modèle et plusieurs recettes contiennent une difficulté, mais elle n’est pas affichée ni filtrable; le guide dit qu’il n’y a pas de filtre de difficulté. Après vérification de la cohérence des évaluations, proposer difficulté, équipement requis et temps actif comme filtres distincts. Afficher les critères ayant produit le score de correspondance, pas seulement un pourcentage opaque.

### 7.4 Liste d’épicerie mieux informée, mais sans fausse précision

Permettre de lier une ligne d’achat à une ou plusieurs recettes et de conserver les quantités sources. N’additionner automatiquement que lorsque les unités sont explicitement compatibles; sinon afficher les besoins séparément. Garder la possibilité de créer un article libre sans recette liée.

### 7.5 Plan hebdomadaire et export

Une vue de planification par jour pourrait réutiliser les recettes et le plan de préparation existants. Un export imprimable ou calendrier local renforcerait l’usage sans imposer de compte ni de synchronisation serveur.

### 7.6 Bibliothèque d’ingrédients commune

Le catalogue est actuellement dérivé des noms dans les recettes et les synonymes sont associés à des enregistrements de recette. Un référentiel léger pourrait gérer nom canonique, variantes linguistiques, catégories, unités usuelles et allergènes potentiels avec provenance. Éviter d’en faire une ontologie trop ambitieuse : le premier gain serait la cohérence des correspondances et des achats.

### 7.7 Outils de maintenance du catalogue

Ajouter un diagnostic lisible qui vérifie le manifeste, les identifiants, catégories, quantités, durées, chemins d’images, champs de modèle et cohérence des synonymes. Il peut être lancé dans la page de tests ou comme commande locale et rapporter les anomalies sans modifier les recettes.

## 8. Limitations réelles, limitations assumées et limitations fictives

### Limitations réelles vérifiées dans le comportement

- Les filtres de durée laissent passer les recettes dont la durée est inconnue.
- Le score de correspondance ne tient pas compte des quantités ni des ingrédients à acheter.
- La liste d’épicerie contient les noms des articles, pas les quantités de recette.
- Le redimensionnement des portions ne réécrit ni les instructions ni les temps.
- Les valeurs nutritionnelles facultatives ne sont pas toutes présentées dans les fiches.
- Le traitement des imports est borné à `.docx` et `.txt`; l’extraction du texte n’équivaut pas à une compréhension garantie de toutes les mises en page Word.
- Les images externes dépendent d’une connexion réseau; le noyau de l’application reste local.
- Les tests du navigateur n’exercent pas toute la chaîne Windows, le service Ollama réel ou la persistance réelle du dossier choisi.

### Limites assumées et documentées, non nécessairement à corriger

- Pas de certification diététique, médicale ou allergène.
- Pas de synchronisation automatique entre appareils.
- Pas de quantités fusionnées lorsque les unités peuvent différer.
- Pas de prise en charge des PDF, photos et anciens `.doc` dans le parcours d’import.
- Pas de filtre de difficulté actuellement.

### Limitations qui paraissent plus grandes qu’elles ne le sont

- **« L’application requiert une connexion » :** faux pour le cœur du carnet et les scripts locaux. Les images externes et l’installation/téléchargement d’Ollama sont des exceptions.
- **« Les recettes en JavaScript rendent le catalogue non officiel ou inexportable » :** le format décrit le mécanisme de chargement, pas la valeur culinaire. Un format JSON pour les recettes personnelles coexiste déjà avec le catalogue.
- **« Le projet n’a aucun test » :** inexact. Une page de test locale existe et ses 15 assertions réussissent. La limite réelle est l’absence d’exécution automatisée/intégration continue et la couverture partielle.
- **« L’IA locale rend automatiquement l’import fiable » :** inexact. Le modèle est accompagné de contrôles et d’une validation humaine; il peut encore omettre ou mal interpréter des éléments.

## 9. Dette de cohérence documentaire et du modèle

- Le guide dit qu’aucun test automatisé n’est configuré, alors qu’une page exécute une suite de tests manuelle. Préciser : « tests exécutables dans le navigateur; aucun runner/pipeline automatisé ».
- Le README et le guide décrivent maintenant l’ouverture dans Edge/Chrome et l’origine stable du lanceur; la vérification sur des lancements répétés reste à faire.
- Le modèle de recette semble énumérer une liste de catégories et une graphie de préférence qui ne reflètent pas parfaitement les données et clés effectivement utilisées. Une vérification automatique des valeurs autorisées éviterait que le modèle devienne un faux contrat.
- `difficulteMax` est sérialisé alors qu’aucun état ni contrôle actif correspondant n’est visible. Retirer ce reste ou implémenter entièrement la fonction après décision produit.
- Le guide décrit l’affichage et les données plus précisément que les tests ne les couvrent; conserver le guide comme spécification vivante, reliée à des tests des règles critiques.

## 10. Qualité de l’expérience et accessibilité

L’interface témoigne d’un effort d’accessibilité : libellés masqués pour certains champs, noms accessibles de boutons, éléments natifs, messages d’état et une option de réduction des mouvements. Il reste à vérifier le comportement réel au clavier et avec lecteur d’écran, notamment après le remplacement complet du contenu et durant les opérations asynchrones.

Le plan permet de choisir un groupe depuis un menu, ce qui évite de rendre le glisser-déposer indispensable. C’est un bon exemple de redondance utile. En revanche, les icônes textuelles et actions en forme de croix doivent garder des libellés clairs; leur présentation visuelle seule ne suffit pas.

Côté création, l’identité visuelle est déjà spécifique et cohérente. La prochaine amélioration ne devrait pas être un relooking général : elle devrait donner une forme visible aux états de confiance, rendre les informations utiles plus scannables et réduire les attentes silencieuses lors des opérations lentes.

## 11. Stratégie de tests recommandée

### Niveau 1 — Tests purs de données et logique

- Valider chaque recette du manifeste contre un schéma partagé.
- Tester la normalisation et les synonymes de noms.
- Tester les seuils de durée avec données connues, nulles, négatives et textuelles.
- Tester l’arrondi des portions et la préservation des unités.
- Ajouter un test garantissant que chaque préférence proposée correspond à au moins une recette publiée, ou est explicitement marquée expérimentale.

### Niveau 2 — Tests de persistance

- Valider ajout, suppression, sauvegarde avant mutation et limite des 30 copies.
- Valider la récupération lorsque le JSON courant est corrompu.
- Valider les refus de permissions, l’autorisation expirée, une sauvegarde invalide et les opérations concurrentes.
- Tester le stockage du navigateur après relance avec le lanceur.

### Niveau 3 — Parcours d’interface

- Recherche, filtre, favori, fiche, portions, garde-manger, épicerie, export CSV, plan de préparation, import en lot.
- Clavier, focus après rendu, lecteur d’écran, zoom et écrans étroits.
- Faire échouer volontairement une image ou un fichier recette et vérifier le message de récupération.

### Niveau 4 — Distribution

- Construire dans un environnement Windows propre.
- Simuler compilation et compression qui échouent tout en préservant le livrable précédent.
- Tester le ZIP extrait depuis un autre dossier, le lancement avec Edge/Chrome, un port indisponible et l’arrêt après inactivité.

## 12. Feuille de route pragmatique

### Étape A — Fiabilité des données

1. Stabiliser l’origine et vérifier la persistance après relance.
2. Rendre la récupération de sauvegarde possible malgré un JSON courant invalide.
3. Renforcer le schéma commun de validation.
4. Signaler clairement les échecs de chargement des recettes.
5. Protéger les anciens livrables dans les scripts de build/package.

**Critère de sortie :** aucune donnée personnelle ne disparaît entre deux lancements attendus; un carnet invalide est récupérable à partir d’une sauvegarde testée; un chargement incomplet est annoncé.

### Étape B — Clarté et accessibilité

1. Décider et documenter la règle sur les temps inconnus.
2. Annoncer les états asynchrones aux technologies d’assistance.
3. Préserver/restaurer le focus après les rendus.
4. Afficher allergènes déclarés et états inconnus sans prétention de garantie.
5. Aligner guide, README, modèle et comportement du lanceur.

**Critère de sortie :** une personne peut accomplir les parcours principaux sans souris et comprend ce qui est connu, absent ou à vérifier.

### Étape C — Croissance utile

1. Introduire un validateur de catalogue réutilisable par tests et maintenance.
2. Ajouter une vue « À vérifier » et une provenance explicite.
3. Améliorer l’épicerie par quantités sources et unités compatibles.
4. Ajouter plan hebdomadaire et exports seulement après stabilisation des données.

**Critère de sortie :** toute nouvelle fonction exploite un modèle de données commun et s’accompagne de tests de non-régression.

## 13. Indicateurs simples de qualité

- 100 % des recettes du manifeste passent le schéma de données.
- 0 échec de chargement masqué au démarrage.
- Préférences proposées avec au moins une recette étayée ou un état explicatif.
- Récupération d’un carnet corrompu validée par un test.
- Persistance confirmée sur plusieurs lancements du lanceur.
- Tous les parcours critiques accomplissables au clavier.
- Tests de logique et données exécutés automatiquement à chaque changement.
- Chaque valeur incertaine importée reste identifiée dans l’aperçu et dans le fichier sauvegardé.

## 14. Questions de décision

1. Faut-il un jour synchroniser l’état entre l’ouverture directe par `file://` et le lanceur, ou la séparation actuelle des stockages doit-elle rester une règle explicite?
2. Quand le carnet est corrompu, faut-il restaurer automatiquement la dernière copie valide ou demander un choix explicite parmi plusieurs sauvegardes?
3. Les préférences alimentaires sont-elles des filtres pratiques, des indications d’ingrédients ou des déclarations de sécurité? Le produit doit continuer à éviter toute ambiguïté médicale.
4. Le score de garde-manger doit-il rester un simple indicateur de noms présents, ou évoluer vers une estimation des quantités manquantes?
5. Le projet vise-t-il uniquement un usage personnel Windows ou une distribution plus large? Cette réponse change le niveau attendu pour les tests, les droits de contenu, la portabilité et la maintenance.

## Conclusion

À table possède déjà un centre de gravité fort : un carnet de cuisine local, humain et prudent, centré sur le passage de l’idée au repas. Ses réussites sont concrètes et le distinguent davantage que l’accumulation de fonctionnalités ne le ferait. Le prochain effort ne devrait pas viser d’abord une sophistication visible; il devrait protéger la confiance promise par la persistance, la récupération et la qualité des données.

L’ordre de décision que je recommande est donc : **rendre les données persistantes, rendre les données récupérables, rendre les états compréhensibles, puis élargir l’expérience**. Une fois ces fondations vérifiées, l’évolution la plus singulière serait un carnet où chaque recette raconte aussi d’où viennent ses informations et ce qui reste à confirmer.

## Portée et état de l’analyse

Cette analyse a servi de feuille de route à une première série d’améliorations. Le build Windows a été exécuté avec succès et le packaging a produit une archive; le ZIP d’origine étant verrouillé, la nouvelle archive a été créée sous un nom horodaté. La page de tests affiche 16 succès et 0 échec. Je n’ai pas testé un lancement réel répété avec un dossier Documents physique, ni provoqué un échec de compilation/compression. Des modifications préexistantes demeurent dans le dépôt; elles n’ont pas été annulées.
