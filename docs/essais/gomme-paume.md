# Essai OG25 — gomme automatique à la surface de contact

Essai : `node scripts/essais/gomme-paume-navigateur.mjs` (joué par `scripts/verifier.sh --e2e`), Chromium de Playwright
sur la VM, `deviceScaleFactor` 2, `PointerEvent` synthétiques sur `#stage` ; scénarios S1 à S8 du cadrage
(`docs/plans/gomme-surface-contact-cadrage.md`, § 6). Captures : `docs/design/captures/gomme-surface-contact/`.

## Témoin CDP (consigné, pas une porte)

Relevé le 2026-11-27 sur 6c9d4cea : `Input.dispatchTouchEvent` avec `radiusX` 40 et `radiusY` 40 donne un `pointerdown` de
`width` 80 et `height` 80.

Lecture : W = 80, Chromium rend le diamètre du contact (le double du rayon).

## Cible tactile du panneau Réglages

Les boutons du panneau Réglages mesuraient 21 px de haut. OG25 leur donne `min-block-size: 44px` (`rb.css`), la cible
tactile du cadrage design ; l'essai exige 44 px au moins pour le bouton `data-reglage="gomme-paume"`.

## Hors VM

Calibrage du seuil de 80 px (H2) et rejet de paume du pilote Windows (H15) : sur l'écran interactif, avec Jérôme.
