# État — usage-c13-lots2-3

Statut : en cours
Gabarit : chantier (17 tâches, confirmé au plan : lot 2 = T1–T10, PR propre ; lot 3 = T11–T17 sur `feat/usage-c13-lot3-flipchart`, seulement si le lot 2 est fusionné avant 11:45)
Objectif : Un `.notebook` (SMART Notebook), un `.olf` et un `.flipchart` (ActivInspire) déposés ou ouverts deviennent des pages RoomBoard, au niveau de la section 10 du cadrage de l'usage, avec la liste d'avertissements de ce qui n'est pas lu, par le lecteur SVG commun et la chaîne d'import du lot 1.
Avancement : 7/10 tâches terminées (lot 2)
Étage : 3 — depuis 2026-11-22 09:51
Tâche : T8 — openBoard notebook/olf — depuis 2026-11-22 10:07
Tâche : T12 — fabrique flipchart — depuis 2026-11-22 10:10
Tâche : T14 — flux Qt Rust — depuis 2026-11-22 10:10
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c13-lots2-3   Branche : feat/usage-c13-lots2-3   Base : origin/main @ 3b73c27
Branche principale locale au lancement : 3b73c27
Cadrage : docs/plans/usage-c13-lots2-3-cadrage.md   Plan(s) : docs/plans/usage-c13-lots2-3-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OE32), aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu », 2026-11-19). Lancement 2026-11-22 09:20:58. Arrêt ferme : 13:20 (pousser avant 13:10). Ordre de valeur : lot 2 (`.notebook`, puis `.olf`) fusionnable seul, lot 3 (`.flipchart`) ensuite.

## Référence
Avant (lot 1, main 3b73c27) : module Wasm principal 1 374 141 o (plafond 1 572 864) · module formats 3 024 532 o (plafond 3 145 728, marge 121 196 o). Suite complète de référence (3b73c27, /tmp/c13l23-ref.out, 09:29–09:31) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2740 tests ; module Wasm 1 374 141 o ; module formats 3 024 532 o ; scène 706 px, Pot 662 px.

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 4 importants, 6 mineurs ; arbitrés et transmis au cadreur et au planificateur à 09:57 ; carnet ~/projets/roomboard-wt/c13l23-carnet-cadrage.md) · relecture plan 1/3 (1 bloquant F1, 5 importants F2–F6, 8 mineurs ; carnet ~/projets/roomboard-wt/c13l23-carnet-plan.md ; arbitrés et portés dans les prompts des tâches plutôt qu'une réécriture du plan, faute de temps) · vagues sans progrès 0/2 · double relecture fin de lot 0/2

## Tâches
Cadrage (68bd04e) : 22 décisions N1–N22, 10 hypothèses dont 5 de niveau 1, DA3 (`.olf` lu en TS, JSON.parse natif), DA4 (conteneur Bamboo + qCompress en TS dans le Worker, fflate), DA5 (objets `.flipchart` dans `roomboard-formats::flipchart`, sortie par `board::encode`) ; `.notebook` par le lecteur SVG commun (dialecte Notebook). Import seul pour les trois formats. 21 modules à réutiliser ou à étendre (7 nouveaux). Scénarios : S1 `.notebook` déposé · S2 `.olf` déposé · S3 détection, `.roomboard`, hostiles, scène ≥ 640 (lot 2) · S4 `.flipchart` déposé, enregistré, rouvert · S5 `.flipchart` hostiles (lot 3).
Plan 17ddb64 : 17 tâches, 40 lignes `Réutilise :` (21 modules couverts). Vagues lot 2 : V1 = T1, T2, T3, T6 · V2 = T4 (après T3), T5 (après T3), T7 (après T2, T6) · V3 = T8 · V4 = T9, T10. Worktrees : ~/projets/roomboard-wt/usage-c13-lots2-3--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 tailles avant | — | terminée | 1/3 | dfd9d5a | tailles de la suite de référence sur 3b73c27 (1 374 141 o, 3 024 532 o), faite par l'orchestrateur |
| T2 safeArchivePath | — | terminée | 1/3 | bac9013 | vitest 3 fichiers 35 ok, 10 neufs, `C13 N16 : safeArchivePath` (rejoué) |
| T3 Dialect::Notebook | — | terminée | 1/3 | f59bedb | board:: 59 ok, wasm 14 ok (`notebook_order_follows_the_pages_resource`, `write_board_xml_refuses_notebook`) rejoué ; formats 3 024 835 o |
| T4 dialecte SMART read_svg | T3 | terminée | 1/3 | 0ae3a06 | board:: 78 ok (`notebook_closed_axis_path_becomes_filled_rect`, `iwb_path_stays_a_warning`, lot 1 `not_read_kinds_become_warnings_per_page` intact) rejoué ; formats 3 031 838 o |
| T5 notebook_order, Worker | T3 | terminée | 1/3 | f8e36dd | wasm 16 ok (`notebook_order_binding_reads_the_manifest`), board-reader 11 ok (`C13 N6 : ordre du manifeste`) rejoué ; formats 3 026 950 o |
| T6 détection, palier Bamboo | — | terminée | 1/3 | 2670c88 | vitest 5 fichiers 244 ok (dont workspace), 17 neufs, noms N4 et palier présents (rejoué) ; workspace.ts:543 corrigé sur ordre de l orchestrateur (tsc) |
| T7 readOlf | T2, T6 | terminée | 1/3 | 25e2b8e | vitest 3 fichiers 48 ok, 22 neufs, `C13 N9 : matrice lue par lignes` rejoué ; chunk zip-worker 0 DOM/Tauri (14 747 → 22 617 o) ; `op: "olf"` gardé, `total` transmis |
| T8 openBoard notebook/olf | T5, T6, T7 | en cours | 1/3 | — | — |
| T9 essai navigateur, capture | T2, T4, T8 | à faire | 0/3 | — | — |
| T10 fidélité exemples | T2, T4, T8 | à faire | 0/3 | — | — |
Lot 3 (branche `feat/usage-c13-lot3-flipchart`, tirée de origin/main 3b73c27 ; worktrees ~/projets/roomboard-wt/usage-c13-lot3--T<n>) :
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T11 mesure d'entrée | lot 2 | go provisoire | — | — | budget = 3 145 728 − 20 480 − 3 031 838 (formats après T4) = 93 410 o ≥ 81 920 → `lot 3 : go` ; à confirmer sur la taille finale du lot 2 |
| T12 fabrique flipchart | T11 | en cours | 1/3 | — | — |
| T13 readBamboo borné | T12 | à faire | 0/3 | — | — |
| T14 flux Qt, index culm | T11 | en cours | 1/3 | — | — |
| T15 flipchart::read | T14 | à faire | 0/3 | — | — |
| T16 liaison, openBoard flipchart | T13, T15 | à faire | 0/3 | — | — |
| T17 essai, fidélité, avis de tiers | T16 | à faire | 0/3 | — | — |

## Terminé quand
lot 2 (et lot 3 si la borne le permet) : toutes ses tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright (déposer un `.notebook`, un `.olf`, un `.flipchart` générés ; pages et avertissements ; `.roomboard` enregistré puis rouvert) · tests de sécurité (script, entité externe, chemin ZIP `../`, bornes U26, bombe zlib qCompress, taille annoncée mensongère) · capture d'un `.notebook` importé dans `docs/essais/` · fidélité mesurée sur les exemples hors dépôt · tailles des deux modules Wasm sous plafond, notées avant et après · scène ≥ 640 px · `scripts/controle-hors-ligne.mjs` vert · PR fusionnée par fusion locale `--no-ff` et `git push` sans force

## Pièges trouvés
- (repris du lot 1) `CARGO_TARGET_DIR` partagé entre worktrees : chaque worktree de tâche fixe `CARGO_TARGET_DIR=<worktree>/target`.

- Prémisses démenties (cadrage) : la section 10 donne R au `.notebook` et R + E au `.olf`, mais la réponse de Jérôme à Q5 retire l'export (section 10 à amender) ; TIFF en niveau A dans la section 10 mais refusé par le code (`image-import.test.ts:64`) ; le lecteur SVG du lot 1 ne lit pas `path` ; un `.fpg` décompressé est un Bamboo imbriqué (index `.in`, objets `.io` binaires Qt).
- Chantiers en cours sur les mêmes fichiers : aucun.

## Choix tranchés en cours d'exécution
- Lot 3 commencé dès 10:10, avant la fusion du lot 2 (écart à I1, pris par l'orchestrateur) : T12 et T14 ne touchent aucun fichier du lot 2 et la VM a des places libres ; le lot 2 garde la priorité, la branche du lot 3 intégrera `main` après la fusion du lot 2. T11 jugée par l'orchestrateur sur la mesure de T4.
- Relecture du plan, arbitrages (portés dans les prompts, priment sur les sections) : F1 → `path` lu seulement en `Dialect::Notebook` (N7), le test du lot 1 `not_read_kinds_become_warnings_per_page` reste intact (T4) · F2 → arc `A` : objet sauté, avertissement « arc non lu » (T4) · F3 → grep chiffré du chunk `zip-worker-*.js` dans « Terminé » de T7, extraction d'un module pur permise · F4 → T9/T10 construisent d'abord les modules Wasm (ou `verifier.sh`) · F5 → `board-files.ts` et son test ajoutés à T8 · F6 → T16 garde la condition de signature de T6 et le test `.png` (lot 3) · mineurs : T5 forme finale dans `board-reader.ts` ; T7 `total` et JSON profond valide ; T9 `page0.svg` à 1 objet ; T10 compte les lignes `\.(notebook|olf) `.
- T1 faite par l'orchestrateur (une ligne de document) : les tailles viennent de la suite de référence jouée sur la même tête 3b73c27.
- Phase 0 (3.1) non jouée à part : chaque preuve est un test neuf nommé, jugé en 3.6 (« N tests, N ≥ 1, nom présent »).
- I1 (faisabilité) : deux PR. Le lot 2 a sa PR, fusionnée dès qu'elle est verte, avec un palier bas `.flipchart` (signature `Bamboo` détectée et refusée avec un message clair, 0 o). Le lot 3 ne démarre que si le lot 2 est fusionné avant 11:45, sur une branche neuve `feat/usage-c13-lot3-flipchart` tirée de `main`.
- I2 : reprise du lecteur ActCraft sous U39 et le précédent C9 ; HU1-6 à confirmer par Jérôme à la clôture.
- I3 : `content.json` du `.olf` lu dans le Worker ZIP, sortie passée par les bornes exportées de `board-io.ts`.
- Contre-relecture du cadrage lancée en même temps que le plan (borne de 4 h) ; ses constats vont au planificateur par message.
- Sujet de la chaîne enregistré sous `usage-c13-lots2-3` (et non `…-notebook-olf-flipchart`) pour que la tour lise le fichier d'état imposé par le brief.
