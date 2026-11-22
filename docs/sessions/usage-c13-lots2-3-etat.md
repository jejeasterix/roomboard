# État — usage-c13-lots2-3

Statut : en cours
Gabarit : chantier (provisoire, 10 à 16 tâches estimées ; deux lots dans un seul plan, lot 2 puis lot 3)
Objectif : Un `.notebook` (SMART Notebook), un `.olf` et un `.flipchart` (ActivInspire) déposés ou ouverts deviennent des pages RoomBoard, au niveau de la section 10 du cadrage de l'usage, avec la liste d'avertissements de ce qui n'est pas lu, par le lecteur SVG commun et la chaîne d'import du lot 1.
Avancement : 0/? tâches terminées
Étage : 2 — depuis 2026-11-22 09:45
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c13-lots2-3   Branche : feat/usage-c13-lots2-3   Base : origin/main @ 3b73c27
Branche principale locale au lancement : 3b73c27
Cadrage : docs/plans/usage-c13-lots2-3-cadrage.md   Plan(s) : docs/plans/usage-c13-lots2-3-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OE32), aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu », 2026-11-19). Lancement 2026-11-22 09:20:58. Arrêt ferme : 13:20 (pousser avant 13:10). Ordre de valeur : lot 2 (`.notebook`, puis `.olf`) fusionnable seul, lot 3 (`.flipchart`) ensuite.

## Référence
Avant (lot 1, main 3b73c27) : module Wasm principal 1 374 141 o (plafond 1 572 864) · module formats 3 024 532 o (plafond 3 145 728, marge 121 196 o). Suite complète de référence (3b73c27, /tmp/c13l23-ref.out, 09:29–09:31) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2740 tests ; module Wasm 1 374 141 o ; module formats 3 024 532 o ; scène 706 px, Pot 662 px.

## Compteurs
contre-relecture cadrage 1/2 (0 bloquant, 4 importants, 6 mineurs ; arbitrés et transmis au cadreur et au planificateur à 09:57 ; carnet ~/projets/roomboard-wt/c13l23-carnet-cadrage.md) · relecture plan 0/3 · vagues sans progrès 0/2 · double relecture fin de lot 0/2

## Tâches
Cadrage (68bd04e) : 22 décisions N1–N22, 10 hypothèses dont 5 de niveau 1, DA3 (`.olf` lu en TS, JSON.parse natif), DA4 (conteneur Bamboo + qCompress en TS dans le Worker, fflate), DA5 (objets `.flipchart` dans `roomboard-formats::flipchart`, sortie par `board::encode`) ; `.notebook` par le lecteur SVG commun (dialecte Notebook). Import seul pour les trois formats. 21 modules à réutiliser ou à étendre (7 nouveaux). Scénarios : S1 `.notebook` déposé · S2 `.olf` déposé · S3 détection, `.roomboard`, hostiles, scène ≥ 640 (lot 2) · S4 `.flipchart` déposé, enregistré, rouvert · S5 `.flipchart` hostiles (lot 3).
(table à remplir après le plan)

## Terminé quand
lot 2 (et lot 3 si la borne le permet) : toutes ses tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright (déposer un `.notebook`, un `.olf`, un `.flipchart` générés ; pages et avertissements ; `.roomboard` enregistré puis rouvert) · tests de sécurité (script, entité externe, chemin ZIP `../`, bornes U26, bombe zlib qCompress, taille annoncée mensongère) · capture d'un `.notebook` importé dans `docs/essais/` · fidélité mesurée sur les exemples hors dépôt · tailles des deux modules Wasm sous plafond, notées avant et après · scène ≥ 640 px · `scripts/controle-hors-ligne.mjs` vert · PR fusionnée par fusion locale `--no-ff` et `git push` sans force

## Pièges trouvés
- (repris du lot 1) `CARGO_TARGET_DIR` partagé entre worktrees : chaque worktree de tâche fixe `CARGO_TARGET_DIR=<worktree>/target`.

- Prémisses démenties (cadrage) : la section 10 donne R au `.notebook` et R + E au `.olf`, mais la réponse de Jérôme à Q5 retire l'export (section 10 à amender) ; TIFF en niveau A dans la section 10 mais refusé par le code (`image-import.test.ts:64`) ; le lecteur SVG du lot 1 ne lit pas `path` ; un `.fpg` décompressé est un Bamboo imbriqué (index `.in`, objets `.io` binaires Qt).
- Chantiers en cours sur les mêmes fichiers : aucun.

## Choix tranchés en cours d'exécution
- I1 (faisabilité) : deux PR. Le lot 2 a sa PR, fusionnée dès qu'elle est verte, avec un palier bas `.flipchart` (signature `Bamboo` détectée et refusée avec un message clair, 0 o). Le lot 3 ne démarre que si le lot 2 est fusionné avant 11:45, sur une branche neuve `feat/usage-c13-lot3-flipchart` tirée de `main`.
- I2 : reprise du lecteur ActCraft sous U39 et le précédent C9 ; HU1-6 à confirmer par Jérôme à la clôture.
- I3 : `content.json` du `.olf` lu dans le Worker ZIP, sortie passée par les bornes exportées de `board-io.ts`.
- Contre-relecture du cadrage lancée en même temps que le plan (borne de 4 h) ; ses constats vont au planificateur par message.
- Sujet de la chaîne enregistré sous `usage-c13-lots2-3` (et non `…-notebook-olf-flipchart`) pour que la tour lise le fichier d'état imposé par le brief.
