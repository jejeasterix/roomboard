# État — cli-lot4

Statut : en cours
Gabarit : chantier
Objectif : La CLI de RoomBoard importe enfin les fichiers Office, les vidéos et sons, les modèles 3D et les autres images (GIF, WebP, BMP, ICO, SVG, AVIF, HEIC), et plus aucun format du cadrage ne répond « lot pas encore livré ».
Avancement : 5/8 tâches terminées
Étage : 3 (vague 2) — depuis 2026-11-24 05:50
Lot : —
Tâche : T5 — CLI médias et images — depuis 2026-11-24 06:05
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
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------|--------|---------------------|----------------|
| T1 binaire roomboard-office | — | terminée | 1/3 | 61e8740 | office_bin 6 tests ok |
| T2 tailles d'images | — | terminée | 1/3 | 610b50b | image-size + image-import 47 tests |
| T3 en-têtes médias | — | terminée | 1/3 | 2fcc151 | media-header + media-import 29 tests |
| T4 CLI 3D | — | terminée | 1/3 | 8e3da70 | model3d-node, quiet, bin, pdf-node 34 tests (4 D76) |
| T5 CLI médias et images | T2, T3 | en cours | 1/3 | — | — |
| T6 CLI Office | T1 | terminée | 1/3 | d101b02 | 5 fichiers 71 tests, D79 réel vert |
| T7 branchement, FORMAT_LOTS | T4, T5, T6 | à faire | 0/3 | — | — |
| T8 essai, profil, verifier --e2e | T7 | à faire | 0/3 | — | — |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · aucun format du cadrage en code 3 « lot pas encore livré » (un format laissé de côté porte sa raison) · tailles Wasm inchangées sous plafond · PR fusionnée par fusion locale `--no-ff` et poussée

## Hypothèses à revoir
—

## Hors périmètre
- Remplacement des polices Liberation (attend Jérôme).

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisse démentie : le binaire Office existait en exemple (`convertir_office.rs`), promu ; `c16-office-navigateur.mjs:97` l'appelait.
- three.js dans Node nu : il manque `self`, `ProgressEvent`, `document` (D76, globaux posés pendant `view.load()`).
- Sous-agents Sonnet : ligne `Co-Authored-By` réécrite en « Opus 5.5 » (brief) par `rebase --exec` local avant chaque fusion.
- `grep -c roomboard-cli-t-` se compte lui-même : motif `roomboard-cli-t[-]`.
- Délais de la CLI sous charge (load ~14) : rejeu vert.

## Notes du coffre à poser
(étage 4)
