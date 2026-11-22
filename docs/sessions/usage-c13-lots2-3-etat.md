# État — usage-c13-lots2-3

Statut : en cours
Gabarit : chantier (17 tâches, confirmé au plan : lot 2 = T1–T10, PR propre ; lot 3 = T11–T17 sur `feat/usage-c13-lot3-flipchart`, seulement si le lot 2 est fusionné avant 11:45)
Objectif : Un `.notebook` (SMART Notebook), un `.olf` et un `.flipchart` (ActivInspire) déposés ou ouverts deviennent des pages RoomBoard, au niveau de la section 10 du cadrage de l'usage, avec la liste d'avertissements de ce qui n'est pas lu, par le lecteur SVG commun et la chaîne d'import du lot 1.
Avancement : 15/15 tâches terminées (lot 2)
Étage : 3 — depuis 2026-11-22 09:51
Tâche : T15 — flipchart::read — depuis 2026-11-22 10:27
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c13-lots2-3   Branche : feat/usage-c13-lots2-3   Base : origin/main @ 3b73c27
Branche principale locale au lancement : 3b73c27
Cadrage : docs/plans/usage-c13-lots2-3-cadrage.md   Plan(s) : docs/plans/usage-c13-lots2-3-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OE32), aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu », 2026-11-19). Lancement 2026-11-22 09:20:58. Arrêt ferme : 13:20 (pousser avant 13:10). Ordre de valeur : lot 2 (`.notebook`, puis `.olf`) fusionnable seul, lot 3 (`.flipchart`) ensuite.

## Référence
Avant (lot 1, main 3b73c27) : module Wasm principal 1 374 141 o (plafond 1 572 864) · module formats 3 024 532 o (plafond 3 145 728, marge 121 196 o). Suite complète de référence (3b73c27, /tmp/c13l23-ref.out, 09:29–09:31) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2740 tests ; module Wasm 1 374 141 o ; module formats 3 024 532 o ; scène 706 px, Pot 662 px.

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 4 importants, 6 mineurs ; arbitrés et transmis au cadreur et au planificateur à 09:57 ; carnet ~/projets/roomboard-wt/c13l23-carnet-cadrage.md) · relecture plan 1/3 (1 bloquant F1, 5 importants F2–F6, 8 mineurs ; carnet ~/projets/roomboard-wt/c13l23-carnet-plan.md ; arbitrés et portés dans les prompts des tâches plutôt qu'une réécriture du plan, faute de temps) · vagues sans progrès 0/2 · double relecture fin de lot 2 tour 1/2 (lancée à 10:15 sur 3b73c27..ba7da2c, en même temps que T9/T10 : conformité, qualité Rust, qualité TS ; carnets /tmp/relecture-usage-c13-lots2-3-lot2-*.md ; suites /tmp/c13l23-lot2-suites.out : cargo test ok, verifier.sh OK, formats 3 033 889 o) → conformité 0 blocker 0 major 4 minor ; qualité Rust 0 blocker, 1 major (borne de 100 000 objets contournée par un `path` à nombreux sous-chemins), 4 minor, 3 simplifications ; qualité TS 0 blocker 0 major, 7 minor, 4 simplifications → T18 (Rust), T19 (TS), T20 (test lent) ; tour 2/2 sur ba7da2c..67061ee (carnet /tmp/relecture-usage-c13-lots2-3-lot2-tour2.md) : 8 constats du tour 1 soldés (7 corrigés, 1 refus fondé), 1 major (essai : `waitDialog` lit tous les avis depuis le début, deux contrôles ne prouvent rien), 1 minor (script de fidélité) → T21

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
| T8 openBoard notebook/olf | T5, T6, T7 | terminée | 1/3 | 58bf415 | workspace + board-files 136 ok (`C13 S1 : .notebook dans l'ordre du manifeste`) rejoué ; `pnpm -r test` 2807 rapporté (rejoué par T9) |
| T9 essai navigateur, capture | T2, T4, T8 | terminée | 1/3 | 5940373 | /tmp/T9-verifier.out : « C13 tableaux : OK », « verifier.sh : e2e OK », code 0 ; ok — S1/S2/S3 présents ; scène 706 px ; principal 1 374 141 o, formats 3 033 889 o ; web 2807 ; capture vue (rectangle rouge, ellipse verte, « Leçon SMART », carré orange, page 1/2) |
| T18 correctifs Rust fin de lot 2 (major comptage des feuilles, minors, simplifications) | T1–T10 | terminée | 1/3 | 278ea66 | formats 120 ok + wasm 16 ok (`path_with_more_than_max_objects_subpaths_is_too_big`) rejoué ; formats 3 037 458 o ; constat 8 (`normalize_href`) non fait : le `trim` changerait le comportement |
| T19 correctifs TS fin de lot 2 (minors, simplifications) | T1–T10 | terminée | 1/3 | 1e1f3f3 | vitest app + platform 1131 ok rejoué ; constantes du point 9 gardées (encore atteintes par `boardSources`) |
| T20 test olf « 100 001 objets » trop lent (4,9 s sous charge, délai 5 s) | T19 | terminée | 1/3 | 67061ee | 20 tests du fichier ok, test 2,5 s → 1,1 s, aucun délai relevé |
| T21 essai : avis lus par dépôt (major du tour 2), script de fidélité | T9, T10 | terminée | 1/3 | 1e1938f | essai seul « C13 tableaux : OK », 45 `ok —` ; échec provoqué vu (message faux de `profond.olf` refusé) ; `profond.olf` attendu corrigé en « tableau sans page » (JSON.parse lit 200 000 niveaux, pageset vide) |
| T22 contrôle « fond #FFEECC » instable (0 pixel une fois sur deux lancements) | T21 | terminée | 1/3 | e0fc4cb | essai seul 3 fois code 0, « fond #FFEECC lu (169 pixels) » ; attente de deux images (`fr()`) avant la lecture ; cause probable, non reproduite |
| T10 fidélité exemples | T2, T4, T8 | terminée | 1/3 | a76061d | 12 lignes de données (6 + 6) relues, aucun fichier d'exemple dans le diff |
Lot 3 (branche `feat/usage-c13-lot3-flipchart`, tirée de origin/main 3b73c27 ; worktrees ~/projets/roomboard-wt/usage-c13-lot3--T<n>) :
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T11 mesure d'entrée | lot 2 | go provisoire | — | — | budget = 3 145 728 − 20 480 − 3 031 838 (formats après T4) = 93 410 o ≥ 81 920 → `lot 3 : go` ; à confirmer sur la taille finale du lot 2 |
| T12 fabrique flipchart | T11 | terminée | 1/3 | 67f6ad1 | vitest 9 ok (`fabrique : en-tête Bamboo v7`) rejoué ; fusionnée dans feat/usage-c13-lot3-flipchart (c70315e), worktree ~/projets/roomboard-wt/usage-c13-lot3 |
| T13 readBamboo borné | T12, lot 2 fusionné | à faire (attend la fusion du lot 2 : `bamboo.ts`, `zip-worker.ts`, `zip-read.ts` viennent du lot 2) | 0/3 | — | — |
| T14 flux Qt, index culm | T11 | terminée | 1/3 | 1d79235 | flipchart:: 12 ok (`stream_nesting_beyond_32_is_skipped`) rejoué ; coût 0 o tant que non lié |
| T15 flipchart::read | T14 | en cours | 1/3 | — | — |
| T16 liaison, openBoard flipchart | T13, T15 | à faire | 0/3 | — | — |
| T17 essai, fidélité, avis de tiers | T16 | à faire | 0/3 | — | — |

## Fidélité sur les exemples (hors dépôt)
Tableau : `docs/essais/c13-fidelite-lots2-3.md`. `.notebook` : 6 lus, 0 refusé, 31 pages, 557 objets, 14 avertissements (Flash, remplissages de polygones, une image absente) — niveau B. `.olf` : 6 lus, 0 refusé, 36 pages, 2 967 objets, 19 avertissements (widgets surtout) — niveau B, A pour `analisis.olf`.

## Terminé quand
lot 2 (et lot 3 si la borne le permet) : toutes ses tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright (déposer un `.notebook`, un `.olf`, un `.flipchart` générés ; pages et avertissements ; `.roomboard` enregistré puis rouvert) · tests de sécurité (script, entité externe, chemin ZIP `../`, bornes U26, bombe zlib qCompress, taille annoncée mensongère) · capture d'un `.notebook` importé dans `docs/essais/` · fidélité mesurée sur les exemples hors dépôt · tailles des deux modules Wasm sous plafond, notées avant et après · scène ≥ 640 px · `scripts/controle-hors-ligne.mjs` vert · PR fusionnée par fusion locale `--no-ff` et `git push` sans force

## Pièges trouvés
- Suite complète sur 67061ee (/tmp/c13l23-lot2-final.out) : tout vert sauf « C15 3D : ÉCHEC — S2 : instantané coloré (229,231,235) » (code 1) sous charge (load 12, T15 compilait) ; rejoué une fois seul : « C15 3D : OK », instantané (147,0,0) (/tmp/c13l23-c15-rejeu.out). Essai hors périmètre (C15), sensible à la charge ; suite complète rejouée avant la fusion.
- T14 : le flux d'objets rend `Err` pour tout le flux sur un type inconnu (ActCraft continue) ; T15 doit le ramener à un avertissement par objet ou par page (U2).
- T12 : l'index culm lit le genre en u16 (ActCraft `flipchartids.h`), pas en u32 comme le plan ; T13 suit ActCraft.
- (repris du lot 1) `CARGO_TARGET_DIR` partagé entre worktrees : chaque worktree de tâche fixe `CARGO_TARGET_DIR=<worktree>/target`.

- Prémisses démenties (cadrage) : la section 10 donne R au `.notebook` et R + E au `.olf`, mais la réponse de Jérôme à Q5 retire l'export (section 10 à amender) ; TIFF en niveau A dans la section 10 mais refusé par le code (`image-import.test.ts:64`) ; le lecteur SVG du lot 1 ne lit pas `path` ; un `.fpg` décompressé est un Bamboo imbriqué (index `.in`, objets `.io` binaires Qt).
- Chantiers en cours sur les mêmes fichiers : aucun.

## Choix tranchés en cours d'exécution
- Fin du lot 2 : correctifs et simplifications regroupés par zone en deux tâches (T18 Rust, T19 TS) au lieu d'une tâche de simplification à part, faute de temps ; les simplifications y gardent « comportement inchangé ». Non retenus (constats d'architecture) : extraction de `encodeBoardList`/`decodeBoardList` hors de `board-io` (première dépendance `platform → app`, tenue par le tree-shaking seul) ; union discriminée de `BoardSources`.
- Lot 3 commencé dès 10:10, avant la fusion du lot 2 (écart à I1, pris par l'orchestrateur) : T12 et T14 ne touchent aucun fichier du lot 2 et la VM a des places libres ; le lot 2 garde la priorité, la branche du lot 3 intégrera `main` après la fusion du lot 2. T11 jugée par l'orchestrateur sur la mesure de T4.
- Relecture du plan, arbitrages (portés dans les prompts, priment sur les sections) : F1 → `path` lu seulement en `Dialect::Notebook` (N7), le test du lot 1 `not_read_kinds_become_warnings_per_page` reste intact (T4) · F2 → arc `A` : objet sauté, avertissement « arc non lu » (T4) · F3 → grep chiffré du chunk `zip-worker-*.js` dans « Terminé » de T7, extraction d'un module pur permise · F4 → T9/T10 construisent d'abord les modules Wasm (ou `verifier.sh`) · F5 → `board-files.ts` et son test ajoutés à T8 · F6 → T16 garde la condition de signature de T6 et le test `.png` (lot 3) · mineurs : T5 forme finale dans `board-reader.ts` ; T7 `total` et JSON profond valide ; T9 `page0.svg` à 1 objet ; T10 compte les lignes `\.(notebook|olf) `.
- T1 faite par l'orchestrateur (une ligne de document) : les tailles viennent de la suite de référence jouée sur la même tête 3b73c27.
- Phase 0 (3.1) non jouée à part : chaque preuve est un test neuf nommé, jugé en 3.6 (« N tests, N ≥ 1, nom présent »).
- I1 (faisabilité) : deux PR. Le lot 2 a sa PR, fusionnée dès qu'elle est verte, avec un palier bas `.flipchart` (signature `Bamboo` détectée et refusée avec un message clair, 0 o). Le lot 3 ne démarre que si le lot 2 est fusionné avant 11:45, sur une branche neuve `feat/usage-c13-lot3-flipchart` tirée de `main`.
- I2 : reprise du lecteur ActCraft sous U39 et le précédent C9 ; HU1-6 à confirmer par Jérôme à la clôture.
- I3 : `content.json` du `.olf` lu dans le Worker ZIP, sortie passée par les bornes exportées de `board-io.ts`.
- Contre-relecture du cadrage lancée en même temps que le plan (borne de 4 h) ; ses constats vont au planificateur par message.
- Sujet de la chaîne enregistré sous `usage-c13-lots2-3` (et non `…-notebook-olf-flipchart`) pour que la tour lise le fichier d'état imposé par le brief.

## Suite complète finale du lot 2
/tmp/c13l23-lot2-final2.out, sha e0fc4cb : « C13 tableaux : OK », « verifier.sh : e2e OK », « verifier.sh : OK », code=0 ; web 2812 tests (référence 2740) ; cargo 0 échec ; principal 1 374 141 o ; formats 3 037 458 o ; scène 706 px ; controle-hors-ligne OK. Aucun test retiré ni ignoré ajouté (diffs relus à chaque tâche).

## Rapport (lot 2)
- Scénarios joués dans Chromium par `scripts/essais/c13-tableaux-navigateur.mjs` (dans `verifier.sh --e2e`) : S1 `.notebook` fabriqué (ordre du manifeste, avis Flash, `.roomboard` enregistré puis rouvert à l'identique) · S2 `.olf` fabriqué (3 objets, avis widget, fond, `.olf` renommé `.notebook` lu en `.olf`) · S3 refus (`.notebook` sans page, `content.json` cassé, trop gros 64 Mio + 1, trop profond 200 000 niveaux (refusé comme « tableau sans page » : `JSON.parse` le lit, le pageset est vide), `.flipchart` signé Bamboo avec le message ActivInspire), `.notebook` hostile (script, entité externe jamais lus), `socle-v1.roomboard` s'ouvre, scène 706 px, zéro requête hors 127.0.0.1. Capture `docs/essais/c13-notebook-lecon.png` : rectangle rouge, ellipse verte, « Leçon SMART » en gras, carré orange (image), page 1/2.
- Hypothèses à revoir, niveau 1 : HU1-1 import seul pour `.notebook` et `.olf` (Q5 « Idem » lu comme retrait de R et E ; cadrage de l'usage amendé : U1, U36, C13, § 10) · HU1-3 dialecte SMART vu seulement en `M L z` sur 6 exemples · HU1-4 matrice `.olf` lue par lignes, vérifiée sur un trait · HU1-2, HU1-5, HU1-6 concernent le lot 3.
- Décisions d'architecture : `.notebook` lu par le lecteur SVG commun (`Dialect::Notebook`, `rect_of`, `notebook_order` par `parse_tree`) dans le module `formats` ; DA3 `.olf` lu en TypeScript (`readOlf`, `JSON.parse` natif) dans le Worker ZIP, sortie par `encodeBoardList`/`decodeBoardList` et les bornes de `board-io` ; palier bas `.flipchart` (signature Bamboo refusée avec un message clair, 0 o).
- Tâches bloquées : aucune. Hors périmètre : essai C15 3D sensible à la charge (un échec, rejoué vert).
- Simplifications appliquées (T18, T19) : bras `wants_bg` réunis, `justify` par `Style::inherit`, `unknown_format` partagé, `normalArchivePath`, `extensionOf` importé, `BoardSourceFormat` unique, imports fusionnés. Non appliquée : `normalize_href` (le `trim` changerait le comportement).
- Constats d'architecture : 1 fermé (`zip-worker.ts:35`), 3 ajoutés (platform : couture platform → app ; app : `BoardSources` peu profond ; formats : `normalize_href`). Zones à 3 constats ouverts ou plus, audit **proposé** (pas lancé) : `crates/roomboard-core` 5, `apps/web/src/app` 4, `apps/web/src/platform` 7, `crates/roomboard-formats` 3.
- Release : non due (aucune release ni tag demandés ; dépôt sans CI).
- Tailles : principal 1 374 141 o (inchangé, plafond 1 572 864) ; formats 3 024 532 → 3 037 458 o (+12 926 o, budget lot 2 20 Ko, plafond 3 145 728).

## Conditions de la fusion du lot 2
Point de retour : origin/main 3b73c27 · double relecture faite (tour 1 et tour 2), aucun bloquant ouvert · aucune tâche bloquée · suite complète sans régression (2812 ≥ 2740, code 0) · aucun test retiré · scénarios S1–S3 joués et réussis · CLI non touchée · CI : aucune (dépôt sans workflow) · fusion locale `--no-ff` demandée par le brief.
