# État — cli-lot4

Statut : en cours
Gabarit : chantier
Objectif : La CLI de RoomBoard importe enfin les fichiers Office, les vidéos et sons, les modèles 3D et les autres images (GIF, WebP, BMP, ICO, SVG, AVIF, HEIC), et plus aucun format du cadrage ne répond « lot pas encore livré ».
Avancement : 12/12 tâches terminées
Étage : 4 — depuis 2026-11-24 06:50
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot4   Branche : feat/cli-lot4   Base : origin/main @ 352cbda
Branche principale locale au lancement : 352cbda
Cadrage : docs/plans/cli-lot4-cadrage.md   Plan(s) : docs/plans/cli-lot4-PLAN.md
Mode : ouvrier CLI OF9, autonome (brief : « Aucune question ne parvient à Jérôme pendant ton tour : tranche seul et écris tes choix. »)
Arrêt ferme : 2026-11-24 09:09 (lancement ~04:39 + 4 h 30) ; poussée de sauvegarde à 08:59

## Référence
Rapide : cli 185 tests · web 3150 tests (référence complète)
Complète (origin/main, `scripts/verifier.sh --e2e`) : 1er passage rouge sur 7 délais de la CLI (VM chargée), rejeu vert : `verifier.sh : e2e OK`, `verifier.sh : OK`
Tailles Wasm avant : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — confirmé par la référence

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------|--------|---------------------|----------------|
| T1 binaire roomboard-office | — | terminée | 1/3 | 61e8740 | office_bin 6 tests ok |
| T2 tailles d'images | — | terminée | 1/3 | 610b50b | image-size + image-import 47 tests |
| T3 en-têtes médias | — | terminée | 1/3 | 2fcc151 | media-header + media-import 29 tests |
| T4 CLI 3D | — | terminée | 1/3 | 8e3da70 | model3d-node, quiet, bin, pdf-node 34 tests (4 D76) |
| T5 CLI médias et images | T2, T3 | terminée | 2/3 (essai 1 mort avec le tour) | a0a0b4f | media-node 9 tests, media-header + image-size 32 tests |
| T6 CLI Office | T1 | terminée | 1/3 | d101b02 | 5 fichiers 71 tests, D79 réel vert |
| T7 branchement, FORMAT_LOTS | T4, T5, T6 | terminée | 1/3 | cff963f | suite CLI 29 fichiers, 248 tests |
| T8 essai, profil | T7 | terminée | 1/3 | 7bd7f1b | cli-essai 122 contrôles, CLI : OK |
| T9 correctifs relecture : Office | T8 | terminée | 1/3 | 6afe504 | suite CLI 252, office_bin 7 |
| T10 correctifs relecture : lecteurs, formats | T8 | terminée | 1/3 | 135b210 | web 3188, lecteurs 80 |
| T11 correctifs relecture : essai, 3D | T8 | terminée | 1/3 | 64a1efd | cli-essai OK, 3D 21 |
| T12 correctifs tour 2 | T9–T11 | terminée | 1/3 | 42e2c04 | CLI 255, image-size 17, office_bin 7 |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · aucun format du cadrage en code 3 « lot pas encore livré » (un format laissé de côté porte sa raison) · tailles Wasm inchangées sous plafond · PR fusionnée par fusion locale `--no-ff` et poussée

## Hypothèses à revoir
Niveau 1 : H37 (.xlsx/.xlsm en tableau, .xls/.ods en pages) · H38 (code 3 = variante non lue, plus « lot non livré ») · H39 (SVG sans dimensions 300 × 150) · H40 (vidéo sans poster, 3D sans instantané : cadre gris dans l'app) · H41 (binaire dans target/ ou ROOMBOARD_OFFICE).
Niveau 2 : H42 à H51 (cadrage § 4).

## Hors périmètre
- Remplacement des polices Liberation (attend Jérôme).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisse démentie : le binaire Office existait en exemple (`convertir_office.rs`), promu ; `c16-office-navigateur.mjs:97` l'appelait.
- three.js dans Node nu : il manque `self`, `ProgressEvent`, `document` (D76, globaux posés pendant `view.load()`).
- Sous-agents Sonnet : ligne `Co-Authored-By` réécrite en « Opus 5.5 » (brief) par `rebase --exec` local avant chaque fusion.
- `grep -c roomboard-cli-t-` se compte lui-même : motif `roomboard-cli-t[-]`.
- Délais de la CLI sous charge (load ~14) : rejeu vert ; premier test 3D (chargement de three à froid) déplacé en `beforeAll` (T12), aucun délai relevé.
- `relaunch_runs_program_with_args_and_env` (coque, non touché par le lot) : `Text file busy` (ETXTBSY) une fois sous charge ; rejoué.
- Un tour d'orchestrateur fini pendant une tâche tue la tâche de fond : sous-agents au premier plan, jamais de fin de tour pendant un calcul.

## Relectures
- Fin de lot (4 relecteurs : conformité ; qualité A Office, B lecteurs, C 3D et essai) : 0 bloquant ; 4 major (latin1 de /proc, regex SVG quadratiques, rotation vidéo, kill(0) de l'essai) + course du Ctrl-C de groupe → T9, T10, T11.
- Tour 2 (correctifs) : majors corrigés ; 1 major (délai du premier test 3D) + 2 minor (test SVG sous ROOT_MAX, import Windows) → T12.

## Notes du coffre à poser
(dans la PR)
