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

### Scénario à jouer sur un vrai écran tactile (Jérôme)

Sur l'écran interactif (WebView2 sous Windows), puis sur un iPad si possible. Avant chaque point : outil Stylo, couleur
rouge, épaisseur moyenne ; quelques traits au tableau.

1. **Doigt** : tracer au doigt. Attendu : un trait rouge, aucun anneau.
2. **Stylet** : tracer au stylet, même en appuyant fort ou de biais. Attendu : un trait, jamais de gomme.
3. **Paume** : poser la paume à plat sur des traits, la glisser, la lever. Attendu : un anneau violet fin apparaît,
   de la taille de la paume ; les traits sous le passage sont coupés ; au lever, l'anneau disparaît et le doigt
   dessine de nouveau en rouge, même épaisseur. Ctrl+Z une fois : tous les traits gommés reviennent.
4. **Poing** : même geste, poing fermé. Attendu : comme la paume, anneau plus petit.
5. **Trois doigts serrés** : poser trois doigts collés et glisser. Attendu : gomme ; les mêmes trois doigts écartés
   d'une main ouverte ne gomment pas.
6. **Deux doigts** : pincer pour zoomer, glisser à deux doigts. Attendu : zoom et défilement comme avant, jamais de
   gomme ; une paume posée pendant un pincement déjà commencé ne gomme pas.
7. **Réglage** : Ctrl+Maj+H (ou Réglages, « Gomme automatique à la paume : coupée »), puis refaire le point 3.
   Attendu : la paume ne gomme plus ; le réglage reste coupé après rechargement.

À relever pour H2 : la taille lue pour un doigt, un pouce à plat, une paume et un poing (anneau visible ou non).
