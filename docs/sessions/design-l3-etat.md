# État — design-l3

Statut : en cours
Gabarit : chantier (provisoire, environ 8 tâches)
Objectif : Faire de l'éditeur de profils de RoomBoard un panneau latéral de 600 px à droite, sans voile, aux jetons et icônes du lot L1, pour régler la barre en la voyant changer en direct.
Avancement : —
Étage : 2 — depuis 2026-11-25 15:50
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l3   Branche : feat/design-l3   Base : origin/main @ dbb2473
Branche principale locale au lancement : dbb2473
Cadrage : docs/plans/design-l3-cadrage.md   Plan(s) : docs/plans/design-l3-PLAN.md

## Référence
Complète (origin/main @ dbb2473, verifier.sh --e2e) : OK — cargo 1356 (8 ignorés) · web 3370 · cli 263 · e2e OK (C1, C11a, C11b, design L1, design L4)
Wasm avant : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · S1 de l'usage joué au navigateur (barre à droite, grands boutons) · tri au pointeur testé · recadrages 100 % comparés à la maquette 03, écarts justifiés · contrôle de netteté § 10 · format .rbprofile inchangé · PR fusionnée par merge local --no-ff

## Cadrage
32 décisions (L3-1 à L3-32), 3 décisions d'architecture, 24 hypothèses dont 9 de niveau 1, 20 lignes « Modules à réutiliser » (neufs : sort-drag.ts, RadioChoices.tsx, pointer-gesture.ts extrait de resource-drag.ts).
Scénarios : S1 usage S1 (barre à droite, grands boutons, en direct) · S2 tri souris, doigt, clavier · S3 aperçu abandonné et confirmation · S4 barre d'annotation, Dessin / Souris, catalogue selon annotationBarOf · S5 netteté § 10 et maquette 03 · S6 petit écran et barre flottante.

## Pièges trouvés
- Prémisse démentie : l'éditeur n'a pas de data-item ; ses data-edit* changent de forme (ProfileEditor.test.tsx, App.test.tsx, profile-edit.test.ts, c1-profils-navigateur.mjs), rougeurs attendues listées en L3-26.
- Aperçu en direct (D-DS10) contredit C1 P20 : App.test.tsx:727-738 et c1-profils-navigateur.mjs:140-143 changent sur le fond, voulu.
- Chantiers en cours sur les mêmes fichiers : aucun.

## Hors périmètre
- L2 îlots flottants, L5 icône de l'app.

## Portes
ouvertes : — · passées : —
