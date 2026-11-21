# État — usage-c4-bibliotheque

Statut : en cours
Gabarit : chantier (15 tâches, confirmé à l'étage 2)
Objectif : Un panneau « Bibliothèque » montre « Mes ressources » et « Ressources partagées », en dossiers, avec recherche par nom et mot-clé et une vignette par ressource ; on ajoute une ressource depuis la sélection (`.rbitem`, U9) ou depuis la grille d'une page (`kind: "grid"`, U31), on la glisse sur la page (insertion en une étape d'annulation), on exporte un dossier en `.rbpack` et on l'importe ailleurs avec les mêmes ressources.
Avancement : 15/17 tâches terminées
Étage : 3 — depuis 2026-11-21 10:36
Tâche : T15, T17 — depuis 2026-11-21 11:00
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c4-bibliotheque   Branche : feat/usage-c4-bibliotheque   Base : origin/main @ 443edd4
Branche principale locale au lancement : 443edd4
Cadrage : docs/plans/usage-c4-bibliotheque-cadrage.md   Plan(s) : docs/plans/usage-c4-bibliotheque-PLAN.md
Mode : autonome, ouvrier CLI sur la VM, aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible… », 2026-11-19). Arrêt ferme : 2026-11-21 13:54 (pousser avant 13:44).

## Référence
Avant (origin/main @ 443edd4, reprise de la référence finale de C8 sur f417fbc, seuls des commits de documentation depuis) : verifier.sh --e2e OK · web 124 fichiers, 2445 tests · module Wasm principal 1 362 599 o (plafond 1 572 864) · module formats 3 100 344 o (plafond 3 145 728) · scène 662 px Pot actif. Suite complète non rejouée au lancement : VM chargée (charge 16,9 sur 8 cœurs), une seule place.

## Compteurs
contre-relecture cadrage 1/2 (B1 unknownKindMessage, I1–I3, M1–M9 intégrés : D23–D32, H1-7) · relecture plan 1/3 (aucun bloquant ; 3 importants et 7 mineurs sur T13, T14, T15, transmis dans leurs prompts, /tmp/c4-corrections-plan.txt) · vagues sans progrès 0/2

## Tâches
Vagues : V1 = T1, T3, T5, T6, T7, T9, T11, T12 · V2 = T2, T4, T8 · V3 = T10, T13 · V4 = T14 · V5 = T15. Worktrees : ~/projets/roomboard-wt/usage-c4-bibliotheque--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 cœur kind grid, WrongKind found | — | terminée | 1/3 | e8a64b3 | compat_c4 6, compat_c3 3, compat_socle 4, format 49 ok ; principal 1 364 082 o, formats 3 100 845 o |
| T2 pont Wasm | T1, T3 | terminée | 2/3 | 20babd4 | src/core WASM_REQUIRED 497 tests, 8 C4 (essai 2 : 3 tests fake-core cassés au 1er rejeu) ; principal 1 369 494 o, formats 3 100 845 o |
| T3 API TS du cœur, faux cœur | — | terminée | 1/3 | 8d921cb | fake-core 65 tests, 4 C4 ; 2 tests C3 « grid inconnu » passés à « pack » (assertions inchangées) |
| T4 ContainerIO, insertResource | T3 | terminée | 1/3 | 51cd474 | container-io + fragments 54 tests, 16 C4 dont cascade R4/D24 |
| T5 vignette | — | terminée | 1/3 | c382271 | thumbnail 4 tests C4 |
| T6 LibraryFiles (mémoire, IndexedDB, plugin-fs) | — | terminée | 1/3 | 3044471 | library-files + host-tauri-ports + pending 37 tests, 26 C4 |
| T7 paquet .rbpack, Worker ZIP | — | terminée | 1/3 | 7bd8bf4 | rbpack, zip-worker, zip-read, model3d-import 37 tests, 20 C4 |
| T8 ResourceLibrary | T6, T7 | terminée | 1/3 | 1679047 | library 15 tests C4 dont export puis import |
| T9 importeur .rbpack | — | terminée | 1/3 | 3442897 | import + files 86 tests, 4 C4 ; files.test attendu + rbpack (D30) |
| T10 coque : association, capacités | — | terminée | 1/3 | 5ec2bfc | roomboard-shell 18 tests ok (associations, capacités) |
| T11 action Bibliothèque | — | terminée | 1/3 | d14de10 | toolbar-profiles + toolbar-host 45 tests |
| T12 glisser Pointer Events | — | terminée | 1/3 | f60a3a8 | resource-drag 5 tests C4 |
| T13 LibraryPanel | T8, T12 | terminée | 1/3 | d32b3e8 | LibraryPanel 11 tests C4 |
| T14 branchement | T2, T4, T5, T8, T9, T11, T13 | terminée | 1/3 | b5daf94 | workspace + App 134 tests, 8 C4 ; build web et suite web 2564 tests (rapportés) |
| T15 essai navigateur, capture, tailles | toutes | en cours | 1/3 | — | — |
| T16 correctif import de paquet (revue T8 major : index périmé, repli limité) | T8 | terminée | 1/3 | 4925dfa | library + LibraryPanel 29 tests |
| T17 mineurs et simplifications des revues immédiates (T1, T2, T4, T7, T8) | T1–T14 | en cours | 1/3 | — | — |

## Scénarios et captures

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright C4 du brief réussi · capture du panneau « Bibliothèque » dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Journal
- 2026-11-21 09:54 lancement, worktree depuis origin/main @ 443edd4.

- 2026-11-21 10:05 cadrage écrit (ee2d628) : 22 décisions, 13 hypothèses dont 6 de niveau 1, 4 DA, S1–S5 ; stockage web IndexedDB.
- 2026-11-21 10:33 contre-relecture 1/2 intégrée (20e2a63, 3b06a06) ; plan 15 tâches, 38 lignes `Réutilise :`.
- 2026-11-21 10:36 vague 1 lancée (8 tâches) et relecture du plan 1/3 en parallèle.

- 2026-11-21 10:36–11:00 vagues 1 à 4 : T1–T14 et T16 fusionnées, preuves rejouées ; revues immédiates de T1, T2, T4, T7, T8 (concepteur-critique et T2) : 1 major (T8 → T16), mineurs regroupés en T17.

## Pièges trouvés
- Les sous-agents signent `Co-Authored-By: Claude Sonnet 5.5` (attribution de leur session) : réécrit en `Claude Opus 5.5` par rebase de la branche de tâche avant chaque fusion (/tmp/c4-fusion.sh).
- Dossier de build Rust partagé (`CARGO_TARGET_DIR`) : la taille « formats » relevée par T10 venait du build de T1 en parallèle.
- Prémisses démenties (cadrage) : `formats` gagne quelques dizaines d'octets (`kind: "grid"` lu par le même code que le cœur) ; mots-clés et vignette hors du `.rbitem` (écart à U9, compagnon) ; glisser HTML5 risqué en coque Windows (`dragDropEnabled: true`) → Pointer Events ; portée du dossier partagé perdue au redémarrage de la coque (H1-5) ; fonds de page en ressource hors périmètre.
- Chantiers en cours sur les mêmes fichiers : aucun.
