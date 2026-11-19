# État — usage

Statut : en cours (étage 1 seulement : cadrage, aucun code — OD21)
Gabarit : lots (cadrage seul ; le découpage en chantiers est le livrable)
Objectif : RoomBoard a un cadrage de l'usage (annotation de bureau, toolbar et profils configurables, glisser-déposer d'un maximum de formats avec édition quand c'est possible, pot de peinture avancé, édition d'image, ressources à extension propre, éditeur de grille et créateur de tableau), découpé en chantiers ordonnés.
Étage : 1 — depuis 2026-11-19 22:55
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage   Branche : docs/usage-cadrage   Base : origin/main @ 5341564
Cadrage : docs/plans/usage-cadrage.md   Études : docs/etudes/usage-*.md
Arrêt ferme : 2026-11-20 02:49 (mise à l'abri à 02:39)

## Référence
Sans objet : documents seulement, aucun build ni test.

## Compteurs
contre-relecture cadrage 1/2 (tour 1 : 0 bloquant, 12 importants, 9 mineurs → cadreur corrige)

## Études
8 études écrites et commitées (d27e3b7) : pot-de-peinture, edition-image, formats-tableaux, formats-documents-medias, annotation-bureau, profils-toolbar, ressources, grille-tableau.

## Cadrage
docs/plans/usage-cadrage.md (2920c05) — U1-U39, DAU1-DAU10, 24 hypothèses (9 de niveau 1), 16 chantiers C1-C16, scénarios S1-S16.

## Terminé quand
7 études écrites et sourcées · cadrage écrit · contre-relecture sans bloquant · PR ouverte · fusion locale --no-ff dans main poussée

## Hors périmètre
- Code de produit ; branches feat/socle-lot4 et feat/socle-lot5a ; socle-*.md ; ~/projets/actcraft ; roomboard-prive.

## Pièges trouvés
- Plans des lots 4 et 5a lus en local (worktrees socle et socle-lot5a, lecture seule). Au lancement, feat/socle-lot4 et feat/socle-lot5a ne sont pas poussées (git fetch : seules lot3 et lot3b) : leurs plans ne sont pas lisibles.
- Prémisses démenties (cadreur) : `desktop_annotation` existe déjà (vaut true sous Wayland natif, à corriger, U10) ; `SetText` du lot 4 efface les attributs de plage (U27) ; `toElementView` lève sur un type inconnu (U3) ; budget Wasm 1,5 Mo → second module pour les formats (DAU1) ; CSP du lot 5a sans media-src ni worker-src.
- Chantiers en cours sur les mêmes fichiers : feat/socle-lot4 (cœur, moteur), feat/socle-lot5a (platform/, coque, verifier.sh).
