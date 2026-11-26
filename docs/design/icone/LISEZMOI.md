# Icône RoomBoard · B, tableau plein (design L5)

Choix de Jérôme, 2026-11-26, réponse à Q1 : « B, tableau plein ». Maquette : OF81 ; pose : OF85.

Tuile bleu nuit `#182946` (rayon 22 %), hexagone et flèche `#6044EB` de l'icône RoomFlow (`roomflow-app-icon.svg`),
page blanche `#FFFFFF` que la flèche traverse. Licence : marque de l'auteur, hors de la licence du code
(`THIRD_PARTY_NOTICES.md`, § « Icône de l'application »).

## Fichiers

- `gen.mjs` : le générateur. `node gen.mjs svg` refait tous les SVG.
- `svg/roomboard-icon.svg` : source à 256 px, qui se met à l'échelle (usage hors coque).
- `svg/roomboard-icon-<S>.svg` : une source calée par taille posée (16, 24, 30, 32, 44, 48, 50, 64, 71, 89, 107, 128,
  142, 150, 256, 284, 310, 512, 1024 px).
- `poser.mjs` : rend chaque SVG à sa taille par Chromium sans tête de Playwright, écrit les PNG de
  `apps/desktop/src-tauri/icons/` et assemble `icon.ico` et `icon.icns` (conteneurs de PNG, sans dépendance).

```sh
cd docs/design/icone
node gen.mjs svg
PLAYWRIGHT=<chemin de playwright/index.mjs> node poser.mjs svg ../../../apps/desktop/src-tauri/icons [dossier des rendus]
```

Playwright n'est pas une dépendance du dépôt : `PLAYWRIGHT` désigne une installation existante (sur la VM, celle de
`npx playwright`). Sans la variable, `poser.mjs` importe `playwright`.

## Règles du dessin

- **Chaque taille a son rendu.** Un PNG ou une entrée du `.ico` ou du `.icns` vient du SVG calé pour sa taille exacte,
  rendu à cette taille, jamais réduit depuis un grand PNG.
- **16 px** : dessiné à la main en pixels pleins (bande de 1 px, flancs en marches 2:1), tableau 6 × 4, sans flèche.
- **24, 30 et 32 px** : hexagone tramé en pixels pleins (bande de 2 px, flancs en marches 2:1), sans flèche ; tableau
  8 × 4, 10 × 6 et 12 × 8, centré sur l'hexagone. Avec la flèche, elle hachait le tableau.
- **44 px et plus** : dessin complet. Les quatre bords verticaux de l'hexagone sont recalés au pixel entier ; le
  tableau a des bords entiers.
- Écart assumé : les flancs en marches 2:1 font 26,6° au lieu de 30° à 16, 24, 30 et 32 px.

## Fichiers posés

| Fichier | Taille |
|---|---|
| `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png` | 32, 64, 128, 256, 512 |
| `Square{30,44,71,89,107,142,150,284,310}x…Logo.png`, `StoreLogo.png` | leur taille, 50 pour `StoreLogo` |
| `icon.ico` | 16, 24, 32, 48, 64, 256 (PNG) |
| `icon.icns` | `icp4` 16, `icp5` 32, `ic11` 32, `ic12` 64, `ic07` 128, `ic13` 256, `ic08` 256, `ic09` 512, `ic14` 512, `ic10` 1024 (PNG) |

`bundle.icon` (`tauri.conf.json`) liste aussi `128x128@2x.png` et `icon.icns` : sans `.icns` dans la liste, le bundle
macOS refait son icône depuis les PNG listés, sans les variantes calées de 16 et 32 px.

## Contrôle de netteté

Rangée de pixels lue sur les entrées extraites du `.ico` :
`ffmpeg -i e<S>.png -vf "format=rgb24,crop=L:1:x:y,format=gray" -f rawvideo -pix_fmt gray -`.
Gris : bleu nuit `39`, violet `95`, blanc `255`. Valeurs identiques à la maquette OF81.

| Taille, rangée | Valeurs |
|---|---|
| 16, y 8, x 0-15 | `39 39 39 95 39 255 255 255 255 255 255 39 95 39 39 39` |
| 24, y 12, x 0-23 | `39×5 95 95 39 255×8 39 95 95 39×5` |
| 32, y 16, x 0-31 | `39×6 95 95 39 39 255×12 39 39 95 95 39×6` |
| 48, y 27, x 24-47 | `255×7 39 39 39 95 95 95 39×11` |
| 256, y 145, x 128-255 | `255×39 39×16 95×16 39×57` |
| 256, y 100, x 40-70 | `39×12 95×17 39 39` |

0 valeur intermédiaire sur chaque bord droit. Seuls la flèche, les flancs obliques au-dessus de 32 px et les coins de
la tuile ont des valeurs intermédiaires : c'est l'anticrénelage normal, pas un flou.
