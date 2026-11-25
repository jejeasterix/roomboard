# design L3 — panneau des profils comparé à la maquette 03

Rendu : Chromium de Playwright, 1920 × 1080 à 2x, `--disable-lcd-text`, `--force-color-profile=srgb`, profil
« Annotation au démarrage », barre d'outils « À gauche » dans le brouillon. Police du système (H18) : la maquette est
rendue avec Inter. Après : `design-l3-apres-*.png` ; avant (`main` @ dbb2473) : `design-l3-avant-panneau.png` ;
maquette : `design-l3-maquette-*.png` (recadrages de `docs/design/maquettes/03-profils.png`). Essai :
`scripts/essais/design-l3-navigateur.mjs --captures`.

## Netteté § 10

Lignes de l'essai (journal `T9-captures.log`, sur le build de `feat/design-l3` @ 4c9ba3b) :

- calage : 105 icônes du panneau calées (viewBox, grille de pixels, 24 × 24).
- rangée du Rectangle (gris, 2x) : `255 255 255 255 255 39 39 39 255 …` : traits de 3 pixels, 0 pixel intermédiaire, 0 frange.
- `dock-top` non choisie (navy sur blanc, 48 × 48 px) : même rangée (`255 … 39 39 39 255 …`), 0 pixel intermédiaire, traits [3,3], 0 frange.
- `dock-top` choisie (#4F35C4 sur #EDE8FD) : rangée `236 … 77 77 77 236 …`, 0 pixel intermédiaire, traits [3,3], 0 frange.
- franges : 0 sur chacun des sept éléments mesurés (titre « Profils », libellé d'une ligne, segment choisi, titre de la
  carte choisie, check blanc sur pastille violette, œil « hidden » gris, « Enregistrer » blanc sur violet).
- contre-épreuve (même icône, viewBox `0 0 24 24` sans calage) : `255 255 255 255 146 39 39 146 …`, 4 pixels
  intermédiaires (≥ 2) : la mesure n'est pas aveugle.

## Écarts, zone par zone

| zone | écart | attendu | justification | constaté |
|---|---|---|---|---|
| panneau | sous la barre du haut et les onglets, pas sur toute la hauteur | § 6 ter, H8 | aucune barre n'est jamais couverte (L3-2) | conforme à l'attendu |
| panneau | marges de 44 px au lieu de 32 px autour d'une colonne de 512 px | décision de netteté | colonne entière centrée dans 600 px : bords sur la grille de pixels | texte et cartes un peu plus resserrés que la maquette (88 px de marge à 2x contre 64) |
| entête | sélecteur de profil natif | H17 | liste du système, accessible | conforme à l'attendu |
| entête | étiquette « Fourni » au lieu de « Fourni, modifié » | — | le brouillon n'est pas enregistré : l'étiquette dit l'enregistré (L3-6) | la maquette dit « Fourni, modifié » : voulu |
| entête | nom du sélecteur « Annotation » au lieu de « Annotation au démarrage » | — | libellé du profil enregistré ; le brouillon se renomme dans le champ dessous (L3-6) | sélecteur plus court, nom complet dans le champ |
| entête | champ « Nom du profil » sous le sélecteur | § 6 ter | renommer un profil (P20) | absent de la maquette : ajouté |
| entête | Importer / Exporter avec texte, 128 px | D-DS1 | la maquette les montrait en icône seule ; texte + icône : cible lisible, ≥ 48 px de haut | texte visible, icônes identiques |
| entête | × Fermer en icône seule avec infobulle | glyphe universel, maquette | pas de texte : glyphe connu, nom accessible par `aria-label` et infobulle | conforme à l'attendu |
| cartes | police du système au lieu d'Inter | H18 | Inter non embarquée (Q6) | glyphes Noto Sans plus larges : « RoomBoard s'ouvre sur le tableau. » passe sur 2 lignes (une seule dans la maquette) |
| cartes | note « Sans annotation possible… » collée au titre « Taille des boutons » | — | non justifié : à corriger (espacement à reprendre) | sur la capture du panneau, la note touche presque le titre ; la maquette laisse un blanc |
| vignettes | section « Taille des boutons » à part, au-dessus des barres | H14 | taille globale au profil | maquette : emplacements d'abord, tailles dessous ; ici l'ordre est inverse |
| vignettes | commande « Barre d'outils / des pages / d'annotation » au-dessus des vignettes | H5 | une barre à la fois | absent de la maquette : ajouté |
| vignettes | segments à largeur fractionnaire au-delà de 4 barres (5 barres : 100,8 px) | — | non prouvés nets, à revoir | non mesuré : 3 segments (Petits / Moyens / Grands) seuls mesurés nets |
| liste | outils de la barre de `defaut` (Stylo, Gomme, « Gomme : partielle », Main, Séparateur…) au lieu de la barre réduite de la maquette | § 6 ter | la maquette montre une barre d'avant L4 | liste plus longue (29 lignes) ; la maquette en montre 8 |
| liste | poignée cible de 48 px au lieu de 24 | D8, L3-24 | cibles ≥ 48 px | lignes de 98 px à 2x contre 96 : équivalent |
| liste | lignes « Séparateur » en ligne de 48 px, sans icône | D8, H12, L3-24 | un séparateur est un élément de la barre ; cible ≥ 48 px | libellé gris sans icône, coche à droite |
| liste | pas de ligne tirée au repos (la maquette montre `.item.drag`) | — | état du geste, vu en S2 | la maquette montre l'ombre d'une ligne soulevée ; ici repos |
| liste | icône `pen-line` sur « Dessin / Souris » (barre d'annotation) et au segment | H24 | même icône que le segment | en annotation ; la maquette montrait `pen` |
| liste | liste encadrée sans coins arrondis ni bordure haute dans le recadrage | — | recadrage à bord gauche du panneau, la liste défile sous le titre | différence due au recadrage, pas au rendu |
| pied | « Enregistrer » en plus ; « Enregistré sur cet appareil » seulement sans changement | H2, L3-32 | pas d'enregistrement automatique | la maquette montre l'état enregistré avec coche à gauche du texte ; ici l'état modifié (bouton) |
| pied | recadrage du pied montre aussi l'ombre du panneau et « 1 / 1 » de la barre des pages | — | recadrage à 100 % du pied, scène derrière le panneau | sans effet sur le panneau |
| hors maquette | « Enregistrer comme nouveau », sections « Préréglages » et « Rétablir les barres » | § 6 ter, U12, P28 | gestes gardés de C1 | hors de la zone recadrée (sous la liste) |
| hors maquette | « Monter » et « Descendre » sur la ligne dont on a touché la poignée | L3-15 | chemin sans glisser (WCAG 2.2 § 2.5.7) | vus en S2 |
| hors maquette | note de la barre d'annotation | H22, D5 | barre jamais rendue au tableau | vue en S4 |
| hors maquette | corbeille d'un préréglage en icône seule avec infobulle | glyphe universel | même règle que × Fermer | hors de la zone recadrée |

Écarts « non justifiés : à corriger » : espacement entre la note des cartes et le titre « Taille des boutons » ;
segments à largeur fractionnaire (5 barres et plus) à prouver nets.

## Avant / après

`design-l3-avant-panneau.png` (1448 × 8706) : panneau d'avant le chantier, formulaire natif (cases à cocher, boutons
« Monter / Descendre » sur chaque ligne, listes du système), en haut d'une page très haute. `design-l3-apres-panneau.png`
(1200 × 1964) : panneau de 600 px, en-tête, cartes, vignettes, pied fixe.
