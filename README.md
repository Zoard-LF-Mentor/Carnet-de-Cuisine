# À table

Carnet de recettes local en français. Ouvrez `index.html` ou lancez `AtTable.exe` dans une version récente de Microsoft Edge ou Google Chrome. Le lanceur doit rester dans le même dossier que `index.html`; les dossiers `Application`, `Donnees` et `Images` doivent aussi rester à leur place.

## Créer le lanceur Windows

Dans Windows PowerShell, depuis ce dossier, exécutez :

```powershell
.\build-windows.ps1
```

Le script génère `AtTable.exe` à côté de `index.html`. Il utilise le compilateur .NET Framework de Windows et ne nécessite pas le SDK .NET. Le lanceur ouvre la page dans Edge ou Chrome sur le port local stable `48173`; si ce port est déjà occupé, fermez l’autre instance d’À table. L’exécutable est compilé temporairement puis remplacé seulement après une compilation réussie; il ne contient pas les recettes ni les images.

## Données et sauvegarde

Le garde-manger, les favoris et les listes courantes sont conservés dans le stockage local du navigateur. Les nouvelles recettes de Nathalie, elles, sont enregistrées dans `Documents\À table\recettes-nathalie.json`, hors du cache du navigateur. Avant chaque modification, une copie datée est créée dans `Documents\À table\Sauvegardes`; jusqu’aux 30 sauvegardes les plus récentes sont conservées. L’onglet Nathalie permet de restaurer la dernière copie en un clic; l’état courant est alors sauvegardé à son tour.

Dans l’onglet « Nathalie », choisir Documents au premier démarrage. Déposer un fichier `.docx` ou `.txt` (15 Mo maximum). L’application lit le texte localement; les anciens `.doc`, PDF et photos ne sont pas pris en charge. La conversion assistée utilise Ollama localement : lancer `AtTable.exe` (et non ouvrir `index.html` directement), installer Ollama puis télécharger un modèle : `ollama pull qwen2.5:3b` (environ 1,9 Go) ou `ollama pull qwen2.5:7b` (environ 4,7 Go). Le modèle peut omettre une quantité; regarder l’aperçu et les anomalies signalées, puis choisir « Ajouter au carnet ». Sans Ollama, l’import et la lecture des fiches restent disponibles, mais la conversion assistée ne l’est pas. Les données du navigateur ouvertes par `index.html` directement sont séparées de celles de l’origine du lanceur.

La sauvegarde GitHub du dépôt ne sauvegarde pas les données personnelles du navigateur ni le fichier de recettes de Nathalie. Sauvegardez aussi `Documents\À table`, par exemple avec OneDrive.

Pour préparer un paquet à partager, exécutez `pack-windows.ps1`; le ZIP apparaît dans `dist`. Le dossier `.venv` et les fichiers temporaires de compilation sont exclus de Git. La photo du logo est destinée au site; vérifiez les droits des recettes et des images externes avant une publication publique.

Pour les détails d’utilisation et de modification, voir [GUIDE.md](GUIDE.md).