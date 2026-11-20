# Plan d'exécution — usage-c10b-tableau (C10b : fusion, ombrage, collage HTML, classeur en valeurs)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : lecture des fusions et de l'ombrage (règle F2), `ImportTable` | — | `crates/roomboard-core/src/table.rs`, `crates/roomboard-core/src/commands.rs` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T1`) | concepteur-critique | `cargo test -p roomboard-core 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|table" \| tail -70` : 0 `FAILED`, ≥ 5 tests C10b dont `spans_become_merges_and_shades_are_read`, `bad_or_overlapping_spans_are_ignored_and_kept`, `c10b_keys_are_ignored_and_kept`, `import_table_writes_texts_spans_and_matrix_in_one_step`, `import_table_refuses_bad_input_without_writing` ; `table_fixture_resaves_identically` vert | S2, S4, S5 | #tache-t1 |
| T2 | Cœur : fusionner, diviser, ombrer, plages, report des zones, fixture | T1 | `crates/roomboard-core/src/table.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/tests/tableau.rs`, `crates/roomboard-core/tests/tableau_fusion.rs` (neuf), `crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard` (neuf), `crates/roomboard-wasm/src/lib.rs` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T2`) | concepteur-critique | `cargo test -p roomboard-core 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|merge\|shade\|split\|fusion\|remove_lines\|reload" \| tail -70` : 0 `FAILED`, ≥ 11 tests nommés dont `remove_lines_moves_or_trims_the_merges_they_touch`, `c10b_table_reload_keeps_bytes`, `fusion_fixture_resaves_identically` ; `cargo test -p roomboard-wasm table` ≥ 3 `ok` | S1, S3, S5 | #tache-t2 |
| T3 | Module formats : première feuille d'un `.xlsx` en valeurs (`calamine`) | — | `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/sheet.rs` (neuf), `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` (neuf), `crates/roomboard-formats-wasm/src/lib.rs`, `Cargo.lock`, `THIRD_PARTY_NOTICES.md` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T3`) | implementeur-tdd | `cargo test -p roomboard-formats -p roomboard-formats-wasm 2>&1 \| grep -E "test result\|FAILED\|panicked\|error\[\|sheet\|valeurs" \| tail -40` : 0 `FAILED`, ≥ 9 tests `sheet` dont `valeurs_fixture_reads_64_rows_and_its_values`, `declared_zip_bomb_is_refused` ; `node scripts/controle-licences.mjs` OK ; module formats ≤ 3 145 728 o | S4 | #tache-t3 |
| T4 | Contrat TS : commandes C10b, vue `merges`/`shade`, fausse liaison, contrôle de forme | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T4`) | concepteur-critique | `vitest run src/core` : 0 `×`, « contrat C10b : fausse liaison » ≥ 9 tests, « contrôle de forme C10b (tableau) » ≥ 2, « fakeCore — C10b (tableau) » ≥ 2 ; blocs C10a verts | S1, S2, S3, S4, S5 | #tache-t4 |
| T5 | Collage : HTML → grille, priorité du tableau sur l'image | — | `apps/web/src/platform/html-table.ts` (neuf), `apps/web/src/platform/html-table.test.ts` (neuf), `apps/web/src/platform/paste.ts`, `apps/web/src/platform/paste.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T5`) | implementeur-tdd | `vitest run src/platform/html-table.test.ts src/platform/paste.test.ts` : 0 `×`, « tableau HTML collé (F19, F20) » ≥ 9 tests, « collage d'un tableau HTML (F19) » ≥ 3 ; `tsc` vide | S2 | #tache-t5 |
| T6 | Géométrie des zones et des plages, contrat du moteur (`clearRange`, `textStyle`, comptes) | — | `apps/web/src/engine/table-geom.ts`, `apps/web/src/engine/table-geom.test.ts`, `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T6`) | implementeur-tdd | `vitest run src/engine/table-geom.test.ts src/engine/engine.test.ts src/engine/tools/table.test.ts` : 0 `×`, « zones et plages (C10b, F14 à F16, F7) » ≥ 9 tests, « moteur — C10b (F29, F14) » ≥ 3 ; tests C10a verts | S1, S5 | #tache-t6 |
| T7 | Liaison Wasm des commandes C10b, contrat sur le vrai module | T2, T4 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T7`) | implementeur-tdd | `cargo test -p roomboard-wasm table` ≥ 5 `ok` ; `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core` : 0 `×`, « contrat C10b : vrai module wasm » ≥ 9, « contrat C10b : vrai module seulement » ≥ 1 ; module ≤ 1 572 864 o | S1, S3 | #tache-t7 |
| T8 | Outil Tableau : plage, saisie au relâché, fusion, division, ombrage, plages des actions | T4, T6 | `apps/web/src/engine/tools/table.ts`, `apps/web/src/engine/tools/table.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T8`) | concepteur-critique | `vitest run src/engine/tools/table.test.ts src/engine/engine.test.ts src/engine/tools/text.test.ts` : 0 `×`, « outil Tableau (C10b) » ≥ 13 tests, « outil Tableau (C10a) » vert | S1, S5 | #tache-t8 |
| T9 | Dessin des zones et de l'ombrage, révélation par l'outil Sélection | T4, T6 | `apps/web/src/engine/render/table-paint.ts`, `apps/web/src/engine/render/table-paint.test.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/select.test.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T9`) | implementeur-tdd | `vitest run src/engine/render/table-paint.test.ts src/engine/render/canvas2d.test.ts src/engine/tools/select.test.ts` : 0 `×`, « zones et ombrage (C10b, F13) » ≥ 3, « Canvas2DRenderer — tableau (C10b) » ≥ 2, « révélation d'un ombrage (F10) » ≥ 5 | S1 | #tache-t9 |
| T10 | Import : grille posée, classeur lu dans un Worker jetable, gestionnaire `sheet` | T3, T4, T5, T6 | `apps/web/src/platform/table-insert.ts` (neuf), `apps/web/src/platform/table-insert.test.ts` (neuf), `apps/web/src/platform/sheet-reader.ts` (neuf), `apps/web/src/platform/sheet-reader.test.ts` (neuf), `apps/web/src/platform/sheet-worker.ts` (neuf), `apps/web/src/platform/import.ts`, `apps/web/src/platform/import.test.ts`, `apps/web/src/platform/image-import.ts`, `apps/web/src/platform/image-import.test.ts`, `apps/web/src/platform/container.ts`, `apps/web/src/platform/container.contract.test.ts`, `apps/web/vite.config.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T10`) | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/platform` : 0 `×`, « poser une grille (F21, F22) » ≥ 5, « lecteur de classeur en Worker (F28) » ≥ 4, « importFiles : classeur (F28) » ≥ 5, « contrat C10b : classeur (vrai module formats) » ≥ 1 ; `vite build` : un seul `roomboard_formats_wasm_bg*.wasm` | S2, S4 | #tache-t10 |
| T11 | Branchement : quatre boutons, attributs `#stage`, collage et classeur vers l'onglet actif | T5, T6, T8, T10 | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/ui/item-state.ts`, `apps/web/src/ui/item-state.test.ts`, `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/app/toolbar-host.ts`, `apps/web/src/app/toolbar-host.test.ts`, `apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts`, `apps/web/src/app/board-session.ts`, `apps/web/src/app/workspace.ts`, `apps/web/src/app/workspace.test.ts`, `apps/web/src/main.ts` | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T11`) | implementeur-tdd | `vitest run src/toolbar.test.ts src/ui src/app` : 0 `×`, « actions du tableau (C10b) » ≥ 2, « état des actions du tableau (C10b, F15) » ≥ 4, « stageTags (C10b, F29) » ≥ 2, « espace de travail : tableau collé et classeur (C10b) » ≥ 4 ; `pnpm --filter @roomboard/web test` 0 échec ; `tsc` vide | S1, S2, S4 | #tache-t11 |
| T12 | Essai navigateur C10b dans `verifier.sh --e2e`, capture fusion + ombrage | T7, T9, T11 | `scripts/essais/c10b-tableau-navigateur.mjs` (neuf), `scripts/essais/commun.mjs`, `scripts/essais/c10a-tableau-navigateur.mjs`, `scripts/essais/c2-image-navigateur.mjs`, `scripts/essais/c9-grille-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c10b-tableau-fusion-ombrage.png` (neuf) | isolé (`~/projets/roomboard-wt/usage-c10b-tableau--T12`) | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| tail -70` : « C10b tableau : OK », « C10a tableau : OK », « C2 image : OK », « verifier.sh : e2e OK », « verifier.sh : OK », deux tailles de module citées sous leurs plafonds ; PNG présent | S1, S2, S3, S4 | #tache-t12 |

**Vagues (par dépendances).** Vague 1 : T1, T3, T4, T5, T6 (fichiers disjoints, cinq en parallèle). Vague 2 : T2 (dès
T1) ; T8 et T9 (dès T4 et T6) ; T10 (dès T3, T4, T5, T6) — disjoints entre eux. Vague 3 : T7 (dès T2 et T4) ; T11 (dès
T5, T6, T8, T10) — disjoints. Vague 4 : T12. L'orchestrateur lance chaque tâche dès que ses dépendances sont
fusionnées. Fichiers partagés entre vagues, donc jamais en parallèle : `table.rs` et `commands.rs` (T1 puis T2) ;
`crates/roomboard-wasm/src/lib.rs` (T2 puis T7) ; `wasm-core.ts` et `wasm-core.contract.test.ts` (T4 puis T7) ;
`tools/table.ts` (T6, bouchons seulement, puis T8).

**Chemin critique.** Rust : T1 (≈ 45 min) → T2 (≈ 60) → T7 (≈ 35) → T12 (≈ 50) ≈ 3 h 10. Page : T6 (≈ 40) → T8 (≈ 55)
→ T11 (≈ 45) → T12 ≈ 3 h 10. Les deux chemins se rejoignent à T12 ; T3, T4, T5, T9, T10 ne sont pas critiques.

**`tsc` entre les vagues (écarts nommés, les seuls permis).**

| fichier | erreur attendue | fermée par |
|---|---|---|
| `src/engine/table-geom.ts`, `src/engine/table-geom.test.ts`, `src/engine/engine.ts`, `src/engine/engine.test.ts` | `merges` / `shade` inconnus de `TableData` / `TableCell`, dans le seul worktree de T6 (sans T4) | fusion de T4 |
| `src/engine/render/table-paint.test.ts`, `src/engine/render/canvas2d.test.ts` | `merges` / `shade` absents des littéraux `TableData` | T9 |
| `src/app/stage-tags.test.ts` | `tableMerges` / `tableShades` absents du littéral `EngineState` | T11 |
| `src/app/workspace.ts` | `measure` / `textStyle` absents de la cible `imageTarget` | T11 |

Après T11, `tsc` est vide ; T12 le vérifie.

**Goal :** fusionner et diviser des cellules d'un tableau, poser un ombrage qu'un toucher de l'outil Sélection révèle,
coller un `<table>` HTML qui devient un tableau, importer un `.xlsx` en valeurs par le dépôt de fichiers, le tout gardé à
l'aller-retour `.roomboard`.

**Architecture :** le cœur porte la règle de lecture des fusions (`merges_of`, F2) et la rend dans la vue
(`TableView.merges`) ; la page ne fait que la lire (DAB1). Quatre commandes neuves (`MergeTableCells`,
`SplitTableCell`, `SetTableShade`, `ImportTable`) et deux champs `to` ; `ImportTable` partage son corps d'écriture avec
`AddTable` (`write_table`, DAB3). La page tient la géométrie des zones et des plages (`table-geom.ts`), l'outil Tableau
fait la plage, l'outil Sélection révèle. Collage HTML et classeur produisent la même `TableGrid` (DAB2), posée par
`insertTableGrid` ; le classeur est lu par `calamine` dans `roomboard-formats`, servi par un Worker jetable qui charge sa
propre instance du module `formats` (DAB4).

**Tech Stack :** Rust (yrs 0.28, zip 9.6, calamine 0.38 MIT), wasm-bindgen 0.2.130, TypeScript, SolidJS 1.9.20,
Vitest 3 (happy-dom pour le DOM), Vite 6 (Worker `format: "es"`), Playwright (essai e2e).

**Spec :** `docs/plans/usage-c10b-tableau-cadrage.md` (commit `759566c`, base `origin/main` `425d617`).

## Choix du plan (hors cadrage, à relire)

- PC1 `ImportTable` : une matrice non finie ou non inversible est refusée en `BadTable` (F18 ne nomme pas la matrice).
- PC2 La vue liste aussi une cellule couverte qui a un texte (fichier d'une autre version) ; la page l'ignore (dessin,
  navigation, mesure).
- PC3 Garde de 64 Mio (F22) : contrôlée sur `xl/sharedStrings.xml`, `xl/styles.xml`, `xl/workbook.xml` et **toutes**
  les parties `xl/worksheets/*.xml` (le nom de la feuille lue demanderait de relire les relations) ; une feuille cachée
  géante fait donc refuser le classeur.
- PC4 Valeurs : `DateTimeIso` mis en forme `JJ/MM/AAAA[ HH:MM[:SS]]` ; `DurationIso` (rare, `.xlsx` en ISO) gardé tel quel.
- PC5 Message des textes coupés (F22 ne le fixe pas) : « texte coupé à 2 000 caractères dans certaines cellules »,
  précédé de « <nom> : » pour un classeur.
- PC6 S3 du cadrage attend `data-table-merges` = `1` après S1 et S2 ; F29 compte **tous** les tableaux de la page
  montrée, et le tableau collé en S2 a sa fusion : l'essai attend `2` (et `data-table-shades` = `2`).
- PC7 `TableCellState.range`, `.merged`, `.shaded` sont facultatifs (les littéraux des tests existants restent valides) ;
  l'outil Tableau les publie toujours.
- PC8 `pastedTableHtml(e)` lit `clipboardData.getData` facultatif (`PasteEventLike` étendu) : un `ClipboardEvent` y
  passe sans transtypage ; le contrôle des 8 Mio est fait par `Workspace.pasteTable` (il a `notify`).
- PC9 `Workspace.pasteTable(html)` rend `Promise<boolean>` (le cadrage dit `Promise<void>`) : faux si le HTML n'a pas de
  tableau lisible, et `main.ts` colle alors les images comme avant.
- PC10 Fusion identique à une zone existante sans cellule couverte à vider : aucune étape (D38).
- PC11 `SetTableFill` et `SetTableShade` résolvent une cellule couverte vers son ancre (même règle pour `to` absent).
- PC12 `EngineState.tableMerges` / `tableShades` recalculés seulement quand la version du document ou la page montrée
  change.
- PC13 Fausse liaison : un `span` ou un `shade` illisible d'un JSON est retiré au chargement (PC6 de C10a, étendu).
- PC14 Navigation (F16) : ← et → suivent l'ordre de lecture en sautant la zone courante (C10a PC4), arrivée sur une
  cellule couverte = son ancre ; Tab et Maj+Tab : ancres et cellules simples seulement.
- PC15 Traits : un tableau sans zone garde le tracé de C10a (une ligne par bord) ; avec zones, segments par cellule,
  bords intérieurs d'une zone omis.
- PC16 HTML : les cellules d'un tableau imbriqué sont séparées par une espace, ses lignes par un saut de ligne.
- PC17 Onglet fermé pendant la lecture d'un classeur : « <nom> : onglet fermé pendant l'import, tableau non inséré ».
- PC18 Échap avec l'outil Tableau, saisie fermée : retire la plage s'il y en a une (`clearRange`), sinon comportement
  de C10a.
- PC19 Après « Fusionner », la plage est retirée et l'ancre devient active ; après « Ombrer », « Retirer l'ombrage » et
  une pastille, la plage reste.
- PC20 Le Worker est créé dans `main.ts` (amorce) et passé à l'espace de travail (`WorkspaceDeps.readSheet`) : aucun
  test ne résout `sheet-worker.ts` ni `src/wasm-formats/`.
- PC21 « Ombrer » est permis dès qu'une cellule est active (plage ou cellule) ; « Retirer l'ombrage » dès qu'une cellule
  ombrée est dans la plage, sinon la cellule active ombrée.
- PC22 `SheetReader.open` est la seule entrée de la liaison (le cadrage cite aussi `read_sheet`, non créé).
- PC23 `Toolbar.test.tsx` change d'attendu (rangée de neuf boutons) bien que la carte le marque non touché.
- PC24 `dropFile` de `commun.mjs` gagne un point de dépôt facultatif `at` (défaut : 50, 50, comportement actuel).

## Global Constraints

- GC1 Budget : l'exécution entière tient en environ 3 h 30 sur la VM de 8 places, chargée ; une tâche vise 20 à 60 min ;
  aucune commande lourde hors celles de sa section (`scripts/verifier.sh --e2e` seulement en T12).
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]` — seule exception : le test `#[ignore]` des exemples réels que F32 demande en T3), aucun seuil ni délai
  relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé (VM chargée). Les blocs « vrai module »
  se sautent d'eux-mêmes sans `.wasm` (mécanisme existant) : T7, T10 et T12 les jouent avec `ROOMBOARD_WASM_REQUIRED=1`.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri
  (`tauri build`), aucun build Android.
- GC4 Préparation du worktree `$WT` (`~/projets/roomboard-wt/usage-c10b-tableau--T<n>`, donné par l'orchestrateur),
  une fois : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile)` ; tâche Rust :
  `[ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .` (1,5 Go, dépendances déjà
  compilées) ; tâche TS : types seuls des modules Wasm (jamais le `.wasm`, ignorés par git, jamais commités) :
  `mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve bornée : la commande de la section, telle quelle ; le rapport cite le nombre de tests (N ≥ 1) et les noms
  attendus vus dans la sortie.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`), auteur
  `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 Interdits git : jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Dépendances : une seule nouvelle, `calamine` 0.38 (MIT, T3), plus la déclaration de `zip` 9.6 (déjà au cœur) dans
  `roomboard-formats` ; aucune dépendance AGPL, GPL ni LGPL (U39) ; `node scripts/controle-licences.mjs` passe.
- GC9 Plafonds : module principal 1 572 864 o (H2-13) et module `formats` 3 Mio (3 145 728 o), contrôles de
  `scripts/verifier.sh` ni baissés ni relevés ; T3, T7, T10 et T12 relèvent la taille de leur module dans le rapport.
- GC10 Format : `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; fusion = `span` `Any::Array` de deux
  chaînes `[id de la dernière ligne, id de la dernière colonne]` sur l'ancre seule, aucun `mergedInto` écrit ; ombrage =
  clé `shade` couleur `#rrggbb` ; une commande n'écrit que les clés qu'elle change, les clés inconnues restent.
- GC11 Couches : `crates/` sans dépendance au navigateur ; le cœur tourne en Wasm dans la page ; la page ne recode pas la
  règle F2 (elle lit `TableData.merges`) ; la fausse liaison suit le cœur (D36) dans le même ordre de refus.
- GC12 Interface : dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français,
  aucune icône seule, cibles d'au moins `--rb-btn-m` ; aucun style neuf dans `rb.css`.
- GC13 `tsc` : `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS"` ne rend rien à la fin de la
  tâche, sauf les écarts nommés de la table « `tsc` entre les vagues » recopiés dans la section.
- GC14 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne
  `Réutilise :` de la section, et les noms de tests vus.
- GC15 Rust : `cargo fmt --all` puis `cargo clippy -p <crate> --all-targets -- -D warnings` sans avertissement avant le
  commit.
- GC16 Aucun fichier `.xlsx` téléchargé n'est commité (`~/telechargements-roomboard/` reste hors du dépôt) : le seul
  classeur du dépôt est `crates/roomboard-formats/tests/fixtures/valeurs.xlsx`, fabriqué par un test.
- GC17 Aucun processus laissé en marche à la fin de la tâche (serveur, navigateur, `vite`, `cargo watch`).
- GC18 Périmètre : la tâche ne modifie que ses fichiers touchés.

Commande de commit type :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commande de test type (vitest, verbeuse, bornée) :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run <fichiers> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -80
```

## Review Focus

1. Zones qui se recoupent : une fusion demandée qui recoupe en partie une zone existante (F3, refus `BadTable`) et un
   fichier dont deux `span` se recoupent, dont un id manque ou qui remonte (F2, ignoré et gardé, S5) — tests
   `merge_refuses_one_cell_unknown_lines_and_partial_overlap` (T2), `bad_or_overlapping_spans_are_ignored_and_kept`
   (T1), « JSON : span recoupant ou sans ligne : ignoré, gardé » (T4).
2. Retrait de lignes dans une zone : ligne d'ancrage retirée, dernière ligne retirée, zone réduite à une cellule, zone
   entière retirée, plage de deux lignes (F6, S5, HB-20) — tests `remove_lines_moves_or_trims_the_merges_they_touch`
   (T2), « RemoveTableLine avec to (F6) » (T4), « − Ligne sur une plage de deux lignes : une RemoveTableLine avec to »
   (T8).
3. Collage hostile : `<script>`, `<img onerror>`, `rowspan="0"`, `colspan` énorme, cellules qui se recoupent, HTML de
   plus de 8 Mio, tableau imbriqué (F19, F20, F22, S2) — tests « script, image, style : jamais exécutés ni chargés,
   texte ignoré », « rowspan 0 : jusqu'à la fin ; colspan 5000 : rogné à 64 », « cellules qui se recoupent : fusion
   ignorée » (T5), « pasteTable : HTML de plus de 8 Mio refusé » (T11).
4. Classeur piégé ou malformé : bombe ZIP déclarée, en-tête `PK\x03\x04` suivi d'octets corrompus, feuille vide,
   première feuille cachée, plus de 64 lignes (F22, F23, F28, DAB4, S4) — tests `declared_zip_bomb_is_refused`,
   `corrupted_zip_is_unreadable`, `first_visible_sheet_is_read` (T3), « onerror du Worker (panic Wasm) : rejet, Worker
   arrêté » (T10), « S4 : casse.xlsx corrompu : Import impossible ; enregistrer marche encore » (T12).
5. Toucher ou glisser sur un ombrage : 5 px (sous le seuil de 8) révèle, 9 px déplace, Maj tenue sélectionne, tableau
   déjà sélectionné (F10, HB-24, effet de bord « l'outil Sélection ne sélectionne plus ») — tests « F10 : glisser de
   5 px (< 8) : révélé quand même », « F10 : glisser de 9 px : déplacement depuis le point d'appui, rien de révélé »,
   « F10 : Maj tenue : sélection comme avant » (T9).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/table.rs` | `merges_of`, vue `merges`/`shade`, `write_table`, `ImportTable` (T1) ; fusion, division, ombrage, plages, report (T2) | T1, T2 |
| `crates/roomboard-core/src/commands.rs` | variante `ImportTable` (T1) ; `MergeTableCells`, `SplitTableCell`, `SetTableShade`, champs `to` (T2) | T1, T2 |
| `crates/roomboard-core/tests/tableau.rs`, `tests/tableau_fusion.rs`, `tests/fixtures/tableau-fusion-ombrage.roomboard` | `to: None` ; fixture C10b (F30) | T2 |
| `crates/roomboard-wasm/src/lib.rs` | `to: None` des deux `*_inner` (T2) ; méthodes C10b (T7) | T2, T7 |
| `crates/roomboard-formats/*`, `crates/roomboard-formats-wasm/src/lib.rs`, `Cargo.lock`, `THIRD_PARTY_NOTICES.md` | `sheet.rs`, `SheetReader`, `calamine`, licences | T3 |
| `apps/web/src/core/api.ts`, `fake-core.ts`, `wasm-core.ts` (+ tests) | contrat, parité, forme (T4) ; appels Wasm (T7) | T4, T7 |
| `apps/web/src/platform/html-table.ts`, `paste.ts` | HTML → grille, priorité du tableau | T5 |
| `apps/web/src/engine/table-geom.ts`, `tools/tool.ts`, `engine.ts` | zones, plages, navigation, hauteurs ; `clearRange`, `textStyle`, comptes | T6 |
| `apps/web/src/engine/tools/table.ts` | bouchons (T6) ; plage, saisie au relâché, actions (T8) | T6, T8 |
| `apps/web/src/engine/render/table-paint.ts`, `canvas2d.ts`, `tools/select.ts` | zones, ombrage hachuré ; révélation | T9 |
| `apps/web/src/platform/table-insert.ts`, `sheet-reader.ts`, `sheet-worker.ts`, `import.ts`, `image-import.ts`, `container.ts`, `apps/web/vite.config.ts` | pose d'une grille, Worker, gestionnaire `sheet` | T10 |
| `apps/web/src/toolbar.ts`, `ui/item-state.ts`, `app/toolbar-host.ts`, `app/stage-tags.ts`, `app/board-session.ts`, `app/workspace.ts`, `main.ts` | boutons, attributs, branchement | T11 |
| `scripts/essais/*`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c10b-tableau-fusion-ombrage.png` | essai e2e, capture | T12 |

---

<a id="tache-t1"></a>

### Tâche T1 — Cœur : lecture des fusions et de l'ombrage (règle F2), `ImportTable`

**Objectif.** Le cœur lit `span` et `shade` sur les cellules (F1, F8) et calcule les zones fusionnées par une règle
déterministe unique (`merges_of`, F2, DAU10) : ancres dans l'ordre de lecture, `span` retenu s'il désigne une ligne et
une colonne lisibles de rang ≥ celui de l'ancre, couvre au moins 2 cellules et ne recoupe aucune zone déjà retenue ;
sinon ignoré et gardé. La vue gagne `merges` (ancre par ids, étendue en rangs) et `shade` (F29). Nouvelle commande
`ImportTable` (F18) : un tableau rempli en une transaction, corps d'écriture partagé avec `AddTable` (`write_table`,
DAB3). Le test `c10b_keys_are_ignored_and_kept` change d'attendu (effet de bord du cadrage).

**Fichiers.**
- Modifier : `crates/roomboard-core/src/table.rs:1-7` (en-tête), `:40-56` (`TableCellView`, `TableView`), `:79-85`
  (`RawCell`), `:157-178` (`read_cell`), `:190-233` (`view`), `:248-260` (`NewTable`, après), `:343-381`
  (`cmd_add_table`), module `tests` (`:820-846` réécrit, littéraux `TableCellView` complétés, tests neufs)
- Modifier : `crates/roomboard-core/src/commands.rs:103-149` (variante `ImportTable`), `:533-575` (bras d'`apply`)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (lu par T2, T7) :
  - `pub struct TableMergeView { pub row: String, pub col: String, pub rows: u32, pub cols: u32 }` (`Serialize`, noms
    tels quels) ; `TableView.merges: Vec<TableMergeView>` (dernier champ) ; `TableCellView.shade: Option<String>`.
  - `pub(crate) struct Merge { pub r0: usize, pub c0: usize, pub r1: usize, pub c1: usize }` (`Debug, Clone, Copy,
    PartialEq, Eq`) avec `pub(crate) fn overlaps(&self, o: &Merge) -> bool`.
  - `pub(crate) fn merges_of<T: ReadTxn>(raw: &RawTable, txn: &T) -> Vec<Merge>` (seule source de la règle F2).
  - `RawCell` gagne `pub shade: Option<String>` et `pub span: Option<(String, String)>`.
  - `pub(crate) fn span_any(last_row: &str, last_col: &str) -> Any`.
  - `pub(crate) struct NewTableSpec<'a> { page, matrix: Transform, col_widths: Vec<f64>, row_heights: Vec<f64>, cells: &'a [String], merges: &'a [[u32; 4]], color: &'a str, size: f64 }`
    et `fn write_table(&mut self, t: &NewTableSpec<'_>) -> Result<Change, CommandError>` (privée à `table.rs`).
  - `pub(crate) struct ImportedTable<'a> { page: &'a str, matrix: Transform, col_width: f64, row_heights: &'a [f64], cols: u32, cells: &'a [String], merges: &'a [[u32; 4]], color: &'a str, size: f64 }`,
    `pub(crate) fn cmd_import_table(&mut self, t: &ImportedTable<'_>) -> Result<Change, CommandError>`.
  - `Command::ImportTable { page: String, matrix: [f64; 6], col_width: f64, row_heights: Vec<f64>, cols: u32, cells: Vec<String>, merges: Vec<[u32; 4]>, color: String, size: f64 }`.
- Réutilise : `crates/roomboard-core/src/table.rs:120`, `:157`, `:190` — `read_raw`, `read_cell`, `RawTable::view`
  étendus (lisent `span`, `shade`) ; nouvelle `merges_of(&RawTable, txn) -> Vec<Merge>`, appelée par `view` (et par les
  commandes de T2).
- Réutilise : `crates/roomboard-core/src/table.rs:343`, `:269`, `:283` — `cmd_add_table` réduit à ses contrôles puis à
  `write_table(&mut self, &NewTableSpec)` ; `line_prelim` appelée telle quelle ; `insert_cell` inchangée (T2 la touche).
- Réutilise : `crates/roomboard-core/src/commands.rs:869`, `:874`, `crates/roomboard-core/src/document.rs`
  (`transact_local`), `table.rs:333` (`table_done`) — une commande = une transaction, appelés tels quels.
- Réutilise : `crates/roomboard-core/src/rich_text.rs:54` — `valid_color` (couleur de l'ombrage, de l'import).
- Réutilise : `crates/roomboard-core/src/element.rs:148`, `:191`, `:226`, `:231` — `invert`, `transform_to_any`,
  `finite_positive`, `fits_f32` (matrice et tailles d'`ImportTable`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked|error\[|table" | tail -70
```

Attendu : aucune ligne `FAILED` ni `error[` ; toutes les lignes `test result: ok` ; les 5 tests neufs ou réécrits
présents et `ok` : `spans_become_merges_and_shades_are_read` (F1, F2, F8), `bad_or_overlapping_spans_are_ignored_and_kept`
(F2, S5, Review Focus 1), `c10b_keys_are_ignored_and_kept` (F30, effet de bord), `import_table_writes_texts_spans_and_matrix_in_one_step`
(F18, F17), `import_table_refuses_bad_input_without_writing` (F18). Tests à garder verts (carte d'impact) : tous ceux de
`table::tests` de C10a (`add_table_writes_its_shape_in_one_step`, `table_reload_keeps_bytes`…),
`table_fixture_resaves_identically`, `table_fixture_reads_as_a_filled_4x3` (`tests/tableau.rs`),
`socle_fixture_resaves_identically` (`compat_socle.rs`), `compat_grille_pr12`, `element_inconnu`, `scenarios` —
`cargo test -p roomboard-core 2>&1 | grep -E "fixture|unknown_|test result"`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .)`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle dans cette tâche ; jamais AGPL, GPL ni LGPL (U39).
- GC9 Plafond du module principal 1 572 864 o (H2-13) ni baissé ni relevé (le cœur grossit des seules commandes).
- GC10 `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; `span` = `Any::Array` de deux chaînes sur l'ancre
  seule, aucun `mergedInto` écrit ; `shade` = couleur ; les clés inconnues restent.
- GC11 `crates/` sans dépendance au navigateur ; la règle F2 vit dans `merges_of` seule.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC15 `cargo fmt --all` puis `cargo clippy -p roomboard-core --all-targets -- -D warnings` sans avertissement.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les deux fichiers ci-dessus.

**Patron à ne pas reprendre.** Écrire `mergedInto` sur les cellules couvertes, ou recalculer la couverture dans chaque
commande : une donnée dérivée écrite devient fausse dès qu'une ligne s'insère dans la zone (DAB1, F1), et deux calculs
divergent. Chemin de référence de la règle unique : `crates/roomboard-core/src/table.rs:93-117` (`lines`, lecture
tolérante qui saute sans écrire) ; la couverture se déduit **à la lecture** par `merges_of`, appelée partout.

**Interdits.** Aucune écriture pendant une lecture (`encode_v1` identique avant et après) ; ne pas toucher
`cmd_set_table_cell`, `cmd_remove_table_line`, `cmd_set_table_fill` (T2) ; ne pas changer le message `BadTable`.

**Critère « terminé ».** Commande bornée verte avec les 5 noms, clippy sans avertissement, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Dans `crates/roomboard-core/src/table.rs`, module `tests` : remplacer le test
  `c10b_keys_are_ignored_and_kept` (`:819-846`) par le bloc ci-dessous, et ajouter `shade: None` à chaque littéral
  `TableCellView { … }` des tests existants (`grep -n "TableCellView {" crates/roomboard-core/src/table.rs`).

```rust
    /// Formes invalides (`span` nombre, `shade` booléen, `mergedInto`) : ignorées et gardées ; la lecture n'écrit rien (F30).
    #[test]
    fn c10b_keys_are_ignored_and_kept() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from(TextPrelim::new("A")),
                    vec![("span", In::from(2.0)), ("shade", In::Any(Any::Bool(true)))],
                ),
            ),
            (
                "r1:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("mergedInto", In::from("r1:c1"))],
                ),
            ),
        ]);
        let d = doc_with(two_by_two(cells, vec![("shade", In::Any(Any::Bool(true)))]));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            (t.cells.len(), t.cells[0].text.as_str(), t.cells[0].shade.as_deref()),
            (1, "A", None)
        );
        assert!(t.merges.is_empty());
        assert!(
            d.encode_v1() == before,
            "la lecture a écrit dans le document"
        );
    }

    /// F1, F2, F8 : `span` lisible sur l'ancre → zone (ancre par ids, étendue en rangs) ; `shade` lu, cellule listée.
    #[test]
    fn spans_become_merges_and_shades_are_read() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from(TextPrelim::new("Lundi")),
                    vec![
                        ("span", In::Any(span_any("r1", "c2"))),
                        ("shade", In::from("#94a3b8")),
                    ],
                ),
            ),
            (
                "r2:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("shade", In::from("#94a3b8"))],
                ),
            ),
        ]);
        let d = doc_with(two_by_two(cells, vec![]));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: "r1".into(),
                col: "c1".into(),
                rows: 1,
                cols: 2
            }]
        );
        assert_eq!(
            t.cells
                .iter()
                .map(|c| (c.row.as_str(), c.col.as_str(), c.text.as_str(), c.shade.as_deref()))
                .collect::<Vec<_>>(),
            vec![
                ("r1", "c1", "Lundi", Some("#94a3b8")),
                ("r2", "c2", "", Some("#94a3b8"))
            ]
        );
        assert!(d.encode_v1() == before, "la lecture a écrit dans le document");
    }

    /// Colonnes `c1`..`c3` (100), lignes `r1`..`r3` (64).
    fn three_by_three(cells: MapPrelim) -> MapPrelim {
        table_prelim(
            vec![
                line("c1", "width", 100.0),
                line("c2", "width", 100.0),
                line("c3", "width", 100.0),
            ],
            vec![
                line("r1", "height", 64.0),
                line("r2", "height", 64.0),
                line("r3", "height", 64.0),
            ],
            cells,
            vec![],
        )
    }

    /// F2, S5 : `span` qui recoupe une zone déjà retenue, dont un id manque, qui remonte, d'une seule cellule ou mal
    /// formé : ignoré, gardé dans le document ; une seule zone retenue.
    #[test]
    fn bad_or_overlapping_spans_are_ignored_and_kept() {
        let s = |r: &str, c: &str| vec![("span", In::Any(span_any(r, c)))];
        let empty = || In::from(TextPrelim::new(""));
        let cells = MapPrelim::from([
            ("r1:c1", cell(In::from(TextPrelim::new("A")), s("r2", "c2"))),
            ("r1:c2", cell(empty(), s("r3", "c3"))),
            ("r2:c3", cell(empty(), s("r9", "c3"))),
            ("r3:c2", cell(empty(), s("r2", "c1"))),
            ("r3:c3", cell(empty(), s("r3", "c3"))),
            ("r3:c1", cell(empty(), vec![("span", In::from(2.0))])),
        ]);
        let d = doc_with(three_by_three(cells));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: "r1".into(),
                col: "c1".into(),
                rows: 2,
                cols: 2
            }]
        );
        assert!(d.encode_v1() == before, "rien d'écrit à la lecture");
    }

    fn import(
        d: &mut Document,
        merges: Vec<[u32; 4]>,
        cells: Vec<String>,
        heights: Vec<f64>,
        cols: u32,
    ) -> Result<Change, CommandError> {
        let p = d.page_ids()[0].clone();
        d.apply(Command::ImportTable {
            page: p,
            matrix: [0.5, 0.0, 0.0, 0.5, 300.0, 100.0],
            col_width: 240.0,
            row_heights: heights,
            cols,
            cells,
            merges,
            color: "#1d4ed8".into(),
            size: 36.0,
        })
    }

    /// F18 : une transaction ; ids neufs ; textes vides et couverts non écrits ; fusion en `span` sur l'ancre ; matrice
    /// reçue telle quelle ; annuler retire le tableau entier (F17).
    #[test]
    fn import_table_writes_texts_spans_and_matrix_in_one_step() {
        let mut d = Document::blank();
        let texts: Vec<String> = ["Titre", "caché", "a", "b"].map(String::from).to_vec();
        let c = import(&mut d, vec![[0, 0, 1, 2]], texts, vec![64.0, 80.0], 2).expect("import");
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!(v.transform, [0.5, 0.0, 0.0, 0.5, 300.0, 100.0]);
        let t = v.table.expect("tableau");
        assert_eq!(
            (
                t.color.as_str(),
                t.cols.len(),
                t.rows.iter().map(|r| r.height).collect::<Vec<_>>()
            ),
            ("#1d4ed8", 2, vec![64.0, 80.0])
        );
        assert!(t.cols.iter().all(|c| c.width == 240.0));
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: t.rows[0].id.clone(),
                col: t.cols[0].id.clone(),
                rows: 1,
                cols: 2
            }]
        );
        assert_eq!(
            t.cells.iter().map(|c| c.text.as_str()).collect::<Vec<_>>(),
            vec!["Titre", "a", "b"],
            "texte couvert ignoré"
        );
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
                panic!("cells")
            };
            assert_eq!(cells.len(&txn), 3, "textes vides et couverts non écrits");
            for k in cells.keys(&txn) {
                let Some(Out::YMap(m)) = cells.get(&txn, k) else {
                    panic!("cellule")
                };
                assert!(m.get(&txn, "mergedInto").is_none());
            }
        }
        assert!(d.undo());
        assert!(d.element(&id).is_none(), "une seule étape");
    }

    /// F18 : dimensions hors 1..=64, longueurs incohérentes, tailles non finies, couleur, matrice (PC1), fusion d'une
    /// cellule, hors du tableau ou qui en recoupe une autre : `BadTable` avant la page, aucune transaction.
    #[test]
    fn import_table_refuses_bad_input_without_writing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id6 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        let imp = |cols: u32,
                   heights: Vec<f64>,
                   n: usize,
                   merges: Vec<[u32; 4]>,
                   col_width: f64,
                   matrix: [f64; 6],
                   color: &str| Command::ImportTable {
            page: p.clone(),
            matrix,
            col_width,
            row_heights: heights,
            cols,
            cells: vec![String::new(); n],
            merges,
            color: color.into(),
            size: 36.0,
        };
        let w = writes(&d);
        for c in [
            imp(0, vec![64.0], 0, vec![], 240.0, id6, "#000000"),
            imp(65, vec![64.0], 65, vec![], 240.0, id6, "#000000"),
            imp(2, vec![], 0, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0; 65], 130, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 3, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, f64::NAN], 4, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![], 0.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![], 240.0, id6, "!!"),
            imp(2, vec![64.0, 64.0], 4, vec![], 240.0, [0.0; 6], "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![[0, 0, 1, 1]], 240.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![[1, 1, 2, 1]], 240.0, id6, "#000000"),
            imp(
                2,
                vec![64.0, 64.0],
                4,
                vec![[0, 0, 2, 1], [1, 0, 1, 2]],
                240.0,
                id6,
                "#000000",
            ),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(!d.can_undo());
        let mut unknown = imp(2, vec![64.0, 64.0], 4, vec![], 240.0, id6, "#000000");
        if let Command::ImportTable { page, .. } = &mut unknown {
            *page = "zz".into();
        }
        assert_eq!(d.apply(unknown), Err(CommandError::UnknownPage("zz".into())));
        assert!(d
            .apply(imp(2, vec![64.0, 64.0], 4, vec![[0, 0, 2, 2]], 240.0, id6, "#000000"))
            .is_ok());
    }
```

- [ ] **Étape 3 : les voir rouges.** `cargo test -p roomboard-core table 2>&1 | grep -E "error\[|FAILED" | head` :
  erreurs de compilation (`TableMergeView`, `span_any`, `shade`, `merges`, `ImportTable` inconnus).

- [ ] **Étape 4 : vue et lecture.** Dans `crates/roomboard-core/src/table.rs`, remplacer l'en-tête `:1-7` :

```rust
//! Tableau (U32, DAU10, C10a, DAC1 ; C10b, DAB1, DAB3) : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ;
//! `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` =
//! `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill?, shade?, span? }`, cellule absente = vide. Lecture tolérante (T2) :
//! entrée de `cols` / `rows` illisible (id vide ou contenant `:`) ou d'un id déjà vu sautée (gardée dans le document), `text` qui n'est pas un
//! `Y.Text` → vide, `fill` ou `shade` invalide → aucun, aucune ligne ou aucune colonne lisible → `None` : l'appelant se replie sur
//! `element::unknown_view` (jamais invisible). C10b : fusion = `span` `[id de la dernière ligne, id de la dernière colonne]`
//! (`Any::Array` de deux chaînes) sur l'ancre seule ; la couverture se déduit à la lecture par `merges_of` (F2), jamais
//! écrite (aucun `mergedInto`) ; `shade` = couleur d'un ombrage opaque (F8). Aucune `Any::Map`.
```

  Remplacer `TableCellView` et `TableView` (`:39-56`) :

```rust
/// Cellule non vide (texte, remplissage ou ombrage) ; `fill` = remplissage (U32), `shade` = ombrage révélable (F8).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableCellView {
    pub row: String,
    pub col: String,
    pub text: String,
    pub fill: Option<String>,
    pub shade: Option<String>,
}

/// Zone fusionnée de la vue (F29) : ancre par ids, étendue en rangs, après la règle F2.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableMergeView {
    pub row: String,
    pub col: String,
    pub rows: u32,
    pub cols: u32,
}

/// Vue d'un tableau (T13, F29) : `color` = traits et texte, `size` = taille du texte ; cellules dans l'ordre de lecture ;
/// zones dans l'ordre de lecture de leurs ancres.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableView {
    pub color: String,
    pub size: f64,
    pub cols: Vec<TableColView>,
    pub rows: Vec<TableRowView>,
    pub cells: Vec<TableCellView>,
    pub merges: Vec<TableMergeView>,
}
```

  Remplacer `RawCell` (`:78-85`) et `read_cell` (`:156-178`) :

```rust
/// Cellule lue ; `text` : son `Y.Text` s'il en est un ; `span` : `[dernière ligne, dernière colonne]` lisible (F1).
pub(crate) struct RawCell {
    pub map: MapRef,
    pub text: Option<TextRef>,
    pub content: String,
    pub fill: Option<String>,
    pub shade: Option<String>,
    pub span: Option<(String, String)>,
}
```

```rust
/// `span` lisible (F1) : `Any::Array` de deux chaînes ; toute autre forme → aucun (ignoré, gardé).
fn read_span(o: Option<Out>) -> Option<(String, String)> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    match items.as_ref() {
        [Any::String(r), Any::String(c)] => Some((r.to_string(), c.to_string())),
        _ => None,
    }
}

/// `span` à écrire sur une ancre (F1).
pub(crate) fn span_any(last_row: &str, last_col: &str) -> Any {
    Any::Array(vec![Any::String(last_row.into()), Any::String(last_col.into())].into())
}

/// Cellule `"<row>:<col>"` ; `None` si `cells` manque ou si l'entrée n'est pas un `Y.Map`.
pub(crate) fn read_cell<T: ReadTxn>(
    txn: &T,
    cells: Option<&MapRef>,
    row: &str,
    col: &str,
) -> Option<RawCell> {
    let Some(Out::YMap(map)) = cells?.get(txn, &cell_key(row, col)) else {
        return None;
    };
    let text = match map.get(txn, "text") {
        Some(Out::YText(t)) => Some(t),
        _ => None,
    };
    let content = text.as_ref().map(|t| t.get_string(txn)).unwrap_or_default();
    let fill = out_string(map.get(txn, "fill")).filter(|c| valid_color(c));
    let shade = out_string(map.get(txn, "shade")).filter(|c| valid_color(c));
    let span = read_span(map.get(txn, "span"));
    Some(RawCell {
        map,
        text,
        content,
        fill,
        shade,
        span,
    })
}

/// Zone retenue par la règle F2, en rangs des lignes et colonnes lisibles, bornes comprises.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Merge {
    pub r0: usize,
    pub c0: usize,
    pub r1: usize,
    pub c1: usize,
}

impl Merge {
    pub(crate) fn overlaps(&self, o: &Merge) -> bool {
        self.r0 <= o.r1 && o.r0 <= self.r1 && self.c0 <= o.c1 && o.c0 <= self.c1
    }
}

/// Règle de lecture des fusions (F2, DAU10), seule source de la couverture : ancres dans l'ordre de lecture (rang de
/// ligne, puis de colonne) ; un `span` est retenu si ses deux ids désignent une ligne et une colonne lisibles de rang ≥
/// celui de l'ancre, si la zone compte au moins 2 cellules et si elle ne recoupe aucune zone déjà retenue. Sinon il est
/// ignoré (gardé dans le document) et la cellule se lit comme une cellule simple.
pub(crate) fn merges_of<T: ReadTxn>(raw: &RawTable, txn: &T) -> Vec<Merge> {
    let mut out: Vec<Merge> = Vec::new();
    for (r0, r) in raw.rows.iter().enumerate() {
        for (c0, c) in raw.cols.iter().enumerate() {
            let Some((last_row, last_col)) =
                read_cell(txn, raw.cells.as_ref(), &r.id, &c.id).and_then(|cell| cell.span)
            else {
                continue;
            };
            let (Some(r1), Some(c1)) = (
                raw.rows.iter().position(|l| l.id == last_row),
                raw.cols.iter().position(|l| l.id == last_col),
            ) else {
                continue;
            };
            if r1 < r0 || c1 < c0 || (r1 == r0 && c1 == c0) {
                continue;
            }
            let m = Merge { r0, c0, r1, c1 };
            if out.iter().any(|o| o.overlaps(&m)) {
                continue;
            }
            out.push(m);
        }
    }
    out
}
```

  Remplacer `RawTable::view` (`:189-233`) :

```rust
    /// Vue (T13, F29) : cellules non vides (texte, remplissage ou ombrage) dans l'ordre de lecture, sur les seules
    /// lignes et colonnes lisibles ; zones par `merges_of`.
    pub(crate) fn view<T: ReadTxn>(&self, txn: &T) -> TableView {
        let mut cells = Vec::new();
        for r in &self.rows {
            for c in &self.cols {
                let Some(cell) = read_cell(txn, self.cells.as_ref(), &r.id, &c.id) else {
                    continue;
                };
                if cell.content.is_empty() && cell.fill.is_none() && cell.shade.is_none() {
                    continue;
                }
                cells.push(TableCellView {
                    row: r.id.clone(),
                    col: c.id.clone(),
                    text: cell.content,
                    fill: cell.fill,
                    shade: cell.shade,
                });
            }
        }
        let merges = merges_of(self, txn)
            .into_iter()
            .map(|m| TableMergeView {
                row: self.rows[m.r0].id.clone(),
                col: self.cols[m.c0].id.clone(),
                rows: (m.r1 - m.r0 + 1) as u32,
                cols: (m.c1 - m.c0 + 1) as u32,
            })
            .collect();
        TableView {
            color: self.color.clone(),
            size: self.size,
            cols: self
                .cols
                .iter()
                .map(|l| TableColView {
                    id: l.id.clone(),
                    width: l.size,
                })
                .collect(),
            rows: self
                .rows
                .iter()
                .map(|l| TableRowView {
                    id: l.id.clone(),
                    height: l.size,
                })
                .collect(),
            cells,
            merges,
        }
    }
```

- [ ] **Étape 5 : corps d'écriture partagé et `ImportTable`.** Toujours dans `table.rs`, ajouter l'import
  `invert` à la ligne `use crate::element::{…}` (`finite_positive, fits_f32, invert, out_f64, out_string, out_transform, transform_to_any, Transform`),
  ajouter `use std::collections::HashMap;` à côté de `HashSet`, puis après `struct NewTable` (`:260`) :

```rust
/// Corps d'écriture commun d'`AddTable` et d'`ImportTable` (DAB3), entrées déjà contrôlées.
pub(crate) struct NewTableSpec<'a> {
    pub page: &'a str,
    pub matrix: Transform,
    pub col_widths: Vec<f64>,
    pub row_heights: Vec<f64>,
    /// `rows × cols` textes en rangées bout à bout ; vide : aucune cellule écrite.
    pub cells: &'a [String],
    /// `[rang de ligne, rang de colonne, lignes, colonnes]`, contrôlées (dans le tableau, sans recouvrement).
    pub merges: &'a [[u32; 4]],
    pub color: &'a str,
    pub size: f64,
}

/// Entrée d'`ImportTable` (F18) : collage HTML ou classeur, déjà mesuré et placé par la page.
pub(crate) struct ImportedTable<'a> {
    pub page: &'a str,
    pub matrix: Transform,
    pub col_width: f64,
    pub row_heights: &'a [f64],
    pub cols: u32,
    pub cells: &'a [String],
    pub merges: &'a [[u32; 4]],
    pub color: &'a str,
    pub size: f64,
}

/// Fusions d'un import (F18) : au moins 2 cellules, dans le tableau, sans recouvrement.
fn merges_ok(merges: &[[u32; 4]], rows: u32, cols: u32) -> bool {
    let mut seen: Vec<Merge> = Vec::new();
    for &[r, c, nr, nc] in merges {
        let (r, c, nr, nc) = (
            u64::from(r),
            u64::from(c),
            u64::from(nr),
            u64::from(nc),
        );
        if nr == 0 || nc == 0 || nr * nc < 2 || r + nr > u64::from(rows) || c + nc > u64::from(cols)
        {
            return false;
        }
        let m = Merge {
            r0: r as usize,
            c0: c as usize,
            r1: (r + nr - 1) as usize,
            c1: (c + nc - 1) as usize,
        };
        if seen.iter().any(|o| o.overlaps(&m)) {
            return false;
        }
        seen.push(m);
    }
    true
}
```

  Dans `impl Document` (`table.rs:320-`), remplacer `cmd_add_table` (`:341-381`) par :

```rust
    /// Écrit un tableau neuf en une transaction (DAB3) : ids neufs ; textes vides et cellules couvertes non écrits ;
    /// une fusion = `span` sur son ancre (F1). Page inconnue : `UnknownPage`.
    fn write_table(&mut self, t: &NewTableSpec<'_>) -> Result<Change, CommandError> {
        let elements = self.page_elements_or_err(t.page)?;
        let id = yrs::uuid_v4().to_string();
        let col_ids: Vec<String> = t
            .col_widths
            .iter()
            .map(|_| yrs::uuid_v4().to_string())
            .collect();
        let row_ids: Vec<String> = t
            .row_heights
            .iter()
            .map(|_| yrs::uuid_v4().to_string())
            .collect();
        let cols: Vec<In> = col_ids
            .iter()
            .zip(&t.col_widths)
            .map(|(i, w)| In::Map(line_prelim(i, "width", *w)))
            .collect();
        let rows: Vec<In> = row_ids
            .iter()
            .zip(&t.row_heights)
            .map(|(i, h)| In::Map(line_prelim(i, "height", *h)))
            .collect();
        let ncols = col_ids.len();
        let mut covered = vec![false; t.cells.len()];
        let mut anchors: HashMap<usize, (usize, usize)> = HashMap::new();
        for m in t.merges {
            let [r, c, nr, nc] = m.map(|v| v as usize);
            anchors.insert(r * ncols + c, (r + nr - 1, c + nc - 1));
            for rr in r..r + nr {
                for cc in c..c + nc {
                    if (rr, cc) != (r, c) {
                        covered[rr * ncols + cc] = true;
                    }
                }
            }
        }
        let mut cells: Vec<(String, In)> = Vec::new();
        for (i, text) in t.cells.iter().enumerate() {
            let span = anchors.get(&i);
            if covered[i] || (text.is_empty() && span.is_none()) {
                continue;
            }
            let mut fields: Vec<(&str, In)> =
                vec![("text", In::from(TextPrelim::new(text.as_str())))];
            if let Some(&(lr, lc)) = span {
                fields.push(("span", In::Any(span_any(&row_ids[lr], &col_ids[lc]))));
            }
            cells.push((
                cell_key(&row_ids[i / ncols], &col_ids[i % ncols]),
                In::Map(fields.into_iter().collect::<MapPrelim>()),
            ));
        }
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(TABLE_KIND)),
            ("transform", In::Any(transform_to_any(&t.matrix))),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(t.size))),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(cells.into_iter().collect::<MapPrelim>())),
        ];
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.table_done(t.page.to_string(), &id))
    }

    /// `AddTable` (T3) : refus `BadTable` avant la page, x, y et la boîte bornés en f32 comme une forme ; une
    /// transaction, cellules vides (`cells` = `Y.Map` vide).
    pub(crate) fn cmd_add_table(&mut self, t: &NewTable<'_>) -> Result<Change, CommandError> {
        let valid = lines_ok(t.cols)
            && lines_ok(t.rows)
            && finite_positive(t.col_width)
            && finite_positive(t.row_height)
            && finite_positive(t.size)
            && fits_f32(&[
                t.x,
                t.y,
                f64::from(t.cols) * t.col_width,
                f64::from(t.rows) * t.row_height,
            ])
            && valid_color(t.color);
        if !valid {
            return Err(CommandError::BadTable);
        }
        self.write_table(&NewTableSpec {
            page: t.page,
            matrix: [1.0, 0.0, 0.0, 1.0, t.x, t.y],
            col_widths: vec![t.col_width; t.cols as usize],
            row_heights: vec![t.row_height; t.rows as usize],
            cells: &[],
            merges: &[],
            color: t.color,
            size: t.size,
        })
    }

    /// `ImportTable` (F18) : refus `BadTable` avant la page (dimensions 1..=64, `cells` = `rows × cols`, tailles finies
    /// > 0, couleur, matrice finie inversible et bornée en f32 avec la boîte, fusions valides) ; une transaction.
    pub(crate) fn cmd_import_table(&mut self, t: &ImportedTable<'_>) -> Result<Change, CommandError> {
        let rows = u32::try_from(t.row_heights.len()).unwrap_or(u32::MAX);
        let valid = lines_ok(t.cols)
            && lines_ok(rows)
            && t.cells.len() as u64 == u64::from(t.cols) * u64::from(rows)
            && finite_positive(t.col_width)
            && t.row_heights.iter().all(|h| finite_positive(*h))
            && finite_positive(t.size)
            && valid_color(t.color)
            && t.matrix.iter().all(|v| v.is_finite())
            && invert(&t.matrix).is_some()
            && fits_f32(&t.matrix)
            && fits_f32(&[
                f64::from(t.cols) * t.col_width,
                t.row_heights.iter().sum(),
            ])
            && merges_ok(t.merges, rows, t.cols);
        if !valid {
            return Err(CommandError::BadTable);
        }
        self.write_table(&NewTableSpec {
            page: t.page,
            matrix: t.matrix,
            col_widths: vec![t.col_width; t.cols as usize],
            row_heights: t.row_heights.to_vec(),
            cells: t.cells,
            merges: t.merges,
            color: t.color,
            size: t.size,
        })
    }
```

- [ ] **Étape 6 : la commande.** Dans `crates/roomboard-core/src/commands.rs`, après la variante `SetTableFill` (`:148`) :

```rust
    /// Tableau rempli (C10b, F18) : collage HTML ou classeur ; `cells` = `rows × cols` textes en rangées bout à bout,
    /// `merges` = `[rang de ligne, rang de colonne, lignes, colonnes]` ; une transaction, une étape.
    ImportTable {
        page: String,
        matrix: [f64; 6],
        col_width: f64,
        row_heights: Vec<f64>,
        cols: u32,
        cells: Vec<String>,
        merges: Vec<[u32; 4]>,
        color: String,
        size: f64,
    },
```

  Et dans `apply`, après le bras `Command::SetTableFill` (`:572`) :

```rust
            Command::ImportTable {
                page,
                matrix,
                col_width,
                row_heights,
                cols,
                cells,
                merges,
                color,
                size,
            } => self.cmd_import_table(&crate::table::ImportedTable {
                page: &page,
                matrix,
                col_width,
                row_heights: &row_heights,
                cols,
                cells: &cells,
                merges: &merges,
                color: &color,
                size,
            }),
```

- [ ] **Étape 7 : vert, format, clippy.** La commande bornée ; puis `cargo fmt --all` et
  `cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)" | head` (rien).

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/table.rs && git add crates/roomboard-core/src/commands.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): read table merges and shades, add ImportTable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : les 5 noms vus, N, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t2"></a>

### Tâche T2 — Cœur : fusionner, diviser, ombrer, plages, report des zones, fixture

**Objectif.** Les commandes de structure C10b du cœur, une transaction chacune (F17) : `MergeTableCells` (F3),
`SplitTableCell` (F4), `SetTableShade` (F9), `RemoveTableLine.to` avec report des `span` (F6), `SetTableFill.to` (F15),
`SetTableCell.row_height` sur une ancre de plusieurs lignes (F7). Une insertion dans une zone l'agrandit sans code (F5,
test). Test « recharger garde les octets » avec fusion et ombrage, fixture `tableau-fusion-ombrage.roomboard` (F30, S3).

**Fichiers.**
- Modifier : `crates/roomboard-core/src/table.rs` (`Merge` complété, `insert_cell` → `cells_map` + `insert_cell`,
  `cell_row` retirée, `cmd_set_table_cell`, `cmd_remove_table_line`, `cmd_set_table_fill`, commandes neuves, tests)
- Modifier : `crates/roomboard-core/src/commands.rs:130-149` (champs `to`, trois variantes), `:561-572` (bras)
- Modifier : `crates/roomboard-core/tests/tableau.rs:70-76` (`to: None`)
- Modifier : `crates/roomboard-wasm/src/lib.rs:917-956` (`to: None` dans `remove_table_line_inner` et `set_table_fill_inner`)
- Créer : `crates/roomboard-core/tests/tableau_fusion.rs`, `crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard`

**Interfaces.**
- Consomme (T1) : `Merge`, `merges_of`, `span_any`, `RawCell.{shade, span}`, `TableMergeView`, `TableView.merges`,
  `TableCellView.shade`, `cmd_import_table`.
- Produit (lu par T7) :

```rust
Command::RemoveTableLine { id: String, axis: TableAxis, line: String, to: Option<String> }
Command::SetTableFill { id: String, row: String, col: String, to: Option<(String, String)>, fill: Option<String> }
Command::MergeTableCells { id: String, from: (String, String), to: (String, String) }
Command::SplitTableCell { id: String, row: String, col: String }
Command::SetTableShade { id: String, from: (String, String), to: (String, String), shade: Option<String> }
// table.rs, impl Document :
pub(crate) fn cmd_remove_table_line(&mut self, id: &str, axis: TableAxis, line: &str, to: Option<&str>) -> Result<Change, CommandError>;
pub(crate) fn cmd_set_table_fill(&mut self, id: &str, from: (&str, &str), to: Option<(&str, &str)>, fill: Option<&str>) -> Result<Change, CommandError>;
pub(crate) fn cmd_merge_table_cells(&mut self, id: &str, from: (&str, &str), to: (&str, &str)) -> Result<Change, CommandError>;
pub(crate) fn cmd_split_table_cell(&mut self, id: &str, cell: (&str, &str)) -> Result<Change, CommandError>;
pub(crate) fn cmd_set_table_shade(&mut self, id: &str, from: (&str, &str), to: (&str, &str), shade: Option<&str>) -> Result<Change, CommandError>;
```

- Réutilise : `crates/roomboard-core/src/table.rs` (module de DAC1, aucun module de fusion existant) —
  `cmd_merge_table_cells(id, from: (&str, &str), to: (&str, &str))`, `cmd_split_table_cell(id, (row, col))`,
  `cmd_set_table_shade(id, from, to, shade: Option<&str>)`, écrites dans `table.rs` à côté des commandes de C10a.
- Réutilise : `crates/roomboard-core/src/table.rs:469`, `:545` — `cmd_remove_table_line(id, axis, line, to: Option<&str>)`,
  `cmd_set_table_fill(id, from, to: Option<(&str, &str)>, fill)` étendues.
- Réutilise : `crates/roomboard-core/src/commands.rs:869`, `:874`, `table.rs:333` — `done`, `unchanged`, `table_done`,
  `transact_local` : une commande = une étape, aucune étape vide (D38).
- Réutilise : `crates/roomboard-core/src/rich_text.rs` — `apply_text_diff` (texte d'une cellule, `cmd_set_table_cell`
  inchangé sur ce point), `valid_color` (couleur de l'ombrage).
- Réutilise : `crates/roomboard-core/src/table.rs:1319` (`table_reload_keeps_bytes`), `tests/tableau.rs` — mêmes patrons
  pour `c10b_table_reload_keeps_bytes` et la fixture régénérable.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|panicked|error\[|merge|shade|split|fusion|remove_lines|reload|insert_line_inside|tall_merge|fill_range" | tail -70 && \
cargo test -p roomboard-wasm table 2>&1 | grep -E "test result|FAILED|error\[" | tail -5
```

Attendu : aucune ligne `FAILED` ni `error[` ; `ok` pour les 11 tests neufs :
`merge_keeps_the_top_left_content_in_one_step` (F3, F17), `merge_refuses_one_cell_unknown_lines_and_partial_overlap`
(F3, Review Focus 1), `merge_dissolves_inner_merges_and_an_identical_merge_is_no_step` (F3, PC10),
`split_removes_the_span_and_refuses_a_non_anchor` (F4, HB-21), `shade_sets_the_anchors_of_a_range_and_reveal_is_one_step`
(F9, F12, S1), `fill_range_paints_anchors_and_simple_cells` (F15), `remove_lines_moves_or_trims_the_merges_they_touch`
(F6, S5, Review Focus 2), `insert_line_inside_a_merge_grows_it` (F5, S5), `set_cell_on_a_tall_merge_grows_its_last_row`
(F7, effet de bord), `c10b_table_reload_keeps_bytes` (S3, F30), `fusion_fixture_resaves_identically` (F30) — plus
`fusion_fixture_reads_one_merge_and_three_shades`. `cargo test -p roomboard-wasm table` : 3 tests `ok`
(`add_table_inner_creates_and_refuses`, `table_cell_line_size_fill_inner`, `table_inner_refuses_with_core_errors`). À
garder verts (carte d'impact : « `RemoveTableLine` et `SetTableFill` gagnent un champ facultatif ») : tous les tests
C10a de `table::tests` (`remove_line_drops_its_cells_and_keeps_the_last_one`, `set_fill_sets_skips_and_clears`,
`set_cell_writes_text_and_grows_only_its_row`…), `table_fixture_resaves_identically`, `compat_socle`, `scenarios`.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .)`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle dans cette tâche ; jamais AGPL, GPL ni LGPL (U39).
- GC9 Plafond du module principal 1 572 864 o (H2-13) ni baissé ni relevé.
- GC10 `schema` et `formatVersion` restent 1 ; aucune `Any::Map` ; `span` = `Any::Array` de deux chaînes sur l'ancre
  seule, aucun `mergedInto` écrit ; `shade` = couleur ; une commande n'écrit que les clés qu'elle change.
- GC11 La couverture se lit par `merges_of` seule (aucun second calcul de la règle F2).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC15 `cargo fmt --all` puis `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` sans avertissement.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les fichiers ci-dessus ; dans `crates/roomboard-wasm/src/lib.rs`, seulement `to: None`.

**Patron à ne pas reprendre.** Calculer la couverture dans chaque commande (une boucle « cellule couverte ? » par
commande) ou faire suivre les cellules couvertes par un `mergedInto` : T1 a posé une seule règle (`merges_of`,
`crates/roomboard-core/src/table.rs`, fonction écrite en T1) que chaque commande lit avant d'écrire. Le report des zones
au retrait d'une ligne (F6) se calcule **avant** la transaction, sur les rangs lus, puis s'écrit dans la même
transaction que le retrait (patron : `cmd_remove_table_line`, `table.rs:469-503`, clés lues puis retirées).

**Interdits.** Aucun avertissement à l'utilisateur dans le cœur ; ne pas changer le message `BadTable` ; ne rien ajouter
d'autre que `to: None` dans `crates/roomboard-wasm/src/lib.rs` (T7 l'étend).

**Critère « terminé ».** Commande bornée verte avec les 12 noms, fixture commitée, clippy propre, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Dans le module `tests` de `crates/roomboard-core/src/table.rs`, après les tests de
  T1 ; ajouter `to: None` aux `Command::RemoveTableLine { … }` et `Command::SetTableFill { … }` existants du module
  (`grep -n "RemoveTableLine {\|SetTableFill {" crates/roomboard-core/src/table.rs`).

```rust
    fn ids(t: &TableView) -> (Vec<String>, Vec<String>) {
        (
            t.rows.iter().map(|r| r.id.clone()).collect(),
            t.cols.iter().map(|c| c.id.clone()).collect(),
        )
    }

    fn merge(
        d: &mut Document,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
    ) -> Result<Change, CommandError> {
        d.apply(Command::MergeTableCells {
            id: id.into(),
            from: (from.0.into(), from.1.into()),
            to: (to.0.into(), to.1.into()),
        })
    }

    fn shade(
        d: &mut Document,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        s: Option<&str>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetTableShade {
            id: id.into(),
            from: (from.0.into(), from.1.into()),
            to: (to.0.into(), to.1.into()),
            shade: s.map(str::to_string),
        })
    }

    fn rm_rows(d: &mut Document, id: &str, line: &str, to: Option<&str>) -> Result<Change, CommandError> {
        d.apply(Command::RemoveTableLine {
            id: id.into(),
            axis: TableAxis::Row,
            line: line.into(),
            to: to.map(str::to_string),
        })
    }

    fn mv(row: &str, col: &str, rows: u32, cols: u32) -> TableMergeView {
        TableMergeView {
            row: row.into(),
            col: col.into(),
            rows,
            cols,
        }
    }

    /// F3 : « le contenu en haut à gauche reste » ; texte et remplissage des couvertes retirés ; une étape (F17).
    #[test]
    fn merge_keeps_the_top_left_content_in_one_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        for (i, row) in r.iter().enumerate() {
            for (j, col) in c.iter().enumerate() {
                set(&mut d, &id, row, col, &format!("L{i}C{j}"), None).expect("texte");
            }
        }
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: r[0].clone(),
            col: c[1].clone(),
            to: None,
            fill: Some("#fef08a".into()),
        })
        .expect("jaune");
        let before = view(&d, &id);
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[1])).expect("fusion");
        let t = view(&d, &id);
        assert_eq!(t.merges, vec![mv(&r[0], &c[0], 2, 2)]);
        assert_eq!(
            t.cells.iter().map(|x| x.text.as_str()).collect::<Vec<_>>(),
            vec!["L0C0", "L0C2", "L1C2"]
        );
        assert!(t.cells.iter().all(|x| x.fill.is_none()), "remplissage couvert retiré");
        assert!(d.undo());
        assert_eq!(view(&d, &id), before, "une étape : l'annulation rend les couvertes");
    }

    /// F3 : moins de 2 cellules, ligne inconnue, recouvrement partiel d'une zone : `BadTable`, aucune écriture.
    #[test]
    fn merge_refuses_one_cell_unknown_lines_and_partial_overlap() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone verticale");
        let w = writes(&d);
        let cases: [((&str, &str), (&str, &str)); 3] = [
            ((&r[2], &c[2]), (&r[2], &c[2])),
            ((&r[0], &c[1]), ("absente", &c[2])),
            ((&r[1], &c[0]), (&r[2], &c[1])),
        ];
        for (from, to) in cases {
            assert_eq!(merge(&mut d, &id, from, to), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0);
    }

    /// F3, PC10 : une zone entièrement dedans est dissoute ; la même zone redemandée sans couverte à vider : aucune étape.
    #[test]
    fn merge_dissolves_inner_merges_and_an_identical_merge_is_no_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        let w = writes(&d);
        let v = d.version();
        assert_eq!(
            merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("même").version,
            v
        );
        assert_eq!(w.since(), 0);
        merge(&mut d, &id, (&r[1], &c[2]), (&r[0], &c[0])).expect("plus grande");
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 2, 3)]);
    }

    /// F4, HB-21 : diviser retire le `span` ; le texte reste en haut à gauche ; une cellule qui n'est pas une ancre : refus.
    #[test]
    fn split_removes_the_span_and_refuses_a_non_anchor() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Lundi", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        let split = |d: &mut Document, row: &str, col: &str| {
            d.apply(Command::SplitTableCell {
                id: id.clone(),
                row: row.into(),
                col: col.into(),
            })
        };
        assert_eq!(split(&mut d, &r[0], &c[1]), Err(CommandError::BadTable));
        assert_eq!(split(&mut d, &r[1], &c[2]), Err(CommandError::BadTable));
        split(&mut d, &r[0], &c[0]).expect("division");
        let t = view(&d, &id);
        assert!(t.merges.is_empty());
        assert_eq!(
            t.cells.iter().map(|x| (x.col.as_str(), x.text.as_str())).collect::<Vec<_>>(),
            vec![(c[0].as_str(), "Lundi")]
        );
        assert!(d.undo());
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 1, 2)]);
    }

    /// F9, F12, S1 : ombrer une colonne (trois cellules) ; une zone dans la plage : son ancre seule ; rien à changer :
    /// aucune étape ; révéler une cellule : une étape, l'annulation la remet ; couleur invalide : refus.
    #[test]
    fn shade_sets_the_anchors_of_a_range_and_reveal_is_one_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8")).expect("colonne");
        shade(&mut d, &id, (&r[0], &c[1]), (&r[0], &c[1]), Some("#94a3b8")).expect("zone");
        let shaded = |d: &Document| {
            view(d, &id)
                .cells
                .iter()
                .filter(|x| x.shade.is_some())
                .map(|x| (x.row.clone(), x.col.clone()))
                .collect::<Vec<_>>()
        };
        assert_eq!(
            shaded(&d),
            vec![
                (r[0].clone(), c[0].clone()),
                (r[0].clone(), c[2].clone()),
                (r[1].clone(), c[2].clone()),
                (r[2].clone(), c[2].clone())
            ]
        );
        let w = writes(&d);
        let v = d.version();
        assert_eq!(
            shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8"))
                .expect("même")
                .version,
            v
        );
        assert_eq!(w.since(), 0);
        shade(&mut d, &id, (&r[0], &c[2]), (&r[0], &c[2]), None).expect("révélée");
        assert_eq!(shaded(&d).len(), 3);
        assert!(d.undo());
        assert_eq!(shaded(&d).len(), 4, "annuler : il revient (S11)");
        assert_eq!(
            shade(&mut d, &id, (&r[0], &c[2]), (&r[0], &c[2]), Some("pas une couleur !")),
            Err(CommandError::BadTable)
        );
    }

    /// F15 : une pastille sur une plage remplit les ancres et les cellules simples, en une étape.
    #[test]
    fn fill_range_paints_anchors_and_simple_cells() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: r[0].clone(),
            col: c[0].clone(),
            to: Some((r[1].clone(), c[1].clone())),
            fill: Some("#bbf7d0".into()),
        })
        .expect("vert");
        let filled: Vec<(String, String)> = view(&d, &id)
            .cells
            .iter()
            .filter(|x| x.fill.is_some())
            .map(|x| (x.row.clone(), x.col.clone()))
            .collect();
        assert_eq!(
            filled,
            vec![
                (r[0].clone(), c[0].clone()),
                (r[0].clone(), c[1].clone()),
                (r[1].clone(), c[1].clone())
            ]
        );
        assert!(d.undo());
        assert!(view(&d, &id).cells.iter().all(|x| x.fill.is_none()));
    }

    /// F6, S5, HB-20 : ligne d'ancrage retirée → la zone glisse sur la première ligne restante (le contenu de l'ancre
    /// part avec sa ligne) ; dernière ligne retirée → zone ramenée ; une seule cellule restante → plus de zone ; plage
    /// de deux lignes = une étape ; tout retirer : refus. Même règle pour les colonnes.
    #[test]
    fn remove_lines_moves_or_trims_the_merges_they_touch() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 4);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Haut", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[2], &c[0])).expect("zone");
        rm_rows(&mut d, &id, &r[0], None).expect("ligne d'ancrage");
        let t = view(&d, &id);
        assert_eq!(t.merges, vec![mv(&r[1], &c[0], 2, 1)]);
        assert!(t.cells.iter().all(|x| x.text != "Haut"));
        rm_rows(&mut d, &id, &r[2], None).expect("fin de zone");
        assert!(view(&d, &id).merges.is_empty(), "une seule cellule : plus de zone");
        assert!(d.undo() && d.undo());
        let before = view(&d, &id);
        rm_rows(&mut d, &id, &r[2], Some(r[1].as_str())).expect("plage");
        let t = view(&d, &id);
        assert_eq!(
            t.rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
            vec![r[0].clone(), r[3].clone()]
        );
        assert!(t.merges.is_empty());
        assert!(d.undo());
        assert_eq!(view(&d, &id), before, "plage de deux lignes : une étape");
        rm_rows(&mut d, &id, &r[0], Some(r[2].as_str())).expect("zone entière");
        assert!(view(&d, &id).merges.is_empty());
        assert_eq!(
            rm_rows(&mut d, &id, &r[3], Some(r[3].as_str())).map(|_| ()),
            Err(CommandError::BadTable),
            "plus aucune ligne"
        );
        assert_eq!(rm_rows(&mut d, &id, &r[3], Some("absente")), Err(CommandError::BadTable));
        let id2 = add(&mut d, 4, 1);
        let (r2, c2) = ids(&view(&d, &id2));
        merge(&mut d, &id2, (&r2[0], &c2[0]), (&r2[0], &c2[2])).expect("zone large");
        d.apply(Command::RemoveTableLine {
            id: id2.clone(),
            axis: TableAxis::Col,
            line: c2[0].clone(),
            to: None,
        })
        .expect("colonne d'ancrage");
        assert_eq!(view(&d, &id2).merges, vec![mv(&r2[0], &c2[1], 1, 2)]);
    }

    /// F5, S5 : une ligne insérée entre l'ancre et la fin d'une zone l'agrandit (aucun code : plage par ids).
    #[test]
    fn insert_line_inside_a_merge_grows_it() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        d.apply(Command::InsertTableLine {
            id: id.clone(),
            axis: TableAxis::Row,
            at: 1,
        })
        .expect("ligne");
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 3, 1)]);
    }

    /// F7 : sur une ancre de deux lignes, la hauteur exigée vaut pour la zone, la dernière ligne grandit ; plus petite :
    /// rien ; cellule simple : comme C10a.
    #[test]
    fn set_cell_on_a_tall_merge_grows_its_last_row() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        set(&mut d, &id, &r[0], &c[0], "long", Some(200.0)).expect("haute");
        let h = |d: &Document| view(d, &id).rows.iter().map(|x| x.height).collect::<Vec<_>>();
        assert_eq!(h(&d), vec![64.0, 136.0, 64.0]);
        let v = d.version();
        assert_eq!(set(&mut d, &id, &r[0], &c[0], "long", Some(100.0)).expect("plus petite").version, v);
        set(&mut d, &id, &r[2], &c[1], "x", Some(90.0)).expect("simple");
        assert_eq!(h(&d), vec![64.0, 136.0, 90.0]);
    }

    /// S3, F30 : enregistrer, recharger, réenregistrer un tableau avec fusion et ombrage : mêmes octets, même vue.
    #[test]
    fn c10b_table_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let id = add(&mut d, 4, 3);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Lundi", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8")).expect("ombre");
        let want = view(&d, &id);
        assert_eq!((want.merges.len(), want.cells.iter().filter(|x| x.shade.is_some()).count()), (1, 3));
        let file =
            save(&load(&save(&d, &meta).expect("save")).expect("load"), &meta).expect("resave");
        for i in 0..30 {
            let back = load(&file).expect("load");
            assert_eq!(view(&back, &id), want, "vue au rechargement {i}");
            assert!(save(&back, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
        }
    }
```

  Créer `crates/roomboard-core/tests/tableau_fusion.rs` :

```rust
//! Fixture `tableau-fusion-ombrage.roomboard` (C10b, F30) : un 4 × 3, « Lundi » fusionné sur deux colonnes, la
//! troisième colonne ombrée, écrit par `format::save` après un rechargement (aucun historique). Régénérée par
//! `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau_fusion -- --test-threads=1`.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/tableau-fusion-ombrage.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn build() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page: p,
            x: 100.0,
            y: 100.0,
            cols: 4,
            rows: 3,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    let (r, c) = (
        t.rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
        t.cols.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
    );
    d.apply(Command::SetTableCell {
        id: id.clone(),
        row: r[0].clone(),
        col: c[0].clone(),
        content: "Lundi".into(),
        row_height: None,
    })
    .expect("texte");
    d.apply(Command::MergeTableCells {
        id: id.clone(),
        from: (r[0].clone(), c[0].clone()),
        to: (r[0].clone(), c[1].clone()),
    })
    .expect("fusion");
    d.apply(Command::SetTableShade {
        id,
        from: (r[0].clone(), c[2].clone()),
        to: (r[2].clone(), c[2].clone()),
        shade: Some("#94a3b8".into()),
    })
    .expect("ombre");
    d
}

fn bytes() -> Vec<u8> {
    let path = fixture();
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        let once = load(&save(&build(), &meta()).expect("save")).expect("load");
        std::fs::write(&path, save(&once, &meta()).expect("resave")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture tableau-fusion-ombrage.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau_fusion -- --test-threads=1",
    )
}

#[test]
fn fusion_fixture_resaves_identically() {
    let b = bytes();
    let d = load(&b).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == b);
}

#[test]
fn fusion_fixture_reads_one_merge_and_three_shades() {
    let d = load(&bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let id = d
        .element_ids(&p)
        .into_iter()
        .find(|e| d.element(e).is_some_and(|v| v.kind == "table"))
        .expect("un tableau");
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    assert_eq!((t.cols.len(), t.rows.len(), t.merges.len()), (4, 3, 1));
    assert_eq!((t.merges[0].rows, t.merges[0].cols), (1, 2));
    assert_eq!(t.cells.iter().filter(|c| c.shade.is_some()).count(), 3);
    assert_eq!(t.cells[0].text, "Lundi");
}
```

- [ ] **Étape 3 : les voir rouges.** `cargo test -p roomboard-core 2>&1 | grep -E "error\[" | head` : variantes et
  champs `to` inconnus.

- [ ] **Étape 4 : les commandes.** Dans `crates/roomboard-core/src/commands.rs`, remplacer `RemoveTableLine` et
  `SetTableFill` (`:130-148`) et ajouter trois variantes :

```rust
    /// Lignes ou colonnes `line` à `to` (ids, `to` compris, dans l'ordre des rangs ; `None` : `line` seule) retirées avec
    /// leurs cellules, zones touchées reportées (C10b, F6) ; refusé s'il ne resterait aucune ligne.
    RemoveTableLine {
        id: String,
        axis: crate::table::TableAxis,
        line: String,
        to: Option<String>,
    },
    /// Uniformiser (T11) : toutes les colonnes à `col_width`, toutes les lignes à `row_height` (peut réduire).
    SetTableSizes {
        id: String,
        col_width: f64,
        row_height: f64,
    },
    /// Remplissage (U32) de la cellule, ou de la plage jusqu'à `to` (C10b, F15) ; une cellule couverte vaut pour son
    /// ancre ; `None` le retire.
    SetTableFill {
        id: String,
        row: String,
        col: String,
        to: Option<(String, String)>,
        fill: Option<String>,
    },
    /// Fusion (C10b, F3) : rectangle `from`–`to` (ids, normalisé par les rangs) ; l'ancre garde son contenu, les
    /// couvertes sont retirées, les zones dedans dissoutes ; recouvrement partiel ou moins de 2 cellules : `BadTable`.
    MergeTableCells {
        id: String,
        from: (String, String),
        to: (String, String),
    },
    /// Division (C10b, F4) : retire le `span` de l'ancre ; une cellule qui n'est pas une ancre : `BadTable`.
    SplitTableCell { id: String, row: String, col: String },
    /// Ombrage (C10b, F9) : `shade` posé (couleur) ou retiré sur les ancres et cellules simples du rectangle.
    SetTableShade {
        id: String,
        from: (String, String),
        to: (String, String),
        shade: Option<String>,
    },
```

  Dans `apply`, remplacer les bras `RemoveTableLine` et `SetTableFill` (`:562-572`) et ajouter :

```rust
            Command::RemoveTableLine { id, axis, line, to } => {
                self.cmd_remove_table_line(&id, axis, &line, to.as_deref())
            }
            Command::SetTableSizes {
                id,
                col_width,
                row_height,
            } => self.cmd_set_table_sizes(&id, col_width, row_height),
            Command::SetTableFill {
                id,
                row,
                col,
                to,
                fill,
            } => self.cmd_set_table_fill(
                &id,
                (row.as_str(), col.as_str()),
                to.as_ref().map(|(r, c)| (r.as_str(), c.as_str())),
                fill.as_deref(),
            ),
            Command::MergeTableCells { id, from, to } => self.cmd_merge_table_cells(
                &id,
                (from.0.as_str(), from.1.as_str()),
                (to.0.as_str(), to.1.as_str()),
            ),
            Command::SplitTableCell { id, row, col } => {
                self.cmd_split_table_cell(&id, (row.as_str(), col.as_str()))
            }
            Command::SetTableShade {
                id,
                from,
                to,
                shade,
            } => self.cmd_set_table_shade(
                &id,
                (from.0.as_str(), from.1.as_str()),
                (to.0.as_str(), to.1.as_str()),
                shade.as_deref(),
            ),
```

  Dans `crates/roomboard-core/tests/tableau.rs:70` et `crates/roomboard-wasm/src/lib.rs` (`remove_table_line_inner`,
  `set_table_fill_inner`), ajouter `to: None,` au littéral de la commande, rien d'autre.

- [ ] **Étape 5 : aides de `table.rs`.** Compléter `impl Merge` (T1) :

```rust
    pub(crate) fn contains(&self, r: usize, c: usize) -> bool {
        (self.r0..=self.r1).contains(&r) && (self.c0..=self.c1).contains(&c)
    }

    /// `self` entièrement dans `o`.
    pub(crate) fn inside(&self, o: &Merge) -> bool {
        o.r0 <= self.r0 && self.r1 <= o.r1 && o.c0 <= self.c0 && self.c1 <= o.c1
    }
```

  Remplacer `insert_cell` (`:281-302`) par deux fonctions, et retirer `RawTable::cell_row` (`:313-319`, plus appelée) :

```rust
/// `cells` du tableau : le `Y.Map` lu, sinon un neuf posé sur l'élément (PC12 de C10a). Une fois par transaction.
fn cells_map(txn: &mut TransactionMut, e: &MapRef, cells: Option<&MapRef>) -> MapRef {
    match cells {
        Some(m) => m.clone(),
        None => e.insert(txn, "cells", MapPrelim::default()),
    }
}

/// Cellule absente posée en `Y.Map{ text, …fields }`.
fn insert_cell(
    txn: &mut TransactionMut,
    cells: &MapRef,
    key: String,
    text: &str,
    fields: Vec<(&str, In)>,
) -> MapRef {
    let mut all: Vec<(&str, In)> = vec![("text", In::from(TextPrelim::new(text)))];
    all.extend(fields);
    cells.insert(txn, key, all.into_iter().collect::<MapPrelim>())
}

/// Ancres et cellules simples du rectangle, dans l'ordre de lecture, sans doublon (F9, F15, PC11).
fn targets(rect: &Merge, merges: &[Merge]) -> Vec<(usize, usize)> {
    let mut out = Vec::new();
    for r in rect.r0..=rect.r1 {
        for c in rect.c0..=rect.c1 {
            let a = merges
                .iter()
                .find(|m| m.contains(r, c))
                .map_or((r, c), |m| (m.r0, m.c0));
            if !out.contains(&a) {
                out.push(a);
            }
        }
    }
    out
}

/// Report d'une zone au retrait de lignes (F6), calculé avant la transaction.
enum SpanMove {
    Set {
        key: String,
        last_row: String,
        last_col: String,
    },
    Clear {
        key: String,
    },
}

/// F6 : pour chaque zone touchée par le retrait des rangs `a..=b` de l'axe : ancre retirée → `span` sur la première
/// ligne restante ; fin retirée → `span` ramené ; une seule cellule restante → `span` retiré ; tout retiré → rien.
fn span_moves(raw: &RawTable, merges: &[Merge], axis: TableAxis, a: usize, b: usize) -> Vec<SpanMove> {
    let gone = |i: usize| (a..=b).contains(&i);
    let mut out = Vec::new();
    for m in merges {
        let (s, t, across) = match axis {
            TableAxis::Row => (m.r0, m.r1, m.c1 - m.c0 + 1),
            TableAxis::Col => (m.c0, m.c1, m.r1 - m.r0 + 1),
        };
        if t < a || s > b {
            continue;
        }
        let left: Vec<usize> = (s..=t).filter(|i| !gone(*i)).collect();
        let (Some(&first), Some(&last)) = (left.first(), left.last()) else {
            continue;
        };
        let size = left.len() * across;
        let ((ar, ac), (lr, lc)) = match axis {
            TableAxis::Row => ((first, m.c0), (last, m.c1)),
            TableAxis::Col => ((m.r0, first), (m.r1, last)),
        };
        let set = |key: String| SpanMove::Set {
            key,
            last_row: raw.rows[lr].id.clone(),
            last_col: raw.cols[lc].id.clone(),
        };
        if gone(s) {
            if size >= 2 {
                out.push(set(raw.key(ar, ac)));
            }
        } else if size < 2 {
            out.push(SpanMove::Clear {
                key: raw.key(m.r0, m.c0),
            });
        } else if gone(t) {
            out.push(set(raw.key(m.r0, m.c0)));
        }
    }
    out
}
```

  Ajouter à `impl RawTable` (le second bloc, `:304-`) :

```rust
    /// Rangs de la ligne `row` et de la colonne `col`, si elles sont lisibles.
    fn ranks(&self, (row, col): (&str, &str)) -> Option<(usize, usize)> {
        Some((
            self.rows.iter().position(|l| l.id == row)?,
            self.cols.iter().position(|l| l.id == col)?,
        ))
    }

    /// Rectangle normalisé par les rangs de deux coins.
    fn rect(&self, from: (&str, &str), to: (&str, &str)) -> Option<Merge> {
        let (ra, ca) = self.ranks(from)?;
        let (rb, cb) = self.ranks(to)?;
        Some(Merge {
            r0: ra.min(rb),
            c0: ca.min(cb),
            r1: ra.max(rb),
            c1: ca.max(cb),
        })
    }

    fn key(&self, r: usize, c: usize) -> String {
        cell_key(&self.rows[r].id, &self.cols[c].id)
    }
```

- [ ] **Étape 6 : `cmd_set_table_cell` (F7).** Remplacer son corps à partir de `let (page, e, raw) = self.table_of(id)?;` :

```rust
        let (page, e, raw) = self.table_of(id)?;
        let (r, c) = raw.ranks((row, col)).ok_or(CommandError::BadTable)?;
        let (cell, merges) = {
            let txn = self.read();
            (read_cell(&txn, raw.cells.as_ref(), row, col), merges_of(&raw, &txn))
        };
        // F7 : sur une ancre de plusieurs lignes, la hauteur exigée vaut pour la zone ; sa dernière ligne grandit.
        let (z0, z1) = merges
            .iter()
            .find(|m| m.r0 == r && m.c0 == c)
            .map_or((r, r), |m| (m.r0, m.r1));
        let zone: f64 = raw.rows[z0..=z1].iter().map(|l| l.size).sum();
        let last = &raw.rows[z1];
        let grow = row_height
            .filter(|h| *h > zone)
            .map(|h| if z0 == z1 { h } else { last.size + (h - zone) });
        if grow.is_some_and(|g| !fits_f32(&[raw.height() - last.size + g])) {
            return Err(CommandError::BadTable);
        }
        let current = cell.as_ref().map_or("", |x| x.content.as_str());
        if current == content && grow.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            if current != content {
                match &cell {
                    Some(RawCell { text: Some(t), .. }) => {
                        rich_text::apply_text_diff(&mut txn, t, content)
                    }
                    Some(x) => {
                        x.map.insert(&mut txn, "text", TextPrelim::new(content));
                    }
                    None => {
                        let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
                        insert_cell(&mut txn, &cells, cell_key(row, col), content, vec![]);
                    }
                }
            }
            if let Some(h) = grow {
                last.map.insert(&mut txn, "height", In::Any(Any::from(h)));
            }
        }
        Ok(self.table_done(page, id))
```

- [ ] **Étape 7 : `cmd_remove_table_line` (F6).** Remplacer la fonction :

```rust
    /// `RemoveTableLine` (T3, F6) : les lignes `line..=to` et leurs cellules dans la même transaction que le report des
    /// zones touchées ; refus s'il ne resterait aucune ligne, ou si `line` / `to` est inconnue.
    pub(crate) fn cmd_remove_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        line: &str,
        to: Option<&str>,
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let rank = |l: &str| lines.iter().position(|x| x.id == l);
        let ia = rank(line).ok_or(CommandError::BadTable)?;
        let ib = match to {
            Some(t) => rank(t).ok_or(CommandError::BadTable)?,
            None => ia,
        };
        let (a, b) = (ia.min(ib), ia.max(ib));
        if b - a + 1 >= lines.len() {
            return Err(CommandError::BadTable);
        }
        let removed: Vec<&str> = lines[a..=b].iter().map(|l| l.id.as_str()).collect();
        let (keys, merges) = {
            let txn = self.read();
            let keys: Vec<String> = match &raw.cells {
                Some(cells) => cells
                    .keys(&txn)
                    .filter(|k| removed.iter().any(|l| in_line(k, axis, l)))
                    .map(str::to_string)
                    .collect(),
                None => Vec::new(),
            };
            (keys, merges_of(&raw, &txn))
        };
        let moves = span_moves(&raw, &merges, axis, a, b);
        {
            let mut txn = self.transact_local();
            for l in lines[a..=b].iter().rev() {
                arr.remove(&mut txn, l.index);
            }
            if let Some(cells) = &raw.cells {
                for k in &keys {
                    cells.remove(&mut txn, k);
                }
            }
            if !moves.is_empty() {
                let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
                for mv in moves {
                    match mv {
                        SpanMove::Clear { key } => {
                            if let Some(Out::YMap(cell)) = cells.get(&txn, &key) {
                                cell.remove(&mut txn, "span");
                            }
                        }
                        SpanMove::Set {
                            key,
                            last_row,
                            last_col,
                        } => {
                            let span = In::Any(span_any(&last_row, &last_col));
                            match cells.get(&txn, &key) {
                                Some(Out::YMap(cell)) => {
                                    cell.insert(&mut txn, "span", span);
                                }
                                _ => {
                                    insert_cell(&mut txn, &cells, key, "", vec![("span", span)]);
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(self.table_done(page, id))
    }
```

- [ ] **Étape 8 : fusion, division, ombrage, remplissage.** Remplacer `cmd_set_table_fill` et ajouter, dans le même
  `impl Document` :

```rust
    /// `key` (`fill` ou `shade`) posé ou retiré sur les ancres et cellules simples du rectangle (F9, F15) ; rien à
    /// changer : aucune transaction (D38).
    #[allow(clippy::too_many_arguments)]
    fn set_on_targets(
        &mut self,
        page: String,
        id: &str,
        e: &MapRef,
        raw: &RawTable,
        rect: &Merge,
        key: &'static str,
        value: Option<&str>,
    ) -> Result<Change, CommandError> {
        let todo: Vec<((usize, usize), Option<RawCell>)> = {
            let txn = self.read();
            let merges = merges_of(raw, &txn);
            targets(rect, &merges)
                .into_iter()
                .filter_map(|(r, c)| {
                    let cell = read_cell(&txn, raw.cells.as_ref(), &raw.rows[r].id, &raw.cols[c].id);
                    let current = cell.as_ref().and_then(|x| match key {
                        "fill" => x.fill.clone(),
                        _ => x.shade.clone(),
                    });
                    (current.as_deref() != value).then_some(((r, c), cell))
                })
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, e, raw.cells.as_ref());
            for ((r, c), cell) in todo {
                match (value, cell) {
                    (Some(v), Some(x)) => {
                        x.map.insert(&mut txn, key, In::from(v));
                    }
                    (Some(v), None) => {
                        insert_cell(&mut txn, &cells, raw.key(r, c), "", vec![(key, In::from(v))]);
                    }
                    (None, Some(x)) => {
                        x.map.remove(&mut txn, key);
                    }
                    (None, None) => {}
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetTableFill` (T12, F15) : la cellule, ou la plage jusqu'à `to` ; une couverte vaut pour son ancre.
    pub(crate) fn cmd_set_table_fill(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: Option<(&str, &str)>,
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if fill.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to.unwrap_or(from)).ok_or(CommandError::BadTable)?;
        self.set_on_targets(page, id, &e, &raw, &rect, "fill", fill)
    }

    /// `SetTableShade` (F9) : ombrer, retirer l'ombrage, révéler (F10, F12 : une étape par appel).
    pub(crate) fn cmd_set_table_shade(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        shade: Option<&str>,
    ) -> Result<Change, CommandError> {
        if shade.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        self.set_on_targets(page, id, &e, &raw, &rect, "shade", shade)
    }

    /// `MergeTableCells` (F3) : zones dedans dissoutes, couvertes retirées de `cells` (texte, `fill`, `shade`),
    /// `span` posé sur l'ancre ; zone identique sans couverte à vider : aucune étape (PC10).
    pub(crate) fn cmd_merge_table_cells(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        if (rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1) < 2 {
            return Err(CommandError::BadTable);
        }
        let (merges, covered) = {
            let txn = self.read();
            let merges = merges_of(&raw, &txn);
            let mut covered = Vec::new();
            if let Some(cells) = &raw.cells {
                for r in rect.r0..=rect.r1 {
                    for c in rect.c0..=rect.c1 {
                        let k = raw.key(r, c);
                        if (r, c) != (rect.r0, rect.c0) && cells.get(&txn, &k).is_some() {
                            covered.push(k);
                        }
                    }
                }
            }
            (merges, covered)
        };
        if merges.iter().any(|m| m.overlaps(&rect) && !m.inside(&rect)) {
            return Err(CommandError::BadTable);
        }
        let inner: Vec<Merge> = merges.into_iter().filter(|m| m.inside(&rect)).collect();
        if inner.as_slice() == [rect] && covered.is_empty() {
            return Ok(self.unchanged());
        }
        let anchor = raw.key(rect.r0, rect.c0);
        let span = span_any(&raw.rows[rect.r1].id, &raw.cols[rect.c1].id);
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
            for k in &covered {
                cells.remove(&mut txn, k);
            }
            match cells.get(&txn, &anchor) {
                Some(Out::YMap(a)) => {
                    a.insert(&mut txn, "span", In::Any(span));
                }
                _ => {
                    insert_cell(&mut txn, &cells, anchor, "", vec![("span", In::Any(span))]);
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SplitTableCell` (F4) : « diviser = défusionner » ; le contenu reste dans la cellule en haut à gauche.
    pub(crate) fn cmd_split_table_cell(
        &mut self,
        id: &str,
        cell: (&str, &str),
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (r, c) = raw.ranks(cell).ok_or(CommandError::BadTable)?;
        let anchor = {
            let txn = self.read();
            if !merges_of(&raw, &txn).iter().any(|m| m.r0 == r && m.c0 == c) {
                return Err(CommandError::BadTable);
            }
            read_cell(&txn, raw.cells.as_ref(), cell.0, cell.1).ok_or(CommandError::BadTable)?
        };
        {
            let mut txn = self.transact_local();
            anchor.map.remove(&mut txn, "span");
        }
        Ok(self.table_done(page, id))
    }
```

- [ ] **Étape 9 : fixture.** Régénérer puis relire :
  `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau_fusion -- --test-threads=1` puis
  `cargo test -p roomboard-core --test tableau_fusion` (2 tests `ok`, sans la variable).

- [ ] **Étape 10 : vert, format, clippy.** La commande bornée ; `cargo fmt --all` ;
  `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)" | head` (rien).

- [ ] **Étape 11 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/table.rs && git add crates/roomboard-core/src/commands.rs && \
git add crates/roomboard-core/tests/tableau.rs && git add crates/roomboard-core/tests/tableau_fusion.rs && \
git add crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard && git add crates/roomboard-wasm/src/lib.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): merge, split and shade table cells, range removal and fill" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : les 12 noms vus, N, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t3"></a>

### Tâche T3 — Module formats : première feuille d'un `.xlsx` en valeurs (`calamine`)

**Objectif.** `roomboard-formats` lit la première feuille visible d'un classeur `.xlsx` (F23, HB-14) par `calamine`
0.38 (MIT, `default-features = false`, lecteur `Xlsx` seul), en flux : 64 lignes gardées à partir de la première ligne
non vide, 64 colonnes à partir de la première colonne non vide parmi elles, la suite comptée sans rien garder (F22,
F23) ; rectangle utilisé (HB-15) ; fusions gardées si entièrement dedans (HB-16) ; valeurs calculées en texte français
(F24, HB-8, HB-17) ; textes coupés à 2 000 caractères ; garde contre une bombe ZIP (64 Mio décompressés déclarés,
PC3). Liaison `SheetReader` sur le patron de `ContainerReader`. Fixture synthétique `valeurs.xlsx` fabriquée par un test
(F32, GC16). Licences relevées (F27). Taille du module `formats` mesurée (F26).

**Fichiers.**
- Modifier : `crates/roomboard-formats/Cargo.toml` (deux dépendances), `crates/roomboard-formats/src/lib.rs:1-3`
- Créer : `crates/roomboard-formats/src/sheet.rs` (code et tests), `crates/roomboard-formats/tests/fixtures/valeurs.xlsx`
- Modifier : `crates/roomboard-formats-wasm/src/lib.rs:1-3` (en-tête), après `:105` (`SheetReader`), module `tests`
- Modifier : `Cargo.lock` (par `cargo`), `THIRD_PARTY_NOTICES.md` (section C10b)

**Interfaces.**
- Consomme : `roomboard_core::table::MAX_TABLE_LINES` (64, `crates/roomboard-core/src/table.rs:25`).
- Produit (lu par T10) :

```rust
// roomboard_formats::sheet
pub const MAX_PART_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_CELL_CHARS: usize = 2000;
pub const EMPTY_SHEET: &str = "la première feuille est vide";
pub const TOO_BIG: &str = "classeur trop gros pour un import en valeurs";
pub struct Sheet { pub rows: u32, pub cols: u32, pub cells: Vec<String>, pub merges: Vec<[u32; 4]>, pub source_rows: u32, pub source_cols: u32, pub cut_cells: bool }
pub enum SheetError { TooBig, Empty, Unreadable(String) }   // Display : TOO_BIG, EMPTY_SHEET, « classeur illisible : <message> »
pub fn read_first_sheet(bytes: &[u8]) -> Result<Sheet, SheetError>;
pub fn value_text(v: &calamine::DataRef<'_>) -> String;
pub fn number_text(v: f64) -> String;
// roomboard_formats_wasm (wasm-bindgen)
pub struct SheetReader;  // open(bytes: &[u8]) -> Result<SheetReader, JsError> ; open_inner(bytes) -> Result<SheetReader, String>
// rows() -> u32, cols() -> u32, cells() -> Vec<String>, merges() -> Vec<u32> (quadruplets bout à bout),
// source_rows() -> u32, source_cols() -> u32, cut_cells() -> bool
```

  Fixture : `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` (lue aussi par T10 et T12) : feuille cachée
  « Cachée » d'abord, puis « Valeurs » : lignes 1 et 2 vides, A3:F72 non vides ; ligne 3 = `texte`, `42`, `3.5`, date
  46346 (20/11/2026, style 14), `TRUE`, `#DIV/0!` ; A4:B4 fusionnées (« Fusion », B4 « caché ») ; lignes 5 à 72 :
  `L<r>C<c>`. Lecture attendue : 64 × 6, source 70 × 6, fusion `[1, 0, 1, 2]`.
- Réutilise : `calamine` 0.38 (MIT, dépendance neuve permise par U35) — `Xlsx::new`, `Reader::sheets_metadata`,
  `Xlsx::worksheet_cells_reader`, `XlsxCellReader::next_cell`, `Xlsx::merge_cells_by_sheet_name` (jamais
  `worksheet_merge_cells`, `#[deprecated]`), `ExcelDateTime::to_ymd_hms_milli`, `is_duration`, `as_f64`.
- Réutilise : `zip` 9.6 (déjà dans `roomboard-core/Cargo.toml`, déclaré ici avec les mêmes features) —
  `ZipArchive::new`, `by_index_raw(i)`, `ZipFile::name()` (rend un `ZipResult`), `ZipFile::size()` des parties lues en
  entier ; `ZipWriter` pour fabriquer les classeurs des tests.
- Réutilise : `crates/roomboard-core/src/table.rs:25` — `MAX_TABLE_LINES` lue par `sheet.rs` (dépendance déjà présente
  de `roomboard-formats` vers le cœur).
- Réutilise : aucun module existant (termes `sheet`, `xlsx`, `calamine`, `worksheet` absents de `crates/`) — nouveau
  module `crates/roomboard-formats/src/sheet.rs` : `pub fn read_first_sheet(bytes: &[u8]) -> Result<Sheet, SheetError>`,
  `pub struct Sheet { rows, cols, cells, merges, source_rows, source_cols, cut_cells }` (DAB4).
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:9-54` — patron `ContainerReader` / `open_inner` :
  `SheetReader::open(bytes)`, ses accesseurs, `open_inner` testé en natif.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-formats -p roomboard-formats-wasm 2>&1 | grep -E "test result|FAILED|panicked|error\[|sheet|valeurs|ignored" | tail -40 && \
bash scripts/tests/controle-licences.test.sh 2>&1 | tail -3 && node scripts/controle-licences.mjs 2>&1 | tail -5
```

Attendu : aucune ligne `FAILED` ni `error[` ; `ok` pour `valeurs_fixture_reads_64_rows_and_its_values` (S4, F23),
`values_are_french_text` (F24, HB-8, HB-17), `first_visible_sheet_is_read` (F23, HB-14, Review Focus 4),
`used_rectangle_drops_empty_edges` (F23, HB-15), `wide_sheet_is_cut_at_64_columns_and_counted` (F22),
`long_text_is_cut_at_2000_chars` (F22, HB-13), `merges_outside_the_kept_rectangle_are_dropped` (HB-16),
`empty_sheet_is_empty` (F28), `declared_zip_bomb_is_refused` (F22, Review Focus 4), `corrupted_zip_is_unreadable`
(DAB4, S4), `sheet_reader_open_inner_reads_the_fixture_and_refuses_garbage` (liaison) ; une ligne `ignored` pour
`real_examples_read_within_bounds` (F32, lancé à la main) ; `controle-licences` sans refus. À garder verts : les tests du
conteneur (`write_then_open_keeps_parts_and_asset`, `assets_are_cut_by_sizes_and_sorted`, `inconsistent_lists_are_refused`).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]` — seule exception : le test `#[ignore]` des exemples réels que F32 demande), aucun seuil ni délai relevé ;
  un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .)`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Une seule dépendance neuve, `calamine` 0.38 (MIT), plus la déclaration de `zip` 9.6 ; aucune dépendance AGPL, GPL
  ni LGPL (U39) ; `node scripts/controle-licences.mjs` passe.
- GC9 Plafond du module `formats` 3 Mio (3 145 728 o) ni baissé ni relevé ; la taille mesurée va au rapport (attendu
  ≈ 800 Ko, F26) ; `calamine` n'entre pas dans le module principal (plafond 1 572 864 o inchangé).
- GC11 `crates/` sans dépendance au navigateur ; `sheet.rs` testé en natif.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC15 `cargo fmt --all` puis `cargo clippy -p roomboard-formats -p roomboard-formats-wasm --all-targets -- -D warnings`
  sans avertissement (aucune fonction `#[deprecated]` de `calamine`).
- GC16 Aucun fichier de `~/telechargements-roomboard/` n'entre au dépôt : seul `valeurs.xlsx`, fabriqué par le test.
- GC17 Aucun processus laissé en marche ; le module mesuré est écrit dans `/tmp/c10b-t3-formats`, retiré après.
- GC18 Périmètre : seuls les fichiers ci-dessus.

**Interdits.** Pas de `open_workbook_auto`, pas de feature `chrono` ni `dates` ; ne pas appeler `dimensions()` ni
`worksheet_range` (lecture entière) ; aucun `.xls`, `.ods`, `.csv` (F25) ; ne pas écrire dans `apps/web/src/wasm-formats/`.

**Critère « terminé ».** Commande bornée verte, fixture commitée, taille du module citée, notices complétées, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : dépendances.** `crates/roomboard-formats/Cargo.toml`, section `[dependencies]` :

```toml
[dependencies]
calamine = { version = "0.38", default-features = false }
roomboard-core = { path = "../roomboard-core" }
sha2 = "0.10"
zip = { version = "9.6", default-features = false, features = ["deflate-flate2-zlib-rs"] }
```

  `crates/roomboard-formats/src/lib.rs` :

```rust
//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets ; première
//! feuille d'un classeur `.xlsx` en valeurs (C10b, U35). Rust pur, testé en natif ; servis par le second module Wasm.
pub mod container;
pub mod sheet;
```

- [ ] **Étape 3 : tests rouges.** Créer `crates/roomboard-formats/src/sheet.rs` avec seulement l'en-tête de l'étape 5 et
  ce module de tests (le code vient à l'étape 5) :

```rust
#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};
    use std::path::PathBuf;

    use calamine::{CellErrorType, DataRef, ExcelDateTime, ExcelDateTimeType};
    use zip::write::SimpleFileOptions;
    use zip::{CompressionMethod, ZipWriter};

    use super::*;

    const NS: &str = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const REL: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const PKG: &str = "http://schemas.openxmlformats.org/package/2006/relationships";

    /// Feuille d'un classeur fabriqué : nom, état, contenu de `<sheetData>`, fusions (`"A4:B4"`).
    struct Ws<'a> {
        name: &'a str,
        hidden: bool,
        data: String,
        merges: &'a [&'a str],
    }

    /// Classeur `.xlsx` minimal (F32) : relations, styles (0 général, 1 date 14, 2 durée 46, 3 date et heure 22,
    /// 4 heure 20), chaînes partagées, une partie par feuille.
    fn xlsx(sheets: &[Ws<'_>], shared: &[&str]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        let mut put = |name: &str, body: String| {
            w.start_file(name, o).expect("entrée");
            w.write_all(body.as_bytes()).expect("écriture");
        };
        put(
            "[Content_Types].xml",
            r#"<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>"#.to_string(),
        );
        put(
            "_rels/.rels",
            format!(r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>"#),
        );
        let list: String = sheets
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let state = if s.hidden { r#" state="hidden""# } else { "" };
                format!(r#"<sheet name="{}" sheetId="{}"{state} r:id="rId{}"/>"#, s.name, i + 1, i + 1)
            })
            .collect();
        put(
            "xl/workbook.xml",
            format!(r#"<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{NS}" xmlns:r="{REL}"><sheets>{list}</sheets></workbook>"#),
        );
        let rels: String = (1..=sheets.len())
            .map(|i| format!(r#"<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>"#))
            .collect();
        put(
            "xl/_rels/workbook.xml.rels",
            format!(r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}">{rels}<Relationship Id="rIdS" Type="{REL}/styles" Target="styles.xml"/><Relationship Id="rIdT" Type="{REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>"#),
        );
        put(
            "xl/styles.xml",
            format!(r#"<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="{NS}"><cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="46" applyNumberFormat="1"/><xf numFmtId="22" applyNumberFormat="1"/><xf numFmtId="20" applyNumberFormat="1"/></cellXfs></styleSheet>"#),
        );
        let si: String = shared.iter().map(|s| format!("<si><t>{s}</t></si>")).collect();
        put(
            "xl/sharedStrings.xml",
            format!(r#"<?xml version="1.0" encoding="UTF-8"?><sst xmlns="{NS}" count="{n}" uniqueCount="{n}">{si}</sst>"#, n = shared.len()),
        );
        for (i, s) in sheets.iter().enumerate() {
            let merges = if s.merges.is_empty() {
                String::new()
            } else {
                let refs: String = s.merges.iter().map(|m| format!(r#"<mergeCell ref="{m}"/>"#)).collect();
                format!(r#"<mergeCells count="{}">{refs}</mergeCells>"#, s.merges.len())
            };
            put(
                &format!("xl/worksheets/sheet{}.xml", i + 1),
                format!(r#"<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="{NS}"><sheetData>{}</sheetData>{merges}</worksheet>"#, s.data),
            );
        }
        w.finish().expect("fin").into_inner()
    }

    fn shared(r: &str, i: usize) -> String {
        format!(r#"<c r="{r}" t="s"><v>{i}</v></c>"#)
    }
    fn num(r: &str, v: &str, style: u32) -> String {
        format!(r#"<c r="{r}" s="{style}"><v>{v}</v></c>"#)
    }
    fn inline(r: &str, t: &str) -> String {
        format!(r#"<c r="{r}" t="inlineStr"><is><t>{t}</t></is></c>"#)
    }
    fn row(n: u32, cells: &[String]) -> String {
        format!(r#"<row r="{n}">{}</row>"#, cells.concat())
    }
    /// Lettre de colonne (0 → A) ; au-delà de Z : AA, AB…
    fn letters(i: usize) -> String {
        if i < 26 {
            ((b'A' + i as u8) as char).to_string()
        } else {
            format!("{}{}", letters(i / 26 - 1), letters(i % 26))
        }
    }
    fn one(data: String, merges: &[&str]) -> Vec<u8> {
        xlsx(
            &[Ws {
                name: "F",
                hidden: false,
                data,
                merges,
            }],
            &[],
        )
    }

    /// `valeurs.xlsx` (F32, S4).
    fn valeurs() -> Vec<u8> {
        let mut data = row(
            3,
            &[
                shared("A3", 0),
                num("B3", "42", 0),
                num("C3", "3.5", 0),
                num("D3", "46346", 1),
                r#"<c r="E3" t="b"><v>1</v></c>"#.to_string(),
                r#"<c r="F3" t="e"><v>#DIV/0!</v></c>"#.to_string(),
            ],
        );
        data.push_str(&row(
            4,
            &[
                shared("A4", 1),
                inline("B4", "caché"),
                inline("C4", "L4C3"),
                inline("D4", "L4C4"),
                inline("E4", "L4C5"),
                inline("F4", "L4C6"),
            ],
        ));
        for r in 5..=72u32 {
            let cells: Vec<String> = (0..6)
                .map(|c| inline(&format!("{}{r}", letters(c)), &format!("L{r}C{}", c + 1)))
                .collect();
            data.push_str(&row(r, &cells));
        }
        xlsx(
            &[
                Ws {
                    name: "Cachée",
                    hidden: true,
                    data: row(1, &[inline("A1", "secret")]),
                    merges: &[],
                },
                Ws {
                    name: "Valeurs",
                    hidden: false,
                    data,
                    merges: &["A4:B4"],
                },
            ],
            &["texte", "Fusion"],
        )
    }

    fn fixture() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/valeurs.xlsx")
    }

    /// S4, F23, F32 : la fixture fabriquée ; régénérée par `ROOMBOARD_REGENERER_FIXTURES=1`.
    #[test]
    fn valeurs_fixture_reads_64_rows_and_its_values() {
        if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
            std::fs::create_dir_all(fixture().parent().expect("dossier")).expect("dossier");
            std::fs::write(fixture(), valeurs()).expect("écriture");
        }
        let bytes = std::fs::read(fixture()).expect(
            "fixture valeurs.xlsx absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats valeurs",
        );
        let s = read_first_sheet(&bytes).expect("lecture");
        assert_eq!(
            (s.rows, s.cols, s.source_rows, s.source_cols, s.cut_cells),
            (64, 6, 70, 6, false)
        );
        assert_eq!(&s.cells[0..6], ["texte", "42", "3,5", "20/11/2026", "VRAI", "#DIV/0!"]);
        assert_eq!(&s.cells[6..8], ["Fusion", "caché"]);
        assert_eq!(s.merges, vec![[1, 0, 1, 2]]);
        assert!(!s.cells.iter().any(|c| c == "secret"), "feuille cachée jamais lue");
        assert_eq!(s.cells[63 * 6], "L66C1");
    }

    /// F24, HB-8, HB-17 : nombres à virgule et 15 chiffres, dates françaises (1900 et 1904), heures, durées, booléens,
    /// erreurs par leur code, texte tel quel (`\r\n` → `\n`).
    #[test]
    fn values_are_french_text() {
        use ExcelDateTimeType::{DateTime, TimeDelta};
        for (v, want) in [
            (42.0, "42"),
            (3.5, "3,5"),
            (0.1 + 0.2, "0,3"),
            (1.0 / 3.0, "0,333333333333333"),
            (-2.5, "-2,5"),
            (1e20, "100000000000000000000"),
            (0.0, "0"),
            (123_456_789.123_456, "123456789,123456"),
        ] {
            assert_eq!(number_text(v), want, "{v}");
        }
        let dt = |v: f64, t: ExcelDateTimeType, b: bool| {
            value_text(&DataRef::DateTime(ExcelDateTime::new(v, t, b)))
        };
        assert_eq!(dt(46346.0, DateTime, false), "20/11/2026");
        assert_eq!(dt(46346.5, DateTime, false), "20/11/2026 12:00");
        assert_eq!(dt(46346.0 + 45296.0 / 86400.0, DateTime, false), "20/11/2026 12:34:56");
        assert_eq!(dt(0.5, DateTime, false), "12:00");
        assert_eq!(dt(1.5 + 1.0 / 86400.0, TimeDelta, false), "36:00:01");
        assert_eq!(dt(44884.0, DateTime, true), "20/11/2026");
        assert_eq!(value_text(&DataRef::Bool(true)), "VRAI");
        assert_eq!(value_text(&DataRef::Bool(false)), "FAUX");
        assert_eq!(value_text(&DataRef::Error(CellErrorType::Name)), "#NAME?");
        assert_eq!(value_text(&DataRef::Int(-7)), "-7");
        assert_eq!(value_text(&DataRef::String("a\r\nb".into())), "a\nb");
        assert_eq!(value_text(&DataRef::SharedString("x")), "x");
        assert_eq!(value_text(&DataRef::DateTimeIso("2026-11-20T08:05:00".into())), "20/11/2026 08:05");
        assert_eq!(value_text(&DataRef::DateTimeIso("2026-11-20".into())), "20/11/2026");
        assert_eq!(value_text(&DataRef::DateTimeIso("10:30:15".into())), "10:30:15");
        assert_eq!(value_text(&DataRef::DurationIso("PT1H".into())), "PT1H");
        assert_eq!(value_text(&DataRef::Empty), "");
    }

    /// F23, HB-14 : première feuille visible ; toutes cachées : la première.
    #[test]
    fn first_visible_sheet_is_read() {
        let ws = |name, hidden, t: &str| Ws {
            name,
            hidden,
            data: row(1, &[inline("A1", t)]),
            merges: &[],
        };
        let b = xlsx(&[ws("a", true, "caché"), ws("b", false, "vu"), ws("c", false, "autre")], &[]);
        assert_eq!(read_first_sheet(&b).expect("lecture").cells, vec!["vu"]);
        let b = xlsx(&[ws("a", true, "premier"), ws("b", true, "second")], &[]);
        assert_eq!(read_first_sheet(&b).expect("lecture").cells, vec!["premier"]);
    }

    /// F23, HB-15 : lignes et colonnes vides de tête et de queue retirées ; une cellule vide (chaîne vide) ne compte pas.
    #[test]
    fn used_rectangle_drops_empty_edges() {
        let data = [
            row(5, &[inline("C5", "a"), inline("D5", "b"), inline("H5", "")]),
            row(6, &[inline("D6", "c")]),
            row(9, &[inline("C9", "")]),
        ]
        .concat();
        let s = read_first_sheet(&one(data, &[])).expect("lecture");
        assert_eq!((s.rows, s.cols, s.source_rows, s.source_cols), (2, 2, 2, 2));
        assert_eq!(s.cells, vec!["a", "b", "", "c"]);
    }

    /// F22 : 70 colonnes non vides : 64 gardées, 70 comptées.
    #[test]
    fn wide_sheet_is_cut_at_64_columns_and_counted() {
        let cells: Vec<String> = (0..70).map(|c| inline(&format!("{}1", letters(c)), "x")).collect();
        let s = read_first_sheet(&one(row(1, &cells), &[])).expect("lecture");
        assert_eq!((s.rows, s.cols, s.source_rows, s.source_cols), (1, 64, 1, 70));
    }

    /// F22, HB-13 : texte coupé à 2 000 caractères, suivi de « … », signalé une fois.
    #[test]
    fn long_text_is_cut_at_2000_chars() {
        let long = "é".repeat(2001);
        let s = read_first_sheet(&one(row(1, &[inline("A1", &long), inline("B1", "court")]), &[])).expect("lecture");
        assert!(s.cut_cells);
        assert_eq!(s.cells[0].chars().count(), 2001);
        assert!(s.cells[0].ends_with('…'));
        assert_eq!(s.cells[1], "court");
    }

    /// HB-16 : une fusion qui dépasse le rectangle gardé (au-delà de la 64e ligne) est retirée ; une dedans reste.
    #[test]
    fn merges_outside_the_kept_rectangle_are_dropped() {
        let data: String = (1..=70u32).map(|r| row(r, &[inline(&format!("A{r}"), "x"), inline(&format!("B{r}"), "y")])).collect();
        let s = read_first_sheet(&one(data, &["A1:B1", "A64:A65"])).expect("lecture");
        assert_eq!(s.merges, vec![[0, 0, 1, 2]]);
    }

    /// F28 : feuille sans valeur : `Empty`, message « la première feuille est vide ».
    #[test]
    fn empty_sheet_is_empty() {
        let e = read_first_sheet(&one(String::new(), &[])).expect_err("vide");
        assert_eq!(e, SheetError::Empty);
        assert_eq!(e.to_string(), EMPTY_SHEET);
    }

    /// F22, Review Focus 4 : une partie lue en entier qui déclare plus de 64 Mio décompressés : refus avant `calamine`.
    #[test]
    fn declared_zip_bomb_is_refused() {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        w.start_file("xl/sharedStrings.xml", o).expect("entrée");
        let chunk = vec![b' '; 1 << 20];
        for _ in 0..64 {
            w.write_all(&chunk).expect("écriture");
        }
        w.write_all(b" ").expect("écriture");
        let bytes = w.finish().expect("fin").into_inner();
        let e = read_first_sheet(&bytes).expect_err("bombe");
        assert_eq!(e, SheetError::TooBig);
        assert_eq!(e.to_string(), TOO_BIG);
    }

    /// DAB4, S4 : en-tête ZIP puis octets corrompus : `Unreadable`, jamais de panique en natif.
    #[test]
    fn corrupted_zip_is_unreadable() {
        let mut bytes = vec![0x50, 0x4b, 0x03, 0x04];
        bytes.extend((0..200u32).map(|i| (i * 37 % 251) as u8));
        let e = read_first_sheet(&bytes).expect_err("corrompu");
        assert!(matches!(e, SheetError::Unreadable(_)));
        assert!(e.to_string().starts_with("classeur illisible"), "{e}");
    }

    /// F32 : les trois `.xlsx` d'exemple, s'ils existent (`~/telechargements-roomboard/`) ; lancé à la main :
    /// `cargo test -p roomboard-formats real_examples -- --ignored`.
    #[test]
    #[ignore]
    fn real_examples_read_within_bounds() {
        let dir = PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("telechargements-roomboard");
        let Ok(entries) = std::fs::read_dir(&dir) else {
            return;
        };
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("xlsx") {
                continue;
            }
            let s = read_first_sheet(&std::fs::read(&p).expect("lecture")).expect("première feuille sans erreur");
            assert!(s.rows <= 64 && s.cols <= 64, "{}", p.display());
            assert_eq!(s.cells.len(), (s.rows * s.cols) as usize);
        }
    }
}
```

  Dans `crates/roomboard-formats-wasm/src/lib.rs`, module `tests` :

```rust
    #[test]
    fn sheet_reader_open_inner_reads_the_fixture_and_refuses_garbage() {
        let r = SheetReader::open_inner(include_bytes!(
            "../../roomboard-formats/tests/fixtures/valeurs.xlsx"
        ))
        .expect("lecture");
        assert_eq!(
            (r.rows(), r.cols(), r.source_rows(), r.source_cols(), r.cut_cells()),
            (64, 6, 70, 6, false)
        );
        assert_eq!(r.merges(), vec![1, 0, 1, 2]);
        assert_eq!(r.cells()[2], "3,5");
        let Err(e) = SheetReader::open_inner(&[0x50, 0x4b, 3, 4, 1, 2, 3]) else {
            panic!("refus attendu");
        };
        assert!(e.starts_with("classeur illisible"), "{e}");
    }
```

- [ ] **Étape 4 : les voir rouges.** `cargo test -p roomboard-formats sheet 2>&1 | grep -E "error\[" | head` :
  `read_first_sheet`, `value_text`, `SheetError` inconnus.

- [ ] **Étape 5 : `sheet.rs`.** Au-dessus du module de tests :

```rust
//! Première feuille d'un classeur `.xlsx` en valeurs (U35, F22 à F24, C10b, DAB4) : `calamine` (MIT), lecteur `Xlsx`
//! seul, lecture en flux. Garde contre une bombe ZIP : parties lues en entier refusées au-delà de 64 Mio décompressés
//! déclarés (PC3). Première feuille visible ; 64 lignes gardées à partir de la première non vide, 64 colonnes à partir
//! de la première non vide parmi elles, la suite comptée pour le message (F22) ; rectangle utilisé ; fusions gardées si
//! entièrement dedans ; valeurs calculées en texte français (F24) ; textes coupés à 2 000 caractères. Servie dans un
//! Worker jetable par `roomboard-formats-wasm` (un `panic` n'atteint pas l'instance qui enregistre, DAB4).
use std::io::Cursor;

use calamine::{DataRef, Dimensions, ExcelDateTime, Reader, SheetVisible, Xlsx};
use roomboard_core::table::MAX_TABLE_LINES;

/// Taille décompressée déclarée au-delà de laquelle une partie lue en entier est refusée (F22).
pub const MAX_PART_BYTES: u64 = 64 * 1024 * 1024;
/// Caractères gardés d'une cellule (F22, HB-13), suivis de « … ».
pub const MAX_CELL_CHARS: usize = 2000;
pub const EMPTY_SHEET: &str = "la première feuille est vide";
pub const TOO_BIG: &str = "classeur trop gros pour un import en valeurs";

/// Feuille lue : `rows × cols` textes en rangées bout à bout ; `merges` = `[rang de ligne, rang de colonne, lignes,
/// colonnes]` ; `source_rows × source_cols` = lignes et colonnes non vides comptées sur toute la feuille (F22).
#[derive(Debug, Clone, PartialEq)]
pub struct Sheet {
    pub rows: u32,
    pub cols: u32,
    pub cells: Vec<String>,
    pub merges: Vec<[u32; 4]>,
    pub source_rows: u32,
    pub source_cols: u32,
    pub cut_cells: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SheetError {
    TooBig,
    Empty,
    Unreadable(String),
}

impl std::fmt::Display for SheetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SheetError::TooBig => f.write_str(TOO_BIG),
            SheetError::Empty => f.write_str(EMPTY_SHEET),
            SheetError::Unreadable(m) => write!(f, "classeur illisible : {m}"),
        }
    }
}

impl std::error::Error for SheetError {}

fn unreadable(e: impl std::fmt::Display) -> SheetError {
    SheetError::Unreadable(e.to_string())
}

/// Garde F22 (PC3) : `xl/sharedStrings.xml`, `xl/styles.xml`, `xl/workbook.xml` et chaque `xl/worksheets/*.xml`
/// déclarent au plus 64 Mio décompressés ; lu sur le répertoire central, sans rien décompresser.
fn guard(bytes: &[u8]) -> Result<(), SheetError> {
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes)).map_err(unreadable)?;
    for i in 0..zip.len() {
        let f = zip.by_index_raw(i).map_err(unreadable)?;
        let name = f.name().map_err(unreadable)?.to_ascii_lowercase();
        let whole = matches!(
            name.as_str(),
            "xl/sharedstrings.xml" | "xl/styles.xml" | "xl/workbook.xml"
        ) || (name.starts_with("xl/worksheets/") && name.ends_with(".xml"));
        if whole && f.size() > MAX_PART_BYTES {
            return Err(SheetError::TooBig);
        }
    }
    Ok(())
}

/// Nombre en texte (F24) : 15 chiffres significatifs au plus, zéros de fin retirés, virgule décimale, sans séparateur.
pub fn number_text(v: f64) -> String {
    if v == 0.0 {
        return "0".to_string();
    }
    if !v.is_finite() {
        return v.to_string();
    }
    let exp = v.abs().log10().floor() as i32;
    let decimals = (14 - exp).max(0) as usize;
    let mut s = format!("{v:.decimals$}");
    if s.contains('.') {
        let kept = s.trim_end_matches('0').trim_end_matches('.').len();
        s.truncate(kept);
    }
    if s == "-0" {
        s = "0".to_string();
    }
    s.replace('.', ",")
}

/// Date, date et heure, heure seule (`:SS` si non nulles) ; durée `H:MM:SS` (F24).
fn datetime_text(d: &ExcelDateTime) -> String {
    if d.is_duration() {
        let total = (d.as_f64() * 86_400.0).round() as i64;
        let (sign, t) = if total < 0 { ("-", -total) } else { ("", total) };
        return format!("{sign}{}:{:02}:{:02}", t / 3600, (t / 60) % 60, t % 60);
    }
    let (y, mo, day, h, mi, s, _) = d.to_ymd_hms_milli();
    let time = if s != 0 {
        format!("{h:02}:{mi:02}:{s:02}")
    } else {
        format!("{h:02}:{mi:02}")
    };
    if (0.0..1.0).contains(&d.as_f64()) {
        return time;
    }
    let date = format!("{day:02}/{mo:02}/{y:04}");
    if h == 0 && mi == 0 && s == 0 {
        date
    } else {
        format!("{date} {time}")
    }
}

/// Date ISO (`t="d"`) : même forme que les dates sérielles (PC4) ; forme inconnue : telle quelle.
fn iso_text(s: &str) -> String {
    let digits = |p: &str, n: usize| p.len() == n && p.bytes().all(|b| b.is_ascii_digit());
    let date = |d: &str| -> Option<String> {
        let mut it = d.split('-');
        let (y, m, dd) = (it.next()?, it.next()?, it.next()?);
        (it.next().is_none() && digits(y, 4) && digits(m, 2) && digits(dd, 2))
            .then(|| format!("{dd}/{m}/{y}"))
    };
    let time = |t: &str| -> Option<String> {
        let t = t.split(['.', 'Z', '+']).next()?;
        let mut it = t.split(':');
        let (h, mi) = (it.next()?, it.next()?);
        let sec = it.next().unwrap_or("00");
        (it.next().is_none() && digits(h, 2) && digits(mi, 2) && digits(sec, 2)).then(|| {
            if sec == "00" {
                format!("{h}:{mi}")
            } else {
                format!("{h}:{mi}:{sec}")
            }
        })
    };
    let out = match s.split_once('T') {
        Some((d, t)) => date(d).zip(time(t)).map(|(d, t)| {
            if t == "00:00" {
                d
            } else {
                format!("{d} {t}")
            }
        }),
        None if s.contains(':') => time(s),
        None => date(s),
    };
    out.unwrap_or_else(|| s.to_string())
}

/// Valeur calculée d'une cellule en texte (F24) ; formats d'affichage jamais appliqués.
pub fn value_text(v: &DataRef<'_>) -> String {
    match v {
        DataRef::Empty => String::new(),
        DataRef::String(s) => s.replace("\r\n", "\n"),
        DataRef::SharedString(s) => s.replace("\r\n", "\n"),
        DataRef::Int(i) => i.to_string(),
        DataRef::Float(f) => number_text(*f),
        DataRef::Bool(b) => (if *b { "VRAI" } else { "FAUX" }).to_string(),
        DataRef::DateTime(d) => datetime_text(d),
        DataRef::DateTimeIso(s) => iso_text(s),
        DataRef::DurationIso(s) => s.clone(),
        DataRef::Error(e) => e.to_string(),
    }
}

fn cut_text(s: String) -> (String, bool) {
    match s.char_indices().nth(MAX_CELL_CHARS) {
        Some((i, _)) => (format!("{}…", &s[..i]), true),
        None => (s, false),
    }
}

/// Cellules non vides reçues dans l'ordre du fichier : fenêtre de 64 × 64 tenue en mémoire constante (une colonne plus à
/// gauche resserre la fenêtre), le reste seulement compté.
struct Acc {
    first_row: Option<u32>,
    last_row: u32,
    min_col: u32,
    max_col: u32,
    win_min: Option<u32>,
    kept: Vec<(u32, u32, String)>,
    cut_cells: bool,
}

impl Acc {
    fn new() -> Acc {
        Acc {
            first_row: None,
            last_row: 0,
            min_col: u32::MAX,
            max_col: 0,
            win_min: None,
            kept: Vec::new(),
            cut_cells: false,
        }
    }

    fn push(&mut self, r: u32, c: u32, text: String) {
        let r0 = *self.first_row.get_or_insert(r);
        let Some(off) = r.checked_sub(r0) else {
            return;
        };
        self.last_row = self.last_row.max(r);
        self.min_col = self.min_col.min(c);
        self.max_col = self.max_col.max(c);
        if off >= MAX_TABLE_LINES {
            return;
        }
        let lo = self.win_min.map_or(c, |m| m.min(c));
        if self.win_min != Some(lo) {
            self.win_min = Some(lo);
            self.kept.retain(|(_, cc, _)| *cc < lo + MAX_TABLE_LINES);
        }
        if c >= lo + MAX_TABLE_LINES {
            return;
        }
        let (text, cut) = cut_text(text);
        self.cut_cells |= cut;
        self.kept.push((off, c, text));
    }

    fn finish(self, merges: &[Dimensions]) -> Result<Sheet, SheetError> {
        let (Some(r0), Some(c0)) = (self.first_row, self.win_min) else {
            return Err(SheetError::Empty);
        };
        let rows = self.kept.iter().map(|k| k.0).max().unwrap_or(0) + 1;
        let cols = self.kept.iter().map(|k| k.1 - c0).max().unwrap_or(0) + 1;
        let mut cells = vec![String::new(); (rows * cols) as usize];
        for (r, c, t) in self.kept {
            cells[(r * cols + (c - c0)) as usize] = t;
        }
        let mut kept: Vec<[u32; 4]> = Vec::new();
        for d in merges {
            let ((sr, sc), (er, ec)) = (d.start, d.end);
            if sr < r0 || sc < c0 || er < sr || ec < sc || er >= r0 + rows || ec >= c0 + cols {
                continue;
            }
            let m = [sr - r0, sc - c0, er - sr + 1, ec - sc + 1];
            let overlaps = |o: &[u32; 4]| {
                m[0] < o[0] + o[2] && o[0] < m[0] + m[2] && m[1] < o[1] + o[3] && o[1] < m[1] + m[3]
            };
            if m[2] * m[3] < 2 || kept.iter().any(overlaps) {
                continue;
            }
            kept.push(m);
        }
        Ok(Sheet {
            rows,
            cols,
            cells,
            merges: kept,
            source_rows: self.last_row - r0 + 1,
            source_cols: self.max_col - self.min_col + 1,
            cut_cells: self.cut_cells,
        })
    }
}

/// Première feuille visible (à défaut la première) en valeurs (F23).
pub fn read_first_sheet(bytes: &[u8]) -> Result<Sheet, SheetError> {
    guard(bytes)?;
    let mut wb: Xlsx<_> = Xlsx::new(Cursor::new(bytes)).map_err(unreadable)?;
    let name = {
        let sheets = wb.sheets_metadata();
        sheets
            .iter()
            .find(|s| matches!(s.visible, SheetVisible::Visible))
            .or_else(|| sheets.first())
            .map(|s| s.name.clone())
    }
    .ok_or(SheetError::Empty)?;
    let merges = wb.merge_cells_by_sheet_name(&name).map_err(unreadable)?;
    let mut acc = Acc::new();
    {
        let mut reader = wb.worksheet_cells_reader(&name).map_err(unreadable)?;
        while let Some(cell) = reader.next_cell().map_err(unreadable)? {
            let (r, c) = cell.get_position();
            let text = value_text(cell.get_value());
            if !text.is_empty() {
                acc.push(r, c, text);
            }
        }
    }
    acc.finish(&merges)
}
```

- [ ] **Étape 6 : liaison.** Dans `crates/roomboard-formats-wasm/src/lib.rs`, en-tête `:1-3` :

```rust
//! Liaison wasm-bindgen du second module Wasm (R8, DAR1) : conteneur `.roomboard` (`container::read`, `container::write`,
//! chargé par la page au premier besoin, R10) et première feuille d'un `.xlsx` (`sheet::read_first_sheet`, C10b, lue
//! dans un Worker jetable, DAB4). Chaque fonction exposée délègue à une fonction `_inner` sans JsValue, seule testée en
//! natif (hors wasm32, tout appel à JS panique).
```

  Après `write_container` (`:105`) :

```rust
/// Première feuille d'un classeur (C10b, F23) : grille de textes, fusions en quadruplets, dimensions de la source.
#[wasm_bindgen]
pub struct SheetReader {
    sheet: roomboard_formats::sheet::Sheet,
}

impl SheetReader {
    /// `sheet::read_first_sheet` ; le message d'erreur est le `Display` de `SheetError`.
    pub fn open_inner(bytes: &[u8]) -> Result<SheetReader, String> {
        roomboard_formats::sheet::read_first_sheet(bytes)
            .map(|sheet| SheetReader { sheet })
            .map_err(|e| e.to_string())
    }
}

#[wasm_bindgen]
impl SheetReader {
    /// Lève une Error : « la première feuille est vide », « classeur trop gros pour un import en valeurs »,
    /// « classeur illisible : … ».
    pub fn open(bytes: &[u8]) -> Result<SheetReader, JsError> {
        Self::open_inner(bytes).map_err(|m| JsError::new(&m))
    }
    pub fn rows(&self) -> u32 {
        self.sheet.rows
    }
    pub fn cols(&self) -> u32 {
        self.sheet.cols
    }
    pub fn cells(&self) -> Vec<String> {
        self.sheet.cells.clone()
    }
    /// `[ligne, colonne, lignes, colonnes]` bout à bout.
    pub fn merges(&self) -> Vec<u32> {
        self.sheet.merges.iter().flatten().copied().collect()
    }
    pub fn source_rows(&self) -> u32 {
        self.sheet.source_rows
    }
    pub fn source_cols(&self) -> u32 {
        self.sheet.source_cols
    }
    pub fn cut_cells(&self) -> bool {
        self.sheet.cut_cells
    }
}
```

- [ ] **Étape 7 : fixture et vert.**
  `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats valeurs -- --test-threads=1` (écrit
  `tests/fixtures/valeurs.xlsx`), puis la commande bornée sans la variable.

- [ ] **Étape 8 : licences (F27).** Crates neufs de l'arbre de `roomboard-formats`, hors celui du cœur et hors la
  section C2 :

```bash
cd "$WT" && comm -23 \
  <(cargo tree -p roomboard-formats -e normal,build --target all --prefix none | sed 's/ v.*//' | sort -u) \
  <(cargo tree -p roomboard-core -e normal,build --target all --prefix none | sed 's/ v.*//' | sort -u) \
  | grep -vx -e roomboard-formats -e roomboard-core -e sha2 -e digest -e crypto-common -e block-buffer -e cpufeatures \
       -e generic-array -e typenum -e version_check -e cfg-if -e libc > /tmp/c10b-crates.txt && \
cargo metadata --format-version 1 --locked | node -e '
const m = JSON.parse(require("fs").readFileSync(0, "utf8"));
const want = new Set(require("fs").readFileSync("/tmp/c10b-crates.txt", "utf8").split("\n").filter(Boolean));
for (const p of m.packages.filter((p) => want.has(p.name)).sort((a, b) => a.name.localeCompare(b.name)))
  console.log(`| ${p.name} | ${p.version} | ${p.license} | ${p.repository ?? ""} |`);' && rm /tmp/c10b-crates.txt
```

  Ajouter à `THIRD_PARTY_NOTICES.md`, avant « ## Code repris d'ActCraft », une section
  `## Crate \`roomboard-formats\` (C10b, lecture des classeurs .xlsx)` : une phrase (« Crates apportés par `calamine`
  0.38 (lecteur `Xlsx`, sans `chrono`) et absents de l'arbre de `roomboard-core`. `zopfli` vient de la feature `deflate`
  de `zip` qu'exige `calamine` ; inutilisé, éliminé à l'édition des liens. »), le tableau
  `| crate | version | licence | dépôt |` rempli par la sortie ci-dessus, puis quatre sous-sections « Texte de licence »
  au format de celle de `generic-array` (bloc `text`, copie exacte du fichier) : `calamine` (MIT,
  `~/.cargo/registry/src/index.crates.io-*/calamine-0.38.0/LICENSE-MIT.md`), `quick-xml` (MIT,
  `…/quick-xml-0.42.0/LICENSE-MIT.md`), `simd-adler32` (MIT, `…/simd-adler32-0.3.10/LICENSE.md`), données d'`encoding_rs`
  (BSD-3-Clause, `…/encoding_rs-0.8.44/LICENSE-WHATWG`). Les versions écrites sont celles du tableau (si `cargo` en a
  résolu d'autres, prendre les fichiers de ces versions). Puis `bash scripts/tests/controle-licences.test.sh` et
  `node scripts/controle-licences.mjs` (aucun refus).

- [ ] **Étape 9 : taille du module `formats` (F26).**

```bash
cd "$WT" && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && \
wasm-bindgen --target web --remove-name-section --out-dir /tmp/c10b-t3-formats \
  target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && \
wc -c /tmp/c10b-t3-formats/roomboard_formats_wasm_bg.wasm && rm -rf /tmp/c10b-t3-formats
```

  Attendu : ≤ 3 145 728 o (≈ 800 Ko d'après F26) ; la valeur va au rapport.

- [ ] **Étape 10 : format, clippy, commit.** `cargo fmt --all` ;
  `cargo clippy -p roomboard-formats -p roomboard-formats-wasm --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)" | head` (rien).

```bash
cd "$WT" && git add crates/roomboard-formats/Cargo.toml && git add crates/roomboard-formats/src/lib.rs && \
git add crates/roomboard-formats/src/sheet.rs && git add crates/roomboard-formats/tests/fixtures/valeurs.xlsx && \
git add crates/roomboard-formats-wasm/src/lib.rs && git add Cargo.lock && git add THIRD_PARTY_NOTICES.md && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(formats): read the first xlsx sheet as values with calamine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : les 11 noms `ok` et l'`ignored`, la taille du module `formats`, la liste des crates ajoutés et leurs
  licences, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t4"></a>

### Tâche T4 — Contrat TS : commandes C10b, vue `merges`/`shade`, fausse liaison, contrôle de forme

**Objectif.** Le contrat de la page (`core/api.ts`) gagne les commandes C10b (F3, F4, F9, F18), les champs `to` (F6,
F15), `TableData.merges` et `TableCell.shade` (F29) ; la fausse liaison suit le cœur à l'identique (règle F2, mêmes
refus dans le même ordre, une étape par commande, aucune étape vide ; D36) ; `toTable` contrôle la forme des zones et de
l'ombrage venus de Wasm (effet de bord « la vue d'un tableau gagne `merges` et `shade` »). Les nouveaux cas d'`apply` de
`wasm-core.ts` lèvent jusqu'à T7. Contrat commun C10b joué sur la fausse liaison (T7 y ajoute le vrai module).

**Fichiers.**
- Modifier : `apps/web/src/core/api.ts:12-13` (en-tête), `:96-101` (commandes), `:117-128` (`TableCell`, `TableData`)
- Modifier : `apps/web/src/core/fake-core.ts:19-23` (en-tête), `:68-78` (`FakeCell`), `:145-160` (aides, `tableView`),
  `:593-677` (`apply` : commandes du tableau), `:922-950` (`loadTable`)
- Modifier : `apps/web/src/core/wasm-core.ts:109-139` (`toTable`), `:363-377` (`apply`)
- Modifier : `apps/web/src/core/fake-core.test.ts:572` et bloc neuf ; `apps/web/src/core/wasm-core.contract.test.ts:1538`,
  `:1648`, `:1664-1665`, `:1673-1674`, `:1709-1711` et blocs neufs

**Interfaces.**
- Consomme : rien d'une autre tâche (miroir de T1, T2 : mêmes règles, écrites ici en TS).
- Produit (lu par T6, T7, T8, T9, T10, T11) :

```ts
export interface CellIds { readonly row: string; readonly col: string }
export interface TableCell { readonly row: string; readonly col: string; readonly text: string; readonly fill: string | null; readonly shade: string | null }
export interface TableMerge { readonly row: string; readonly col: string; readonly rows: number; readonly cols: number }
export interface TableData { …C10a…; readonly merges: readonly TableMerge[] }
// Command :
| { readonly type: "RemoveTableLine"; readonly id: string; readonly axis: TableAxis; readonly line: string; readonly to?: string }
| { readonly type: "SetTableFill"; readonly id: string; readonly row: string; readonly col: string; readonly to?: CellIds; readonly fill: string | null }
| { readonly type: "MergeTableCells"; readonly id: string; readonly from: CellIds; readonly to: CellIds }
| { readonly type: "SplitTableCell"; readonly id: string; readonly row: string; readonly col: string }
| { readonly type: "SetTableShade"; readonly id: string; readonly from: CellIds; readonly to: CellIds; readonly shade: string | null }
| { readonly type: "ImportTable"; readonly page: string; readonly matrix: Matrix; readonly colWidth: number; readonly rowHeights: readonly number[]; readonly cols: number; readonly cells: readonly string[]; readonly merges: readonly (readonly [number, number, number, number])[]; readonly color: string; readonly size: number }
```

  `toTable(v: unknown): TableData` (exporté, inchangé de nom) ; `fakeCore` : mêmes vues que le cœur.
- Réutilise : `apps/web/src/core/wasm-core.ts:110` (`toTable`), `:363-377` (`apply`) ; `fake-core.ts:101-160`
  (`FakeTable`, `tableView`), `:361` (`writeTable`), `:593-` (`apply`) ; nombres finis > 0 par le `finitePositive` /
  `positive` locaux de `fake-core.ts:73`, `:219` (aucune nouvelle copie ; constat « sans module commun » laissé ouvert).
- Réutilise : `apps/web/src/core/rich-text.ts` — `validColor` (couleur de l'ombrage et de l'import, comme `valid_color`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C10b|C10a|×|FAIL|Test Files|Tests " | tail -80 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucune ligne `×` ni `FAIL` ; au moins 9 lignes `✓ … contrat C10b : fausse liaison` (dont « MergeTableCells (F3) »,
« RemoveTableLine avec to (F6) », « ImportTable (F18) »), 2 `✓ contrôle de forme C10b (tableau)`, 2
`✓ fakeCore — C10b (tableau)` (dont « JSON : span recoupant ou sans ligne : ignoré, gardé », Review Focus 1) ; les blocs
« contrat C10a : fausse liaison » et « contrôle de forme C10a (tableau) » restent verts. `tsc` : seuls les écarts nommés
ci-dessous.

**Écarts `tsc` nommés (recopiés de la table de l'en-tête).** Après cette tâche et jusqu'à T9 :
`src/engine/render/table-paint.test.ts`, `src/engine/render/canvas2d.test.ts` (`merges` / `shade` absents des littéraux
`TableData`) ; jusqu'à la fusion de T6 qui les complète : `src/engine/table-geom.test.ts` (même cause). Aucun autre.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé. Les
  blocs « vrai module » se sautent d'eux-mêmes sans `.wasm` (mécanisme existant) : T7 les joue.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`
  (types seuls, jamais le `.wasm`, jamais commités).
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC10 `span` = `[id de la dernière ligne, id de la dernière colonne]` sur l'ancre seule, jamais `mergedInto` ;
  `shade` = couleur ; une commande ne change que les clés qu'elle vise.
- GC11 La fausse liaison suit le cœur (D36) dans le même ordre de refus, avec les mêmes messages.
- GC13 `tsc` vide sauf les écarts nommés ci-dessus.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les fichiers ci-dessus.

**Patron à ne pas reprendre.** Calculer les zones dans la page à partir des `span` bruts (chaque consommateur sa règle)
ou écrire une cellule en bloc (`cells.set(key, { text, fill })`, `fake-core.ts:626` aujourd'hui) qui perdrait `shade` et
`span` : la fausse liaison garde la règle F2 dans une seule fonction (`mergesOf`, miroir de `merges_of`,
`crates/roomboard-core/src/table.rs`, T1) et chaque écriture part de la cellule existante (`{ ...cell, text }`). Chemin
de référence : `apps/web/src/core/fake-core.ts:593-677` (ordre des refus du cœur, commentaire `:594`).

**Interdits.** Ne pas brancher les appels Wasm (T7) ; ne pas changer les messages ; ne pas toucher `engine/`.

**Critère « terminé ».** Commande bornée verte, `tsc` limité aux écarts nommés, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : contrat.** Dans `apps/web/src/core/api.ts`, ajouter à l'en-tête après la ligne C10a :

```ts
// C10b : MergeTableCells, SplitTableCell, SetTableShade, ImportTable ; RemoveTableLine.to, SetTableFill.to (plages) ;
// TableData.merges (zones calculées par le cœur, règle F2 : la page les lit, ne les recalcule pas) ; TableCell.shade (F8).
```

  Remplacer les variantes `RemoveTableLine` et `SetTableFill` (`:96-101`) et ajouter les quatre neuves :

```ts
  /** Retire aussi ses cellules ; to : dernière ligne de la plage, comprise (C10b, F6) ; refusée s'il n'en resterait aucune. */
  | { readonly type: "RemoveTableLine"; readonly id: string; readonly axis: TableAxis; readonly line: string; readonly to?: string }
  /** Uniformiser : toutes les colonnes, toutes les lignes (peut réduire, T11). */
  | { readonly type: "SetTableSizes"; readonly id: string; readonly colWidth: number; readonly rowHeight: number }
  /** null retire ; to : autre coin de la plage (C10b, F15) ; une cellule couverte vaut pour son ancre. */
  | { readonly type: "SetTableFill"; readonly id: string; readonly row: string; readonly col: string; readonly to?: CellIds; readonly fill: string | null }
  /** C10b (F3) : rectangle from–to ; l'ancre garde son contenu, les couvertes sont retirées. */
  | { readonly type: "MergeTableCells"; readonly id: string; readonly from: CellIds; readonly to: CellIds }
  /** C10b (F4) : row, col = ancre d'une zone. */
  | { readonly type: "SplitTableCell"; readonly id: string; readonly row: string; readonly col: string }
  /** C10b (F9) : shade = couleur, null retire (révéler, retirer l'ombrage). */
  | { readonly type: "SetTableShade"; readonly id: string; readonly from: CellIds; readonly to: CellIds; readonly shade: string | null }
  /** C10b (F18) : tableau rempli ; cells = rows × cols textes en rangées ; merges = [ligne, colonne, lignes, colonnes]. */
  | {
      readonly type: "ImportTable";
      readonly page: string;
      readonly matrix: Matrix;
      readonly colWidth: number;
      readonly rowHeights: readonly number[];
      readonly cols: number;
      readonly cells: readonly string[];
      readonly merges: readonly (readonly [number, number, number, number])[];
      readonly color: string;
      readonly size: number;
    };
```

  Remplacer `TableCell` et `TableData` (`:120-128`) :

```ts
/** Cellule par ids (C10b). */
export interface CellIds { readonly row: string; readonly col: string }
/** Cellule non vide (texte, remplissage ou ombrage) ; `fill` = remplissage (U32), `shade` = ombrage révélable (F8), null sans. */
export interface TableCell { readonly row: string; readonly col: string; readonly text: string; readonly fill: string | null; readonly shade: string | null }
/** Zone fusionnée (F29) : ancre par ids, étendue en rangs, après la règle F2 du cœur. */
export interface TableMerge { readonly row: string; readonly col: string; readonly rows: number; readonly cols: number }
/** Tableau (T13) : boîte locale (0, 0)-(somme des largeurs, somme des hauteurs) ; cellules non vides dans l'ordre de lecture ;
 *  zones dans l'ordre de lecture de leurs ancres. */
export interface TableData {
  readonly color: string;
  readonly size: number;
  readonly cols: readonly TableCol[];
  readonly rows: readonly TableRow[];
  readonly cells: readonly TableCell[];
  readonly merges: readonly TableMerge[];
}
```

- [ ] **Étape 3 : tests rouges.** Dans `apps/web/src/core/wasm-core.contract.test.ts` : ajouter `shade: null` aux
  cellules attendues `:1538`, `:1648`, `:1664`, `:1665`, `:1673`, `:1674` ; dans le bloc « contrôle de forme C10a »
  (`:1709`) ajouter `merges: []` au littéral `table` (`… cells: [...], merges: [] }`) et `shade: null` à la cellule
  attendue `:1711`. Importer `CellIds` dans la ligne `import type { … } from "./api"`. À la fin du fichier :

```ts
// C10b (fusion, ombrage, import) : contrat commun ; T7 branche le vrai module (c10bFactories = factories).
const c10bFactories: { name: string; f: CoreFactory }[] = [{ name: "fausse liaison", f: fakeCore }];
const SHADE = "#94a3b8";
const c10bIds = (t: TableData): { readonly r: string[]; readonly c: string[] } => ({ r: t.rows.map((x) => x.id), c: t.cols.map((x) => x.id) });
const c10bAt = (g: { readonly r: string[]; readonly c: string[] }, i: number, j: number): CellIds => ({ row: g.r[i] ?? "", col: g.c[j] ?? "" });
const shadedOf = (t: TableData): string[] => t.cells.filter((x) => x.shade !== null).map((x) => `${x.row}:${x.col}`);

describe.each(c10bFactories)("contrat C10b : $name", ({ f }) => {
  it("MergeTableCells (F3) : l'ancre garde son texte, les couvertes sont retirées ; une étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "Lundi" });
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 1), content: "Mardi" });
    const c = d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 1) });
    expect(c.ids).toEqual([id]);
    const t = tableOf(d, id);
    expect(t.merges).toEqual([{ row: g.r[0], col: g.c[0], rows: 2, cols: 2 }]);
    expect(t.cells.map((x) => x.text)).toEqual(["Lundi"]);
    d.undo();
    expect(tableOf(d, id).merges).toEqual([]);
    expect(tableOf(d, id).cells.map((x) => x.text)).toEqual(["Lundi", "Mardi"]);
    d.free();
  });

  it("MergeTableCells refusé (F3) : une cellule, ligne inconnue, recouvrement partiel ; aucune étape", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 2, 2), to: c10bAt(g, 2, 2) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: { row: "absente", col: g.c[0] ?? "" }, to: c10bAt(g, 2, 2) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 1, 0), to: c10bAt(g, 2, 1) }))).toBe(TABLE_MESSAGE);
      expect(messageOf(() => d.apply({ type: "MergeTableCells", id: "absent", from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) }))).toBe("élément inconnu : absent");
    });
    d.free();
  });

  it("SplitTableCell (F4) : la zone se défait, le texte reste en haut à gauche ; cellule couverte : refus", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "Lundi" });
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SplitTableCell", id, ...c10bAt(g, 0, 1) }))).toBe(TABLE_MESSAGE));
    d.apply({ type: "SplitTableCell", id, ...c10bAt(g, 0, 0) });
    const t = tableOf(d, id);
    expect(t.merges).toEqual([]);
    expect(t.cells).toEqual([{ ...c10bAt(g, 0, 0), text: "Lundi", fill: null, shade: null }]);
    d.free();
  });

  it("SetTableShade (F8, F9, F12) : une colonne, révélation en une étape, sans changement aucune étape, couleur invalide", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 0, 1) });
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 2, 2), shade: SHADE });
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 1), to: c10bAt(g, 0, 1), shade: SHADE });
    expect(shadedOf(tableOf(d, id))).toEqual([`${g.r[0]}:${g.c[0]}`, `${g.r[0]}:${g.c[2]}`, `${g.r[1]}:${g.c[2]}`, `${g.r[2]}:${g.c[2]}`]);
    unchanged(d, () => d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 2, 2), shade: SHADE }));
    d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 0, 2), shade: null });
    expect(shadedOf(tableOf(d, id))).toHaveLength(3);
    d.undo();
    expect(shadedOf(tableOf(d, id))).toHaveLength(4);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableShade", id, from: c10bAt(g, 0, 2), to: c10bAt(g, 0, 2), shade: "!!" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("SetTableFill avec to (F15) : la plage, ancres et cellules simples, une étape ; sans to : comme C10a", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 3, rows: 2 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    d.apply({ type: "SetTableFill", id, ...c10bAt(g, 0, 0), to: c10bAt(g, 1, 1), fill: "#bbf7d0" });
    expect(tableOf(d, id).cells.filter((x) => x.fill !== null).map((x) => `${x.row}:${x.col}`)).toEqual([`${g.r[0]}:${g.c[0]}`, `${g.r[0]}:${g.c[1]}`, `${g.r[1]}:${g.c[1]}`]);
    d.undo();
    expect(tableOf(d, id).cells.every((x) => x.fill === null)).toBe(true);
    d.free();
  });

  it("RemoveTableLine avec to (F6, S5) : plage en une étape ; ligne d'ancrage retirée : la zone glisse ; tout retirer : refus", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 4 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 2, 0) });
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[0] ?? "" });
    expect(tableOf(d, id).merges).toEqual([{ row: g.r[1], col: g.c[0], rows: 2, cols: 1 }]);
    d.undo();
    const before = tableOf(d, id);
    d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[2] ?? "", to: g.r[1] ?? "" });
    expect(tableOf(d, id).rows.map((x) => x.id)).toEqual([g.r[0], g.r[3]]);
    expect(tableOf(d, id).merges).toEqual([]);
    d.undo();
    expect(tableOf(d, id)).toEqual(before);
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "RemoveTableLine", id, axis: "row", line: g.r[0] ?? "", to: g.r[3] ?? "" }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("InsertTableLine dans une zone (F5) : elle grandit ; SetTableCell sur une ancre de deux lignes (F7) : la dernière grandit", () => {
    const d = f.blank();
    const id = addTable(d, first(d), { cols: 2, rows: 3 });
    const g = c10bIds(tableOf(d, id));
    d.apply({ type: "MergeTableCells", id, from: c10bAt(g, 0, 0), to: c10bAt(g, 1, 0) });
    d.apply({ type: "SetTableCell", id, ...c10bAt(g, 0, 0), content: "long", rowHeight: 200 });
    expect(tableOf(d, id).rows.map((x) => x.height)).toEqual([64, 136, 64]);
    d.apply({ type: "InsertTableLine", id, axis: "row", at: 1 });
    expect(tableOf(d, id).merges).toEqual([{ row: g.r[0], col: g.c[0], rows: 3, cols: 1 }]);
    d.free();
  });

  it("ImportTable (F18) : une étape ; textes, fusion, matrice ; texte couvert ignoré", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({
      type: "ImportTable", page: p, matrix: [0.5, 0, 0, 0.5, 300, 100], colWidth: 240, rowHeights: [64, 80], cols: 2,
      cells: ["Titre", "caché", "a", "b"], merges: [[0, 0, 1, 2]], color: "#1d4ed8", size: 36,
    });
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([0.5, 0, 0, 0.5, 300, 100]);
    const t = tableOf(d, id);
    expect([t.color, t.cols.map((x) => x.width), t.rows.map((x) => x.height)]).toEqual(["#1d4ed8", [240, 240], [64, 80]]);
    expect(t.merges).toEqual([{ row: t.rows[0]?.id, col: t.cols[0]?.id, rows: 1, cols: 2 }]);
    expect(t.cells.map((x) => x.text)).toEqual(["Titre", "a", "b"]);
    expect(d.bounds([id])).toEqual({ x0: 300, y0: 100, x1: 540, y1: 172 });
    d.undo();
    expect(d.element(id)).toBeNull();
    d.free();
  });

  it("ImportTable refusé (F18, PC1) : dimensions, longueurs, tailles, couleur, matrice, fusions ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    type Imp = Extract<Command, { type: "ImportTable" }>;
    const ok: Imp = { type: "ImportTable", page: p, matrix: [1, 0, 0, 1, 0, 0], colWidth: 240, rowHeights: [64, 64], cols: 2, cells: ["", "", "", ""], merges: [], color: "#000000", size: 36 };
    for (const over of [
      { cols: 0, cells: [] }, { cols: 65 }, { rowHeights: [] }, { cells: ["", ""] }, { rowHeights: [64, Number.NaN] },
      { colWidth: 0 }, { color: "!!" }, { matrix: [0, 0, 0, 0, 0, 0] as const }, { merges: [[0, 0, 1, 1]] as const },
      { merges: [[1, 1, 2, 1]] as const }, { merges: [[0, 0, 2, 1], [1, 0, 1, 2]] as const },
    ] as Partial<Imp>[]) {
      unchanged(d, () => expect(messageOf(() => d.apply({ ...ok, ...over }))).toBe(TABLE_MESSAGE));
    }
    expect(messageOf(() => d.apply({ ...ok, page: "zz" }))).toBe("page inconnue : zz");
    d.free();
  });
});

describe("contrôle de forme C10b (tableau)", () => {
  const base = { id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0] };
  const table = {
    color: "#000000", size: 36, cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }], rows: [{ id: "r1", height: 64 }],
    cells: [{ row: "r1", col: "c1", text: "A", fill: undefined, shade: "#94a3b8" }], merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
  };
  it("toElementView : zones et ombrage contrôlés ; shade absent → null", () => {
    expect(toElementView({ ...base, table })).toEqual({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", fill: null, shade: "#94a3b8" }] } });
    const plain = { ...table, cells: [{ row: "r1", col: "c1", text: "A" }] };
    expect(toElementView({ ...base, table: plain })).toEqual({ ...base, table: { ...plain, cells: [{ row: "r1", col: "c1", text: "A", fill: null, shade: null }] } });
  });
  it("toElementView : zones ou ombrage de forme fausse → erreur", () => {
    expect(() => toElementView({ ...base, table: { ...table, merges: undefined } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, merges: [{ row: "r1", col: "c1", rows: 0, cols: 2 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, merges: [{ row: 1, col: "c1", rows: 1, cols: 2 }] } })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...base, table: { ...table, cells: [{ row: "r1", col: "c1", text: "A", shade: true }] } })).toThrow("ElementView invalide");
  });
});
```

  Dans `apps/web/src/core/fake-core.test.ts` : à la ligne `:572`, la cellule attendue gagne `shade: null` ; à la fin du
  fichier :

```ts
describe("fakeCore — C10b (tableau)", () => {
  const loadJson = (table: unknown) =>
    fakeCore.load(new TextEncoder().encode(JSON.stringify({ pages: [{ id: "p1", elements: [{ id: "t1", kind: "table", transform: [1, 0, 0, 1, 0, 0], table }] }] })));
  const lines = (ids: string[], key: "width" | "height") => ids.map((id) => ({ id, [key]: 100 }));

  it("JSON : span recoupant ou sans ligne : ignoré, gardé à l'enregistrement (F2, S5)", () => {
    const span = (r: string, c: string) => ({ text: "", fill: null, span: [r, c] });
    const d = loadJson({
      cols: lines(["c1", "c2", "c3"], "width"), rows: lines(["r1", "r2", "r3"], "height"),
      cells: { "r1:c1": { text: "A", fill: null, span: ["r2", "c2"] }, "r1:c2": span("r3", "c3"), "r2:c3": span("r9", "c3"), "r3:c2": span("r2", "c1"), "r3:c3": span("r3", "c3") },
    });
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error("tableau");
    expect(v.table.merges).toEqual([{ row: "r1", col: "c1", rows: 2, cols: 2 }]);
    const back = fakeCore.load(d.save("2026-11-20T00:00:00Z", "0.1.0")).element("t1");
    expect(back).toEqual(v);
  });

  it("JSON : shade lu, invalide retiré (PC13) ; une cellule seulement ombrée est listée", () => {
    const d = loadJson({
      cols: lines(["c1", "c2"], "width"), rows: lines(["r1"], "height"),
      cells: { "r1:c1": { text: "", fill: null, shade: "#94a3b8" }, "r1:c2": { text: "B", fill: null, shade: true } },
    });
    const v = d.element("t1");
    if (v?.kind !== "table") throw new Error("tableau");
    expect(v.table.cells).toEqual([
      { row: "r1", col: "c1", text: "", fill: null, shade: "#94a3b8" },
      { row: "r1", col: "c2", text: "B", fill: null, shade: null },
    ]);
  });
});
```

- [ ] **Étape 4 : les voir rouges.** La commande bornée : `×` sur les blocs C10b et sur les cellules C10a complétées
  (`shade` absent).

- [ ] **Étape 5 : `toTable`.** Dans `apps/web/src/core/wasm-core.ts`, remplacer `toTable` (`:109-139`) :

```ts
/** Vue d'un tableau venue de Wasm (T13, F29) : forme contrôlée ; `fill`, `shade` absents (Option::None) → null ; zones
 *  `{ row, col, rows, cols }` exigées (étendues entières ≥ 1). */
export function toTable(v: unknown): TableData {
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { color, size, cols, rows, cells, merges } = v;
  if (
    typeof color !== "string" || typeof size !== "number" || !Array.isArray(cols) || !Array.isArray(rows) || !Array.isArray(cells) ||
    !Array.isArray(merges)
  ) {
    throw new Error(ELEMENT);
  }
  const color0 = (x: unknown): string | null => {
    if (x !== undefined && x !== null && typeof x !== "string") throw new Error(ELEMENT);
    return typeof x === "string" ? x : null;
  };
  const extent = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 1;
  return {
    color,
    size,
    cols: cols.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { id, width } = c;
      if (typeof id !== "string" || !finitePositive(width)) throw new Error(ELEMENT);
      return { id, width };
    }),
    rows: rows.map((r: unknown) => {
      if (!isRecord(r)) throw new Error(ELEMENT);
      const { id, height } = r;
      if (typeof id !== "string" || !finitePositive(height)) throw new Error(ELEMENT);
      return { id, height };
    }),
    cells: cells.map((c: unknown) => {
      if (!isRecord(c)) throw new Error(ELEMENT);
      const { row, col, text, fill, shade } = c;
      if (typeof row !== "string" || typeof col !== "string" || typeof text !== "string") throw new Error(ELEMENT);
      return { row, col, text, fill: color0(fill), shade: color0(shade) };
    }),
    merges: merges.map((m: unknown) => {
      if (!isRecord(m)) throw new Error(ELEMENT);
      const { row, col, rows: n, cols: k } = m;
      if (typeof row !== "string" || typeof col !== "string" || !extent(n) || !extent(k)) throw new Error(ELEMENT);
      return { row, col, rows: n, cols: k };
    }),
  };
}
```

  Dans `apply` (`:363-377`), remplacer les cas `RemoveTableLine` et `SetTableFill` et ajouter les quatre neufs (T7 les
  branche) :

```ts
      case "RemoveTableLine":
        if (cmd.to !== undefined) throw new Error("C10b : RemoveTableLine.to branché par la liaison (T7)");
        return toChange(this.d.remove_table_line(cmd.id, cmd.axis === "row", cmd.line));
      case "SetTableSizes":
        return toChange(this.d.set_table_sizes(cmd.id, cmd.colWidth, cmd.rowHeight));
      case "SetTableFill":
        if (cmd.to !== undefined) throw new Error("C10b : SetTableFill.to branché par la liaison (T7)");
        // null → undefined : Option::None côté Rust.
        return toChange(this.d.set_table_fill(cmd.id, cmd.row, cmd.col, cmd.fill ?? undefined));
      case "MergeTableCells":
      case "SplitTableCell":
      case "SetTableShade":
      case "ImportTable":
        throw new Error(`C10b : ${cmd.type} branché par la liaison (T7)`);
```

- [ ] **Étape 6 : fausse liaison.** Dans `apps/web/src/core/fake-core.ts` : ajouter `CellIds` aux imports de types de
  `./api` ; à l'en-tête, après les lignes C10a :

```ts
// C10b : fusion (`span` sur l'ancre, zones par `mergesOf`, miroir de `merges_of` du cœur, règle F2), division, ombrage
// (`shade`), plages de RemoveTableLine et SetTableFill, report des zones (F6), hauteur d'une ancre haute (F7),
// ImportTable (F18) : mêmes refus dans le même ordre que `table.rs`, une étape par commande, aucune étape vide.
```

  Remplacer `FakeCell` (`:68`) :

```ts
/** Cellule de la fausse liaison ; absente du Map = vide ; `span` = [dernière ligne, dernière colonne] (ancre, F1). */
interface FakeCell { readonly text: string; readonly fill: string | null; readonly shade: string | null; readonly span: readonly [string, string] | null }
```

  Après `inLine` (`:151`), ajouter les aides et remplacer `tableView` :

```ts
/** Zone retenue (F2), en rangs, bornes comprises. */
interface FakeMerge { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
const EMPTY_CELL: FakeCell = { text: "", fill: null, shade: null, span: null };
const overlaps = (a: FakeMerge, b: FakeMerge): boolean => a.r0 <= b.r1 && b.r0 <= a.r1 && a.c0 <= b.c1 && b.c0 <= a.c1;
const inside = (a: FakeMerge, b: FakeMerge): boolean => b.r0 <= a.r0 && a.r1 <= b.r1 && b.c0 <= a.c0 && a.c1 <= b.c1;
const contains = (m: FakeMerge, r: number, c: number): boolean => r >= m.r0 && r <= m.r1 && c >= m.c0 && c <= m.c1;
const rowId = (t: FakeTable, i: number): string => t.rows[i]?.id ?? "";
const colId = (t: FakeTable, j: number): string => t.cols[j]?.id ?? "";
const keyAt = (t: FakeTable, i: number, j: number): string => cellKey(rowId(t, i), colId(t, j));

/** Règle F2, comme `merges_of` du cœur : ancres dans l'ordre de lecture ; `span` désignant une ligne et une colonne lues,
 *  de rang ≥ l'ancre, au moins deux cellules, sans recouvrement d'une zone déjà retenue. */
function mergesOf(t: FakeTable): FakeMerge[] {
  const out: FakeMerge[] = [];
  t.rows.forEach((r, r0) => {
    t.cols.forEach((c, c0) => {
      const span = t.cells.get(cellKey(r.id, c.id))?.span;
      if (!span) return;
      const r1 = t.rows.findIndex((l) => l.id === span[0]);
      const c1 = t.cols.findIndex((l) => l.id === span[1]);
      if (r1 < r0 || c1 < c0 || (r1 === r0 && c1 === c0)) return;
      const m = { r0, c0, r1, c1 };
      if (!out.some((o) => overlaps(o, m))) out.push(m);
    });
  });
  return out;
}

/** Ancres et cellules simples du rectangle, sans doublon (F9, F15, PC11), comme `targets` du cœur. */
function targets(rect: FakeMerge, merges: readonly FakeMerge[]): [number, number][] {
  const out: [number, number][] = [];
  for (let r = rect.r0; r <= rect.r1; r++) {
    for (let c = rect.c0; c <= rect.c1; c++) {
      const m = merges.find((x) => contains(x, r, c));
      const a: [number, number] = m ? [m.r0, m.c0] : [r, c];
      if (!out.some(([i, j]) => i === a[0] && j === a[1])) out.push(a);
    }
  }
  return out;
}

/** Rectangle normalisé de deux coins par ids ; null si une ligne ou une colonne manque. */
function rectOf(t: FakeTable, a: CellIds, b: CellIds): FakeMerge | null {
  const ra = t.rows.findIndex((l) => l.id === a.row);
  const ca = t.cols.findIndex((l) => l.id === a.col);
  const rb = t.rows.findIndex((l) => l.id === b.row);
  const cb = t.cols.findIndex((l) => l.id === b.col);
  if (ra < 0 || ca < 0 || rb < 0 || cb < 0) return null;
  return { r0: Math.min(ra, rb), c0: Math.min(ca, cb), r1: Math.max(ra, rb), c1: Math.max(ca, cb) };
}

/** Fusions d'un import (F18), comme `merges_ok` du cœur. */
function validMerges(merges: readonly (readonly [number, number, number, number])[], rows: number, cols: number): boolean {
  const seen: FakeMerge[] = [];
  for (const [r, c, nr, nc] of merges) {
    if (![r, c, nr, nc].every((v) => Number.isInteger(v) && v >= 0) || nr < 1 || nc < 1 || nr * nc < 2 || r + nr > rows || c + nc > cols) return false;
    const m = { r0: r, c0: c, r1: r + nr - 1, c1: c + nc - 1 };
    if (seen.some((o) => overlaps(o, m))) return false;
    seen.push(m);
  }
  return true;
}

/** Vue (T13, F29) : cellules non vides (texte, remplissage ou ombrage) dans l'ordre de lecture ; zones par `mergesOf`. */
function tableView(t: FakeTable): TableData {
  const cells: TableCell[] = [];
  for (const r of t.rows) {
    for (const c of t.cols) {
      const cell = t.cells.get(cellKey(r.id, c.id));
      if (cell && (cell.text !== "" || cell.fill !== null || cell.shade !== null)) {
        cells.push({ row: r.id, col: c.id, text: cell.text, fill: cell.fill, shade: cell.shade });
      }
    }
  }
  const merges = mergesOf(t).map((m) => ({ row: rowId(t, m.r0), col: colId(t, m.c0), rows: m.r1 - m.r0 + 1, cols: m.c1 - m.c0 + 1 }));
  return { color: t.color, size: t.size, cols: t.cols, rows: t.rows, cells, merges };
}
```

  Dans la classe, après `writeTable` (`:371`) :

```ts
  /** `fill` ou `shade` posé ou retiré sur les ancres et cellules simples du rectangle ; rien à changer : aucune étape. */
  private setOnTargets(found: Found, id: string, t: FakeTable, rect: FakeMerge, key: "fill" | "shade", value: string | null): Change {
    const cells = new Map(t.cells);
    let changed = false;
    for (const [r, c] of targets(rect, mergesOf(t))) {
      const k = keyAt(t, r, c);
      const cell = t.cells.get(k) ?? EMPTY_CELL;
      if (cell[key] === value) continue;
      cells.set(k, { ...cell, [key]: value });
      changed = true;
    }
    return changed ? this.writeTable(found, id, { ...t, cells }) : this.unchanged();
  }
```

  Dans `apply`, remplacer les cas `SetTableCell`, `RemoveTableLine`, `SetTableFill` et ajouter quatre cas après
  `SetTableFill` :

```ts
      case "SetTableCell": {
        if (cmd.rowHeight !== undefined && !positive(cmd.rowHeight)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const c = t.cols.findIndex((l) => l.id === cmd.col);
        if (r < 0 || c < 0) throw new Error(MESSAGES.badTable);
        // F7 : sur une ancre de plusieurs lignes, la hauteur exigée vaut pour la zone ; sa dernière ligne grandit.
        const zone = mergesOf(t).find((m) => m.r0 === r && m.c0 === c);
        const z0 = zone?.r0 ?? r;
        const z1 = zone?.r1 ?? r;
        const zoneH = sum(t.rows.slice(z0, z1 + 1).map((l) => l.height));
        const lastH = t.rows[z1]?.height ?? 0;
        const h = cmd.rowHeight;
        const grow = h !== undefined && h > zoneH ? (z0 === z1 ? h : lastH + (h - zoneH)) : null;
        if (grow !== null && !fitsF32([sum(t.rows.map((l) => l.height)) - lastH + grow])) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cell = t.cells.get(key);
        const current = cell?.text ?? "";
        if (current === cmd.content && grow === null) return this.unchanged();
        const cells = new Map(t.cells);
        if (current !== cmd.content) cells.set(key, { ...(cell ?? EMPTY_CELL), text: cmd.content });
        const rows = grow === null ? t.rows : t.rows.map((l, i) => (i === z1 ? { ...l, height: grow } : l));
        return this.writeTable(found, cmd.id, { ...t, rows, cells });
      }
```

```ts
      case "RemoveTableLine": {
        const { found, t } = this.tableOf(cmd.id);
        const lines: readonly { readonly id: string }[] = cmd.axis === "row" ? t.rows : t.cols;
        const ia = lines.findIndex((l) => l.id === cmd.line);
        const ib = cmd.to === undefined ? ia : lines.findIndex((l) => l.id === cmd.to);
        if (ia < 0 || ib < 0) throw new Error(MESSAGES.badTable);
        const a = Math.min(ia, ib);
        const b = Math.max(ia, ib);
        if (b - a + 1 >= lines.length) throw new Error(MESSAGES.badTable);
        const gone = new Set(lines.slice(a, b + 1).map((l) => l.id));
        const cells = new Map([...t.cells].filter(([k]) => ![...gone].some((l) => inLine(k, cmd.axis, l))));
        // F6 : report des zones touchées, comme `span_moves` du cœur.
        const dropped = (i: number): boolean => i >= a && i <= b;
        for (const m of mergesOf(t)) {
          const [s, e, across]: [number, number, number] = cmd.axis === "row" ? [m.r0, m.r1, m.c1 - m.c0 + 1] : [m.c0, m.c1, m.r1 - m.r0 + 1];
          if (e < a || s > b) continue;
          const left: number[] = [];
          for (let i = s; i <= e; i++) if (!dropped(i)) left.push(i);
          const firstLeft = left[0];
          const lastLeft = left[left.length - 1];
          if (firstLeft === undefined || lastLeft === undefined) continue;
          const size = left.length * across;
          const [ar, ac]: [number, number] = cmd.axis === "row" ? [firstLeft, m.c0] : [m.r0, firstLeft];
          const [lr, lc]: [number, number] = cmd.axis === "row" ? [lastLeft, m.c1] : [m.r1, lastLeft];
          const span: [string, string] = [rowId(t, lr), colId(t, lc)];
          const setSpan = (k: string): void => {
            cells.set(k, { ...(cells.get(k) ?? EMPTY_CELL), span });
          };
          if (dropped(s)) {
            if (size >= 2) setSpan(keyAt(t, ar, ac));
          } else if (size < 2) {
            const k = keyAt(t, m.r0, m.c0);
            const cur = cells.get(k);
            if (cur) cells.set(k, { ...cur, span: null });
          } else if (dropped(e)) {
            setSpan(keyAt(t, m.r0, m.c0));
          }
        }
        return this.writeTable(
          found,
          cmd.id,
          cmd.axis === "row" ? { ...t, rows: t.rows.filter((l) => !gone.has(l.id)), cells } : { ...t, cols: t.cols.filter((l) => !gone.has(l.id)), cells },
        );
      }
```

```ts
      case "SetTableFill": {
        if (cmd.fill !== null && !validColor(cmd.fill)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const from = { row: cmd.row, col: cmd.col };
        const rect = rectOf(t, from, cmd.to ?? from);
        if (rect === null) throw new Error(MESSAGES.badTable);
        return this.setOnTargets(found, cmd.id, t, rect, "fill", cmd.fill);
      }
      case "SetTableShade": {
        if (cmd.shade !== null && !validColor(cmd.shade)) throw new Error(MESSAGES.badTable);
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null) throw new Error(MESSAGES.badTable);
        return this.setOnTargets(found, cmd.id, t, rect, "shade", cmd.shade);
      }
      case "MergeTableCells": {
        const { found, t } = this.tableOf(cmd.id);
        const rect = rectOf(t, cmd.from, cmd.to);
        if (rect === null || (rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1) < 2) throw new Error(MESSAGES.badTable);
        const merges = mergesOf(t);
        if (merges.some((m) => overlaps(m, rect) && !inside(m, rect))) throw new Error(MESSAGES.badTable);
        const covered: string[] = [];
        for (let r = rect.r0; r <= rect.r1; r++) {
          for (let c = rect.c0; c <= rect.c1; c++) {
            const k = keyAt(t, r, c);
            if ((r !== rect.r0 || c !== rect.c0) && t.cells.has(k)) covered.push(k);
          }
        }
        const inner = merges.filter((m) => inside(m, rect));
        const same = inner.length === 1 && inner[0]?.r0 === rect.r0 && inner[0]?.c0 === rect.c0 && inner[0]?.r1 === rect.r1 && inner[0]?.c1 === rect.c1;
        if (same && covered.length === 0) return this.unchanged();
        const cells = new Map(t.cells);
        for (const k of covered) cells.delete(k);
        const anchor = keyAt(t, rect.r0, rect.c0);
        cells.set(anchor, { ...(cells.get(anchor) ?? EMPTY_CELL), span: [rowId(t, rect.r1), colId(t, rect.c1)] });
        return this.writeTable(found, cmd.id, { ...t, cells });
      }
      case "SplitTableCell": {
        const { found, t } = this.tableOf(cmd.id);
        const r = t.rows.findIndex((l) => l.id === cmd.row);
        const c = t.cols.findIndex((l) => l.id === cmd.col);
        if (r < 0 || c < 0 || !mergesOf(t).some((m) => m.r0 === r && m.c0 === c)) throw new Error(MESSAGES.badTable);
        const key = cellKey(cmd.row, cmd.col);
        const cells = new Map(t.cells);
        cells.set(key, { ...(t.cells.get(key) ?? EMPTY_CELL), span: null });
        return this.writeTable(found, cmd.id, { ...t, cells });
      }
      case "ImportTable": {
        // Ordre du cœur (F18) : arguments (BadTable), puis page.
        const n = cmd.rowHeights.length;
        const ok =
          validLines(cmd.cols) && validLines(n) && cmd.cells.length === cmd.cols * n && positive(cmd.colWidth) &&
          cmd.rowHeights.every(positive) && positive(cmd.size) && validColor(cmd.color) && validMatrix(cmd.matrix) &&
          fitsF32([...cmd.matrix, cmd.cols * cmd.colWidth, sum(cmd.rowHeights)]) && validMerges(cmd.merges, n, cmd.cols);
        if (!ok) throw new Error(MESSAGES.badTable);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          const cols = Array.from({ length: cmd.cols }, () => ({ id: newId(), width: cmd.colWidth }));
          const rows = cmd.rowHeights.map((height) => ({ id: newId(), height }));
          const covered = new Set<number>();
          const spans = new Map<number, [string, string]>();
          for (const [r, c, nr, nc] of cmd.merges) {
            spans.set(r * cmd.cols + c, [rows[r + nr - 1]?.id ?? "", cols[c + nc - 1]?.id ?? ""]);
            for (let i = r; i < r + nr; i++) for (let j = c; j < c + nc; j++) if (i !== r || j !== c) covered.add(i * cmd.cols + j);
          }
          const cells = new Map<string, FakeCell>();
          cmd.cells.forEach((text, i) => {
            const span = spans.get(i) ?? null;
            if (covered.has(i) || (text === "" && span === null)) return;
            cells.set(cellKey(rows[Math.floor(i / cmd.cols)]?.id ?? "", cols[i % cmd.cols]?.id ?? ""), { text, fill: null, shade: null, span });
          });
          const table: FakeTable = { color: cmd.color, size: cmd.size, cols, rows, cells };
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, transform: cmd.matrix, style: NO_STYLE, table });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
```

  Dans `loadTable` (`:930-937`), lire `shade` et `span` :

```ts
    for (const [k, c] of Object.entries(raw)) {
      if (!isRecord(c)) continue;
      const text = c["text"];
      const fill = c["fill"];
      const shade = c["shade"];
      const span = c["span"];
      cells.set(k, {
        text: typeof text === "string" ? text : "",
        fill: typeof fill === "string" && validColor(fill) ? fill : null,
        shade: typeof shade === "string" && validColor(shade) ? shade : null,
        span: Array.isArray(span) && span.length === 2 && typeof span[0] === "string" && typeof span[1] === "string" ? [span[0], span[1]] : null,
      });
    }
```

- [ ] **Étape 7 : vert.** La commande bornée ; `tsc` : seuls les écarts nommés.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/api.ts && git add apps/web/src/core/fake-core.ts && git add apps/web/src/core/fake-core.test.ts && \
git add apps/web/src/core/wasm-core.ts && git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): C10b table contract, fake core parity and shape checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N par bloc, noms vus, sortie `tsc` (écarts nommés seulement), une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t5"></a>

### Tâche T5 — Collage : HTML → grille, priorité du tableau sur l'image

**Objectif.** Un `<table>` HTML collé devient une grille de textes (F19, F20, DAB2) : lecture par un document **inerte**
(`DOMParser`, aucun script exécuté, aucune ressource chargée, aucun nœud adopté dans la page), premier tableau qui a une
ligne, modèle d'occupation du tableau HTML (`rowspan`, `colspan`, `rowspan="0"`), arrêt à 64 × 64 avec la source comptée
à part (F22), texte seul (sauts de ligne de `<br>` et des blocs, blancs repliés, espace insécable, tableau imbriqué
aplati, `<script>`/`<style>`/`<template>`/`<noscript>` ignorés), textes coupés à 2 000 caractères. `pastedTableHtml`
rend le HTML d'un collage qui porte un `<table>` (cible non éditable). Lignes et cellules lues par `ownRows` /
`ownCells` (lignes du tableau lui-même, cellules directes) : `rows` et `cells` de happy-dom incluent celles d'un tableau
imbriqué (vérifié dans `happy-dom@21.0.4`, `HTMLTableElement.js:123`) : `main.ts` (T11) le fait passer avant les images
jointes (effet de bord « un collage dont le HTML contient un `<table>` ne colle plus l'image jointe »).

**Fichiers.**
- Créer : `apps/web/src/platform/html-table.ts`, `apps/web/src/platform/html-table.test.ts`
- Modifier : `apps/web/src/platform/paste.ts` (tout le fichier, 25 lignes), `apps/web/src/platform/paste.test.ts` (bloc neuf)

**Interfaces.**
- Consomme : `TABLE_MAX_LINES` (`apps/web/src/core/api.ts:221`, existant).
- Produit (lu par T10, T11) :

```ts
// platform/html-table.ts
export const PASTE_MAX_CHARS = 8 * 1024 * 1024;
export const PASTE_TOO_BIG = "tableau trop gros pour être collé";
export const MAX_CELL_CHARS = 2000;
export interface GridMerge { readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
export interface TableGrid { readonly rows: number; readonly cols: number; readonly cells: readonly string[]; readonly merges: readonly GridMerge[]; readonly sourceRows: number; readonly sourceCols: number; readonly cutCells: boolean }
export function cutText(s: string): [string, boolean];
export function cellText(cell: Element): string;
export function tableFromHtml(html: string, parse: (s: string) => Document): TableGrid | null;
// platform/paste.ts
export interface PasteEventLike { readonly target: EventTarget | null; readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null }
export function pastedTableHtml(e: PasteEventLike): string | null;
```

- Réutilise : `apps/web/src/platform/paste.ts:12` (`isEditable`), `:20` (`pastedFiles`) — `pastedTableHtml` écrite à
  côté, même garde `isEditable` ; `pastedFiles` inchangée.
- Réutilise : aucun module existant (termes `DOMParser`, `rowspan`, `colSpan`, `<table` absents de `apps/web/src`) —
  nouveau module `platform/html-table.ts` : `tableFromHtml(html: string, parse: (s: string) => Document): TableGrid | null`
  et `TableGrid` (type partagé avec le lecteur de classeur, DAB2).
- Réutilise : `apps/web/src/core/api.ts:221` — `TABLE_MAX_LINES` (plafond 64 de la grille collée, F22).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/platform/html-table.test.ts src/platform/paste.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | head
```

Attendu : aucune ligne `×` ; 9 lignes `✓ tableau HTML collé (F19, F20) > …` dont « S2 : colspan 2 sur la première
ligne », « rowspan 0 : jusqu'à la fin ; colspan 5000 : rogné à 64 », « cellules qui se recoupent : fusion ignorée »,
« script, image, style : jamais exécutés ni chargés, texte ignoré » (Review Focus 3) ; 3 lignes
`✓ collage d'un tableau HTML (F19) > …` dont « effet de bord : le tableau passe avant l'image jointe » ; le bloc
« collage (R19) » existant reste vert ; `tsc` ne rend rien (aucun écart nommé pour cette tâche).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle (aucun assainisseur HTML : le document inerte de `DOMParser` suffit) ; jamais AGPL, GPL ni LGPL.
- GC13 `tsc` vide.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les quatre fichiers ci-dessus.

**Interdits.** Aucun `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `importNode`, `adoptNode`,
`appendChild` d'un nœud du document collé dans la page ; aucune lecture de style, de couleur, de largeur (HB-18).

**Critère « terminé ».** Commande bornée verte, `tsc` vide, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Créer `apps/web/src/platform/html-table.test.ts` :

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { tableFromHtml } from "./html-table";

const parse = (s: string): Document => new DOMParser().parseFromString(s, "text/html");
const grid = (html: string) => tableFromHtml(html, parse);
const rows = (n: number, cell: (i: number) => string): string => `<table>${Array.from({ length: n }, (_, i) => `<tr><td>${cell(i)}</td></tr>`).join("")}</table>`;

describe("tableau HTML collé (F19, F20)", () => {
  it("S2 : colspan 2 sur la première ligne : 2 × 2, une fusion, « Titre », « a », « b »", () => {
    expect(grid('<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>')).toEqual({
      rows: 2, cols: 2, cells: ["Titre", "", "a", "b"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 2, sourceCols: 2, cutCells: false,
    });
  });

  it("rowspan : la case prise est sautée (modèle d'occupation du tableau HTML)", () => {
    const g = grid("<table><tr><td rowspan=2>A</td><td>B</td></tr><tr><td>C</td></tr></table>");
    expect([g?.rows, g?.cols, g?.cells, g?.merges]).toEqual([2, 2, ["A", "B", "", "C"], [{ row: 0, col: 0, rows: 2, cols: 1 }]]);
  });

  it("rowspan 0 : jusqu'à la fin ; colspan 5000 : rogné à 64 ; source comptée à part", () => {
    const g = grid('<table><tr><td rowspan="0">A</td><td colspan="5000">B</td></tr><tr><td>C</td></tr><tr><td>D</td></tr></table>');
    expect([g?.rows, g?.cols, g?.sourceRows, g?.sourceCols]).toEqual([3, 64, 3, 1001]);
    expect(g?.merges).toEqual([{ row: 0, col: 0, rows: 3, cols: 1 }, { row: 0, col: 1, rows: 1, cols: 63 }]);
    expect([g?.cells[64 + 1], g?.cells[128 + 1]]).toEqual(["C", "D"]);
  });

  it("cellules qui se recoupent (HTML mal formé) : fusion ignorée, la cellule reste à sa place", () => {
    const g = grid('<table><tr><td>A</td><td rowspan="2">B</td></tr><tr><td colspan="3">C</td></tr></table>');
    expect([g?.rows, g?.cols, g?.sourceCols, g?.cells, g?.merges]).toEqual([2, 3, 3, ["A", "B", "", "C", "", ""], [{ row: 0, col: 1, rows: 2, cols: 1 }]]);
  });

  it("texte : <br> et fin de <p>, <div>, <li> → saut de ligne ; blancs repliés ; espace insécable → espace ; bords rognés", () => {
    const g = grid("<table><tr><td>  Ligne&nbsp;1<br>Ligne   2<p>para</p><div>bloc</div><ul><li>x</li><li>y</li></ul>  </td></tr></table>");
    expect(g?.cells).toEqual(["Ligne 1\nLigne 2\npara\nbloc\nx\ny"]);
  });

  it("tableau imbriqué aplati : ses lignes en sauts de ligne, ses cellules séparées par une espace (PC16)", () => {
    const g = grid("<table><tr><td>Haut<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table></td></tr></table>");
    expect([g?.rows, g?.cols, g?.cells]).toEqual([1, 1, ["Haut\na b\nc"]]);
  });

  it("script, image, style : jamais exécutés ni chargés, texte ignoré (S2, F19)", () => {
    const html =
      '<table><tr><td>a<script>window.__rb=1</script><style>td{color:red}</style><template>t</template><noscript>n</noscript></td></tr></table>' +
      '<img src="http://exemple.invalid/x.png" onerror="window.__rb=1"><script>window.__rb=1</script>';
    expect(grid(html)?.cells).toEqual(["a"]);
    expect((globalThis as { __rb?: number }).__rb).toBeUndefined();
    expect(document.querySelectorAll("table, img, script").length).toBe(0);
  });

  it("premier tableau qui a une ligne ; aucun tableau, ou des lignes sans cellule : null", () => {
    expect(grid("<table></table><table><tr><td>x</td></tr></table>")?.cells).toEqual(["x"]);
    expect(grid("<p>rien</p>")).toBeNull();
    expect(grid("<table><tr></tr></table>")).toBeNull();
  });

  it("plafonds (F22) : 70 lignes → 64 gardées, 70 comptées ; texte de plus de 2 000 caractères coupé, suivi de « … »", () => {
    const g = grid(rows(70, (i) => `L${i}`));
    expect([g?.rows, g?.cols, g?.sourceRows, g?.cutCells, g?.cells[63]]).toEqual([64, 1, 70, false, "L63"]);
    const long = grid(rows(1, () => "é".repeat(2001)));
    expect(long?.cutCells).toBe(true);
    expect(Array.from(long?.cells[0] ?? "")).toHaveLength(2001);
    expect(long?.cells[0]?.endsWith("…")).toBe(true);
  });
});
```

  Dans `apps/web/src/platform/paste.test.ts` : importer aussi `pastedTableHtml` (`import { isEditable, pastedFiles, pastedTableHtml } from "./paste";`),
  puis à la fin :

```ts
describe("collage d'un tableau HTML (F19)", () => {
  const data = (html: string, f: File[] = []) => ({ files: f, getData: (t: string) => (t === "text/html" ? html : "") });
  it("HTML avec <table> : rendu tel quel ; sans tableau, sans HTML ou sans presse-papiers : null", () => {
    const html = "<TABLE><tr><td>a</td></tr></TABLE>";
    expect(pastedTableHtml({ target: document.body, clipboardData: data(html) })).toBe(html);
    expect(pastedTableHtml({ target: document.body, clipboardData: data("<p>a</p><tablex>") })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: { files: [] } })).toBeNull();
    expect(pastedTableHtml({ target: document.body, clipboardData: null })).toBeNull();
  });
  it("cible éditable : null (collage normal dans la zone de texte)", () => {
    const area = document.createElement("textarea");
    expect(pastedTableHtml({ target: area, clipboardData: data("<table><tr><td>a</td></tr></table>") })).toBeNull();
  });
  it("effet de bord : le tableau passe avant l'image jointe ; une image seule se colle comme avant", () => {
    const png = new File([new Uint8Array([1])], "x.png", { type: "image/png" });
    const both = { target: document.body, clipboardData: data("<table><tr><td>a</td></tr></table>", [png]) };
    expect(pastedTableHtml(both)).not.toBeNull();
    expect(pastedFiles(both)).toHaveLength(1);
    const only = { target: document.body, clipboardData: data("", [png]) };
    expect(pastedTableHtml(only)).toBeNull();
    expect(pastedFiles(only)).toHaveLength(1);
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée : `×` (module `./html-table` absent, `pastedTableHtml` absente).

- [ ] **Étape 4 : `html-table.ts`.**

```ts
/**
 * Tableau HTML collé → grille de textes (U35, F19, F20, F22, DAB2). Le HTML est lu par un document inerte (`parse` =
 * `DOMParser` « text/html » : aucun script exécuté, aucune ressource chargée) ; seuls `rows`, `cells`, les attributs
 * `rowspan` / `colspan` et le texte sont lus, aucun nœud n'entre dans la page. Grille du modèle d'occupation du
 * tableau HTML (une case déjà prise par un `rowspan` est sautée), placée jusqu'à 64 × 64 (cases et étendues au-delà
 * jamais allouées) ; lignes et colonnes de la source comptées à part pour le message de troncature (F22). Même
 * `TableGrid` que le lecteur de classeur (`sheet-reader.ts`), posée par `insertTableGrid`.
 */
import { TABLE_MAX_LINES } from "../core/api";

/** Au-delà, le collage est refusé (F19). */
export const PASTE_MAX_CHARS = 8 * 1024 * 1024;
export const PASTE_TOO_BIG = "tableau trop gros pour être collé";
/** Caractères gardés d'une cellule (F22, HB-13), suivis de « … » ; même valeur que `sheet.rs`. */
export const MAX_CELL_CHARS = 2000;

export interface GridMerge { readonly row: number; readonly col: number; readonly rows: number; readonly cols: number }
/** Grille à poser (DAB2) : `rows × cols` textes en rangées ; zones en rangs ; source comptée à part ; un texte coupé. */
export interface TableGrid {
  readonly rows: number;
  readonly cols: number;
  readonly cells: readonly string[];
  readonly merges: readonly GridMerge[];
  readonly sourceRows: number;
  readonly sourceCols: number;
  readonly cutCells: boolean;
}

const SKIP = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);
const BLOCK = new Set(["P", "DIV", "LI"]);
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Texte coupé à 2 000 caractères (points de code), suivi de « … ». */
export function cutText(s: string): [string, boolean] {
  const cps = Array.from(s);
  return cps.length > MAX_CELL_CHARS ? [cps.slice(0, MAX_CELL_CHARS).join("") + "…", true] : [s, false];
}

/** Texte d'une cellule (F20) : blancs repliés, `<br>` et bornes de `<p>`, `<div>`, `<li>`, `<tr>` imbriqué → saut de
 *  ligne ; cellules d'un tableau imbriqué séparées par une espace (PC16) ; espace insécable → espace ; bords rognés. */
export function cellText(cell: Element): string {
  let out = "";
  const space = (): void => {
    if (out !== "" && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
  };
  const newline = (): void => {
    out = out.replace(/ +$/, "");
    if (out !== "" && !out.endsWith("\n")) out += "\n";
  };
  const walk = (n: Node): void => {
    if (n.nodeType === TEXT_NODE) {
      (n.nodeValue ?? "").split(/[ \t\n\r\f]+/).forEach((p, i) => {
        if (i > 0) space();
        out += p.replace(/ /g, " ");
      });
      return;
    }
    if (n.nodeType !== ELEMENT_NODE) return;
    const el = n as Element;
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag)) return;
    if (tag === "BR") {
      out = out.replace(/ +$/, "") + "\n";
      return;
    }
    const block = BLOCK.has(tag) || tag === "TR";
    if (block) newline();
    for (const c of Array.from(el.childNodes)) walk(c);
    if (block) newline();
    if (tag === "TD" || tag === "TH") space();
  };
  for (const c of Array.from(cell.childNodes)) walk(c);
  return out
    .split("\n")
    .map((l) => l.replace(/^ +| +$/g, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

/** `rowspan` / `colspan` : entier ≥ 1, sinon la valeur par défaut ; `rowspan="0"` permis (jusqu'à la fin) si `zero`. */
function span(v: string | null, max: number, zero: boolean): number {
  const n = v === null ? Number.NaN : Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0 || (n === 0 && !zero)) return 1;
  return Math.min(n, max);
}

/** Rang de la section d'une ligne : `<thead>` d'abord, `<tfoot>` en dernier (ordre de `HTMLTableElement.rows`). */
const section = (tr: Element): number => {
  const p = tr.parentElement?.tagName.toUpperCase();
  return p === "THEAD" ? 0 : p === "TFOOT" ? 2 : 1;
};
/** Lignes du tableau lui-même, jamais celles d'un tableau imbriqué : `rows` de happy-dom les inclut, d'où ce calcul
 *  (même résultat que `HTMLTableElement.rows` du navigateur). */
const ownRows = (t: Element): Element[] =>
  Array.from(t.querySelectorAll("tr"))
    .filter((tr) => tr.closest("table") === t)
    .sort((a, b) => section(a) - section(b));
/** Cellules directes d'une ligne (`td`, `th`), comme `HTMLTableRowElement.cells`. */
const ownCells = (tr: Element): Element[] => Array.from(tr.children).filter((c) => ["TD", "TH"].includes(c.tagName.toUpperCase()));

/** Premier `<table>` qui a au moins une ligne, en grille ; aucun, ou aucune cellule : null. */
export function tableFromHtml(html: string, parse: (s: string) => Document): TableGrid | null {
  const doc = parse(html);
  const table = Array.from(doc.querySelectorAll("table")).find((t) => ownRows(t).length > 0);
  if (table === undefined) return null;
  const trs = ownRows(table);
  const cap = TABLE_MAX_LINES;
  const nRows = Math.min(trs.length, cap);
  const occ: boolean[] = new Array<boolean>(cap * cap).fill(false);
  const texts: string[] = new Array<string>(cap * cap).fill("");
  const merges: GridMerge[] = [];
  let cols = 0;
  let sourceCols = 0;
  let cut = false;
  trs.forEach((tr, r) => {
    let c = 0;
    for (const td of ownCells(tr)) {
      if (r < nRows) while (c < cap && occ[r * cap + c] === true) c++;
      const cs = span(td.getAttribute("colspan"), 1000, false);
      const rsRaw = span(td.getAttribute("rowspan"), 65534, true);
      const rs = rsRaw === 0 ? trs.length - r : rsRaw;
      if (r < nRows && c < cap) {
        const rg = Math.min(rs, nRows - r);
        const cg = Math.min(cs, cap - c);
        let free = true;
        for (let i = 0; i < rg && free; i++) for (let j = 0; j < cg; j++) if (occ[(r + i) * cap + c + j] === true) free = false;
        const [text, wasCut] = cutText(cellText(td));
        cut ||= wasCut;
        texts[r * cap + c] = text;
        if (free) {
          for (let i = 0; i < rg; i++) for (let j = 0; j < cg; j++) occ[(r + i) * cap + c + j] = true;
          if (rg * cg >= 2) merges.push({ row: r, col: c, rows: rg, cols: cg });
        } else {
          occ[r * cap + c] = true;
        }
        cols = Math.max(cols, c + cg);
      }
      c += cs;
    }
    let widest = c;
    if (r < nRows) for (let j = cap - 1; j >= 0; j--) if (occ[r * cap + j] === true) { widest = Math.max(widest, j + 1); break; }
    sourceCols = Math.max(sourceCols, widest);
  });
  if (cols === 0) return null;
  const cells: string[] = [];
  for (let r = 0; r < nRows; r++) for (let c = 0; c < cols; c++) cells.push(texts[r * cap + c] ?? "");
  return { rows: nRows, cols, cells, merges, sourceRows: trs.length, sourceCols, cutCells: cut };
}
```

- [ ] **Étape 5 : `paste.ts`.** Remplacer le fichier :

```ts
/** Collage (R19, C10b) : fichiers `image/*` du presse-papiers ; HTML qui porte un `<table>` (F19), que `main.ts` fait
 *  passer avant les images jointes (Excel joint aussi une image, HB-9) ; ignoré quand la cible est éditable ; texte seul
 *  ignoré (C3). */
import { droppedFromFile } from "./drop-web";
import type { DroppedFile } from "./files";

export interface PasteEventLike {
  readonly target: EventTarget | null;
  /** `getData` facultatif : les tests d'images n'en ont pas, un `ClipboardEvent` l'a toujours (PC8). */
  readonly clipboardData: { readonly files: ArrayLike<File>; getData?(type: string): string } | null;
}

const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);
const TABLE_TAG = /<table[\s>]/i;

export function isEditable(t: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(t instanceof HTMLElement)) return false;
  const ce = t.getAttribute("contenteditable");
  if (t.isContentEditable || ce === "" || ce === "true") return true;
  if (t instanceof HTMLTextAreaElement) return true;
  return t instanceof HTMLInputElement && !NOT_TEXT.has(t.type);
}

export function pastedFiles(e: PasteEventLike): DroppedFile[] {
  if (isEditable(e.target)) return [];
  return Array.from(e.clipboardData?.files ?? [])
    .filter((f) => f.type.startsWith("image/"))
    .map(droppedFromFile);
}

/** HTML collé qui contient un `<table>` (F19), tel quel ; null sur une cible éditable, sans HTML ou sans tableau. */
export function pastedTableHtml(e: PasteEventLike): string | null {
  if (isEditable(e.target)) return null;
  const html = e.clipboardData?.getData?.("text/html") ?? "";
  return TABLE_TAG.test(html) ? html : null;
}
```

- [ ] **Étape 6 : vert.** La commande bornée (`tsc` vide).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add apps/web/src/platform/html-table.ts && git add apps/web/src/platform/html-table.test.ts && \
git add apps/web/src/platform/paste.ts && git add apps/web/src/platform/paste.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): parse pasted HTML tables into a grid" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t6"></a>

### Tâche T6 — Géométrie des zones et des plages, contrat du moteur (`clearRange`, `textStyle`, comptes)

**Objectif.** La géométrie pure des cellules lit les zones de la vue (`TableData.merges`, F29) sans recoder la règle F2
(DAB1) : une cellule couverte vaut pour son ancre (`cellAt`, `cellRect`, F16), une plage s'élargit jusqu'à contenir
chaque zone qu'elle touche (`expandRange`, F14), Tab et Maj+Tab sautent les couvertes, les flèches partent du bord de la
zone (F16, PC14), la hauteur exigée d'une ancre de plusieurs lignes se reporte sur sa dernière ligne (`rowHeightsFor`,
F7). Le contrat du moteur gagne `TableTool.clearRange` (Échap, PC18), `Engine.textStyle()` (cible d'import, F21) et
`EngineState.tableMerges` / `tableShades` (F29 : tous les tableaux de la page montrée, quel que soit l'outil). Quatre
actions neuves dans `TableAction` ; l'outil Tableau reçoit des bouchons (T8 les remplit).

**Fichiers.**
- Modifier : `apps/web/src/engine/table-geom.ts` (fichier entier, 117 lignes), `apps/web/src/engine/table-geom.test.ts`
  (littéraux C10a complétés, bloc neuf)
- Modifier : `apps/web/src/engine/tools/tool.ts:56-69` (`TableTool.clearRange`)
- Modifier : `apps/web/src/engine/tools/table.ts:243-250` (cas d'`act`), `:259-` (objet rendu : `clearRange`) — bouchons
  seulement
- Modifier : `apps/web/src/engine/engine.ts:19-37` (`EngineState`), `:70-104` (`Engine`), `:136-150` (`inertTable`),
  `:189-210` (`state`), `:427-433` (`key`), objet rendu (`textStyle`)
- Modifier : `apps/web/src/engine/engine.test.ts:778-820` (`fakeTableTool`), bloc neuf

**Interfaces.**
- Consomme (T4, types seulement) : `TableData.merges: readonly TableMerge[]`, `TableCell.shade: string | null`.
- Produit (lu par T8, T9, T10, T11) :

```ts
// engine/table-geom.ts
export const TABLE_SHADE_COLOR = "#94a3b8"; export const TABLE_SHADE_HATCH = "#cbd5e1";
export const TABLE_SHADE_HATCH_WIDTH = 2; export const TABLE_SHADE_HATCH_STEP = 16;
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform" | "merge" | "split" | "shade" | "unshade";
export interface Range { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
export interface TableCellState { readonly id: string; readonly row: number; readonly col: number; readonly rows: number; readonly cols: number; readonly range?: Range | null; readonly merged?: boolean; readonly shaded?: boolean }
export function mergeRanges(t: TableData): Range[];
export function mergeAt(t: TableData, c: Cell): Range | null;
export function anchorOf(t: TableData, c: Cell): Cell;
export function isCovered(t: TableData, c: Cell): boolean;
export function cellAt(t: TableData, lx: number, ly: number): Cell | null;      // ancre
export function rangeRect(t: TableData, r: Range): Bounds;
export function cellRect(t: TableData, c: Cell): Bounds;                         // rectangle réuni
export function expandRange(t: TableData, a: Cell, b: Cell): Range;
export function rangeCells(t: TableData, r: Range): Cell[];                      // ancres et cellules simples
export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly fill: string | null; readonly shade: string | null };
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null;
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[];
// inchangés : cellOf, tableAt, cellInnerBox, cellHeight, TABLE_COL_WIDTH, TABLE_ROW_HEIGHT, TABLE_PADDING, TABLE_LINE_WIDTH
// engine/tools/tool.ts : TableTool.clearRange(): boolean
// engine/engine.ts : EngineState.tableMerges: number ; EngineState.tableShades: number ; Engine.textStyle(): TextStyle
```

- Réutilise : `apps/web/src/engine/table-geom.ts:42`, `:48`, `:55`, `:85` — `cellAt` (rend l'ancre), `cellRect`
  (rectangle réuni), `step` (sauts) étendues ; ajouts `anchorOf(t, c): Cell`, `expandRange(t, a: Cell, b: Cell): Range`,
  `rangeRect(t, r: Range): Bounds`.
- Réutilise : `apps/web/src/engine/table-geom.ts:108` (`cellHeight`), `:113` (`rowHeightsFor`), `text-layout.ts` —
  `rowHeightsFor` étendue aux zones (F7), `cellHeight` appelée telle quelle.
- Réutilise : `apps/web/src/engine/engine.ts:319` (`textStyle`, interne) — exposée telle quelle par `Engine.textStyle()`
  (style et mesure pour la cible d'import ; la mesure, `SessionShared.measure`, est branchée par T11).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/engine.test.ts src/engine/tools/table.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C10b|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucune ligne `×` ; 9 lignes `✓ zones et plages (C10b, F14 à F16, F7) > …` dont « F16, S5 : Tab saute les
cellules couvertes », « F14 : expandRange contient chaque zone touchée », « F7 : rowHeightsFor : ancre de deux lignes, la
dernière porte le reste » ; 3 lignes `✓ moteur — C10b (F29, F14) > …` ; « géométrie des cellules (C10a, DAC6) », « moteur
— outil Tableau (C10a, contrat T4) », « moteur et outil Tableau (C10a, S2) » et « outil Tableau (C10a) » restent verts
(tests à garder verts de la carte d'impact : `engine.test.ts`, `tools/table.test.ts`).

**Écarts `tsc` nommés (recopiés de la table de l'en-tête).** Dans le worktree de T6 seul (sans T4) :
`src/engine/table-geom.ts`, `src/engine/table-geom.test.ts`, `src/engine/engine.ts`, `src/engine/engine.test.ts`
(`merges` / `shade` inconnus de `TableData` / `TableCell`) — fermés par la fusion de T4. Après cette tâche et jusqu'à
T11 : `src/app/stage-tags.test.ts` (`tableMerges` / `tableShades` absents du littéral `EngineState`). Aucun autre.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC11 La page ne recode pas la règle F2 : elle lit `TableData.merges` (`mergeRanges`) ; aucune lecture de `span`.
- GC13 `tsc` vide sauf les écarts nommés ci-dessus.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les fichiers ci-dessus ; dans `tools/table.ts`, seulement les bouchons de l'étape 6.

**Interdits.** Aucune lecture de `PAGE_WIDTH` ; aucun appel au cœur dans `table-geom.ts` (fonctions pures) ; ne pas
écrire la plage, l'ouverture au relâché ni les actions dans `tools/table.ts` (T8).

**Critère « terminé ».** Commande bornée verte, `tsc` limité aux écarts nommés, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges (géométrie).** Dans `apps/web/src/engine/table-geom.test.ts` : compléter les littéraux C10a
  (`T` : `merges: []` et `shade: null` à sa cellule ; `long` : `shade: null`), et les deux attendus de `cellContent`
  (`{ text: "Lundi", fill: "#fef08a", shade: null }`, `{ text: "", fill: null, shade: null }`). Étendre l'import :
  `import { anchorOf, cellAt, cellContent, cellHeight, cellInnerBox, cellOf, cellRect, expandRange, isCovered, mergeAt, mergeRanges, rangeCells, rangeRect, rowHeightsFor, step, tableAt, TABLE_PADDING } from "./table-geom";`.
  À la fin du fichier :

```ts
/** 3 × 3 (100 × 64) ; zone r1..r2 × c1..c2 ancrée en (0, 0), « Lundi », ombrée. */
const M: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }, { id: "c3", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }, { id: "r3", height: 64 }],
  cells: [{ row: "r1", col: "c1", text: "Lundi", fill: null, shade: "#94a3b8" }],
  merges: [{ row: "r1", col: "c1", rows: 2, cols: 2 }],
};
const range = (r0: number, c0: number, r1: number, c1: number) => ({ r0, c0, r1, c1 });

describe("zones et plages (C10b, F14 à F16, F7)", () => {
  it("mergeRanges, mergeAt, anchorOf, isCovered : zones de la vue en rangs ; ancre inconnue : zone sautée", () => {
    expect(mergeRanges(M)).toEqual([range(0, 0, 1, 1)]);
    expect(mergeRanges({ ...M, merges: [{ row: "r9", col: "c1", rows: 2, cols: 2 }] })).toEqual([]);
    expect(mergeAt(M, at(1, 1))).toEqual(range(0, 0, 1, 1));
    expect(mergeAt(M, at(2, 2))).toBeNull();
    expect([anchorOf(M, at(1, 1)), anchorOf(M, at(2, 2))]).toEqual([at(0, 0), at(2, 2)]);
    expect([isCovered(M, at(0, 0)), isCovered(M, at(0, 1)), isCovered(M, at(2, 0))]).toEqual([false, true, false]);
  });

  it("F16 : cellAt rend l'ancre d'une cellule couverte", () => {
    expect(cellAt(M, 150, 100)).toEqual(at(0, 0));
    expect(cellAt(M, 250, 10)).toEqual(at(0, 2));
  });

  it("cellRect, cellInnerBox : rectangle réuni de la zone, pour l'ancre comme pour une couverte", () => {
    expect(cellRect(M, at(1, 0))).toEqual({ x0: 0, y0: 0, x1: 200, y1: 128 });
    expect(cellInnerBox(M, at(0, 0))).toEqual({ x: TABLE_PADDING, y: TABLE_PADDING, w: 200 - 2 * TABLE_PADDING, h: 128 - 2 * TABLE_PADDING });
  });

  it("F14 : expandRange contient chaque zone touchée ; rangeRect", () => {
    expect(expandRange(M, at(1, 1), at(2, 2))).toEqual(range(0, 0, 2, 2));
    expect(expandRange(M, at(2, 2), at(0, 2))).toEqual(range(0, 2, 2, 2));
    expect(rangeRect(M, range(0, 2, 2, 2))).toEqual({ x0: 200, y0: 0, x1: 300, y1: 192 });
  });

  it("rangeCells : ancres et cellules simples de la plage, dans l'ordre de lecture", () => {
    expect(rangeCells(M, range(0, 0, 2, 2))).toEqual([at(0, 0), at(0, 2), at(1, 2), at(2, 0), at(2, 1), at(2, 2)]);
  });

  it("F16, S5 : Tab saute les cellules couvertes ; Maj+Tab revient à l'ancre ; fin : ajout de ligne", () => {
    expect(step(M, at(0, 0), "next")).toEqual(at(0, 2));
    expect(step(M, at(0, 2), "next")).toEqual(at(1, 2));
    expect(step(M, at(1, 2), "next")).toEqual(at(2, 0));
    expect(step(M, at(2, 2), "next")).toBe("add-row");
    expect(step(M, at(1, 2), "prev")).toEqual(at(0, 2));
    expect(step(M, at(2, 0), "prev")).toEqual(at(1, 2));
    expect(step(M, at(0, 2), "prev")).toEqual(at(0, 0));
  });

  it("F16 : flèches depuis une zone : → après sa fin à la ligne de l'ancre, ↓ après sa fin à la colonne de l'ancre ; couverte : son ancre", () => {
    expect(step(M, at(0, 0), "right")).toEqual(at(0, 2));
    expect(step(M, at(0, 2), "right")).toEqual(at(1, 2));
    expect(step(M, at(0, 0), "down")).toEqual(at(2, 0));
    expect(step(M, at(2, 1), "up")).toEqual(at(0, 0));
    expect(step(M, at(1, 2), "left")).toEqual(at(0, 0));
    expect(step(M, at(0, 0), "left")).toBeNull();
    expect(step(M, at(0, 0), "up")).toBeNull();
  });

  it("F7 : rowHeightsFor : zone d'une ligne mesurée à sa largeur réunie ; ancre de deux lignes : la dernière porte le reste", () => {
    const text = "aaaaaaaa bbbbbbbb cccccccc";
    const wide: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null }], merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }] };
    const hw = rowHeightsFor(wide, [100, 100, 100], narrow);
    expect(hw[0]).toBe(cellHeight(text, 36, 200, narrow));
    const tall: TableData = { ...M, cells: [{ row: "r1", col: "c1", text, fill: null, shade: null }], merges: [{ row: "r1", col: "c1", rows: 2, cols: 1 }] };
    const ht = rowHeightsFor(tall, [100, 100, 100], narrow);
    const one = cellHeight("", 36, 100, narrow);
    expect([ht[0], ht[1], ht[2]]).toEqual([one, Math.max(one, cellHeight(text, 36, 100, narrow) - one), one]);
  });

  it("cellContent : texte, remplissage et ombrage d'une cellule par ids", () => {
    expect(cellContent(M, "r1", "c1")).toEqual({ text: "Lundi", fill: null, shade: "#94a3b8" });
  });
});
```

- [ ] **Étape 3 : tests rouges (moteur).** Dans `apps/web/src/engine/engine.test.ts` : importer `ElementView` (`import type { Change, ElementView, StrokeStyle } from "../core/api";`)
  et `DEFAULT_TEXT_SIZE` (`import { DEFAULT_TEXT_SIZE } from "./text-layout";`). Dans `fakeTableTool`, ajouter
  `let ranges = false;`, le membre `clearRange: () => { log.push("clearRange"); return ranges; },` à `tool`, et à l'objet
  rendu `setRanges(v: boolean): void { ranges = v; },`. À la fin du fichier :

```ts
describe("moteur — C10b (F29, F14)", () => {
  const tableEl = (id: string, merged: boolean, shades: number): ElementView => ({
    id,
    kind: "table",
    transform: [1, 0, 0, 1, 0, 0],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }],
      rows: [{ id: "r1", height: 64 }],
      cells: Array.from({ length: shades }, (_, i) => ({ row: "r1", col: `c${i + 1}`, text: "", fill: null, shade: "#94a3b8" })),
      merges: merged ? [{ row: "r1", col: "c1", rows: 1, cols: 2 }] : [],
    },
  });

  it("tableMerges, tableShades : comptés sur tous les tableaux de la page montrée, quel que soit l'outil (F29, S1)", () => {
    const { doc, engine } = setup();
    const page = doc.pageIds()[0] ?? "";
    const els = new Map<string, ElementView>([["a", tableEl("a", true, 2)], ["b", tableEl("b", false, 1)]]);
    const realIds = doc.elementIds.bind(doc);
    const realEl = doc.element.bind(doc);
    doc.elementIds = (p) => (p === page ? [...realIds(p), ...els.keys()] : realIds(p));
    doc.element = (id) => els.get(id) ?? realEl(id);
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 3]);
    engine.setTool("pen");
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 3]);
    els.delete("b");
    engine.run({ type: "AddPage", after: page });
    expect([engine.state().tableMerges, engine.state().tableShades]).toEqual([1, 2]);
  });

  it("textStyle : couleur du stylo, taille par défaut (cible d'import, F21)", () => {
    const { engine } = setup();
    engine.setPenStyle({ color: "#1d4ed8", width: 4 });
    expect(engine.textStyle()).toEqual({ color: "#1d4ed8", size: DEFAULT_TEXT_SIZE });
  });

  it("Échap avec l'outil Tableau (PC18) : pris si l'outil retire une plage ; sinon rien ; autre outil : jamais appelé", () => {
    const { engine, log, table } = setupTable();
    engine.setTool("table");
    table.setRanges(true);
    expect(engine.key(key("Escape"))).toBe(true);
    table.setRanges(false);
    expect(engine.key(key("Escape"))).toBe(false);
    engine.setTool("pen");
    expect(engine.key(key("Escape"))).toBe(false);
    expect(log.filter((l) => l === "clearRange")).toHaveLength(2);
  });
});
```

- [ ] **Étape 4 : les voir rouges.** La commande bornée : `×` (fonctions absentes, `textStyle` absente, comptes absents).

- [ ] **Étape 5 : `table-geom.ts`.** Remplacer le fichier :

```ts
/**
 * Géométrie des cellules côté page (C10a, DAC6 ; C10b, F7, F14 à F16) : fonctions pures, sans liaison neuve. Le cœur
 * calcule les zones fusionnées (règle F2) et les rend dans la vue (`TableData.merges`) ; la page les lit en rangs sans
 * recoder la règle (DAB1). Une cellule couverte vaut pour son ancre (`cellAt`, `cellRect`, `step`) ; une plage s'élargit
 * jusqu'à contenir chaque zone qu'elle touche (`expandRange`). La page trouve le tableau le plus haut sous un point
 * (même recouvert d'encre, I2) et mesure la hauteur qu'exige un texte (DAC2) avec la mise en lignes du dessin
 * (`layoutRich`, B1) ; sur une ancre de plusieurs lignes, la dernière ligne porte le reste (F7). Tailles par défaut en
 * unités de page (T4) ; la largeur de page se lit sur la page, jamais ici.
 */
import type { Bounds, CoreDocument, Matrix, TableData } from "../core/api";
import { plainSpans } from "../core/rich-text";
import { applyMatrix, invertMatrix } from "../core/shapes";
import { layoutRich, richBoxHeight, type Measure } from "./text-layout";

export const TABLE_COL_WIDTH = 240;
export const TABLE_ROW_HEIGHT = 64;
/** Marge intérieure d'une cellule : 36 × 1,25 + 2 × 8 = 61 ≤ 64. */
export const TABLE_PADDING = 8;
export const TABLE_LINE_WIDTH = 2;
/** Ombrage (F13, HB-6, choix visuel à l'essai) : fond opaque gris, puis hachures à 45°, trait 2, pas 16 unités. */
export const TABLE_SHADE_COLOR = "#94a3b8";
export const TABLE_SHADE_HATCH = "#cbd5e1";
export const TABLE_SHADE_HATCH_WIDTH = 2;
export const TABLE_SHADE_HATCH_STEP = 16;

export type NavMove = "next" | "prev" | "left" | "right" | "up" | "down";
export type TableAction = "row-insert" | "col-insert" | "row-remove" | "col-remove" | "uniform" | "merge" | "split" | "shade" | "unshade";
/** Cellule par rangs (0 = première ligne, première colonne). */
export interface Cell { readonly row: number; readonly col: number }
/** Cellule active par ids : survit aux insertions et suppressions des autres lignes. */
export interface CellRef { readonly id: string; readonly row: string; readonly col: string }
/** Plage ou zone en rangs, bornes comprises (r0 ≤ r1, c0 ≤ c1). */
export interface Range { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
/** Ce que publie le moteur (barre, `#stage[data-table]`) : rangs de l'ancre active et taille du tableau ; C10b (PC7) :
 *  plage en rangs (null sans), cellule active fusionnée, au moins une cellule ombrée dans la plage (sinon l'active). */
export interface TableCellState {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly rows: number;
  readonly cols: number;
  readonly range?: Range | null;
  readonly merged?: boolean;
  readonly shaded?: boolean;
}
export interface TableHit { readonly id: string; readonly transform: Matrix; readonly table: TableData; readonly cell: Cell }

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const inRange = (z: Range, c: Cell): boolean => c.row >= z.r0 && c.row <= z.r1 && c.col >= z.c0 && c.col <= z.c1;
const single = (c: Cell): Range => ({ r0: c.row, c0: c.col, r1: c.row, c1: c.col });

/** Rang de la bande qui contient `v` (bord gauche ou haut inclus) ; -1 hors du tableau ou NaN. */
function band(sizes: readonly number[], v: number): number {
  if (!(v >= 0)) return -1;
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    acc += sizes[i] ?? 0;
    if (v < acc) return i;
  }
  return -1;
}

/** Zones de la vue en rangs (F29) ; une zone dont l'ancre n'est plus lue est sautée, son étendue bornée au tableau. */
export function mergeRanges(t: TableData): Range[] {
  const out: Range[] = [];
  for (const m of t.merges) {
    const r0 = t.rows.findIndex((r) => r.id === m.row);
    const c0 = t.cols.findIndex((c) => c.id === m.col);
    if (r0 < 0 || c0 < 0) continue;
    out.push({ r0, c0, r1: Math.min(t.rows.length - 1, r0 + m.rows - 1), c1: Math.min(t.cols.length - 1, c0 + m.cols - 1) });
  }
  return out;
}

/** Zone qui contient la cellule ; null pour une cellule simple. */
export function mergeAt(t: TableData, c: Cell): Range | null {
  return mergeRanges(t).find((z) => inRange(z, c)) ?? null;
}

/** Ancre de la zone qui contient la cellule ; la cellule elle-même sinon. */
export function anchorOf(t: TableData, c: Cell): Cell {
  const z = mergeAt(t, c);
  return z === null ? c : { row: z.r0, col: z.c0 };
}

/** Cellule couverte par une zone (et qui n'en est pas l'ancre). */
export function isCovered(t: TableData, c: Cell): boolean {
  const z = mergeAt(t, c);
  return z !== null && (z.r0 !== c.row || z.c0 !== c.col);
}

/** Cellule sous un point local : l'ancre d'une cellule couverte (F16) ; hors du tableau ou NaN : null. */
export function cellAt(t: TableData, lx: number, ly: number): Cell | null {
  const col = band(t.cols.map((c) => c.width), lx);
  const row = band(t.rows.map((r) => r.height), ly);
  return col < 0 || row < 0 ? null : anchorOf(t, { row, col });
}

/** Rectangle local d'une plage en rangs. */
export function rangeRect(t: TableData, r: Range): Bounds {
  const widths = t.cols.map((c) => c.width);
  const heights = t.rows.map((x) => x.height);
  return {
    x0: sum(widths.slice(0, r.c0)),
    y0: sum(heights.slice(0, r.r0)),
    x1: sum(widths.slice(0, r.c1 + 1)),
    y1: sum(heights.slice(0, r.r1 + 1)),
  };
}

/** Rectangle local d'une cellule : celui de sa zone si elle en a une. */
export function cellRect(t: TableData, c: Cell): Bounds {
  return rangeRect(t, mergeAt(t, c) ?? single(c));
}

/** Plage de `a` à `b`, élargie jusqu'à contenir entièrement chaque zone qu'elle touche (F14). */
export function expandRange(t: TableData, a: Cell, b: Cell): Range {
  let r: Range = { r0: Math.min(a.row, b.row), c0: Math.min(a.col, b.col), r1: Math.max(a.row, b.row), c1: Math.max(a.col, b.col) };
  const zones = mergeRanges(t);
  for (let changed = true; changed; ) {
    changed = false;
    for (const z of zones) {
      if (z.r1 < r.r0 || z.r0 > r.r1 || z.c1 < r.c0 || z.c0 > r.c1) continue;
      const n = { r0: Math.min(r.r0, z.r0), c0: Math.min(r.c0, z.c0), r1: Math.max(r.r1, z.r1), c1: Math.max(r.c1, z.c1) };
      if (n.r0 !== r.r0 || n.c0 !== r.c0 || n.r1 !== r.r1 || n.c1 !== r.c1) {
        r = n;
        changed = true;
      }
    }
  }
  return r;
}

/** Ancres et cellules simples de la plage, dans l'ordre de lecture. */
export function rangeCells(t: TableData, r: Range): Cell[] {
  const zones = mergeRanges(t);
  const out: Cell[] = [];
  for (let row = r.r0; row <= r.r1; row++) {
    for (let col = r.c0; col <= r.c1; col++) {
      const z = zones.find((x) => inRange(x, { row, col }));
      if (z === undefined || (z.r0 === row && z.c0 === col)) out.push({ row, col });
    }
  }
  return out;
}

/** Rangs d'une cellule par ids (une `CellRef`, ou une cellule de `t.cells`) ; null si sa ligne ou sa colonne n'est plus lue. */
export function cellOf<R extends Pick<CellRef, "row" | "col">>(t: TableData, ref: R): Cell | null {
  const row = t.rows.findIndex((r) => r.id === ref.row);
  const col = t.cols.findIndex((c) => c.id === ref.col);
  return row < 0 || col < 0 ? null : { row, col };
}

export function cellContent(t: TableData, rowId: string, colId: string): { readonly text: string; readonly fill: string | null; readonly shade: string | null } {
  const c = t.cells.find((x) => x.row === rowId && x.col === colId);
  return { text: c?.text ?? "", fill: c?.fill ?? null, shade: c?.shade ?? null };
}

/** Le tableau le plus haut sous (x, y) monde, du dessus vers le dessous (I2) ; matrice non inversible : sauté. */
export function tableAt(doc: Pick<CoreDocument, "elementIds" | "element">, page: string, x: number, y: number): TableHit | null {
  const ids = doc.elementIds(page);
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    if (id === undefined) continue;
    const el = doc.element(id);
    if (el?.kind !== "table") continue;
    const inv = invertMatrix(el.transform);
    if (inv === null) continue;
    const [lx, ly] = applyMatrix(inv, x, y);
    const cell = cellAt(el.table, lx, ly);
    if (cell !== null) return { id, transform: el.transform, table: el.table, cell };
  }
  return null;
}

/** Cellule voisine (T8, PC4, F16, PC14). Tab / Maj+Tab : ancres et cellules simples dans l'ordre de lecture ; Tab en
 *  dernière : "add-row". → : première cellule après la zone dont l'ancre vient après ; ← : la cellule avant l'ancre,
 *  ramenée à son ancre ; ↑ / ↓ : la ligne avant le début / après la fin de la zone, à la colonne de l'ancre ; au bord :
 *  null. */
export function step(t: TableData, c: Cell, move: NavMove): Cell | "add-row" | null {
  const zones = mergeRanges(t);
  const zoneOf = (x: Cell): Range => zones.find((z) => inRange(z, x)) ?? single(x);
  const cols = t.cols.length;
  const count = t.rows.length * cols;
  const nth = (i: number): Cell => ({ row: Math.floor(i / cols), col: i % cols });
  const anchorIndex = (i: number): number => {
    const z = zoneOf(nth(i));
    return z.r0 * cols + z.c0;
  };
  const here = zoneOf(c);
  const at = here.r0 * cols + here.c0;
  const toAnchor = (i: number): Cell => {
    const z = zoneOf(nth(i));
    return { row: z.r0, col: z.c0 };
  };
  if (move === "next" || move === "right") {
    for (let i = at + 1; i < count; i++) if (anchorIndex(i) > at) return toAnchor(i);
    return move === "next" ? "add-row" : null;
  }
  if (move === "prev") {
    for (let i = at - 1; i >= 0; i--) if (anchorIndex(i) === i) return nth(i);
    return null;
  }
  if (move === "left") return at > 0 ? toAnchor(at - 1) : null;
  if (move === "up") return here.r0 > 0 ? toAnchor((here.r0 - 1) * cols + here.c0) : null;
  return here.r1 + 1 < t.rows.length ? toAnchor((here.r1 + 1) * cols + here.c0) : null;
}

/** Largeur du texte dans une colonne de `colWidth` : moins les deux marges, 1 au moins. */
const innerWidth = (colWidth: number): number => Math.max(1, colWidth - 2 * TABLE_PADDING);

/** Zone intérieure d'une cellule (de sa zone), repère local du tableau : coin après la marge, largeur et hauteur moins les marges. */
export interface CellBox { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export function cellInnerBox(t: TableData, c: Cell): CellBox {
  const r = cellRect(t, c);
  return { x: r.x0 + TABLE_PADDING, y: r.y0 + TABLE_PADDING, w: innerWidth(r.x1 - r.x0), h: Math.max(0, r.y1 - r.y0 - 2 * TABLE_PADDING) };
}

/** Hauteur exigée par `text` dans une colonne de `colWidth` (T5, B1) : lignes du dessin + deux marges. */
export function cellHeight(text: string, size: number, colWidth: number, measure: Measure): number {
  return richBoxHeight(layoutRich(plainSpans(text), { size }, innerWidth(colWidth), measure)) + 2 * TABLE_PADDING;
}

/** Hauteur exigée de chaque ligne aux largeurs `colWidths` (Uniformiser T11, import F21) ; cellule vide : une ligne de
 *  texte ; zone d'une ligne mesurée à sa largeur réunie ; ancre de plusieurs lignes : sa dernière ligne porte ce qui
 *  manque (F7) ; cellule couverte : ignorée. */
export function rowHeightsFor(t: TableData, colWidths: readonly number[], measure: Measure): number[] {
  const zones = mergeRanges(t);
  const width = (c0: number, c1: number): number => sum(t.cols.slice(c0, c1 + 1).map((c, i) => colWidths[c0 + i] ?? c.width));
  const text = (r: number, c: number): string => cellContent(t, t.rows[r]?.id ?? "", t.cols[c]?.id ?? "").text;
  const empty = cellHeight("", t.size, colWidths[0] ?? t.cols[0]?.width ?? 1, measure);
  const heights = t.rows.map((_, r) => {
    let h = 0;
    t.cols.forEach((col, c) => {
      const z = zones.find((x) => inRange(x, { row: r, col: c }));
      if (z !== undefined && (z.r0 !== r || z.c0 !== c)) return;
      if (z !== undefined && z.r1 > z.r0) return;
      const w = z === undefined ? (colWidths[c] ?? col.width) : width(z.c0, z.c1);
      h = Math.max(h, cellHeight(text(r, c), t.size, w, measure));
    });
    return h > 0 ? h : empty;
  });
  for (const z of zones.filter((x) => x.r1 > x.r0).sort((a, b) => a.r1 - b.r1)) {
    const need = cellHeight(text(z.r0, z.c0), t.size, width(z.c0, z.c1), measure);
    const above = sum(heights.slice(z.r0, z.r1));
    heights[z.r1] = Math.max(heights[z.r1] ?? 0, need - above);
  }
  return heights;
}
```

- [ ] **Étape 6 : contrat du moteur et bouchons.** `apps/web/src/engine/tools/tool.ts`, dans `TableTool` après `clearCell` :

```ts
  /** Échap, saisie fermée (C10b, PC18) : retire la plage ; false sans plage ou saisie ouverte. */
  clearRange(): boolean;
```

  `apps/web/src/engine/tools/table.ts` : dans le `switch` d'`act`, avant `default:` :

```ts
        case "merge":
        case "split":
        case "shade":
        case "unshade":
          // C10b : branchés par T8.
          return;
```

  et dans l'objet rendu, après `clearCell() { … },` : `clearRange: () => false,`.

  `apps/web/src/engine/engine.ts` :
  - `EngineState`, après `tableCell` :

```ts
  /** C10b (F29) : zones fusionnées et cellules ombrées de tous les tableaux de la page montrée, quel que soit l'outil. */
  readonly tableMerges: number;
  readonly tableShades: number;
```

  - `Engine`, après `tableFill` : `/** Style de texte des outils Texte et Tableau, et de la cible d'import (F21). */ textStyle(): TextStyle;`
  - `inertTable` : ajouter `clearRange: () => false,`.
  - Juste avant `function state()` (`:193`) :

```ts
  /** Comptes de `#stage[data-table-merges|data-table-shades]` (F29), recalculés quand la version ou la page change (PC12). */
  let counted = { key: "", merges: 0, shades: 0 };
  const tableCounts = (): { readonly merges: number; readonly shades: number } => {
    const key = `${pageId}|${doc.version()}`;
    if (counted.key !== key) {
      let merges = 0;
      let shades = 0;
      for (const id of doc.elementIds(pageId)) {
        const el = doc.element(id);
        if (el?.kind !== "table") continue;
        merges += el.table.merges.length;
        shades += el.table.cells.filter((c) => c.shade !== null).length;
      }
      counted = { key, merges, shades };
    }
    return counted;
  };
```

  - Dans `state()`, après `tableCell: tableTool.cellState(),` : `tableMerges: tableCounts().merges, tableShades: tableCounts().shades,`.
  - Dans `key(e)`, juste après la ligne de Suppr de l'outil Tableau (`:432`) :

```ts
        // PC18 : Échap avec l'outil Tableau (saisie fermée) retire d'abord la plage.
        if (edit === "escape" && tool === "table" && tableTool.clearRange()) return true;
```

  - Dans l'objet rendu, après `tableFill(fill) { … },` : `textStyle,`.

- [ ] **Étape 7 : vert.** La commande bornée ; `tsc` : seuls les écarts nommés.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/table-geom.ts && git add apps/web/src/engine/table-geom.test.ts && \
git add apps/web/src/engine/tools/tool.ts && git add apps/web/src/engine/tools/table.ts && \
git add apps/web/src/engine/engine.ts && git add apps/web/src/engine/engine.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): merged-cell geometry, ranges and C10b engine contract" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, sortie `tsc`, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t7"></a>

### Tâche T7 — Liaison Wasm des commandes C10b, contrat sur le vrai module

**Objectif.** Exposer au module Wasm principal les commandes C10b de T1 et T2 sur le patron `set_table_fill` /
`*_inner` (C10a), brancher les cas d'`apply` de `wasm-core.ts` que T4 a posés en levée, jouer le contrat C10b sur les
deux fabriques et relire la fixture `tableau-fusion-ombrage.roomboard` par le vrai module (S3, F30). Relever la taille
du module principal (plafond H2-13 inchangé).

**Fichiers.**
- Modifier : `crates/roomboard-wasm/src/lib.rs:472-512` (méthodes exposées), `:917-956` (`*_inner`), module `tests`
- Modifier : `apps/web/src/core/wasm-core.ts` (`apply`, cas posés par T4)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (`c10bFactories`, bloc « vrai module seulement »)

**Interfaces.**
- Consomme (T1, T2) : `Command::{ImportTable, MergeTableCells, SplitTableCell, SetTableShade}`, `RemoveTableLine.to`,
  `SetTableFill.to`, `CommandError::BadTable` ; (T4) les variantes TS, `toU32`, `toChange`, `c10bFactories`, `c10bIds`,
  `c10bAt`, `tableOf`, `first`.
- Produit (méthodes wasm-bindgen de `Document`, lues par `wasm-core.ts`) :

```rust
pub fn remove_table_line(&mut self, id: &str, row: bool, line: &str, to: Option<String>) -> Result<JsValue, JsError>;
pub fn set_table_fill(&mut self, id: &str, row: &str, col: &str, fill: Option<String>, to_row: Option<String>, to_col: Option<String>) -> Result<JsValue, JsError>;
pub fn merge_table_cells(&mut self, id: &str, from_row: &str, from_col: &str, to_row: &str, to_col: &str) -> Result<JsValue, JsError>;
pub fn split_table_cell(&mut self, id: &str, row: &str, col: &str) -> Result<JsValue, JsError>;
pub fn set_table_shade(&mut self, id: &str, from_row: &str, from_col: &str, to_row: &str, to_col: &str, shade: Option<String>) -> Result<JsValue, JsError>;
#[allow(clippy::too_many_arguments)]
pub fn import_table(&mut self, page: &str, matrix: &[f64], col_width: f64, row_heights: &[f64], cols: u32, cells: Vec<String>, merges: &[u32], color: &str, size: f64) -> Result<JsValue, JsError>;
// natifs : remove_table_line_inner(id, row: bool, line, to: Option<String>), set_table_fill_inner(id, cell: [&str; 2], to: Option<[&str; 2]>, fill),
// merge_table_cells_inner(id, from: [&str; 2], to: [&str; 2]), split_table_cell_inner(id, cell: [&str; 2]),
// set_table_shade_inner(id, from: [&str; 2], to: [&str; 2], shade: Option<String>),
// import_table_inner(page, matrix: &[f64], col_width, row_heights: &[f64], cols, cells: Vec<String>, merges: &[u32], color, size) -> Result<Change, CommandError>
```

- Réutilise : `crates/roomboard-wasm/src/lib.rs:422-510` — patron `set_table_fill` / `set_table_fill_inner`, `run`,
  `cmd_err`, `to_js`, `table_axis` (`:97`) étendus aux six appels.
- Réutilise : `apps/web/src/core/wasm-core.ts:110` (`toTable`, de T4), `:107` (`toU32`), `toChange` — un rang ou une
  dimension hors des u32 arrive comme u32::MAX, refusé en `BadTable` comme par la fausse liaison.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-wasm table 2>&1 | grep -E "test result|FAILED|error\[|table" | tail -20 && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core --reporter=verbose 2>&1 | grep -E "C10b|×|FAIL|Test Files|Tests " | tail -60 && \
wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm && pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : `cargo` 5 tests `table` `ok` (les 3 de C10a et `c10b_table_commands_inner`, `import_table_inner_reads_flat_merges`) ;
`vitest` sans `×` : 9 `✓ … contrat C10b : vrai module wasm`, 9 `✓ … contrat C10b : fausse liaison`, 1
`✓ contrat C10b : vrai module seulement > fixture tableau-fusion-ombrage.roomboard (F30, S3)` ; « contrat C10a », « contrat
commun », « contrat C2 », « contrat C9 » verts sur les deux fabriques (tests à garder verts : `RemoveTableLine` et
`SetTableFill` sans `to` = C10a) ; taille ≤ 1 572 864 o, citée. `tsc` : seuls les écarts nommés encore ouverts
(`src/app/stage-tags.test.ts`, `src/app/workspace.ts`, `src/engine/render/*.test.ts` selon les fusions déjà faites).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois. Ici le vrai module est
  exigé (`ROOMBOARD_WASM_REQUIRED=1`).
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .) && mkdir -p apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`
  (le module `apps/web/src/wasm` est reconstruit par la commande bornée ; jamais commité).
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N, les noms vus et la taille du module.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC9 Plafond du module principal 1 572 864 o (H2-13) ni baissé ni relevé ; `calamine` n'y entre pas ; taille citée.
- GC11 Aucune lecture neuve dans la liaison : la vue passe par `element()` (`TableView.merges`, `shade`).
- GC13 `tsc` vide sauf les écarts nommés encore ouverts (table de l'en-tête).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC15 `cargo fmt --all` puis `cargo clippy -p roomboard-wasm --all-targets -- -D warnings` sans avertissement.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les trois fichiers ci-dessus ; `scripts/verifier.sh` non modifié.

**Interdits.** Ne pas commiter `apps/web/src/wasm/` ; aucune méthode de lecture neuve ; ne pas toucher au cœur.

**Critère « terminé ».** Commande bornée verte, taille citée, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests natifs rouges.** Dans le module `tests` de `crates/roomboard-wasm/src/lib.rs`, remplacer les
  appels C10a `remove_table_line_inner(&id, true, &r0)` → `remove_table_line_inner(&id, true, &r0, None)` (et de même
  `:1874`), `set_table_fill_inner(&id, [r1.as_str(), c1.as_str()], X)` → `set_table_fill_inner(&id, [r1.as_str(), c1.as_str()], None, X)`, puis ajouter :

```rust
    // C10b (T7) : fusion, division, ombrage, plages, import par les `*_inner`.

    #[test]
    fn c10b_table_commands_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_table_inner(&p, [0.0, 0.0], [3, 3], [240.0, 64.0], "#000000", 36.0)
            .expect("tableau")
            .ids[0]
            .clone();
        let t = table_of(&d, &id);
        let r: Vec<&str> = t.rows.iter().map(|x| x.id.as_str()).collect();
        let c: Vec<&str> = t.cols.iter().map(|x| x.id.as_str()).collect();
        d.merge_table_cells_inner(&id, [r[0], c[0]], [r[0], c[1]]).expect("fusion");
        assert_eq!(table_of(&d, &id).merges.len(), 1);
        assert_eq!(
            d.split_table_cell_inner(&id, [r[0], c[1]]),
            Err(CommandError::BadTable)
        );
        d.split_table_cell_inner(&id, [r[0], c[0]]).expect("division");
        assert!(table_of(&d, &id).merges.is_empty());
        d.set_table_shade_inner(&id, [r[0], c[2]], [r[2], c[2]], Some("#94a3b8".into()))
            .expect("ombre");
        assert_eq!(
            table_of(&d, &id).cells.iter().filter(|x| x.shade.is_some()).count(),
            3
        );
        d.set_table_fill_inner(&id, [r[0], c[0]], Some([r[1], c[1]]), Some("#fef08a".into()))
            .expect("plage");
        assert_eq!(
            table_of(&d, &id).cells.iter().filter(|x| x.fill.is_some()).count(),
            4
        );
        d.remove_table_line_inner(&id, true, r[0], Some(r[1].to_string()))
            .expect("deux lignes");
        assert_eq!(table_of(&d, &id).rows.len(), 1);
    }

    #[test]
    fn import_table_inner_reads_flat_merges() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let cells: Vec<String> = ["Titre", "", "a", "b"].map(String::from).to_vec();
        let c = d
            .import_table_inner(
                &p,
                &[1.0, 0.0, 0.0, 1.0, 10.0, 20.0],
                240.0,
                &[64.0, 64.0],
                2,
                cells.clone(),
                &[0, 0, 1, 2],
                "#000000",
                36.0,
            )
            .expect("import");
        let t = table_of(&d, &c.ids[0]);
        assert_eq!((t.merges.len(), t.cells.len()), (1, 3));
        assert_eq!(
            d.import_table_inner(&p, &[1.0, 0.0, 0.0, 1.0], 240.0, &[64.0, 64.0], 2, cells.clone(), &[], "#000000", 36.0),
            Err(CommandError::BadTable),
            "matrice de quatre nombres"
        );
        assert_eq!(
            d.import_table_inner(&p, &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0], 240.0, &[64.0, 64.0], 2, cells, &[0, 0, 1], "#000000", 36.0),
            Err(CommandError::BadTable),
            "fusions incomplètes"
        );
    }
```

- [ ] **Étape 3 : les voir rouges.** `cargo test -p roomboard-wasm table 2>&1 | grep "error\[" | head` (méthodes absentes).

- [ ] **Étape 4 : méthodes exposées.** Remplacer `remove_table_line` et `set_table_fill` (`:472-512`) et ajouter, à la
  suite :

```rust
    /// `to` : dernière ligne de la plage (C10b, F6) ; absent : `line` seule.
    pub fn remove_table_line(
        &mut self,
        id: &str,
        row: bool,
        line: &str,
        to: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .remove_table_line_inner(id, row, line, to)
                .map_err(cmd_err)?,
        )
    }

    /// `fill` absent ou null : retire le remplissage ; `to_row`, `to_col` : autre coin de la plage (C10b, F15).
    pub fn set_table_fill(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        fill: Option<String>,
        to_row: Option<String>,
        to_col: Option<String>,
    ) -> Result<JsValue, JsError> {
        let to = match (&to_row, &to_col) {
            (Some(r), Some(c)) => Some([r.as_str(), c.as_str()]),
            _ => None,
        };
        to_js(
            &self
                .set_table_fill_inner(id, [row, col], to, fill)
                .map_err(cmd_err)?,
        )
    }

    /// Fusion (C10b, F3) : rectangle par ids.
    pub fn merge_table_cells(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .merge_table_cells_inner(id, [from_row, from_col], [to_row, to_col])
                .map_err(cmd_err)?,
        )
    }

    /// Division (C10b, F4) : `row`, `col` = ancre.
    pub fn split_table_cell(&mut self, id: &str, row: &str, col: &str) -> Result<JsValue, JsError> {
        to_js(&self.split_table_cell_inner(id, [row, col]).map_err(cmd_err)?)
    }

    /// Ombrage (C10b, F9) : `shade` absent ou null : retire (révéler).
    pub fn set_table_shade(
        &mut self,
        id: &str,
        from_row: &str,
        from_col: &str,
        to_row: &str,
        to_col: &str,
        shade: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .set_table_shade_inner(id, [from_row, from_col], [to_row, to_col], shade)
                .map_err(cmd_err)?,
        )
    }

    /// Tableau rempli (C10b, F18) : `matrix` six nombres, `merges` quadruplets bout à bout.
    #[allow(clippy::too_many_arguments)]
    pub fn import_table(
        &mut self,
        page: &str,
        matrix: &[f64],
        col_width: f64,
        row_heights: &[f64],
        cols: u32,
        cells: Vec<String>,
        merges: &[u32],
        color: &str,
        size: f64,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .import_table_inner(page, matrix, col_width, row_heights, cols, cells, merges, color, size)
                .map_err(cmd_err)?,
        )
    }
```

- [ ] **Étape 5 : `*_inner`.** Remplacer `remove_table_line_inner` et `set_table_fill_inner` (`:917-956`, avec le
  `to: None` de T2) et ajouter après `set_table_fill_inner` :

```rust
    pub fn remove_table_line_inner(
        &mut self,
        id: &str,
        row: bool,
        line: &str,
        to: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::RemoveTableLine {
            id: id.to_string(),
            axis: table_axis(row),
            line: line.to_string(),
            to,
        })
    }

    pub fn set_table_fill_inner(
        &mut self,
        id: &str,
        cell: [&str; 2],
        to: Option<[&str; 2]>,
        fill: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableFill {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
            to: to.map(|[r, c]| (r.to_string(), c.to_string())),
            fill,
        })
    }

    pub fn merge_table_cells_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
    ) -> Result<Change, CommandError> {
        self.run(Command::MergeTableCells {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
        })
    }

    pub fn split_table_cell_inner(&mut self, id: &str, cell: [&str; 2]) -> Result<Change, CommandError> {
        self.run(Command::SplitTableCell {
            id: id.to_string(),
            row: cell[0].to_string(),
            col: cell[1].to_string(),
        })
    }

    pub fn set_table_shade_inner(
        &mut self,
        id: &str,
        from: [&str; 2],
        to: [&str; 2],
        shade: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetTableShade {
            id: id.to_string(),
            from: (from[0].to_string(), from[1].to_string()),
            to: (to[0].to_string(), to[1].to_string()),
            shade,
        })
    }

    /// Matrice qui n'a pas six nombres ou fusions qui ne vont pas par quatre : `BadTable` (comme le cœur, PC1).
    #[allow(clippy::too_many_arguments)]
    pub fn import_table_inner(
        &mut self,
        page: &str,
        matrix: &[f64],
        col_width: f64,
        row_heights: &[f64],
        cols: u32,
        cells: Vec<String>,
        merges: &[u32],
        color: &str,
        size: f64,
    ) -> Result<Change, CommandError> {
        let Ok(matrix) = <[f64; 6]>::try_from(matrix) else {
            return Err(CommandError::BadTable);
        };
        if merges.len() % 4 != 0 {
            return Err(CommandError::BadTable);
        }
        let merges: Vec<[u32; 4]> = merges
            .chunks_exact(4)
            .map(|m| [m[0], m[1], m[2], m[3]])
            .collect();
        self.run(Command::ImportTable {
            page: page.to_string(),
            matrix,
            col_width,
            row_heights: row_heights.to_vec(),
            cols,
            cells,
            merges,
            color: color.to_string(),
            size,
        })
    }
```

- [ ] **Étape 6 : `wasm-core.ts`.** Remplacer les cas que T4 a posés en levée :

```ts
      case "RemoveTableLine":
        return toChange(this.d.remove_table_line(cmd.id, cmd.axis === "row", cmd.line, cmd.to));
      case "SetTableSizes":
        return toChange(this.d.set_table_sizes(cmd.id, cmd.colWidth, cmd.rowHeight));
      case "SetTableFill":
        // null → undefined : Option::None côté Rust.
        return toChange(this.d.set_table_fill(cmd.id, cmd.row, cmd.col, cmd.fill ?? undefined, cmd.to?.row, cmd.to?.col));
      case "MergeTableCells":
        return toChange(this.d.merge_table_cells(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col));
      case "SplitTableCell":
        return toChange(this.d.split_table_cell(cmd.id, cmd.row, cmd.col));
      case "SetTableShade":
        return toChange(this.d.set_table_shade(cmd.id, cmd.from.row, cmd.from.col, cmd.to.row, cmd.to.col, cmd.shade ?? undefined));
      case "ImportTable":
        return toChange(
          this.d.import_table(
            cmd.page,
            new Float64Array(cmd.matrix),
            cmd.colWidth,
            new Float64Array(cmd.rowHeights),
            toU32(cmd.cols),
            [...cmd.cells],
            Uint32Array.from(cmd.merges.flat(), toU32),
            cmd.color,
            cmd.size,
          ),
        );
```

- [ ] **Étape 7 : contrat sur le vrai module.** Dans `wasm-core.contract.test.ts`, remplacer
  `const c10bFactories: { name: string; f: CoreFactory }[] = [{ name: "fausse liaison", f: fakeCore }];` par
  `const c10bFactories = factories;`, puis à la fin du fichier :

```ts
describe.skipIf(loaded === null)("contrat C10b : vrai module seulement", () => {
  it("fixture tableau-fusion-ombrage.roomboard (F30, S3) : « Lundi » sur deux colonnes, trois cellules ombrées", () => {
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-core/tests/fixtures/tableau-fusion-ombrage.roomboard", import.meta.url)));
    const d = need().core.load(bytes);
    const id = d.elementIds(first(d)).find((e) => d.element(e)?.kind === "table") ?? "";
    const t = tableOf(d, id);
    expect([t.cols.length, t.rows.length, t.merges.length, t.merges[0]?.cols]).toEqual([4, 3, 1, 2]);
    expect(t.cells.filter((c) => c.shade !== null)).toHaveLength(3);
    expect(t.cells[0]?.text).toBe("Lundi");
    d.free();
  });
});
```

- [ ] **Étape 8 : vert, format, clippy.** La commande bornée ; `cargo fmt --all` ;
  `cargo clippy -p roomboard-wasm --all-targets -- -D warnings 2>&1 | grep -E "^(warning|error)" | head` (rien).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): bind C10b table commands and play the contract on the real module" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, taille du module, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t8"></a>

### Tâche T8 — Outil Tableau : plage, saisie au relâché, fusion, division, ombrage, plages des actions

**Objectif.** L'outil Tableau fait la plage (F14) : glisser d'une cellule à une autre du même tableau, ou Maj+clic depuis
la cellule active, sans ouvrir la saisie ; la plage s'élargit aux zones qu'elle touche et se montre par
`EditOverlay.frame`. Un clic sans glisser ouvre la saisie **au relâché** (changement de C10a, HB-12, effet de bord) ; un
appui pendant une saisie ouverte valide seulement, même s'il glisse. Échap retire la plage (`clearRange`, PC18). Les
actions : « Fusionner » (F3, l'ancre devient active, PC19), « Diviser » (F4), « Ombrer » / « Retirer l'ombrage » (F9,
couleur F13), pastilles sur la plage (F15), « + Ligne » après la fin de la zone ou de la plage (F5), « − Ligne » sur la
plage en une commande (F6). Une cellule couverte s'active par son ancre ; la saisie d'une zone a sa largeur réunie (F7).

**Fichiers.**
- Modifier : `apps/web/src/engine/tools/table.ts` (fichier entier, bouchons de T6 compris)
- Modifier : `apps/web/src/engine/tools/table.test.ts` (`setup` gagne `shift`, bloc neuf)

**Interfaces.**
- Consomme (T4) : `Command` C10b, `CellIds`, `TableData.merges`, `TableCell.shade` ; (T6) `anchorOf`, `cellRect`,
  `rangeRect`, `expandRange`, `mergeAt`, `rangeCells`, `cellContent` (avec `shade`), `step`, `Range`, `TableAction`,
  `TABLE_SHADE_COLOR`, `TableTool.clearRange`, `TableCellState.{range, merged, shaded}`.
- Produit : `createTableTool(ctx, editor, picker, style, measure): TableTool` (signature inchangée) ; `cellState()` publie
  `range`, `merged`, `shaded` (lus par T11).
- Réutilise : `apps/web/src/engine/tools/table.ts:60-323`, `tools/tool.ts:56` — `begin` / `extend` / `close` (plage, saisie
  au relâché), `act` (quatre actions), `fill` (plage) étendus dans le même module.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/tools/table.test.ts src/engine/engine.test.ts src/engine/tools/text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C10b|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucune ligne `×` ; 13 lignes `✓ outil Tableau (C10b) > …` dont « F14 : clic sans glisser : saisie ouverte au
relâché, pas à l'appui » (effet de bord), « F14 : appui pendant une saisie ouverte puis glisser : valide seulement, aucune
plage », « F6 : − Ligne sur une plage de deux lignes : une RemoveTableLine avec to » (Review Focus 2), « F16 : Tab saute
les cellules couvertes » (S5) ; « outil Tableau (C10a) », « moteur et outil Tableau (C10a, S2) » et `text.test.ts`
restent verts (carte d'impact : `tools/table.test.ts` gardé vert, attendus d'ouverture lus après `close`). `tsc` : seuls
les écarts nommés encore ouverts (`src/engine/render/*.test.ts` jusqu'à T9, `src/app/stage-tags.test.ts`,
`src/app/workspace.ts` jusqu'à T11).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC11 L'outil lit les zones par `table-geom.ts` (aucune lecture de `span`).
- GC12 Aucune taille d'écran neuve dans l'outil (la plage naît d'un changement de cellule, pas d'un seuil en px).
- GC13 `tsc` vide sauf les écarts nommés encore ouverts.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les deux fichiers ci-dessus.

**Patron à ne pas reprendre.** Ouvrir la saisie à l'appui (`begin`, C10a, `tools/table.ts:197-201`) : un glisser
n'aurait plus de place pour devenir une plage, et un appui sur la zone de saisie ouverte (au-dessus de la scène) ne doit
jamais en créer une. Ici l'appui choisit la cellule, le relâché décide : pas bougé de cellule → ouvrir ; changé de
cellule → plage. Chemin de référence du « relâché décide » : `apps/web/src/engine/tools/select.ts:153-170` (`close`
d'un glisser qui n'a pas franchi son seuil n'écrit rien).

**Interdits.** Aucune écriture au `begin` ni à l'`extend` (une écriture par action, D38) ; Suppr ne vide pas la plage
(HB-19) ; ne pas toucher `engine.ts` (contrat posé par T6).

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Dans `apps/web/src/engine/tools/table.test.ts` : dans `setup()`, ajouter
  `let shift = false;`, le membre `shift: () => shift,` au `ctx`, et `setShift: (v: boolean) => { shift = v; }` à l'objet
  rendu. Ajouter `import { TABLE_SHADE_COLOR } from "../table-geom";` (à côté de `cellHeight`). À la fin du fichier :

```ts
describe("outil Tableau (C10b)", () => {
  type S = ReturnType<typeof setup>;
  /** Appui en a, glisser jusqu'à b, relâché (caméra identité : px = unités). */
  const drag = (s: S, a: [number, number], b: [number, number]): void => {
    s.tool.begin(1, [at(a[0], a[1])]);
    s.tool.extend(1, [at(b[0], b[1])], []);
    s.tool.close(1, "end");
  };
  /** Tableau cols × rows en (100, 200), saisie fermée ; ids des lignes et colonnes. */
  const made = (cols: number, rows: number) => {
    const s = setup();
    const id = s.create(100, 200, cols, rows);
    s.tool.requestCommit();
    const t = s.table(id);
    return { s, id, r: t.rows.map((x) => x.id), c: t.cols.map((x) => x.id) };
  };
  /** Centre de la cellule (ligne, colonne) d'un tableau de colonnes 240 et lignes 64 en (100, 200). */
  const mid = (row: number, col: number): [number, number] => [100 + 240 * col + 120, 200 + 64 * row + 32];

  it("F14 : clic sans glisser : saisie ouverte au relâché, pas à l'appui (HB-12)", () => {
    const { s } = made(2, 2);
    const n = s.host.opened.length;
    s.tool.begin(1, [at(...mid(0, 1))]);
    expect(s.host.opened).toHaveLength(n);
    s.tool.close(1, "end");
    expect(s.host.opened).toHaveLength(n + 1);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 1, range: null });
  });

  it("F14 : glisser de la première à la deuxième cellule : plage 0,0-0,1, aucune saisie ; Échap (clearRange) la retire", () => {
    const { s } = made(2, 2);
    const n = s.host.opened.length;
    drag(s, mid(0, 0), mid(0, 1));
    expect(s.host.opened).toHaveLength(n);
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, range: { r0: 0, c0: 0, r1: 0, c1: 1 } });
    expect(s.tool.live().overlay?.frame).toEqual({ x0: 100, y0: 200, x1: 580, y1: 264 });
    expect(s.tool.clearRange()).toBe(true);
    expect(s.tool.cellState()?.range).toBeNull();
    expect(s.tool.clearRange()).toBe(false);
    expect(s.runs.filter((c) => c.type !== "AddTable")).toEqual([]);
  });

  it("F14 : Maj+clic : plage de la cellule active au point, élargie à une zone touchée", () => {
    const { s, id, r, c } = made(3, 3);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[1] ?? "", col: c[1] ?? "" }, to: { row: r[2] ?? "", col: c[2] ?? "" } });
    s.tool.prune();
    s.click(...mid(0, 0));
    s.tool.requestCommit();
    const n = s.host.opened.length;
    s.setShift(true);
    s.click(...mid(1, 1));
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 0, r1: 2, c1: 2 });
    expect(s.host.opened).toHaveLength(n);
  });

  it("F14 : appui pendant une saisie ouverte puis glisser : valide seulement, aucune plage", () => {
    const s = setup();
    s.create(100, 200, 2, 2);
    s.type("a");
    drag(s, mid(0, 0), mid(0, 1));
    expect(s.last()).toMatchObject({ type: "SetTableCell", content: "a" });
    expect(s.tool.cellState()?.range).toBeNull();
  });

  it("F3 : Fusionner : MergeTableCells sur la plage, l'ancre active, plage retirée ; une étape", () => {
    const { s, id, r, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 1));
    s.tool.act("merge");
    expect(s.last()).toEqual({ type: "MergeTableCells", id, from: { row: r[0], col: c[0] }, to: { row: r[0], col: c[1] } });
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, merged: true, range: null });
    expect(s.table(id).merges).toHaveLength(1);
    s.doc.undo();
    expect(s.table(id).merges).toHaveLength(0);
  });

  it("F4 : Diviser : SplitTableCell sur l'ancre active ; avec une plage : rien", () => {
    const { s, id, r, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 1));
    s.tool.act("merge");
    drag(s, mid(0, 0), mid(1, 2));
    const n = s.runs.length;
    s.tool.act("split");
    expect(s.runs).toHaveLength(n);
    s.tool.clearRange();
    s.tool.act("split");
    expect(s.last()).toEqual({ type: "SplitTableCell", id, row: r[0], col: c[0] });
    expect(s.table(id).merges).toEqual([]);
  });

  it("F9, S1 : Ombrer la plage d'une colonne : une SetTableShade, trois cellules ; Retirer l'ombrage : null ; la plage reste (PC19)", () => {
    const { s, id, r, c } = made(4, 3);
    drag(s, mid(0, 2), mid(2, 2));
    expect(s.tool.cellState()?.range).toEqual({ r0: 0, c0: 2, r1: 2, c1: 2 });
    s.tool.act("shade");
    expect(s.last()).toEqual({ type: "SetTableShade", id, from: { row: r[0], col: c[2] }, to: { row: r[2], col: c[2] }, shade: TABLE_SHADE_COLOR });
    expect(s.table(id).cells.filter((x) => x.shade !== null)).toHaveLength(3);
    expect(s.tool.cellState()).toMatchObject({ shaded: true, range: { r0: 0, c0: 2, r1: 2, c1: 2 } });
    s.tool.act("unshade");
    expect(s.last()).toMatchObject({ type: "SetTableShade", shade: null });
    expect(s.tool.cellState()?.shaded).toBe(false);
  });

  it("F15 : pastille sur une plage : SetTableFill avec to", () => {
    const { s, id, r, c } = made(2, 2);
    drag(s, mid(0, 0), mid(1, 1));
    s.tool.fill("#fef08a");
    expect(s.last()).toEqual({ type: "SetTableFill", id, row: r[0], col: c[0], to: { row: r[1], col: c[1] }, fill: "#fef08a" });
  });

  it("F5 : + Ligne sur une zone de deux lignes : insérée après sa dernière ligne", () => {
    const { s, id, r, c } = made(2, 3);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[1] ?? "", col: c[0] ?? "" } });
    s.click(...mid(1, 0));
    s.tool.requestCommit();
    s.tool.act("row-insert");
    expect(s.last()).toEqual({ type: "InsertTableLine", id, axis: "row", at: 2 });
  });

  it("F6 : − Ligne sur une plage de deux lignes : une RemoveTableLine avec to ; la ligne suivante devient active", () => {
    const { s, id, r } = made(2, 4);
    drag(s, mid(0, 0), mid(1, 0));
    s.tool.act("row-remove");
    expect(s.last()).toEqual({ type: "RemoveTableLine", id, axis: "row", line: r[0], to: r[1] });
    expect(s.tool.cellState()).toMatchObject({ row: 0, rows: 2, range: null });
    expect(s.table(id).rows.map((x) => x.id)).toEqual([r[2], r[3]]);
  });

  it("F16, F7 : clic sur une cellule couverte : l'ancre s'ouvre, à la largeur de la zone", () => {
    const { s, id, r, c } = made(3, 2);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    s.tool.prune();
    s.click(...mid(0, 1));
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, merged: true });
    expect(s.host.last().boxWidth).toBe(480 - 16);
    s.type("Lundi et un texte long qui passe à la ligne");
    s.tool.requestCommit();
    expect(s.last()).toMatchObject({ type: "SetTableCell", row: r[0], col: c[0], rowHeight: cellHeight("Lundi et un texte long qui passe à la ligne", 36, 480, narrow) });
  });

  it("F16, S5 : Tab saute les cellules couvertes", () => {
    const { s, id, r, c } = made(3, 2);
    s.doc.apply({ type: "MergeTableCells", id, from: { row: r[0] ?? "", col: c[0] ?? "" }, to: { row: r[0] ?? "", col: c[1] ?? "" } });
    s.click(...mid(0, 0));
    s.tool.navigate("next");
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 2 });
  });

  it("prune : coin de plage disparu (colonne retirée) : plage retirée, cellule active gardée", () => {
    const { s, id, c } = made(3, 2);
    drag(s, mid(0, 0), mid(0, 2));
    s.doc.apply({ type: "RemoveTableLine", id, axis: "col", line: c[2] ?? "" });
    s.tool.prune();
    expect(s.tool.cellState()).toMatchObject({ row: 0, col: 0, range: null });
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée : `×` sur le bloc C10b.

- [ ] **Étape 4 : l'outil.** Remplacer `apps/web/src/engine/tools/table.ts` :

```ts
/**
 * Outil Tableau (C10a, T6 à T12 ; C10b, F3 à F9, F14 à F16) : clic hors d'un tableau → grille de choix au point ; choix
 * → AddTable, saisie ouverte sur la première cellule. Appui sur un tableau → le plus haut sous le point, même sous
 * l'encre (I2) : sa cellule (l'ancre d'une zone) devient active ; au relâché, sans changement de cellule, la saisie
 * s'ouvre (F14, HB-12) ; un glisser vers une autre cellule du même tableau, ou Maj+clic, fait une plage, élargie aux
 * zones qu'elle touche. Un appui pendant une saisie ouverte valide seulement. Une SetTableCell par validation, hauteur
 * exigée mesurée comme le dessin, à la largeur de la zone (T5, F7, B1) ; Tab, Maj+Tab, flèches au bord par `navigate`
 * (DAC3, F16) ; porte IME partagée avec l'outil Texte. Fusionner, Diviser, Ombrer, Retirer l'ombrage, pastilles,
 * insertions et suppressions agissent sur la plage, sinon sur la zone de la cellule active. Cellule active et plage
 * tenues par ids, retirées par `prune` quand elles disparaissent (I1).
 */
import type { CellIds, Command, Matrix, TableAxis, TableData } from "../../core/api";
import { TABLE_MAX_LINES } from "../../core/api";
import { plainSpans } from "../../core/rich-text";
import { composeMatrix, translateMatrix } from "../../core/shapes";
import { screenToWorld } from "../camera";
import { EMPTY_OVERLAY } from "../render/overlay";
import {
  anchorOf,
  cellContent,
  cellHeight,
  cellInnerBox,
  cellOf,
  cellRect,
  expandRange,
  mergeAt,
  rangeCells,
  rangeRect,
  rowHeightsFor,
  step,
  tableAt,
  TABLE_COL_WIDTH,
  TABLE_ROW_HEIGHT,
  TABLE_SHADE_COLOR,
  type Cell,
  type CellRef,
  type Range,
} from "../table-geom";
import type { Measure } from "../text-layout";
import { createCommitGate } from "./commit-gate";
import { transformBounds } from "./handles";
import type { TextEditorHost, TextStyle } from "./text";
import { NO_LIVE, type LivePart, type TableTool, type ToolContext } from "./tool";

/** Grille de choix (hôte DOM : `app/table-picker.ts`, même forme que `TablePickerHost`) ; `at` en px CSS de la scène. */
export interface TablePicker {
  open(at: { readonly x: number; readonly y: number }, pick: (cols: number, rows: number) => void): void;
  close(): void;
  isOpen(): boolean;
}

/** Fond de la zone de saisie d'une cellule sans remplissage (HC10-10). */
export const CELL_EDITOR_BACKGROUND = "#ffffff";

/** Écart sous lequel deux tailles sont égales (Uniformiser, T14) : la moyenne de n tailles égales diffère d'un arrondi. */
const SIZE_EPSILON = 1e-6;
const sameSize = (a: number, b: number): boolean => Math.abs(a - b) <= SIZE_EPSILON;

/** Cellule retrouvée dans le document : son tableau, sa matrice, les rangs de son ancre. */
interface Located {
  readonly ref: CellRef;
  readonly transform: Matrix;
  readonly table: TableData;
  readonly cell: Cell;
}
/** Saisie ouverte : la cellule (par ids), son texte à l'ouverture, la largeur (de la zone) et la taille pour la mesure. */
interface Opened {
  readonly ref: CellRef;
  readonly initial: string;
  readonly colWidth: number;
  readonly size: number;
}
/** Appui sur une cellule (F14) : le relâché décide (ouvrir, ou rien après une plage). */
interface Press {
  readonly pointerId: number;
  readonly id: string;
  readonly start: Cell;
  moved: boolean;
}

export function createTableTool(ctx: ToolContext, editor: TextEditorHost, picker: TablePicker, style: () => TextStyle, measure: Measure): TableTool {
  let active: CellRef | null = null;
  /** Autre coin de la plage (F14), dans le tableau de `active` ; null : aucune plage. */
  let corner: CellRef | null = null;
  let press: Press | null = null;
  /** Pointeur dont l'appui a seulement validé la saisie ou fermé la grille : ni plage, ni ouverture au relâché. */
  let swallowed: number | null = null;
  let opened: Opened | null = null;
  let live: LivePart = NO_LIVE;
  const gate = createCommitGate(() => commit(), () => opened !== null);

  const refAt = (id: string, t: TableData, row: number, col: number): CellRef | null => {
    const r = t.rows[row];
    const c = t.cols[col];
    return r && c ? { id, row: r.id, col: c.id } : null;
  };
  const idsAt = (t: TableData, row: number, col: number): CellIds | null => {
    const r = t.rows[row];
    const c = t.cols[col];
    return r && c ? { row: r.id, col: c.id } : null;
  };

  /** Cellule active retrouvée, ramenée à l'ancre de sa zone (F16). */
  const locate = (ref: CellRef | null): Located | null => {
    if (ref === null) return null;
    const el = ctx.doc.element(ref.id);
    if (el?.kind !== "table") return null;
    const raw = cellOf(el.table, ref);
    if (raw === null) return null;
    const cell = anchorOf(el.table, raw);
    const anchor = refAt(ref.id, el.table, cell.row, cell.col);
    return anchor === null ? null : { ref: anchor, transform: el.transform, table: el.table, cell };
  };

  /** Plage en rangs, élargie aux zones (F14) ; null sans coin, coin d'un autre tableau ou disparu. */
  const rangeOf = (at: Located): Range | null => {
    if (corner === null || corner.id !== at.ref.id) return null;
    const b = cellOf(at.table, corner);
    return b === null ? null : expandRange(at.table, at.cell, b);
  };
  /** Zone de la cellule active (une cellule simple : elle-même). */
  const zoneOf = (at: Located): Range => mergeAt(at.table, at.cell) ?? { r0: at.cell.row, c0: at.cell.col, r1: at.cell.row, c1: at.cell.col };

  /** Cadre de la plage, sinon de la cellule active (boîte monde de ses quatre coins), redemandé à chaque changement. */
  const refresh = (): void => {
    const at = locate(active);
    const r = at === null ? null : rangeOf(at);
    live =
      at === null
        ? NO_LIVE
        : { ...NO_LIVE, overlay: { ...EMPTY_OVERLAY, frame: transformBounds(at.transform, r === null ? cellRect(at.table, at.cell) : rangeRect(at.table, r)) } };
    ctx.requestFrame?.();
  };

  const setActive = (ref: CellRef | null): void => {
    active = ref;
    corner = null;
    refresh();
    ctx.stateChanged?.();
  };

  const setCorner = (ref: CellRef | null): void => {
    corner = ref;
    refresh();
    ctx.stateChanged?.();
  };

  /** Écrit la cellule ouverte (une SetTableCell au plus, T9) ; la saisie est fermée avant `editor.close()`. */
  function commit(): void {
    const o = opened;
    if (o === null) return;
    const content = editor.value();
    opened = null;
    gate.reset();
    editor.close();
    if (content !== o.initial) {
      ctx.run({
        type: "SetTableCell",
        id: o.ref.id,
        row: o.ref.row,
        col: o.ref.col,
        content,
        rowHeight: cellHeight(content, o.size, o.colWidth, measure),
      });
    }
    refresh();
  }

  /** Ouvre la saisie sur la cellule active : coin intérieur de la zone, largeur de la zone moins les marges, fond. */
  const openActive = (): void => {
    const at = locate(active);
    if (at === null) {
      setActive(null);
      return;
    }
    active = at.ref;
    const r = cellRect(at.table, at.cell);
    const colWidth = r.x1 - r.x0;
    const inner = cellInnerBox(at.table, at.cell);
    const { text, fill } = cellContent(at.table, at.ref.row, at.ref.col);
    opened = { ref: at.ref, initial: text, colWidth, size: at.table.size };
    gate.reset();
    editor.open(
      {
        page: ctx.page(),
        id: at.ref.id,
        matrix: composeMatrix(at.transform, translateMatrix(inner.x, inner.y)),
        boxWidth: inner.w,
        color: at.table.color,
        size: at.table.size,
        initial: text,
        spans: plainSpans(text),
        background: fill ?? CELL_EDITOR_BACKGROUND,
      },
      ctx.camera(),
    );
  };

  /** Grille choisie (T6) : coin au point, décalé à gauche si le tableau dépasse la largeur de la page (T4, x ≥ 0). */
  const create = (x: number, y: number, cols: number, rows: number): void => {
    const page = ctx.page();
    const width = ctx.doc.page(page)?.width;
    if (width === undefined) return;
    const st = style();
    const x0 = Math.max(0, Math.min(x, width - cols * TABLE_COL_WIDTH));
    const id = ctx.run({ type: "AddTable", page, x: x0, y, cols, rows, colWidth: TABLE_COL_WIDTH, rowHeight: TABLE_ROW_HEIGHT, color: st.color, size: st.size })?.ids[0];
    const el = id === undefined ? null : ctx.doc.element(id);
    if (id === undefined || el?.kind !== "table") return;
    setActive(refAt(id, el.table, 0, 0));
    openActive();
  };

  /** − Ligne / − Colonne (T7, HC10-17, F6) : les lignes `i0..=i1` en une commande ; la voisine (après, sinon avant)
   *  devient active avant la commande, pour que `prune` la garde ; refus du cœur : la cellule d'avant revient. */
  const removeLines = (ref: CellRef, axis: TableAxis, ids: readonly string[], i0: number, i1: number): void => {
    const line = ids[i0];
    const last = ids[i1];
    const near = ids[i1 + 1] ?? ids[i0 - 1];
    if (ids.length - (i1 - i0 + 1) < 1 || line === undefined || last === undefined || near === undefined) return;
    active = axis === "row" ? { ...ref, row: near } : { ...ref, col: near };
    corner = null;
    const cmd: Command = i1 > i0 ? { type: "RemoveTableLine", id: ref.id, axis, line, to: last } : { type: "RemoveTableLine", id: ref.id, axis, line };
    if (ctx.run(cmd) === null) active = ref;
  };

  /** Uniformiser (T11) : colonnes à la largeur moyenne ; lignes à max(hauteur moyenne, plus grande hauteur exigée).
   *  Déjà uniforme à un arrondi près : aucune étape (T14). */
  const uniform = (id: string, t: TableData): void => {
    const w = t.cols.reduce((s, c) => s + c.width, 0) / t.cols.length;
    const need = Math.max(...rowHeightsFor(t, t.cols.map(() => w), measure));
    const mean = t.rows.reduce((s, r) => s + r.height, 0) / t.rows.length;
    const h = Math.max(mean, need);
    if (t.cols.every((c) => sameSize(c.width, w)) && t.rows.every((r) => sameSize(r.height, h))) return;
    ctx.run({ type: "SetTableSizes", id, colWidth: w, rowHeight: h });
  };

  /** Fusionner (F3, PC19) : la plage (au moins deux cellules) ; l'ancre devient active, la plage est retirée. */
  const merge = (at: Located, r: Range | null): void => {
    if (r === null || (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1) < 2) return;
    const from = idsAt(at.table, r.r0, r.c0);
    const to = idsAt(at.table, r.r1, r.c1);
    if (from === null || to === null) return;
    if (ctx.run({ type: "MergeTableCells", id: at.ref.id, from, to }) === null) return;
    active = { id: at.ref.id, ...from };
    corner = null;
  };

  /** Ombrer ou retirer l'ombrage (F9) sur la plage, sinon la zone active. */
  const shadeOver = (at: Located, span: Range, shade: string | null): void => {
    const from = idsAt(at.table, span.r0, span.c0);
    const to = idsAt(at.table, span.r1, span.c1);
    if (from !== null && to !== null) ctx.run({ type: "SetTableShade", id: at.ref.id, from, to, shade });
  };

  /** Avant une action de la rangée : valide la saisie ouverte ; pendant une composition, rien (la touche appartient à
   *  l'IME, comme `navigate`), et l'action n'a pas lieu. */
  const settle = (): boolean => {
    if (gate.composing()) return false;
    gate.request();
    return true;
  };

  return {
    begin(pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      press = null;
      // Appui pendant la saisie : valide seulement (T7 de C10a, F14), même s'il glisse ; grille ouverte : la ferme.
      if (opened !== null) {
        swallowed = pointerId;
        gate.request();
        return;
      }
      if (picker.isOpen()) {
        swallowed = pointerId;
        picker.close();
        return;
      }
      swallowed = null;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit !== null) {
        const ref = refAt(hit.id, hit.table, hit.cell.row, hit.cell.col);
        if (ref === null) return;
        const at = locate(active);
        // Maj+clic : plage de la cellule active au point (F14).
        if (ctx.shift?.() === true && at !== null && at.ref.id === hit.id) {
          setCorner(ref);
          return;
        }
        setActive(ref);
        press = { pointerId, id: hit.id, start: hit.cell, moved: false };
        return;
      }
      picker.open({ x: s.x, y: s.y }, (cols, rows) => create(x, y, cols, rows));
    },
    extend(pointerId, samples) {
      const p = press;
      const s = samples[samples.length - 1];
      if (p === null || p.pointerId !== pointerId || !s) return;
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      const hit = tableAt(ctx.doc, ctx.page(), x, y);
      if (hit === null || hit.id !== p.id) return;
      const same = hit.cell.row === p.start.row && hit.cell.col === p.start.col;
      if (same && !p.moved) return;
      p.moved = true;
      const ref = same ? null : refAt(hit.id, hit.table, hit.cell.row, hit.cell.col);
      if (ref?.row !== corner?.row || ref?.col !== corner?.col) setCorner(ref);
    },
    frame() {
      // rien à pousser
    },
    close(pointerId, how) {
      if (swallowed === pointerId) {
        swallowed = null;
        return;
      }
      const p = press;
      if (p === null || p.pointerId !== pointerId) return;
      press = null;
      // F14 : sans changement de cellule, le clic ouvre la saisie au relâché.
      if (how === "end" && !p.moved) openActive();
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
      picker.close();
      press = null;
      swallowed = null;
      if (active !== null) setActive(null);
    },
    cell: () => active,
    cellState() {
      const at = locate(active);
      if (at === null) return null;
      const range = rangeOf(at);
      const t = at.table;
      const shaded = (range === null ? [at.cell] : rangeCells(t, range)).some((c) => {
        const r = t.rows[c.row];
        const k = t.cols[c.col];
        return r !== undefined && k !== undefined && cellContent(t, r.id, k.id).shade !== null;
      });
      return { id: at.ref.id, row: at.cell.row, col: at.cell.col, rows: t.rows.length, cols: t.cols.length, range, merged: mergeAt(t, at.cell) !== null, shaded };
    },
    act(a) {
      if (!settle()) return;
      const at = locate(active);
      if (at === null) return;
      const { ref, table: t } = at;
      const r = rangeOf(at);
      // Plage, sinon zone de la cellule active (F5, F6).
      const span = r ?? zoneOf(at);
      switch (a) {
        case "row-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "row", at: span.r1 + 1 });
          break;
        case "col-insert":
          ctx.run({ type: "InsertTableLine", id: ref.id, axis: "col", at: span.c1 + 1 });
          break;
        case "row-remove":
          removeLines(ref, "row", t.rows.map((x) => x.id), span.r0, span.r1);
          break;
        case "col-remove":
          removeLines(ref, "col", t.cols.map((x) => x.id), span.c0, span.c1);
          break;
        case "uniform":
          uniform(ref.id, t);
          break;
        case "merge":
          merge(at, r);
          break;
        case "split":
          if (r === null && mergeAt(t, at.cell) !== null) ctx.run({ type: "SplitTableCell", id: ref.id, row: ref.row, col: ref.col });
          break;
        case "shade":
          shadeOver(at, span, TABLE_SHADE_COLOR);
          break;
        case "unshade":
          shadeOver(at, span, null);
          break;
        default:
          // Contrôle d'exhaustivité : une action ajoutée à `TableAction` sans cas ici ne compile pas.
          return a satisfies never;
      }
      refresh();
      ctx.stateChanged?.();
    },
    fill(color) {
      if (!settle()) return;
      const at = locate(active);
      if (at === null) return;
      const r = rangeOf(at);
      const from = r === null ? null : idsAt(at.table, r.r0, r.c0);
      const to = r === null ? null : idsAt(at.table, r.r1, r.c1);
      ctx.run(
        from !== null && to !== null
          ? { type: "SetTableFill", id: at.ref.id, row: from.row, col: from.col, to, fill: color }
          : { type: "SetTableFill", id: at.ref.id, row: at.ref.row, col: at.ref.col, fill: color },
      );
      refresh();
      ctx.stateChanged?.();
    },
    clearCell() {
      if (opened !== null) return false;
      const at = locate(active);
      if (at === null) return false;
      ctx.run({ type: "SetTableCell", id: at.ref.id, row: at.ref.row, col: at.ref.col, content: "" });
      refresh();
      return true;
    },
    clearRange() {
      if (opened !== null || corner === null) return false;
      setCorner(null);
      return true;
    },
    prune() {
      if (active === null) return;
      const at = locate(active);
      if (at !== null) {
        if (corner !== null && cellOf(at.table, corner) === null) corner = null;
        refresh();
        ctx.stateChanged?.();
        return;
      }
      // I1 : tableau, ligne ou colonne disparus : cellule retirée, saisie fermée sans rien écrire.
      active = null;
      corner = null;
      if (opened !== null) {
        opened = null;
        gate.reset();
        editor.close();
      }
      refresh();
      ctx.stateChanged?.();
    },
    navigate(move) {
      const o = opened;
      if (o === null || gate.composing()) return false;
      const at = locate(o.ref);
      if (at === null) return false;
      const next = step(at.table, at.cell, move);
      const tab = move === "next" || move === "prev";
      // Au bord : Tab est pris (la saisie reste ouverte), une flèche est rendue à la zone.
      if (next === null) return tab;
      // 64 lignes : Tab en dernière cellule est inerte, la saisie reste ouverte (T4).
      if (next === "add-row" && at.table.rows.length >= TABLE_MAX_LINES) return true;
      commit();
      if (next === "add-row") {
        if (ctx.run({ type: "InsertTableLine", id: o.ref.id, axis: "row", at: at.table.rows.length }) === null) return true;
        const el = ctx.doc.element(o.ref.id);
        setActive(el?.kind === "table" ? refAt(o.ref.id, el.table, el.table.rows.length - 1, 0) : null);
      } else {
        setActive(refAt(o.ref.id, at.table, next.row, next.col));
      }
      openActive();
      return true;
    },
    compositionStart() {
      gate.compositionStart();
    },
    compositionEnd() {
      gate.compositionEnd();
    },
    requestCommit() {
      gate.request();
    },
  };
}
```

- [ ] **Étape 5 : vert.** La commande bornée. Si un test C10a attendait l'ouverture dès `begin` sans `close`, déplacer
  son attendu après `close` (carte d'impact) et le citer au rapport ; aucun autre attendu C10a ne change.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/tools/table.ts && git add apps/web/src/engine/tools/table.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): table tool ranges, open on release, merge, split and shade" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, attendus C10a déplacés (s'il y en a), une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t9"></a>

### Tâche T9 — Dessin des zones et de l'ombrage, révélation par l'outil Sélection

**Objectif.** Le rendu dessine une zone fusionnée à son rectangle réuni, traits intérieurs omis (PC15), et un ombrage
opaque : fond à la couleur de la cellule puis hachures à 45° `#cbd5e1`, trait 2, pas 16, découpées à la cellule ou à la
zone, traits du tableau par-dessus (F13, HB-6) ; le texte d'une cellule ombrée ou couverte n'est jamais dessiné, quel
que soit l'outil (F11). Le texte d'une zone est mis en lignes à sa largeur réunie ; le cache des lignes suit la largeur
de chaque boîte (carte : « clé étendue aux zones »). L'outil Sélection révèle : un toucher sans glisser (moins de
`REVEAL_TAP_PX` = 8 px écran), sans Maj, dont l'élément le plus haut est un tableau et dont la cellule sous le point
porte un ombrage → `SetTableShade` à `null` sur elle, une étape, sélection inchangée ; au-delà de 8 px, le glisser
sélectionne et déplace depuis le point d'appui (F10, F12, HB-4, HB-24, effet de bord).

**Fichiers.**
- Modifier : `apps/web/src/engine/render/table-paint.ts` (fichier entier, 63 lignes), `apps/web/src/engine/render/table-paint.test.ts`
- Modifier : `apps/web/src/engine/render/canvas2d.ts:369` (commentaire de `cellLinesOf` seulement), `apps/web/src/engine/render/canvas2d.test.ts`
- Modifier : `apps/web/src/engine/tools/select.ts:1-7`, `:8-25` (imports, constante), `:29-42` (`Mode`, `Drag`), `:100-170`
  (`startDrag`, `begin`, `extend`, `close`), `apps/web/src/engine/tools/select.test.ts`

**Interfaces.**
- Consomme (T4) : `TableData.merges`, `TableCell.shade`, `Command` `SetTableShade` ; (T6) `mergeRanges`, `isCovered`,
  `cellRect`, `cellInnerBox`, `cellAt` (ancre), `cellContent` (avec `shade`), `TABLE_SHADE_HATCH`,
  `TABLE_SHADE_HATCH_WIDTH`, `TABLE_SHADE_HATCH_STEP`.
- Produit : `paintTableGrid(ctx, t)`, `cellTextBoxes(t)` (signatures inchangées) ; `export const REVEAL_TAP_PX = 8`
  (`tools/select.ts`).
- Réutilise : `apps/web/src/engine/tools/select.ts:116` (`begin`), `:153` (`close`), `:27` (`DRAG_THRESHOLD_PX`) ;
  `table-geom.ts:42` (`cellAt`) — mode de glisser `"tap-shade"` (cellule retenue au `begin`, révélée au `close` sans
  glisser) ; `ctx.run(SetTableShade)`.
- Réutilise : `apps/web/src/engine/render/table-paint.ts:22`, `:53` ; `canvas2d.ts:244`, `:369` — `paintTableGrid`
  (zones, ombrage), `cellTextBoxes` (rectangle réuni) étendues ; `paintText` inchangé (seul chemin du texte, B1).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/engine/render/table-paint.test.ts src/engine/render/canvas2d.test.ts src/engine/tools/select.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C10b|F10|F13|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c
```

Attendu : aucune ligne `×` ; 3 `✓ zones et ombrage (C10b, F13) > …`, 2 `✓ Canvas2DRenderer — tableau (C10b) > …`,
6 `✓ révélation d'un ombrage (F10) > …` dont « glisser de 5 px (< 8) : révélé quand même » et « glisser de 9 px :
déplacement depuis le point d'appui, rien de révélé » (Review Focus 5) ; « fonds et traits du tableau (C10a, T13, B1) »,
« Canvas2DRenderer — tableau (C10a) », « outil Sélection (D15, D38) », « outil Sélection — magnétisme (C9, S3) » restent
verts (tests à garder verts de la carte). `tsc` : les écarts `src/engine/render/*.test.ts` sont fermés ici ; restent
seulement `src/app/stage-tags.test.ts` et `src/app/workspace.ts` (fermés par T11).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`.
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC11 Le rendu lit les zones par `table-geom.ts` (aucune lecture de `span`) ; aucun texte dans `table-paint.ts` (B1).
- GC13 `tsc` vide sauf `src/app/stage-tags.test.ts` et `src/app/workspace.ts` (écarts nommés, fermés par T11).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les six fichiers ci-dessus ; dans `canvas2d.ts`, le commentaire seul.

**Interdits.** Aucun `fillText` dans `table-paint.ts` ; aucune transparence de l'ombrage selon l'outil (F11) ; aucune
révélation par un autre outil que Sélection (HB-4).

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** `apps/web/src/engine/render/table-paint.test.ts` : littéral `T` complété (`shade: null`
  à ses trois cellules, `merges: []`) ; à la fin :

```ts
/** 2 × 2 (100 × 64) : zone r1 × c1..c2 (« Lundi », jaune ; la couverte garde un texte d'une autre version), r2:c2 ombrée. */
const Z: TableData = {
  color: "#000000",
  size: 36,
  cols: [{ id: "c1", width: 100 }, { id: "c2", width: 100 }],
  rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }],
  cells: [
    { row: "r1", col: "c1", text: "Lundi", fill: "#fef08a", shade: null },
    { row: "r1", col: "c2", text: "caché", fill: "#bbf7d0", shade: null },
    { row: "r2", col: "c2", text: "réponse", fill: null, shade: "#94a3b8" },
  ],
  merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
};

describe("zones et ombrage (C10b, F13)", () => {
  it("zone fusionnée : un fond au rectangle réuni ; couverte : aucun fond ; trait intérieur de la zone omis", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), Z);
    expect(ctx.rects[0]).toEqual([0, 0, 200, 64]);
    expect(ctx.log).not.toContain("fillRect #bbf7d0");
    expect(ctx.path).not.toContainEqual(["M", 100, 0]);
    expect(ctx.path).toContainEqual(["M", 100, 64]);
  });

  it("F13 : ombrage : fond opaque à la couleur de la cellule, hachures #cbd5e1 découpées, traits du tableau par-dessus", () => {
    const ctx = new FakeCtx();
    paintTableGrid(asCtx(ctx), Z);
    expect(ctx.rects).toContainEqual([100, 64, 100, 64]);
    const fill = ctx.log.indexOf("fillRect #94a3b8");
    const hatch = ctx.log.indexOf(`stroke ${TABLE_SHADE_HATCH} ${TABLE_SHADE_HATCH_WIDTH}`);
    const lines = ctx.log.lastIndexOf(`stroke #000000 ${TABLE_LINE_WIDTH}`);
    expect(fill).toBeGreaterThanOrEqual(0);
    expect(hatch).toBeGreaterThan(fill);
    expect(lines).toBeGreaterThan(hatch);
    expect(ctx.log.slice(fill, hatch)).toContain("clip");
  });

  it("cellTextBoxes (F11) : zone = rectangle réuni ; cellule couverte et cellule ombrée : aucun texte", () => {
    expect(cellTextBoxes(Z)).toEqual([
      { row: "r1", col: "c1", text: "Lundi", x: TABLE_PADDING, y: TABLE_PADDING, w: 200 - 2 * TABLE_PADDING, h: 64 - 2 * TABLE_PADDING },
    ]);
  });
});
```

  (importer `TABLE_SHADE_HATCH`, `TABLE_SHADE_HATCH_WIDTH` de `../table-geom` avec `TABLE_LINE_WIDTH`, `TABLE_PADDING`.)

  `apps/web/src/engine/render/canvas2d.test.ts` : littéral `TABLE` du bloc C10a complété (`shade: null` aux deux
  cellules, `merges: []`) ; à la fin :

```ts
describe("Canvas2DRenderer — tableau (C10b)", () => {
  const els: ElementView[] = [];
  const ZT: TableElement = {
    id: "tz",
    kind: "table",
    transform: [1, 0, 0, 1, 0, 0],
    table: {
      color: "#000000",
      size: 36,
      cols: [{ id: "c1", width: 240 }, { id: "c2", width: 240 }],
      rows: [{ id: "r1", height: 64 }, { id: "r2", height: 64 }],
      cells: [
        { row: "r1", col: "c1", text: "Lundi mardi mercredi jeudi", fill: null, shade: null },
        { row: "r2", col: "c1", text: "réponse", fill: null, shade: "#94a3b8" },
      ],
      merges: [{ row: "r1", col: "c1", rows: 1, cols: 2 }],
    },
  };
  function draw() {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => els.find((e) => e.id === id) ?? null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, {});
    r.resize(100, 100, 1);
    const page = { id: "p", elementIds: ["tz"] };
    r.drawScene(page, IDENTITY, new Set());
    return { r, scene, page };
  }

  it("texte d'une zone mis en lignes à la largeur réunie (une ligne) ; cellule ombrée : aucun fillText (F11)", () => {
    els.splice(0, els.length, ZT);
    const { scene } = draw();
    expect(scene.texts.map((t) => t.text)).toEqual(["Lundi mardi mercredi jeudi"]);
  });

  it("zone défaite : le cache est remesuré sans invalidate (la clé suit la largeur des boîtes)", () => {
    els.splice(0, els.length, ZT);
    const { r, scene, page } = draw();
    const first = scene.measures;
    els.splice(0, els.length, { ...ZT, table: { ...ZT.table, merges: [] } });
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
    expect(scene.texts.filter((t) => t.text !== "réponse").length).toBeGreaterThan(1);
  });
});
```

  `apps/web/src/engine/tools/select.test.ts` : à la fin :

```ts
describe("révélation d'un ombrage (F10)", () => {
  type S = ReturnType<typeof setup>;
  /** Tableau 2 × 2 (240 × 64) en (100, 100), cellule (0, 0) ombrée. */
  const shadedTable = (s: S) => {
    const p = s.doc.pageIds()[0] ?? "";
    const id = s.doc.apply({ type: "AddTable", page: p, x: 100, y: 100, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const v = s.doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    const cell = { row: v.table.rows[0]?.id ?? "", col: v.table.cols[0]?.id ?? "" };
    s.doc.apply({ type: "SetTableShade", id, from: cell, to: cell, shade: "#94a3b8" });
    return { id, cell };
  };
  const shades = (s: S, id: string): number => {
    const v = s.doc.element(id);
    return v?.kind === "table" ? v.table.cells.filter((c) => c.shade !== null).length : -1;
  };

  it("F10, S1 : toucher une cellule ombrée : SetTableShade null sur elle, une étape, sélection inchangée", () => {
    const s = setup();
    const { id, cell } = shadedTable(s);
    gesture(s.tool, [[150, 130]]);
    expect(s.runs).toEqual([{ type: "SetTableShade", id, from: cell, to: cell, shade: null }]);
    expect([shades(s, id), s.tool.selection()]).toEqual([0, []]);
    s.doc.undo();
    expect(shades(s, id)).toBe(1);
  });

  it("F10, HB-24 : glisser de 5 px (< 8) : révélé quand même (seuil propre)", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[150, 130], [155, 130]]);
    expect(s.runs.map((c) => c.type)).toEqual(["SetTableShade"]);
    expect(shades(s, id)).toBe(0);
  });

  it("F10 : glisser de 9 px : déplacement depuis le point d'appui, rien de révélé", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[150, 130], [159, 130]]);
    expect(s.runs).toEqual([{ type: "Transform", ids: [id], matrix: [1, 0, 0, 1, 9, 0] }]);
    expect([shades(s, id), s.tool.selection()]).toEqual([1, [id]]);
  });

  it("F10 : Maj tenue, ou cellule non ombrée : sélection comme avant, rien d'écrit", () => {
    const s = setup();
    const { id } = shadedTable(s);
    s.setShift(true);
    gesture(s.tool, [[150, 130]]);
    expect([s.runs, s.tool.selection()]).toEqual([[], [id]]);
    s.setShift(false);
    s.tool.setSelection([]);
    gesture(s.tool, [[400, 130]]);
    expect([s.runs, s.tool.selection()]).toEqual([[], [id]]);
  });

  it("F10 : tableau déjà sélectionné : toucher une cellule ombrée (hors poignée) la révèle, la sélection reste", () => {
    const s = setup();
    const { id } = shadedTable(s);
    gesture(s.tool, [[400, 130]]);
    gesture(s.tool, [[150, 130]]);
    expect(s.runs.map((c) => c.type)).toEqual(["SetTableShade"]);
    expect(s.tool.selection()).toEqual([id]);
  });

  it("F10 : une forme au-dessus de la cellule ombrée : la forme est sélectionnée, rien de révélé", () => {
    const s = setup();
    const { id } = shadedTable(s);
    const r = s.rect(140, 120, 160, 140);
    gesture(s.tool, [[150, 130]]);
    expect([s.tool.selection(), shades(s, id)]).toEqual([[r], 1]);
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée : `×` sur les blocs C10b et F10.

- [ ] **Étape 4 : `table-paint.ts`.** Remplacer le fichier :

```ts
/**
 * Fonds, ombrages et traits d'un tableau (C10a, T13, B1 ; C10b, F11, F13) : aucun texte ici — le texte des cellules
 * passe par `paintText` de `canvas2d.ts`, seul chemin de dessin du texte. Repère local du tableau (coin en 0, 0), sous
 * sa matrice. Une zone fusionnée se dessine à son rectangle réuni, traits intérieurs omis (PC15) ; un ombrage est opaque
 * (fond à sa couleur, hachures à 45°), découpé à la cellule ou à la zone, dessiné quel que soit l'outil, sous les
 * traits ; le texte d'une cellule ombrée ou couverte n'est jamais dessiné (F11).
 */
import type { Bounds, TableCell, TableData } from "../../core/api";
import {
  cellInnerBox,
  cellOf,
  cellRect,
  isCovered,
  mergeRanges,
  TABLE_LINE_WIDTH,
  TABLE_SHADE_HATCH,
  TABLE_SHADE_HATCH_STEP,
  TABLE_SHADE_HATCH_WIDTH,
  type Cell,
} from "../table-geom";

export interface CellTextBox {
  readonly row: string;
  readonly col: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Bords successifs : 0, puis la somme des tailles. */
const edges = (sizes: readonly number[]): number[] =>
  sizes.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + s], [0]);

/** Rangs d'une cellule de la vue, ou null si sa ligne ou sa colonne n'est plus lue, ou si une zone la couvre. */
const visibleCell = (t: TableData, cell: TableCell): Cell | null => {
  const at = cellOf(t, cell);
  return at === null || isCovered(t, at) ? null : at;
};

/** Couleur lisible d'abord : le canvas ignore une couleur qu'il ne sait pas lire (validColor accepte tout nom de 3 à 20
 *  lettres), la valeur d'avant resterait. */
function fillBox(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  ctx.fillStyle = "transparent";
  ctx.fillStyle = color;
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
}

/** Ombrage (F13) : fond opaque à la couleur de la cellule, hachures à 45° découpées au rectangle. */
function paintShade(ctx: CanvasRenderingContext2D, b: Bounds, color: string): void {
  fillBox(ctx, b, color);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, b.y0, w, h);
  ctx.clip();
  ctx.beginPath();
  for (let k = -h; k < w; k += TABLE_SHADE_HATCH_STEP) {
    ctx.moveTo(b.x0 + k, b.y1);
    ctx.lineTo(b.x0 + k + h, b.y0);
  }
  ctx.strokeStyle = TABLE_SHADE_HATCH;
  ctx.lineWidth = TABLE_SHADE_HATCH_WIDTH;
  ctx.stroke();
  ctx.restore();
}

export function paintTableGrid(ctx: CanvasRenderingContext2D, t: TableData): void {
  for (const cell of t.cells) {
    if (cell.fill === null) continue;
    const at = visibleCell(t, cell);
    if (at !== null) fillBox(ctx, cellRect(t, at), cell.fill);
  }
  for (const cell of t.cells) {
    if (cell.shade === null) continue;
    const at = visibleCell(t, cell);
    if (at !== null) paintShade(ctx, cellRect(t, at), cell.shade);
  }
  const xs = edges(t.cols.map((c) => c.width));
  const ys = edges(t.rows.map((r) => r.height));
  const w = xs[xs.length - 1] ?? 0;
  const h = ys[ys.length - 1] ?? 0;
  const zones = mergeRanges(t);
  ctx.beginPath();
  if (zones.length === 0) {
    for (const x of xs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (const y of ys) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
  } else {
    // Segments par cellule ; le bord commun de deux cellules d'une même zone est omis.
    const same = (r: number, c: number, r2: number, c2: number): boolean =>
      zones.some((z) => r >= z.r0 && r <= z.r1 && c >= z.c0 && c <= z.c1 && r2 >= z.r0 && r2 <= z.r1 && c2 >= z.c0 && c2 <= z.c1);
    for (let i = 0; i < xs.length; i++) {
      for (let r = 0; r < t.rows.length; r++) {
        if (i > 0 && i < t.cols.length && same(r, i - 1, r, i)) continue;
        ctx.moveTo(xs[i] ?? 0, ys[r] ?? 0);
        ctx.lineTo(xs[i] ?? 0, ys[r + 1] ?? 0);
      }
    }
    for (let j = 0; j < ys.length; j++) {
      for (let c = 0; c < t.cols.length; c++) {
        if (j > 0 && j < t.rows.length && same(j - 1, c, j, c)) continue;
        ctx.moveTo(xs[c] ?? 0, ys[j] ?? 0);
        ctx.lineTo(xs[c + 1] ?? 0, ys[j] ?? 0);
      }
    }
  }
  ctx.strokeStyle = t.color;
  ctx.lineWidth = TABLE_LINE_WIDTH;
  ctx.lineCap = "square";
  ctx.stroke();
}

/** Boîtes de texte : cellules au texte non vide, ni couvertes ni ombrées (F11), au rectangle intérieur de leur zone. */
export function cellTextBoxes(t: TableData): CellTextBox[] {
  const out: CellTextBox[] = [];
  for (const cell of t.cells) {
    if (cell.text === "" || cell.shade !== null) continue;
    const at = visibleCell(t, cell);
    if (at === null) continue;
    out.push({ row: cell.row, col: cell.col, text: cell.text, ...cellInnerBox(t, at) });
  }
  return out;
}
```

  `apps/web/src/engine/render/canvas2d.ts:368`, commentaire de `cellLinesOf` :

```ts
  /** Lignes de chaque cellule au texte non vide (B1) : `layoutRich` du texte brut (C7b remplacera `plainSpans`) ; la clé
   *  suit la largeur de chaque boîte, donc la largeur réunie d'une zone fusionnée (C10b). */
```

- [ ] **Étape 5 : révélation.** `apps/web/src/engine/tools/select.ts` :
  - en-tête, ajouter à la fin du bloc : ` * C10b (F10) : un toucher sans glisser (< 8 px écran, REVEAL_TAP_PX), sans Maj, sur une cellule ombrée du tableau le plus
 * haut sous le point la révèle (SetTableShade à null, une étape), sélection inchangée ; au-delà, le glisser sélectionne et déplace.`
  - imports : `import { applyMatrix, IDENTITY_MATRIX, invertMatrix } from "../../core/shapes";` et
    `import { cellAt, cellContent } from "../table-geom";`
  - après `DRAG_THRESHOLD_PX` : `/** Toucher qui révèle un ombrage (F10, HB-24) : seuil propre, le glisser de 2 px est trop petit au doigt. */ export const REVEAL_TAP_PX = 8;`
  - remplacer `Mode` et `Drag` :

```ts
type Mode = "move" | "resize" | "band" | "none" | "tap-shade";

/** Cellule ombrée retenue au `begin` (F10), révélée au `close` si le pointeur n'a pas glissé. */
interface Reveal {
  readonly id: string;
  readonly row: string;
  readonly col: string;
}

interface Drag {
  readonly pointerId: number;
  /** `tap-shade` devient `move` au-delà de `REVEAL_TAP_PX`. */
  mode: Mode;
  readonly x0: number;
  readonly y0: number;
  x: number;
  y: number;
  readonly zoom: number;
  readonly handle: HandleId | null;
  readonly base: Bounds | null;
  readonly shift: boolean;
  readonly reveal: Reveal | null;
}
```

  - `startDrag` : paramètre `extra: { handle?: HandleId; base?: Bounds; reveal?: Reveal } = {}`, champ
    `reveal: extra.reveal ?? null,` ;
  - après `startDrag`, dans `createSelectTool` :

```ts
  /** Cellule ombrée sous (x, y) monde du tableau `id` (ancre d'une zone), ou null. */
  const shadedCellAt = (id: string, x: number, y: number): Reveal | null => {
    const el = ctx.doc.element(id);
    if (el?.kind !== "table") return null;
    const inv = invertMatrix(el.transform);
    if (inv === null) return null;
    const [lx, ly] = applyMatrix(inv, x, y);
    const c = cellAt(el.table, lx, ly);
    const r = c === null ? undefined : el.table.rows[c.row];
    const k = c === null ? undefined : el.table.cols[c.col];
    if (r === undefined || k === undefined) return null;
    return cellContent(el.table, r.id, k.id).shade === null ? null : { id, row: r.id, col: k.id };
  };
```

  - dans `begin`, juste après `if (hit !== null) {` :

```ts
        // F10 : sans Maj, une cellule ombrée du tableau le plus haut est retenue ; le relâché décide.
        const reveal = shift ? null : shadedCellAt(hit, x, y);
        if (reveal !== null) {
          startDrag(pointerId, "tap-shade", x, y, { reveal });
          return;
        }
```

  - dans `extend`, après `drag.y = y;` :

```ts
      // F10 : au-delà de 8 px écran, le toucher devient un déplacement depuis le point d'appui.
      if (drag.mode === "tap-shade" && Math.hypot(x - drag.x0, y - drag.y0) * drag.zoom >= REVEAL_TAP_PX) {
        const id = drag.reveal?.id;
        if (id !== undefined && !selection.includes(id)) selection = [id];
        drag.mode = "move";
      }
```

  - dans `close`, après `if (how !== "end") return;` :

```ts
      if (d.mode === "tap-shade") {
        const r = d.reveal;
        if (r !== null) ctx.run({ type: "SetTableShade", id: r.id, from: { row: r.row, col: r.col }, to: { row: r.row, col: r.col }, shade: null });
        return;
      }
```

- [ ] **Étape 6 : vert.** La commande bornée.

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/render/table-paint.ts && git add apps/web/src/engine/render/table-paint.test.ts && \
git add apps/web/src/engine/render/canvas2d.ts && git add apps/web/src/engine/render/canvas2d.test.ts && \
git add apps/web/src/engine/tools/select.ts && git add apps/web/src/engine/tools/select.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): paint merged cells and shades, reveal shades with the select tool" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, sortie `tsc`, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t10"></a>

### Tâche T10 — Import : grille posée, classeur lu dans un Worker jetable, gestionnaire `sheet`

**Objectif.** Un seul chemin pose une grille dans l'onglet actif (DAB2, F21, F22) : `insertTableGrid` mesure les
hauteurs exigées (colonnes à 240, lignes au moins 64), place le tableau par `placement` de l'import d'image (réduit,
jamais agrandi, à 80 % du visible, centré au point de dépôt ou au centre de la vue, cascade), lance une `ImportTable`
(une étape, S4 « Ctrl+Z retire le tableau d'un coup ») et dit la troncature et les textes coupés. Le classeur se lit
dans un **Worker jetable** par lecture, qui charge sa propre instance du module `formats` et est arrêté après la
réponse, l'erreur ou une panique Wasm (F28, DAB4) : un classeur malformé n'empêche jamais d'enregistrer. Le registre de
`importFiles` gagne le gestionnaire `sheet` (nature `objet`, `.xlsx` / `.xlsm` **et** en-tête `PK\x03\x04`), avec ses
messages et son plafond de 100 Mo aussi dans la coque (F22). `vite.config.ts` gagne `worker: { format: "es" }`.

**Fichiers.**
- Créer : `apps/web/src/platform/table-insert.ts`, `table-insert.test.ts`, `sheet-reader.ts`, `sheet-reader.test.ts`,
  `sheet-worker.ts`
- Modifier : `apps/web/src/platform/import.ts:1-35` (en-tête, `ImportDeps.readSheet`), `:85-92` (registre, gestionnaire),
  `apps/web/src/platform/import.test.ts` (`fakeTarget`, bloc neuf)
- Modifier : `apps/web/src/platform/image-import.ts:226-236` (`ImageTarget` gagne `measure`, `textStyle`) ;
  `apps/web/src/platform/image-import.test.ts` : aucun changement attendu (ses cibles sont `as never`) — à toucher
  seulement si `tsc` le demande
- Modifier : `apps/web/src/platform/container.ts:46-58` (`SheetFormatsBinding`, `hasSheetReader`),
  `apps/web/src/platform/container.contract.test.ts` (bloc neuf), `apps/web/vite.config.ts`

**Interfaces.**
- Consomme : (T3) `SheetReader` du module `formats` (`open`, `rows`, `cols`, `cells`, `merges` en `Uint32Array`,
  `source_rows`, `source_cols`, `cut_cells`, `free`), messages « la première feuille est vide », « classeur trop gros
  pour un import en valeurs », « classeur illisible : … », fixture `valeurs.xlsx` ; (T4) `Command` `ImportTable`,
  `TableData` avec `merges` / `shade` ; (T5) `TableGrid`, `GridMerge` ; (T6) `rowHeightsFor` (zones), `TABLE_COL_WIDTH`,
  `TABLE_ROW_HEIGHT`.
- Produit (lu par T11) :

```ts
// platform/table-insert.ts
export const TABLE_TAB_CLOSED = "onglet fermé pendant l'import, tableau non inséré";
export const CUT_CELLS_MESSAGE = "texte coupé à 2 000 caractères dans certaines cellules";
export function truncatedMessage(rows: number, cols: number): string;
export function gridTable(grid: TableGrid, size: number): TableData;
export function gridRowHeights(grid: TableGrid, size: number, measure: Measure): number[];
export function insertTableGrid(target: ImageTarget, grid: TableGrid, at: Point | null, index: number, notify: (m: string) => Promise<void>, name?: string): Promise<"inserted" | "failed">;
// platform/sheet-reader.ts
export const EMPTY_SHEET_MESSAGE: string; export const SHEET_TOO_BIG_MESSAGE: string; export const WORKER_FAILED_MESSAGE: string;
export interface WorkerLike { onmessage: ((e: { readonly data: unknown }) => void) | null; onerror: ((e: unknown) => void) | null; postMessage(message: unknown, transfer: Transferable[]): void; terminate(): void }
export interface SheetReader { read(file: Blob): Promise<TableGrid> }
export interface SheetBinding { rows(): number; cols(): number; cells(): string[]; merges(): Uint32Array; source_rows(): number; source_cols(): number; cut_cells(): boolean; free(): void }
export function gridOf(r: SheetBinding): TableGrid;
export function isTableGrid(v: unknown): v is TableGrid;
export function createSheetReader(spawn: () => WorkerLike): SheetReader;
// platform/import.ts
export const SHEET_MAX_BYTES = 100 * 1024 * 1024;
export function isSheetName(name: string): boolean;
export function sheetHandler(deps: { readSheet(b: Blob): Promise<TableGrid> }): ImportHandler;
// ImportDeps.readSheet?(b: Blob): Promise<TableGrid>
// platform/image-import.ts : ImageTarget.measure(): Measure ; ImageTarget.textStyle(): { readonly color: string; readonly size: number }
// platform/container.ts
export interface SheetFormatsBinding extends FormatsBinding { readonly SheetReader: { open(bytes: Uint8Array): SheetBinding } }
export function hasSheetReader(m: FormatsBinding): m is SheetFormatsBinding;
```

- Réutilise : `apps/web/src/platform/container.ts:47` (`FormatsBinding`), `container-load.ts:7` (`loadFormatsModule`) —
  `SheetFormatsBinding` étend `FormatsBinding` (les faux modules des tests existants restent valides) ; le Worker appelle
  `loadFormatsModule` tel quel et vérifie `hasSheetReader`.
- Réutilise : aucun Worker dans `apps/web/src` (termes `Worker(`, `postMessage`, `onmessage`) — nouveaux modules
  `platform/sheet-reader.ts` : `createSheetReader(spawn: () => WorkerLike): SheetReader`, `SheetReader { read(file: Blob): Promise<TableGrid> }`
  (un Worker par lecture, arrêté après la réponse ou l'erreur) ; `platform/sheet-worker.ts` : message `{ bytes }` →
  `{ grid }` ou `{ error }` (DAB4).
- Réutilise : `apps/web/src/platform/import.ts:58` (`ImportHandler`), `:91` (registre), `:25` (`ImportDeps`) —
  `sheetHandler(deps: { readSheet(b: Blob): Promise<TableGrid> }): ImportHandler` ajouté au registre ; `ImportDeps.readSheet?`.
- Réutilise : `apps/web/src/platform/import.ts` (`f.head(HEAD_BYTES)` de la boucle, `isRoomboardName`) — `detect(head, name)` :
  extension `.xlsx` / `.xlsm` et `PK\x03\x04` (même forme que `isRoomboardName`).
- Réutilise : `apps/web/src/platform/image-import.ts:194` (`anchorOf`), `:204` (`visibleOf`), `:212` (`placement`), `:226`
  (`ImageTarget`) ; `engine/table-geom.ts:113` (`rowHeightsFor`), `:13-14` (`TABLE_COL_WIDTH`, `TABLE_ROW_HEIGHT`) —
  nouveau `platform/table-insert.ts` : `insertTableGrid(target, grid, at, index, notify, name?)` (mesure, matrice,
  `ImportTable`, message de troncature) ; `ImageTarget` gagne `measure()` et `textStyle()`.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm-formats && \
wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/platform --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "F21|F22|F28|C10b|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c && \
pnpm --filter @roomboard/web exec vite build --outDir /tmp/c10b-t10-dist 2>&1 | tail -2 && \
find /tmp/c10b-t10-dist/assets -name 'roomboard_formats_wasm_bg*.wasm' | wc -l && rm -rf /tmp/c10b-t10-dist
```

Attendu : aucune ligne `×` ; 6 `✓ poser une grille (F21, F22) > …`, 5 `✓ lecteur de classeur en Worker (F28) > …` dont
« onerror du Worker (panic Wasm) : rejet, Worker arrêté » (Review Focus 4), 5 `✓ importFiles : classeur (F28) > …`,
1 `✓ contrat C10b : classeur (vrai module formats) > …` ; les blocs existants de `import.test.ts`, `image-import.test.ts`,
`container.test.ts`, `container.contract.test.ts`, `paste.test.ts` restent verts ; `tsc` : seul l'écart nommé
`src/app/workspace.ts` (et `src/app/stage-tags.test.ts`), fermés par T11 ; `vite build` réussit et le décompte des
modules `formats` vaut `1`.

**Écarts `tsc` nommés (recopiés).** Après cette tâche et jusqu'à T11 : `src/app/workspace.ts` (`measure` / `textStyle`
absents de `imageTarget`) ; `src/app/stage-tags.test.ts` (de T6). Aucun autre.

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé. Ici
  le module `formats` est exigé (`ROOMBOARD_WASM_REQUIRED=1`).
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .) && ([ -d apps/web/src/wasm ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm apps/web/src/)`
  (module principal copié pour `vite build` seulement ; `apps/web/src/wasm-formats` reconstruit par la commande ; rien
  de cela n'est commité).
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC9 Plafond du module `formats` 3 Mio ni baissé ni relevé ; un seul fichier `formats` émis (le Worker et la page le
  partagent, `verifier.sh:61-65` inchangé).
- GC11 Le classeur n'est jamais lu par l'instance du module `formats` de la page (`createPageCodec`, HR6).
- GC13 `tsc` vide sauf les écarts nommés ci-dessus.
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 Aucun `.xlsx` téléchargé : les tests lisent `crates/roomboard-formats/tests/fixtures/valeurs.xlsx` ou des octets
  fabriqués.
- GC17 Aucun processus laissé en marche ; `/tmp/c10b-t10-dist` retiré.
- GC18 Périmètre : seuls les fichiers ci-dessus.

**Patron à ne pas reprendre.** Lire le classeur avec le codec de la page (`createPageCodec(loadFormatsModule)`,
`apps/web/src/platform/container.ts:59`) : son instance Wasm est gardée jusqu'au rechargement (HR6) et un `panic` de
`calamine` (`panic = abort` en wasm32) la tuerait, le document ne s'enregistrerait plus. Ici : une instance neuve dans
un Worker neuf par lecture, toujours arrêté (`finally`). Chemin de référence du port asynchrone sur `Blob` :
`apps/web/src/platform/container.ts:1-4`, `:72-90`.

**Interdits.** Ne pas créer le Worker hors de `main.ts` (T11) ; aucun `import` statique de `sheet-worker.ts` ni de
`src/wasm-formats/` depuis un module testé ; ne pas toucher `verifier.sh`.

**Critère « terminé ».** Commande bornée verte, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.** Créer `apps/web/src/platform/table-insert.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { Command } from "../core/api";
import { createAssetStore } from "../core/asset-store";
import { IDENTITY } from "../engine/camera";
import { cellHeight } from "../engine/table-geom";
import type { TableGrid } from "./html-table";
import type { ImageTarget } from "./image-import";
import { CUT_CELLS_MESSAGE, gridRowHeights, insertTableGrid, TABLE_TAB_CLOSED } from "./table-insert";

const narrow = (s: string): number => s.length * 10;
type Import = Extract<Command, { type: "ImportTable" }>;
function fakeTarget(o: { alive?: boolean; refuse?: boolean } = {}) {
  const cmds: Command[] = [];
  const target: ImageTarget = {
    assets: createAssetStore(),
    page: () => "p1",
    camera: () => IDENTITY,
    stageRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    alive: () => o.alive !== false,
    measure: () => narrow,
    textStyle: () => ({ color: "#1d4ed8", size: 36 }),
    run: (cmd) => {
      cmds.push(cmd);
      return o.refuse === true ? null : { pages: ["p1"], ids: ["t"], removed: [], full: false, version: 1 };
    },
  };
  return { target, cmds };
}
const grid = (over: Partial<TableGrid> = {}): TableGrid => ({
  rows: 2, cols: 2, cells: ["Titre", "", "a", "b"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 2, sourceCols: 2, cutCells: false, ...over,
});

describe("poser une grille (F21, F22)", () => {
  it("F21 : colonnes 240, lignes ≥ 64, couleur du stylo, centrée au centre de la vue ; une ImportTable, aucun message", async () => {
    const t = fakeTarget();
    const notify = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(t.target, grid(), null, 0, notify)).toBe("inserted");
    expect(t.cmds).toEqual([{
      type: "ImportTable", page: "p1", matrix: [1, 0, 0, 1, 160, 236], colWidth: 240, rowHeights: [64, 64], cols: 2,
      cells: ["Titre", "", "a", "b"], merges: [[0, 0, 1, 2]], color: "#1d4ed8", size: 36,
    }]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("F21 : texte long : sa ligne prend la hauteur exigée ; texte couvert ignoré pour la mesure", () => {
    const long = "aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee";
    expect(gridRowHeights(grid({ cells: ["", "", long, ""] }), 36, narrow)).toEqual([64, Math.max(64, cellHeight(long, 36, 240, narrow))]);
    expect(gridRowHeights(grid({ rows: 1, cells: ["court", long], sourceRows: 1 }), 36, narrow)).toEqual([64]);
  });

  it("F22 : 70 × 6 : message de troncature avec le nom du fichier ; collage : sans nom", async () => {
    const big = grid({ rows: 64, cols: 6, cells: new Array<string>(384).fill(""), merges: [], sourceRows: 70, sourceCols: 6 });
    const notify = vi.fn(async (_m: string) => undefined);
    await insertTableGrid(fakeTarget().target, big, null, 0, notify, "valeurs.xlsx");
    await insertTableGrid(fakeTarget().target, big, null, 0, notify);
    expect(notify.mock.calls.map((c) => c[0])).toEqual([
      "valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)",
      "tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)",
    ]);
  });

  it("F22 : textes coupés : un seul message", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    await insertTableGrid(fakeTarget().target, grid({ cutCells: true }), null, 0, notify, "v.xlsx");
    expect(notify.mock.calls).toEqual([[`v.xlsx : ${CUT_CELLS_MESSAGE}`]]);
  });

  it("onglet fermé : rien d'écrit, message ; ImportTable refusée : failed sans message", async () => {
    const closed = fakeTarget({ alive: false });
    const notify = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(closed.target, grid(), null, 0, notify, "v.xlsx")).toBe("failed");
    expect([closed.cmds, notify.mock.calls]).toEqual([[], [[`v.xlsx : ${TABLE_TAB_CLOSED}`]]]);
    const refused = fakeTarget({ refuse: true });
    const quiet = vi.fn(async (_m: string) => undefined);
    expect(await insertTableGrid(refused.target, grid(), null, 0, quiet)).toBe("failed");
    expect(quiet).not.toHaveBeenCalled();
  });

  it("point de dépôt dans la scène : centré sur ce point, décalé de 24 par fichier déjà inséré (R4)", async () => {
    const t = fakeTarget();
    await insertTableGrid(t.target, grid(), { x: 400, y: 300 }, 1, vi.fn(async () => undefined));
    expect((t.cmds[0] as Import).matrix).toEqual([1, 0, 0, 1, 400 - 240 + 24, 300 - 64 + 24]);
  });
});
```

  Créer `apps/web/src/platform/sheet-reader.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { TableGrid } from "./html-table";
import { createSheetReader, EMPTY_SHEET_MESSAGE, gridOf, WORKER_FAILED_MESSAGE, type WorkerLike } from "./sheet-reader";

class FakeWorker implements WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  posted: unknown[] = [];
  terminated = 0;
  postMessage(m: unknown): void {
    this.posted.push(m);
  }
  terminate(): void {
    this.terminated++;
  }
}
const G: TableGrid = { rows: 1, cols: 2, cells: ["a", "b"], merges: [], sourceRows: 1, sourceCols: 2, cutCells: false };
const blob = () => new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]);

describe("lecteur de classeur en Worker (F28)", () => {
  it("un Worker par lecture, octets envoyés, arrêté après la réponse", async () => {
    const w = new FakeWorker();
    const spawn = vi.fn(() => w);
    const p = createSheetReader(spawn).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    expect(w.posted[0]).toEqual({ bytes: new Uint8Array([0x50, 0x4b, 3, 4]) });
    w.onmessage?.({ data: { grid: G } });
    await expect(p).resolves.toEqual(G);
    expect([spawn.mock.calls.length, w.terminated]).toEqual([1, 1]);
  });

  it("erreur rendue par le Worker : rejet avec son message, Worker arrêté", async () => {
    const w = new FakeWorker();
    const p = createSheetReader(() => w).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    w.onmessage?.({ data: { error: EMPTY_SHEET_MESSAGE } });
    await expect(p).rejects.toThrow(EMPTY_SHEET_MESSAGE);
    expect(w.terminated).toBe(1);
  });

  it("onerror du Worker (panic Wasm) : rejet, Worker arrêté ; la lecture suivante a son propre Worker (DAB4)", async () => {
    const workers = [new FakeWorker(), new FakeWorker()];
    let n = 0;
    const reader = createSheetReader(() => workers[n++] ?? new FakeWorker());
    const p = reader.read(blob());
    await vi.waitFor(() => expect(workers[0]?.posted).toHaveLength(1));
    workers[0]?.onerror?.(new Error("unreachable"));
    await expect(p).rejects.toThrow(WORKER_FAILED_MESSAGE);
    expect(workers[0]?.terminated).toBe(1);
    const q = reader.read(blob());
    await vi.waitFor(() => expect(workers[1]?.posted).toHaveLength(1));
    workers[1]?.onmessage?.({ data: { grid: G } });
    await expect(q).resolves.toEqual(G);
  });

  it("réponse mal formée : rejet", async () => {
    const w = new FakeWorker();
    const p = createSheetReader(() => w).read(blob());
    await vi.waitFor(() => expect(w.posted).toHaveLength(1));
    w.onmessage?.({ data: { grid: { rows: 1, cols: 1, cells: [] } } });
    await expect(p).rejects.toThrow(WORKER_FAILED_MESSAGE);
  });

  it("gridOf : fusions en quadruplets, dimensions de la source, textes coupés", () => {
    const freed: number[] = [];
    const g = gridOf({
      rows: () => 2, cols: () => 2, cells: () => ["a", "", "c", "d"], merges: () => new Uint32Array([0, 0, 1, 2]),
      source_rows: () => 70, source_cols: () => 6, cut_cells: () => true, free: () => freed.push(1),
    });
    expect(g).toEqual({ rows: 2, cols: 2, cells: ["a", "", "c", "d"], merges: [{ row: 0, col: 0, rows: 1, cols: 2 }], sourceRows: 70, sourceCols: 6, cutCells: true });
    expect(freed).toEqual([]);
  });
});
```

  Dans `apps/web/src/platform/import.test.ts` : `fakeTarget` gagne `measure: () => (s: string) => s.length * 10,` et
  `textStyle: () => ({ color: "#000000", size: 36 }),` ; importer `SHEET_MAX_BYTES` de `./import`, `EMPTY_SHEET_MESSAGE`
  de `./sheet-reader` et le type `TableGrid` de `./html-table` ; à la fin :

```ts
describe("importFiles : classeur (F28)", () => {
  const G: TableGrid = { rows: 2, cols: 2, cells: ["a", "b", "c", "d"], merges: [], sourceRows: 2, sourceCols: 2, cutCells: false };
  const PK = new Uint8Array([0x50, 0x4b, 3, 4, 9]);

  it("S4 : .xlsx reconnu par son nom et PK : readSheet puis une ImportTable dans l'onglet actif", async () => {
    const t = fakeTarget();
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, readSheet }).importFiles([file("v.xlsx", PK)], null);
    expect(r).toEqual({ opened: [], inserted: ["v.xlsx"], refused: [], failed: [] });
    expect(readSheet).toHaveBeenCalledTimes(1);
    expect(t.cmds).toHaveLength(1);
    expect(t.cmds[0]).toMatchObject({ type: "ImportTable", cols: 2, cells: ["a", "b", "c", "d"], colWidth: 240 });
    expect(notify).not.toHaveBeenCalled();
  });

  it("S4 : casse.xlsx sans en-tête PK : refusé par le registre (prochaine version) ; .xlsm avec PK : reconnu", async () => {
    const t = fakeTarget();
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => t.target, readSheet })
      .importFiles([file("casse.xlsx", new Uint8Array([1, 2, 3, 4])), file("m.xlsm", PK)], null);
    expect([r.refused, r.inserted]).toEqual([["casse.xlsx"], ["m.xlsm"]]);
    expect(notify).toHaveBeenCalledWith(`casse.xlsx : ${LATER_FORMAT_MESSAGE}`);
  });

  it("S4 : lecture en échec : « Import impossible (casse.xlsx) : … » ; feuille vide : « <nom> : la première feuille est vide »", async () => {
    const notify = vi.fn(async (_m: string) => undefined);
    const fails = (m: string) => createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, readSheet: async () => { throw new Error(m); } });
    expect((await fails("classeur illisible : zip").importFiles([file("casse.xlsx", PK)])).failed).toEqual(["casse.xlsx"]);
    await fails(EMPTY_SHEET_MESSAGE).importFiles([file("vide.xlsx", PK)]);
    expect(notify.mock.calls.map((c) => c[0])).toEqual(["Import impossible (casse.xlsx) : classeur illisible : zip", `vide.xlsx : ${EMPTY_SHEET_MESSAGE}`]);
  });

  it("F22 : plus de 100 Mo dans la coque (maxBytes nul) : refusé par le gestionnaire, rien lu", async () => {
    const readSheet = vi.fn(async (_b: Blob) => G);
    const notify = vi.fn(async (_m: string) => undefined);
    const big = { ...file("big.xlsx", PK), size: SHEET_MAX_BYTES + 1 };
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify, target: () => fakeTarget().target, readSheet }).importFiles([big]);
    expect(r.failed).toEqual(["big.xlsx"]);
    expect(readSheet).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith("big.xlsx : classeur trop gros pour un import en valeurs");
  });

  it("sans readSheet (amorce partielle, tests anciens) : .xlsx refusé comme avant", async () => {
    const r = await createImporter({ openDocument: vi.fn(async () => true), notify: vi.fn(async () => undefined), target: () => fakeTarget().target }).importFiles([file("v.xlsx", PK)]);
    expect(r.refused).toEqual(["v.xlsx"]);
  });
});
```

  Dans `apps/web/src/platform/container.contract.test.ts` : importer `hasSheetReader` de `./container` et `gridOf` de
  `./sheet-reader` ; à la fin :

```ts
describe.skipIf(binding === null)("contrat C10b : classeur (vrai module formats)", () => {
  it("SheetReader sur valeurs.xlsx (S4, F23, F24) : 64 × 6, source 70 × 6, valeurs en français, fusion ; octets corrompus : illisible", () => {
    const mod = need();
    if (!hasSheetReader(mod)) throw new Error("SheetReader absent du module formats");
    const bytes = new Uint8Array(fs.readFileSync(new URL("../../../../crates/roomboard-formats/tests/fixtures/valeurs.xlsx", import.meta.url)));
    const r = mod.SheetReader.open(bytes);
    try {
      const g = gridOf(r);
      expect([g.rows, g.cols, g.sourceRows, g.sourceCols, g.cutCells]).toEqual([64, 6, 70, 6, false]);
      expect(g.cells.slice(0, 6)).toEqual(["texte", "42", "3,5", "20/11/2026", "VRAI", "#DIV/0!"]);
      expect(g.merges).toEqual([{ row: 1, col: 0, rows: 1, cols: 2 }]);
    } finally {
      r.free();
    }
    expect(() => mod.SheetReader.open(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]))).toThrow("classeur illisible");
  });
});
```

- [ ] **Étape 3 : les voir rouges.** La commande bornée : `×` (modules absents).

- [ ] **Étape 4 : cible et module.** `apps/web/src/platform/image-import.ts` : `import type { Measure } from "../engine/text-layout";`
  et, dans `ImageTarget` (`:226`) après `stageRect()` :

```ts
  /** Mesure du texte de la session (C10b, F21) : hauteurs exigées d'un tableau importé ou collé. */
  measure(): Measure;
  /** Style de texte du moteur (couleur du stylo, taille par défaut) d'un tableau importé ou collé (F21). */
  textStyle(): { readonly color: string; readonly size: number };
```

  `apps/web/src/platform/container.ts`, après `FormatsBinding` :

```ts
/** Module `formats` avec la lecture des classeurs (C10b, F28) : servi seulement dans le Worker de `sheet-worker.ts`. */
export interface SheetFormatsBinding extends FormatsBinding {
  readonly SheetReader: { open(bytes: Uint8Array): SheetBinding };
}

/** Vrai si le module chargé expose `SheetReader` (module construit après C10b). */
export function hasSheetReader(m: FormatsBinding): m is SheetFormatsBinding {
  return typeof (m as Partial<SheetFormatsBinding>).SheetReader?.open === "function";
}
```

  (avec `import type { SheetBinding } from "./sheet-reader";` en tête). `apps/web/vite.config.ts` :

```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// vite-plugin-solid impose jsdom aux essais : on garde « node » par défaut, les essais de composants
// demandent happy-dom par leur première ligne `// @vitest-environment happy-dom`.
// C10b (DAB4) : le Worker des classeurs importe le module Wasm `formats` ; format ES exigé (même fichier `.wasm` émis).
export default defineConfig({ base: "./", plugins: [solid()], worker: { format: "es" }, test: { environment: "node" } });
```

- [ ] **Étape 5 : `table-insert.ts`.**

```ts
/**
 * Pose d'une grille dans l'onglet actif (C10b, F21, F22, DAB2) : collage HTML et classeur passent ici, un seul chemin
 * vers le cœur (`ImportTable`, une étape, F17). Colonnes à 240, lignes à la hauteur exigée par leur texte (au moins
 * 64, zones comprises, `rowHeightsFor`), texte de la couleur du stylo et de la taille par défaut ; matrice de
 * `placement` de l'import d'image (réduite, jamais agrandie, à 80 % du visible, centrée au point de dépôt ou au centre
 * de la vue, cascade, R4, R5). Messages : troncature à 64 × 64 (dimensions comptées sur la source), textes coupés.
 * Rien n'est sélectionné après.
 */
import type { TableData } from "../core/api";
import { TABLE_MAX_LINES } from "../core/api";
import { rowHeightsFor, TABLE_COL_WIDTH, TABLE_ROW_HEIGHT } from "../engine/table-geom";
import type { Measure } from "../engine/text-layout";
import type { Point } from "./files";
import type { TableGrid } from "./html-table";
import { anchorOf, placement, visibleOf, type ImageTarget } from "./image-import";

export const TABLE_TAB_CLOSED = "onglet fermé pendant l'import, tableau non inséré";
export const CUT_CELLS_MESSAGE = "texte coupé à 2 000 caractères dans certaines cellules";
export const truncatedMessage = (rows: number, cols: number): string =>
  `tableau limité à ${TABLE_MAX_LINES} lignes et ${TABLE_MAX_LINES} colonnes (le fichier en a ${rows} × ${cols})`;

/** Vue provisoire de la grille pour la mesure (ids `r<i>`, `c<j>`) ; textes vides et couverts écartés. */
export function gridTable(grid: TableGrid, size: number): TableData {
  const cols = Array.from({ length: grid.cols }, (_, j) => ({ id: `c${j}`, width: TABLE_COL_WIDTH }));
  const rows = Array.from({ length: grid.rows }, (_, i) => ({ id: `r${i}`, height: TABLE_ROW_HEIGHT }));
  const covered = new Set<number>();
  for (const m of grid.merges) {
    for (let i = m.row; i < m.row + m.rows; i++) {
      for (let j = m.col; j < m.col + m.cols; j++) if (i !== m.row || j !== m.col) covered.add(i * grid.cols + j);
    }
  }
  const cells = grid.cells.flatMap((text, k) =>
    text === "" || covered.has(k) ? [] : [{ row: `r${Math.floor(k / grid.cols)}`, col: `c${k % grid.cols}`, text, fill: null, shade: null }],
  );
  const merges = grid.merges.map((m) => ({ row: `r${m.row}`, col: `c${m.col}`, rows: m.rows, cols: m.cols }));
  return { color: "#000000", size, cols, rows, cells, merges };
}

/** Hauteurs exigées (F21) : `rowHeightsFor` à 240, au moins 64. */
export function gridRowHeights(grid: TableGrid, size: number, measure: Measure): number[] {
  const t = gridTable(grid, size);
  return rowHeightsFor(t, t.cols.map((c) => c.width), measure).map((h) => Math.max(TABLE_ROW_HEIGHT, h));
}

/** Pose `grid` dans la cible : une `ImportTable` ; `name` : fichier d'origine (classeur), absent pour un collage. */
export async function insertTableGrid(
  target: ImageTarget,
  grid: TableGrid,
  at: Point | null,
  index: number,
  notify: (m: string) => Promise<void>,
  name?: string,
): Promise<"inserted" | "failed"> {
  const prefix = name === undefined ? "" : `${name} : `;
  if (target.alive?.() === false) {
    await notify(`${prefix}${TABLE_TAB_CLOSED}`);
    return "failed";
  }
  const style = target.textStyle();
  const heights = gridRowHeights(grid, style.size, target.measure());
  const w = grid.cols * TABLE_COL_WIDTH;
  const h = heights.reduce((a, b) => a + b, 0);
  const rect = target.stageRect();
  const camera = target.camera();
  const change = target.run({
    type: "ImportTable",
    page: target.page(),
    matrix: placement(w, h, anchorOf(rect, camera, at), visibleOf(rect, camera), index),
    colWidth: TABLE_COL_WIDTH,
    rowHeights: heights,
    cols: grid.cols,
    cells: [...grid.cells],
    merges: grid.merges.map((m) => [m.row, m.col, m.rows, m.cols] as const),
    color: style.color,
    size: style.size,
  });
  if (change === null) return "failed";
  if (grid.sourceRows > grid.rows || grid.sourceCols > grid.cols) await notify(`${prefix}${truncatedMessage(grid.sourceRows, grid.sourceCols)}`);
  if (grid.cutCells) await notify(`${prefix}${CUT_CELLS_MESSAGE}`);
  return "inserted";
}
```

- [ ] **Étape 6 : `sheet-reader.ts` et `sheet-worker.ts`.**

```ts
/**
 * Lecture d'un classeur hors de l'instance qui enregistre (C10b, F28, DAB4) : un Worker jetable par lecture charge sa
 * propre instance du module `formats`, lit la première feuille (`SheetReader`), répond `{ grid }` ou `{ error }`, puis
 * est arrêté — après la réponse, l'erreur ou une panique Wasm (`onerror`). Un `panic` de `calamine` (`panic = abort` en
 * wasm32) ne casse donc jamais l'instance de la page qui enregistre le `.roomboard` (HR6). Le Worker est créé par
 * l'amorce (`main.ts`, PC20) : aucun test ne résout `sheet-worker.ts` ni `src/wasm-formats/`.
 */
import type { GridMerge, TableGrid } from "./html-table";

export const EMPTY_SHEET_MESSAGE = "la première feuille est vide";
export const SHEET_TOO_BIG_MESSAGE = "classeur trop gros pour un import en valeurs";
export const WORKER_FAILED_MESSAGE = "lecture du classeur interrompue";

/** Forme d'un Worker utile ici (le vrai `Worker` du navigateur, un faux dans les tests). */
export interface WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
}
export interface SheetReader {
  read(file: Blob): Promise<TableGrid>;
}
/** Forme du lecteur généré par wasm-bindgen (`SheetReader` de `roomboard-formats-wasm`, T3). */
export interface SheetBinding {
  rows(): number;
  cols(): number;
  cells(): string[];
  merges(): Uint32Array;
  source_rows(): number;
  source_cols(): number;
  cut_cells(): boolean;
  free(): void;
}

/** Grille d'un lecteur ouvert ; fusions bout à bout en quadruplets `[ligne, colonne, lignes, colonnes]`. */
export function gridOf(r: SheetBinding): TableGrid {
  const flat = Array.from(r.merges());
  const merges: GridMerge[] = [];
  for (let i = 0; i + 3 < flat.length; i += 4) {
    merges.push({ row: flat[i] ?? 0, col: flat[i + 1] ?? 0, rows: flat[i + 2] ?? 1, cols: flat[i + 3] ?? 1 });
  }
  return { rows: r.rows(), cols: r.cols(), cells: r.cells(), merges, sourceRows: r.source_rows(), sourceCols: r.source_cols(), cutCells: r.cut_cells() };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Réponse du Worker contrôlée (même prudence que `toTable`). */
export function isTableGrid(v: unknown): v is TableGrid {
  if (typeof v !== "object" || v === null) return false;
  const g = v as Record<string, unknown>;
  const cells = g["cells"];
  const merges = g["merges"];
  return (
    isCount(g["rows"]) && isCount(g["cols"]) && Array.isArray(cells) && cells.length === g["rows"] * g["cols"] &&
    cells.every((c) => typeof c === "string") && Array.isArray(merges) &&
    merges.every((m) => typeof m === "object" && m !== null && ["row", "col", "rows", "cols"].every((k) => isCount((m as Record<string, unknown>)[k]))) &&
    isCount(g["sourceRows"]) && isCount(g["sourceCols"]) && typeof g["cutCells"] === "boolean"
  );
}

export function createSheetReader(spawn: () => WorkerLike): SheetReader {
  return {
    async read(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const worker = spawn();
      try {
        return await new Promise<TableGrid>((resolve, reject) => {
          worker.onmessage = (e) => {
            const d = e.data;
            const g = typeof d === "object" && d !== null ? (d as { grid?: unknown }).grid : undefined;
            const err = typeof d === "object" && d !== null ? (d as { error?: unknown }).error : undefined;
            if (isTableGrid(g)) resolve(g);
            else reject(new Error(typeof err === "string" ? err : WORKER_FAILED_MESSAGE));
          };
          worker.onerror = () => reject(new Error(WORKER_FAILED_MESSAGE));
          worker.postMessage({ bytes }, [bytes.buffer]);
        });
      } finally {
        worker.terminate();
      }
    },
  };
}
```

```ts
/**
 * Entrée du Worker de lecture d'un classeur (C10b, F28, DAB4) : sa propre instance du module `formats`, la première
 * feuille, une réponse `{ grid }` ou `{ error }`. Créé par `main.ts`, arrêté par `sheet-reader.ts` après la réponse.
 */
import { hasSheetReader } from "./container";
import { loadFormatsModule } from "./container-load";
import { gridOf } from "./sheet-reader";

self.onmessage = async (e: MessageEvent<{ readonly bytes: Uint8Array }>): Promise<void> => {
  try {
    const mod = await loadFormatsModule();
    if (!hasSheetReader(mod)) throw new Error("module des classeurs indisponible");
    const reader = mod.SheetReader.open(e.data.bytes);
    try {
      self.postMessage({ grid: gridOf(reader) });
    } finally {
      reader.free();
    }
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
```

- [ ] **Étape 7 : gestionnaire `sheet`.** `apps/web/src/platform/import.ts` : en-tête, ajouter
  ` * C10b (F28) : \`sheet\` (objet, \`.xlsx\`/\`.xlsm\` et en-tête ZIP) lit la première feuille dans un Worker jetable et pose un tableau.` ;
  imports `import type { TableGrid } from "./html-table";`,
  `import { EMPTY_SHEET_MESSAGE, SHEET_TOO_BIG_MESSAGE } from "./sheet-reader";`,
  `import { insertTableGrid } from "./table-insert";` ; dans `ImportDeps`, après `decode` :

```ts
  /** Lecture d'un classeur dans un Worker jetable (C10b, F28) ; absente : `.xlsx` refusé comme avant. */
  readSheet?(file: Blob): Promise<TableGrid>;
```

  Avant `const EMPTY` :

```ts
/** Plafond d'un classeur (F22), aussi dans la coque où `maxBytes` est nul. */
export const SHEET_MAX_BYTES = 100 * 1024 * 1024;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export function isSheetName(name: string): boolean {
  const n = name.toLowerCase();
  return (n.endsWith(".xlsx") || n.endsWith(".xlsm")) && n.length > 5;
}

/** Entrée `sheet` du registre (F28) : nom `.xlsx` / `.xlsm` et en-tête ZIP ; une `ImportTable` dans l'onglet actif. */
export function sheetHandler(deps: { readSheet(file: Blob): Promise<TableGrid> }): ImportHandler {
  return {
    id: "sheet",
    nature: "objet",
    detect: (head, name) => isSheetName(name) && ZIP_MAGIC.every((b, i) => head[i] === b),
    async run(f, ctx) {
      const target = ctx.target;
      if (target === null) return "failed";
      if (f.size > SHEET_MAX_BYTES) {
        await ctx.notify(`${f.name} : ${SHEET_TOO_BIG_MESSAGE}`);
        return "failed";
      }
      let grid: TableGrid;
      try {
        grid = await deps.readSheet(ctx.blob);
      } catch (e) {
        const m = messageOf(e);
        await ctx.notify(m === EMPTY_SHEET_MESSAGE || m === SHEET_TOO_BIG_MESSAGE ? `${f.name} : ${m}` : `Import impossible (${f.name}) : ${m}`);
        return "failed";
      }
      return insertTableGrid(target, grid, ctx.at, ctx.inserted, ctx.notify, f.name);
    },
  };
}
```

  Et le registre de `createImporter` :

```ts
  const readSheet = deps.readSheet;
  const registry: readonly ImportHandler[] = [
    roomboardHandler(deps),
    imageHandler(deps.decode ? { decode: deps.decode } : {}),
    ...(readSheet ? [sheetHandler({ readSheet })] : []),
  ];
```

- [ ] **Étape 8 : vert.** La commande bornée.

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && git add apps/web/src/platform/table-insert.ts && git add apps/web/src/platform/table-insert.test.ts && \
git add apps/web/src/platform/sheet-reader.ts && git add apps/web/src/platform/sheet-reader.test.ts && \
git add apps/web/src/platform/sheet-worker.ts && git add apps/web/src/platform/import.ts && git add apps/web/src/platform/import.test.ts && \
git add apps/web/src/platform/image-import.ts && git add apps/web/src/platform/container.ts && \
git add apps/web/src/platform/container.contract.test.ts && git add apps/web/vite.config.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): place imported table grids, read xlsx in a disposable worker" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, sortie `tsc`, décompte du module `formats` du build, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t11"></a>

### Tâche T11 — Branchement : quatre boutons, attributs `#stage`, collage et classeur vers l'onglet actif

**Objectif.** Les quatre actions de la rangée du tableau (F15) : `table-merge` « Fusionner », `table-split` « Diviser »,
`table-shade` « Ombrer », `table-unshade` « Retirer l'ombrage », grisées par `ACTION_STATE` (PC21), hors du catalogue de
l'éditeur de profil comme les cinq de C10a. `#stage[data-table]` gagne la plage (`…@<r>,<c>-<r2>,<c2>`), et deux
attributs neufs `data-table-merges` / `data-table-shades` (F29). L'espace de travail branche la cible d'import (mesure de
la session, style du moteur), `pasteTable(html)` (8 Mio au plus, F19 ; PC9) et le lecteur de classeur ; `main.ts` fait
passer le tableau HTML avant les images jointes (effet de bord) et crée le Worker des classeurs (PC20).

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts:115-130`, `apps/web/src/toolbar.test.ts:313-315`
- Modifier : `apps/web/src/ui/item-state.ts:28-32`, `apps/web/src/ui/item-state.test.ts` (bloc neuf),
  `apps/web/src/ui/Toolbar.test.tsx:223` (PC23)
- Modifier : `apps/web/src/app/toolbar-host.ts:41-45`, `apps/web/src/app/toolbar-host.test.ts` (test neuf)
- Modifier : `apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts`
- Modifier : `apps/web/src/app/board-session.ts:61-82` (`BoardSession.measure`), `:264-271` (deux attributs), objet rendu
- Modifier : `apps/web/src/app/workspace.ts:37-74` (`WorkspaceDeps`, `Workspace`), `:213-220` (`imageTarget`),
  `:271-281` (`createImporter`), objet `ws` ; `apps/web/src/app/workspace.test.ts` (`fakeSession`, `setupWorkspace`, bloc neuf)
- Modifier : `apps/web/src/main.ts:15-19` (imports), appel de `createWorkspace`, `:108-116` (écoute `paste`)

**Interfaces.**
- Consomme : (T5) `pastedTableHtml`, `tableFromHtml`, `PASTE_MAX_CHARS`, `PASTE_TOO_BIG`, `TableGrid` ; (T6)
  `TableAction` (quatre neuves), `TableCellState.{range, merged, shaded}`, `EngineState.{tableMerges, tableShades}`,
  `Engine.textStyle()` ; (T8) l'outil qui publie l'état ; (T10) `insertTableGrid`, `createSheetReader`, `WorkerLike`,
  `ImageTarget.{measure, textStyle}`, `ImportDeps.readSheet`.
- Produit (lu par T12) : boutons `button[data-table-action="table-merge|table-split|table-shade|table-unshade"]` ;
  `#stage[data-table]` (`4x3@0,0-0,1` avec une plage), `#stage[data-table-merges]`, `#stage[data-table-shades]` ;
  `Workspace.pasteTable(html: string): Promise<boolean>` ; `BoardSession.measure: Measure` ;
  `WorkspaceDeps.readSheet?(file: Blob): Promise<TableGrid>`, `WorkspaceDeps.parseHtml?(html: string): Document`.
- Réutilise : `apps/web/src/toolbar.ts:115-130` ; `ui/item-state.ts:28` ; `app/toolbar-host.ts:41` ; `ui/Toolbar.tsx:111`
  — `ACTION_TABLE`, `TABLE_ACTIONS`, `ACTION_STATE`, `ACTIONS` étendus ; `TableActionRow` les montre sans code ; aucune
  lecture de préréglages ajoutée (constat `toolbar-host.ts:45` / `toolbar.ts:634` laissé ouvert, non aggravé).
- Réutilise : `apps/web/src/app/stage-tags.ts:12-22` — `stageTags(s)` : `table` (plage), clés `tableMerges`, `tableShades`.
- Réutilise : `apps/web/src/app/workspace.ts:60-74` (`Workspace`, seul `importFiles`) — `Workspace.pasteTable(html)` :
  `tableFromHtml` puis `insertTableGrid` sur `imageTarget(onglet actif)`.
- Réutilise : `apps/web/src/app/board-session.ts:51` (`SessionShared.measure`) ; `engine.ts` (`textStyle`, exposée par
  T6) — `measure` lue sur la session par `imageTarget`, `textStyle` lue sur le moteur.
- Réutilise : `apps/web/src/platform/paste.ts:12` (`isEditable`), `:20` (`pastedFiles`) ; `main.ts:108` —
  `pastedTableHtml` essayée d'abord par l'écoute `paste` de `main.ts`, `pastedFiles` ensuite.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/ui src/app src/profile-edit.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Test Files|Tests " | grep -E "C10b|×|FAIL|Test Files|Tests " | tail -40 && \
pnpm --filter @roomboard/web test 2>&1 | grep -E "Test Files|Tests |FAIL" | tail -5 && \
pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep -c "error TS"
```

Attendu : aucune ligne `×` ni `FAIL` ; 2 `✓ … actions du tableau (C10b)` (toolbar, hôte), 4 `✓ état des actions du
tableau (C10b, F15) > …`, 2 `✓ stageTags (C10b, F29) > …`, 4 `✓ espace de travail : tableau collé et classeur (C10b) > …`
dont « pasteTable : HTML de plus de 8 Mio refusé » (Review Focus 3) ; la suite web entière sans échec (tests à garder
verts : `toolbar-host.test.ts` « chaque action d'ACTION_TABLE a son entrée dans ACTIONS », `profile-edit.test.ts`,
`board-session.test.ts`, `tools/text.test.ts`, `workspace.test.ts`) ; `tsc` : `0` (tous les écarts nommés sont fermés).

**Contraintes (recopiées).**
- GC2 TDD : test rouge d'abord, vu rouge, puis le code. Aucun test sauté ni désactivé (`skip`, `only`, `todo`,
  `#[ignore]`), aucun seuil ni délai relevé ; un test qui échoue sur un délai est rejoué une fois avant d'être jugé.
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && mkdir -p apps/web/src/wasm apps/web/src/wasm-formats && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm/*.d.ts apps/web/src/wasm/ && cp -n /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/apps/web/src/wasm-formats/*.d.ts apps/web/src/wasm-formats/`
  ; si `tsc` signale `SheetReader` absent du module `formats` (types d'avant T3), reconstruire ses types :
  `([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .) && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`
  (jamais commité).
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite N et les noms vus.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; jamais AGPL, GPL ni LGPL.
- GC12 Dans `apps/web/src/ui/`, aucun `switch`, aucune taille en `px` dans un `.tsx`, libellés en français, aucune
  icône seule ; aucun style neuf dans `rb.css`.
- GC13 `tsc` vide (aucun écart permis après cette tâche).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC17 Aucun processus laissé en marche.
- GC18 Périmètre : seuls les fichiers ci-dessus.

**Interdits.** Ne pas toucher `ui/Toolbar.tsx`, `profile-edit.ts`, `rb.css` ; aucun `innerHTML` ; le Worker n'est créé
qu'ici (`main.ts`).

**Critère « terminé ».** Commande bornée verte, `tsc` à 0, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : tests rouges.**
  - `apps/web/src/toolbar.test.ts:313-315`, remplacer par :

```ts
  it("ACTION_TABLE porte les neuf actions ; TABLE_ACTIONS dans l'ordre de la rangée (T10 de C10a, F15 : actions du tableau (C10b))", () => {
    expect(TABLE_ACTIONS).toEqual(["table-row-insert", "table-col-insert", "table-row-remove", "table-col-remove", "table-uniform", "table-merge", "table-split", "table-shade", "table-unshade"]);
    expect(TABLE_ACTIONS.map((a) => ACTION_TABLE[a]?.label)).toEqual(["+ Ligne", "+ Colonne", "− Ligne", "− Colonne", "Uniformiser", "Fusionner", "Diviser", "Ombrer", "Retirer l'ombrage"]);
```

  - `apps/web/src/ui/Toolbar.test.tsx:223` : la liste attendue gagne `"table-merge", "table-split", "table-shade", "table-unshade"` à la fin.
  - `apps/web/src/ui/item-state.test.ts`, à la fin :

```ts
describe("état des actions du tableau (C10b, F15)", () => {
  const cell = (o: Partial<TableCellState> = {}): TableCellState => ({ id: "t", row: 0, col: 0, rows: 3, cols: 4, ...o });
  it("Fusionner : plage d'au moins deux cellules ; sans plage : grisé", () => {
    expect(itemState(action("table-merge"), view({ tableCell: cell() })).disabled).toBe(true);
    expect(itemState(action("table-merge"), view({ tableCell: cell({ range: { r0: 0, c0: 0, r1: 0, c1: 1 } }) })).disabled).toBe(false);
  });
  it("Diviser : cellule active fusionnée, sans plage", () => {
    expect(itemState(action("table-split"), view({ tableCell: cell({ merged: true }) })).disabled).toBe(false);
    expect(itemState(action("table-split"), view({ tableCell: cell({ merged: true, range: { r0: 0, c0: 0, r1: 1, c1: 1 } }) })).disabled).toBe(true);
    expect(itemState(action("table-split"), view({ tableCell: cell() })).disabled).toBe(true);
  });
  it("Ombrer : une cellule active (PC21)", () => {
    expect(itemState(action("table-shade"), view({ tableCell: cell() })).disabled).toBe(false);
    expect(itemState(action("table-shade"), view({ tableCell: null })).disabled).toBe(true);
  });
  it("Retirer l'ombrage : au moins une cellule ombrée dans la plage (ou l'active)", () => {
    expect(itemState(action("table-unshade"), view({ tableCell: cell({ shaded: true }) })).disabled).toBe(false);
    expect(itemState(action("table-unshade"), view({ tableCell: cell({ shaded: false }) })).disabled).toBe(true);
  });
});
```

    (importer `type TableCellState` de `../engine/table-geom` si le fichier ne l'importe pas déjà.)
  - `apps/web/src/app/toolbar-host.test.ts`, dans `describe("ToolbarHost local", …)` :

```ts
  it("actions du tableau (C10b) : Fusionner, Diviser, Ombrer, Retirer l'ombrage → engine.tableAction", () => {
    const { host, engine } = setup();
    for (const id of ["table-merge", "table-split", "table-shade", "table-unshade"]) host.runAction(id);
    expect(engine.tableAction.mock.calls.map((c) => c[0])).toEqual(["merge", "split", "shade", "unshade"]);
  });
```

  - `apps/web/src/app/stage-tags.test.ts` : `base` gagne `tableMerges: 0, tableShades: 0` ; à la fin :

```ts
describe("stageTags (C10b, F29)", () => {
  it("table : avec une plage, `<c>x<l>@<r>,<c>-<r2>,<c2>` ; sans plage, forme de C10a", () => {
    const cell = { id: "t", row: 0, col: 0, rows: 3, cols: 4 };
    expect(stageTags({ ...base, tableCell: { ...cell, range: { r0: 0, c0: 0, r1: 0, c1: 1 } } }).table).toBe("4x3@0,0-0,1");
    expect(stageTags({ ...base, tableCell: { ...cell, range: null } }).table).toBe("4x3@0,0");
  });
  it("tableMerges, tableShades : comptes de la page montrée en texte", () => {
    const t = stageTags({ ...base, tableMerges: 2, tableShades: 3 });
    expect([t.tableMerges, t.tableShades]).toEqual(["2", "3"]);
  });
});
```

  - `apps/web/src/app/workspace.test.ts` : dans `fakeSession`, l'objet `board` gagne `measure: (s: string) => s.length * 10,`
    et `engine` gagne `textStyle: () => ({ color: "#1d4ed8", size: 36 }),` ; `SetupOptions` gagne
    `readonly readSheet?: WorkspaceDeps["readSheet"];` et `setupWorkspace` passe `...(o.readSheet ? { readSheet: o.readSheet } : {}),`.
    À la fin :

```ts
describe("espace de travail : tableau collé et classeur (C10b)", () => {
  const tables = (ws: Workspace) => {
    const d = ws.active().board.doc;
    return d.elementIds(d.pageIds()[0] ?? "").map((id) => d.element(id)).filter((e) => e?.kind === "table");
  };

  it("pasteTable : tableau HTML collé dans l'onglet actif ; une ImportTable ; couleur du stylo (S2, F21)", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable('<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>')).toBe(true);
    const t = tables(ws);
    expect(t).toHaveLength(1);
    const v = t[0];
    if (v?.kind !== "table") throw new Error("tableau");
    expect([v.table.color, v.table.merges.length, v.table.cells.map((c) => c.text)]).toEqual(["#1d4ed8", 1, ["Titre", "a", "b"]]);
    expect(shell.notify).not.toHaveBeenCalled();
  });

  it("pasteTable : HTML de plus de 8 Mio refusé avec « tableau trop gros pour être collé » ; rien d'inséré", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable(`<table><tr><td>${"x".repeat(PASTE_MAX_CHARS)}</td></tr></table>`)).toBe(true);
    expect(shell.notify).toHaveBeenCalledWith(PASTE_TOO_BIG);
    expect(tables(ws)).toHaveLength(0);
  });

  it("pasteTable : HTML sans tableau lisible : false (main.ts colle alors les images, PC9)", async () => {
    const ws = await setupWorkspace();
    expect(await ws.pasteTable("<table></table><p>rien</p>")).toBe(false);
    expect(tables(ws)).toHaveLength(0);
  });

  it("S4 : .xlsx importé par le lecteur de classeur : un tableau dans l'onglet actif, message de troncature", async () => {
    const grid = { rows: 64, cols: 6, cells: new Array<string>(384).fill("v"), merges: [{ row: 1, col: 0, rows: 1, cols: 2 }], sourceRows: 70, sourceCols: 6, cutCells: false };
    const ws = await setupWorkspace({ readSheet: async () => grid });
    const bytes = new Uint8Array([0x50, 0x4b, 3, 4, 9]);
    const r = await ws.importFiles([{ name: "valeurs.xlsx", size: bytes.length, mime: "", head: async (n: number) => bytes.slice(0, n), blob: async () => new Blob([bytes]) }], null);
    expect(r.inserted).toEqual(["valeurs.xlsx"]);
    expect(tables(ws)).toHaveLength(1);
    expect(shell.notify).toHaveBeenCalledWith("valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)");
  });
});
```

    (importer `PASTE_MAX_CHARS`, `PASTE_TOO_BIG` de `../platform/html-table` et `type Workspace` de `./workspace` s'ils manquent.)

- [ ] **Étape 3 : les voir rouges.** La commande bornée : `×` sur les blocs C10b.

- [ ] **Étape 4 : barre.** `apps/web/src/toolbar.ts`, après `"table-uniform": { label: "Uniformiser" },` :

```ts
  "table-merge": { label: "Fusionner" },
  "table-split": { label: "Diviser" },
  "table-shade": { label: "Ombrer" },
  "table-unshade": { label: "Retirer l'ombrage" },
```

  et `TABLE_ACTIONS` (commentaire : `/** Boutons de structure du tableau (C10a, DAC4 ; C10b, F15), dans l'ordre de la rangée contextuelle. */`) :

```ts
export const TABLE_ACTIONS: readonly ActionId[] = Object.freeze([
  "table-row-insert",
  "table-col-insert",
  "table-row-remove",
  "table-col-remove",
  "table-uniform",
  "table-merge",
  "table-split",
  "table-shade",
  "table-unshade",
]);
```

  `apps/web/src/ui/item-state.ts`, avant `ACTION_STATE` : `const cells = (r: Range | null | undefined): number => (r ? (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1) : 0);`
  (importer `type Range` de `../engine/table-geom` avec `TableCellState`), puis dans `ACTION_STATE` après `"table-uniform"` :

```ts
  "table-merge": (v) => ({ disabled: cells(v.tableCell?.range) < 2 }),
  "table-split": (v) => ({ disabled: v.tableCell?.merged !== true || cells(v.tableCell.range) > 0 }),
  "table-shade": (v) => ({ disabled: !v.tableCell }),
  "table-unshade": (v) => ({ disabled: v.tableCell?.shaded !== true }),
```

  `apps/web/src/app/toolbar-host.ts`, dans `ACTIONS` après `"table-uniform"` :

```ts
  "table-merge": (t) => t.engine().tableAction("merge"),
  "table-split": (t) => t.engine().tableAction("split"),
  "table-shade": (t) => t.engine().tableAction("shade"),
  "table-unshade": (t) => t.engine().tableAction("unshade"),
```

- [ ] **Étape 5 : attributs.** `apps/web/src/app/stage-tags.ts` :

```ts
/**
 * Attributs de `#stage` lus par les scénarios S3/S4 (contrat du lot 4), déplacés de l'ancienne barre DOM (retirée par
 * T95) sans changement ; C10a (`table`) ; C10b (F29) : plage dans `table`, `tableMerges`, `tableShades`.
 */
import type { Bounds } from "../core/api";
import type { EngineState } from "../engine/engine";
import type { TableCellState } from "../engine/table-geom";

const tenth = (v: number): string => String(Math.round(v * 10) / 10);
const boundsTag = (b: Bounds | null): string => (b === null ? "" : [b.x0, b.y0, b.x1, b.y1].map(tenth).join(","));

/** `#stage[data-table]` (C10a, T15 ; C10b, F29) : `<colonnes>x<lignes>@<rang>,<colonne>` de la cellule active, ou
 *  `…@<r>,<c>-<r2>,<c2>` d'une plage ; vide sans cellule. */
const tableTag = (c: TableCellState | null): string => {
  if (c === null) return "";
  const r = c.range ?? null;
  return r === null ? `${c.cols}x${c.rows}@${c.row},${c.col}` : `${c.cols}x${c.rows}@${r.r0},${r.c0}-${r.r1},${r.c1}`;
};

/** Attributs de `#stage` lus par les scénarios S3/S4, S1 de C10a (`table`) et S1 à S4 de C10b (`tableMerges`, `tableShades`). */
export function stageTags(s: EngineState): Record<"page" | "selection" | "bounds" | "tool" | "table" | "tableMerges" | "tableShades", string> {
  return {
    page: `${s.pageIndex + 1}/${s.pageCount}`,
    selection: String(s.selection.length),
    bounds: boundsTag(s.selectionBounds),
    tool: s.tool,
    table: tableTag(s.tableCell),
    tableMerges: String(s.tableMerges),
    tableShades: String(s.tableShades),
  };
}
```

  `apps/web/src/app/board-session.ts` : `BoardSession` gagne `/** Mesure du texte partagée (CL4-4), lue par la cible d'import des tableaux (C10b, F21). */ readonly measure: Measure;` ;
  l'objet rendu gagne `measure,` (après `trail,`) ; après `stage.dataset["table"] = tags.table;` :

```ts
    stage.dataset["tableMerges"] = tags.tableMerges;
    stage.dataset["tableShades"] = tags.tableShades;
```

- [ ] **Étape 6 : espace de travail.** `apps/web/src/app/workspace.ts` : imports
  `import { PASTE_MAX_CHARS, PASTE_TOO_BIG, tableFromHtml, type TableGrid } from "../platform/html-table";` et
  `import { insertTableGrid } from "../platform/table-insert";` ; `WorkspaceDeps`, après `decode` :

```ts
  /** Lecture d'un classeur dans un Worker jetable (C10b, F28) : `createSheetReader` dans l'amorce ; absent : `.xlsx` refusé. */
  readSheet?(file: Blob): Promise<TableGrid>;
  /** Lecture du HTML collé en document inerte (tests) ; défaut : `DOMParser` « text/html ». */
  parseHtml?(html: string): Document;
```

  `Workspace`, après `importFiles` :

```ts
  /** Tableau HTML collé (C10b, F19) dans l'onglet actif, centre de la vue ; vrai si le collage est pris (tableau posé
   *  ou refusé pour sa taille), faux sans tableau lisible (PC9). */
  pasteTable(html: string): Promise<boolean>;
```

  `imageTarget`, après `stageRect` :

```ts
    measure: () => t.board.measure,
    textStyle: () => t.board.engine.textStyle(),
```

  `createImporter({ … })` gagne `...(deps.readSheet ? { readSheet: (b: Blob) => deps.readSheet!(b) } : {}),` (écrire
  `const readSheet = deps.readSheet;` avant et `...(readSheet ? { readSheet } : {})` pour éviter `!`) ; juste avant
  `const ws: Workspace` : `const parseHtml = deps.parseHtml ?? ((s: string) => new DOMParser().parseFromString(s, "text/html"));` ;
  dans `ws`, après `importFiles` :

```ts
    async pasteTable(html) {
      const t = tabs.active()?.session;
      if (t === undefined) return false;
      if (html.length > PASTE_MAX_CHARS) {
        await say(PASTE_TOO_BIG);
        return true;
      }
      const grid = tableFromHtml(html, parseHtml);
      if (grid === null) return false;
      await insertTableGrid(imageTarget(t), grid, null, 0, say);
      return true;
    },
```

- [ ] **Étape 7 : amorce.** `apps/web/src/main.ts` : remplacer `import { pastedFiles } from "./platform/paste";` par
  `import { pastedFiles, pastedTableHtml } from "./platform/paste";` et ajouter
  `import { createSheetReader, type WorkerLike } from "./platform/sheet-reader";`. Avant `const workspace = await createWorkspace({` :

```ts
  // Classeurs (C10b, F28, DAB4) : un Worker jetable par lecture, avec sa propre instance du module `formats`.
  const spawnSheetWorker = (): WorkerLike => {
    const w = new Worker(new URL("./platform/sheet-worker.ts", import.meta.url), { type: "module" });
    const like: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage: (m, transfer) => w.postMessage(m, transfer),
      terminate: () => w.terminate(),
    };
    w.onmessage = (e) => like.onmessage?.(e);
    w.onerror = (e) => like.onerror?.(e);
    return like;
  };
  const sheets = createSheetReader(spawnSheetWorker);
```

  Dans l'objet passé à `createWorkspace`, après `codec: …,` : `readSheet: (b) => sheets.read(b),`. Remplacer l'écoute
  `paste` (`:108-116`) :

```ts
  // Collage (R19, C10b) : un tableau HTML passe avant les images jointes (F19, HB-9) ; sinon fichiers image vers l'onglet
  // actif, centre de la vue ; zone de texte : collage normal.
  window.addEventListener("paste", (e) => {
    const html = pastedTableHtml(e);
    const files = pastedFiles(e);
    const fail = (err: unknown): void => {
      console.warn(`RoomBoard : collage abandonné (${err instanceof Error ? err.message : String(err)})`);
    };
    if (html !== null) {
      e.preventDefault();
      void workspace
        .pasteTable(html)
        .then(async (done) => {
          if (!done && files.length > 0) await workspace.importFiles(files, null);
        })
        .catch(fail);
      return;
    }
    if (files.length === 0) return;
    e.preventDefault();
    void workspace.importFiles(files, null).catch(fail);
  });
```

- [ ] **Étape 8 : vert.** La commande bornée (`tsc` : `0`).

- [ ] **Étape 9 : commit.**

```bash
cd "$WT" && for f in apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/ui/item-state.ts apps/web/src/ui/item-state.test.ts \
  apps/web/src/ui/Toolbar.test.tsx apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/app/stage-tags.ts \
  apps/web/src/app/stage-tags.test.ts apps/web/src/app/board-session.ts apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts \
  apps/web/src/main.ts; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): table merge and shade buttons, stage tags, pasted tables and xlsx import wiring" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : N, noms vus, `tsc` à 0, une ligne `Réutilisation :` par ligne `Réutilise :`.

<a id="tache-t12"></a>

### Tâche T12 — Essai navigateur C10b dans `verifier.sh --e2e`, capture fusion + ombrage

**Objectif.** Preuve de bout en bout (F31) : nouvel essai `scripts/essais/c10b-tableau-navigateur.mjs` (patron de
`c10a-tableau-navigateur.mjs`) qui joue S1 (créer un 4 × 3, « Lundi », Échap, glisser, « Fusionner », glisser la troisième
colonne, « Ombrer », outil Sélection : toucher révèle, Ctrl+Z remet, toucher encore), S2 (coller un `<table>` HTML porté
par un `ClipboardEvent` avec un script et une image piégés), S3 (Ctrl+S, Ctrl+O, relire la zone et le tableau collé ;
PC6) et S4 (déposer `valeurs.xlsx`, lire quatre valeurs, deux `casse.xlsx`, enregistrer après l'échec, Ctrl+Z) ; ajouté
au bloc `--e2e` de `verifier.sh` et à `verifier-e2e.test.sh`. `coqueCsp()` passe dans `commun.mjs`, importée par les
quatre essais qui l'avaient en copie (constat fermé) ; `dropFile` gagne un point de dépôt facultatif (PC24). Capture
`docs/essais/c10b-tableau-fusion-ombrage.png` (avec `--captures` seulement). La suite complète tourne : tailles des deux
modules relevées sous leurs plafonds, `tsc` vide.

**Fichiers.**
- Créer : `scripts/essais/c10b-tableau-navigateur.mjs`, `docs/essais/c10b-tableau-fusion-ombrage.png`
- Modifier : `scripts/essais/commun.mjs` (`coqueCsp` exportée, `dropFile` avec `at`), `scripts/essais/c10a-tableau-navigateur.mjs:27-32`,
  `scripts/essais/c2-image-navigateur.mjs:25-30`, `scripts/essais/c9-grille-navigateur.mjs:19-24`,
  `scripts/essais/fichiers-navigateur.mjs:25-30` (copie locale retirée, import ajouté)
- Modifier : `scripts/verifier.sh:90-102` (une ligne), `scripts/tests/verifier-e2e.test.sh:13` (un nom)

**Interfaces.**
- Consomme : tout le chantier fusionné (T1 à T11) ; attributs `#stage[data-table|data-table-merges|data-table-shades|data-selection|data-elements|data-bounds|data-camera]`,
  boutons `button[data-table-action="table-merge|table-shade"]`, `button[data-item="table|select"]`, grille de choix
  (`.rb-table-picker`, `button[aria-label="4 colonnes, 3 lignes"]`), `#texte-edition`, fixture `valeurs.xlsx`.
- Produit : `export function coqueCsp(): string` et `dropFile(page, selector, name, bytes, type = "", at = [50, 50])` dans
  `commun.mjs` ; ligne « C10b tableau : OK ».
- Réutilise : `scripts/essais/commun.mjs` (`serve`, `loadPlaywright`, `stageMouse`, `stageBox`, `dropFile`, `item`,
  `TAB`, `VIEWPORT`, `Echec`, `frames`, `gitSha`) ; `c10a-tableau-navigateur.mjs:27` (`coqueCsp`) — appelés tels quels ;
  `coqueCsp` déplacée dans `commun.mjs` et importée par les quatre essais.

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
bash scripts/verifier.sh --e2e 2>&1 | tail -70
```

Attendu : lignes `ok — S1 : …` à `ok — S4 : …` de l'essai C10b, puis « C10b tableau : OK », « C10a tableau : OK »,
« C2 image : OK », les autres essais `: OK`, « verifier.sh : e2e OK », « verifier.sh : OK » ; `module Wasm : N octets`
avec N ≤ 1 572 864 et `module formats : M octets` avec M ≤ 3 145 728 (les deux cités au rapport, avec leur valeur sur
`main` : 953 883 o et 385 454 o d'après F26). Tests à garder verts (effets de bord) : `c10a-tableau-navigateur.mjs`
(saisie au relâché), `s34-navigateur.mjs` (Sélection), `c2-image-navigateur.mjs` (collage d'une image seule), les quatre
essais qui importent `coqueCsp`. En cas d'échec, `node scripts/essais/c10b-tableau-navigateur.mjs` seul (même sortie
`ok — …`) ; un essai qui échoue sur un délai est rejoué une fois.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : dans la sortie, `data-table="4x3@0,0-0,1"`,
`data-table-merges="1"`, `data-table-shades="3"` puis `"2"`, `"3"`, `"2"`, `data-selection="0"`, valeurs « 3,5 »,
« 20/11/2026 », « VRAI », « #DIV/0! ». Puis la capture :
`node scripts/essais/c10b-tableau-navigateur.mjs --captures` (après `verifier.sh`, `apps/web/dist` construit), à décrire au
rapport : un tableau 4 × 3 dont la première ligne porte « Lundi » sur deux colonnes sans trait intérieur, et la troisième
colonne grise hachurée sur ses trois lignes, traits noirs par-dessus.

**Contraintes (recopiées).**
- GC1 `scripts/verifier.sh --e2e` n'est lancé que dans cette tâche.
- GC2 TDD : l'essai est d'abord lancé seul et vu en échec (`node scripts/essais/c10b-tableau-navigateur.mjs` avant
  l'ajout des lignes de `verifier.sh` : il doit passer ; `bash scripts/tests/verifier-e2e.test.sh` vu en échec avant
  l'ajout de la ligne dans `verifier.sh`). Aucun test sauté ni désactivé, aucun délai relevé (les attentes restent à
  15 s) ; un essai qui échoue sur un délai est rejoué une fois (VM chargée).
- GC3 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande. Aucun build Tauri, aucun build Android.
- GC4 Préparation : `cd "$WT" && ([ -d node_modules ] || pnpm install --frozen-lockfile) && ([ -d target ] || cp -r /home/adminjd/projets/roomboard-wt/usage-c10b-tableau/target .)`
  (`verifier.sh` reconstruit les deux modules Wasm et `apps/web/dist`, jamais commités).
- GC5 Preuve bornée : la commande ci-dessus, telle quelle ; le rapport cite les lignes `OK` et les deux tailles.
- GC6 Commits : `git add <chemin>` un par un, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message
  anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; ne pas pousser.
- GC7 Jamais `git add -A`, `git add --all`, `git add .`, `git commit -a`, `--force`, ni `git stash` nu.
- GC8 Aucune dépendance nouvelle ; `node scripts/controle-licences.mjs` (joué par `verifier.sh`) passe.
- GC9 Plafonds du module principal (1 572 864 o, H2-13) et du module `formats` (3 Mio) ni baissés ni relevés : les
  contrôles de `verifier.sh:53-71` ne changent pas.
- GC13 `tsc` vide (joué par `pnpm --filter @roomboard/web build` dans `verifier.sh`).
- GC14 Rapport : une ligne `Réutilisation :` par ligne `Réutilise :` ci-dessus.
- GC16 Aucun `.xlsx` téléchargé : l'essai dépose la fixture du dépôt et des octets fabriqués.
- GC17 Aucun processus laissé en marche : l'essai ferme navigateur et serveur (`finally`) ; vérifier après coup
  `pgrep -f "c10b-tableau-navigateur|chrome-headless|vite" || true` (rien de ce chantier).
- GC18 Périmètre : seuls les fichiers ci-dessus ; aucune option de capture dans `verifier.sh`.

**Interdits.** Ne pas modifier `rb.css` ni l'interface : si `stageBox` signale une scène plus basse que 640 px (rangée de
neuf boutons sur deux lignes), la tâche s'arrête en **bloquée** avec la hauteur mesurée ; aucune capture régénérée par
`verifier.sh`.

**Critère « terminé ».** Commande bornée verte, capture commitée et décrite, un commit.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (GC4).

- [ ] **Étape 2 : `commun.mjs`.** Import `import { existsSync, readdirSync, readFileSync } from "node:fs";` ; après
  `gitSha` :

```js
/** CSP de la coque (tauri.conf.json), envoyée telle quelle par le serveur des essais (une seule copie, F31). */
export function coqueCsp() {
  const conf = JSON.parse(readFileSync(join(ROOT, "apps", "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  const csp = conf.app.security.csp;
  return Object.entries(csp).map(([d, v]) => `${d} ${Array.isArray(v) ? v.join(" ") : v}`).join("; ");
}
```

  `dropFile` :

```js
/** Dépôt simulé (DataTransfer construit dans la page) sur un sélecteur ; `at` : point dans son rectangle (PC24). */
export async function dropFile(page, selector, name, bytes, type = "", at = [50, 50]) {
  await page.evaluate(({ selector, name, bytes, type, at }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], name, { type }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + at[0], clientY: r.y + at[1] }));
    }
  }, { selector, name, bytes: Array.from(bytes), type, at });
}
```

  Dans `c10a-tableau-navigateur.mjs`, `c2-image-navigateur.mjs`, `c9-grille-navigateur.mjs`, `fichiers-navigateur.mjs` :
  vérifier d'abord que la copie locale est identique (`diff <(sed -n '/^function coqueCsp/,/^}/p' scripts/essais/<f>.mjs) <(sed -n '/^export function coqueCsp/,/^}/p' scripts/essais/commun.mjs | sed 's/^export //')`,
  seule la ligne de commentaire peut différer), retirer le bloc `function coqueCsp() { … }` et son commentaire, ajouter
  `coqueCsp` à l'import de `./commun.mjs`, retirer `readFileSync` de l'import `node:fs` s'il n'y sert plus. Une copie
  différente : la garder, le dire au rapport.

- [ ] **Étape 3 : l'essai.** Créer `scripts/essais/c10b-tableau-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C10b « tableau : fusion, ombrage, collage, classeur » au navigateur (S1 à S4 du cadrage, partie C10b de S11).
// Application construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode
// repli (`?fichiers=repli`), heure figée. Oracles : #stage[data-table|data-table-merges|data-table-shades|data-selection|
// data-elements|data-bounds], valeur de #texte-edition, boîtes d'alerte ; aucune requête hors de 127.0.0.1.
// Lancé par scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c10b-tableau-navigateur.mjs [--captures] (--captures : docs/essais/c10b-tableau-fusion-ombrage.png).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C10b tableau";
const FIXED = new Date("2026-11-20T08:00:00.000Z");
/** Point cliqué sur la scène (px de la scène) : coin haut gauche du premier tableau. */
const CLICK = [200, 150];
const COL = 240;
const ROW = 64;
const PASTE =
  '<table><tr><td colspan="2">Titre</td></tr><tr><td>a</td><td>b</td></tr></table>' +
  '<img src="http://exemple.invalid/x.png" onerror="window.__rb=1"><script>window.__rb=1</script>';
const XLSX = join(ROOT, "crates", "roomboard-formats", "tests", "fixtures", "valeurs.xlsx");
const TRUNCATED = "valeurs.xlsx : tableau limité à 64 lignes et 64 colonnes (le fichier en a 70 × 6)";
const LATER = "format pris en charge dans une prochaine version";

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const waitDialog = async (text) => {
    for (let i = 0; i < 150; i++) {
      if (dialogs.some((d) => d.includes(text))) return;
      await page.waitForTimeout(100);
    }
    throw new Echec(`boîte attendue « ${text} » ; reçues : ${dialogs.join(" | ")}`);
  };
  const editorValue = () => page.$eval("#texte-edition", (a) => a.value);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = (c, wx, wy) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 6 });
    await mouse.up();
    await fr();
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  /** Clic (saisie ouverte au relâché), lecture de la saisie, Échap. */
  const readCell = async (pt, tag, want, label) => {
    await mouse.click(pt[0], pt[1]);
    await waitAttr("data-table", tag);
    const v = await editorValue();
    check(v === want, `${label} : « ${v} » (data-table="${tag}")`);
    await page.keyboard.press("Escape");
    await fr();
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  await page.click(item("table"));
  await fr();
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : la scène garde ${Math.round(box.height)} px de haut avec la rangée de neuf boutons`);
  const c1 = await camera();
  const world = [(CLICK[0] - c1.tx) / c1.zoom, (CLICK[1] - c1.ty) / c1.zoom];
  const cell1 = (c, row, col) => screen(c, world[0] + COL * col + COL / 2, world[1] + ROW * row + ROW / 2);

  // S1 : 4 × 3, « Lundi », Échap ; glisser ; Fusionner ; ombrer la troisième colonne ; révéler, annuler, révéler.
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="4 colonnes, 3 lignes"]');
  await waitAttr("data-table", "4x3@0,0");
  await page.keyboard.type("Lundi");
  await page.keyboard.press("Escape");
  await fr();
  check(await page.$eval("#texte-edition", (a) => a.hidden), "S1 : « Lundi », Échap : saisie fermée (F14)");
  await drag(cell1(c1, 0, 0), cell1(c1, 0, 1));
  await waitAttr("data-table", "4x3@0,0-0,1");
  check(true, 'S1 : glisser de la première à la deuxième cellule : data-table="4x3@0,0-0,1"');
  await page.click('button[data-table-action="table-merge"]');
  await waitAttr("data-table-merges", "1");
  check((await attr("data-table")) === "4x3@0,0", 'S1 : « Fusionner » : data-table-merges="1", l\'ancre active');
  await readCell(cell1(c1, 0, 1), "4x3@0,0", "Lundi", "S1 : la cellule fusionnée montre « Lundi » sur deux colonnes");
  await drag(cell1(c1, 0, 2), cell1(c1, 2, 2));
  await waitAttr("data-table", "4x3@0,2-2,2");
  await page.click('button[data-table-action="table-shade"]');
  await waitAttr("data-table-shades", "3");
  check(true, 'S1 : « Ombrer » la troisième colonne : data-table-shades="3" (S11 « ombrer une colonne »)');
  if (captures) {
    await page.keyboard.press("Escape");
    await fr();
    const path = join(ROOT, "docs", "essais", "c10b-tableau-fusion-ombrage.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }
  await page.click(item("select"));
  await fr();
  await mouse.click(...cell1(c1, 0, 2));
  await waitAttr("data-table-shades", "2");
  check((await attr("data-selection")) === "0", 'S1 : outil Sélection, toucher la cellule ombrée : data-table-shades="2", aucun élément sélectionné');
  await page.keyboard.press("Control+z");
  await waitAttr("data-table-shades", "3");
  check(true, "S1 : Ctrl+Z : l'ombrage revient (3)");
  await mouse.click(...cell1(c1, 0, 2));
  await waitAttr("data-table-shades", "2");
  check(true, "S1 : toucher encore : 2");

  // S2 : collage d'un <table> HTML porté par un ClipboardEvent, script et image piégés.
  const elements = Number(await attr("data-elements"));
  const nodes = await page.evaluate(() => document.querySelectorAll("table, img").length);
  const cP = await camera();
  await page.evaluate((html) => {
    const dt = new DataTransfer();
    dt.setData("text/html", html);
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, PASTE);
  await waitAttr("data-elements", String(elements + 1));
  await waitAttr("data-table-merges", "2");
  check(await page.evaluate(() => window.__rb === undefined), "S2 : collage : aucun script exécuté (window.__rb indéfini)");
  check((await page.evaluate(() => document.querySelectorAll("table, img").length)) === nodes, "S2 : aucun nœud <table> ni <img> ajouté à la page");
  // Tableau collé centré au centre de la vue (F21), 480 × 128 à l'échelle 1.
  const center = [(box.width / 2 - cP.tx) / cP.zoom, (box.height / 2 - cP.ty) / cP.zoom];
  const pasted = [center[0] - COL, center[1] - ROW];
  const cell2 = (c, row, col) => screen(c, pasted[0] + COL * col + COL / 2, pasted[1] + ROW * row + ROW / 2);
  await page.click(item("table"));
  await fr();
  await readCell(cell2(cP, 0, 1), "2x2@0,0", "Titre", "S2 : tableau collé 2 × 2, fusion sur la première ligne (« Titre »)");
  await readCell(cell2(cP, 1, 0), "2x2@1,0", "a", "S2 : « a » dessous");
  await readCell(cell2(cP, 1, 1), "2x2@1,1", "b", "S2 : « b » dessous");

  // S3 : Ctrl+S, Ctrl+O : nouvel onglet ; zone, ombrages et tableau collé relus.
  const before = await page.locator(TAB).count();
  const file = await saveTo("c10b.roomboard");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
  await fr();
  await page.click(item("table"));
  await fr();
  const c2 = await camera();
  await readCell(cell1(c2, 0, 1), "4x3@0,0", "Lundi", "S3 : rouvert, la cellule fusionnée montre « Lundi »");
  check(
    (await attr("data-table-merges")) === "2" && (await attr("data-table-shades")) === "2",
    'S3 : data-table-merges="2" (fusion du tableau collé comprise, PC6), data-table-shades="2"',
  );
  await readCell(cell2(c2, 0, 1), "2x2@0,0", "Titre", "S3 : le tableau collé garde « Titre » et sa fusion");
  await readCell(cell2(c2, 1, 1), "2x2@1,1", "b", "S3 : et « b »");

  // S4 : classeur déposé au centre ; valeurs ; deux casse.xlsx ; enregistrer ; Ctrl+Z.
  const els4 = Number(await attr("data-elements"));
  const b4 = await stageBox(page);
  const mid = [b4.width / 2, b4.height / 2];
  await dropFile(page, "#stage", "valeurs.xlsx", readFileSync(XLSX), "", mid);
  await waitAttr("data-elements", String(els4 + 1));
  await waitDialog(TRUNCATED);
  await waitAttr("data-table-merges", "3");
  check(true, `S4 : valeurs.xlsx déposé : un tableau de plus, sa fusion, « ${TRUNCATED} »`);
  await page.click(item("select"));
  await fr();
  await mouse.click(mid[0], mid[1]);
  await waitAttr("data-selection", "1");
  const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
  await page.keyboard.press("Escape");
  await fr();
  await page.click(item("table"));
  await fr();
  const c4 = await camera();
  const cw = (x1 - x0) / 6;
  const rh = (y1 - y0) / 64;
  for (const [col, want] of [[2, "3,5"], [3, "20/11/2026"], [4, "VRAI"], [5, "#DIV/0!"]]) {
    await readCell(screen(c4, x0 + cw * (col + 0.5), y0 + rh * 0.5), `6x64@0,${col}`, want, `S4 : 64 lignes, colonne ${col + 1}`);
  }
  await dropFile(page, "#stage", "casse.xlsx", new Uint8Array([1, 2, 3, 4, 5]), "", mid);
  await waitDialog(`casse.xlsx : ${LATER}`);
  check(true, "S4 : casse.xlsx sans en-tête PK : refusé (« format pris en charge dans une prochaine version »)");
  const corrupt = new Uint8Array(200).map((_, i) => (i * 37) % 251);
  corrupt.set([0x50, 0x4b, 3, 4]);
  await dropFile(page, "#stage", "casse.xlsx", corrupt, "", mid);
  await waitDialog("Import impossible (casse.xlsx) : ");
  check(Number(await attr("data-elements")) === els4 + 1, "S4 : casse.xlsx corrompu : « Import impossible (casse.xlsx) : … », rien d'inséré");
  const again = await saveTo("apres-casse.roomboard");
  check(existsSync(again), "S4 : l'enregistrement du document marche toujours après (DAB4)");
  await page.keyboard.press("Control+z");
  await waitAttr("data-elements", String(els4));
  await waitAttr("data-table-merges", "2");
  check(true, "S4 : Ctrl+Z retire le tableau importé d'un coup");
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c10b-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures: process.argv.includes("--captures"), tmp });
    if (external.length > 0) throw new Echec(`requêtes hors de 127.0.0.1 : ${external.join(", ")}`);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
```

- [ ] **Étape 4 : `verifier.sh` et son test (rouge puis vert).** Ajouter `c10b-tableau-navigateur` à la boucle
  `for s in …` de `scripts/tests/verifier-e2e.test.sh:13` ; lancer `bash scripts/tests/verifier-e2e.test.sh` : échec
  « c10b-tableau-navigateur absent de verifier.sh ». Dans `scripts/verifier.sh`, après
  `node scripts/essais/c10a-tableau-navigateur.mjs` : `node scripts/essais/c10b-tableau-navigateur.mjs` ; relancer le
  test : « verifier-e2e.test.sh : OK ».

- [ ] **Étape 5 : suite complète.** La commande bornée. Un échec de l'essai C10b : le relancer seul pour lire ses lignes
  `ok — …` ; un défaut d'une autre tâche se signale (tâche **bloquée**, cause et ligne), il ne se corrige pas ici.

- [ ] **Étape 6 : capture.** `node scripts/essais/c10b-tableau-navigateur.mjs --captures 2>&1 | tail -5` ; ouvrir
  `docs/essais/c10b-tableau-fusion-ombrage.png` et la décrire (preuve visuelle ci-dessus).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && for f in scripts/essais/c10b-tableau-navigateur.mjs scripts/essais/commun.mjs scripts/essais/c10a-tableau-navigateur.mjs \
  scripts/essais/c2-image-navigateur.mjs scripts/essais/c9-grille-navigateur.mjs scripts/essais/fichiers-navigateur.mjs \
  scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/c10b-tableau-fusion-ombrage.png; do git add "$f"; done && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(e2e): C10b table merge, shade, paste and xlsx browser scenario" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Rapport : lignes `OK`, les deux tailles de module, description de la capture, une ligne `Réutilisation :` par ligne
  `Réutilise :`.

## Couverture du cadrage

| entrée | tâche |
|---|---|
| F1, F2, F8, F29 (cœur), F30 (lecture) | T1 |
| F18 | T1 (cœur), T4 (contrat), T7 (liaison), T10 (pose) |
| F3, F4, F6, F7, F9, F12, F15 (cœur), F5 (test), F17 | T2, T4 |
| F22 à F27, F32 | T3 (lecture, licences, taille), T5 et T10 (plafonds côté page) |
| F19, F20 | T5, T11 (`main.ts`, 8 Mio) |
| F14, F16, F7 (page) | T6, T8 |
| F10, F11, F13 | T9 |
| F21, F28 | T10, T11 |
| F15 (boutons), F29 (attributs) | T11 |
| F31, S1 à S4 (navigateur) | T12 |
| S5 | T1, T2, T4, T6, T8 |
| F33 (C7b) | aucune tâche : rebase sur `origin/main` avant la fusion, tenu par l'orchestrateur (piège de l'état) |
