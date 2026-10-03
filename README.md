# À table

Carnet de recettes local en français. Ouvrez `index.html` ou lancez `AtTable.exe` dans le navigateur par défaut. L’EXE doit rester dans le même dossier que `index.html`; les dossiers `Application`, `Donnees` et `Images` doivent aussi rester à leur place.

## Créer le lanceur Windows

Dans Windows PowerShell, depuis ce dossier, exécutez :

```powershell
.\build-windows.ps1
```

Le script génère `AtTable.exe` à côté de `index.html`. Il utilise le compilateur .NET Framework de Windows et ne nécessite pas le SDK .NET. L’EXE ouvre la page locale dans le navigateur par défaut; il ne contient pas les recettes ni les images.

## Données et sauvegarde

Le garde-manger, les favoris et les listes sont conservés dans le stockage local du navigateur, pas dans les fichiers du projet. Une sauvegarde GitHub du dépôt ne sauvegarde donc pas ces données personnelles du navigateur.

Pour préparer un paquet à partager, exécutez `pack-windows.ps1`; le ZIP apparaît dans `dist`. Le dossier `.venv` et les fichiers temporaires de compilation sont exclus de Git. La photo du logo est destinée au site; vérifiez les droits des recettes et des images externes avant une publication publique.

Pour les détails d’utilisation et de modification, voir [GUIDE.md](GUIDE.md).