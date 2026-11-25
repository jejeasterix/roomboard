# État — design-l4

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Donner à RoomBoard une barre d'annotation propre à chaque profil, une bascule Dessin / Souris qui montre l'état présent, un bouton « nouvel onglet », l'avis « envoyé au tableau » et un cadre violet désactivable, aux jetons et icônes du lot L1.
Avancement : —
Étage : 1 — depuis 2026-11-25 08:05
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l4   Branche : feat/design-l4   Base : origin/main @ 136cbbb
Branche principale locale au lancement : 136cbbb
Cadrage : docs/plans/design-l4-cadrage.md   Plan(s) : docs/plans/design-l4-PLAN.md

## Référence
Complète (origin/main @ 136cbbb, verifier.sh --e2e) : en cours (fond, journal ~/.cache/tmp/of48-ref/verifier-ref.log)
Wasm avant : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — chiffres du brief, à remesurer

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · tests : barre d'annotation en annotation, première barre sinon · ligne C11b-1 « cadre absent de l'image envoyée » · recadrages 100 % comparés à la maquette 02, écarts justifiés · contrôle de netteté § 10 · liste des gestes c11a à rejouer en coque · PR fusionnée par merge local --no-ff

## Hypothèses à revoir
(étage 1)

## Hors périmètre
- L2 îlots flottants, L3 éditeur de profils en panneau, L5 icône de l'app.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- CARGO_TARGET_DIR partagé entre worktrees : chaque commande cargo du chantier pose CARGO_TARGET_DIR=<worktree>/target.

## Notes du coffre à poser
(étage 4)
