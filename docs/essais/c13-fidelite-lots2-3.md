# C13 lots 2-3 : fidélité de lecture des .notebook et .olf

## Méthode

`node scripts/essais/c13-fidelite.mjs <fichier>…`, lancé depuis la racine du dépôt, sur l'application web construite
(Wasm des deux modules compris, donc dialecte SMART) : chaque fichier est déposé dans un onglet neuf, repli
`?fichiers=repli`, CSP de la coque, Chromium. « Pages » et « objets » sont lus sur `#stage` (`data-page`,
`data-elements` page par page) ; « avertissements » vient de l'avis d'ouverture. Les 12 exemples restent hors dépôt
(`~/telechargements-roomboard/`), jamais copiés ; le tableau ne porte que des noms, des nombres et des avertissements.

## Fidélité de lecture

| fichier | pages | objets | avertissements | résultat |
|---|---|---|---|---|
| History_Ancient_Egypt_mystery_objects.notebook | 8 | 98 | 2 : - page 2 : 1 animation Flash non lue - page 5 : 1 animation Flash non lue | lu |
| History_Romans_Mosaics.notebook | 7 | 40 | 2 : - page 3 : 1 animation Flash non lue - page 4 : 1 image absente de l'archive | lu |
| Maths_Introducing_Probability.notebook | 12 | 387 | 9 : - page 1 : 1 animation Flash non lue - page 2 : 1 animation Flash non lue - page 3 : 1 animation Flash non lue - page 5 : 94 remplissages de polygones non lus - page 6 : 1 animation Flash non lue - page 10 : 5 animations Flash non lues - page 11 : 2 animations Flash non lues - page 11 : 2 remplissages de polygones non lus - page 12 : 5 animations Flash non lues | lu |
| Maths_Shape_behind_the_box.notebook | 1 | 19 | 0 | lu |
| Science_bottle_of_truth.notebook | 1 | 11 | 1 : - page 1 : 4 remplissages de polygones non lus | lu |
| Year_1_Literacy_fairytales.notebook | 2 | 2 | 0 | lu |
| analisis.olf | 12 | 2924 | 0 | lu |
| originals-1b5603b2.olf | 7 | 11 | 7 : - page 1 : 1 widget non lu - page 2 : 1 widget non lu - page 3 : 1 widget non lu - page 4 : 1 widget non lu - page 5 : 1 widget non lu - page 6 : 1 widget non lu - page 7 : 1 widget non lu | lu |
| originals-1e89217f.olf | 4 | 4 | 1 : - page 4 : 1 page masquée importée | lu |
| originals-84475177.olf | 3 | 6 | 3 : - page 1 : 1 widget non lu - page 2 : 1 widget non lu - page 3 : 1 widget non lu | lu |
| originals-8db4f298.olf | 4 | 10 | 2 : - page 2 : 1 objet illisible ignoré - page 3 : 1 objet illisible ignoré | lu |
| originals-bd2b6c36.olf | 6 | 12 | 6 : - page 1 : 1 widget non lu - page 2 : 1 widget non lu - page 3 : 1 widget non lu - page 4 : 1 widget non lu - page 5 : 1 widget non lu - page 6 : 1 widget non lu | lu |

Synthèse : `.notebook` 6 lus, 0 refusés, 31 pages, 557 objets, 14 avertissements ; `.olf` 6 lus, 0 refusés, 36 pages,
2967 objets, 19 avertissements.

## Niveau atteint

- `.notebook` : niveau B. Les six fichiers s'ouvrent, avec leurs pages et leurs objets ; ce qui manque est signalé.
- `.olf` : niveau B (A pour `analisis.olf`, 12 pages, 2924 objets, aucun avertissement). N1 : aucun refus, aucune erreur de page.

Sortes d'avertissements les plus fréquentes : « animation Flash non lue » (`.notebook`, 10 pages) ; « remplissages de
polygones non lus » (`.notebook`, 3 pages dont 94 sur une) ; « widget non lu » (`.olf`, 16 pages de 3 fichiers) ;
« objet illisible ignoré » (2) ; « image absente de l'archive » (1) ; « page masquée importée » (1).

## Fidélité de lecture des `.flipchart` (lot 3)

Mesure sur la tête fusionnée de `feat/usage-c13-lot3--T17` avec T23 (images lues par leur nom) et T24. Les 5 exemples
restent hors dépôt, jamais copiés. Avertissements regroupés par sorte sur toutes les pages (singulier et pluriel de la
même sorte peuvent figurer sur deux lignes).

| fichier | pages | objets | avertissements | résultat |
|---|---|---|---|---|
| Demonstration_Flipchart_Sentence_Diagrams.flipchart | 4 | 96 | 22 : 29 × propriétés illisibles ignorées ; 5 × action non lu ; 4 × image TIFF non lu ; 4 × rideau non lu ; 4 × projecteur non lu ; 3 × grille non lu | lu |
| History_Industrial_revolution_with_film.flipchart | 13 | 226 | 59 : 13 × rideau non lu ; 13 × projecteur non lu ; 13 × repère XY non lu ; 10 × images TIFF non lu ; 7 × action non lu ; 5 × image TIFF non lu ; 3 × propriété illisible ignorée | lu |
| NAPLAN_Yr_5_Numeracy.flipchart | 42 | 204 | 202 : 42 × grille non lu ; 42 × rideau non lu ; 42 × projecteur non lu ; 42 × repère XY non lu ; 21 × image TIFF non lu ; 14 × images TIFF non lu ; 5 × propriétés illisibles ignorées ; 4 × objet illisible ignoré ; 4 × propriété illisible ignorée ; 2 × action non lu | lu |
| Our_Solar_System.flipchart | 9 | 111 | 51 : 50 × action non lu ; 9 × grille non lu ; 9 × rideau non lu ; 9 × projecteur non lu ; 9 × repère XY non lu ; 3 × son ou vidéo non lu ; 3 × objet illisible ignoré ; 2 × propriété illisible ignorée | lu |
| STUDIO_BEGINNER_FLIPCHART.flipchart | 50 | 612 | 189 : 74 × propriétés illisibles ignorées ; 60 × action non lu ; 48 × rideau non lu ; 48 × projecteur non lu ; 22 × grille non lu ; 8 × propriété illisible ignorée ; 2 × son ou vidéo non lu ; 2 × page illisible laissée vide | lu |

Synthèse : `.flipchart` 5 lus, 0 refusés, 118 pages, 1249 objets, 523 avertissements ; aucune erreur de page.

Avant T23 (mesure sur 2fe0cba) : 1023 objets, 544 avertissements, car les objets image comptaient parmi les « objets
illisibles ignorés » (de 5 à 136 par fichier). Maintenant les TIFF sont dits « image TIFF non lue » et les images affichées
comptent (+226 objets).

Niveau atteint : B. Reste signalé : actions, rideaux, projecteurs, grilles, repères XY, sons et vidéos, TIFF, et des
propriétés illisibles (74 sur `STUDIO_BEGINNER_FLIPCHART`, 29 sur `Demonstration_Flipchart_Sentence_Diagrams`).

## Remesure des `.flipchart` après les mineurs du lot 3 (OE38, 2026-11-22)

Même méthode, branche `fix/mineurs-relecture-c13-c5-c7b` (images d'extension inconnue jugées sur leur signature,
avis regroupés par sorte, libellé d'un avis reçu). Mêmes pages, mêmes objets, mêmes 523 avertissements ; chaque sorte tient sur une ligne.
Le Worker garde maintenant `2747.EK1056`, `3175.cz2880` (Our_Solar_System) et cinq noms de ce genre (STUDIO_BEGINNER),
tous des BMP ; aucun objet image ne les cite, d'où aucun objet de plus.

| fichier | pages | objets | avertissements | résultat |
|---|---|---|---|---|
| Demonstration_Flipchart_Sentence_Diagrams.flipchart | 4 | 96 | 22 : 29 × propriétés illisibles ignorées ; 5 × action non lue ; 4 × image TIFF non lue ; 4 × rideau non lu ; 4 × projecteur non lu ; 3 × grille non lue | lu |
| History_Industrial_revolution_with_film.flipchart | 13 | 226 | 59 : 15 × image TIFF non lue ; 13 × rideau non lu ; 13 × projecteur non lu ; 13 × repère XY non lu ; 7 × action non lue ; 3 × propriété illisible ignorée | lu |
| NAPLAN_Yr_5_Numeracy.flipchart | 42 | 204 | 202 : 42 × grille non lue ; 42 × rideau non lu ; 42 × projecteur non lu ; 42 × repère XY non lu ; 35 × image TIFF non lue ; 9 × propriété illisible ignorée ; 4 × objets illisibles ignorés ; 2 × action non lue | lu |
| Our_Solar_System.flipchart | 9 | 111 | 51 : 50 × actions non lues ; 9 × grille non lue ; 9 × rideau non lu ; 9 × projecteur non lu ; 9 × repère XY non lu ; 3 × son ou vidéo non lu ; 3 × objet illisible ignoré ; 2 × propriété illisible ignorée | lu |
| STUDIO_BEGINNER_FLIPCHART.flipchart | 50 | 612 | 189 : 82 × propriété illisible ignorée ; 60 × action non lue ; 48 × rideau non lu ; 48 × projecteur non lu ; 22 × grille non lue ; 2 × sons ou vidéos non lus ; 2 × page illisible laissée vide | lu |

Synthèse : `.flipchart` 5 lus, 0 refusés, 118 pages, 1249 objets, 523 avertissements.
