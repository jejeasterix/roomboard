# Plan d'exécution — usage-c9-grille (C9, partie cœur : grille de page, magnétisme, rendu net)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Grille dans le cœur Rust : modèle, `SetGrid`, accroche, lignes | — | `crates/roomboard-core/src/grid.rs` (neuf), `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/tests/compat_socle.rs` | isolé | concepteur-critique | `cargo test -p roomboard-core grid 2>&1 \| tail -20` : ≥ 25 tests, 0 échec, `grid_reload_keeps_bytes` et `socle_fixture_has_no_grid` présents ; `socle_fixture_resaves_identically` vert | S1, S2, S3, S5 | #tache-t1 |
| T2 | Contrat TS et fausse liaison de la grille | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé | concepteur-critique | `pnpm --filter @roomboard/web test -- src/core 2>&1 \| tail -20` : 0 échec, bloc « contrat C9 : fausse liaison » ≥ 9 tests, « grille de la fausse liaison (C9, G4) » ≥ 2 tests | S1, S2, S3, S4 | #tache-t2 |
| T3 | Dessin calé de la grille (`grid-paint.ts`) | — | `apps/web/src/engine/render/grid-paint.ts` (neuf), `apps/web/src/engine/render/grid-paint.test.ts` (neuf) | isolé | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/engine/render/grid-paint.test.ts 2>&1 \| tail -20` : ≥ 7 tests, « attendu exact de S5 (a) » présent | S5 | #tache-t3 |
| T4 | Grille dans la scène Canvas 2D (ordre des couches, partie visible) | T2, T3 | `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/page.ts`, `apps/web/src/engine/page.test.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web test -- src/engine/render/canvas2d.test.ts src/engine/page.test.ts 2>&1 \| tail -20` : 0 échec, « ordre des couches (G11) » et « carreaux de 40 de la fausse liaison » présents | S5 | #tache-t4 |
| T5 | Magnétisme des outils Sélection et Formes, Alt suivie | T2 | `apps/web/src/engine/tools/tool.ts`, `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/engine/tools/select.ts`, `apps/web/src/engine/tools/select.test.ts`, `apps/web/src/engine/tools/shape.ts`, `apps/web/src/engine/tools/shape.test.ts`, `apps/web/src/engine/tools/pen.test.ts` | isolé | concepteur-critique | `pnpm --filter @roomboard/web test -- src/engine 2>&1 \| tail -20` : 0 échec, « outil Sélection — magnétisme (C9, S3) » et « outil Formes — magnétisme (C9, S4) » présents | S3, S4 | #tache-t5 |
| T6 | Liaison Wasm, adaptateur TS, contrat sur le vrai module, avis de tiers | T1, T2 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `THIRD_PARTY_NOTICES.md` | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core 2>&1 \| tail -20` : 0 échec, « contrat C9 : vrai module wasm » ≥ 9 tests et « contrat C9 : vrai module seulement » ≥ 2 tests ; `cargo test -p roomboard-wasm grid` ≥ 3 tests ; module ≤ 1 572 864 octets | S1, S2 | #tache-t6 |

**Vagues.** Vague 1 : T1, T2, T3 (fichiers disjoints, trois en parallèle). Vague 2 : T4, T5, T6 (fichiers disjoints,
trois en parallèle), après la fusion de la vague 1. Fichiers partagés entre vagues, donc jamais en parallèle :
`wasm-core.ts` et `wasm-core.contract.test.ts` (T2 puis T6). Durée visée : vague 1 ≈ 60 min (T1 la plus longue),
vague 2 ≈ 40 min ; total ≈ 2 h 30 avec les relectures.

**`tsc` entre les vagues (attendu, comme au plan C2).** Dans le worktree de T3 seul, `tsc` signale `GridLines` absent
d'`api.ts` (type écrit par T2, effacé à l'exécution : `vitest` reste vert). Après la vague 1, `tsc` ne signale plus que
`src/core/wasm-core.ts` (méthodes neuves du contrat non branchées) ; T6 le rend vert. Après la vague 2 : l'orchestrateur
lance `scripts/verifier.sh` (suite complète, module Wasm reconstruit, taille contrôlée).

**Goal :** chaque page porte une grille facultative (six types), enregistrée dans le `.roomboard` et compatible avec les
fichiers sans grille ; le cœur aimante déplacements et formes et calcule les lignes visibles ; la page les dessine
nettes à tout zoom sur la page de hauteur infinie.

**Architecture :** `crates/roomboard-core/src/grid.rs` est seul à savoir quelles lignes existent et où l'on accroche
(DAG1) : lecture tolérante du `Y.Map` `grid`, écriture en bloc, `snap_point`, `snap_delta`, `lines` ; `Document` expose
`snap_point`, `snap_delta`, `grid_lines` et la commande `SetGrid`. La page ne fait que caler les segments rendus sur les
pixels physiques (`grid-paint.ts`) et les poser dans l'ordre des couches (DAG2). La fausse liaison mire le modèle et la
commande ; accroche et lignes pour les seuls carreaux (DAG3).

**Tech Stack :** Rust (yrs 0.28.1, serde), wasm-bindgen 0.2.130, serde-wasm-bindgen, TypeScript, Vitest.

**Spec :** `docs/plans/usage-c9-grille-cadrage.md` (commit `f2ac57d`).

## Global Constraints

- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `cargo test -p roomboard-core grid 2>&1 | tail -20`, `pnpm --filter @roomboard/web test -- <fichier> 2>&1 | tail -20` ; le rapport cite le nombre de tests (N ≥ 1) et le nom attendu.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (`git add <chemin>`, jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 C7 (texte riche) touche les mêmes fichiers en parallèle : dans `commands.rs`, `crates/roomboard-wasm/src/lib.rs`, `api.ts`, `fake-core.ts`, tout ajout va en fin d'énumération, de `match`, d'interface, de bloc ou de fichier ; aucune réorganisation de l'existant.
- GC8 VM chargée : un test qui échoue sur un délai est rejoué une fois.
- GC9 Format : `schema` reste 1, `formatVersion` reste 1 ; la grille s'écrit en `Y.Map` et `Y.Array` de `Y.Map`, jamais `Any::Map`.
- GC10 Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :` de la section.
- GC11 Message `BadGrid` mot pour mot (cœur et fausse liaison) : `grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)`.
- GC12 Interdits de périmètre : `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`, `crates/roomboard-core/tests/fixtures/` (aucune fixture régénérée).

Commande de commit type (dans le dossier `$WT` que l'orchestrateur donne à la tâche) :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Review Focus

1. Densité extrême (pas minuscule, zoom bas, `min_step` nul) : jamais d'explosion du nombre de lignes ou de points ; une
   famille ou un niveau au-delà de `MAX_GRID_DOTS` est sauté entier (G9) — test `dots_over_the_cap_skip_the_whole_level`, T1.
2. Grille mal formée dans un fichier (`grid` qui n'est pas un `Y.Map`, `levels` qui n'est pas un tableau, pas nul,
   chaîne ou `NaN`) : page lisible, défauts champ par champ (G4, K9 de C2) — tests `read_tolerates_malformed_grid` (T1)
   et « grille qui n'est pas un objet : null, page lisible » (T2).
3. Pointeur hors de la page (x < 0, x > largeur, y < 0) : l'accroche reste sur les lignes dessinées de la page (G6, HG10)
   — tests `snap_point_stays_on_page_lines` (T1) et `snapPoint (S4) … bornes de la page` (T2).
4. Petit geste de forme sous magnétisme : rien n'est écrit, même si l'aimant l'agrandirait ; deux points aimantés
   confondus : rien (G8) — test « petit geste : rien même agrandi par l'aimant ; points aimantés confondus : rien », T5.
5. Défilement d'une ligne tiretée : le motif ne glisse pas (décalage calé sur l'origine du monde, G10) ; épaisseur à
   dpr non entier — test « motifs (G10) … décalage calé sur l'origine du monde », T3.

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/grid.rs` (neuf) | `GridView`, `GridLevelView`, `GridInput`, `GridLines`, `LevelLines`, `GRID_KINDS`, constantes ; `read`, `write`, `validate` ; `snap_point`, `snap_delta`, `lines` | T1 |
| `crates/roomboard-core/src/lib.rs` | `pub mod grid;` | T1 |
| `crates/roomboard-core/src/element.rs` | `PageView.grid` | T1 |
| `crates/roomboard-core/src/document.rs` | `page()` lit la grille ; `snap_point`, `snap_delta`, `grid_lines` | T1 |
| `crates/roomboard-core/src/query.rs` | `snap_box` (boîte géométrique) | T1 |
| `crates/roomboard-core/src/commands.rs` | `Command::SetGrid`, `CommandError::BadGrid`, `cmd_set_grid`, tests | T1 |
| `crates/roomboard-core/tests/compat_socle.rs` | `socle_fixture_has_no_grid` | T1 |
| `apps/web/src/core/api.ts` | types de grille, `SetGrid`, `PageView.grid`, trois méthodes | T2 |
| `apps/web/src/core/fake-core.ts` | parité du modèle et de la commande ; accroche et lignes des carreaux | T2 |
| `apps/web/src/core/wasm-core.ts` | `toGridView` dans `toPageView` (T2) ; `SetGrid`, `snapPoint`, `snapDelta`, `gridLines`, `toGridLines` (T6) | T2, T6 |
| `apps/web/src/core/wasm-core.contract.test.ts` | littéraux `grid: null`, bloc « contrat C9 » (T2) ; `c9Factories = factories`, bloc du vrai module (T6) | T2, T6 |
| `apps/web/src/engine/render/grid-paint.ts` (neuf) | lignes du cœur → pixels physiques calés | T3 |
| `apps/web/src/engine/render/renderer.ts`, `canvas2d.ts`, `apps/web/src/engine/page.ts` | source de grille, ordre des couches, partie visible | T4 |
| `apps/web/src/engine/tools/*.ts`, `engine.ts` | Alt, `snapDelta`, `snapPoint` | T5 |
| `crates/roomboard-wasm/src/lib.rs` | `set_grid`, `clear_grid`, `snap_point`, `snap_delta`, `grid_lines`, `set_grid_inner`, `grid_input` | T6 |
| `THIRD_PARTY_NOTICES.md` | section « Code repris d'ActCraft » | T6 |

Valeurs communes à toutes les tâches :
- `GRID_KINDS` = `squares`, `lines`, `dots`, `isometric`, `music`, `seyes` ; `MAX_GRID_LEVELS` = 16 ;
  `MAX_GRID_DOTS` = 65 536 ; `MIN_GRID_PX` = 4 ; `MIN_DOT_PX` = 8 ; Seyès fin à `alpha` 0,5 ; motifs `dashed` [6, 4],
  `dotted` [1, 3] (px CSS × dpr).
- Défauts de lecture (G4) : tête `visible` vrai, `snap` faux, `above` faux ; niveau : origine 0, `color` `#000000`,
  `line` `solid`, `snap` et `visible` vrais, `kind` absent → `""`.
- Clés du `Y.Map` et du JSON : `visible`, `snap`, `above`, `levels` ; niveau : `kind`, `spacingX`, `spacingY`, `originX`,
  `originY`, `color`, `line`, `snap`, `visible`.
- Montage S5 : vue 800 × 600 px CSS, page de largeur 1920, caméra `{ zoom: z, tx: 13.3, ty: −1 000 007·z }`,
  z ∈ {0,15 ; 0,37 ; 1 ; 2,5 ; 8}, dpr ∈ {1 ; 1,25 ; 2}.

---

### Tâche T1 — Grille dans le cœur Rust : modèle, `SetGrid`, accroche, lignes

<a id="tache-t1"></a>

**Objectif.** Écrire le module `grid.rs` (G2 à G9 : modèle `Y.Map`, lecture tolérante, validation, accroche des six
types bornée à la page, lignes visibles par famille avec seuils et plafond), la commande `SetGrid` (G1, G5 : une étape,
même valeur sans transaction), la vue `PageView.grid`, la boîte d'accroche géométrique (G7) et les lectures
`Document::{snap_point, snap_delta, grid_lines}` ; prouver S1 (aller-retour octets, annuler A→B), S2 (socle sans grille,
`kind` inconnu gardé), S3 côté cœur (`snap_delta` = (57, 33)) et S5 côté cœur (familles présentes par zoom, nombre de
lignes borné, plafond des points).

**Fichiers.**
- Create : `crates/roomboard-core/src/grid.rs`
- Modify : `crates/roomboard-core/src/lib.rs:2-11` (`pub mod grid;` après `pub mod format;`)
- Modify : `crates/roomboard-core/src/element.rs:1-7` (import), `:32-38` (`PageView`)
- Modify : `crates/roomboard-core/src/document.rs:14-25` (imports), `:161-172` (`page`), fin du bloc `impl Document` (avant `:480`)
- Modify : `crates/roomboard-core/src/query.rs:211-229` (après `bounds`, fin du bloc `impl Document`)
- Modify : `crates/roomboard-core/src/commands.rs:10-20` (import), `:28-88` (fin de `Command`), `:110-122` (fin de `CommandError`), `:124-156` (`Display`), `:391-451` (fin du `match` d'`apply`), fin du bloc `impl Document` (avant `:934`), fin du module de tests
- Modify : `crates/roomboard-core/tests/compat_socle.rs` (fin de fichier)

**Interfaces.**
- Consomme (existant) : `element::{finite_positive, out_f64, out_string}` ; `query::Bounds` ; `Document::{read,
  transact_local, find_page, find_element, done, unchanged}` ; `commands::read_shape` ; `shape::box_polygon` ;
  `format::{load, save, SaveMeta}`.
- Produit (exact, lu par T6) :
  - `pub const GRID_KINDS: [&str; 6]`, `pub const MAX_GRID_LEVELS: usize = 16`, `pub const MAX_GRID_DOTS: usize = 65_536`,
    `pub const SEYES_FINE_ALPHA: f64 = 0.5`, `pub fn is_known_kind(kind: &str) -> bool`
  - `#[derive(Debug, Clone, PartialEq, serde::Serialize)] #[serde(rename_all = "camelCase")] pub struct GridLevelView { pub kind: String, pub spacing_x: f64, pub spacing_y: f64, pub origin_x: f64, pub origin_y: f64, pub color: String, pub line: String, pub snap: bool, pub visible: bool }`
  - `pub struct GridView { pub visible: bool, pub snap: bool, pub above: bool, pub levels: Vec<GridLevelView> }` (mêmes dérivés) ; `pub type GridInput = GridView;`
  - `pub struct LevelLines { pub color: String, pub line: String, pub alpha: f64, pub segments: Vec<f64>, pub dots: Vec<f64> }` ; `pub struct GridLines { pub above: bool, pub levels: Vec<LevelLines> }` (segments : `x0, y0, x1, y1` à la suite ; points : `x, y`)
  - `pub(crate) fn read<T: ReadTxn>(txn: &T, page: &MapRef) -> Option<GridView>` ; `pub(crate) fn write(txn: &mut TransactionMut, page: &MapRef, grid: Option<&GridInput>)` ; `pub(crate) fn validate(g: &GridInput) -> Result<(), CommandError>`
  - `pub fn snap_point(g: &GridView, width: f64, p: (f64, f64)) -> Option<(f64, f64)>` ; `pub fn snap_delta(g: &GridView, width: f64, b: Bounds, d: (f64, f64)) -> (f64, f64)` ; `pub fn lines(g: &GridView, width: f64, rect: Bounds, min_step: f64, min_dot_step: f64) -> Option<GridLines>`
  - `Command::SetGrid { page: String, grid: Option<GridInput> }` ; `CommandError::BadGrid`
  - `PageView.grid: Option<GridView>` (sérialisé `grid`, absent → `undefined` côté JS)
  - `Document::snap_point(&self, page: &str, x: f64, y: f64) -> Option<(f64, f64)>` ; `Document::snap_delta(&self, page: &str, ids: &[String], dx: f64, dy: f64) -> (f64, f64)` ; `Document::grid_lines(&self, page: &str, rect: Bounds, min_step: f64, min_dot_step: f64) -> Option<GridLines>` ; `Document::snap_box(&self, ids: &[String]) -> Option<Bounds>`
- Réutilise : `crates/roomboard-core/src/commands.rs:675-744` (`cmd_set_backdrop`), `:740-756` — `find_page`, `transact_local`, `done(Change) -> Change`, `unchanged() -> Change`, appelés par `cmd_set_grid` sur le même modèle.
- Réutilise : `crates/roomboard-core/src/document.rs:161` (`Document::page`), `element.rs:32` (`PageView`) — étendus d'une ligne `grid: grid::read(&txn, &m)` et du champ `grid`.
- Réutilise : `crates/roomboard-core/src/element.rs` — `out_f64(Option<Out>) -> Option<f64>`, `out_string(Option<Out>) -> Option<String>`, `finite_positive(f64) -> bool`, appelées par `grid::read` et `grid::validate`.
- Réutilise : `crates/roomboard-core/src/query.rs:112` (`element_geom`), `:49` (`world_bounds`) — étendu par `snap_box(ids) -> Option<Bounds>` (forme : `box_polygon(w, h)`).
- Réutilise : aucun module existant pour le calcul de grille (cadrage : « `grid`, `snap`, `nearest` : rien ») — nouveau module `crates/roomboard-core/src/grid.rs` (DAG1), interface ci-dessus.
- Réutilise : `crates/roomboard-core/tests/compat_socle.rs:91` (`socle_bytes`) — appelée par `socle_fixture_has_no_grid`.
- Réutilise : `crates/roomboard-core/src/commands.rs:2291` (`image_and_backdrop_reload_keep_bytes`) — modèle du test frère `grid_reload_keeps_bytes`.

**Patron à ne pas reprendre (concepteur-critique).**
1. `snapAxis` d'ActCraft borne seulement par le bas (`~/projets/actcraft/core/src/gridsnap.cpp:47-51`) : ici chaque axe
   qui a des verticales est aussi borné à la dernière ligne `≤ width` (HG10), et l'isométrique écarte les sommets hors page.
2. La boîte du cadre de sélection, `Document::bounds` (`crates/roomboard-core/src/query.rs:211-229`), compte le contour
   épaissi d'une forme (`shape_polygon(…, width)`) : l'accroche vise la forme, pas son trait (G7) — `snap_box` prend
   `box_polygon(w, h)` pour une forme.
3. Ranger la grille en `Any::Map` ou un niveau en `Any::Map` (`crates/roomboard-core/src/element.rs:196-198`, octets
   instables au rechargement) : tout en `MapPrelim` / `ArrayPrelim` de `MapPrelim`.
4. Compter les lignes depuis `y = 0` : `lines` ne parcourt que `rect ∩ page` (le haut de vue), jamais la distance au
   haut de page (G9).

**Test et commande bornée.**
`cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core grid 2>&1 | tail -20`
→ 0 échec, ≥ 25 tests passés dont `grid::tests::read_tolerates_malformed_grid`, `grid::tests::dots_over_the_cap_skip_the_whole_level`,
`commands::tests::grid_reload_keeps_bytes`, `commands::tests::newer_grid_kind_is_kept_drawn_nowhere_and_never_snaps`,
`socle_fixture_has_no_grid`. Puis `cargo test -p roomboard-core 2>&1 | tail -20` → aucun `FAILED`, tests gardés verts :
`socle_fixture_resaves_identically`, `image_and_backdrop_reload_keep_bytes`, `set_backdrop_same_value_or_none_is_no_step`,
tests de `history.rs` et de `query.rs`. Puis `cargo test -p roomboard-formats --test container 2>&1 | tail -5` (empreinte
figée du socle : `socle_fixture_hash_is_pinned` vert).

**Preuve visuelle.** Aucune (cœur sans interface).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `cargo test -p roomboard-core grid 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 Dans `commands.rs`, tout ajout va en fin d'énumération (`Command`, `CommandError`), de `match` (`apply`, `Display`), du bloc `impl Document` et du module de tests ; aucune réorganisation (C7 en parallèle).
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC9 `schema` 1, `formatVersion` 1 ; grille en `Y.Map` et `Y.Array` de `Y.Map`, jamais `Any::Map`.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC11 Message `BadGrid` mot pour mot : `grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)`.
- GC12 Ne pas toucher `crates/roomboard-core/tests/fixtures/` (aucune fixture régénérée), ni `scripts/verifier.sh`.

**Interdits.** Toucher à `format/`, `history.rs`, `shape.rs`, `ink/` ; ajouter un `Deserialize` ; aimanter dans
`cmd_transform` ; donner une grille à `insert_page` (une page neuve n'en a pas, HG4) ; régénérer une fixture.

**Terminé quand.** La commande bornée passe (≥ 25 tests « grid »), `cargo test -p roomboard-core` et
`cargo test -p roomboard-formats --test container` sont verts, `cargo clippy -p roomboard-core --all-targets -- -D warnings`
et `cargo fmt --all --check` sont verts, les commits sont faits.

**Étapes.**

- [ ] **Étape 1 : test du message `BadGrid` (rouge).** À la fin du module `tests` de `crates/roomboard-core/src/commands.rs`
  (après `image_and_backdrop_reload_keep_bytes`, avant la dernière `}`), ajouter :

```rust
    #[test]
    fn bad_grid_has_readable_message() {
        assert_eq!(
            CommandError::BadGrid.to_string(),
            "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)"
        );
    }
```

  `cargo test -p roomboard-core bad_grid 2>&1 | tail -5` → `error[E0599]` (`BadGrid` introuvable).

- [ ] **Étape 2 : `BadGrid` (vert).** Dans `commands.rs`, ajouter `BadGrid,` en dernière variante de `CommandError`
  (après `BadImage,`), et en dernier bras du `match` de `Display` (après `CommandError::BadImage => …`) :

```rust
            CommandError::BadGrid => write!(
                f,
                "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)"
            ),
```

  `cargo test -p roomboard-core bad_grid 2>&1 | tail -5` → `1 passed`.

- [ ] **Étape 3 : squelette de `grid.rs` et tests du modèle (rouge).** Dans `crates/roomboard-core/src/lib.rs`, ajouter
  `pub mod grid;` après `pub mod format;`. Créer `crates/roomboard-core/src/grid.rs` :

```rust
//! Grille de page (U31, C9) : modèle rangé en `Y.Map` (jamais `Any::Map`, G2), lecture tolérante (G4), accroche (G6, G7)
//! et lignes visibles (G9), en unités de page. Seul endroit qui sait quelles lignes existent (DAG1) : le rendu ne fait
//! que les caler sur les pixels ; l'export PDF les réutilisera.
//!
//! Accroche écrite d'après `nearestGridPoint`, `snapAxis` et `nearestLatticePoint` d'ActCraft (`core/src/gridsnap.cpp`,
//! GPL-3.0-only, même auteur, repris sous PolyForm Shield : voir `THIRD_PARTY_NOTICES.md`).
use yrs::{Any, Array, ArrayPrelim, In, Map, MapPrelim, MapRef, Out, ReadTxn, TransactionMut};

use crate::commands::CommandError;
use crate::element::{finite_positive, out_f64, out_string};
use crate::query::Bounds;

/// Types dessinés et aimantés ; tout autre `kind` est gardé tel quel, ignoré par le rendu et l'accroche (U31, C4).
pub const GRID_KINDS: [&str; 6] = ["squares", "lines", "dots", "isometric", "music", "seyes"];
/// Nombre maximal de niveaux écrits (HG9).
pub const MAX_GRID_LEVELS: usize = 16;
/// Plafond des points d'un niveau et des lignes d'une famille : au-delà, sauté entier, jamais tronqué (G9).
pub const MAX_GRID_DOTS: usize = 65_536;
pub const DEFAULT_GRID_COLOR: &str = "#000000";
pub const DEFAULT_GRID_LINE: &str = "solid";
/// Opacité des lignes fines du Seyès (G10).
pub const SEYES_FINE_ALPHA: f64 = 0.5;
/// Tolérance d'indice, en pas : une ligne posée sur un bord compte comme dedans.
const EPS: f64 = 1e-9;

/// Niveau de grille (U31) ; `kind` et `line` inconnus gardés tels quels.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GridLevelView {
    pub kind: String,
    pub spacing_x: f64,
    pub spacing_y: f64,
    pub origin_x: f64,
    pub origin_y: f64,
    pub color: String,
    pub line: String,
    pub snap: bool,
    pub visible: bool,
}

/// Grille d'une page (U31, G4) ; `levels` dans l'ordre du document.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct GridView {
    pub visible: bool,
    pub snap: bool,
    pub above: bool,
    pub levels: Vec<GridLevelView>,
}

/// Grille demandée par `SetGrid` : même forme que la vue, réécrite en bloc (G5).
pub type GridInput = GridView;

/// Groupe de lignes d'un niveau (G9) : segments `x0, y0, x1, y1` et points `x, y` à la suite, en unités de page.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct LevelLines {
    pub color: String,
    pub line: String,
    pub alpha: f64,
    pub segments: Vec<f64>,
    pub dots: Vec<f64>,
}

/// Lignes visibles d'une grille ; un niveau rend 0 à 2 groupes (Seyès : principal, puis fines à `SEYES_FINE_ALPHA`).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct GridLines {
    pub above: bool,
    pub levels: Vec<LevelLines>,
}

pub fn is_known_kind(kind: &str) -> bool {
    GRID_KINDS.contains(&kind)
}

#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Doc, Transact};

    const W: f64 = 1920.0;

    fn level(kind: &str, sx: f64, sy: f64) -> GridLevelView {
        GridLevelView {
            kind: kind.into(),
            spacing_x: sx,
            spacing_y: sy,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#000000".into(),
            line: "solid".into(),
            snap: true,
            visible: true,
        }
    }

    fn grid(levels: Vec<GridLevelView>) -> GridView {
        GridView {
            visible: true,
            snap: true,
            above: false,
            levels,
        }
    }

    fn num(v: f64) -> In {
        In::Any(Any::from(v))
    }

    fn page_with(value: In) -> (Doc, MapRef) {
        let doc = Doc::new();
        let page = doc.get_or_insert_map("page");
        {
            let mut txn = doc.transact_mut();
            page.insert(&mut txn, "grid", value);
        }
        (doc, page)
    }

    /// G4, Review Focus 2 : une grille mal formée ne rend jamais la page illisible.
    #[test]
    fn read_tolerates_malformed_grid() {
        let (doc, page) = page_with(In::from("pas une grille"));
        assert_eq!(read(&doc.transact(), &page), None);
        let (doc, page) = page_with(In::Map(MapPrelim::from([(
            "levels",
            In::from("pas un tableau"),
        )])));
        assert_eq!(
            read(&doc.transact(), &page),
            Some(GridView {
                visible: true,
                snap: false,
                above: false,
                levels: vec![]
            })
        );
        let (doc, page) = page_with(In::Map(MapPrelim::from([(
            "visible",
            In::Any(Any::Bool(false)),
        )])));
        assert_eq!(
            read(&doc.transact(), &page).map(|g| (g.visible, g.levels.len())),
            Some((false, 0))
        );
        let levels = In::Array(ArrayPrelim::from(vec![
            In::from("pas un niveau"),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", num(0.0)),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", In::from("40")),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", num(40.0)),
                ("spacingY", num(20.0)),
                ("originX", num(f64::NAN)),
            ])),
        ]));
        let (doc, page) = page_with(In::Map(MapPrelim::from([("levels", levels)])));
        let g = read(&doc.transact(), &page).expect("grille lisible");
        assert_eq!(
            g.levels,
            vec![GridLevelView {
                spacing_y: 20.0,
                ..level("squares", 40.0, 40.0)
            }]
        );
    }

    /// G2, GC9 : écrite en `Y.Map` (sinon `read` ne la relirait pas), relue à l'identique ; `None` la retire.
    #[test]
    fn grid_write_then_read_gives_the_same_view_and_none_removes() {
        let doc = Doc::new();
        let page = doc.get_or_insert_map("page");
        let g = GridView {
            visible: false,
            snap: true,
            above: true,
            levels: vec![
                GridLevelView {
                    origin_x: 5.0,
                    origin_y: -3.0,
                    color: "#7b68ee".into(),
                    line: "dashed".into(),
                    snap: false,
                    visible: false,
                    ..level("seyes", 30.24, 30.24)
                },
                level("hexagon", 1.0, 2.0),
            ],
        };
        {
            let mut txn = doc.transact_mut();
            write(&mut txn, &page, Some(&g));
        }
        assert!(matches!(
            page.get(&doc.transact(), "grid"),
            Some(Out::YMap(_))
        ));
        assert_eq!(read(&doc.transact(), &page), Some(g));
        {
            let mut txn = doc.transact_mut();
            write(&mut txn, &page, None);
        }
        assert_eq!(read(&doc.transact(), &page), None);
    }

    /// G2 : seuls les nombres et le format sont contrôlés ; `kind` et `line` inconnus s'écrivent.
    #[test]
    fn validate_grid_limits_numbers_and_format_only() {
        let ok = level("hexagon", 40.0, 40.0);
        assert_eq!(validate(&grid(vec![ok.clone(); MAX_GRID_LEVELS])), Ok(()));
        assert_eq!(validate(&grid(vec![])), Ok(()));
        assert_eq!(
            validate(&grid(vec![GridLevelView {
                line: "wavy".into(),
                ..ok.clone()
            }])),
            Ok(())
        );
        assert_eq!(
            validate(&grid(vec![ok.clone(); MAX_GRID_LEVELS + 1])),
            Err(CommandError::BadGrid)
        );
        for bad in [
            GridLevelView {
                spacing_x: -1.0,
                ..ok.clone()
            },
            GridLevelView {
                spacing_y: f64::INFINITY,
                ..ok.clone()
            },
            GridLevelView {
                origin_y: f64::NAN,
                ..ok.clone()
            },
            GridLevelView {
                kind: String::new(),
                ..ok.clone()
            },
            GridLevelView {
                color: String::new(),
                ..ok.clone()
            },
            GridLevelView {
                line: String::new(),
                ..ok.clone()
            },
        ] {
            assert_eq!(validate(&grid(vec![bad])), Err(CommandError::BadGrid));
        }
    }
}
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -5` → `error[E0425]` (`read`, `write`, `validate` introuvables).

- [ ] **Étape 4 : `read`, `write`, `validate` (vert).** Dans `grid.rs`, insérer avant `#[cfg(test)]` :

```rust
fn out_bool(o: Option<Out>) -> Option<bool> {
    match o {
        Some(Out::Any(Any::Bool(b))) => Some(b),
        _ => None,
    }
}

/// Grille lue avec tolérance (G4) : `grid` qui n'est pas un `Y.Map` → `None` ; `levels` absent ou qui n'est pas un
/// `Y.Array` → `[]` ; niveau qui n'est pas un `Y.Map` ou sans pas finis > 0 → absent de la vue, gardé dans le document.
pub(crate) fn read<T: ReadTxn>(txn: &T, page: &MapRef) -> Option<GridView> {
    let Some(Out::YMap(g)) = page.get(txn, "grid") else {
        return None;
    };
    let levels = match g.get(txn, "levels") {
        Some(Out::YArray(a)) => a
            .iter(txn)
            .filter_map(|o| match o {
                Out::YMap(l) => read_level(txn, &l),
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    };
    Some(GridView {
        visible: out_bool(g.get(txn, "visible")).unwrap_or(true),
        snap: out_bool(g.get(txn, "snap")).unwrap_or(false),
        above: out_bool(g.get(txn, "above")).unwrap_or(false),
        levels,
    })
}

fn read_level<T: ReadTxn>(txn: &T, l: &MapRef) -> Option<GridLevelView> {
    let positive = |k: &str| out_f64(l.get(txn, k)).filter(|v| finite_positive(*v));
    let finite = |k: &str| {
        out_f64(l.get(txn, k))
            .filter(|v| v.is_finite())
            .unwrap_or(0.0)
    };
    Some(GridLevelView {
        kind: out_string(l.get(txn, "kind")).unwrap_or_default(),
        spacing_x: positive("spacingX")?,
        spacing_y: positive("spacingY")?,
        origin_x: finite("originX"),
        origin_y: finite("originY"),
        color: out_string(l.get(txn, "color")).unwrap_or_else(|| DEFAULT_GRID_COLOR.to_string()),
        line: out_string(l.get(txn, "line")).unwrap_or_else(|| DEFAULT_GRID_LINE.to_string()),
        snap: out_bool(l.get(txn, "snap")).unwrap_or(true),
        visible: out_bool(l.get(txn, "visible")).unwrap_or(true),
    })
}

/// Écrit la grille en bloc (G5) : `Y.Map` de tête, `Y.Array` de `Y.Map` pour les niveaux, jamais `Any::Map` (G2, GC9) ;
/// les clés inconnues de l'ancienne grille disparaissent (HG8). `None` retire le champ.
pub(crate) fn write(txn: &mut TransactionMut, page: &MapRef, grid: Option<&GridInput>) {
    let Some(g) = grid else {
        page.remove(txn, "grid");
        return;
    };
    let levels: Vec<In> = g.levels.iter().map(level_fields).collect();
    page.insert(
        txn,
        "grid",
        MapPrelim::from([
            ("visible", In::Any(Any::Bool(g.visible))),
            ("snap", In::Any(Any::Bool(g.snap))),
            ("above", In::Any(Any::Bool(g.above))),
            ("levels", In::Array(ArrayPrelim::from(levels))),
        ]),
    );
}

fn level_fields(l: &GridLevelView) -> In {
    In::Map(MapPrelim::from([
        ("kind", In::from(l.kind.as_str())),
        ("spacingX", In::Any(Any::from(l.spacing_x))),
        ("spacingY", In::Any(Any::from(l.spacing_y))),
        ("originX", In::Any(Any::from(l.origin_x))),
        ("originY", In::Any(Any::from(l.origin_y))),
        ("color", In::from(l.color.as_str())),
        ("line", In::from(l.line.as_str())),
        ("snap", In::Any(Any::Bool(l.snap))),
        ("visible", In::Any(Any::Bool(l.visible))),
    ]))
}

/// `BadGrid` (G2) : pas finis > 0, origine finie, `kind`, `color`, `line` non vides, au plus 16 niveaux.
pub(crate) fn validate(g: &GridInput) -> Result<(), CommandError> {
    let level_ok = |l: &GridLevelView| {
        finite_positive(l.spacing_x)
            && finite_positive(l.spacing_y)
            && l.origin_x.is_finite()
            && l.origin_y.is_finite()
            && !l.kind.is_empty()
            && !l.color.is_empty()
            && !l.line.is_empty()
    };
    if g.levels.len() <= MAX_GRID_LEVELS && g.levels.iter().all(level_ok) {
        Ok(())
    } else {
        Err(CommandError::BadGrid)
    }
}
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -8` → `3 passed` (`read_tolerates_malformed_grid`,
  `grid_write_then_read_gives_the_same_view_and_none_removes`, `validate_grid_limits_numbers_and_format_only`).

- [ ] **Étape 5 : tests de l'accroche (rouge).** À la fin de `mod tests` de `grid.rs`, ajouter :

```rust
    fn close(a: (f64, f64), b: (f64, f64)) -> bool {
        (a.0 - b.0).abs() < 1e-9 && (a.1 - b.1).abs() < 1e-9
    }

    /// S4 côté cœur : (13, 17) → (0, 0), (118, 97) → (120, 80).
    #[test]
    fn grid_squares_and_dots_snap_to_the_nearest_crossing() {
        for kind in ["squares", "dots"] {
            let g = grid(vec![level(kind, 40.0, 40.0)]);
            assert_eq!(snap_point(&g, W, (13.0, 17.0)), Some((0.0, 0.0)), "{kind}");
            assert_eq!(snap_point(&g, W, (118.0, 97.0)), Some((120.0, 80.0)), "{kind}");
        }
    }

    /// G6, HG10, Review Focus 3 : première ligne ≥ 0 et dernière ≤ largeur (borne absente d'ActCraft).
    #[test]
    fn snap_point_stays_on_page_lines() {
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        assert_eq!(snap_point(&g, W, (-70.0, -90.0)), Some((0.0, 0.0)));
        assert_eq!(snap_point(&g, W, (1950.0, 10.0)), Some((1920.0, 0.0)));
        let shifted = grid(vec![GridLevelView {
            origin_x: 13.0,
            origin_y: -27.0,
            ..level("squares", 40.0, 40.0)
        }]);
        assert_eq!(snap_point(&shifted, W, (1950.0, -5.0)), Some((1893.0, 13.0)));
        assert_eq!(
            snap_point(&shifted, 5.0, (3.0, 3.0)),
            None,
            "aucune verticale dans une page de 5 de large"
        );
    }

    /// G3 : `lines` accroche y seul, `music` aux lignes des portées, `seyes` aux croisements fins.
    #[test]
    fn grid_lines_music_and_seyes_snap_on_their_lines() {
        let lines_kind = grid(vec![level("lines", 40.0, 40.0)]);
        assert_eq!(snap_point(&lines_kind, W, (1950.0, 10.0)), Some((1950.0, 0.0)), "x libre");
        let music = grid(vec![level("music", 7.0, 12.0)]);
        assert_eq!(snap_point(&music, W, (500.0, 70.0)), Some((500.0, 48.0)));
        assert_eq!(snap_point(&music, W, (500.0, 100.0)), Some((500.0, 120.0)));
        assert_eq!(snap_point(&music, W, (500.0, -300.0)), Some((500.0, 0.0)));
        let seyes = grid(vec![level("seyes", 30.24, 30.24)]);
        let q = snap_point(&seyes, W, (40.0, 9.0)).expect("seyes");
        assert!(close(q, (30.24, 7.56)), "{q:?}");
    }

    /// G3, G6 : réseau de côté `sx` (`spacingY` inutilisé), sommet le plus proche dans la page (force brute).
    #[test]
    fn grid_isometric_snaps_to_the_nearest_lattice_vertex_inside_the_page() {
        let iso = grid(vec![level("isometric", 40.0, 99.0)]);
        let h = 40.0 * 3f64.sqrt() / 2.0;
        assert!(close(snap_point(&iso, W, (36.0, 25.0)).expect("iso"), (h, 20.0)));
        assert!(close(snap_point(&iso, W, (-50.0, -50.0)).expect("iso"), (0.0, 0.0)));
        let far = snap_point(&iso, W, (5000.0, 10.0)).expect("iso");
        assert!(far.0 <= W && far.0 > W - h, "{far:?}");
        let d = |a: (f64, f64), p: (f64, f64)| (a.0 - p.0).powi(2) + (a.1 - p.1).powi(2);
        for p in [(17.0, 3.0), (51.3, 77.7), (100.0, 1000.0), (1900.0, 33.0)] {
            let q = snap_point(&iso, W, p).expect("iso");
            for m in 0..=55 {
                for n in -30..=60 {
                    let v = (f64::from(m) * h, f64::from(m) * 20.0 + f64::from(n) * 40.0);
                    if v.0 <= W && v.1 >= 0.0 {
                        assert!(d(q, p) <= d(v, p) + 1e-9, "{p:?} → {q:?}, plus proche : {v:?}");
                    }
                }
            }
        }
    }

    /// G6, HG3 : coupé → rien ; inconnu ou niveau sans accroche ignorés ; invisible accroche ; niveau le plus proche.
    #[test]
    fn grid_snap_rules_off_unknown_invisible_and_nearest_level() {
        let mut off = grid(vec![level("squares", 40.0, 40.0)]);
        off.snap = false;
        assert_eq!(snap_point(&off, W, (13.0, 17.0)), None);
        let ignored = grid(vec![
            level("hexagon", 40.0, 40.0),
            GridLevelView {
                snap: false,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert_eq!(snap_point(&ignored, W, (13.0, 17.0)), None);
        let mut hidden = grid(vec![GridLevelView {
            visible: false,
            ..level("squares", 40.0, 40.0)
        }]);
        hidden.visible = false;
        assert_eq!(snap_point(&hidden, W, (13.0, 17.0)), Some((0.0, 0.0)));
        let two = grid(vec![
            level("squares", 40.0, 40.0),
            GridLevelView {
                origin_x: 15.0,
                origin_y: 15.0,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert_eq!(snap_point(&two, W, (13.0, 17.0)), Some((15.0, 15.0)));
    }

    /// G7, S3 côté cœur : coin ou centre déplacé le plus proche de son point aimanté ; brut sans magnétisme.
    #[test]
    fn grid_snap_delta_moves_the_nearest_corner_or_center() {
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        let b = Bounds {
            x0: 13.0,
            y0: 17.0,
            x1: 113.0,
            y1: 77.0,
        };
        assert_eq!(snap_delta(&g, W, b, (52.0, 31.0)), (57.0, 33.0), "centre (115, 78) → (120, 80)");
        let corner = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 60.0,
        };
        assert_eq!(snap_delta(&g, W, corner, (2.0, 3.0)), (0.0, 0.0), "coin (2, 3) → (0, 0)");
        let off = GridView { snap: false, ..g };
        assert_eq!(snap_delta(&off, W, b, (52.0, 31.0)), (52.0, 31.0));
    }
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -5` → `error[E0425]` (`snap_point`, `snap_delta` introuvables).

- [ ] **Étape 6 : l'accroche (vert).** Dans `grid.rs`, insérer avant `#[cfg(test)]` :

```rust
fn dist2(a: (f64, f64), b: (f64, f64)) -> f64 {
    let (dx, dy) = (a.0 - b.0, a.1 - b.1);
    dx * dx + dy * dy
}

/// Ligne la plus proche sur un axe (`snapAxis` d'ActCraft) : indice borné à la première ligne `≥ 0` et, si `hi` est
/// donné, à la dernière `≤ hi` (borne nouvelle, HG10). `None` si la page n'a aucune ligne sur cet axe.
fn snap_axis(v: f64, origin: f64, step: f64, hi: Option<f64>) -> Option<f64> {
    let first = (-origin / step - EPS).ceil();
    let last = hi.map_or(f64::INFINITY, |h| ((h - origin) / step + EPS).floor());
    if first.is_nan() || last.is_nan() || first > last {
        return None;
    }
    Some(origin + ((v - origin) / step).round().clamp(first, last) * step)
}

/// Ligne de portée la plus proche (`music`, G3) : 5 lignes à `sy`, une portée tous les `10·sy`, lignes `y ≥ 0` seules.
fn snap_staff(y: f64, oy: f64, sy: f64) -> Option<f64> {
    let period = 10.0 * sy;
    let first = ((-oy - 4.0 * sy) / period - EPS).ceil();
    let k0 = ((y - oy - 2.0 * sy) / period).round().max(first);
    let mut best: Option<f64> = None;
    for k in [k0 - 1.0, k0, k0 + 1.0] {
        for l in 0..5 {
            let c = oy + k * period + f64::from(l) * sy;
            if c < -EPS * sy {
                continue;
            }
            if best.is_none_or(|b| (c - y).abs() < (b - y).abs()) {
                best = Some(c);
            }
        }
    }
    best
}

/// Sommet du réseau isométrique le plus proche (G3, G6), côté `s = spacingX` : base `b1 = (s·√3/2, s/2)`, `b2 = (0, s)`,
/// déjà réduite (`nearestLatticePoint` d'ActCraft). Colonnes `x = ox + u·s·√3/2` : la plus proche et ses deux voisines,
/// bornées à `0 ≤ x ≤ width` ; dans chaque colonne (pas vertical `s`), le sommet le plus proche borné à `y ≥ 0`. Les
/// colonnes `u ± 2` ont le même décalage vertical que `u` et sont plus loin : ces trois colonnes suffisent, et aucun
/// voisin hors page n'est jamais rendu.
fn snap_lattice(l: &GridLevelView, width: f64, (x, y): (f64, f64)) -> Option<(f64, f64)> {
    let s = l.spacing_x;
    let h = s * 3f64.sqrt() / 2.0;
    let (ox, oy) = (l.origin_x, l.origin_y);
    let umin = (-ox / h - EPS).ceil();
    let umax = ((width - ox) / h + EPS).floor();
    if umin.is_nan() || umax.is_nan() || umin > umax {
        return None;
    }
    let u0 = ((x - ox) / h).round().clamp(umin, umax);
    let mut best: Option<((f64, f64), f64)> = None;
    for u in [u0 - 1.0, u0, u0 + 1.0] {
        if u < umin || u > umax {
            continue;
        }
        let base = oy + u * s / 2.0;
        let vmin = (-base / s - EPS).ceil();
        let v = ((y - base) / s).round().max(vmin);
        let q = (ox + u * h, base + v * s);
        let d = dist2(q, (x, y));
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some((q, d));
        }
    }
    best.map(|(q, _)| q)
}

/// Point aimanté d'un niveau (G3) ; `None` pour un `kind` inconnu ou une page sans ligne.
fn snap_level(l: &GridLevelView, width: f64, (x, y): (f64, f64)) -> Option<(f64, f64)> {
    let (sx, sy, ox, oy) = (l.spacing_x, l.spacing_y, l.origin_x, l.origin_y);
    match l.kind.as_str() {
        "squares" | "dots" => Some((
            snap_axis(x, ox, sx, Some(width))?,
            snap_axis(y, oy, sy, None)?,
        )),
        "lines" => Some((x, snap_axis(y, oy, sy, None)?)),
        "seyes" => Some((
            snap_axis(x, ox, sx, Some(width))?,
            snap_axis(y, oy, sy / 4.0, None)?,
        )),
        "music" => Some((x, snap_staff(y, oy, sy)?)),
        "isometric" => snap_lattice(l, width, (x, y)),
        _ => None,
    }
}

/// Point aimanté (G6, `nearestGridPoint` d'ActCraft) : `None` si le magnétisme est coupé ou si aucun niveau aimanté
/// d'un type connu n'accroche ; sinon le candidat le plus proche (distance euclidienne, sans seuil), le premier niveau
/// gagnant à égalité. Une grille ou un niveau invisible accroche quand même (HG3).
pub fn snap_point(g: &GridView, width: f64, p: (f64, f64)) -> Option<(f64, f64)> {
    if !g.snap {
        return None;
    }
    let mut best: Option<((f64, f64), f64)> = None;
    for l in g.levels.iter().filter(|l| l.snap && is_known_kind(&l.kind)) {
        let Some(q) = snap_level(l, width, p) else {
            continue;
        };
        let d = dist2(q, p);
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some((q, d));
        }
    }
    best.map(|(q, _)| q)
}

/// Déplacement aimanté (G7) : candidats = 4 coins puis centre de `b`, déplacés de `(dx, dy)` ; on garde celui dont le
/// point aimanté est le plus proche (le premier à égalité) et le déplacement est corrigé d'autant ; brut sans accroche.
pub fn snap_delta(g: &GridView, width: f64, b: Bounds, (dx, dy): (f64, f64)) -> (f64, f64) {
    let (cx, cy) = ((b.x0 + b.x1) / 2.0, (b.y0 + b.y1) / 2.0);
    let mut best: Option<((f64, f64), f64)> = None;
    for (x, y) in [(b.x0, b.y0), (b.x1, b.y0), (b.x0, b.y1), (b.x1, b.y1), (cx, cy)] {
        let c = (x + dx, y + dy);
        let Some(q) = snap_point(g, width, c) else {
            continue;
        };
        let d = dist2(q, c);
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some(((q.0 - c.0, q.1 - c.1), d));
        }
    }
    best.map_or((dx, dy), |((ex, ey), _)| (dx + ex, dy + ey))
}
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -8` → `9 passed`.

- [ ] **Étape 7 : tests des lignes visibles (rouge).** À la fin de `mod tests` de `grid.rs`, ajouter :

```rust
    /// Abscisses des verticales et ordonnées des horizontales d'un groupe.
    fn segs(l: &LevelLines) -> (Vec<f64>, Vec<f64>) {
        let (mut v, mut h) = (Vec::new(), Vec::new());
        for s in l.segments.chunks_exact(4) {
            if s[0] == s[2] {
                v.push(s[0]);
            } else if s[1] == s[3] {
                h.push(s[1]);
            }
        }
        (v, h)
    }

    const ZOOMS: [f64; 5] = [0.15, 0.37, 1.0, 2.5, 8.0];

    /// Partie visible du montage S5 (même formule que `visibleGridRect` de la page).
    fn view_rect(z: f64) -> Bounds {
        let (tx, ty) = (13.3, -1_000_007.0 * z);
        Bounds {
            x0: -tx / z,
            y0: -ty / z,
            x1: (800.0 - tx) / z,
            y1: (600.0 - ty) / z,
        }
    }

    fn at(g: &GridView, z: f64) -> GridLines {
        lines(g, W, view_rect(z), 4.0 / z, 8.0 / z).expect("grille visible")
    }

    fn colored(kind: &str, s: f64, color: &str) -> GridLevelView {
        GridLevelView {
            color: color.into(),
            ..level(kind, s, s)
        }
    }

    fn groups(l: &GridLines) -> Vec<(String, f64)> {
        l.levels.iter().map(|x| (x.color.clone(), x.alpha)).collect()
    }

    /// S5 (a) côté cœur, z = 1 : 20 verticales x = 40·i, 15 horizontales loin sous le haut de page.
    #[test]
    fn grid_squares_far_down_the_page_depend_on_the_view_only() {
        let l = at(&grid(vec![level("squares", 40.0, 40.0)]), 1.0);
        assert_eq!(l.levels.len(), 1);
        let (v, h) = segs(&l.levels[0]);
        assert_eq!(v, (0..20).map(|i| 40.0 * f64::from(i)).collect::<Vec<_>>());
        assert_eq!(
            h,
            (0..15).map(|k| 1_000_040.0 + 40.0 * f64::from(k)).collect::<Vec<_>>()
        );
    }

    /// G9, S5 « Présence » : famille sous 4 px sautée (Seyès fin avant principal), points sous 8 px sautés.
    #[test]
    fn grid_families_finer_than_four_pixels_are_skipped() {
        let a = grid(vec![
            colored("squares", 40.0, "#400000"),
            colored("squares", 20.0, "#200000"),
        ]);
        let b = grid(vec![colored("seyes", 30.24, "#3a5f0b")]);
        let c = grid(vec![colored("dots", 40.0, "#00ff00")]);
        let main = |color: &str| (color.to_string(), 1.0);
        assert_eq!(groups(&at(&a, 0.15)), vec![main("#400000")]);
        assert_eq!(groups(&at(&a, 0.37)), vec![main("#400000"), main("#200000")]);
        assert_eq!(groups(&at(&b, 0.15)), vec![main("#3a5f0b")]);
        assert_eq!(groups(&at(&b, 0.37)), vec![main("#3a5f0b")]);
        assert!(at(&c, 0.15).levels.is_empty());
        assert_eq!(groups(&at(&c, 0.37)), vec![main("#00ff00")]);
        for &z in &ZOOMS[2..] {
            assert_eq!(at(&a, z).levels.len(), 2, "z = {z}");
            assert_eq!(
                groups(&at(&b, z)),
                vec![main("#3a5f0b"), ("#3a5f0b".to_string(), SEYES_FINE_ALPHA)],
                "z = {z}"
            );
            assert_eq!(at(&c, z).levels.len(), 1, "z = {z}");
        }
    }

    /// G9, S5 « Pour tous les cas » : au plus 202 verticales et 152 horizontales par famille, 65 536 points par niveau.
    #[test]
    fn grid_line_and_dot_counts_are_bounded_by_the_view() {
        let all = [
            grid(vec![level("squares", 40.0, 40.0)]),
            grid(vec![level("squares", 20.0, 20.0)]),
            grid(vec![level("seyes", 30.24, 30.24)]),
            grid(vec![level("dots", 40.0, 40.0)]),
            grid(vec![level("isometric", 40.0, 40.0)]),
            grid(vec![level("music", 12.0, 12.0)]),
        ];
        for z in ZOOMS {
            for g in &all {
                for l in at(g, z).levels {
                    let (v, h) = segs(&l);
                    assert!(v.len() <= 202, "{} z = {z} : {} verticales", g.levels[0].kind, v.len());
                    assert!(h.len() <= 152, "{} z = {z} : {} horizontales", g.levels[0].kind, h.len());
                    assert!(l.dots.len() / 2 <= MAX_GRID_DOTS);
                }
            }
        }
    }

    /// G9, Review Focus 1 : plafond des points et des familles ; un niveau entier sauté, jamais tronqué.
    #[test]
    fn dots_over_the_cap_skip_the_whole_level() {
        let page = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 1080.0,
        };
        let g = grid(vec![level("dots", 1.0, 1.0)]);
        assert!(lines(&g, W, page, 0.0, 0.0).expect("visible").levels.is_empty());
        let small = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 99.0,
            y1: 99.0,
        };
        assert_eq!(
            lines(&g, W, small, 0.0, 0.0).expect("visible").levels[0].dots.len(),
            2 * 100 * 100
        );
        let thin = grid(vec![level("squares", 0.001, 0.001)]);
        assert!(lines(&thin, W, page, 0.0, 0.0).expect("visible").levels.is_empty());
    }

    /// G9 : grille invisible → `None` ; niveau invisible ou inconnu sauté ; vue hors page ou non finie → rien ;
    /// segments limités à `rect ∩ page` ; `above` recopié.
    #[test]
    fn grid_invisible_unknown_hidden_and_off_page_views() {
        let page = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 1080.0,
        };
        let mut hidden = grid(vec![level("squares", 40.0, 40.0)]);
        hidden.visible = false;
        assert_eq!(lines(&hidden, W, page, 4.0, 8.0), None);
        let skipped = grid(vec![
            level("hexagon", 40.0, 40.0),
            GridLevelView {
                visible: false,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert!(lines(&skipped, W, page, 4.0, 8.0).expect("visible").levels.is_empty());
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        for r in [
            Bounds {
                x0: 0.0,
                y0: -500.0,
                x1: W,
                y1: -10.0,
            },
            Bounds {
                x0: 2000.0,
                y0: 0.0,
                x1: 2500.0,
                y1: 100.0,
            },
            Bounds {
                x0: f64::NAN,
                ..page
            },
        ] {
            assert!(lines(&g, W, r, 4.0, 8.0).expect("visible").levels.is_empty(), "{r:?}");
        }
        let wide = Bounds {
            x0: -100.0,
            y0: -100.0,
            x1: 3000.0,
            y1: 50.0,
        };
        let l = lines(&g, W, wide, 4.0, 8.0).expect("visible");
        for s in l.levels[0].segments.chunks_exact(4) {
            assert!((0.0..=W).contains(&s[0]) && (0.0..=W).contains(&s[2]), "{s:?}");
            assert!((0.0..=50.0).contains(&s[1]) && (0.0..=50.0).contains(&s[3]), "{s:?}");
        }
        let mut up = grid(vec![level("squares", 40.0, 40.0)]);
        up.above = true;
        assert!(lines(&up, W, page, 4.0, 8.0).expect("visible").above);
    }

    /// G3 : obliques à ±30° par les sommets, verticales au pas s·√3/2 ; portées de 5 lignes ; `lines` sans verticale.
    #[test]
    fn grid_isometric_lines_pass_through_vertices_and_music_draws_staves() {
        let h = 40.0 * 3f64.sqrt() / 2.0;
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 200.0,
            y1: 200.0,
        };
        let iso = lines(&grid(vec![level("isometric", 40.0, 40.0)]), W, r, 1.0, 1.0).expect("visible");
        let s = &iso.levels[0].segments;
        assert_eq!(segs(&iso.levels[0]).0.len(), 6);
        assert!(s.iter().all(|c| (-1e-9..=200.0 + 1e-9).contains(c)));
        let on = |px: f64, py: f64, sign: f64| {
            s.chunks_exact(4).any(|q| {
                let (dx, dy) = (q[2] - q[0], q[3] - q[1]);
                dx > 0.0
                    && (dy / dx - sign / 3f64.sqrt()).abs() < 1e-9
                    && ((py - q[1]) - (px - q[0]) * dy / dx).abs() < 1e-6
                    && (q[0] - 1e-9..=q[2] + 1e-9).contains(&px)
            })
        };
        assert!(on(h, 20.0, 1.0) && on(h, 20.0, -1.0) && on(2.0 * h, 40.0, 1.0));
        let tiny = lines(&grid(vec![level("isometric", 4.0, 4.0)]), W, r, 4.0, 4.0).expect("visible");
        assert!(tiny.levels.is_empty(), "côté 4 : s·√3/2 ≈ 3,46 < 4");
        let staves = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 239.0,
        };
        let music = lines(&grid(vec![level("music", 7.0, 12.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert_eq!(
            segs(&music.levels[0]).1,
            vec![0.0, 12.0, 24.0, 36.0, 48.0, 120.0, 132.0, 144.0, 156.0, 168.0]
        );
        let only_h = lines(&grid(vec![level("lines", 40.0, 40.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert!(segs(&only_h.levels[0]).0.is_empty());
    }
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -5` → `error[E0425]` (`lines` introuvable).

- [ ] **Étape 8 : les lignes visibles (vert).** Dans `grid.rs`, insérer avant `#[cfg(test)]` :

```rust
/// Indices `k` (premier, dernier) tels que `o + k·step` ∈ [lo, hi] ; `(0, -1)` si aucun ; `None` si leur nombre dépasse
/// `MAX_GRID_DOTS` (famille sautée entière) ou n'est pas fini.
fn indices(o: f64, step: f64, lo: f64, hi: f64) -> Option<(i64, i64)> {
    let first = ((lo - o) / step - EPS).ceil();
    let last = ((hi - o) / step + EPS).floor();
    if !first.is_finite() || !last.is_finite() {
        return None;
    }
    if last < first {
        return Some((0, -1));
    }
    if last - first + 1.0 > MAX_GRID_DOTS as f64 {
        return None;
    }
    Some((first as i64, last as i64))
}

fn verticals(out: &mut Vec<f64>, o: f64, step: f64, c: &Bounds) {
    if let Some((a, b)) = indices(o, step, c.x0, c.x1) {
        for k in a..=b {
            let x = o + k as f64 * step;
            out.extend([x, c.y0, x, c.y1]);
        }
    }
}

fn horizontals(out: &mut Vec<f64>, o: f64, step: f64, c: &Bounds, keep: impl Fn(i64) -> bool) {
    if let Some((a, b)) = indices(o, step, c.y0, c.y1) {
        for k in (a..=b).filter(|k| keep(*k)) {
            let y = o + k as f64 * step;
            out.extend([c.x0, y, c.x1, y]);
        }
    }
}

/// Portées (`music`) : 5 lignes à `sy`, une portée tous les `10·sy`.
fn staves(out: &mut Vec<f64>, oy: f64, sy: f64, c: &Bounds) {
    let period = 10.0 * sy;
    if let Some((a, b)) = indices(oy, period, c.y0 - 4.0 * sy, c.y1) {
        for k in a..=b {
            for l in 0..5 {
                let y = oy + k as f64 * period + f64::from(l) * sy;
                if (c.y0..=c.y1).contains(&y) {
                    out.extend([c.x0, y, c.x1, y]);
                }
            }
        }
    }
}

/// Segment de la droite `(px, py) + t·(dx, dy)` dans `c` (Liang-Barsky) ; `None` si elle ne le traverse pas.
fn clip_line((px, py): (f64, f64), (dx, dy): (f64, f64), c: &Bounds) -> Option<[f64; 4]> {
    let (mut t0, mut t1) = (f64::NEG_INFINITY, f64::INFINITY);
    for (p, q) in [
        (-dx, px - c.x0),
        (dx, c.x1 - px),
        (-dy, py - c.y0),
        (dy, c.y1 - py),
    ] {
        if p == 0.0 {
            if q < 0.0 {
                return None;
            }
            continue;
        }
        let r = q / p;
        if p < 0.0 {
            t0 = t0.max(r);
        } else {
            t1 = t1.min(r);
        }
    }
    if t0 < t1 {
        Some([px + t0 * dx, py + t0 * dy, px + t1 * dx, py + t1 * dy])
    } else {
        None
    }
}

/// Réseau isométrique (G3) : verticales au pas `s·√3/2`, puis deux familles `y = oy + n·s ± (x − ox)/√3`, qui passent
/// toutes par les sommets `ox + m·s·√3/2, oy + m·s/2 + n·s`.
fn triangles(out: &mut Vec<f64>, ox: f64, oy: f64, s: f64, c: &Bounds) {
    verticals(out, ox, s * 3f64.sqrt() / 2.0, c);
    let t = 1.0 / 3f64.sqrt();
    for sign in [1.0, -1.0] {
        let (ya, yb) = (sign * (c.x0 - ox) * t, sign * (c.x1 - ox) * t);
        let Some((a, b)) = indices(oy, s, c.y0 - ya.max(yb), c.y1 - ya.min(yb)) else {
            continue;
        };
        for n in a..=b {
            if let Some(seg) = clip_line((ox, oy + n as f64 * s), (1.0, sign * t), c) {
                out.extend(seg);
            }
        }
    }
}

/// Points d'un niveau `dots` ; rien si leur nombre (colonnes × rangées) dépasse `MAX_GRID_DOTS`.
fn dot_grid(out: &mut Vec<f64>, l: &GridLevelView, c: &Bounds) {
    let (Some((ia, ib)), Some((ja, jb))) = (
        indices(l.origin_x, l.spacing_x, c.x0, c.x1),
        indices(l.origin_y, l.spacing_y, c.y0, c.y1),
    ) else {
        return;
    };
    let count = (ib - ia + 1).max(0) as u64 * (jb - ja + 1).max(0) as u64;
    if count > MAX_GRID_DOTS as u64 {
        return;
    }
    for j in ja..=jb {
        let y = l.origin_y + j as f64 * l.spacing_y;
        for i in ia..=ib {
            out.extend([l.origin_x + i as f64 * l.spacing_x, y]);
        }
    }
}

fn level_lines(l: &GridLevelView, c: &Bounds, min_step: f64, min_dot_step: f64, out: &mut Vec<LevelLines>) {
    let (sx, sy, ox, oy) = (l.spacing_x, l.spacing_y, l.origin_x, l.origin_y);
    let (mut main, mut fine, mut dots) = (Vec::new(), Vec::new(), Vec::new());
    match l.kind.as_str() {
        "squares" => {
            if sx >= min_step {
                verticals(&mut main, ox, sx, c);
            }
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
        }
        "lines" => {
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
        }
        "dots" => {
            if sx >= min_dot_step && sy >= min_dot_step {
                dot_grid(&mut dots, l, c);
            }
        }
        "isometric" => {
            if sx * 3f64.sqrt() / 2.0 >= min_step {
                triangles(&mut main, ox, oy, sx, c);
            }
        }
        "music" => {
            if sy >= min_step {
                staves(&mut main, oy, sy, c);
            }
        }
        "seyes" => {
            if sx >= min_step {
                verticals(&mut main, ox, sx, c);
            }
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
            if sy / 4.0 >= min_step {
                horizontals(&mut fine, oy, sy / 4.0, c, |k| k.rem_euclid(4) != 0);
            }
        }
        _ => {}
    }
    if !main.is_empty() || !dots.is_empty() {
        out.push(LevelLines {
            color: l.color.clone(),
            line: l.line.clone(),
            alpha: 1.0,
            segments: main,
            dots,
        });
    }
    if !fine.is_empty() {
        out.push(LevelLines {
            color: l.color.clone(),
            line: l.line.clone(),
            alpha: SEYES_FINE_ALPHA,
            segments: fine,
            dots: Vec::new(),
        });
    }
}

/// Lignes visibles (G9), en unités de page, limitées à `rect ∩ page` (`0 ≤ x ≤ width`, `y ≥ 0`). `None` si la grille est
/// invisible. Niveau invisible ou d'un `kind` inconnu sauté ; famille sautée si son pas est `< min_step` ; points sautés
/// si un pas est `< min_dot_step` ou si leur nombre dépasse `MAX_GRID_DOTS`. Le nombre de lignes dépend de `rect`,
/// jamais de la distance au haut de page.
pub fn lines(g: &GridView, width: f64, rect: Bounds, min_step: f64, min_dot_step: f64) -> Option<GridLines> {
    if !g.visible {
        return None;
    }
    let mut levels = Vec::new();
    let finite = [rect.x0, rect.y0, rect.x1, rect.y1, width]
        .iter()
        .all(|v| v.is_finite());
    let c = Bounds {
        x0: rect.x0.max(0.0),
        y0: rect.y0.max(0.0),
        x1: rect.x1.min(width),
        y1: rect.y1,
    };
    if finite && c.x0 <= c.x1 && c.y0 <= c.y1 {
        for l in g.levels.iter().filter(|l| l.visible && is_known_kind(&l.kind)) {
            level_lines(l, &c, min_step, min_dot_step, &mut levels);
        }
    }
    Some(GridLines {
        above: g.above,
        levels,
    })
}
```

  `cargo test -p roomboard-core grid:: 2>&1 | tail -8` → `15 passed`.

- [ ] **Étape 9 : tests d'intégration (rouge).** À la fin du module `tests` de `commands.rs` (après
  `bad_grid_has_readable_message`), ajouter :

```rust
    fn grid_level(kind: &str, s: f64, color: &str) -> crate::grid::GridLevelView {
        crate::grid::GridLevelView {
            kind: kind.into(),
            spacing_x: s,
            spacing_y: s,
            origin_x: 0.0,
            origin_y: 0.0,
            color: color.into(),
            line: "solid".into(),
            snap: true,
            visible: true,
        }
    }

    fn grid_of(levels: Vec<crate::grid::GridLevelView>, snap: bool, above: bool) -> GridInput {
        GridInput {
            visible: true,
            snap,
            above,
            levels,
        }
    }

    fn apply_grid(d: &mut Document, page: &str, grid: Option<GridInput>) -> Result<Change, CommandError> {
        d.apply(Command::SetGrid {
            page: page.into(),
            grid,
        })
    }

    fn page_grid(d: &Document, page: &str) -> Option<GridInput> {
        d.page(page).and_then(|v| v.grid)
    }

    /// S1, G5 : une transaction, une étape ; annuler retire la grille, rétablir la remet.
    #[test]
    fn set_grid_is_one_step_then_undo_redo() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![grid_level("seyes", 30.24, "#7b68ee"), grid_level("dots", 40.0, "#000000")],
            true,
            true,
        );
        let w = writes(&d);
        let c = apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(w.since(), 1);
        assert_eq!(page_grid(&d, &p), Some(g.clone()));
        assert!(d.undo());
        assert_eq!(page_grid(&d, &p), None);
        assert!(d.redo());
        assert_eq!(page_grid(&d, &p), Some(g));
    }

    /// G5, D38 : même grille, ou rien à retirer : aucune transaction.
    #[test]
    fn set_grid_same_value_or_nothing_to_remove_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(vec![grid_level("squares", 40.0, "#cccccc")], true, false);
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        let v = d.version();
        let w = writes(&d);
        let same = apply_grid(&mut d, &p, Some(g)).expect("même grille");
        assert_eq!((same.pages.len(), same.version), (0, v));
        apply_grid(&mut d, &p, None).expect("retrait");
        let nothing = apply_grid(&mut d, &p, None).expect("rien à retirer");
        assert_eq!(nothing.pages.len(), 0);
        assert_eq!(w.since(), 1, "seul le retrait écrit");
    }

    /// G2 : `BadGrid` sans transaction ; page inconnue ; 16 niveaux et 0 niveau acceptés.
    #[test]
    fn set_grid_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let ok = grid_level("squares", 40.0, "#000000");
        let w = writes(&d);
        for bad in [
            crate::grid::GridLevelView {
                spacing_x: 0.0,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                spacing_y: f64::NAN,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                origin_x: f64::INFINITY,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                kind: String::new(),
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                color: String::new(),
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                line: String::new(),
                ..ok.clone()
            },
        ] {
            assert_eq!(
                apply_grid(&mut d, &p, Some(grid_of(vec![bad], true, false))),
                Err(CommandError::BadGrid)
            );
        }
        assert_eq!(
            apply_grid(&mut d, &p, Some(grid_of(vec![ok.clone(); 17], true, false))),
            Err(CommandError::BadGrid)
        );
        assert_eq!(
            apply_grid(&mut d, "nulle-part", None),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
        assert!(apply_grid(&mut d, &p, Some(grid_of(vec![ok; 16], true, false))).is_ok());
        assert!(apply_grid(&mut d, &p, Some(grid_of(Vec::new(), false, false))).is_ok());
    }

    /// S1 : A (deux niveaux) remplacée par B en un `SetGrid` ; annuler rend A à l'identique, dans l'ordre.
    #[test]
    fn replace_grid_then_undo_restores_both_levels() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = grid_of(
            vec![grid_level("squares", 40.0, "#111111"), grid_level("dots", 20.0, "#222222")],
            true,
            false,
        );
        let b = grid_of(vec![grid_level("music", 12.0, "#333333")], false, true);
        apply_grid(&mut d, &p, Some(a.clone())).expect("A");
        apply_grid(&mut d, &p, Some(b.clone())).expect("B");
        assert_eq!(page_grid(&d, &p), Some(b));
        assert!(d.undo());
        assert_eq!(page_grid(&d, &p), Some(a));
    }

    /// G14, S1, GC9 : trente rechargements gardent les octets et la vue (modèle `image_and_backdrop_reload_keep_bytes`).
    #[test]
    fn grid_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![grid_level("seyes", 30.24, "#7b68ee"), grid_level("dots", 40.0, "#000000")],
            true,
            true,
        );
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert_eq!(page_grid(&r, &p), Some(g.clone()), "vue au rechargement {i}");
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    /// S2, G4, G14 : niveau `hexagon` et clé inconnue écrits par yrs (version plus récente) : page lisible, gardés aux
    /// octets près, ni ligne ni accroche ; un `SetGrid` d'un niveau `hexagon` l'écrit aussi.
    #[test]
    fn newer_grid_kind_is_kept_drawn_nowhere_and_never_snaps() {
        use crate::format::{load, save, SaveMeta};
        use crate::query::Bounds;
        use yrs::ArrayPrelim;
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        {
            let mut txn = d.transact_local();
            page.insert(
                &mut txn,
                "grid",
                MapPrelim::from([
                    ("snap", In::Any(Any::Bool(true))),
                    ("futur", In::from("gardé")),
                    (
                        "levels",
                        In::Array(ArrayPrelim::from(vec![In::Map(MapPrelim::from([
                            ("kind", In::from("hexagon")),
                            ("spacingX", In::Any(Any::from(40.0))),
                            ("spacingY", In::Any(Any::from(40.0))),
                            ("rayon", In::Any(Any::from(3.0))),
                        ]))])),
                    ),
                ]),
            );
        }
        let g = page_grid(&d, &p).expect("grille lisible");
        assert_eq!(g.levels.len(), 1);
        assert_eq!(g.levels[0].kind, "hexagon");
        assert_eq!((g.visible, g.snap, g.above), (true, true, false));
        let all = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 1920.0,
            y1: 1080.0,
        };
        assert_eq!(d.grid_lines(&p, all, 0.0, 0.0).map(|l| l.levels.len()), Some(0));
        assert_eq!(d.snap_point(&p, 13.0, 17.0), None);
        let file = save(&d, &meta).expect("save");
        let r = load(&file).expect("load");
        assert!(save(&r, &meta).expect("resave") == file, "le niveau inconnu change les octets");
        assert_eq!(page_grid(&r, &p), Some(g));
        let hex = grid_of(vec![grid_level("hexagon", 40.0, "#123456")], true, false);
        apply_grid(&mut d, &p, Some(hex.clone())).expect("hexagon écrit");
        assert_eq!(page_grid(&d, &p), Some(hex));
        assert_eq!(d.snap_point(&p, 13.0, 17.0), None);
    }

    /// G5, HG4 : une page neuve n'a pas de grille ; retirer une page retire la sienne, annuler la remet.
    #[test]
    fn new_page_has_no_grid_and_removed_page_takes_its_grid() {
        let mut d = Document::blank();
        let p = first(&d);
        apply_grid(&mut d, &p, Some(grid_of(vec![grid_level("squares", 40.0, "#cccccc")], true, false)))
            .expect("grille");
        let q = d
            .apply(Command::AddPage {
                after: Some(p.clone()),
            })
            .expect("page")
            .pages[0]
            .clone();
        assert_eq!(page_grid(&d, &q), None);
        d.apply(Command::RemovePage { page: p.clone() }).expect("retrait");
        assert!(d.page(&p).is_none());
        assert!(d.undo());
        assert!(page_grid(&d, &p).is_some());
    }

    /// G7, HG6, S3 côté cœur : boîte géométrique (forme sans épaisseur) ; brut sans grille, sans élément, coupé.
    #[test]
    fn grid_snap_delta_uses_geometric_box() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = d.apply(rect(&p, [13.0, 17.0, 113.0, 77.0])).expect("a").ids[0].clone();
        let b = d
            .apply(Command::AddShape {
                page: p.clone(),
                shape: ShapeKind::Rect,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 60.0,
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 10.0,
                },
                fill: None,
            })
            .expect("b")
            .ids[0]
            .clone();
        assert_eq!(d.snap_delta(&p, std::slice::from_ref(&a), 52.0, 31.0), (52.0, 31.0), "sans grille");
        apply_grid(&mut d, &p, Some(grid_of(vec![grid_level("squares", 40.0, "#cccccc")], true, false)))
            .expect("grille");
        assert_eq!(d.snap_delta(&p, std::slice::from_ref(&a), 52.0, 31.0), (57.0, 33.0));
        assert_eq!(
            d.snap_delta(&p, std::slice::from_ref(&b), 2.0, 3.0),
            (0.0, 0.0),
            "boîte (0, 0)-(100, 60), pas le contour épaissi (−5, −5)-(105, 65)"
        );
        assert_eq!(d.snap_delta(&p, &[], 52.0, 31.0), (52.0, 31.0));
        apply_grid(&mut d, &p, Some(grid_of(vec![grid_level("squares", 40.0, "#cccccc")], false, false)))
            .expect("coupé");
        assert_eq!(d.snap_delta(&p, &[a], 52.0, 31.0), (52.0, 31.0));
    }
```

  À la fin de `crates/roomboard-core/tests/compat_socle.rs`, ajouter :

```rust
/// C9, S2 : le fichier du socle, écrit avant la grille, s'ouvre sans grille sur ses deux pages.
#[test]
fn socle_fixture_has_no_grid() {
    let doc = load(&socle_bytes()).expect("load");
    let pages = doc.page_ids();
    assert_eq!(pages.len(), 2);
    for p in pages {
        assert_eq!(doc.page(&p).expect("page").grid, None, "page {p}");
    }
}
```

  `cargo test -p roomboard-core grid 2>&1 | tail -5` → `error[E0599]` / `error[E0609]` (`SetGrid`, `grid`, `snap_delta`
  introuvables).

- [ ] **Étape 10 : intégration dans le cœur (vert).**
  - `element.rs` : ajouter `use crate::grid::GridView;` après `use crate::asset::is_asset_id;` ; dans `PageView`, après
    `pub backdrop: Option<BackdropView>,`, ajouter :

```rust
    /// Grille de page (U31, C9) ; `None` sans champ `grid` lisible (G4).
    pub grid: Option<GridView>,
```

  - `document.rs` : ajouter `use crate::grid::{self, GridLines, GridView};` et `use crate::query::Bounds;` après
    `use crate::history::History;` ; dans `page()`, après la ligne `backdrop: …,`, ajouter `grid: grid::read(&txn, &m),`.
    À la fin du bloc `impl Document` principal (juste avant la `}` qui suit `find_element`, ligne 480), ajouter :

```rust
    /// Grille et largeur d'une page ; `None` si la page est inconnue ou sans grille lisible.
    fn page_grid(&self, page: &str) -> Option<(GridView, f64)> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, page)?;
        let width = out_f64(m.get(&txn, "width"))?;
        Some((grid::read(&txn, &m)?, width))
    }

    /// Point aimanté de la page (G6) ; `None` sans grille, magnétisme coupé ou aucun niveau qui accroche.
    pub fn snap_point(&self, page: &str, x: f64, y: f64) -> Option<(f64, f64)> {
        let (g, width) = self.page_grid(page)?;
        grid::snap_point(&g, width, (x, y))
    }

    /// Déplacement aimanté (G7), toujours calculé depuis le déplacement brut ; brut sans grille ou sans boîte.
    pub fn snap_delta(&self, page: &str, ids: &[String], dx: f64, dy: f64) -> (f64, f64) {
        let Some((g, width)) = self.page_grid(page) else {
            return (dx, dy);
        };
        let Some(b) = self.snap_box(ids) else {
            return (dx, dy);
        };
        grid::snap_delta(&g, width, b, (dx, dy))
    }

    /// Lignes visibles de la grille de la page (G9) ; `None` sans grille ou grille invisible.
    pub fn grid_lines(&self, page: &str, rect: Bounds, min_step: f64, min_dot_step: f64) -> Option<GridLines> {
        let (g, width) = self.page_grid(page)?;
        grid::lines(&g, width, rect, min_step, min_dot_step)
    }
```

  - `query.rs` : à la fin du bloc `impl Document` (après `bounds`, avant sa `}`), ajouter :

```rust
    /// Boîte d'accroche (G7, HG6) : comme `bounds`, mais une forme compte sa boîte géométrique (0, 0)-(w, h) placée par
    /// sa transformation, sans l'épaisseur du trait ; texte, image, élément inconnu : leur boîte ; trait : son contour.
    pub fn snap_box(&self, ids: &[String]) -> Option<Bounds> {
        let txn = self.read();
        let mut acc: Option<Bounds> = None;
        for id in ids {
            let Some(found) = self.find_element(&txn, id) else {
                continue;
            };
            let e = &found.element;
            let b = match (read_shape(&txn, e), out_transform(e.get(&txn, "transform"))) {
                (Some(s), Some(t)) => world_bounds(&t, &box_polygon(s.w, s.h)),
                _ => self
                    .element_geom(&txn, e)
                    .and_then(|g| world_bounds(&g.transform, &g.outline)),
            };
            if let Some(b) = b {
                acc = Some(acc.map_or(b, |a| a.union(b)));
            }
        }
        acc
    }
```

  - `commands.rs` : ajouter `use crate::grid::{self, GridInput};` après `use crate::document::…;` ; en dernière variante
    de `Command` (après `SetBackdrop { … },`) :

```rust
    /// Grille de page (U31, C9) ; `None` retire la grille. Remplacée en bloc, une étape (G5).
    SetGrid {
        page: String,
        grid: Option<GridInput>,
    },
```

    en dernier bras du `match` d'`apply` (après le bras `Command::SetBackdrop { … } => { … }`) :

```rust
            Command::SetGrid { page, grid } => self.cmd_set_grid(&page, grid.as_ref()),
```

    et à la fin du bloc `impl Document` (avant sa `}`, ligne 934) :

```rust
    /// Grille de page (U31, G5) : validée (`BadGrid`, sans transaction), puis remplacée en bloc en une transaction
    /// `"local"` ; même valeur (comparée champ par champ sur la vue) ou rien à retirer : aucune transaction (D38).
    fn cmd_set_grid(&mut self, page: &str, input: Option<&GridInput>) -> Result<Change, CommandError> {
        if let Some(g) = input {
            grid::validate(g)?;
        }
        let (page_map, current) = {
            let txn = self.read();
            let (_, m) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let current = grid::read(&txn, &m);
            (m, current)
        };
        if current.as_ref() == input {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            grid::write(&mut txn, &page_map, input);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ..Default::default()
        }))
    }
```

  `cargo test -p roomboard-core grid 2>&1 | tail -20` → 0 échec, ≥ 25 tests, noms de la commande bornée présents.

- [ ] **Étape 11 : tout le crate, l'empreinte du socle, clippy, fmt.**
  `cargo test -p roomboard-core 2>&1 | tail -20` → aucun `FAILED` ; `cargo test -p roomboard-formats --test container 2>&1 | tail -5`
  → `socle_fixture_hash_is_pinned` vert ; `cargo fmt --all` puis `cargo fmt --all --check` ;
  `cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -10` → aucun avertissement (si clippy signale
  `manual_range_contains` ou `neg_cmp_op_on_partial_ord`, réécrire en `contains` ou en comparaison positive, sans
  changer le comportement).

- [ ] **Étape 12 : commits.**

```bash
cd "$WT" && git add crates/roomboard-core/src/grid.rs && git add crates/roomboard-core/src/lib.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): add page grid model, snapping and visible lines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
cd "$WT" && git add crates/roomboard-core/src/element.rs && git add crates/roomboard-core/src/document.rs && \
git add crates/roomboard-core/src/query.rs && git add crates/roomboard-core/src/commands.rs && \
git add crates/roomboard-core/tests/compat_socle.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): add SetGrid command, page grid view and snap queries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests « grid », sortie de clippy, et sept lignes `Réutilisation :` (une par ligne `Réutilise :`).

---

### Tâche T2 — Contrat TS et fausse liaison de la grille

<a id="tache-t2"></a>

**Objectif.** Élargir le contrat `api.ts` (types de grille, `SetGrid`, `PageView.grid`, `snapPoint`, `snapDelta`,
`gridLines`, G12), donner à la fausse liaison la parité du modèle, de la commande, de la lecture tolérante et de la
sauvegarde (G13), l'accroche et les lignes des seuls carreaux (DAG3, écart écrit en tête), contrôler `grid` dans
`toPageView`, et jouer le bloc « contrat C9 » sur la fausse liaison (S1, S2, S3, S4 côté contrat).

**Fichiers.**
- Modify : `apps/web/src/core/api.ts:1-8` (en-tête), `:29-62` (fin de `Command`), `:92-98` (`PageView`), `:108-133` (fin de `CoreDocument`), fin de fichier
- Modify : `apps/web/src/core/fake-core.ts:1-11` (en-tête), `:12-31` (imports), `:60` (`FakePage`), `:63-70` (`MESSAGES`), `:80-83` (`clone`), `:295` (`AddPage`), fin du `switch` d'`apply` (`:456`), `:473-477` (`page`), `:478-486` (`citedAssets`), fin de la classe (après `free()`), `:560` et `:590` (`SavedPage`, `save`), `:656` (`loadFake`), `:663` (`blank`), fin de fichier
- Modify : `apps/web/src/core/fake-core.test.ts` (fin de fichier)
- Modify : `apps/web/src/core/wasm-core.ts:4-17` (imports), `:132-148` (`toGridView`, `toPageView`)
- Modify : `apps/web/src/core/wasm-core.contract.test.ts:4` (import), `:147`, `:149`, `:714` (littéraux `grid: null`), fin de fichier (après `:912`)

**Interfaces.**
- Consomme (existant) : `fake-core.ts` `finitePositive`, `isRecord`, `boxPolygon`, `applyMatrix`, `step`, `unchanged`,
  `pageOf`, `find`, `bounds` ; `wasm-core.ts` `isRecord`, `PAGE`.
- Produit (exact, lu par T4, T5, T6) — `api.ts` :
  - `export const GRID_KINDS = ["squares", "lines", "dots", "isometric", "music", "seyes"] as const;` ; `export type GridKind = (typeof GRID_KINDS)[number];`
  - `export interface GridLevel { readonly kind: string; readonly spacingX: number; readonly spacingY: number; readonly originX: number; readonly originY: number; readonly color: string; readonly line: string; readonly snap: boolean; readonly visible: boolean }`
  - `export interface GridView { readonly visible: boolean; readonly snap: boolean; readonly above: boolean; readonly levels: readonly GridLevel[] }` ; `export type GridInput = GridView;`
  - `export interface LevelLines { readonly color: string; readonly line: string; readonly alpha: number; readonly segments: readonly number[]; readonly dots: readonly number[] }` ; `export interface GridLines { readonly above: boolean; readonly levels: readonly LevelLines[] }`
  - `export const MAX_GRID_LEVELS = 16;` ; `export const MAX_GRID_DOTS = 65_536;` ; `export const DEFAULT_GRID_COLOR = "#000000";`
  - `Command` : `| { readonly type: "SetGrid"; readonly page: string; readonly grid: GridInput | null }`
  - `PageView.grid: GridView | null`
  - `CoreDocument.snapPoint(page: string, x: number, y: number): readonly [number, number] | null` ; `CoreDocument.snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number]` ; `CoreDocument.gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null`
  - `wasm-core.ts` : `toPageView` rend `grid` (contrôlé par `toGridView`, non exportée) ; `wasm-core.contract.test.ts` : `BAD_GRID`, `gridLevel`, `gridOf`, `setGrid`, `c9Factories` (T6 les réutilise).
- Réutilise : `apps/web/src/core/wasm-core.ts:132-148` (`toBackdropView`, `toPageView`) — étendu par `toGridView` à côté, même règle (`undefined` → `null`, forme fausse → `PageView invalide`).
- Réutilise : `apps/web/src/core/fake-core.ts:105-122` (`backdropView`, `sameBackdrop`), `:73` (`finitePositive`) — `gridView`, `sameGrid` sur le même modèle ; `finitePositive` local réutilisé, aucune troisième copie.

**Patron à ne pas reprendre (concepteur-critique).**
1. Recopier en TS la géométrie des six types (DAG3) : seuls les carreaux accrochent et tracent ; écart écrit en tête
   de `fake-core.ts`, comme celui de la gomme partielle (`apps/web/src/core/fake-core.ts:4-7`).
2. `Math.round` pour l'indice de ligne : il arrondit `-1,5` vers `-1`, `f64::round` du cœur vers `-2` ; utiliser
   `roundHalfAway` pour la parité.
3. Prendre `this.bounds(ids)` comme boîte d'accroche (`apps/web/src/core/fake-core.ts:520-538` compte l'épaisseur de la
   forme par `shapePolygon`) : `snapBox` prend `boxPolygon(w, h)` pour une forme (G7).
4. Écrire `grid: null` dans chaque page sauvegardée : la sauvegarde JSON n'ajoute `grid` que si la page en a une (les
   sauvegardes existantes restent identiques).

**Test et commande bornée.**
`cd "$WT" && pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` → 0 échec ; le rapport cite le nombre de
tests des blocs « contrat C9 : fausse liaison » (≥ 9) et « grille de la fausse liaison (C9, G4) » (≥ 2) et
« contrôle de forme C9 (grille) » (1). Tests gardés verts : « toPageView et toAssetInfo : null pour rien, erreur pour une
forme fausse », « SetBackdrop (S3) … », « saveParts puis loadParts … » et le contrat commun (`describe.each`). Si
`node_modules` manque : `pnpm install --frozen-lockfile` à la racine.

**Preuve visuelle.** Aucune (contrat et fausse liaison).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 Dans `api.ts` et `fake-core.ts`, tout ajout va en fin d'union, d'interface, de `switch`, de classe ou de fichier ; aucune réorganisation (C7 en parallèle).
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC11 Message `BadGrid` mot pour mot : `grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)`.
- GC12 Ne pas toucher `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`.

**Interdits.** Brancher `SetGrid`, `snapPoint`, `snapDelta`, `gridLines` dans `WasmCoreDocument` (T6, après la
reconstruction du module) ; jouer le bloc C9 sur le vrai module (`c9Factories` reste filtré, T6 l'ouvre) ; toucher
`crates/`.

**Terminé quand.** La commande bornée est verte ; `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "src/core/wasm-core.ts" | wc -l`
→ `0` (seul `wasm-core.ts` signale les méthodes neuves du contrat, attendu jusqu'à T6) ; les commits sont faits.

**Étapes.**

- [ ] **Étape 1 : le contrat (`api.ts`).** En tête, après la ligne `// C2 : …`, ajouter :

```ts
// C9 : SetGrid ; PageView.grid ; snapPoint, snapDelta, gridLines (géométrie dans le cœur, DAG1 ; fausse liaison : carreaux seuls, DAG3).
```

  Remplacer la dernière ligne de l'union `Command` :

```ts
  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null };
```

  par :

```ts
  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null }
  /** grid null : retire la grille ; même grille : aucune étape (D38) ; remplacée en bloc, une étape (G5). */
  | { readonly type: "SetGrid"; readonly page: string; readonly grid: GridInput | null };
```

  Dans `PageView`, après `readonly backdrop: BackdropView | null;`, ajouter `readonly grid: GridView | null;`.
  Dans `CoreDocument`, après `free(): void;`, ajouter :

```ts
  /** Point aimanté de la page (G6) ; null sans grille, magnétisme coupé, aucun niveau qui accroche ou page inconnue. */
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null;
  /** Déplacement aimanté depuis le déplacement brut (G7) ; brut sans grille, sans magnétisme ou sans élément. */
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number];
  /** Lignes visibles de la grille dans `rect` (monde), familles sous `minStep` et points sous `minDotStep` sautés (G9). */
  gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null;
```

  En fin de fichier, ajouter :

```ts

/** Types de grille dessinés et aimantés (U31) ; tout autre kind est gardé tel quel, ignoré (C4). */
export const GRID_KINDS = ["squares", "lines", "dots", "isometric", "music", "seyes"] as const;
export type GridKind = (typeof GRID_KINDS)[number];
export const MAX_GRID_LEVELS = 16;
/** Plafond des points d'un niveau et des lignes d'une famille (G9). */
export const MAX_GRID_DOTS = 65_536;
export const DEFAULT_GRID_COLOR = "#000000";
/** Niveau de grille (U31) ; kind et line inconnus gardés tels quels (line inconnu dessiné plein). */
export interface GridLevel {
  readonly kind: string;
  readonly spacingX: number;
  readonly spacingY: number;
  readonly originX: number;
  readonly originY: number;
  readonly color: string;
  readonly line: string;
  readonly snap: boolean;
  readonly visible: boolean;
}
export interface GridView {
  readonly visible: boolean;
  readonly snap: boolean;
  readonly above: boolean;
  readonly levels: readonly GridLevel[];
}
/** Grille demandée par SetGrid : même forme que la vue. */
export type GridInput = GridView;
/** Groupe de lignes en unités de page : segments x0, y0, x1, y1 et points x, y à la suite. */
export interface LevelLines {
  readonly color: string;
  readonly line: string;
  readonly alpha: number;
  readonly segments: readonly number[];
  readonly dots: readonly number[];
}
export interface GridLines {
  readonly above: boolean;
  readonly levels: readonly LevelLines[];
}
```

- [ ] **Étape 2 : tests de la fausse liaison et du contrat (rouge).**
  Dans `wasm-core.contract.test.ts` : à la ligne 4, ajouter `GridInput, GridLevel` à l'import de types depuis `./api`.
  Lignes 147 et 149, ajouter `grid: null` aux attendus :

```ts
    expect(toPageView({ ...page, backdrop: undefined })).toEqual({ ...page, backdrop: null, grid: null });
```

```ts
    expect(toPageView({ ...page, backdrop: b })).toEqual({ ...page, backdrop: { ...b, w: null, rect: null }, grid: null });
```

  Ligne 714 :

```ts
    expect(before).toEqual({ id: p, width: 1920, height: 1080, background: "#ffffff", backdrop: null, grid: null });
```

  En fin de fichier (après `:912`), ajouter :

```ts

// C9 (grille, U31) : bloc joué sur la fausse liaison (T2), puis sur les deux fabriques quand le module est branché (T6).
const BAD_GRID = "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)";
const gridLevel = (kind: string, s: number, color = "#000000"): GridLevel => ({
  kind,
  spacingX: s,
  spacingY: s,
  originX: 0,
  originY: 0,
  color,
  line: "solid",
  snap: true,
  visible: true,
});
const gridOf = (levels: readonly GridLevel[], snap = true, above = false): GridInput => ({ visible: true, snap, above, levels });
const setGrid = (d: CoreDocument, page: string, grid: GridInput | null) => d.apply({ type: "SetGrid", page, grid });
const c9Factories = factories.filter(({ f }) => f === fakeCore);

describe("contrôle de forme C9 (grille)", () => {
  it("toPageView : grille contrôlée, undefined → null, forme fausse → erreur", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff", backdrop: undefined };
    const g = { visible: true, snap: false, above: true, levels: [gridLevel("hexagon", 40)] };
    expect(toPageView({ ...page, grid: g })?.grid).toEqual(g);
    expect(toPageView({ ...page, grid: undefined })?.grid).toBeNull();
    expect(() => toPageView({ ...page, grid: { ...g, levels: "x" } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, levels: [{ ...gridLevel("squares", 40), snap: 1 }] } })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, grid: { ...g, above: "oui" } })).toThrow("PageView invalide");
  });
});

describe.each(c9Factories)("contrat C9 : $name", ({ f }) => {
  it("SetGrid (S1) : une étape, page(p).grid égale à la demande ; annuler la retire, rétablir la remet", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.page(p)?.grid).toBeNull();
    const g = gridOf([gridLevel("seyes", 30.24, "#7b68ee"), gridLevel("dots", 40)], true, true);
    expect(setGrid(d, p, g).pages).toEqual([p]);
    expect(d.canUndo()).toBe(true);
    expect(d.page(p)?.grid).toEqual(g);
    d.undo();
    expect(d.page(p)?.grid).toBeNull();
    d.redo();
    expect(d.page(p)?.grid).toEqual(g);
    d.free();
  });

  it("SetGrid (G5) : même grille ou rien à retirer, sans étape ; null retire", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => setGrid(d, p, null));
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    unchanged(d, () => setGrid(d, p, gridOf([gridLevel("squares", 40)])));
    setGrid(d, p, null);
    expect(d.page(p)?.grid).toBeNull();
    d.free();
  });

  it("SetGrid (S1) : A (deux niveaux) remplacée par B en une étape ; annuler rend A à l'identique, dans l'ordre", () => {
    const d = f.blank();
    const p = first(d);
    const a = gridOf([gridLevel("squares", 40, "#111111"), gridLevel("dots", 20, "#222222")]);
    const b = gridOf([gridLevel("music", 12, "#333333")], false, true);
    setGrid(d, p, a);
    setGrid(d, p, b);
    expect(d.page(p)?.grid).toEqual(b);
    d.undo();
    expect(d.page(p)?.grid).toEqual(a);
    d.free();
  });

  it("SetGrid (G2) : niveau invalide ou 17 niveaux refusés sans étape, message du cœur ; page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    const ok = gridLevel("squares", 40);
    unchanged(d, () => {
      for (const bad of [
        { ...ok, spacingX: 0 },
        { ...ok, spacingY: Number.NaN },
        { ...ok, originX: Number.POSITIVE_INFINITY },
        { ...ok, kind: "" },
        { ...ok, color: "" },
        { ...ok, line: "" },
      ]) {
        expect(messageOf(() => setGrid(d, p, gridOf([bad])))).toBe(BAD_GRID);
      }
      expect(messageOf(() => setGrid(d, p, gridOf(Array.from({ length: 17 }, () => ok))))).toBe(BAD_GRID);
      expect(messageOf(() => setGrid(d, "nulle-part", null))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });

  it("SetGrid (S2) : kind et trait inconnus écrits et gardés ; ni ligne ni accroche pour le kind inconnu", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([{ ...gridLevel("hexagon", 40), line: "wavy" }]);
    setGrid(d, p, g);
    expect(d.page(p)?.grid).toEqual(g);
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 1920, y1: 1080 }, 4, 8)).toEqual({ above: false, levels: [] });
    d.free();
  });

  it("snapPoint (S4) : croisement le plus proche, bornes de la page ; null sans grille, sans magnétisme ou page inconnue", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40)]));
    expect(d.snapPoint(p, 13, 17)).toEqual([0, 0]);
    expect(d.snapPoint(p, 118, 97)).toEqual([120, 80]);
    expect(d.snapPoint(p, 1950, 10)).toEqual([1920, 0]);
    expect(d.snapPoint(p, -70, -90)).toEqual([0, 0]);
    expect(d.snapPoint("nulle-part", 13, 17)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40)], false));
    expect(d.snapPoint(p, 13, 17)).toBeNull();
    d.free();
  });

  it("snapDelta (S3) : coin ou centre de la boîte géométrique le plus proche ; brut sans grille ou sans élément", () => {
    const d = f.blank();
    const p = first(d);
    const rect = (x0: number, y0: number, x1: number, y1: number, width: number): string =>
      d.apply({ type: "AddShape", page: p, shape: "rect", x0, y0, x1, y1, style: { color: "#000000", width }, fill: null }).ids[0] ?? "";
    const a = rect(13, 17, 113, 77, 4);
    const b = rect(0, 0, 100, 60, 10);
    expect(d.snapDelta(p, [a], 52, 31)).toEqual([52, 31]);
    setGrid(d, p, gridOf([gridLevel("squares", 40, "#cccccc")]));
    expect(d.snapDelta(p, [a], 52, 31)).toEqual([57, 33]);
    expect(d.snapDelta(p, [b], 2, 3)).toEqual([0, 0]);
    expect(d.snapDelta(p, [], 52, 31)).toEqual([52, 31]);
    d.free();
  });

  it("gridLines (S5) : carreaux de 40 au loin sur la page, limités à la page ; famille sous le pas minimal sautée ; null invisible", () => {
    const d = f.blank();
    const p = first(d);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)).toBeNull();
    setGrid(d, p, gridOf([gridLevel("squares", 40, "#cccccc")], false, true));
    const r = { x0: -13.3, y0: 1_000_007, x1: 786.7, y1: 1_000_607 };
    const l = d.gridLines(p, r, 4, 8);
    expect(l?.above).toBe(true);
    expect(l?.levels.length).toBe(1);
    const segs = l?.levels[0]?.segments ?? [];
    expect(segs.length).toBe((20 + 15) * 4);
    expect(segs.slice(0, 4)).toEqual([0, 1_000_007, 0, 1_000_607]);
    expect(segs.slice(19 * 4, 20 * 4)).toEqual([760, 1_000_007, 760, 1_000_607]);
    expect(segs.slice(20 * 4, 21 * 4)).toEqual([0, 1_000_040, 786.7, 1_000_040]);
    expect(d.gridLines(p, r, 41, 8)?.levels).toEqual([]);
    setGrid(d, p, { ...gridOf([gridLevel("squares", 40)]), visible: false });
    expect(d.gridLines(p, r, 4, 8)).toBeNull();
    d.free();
  });

  it("save puis load (S1) : grille gardée, octets stables ; page neuve sans grille (G5)", () => {
    const d = f.blank();
    const p = first(d);
    const g = gridOf([gridLevel("seyes", 30.24, "#7b68ee"), gridLevel("dots", 40)], true, true);
    setGrid(d, p, g);
    const q = d.apply({ type: "AddPage", after: p }).pages[0] ?? "";
    expect(d.page(q)?.grid).toBeNull();
    const file = d.save(now, "0.1.0");
    const e = f.load(file);
    expect(e.page(p)?.grid).toEqual(g);
    expect(e.save(now, "0.1.0")).toEqual(file);
    e.free();
    d.free();
  });
});
```

  Dans `fake-core.test.ts`, en fin de fichier, ajouter :

```ts

describe("grille de la fausse liaison (C9, G4)", () => {
  const withGrid = (grid: unknown): CoreDocument => {
    const d = fakeCore.blank();
    const raw = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: Record<string, unknown>[] };
    raw.pages[0] = { ...(raw.pages[0] ?? {}), grid };
    return fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
  };

  it("grille qui n'est pas un objet : null, page lisible ; sans levels ou levels non tableau : levels [] (S2)", () => {
    const bad = withGrid("pas une grille");
    expect(bad.page(firstPage(bad))?.grid).toBeNull();
    const empty = withGrid({});
    expect(empty.page(firstPage(empty))?.grid).toEqual({ visible: true, snap: false, above: false, levels: [] });
    const flat = withGrid({ levels: "x", visible: false });
    expect(flat.page(firstPage(flat))?.grid).toEqual({ visible: false, snap: false, above: false, levels: [] });
  });

  it("niveau sans pas finis > 0 ou qui n'est pas un objet : absent de la vue, gardé au save ; défauts champ par champ", () => {
    const levels = ["x", { kind: "squares", spacingX: 0, spacingY: 40 }, { kind: "squares", spacingX: 40, spacingY: 20, originX: "n", futur: 1 }];
    const d = withGrid({ snap: true, levels });
    const p = firstPage(d);
    expect(d.page(p)?.grid?.levels).toEqual([
      { kind: "squares", spacingX: 40, spacingY: 20, originX: 0, originY: 0, color: "#000000", line: "solid", snap: true, visible: true },
    ]);
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { grid?: unknown }[] };
    expect(saved.pages[0]?.grid).toEqual({ snap: true, levels });
  });
});
```

  `pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` → échecs attendus (`d.snapPoint is not a function`,
  `grid` absent des vues, `toPageView` sans `grid`).

- [ ] **Étape 3 : `toGridView` dans `wasm-core.ts`.** Ajouter `GridLevel, GridView` à l'import de types depuis `./api`.
  Juste avant `export function toPageView`, ajouter :

```ts
function toGridLevel(v: unknown): GridLevel {
  if (!isRecord(v)) throw new Error(PAGE);
  const { kind, spacingX, spacingY, originX, originY, color, line, snap, visible } = v;
  if (
    typeof kind !== "string" ||
    typeof spacingX !== "number" ||
    typeof spacingY !== "number" ||
    typeof originX !== "number" ||
    typeof originY !== "number" ||
    typeof color !== "string" ||
    typeof line !== "string" ||
    typeof snap !== "boolean" ||
    typeof visible !== "boolean"
  ) {
    throw new Error(PAGE);
  }
  return { kind, spacingX, spacingY, originX, originY, color, line, snap, visible };
}

// Grille (C9, G12) : `undefined` (Option::None) → null, comme le fond ; forme fausse → erreur.
function toGridView(v: unknown): GridView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { visible, snap, above, levels } = v;
  if (typeof visible !== "boolean" || typeof snap !== "boolean" || typeof above !== "boolean" || !Array.isArray(levels)) {
    throw new Error(PAGE);
  }
  return { visible, snap, above, levels: levels.map(toGridLevel) };
}
```

  Dans `toPageView`, remplacer la ligne de retour par :

```ts
  return { id, width, height, background, backdrop: toBackdropView(v["backdrop"]), grid: toGridView(v["grid"]) };
```

- [ ] **Étape 4 : la fausse liaison (`fake-core.ts`).**
  - En tête, après le paragraphe `// C2 : …`, ajouter :

```ts
// C9 : grille de page (`SetGrid`, `page(id).grid`) au modèle du cœur, lecture tolérante et sauvegarde comprises.
// Écart assumé, exclu du contrat commun (DAG3) : `snapPoint`, `snapDelta` et `gridLines` ne connaissent que le kind
// `squares` ; lines, dots, isometric, music et seyes n'accrochent pas et ne tracent rien ici : ils se testent dans
// `grid.rs` et sur le vrai module (bloc « contrat C9 : vrai module seulement »).
```

  - Imports : ajouter `GridInput, GridLevel, GridLines, GridView, LevelLines` à l'import de types depuis `./api`, et
    `DEFAULT_GRID_COLOR, MAX_GRID_DOTS, MAX_GRID_LEVELS` à l'import de valeurs depuis `./api`.
  - `FakePage` devient :

```ts
interface FakePage { readonly id: string; readonly elements: FakeElement[]; backdrop: RawRecord | null; grid: RawRecord | null }
```

  - `MESSAGES` : ajouter en dernière entrée
    `badGrid: "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)",`.
  - `clone` : `pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements], backdrop: p.backdrop, grid: p.grid })),`.
  - `AddPage` : `s.pages.splice(at, 0, { id, elements: [], backdrop: null, grid: null });`.
  - En dernier `case` du `switch` d'`apply` (après `case "SetBackdrop": { … }`) :

```ts
      case "SetGrid": {
        // Même ordre que le cœur : grille, puis page ; même grille (sur la vue) ou rien à retirer : aucune étape.
        const g = cmd.grid;
        if (g !== null && !validGrid(g)) throw new Error(MESSAGES.badGrid);
        if (sameGrid(gridView(this.pageOf(cmd.page).grid), g)) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.grid = g === null ? null : gridRecord(g);
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
```

  - `page()` : `return { id, width: PAGE_WIDTH, height: PAGE_HEIGHT, background: "#ffffff", backdrop: backdropView(p.backdrop, PAGE_WIDTH), grid: gridView(p.grid) };`
  - `citedAssets()` : après `scanAssets(p.backdrop, acc);`, ajouter `scanAssets(p.grid, acc);` (le cœur balaie toute la page).
  - À la fin de la classe, après `free(): void { … }`, ajouter :

```ts
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null {
    const g = this.gridOfPage(page);
    return g === null ? null : snapSquares(g, PAGE_WIDTH, x, y);
  }
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number] {
    const g = this.gridOfPage(page);
    const b = this.snapBox(ids);
    if (g === null || b === null) return [dx, dy];
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    let best: [number, number] | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1], [cx, cy]] as const) {
      const c0 = x + dx;
      const c1 = y + dy;
      const q = snapSquares(g, PAGE_WIDTH, c0, c1);
      if (q === null) continue;
      const d = dist2(q[0], q[1], c0, c1);
      if (best === null || d < bestD) {
        best = [q[0] - c0, q[1] - c1];
        bestD = d;
      }
    }
    return best === null ? [dx, dy] : [dx + best[0], dy + best[1]];
  }
  gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null {
    void minDotStep; // points : vrai module seulement (DAG3)
    const g = this.gridOfPage(page);
    return g === null ? null : squaresLines(g, PAGE_WIDTH, rect, minStep);
  }
  private gridOfPage(page: string): GridView | null {
    const p = this.state.pages.find((q) => q.id === page);
    return p ? gridView(p.grid) : null;
  }
  /** Boîte d'accroche (G7) : forme = boîte (0, 0)-(w, h) sans l'épaisseur du trait ; autre élément : `bounds`. */
  private snapBox(ids: readonly string[]): Bounds | null {
    let acc: Bounds | null = null;
    for (const id of ids) {
      const e = this.find(id)?.element;
      if (!e) continue;
      let box: Bounds | null = null;
      if (e.shape) {
        const poly = boxPolygon(e.shape.w, e.shape.h);
        for (let i = 0; i + 1 < poly.length; i += 2) {
          const [x, y] = applyMatrix(e.transform, poly[i] ?? 0, poly[i + 1] ?? 0);
          box = box === null
            ? { x0: x, y0: y, x1: x, y1: y }
            : { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) };
        }
      } else {
        box = this.bounds([id]);
      }
      if (box === null) continue;
      acc = acc === null
        ? box
        : { x0: Math.min(acc.x0, box.x0), y0: Math.min(acc.y0, box.y0), x1: Math.max(acc.x1, box.x1), y1: Math.max(acc.y1, box.y1) };
    }
    return acc;
  }
```

  - `SavedPage` devient `interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown; grid?: unknown }`.
  - `save` : `pages: this.state.pages.map((p) => ({ id: p.id, backdrop: p.backdrop, elements: p.elements.map(savedElement), ...(p.grid !== null ? { grid: p.grid } : {}) })),`
  - `loadFake` : dans l'objet de page, après `backdrop: …,`, ajouter `grid: isRecord(p.grid) ? p.grid : null,`.
  - `blank` : `pages: [{ id: newId(), elements: [], backdrop: null, grid: null }]`.
  - En fin de fichier, ajouter :

```ts

// --- Grille (C9) : mêmes règles que `crates/roomboard-core/src/grid.rs` pour le modèle ; carreaux seuls pour le reste.
/** Tolérance d'indice, en pas (celle de `grid.rs`). */
const GRID_EPS = 1e-9;
const boolOr = (v: unknown, d: boolean): boolean => (typeof v === "boolean" ? v : d);
const finiteOr = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
/** `f64::round` du cœur : moitié loin de zéro (Math.round arrondit -1,5 vers -1, le cœur vers -2). */
const roundHalfAway = (v: number): number => Math.sign(v) * Math.round(Math.abs(v));
const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

/** Niveau vu comme par le cœur (G4) : sans pas finis > 0, absent ; défauts champ par champ. */
function gridLevelView(raw: unknown): GridLevel | null {
  if (!isRecord(raw)) return null;
  const { kind, spacingX, spacingY, originX, originY, color, line, snap, visible } = raw;
  if (!finitePositive(spacingX) || !finitePositive(spacingY)) return null;
  return {
    kind: typeof kind === "string" ? kind : "",
    spacingX,
    spacingY,
    originX: finiteOr(originX, 0),
    originY: finiteOr(originY, 0),
    color: typeof color === "string" ? color : DEFAULT_GRID_COLOR,
    line: typeof line === "string" ? line : "solid",
    snap: boolOr(snap, true),
    visible: boolOr(visible, true),
  };
}

/** Grille vue comme par le cœur (G4) : levels absent ou non tableau → [] ; têtes absentes → visible, sans aimant, dessous. */
function gridView(raw: RawRecord | null): GridView | null {
  if (raw === null) return null;
  const levels = raw["levels"];
  return {
    visible: boolOr(raw["visible"], true),
    snap: boolOr(raw["snap"], false),
    above: boolOr(raw["above"], false),
    levels: Array.isArray(levels) ? levels.map(gridLevelView).filter((l): l is GridLevel => l !== null) : [],
  };
}

const LEVEL_KEYS = ["kind", "spacingX", "spacingY", "originX", "originY", "color", "line", "snap", "visible"] as const;
/** Même grille, champ par champ sur la vue (G5), comme le cœur. */
function sameGrid(a: GridView | null, b: GridInput | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.visible === b.visible &&
    a.snap === b.snap &&
    a.above === b.above &&
    a.levels.length === b.levels.length &&
    a.levels.every((l, i) => {
      const m = b.levels[i];
      return m !== undefined && LEVEL_KEYS.every((k) => l[k] === m[k]);
    })
  );
}

/** `BadGrid` (G2) : pas finis > 0, origine finie, kind, color, line non vides, au plus 16 niveaux. */
const validGrid = (g: GridInput): boolean =>
  g.levels.length <= MAX_GRID_LEVELS &&
  g.levels.every(
    (l) =>
      finitePositive(l.spacingX) &&
      finitePositive(l.spacingY) &&
      Number.isFinite(l.originX) &&
      Number.isFinite(l.originY) &&
      l.kind !== "" &&
      l.color !== "" &&
      l.line !== "",
  );

/** Champs écrits par SetGrid : la demande recopiée en bloc (clés inconnues perdues, comme le cœur, HG8). */
const gridRecord = (g: GridInput): RawRecord => ({
  visible: g.visible,
  snap: g.snap,
  above: g.above,
  levels: g.levels.map((l) => ({ ...l })),
});

/** `snap_axis` du cœur : ligne la plus proche, bornée à la première `≥ 0` et, si `hi` est donné, à la dernière `≤ hi`. */
function snapAxis(v: number, o: number, step: number, hi: number | null): number | null {
  const first = Math.ceil(-o / step - GRID_EPS);
  const last = hi === null ? Number.POSITIVE_INFINITY : Math.floor((hi - o) / step + GRID_EPS);
  if (Number.isNaN(first) || Number.isNaN(last) || first > last) return null;
  return o + Math.min(Math.max(roundHalfAway((v - o) / step), first), last) * step;
}

/** Accroche des seuls carreaux (DAG3), même règle que `grid::snap_point`. */
function snapSquares(g: GridView, width: number, x: number, y: number): readonly [number, number] | null {
  if (!g.snap) return null;
  let best: readonly [number, number] | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const l of g.levels) {
    if (!l.snap || l.kind !== "squares") continue;
    const qx = snapAxis(x, l.originX, l.spacingX, width);
    const qy = snapAxis(y, l.originY, l.spacingY, null);
    if (qx === null || qy === null) continue;
    const d = dist2(qx, qy, x, y);
    if (best === null || d < bestD) {
      best = [qx, qy];
      bestD = d;
    }
  }
  return best;
}

/** `indices` du cœur : premier et dernier k ; [0, -1] si aucun ; null au-delà du plafond. */
function gridIndices(o: number, step: number, lo: number, hi: number): readonly [number, number] | null {
  const first = Math.ceil((lo - o) / step - GRID_EPS);
  const last = Math.floor((hi - o) / step + GRID_EPS);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
  if (last < first) return [0, -1];
  if (last - first + 1 > MAX_GRID_DOTS) return null;
  return [first, last];
}

/** Lignes des seuls carreaux (DAG3), mêmes segments que `grid::lines`. */
function squaresLines(g: GridView, width: number, r: Bounds, minStep: number): GridLines | null {
  if (!g.visible) return null;
  const levels: LevelLines[] = [];
  const finite = [r.x0, r.y0, r.x1, r.y1, width].every((v) => Number.isFinite(v));
  const c = { x0: Math.max(r.x0, 0), y0: Math.max(r.y0, 0), x1: Math.min(r.x1, width), y1: r.y1 };
  if (finite && c.x0 <= c.x1 && c.y0 <= c.y1) {
    for (const l of g.levels) {
      if (!l.visible || l.kind !== "squares") continue;
      const segments: number[] = [];
      const ix = l.spacingX >= minStep ? gridIndices(l.originX, l.spacingX, c.x0, c.x1) : null;
      if (ix) {
        for (let k = ix[0]; k <= ix[1]; k++) {
          const x = l.originX + k * l.spacingX;
          segments.push(x, c.y0, x, c.y1);
        }
      }
      const iy = l.spacingY >= minStep ? gridIndices(l.originY, l.spacingY, c.y0, c.y1) : null;
      if (iy) {
        for (let k = iy[0]; k <= iy[1]; k++) {
          const y = l.originY + k * l.spacingY;
          segments.push(c.x0, y, c.x1, y);
        }
      }
      if (segments.length > 0) levels.push({ color: l.color, line: l.line, alpha: 1, segments, dots: [] });
    }
  }
  return { above: g.above, levels };
}
```

- [ ] **Étape 5 : vert.** `pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` → 0 échec, blocs attendus
  présents ; puis la commande `tsc` du critère « terminé » → `0`.

- [ ] **Étape 6 : commits.**

```bash
cd "$WT" && git add apps/web/src/core/api.ts && git add apps/web/src/core/fake-core.ts && \
git add apps/web/src/core/fake-core.test.ts && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): add grid contract, fake core parity and C9 contract tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests par bloc, sortie `tsc` filtrée, deux lignes `Réutilisation :`.

---

### Tâche T3 — Dessin calé de la grille (`grid-paint.ts`)

<a id="tache-t3"></a>

**Objectif.** Écrire le module qui porte les lignes du cœur (unités de page) en pixels physiques calés (G10) :
`alignedSegments` (testé seul : positions exactes de S5 (a), calage à tout zoom et tout dpr, obliques, points, motifs
calés sur l'origine du monde) et `paintGrid` (dessin sous transformation identité, plein en un seul tracé).

**Fichiers.**
- Create : `apps/web/src/engine/render/grid-paint.ts`
- Create : `apps/web/src/engine/render/grid-paint.test.ts`

**Interfaces.**
- Consomme : `apps/web/src/core/api.ts` — `GridLines`, `LevelLines` (types écrits par T2, interface exacte : `GridLines { above: boolean; levels: readonly LevelLines[] }`, `LevelLines { color: string; line: string; alpha: number; segments: readonly number[]; dots: readonly number[] }`) ; `apps/web/src/engine/camera.ts` — `Camera`, `worldToScreen`.
- Produit (exact, lu par T4) :
  - `export const MIN_GRID_PX = 4;` ; `export const MIN_DOT_PX = 8;` ; `export const DASHED = [6, 4] as const;` ; `export const DOTTED = [1, 3] as const;`
  - `export interface DeviceLevel { readonly color: string; readonly alpha: number; readonly width: number; readonly dash: readonly number[]; readonly segments: readonly number[]; readonly offsets: readonly number[]; readonly dots: readonly number[]; readonly dot: number }`
  - `export const lineWidthPx = (dpr: number): number` ; `export const dotSizePx = (dpr: number): number` ; `export const alignLine = (v: number, width: number): number`
  - `export function alignedSegments(lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): DeviceLevel[]`
  - `export function paintGrid(ctx: CanvasRenderingContext2D, lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): void` (le cadrage écrivait `paintGrid(ctx, lines, camera, sx, sy)` : `dpr` est ajouté, l'épaisseur en dépend ; écart à noter au rapport)
- Réutilise : aucun module existant pour le dessin calé (cadrage : « `round(`, `+ 0.5`, `lineDash` : rien de calé ») — nouveau module `apps/web/src/engine/render/grid-paint.ts`, interface ci-dessus.
- Réutilise : `apps/web/src/engine/camera.ts:20` (`worldToScreen(c: Camera, wx: number, wy: number): [number, number]`) — appelée avant `× sx`, `× sy` et le calage ; aucune formule de caméra recopiée.

**Test et commande bornée.**
`cd "$WT" && pnpm --filter @roomboard/web test -- src/engine/render/grid-paint.test.ts 2>&1 | tail -20` → ≥ 7 tests,
0 échec, « attendu exact de S5 (a) » et « motifs (G10) » présents. Si `node_modules` manque :
`pnpm install --frozen-lockfile` à la racine.

**Preuve visuelle.** Aucune automatique (profil : essais manuels plus tard, Jérôme, 2026-11-19). Lectures de valeurs à
la place d'une image : positions en pixels physiques lues par les tests (`13,5 + 40·i`, `17,5 + 50·i`, `27 + 80·i`).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `pnpm --filter @roomboard/web test -- src/engine/render/grid-paint.test.ts 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC12 Ne pas toucher `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`.

**Interdits.** Toucher `canvas2d.ts`, `api.ts` ou tout autre fichier (T2 écrit les types en parallèle) ; recopier la
formule de la caméra ; calculer des lignes (le cœur les rend).

**Terminé quand.** La commande bornée est verte ;
`pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "grid-paint" | wc -l` → `0`
(dans ce worktree seul, `tsc` signale `GridLines` absent d'`api.ts` dans `grid-paint*.ts`, attendu jusqu'à la fusion de
T2 ; `vitest` n'en dépend pas) ; le commit est fait.

**Étapes.**

- [ ] **Étape 1 : les tests (rouge).** Créer `apps/web/src/engine/render/grid-paint.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { GridLines } from "../../core/api";
import type { Camera } from "../camera";
import { alignedSegments, alignLine, dotSizePx, lineWidthPx, paintGrid } from "./grid-paint";

const ZOOMS = [0.15, 0.37, 1, 2.5, 8] as const;
const DPRS = [1, 1.25, 2] as const;
/** Caméra du montage S5 : haut de vue à y = 1 000 007. */
const far = (zoom: number): Camera => ({ zoom, tx: 13.3, ty: -1_000_007 * zoom });

/** Lignes que le cœur rend pour des carreaux de 40 à z = 1 dans la vue S5 (20 verticales, 15 horizontales). */
function squares40(): GridLines {
  const segments: number[] = [];
  for (let i = 0; i < 20; i++) segments.push(40 * i, 1_000_007, 40 * i, 1_000_607);
  for (let k = 0; k < 15; k++) segments.push(0, 1_000_040 + 40 * k, 786.7, 1_000_040 + 40 * k);
  return { above: false, levels: [{ color: "#7b68ee", line: "solid", alpha: 1, segments, dots: [] }] };
}

/** Abscisses des verticales, ordonnées des horizontales (pixels physiques). */
function split(segs: readonly number[]): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (let i = 0; i + 3 < segs.length; i += 4) {
    if (segs[i] === segs[i + 2]) v.push(segs[i] ?? Number.NaN);
    else if (segs[i + 1] === segs[i + 3]) h.push(segs[i + 1] ?? Number.NaN);
  }
  return { v, h };
}

describe("grille calée sur les pixels (C9, G10)", () => {
  it("attendu exact de S5 (a), carreaux de 40 à z = 1 : dpr 1, 1,25 et 2", () => {
    const cases = [
      { dpr: 1, x: 13.5, y: 33.5, step: 40, width: 1 },
      { dpr: 1.25, x: 17.5, y: 41.5, step: 50, width: 1 },
      { dpr: 2, x: 27, y: 66, step: 80, width: 2 },
    ];
    for (const c of cases) {
      const [level] = alignedSegments(squares40(), far(1), c.dpr, c.dpr, c.dpr);
      const { v, h } = split(level?.segments ?? []);
      expect(v).toEqual(Array.from({ length: 20 }, (_, i) => c.x + c.step * i));
      expect(h).toEqual(Array.from({ length: 15 }, (_, k) => c.y + c.step * k));
      expect(level?.width).toBe(c.width);
    }
  });

  it("tout zoom, tout dpr (S5) : chaque ligne droite sur k + 0,5 (épaisseur impaire) ou k (paire), épaisseur max(1, round(dpr))", () => {
    for (const z of ZOOMS) {
      const segments: number[] = [];
      for (let i = 0; i < 48; i++) segments.push(40 * i, 1_000_007, 40 * i, 1_000_007 + 600 / z);
      for (let k = 0; k < 20; k++) segments.push(0, 1_000_040 + 40 * k, 1920, 1_000_040 + 40 * k);
      const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments, dots: [] }] };
      for (const dpr of DPRS) {
        const [level] = alignedSegments(lines, far(z), dpr, dpr, dpr);
        const w = Math.max(1, Math.round(dpr));
        expect(level?.width).toBe(w);
        const { v, h } = split(level?.segments ?? []);
        expect(v.length + h.length).toBe(68);
        for (const x of [...v, ...h]) expect(Number.isInteger(w % 2 === 1 ? x - 0.5 : x)).toBe(true);
      }
    }
  });

  it("obliques (isométrique) : sans calage, en pixels physiques", () => {
    const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments: [0, 0, 100, 57.735], dots: [] }] };
    const [l] = alignedSegments(lines, { zoom: 2, tx: 3.3, ty: 4.4 }, 1.5, 1.5, 1.5);
    const s = l?.segments ?? [];
    expect(s[0]).toBeCloseTo(3.3 * 1.5);
    expect(s[1]).toBeCloseTo(4.4 * 1.5);
    expect(s[2]).toBeCloseTo((200 + 3.3) * 1.5);
    expect(s[3]).toBeCloseTo((115.47 + 4.4) * 1.5);
  });

  it("points : carré de max(2, round(2·dpr)) pixels physiques, coin sur un pixel entier", () => {
    const lines: GridLines = { above: false, levels: [{ color: "#000000", line: "solid", alpha: 1, segments: [], dots: [40, 40, 80, 40] }] };
    for (const [dpr, size, corner] of [[1, 2, 39], [1.25, 3, 49], [2, 4, 78]] as const) {
      const [l] = alignedSegments(lines, { zoom: 1, tx: 0, ty: 0 }, dpr, dpr, dpr);
      expect(l?.dot).toBe(size);
      expect(l?.dots.slice(0, 2)).toEqual([corner, corner]);
    }
  });

  it("motifs (G10) : dashed [6, 4] et dotted [1, 3] en px CSS × dpr ; décalage calé sur l'origine du monde ; trait inconnu plein", () => {
    const seg = (y0: number): number[] => [100, y0, 100, y0 + 50];
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#000000", line: "dashed", alpha: 1, segments: [...seg(0), ...seg(7)], dots: [] },
        { color: "#000000", line: "dotted", alpha: 1, segments: seg(0), dots: [] },
        { color: "#000000", line: "wavy", alpha: 1, segments: seg(0), dots: [] },
      ],
    };
    const [dashed, dotted, wavy] = alignedSegments(lines, { zoom: 1, tx: 0, ty: 0 }, 2, 2, 2);
    expect(dashed?.dash).toEqual([12, 8]);
    expect(dotted?.dash).toEqual([2, 6]);
    expect(wavy?.dash).toEqual([]);
    expect(dashed?.offsets).toEqual([0, 14]);
    // Défilement (Review Focus 5) : la même ligne loin sur la page garde sa phase depuis l'origine du monde.
    const farLine: GridLines = { above: false, levels: [{ color: "#000000", line: "dashed", alpha: 1, segments: [100, 1_000_003, 100, 1_000_053], dots: [] }] };
    const [l] = alignedSegments(farLine, { zoom: 1, tx: 0, ty: -1_000_003 }, 1, 1, 1);
    expect(l?.offsets).toEqual([3]);
  });

  it("aides : alignLine, lineWidthPx, dotSizePx", () => {
    expect(alignLine(13.3, 1)).toBe(13.5);
    expect(alignLine(26.6, 2)).toBe(27);
    expect([1, 1.25, 1.5, 2, 3].map(lineWidthPx)).toEqual([1, 1, 2, 2, 3]);
    expect([1, 1.25, 2].map(dotSizePx)).toEqual([2, 3, 4]);
  });

  it("paintGrid : pixels physiques (transformation identité) puis restore ; plein en un seul tracé, tireté segment par segment ; alpha du groupe", () => {
    class Rec {
      readonly log: string[] = [];
      globalAlpha = 1;
      lineWidth = 1;
      lineDashOffset = 0;
      lineCap = "round";
      strokeStyle = "";
      fillStyle = "";
      save(): void { this.log.push("save"); }
      restore(): void { this.log.push("restore"); }
      setTransform(...a: number[]): void { this.log.push(`setTransform ${a.join(",")}`); }
      setLineDash(d: number[]): void { this.log.push(`dash ${d.join(",")}`); }
      beginPath(): void { this.log.push("begin"); }
      moveTo(x: number, y: number): void { this.log.push(`M ${x},${y}`); }
      lineTo(x: number, y: number): void { this.log.push(`L ${x},${y}`); }
      stroke(): void { this.log.push(`stroke ${this.strokeStyle} w${this.lineWidth} a${this.globalAlpha} o${this.lineDashOffset} ${this.lineCap}`); }
      fillRect(x: number, y: number, w: number, h: number): void { this.log.push(`dot ${x},${y},${w},${h} ${this.fillStyle}`); }
    }
    const rec = new Rec();
    const lines: GridLines = {
      above: false,
      levels: [
        { color: "#111111", line: "solid", alpha: 1, segments: [0, 0, 0, 10, 40, 0, 40, 10], dots: [] },
        { color: "#222222", line: "solid", alpha: 0.5, segments: [0, 5, 10, 5], dots: [] },
        { color: "#333333", line: "dashed", alpha: 1, segments: [0, 0, 0, 10], dots: [20, 20] },
      ],
    };
    paintGrid(rec as unknown as CanvasRenderingContext2D, lines, { zoom: 1, tx: 0, ty: 0 }, 1, 1, 1);
    expect(rec.log).toEqual([
      "save",
      "setTransform 1,0,0,1,0,0",
      "dash ",
      "begin",
      "M 0.5,0",
      "L 0.5,10",
      "M 40.5,0",
      "L 40.5,10",
      "stroke #111111 w1 a1 o0 butt",
      "dash ",
      "begin",
      "M 0,5.5",
      "L 10,5.5",
      "stroke #222222 w1 a0.5 o0 butt",
      "dash 6,4",
      "begin",
      "M 0.5,0",
      "L 0.5,10",
      "stroke #333333 w1 a1 o0 butt",
      "dot 19,19,2,2 #333333",
      "restore",
    ]);
    const none = new Rec();
    paintGrid(none as unknown as CanvasRenderingContext2D, { above: false, levels: [] }, { zoom: 1, tx: 0, ty: 0 }, 1, 1, 1);
    expect(none.log).toEqual([]);
  });
});
```

  `pnpm --filter @roomboard/web test -- src/engine/render/grid-paint.test.ts 2>&1 | tail -10` → échec : module
  `./grid-paint` introuvable.

- [ ] **Étape 2 : le module (vert).** Créer `apps/web/src/engine/render/grid-paint.ts` :

```ts
/**
 * Grille calée sur les pixels (C9, G10). Les lignes viennent du cœur (`gridLines`, unités de page) : elles passent en
 * pixels physiques par `worldToScreen` puis × (sx, sy). Une ligne verticale ou horizontale tombe sur `round(X) + 0,5`
 * si l'épaisseur est impaire, sur `round(X)` sinon ; épaisseur `max(1, round(dpr))` pixels physiques, soit un pixel CSS
 * d'écran à tout zoom ; obliques (isométrique) sans calage ; point = carré de `max(2, round(2·dpr))` pixels, coin sur un
 * pixel entier. Motifs `dashed` [6, 4] et `dotted` [1, 3] en pixels CSS × dpr, décalés depuis l'origine du monde : le
 * motif ne glisse pas au défilement. Un `line` inconnu se dessine plein (G2).
 */
import type { GridLines } from "../../core/api";
import { worldToScreen, type Camera } from "../camera";

/** Pas minimal d'une famille de lignes, en pixels CSS d'écran (G9) : `min_step = MIN_GRID_PX / zoom`. */
export const MIN_GRID_PX = 4;
/** Pas minimal des points (G9) : `min_dot_step = MIN_DOT_PX / zoom`. */
export const MIN_DOT_PX = 8;
export const DASHED = [6, 4] as const;
export const DOTTED = [1, 3] as const;

/** Groupe de lignes prêt à peindre, en pixels physiques. */
export interface DeviceLevel {
  readonly color: string;
  readonly alpha: number;
  /** Épaisseur en pixels physiques. */
  readonly width: number;
  /** Motif en pixels physiques ; vide = trait plein. */
  readonly dash: readonly number[];
  /** x0, y0, x1, y1 à la suite, calés. */
  readonly segments: readonly number[];
  /** Décalage du motif de chaque segment, dans [0, période) ; 0 pour un trait plein. */
  readonly offsets: readonly number[];
  /** Coin haut gauche de chaque point, en pixels physiques entiers. */
  readonly dots: readonly number[];
  /** Côté d'un point en pixels physiques. */
  readonly dot: number;
}

export const lineWidthPx = (dpr: number): number => Math.max(1, Math.round(dpr));
export const dotSizePx = (dpr: number): number => Math.max(2, Math.round(2 * dpr));
/** Coordonnée d'une ligne sur la grille des pixels : centre d'un pixel (épaisseur impaire) ou bord (paire). */
export const alignLine = (v: number, width: number): number => (width % 2 === 1 ? Math.round(v) + 0.5 : Math.round(v));

function dashOf(line: string, dpr: number): number[] {
  const base = line === "dashed" ? DASHED : line === "dotted" ? DOTTED : null;
  return base === null ? [] : base.map((v) => v * dpr);
}

/** Phase du motif au début d'un segment : distance le long du segment depuis la projection de l'origine du monde. */
function phase(rx: number, ry: number, dx: number, dy: number, period: number): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  const along = (rx * dx + ry * dy) / len;
  return ((along % period) + period) % period;
}

export function alignedSegments(lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): DeviceLevel[] {
  const width = lineWidthPx(dpr);
  const dot = dotSizePx(dpr);
  const [ox, oy] = worldToScreen(camera, 0, 0);
  const originX = ox * sx;
  const originY = oy * sy;
  return lines.levels.map((l) => {
    const dash = dashOf(l.line, dpr);
    const period = dash.reduce((a, b) => a + b, 0);
    const segments: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i + 3 < l.segments.length; i += 4) {
      const wx0 = l.segments[i] ?? 0;
      const wy0 = l.segments[i + 1] ?? 0;
      const wx1 = l.segments[i + 2] ?? 0;
      const wy1 = l.segments[i + 3] ?? 0;
      const [ax, ay] = worldToScreen(camera, wx0, wy0);
      const [bx, by] = worldToScreen(camera, wx1, wy1);
      let x0 = ax * sx;
      let y0 = ay * sy;
      let x1 = bx * sx;
      let y1 = by * sy;
      if (wx0 === wx1) {
        x0 = alignLine(x0, width);
        x1 = x0;
      } else if (wy0 === wy1) {
        y0 = alignLine(y0, width);
        y1 = y0;
      }
      segments.push(x0, y0, x1, y1);
      offsets.push(period > 0 ? phase(x0 - originX, y0 - originY, x1 - x0, y1 - y0, period) : 0);
    }
    const dots: number[] = [];
    for (let i = 0; i + 1 < l.dots.length; i += 2) {
      const [px, py] = worldToScreen(camera, l.dots[i] ?? 0, l.dots[i + 1] ?? 0);
      dots.push(Math.round(px * sx - dot / 2), Math.round(py * sy - dot / 2));
    }
    return { color: l.color, alpha: l.alpha, width, dash, segments, offsets, dots, dot };
  });
}

/** Peint la grille en pixels physiques (transformation identité), puis rend la transformation de la vue. */
export function paintGrid(ctx: CanvasRenderingContext2D, lines: GridLines, camera: Camera, sx: number, sy: number, dpr: number): void {
  const levels = alignedSegments(lines, camera, sx, sy, dpr);
  if (levels.length === 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const l of levels) {
    ctx.globalAlpha = l.alpha;
    ctx.strokeStyle = l.color;
    ctx.fillStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.lineCap = "butt";
    ctx.setLineDash([...l.dash]);
    if (l.dash.length === 0) {
      if (l.segments.length > 0) {
        ctx.beginPath();
        for (let i = 0; i + 3 < l.segments.length; i += 4) {
          ctx.moveTo(l.segments[i] ?? 0, l.segments[i + 1] ?? 0);
          ctx.lineTo(l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0);
        }
        ctx.stroke();
      }
    } else {
      for (let i = 0; i + 3 < l.segments.length; i += 4) {
        ctx.lineDashOffset = l.offsets[i / 4] ?? 0;
        ctx.beginPath();
        ctx.moveTo(l.segments[i] ?? 0, l.segments[i + 1] ?? 0);
        ctx.lineTo(l.segments[i + 2] ?? 0, l.segments[i + 3] ?? 0);
        ctx.stroke();
      }
    }
    for (let i = 0; i + 1 < l.dots.length; i += 2) ctx.fillRect(l.dots[i] ?? 0, l.dots[i + 1] ?? 0, l.dot, l.dot);
  }
  ctx.restore();
}
```

  `pnpm --filter @roomboard/web test -- src/engine/render/grid-paint.test.ts 2>&1 | tail -20` → 7 tests passés.

- [ ] **Étape 3 : `tsc` filtré** (commande du critère « terminé ») → `0`.

- [ ] **Étape 4 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/render/grid-paint.ts && git add apps/web/src/engine/render/grid-paint.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): paint grid lines snapped to device pixels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests, sortie `tsc` filtrée, deux lignes `Réutilisation :` et l'écart de signature (`dpr` ajouté à `paintGrid`).

---

### Tâche T4 — Grille dans la scène Canvas 2D (ordre des couches, partie visible)

<a id="tache-t4"></a>

**Objectif.** Brancher la grille dans `Canvas2DRenderer.drawScene` : partie visible de la page haut de vue compris
(`visibleGridRect`, G9), lecture `gridLines` par la source de scène (facultative), grille dessous ou dessus selon
`above`, calque d'édition coupé en contenu et habillage (G11, DAG2) ; prouver S5 de bout en bout avec la fausse liaison
(positions exactes, calage et nombre de lignes à tout zoom et tout dpr, ordre des couches).

**Fichiers.**
- Modify : `apps/web/src/engine/render/renderer.ts:36` (`SceneSource`), `:39-44` (commentaire de `drawScene`)
- Modify : `apps/web/src/engine/render/canvas2d.ts:6-13` (imports), `:96-104` (champs), `:116-125` (`resize`), `:129-144` (`drawScene`), `:166-` (`paintOverlay` coupé)
- Modify : `apps/web/src/engine/render/canvas2d.test.ts:1-48` (imports, `FakeCtx`), fin de fichier
- Modify : `apps/web/src/engine/page.ts` (fin de fichier), `apps/web/src/engine/page.test.ts` (fin de fichier)

**Interfaces.**
- Consomme : T2 — `CoreDocument.gridLines(page: string, rect: Bounds, minStep: number, minDotStep: number): GridLines | null`, types `GridLines`, `GridInput`, `GridLevel` ; `fakeCore` (`SetGrid`, `gridLines` des carreaux). T3 — `paintGrid(ctx, lines, camera, sx, sy, dpr): void`, `MIN_GRID_PX`, `MIN_DOT_PX`.
- Produit : `export function visibleGridRect(c: Camera, viewW: number, viewH: number): PageRect | null` (`page.ts`) ;
  `export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines">>;`
- Réutilise : `apps/web/src/engine/page.ts:18` (`visiblePageRect`) — étendu par `visibleGridRect(camera, viewW, viewH): PageRect | null` à côté, même type `PageRect`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:129` (`drawScene`), `:249` (`setView`) — `drawScene` étendu par l'appel de `paintGrid` ; `setView` gardé pour tout le reste de la scène.

**Test et commande bornée.**
`cd "$WT" && pnpm --filter @roomboard/web test -- src/engine/render/canvas2d.test.ts src/engine/page.test.ts 2>&1 | tail -20`
→ 0 échec, « grille (C9, S5 a) : carreaux de 40 de la fausse liaison », « grille (C9, S5) : tout zoom, tout dpr »,
« ordre des couches (G11) » et « partie visible de la grille (C9, G9) » présents ; tests gardés verts : tout
`canvas2d.test.ts` existant (« calque d'édition : fantômes, formes, cadre, poignées, rectangle », « élément masqué … »),
`webgl2.test.ts`, `select.test.ts` du dossier `render/` : `pnpm --filter @roomboard/web test -- src/engine/render 2>&1 | tail -20`.

**Preuve visuelle.** Aucune automatique (profil). Lectures de valeurs : coordonnées `moveTo` relevées par le faux
contexte (`13,5 + 40·i`, `33,5 + 40·k` à dpr 1) et ordre des tracés.

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `pnpm --filter @roomboard/web test -- src/engine/render/canvas2d.test.ts src/engine/page.test.ts 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC7 C7 touche `canvas2d.ts` (`paintText`, `linesOf`) en parallèle : ne modifier que `resize`, `drawScene`, `paintOverlay` et les imports ; ne pas déplacer `paintText` ni `linesOf`.
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC12 Ne pas toucher `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`.

**Interdits.** Toucher `webgl2.ts` (il délègue à la scène Canvas 2D), `engine.ts`, `api.ts`, `grid-paint.ts` ;
recalculer des lignes dans le rendu ; dessiner la grille sur le canvas d'interaction.

**Terminé quand.** Les deux commandes bornées sont vertes ;
`pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "src/core/wasm-core.ts" | wc -l` → `0` ;
le commit est fait.

**Étapes.**

- [ ] **Étape 1 : tests de `visibleGridRect` (rouge).** Dans `page.test.ts`, remplacer l'import par
  `import { PAGE_WIDTH, visibleGridRect, visiblePageRect } from "./page";` et ajouter en fin de fichier :

```ts

describe("partie visible de la grille (C9, G9)", () => {
  it("haut de vue compris, loin sous le haut de page ; x et y ramenés à 0", () => {
    const r = visibleGridRect({ zoom: 1, tx: 13.3, ty: -1_000_007 }, 800, 600);
    expect(r?.x0).toBe(0);
    expect(r?.y0).toBe(1_000_007);
    expect(r?.x1).toBeCloseTo(786.7);
    expect(r?.y1).toBe(1_000_607);
    expect(visibleGridRect({ zoom: 0.5, tx: 100, ty: 50 }, 800, 600)).toEqual({ x0: 0, y0: 0, x1: 1400, y1: 1100 });
  });
  it("vue vide ou entièrement au-dessus de la page : null", () => {
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: 0 }, 0, 600)).toBeNull();
    expect(visibleGridRect({ zoom: 1, tx: 0, ty: 700 }, 800, 600)).toBeNull();
  });
});
```

- [ ] **Étape 2 : tests de la scène (rouge).** Dans `canvas2d.test.ts` :
  - imports : remplacer `import type { ElementView } from "../../core/api";` par
    `import type { ElementView, GridInput, GridLevel } from "../../core/api";`, ajouter
    `import { fakeCore } from "../../core/fake-core";`, et remplacer l'import de `./canvas2d` par
    `import { Canvas2DRenderer, createCanvas2DRenderer, SELECTION_COLOR, tracePolygons } from "./canvas2d";`.
  - `FakeCtx` : ajouter les champs `globalAlpha = 1;`, `lineDashOffset = 0;`,
    `readonly path: [string, number, number][] = [];`, et remplacer `moveTo` et `lineTo` par :

```ts
  moveTo(x = 0, y = 0): void { this.log.push("moveTo"); this.path.push(["M", x, y]); }
  lineTo(x = 0, y = 0): void { this.log.push("lineTo"); this.path.push(["L", x, y]); }
```

  - En fin de fichier, ajouter :

```ts

const gridLevel = (kind: string, s: number, color: string): GridLevel => ({
  kind,
  spacingX: s,
  spacingY: s,
  originX: 0,
  originY: 0,
  color,
  line: "solid",
  snap: false,
  visible: true,
});
const gridOf = (levels: GridLevel[], above = false): GridInput => ({ visible: true, snap: false, above, levels });

/** Scène de la fausse liaison avec une grille, vue 800 × 600 CSS, caméra S5. */
function gridScene(dpr: number, zoom: number, levels: GridLevel[]) {
  const doc = fakeCore.blank();
  const p = doc.pageIds()[0] ?? "";
  doc.apply({ type: "SetGrid", page: p, grid: gridOf(levels) });
  const scene = new FakeCtx();
  const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D });
  r.resize(800, 600, dpr);
  r.drawScene({ id: p, elementIds: doc.elementIds(p) }, { zoom, tx: 13.3, ty: -1_000_007 * zoom }, new Set());
  return scene;
}

/** Verticales (x) et horizontales (y) relevées dans les paires moveTo / lineTo. */
function gridSegments(f: FakeCtx): { v: number[]; h: number[] } {
  const v: number[] = [];
  const h: number[] = [];
  for (let i = 0; i + 1 < f.path.length; i++) {
    const a = f.path[i];
    const b = f.path[i + 1];
    if (a?.[0] !== "M" || b?.[0] !== "L") continue;
    if (a[1] === b[1]) v.push(a[1]);
    else if (a[2] === b[2]) h.push(a[2]);
  }
  return { v, h };
}

describe("Canvas2DRenderer — grille (C9)", () => {
  it("grille (C9, S5 a) : carreaux de 40 de la fausse liaison, au loin sur la page, calés sur les pixels", () => {
    const cases = [
      { dpr: 1, x: 13.5, y: 33.5, step: 40, width: 1 },
      { dpr: 1.25, x: 17.5, y: 41.5, step: 50, width: 1 },
      { dpr: 2, x: 27, y: 66, step: 80, width: 2 },
    ];
    for (const c of cases) {
      const scene = gridScene(c.dpr, 1, [gridLevel("squares", 40, "#7b68ee")]);
      const { v, h } = gridSegments(scene);
      expect(v).toEqual(Array.from({ length: 20 }, (_, i) => c.x + c.step * i));
      expect(h).toEqual(Array.from({ length: 15 }, (_, k) => c.y + c.step * k));
      expect(scene.log).toContain(`stroke #7b68ee ${c.width}`);
    }
  });

  it("grille (C9, S5) : tout zoom, tout dpr — calage, épaisseur, au plus 202 verticales et 152 horizontales ; 20 absent à z = 0,15", () => {
    for (const zoom of [0.15, 0.37, 1, 2.5, 8]) {
      for (const dpr of [1, 1.25, 2]) {
        for (const s of [40, 20]) {
          const scene = gridScene(dpr, zoom, [gridLevel("squares", s, "#7b68ee")]);
          const { v, h } = gridSegments(scene);
          const w = Math.max(1, Math.round(dpr));
          if (s === 20 && zoom === 0.15) {
            expect(v.length + h.length).toBe(0);
            continue;
          }
          expect(v.length).toBeGreaterThan(0);
          expect(v.length).toBeLessThanOrEqual(202);
          expect(h.length).toBeLessThanOrEqual(152);
          for (const x of [...v, ...h]) expect(Number.isInteger(w % 2 === 1 ? x - 0.5 : x)).toBe(true);
          expect(scene.log).toContain(`stroke #7b68ee ${w}`);
        }
      }
    }
  });

  it("ordre des couches (G11) : grille après le fond et avant les éléments ; above : après le fantôme, avant le cadre", () => {
    const strokes = (above: boolean): string[] => {
      const doc = fakeCore.blank();
      const p = doc.pageIds()[0] ?? "";
      const id = doc.apply({ type: "AddShape", page: p, shape: "rect", x0: 100, y0: 100, x1: 200, y1: 200, style: { color: "#000000", width: 4 }, fill: null }).ids[0] ?? "";
      doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")], above) });
      const scene = new FakeCtx();
      const r = new Canvas2DRenderer(asCtx(scene), null, doc, { makePath: () => new FakePath() as unknown as Path2D });
      r.resize(800, 600, 1);
      const overlay = above
        ? { ...EMPTY_OVERLAY, ghosts: [{ id, matrix: [1, 0, 0, 1, 10, 0] as const }], frame: { x0: 110, y0: 100, x1: 210, y1: 200 } }
        : EMPTY_OVERLAY;
      r.drawScene({ id: p, elementIds: [id] }, IDENTITY, above ? new Set([id]) : new Set(), overlay);
      return scene.log.filter((l) => l.startsWith("stroke") || l.startsWith("fillRect"));
    };
    expect(strokes(false)).toEqual([`fillRect ${SURROUND_COLOR}`, `fillRect ${PAGE_BACKGROUND}`, "stroke #7b68ee 1", "stroke #000000 4"]);
    expect(strokes(true)).toEqual([
      `fillRect ${SURROUND_COLOR}`,
      `fillRect ${PAGE_BACKGROUND}`,
      "stroke #000000 4",
      "stroke #7b68ee 1",
      `stroke ${SELECTION_COLOR} 1`,
    ]);
  });

  it("source sans gridLines ou avant resize : aucune grille", () => {
    const { r, scene } = make({});
    r.resize(800, 600, 1);
    r.drawScene({ id: "p", elementIds: [] }, IDENTITY, new Set());
    expect(scene.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
    const doc = fakeCore.blank();
    const p = doc.pageIds()[0] ?? "";
    doc.apply({ type: "SetGrid", page: p, grid: gridOf([gridLevel("squares", 40, "#7b68ee")]) });
    const fresh = new FakeCtx();
    new Canvas2DRenderer(asCtx(fresh), null, doc).drawScene({ id: p, elementIds: [] }, IDENTITY, new Set());
    expect(fresh.log.filter((l) => l.startsWith("stroke"))).toEqual([]);
  });
});
```

  `pnpm --filter @roomboard/web test -- src/engine/render/canvas2d.test.ts src/engine/page.test.ts 2>&1 | tail -20` →
  échecs (`visibleGridRect` absent, aucune grille dessinée).

- [ ] **Étape 3 : `visibleGridRect` et `SceneSource`.** En fin de `page.ts`, ajouter :

```ts

/**
 * Partie visible de la page pour la grille (C9, G9), en monde : toute la vue, ramenée à x ≥ 0 et y ≥ 0 (haut de vue
 * compris, pas y = 0) ; null si la vue est vide, ou entièrement au-dessus ou à gauche de la page. Le cœur la recoupe
 * avec la largeur réelle de la page.
 */
export function visibleGridRect(c: Camera, viewW: number, viewH: number): PageRect | null {
  const x0 = Math.max(0, -c.tx / c.zoom);
  const y0 = Math.max(0, -c.ty / c.zoom);
  const x1 = (viewW - c.tx) / c.zoom;
  const y1 = (viewH - c.ty) / c.zoom;
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}
```

  Dans `renderer.ts`, remplacer la ligne `export type SceneSource = …;` par :

```ts
/** Ce que le rendu lit du document : vue d'un élément, contour local et, s'il y en a, lignes de la grille (C9). */
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines">>;
```

  et le commentaire de `drawScene` par :

```ts
  /**
   * Scène fixe (G11) : pourtour, fond de page, grille si `above` est faux, éléments sauf `hidden` (masqués pendant un
   * aperçu, D38), contenu du calque d'édition (fantômes, formes en cours), grille si `above` est vrai, puis habillage
   * d'édition (rectangle de sélection, cadre, poignées : CL4-1). `overlay` absent : rien.
   */
```

- [ ] **Étape 4 : la scène (vert).** Dans `canvas2d.ts` :
  - imports : ajouter `GridLines` à l'import de types depuis `../../core/api` ; remplacer l'import de `../page` par
    `import { PAGE_BACKGROUND, PAGE_WIDTH, SURROUND_COLOR, visibleGridRect, visiblePageRect, type PageRect } from "../page";` ;
    ajouter `import { MIN_DOT_PX, MIN_GRID_PX, paintGrid } from "./grid-paint";`.
  - champs : après `private cssHeight = 0;`, ajouter :

```ts
  /** Largeur CSS et devicePixelRatio retenus par `resize` : partie visible et épaisseur de la grille (C9). */
  private cssWidth = 0;
  private dpr = 1;
```

  - `resize` : après `this.cssHeight = height;`, ajouter `this.cssWidth = width;` et `this.dpr = dpr;`.
  - `drawScene` : remplacer la boucle des éléments et l'appel final par :

```ts
    // Place du backdrop (U6, partie « reste » de C2) : ici, sous la grille et sous les éléments (G11).
    const grid = this.gridOf(page.id, camera);
    if (grid && !grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    for (const id of page.elementIds) {
      if (hidden.has(id)) continue;
      const el = this.source.element(id);
      if (el) this.paintElement(ctx, el, null);
    }
    this.paintOverlayContent(ctx, overlay);
    if (grid && grid.above) paintGrid(ctx, grid, camera, this.sx, this.sy, this.dpr);
    this.paintOverlayChrome(ctx, overlay, camera.zoom);
  }

  /** Lignes visibles de la grille de la page (G9) ; null sans source de grille, sans grille ou vue hors page. */
  private gridOf(page: string, camera: Camera): GridLines | null {
    const rect = visibleGridRect(camera, this.cssWidth, this.cssHeight);
    if (!rect) return null;
    return this.source.gridLines?.(page, rect, MIN_GRID_PX / camera.zoom, MIN_DOT_PX / camera.zoom) ?? null;
  }
```

  - `paintOverlay` : la couper en deux méthodes. La première partie (boucles `o.ghosts` et `o.shapes`) devient :

```ts
  /** Contenu du calque d'édition (CL4-1) : fantômes et formes en cours, sous une grille `above` (G11). */
  private paintOverlayContent(ctx: CanvasRenderingContext2D, o: EditOverlay): void {
    for (const g of o.ghosts) {
      const el = this.source.element(g.id);
      if (el) this.paintElement(ctx, el, g.matrix);
    }
    for (const s of o.shapes) {
      const n = normalizeShape(s.shape, s.x0, s.y0, s.x1, s.y1);
      ctx.save();
      ctx.transform(1, 0, 0, 1, n.tx, n.ty);
      paintShape(ctx, { shape: s.shape, w: n.w, h: n.h, fill: s.fill }, s.style);
      ctx.restore();
    }
  }
```

    et le reste (de `const px = 1 / zoom;` à la fin : rectangle de sélection, cadre, poignées) devient, corps inchangé :

```ts
  /** Habillage d'édition (CL4-1), en coordonnées monde, toujours au-dessus de la grille ; traits du cadre à 1 px écran. */
  private paintOverlayChrome(ctx: CanvasRenderingContext2D, o: EditOverlay, zoom: number): void {
    const px = 1 / zoom;
    const box = (b: Bounds): void => {
      ctx.beginPath();
      ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    };
    if (o.band) {
      ctx.save();
      ctx.fillStyle = BAND_FILL;
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 4 * px]);
      box(o.band);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (o.frame) {
      ctx.save();
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = px;
      ctx.setLineDash([6 * px, 4 * px]);
      box(o.frame);
      ctx.stroke();
      if (o.handles) {
        ctx.setLineDash([]);
        ctx.fillStyle = HANDLE_FILL;
        const half = (HANDLE_PX / 2) * px;
        for (const h of handlesOf(o.frame)) {
          ctx.beginPath();
          ctx.rect(h.x - half, h.y - half, 2 * half, 2 * half);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
```

  L'ancienne méthode `paintOverlay` disparaît (ses deux appelants sont remplacés ci-dessus).

  `pnpm --filter @roomboard/web test -- src/engine/render/canvas2d.test.ts src/engine/page.test.ts 2>&1 | tail -20` →
  0 échec ; puis `pnpm --filter @roomboard/web test -- src/engine/render 2>&1 | tail -20` → 0 échec.

- [ ] **Étape 5 : `tsc` filtré** (commande du critère « terminé ») → `0`.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/page.ts && git add apps/web/src/engine/page.test.ts && \
git add apps/web/src/engine/render/renderer.ts && git add apps/web/src/engine/render/canvas2d.ts && \
git add apps/web/src/engine/render/canvas2d.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): draw page grid in the scene below or above elements" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests, sortie `tsc` filtrée, deux lignes `Réutilisation :`.

---

### Tâche T5 — Magnétisme des outils Sélection et Formes, Alt suivie

<a id="tache-t5"></a>

**Objectif.** Suivre Alt comme Maj (`ToolContext.alt?()`, G8, HG7) ; aimanter le déplacement de la Sélection par
`snapDelta`, toujours depuis le déplacement brut, à l'aperçu comme au relâché (G7) ; aimanter le départ et le bout des
Formes par `snapPoint`, Maj appliquée au bout aimanté, seuil de taille jugé sur les points bruts (G8) ; prouver S3 et
S4 avec la fausse liaison, et que l'encre n'est jamais aimantée.

**Fichiers.**
- Modify : `apps/web/src/engine/tools/tool.ts:10-19` (`ToolContext`)
- Modify : `apps/web/src/engine/engine.ts:91-93` (`altHeld`), `:144` (`ctx`), `:360-400` (`key`, `keyUp`, `releaseKeys`)
- Modify : `apps/web/src/engine/engine.test.ts` (fin de fichier)
- Modify : `apps/web/src/engine/tools/select.ts:80-83` (`matrixOf`)
- Modify : `apps/web/src/engine/tools/select.test.ts:11-33` (`setup`), fin de fichier
- Modify : `apps/web/src/engine/tools/shape.ts:44-87` (`end`, `close`, `live`)
- Modify : `apps/web/src/engine/tools/shape.test.ts:11-26` (`setup`), fin de fichier
- Modify : `apps/web/src/engine/tools/pen.test.ts` (fin de fichier ; test seulement, `pen.ts` inchangé)

**Interfaces.**
- Consomme : T2 — `CoreDocument.snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number]`, `CoreDocument.snapPoint(page: string, x: number, y: number): readonly [number, number] | null`, `Command` `SetGrid`, `fakeCore` (carreaux).
- Produit : `ToolContext.alt?(): boolean` (vrai entre `keydown` et `keyup` d'Alt, faux après `releaseKeys`).
- Réutilise : `apps/web/src/engine/engine.ts:144`, `:360-400` (`shiftHeld`) — étendu par `altHeld` suivi de la même façon, et `ToolContext.alt?()`.
- Réutilise : `apps/web/src/engine/tools/select.ts:80-83` (`matrixOf`), `apps/web/src/core/shapes.ts:8` (`translateMatrix`, réexporté par `handles.ts:47`) — `translateMatrix(...snapDelta(...))`.
- Réutilise : `apps/web/src/engine/tools/shape.ts` (`constrainEnd(kind, x0, y0, x1, y1): [number, number]`) — appliquée au bout aimanté.

**Patron à ne pas reprendre (concepteur-critique).**
1. Aimanter une position déjà corrigée (piège du coffre `~/SecondBrain/04_Pieges/nodify-arrondit-la-position-a-la-grille-au-lacher.md`) :
   l'aperçu et la `Transform` écrite sont le même calcul, `snapDelta` appelé sur `d.x - d.x0`, `d.y - d.y0` bruts,
   jamais sur une matrice ou un point déjà aimanté.
2. Juger le seuil de taille sur le bout corrigé (`apps/web/src/engine/tools/shape.ts:80-81` aujourd'hui, `end(d)`) :
   un petit geste qu'agrandirait l'aimant ne doit rien écrire (G8) ; le seuil se juge sur les points bruts (Maj comprise
   comme avant).
3. Aimanter l'encre, la gomme, les poignées ou la pose du texte (G8) : `pen.ts`, `eraser.ts`, `text.ts`, `handles.ts` et
   le mode `resize` de `select.ts` restent inchangés.

**Test et commande bornée.**
`cd "$WT" && pnpm --filter @roomboard/web test -- src/engine 2>&1 | tail -20` → 0 échec ; présents : « outil Sélection —
magnétisme (C9, S3) » (3 tests), « outil Formes — magnétisme (C9, S4) » (3 tests), « Alt suivie (C9, G8) », « grille
aimantée sur la page : le tracé garde ses points bruts (C9, S3) ». Tests gardés verts : tout `select.test.ts`,
`shape.test.ts`, `engine.test.ts`, `pen.test.ts`, `eraser.test.ts`, `text.test.ts` existants (« Maj suivie … »,
« glisser un élément : aperçu sans écriture, puis une Transform de translation au relâché »). Si `node_modules` manque :
`pnpm install --frozen-lockfile` à la racine.

**Preuve visuelle.** Aucune automatique (profil). Lectures de valeurs : matrice du fantôme et de la `Transform`
(`[1, 0, 0, 1, 57, 33]`), coins de l'`AddShape` (`0, 0, 120, 80`).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `pnpm --filter @roomboard/web test -- src/engine 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android.
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser.
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC12 Ne pas toucher `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`.

**Interdits.** Toucher `keys.ts` (Alt y est déjà ignoré pour les raccourcis), `pen.ts`, `eraser.ts`, `text.ts`,
`handles.ts`, `core/` ; aimanter le mode `resize` ou `band` de la Sélection.

**Terminé quand.** La commande bornée est verte ;
`pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | grep "error TS" | grep -v "src/core/wasm-core.ts" | wc -l` → `0` ;
le commit est fait.

**Étapes.**

- [ ] **Étape 1 : tests (rouge).**
  - `engine.test.ts`, en fin de fichier :

```ts

describe("createEngine — Alt (C9)", () => {
  it("Alt suivie (C9, G8) : ctx.alt() vrai entre keydown et keyup, faux après releaseKeys ; la touche n'est pas prise", () => {
    let seen: ToolContext | null = null;
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: (ctx) => {
          seen = ctx;
          return fakeTool("pen", [], ctx);
        },
        eraser: (ctx) => fakeTool("eraser", [], ctx),
      },
    });
    const alt = (): boolean => (seen as ToolContext | null)?.alt?.() === true;
    expect(alt()).toBe(false);
    expect(engine.key(key("Alt", { altKey: true }))).toBe(false);
    expect(alt()).toBe(true);
    expect(engine.keyUp(key("Alt"))).toBe(false);
    expect(alt()).toBe(false);
    engine.key(key("Alt", { altKey: true }));
    engine.releaseKeys();
    expect(alt()).toBe(false);
  });
});
```

  - `select.test.ts` : dans `setup`, après `let shift = false;`, ajouter `let alt = false;` ; dans `ctx`, après
    `shift: () => shift,`, ajouter `alt: () => alt,` ; dans l'objet rendu, ajouter
    `setAlt: (v: boolean) => { alt = v; }`. En fin de fichier :

```ts

describe("outil Sélection — magnétisme (C9, S3)", () => {
  const squares40 = (snap: boolean) => ({
    visible: true,
    snap,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", snap: true, visible: true }],
  });

  it("glisser aimanté : fantôme aimanté, puis une seule Transform égale à l'aperçu ; la boîte géométrique a son centre sur un croisement", () => {
    const { doc, tool, runs, rect } = setup();
    const page = doc.pageIds()[0] ?? "";
    const a = rect(13, 17, 113, 77);
    doc.apply({ type: "SetGrid", page, grid: squares40(true) });
    tool.begin(1, [at(60, 50)]);
    tool.extend(1, [at(112, 81)], []);
    expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 57, 33] }]);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 57, 33] }]);
    expect(doc.element(a)?.transform).toEqual([1, 0, 0, 1, 70, 50]);
  });

  it("Alt tenue : déplacement brut ; magnétisme coupé : brut", () => {
    for (const [alt, snap] of [[true, true], [false, false]] as const) {
      const { doc, tool, runs, rect, setAlt } = setup();
      const page = doc.pageIds()[0] ?? "";
      const a = rect(13, 17, 113, 77);
      doc.apply({ type: "SetGrid", page, grid: squares40(snap) });
      setAlt(alt);
      tool.begin(1, [at(60, 50)]);
      tool.extend(1, [at(112, 81)], []);
      expect(tool.live().overlay?.ghosts).toEqual([{ id: a, matrix: [1, 0, 0, 1, 52, 31] }]);
      tool.close(1, "end");
      expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 52, 31] }]);
    }
  });

  it("sans grille : déplacement brut, comme avant C9", () => {
    const { tool, runs, rect } = setup();
    const a = rect(13, 17, 113, 77);
    tool.begin(1, [at(60, 50)]);
    tool.extend(1, [at(112, 81)], []);
    tool.close(1, "end");
    expect(runs).toEqual([{ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 52, 31] }]);
  });
});
```

  - `shape.test.ts` : dans `setup`, après `let shift = false;`, ajouter `let alt = false;` ; dans `ctx`, après
    `shift: () => shift,`, ajouter `alt: () => alt,` ; dans l'objet rendu, ajouter `setAlt: (v: boolean) => { alt = v; }`.
    En fin de fichier :

```ts

describe("outil Formes — magnétisme (C9, S4)", () => {
  const squares40 = {
    visible: true,
    snap: true,
    above: false,
    levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", snap: true, visible: true }],
  };
  const draw = (shift: boolean, alt: boolean, from: [number, number], to: [number, number]) => {
    const { ctx, page, runs, doc, setShift, setAlt } = setup();
    doc.apply({ type: "SetGrid", page, grid: squares40 });
    setShift(shift);
    setAlt(alt);
    const tool = createShapeTool(ctx, "rect", () => PEN);
    tool.begin(1, [at(from[0], from[1])]);
    tool.extend(1, [at(to[0], to[1])], []);
    const preview = tool.live().overlay?.shapes[0];
    tool.close(1, "end");
    return { runs, preview };
  };

  it("départ et bout aimantés : (0, 0)-(120, 80) ; Maj : carré depuis les points aimantés ; Alt : brut", () => {
    for (const [shift, alt, want] of [
      [false, false, [0, 0, 120, 80]],
      [true, false, [0, 0, 120, 120]],
      [false, true, [13, 17, 118, 97]],
    ] as const) {
      const { runs } = draw(shift, alt, [13, 17], [118, 97]);
      expect(runs).toHaveLength(1);
      expect(runs[0]).toMatchObject({ type: "AddShape", x0: want[0], y0: want[1], x1: want[2], y1: want[3] });
    }
  });

  it("aperçu aimanté égal à l'écriture", () => {
    const { runs, preview } = draw(false, false, [13, 17], [118, 97]);
    expect(preview).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
    expect(runs[0]).toMatchObject({ x0: 0, y0: 0, x1: 120, y1: 80 });
  });

  it("petit geste : rien même agrandi par l'aimant ; points aimantés confondus : rien (G8, Review Focus 4)", () => {
    expect(draw(false, false, [13, 17], [15, 19]).runs).toEqual([]);
    expect(draw(false, false, [13, 17], [18, 3]).runs).toEqual([]);
  });
});
```

  - `pen.test.ts`, en fin de fichier :

```ts

describe("createPenTool — grille (C9)", () => {
  it("grille aimantée sur la page : le tracé garde ses points bruts (C9, S3)", () => {
    const { doc, page, runs, tool } = setup();
    doc.apply({
      type: "SetGrid",
      page,
      grid: { visible: true, snap: true, above: false, levels: [{ kind: "squares", spacingX: 40, spacingY: 40, originX: 0, originY: 0, color: "#cccccc", line: "solid", snap: true, visible: true }] },
    });
    tool.begin(1, [s(13, 17)]);
    tool.extend(1, [s(53, 21), s(118, 97)], []);
    tool.frame();
    tool.close(1, "end");
    expect(Array.from(commitOf(runs).points)).toEqual([13, 17, 0.5, 53, 21, 0.5, 118, 97, 0.5].map((v) => Math.fround(v)));
  });
});
```

  `pnpm --filter @roomboard/web test -- src/engine 2>&1 | tail -20` → échecs attendus (Alt non suivie, matrices brutes
  `52, 31` au lieu de `57, 33`, coins bruts) ; le test du stylo passe déjà (garde).

- [ ] **Étape 2 : Alt suivie (`tool.ts`, `engine.ts`).** Dans `ToolContext`, après `shift?(): boolean;`, ajouter :

```ts
  /** Alt tenue (C9, G8) : aucun magnétisme ; absent = jamais tenue. */
  alt?(): boolean;
```

  Dans `engine.ts` : après `let shiftHeld = false;`, ajouter `let altHeld = false;` ; dans la ligne
  `const ctx: ToolContext = { … shift: () => shiftHeld, … }`, ajouter `alt: () => altHeld,` après `shift: () => shiftHeld,` ;
  dans `key(e)`, après le bloc `if (e.key === "Shift") { … }`, ajouter :

```ts
      if (e.key === "Alt") {
        altHeld = true;
        return false;
      }
```

  dans `keyUp(e)`, après le bloc `if (e.key === "Shift") { … }`, ajouter :

```ts
      if (e.key === "Alt") {
        altHeld = false;
        return false;
      }
```

  et dans `releaseKeys()`, après `shiftHeld = false;`, ajouter `altHeld = false;`.

- [ ] **Étape 3 : Sélection aimantée (`select.ts`).** Dans `createSelectTool`, juste avant `const matrixOf`, ajouter :

```ts
  /**
   * Déplacement du glisser (C9, G7, G8) : aimanté depuis le déplacement brut, à chaque image et au relâché (l'aperçu
   * et la Transform écrite sont le même calcul) ; brut si Alt est tenue.
   */
  const moveDelta = (d: Drag): readonly [number, number] => {
    const dx = d.x - d.x0;
    const dy = d.y - d.y0;
    return ctx.alt?.() === true ? [dx, dy] : ctx.doc.snapDelta(ctx.page(), selection, dx, dy);
  };
```

  et dans `matrixOf`, remplacer `if (d.mode === "move") return translateMatrix(d.x - d.x0, d.y - d.y0);` par
  `if (d.mode === "move") return translateMatrix(...moveDelta(d));`.

- [ ] **Étape 4 : Formes aimantées (`shape.ts`).** Dans `createShapeTool`, remplacer la constante `end` par :

```ts
  /** Point aimanté de la page (C9, G8) ; brut si Alt est tenue ou si rien n'accroche. */
  const snap = (page: string, x: number, y: number): readonly [number, number] =>
    ctx.alt?.() === true ? [x, y] : (ctx.doc.snapPoint(page, x, y) ?? [x, y]);
  /** Coins écrits : départ et bout aimantés, puis Maj appliquée au bout aimanté (CL4-12, G8). */
  const corners = (d: Draft): [number, number, number, number] => {
    const [x0, y0] = snap(d.page, d.x0, d.y0);
    const [bx, by] = snap(d.page, d.x1, d.y1);
    const [x1, y1] = ctx.shift?.() === true ? constrainEnd(kind, x0, y0, bx, by) : [bx, by];
    return [x0, y0, x1, y1];
  };
  /** Bout brut (Maj comprise), seul juge du seuil de taille : un petit geste n'écrit rien, même agrandi par l'aimant. */
  const rawEnd = (d: Draft): [number, number] =>
    ctx.shift?.() === true ? constrainEnd(kind, d.x0, d.y0, d.x1, d.y1) : [d.x1, d.y1];
```

  Dans `close`, remplacer les trois lignes à partir de `const [x1, y1] = end(d);` par :

```ts
      const [rx, ry] = rawEnd(d);
      if (Math.abs(rx - d.x0) * d.zoom < MIN_SHAPE_PX && Math.abs(ry - d.y0) * d.zoom < MIN_SHAPE_PX) return;
      const [x0, y0, x1, y1] = corners(d);
      if (x0 === x1 && y0 === y1) return;
      ctx.run({ type: "AddShape", page: d.page, shape: kind, x0, y0, x1, y1, style: d.style, fill: null });
```

  Dans `live`, remplacer le corps du `map` par :

```ts
        const [x0, y0, x1, y1] = corners(d);
        return { shape: kind, x0, y0, x1, y1, style: d.style, fill: null };
```

  `pnpm --filter @roomboard/web test -- src/engine 2>&1 | tail -20` → 0 échec.

- [ ] **Étape 5 : `tsc` filtré** (commande du critère « terminé ») → `0`.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add apps/web/src/engine/tools/tool.ts && git add apps/web/src/engine/engine.ts && \
git add apps/web/src/engine/engine.test.ts && git add apps/web/src/engine/tools/select.ts && \
git add apps/web/src/engine/tools/select.test.ts && git add apps/web/src/engine/tools/shape.ts && \
git add apps/web/src/engine/tools/shape.test.ts && git add apps/web/src/engine/tools/pen.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): snap moves and shapes to the page grid, Alt bypasses" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests, sortie `tsc` filtrée, trois lignes `Réutilisation :`.

---

### Tâche T6 — Liaison Wasm, adaptateur TS, contrat sur le vrai module, avis de tiers

<a id="tache-t6"></a>

**Objectif.** Exposer `SetGrid` et les trois lectures au JS (G12 : `set_grid`, `clear_grid`, `snap_point`, `snap_delta`,
`grid_lines`, `set_grid_inner` testable en natif), les brancher dans `WasmCoreDocument` avec contrôle de forme
(`toGridLines`, `toPair`), ouvrir le bloc « contrat C9 » au vrai module (S1, S2 sur le vrai module : mêmes messages,
mêmes vues, mêmes octets), jouer les cinq autres types sur le vrai module seul (DAG3), écrire la section « Code repris
d'ActCraft » (G15) et mesurer le poids du module.

**Fichiers.**
- Modify : `crates/roomboard-wasm/src/lib.rs:5-16` (imports), après `:88-96` (`asset_ref` : `grid_input`), après `:207-209` (`clear_backdrop` : méthodes exposées), après `:444-454` (`set_backdrop_inner` : `set_grid_inner`), fin du module de tests
- Modify : `apps/web/src/core/wasm-core.ts` (imports, `toGridLines` et `toPair` avant la classe, case `SetGrid` en fin de `switch`, trois méthodes en fin de classe)
- Modify : `apps/web/src/core/wasm-core.contract.test.ts` (ligne `c9Factories`, import de `toGridLines`, fin de fichier)
- Modify : `THIRD_PARTY_NOTICES.md` (fin de fichier)

**Interfaces.**
- Consomme : T1 — `roomboard_core::grid::{GridInput, GridLevelView}`, `Command::SetGrid { page, grid }`, `CommandError::BadGrid`,
  `Document::{snap_point, snap_delta, grid_lines, page}`, `query::Bounds` ; T2 — `api.ts` (`GridLines`, `SetGrid`,
  `CoreDocument.{snapPoint, snapDelta, gridLines}`), `wasm-core.contract.test.ts` (`BAD_GRID`, `gridLevel`, `gridOf`,
  `setGrid`, `c9Factories`, `first`).
- Produit (liaison, exact) :
  - `Document::set_grid(&mut self, page: &str, visible: bool, snap: bool, above: bool, kinds: Vec<String>, colors: Vec<String>, lines: Vec<String>, nums: &[f64]) -> Result<JsValue, JsError>` (`nums` : 6 nombres par niveau, `sx, sy, ox, oy, snap, visible`, booléens 0 ou 1)
  - `Document::clear_grid(&mut self, page: &str) -> Result<JsValue, JsError>`
  - `Document::snap_point(&self, page: &str, x: f64, y: f64) -> Option<Vec<f64>>` ; `Document::snap_delta(&self, page: &str, ids: Vec<String>, dx: f64, dy: f64) -> Vec<f64>`
  - `Document::grid_lines(&self, page: &str, x0: f64, y0: f64, x1: f64, y1: f64, min_step: f64, min_dot_step: f64) -> Result<JsValue, JsError>` (`null` sans grille)
  - `Document::set_grid_inner(&mut self, page: &str, grid: Option<GridInput>) -> Result<Change, CommandError>` ; `fn grid_input(visible: bool, snap: bool, above: bool, kinds: Vec<String>, colors: Vec<String>, lines: Vec<String>, nums: &[f64]) -> Result<GridInput, CommandError>`
  - TS : `export function toGridLines(v: unknown): GridLines | null`
- Réutilise : `crates/roomboard-wasm/src/lib.rs:183-209` (`set_backdrop`, `clear_backdrop`), `:444` (`set_backdrop_inner`) — même forme pour `set_grid`, `clear_grid`, `set_grid_inner` (`to_js`, `cmd_err`, `self.run`).

**Patron à ne pas reprendre (concepteur-critique).**
1. Un `as GridLines` ou `as [number, number]` sur un retour de Wasm (`apps/web/src/core/wasm-core.ts:132-148` contrôle
   chaque champ) : `toGridLines` et `toPair` lèvent sur une forme fausse.
2. Ajouter `Deserialize` pour passer la grille en objet (poids du module, K14 de C2) : chaînes en `Vec<String>`, nombres
   en `&[f64]`.
3. Recopier dans `wasm-core.ts` la validation de la grille : le cœur seul rend `BadGrid` ; la liaison ne contrôle que les
   longueurs (`grid_input`).

**Test et commande bornée.**

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo test -p roomboard-wasm grid 2>&1 | tail -10 && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && \
rm -rf apps/web/src/wasm && wasm-bindgen --target web --out-dir apps/web/src/wasm \
  target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20
```

Attendu : `cargo test -p roomboard-wasm grid` → 3 tests passés (`grid_input_reads_six_numbers_per_level`,
`grid_input_rejects_inconsistent_lengths`, `set_grid_inner_then_snap_lines_and_clear`) ; vitest : 0 échec, « contrat C9 :
vrai module wasm » (9 tests) et « contrat C9 : vrai module seulement » (2 tests) présents, « contrat C9 : fausse liaison »
toujours vert ; tests gardés verts : « contrat C2 : vrai module wasm », « élément de type inconnu : gardé, sans erreur »,
« les messages d'erreur sont ceux de la fausse liaison ». Puis `cargo test -p roomboard-wasm 2>&1 | tail -10` → 0 échec ;
`wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` → ≤ 1572864 (noter la valeur et l'écart avec `main`). Si
`node_modules` manque : `pnpm install --frozen-lockfile` à la racine.

**Preuve visuelle.** Aucune (liaison).

**Contraintes (recopiées).**
- GC1 TDD : test rouge d'abord. Aucun test désactivé, sauté ni seuil baissé.
- GC2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` avant toute commande.
- GC3 Preuve bornée qui montre qu'un test a tourné : `cargo test -p roomboard-wasm grid 2>&1 | tail -10`, `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` ; le rapport cite le nombre de tests et les noms attendus.
- GC4 Aucun build Tauri ni Android (le build `wasm32-unknown-unknown` du module est permis, c'est celui de `verifier.sh`).
- GC5 Aucune dépendance ajoutée ; jamais de dépendance AGPL, GPL ou LGPL.
- GC6 Commits : chaque fichier ajouté par son chemin (jamais `-A`, `--all`, `.`, ni `commit -a`), auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas pousser. `apps/web/src/wasm/` est ignoré par git : ne jamais l'ajouter.
- GC7 Dans `crates/roomboard-wasm/src/lib.rs`, tout ajout va en fin du bloc concerné (méthodes exposées après `clear_backdrop`, `_inner` après `set_backdrop_inner`, tests en fin de module) ; aucune réorganisation (C7 en parallèle).
- GC8 Un test qui échoue sur un délai est rejoué une fois.
- GC10 Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :`.
- GC11 Message `BadGrid` mot pour mot : `grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)` (rendu par le cœur, comparé à celui de la fausse liaison par le bloc C9).
- GC12 Ne pas toucher `scripts/verifier.sh`, `apps/web/src/ui/`, `apps/web/src/platform/`, `apps/web/src/main.ts`, `crates/roomboard-core/`.

**Interdits.** Toucher `crates/roomboard-core/` (contrat figé par T1) ; ajouter `Deserialize` ou une dépendance ; changer
l'ordre des arguments d'une méthode existante de la liaison.

**Terminé quand.** La commande bornée est verte ; `cargo clippy -p roomboard-wasm --all-targets -- -D warnings` et
`cargo fmt --all --check` sont verts ; `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` → aucune
erreur ; le module mesure ≤ 1 572 864 octets ; les commits sont faits.

**Étapes.**

- [ ] **Étape 1 : tests natifs de la liaison (rouge).** Dans `crates/roomboard-wasm/src/lib.rs`, à la fin du module
  `tests`, ajouter :

```rust
    fn squares(s: f64) -> GridLevelView {
        GridLevelView {
            kind: "squares".into(),
            spacing_x: s,
            spacing_y: s,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#cccccc".into(),
            line: "solid".into(),
            snap: true,
            visible: true,
        }
    }

    /// G12 : six nombres par niveau, `sx, sy, ox, oy, snap, visible`, booléens en 0 ou 1.
    #[test]
    fn grid_input_reads_six_numbers_per_level() {
        let g = grid_input(
            true,
            true,
            false,
            vec!["squares".into(), "dots".into()],
            vec!["#cccccc".into(), "#000000".into()],
            vec!["solid".into(), "dashed".into()],
            &[40.0, 40.0, 0.0, 0.0, 1.0, 1.0, 20.0, 10.0, 5.0, -3.0, 0.0, 1.0],
        )
        .expect("grille");
        assert_eq!((g.visible, g.snap, g.above), (true, true, false));
        assert_eq!(g.levels[0], squares(40.0));
        assert_eq!(
            g.levels[1],
            GridLevelView {
                kind: "dots".into(),
                spacing_x: 20.0,
                spacing_y: 10.0,
                origin_x: 5.0,
                origin_y: -3.0,
                color: "#000000".into(),
                line: "dashed".into(),
                snap: false,
                visible: true,
            }
        );
    }

    /// G12 : longueurs incohérentes → `BadGrid`.
    #[test]
    fn grid_input_rejects_inconsistent_lengths() {
        let s = |len: usize| vec![String::from("x"); len];
        for (k, c, l, n) in [(1, 1, 1, 5), (1, 0, 1, 6), (1, 1, 2, 6), (0, 0, 0, 6)] {
            assert_eq!(
                grid_input(true, true, false, s(k), s(c), s(l), &vec![1.0; n]),
                Err(CommandError::BadGrid),
                "{k} {c} {l} {n}"
            );
        }
        assert!(grid_input(true, false, false, vec![], vec![], vec![], &[]).is_ok());
    }

    #[test]
    fn set_grid_inner_then_snap_lines_and_clear() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let g = GridInput {
            visible: true,
            snap: true,
            above: false,
            levels: vec![squares(40.0)],
        };
        let c = d.set_grid_inner(&p, Some(g.clone())).expect("grille");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(d.core.page(&p).and_then(|v| v.grid), Some(g));
        assert_eq!(d.core.snap_point(&p, 118.0, 97.0), Some((120.0, 80.0)));
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        let lines = d.core.grid_lines(&p, r, 4.0, 8.0).expect("visible");
        assert_eq!(lines.levels[0].segments.len(), (3 + 3) * 4);
        d.set_grid_inner(&p, None).expect("retrait");
        assert_eq!(d.core.page(&p).and_then(|v| v.grid), None);
    }
```

  `cargo test -p roomboard-wasm grid 2>&1 | tail -5` → `error[E0425]` / `error[E0412]` (`grid_input`, `GridLevelView`
  introuvables).

- [ ] **Étape 2 : la liaison (vert).** Dans `lib.rs` :
  - imports : ajouter `use roomboard_core::grid::{GridInput, GridLevelView};` après la ligne
    `use roomboard_core::format::…;`.
  - après la fonction `asset_ref` :

```rust
/// Grille reçue de JS (G12) : `nums` = 6 nombres par niveau (`sx, sy, ox, oy, snap, visible`, booléens en 0 ou 1) ;
/// longueurs incohérentes : `BadGrid`. Les valeurs elles-mêmes sont contrôlées par le cœur (`SetGrid`).
fn grid_input(
    visible: bool,
    snap: bool,
    above: bool,
    kinds: Vec<String>,
    colors: Vec<String>,
    lines: Vec<String>,
    nums: &[f64],
) -> Result<GridInput, CommandError> {
    let n = kinds.len();
    if colors.len() != n || lines.len() != n || nums.len() != 6 * n {
        return Err(CommandError::BadGrid);
    }
    let levels = kinds
        .into_iter()
        .zip(colors)
        .zip(lines)
        .zip(nums.chunks_exact(6))
        .map(|(((kind, color), line), v)| GridLevelView {
            kind,
            spacing_x: v[0],
            spacing_y: v[1],
            origin_x: v[2],
            origin_y: v[3],
            color,
            line,
            snap: v[4] != 0.0,
            visible: v[5] != 0.0,
        })
        .collect();
    Ok(GridInput {
        visible,
        snap,
        above,
        levels,
    })
}
```

  - dans le bloc `#[wasm_bindgen] impl Document`, juste après `clear_backdrop` :

```rust
    /// Grille de page (U31, G12) ; voir `grid_input` pour la forme de `nums`.
    #[allow(clippy::too_many_arguments)]
    pub fn set_grid(
        &mut self,
        page: &str,
        visible: bool,
        snap: bool,
        above: bool,
        kinds: Vec<String>,
        colors: Vec<String>,
        lines: Vec<String>,
        nums: &[f64],
    ) -> Result<JsValue, JsError> {
        let grid = grid_input(visible, snap, above, kinds, colors, lines, nums).map_err(cmd_err)?;
        to_js(&self.set_grid_inner(page, Some(grid)).map_err(cmd_err)?)
    }

    pub fn clear_grid(&mut self, page: &str) -> Result<JsValue, JsError> {
        to_js(&self.set_grid_inner(page, None).map_err(cmd_err)?)
    }

    /// Point aimanté `[x, y]` (G6) ; `undefined` sans accroche.
    pub fn snap_point(&self, page: &str, x: f64, y: f64) -> Option<Vec<f64>> {
        self.core.snap_point(page, x, y).map(|(a, b)| vec![a, b])
    }

    /// Déplacement aimanté `[dx, dy]` (G7), brut sans accroche.
    pub fn snap_delta(&self, page: &str, ids: Vec<String>, dx: f64, dy: f64) -> Vec<f64> {
        let (a, b) = self.core.snap_delta(page, &ids, dx, dy);
        vec![a, b]
    }

    /// Lignes visibles (G9) dans le rectangle monde ; `null` sans grille ou grille invisible.
    #[allow(clippy::too_many_arguments)]
    pub fn grid_lines(
        &self,
        page: &str,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        min_step: f64,
        min_dot_step: f64,
    ) -> Result<JsValue, JsError> {
        match self
            .core
            .grid_lines(page, Bounds { x0, y0, x1, y1 }, min_step, min_dot_step)
        {
            Some(g) => to_js(&g),
            None => Ok(JsValue::NULL),
        }
    }
```

  - dans le bloc `impl Document` (non exposé), juste après `set_backdrop_inner` :

```rust
    /// `None` : retire la grille.
    pub fn set_grid_inner(
        &mut self,
        page: &str,
        grid: Option<GridInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetGrid {
            page: page.to_string(),
            grid,
        })
    }
```

  `cargo test -p roomboard-wasm grid 2>&1 | tail -10` → `3 passed`.

- [ ] **Étape 3 : tests du contrat sur le vrai module (rouge).** Dans `wasm-core.contract.test.ts` : ajouter
  `toGridLines` à l'import depuis `./wasm-core` ; remplacer la ligne
  `const c9Factories = factories.filter(({ f }) => f === fakeCore);` par
  `const c9Factories = factories; // T6 : vrai module branché, contrat C9 commun aux deux fabriques`. En fin de fichier :

```ts

describe("contrôle de forme C9 (lignes de grille)", () => {
  it("toGridLines : null pour rien, erreur pour une forme fausse", () => {
    const ok = { above: true, levels: [{ color: "#000000", line: "solid", alpha: 0.5, segments: [0, 0, 0, 10], dots: [1, 2] }] };
    expect(toGridLines(undefined)).toBeNull();
    expect(toGridLines(null)).toBeNull();
    expect(toGridLines(ok)).toEqual(ok);
    expect(() => toGridLines({ ...ok, above: 1 })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: [{ ...ok.levels[0], segments: ["0"] }] })).toThrow("GridLines invalide");
    expect(() => toGridLines({ above: true, levels: "x" })).toThrow("GridLines invalide");
  });
});

describe.skipIf(loaded === null)("contrat C9 : vrai module seulement", () => {
  const fixture = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));

  it("fichier du socle (S2) : grille nulle sur ses deux pages", () => {
    const d = need().core.load(fixture("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard"));
    expect(d.pageIds().map((p) => d.page(p)?.grid)).toEqual([null, null]);
    d.free();
  });

  it("les cinq autres types (DAG3) : Seyès principal et fin, isométrique, points, portées, lignes", () => {
    const d = need().core.blank();
    const p = first(d);
    const only = (kind: string, s: number): void => {
      setGrid(d, p, gridOf([gridLevel(kind, s)]));
    };
    only("seyes", 30.24);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 400, y1: 400 }, 4, 8)?.levels.map((l) => l.alpha)).toEqual([1, 0.5]);
    only("isometric", 40);
    const q = d.snapPoint(p, 36, 25);
    expect(q?.[0]).toBeCloseTo(20 * Math.sqrt(3));
    expect(q?.[1]).toBeCloseTo(20);
    only("dots", 40);
    expect(d.gridLines(p, { x0: 0, y0: 0, x1: 100, y1: 100 }, 4, 8)?.levels[0]?.dots).toEqual([0, 0, 40, 0, 80, 0, 0, 40, 40, 40, 80, 40, 0, 80, 40, 80, 80, 80]);
    only("music", 12);
    expect(d.snapPoint(p, 500, 70)).toEqual([500, 48]);
    only("lines", 40);
    expect(d.snapPoint(p, 1950, 10)).toEqual([1950, 0]);
    d.free();
  });
});
```

  Construire le module (commande bornée, lignes `cargo build` et `wasm-bindgen`), puis
  `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test -- src/core 2>&1 | tail -20` → échecs attendus sur le
  vrai module (`d.snapPoint is not a function`, `SetGrid` sans `case`, `toGridLines` absent).

- [ ] **Étape 4 : l'adaptateur (vert).** Dans `wasm-core.ts` : ajouter `GridLines` à l'import de types depuis `./api`.
  Juste avant `class WasmCoreDocument`, ajouter :

```ts
const LINES = "GridLines invalide";
// Lignes de grille (C9, G12) : `null` (Option::None) ou `undefined` → null ; forme fausse → erreur.
export function toGridLines(v: unknown): GridLines | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(LINES);
  const { above, levels } = v;
  if (typeof above !== "boolean" || !Array.isArray(levels)) throw new Error(LINES);
  return {
    above,
    levels: levels.map((l: unknown) => {
      if (!isRecord(l)) throw new Error(LINES);
      const { color, line, alpha, segments, dots } = l;
      if (typeof color !== "string" || typeof line !== "string" || typeof alpha !== "number" || !isNumbers(segments) || !isNumbers(dots)) {
        throw new Error(LINES);
      }
      return { color, line, alpha, segments, dots };
    }),
  };
}

/** Paire `[x, y]` venue de Wasm (Float64Array ou tableau) ; autre forme → erreur. */
function toPair(v: unknown): readonly [number, number] {
  const a: unknown = v instanceof Float64Array ? Array.from(v) : v;
  if (!isNumbers(a) || a.length !== 2) throw new Error("point invalide");
  return [a[0] ?? 0, a[1] ?? 0];
}
```

  En dernier `case` du `switch` d'`apply` (après `case "SetBackdrop": { … }`) :

```ts
      case "SetGrid": {
        const g = cmd.grid;
        if (g === null) return toChange(this.d.clear_grid(cmd.page));
        // Six nombres par niveau (G12) : sx, sy, ox, oy, snap, visible ; les valeurs sont contrôlées par le cœur.
        const nums = new Float64Array(
          g.levels.flatMap((l) => [l.spacingX, l.spacingY, l.originX, l.originY, l.snap ? 1 : 0, l.visible ? 1 : 0]),
        );
        return toChange(
          this.d.set_grid(cmd.page, g.visible, g.snap, g.above, g.levels.map((l) => l.kind), g.levels.map((l) => l.color), g.levels.map((l) => l.line), nums),
        );
      }
```

  À la fin de la classe, après `free(): void { this.d.free(); }` :

```ts
  snapPoint(page: string, x: number, y: number): readonly [number, number] | null {
    const v: unknown = this.d.snap_point(page, x, y);
    return v === null || v === undefined ? null : toPair(v);
  }
  snapDelta(page: string, ids: readonly string[], dx: number, dy: number): readonly [number, number] {
    return toPair(this.d.snap_delta(page, [...ids], dx, dy));
  }
  gridLines(page: string, r: Bounds, minStep: number, minDotStep: number): GridLines | null {
    return toGridLines(this.d.grid_lines(page, r.x0, r.y0, r.x1, r.y1, minStep, minDotStep));
  }
```

  Commande bornée complète → verte ; `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` → aucune erreur.

- [ ] **Étape 5 : avis de tiers (G15).** En fin de `THIRD_PARTY_NOTICES.md`, ajouter :

```markdown

## Code repris d'ActCraft (C9, accroche de la grille)

`crates/roomboard-core/src/grid.rs` reprend, réécrites en Rust, trois fonctions d'ActCraft (`core/src/gridsnap.cpp`) :
`nearestGridPoint` (niveau le plus proche, sans seuil), `snapAxis` (ligne la plus proche, bornée à la première ligne
`≥ 0` ; la borne de la dernière ligne `≤ largeur` est propre à RoomBoard) et `nearestLatticePoint` (sommet du réseau le
plus proche). ActCraft est publié sous GPL-3.0-only ; son auteur, seul, est aussi celui de RoomBoard et reprend ce code
sous PolyForm Shield (décision 0246). Aucune dépendance n'est ajoutée.
```

- [ ] **Étape 6 : clippy, fmt, poids.** `cargo fmt --all` puis `cargo fmt --all --check` ;
  `cargo clippy -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -10` → aucun avertissement ;
  `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` → ≤ 1572864.

- [ ] **Étape 7 : commits.**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): bind SetGrid, snap and grid lines, play C9 contract on the real module" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
cd "$WT" && git add THIRD_PARTY_NOTICES.md && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "docs: credit grid snapping code reused from ActCraft" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests (Rust et vitest, par bloc), taille du module en octets, sortie `tsc`, une ligne `Réutilisation :`.

---

## Relecture du plan (faite)

- **Couverture du cadrage.** G1, G5 → T1 (`SetGrid`, une étape, même valeur sans transaction), T2 (parité) ; G2 → T1
  (`write`, `validate`), T2 (`validGrid`), T6 (`grid_input`) ; G3 → T1 (six types, accroche et lignes) ; G4 → T1
  (`read_tolerates_malformed_grid`), T2 (« grille de la fausse liaison (C9, G4) ») ; G6 → T1 ; G7 → T1 (`snap_box`,
  `snap_delta`), T2 (`snapBox`), T5 (`moveDelta` depuis le brut) ; G8 → T5 ; G9 → T1 (`lines`), T4 (`visibleGridRect`,
  `MIN_GRID_PX / zoom`) ; G10 → T3 ; G11 → T4 ; G12 → T2 (types, `toGridView`), T6 (liaison) ; G13 → T2 ; G14 → T1
  (`grid_reload_keeps_bytes`, `socle_fixture_has_no_grid`, `newer_grid_kind_…`), T2 et T6 (« save puis load (S1) ») ;
  G15 → T6 (notices, poids). S1 → T1, T2, T6 ; S2 → T1, T2, T6 ; S3 → T1, T2, T5 ; S4 → T2, T5 ; S5 → T1, T3, T4.
- **Carte d'impact.** Toute entrée « touché : oui » est dans les fichiers touchés d'une tâche : `grid.rs`, `lib.rs`,
  `element.rs`, `document.rs`, `commands.rs`, `query.rs`, `compat_socle.rs` (T1) ; `api.ts`, `fake-core.ts`,
  `wasm-core.ts` (`toPageView`), littéraux de `wasm-core.contract.test.ts` (T2) ; `grid-paint.ts` (T3) ; `renderer.ts`,
  `canvas2d.ts`, `page.ts`, `canvas2d.test.ts` (T4) ; `tool.ts`, `engine.ts`, `select.ts`, `shape.ts` et leurs tests (T5) ;
  `roomboard-wasm/src/lib.rs`, fin de `wasm-core.ts` (T6). Ajouts hors carte : `fake-core.test.ts` (T2), `page.test.ts`
  (T4), `pen.test.ts` (T5, test seulement), `THIRD_PARTY_NOTICES.md` (T6, G15). Effets de bord : `PageView.grid` →
  littéraux `:147`, `:149`, `:714` (T2), contrat commun `page(p)` (T2, T6) ; `paintOverlay` coupé → « ordre des couches
  (G11) » et tests existants du calque (T4) ; glisser aimanté → « sans grille : déplacement brut, comme avant C9 » et
  anciens `select.test.ts` (T5) ; Alt suivie → « Alt suivie (C9, G8) » (T5). Tests à garder verts cités dans la preuve
  de la tâche qui touche leur zone : `socle_fixture_resaves_identically`, `container.rs` (T1) ; `pen`, `eraser`, `text`
  (T5) ; contrat C2 (T6).
- **Modules à réutiliser.** Dix-sept lignes `Réutilise :` (une par ligne du tableau du cadrage) : T1 sept, T2 deux, T3
  deux, T4 deux, T5 trois, T6 une. Aucune tâche ne crée un module donné comme existant ; les deux nouveaux modules
  (`grid.rs`, `grid-paint.ts`) sont ceux que le cadrage nomme.
- **Noms d'une tâche à l'autre.** `GridView`, `GridLevelView`, `GridInput`, `GridLines`, `LevelLines`, `snap_point`,
  `snap_delta`, `grid_lines`, `snap_box`, `Command::SetGrid`, `CommandError::BadGrid` (T1 → T6) ; `GridLevel`,
  `GridView`, `GridInput`, `GridLines`, `LevelLines`, `snapPoint`, `snapDelta`, `gridLines`, `SetGrid`, `gridLevel`,
  `gridOf`, `setGrid`, `c9Factories`, `BAD_GRID` (T2 → T4, T5, T6) ; `paintGrid`, `MIN_GRID_PX`, `MIN_DOT_PX` (T3 → T4) ;
  `ToolContext.alt` (T5). Message `BadGrid` identique partout.
- **Écarts assumés.** `paintGrid` prend `dpr` (le cadrage l'écrivait sans) ; l'isométrique cherche sur trois colonnes
  bornées à la page plutôt que les 3 × 3 voisins (même résultat dans la page, aucun voisin hors page) ; une famille de
  lignes au-delà de `MAX_GRID_DOTS` est sautée comme un niveau de points (garde contre un `min_step` nul) ; les méthodes
  `snap_point`, `snap_delta`, `grid_lines` sont en fin du bloc `impl Document` de `document.rs`, `snap_box` en fin de
  celui de `query.rs` ; parité fausse liaison et cœur exacte pour des boîtes de coordonnées représentables en `f32`
  (le cœur passe par `box_polygon`, en `f32`) : le contrat n'emploie que celles-là.
