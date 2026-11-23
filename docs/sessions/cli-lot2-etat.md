# État — cli-lot2

Statut : en cours
Gabarit : chantier (provisoire ; à confirmer à l'étage 2)
Objectif : La CLI de RoomBoard insère un fragment `.rbitem`, lit et écrit les tableaux blancs et les paquets `.rbpack`, et convertit un fichier d'un format à l'autre.
Avancement : —
Étage : 1 — depuis 2026-11-24 00:21
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot2   Branche : feat/cli-lot2   Base : origin/main @ 3b3c88a
Branche principale locale au lancement : 3b3c88a
Cadrage : docs/plans/cli-lot2-cadrage.md   Plan(s) : docs/plans/cli-lot2-PLAN.md
Mode : autonome (ouvrier CLI OF5, aucune question à Jérôme : choix tranchés seul et consignés)

## Référence
Rapide : — (le build de référence est la suite complète ci-dessous)
Complète (origin/main @ 3b3c88a, `verifier.sh --e2e`, 14 min 22 s) : CODE=0, `verifier.sh : e2e OK` ; cli 84 tests, web 3097 tests, cargo tout vert

## Tailles Wasm avant
module principal 1 374 215 o (plafond 1 572 864) · module formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 2 majeurs, 9 mineurs renvoyés au cadreur) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
toutes les tâches terminées · chaque format du lot 2 « couvert » dans `FORMAT_LOTS` avec ses tests et un contrôle dans `scripts/essais/cli-essai.mjs` · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF5).

## Hors périmètre
- `roomboard-prive`
- Lots 3 (PDF) et 4 (Office, médias, 3D, autres images)

## Portes
ouvertes : — · passées : —
