# design L2 — îlots du tableau comparés à la maquette 01

Rendu : Chromium de Playwright, 1920 × 1080 à 2x, `--disable-lcd-text`, `--force-color-profile=srgb`, profil
« Par défaut », stylo actif, un onglet « Sans titre », page vide. Police du système : la maquette est rendue avec Inter
(Q6, hors de L2). Après : `design-l2-apres-*.png` ; avant (`main` @ bbbc597) : `design-l2-avant-tableau.png` ;
maquette : `design-l2-maquette-*.png` (recadrages de `docs/design/maquettes/01-tableau.png`). Essai :
`scripts/essais/design-l2-navigateur.mjs --captures`. Avant : bande d'outils pleine largeur, scène sous elle
(`#stage` à y 150, 694 px sur 900), pied de page en texte ; après : sept îlots flottants, scène pleine fenêtre.

## Mesures

- `#stage` : S1 1280 × 900 : #stage mesure la fenêtre (x 0, y 0, 1280 × 900) ; S1 1920 × 1080 : #stage mesure la fenêtre (x 0, y 0, 1920 × 1080).
- Îlots (S1, première passe, avant le calage des icônes de T9) : `îlots 1920 × 1080 : menu 16,16 56×56 ; onglets 80,16 291.4375×56 ; outils 593,16 734×56 ; panneaux 1796,16 108×56 ; historique 16,1008 160×56 ; pages 735,1008 450.546875×56 ; prereglages 880,80 160×56`, positions entières, aucun chevauchement. Largeurs fractionnaires admises (pages : 450,546875 px) : seules les positions sont au pixel entier.

## Netteté § 10

- Rectangle de l'îlot d'outils (navy sur blanc, 48 × 48 px) : 255 255 255 255 255 39 39 39 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 39 39 39 255 255 255 255 ; 0 pixel intermédiaire, traits [3,3], 0 frange.
- Texte de l'onglet montré (violet 700 sur violet 100) : 0 frange.
- Contre-épreuve (viewBox `0 0 24 24` sans calage) : 255 255 255 255 146 39 39 146 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 146 39 39 146 255 255 255 255 ; 4 pixels intermédiaires (≥ 2).

## Écarts à la maquette 01, un par un

| zone | écart | raison |
|---|---|---|
| toutes | Police du système au lieu d'Inter | Q6, hors périmètre (cadrage § 7) |
| toutes | Ombres des îlots un peu plus discrètes que la maquette | fond de scène passé à `#F5F5F8` (charte, correctif de fin 1) ; ombre `--rf-shadow-hover` du jeton, inchangée |
| toutes | La page commence à 16 px du haut, sous les îlots du haut ; la maquette la pose en carte vers y 152 | cadrage de la page par le moteur (`fitPage`, `engine/camera.ts`) gardé : le changer déplace tous les gestes des essais ; reste noté pour un lot suivant |
| historique | Pas d'îlot du zoom (−, 100 %, +) ; « Ajuster la page » rejoint Annuler et Rétablir ; Annuler grisé (historique vide) | L2-23, H3 : zoom = comportement nouveau |
| pages | Pas de « Toutes les pages » ; liste des numéros gardée ; corbeille « Retirer la page » en plus ; pas de séparateur | L2-23, H3 ; L2-18 (comportement gardé) |
| pages | Place de trois numéros gardée à droite même avec une page (vide visible) ; compteur en bleu nuit | CL5b-8 (essai c13 S4 : liste d'au moins trois boutons) ; compteur `--rf-navy-500` (charte) |
| pages | Compteur « 1 / 1 » et page 1 au lieu de « 2 / 5 » | contenu de l'essai (une page), pas de la maquette |
| outils | « Gomme : partielle » reste un bouton de l'îlot ; deux gommes visibles ; pas de séparateur avant la Gomme | L2-23, H3 (comportement gardé) |
| outils | Base de la gomme partielle en trait plein au lieu des pointillés | netteté § 10 : les pointillés se réduisaient à deux points flous à 100 % (correctif de fin 1) |
| outils | « Annotation du bureau » absente au navigateur | capacité `desktopAnnotation` fausse sur le web (C11a P6) ; présente dans la coque |
| menu-ouvert | Pas de raccourcis affichés, pas de sous-menu « Enregistrer une copie » (deux lignes .iwb et .ubz, libellés sur une ligne (largeur au contenu, correctif de fin 1)), « Insérer des pages… » ajouté, pas de marque au pied, pas de points de suspension sur Ouvrir, Importer, Enregistrer sous | L2-4 (contenu du menu), L2-6 (lignes icône + libellé) |
| menu | Bouton Menu fermé : fond blanc ; la maquette le montre en violet (état ouvert) | maquette prise menu ouvert ; l'application garde le fond blanc fermé, violet non demandé par L2 |
| prereglages | Trois couleurs du profil, sans épaisseurs, sans pastille cerclée ni séparateur, couleurs au contour fin | préréglages du profil sans état (C1 P18) ; épaisseurs hors L2 |
| onglets | Un seul onglet « Sans titre.roomboard », sans pastille violette ; la maquette en montre deux (« Les fractions », « Sans titre ») | contenu de l'essai ; nom affiché avec son extension comme avant L2 (comportement gardé) ; pastille `.rb-tab-dirty` présente quand l'onglet est modifié |
| panneaux | Aucun écart de forme relevé (bibliothèque, profils) | — |
