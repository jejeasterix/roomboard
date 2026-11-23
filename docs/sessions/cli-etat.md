# État — cli

Statut : en cours
Gabarit : chantier (provisoire)
Objectif : RoomBoard a une CLI qui permet à un agent de piloter et de prouver chaque fonction du produit sans interface graphique.
Avancement : —
Étage : 1 — depuis 2026-11-23 22:25
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli   Branche : feat/cli   Base : origin/main @ becdda6
Branche principale locale au lancement : becdda6
Cadrage : docs/plans/cli-cadrage.md   Plan(s) : docs/plans/cli-PLAN.md

## Référence
Rapide : —
Complète (origin/main @ becdda6, `verifier.sh --e2e`) : tout vert sauf l'essai C8 pot zones (« data-zone-ms inchangé ») à la première passe ; rejoué une fois seul : OK, ainsi que C4, C13, C11a, C11b → C8 est instable sur délai, pas une régression. Web 3081 tests verts.

## Tailles Wasm avant
module principal 1 374 398 o (plafond 1 572 864) · module formats 2 794 511 o (plafond 3 145 728) — confirmés par la référence (dist de origin/main)

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
—

## Terminé quand
toutes les tâches terminées · `verifier.sh --e2e` OK avec l'essai CLI · tailles Wasm inchangées sous les plafonds · § 7 du profil rempli · PR mergée par fusion locale `--no-ff`

## Hors périmètre
- `roomboard-prive`

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
—
