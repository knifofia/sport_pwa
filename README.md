# Sport

PWA minimaliste pour explorer les muscles, composer des programmes de musculation et suivre ses séances. HTML, CSS et JS purs, sans étape de build côté navigateur.

- Dépôt : https://github.com/knifofia/sport_pwa
- Application : https://knifofia.github.io/sport_pwa/

## Installer sur téléphone

Ouvre l'adresse de l'application dans Chrome (Android) ou Safari (iOS), puis « Ajouter à l'écran d'accueil ». Elle fonctionne ensuite hors ligne.

## Fonctions

- **Muscles** : schéma du corps, liste des muscles avec scores (visuel, escalade, santé, risque, force), exercices et programmes. Sélectionner un élément allume les muscles sollicités.
- **Séances** : séance guidée plein écran avec jauges, chronos, repos (20 s par défaut), réglage du poids et des répétitions de chaque série, puis bilan modifiable.
- **Historique** : séances enregistrées, chacune avec un bouton « Télécharger » (fichier JSON stocké localement).
- **Progression** : évolution de la charge ou de la durée par exercice. Le rythme réel par répétition affine l'estimation de la durée des séances.

## Configurer

Les données sont dans `data/*.yaml` (muscles, scores, exercices avec matériel et valeurs par défaut, programmes). Après modification, régénère les JSON :

```sh
uv run --script scripts/build_data.py
```

Le script valide les noms, les intensités, le matériel et les programmes. `config.json` règle le nom de l'app, la couleur, le repos par défaut (`restSeconds`) et l'unité de poids.

## Publier sur GitHub Pages

1. Pousse le dossier sur la branche `main` du dépôt.
2. Dans Settings > Pages, choisis « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. À chaque changement de fichier, incrémente `CACHE` dans `sw.js` (`sport-vNN`) pour que le téléphone récupère la nouvelle version.

Les données (historique, séance en cours) sont stockées dans le `localStorage` du navigateur, sur l'appareil.
