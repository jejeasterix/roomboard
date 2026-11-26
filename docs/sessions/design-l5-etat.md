# État — design-l5

Statut : en cours
Gabarit : lot borné (OF85), sans chaîne `nouvelle-feature`
Objectif : poser l'icône « B · Tableau plein » (choix de Jérôme du 2026-11-26 : « B, tableau plein ») dans
`apps/desktop/src-tauri/icons/`, à la place du carré uni `#1E5AA0`.
Branche : `feat/design-l5-icone`, depuis `origin/main` à `8f040b9`.

## Fait

- `docs/design/icone/gen.mjs` : générateur de la maquette OF81, réduit à B, avec un SVG calé par taille posée.
  Les SVG de 16, 32, 48 et 256 px sont identiques à ceux de la maquette ; leurs rendus aussi, à l'octet.
- Gabarits ajoutés : 20 px dessiné à la main, 24 et 30 px tramés (sans flèche, tableau centré) ; 40 px dessin complet.
- `docs/design/icone/poser.mjs` : rendu Chromium à la taille exacte, 15 PNG, `icon.ico` (16, 20, 24, 32, 40, 48, 64, 256),
  `icon.icns` (10 entrées PNG).
- `tauri.conf.json` : `bundle.icon` liste aussi `128x128@2x.png` et `icon.icns`, `128x128.png` en tête.
- Mention de marque : `THIRD_PARTY_NOTICES.md`, § « Icône de l'application (design L5) ».
- Charte : ligne de l'icône mise à jour.
- Planches à l'échelle 1 : `docs/essais/design-l5-icone-avant-apres.png`, `docs/essais/design-l5-icone-grandes.png`.
- Netteté : rangées lues sur les entrées du `.ico`, identiques à la maquette (`docs/design/icone/LISEZMOI.md`).
- `controle-icones.mjs` : OK.

## Choix tranchés seul

- Un SVG calé par taille exacte (21 tailles), plutôt que les quatre SVG de la maquette réduits ou agrandis.
- 24 et 30 px : variante tramée sans flèche, comme 32 px ; tableau à hauteur paire pour rester centré.
- `tauri icon` écarté : il réduit un seul grand PNG.
- `.icns` : types de `tauri icon` (ic07 à ic14), avec `icp4` et `icp5` en PNG à la place de `is32` et `il32`.
- `icon.icns` et `128x128@2x.png` ajoutés à `bundle.icon`.
- 20 et 40 px ajoutés au `.ico` (Windows à 125 %), après la relecture adverse.
- `128x128.png` en tête de `bundle.icon` : icône de fenêtre Linux au dessin complet.
- `gen.mjs` garde les options inutilisées de la maquette (A, C) : la preuve d'identité avec OF81 en dépend.
- Favicon web : aucun fichier existant, rien posé.

## Reste

- `verifier.sh --e2e`, PR, relecture adverse, fusion locale.
