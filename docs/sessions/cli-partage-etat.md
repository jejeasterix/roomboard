# État — cli-partage

Statut : en cours
Gabarit : courte
Objectif : La CLI n'a plus de copie de l'ouverture et de l'export d'un tableau : un seul module de la page les fait pour la page et pour la CLI, sans changement visible.
Étage : 2 — depuis 2026-11-24 08:47
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-partage   Branche : refactor/cli-partage   Base : origin/main @ 7092fdd
Branche principale locale au lancement : 7092fdd
Cadrage : docs/plans/cli-partage-cadrage.md   Plan(s) : docs/plans/cli-partage-PLAN.md

## Référence
Complète (7092fdd, verifier.sh --e2e, load 21-25) : cargo vert · CLI 250/255, 5 `Test timed out in 5000ms` (import S3 image+xlsx, model3d-node S4 ×2, model3d D76, pdf-node loadNodePdfjs) · web arrêtée par SIGTERM après l'échec CLI (pnpm -r)
Tailles Wasm avant : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — à remesurer

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant, 3 majeurs corrigés) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
(étage 2)

## Terminé quand
CLI sans copie de l'ouverture et de l'export · workspace.ts et la CLI appellent le module partagé · sorties JSON et codes inchangés · tests web et CLI existants verts sans réécriture de fond, tests du module ajoutés · verifier.sh pose VITEST_MAX_WORKERS=3 si absent · tailles Wasm sous plafond, non changées · verifier.sh --e2e OK · PR avec ## Preuve · double relecture sans bloquant · fusion locale --no-ff poussée sans --force

## Choix tranchés seul
- Ouvrier sans Jérôme : cadrage autonome, aucune question (brief OF12).
- Branche `refactor/cli-partage` (brief) au lieu de `feat/<sujet>` du profil.

## Cadrage
6 hypothèses dont 1 de niveau 1 (H1 : aligner les 3 écarts visibles page/CLI — à Jérôme) ; H6 : copie avant export côté CLI non faite (created). Scénarios : S1 sorties identiques à la base · S2 cli-essai étendu E1-E5 · S3 tests page verts sans toucher workspace.test.ts · S4 grep sans recopie · S5 verifier --e2e, tailles, VITEST_MAX_WORKERS.

## Pièges trouvés
- Prémisse démentie : lecture/écriture déjà partagées (board-convert, pdf-convert) ; restent 6 recopies R1-R6 de la couche autour.
- saveParts fixe `created` : la copie avant export ne s'applique pas à la CLI.

## Hors périmètre
- apps/web/src/platform/ (OF13)

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser
(étage 4)
