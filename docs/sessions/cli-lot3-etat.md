# État — cli-lot3

Statut : en cours
Gabarit : chantier (provisoire, estimé 7 à 10 tâches)
Objectif : La CLI de RoomBoard lit un PDF en onglet avec ses pages en fond, écrit un PDF annoté depuis un `.roomboard`, et convertit vers et depuis le PDF.
Avancement : —
Étage : 0 — depuis 2026-11-24 02:36
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot3   Branche : feat/cli-lot3   Base : origin/main @ 48118ae
Branche principale locale au lancement : 48118ae
Cadrage : docs/plans/cli-lot3-cadrage.md   Plan(s) : docs/plans/cli-lot3-PLAN.md
Mode : autonome (ouvrier CLI OF8, aucune question à Jérôme : choix tranchés seul et consignés)
Arrêt ferme : 2026-11-24 07:05 (lancement 02:35 + 4 h 30) ; point d'arrêt à 06:55

## Référence
Rapide : —
Complète (origin/main @ 48118ae, `verifier.sh --e2e`) : en cours

## Tailles Wasm avant
à mesurer (attendu : principal 1 374 215 o, plafond 1 572 864 ; formats 2 794 511 o, plafond 3 145 728)

## Compteurs
contre-relecture cadrage 0/2 · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(à l'étage 2)

## Terminé quand
toutes les tâches terminées · PDF « couvert » dans `FORMAT_LOTS` avec ses tests et des contrôles dans `scripts/essais/cli-essai.mjs` (page comptée, texte retrouvé, fond présent) · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF8).
- Reste d'OF5 fait à l'étage 0 : `__PR__` → `45`, `__MAIN__` → `48118ae` dans `docs/sessions/cli-lot2-etat.md`.

## Hors périmètre
- Lot 4 (Office, médias, 3D, autres images).

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
(à l'étage 4)
