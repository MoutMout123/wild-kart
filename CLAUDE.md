# Wild Kart

Jeu de karting 3D multijoueur (three.js, peerjs), en français.

## Sources (www/)
- `www/game.js` : toute la logique du jeu (un seul IIFE)
- `www/boot.js` : démarrage
- `www/index.html` : page + styles

## Interdit (ne jamais lire ni modifier)
- `android/`, `ios/`, `signing/`
- `*.min.js`, `sw.js`, `version.json`
- `worker/url-*.txt`, `worker/etat-*.txt`, `worker/conso.txt`
- `scripts/patch-native.cjs` : seulement si demandé

## Commits / fusions
- Ne jamais écrire `[prod]` dans un commit.
- Chaque fusion sur `main` fabrique un APK : proposer `[skip ci]`
  dans le titre de fusion pour les tests.

## Style de travail
- Modifs minimales, réponses courtes.
