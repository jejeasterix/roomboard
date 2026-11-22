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
