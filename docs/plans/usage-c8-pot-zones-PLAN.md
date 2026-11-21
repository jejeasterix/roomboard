# usage-c8-pot-zones — plan d'exécution (pot de peinture, zones fermées)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : zone fermée (`zone.rs`, `i_overlay`), élément `fill` écrit, commande `Fill Zone`, pont Wasm, taille et licences | — | `crates/roomboard-core/Cargo.toml`, `Cargo.lock`, `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/zone.rs` (neuf), `crates/roomboard-core/src/fill_element.rs` (neuf), `crates/roomboard-core/src/fill.rs`, `crates/roomboard-core/src/shape.rs`, `crates/roomboard-wasm/Cargo.toml`, `crates/roomboard-wasm/src/lib.rs`, `THIRD_PARTY_NOTICES.md`, `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T1` | concepteur-critique | `cargo test -p roomboard-core --features zone 2>&1 \| grep -E "^test (zone\|fill\|shape)::\|test result" \| tail -40` : ≥ 1 test, `zone::tests::square_gap_1px_closes_3px_leaks ... ok`, `test result: ok` ; module principal mesuré ≤ 1 420 000 o, formats ≤ 3 145 728 o | S1, S2, S4, S6 | #tache-t1 |
| T2 | Cœur : vue, collision et anneaux d'un `fill` ; contrat du vrai module | T1, T3 | `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T2` | concepteur-critique | `cargo test -p roomboard-core --features zone fill 2>&1 \| grep -E "^test \|test result" \| tail -30` : `query::tests::fill_is_hit_inside_far_from_edges_only ... ok` ; `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 \| grep -E "C8\|Tests " \| tail -14` : ≥ 1 test « contrat C8 : vrai module seulement », 0 échec | S3, S5 | #tache-t2 |
| T3 | Interface TS : `FillElement`, cible `zone`, `fillRings`, `zoneCells` ; fausse liaison (second écart D36) | — | `apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T3` | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 \| grep -E "C8\|Tests " \| tail -14` : ≥ 1 test « C8 : fill chargé », 0 échec | S2, S3 | #tache-t3 |
| T4 | Rendu du `fill` (`canvas2d`, pair-impair, chemin en cache par id) | T3 | `apps/web/src/engine/render/renderer.ts`, `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T4` | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/record-ctx.test.ts --reporter=verbose 2>&1 \| grep -E "C8\|Tests " \| tail -10` : ≥ 1 test « fill : chemin des anneaux », 0 échec | S1 | #tache-t4 |
| T5 | Marques de la zone (`data-zones`, `data-zone-ms`, `data-zone-cells`) et `stageTags` | — | `apps/web/src/app/stage-tags.ts`, `apps/web/src/app/stage-tags.test.ts`, `apps/web/src/app/zone-marks.ts` (neuf), `apps/web/src/app/zone-marks.test.ts` (neuf) | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T5` | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/app/zone-marks.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 \| grep -E "C8\|Tests " \| tail -10` : ≥ 1 test « Fill zone : durée mesurée », 0 échec | S6 | #tache-t5 |
| T6 | Outil Pot : rien touché → `Fill Zone` ; `fill` touché → recolorer ou `Delete` ; marques branchées | T3, T5 | `apps/web/src/engine/fill-target.ts`, `apps/web/src/engine/fill-target.test.ts`, `apps/web/src/app/board-session.ts` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T6` | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/app/image-fill.test.ts src/app/board-session.test.ts --reporter=verbose 2>&1 \| grep -E "C8\|Tests " \| tail -12` : ≥ 1 test « C8 : rien sous le pointeur », 0 échec | S1, S2, S5 | #tache-t6 |
| T7 | Essai navigateur C8 (geste, porte S6, 640 px, capture) branché dans `verifier.sh --e2e` ; tailles finales | T1, T2, T3, T4, T5, T6 | `scripts/essais/c8-pot-zones-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c8-pot-zones.png` (neuf), `docs/essais/taille-wasm.md` | isolé `~/projets/roomboard-wt/usage-c8-pot-zones--T7` | implementeur-tdd | `bash scripts/verifier.sh --e2e 2>&1 \| grep -E "C8 pot zones\|module Wasm\|module formats\|e2e OK\|verifier.sh : OK\|ÉCHEC" \| tail -12` : « C8 pot zones : OK », « verifier.sh : e2e OK », « verifier.sh : OK », deux tailles relevées | S1, S2, S3, S4, S5, S6 | #tache-t7 |

Vagues proposées : **V1** T1, T3, T5 (aucun fichier commun) · **V2** T2, T4, T6 (aucun fichier commun) · **V3** T7.

**Goal :** un clic du pot dans une zone fermée (traits, formes, boîtes d'images et de textes, à 2 px près) pose un nouvel
élément `kind: "fill"` non lié au-dessus des objets ; hors de toute zone, le fond de la page change comme en C6a ; un
clic = une étape.

**Architecture :** le cœur Rust décide tout, à l'écriture, dans la commande `Fill { target: Zone { x, y, tol } }` :
`Document::zone_walls` lit les murs, la fonction pure `zone::closed_zone` rastérise (1 cellule = 1 px de la vue), dilate,
diffuse, puis taille la forme exacte par `i_overlay` (union des suites de cellules moins les murs). `i_overlay` vit derrière
la fonctionnalité Cargo `zone`, activée par `roomboard-wasm` seul. La page envoie `Fill Zone` dès que rien n'est touché,
dessine le `fill` en pair-impair depuis `fillRings(id)` et marque `#stage` pour l'essai.

**Tech Stack :** Rust (yrs 0.28, `i_overlay` 9.2.0), wasm-bindgen 0.2.130, TypeScript, Vitest, Playwright (Chromium).

**Spec :** `docs/plans/usage-c8-pot-zones-cadrage.md`

## Global Constraints

- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC2 — Plafonds Wasm : principal 1 572 864 o (garde-fou du cadrage 1 420 000 o → repli HU2-8), formats 3 145 728 o ; ni baissés ni relevés. Aucun troisième module Wasm. Aujourd'hui : principal 1 145 044 o, formats 3 100 344 o.
- GC3 — `ink::outline` lu sans être modifié.
- GC4 — Un fichier d'avant C8 s'ouvre toujours.
- GC5 — Scène ≥ 640 px.
- GC6 — Aucune dépendance GPL/AGPL/LGPL ; `THIRD_PARTY_NOTICES.md` complété pour `i_overlay` et ses dépendances.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC10 — Trois couches testables seules : `crates/` (cœur Rust, sans dépendance au navigateur), `apps/web`, `apps/desktop` (profil).
- GC11 — `roomboard-formats` et `roomboard-formats-wasm` ne reçoivent jamais la fonctionnalité `zone` (DA-Z1, Q4).

## Review Focus

1. Clic du pot ou de la sélection à moins de 6 px du bord d'un `fill` : c'est le trait voisin qui est touché, jamais le `fill` (Q13, effet de bord 2, S5) → T2 `fill_is_hit_inside_far_from_edges_only`, T3 « C8 : fill chargé ».
2. `fill` mal formé (contours illisibles, moins de 3 points) : cadre inconnu à la taille `w × h`, jamais 100 × 100 ni invisible (Q11) → T2 `malformed_fill_is_unknown_with_its_box`, T3 « C8 : fill mal formé ».
3. « Aucune » dans une zone fermée : fond `#ffffff`, aucun `fill` transparent (HC8-6) → T1 `none_in_closed_zone_sets_white_background`.
4. Emprise au-delà de 2²² cellules (grand zoom, écran 4K) : la cellule double, le clic ne retombe pas trop tôt sur le fond ; au-delà de 4 px par cellule, fond (Q20, HC8-11) → T1 `fit_doubles_cells_then_gives_up`.
5. Pot sur un `fill` existant : une couleur le recolore en une étape, « Aucune » le supprime (`Delete`), jamais un `fill` sans couleur (Q14) → T1 `fill_inside_recolors_fill_and_none_is_no_step`, T6 « C8 : fill sous le pointeur ».

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-core/src/zone.rs` (neuf, `cfg(feature = "zone")`) | `Wall`, `Zone`, `Grid`, `Mask` (peinture, dilatation, diffusion, suites), `closed_zone` pure, `Document::zone_walls`, `Document::zone_cells` | T1 |
| `crates/roomboard-core/src/fill_element.rs` (neuf, toujours compilé) | schéma Y.Map du `fill` : `FILL_KIND`, `read_fill`, `fill_prelim`, `Document::insert_fill` | T1 |
| `crates/roomboard-core/src/fill.rs` | `FillTarget::Zone`, `cmd_fill_zone`, `field_for` du `fill` | T1 |
| `crates/roomboard-core/src/shape.rs` | `shape_ring` | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `fill_zone`, `zone_cells` (T1) ; `fill_rings` (T2) | T1, T2 |
| `crates/roomboard-core/src/element.rs`, `document.rs`, `query.rs` | `FillView`, `KNOWN_KINDS`, vue, `Geom.rings`, `hit_test` strict, `fill_rings` | T2 |
| `apps/web/src/core/api.ts`, `wasm-core.ts`, `fake-core.ts` | types, liaison, fausse liaison | T3 |
| `apps/web/src/engine/render/renderer.ts`, `canvas2d.ts` | `SceneSource.fillRings`, `traceRings`, branche `fill` | T4 |
| `apps/web/src/app/zone-marks.ts` (neuf), `stage-tags.ts` | mesure `pot-zone` et marques | T5 |
| `apps/web/src/engine/fill-target.ts`, `apps/web/src/app/board-session.ts` | commande du pot, branchement | T6 |
| `scripts/essais/c8-pot-zones-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai final | T7 |

---

### Tâche T1 — Cœur : zone fermée, élément `fill` écrit, commande `Fill Zone`, pont Wasm, taille et licences

<a id="tache-t1"></a>

**Objectif :** le cœur sait, pour un clic (x, y, `tol`), décider « hors des murs / sur un mur / zone ouverte / zone fermée »
et, si la zone est fermée, insérer un `fill` en haut de la page en une étape ; sinon appliquer `Background` (C6a). Le pont
Wasm l'expose. La taille réelle d'`i_overlay` dans le module principal est mesurée ici, tôt.

**Fichiers :**
- Créer : `crates/roomboard-core/src/zone.rs`, `crates/roomboard-core/src/fill_element.rs`
- Modifier : `crates/roomboard-core/Cargo.toml`, `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/fill.rs:1-117`, `crates/roomboard-core/src/shape.rs` (après `shape_polygon`, `:70`), `crates/roomboard-wasm/Cargo.toml`, `crates/roomboard-wasm/src/lib.rs:1229-1265` et `:1790-1823`, `Cargo.lock`, `THIRD_PARTY_NOTICES.md`, `docs/essais/taille-wasm.md`
- Tests : dans `zone.rs`, `fill.rs`, `shape.rs`, `crates/roomboard-wasm/src/lib.rs` (module `tests`)

**Interfaces :**
- Consomme : rien d'une autre tâche.
- Produit (lu par T2, T3, T7) :
  - `pub const FILL_KIND: &str = "fill";` (`crate::fill_element`)
  - `pub(crate) struct FillFields { pub transform: Transform, pub w: f64, pub h: f64, pub color: String, pub rings: Vec<Vec<f64>> }` (anneaux **locaux**, extérieur d'abord)
  - `pub(crate) fn read_fill<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<FillFields>`
  - `pub(crate) fn fill_prelim(id: &str, rings: &[Vec<f64>], color: &str) -> Option<MapPrelim>` (anneaux **monde**)
  - `impl Document { pub(crate) fn insert_fill(&mut self, page: &str, rings: &[Vec<f64>], color: &str) -> Result<Change, CommandError> }`
  - `FillTarget::Zone { x: f64, y: f64, tol: f64 }`
  - `pub fn closed_zone(walls: &[Wall], x: f64, y: f64, tol: f64) -> Zone` ; `pub enum Zone { Outside, OnWall, Open, Closed(Vec<Vec<f64>>) }` ; `pub struct Wall { pub rings: Vec<Vec<f32>>, pub even_odd: bool, pub bounds: Bounds }`
  - `impl Document { pub(crate) fn zone_walls(&self, page: &str) -> Vec<Wall>; pub fn zone_cells(&self, page: &str, tol: f64) -> u32 }`
  - `pub fn shape_ring(kind: ShapeKind, w: f64, h: f64, width: f32) -> Option<(Vec<f32>, Vec<f32>)>`
  - Wasm : `fill_zone(page: &str, x: f64, y: f64, tol: f64, color: Option<String>) -> Result<JsValue, JsError>`, `zone_cells(page: &str, tol: f64) -> u32`, `fill_zone_inner(...) -> Result<Change, CommandError>`
  - Format : Y.Map `{ id, kind: "fill", transform: [1,0,0,1,x0,y0], w, h, color, contours: [[x, y, …], …] }` (f64 positionnels, repère local)
- Réutilise : `crates/roomboard-core/src/document.rs:517` `cached_outline` — `cached_outline(id, &style, &pts)` (contour d'un trait, lu sans modification)
- Réutilise : `crates/roomboard-core/src/query.rs:95` `world_outline` — `world_outline(&t, &poly)`
- Réutilise : `crates/roomboard-core/src/query.rs:136` `element_geom`, par `Document::bounds` (`query.rs:268`) — `bounds(&[id])` donne la boîte des images, textes, tableaux, médias, objets 3D et éléments inconnus (pas de modification de `query.rs` ici : T2 l'étend)
- Réutilise : `crates/roomboard-core/src/shape.rs:70` `shape_polygon` — étendu à côté par `pub fn shape_ring(kind, w, h, width) -> Option<(Vec<f32>, Vec<f32>)>`
- Réutilise : `crates/roomboard-core/src/fill.rs:19` `FillTarget`, `:46` `cmd_fill` — variante `Zone { x, y, tol }`, étendus
- Réutilise : crate `i_overlay` 9.2.0 — `FloatOverlay::with_subj_and_clip(&subj, &clip).overlay(OverlayRule::Difference, FillRule::NonZero)`, `FloatOverlay::with_subj(&s).overlay(OverlayRule::Subject, FillRule::EvenOdd)`
- Réutilise : `crates/roomboard-wasm/src/lib.rs:1790` `fill_inner`, patron `fill_image` (`:1249`, `:1810`) — `pub fn fill_zone(&mut self, page: &str, x: f64, y: f64, tol: f64, color: Option<String>)`
- Nouveau module (rien d'existant, cadrage « Modules à réutiliser ») : rastérisation, dilatation, diffusion dans `zone.rs` (`Mask { w, h, cell, origin, cells }`, `paint`, `dilate_in_place`, `flood_spans`, `runs`) ; murs (`Wall`, `zone_walls`) ; calcul (`closed_zone`, `Zone`).

**Patron à ne pas reprendre (concepteur-critique) :**
- La diffusion RVBA de C6b, `crates/roomboard-formats/src/pixels.rs:69-140` (`flood_region`, pile de pixels, dans `formats`) : inaccessible depuis le cœur et trop gourmande ; ici, diffusion **par segments de ligne** dans un seul masque `u8` (HC8-13).
- Une union `i_overlay` par mur (normaliser chaque trait par sa propre opération) : 300 opérations par clic ; ici, une seule opération `Difference`, les anneaux des murs non-nuls orientés positifs, seuls les murs pair-impair (anneaux, `fill`) normalisés un par un.
- Le parcours de `geoms` (`query.rs:211-226`) recopié pour les murs : il ne porte ni anneau ni règle ; `zone_walls` lit lui-même trait, forme et `fill`, et ne prend que la boîte du reste.
- Chemin de référence : cadrage Q6, Q9, Q10, Q20 (`docs/plans/usage-c8-pot-zones-cadrage.md:26`, `:29`, `:30`, `:40`) ; `crates/roomboard-core/src/fill.rs:46-117` ; `crates/roomboard-core/src/commands.rs:862-905` (`cmd_add_shape`, insertion d'un élément).

**Test et commande bornée :**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && cargo test -p roomboard-core --features zone 2>&1 | grep -E "^test (zone|fill|shape)::|test result" | tail -40
```
Preuve qu'il a tourné : ≥ 1 ligne `test zone::tests::square_gap_1px_closes_3px_leaks ... ok`, aucune ligne `FAILED`, chaque `test result: ok`.

**Preuve visuelle :** aucune (cœur).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC2 — Plafonds Wasm : principal 1 572 864 o (garde-fou du cadrage 1 420 000 o → repli HU2-8), formats 3 145 728 o ; ni baissés ni relevés. Aucun troisième module Wasm. Aujourd'hui : principal 1 145 044 o, formats 3 100 344 o.
- GC3 — `ink::outline` lu sans être modifié.
- GC6 — Aucune dépendance GPL/AGPL/LGPL ; `THIRD_PARTY_NOTICES.md` complété pour `i_overlay` et ses dépendances.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC10 — Trois couches testables seules : `crates/` (cœur Rust, sans dépendance au navigateur).
- GC11 — `roomboard-formats` et `roomboard-formats-wasm` ne reçoivent jamais la fonctionnalité `zone`.

**Interdits :** toucher `query.rs`, `element.rs`, `document.rs` (T2) ; toucher `crates/roomboard-core/src/ink/` ; ajouter une autre crate qu'`i_overlay` ; créer un Worker ou un troisième module ; modifier `scripts/verifier.sh`.

**Critère « terminé » :** commande bornée verte ; `cargo test -p roomboard-core 2>&1 | grep "test result"` vert sans la fonctionnalité ; `cargo test -p roomboard-wasm fill_zone` vert ; `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -- -D warnings` muets ; module principal ≤ **1 420 000 o** et formats ≤ 3 145 728 o relevés dans `docs/essais/taille-wasm.md`. Si le module principal dépasse 1 420 000 o : s'arrêter après l'étape 13 et rapporter `BLOQUÉ : garde-fou de taille <N> o (repli HU2-8)`. Rapport : ligne `Réutilisation : appelé cached_outline, world_outline, bounds, shape_polygon, i_overlay` ou `Réutilisation : écart — <pourquoi>`, et les deux tailles mesurées.

**Étapes :**

- [ ] **Étape 1 : préparer le worktree et brancher `i_overlay` derrière `zone`**

`crates/roomboard-core/Cargo.toml`, ajouter sous `[dependencies]` puis une section `[features]` :
```toml
i_overlay = { version = "=9.2.0", optional = true, default-features = false }

[features]
# C8 (DA-Z1, Q4) : zone fermée du pot (rastérisation et `i_overlay`) ; activée par roomboard-wasm seul, jamais par
# roomboard-formats (marge de 45 Ko).
zone = ["dep:i_overlay"]
```
`crates/roomboard-wasm/Cargo.toml` : remplacer la ligne `roomboard-core = { path = "../roomboard-core" }` par
```toml
roomboard-core = { path = "../roomboard-core", features = ["zone"] }
```
`crates/roomboard-core/src/lib.rs` : après `pub mod fill;`, ajouter
```rust
pub mod fill_element;
```
et après `pub mod table;`, ajouter
```rust
#[cfg(feature = "zone")]
pub mod zone;
```
Lancer : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && cargo tree -p roomboard-core --features zone -e normal 2>&1 | grep -E "i_|libm" | head` (si le réseau manque : ajouter `--offline`, les crates sont dans `~/.cargo/registry`). Attendu : `i_overlay v9.2.0`, `i_float v5.0.0`, `i_shape v5.0.0`, `i_tree v0.20.0`, `i_key_sort v0.12.0`, `libm`. `Cargo.lock` est mis à jour.

- [ ] **Étape 2 : écrire `shape_ring` et son test rouge**

Dans `crates/roomboard-core/src/shape.rs`, ajouter le test dans le module de tests existant (ou en créer un en fin de fichier) :
```rust
    /// C8 (Q8) : anneau d'un rectangle non rempli : extérieur `shape_polygon`, intérieur à −½ épaisseur en sens inverse ;
    /// ligne et flèche : `None` ; forme plus fine que son trait : intérieur vide.
    #[test]
    fn shape_ring_rect_has_reversed_inner_at_half_width() {
        let (outer, inner) = shape_ring(ShapeKind::Rect, 50.0, 40.0, 4.0).expect("anneau");
        assert_eq!(outer, shape_polygon(ShapeKind::Rect, 50.0, 40.0, 4.0));
        assert_eq!(inner, vec![2.0, 2.0, 2.0, 38.0, 48.0, 38.0, 48.0, 2.0]);
        let (_, e) = shape_ring(ShapeKind::Ellipse, 50.0, 40.0, 4.0).expect("ellipse");
        assert_eq!(e.len(), 2 * ELLIPSE_VERTICES);
        assert_eq!(shape_ring(ShapeKind::Line, 50.0, 40.0, 4.0), None);
        assert_eq!(shape_ring(ShapeKind::Arrow, 50.0, 40.0, 4.0), None);
        assert_eq!(shape_ring(ShapeKind::Rect, 3.0, 40.0, 4.0).map(|r| r.1), Some(Vec::new()));
    }
```
Lancer : `cargo test -p roomboard-core shape_ring 2>&1 | tail -5`. Attendu : échec de compilation `cannot find function shape_ring`.

- [ ] **Étape 3 : écrire `shape_ring`**

Dans `crates/roomboard-core/src/shape.rs`, juste après `shape_polygon` :
```rust
/// Anneau d'un rectangle ou d'une ellipse non remplis (C8, Q8 : murs d'une zone) : extérieur = `shape_polygon` (+½
/// épaisseur, au moins 1), intérieur à −½ épaisseur parcouru en sens inverse (pair-impair comme non-nul) ; intérieur vide
/// si la forme est plus fine que deux demi-épaisseurs ; `None` pour une ligne ou une flèche.
pub fn shape_ring(kind: ShapeKind, w: f64, h: f64, width: f32) -> Option<(Vec<f32>, Vec<f32>)> {
    if kind.is_segment() {
        return None;
    }
    let outer = shape_polygon(kind, w, h, width);
    let half = (f64::from(width) / 2.0).max(1.0);
    if w <= 2.0 * half || h <= 2.0 * half {
        return Some((outer, Vec::new()));
    }
    let inner: Vec<f64> = match kind {
        ShapeKind::Rect => vec![half, half, half, h - half, w - half, h - half, w - half, half],
        _ => {
            let (cx, cy, rx, ry) = (w / 2.0, h / 2.0, w / 2.0 - half, h / 2.0 - half);
            (0..ELLIPSE_VERTICES)
                .flat_map(|k| {
                    let t = std::f64::consts::PI
                        - 2.0 * std::f64::consts::PI * k as f64 / ELLIPSE_VERTICES as f64;
                    [cx + rx * t.cos(), cy + ry * t.sin()]
                })
                .collect()
        }
    };
    Some((outer, inner.into_iter().map(|v| v as f32).collect()))
}
```
Lancer : `cargo test -p roomboard-core shape_ring 2>&1 | grep -E "^test |test result"`. Attendu : `test shape::tests::shape_ring_rect_has_reversed_inner_at_half_width ... ok`.

- [ ] **Étape 4 : écrire `fill_element.rs` (schéma du `fill`)**

Créer `crates/roomboard-core/src/fill_element.rs` :
```rust
//! Élément `fill` (C8, Q11, DA-Z4) : Y.Map `{ id, kind: "fill", transform, w, h, color, contours }` ; `contours` est un
//! `Any::Array` d'`Any::Array` positionnels de f64 en repère local, l'extérieur d'abord, les trous ensuite. Écrit par la
//! zone du pot (`zone.rs`), lu par la vue, la collision et les anneaux (T2), et par les murs d'une zone suivante.
#![cfg_attr(not(feature = "zone"), allow(dead_code))]
use yrs::{Any, Array, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{
    any_f64, finite_positive, out_f64, out_string, out_transform, transform_to_any, Transform,
};
use crate::rich_text::valid_color;

pub const FILL_KIND: &str = "fill";

/// Champs lus d'un `fill` ; `rings` en repère local, extérieur d'abord, au moins un anneau de 3 points.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct FillFields {
    pub transform: Transform,
    pub w: f64,
    pub h: f64,
    pub color: String,
    pub rings: Vec<Vec<f64>>,
}

/// `None` si l'élément n'est pas un `fill` ou s'il est mal formé (transform, `w`, `h` finis > 0, couleur, anneaux de 3
/// points finis au moins) : la vue en fait alors un cadre inconnu (Q11).
pub(crate) fn read_fill<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<FillFields> {
    if out_string(e.get(txn, "kind"))? != FILL_KIND {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let (w, h) = (out_f64(e.get(txn, "w"))?, out_f64(e.get(txn, "h"))?);
    if !(finite_positive(w) && finite_positive(h)) {
        return None;
    }
    let color = out_string(e.get(txn, "color")).filter(|c| valid_color(c))?;
    let Some(Out::Any(Any::Array(items))) = e.get(txn, "contours") else {
        return None;
    };
    let mut rings = Vec::with_capacity(items.len());
    for item in items.iter() {
        let Any::Array(values) = item else {
            return None;
        };
        if values.len() < 6 || !values.len().is_multiple_of(2) {
            return None;
        }
        rings.push(
            values
                .iter()
                .map(|v| any_f64(v).filter(|f| f.is_finite()))
                .collect::<Option<Vec<f64>>>()?,
        );
    }
    (!rings.is_empty()).then_some(FillFields {
        transform,
        w,
        h,
        color,
        rings,
    })
}

/// Y.Map d'un `fill` depuis des anneaux **monde** : translation au coin de leur boîte, `w`, `h` de la boîte (un build
/// d'avant C8 dessine ainsi le cadre inconnu à la bonne taille), anneaux ramenés en local. `None` sans anneau, avec un
/// anneau de moins de 3 points ou non fini, ou une boîte vide.
pub(crate) fn fill_prelim(id: &str, rings: &[Vec<f64>], color: &str) -> Option<MapPrelim> {
    if rings.is_empty()
        || rings.iter().any(|r| {
            r.len() < 6 || !r.len().is_multiple_of(2) || r.iter().any(|v| !v.is_finite())
        })
    {
        return None;
    }
    let (mut x0, mut y0, mut x1, mut y1) = (
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    );
    for p in rings.iter().flat_map(|r| r.chunks_exact(2)) {
        x0 = x0.min(p[0]);
        y0 = y0.min(p[1]);
        x1 = x1.max(p[0]);
        y1 = y1.max(p[1]);
    }
    let (w, h) = (x1 - x0, y1 - y0);
    if !(finite_positive(w) && finite_positive(h)) {
        return None;
    }
    let contours: Vec<Any> = rings
        .iter()
        .map(|r| {
            let local: Vec<Any> = r
                .chunks_exact(2)
                .flat_map(|p| [Any::from(p[0] - x0), Any::from(p[1] - y0)])
                .collect();
            Any::Array(local.into())
        })
        .collect();
    let fields: Vec<(&str, In)> = vec![
        ("id", In::from(id)),
        ("kind", In::from(FILL_KIND)),
        (
            "transform",
            In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, x0, y0])),
        ),
        ("w", In::Any(Any::from(w))),
        ("h", In::Any(Any::from(h))),
        ("color", In::from(color)),
        ("contours", In::Any(Any::Array(contours.into()))),
    ];
    Some(fields.into_iter().collect())
}

impl Document {
    /// Nouvel élément `fill` en haut de `page` (C8, Q10) : une transaction, une étape, `Change.ids = [id neuf]` ;
    /// anneaux monde, extérieur d'abord ; anneaux illisibles : `BadFill`.
    pub(crate) fn insert_fill(
        &mut self,
        page: &str,
        rings: &[Vec<f64>],
        color: &str,
    ) -> Result<Change, CommandError> {
        let elements = self.page_elements_or_err(page)?;
        let id = yrs::uuid_v4().to_string();
        let prelim = fill_prelim(&id, rings, color).ok_or(CommandError::BadFill)?;
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, prelim);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }
}
```
Si `Array` est signalé inutilisé par le compilateur, le retirer de l'import (`push_back` vient du trait `Array`, il sert normalement).

- [ ] **Étape 5 : tests rouges de `fill.rs` (cible `Zone`, recoloration d'un `fill`)**

À la fin de `crates/roomboard-core/src/fill.rs`, ajouter :
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::Command;
    use crate::fill_element::read_fill;

    fn zone(p: &str, x: f64, y: f64, tol: f64, color: Option<&str>) -> Command {
        Command::Fill {
            page: p.to_string(),
            target: FillTarget::Zone { x, y, tol },
            color: color.map(str::to_string),
        }
    }
    fn background(d: &Document, p: &str) -> String {
        d.page(p).expect("page").background
    }

    /// Q10, effet de bord 1 : page sans mur : `Zone` = `Background` (une étape) ; même valeur : aucune étape (D38).
    #[test]
    fn zone_on_empty_page_is_background_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d.apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8"))).expect("zone");
        assert_eq!((c.pages.clone(), c.ids.len()), (vec![p.clone()], 0));
        assert_eq!(background(&d, &p), "#1d4ed8");
        let v = d.version();
        d.apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8"))).expect("même");
        assert_eq!(d.version(), v);
    }

    /// PC2, Q10 : couleur, puis page, puis `tol` non fini ou ≤ 0 (et `x`, `y` non finis) → `BadFill`.
    #[test]
    fn zone_refusals_follow_pc2_order() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.apply(zone("nope", 1.0, 1.0, 0.0, Some("#12"))), Err(CommandError::BadFill));
        assert_eq!(
            d.apply(zone("nope", 1.0, 1.0, 0.0, Some("#facc15"))),
            Err(CommandError::UnknownPage("nope".into()))
        );
        for (x, tol) in [(1.0, 0.0), (1.0, -2.0), (1.0, f64::NAN), (1.0, f64::INFINITY), (f64::NAN, 2.0)] {
            assert_eq!(d.apply(zone(&p, x, 1.0, tol, Some("#facc15"))), Err(CommandError::BadFill));
        }
    }

    /// Q14 : `Fill Inside { id }` et `Edge { id }` d'un `fill` écrivent `color` (une étape) ; « Aucune » : aucune étape.
    #[test]
    fn fill_inside_recolors_fill_and_none_is_no_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .insert_fill(&p, &[vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0]], "#facc15")
            .expect("fill")
            .ids[0]
            .clone();
        let color = |d: &Document| {
            let txn = d.read();
            let f = d.find_element(&txn, &id).expect("élément");
            read_fill(&txn, &f.element).expect("fill lisible").color
        };
        let c = d
            .apply(Command::Fill { page: p.clone(), target: FillTarget::Inside { id: id.clone() }, color: Some("#dc2626".into()) })
            .expect("recolorer");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(color(&d), "#dc2626");
        let v = d.version();
        d.apply(Command::Fill { page: p.clone(), target: FillTarget::Inside { id: id.clone() }, color: None })
            .expect("aucune");
        assert_eq!((d.version(), color(&d)), (v, "#dc2626".to_string()));
        d.apply(Command::Fill { page: p.clone(), target: FillTarget::Edge { id: id.clone() }, color: Some("#16a34a".into()) })
            .expect("contour");
        assert_eq!(color(&d), "#16a34a");
    }

    /// Q10 : cœur construit sans `zone` (pour `formats`, qui n'envoie jamais de commande) : `Zone` = `Background`.
    #[cfg(not(feature = "zone"))]
    #[test]
    fn zone_without_feature_is_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .insert_fill(&p, &[vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0]], "#facc15")
            .expect("fill")
            .ids[0]
            .clone();
        let c = d.apply(zone(&p, 300.0, 300.0, 2.0, Some("#1d4ed8"))).expect("zone");
        assert!(c.ids.is_empty());
        assert_eq!(background(&d, &p), "#1d4ed8");
        assert_eq!(d.element_ids(&p), vec![id]);
    }
}
```
Lancer : `cargo test -p roomboard-core --features zone fill::tests 2>&1 | tail -5`. Attendu : échec de compilation (`no variant named Zone`).

- [ ] **Étape 6 : écrire la cible `Zone` dans `fill.rs`**

Dans `crates/roomboard-core/src/fill.rs` :
1. En-tête : remplacer « C8 ajoutera une variante. » par « C8 : zone fermée (`FillTarget::Zone`, `cmd_fill_zone`, `zone.rs`) ; un `fill` se recolore par `color`. »
2. Ajouter l'import `use crate::fill_element::FILL_KIND;`.
3. Variante, dans `enum FillTarget` après `Image { … }` :
```rust
    /// C8 (Q10, DA-Z3) : zone fermée au point (x, y) monde, tolérance de fermeture `tol` monde (2 px de la vue / zoom) ;
    /// décidée à l'écriture par le cœur, sinon le fond.
    Zone { x: f64, y: f64, tol: f64 },
```
4. `field_for` : ajouter avant `_ => None,` la ligne
```rust
        Some(FILL_KIND) => Some("color"),
```
5. `cmd_fill` : juste après le bloc `if let FillTarget::Image { id, asset } = target { … }`, ajouter
```rust
        if let FillTarget::Zone { x, y, tol } = target {
            return self.cmd_fill_zone(page, *x, *y, *tol, color);
        }
```
et remplacer le bras `FillTarget::Image { .. } => return Err(CommandError::BadFill),` par
```rust
                FillTarget::Image { .. } | FillTarget::Zone { .. } => {
                    return Err(CommandError::BadFill)
                }
```
6. Dans `impl Document`, après `cmd_fill` :
```rust
    /// C8 (Q10, DA-Z3) : page, puis `x`, `y`, `tol` finis et `tol` > 0, sinon `BadFill`. Zone fermée : nouvel élément
    /// `fill` en haut de la page (« Aucune » : fond `#ffffff`, HC8-6) ; clic sur un mur dilaté : aucune étape ; hors de
    /// la boîte des murs, zone ouverte, ou cœur sans `zone` : `Background` (C6a).
    fn cmd_fill_zone(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<&str>,
    ) -> Result<Change, CommandError> {
        {
            let txn = self.read();
            if self.find_page(&txn, page).is_none() {
                return Err(CommandError::UnknownPage(page.to_string()));
            }
        }
        if !(tol.is_finite() && tol > 0.0 && x.is_finite() && y.is_finite()) {
            return Err(CommandError::BadFill);
        }
        #[cfg(feature = "zone")]
        {
            use crate::zone::{closed_zone, Zone};
            match closed_zone(&self.zone_walls(page), x, y, tol) {
                Zone::OnWall => return Ok(self.unchanged()),
                Zone::Closed(rings) => {
                    if let Some(c) = color {
                        return self.insert_fill(page, &rings, c);
                    }
                }
                Zone::Outside | Zone::Open => {}
            }
        }
        self.cmd_fill(page, &FillTarget::Background, color)
    }
```
Lancer : `cargo test -p roomboard-core fill::tests 2>&1 | grep -E "^test |test result"` (sans la fonctionnalité). Attendu : 4 tests `ok`, dont `zone_without_feature_is_background`. Avec `--features zone`, la compilation échoue tant que `zone.rs` n'existe pas : normal.

- [ ] **Étape 7 : tests rouges de `zone.rs` (murs abstraits)**

Créer `crates/roomboard-core/src/zone.rs` avec, pour l'instant, seulement son en-tête et ses tests :
```rust
//! Zone fermée du pot (C8, U28 P3, DA-Z1, DA-Z2) : les murs de la page sont rastérisés sur la vue (1 cellule = 1 px de la
//! vue = `tol / 2` en monde), dilatés d'une cellule (voisinage 8 : les écarts ≤ 2 px se ferment), puis le clic diffuse
//! en 4-connexité. Bord de l'emprise atteint : zone ouverte. Sinon, la région agrandie de 2 cellules, moins les polygones
//! exacts des murs (`i_overlay`), donne la forme qui contient le clic. `closed_zone` est pure : le Worker du repli DA-Z5
//! n'aura qu'à l'appeler. Mémoire : un seul masque `u8` (2²² cellules au plus), rendu à la fin (Q20).

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::Command;
    use crate::element::StrokeStyle;
    use crate::fill::FillTarget;
    use crate::fill_element::read_fill;

    fn rect_wall(x0: f32, y0: f32, x1: f32, y1: f32) -> Wall {
        Wall::new(vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]], false).expect("mur")
    }
    /// Carré (100, 100)-(500, 500), murs de 4 ; le mur de gauche commence `gap` sous le mur du haut.
    fn square(gap: f32) -> Vec<Wall> {
        vec![
            rect_wall(100.0, 100.0, 500.0, 104.0),
            rect_wall(496.0, 100.0, 500.0, 500.0),
            rect_wall(100.0, 496.0, 500.0, 500.0),
            rect_wall(100.0, 104.0 + gap, 104.0, 500.0),
        ]
    }
    fn ring_box(r: &[f64]) -> [f64; 4] {
        r.chunks_exact(2).fold(
            [f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY],
            |b, p| [b[0].min(p[0]), b[1].min(p[1]), b[2].max(p[0]), b[3].max(p[1])],
        )
    }
    fn near(a: [f64; 4], b: [f64; 4]) -> bool {
        a.iter().zip(b).all(|(x, y)| (x - y).abs() <= 1e-3)
    }

    /// Q6 : une cellule est un mur si son centre est dans le mur ; non-nul (anneau intérieur de même sens : plein) et
    /// pair-impair (trou).
    #[test]
    fn paint_marks_cell_centres_nonzero_and_even_odd() {
        let g = Grid { w: 20, h: 20, cell: 1.0, origin: [0.0, 0.0] };
        let count = |m: &Mask| m.cells.iter().filter(|c| **c == WALL).count();
        let mut m = Mask::new(g);
        m.paint(&rect_wall(2.0, 2.0, 12.0, 12.0));
        assert_eq!(count(&m), 100);
        let ring = |eo| {
            Wall::new(
                vec![vec![2.0, 2.0, 12.0, 2.0, 12.0, 12.0, 2.0, 12.0], vec![5.0, 5.0, 9.0, 5.0, 9.0, 9.0, 5.0, 9.0]],
                eo,
            )
            .expect("anneau")
        };
        let mut m = Mask::new(g);
        m.paint(&ring(true));
        assert_eq!(count(&m), 84);
        let mut m = Mask::new(g);
        m.paint(&ring(false));
        assert_eq!(count(&m), 100);
    }

    /// U28 (« tolérance de fermeture 2 px ») : à `tol` = 2 (cellule 1), un écart de 1 ou 2 se ferme, 3 fuit.
    #[test]
    fn square_gap_1px_closes_3px_leaks() {
        assert!(matches!(closed_zone(&square(1.0), 300.0, 300.0, 2.0), Zone::Closed(_)));
        assert!(matches!(closed_zone(&square(2.0), 300.0, 300.0, 2.0), Zone::Closed(_)));
        assert_eq!(closed_zone(&square(3.0), 300.0, 300.0, 2.0), Zone::Open);
    }

    /// Q10 : hors de la boîte des murs agrandie : `Outside` ; dans un mur ou dans sa dilatation : `OnWall` ; sans mur : `Outside`.
    #[test]
    fn outside_box_and_on_wall() {
        assert_eq!(closed_zone(&square(0.0), 900.0, 900.0, 2.0), Zone::Outside);
        assert_eq!(closed_zone(&square(0.0), 102.0, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&square(0.0), 104.3, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&[], 300.0, 300.0, 2.0), Zone::Outside);
    }

    /// Q9, HC8-3 : bords exacts sur les murs ; un îlot est un trou exact.
    #[test]
    fn closed_zone_edges_follow_walls_and_islands_are_holes() {
        let mut walls = square(0.0);
        walls.push(rect_wall(250.0, 250.0, 270.0, 270.0));
        let Zone::Closed(rings) = closed_zone(&walls, 300.0, 300.0, 2.0) else {
            panic!("zone fermée attendue");
        };
        assert_eq!(rings.len(), 2);
        assert!(near(ring_box(&rings[0]), [104.0, 104.0, 496.0, 496.0]), "{:?}", ring_box(&rings[0]));
        assert!(near(ring_box(&rings[1]), [250.0, 250.0, 270.0, 270.0]), "{:?}", ring_box(&rings[1]));
    }

    /// Q20, HC8-11 : au-delà de 2²² cellules, la cellule double (puis quadruple) ; au-delà, aucune grille (fond).
    #[test]
    fn fit_doubles_cells_then_gives_up() {
        let corners = |s: f32| vec![rect_wall(0.0, 0.0, 1.0, 1.0), rect_wall(s - 1.0, s - 1.0, s, s)];
        let g = fit(&corners(2000.0), 2.0).expect("grille");
        assert_eq!((g.w, g.h, g.cell), (2004, 2004, 1.0));
        let g = fit(&corners(3000.0), 2.0).expect("grille");
        assert_eq!((g.w, g.h, g.cell, g.origin), (1504, 1504, 2.0, [-4.0, -4.0]));
        assert_eq!(fit(&corners(20000.0), 2.0), None);
        assert_eq!(closed_zone(&corners(20000.0), 10.0, 10.0, 2.0), Zone::Open);
    }
}
```
Lancer : `cargo test -p roomboard-core --features zone zone:: 2>&1 | tail -5`. Attendu : échec de compilation (`cannot find type Wall`).

- [ ] **Étape 8 : écrire les types, la grille et le masque**

Dans `zone.rs`, entre l'en-tête et `#[cfg(test)]` :
```rust
use i_overlay::core::fill_rule::FillRule;
use i_overlay::core::overlay_rule::OverlayRule;
use i_overlay::float::overlay::FloatOverlay;
use yrs::{Array, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_stroke};
use crate::document::Document;
use crate::element::{out_string, out_transform};
use crate::fill_element::read_fill;
use crate::query::{world_outline, Bounds};
use crate::shape::{shape_polygon, shape_ring};

/// Plafond du masque (Q20) : 2²² cellules, 4 Mio.
pub const MAX_CELLS: usize = 1 << 22;
/// Px de la vue par cellule, essayés dans l'ordre (Q20) ; la dilatation reste d'une cellule.
const FACTORS: [f64; 3] = [1.0, 2.0, 4.0];
const FREE: u8 = 0;
const WALL: u8 = 1;
const REGION: u8 = 2;

type Contour = Vec<[f64; 2]>;

/// Mur d'une zone (Q8) : anneaux monde (paires x, y), règle de remplissage, boîte des sommets finis.
#[derive(Debug, Clone, PartialEq)]
pub struct Wall {
    pub rings: Vec<Vec<f32>>,
    pub even_odd: bool,
    pub bounds: Bounds,
}

/// Décision du clic (Q10) ; `Closed` : anneaux monde `[x0, y0, x1, y1, …]`, extérieur d'abord, trous ensuite.
#[derive(Debug, Clone, PartialEq)]
pub enum Zone {
    Outside,
    OnWall,
    Open,
    Closed(Vec<Vec<f64>>),
}

/// Double de l'aire signée (positive dans le sens de `i_overlay` pour un extérieur).
fn area2(r: &[[f64; 2]]) -> f64 {
    let n = r.len();
    (0..n)
        .map(|i| {
            let (a, b) = (r[i], r[(i + 1) % n]);
            a[0] * b[1] - b[0] * a[1]
        })
        .sum()
}

impl Wall {
    /// `None` sans aucun sommet fini.
    pub fn new(rings: Vec<Vec<f32>>, even_odd: bool) -> Option<Wall> {
        let mut b: Option<Bounds> = None;
        for c in rings.iter().flat_map(|r| r.as_chunks::<2>().0) {
            if !(c[0].is_finite() && c[1].is_finite()) {
                continue;
            }
            let (x, y) = (f64::from(c[0]), f64::from(c[1]));
            b = Some(match b {
                None => Bounds { x0: x, y0: y, x1: x, y1: y },
                Some(o) => Bounds { x0: o.x0.min(x), y0: o.y0.min(y), x1: o.x1.max(x), y1: o.y1.max(y) },
            });
        }
        Some(Wall { rings, even_odd, bounds: b? })
    }

    /// Anneaux de 3 sommets finis au moins, en f64.
    fn contours(&self) -> Vec<Contour> {
        self.rings
            .iter()
            .map(|r| {
                r.as_chunks::<2>()
                    .0
                    .iter()
                    .filter(|c| c[0].is_finite() && c[1].is_finite())
                    .map(|c| [f64::from(c[0]), f64::from(c[1])])
                    .collect::<Contour>()
            })
            .filter(|c| c.len() >= 3)
            .collect()
    }
}

/// Emprise du masque : boîte des murs agrandie de 2 cellules (Q20).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Grid {
    pub w: usize,
    pub h: usize,
    pub cell: f64,
    pub origin: [f64; 2],
}

fn walls_bounds(walls: &[Wall]) -> Option<Bounds> {
    walls.iter().map(|w| w.bounds).reduce(|a, b| Bounds {
        x0: a.x0.min(b.x0),
        y0: a.y0.min(b.y0),
        x1: a.x1.max(b.x1),
        y1: a.y1.max(b.y1),
    })
}

/// Grille du clic à `tol` : 1, puis 2, puis 4 px de la vue par cellule, la première qui tient sous `MAX_CELLS`.
pub(crate) fn fit(walls: &[Wall], tol: f64) -> Option<Grid> {
    let b = walls_bounds(walls)?;
    FACTORS.iter().find_map(|f| {
        let cell = tol / 2.0 * f;
        let w = ((b.x1 - b.x0) / cell).ceil() + 4.0;
        let h = ((b.y1 - b.y0) / cell).ceil() + 4.0;
        (w * h <= MAX_CELLS as f64).then(|| Grid {
            w: w as usize,
            h: h as usize,
            cell,
            origin: [b.x0 - 2.0 * cell, b.y0 - 2.0 * cell],
        })
    })
}

/// Masque unique (Q20) : `FREE`, `WALL`, `REGION`, une cellule par octet.
struct Mask {
    w: usize,
    h: usize,
    cell: f64,
    origin: [f64; 2],
    cells: Vec<u8>,
}

impl Mask {
    fn new(g: Grid) -> Mask {
        Mask { w: g.w, h: g.h, cell: g.cell, origin: g.origin, cells: vec![FREE; g.w * g.h] }
    }

    fn cell_of(&self, x: f64, y: f64) -> Option<(usize, usize)> {
        let i = ((x - self.origin[0]) / self.cell).floor();
        let j = ((y - self.origin[1]) / self.cell).floor();
        (i >= 0.0 && j >= 0.0 && i < self.w as f64 && j < self.h as f64).then(|| (i as usize, j as usize))
    }

    /// Première cellule dont le centre est ≥ `v` sur un axe d'origine `o`, bornée à [0, n].
    fn first_centre(v: f64, o: f64, c: f64, n: usize) -> usize {
        let k = ((v - o) / c - 0.5).ceil();
        if k <= 0.0 {
            0
        } else if k >= n as f64 {
            n
        } else {
            k as usize
        }
    }

    /// Balayage par lignes : chaque arête coupe les lignes dont le centre est dans [ya, yb) ; cellules dont le centre
    /// est dedans (non-nul ou pair-impair selon le mur) marquées `WALL`.
    fn paint(&mut self, wall: &Wall) {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let mut xs: Vec<(usize, f64, i32)> = Vec::new();
        for ring in wall.contours() {
            let n = ring.len();
            for k in 0..n {
                let ([x0, y0], [x1, y1]) = (ring[k], ring[(k + 1) % n]);
                if y0 == y1 {
                    continue;
                }
                let (d, ya, yb, xa, xb) = if y0 < y1 { (1, y0, y1, x0, x1) } else { (-1, y1, y0, x1, x0) };
                for j in Self::first_centre(ya, oy, c, self.h)..Self::first_centre(yb, oy, c, self.h) {
                    let yc = oy + (j as f64 + 0.5) * c;
                    xs.push((j, xa + (yc - ya) * (xb - xa) / (yb - ya), d));
                }
            }
        }
        xs.sort_unstable_by(|a, b| a.0.cmp(&b.0).then(a.1.total_cmp(&b.1)));
        let mut k = 0;
        while k < xs.len() {
            let j = xs[k].0;
            let (mut wind, mut odd, mut start) = (0i32, false, 0.0);
            while k < xs.len() && xs[k].0 == j {
                let (_, x, d) = xs[k];
                let was = if wall.even_odd { odd } else { wind != 0 };
                wind += d;
                odd = !odd;
                let now = if wall.even_odd { odd } else { wind != 0 };
                if !was && now {
                    start = x;
                }
                if was && !now {
                    let i0 = Self::first_centre(start, ox, c, self.w);
                    let i1 = Self::first_centre(x, ox, c, self.w).max(i0);
                    self.cells[j * self.w + i0..j * self.w + i1].fill(WALL);
                }
                k += 1;
            }
        }
    }

    fn horiz(row: &[u8], v: u8, out: &mut [u8]) {
        let n = row.len();
        for (i, o) in out.iter_mut().enumerate() {
            let l = i > 0 && row[i - 1] == v;
            let r = i + 1 < n && row[i + 1] == v;
            *o = u8::from(l || row[i] == v || r);
        }
    }

    /// Dilatation 3 × 3 (voisinage 8) des cellules `v`, sur place : trois lignes de tampon (Q20).
    fn dilate_in_place(&mut self, v: u8) {
        let w = self.w;
        let (mut prev, mut cur, mut next) = (vec![0u8; w], vec![0u8; w], vec![0u8; w]);
        Self::horiz(&self.cells[..w], v, &mut cur);
        for j in 0..self.h {
            if j + 1 < self.h {
                Self::horiz(&self.cells[(j + 1) * w..(j + 2) * w], v, &mut next);
            } else {
                next.fill(0);
            }
            for (i, c) in self.cells[j * w..(j + 1) * w].iter_mut().enumerate() {
                if prev[i] | cur[i] | next[i] != 0 {
                    *c = v;
                }
            }
            std::mem::swap(&mut prev, &mut cur);
            std::mem::swap(&mut cur, &mut next);
        }
    }

    /// Diffusion 4-connexe par segments de ligne depuis (cx, cy), marquée `REGION` ; `false` dès que le bord de
    /// l'emprise est atteint (zone ouverte).
    fn flood_spans(&mut self, cx: usize, cy: usize) -> bool {
        let (w, h) = (self.w, self.h);
        let mut stack = vec![(cx, cy)];
        while let Some((x, y)) = stack.pop() {
            let row = y * w;
            if self.cells[row + x] != FREE {
                continue;
            }
            let (mut l, mut r) = (x, x);
            while l > 0 && self.cells[row + l - 1] == FREE {
                l -= 1;
            }
            while r + 1 < w && self.cells[row + r + 1] == FREE {
                r += 1;
            }
            if l == 0 || r == w - 1 || y == 0 || y == h - 1 {
                return false;
            }
            self.cells[row + l..=row + r].fill(REGION);
            for ny in [y - 1, y + 1] {
                let nrow = ny * w;
                let mut i = l;
                while i <= r {
                    if self.cells[nrow + i] == FREE {
                        stack.push((i, ny));
                        while i <= r && self.cells[nrow + i] == FREE {
                            i += 1;
                        }
                    } else {
                        i += 1;
                    }
                }
            }
        }
        true
    }

    /// Suites de cellules `REGION` : (ligne, début, fin incluse), ligne à ligne.
    fn runs(&self) -> impl Iterator<Item = (usize, usize, usize)> + '_ {
        (0..self.h).flat_map(move |j| {
            let row = &self.cells[j * self.w..(j + 1) * self.w];
            let mut out = Vec::new();
            let mut i = 0;
            while i < row.len() {
                if row[i] == REGION {
                    let s = i;
                    while i < row.len() && row[i] == REGION {
                        i += 1;
                    }
                    out.push((j, s, i - 1));
                } else {
                    i += 1;
                }
            }
            out
        })
    }

    fn rect(&self, l: usize, r: usize, j0: usize, j1: usize) -> Contour {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let (x0, x1) = (ox + l as f64 * c, ox + (r + 1) as f64 * c);
        let (y0, y1) = (oy + j0 as f64 * c, oy + j1 as f64 * c);
        vec![[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    }

    /// Rectangles des suites (aire positive), les suites identiques de lignes voisines fusionnées.
    fn rects(&self) -> Vec<Contour> {
        let mut by_row: Vec<Vec<(usize, usize)>> = vec![Vec::new(); self.h + 1];
        for (j, l, r) in self.runs() {
            by_row[j].push((l, r));
        }
        let mut out = Vec::new();
        let mut open: Vec<(usize, usize, usize)> = Vec::new();
        for (j, runs) in by_row.iter().enumerate() {
            let mut next = Vec::with_capacity(runs.len());
            for &(l, r) in runs {
                match open.iter().position(|o| o.0 == l && o.1 == r) {
                    Some(k) => next.push(open.swap_remove(k)),
                    None => next.push((l, r, j)),
                }
            }
            out.extend(open.drain(..).map(|(l, r, j0)| self.rect(l, r, j0, j)));
            open = next;
        }
        out
    }
}
```
Si clippy signale `needless_range_loop` ou une autre règle sur ces corps, réécrire en itérateurs **sans changer le comportement** ; les tests de l'étape 7 en sont la garde.

- [ ] **Étape 9 : écrire `closed_zone` et faire passer les tests de l'étape 7**

Dans `zone.rs`, après `impl Mask` :
```rust
fn bounds_of(cs: &[Contour]) -> Option<Bounds> {
    cs.iter().flatten().fold(None, |b: Option<Bounds>, p| {
        Some(match b {
            None => Bounds { x0: p[0], y0: p[1], x1: p[0], y1: p[1] },
            Some(o) => Bounds { x0: o.x0.min(p[0]), y0: o.y0.min(p[1]), x1: o.x1.max(p[0]), y1: o.y1.max(p[1]) },
        })
    })
}

fn overlaps(a: &Bounds, b: &Bounds) -> bool {
    a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1
}

/// Murs qui coupent la boîte de la zone (Q20), en anneaux d'aire positive : non-nuls orientés un par un, pair-impair
/// (anneaux de formes, `fill`) normalisés par `i_overlay`, pour que l'union non-nulle du découpage soit juste.
fn clip_of(walls: &[Wall], zb: &Bounds) -> Vec<Contour> {
    let mut clip = Vec::new();
    for w in walls.iter().filter(|w| overlaps(&w.bounds, zb)) {
        let cs = w.contours();
        if w.even_odd {
            let shapes = FloatOverlay::with_subj(cs.as_slice()).overlay(OverlayRule::Subject, FillRule::EvenOdd);
            clip.extend(shapes.into_iter().flatten());
        } else {
            clip.extend(cs.into_iter().map(|mut c| {
                if area2(&c) < 0.0 {
                    c.reverse();
                }
                c
            }));
        }
    }
    clip
}

fn inside_ring(c: &[[f64; 2]], x: f64, y: f64) -> bool {
    let n = c.len();
    let mut inside = false;
    let mut j = n.wrapping_sub(1);
    for i in 0..n {
        let (a, b) = (c[i], c[j]);
        if (a[1] > y) != (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0] {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Q6, Q9, Q10, Q20 : sans mur ou hors de l'emprise : `Outside` ; emprise trop grande même à 4 px par cellule ou
/// diffusion jusqu'au bord : `Open` ; cellule du clic dans un mur dilaté : `OnWall` ; sinon la forme exacte qui
/// contient le clic, extérieur d'abord (`OnWall` si le clic tombe sur un bord).
pub fn closed_zone(walls: &[Wall], x: f64, y: f64, tol: f64) -> Zone {
    let Some(g) = fit(walls, tol) else {
        return if walls.is_empty() { Zone::Outside } else { Zone::Open };
    };
    let mut m = Mask::new(g);
    let Some((cx, cy)) = m.cell_of(x, y) else {
        return Zone::Outside;
    };
    for w in walls {
        m.paint(w);
    }
    m.dilate_in_place(WALL);
    if m.cells[cy * m.w + cx] != FREE {
        return Zone::OnWall;
    }
    if !m.flood_spans(cx, cy) {
        return Zone::Open;
    }
    m.dilate_in_place(REGION);
    m.dilate_in_place(REGION);
    let subj = m.rects();
    drop(m);
    let Some(zb) = bounds_of(&subj) else {
        return Zone::OnWall;
    };
    let clip = clip_of(walls, &zb);
    FloatOverlay::with_subj_and_clip(subj.as_slice(), clip.as_slice())
        .overlay(OverlayRule::Difference, FillRule::NonZero)
        .into_iter()
        .find(|s| s.iter().filter(|c| inside_ring(c, x, y)).count() % 2 == 1)
        .map_or(Zone::OnWall, |s| {
            Zone::Closed(s.into_iter().map(|c| c.into_iter().flatten().collect()).collect())
        })
}
```
Note : `fit` rend `None` sans mur ; `closed_zone(&[], …)` rend donc `Outside` (test `outside_box_and_on_wall`).
Lancer : `cargo test -p roomboard-core --features zone zone:: 2>&1 | grep -E "^test |test result"`. Attendu : 5 tests `ok`, dont `zone::tests::square_gap_1px_closes_3px_leaks ... ok`.

- [ ] **Étape 10 : tests rouges au niveau du document (traits, image, « Aucune », témoin de durée)**

Ajouter dans le module `tests` de `zone.rs` :
```rust
    fn pen() -> StrokeStyle {
        StrokeStyle { color: "#000000".into(), width: 4.0 }
    }
    /// Trait de `a` à `b`, un point tous les 10, pression 0,5.
    fn stroke(d: &mut Document, p: &str, a: [f64; 2], b: [f64; 2]) -> String {
        let n = ((b[0] - a[0]).hypot(b[1] - a[1]) / 10.0).ceil().max(1.0) as usize;
        let points: Vec<f32> = (0..=n)
            .flat_map(|i| {
                let t = i as f64 / n as f64;
                [(a[0] + (b[0] - a[0]) * t) as f32, (a[1] + (b[1] - a[1]) * t) as f32, 0.5]
            })
            .collect();
        d.apply(Command::CommitStroke { page: p.to_string(), points, style: pen() }).expect("trait").ids[0].clone()
    }
    fn zone(p: &str, x: f64, y: f64, color: Option<&str>) -> Command {
        Command::Fill { page: p.to_string(), target: FillTarget::Zone { x, y, tol: 2.0 }, color: color.map(str::to_string) }
    }
    fn triangle(d: &mut Document, p: &str, end_y: f64) {
        stroke(d, p, [100.0, 100.0], [500.0, 100.0]);
        stroke(d, p, [500.0, 100.0], [100.0, 500.0]);
        stroke(d, p, [100.0, 500.0], [100.0, end_y]);
    }
    fn fill_of(d: &Document, id: &str) -> crate::fill_element::FillFields {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        read_fill(&txn, &f.element).expect("fill lisible")
    }

    /// S1 : trois traits, écart de 1 au dernier sommet : un `fill` en haut de la page, bord au-delà de l'axe du trait
    /// et dans son épaisseur ; annuler, refaire : une étape.
    #[test]
    fn triangle_of_strokes_1px_gap_inserts_one_fill_on_top() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        let c = d.apply(zone(&p, 200.0, 200.0, Some("#facc15"))).expect("zone");
        assert_eq!(c.ids.len(), 1);
        let ids = d.element_ids(&p);
        assert_eq!((ids.len(), ids.last()), (4, c.ids.first()));
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!(f.color, "#facc15");
        let min_x = f.rings[0].chunks_exact(2).map(|q| q[0] + f.transform[4]).fold(f64::INFINITY, f64::min);
        assert!(min_x > 100.0 && min_x < 104.0, "{min_x}");
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 4);
    }

    /// S2 : écart de 12 au sommet (≥ 8 entre les contours) : la diffusion fuit, le fond change, aucun `fill`.
    #[test]
    fn triangle_of_strokes_12px_gap_changes_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 112.0);
        let c = d.apply(zone(&p, 200.0, 200.0, Some("#facc15"))).expect("zone");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#facc15");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// Q10 : hors de la boîte des murs : le fond ; sur un trait : aucune étape.
    #[test]
    fn outside_walls_is_background_and_on_stroke_is_no_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(zone(&p, 900.0, 900.0, Some("#16a34a"))).expect("hors");
        assert_eq!(d.page(&p).expect("page").background, "#16a34a");
        let v = d.version();
        d.apply(zone(&p, 100.0, 300.0, Some("#dc2626"))).expect("sur le trait");
        assert_eq!((d.version(), d.element_ids(&p).len()), (v, 3));
    }

    /// HC8-6 : « Aucune » dans une zone fermée : fond `#ffffff`, aucun `fill`.
    #[test]
    fn none_in_closed_zone_sets_white_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(Command::Fill { page: p.clone(), target: FillTarget::Background, color: Some("#1d4ed8".into()) })
            .expect("fond");
        let c = d.apply(zone(&p, 200.0, 200.0, None)).expect("aucune");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#ffffff");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// S4, HC8-1 : une image ferme par sa boîte ; le bord du `fill` longe la boîte de l'image.
    #[test]
    fn image_box_closes_zone() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.apply(Command::AddImage {
            page: p.clone(),
            asset: AssetRef {
                id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                name: "a.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 200.0,
            matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 100.0],
        })
        .expect("image");
        stroke(&mut d, &p, [298.0, 100.0], [500.0, 100.0]);
        stroke(&mut d, &p, [500.0, 100.0], [500.0, 300.0]);
        stroke(&mut d, &p, [500.0, 300.0], [298.0, 300.0]);
        let c = d.apply(zone(&p, 400.0, 200.0, Some("#facc15"))).expect("zone");
        assert_eq!(c.ids.len(), 1);
        let f = fill_of(&d, &c.ids[0]);
        let min_x = f.rings[0].chunks_exact(2).map(|q| q[0] + f.transform[4]).fold(f64::INFINITY, f64::min);
        assert!((min_x - 300.0).abs() < 1e-3, "{min_x}");
    }

    /// Q18 : `zone_cells` compte le masque du clic ; 0 sans mur ou à `tol` invalide.
    #[test]
    fn zone_cells_counts_the_mask() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.zone_cells(&p, 2.0), 0);
        triangle(&mut d, &p, 101.0);
        let g = fit(&d.zone_walls(&p), 2.0).expect("grille");
        assert_eq!(d.zone_cells(&p, 2.0) as usize, g.w * g.h);
        assert_eq!(d.zone_cells(&p, 0.0), 0);
    }

    /// Témoin de durée (Q18, S6), pas une porte :
    /// `cargo test -p roomboard-core --features zone --release s6_ -- --ignored --nocapture`.
    #[test]
    #[ignore = "témoin de durée, lancé à la main"]
    fn s6_worst_case_timing_witness() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        stroke(&mut d, &p, [-700.0, -700.0], [1300.0, -700.0]);
        stroke(&mut d, &p, [1300.0, -700.0], [-700.0, 1300.0]);
        stroke(&mut d, &p, [-700.0, 1300.0], [-700.0, -700.0]);
        for i in 0..20 {
            for j in 0..15 {
                let (x, y) = (-600.0 + 40.0 * f64::from(i), -600.0 + 40.0 * f64::from(j));
                stroke(&mut d, &p, [x, y], [x + 15.0, y]);
            }
        }
        assert!(d.zone_cells(&p, 2.0) >= 4_000_000);
        let t = std::time::Instant::now();
        let c = d.apply(zone(&p, 100.0, 100.0, Some("#facc15"))).expect("zone");
        eprintln!("S6 natif : {} ms, {} cellules", t.elapsed().as_millis(), d.zone_cells(&p, 2.0));
        assert_eq!(c.ids.len(), 1);
    }
```
Lancer : `cargo test -p roomboard-core --features zone zone:: 2>&1 | tail -5`. Attendu : échec de compilation (`no method named zone_walls`).

- [ ] **Étape 11 : écrire `zone_walls` et `zone_cells`**

Dans `zone.rs`, après `closed_zone` :
```rust
/// Morceaux d'un contour à séparateurs (sommets non finis).
fn split_rings(flat: &[f32]) -> Vec<Vec<f32>> {
    let mut out: Vec<Vec<f32>> = vec![Vec::new()];
    for c in flat.as_chunks::<2>().0 {
        if c[0].is_finite() && c[1].is_finite() {
            if let Some(last) = out.last_mut() {
                last.extend(c);
            }
        } else if out.last().is_some_and(|l| !l.is_empty()) {
            out.push(Vec::new());
        }
    }
    out.retain(|r| !r.is_empty());
    out
}

impl Document {
    /// Murs de `page` (Q8) : trait (contour en cache, non-nul), ligne et flèche (`shape_polygon`), rectangle et ellipse
    /// non remplis (anneau, pair-impair), formes remplies (polygone plein), `fill` (anneaux, pair-impair) ; tout autre
    /// élément : sa boîte (`bounds`). Le fond, la grille et le fond PDF ne ferment rien (HC8-2).
    pub(crate) fn zone_walls(&self, page: &str) -> Vec<Wall> {
        let mut walls = Vec::new();
        let mut boxed = Vec::new();
        {
            let txn = self.read();
            let Some(elements) = self.page_elements(&txn, page) else {
                return walls;
            };
            for o in elements.iter(&txn) {
                let Out::YMap(e) = o else {
                    continue;
                };
                match self.wall_of(&txn, &e) {
                    Some(w) => walls.push(w),
                    None => boxed.extend(out_string(e.get(&txn, "id"))),
                }
            }
        }
        for id in boxed {
            if let Some(b) = self.bounds(std::slice::from_ref(&id)) {
                let (x0, y0, x1, y1) = (b.x0 as f32, b.y0 as f32, b.x1 as f32, b.y1 as f32);
                walls.extend(Wall::new(vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]], false));
            }
        }
        walls
    }

    fn wall_of<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Wall> {
        if let Some((t, style, pts)) = read_stroke(txn, e) {
            let id = out_string(e.get(txn, "id")).unwrap_or_default();
            let outline = self.cached_outline(&id, &style, &pts);
            return Wall::new(split_rings(&world_outline(&t, &outline)), false);
        }
        if let Some(s) = read_shape(txn, e) {
            let t = out_transform(e.get(txn, "transform"))?;
            if s.fill.is_none() {
                if let Some((outer, inner)) = shape_ring(s.kind, s.w, s.h, s.style.width) {
                    return Wall::new(vec![world_outline(&t, &outer), world_outline(&t, &inner)], true);
                }
            }
            return Wall::new(vec![world_outline(&t, &shape_polygon(s.kind, s.w, s.h, s.style.width))], false);
        }
        let f = read_fill(txn, e)?;
        let rings = f
            .rings
            .iter()
            .map(|r| world_outline(&f.transform, &r.iter().map(|v| *v as f32).collect::<Vec<f32>>()))
            .collect();
        Wall::new(rings, true)
    }

    /// Cellules du masque d'un clic du pot sur `page` à `tol` (Q18, `data-zone-cells`) ; 0 sans mur, à `tol` invalide
    /// ou au-delà du plafond.
    pub fn zone_cells(&self, page: &str, tol: f64) -> u32 {
        if !(tol.is_finite() && tol > 0.0) {
            return 0;
        }
        fit(&self.zone_walls(page), tol).map_or(0, |g| u32::try_from(g.w * g.h).unwrap_or(u32::MAX))
    }
}
```
Lancer : `cargo test -p roomboard-core --features zone 2>&1 | grep -E "^test (zone|fill|shape)::|test result" | tail -40`. Attendu : tous `ok`, dont les 11 tests de `zone::tests` (le témoin `s6_worst_case_timing_witness` `ignored`), et chaque `test result: ok`. Puis `cargo test -p roomboard-core 2>&1 | grep "test result"` (sans la fonctionnalité) : `ok`.

- [ ] **Étape 12 : pont Wasm (`fill_zone`, `zone_cells`) avec son test rouge puis vert**

Dans le module `tests` de `crates/roomboard-wasm/src/lib.rs`, ajouter :
```rust
    // C8 (Q10, Q18) : pot dans une zone fermée par son `_inner` ; cellules du masque.
    #[test]
    fn fill_zone_inner_fills_a_square_of_strokes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        for pts in [
            [100.0, 100.0, 0.5, 500.0, 100.0, 0.5],
            [500.0, 100.0, 0.5, 500.0, 500.0, 0.5],
            [500.0, 500.0, 0.5, 100.0, 500.0, 0.5],
            [100.0, 500.0, 0.5, 100.0, 100.0, 0.5],
        ] {
            d.commit_stroke_inner(&p, &pts, "#000000", 4.0).expect("trait");
        }
        assert!(d.zone_cells(&p, 2.0) > 160_000);
        let c = d.fill_zone_inner(&p, 300.0, 300.0, 2.0, Some("#facc15".into())).expect("zone");
        assert_eq!(c.ids.len(), 1);
        assert_eq!(d.core.element_ids(&p).len(), 5);
        assert_eq!(d.fill_zone_inner(&p, 300.0, 300.0, 0.0, None), Err(CommandError::BadFill));
    }
```
Lancer : `cargo test -p roomboard-wasm fill_zone 2>&1 | tail -5`. Attendu : échec (`no method named fill_zone_inner`).
Puis, dans le bloc `#[wasm_bindgen] impl Document`, après `fill_image` :
```rust
    /// Pot dans une zone fermée (C8, Q10) : `x`, `y`, `tol` en monde ; `color` absent ou null : « Aucune » ; voir
    /// `Document::cmd_fill_zone`.
    pub fn fill_zone(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(&self.fill_zone_inner(page, x, y, tol, color).map_err(cmd_err)?)
    }

    /// Cellules du masque d'un clic du pot sur `page` à `tol` (C8, Q18, `data-zone-cells`), lecture seule.
    pub fn zone_cells(&self, page: &str, tol: f64) -> u32 {
        self.core.zone_cells(page, tol)
    }
```
et, dans le bloc où vivent `fill_inner` et `fill_image_inner`, après `fill_image_inner` :
```rust
    pub fn fill_zone_inner(
        &mut self,
        page: &str,
        x: f64,
        y: f64,
        tol: f64,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::Fill {
            page: page.to_string(),
            target: FillTarget::Zone { x, y, tol },
            color,
        })
    }
```
Lancer : `cargo test -p roomboard-wasm fill_zone 2>&1 | grep -E "^test |test result"`. Attendu : `test tests::fill_zone_inner_fills_a_square_of_strokes ... ok`.

- [ ] **Étape 13 : mesurer la taille réelle des deux modules**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm
```
Attendu : deux nombres. Principal ≤ 1 420 000 (sinon `BLOQUÉ : garde-fou de taille`, voir « terminé »). Formats ≤ 3 145 728 et attendu égal à 3 100 344 à quelques octets près (aucune fonctionnalité `zone` : GC11). Les dossiers `apps/web/src/wasm*` sont ignorés par git.

- [ ] **Étape 14 : consigner la mesure et les licences**

`docs/essais/taille-wasm.md`, ajouter à la fin (N et M = les deux nombres de l'étape 13) :
```markdown
## C8 (zone fermée du pot, `i_overlay` derrière la fonctionnalité `zone`)

| mesure | module principal | module formats |
|---|---|---|
| avant C8 (main 94976f0) | 1 145 044 o | 3 100 344 o |
| après la tâche T1 (`i_overlay` 9.2.0, `zone.rs`) | N o | M o |

Garde-fou du cadrage (Q5, HC8-9) : 1 420 000 o ; plafonds de `scripts/verifier.sh` inchangés (1 572 864 o, 3 145 728 o).
`roomboard-formats` ne reçoit pas la fonctionnalité `zone` (DA-Z1).
```
`THIRD_PARTY_NOTICES.md`, ajouter à la fin (dépôts vérifiés par `cargo metadata --format-version 1 --features roomboard-core/zone 2>/dev/null | jq -r '.packages[] | select(.name|test("^i_")) | "\(.name) \(.version) \(.license) \(.repository)"'` ; en cas d'écart, la sortie de cette commande fait foi) :
````markdown
## Crate `roomboard-core` (C8, zone fermée du pot)

Crates apportés par `i_overlay`, derrière la fonctionnalité `zone` du cœur, activée par `roomboard-wasm` seul
(`roomboard-formats` ne la reçoit pas). Relevé : `cargo tree -p roomboard-core --features zone -e normal`.

| crate | version | licence | dépôt |
|---|---|---|---|
| i_overlay | 9.2.0 | MIT OR Apache-2.0 | https://github.com/iShape-Rust/iOverlay |
| i_float | 5.0.0 | MIT | https://github.com/iShape-Rust/iFloat |
| i_shape | 5.0.0 | MIT | https://github.com/iShape-Rust/iShape |
| i_tree | 0.20.0 | MIT | https://github.com/iShape-Rust/iTree |
| i_key_sort | 0.12.0 | MIT | https://github.com/iShape-Rust/iKeySort |

`libm` 0.2.16 (MIT) est déjà listé plus haut. `i_overlay` et `i_key_sort` ne livrent pas de fichier LICENSE dans leur
paquet : texte repris du dépôt amont.

## Texte de licence : i_overlay 9.2.0, i_float 5.0.0, i_shape 5.0.0, i_tree 0.20.0, i_key_sort 0.12.0 (MIT)

```text
MIT License

Copyright (c) 2023 iShape-Rust

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
````
Lancer : `cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && pnpm install --frozen-lockfile >/dev/null && node scripts/controle-licences.mjs 2>&1 | tail -3`. Attendu : aucun refus (code 0).

- [ ] **Étape 15 : contrôles et commit**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -3 && cargo test --workspace 2>&1 | grep -E "test result|FAILED" | sort | uniq -c | tail -8
```
Attendu : clippy sans `error`, aucune ligne `FAILED`. Puis :
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T1 && git add crates/roomboard-core/Cargo.toml Cargo.lock crates/roomboard-core/src/lib.rs crates/roomboard-core/src/zone.rs crates/roomboard-core/src/fill_element.rs crates/roomboard-core/src/fill.rs crates/roomboard-core/src/shape.rs crates/roomboard-wasm/Cargo.toml crates/roomboard-wasm/src/lib.rs THIRD_PARTY_NOTICES.md docs/essais/taille-wasm.md && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(core): closed-zone paint bucket with i_overlay behind the zone feature" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Cœur : vue, collision et anneaux d'un `fill` ; contrat du vrai module

<a id="tache-t2"></a>

**Objectif :** un `fill` se lit (`ElementView.fill`, sans les anneaux), se touche seulement dedans et à plus de `tol`
de ses bords, a des bornes (anneau extérieur), livre ses anneaux par `fill_rings(id)`, se recharge à octets constants ;
mal formé, il devient un cadre inconnu de sa boîte. Le contrat du vrai module joue S1, S2, S3 et S5.

**Fichiers :**
- Modifier : `crates/roomboard-core/src/element.rs:29-33` (`KNOWN_KINDS`), `:122-170` (`ElementView`, `bare`) ; `crates/roomboard-core/src/document.rs:328-420` (`element`), `:1297-1406` (test I3) ; `crates/roomboard-core/src/query.rs:45-210` (`Geom`, `boxed_geom`, `element_geom`), `:228-243` (`hit_test`), `:127` (`fill_rings` à côté d'`outline`) ; `crates/roomboard-wasm/src/lib.rs:1222` (`fill_rings`) ; `apps/web/src/core/wasm-core.contract.test.ts` (fin de fichier)
- Tests : `query.rs`, `document.rs`, `wasm-core.contract.test.ts`

**Interfaces :**
- Consomme (T1) : `FILL_KIND`, `read_fill(txn, e) -> Option<FillFields>` (`FillFields { transform, w, h, color, rings }`, anneaux locaux), `Document::insert_fill(page, rings, color) -> Result<Change, CommandError>` ; Wasm `fill_zone`, `zone_cells`.
- Consomme (T3) : `CoreDocument.fillRings(id: string): Float32Array | null`, `CoreDocument.zoneCells(page: string, tol: number): number`, `FillTarget { kind: "zone"; x; y; tol }`, `FillElement { kind: "fill"; fill: { color; w; h } }`, `toElementView` du `fill`.
- Produit : `pub struct FillView { pub color: String, pub w: f64, pub h: f64 }` ; `ElementView.fill: Option<FillView>` (sérialisé `fill`, absent sinon) ; `KNOWN_KINDS: [&str; 8]` avec `"fill"` ; `pub fn fill_rings(&self, id: &str) -> Option<Vec<f32>>` (`[n, x0, y0, …]` par anneau, local) ; Wasm `fill_rings(id) -> Option<Vec<f32>>` (TS : `Float32Array | undefined`).
- Réutilise : `crates/roomboard-core/src/query.rs:136` `element_geom`, `:211` `geoms` — `geoms(page, false)` ; `element_geom` gagne la branche `fill` (étendre)
- Réutilise : `crates/roomboard-core/src/query.rs:127` `outline(id)` — patron de `fill_rings(id)` (étendre)
- Réutilise : `crates/roomboard-core/src/query.rs:95` `world_outline` — `world_outline(&t, &ring)`
- Réutilise : `crates/roomboard-core/src/element.rs` `unknown_view` (patron T2, M7, X8) — `unknown_view(&txn, e)` pour un `fill` mal formé

**Patron à ne pas reprendre (concepteur-critique) :**
- Recopier les anneaux dans la vue, comme `ShapeView` (`crates/roomboard-core/src/element.rs:122-147`) : la vue est lue à chaque image ; les anneaux passent par `fill_rings` (Q12).
- Toucher le `fill` comme une forme pleine, `hit_outline` (`crates/roomboard-core/src/query.rs:228-243`, « dedans ou à `tol` d'une arête ») : le `fill` couvrirait la bande des traits du bord (effet de bord 2) ; ici « dedans **et** à plus de `tol` ».
- Le repli de l'image (élément invisible, `read_image` → `None`) : un `fill` mal formé est un cadre inconnu, comme un média (`document.rs:384-396`).
- Chemin de référence : cadrage Q11 à Q13 (`docs/plans/usage-c8-pot-zones-cadrage.md:31-33`) ; `crates/roomboard-core/src/document.rs:398-412` (repli de `model3d`) ; `crates/roomboard-core/src/query.rs:51-69` (`boxed_geom`).

**Test et commande bornée :**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T2 && cargo test -p roomboard-core --features zone fill 2>&1 | grep -E "^test |test result" | tail -30
```
Preuve : `query::tests::fill_is_hit_inside_far_from_edges_only ... ok`, `document::tests::malformed_fill_is_unknown_with_its_box ... ok`, aucune ligne `FAILED`.
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T2 && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -14
```
Preuve : ≥ 1 ligne « contrat C8 : vrai module seulement », ligne `Tests  N passed` sans `failed`.

**Preuve visuelle :** aucune (cœur et contrat).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC2 — Plafonds Wasm : principal 1 572 864 o (garde-fou du cadrage 1 420 000 o → repli HU2-8), formats 3 145 728 o ; ni baissés ni relevés. Aucun troisième module Wasm. Aujourd'hui : principal 1 145 044 o, formats 3 100 344 o.
- GC4 — Un fichier d'avant C8 s'ouvre toujours.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.
- GC10 — Trois couches testables seules : `crates/` (cœur Rust, sans dépendance au navigateur).

**Interdits :** toucher `zone.rs`, `fill.rs`, `fill_element.rs` (T1) ; toucher `ink/` ; modifier `hit_test_path` (la gomme d'objet ne vise que les traits, Q13) ; changer `copy.rs` ou `format/`.

**Critère « terminé » :** les deux commandes bornées vertes ; `cargo test --workspace` sans `FAILED` (tests à garder verts : `query.rs`, `document.rs`, `format/mod.rs` `reload_with_strokes_keeps_bytes`, bloc « contrat C6a » et « contrat C6b » du contrat) ; `pnpm --filter @roomboard/web exec tsc --noEmit` muet (vérifie aussi le code de T3 contre le `.d.ts` régénéré) ; `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings` muets. Rapport : `Réutilisation : appelé element_geom, outline (patron), world_outline, unknown_view` ou `Réutilisation : écart — <pourquoi>`, et la taille du module principal relevée à l'étape 9.

**Étapes :**

- [ ] **Étape 1 : tests rouges de la vue (`document.rs`)**

Dans le test I3 `every_known_kind_has_view_and_geom` (`document.rs:1300`), juste après `for kind in KNOWN_KINDS {`, ajouter :
```rust
            if kind == crate::fill_element::FILL_KIND {
                let id = d
                    .insert_fill(&p, &[vec![0.0, 0.0, 50.0, 0.0, 0.0, 40.0]], "#facc15")
                    .expect("fill")
                    .ids[0]
                    .clone();
                assert_eq!(d.element(&id).map(|v| v.kind), Some(kind.to_string()), "vue de {kind}");
                assert!(d.bounds(&[id]).is_some(), "boîte de {kind}");
                continue;
            }
```
Dans le module de tests de `document.rs`, ajouter :
```rust
    fn square_fill(d: &mut Document, p: &str) -> String {
        d.insert_fill(
            p,
            &[
                vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0],
                vec![250.0, 250.0, 250.0, 270.0, 270.0, 270.0, 270.0, 250.0],
            ],
            "#facc15",
        )
        .expect("fill")
        .ids[0]
        .clone()
    }

    /// Q11, Q12 : vue `fill` (couleur, boîte), sans anneaux ; transform au coin de la boîte.
    #[test]
    fn fill_view_has_color_and_box() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = square_fill(&mut d, &p);
        let v = d.element(&id).expect("vue");
        assert_eq!(v.kind, "fill");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 100.0]);
        assert_eq!(
            v.fill,
            Some(crate::element::FillView { color: "#facc15".into(), w: 400.0, h: 400.0 })
        );
    }

    /// Q11 : contours illisibles : cadre inconnu de sa boîte `w × h`, `source_kind` « fill », jamais invisible.
    #[test]
    fn malformed_fill_is_unknown_with_its_box() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = square_fill(&mut d, &p);
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            drop(txn);
            let mut txn = d.doc.transact_mut();
            e.insert(&mut txn, "contours", "illisible");
        }
        let v = d.element(&id).expect("vue");
        assert_eq!(v.kind, "unknown");
        let u = v.unknown.expect("cadre");
        assert_eq!((u.source_kind.as_str(), u.w, u.h), ("fill", 400.0, 400.0));
        assert!(d.bounds(&[id]).is_some());
    }

    /// S3, U3 : dix rechargements gardent les octets et la vue d'un `fill`.
    #[test]
    fn fill_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-21T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = square_fill(&mut d, &p);
        let file = save(&d, &meta).expect("save");
        for i in 0..10 {
            let r = load(&file).expect("load");
            assert_eq!(r.element(&id), d.element(&id), "vue au rechargement {i}");
            assert_eq!(r.fill_rings(&id), d.fill_rings(&id));
            assert!(save(&r, &meta).expect("resave") == file, "octets au rechargement {i}");
        }
    }
```
Si le test `malformed_fill_is_unknown_with_its_box` ne compile pas parce que `find_element` rend une autre forme, suivre le patron du test `backdrop_rect_follows_page_width_not_height` (`document.rs:1266`, `d.doc.transact_mut()`). Lancer : `cargo test -p roomboard-core --features zone fill 2>&1 | tail -5`. Attendu : échec de compilation (`no field fill`, `no method fill_rings`).

- [ ] **Étape 2 : `FillView`, `KNOWN_KINDS`, `bare`**

`crates/roomboard-core/src/element.rs` :
```rust
/// Types d'élément que ce cœur sait lire (C10a : `table`, C14 : `media`, C15 : `model3d`, C8 : `fill`) ; tout autre
/// `kind` est gardé et rendu comme élément inconnu (U3, K8).
pub const KNOWN_KINDS: [&str; 8] = [
    "stroke", "shape", "text", "image", "table", "media", "model3d", "fill",
];
```
Après `UnknownView` :
```rust
/// Élément `fill` (C8, Q12) : couleur et boîte ; les anneaux passent par `Document::fill_rings`, jamais par la vue.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct FillView {
    pub color: String,
    pub w: f64,
    pub h: f64,
}
```
Dans `ElementView`, après `model3d` :
```rust
    /// Zone remplie au pot (C8, Q12) ; absent pour tout autre `kind`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fill: Option<FillView>,
```
Dans `bare`, après `model3d: None,` : `fill: None,`.

- [ ] **Étape 3 : branche `fill` de `Document::element`**

`document.rs` : ajouter `FillView` à l'import `use crate::element::{…}` existant, puis, dans `element`, avant le bras `_ =>` :
```rust
            Some(crate::fill_element::FILL_KIND) => {
                Some(match crate::fill_element::read_fill(&txn, e) {
                    Some(f) => ElementView {
                        fill: Some(FillView { color: f.color, w: f.w, h: f.h }),
                        ..ElementView::bare(id, "fill", f.transform)
                    },
                    // Q11 : `fill` mal formé → cadre inconnu de sa boîte `w`, `h` (repli du média, pas de l'image).
                    None => {
                        let (transform, unknown) = unknown_view(&txn, e)?;
                        ElementView {
                            unknown: Some(unknown),
                            ..ElementView::bare(id, "unknown", transform)
                        }
                    }
                })
            }
```

- [ ] **Étape 4 : tests rouges de la collision et des anneaux (`query.rs`)**

Dans le module de tests de `query.rs` :
```rust
    fn fill_doc() -> (Document, String, String, String) {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let pts: Vec<f32> = (0..=40).flat_map(|i| [100.0 + i as f32 * 10.0, 100.0, 0.5]).collect();
        let s = d
            .apply(Command::CommitStroke { page: p.clone(), points: pts, style: pen() })
            .expect("trait")
            .ids[0]
            .clone();
        let f = d
            .insert_fill(
                &p,
                &[
                    vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0],
                    vec![250.0, 250.0, 250.0, 270.0, 270.0, 270.0, 270.0, 250.0],
                ],
                "#facc15",
            )
            .expect("fill")
            .ids[0]
            .clone();
        (d, p, s, f)
    }

    /// Q13, HC8-4, effet de bord 2 : `fill` touché dedans à plus de `tol` du bord ; trou et bande du bord non ; le trait
    /// du bord, dessous, reste touché ; la gomme d'objet ne vise pas le `fill`.
    #[test]
    fn fill_is_hit_inside_far_from_edges_only() {
        let (d, p, s, f) = fill_doc();
        assert_eq!(d.hit_test(&p, 300.0, 300.0, 6.0), Some(f.clone()));
        assert_eq!(d.hit_test(&p, 300.0, 102.0, 6.0), Some(s.clone()));
        assert_eq!(d.hit_test(&p, 103.0, 300.0, 6.0), None);
        assert_eq!(d.hit_test(&p, 260.0, 260.0, 6.0), None);
        assert_eq!(d.hit_test_path(&p, &[300.0, 300.0, 310.0, 300.0], 6.0), Vec::<String>::new());
    }

    /// Q12, Q13 : bornes = anneau extérieur ; anneaux locaux `[n, x, y, …]`, extérieur d'abord ; `None` pour un trait.
    #[test]
    fn fill_bounds_and_rings_are_local() {
        let (d, _, s, f) = fill_doc();
        assert_eq!(d.bounds(&[f.clone()]), Some(Bounds { x0: 100.0, y0: 100.0, x1: 500.0, y1: 500.0 }));
        assert_eq!(
            d.fill_rings(&f),
            Some(vec![
                4.0, 0.0, 0.0, 400.0, 0.0, 400.0, 400.0, 0.0, 400.0, 4.0, 150.0, 150.0, 150.0, 170.0, 170.0, 170.0,
                170.0, 150.0,
            ])
        );
        assert_eq!(d.fill_rings(&s), None);
        assert_eq!(d.fill_rings("inconnu"), None);
    }
```
Lancer : `cargo test -p roomboard-core --features zone fill 2>&1 | tail -5`. Attendu : échec (`no method fill_rings`).

- [ ] **Étape 5 : `Geom.rings`, branche `fill`, `hit_test`, `fill_rings`**

`query.rs` :
1. Imports : ajouter `use crate::fill_element::{read_fill, FILL_KIND};` et étendre `use crate::ink::hit::{…}` avec `dist_to_edges, point_in_polygon`.
2. `struct Geom` : ajouter le champ
```rust
    /// Anneaux locaux d'un `fill` (C8, Q13), extérieur d'abord ; vide pour tout autre genre.
    rings: Vec<Vec<f32>>,
```
et `rings: Vec::new(),` dans chaque littéral `Geom { … }` existant (`boxed_geom` et `element_geom`).
3. Dans `element_geom`, avant `if let Some((transform, u)) = read_unknown(txn, e) {` :
```rust
        if out_string(e.get(txn, "kind")).as_deref() == Some(FILL_KIND) {
            // C8 (Q13) : anneaux locaux ; bornes, rectangle et accroche sur l'extérieur ; mal formé : la boîte inconnue.
            let Some(f) = read_fill(txn, e) else {
                return boxed_geom(txn, e, raw_id, None);
            };
            let rings: Vec<Vec<f32>> =
                f.rings.iter().map(|r| r.iter().map(|v| *v as f32).collect()).collect();
            return Some(Geom {
                id: raw_id?,
                transform: f.transform,
                outline: rings.first()?.clone().into(),
                rings,
            });
        }
```
4. Fonction libre, avant `impl Document` :
```rust
/// `fill` (C8, Q13) : touché dedans (pair-impair sur tous ses anneaux) **et** à plus de `tol` de chacun de ses bords ;
/// la bande de part et d'autre d'un trait du bord reste au trait (HC8-4).
fn fill_hit(t: &Transform, rings: &[Vec<f32>], x: f32, y: f32, tol: f32) -> bool {
    let world: Vec<Vec<f32>> = rings.iter().map(|r| world_outline(t, r)).collect();
    world.iter().filter(|r| point_in_polygon(r, x, y)).count() % 2 == 1
        && world.iter().all(|r| dist_to_edges(r, x, y) > tol)
}
```
5. `hit_test` : remplacer le corps de `.find(|g| { … })` par
```rust
            .find(|g| {
                if g.rings.is_empty() {
                    hit_outline(&world_outline(&g.transform, &g.outline), x as f32, y as f32, tol)
                } else {
                    fill_hit(&g.transform, &g.rings, x as f32, y as f32, tol)
                }
            })
```
6. Après `outline` :
```rust
    /// Anneaux locaux d'un `fill` (C8, Q12) : `[n, x0, y0, …]` par anneau, extérieur d'abord ; `None` pour tout autre
    /// élément, un `fill` mal formé ou un id inconnu (patron `outline`).
    pub fn fill_rings(&self, id: &str) -> Option<Vec<f32>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        let f = read_fill(&txn, &found.element)?;
        let mut out = Vec::new();
        for r in &f.rings {
            out.push((r.len() / 2) as f32);
            out.extend(r.iter().map(|v| *v as f32));
        }
        Some(out)
    }
```
Lancer la première commande bornée. Attendu : `fill_is_hit_inside_far_from_edges_only`, `fill_bounds_and_rings_are_local`, `fill_view_has_color_and_box`, `malformed_fill_is_unknown_with_its_box`, `fill_reload_keeps_bytes`, `every_known_kind_has_view_and_geom` : `ok`.

- [ ] **Étape 6 : pont Wasm `fill_rings`**

`crates/roomboard-wasm/src/lib.rs`, après `outline` :
```rust
    /// Anneaux locaux d'un `fill` (C8, Q12) : `[n, x0, y0, …]` par anneau ; absent pour tout autre élément.
    pub fn fill_rings(&self, id: &str) -> Option<Vec<f32>> {
        self.core.fill_rings(id)
    }
```

- [ ] **Étape 7 : contrat du vrai module (rouge tant que le `.wasm` n'est pas reconstruit)**

À la fin de `apps/web/src/core/wasm-core.contract.test.ts` :
```ts
// C8 (S1, S2, S3, S5) : zone fermée, jouée par le vrai module seulement (second écart D36 : la fausse liaison traite
// `Fill { kind: "zone" }` comme le fond).
const square = (d: CoreDocument, p: string): void => {
  const side = (x0: number, y0: number, x1: number, y1: number): void => {
    const pts: number[] = [];
    for (let i = 0; i <= 40; i++) pts.push(x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * i) / 40, 0.5);
    d.apply({ type: "CommitStroke", page: p, points: new Float32Array(pts), style: { color: "#000000", width: 4 } });
  };
  side(100, 100, 500, 100);
  side(500, 100, 500, 500);
  side(500, 500, 100, 500);
  side(100, 500, 100, 100);
};
const zoneAt = (p: string, x: number, y: number, color: string | null): Command => ({ type: "Fill", page: p, target: { kind: "zone", x, y, tol: 2 }, color });

describe.skipIf(loaded === null)("contrat C8 : vrai module seulement", () => {
  it("zone fermée par quatre traits : un fill en haut de la page, une étape, anneaux relus à l'identique (S1, S3)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    expect(d.zoneCells(p, 2)).toBeGreaterThan(160_000);
    const c = d.apply(zoneAt(p, 300, 300, "#facc15"));
    const id = c.ids[0] ?? "";
    expect(c.ids).toHaveLength(1);
    expect(d.elementIds(p).slice(-1)).toEqual([id]);
    expect(d.element(id)).toMatchObject({ kind: "fill", fill: { color: "#facc15" } });
    const rings = d.fillRings(id);
    expect(rings?.[0]).toBeGreaterThanOrEqual(4);
    d.undo();
    expect(d.elementIds(p)).toHaveLength(4);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(5);
    const r = need().core.load(d.save(now, "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    expect(r.fillRings(id)).toEqual(rings);
    r.free();
    d.free();
  });

  it("pot sur le fill : recoloré en une étape, « Aucune » sans étape ; près du bord : le trait (S5)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    const id = d.apply(zoneAt(p, 300, 300, "#facc15")).ids[0] ?? "";
    expect(d.hitTest(p, 300, 300, 6)).toBe(id);
    const edge = d.hitTest(p, 300, 103, 6);
    expect(edge).not.toBe(id);
    expect(d.element(edge ?? "")?.kind).toBe("stroke");
    const c = d.apply({ type: "Fill", page: p, target: { kind: "inside", id }, color: "#dc2626" });
    expect(c.ids).toEqual([id]);
    expect(d.element(id)).toMatchObject({ fill: { color: "#dc2626" } });
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "inside", id }, color: null }));
    d.free();
  });

  it("zone ouverte ou page vide : le fond change, aucun fill, une étape (S2)", () => {
    const d = need().core.blank();
    const p = first(d);
    square(d, p);
    d.apply(zoneAt(p, 900, 900, "#16a34a"));
    expect(bg(d, p)).toBe("#16a34a");
    expect(d.elementIds(p)).toHaveLength(4);
    expect(messageOf(() => d.apply(zoneAt(p, 300, 300, "#12")))).toBe(BAD_FILL);
    d.free();
  });
});
```
- [ ] **Étape 8 : reconstruire le module, jouer le contrat, vérifier les types**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T2 && pnpm install --frozen-lockfile >/dev/null && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -14 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5
```
Attendu : trois tests « contrat C8 : vrai module seulement » passés, les blocs « contrat C8 : … » de T3 passés pour les deux liaisons, `Tests  N passed` sans `failed`, `tsc` muet.

- [ ] **Étape 9 : contrôles, taille, commit**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T2 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -3 && cargo test --workspace 2>&1 | grep -E "test result|FAILED" | sort | uniq -c | tail -8 && wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm
```
Attendu : aucune ligne `FAILED`, clippy muet, taille ≤ 1 420 000 (à rapporter). Puis :
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T2 && git add crates/roomboard-core/src/element.rs crates/roomboard-core/src/document.rs crates/roomboard-core/src/query.rs crates/roomboard-wasm/src/lib.rs apps/web/src/core/wasm-core.contract.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(core): read, hit-test and expose rings of fill elements" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T3 — Interface TS : `FillElement`, cible `zone`, `fillRings`, `zoneCells` ; fausse liaison

<a id="tache-t3"></a>

**Objectif :** l'interface TS connaît l'élément `fill` et la cible `zone` ; la vraie liaison appelle `fill_zone`,
`fill_rings`, `zone_cells` ; la fausse liaison lit, dessine (anneaux), touche, recolore et sauvegarde un `fill`, et traite
`Fill { kind: "zone" }` comme le fond (second écart au contrat D36, écrit).

**Fichiers :**
- Modifier : `apps/web/src/core/api.ts:26` (`ElementKind`), `:44-47` (`FillTarget`), `:274-293` (éléments), `:323-345` (`CoreDocument`) ; `apps/web/src/core/wasm-core.ts:176-280` (`toElementView`), `:586-593` (`Fill`), `:623` (requêtes) ; `apps/web/src/core/fake-core.ts:116-137` (`FakeElement`), `:180` (`KNOWN_KINDS`), `:499-520` (`worldPolygon`), `:1169-1230` (`Fill`), `:1258-1271` (`element`), `:1317-1330` (`outline`, `hitTest`), `:1545-1590` (`SavedElement`, `savedElement`), `:1701-1716` (`loadElement`) ; `apps/web/src/core/wasm-core.contract.test.ts:196-199` (commentaire D36) et fin de fichier
- Tests : `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`

**Interfaces :**
- Consomme (T1, par contrat figé : le `.d.ts` du module n'est régénéré qu'en T2) : Wasm `fill_zone(page: string, x: number, y: number, tol: number, color?: string | null): any`, `zone_cells(page: string, tol: number): number`, `fill_rings(id: string): Float32Array | undefined`.
- Produit (lu par T2, T4, T5, T6, T7) :
  - `export interface FillData { readonly color: string; readonly w: number; readonly h: number }`
  - `export interface FillElement extends ElementBase { readonly kind: "fill"; readonly fill: FillData }`
  - `ElementKind` inclut `"fill"` ; `ElementView` inclut `FillElement`
  - `FillTarget` inclut `{ readonly kind: "zone"; readonly x: number; readonly y: number; readonly tol: number }`
  - `CoreDocument.fillRings(id: string): Float32Array | null` ; `CoreDocument.zoneCells(page: string, tol: number): number`
  - Format de la fausse liaison : `{ id, kind: "fill", transform, fill: { color, w, h, contours: number[][] } }`
- Réutilise : `apps/web/src/core/fake-core.ts:1701` repli du `model3d` (patron M7, X8) — cadre inconnu `sourceKind: "fill"`, brut sous `raw.fill`
- Réutilise : `apps/web/src/core/wasm-core.ts:586` branche `Fill` (patron `fill_image`) — appel `fill_zone` à plat

**Test et commande bornée :**
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T3 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -14
```
Preuve : ≥ 1 ligne « C8 : fill chargé », `Tests  N passed` sans `failed`. Le bloc du vrai module est sauté ici (aucun `.wasm` dans ce worktree) ; T2 le joue.

**Preuve visuelle :** aucune.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC4 — Un fichier d'avant C8 s'ouvre toujours.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** géométrie booléenne en TS (Q17) ; `tsc` exigé dans ce worktree (le `.d.ts` du module n'a pas encore `fill_zone` : T2 le vérifie) ; toucher `engine/` ou `app/`.

**Critère « terminé » :** commande bornée verte ; `pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -5` sans `failed` (tests à garder verts : `fake-core.test.ts`, blocs « contrat C6a » et « contrat C6b » pour la fausse liaison). Rapport : `Réutilisation : appelé repli model3d (fake-core.ts:1701), branche Fill (wasm-core.ts:586)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : tests rouges de la fausse liaison**

À la fin de `apps/web/src/core/fake-core.test.ts` :
```ts
// C8 (Q11, Q13, Q14, Q17) : élément `fill` lu, dessiné, touché, recoloré et sauvegardé ; `Fill zone` = fond.
const fillFile = (fill: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify({
    now: "2026-11-21T00:00:00Z",
    appVersion: "0.1.0",
    assets: {},
    pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements: [{ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill }] }],
  }));
const SQUARE = { color: "#facc15", w: 400, h: 400, contours: [[0, 0, 400, 0, 400, 400, 0, 400], [150, 150, 150, 170, 170, 170, 170, 150]] };

describe("fakeCore — C8 (zone fermée)", () => {
  it("C8 : Fill zone = fond (second écart D36) ; tol non fini ou ≤ 0 refusé", () => {
    const d = fakeCore.blank();
    const p = d.pageIds()[0] ?? "";
    const c = d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 1, y: 2, tol: 2 }, color: "#1d4ed8" });
    expect(c.ids).toEqual([]);
    expect(d.page(p)?.background).toBe("#1d4ed8");
    for (const tol of [0, -1, Number.NaN]) {
      expect(() => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 1, y: 2, tol }, color: "#1d4ed8" })).toThrow("remplissage invalide");
    }
    expect(d.zoneCells(p, 2)).toBe(0);
  });

  it("C8 : fill chargé : vue, anneaux, touché loin des bords, recoloré, sauvé à l'identique", () => {
    const d = fakeCore.load(fillFile(SQUARE));
    expect(KNOWN_KINDS.has("fill")).toBe(true);
    expect(d.element("f1")).toEqual({ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill: { color: "#facc15", w: 400, h: 400 } });
    expect(Array.from(d.fillRings("f1") ?? [])).toEqual([4, 0, 0, 400, 0, 400, 400, 0, 400, 4, 150, 150, 150, 170, 170, 170, 170, 150]);
    expect(d.hitTest("p1", 300, 300, 6)).toBe("f1");
    expect(d.hitTest("p1", 103, 300, 6)).toBeNull();
    expect(d.hitTest("p1", 260, 260, 6)).toBeNull();
    expect(d.bounds(["f1"])).toEqual({ x0: 100, y0: 100, x1: 500, y1: 500 });
    const c = d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: "#dc2626" });
    expect(c.ids).toEqual(["f1"]);
    const v = d.version();
    d.apply({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: null });
    expect(d.version()).toBe(v);
    const r = fakeCore.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(r.element("f1")).toEqual(d.element("f1"));
    expect(r.fillRings("f1")).toEqual(d.fillRings("f1"));
  });

  it("C8 : fill mal formé : cadre inconnu de sa boîte, réécrit tel quel", () => {
    const bad = { color: "#facc15", w: 300, h: 200, contours: [[0, 0, 1]] };
    const d = fakeCore.load(fillFile(bad));
    expect(d.element("f1")).toEqual({ id: "f1", kind: "unknown", transform: [1, 0, 0, 1, 100, 100], unknown: { sourceKind: "fill", w: 300, h: 200 } });
    expect(d.fillRings("f1")).toBeNull();
    const again = fakeCore.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(again.element("f1")).toEqual(d.element("f1"));
  });
});
```
Si la forme exacte de la vue `unknown` diffère (champs `x`, `y`), aligner l'attendu sur celle que rend déjà un `model3d` mal formé dans `fake-core.test.ts` ; la boîte 300 × 200 et `sourceKind: "fill"` restent exigées. Lancer : `pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts 2>&1 | tail -8`. Attendu : `FAIL` (« fillRings is not a function », `KNOWN_KINDS` sans `fill`).

- [ ] **Étape 2 : types de `api.ts`**

```ts
export type ElementKind = "stroke" | "shape" | "text" | "image" | "media" | "model3d" | "table" | "fill" | "unknown";
```
`FillTarget` (commentaire complété par « C8 : zone fermée au point monde (x, y), tolérance de fermeture `tol` monde (2 px / zoom) ; le cœur la calcule à l'écriture, sinon le fond. ») :
```ts
export type FillTarget =
  | { readonly kind: "edge" | "inside"; readonly id: string }
  | { readonly kind: "background" }
  | { readonly kind: "image"; readonly id: string; readonly asset: AssetRef }
  | { readonly kind: "zone"; readonly x: number; readonly y: number; readonly tol: number };
```
Après `Model3dElement` :
```ts
/** Zone remplie au pot (C8, Q11, Q12) : couleur et boîte locale (0, 0)-(w, h) ; anneaux par `fillRings(id)` ; mal formé :
 *  élément unknown, sourceKind "fill". */
export interface FillData { readonly color: string; readonly w: number; readonly h: number }
export interface FillElement extends ElementBase { readonly kind: "fill"; readonly fill: FillData }
```
`ElementView` : ajouter `| FillElement` avant `| UnknownElement`. Dans `CoreDocument`, après `outline` :
```ts
  /** C8 (Q12) : anneaux locaux d'un `fill`, `[n, x0, y0, …]` par anneau, extérieur d'abord ; null pour tout autre élément. */
  fillRings(id: string): Float32Array | null;
  /** C8 (Q18) : cellules du masque d'un clic du pot sur `page` à `tol` monde ; 0 sans mur (marque `data-zone-cells`). */
  zoneCells(page: string, tol: number): number;
```

- [ ] **Étape 3 : vraie liaison (`wasm-core.ts`)**

Dans `toElementView`, avant `case "unknown": {` :
```ts
    case "fill": {
      const fl = v["fill"];
      if (!isRecord(fl)) throw new Error(ELEMENT);
      const { color, w, h } = fl;
      if (typeof color !== "string" || !finitePositive(w) || !finitePositive(h)) throw new Error(ELEMENT);
      return { ...base, kind, fill: { color, w, h } };
    }
```
Dans `apply`, `case "Fill"`, après le bloc `if (t.kind === "image") { … }` :
```ts
        // C8 (Q10) : zone fermée calculée par le cœur à l'écriture ; null → undefined : « Aucune ».
        if (t.kind === "zone") return toChange(this.d.fill_zone(cmd.page, t.x, t.y, t.tol, cmd.color ?? undefined));
```
Après `outline(id)` :
```ts
  fillRings(id: string): Float32Array | null { return this.d.fill_rings(id) ?? null; }
  zoneCells(page: string, tol: number): number { return this.d.zone_cells(page, tol); }
```

- [ ] **Étape 4 : fausse liaison (`fake-core.ts`)**

1. Après `interface FakeUnknown` :
```ts
/** C8 (Q11) : `fill` lisible ; anneaux locaux, extérieur d'abord. */
interface FakeFill extends FillData { readonly contours: readonly (readonly number[])[] }
```
Ajouter `FillData` à l'import de `./api`. Dans `FakeElement`, après `model3d` :
```ts
  /** C8 : zone remplie au pot ; un `fill` mal formé est un `unknown` (sourceKind "fill"), comme un média. */
  readonly fill?: FakeFill;
```
2. `KNOWN_KINDS` : `new Set(["stroke", "shape", "text", "image", "table", "media", "model3d", "fill"])`.
3. `worldPolygon` : insérer avant `: e.table` la branche `: e.fill ? [...(e.fill.contours[0] ?? [])]`.
4. Après `polygonHit` :
```ts
/** C8 (Q13) : `fill` touché dedans (pair-impair sur ses anneaux) et à plus de `tol` de chacun de ses bords (miroir de
 *  `fill_hit`, `query.rs`). */
function fillHit(e: FakeElement, x: number, y: number, tol: number): boolean {
  const f = e.fill;
  if (!f) return false;
  let inside = false;
  let edge = Number.POSITIVE_INFINITY;
  for (const r of f.contours) {
    const n = r.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = applyMatrix(e.transform, r[2 * i] ?? 0, r[2 * i + 1] ?? 0);
      const [xj, yj] = applyMatrix(e.transform, r[2 * j] ?? 0, r[2 * j + 1] ?? 0);
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      edge = Math.min(edge, distToSegment(x, y, xi, yi, xj, yj));
    }
  }
  return inside && edge > tol;
}

/** C8 (Q11) : `fill` lisible depuis le brut ; sinon null (cadre inconnu). */
function readFill(v: unknown): FakeFill | null {
  if (!isRecord(v)) return null;
  const { color, w, h, contours } = v;
  if (typeof color !== "string" || !validColor(color) || !finitePositive(w) || !finitePositive(h)) return null;
  if (!Array.isArray(contours) || contours.length === 0) return null;
  const rings: number[][] = [];
  for (const r of contours) {
    if (!Array.isArray(r) || r.length < 6 || r.length % 2 !== 0 || !r.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    rings.push([...(r as number[])]);
  }
  return { color, w, h, contours: rings };
}
```
5. `hitTest`, dans la boucle, après `if (!e) continue;` :
```ts
      if (e.fill) {
        if (fillHit(e, x, y, tol)) return e.id;
        continue;
      }
```
6. `element()`, après la ligne `model3d` : `if (e.fill) return { ...base, kind: "fill", fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h } };`
7. Après `outline(id)` :
```ts
  fillRings(id: string): Float32Array | null {
    const f = this.find(id)?.element.fill;
    return f ? new Float32Array(f.contours.flatMap((r) => [r.length / 2, ...r])) : null;
  }
  /** C8 (Q17) : aucune rastérisation dans la fausse liaison. */
  zoneCells(_page: string, _tol: number): number { return 0; }
```
8. `case "Fill"` : remplacer `if (t.kind === "background") {` par
```ts
        if (t.kind === "zone" && (![t.x, t.y, t.tol].every(Number.isFinite) || t.tol <= 0)) throw new Error(MESSAGES.badFill);
        // C8 (Q17) : second écart au contrat commun (D36) : aucune géométrie booléenne ici, une zone est le fond.
        if (t.kind === "background" || t.kind === "zone") {
```
et, juste après `if (!e) throw new Error(\`élément inconnu : ${t.id}\`);` (branche contour ou intérieur) :
```ts
        if (e.fill) {
          // C8 (Q14) : `field_for` rend `color` pour un `fill` ; « Aucune » : aucune étape (la page passe par Delete).
          if (color === null || e.fill.color === color) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old?.fill) p.elements[i] = { ...old, fill: { ...old.fill, color } };
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        }
```
9. `SavedElement` : ajouter `/** C8 : écrit `FakeFill` ; lu : valeur brute, contrôlée par `readFill`. */ fill?: unknown;`. Dans `savedElement`, avant le `return {` final :
```ts
  if (e.fill) return { id: e.id, kind: "fill", transform: [...e.transform], fill: { color: e.fill.color, w: e.fill.w, h: e.fill.h, contours: e.fill.contours.map((r) => [...r]) }, ...group };
```
10. `loadElement`, après la branche `if (e.kind === "model3d") { … }` :
```ts
  if (e.kind === "fill") {
    // C8 (Q11) : repli du média, pas celui de l'image : un `fill` mal formé est un cadre inconnu de sa boîte, brut gardé
    // sous `raw.fill`, réécrit tel quel.
    const source = e.fill ?? e.raw?.["fill"];
    const fill = readFill(source);
    const m = toMatrix6(e.transform);
    if (fill !== null && m !== null) return { id: e.id, transform: m, style: NO_STYLE, fill, ...group };
    const unknown: FakeUnknown = {
      sourceKind: "fill",
      raw: { fill: source },
      box: unknownBox(isRecord(source) ? source : {}),
      hasTransform: m !== null,
      ...(m === null && e.transform !== undefined ? { rawTransform: e.transform } : {}),
    };
    return { id: e.id, transform: m ?? IDENTITY, style: NO_STYLE, unknown, ...group };
  }
```
Lancer : `pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests "`. Attendu : 3 tests « C8 » passés.

- [ ] **Étape 5 : contrat — écart D36 écrit, forme des valeurs, bloc commun**

Remplacer le commentaire du contrat commun (`wasm-core.contract.test.ts:196-198`) par :
```ts
// Contrat commun (D36) : la fausse liaison, sur laquelle le lot 3 code, et le vrai module jouent les mêmes scénarios
// et cas limites. Deux exceptions : la gomme partielle (la fausse liaison ne coupe pas) et la zone fermée du pot (C8,
// Q17 : la fausse liaison traite `Fill { kind: "zone" }` comme le fond) ; leurs scénarios restent dans les blocs du
// vrai module (écarts documentés dans `fake-core.ts`).
```
À la fin du fichier :
```ts
describe("contrôle de forme C8 (fill)", () => {
  const t = [1, 0, 0, 1, 100, 100];
  it("fill : couleur et boîte gardées ; couleur absente ou boîte ≤ 0 : ElementView invalide", () => {
    expect(toElementView({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 4, h: 3 } })).toEqual({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 4, h: 3 } });
    expect(() => toElementView({ id: "f", kind: "fill", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "f", kind: "fill", transform: t, fill: { color: 3, w: 4, h: 3 } })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "f", kind: "fill", transform: t, fill: { color: "#facc15", w: 0, h: 3 } })).toThrow("ElementView invalide");
  });

  it("Fill zone : fill_zone(page, x, y, tol, couleur ou undefined) ; fillRings, zoneCells relayés", () => {
    const calls: unknown[][] = [];
    const ok = { pages: ["p1"], ids: [], removed: [], full: false, version: 1 };
    const doc = {
      fill_zone: (...a: unknown[]) => (calls.push(["fill_zone", ...a]), ok),
      fill_rings: (id: string) => (calls.push(["fill_rings", id]), undefined),
      zone_cells: (...a: unknown[]) => (calls.push(["zone_cells", ...a]), 7),
    };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    d.apply({ type: "Fill", page: "p1", target: { kind: "zone", x: 1, y: 2, tol: 3 }, color: null });
    d.apply({ type: "Fill", page: "p1", target: { kind: "zone", x: 1, y: 2, tol: 3 }, color: "#facc15" });
    expect(d.fillRings("f")).toBeNull();
    expect(d.zoneCells("p1", 2)).toBe(7);
    expect(calls).toEqual([
      ["fill_zone", "p1", 1, 2, 3, undefined],
      ["fill_zone", "p1", 1, 2, 3, "#facc15"],
      ["fill_rings", "f"],
      ["zone_cells", "p1", 2],
    ]);
  });
});

const c8Factories = factories;
describe.each(c8Factories)("contrat C8 : $name", ({ f }) => {
  it("C8 : page vide : Fill zone = fond, une étape ; même couleur : aucune étape ; tol ≤ 0 : refus (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 2 }, color: "#1d4ed8" });
    expect([c.pages, c.ids]).toEqual([[p], []]);
    expect(bg(d, p)).toBe("#1d4ed8");
    unchanged(d, () => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 2 }, color: "#1d4ed8" }));
    expect(messageOf(() => d.apply({ type: "Fill", page: p, target: { kind: "zone", x: 300, y: 300, tol: 0 }, color: "#1d4ed8" }))).toBe(BAD_FILL);
    expect(d.zoneCells(p, 2)).toBe(0);
    d.free();
  });
});
```
Si `createWasmCore(...).blank()` appelle une autre méthode du document factice, l'ajouter au stub en suivant le test existant `add_image`/`set_backdrop` (`wasm-core.contract.test.ts:150-170`). Lancer la commande bornée. Attendu : « contrôle de forme C8 », « contrat C8 : fausse liaison » passés, `Tests  N passed`.

- [ ] **Étape 6 : commit**

```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T3 && git add apps/web/src/core/api.ts apps/web/src/core/wasm-core.ts apps/web/src/core/fake-core.ts apps/web/src/core/fake-core.test.ts apps/web/src/core/wasm-core.contract.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): fill element, zone target and fake binding for the paint bucket" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T4 — Rendu du `fill` (`canvas2d`, pair-impair, chemin en cache par id)

<a id="tache-t4"></a>

**Objectif :** le moteur de rendu dessine un `fill` comme un `Path2D` de ses anneaux, lu une fois par id, rempli en
pair-impair à sa couleur ; l'export PDF suit par `record-ctx` sans changement.

**Fichiers :**
- Modifier : `apps/web/src/engine/render/renderer.ts:54` ; `apps/web/src/engine/render/canvas2d.ts:56-72` (après `tracePolygons`), `:426-465` (`paintElement`), `:643-654` (`pathOf`)
- Test : `apps/web/src/engine/render/canvas2d.test.ts`

**Interfaces :**
- Consomme (T3) : `FillElement { kind: "fill"; fill: { color; w; h } }`, `CoreDocument.fillRings(id): Float32Array | null`.
- Produit : `SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf" | "fillRings">>` ; `export function traceRings(p: PathSink, flat: ArrayLike<number>): void`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:643` `pathOf` (cache `Path2D` par id) — même cache, nouvelle source `fillRings(id)` (étendre)

**Test et commande bornée :**
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T4 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/record-ctx.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -10
```
Preuve : ≥ 1 ligne « fill : chemin des anneaux », `Tests  N passed` sans `failed` (`record-ctx.test.ts` à garder vert).

**Preuve visuelle :** portée par T7 (capture `docs/essais/c8-pot-zones.png`).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** toucher `record-ctx.ts`, `webgl2.ts`, `select.ts` ; relire les anneaux à chaque image.

**Critère « terminé » :** commande bornée verte ; `pnpm --filter @roomboard/web exec vitest run src/engine/render 2>&1 | tail -5` sans `failed`. Rapport : `Réutilisation : appelé pathOf (cache par id)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

Dans `canvas2d.test.ts`, ajouter `traceRings` à l'import de `./canvas2d`, puis à la fin :
```ts
describe("Canvas2DRenderer — fill (C8, Q15)", () => {
  it("C8 fill : chemin des anneaux en cache par id, rempli en pair-impair à sa couleur", () => {
    const rings = new Float32Array([4, 0, 0, 10, 0, 10, 10, 0, 10, 4, 3, 3, 3, 6, 6, 6, 6, 3]);
    let reads = 0;
    const src: SceneSource = {
      element: (id) => (id === "f" ? { id, kind: "fill", transform: [1, 0, 0, 1, 5, 6], fill: { color: "#facc15", w: 10, h: 10 } } : null),
      outline: () => null,
      fillRings: (id) => {
        reads++;
        return id === "f" ? rings : null;
      },
    };
    const scene = new FakeCtx();
    const paths: FakePath[] = [];
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, {
      makePath: () => {
        const p = new FakePath();
        paths.push(p);
        return p as unknown as Path2D;
      },
    });
    const fill = vi.spyOn(scene, "fill");
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    expect(reads).toBe(1);
    expect(paths).toHaveLength(1);
    expect([paths[0]?.moves, paths[0]?.lines, paths[0]?.closes]).toEqual([2, 6, 2]);
    expect(fill.mock.calls.filter((c) => c[1] === "evenodd")).toHaveLength(2);
    expect(scene.log).toContain("fill #facc15");
  });

  it("C8 fill : sans anneaux lisibles, rien n'est dessiné", () => {
    const src: SceneSource = {
      element: (id) => ({ id, kind: "fill", transform: [1, 0, 0, 1, 0, 0], fill: { color: "#facc15", w: 10, h: 10 } }),
      outline: () => null,
      fillRings: () => null,
    };
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), src, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(100, 100, 1);
    r.drawScene({ id: "p", elementIds: ["f"] }, IDENTITY, new Set());
    expect(scene.log).not.toContain("fill #facc15");
  });

  it("C8 traceRings : un sous-chemin fermé par anneau ; compte illisible ou anneau tronqué : lecture arrêtée", () => {
    const p = new FakePath();
    traceRings(p, [3, 0, 0, 1, 0, 0, 1, 2.5, 9, 9]);
    expect([p.moves, p.lines, p.closes]).toEqual([1, 2, 1]);
    const q = new FakePath();
    traceRings(q, [4, 0, 0, 1, 0]);
    expect([q.moves, q.lines, q.closes]).toEqual([0, 0, 0]);
  });
});
```
Lancer : `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | tail -8`. Attendu : `FAIL` (`traceRings` absent).

- [ ] **Étape 2 : `SceneSource`, `traceRings`, `pathOf`, branche `fill`**

`renderer.ts:54` :
```ts
export type SceneSource = Pick<CoreDocument, "element" | "outline"> & Partial<Pick<CoreDocument, "gridLines" | "gridLinesOf" | "fillRings">>;
```
`canvas2d.ts`, après `tracePolygons` :
```ts
/** Anneaux `[n, x0, y0, …]` d'un `fill` (C8, Q12) : un sous-chemin fermé par anneau ; un compte illisible (non entier,
 *  < 3) ou un anneau tronqué arrête la lecture. */
export function traceRings(p: PathSink, flat: ArrayLike<number>): void {
  let k = 0;
  while (k < flat.length) {
    const n = flat[k] ?? 0;
    if (!Number.isInteger(n) || n < 3 || k + 1 + 2 * n > flat.length) return;
    for (let i = 0; i < n; i++) {
      const x = flat[k + 1 + 2 * i] ?? 0;
      const y = flat[k + 2 + 2 * i] ?? 0;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    k += 1 + 2 * n;
  }
}
```
`pathOf` devient :
```ts
  private pathOf(id: string, kind: "stroke" | "fill" = "stroke"): Path2D | null {
    const cached = this.paths.get(id);
    if (cached !== undefined) return cached;
    let path: Path2D | null = null;
    if (kind === "fill") {
      // C8 (Q15) : anneaux immuables par id, lus une fois.
      const rings = this.source.fillRings?.(id) ?? null;
      if (rings && rings.length >= 7) {
        path = this.makePath();
        traceRings(path, rings);
      }
    } else {
      const outline = this.source.outline(id);
      if (outline && outline.length >= 6) {
        path = this.makePath();
        tracePolygons(path, outline);
      }
    }
    this.paths.set(id, path);
    return path;
  }
```
`paintElement` : remplacer les deux premières lignes par
```ts
    const path = el.kind === "stroke" ? this.pathOf(el.id) : el.kind === "fill" ? this.pathOf(el.id, "fill") : null;
    if ((el.kind === "stroke" || el.kind === "fill") && !path) return;
```
et ajouter, juste après la branche `if (el.kind === "stroke" && path) { … }` :
```ts
    } else if (el.kind === "fill" && path) {
      // C8 (Q15) : trous compris, en pair-impair ; l'export suit par `record-ctx`.
      ctx.fillStyle = el.fill.color;
      ctx.fill(path, "evenodd");
```
Lancer la commande bornée. Attendu : 3 tests « C8 » passés, `record-ctx.test.ts` vert.

- [ ] **Étape 3 : commit**

```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T4 && git add apps/web/src/engine/render/renderer.ts apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): render fill elements with even-odd rings cached per id" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T5 — Marques de la zone et `stageTags`

<a id="tache-t5"></a>

**Objectif :** une petite unité, sans dépendance au moteur, mesure la durée d'une commande `Fill` de cible `zone`
(`performance.measure("pot-zone")`), relève les cellules du masque et compte les `fill` de la page ; `stageTags` porte les
trois marques. L'essai C8 lit `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells` (Q18).

**Fichiers :**
- Créer : `apps/web/src/app/zone-marks.ts`, `apps/web/src/app/zone-marks.test.ts`
- Modifier : `apps/web/src/app/stage-tags.ts:22-47`, `apps/web/src/app/stage-tags.test.ts`

**Interfaces :**
- Consomme : rien d'une autre tâche (types structurels : `CoreDocument` convient tel quel après T3).
- Produit (branché par T6) :
  - `export interface ZoneDoc { elementIds(page: string): readonly string[]; element(id: string): { readonly kind: string } | null; zoneCells(page: string, tol: number): number }`
  - `export interface ZoneTags { readonly zones: string; readonly zoneMs: string; readonly zoneCells: string }`
  - `export function createZoneMarks(doc: ZoneDoc, now?: () => number, measure?: (start: number, end: number) => void): ZoneMarks` ; `ZoneMarks.timed(run: (c: Command) => Change | null): (c: Command) => Change | null` ; `ZoneMarks.tags(page: string, version: number): ZoneTags`
  - `StageExtras` gagne `zones?`, `zoneMs?`, `zoneCells?` ; `stageTags` rend aussi `zones`, `zoneMs`, `zoneCells` (`""` par défaut)
- Réutilise : `apps/web/src/app/stage-tags.ts:30` `stageTags` — champ `zones` (et `zoneMs`, `zoneCells`) (étendre)

**Test et commande bornée :**
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T5 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/app/zone-marks.test.ts src/app/stage-tags.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -10
```
Preuve : ≥ 1 ligne « Fill zone : durée mesurée », `Tests  N passed` sans `failed`.

**Preuve visuelle :** aucune (marques lues par T7).

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** toucher `board-session.ts` (T6) ou `core/` ; importer un littéral de type absent avant T3 (la cible `zone` se lit structurellement).

**Critère « terminé » :** commande bornée verte. Rapport : `Réutilisation : appelé stageTags` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : tests rouges**

Créer `apps/web/src/app/zone-marks.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import type { Change, Command } from "../core/api";
import { createZoneMarks, type ZoneDoc } from "./zone-marks";

const change: Change = { pages: ["p"], ids: ["f"], removed: [], full: false, version: 2 };
const zone = { type: "Fill", page: "p", target: { kind: "zone", x: 1, y: 2, tol: 2 }, color: "#facc15" } as unknown as Command;
const bg: Command = { type: "Fill", page: "p", target: { kind: "background" }, color: "#facc15" };

function doc(kinds: Record<string, string>): ZoneDoc & { reads: number; asked: [string, number][] } {
  const d = {
    reads: 0,
    asked: [] as [string, number][],
    elementIds: () => {
      d.reads++;
      return Object.keys(kinds);
    },
    element: (id: string) => (kinds[id] === undefined ? null : { kind: kinds[id] ?? "" }),
    zoneCells: (page: string, tol: number) => {
      d.asked.push([page, tol]);
      return 4_032_064;
    },
  };
  return d;
}

describe("zone-marks (C8, Q18)", () => {
  it("C8 Fill zone : durée mesurée et marquée au dixième, cellules relues au même tol", () => {
    const d = doc({ a: "stroke", f: "fill" });
    const times = [10, 22.34];
    const measured: [number, number][] = [];
    const m = createZoneMarks(d, () => times.shift() ?? 0, (s, e) => measured.push([s, e]));
    const ran: Command[] = [];
    expect(m.timed((c) => (ran.push(c), change))(zone)).toBe(change);
    expect(ran).toEqual([zone]);
    expect(measured).toEqual([[10, 22.34]]);
    expect(m.tags("p", 2)).toEqual({ zones: "1", zoneMs: "12.3", zoneCells: "4032064" });
    expect(d.asked).toEqual([["p", 2]]);
  });

  it("C8 autre commande : ni mesure ni marque", () => {
    const d = doc({});
    const measured: unknown[] = [];
    const m = createZoneMarks(d, () => 0, () => measured.push(1));
    expect(m.timed(() => change)(bg)).toBe(change);
    expect(measured).toEqual([]);
    expect(m.tags("p", 1)).toEqual({ zones: "0", zoneMs: "", zoneCells: "" });
  });

  it("C8 compte des fill relu seulement quand la page ou la version change", () => {
    const d = doc({ f: "fill", g: "fill" });
    const m = createZoneMarks(d, () => 0, () => undefined);
    expect(m.tags("p", 1).zones).toBe("2");
    m.tags("p", 1);
    expect(d.reads).toBe(1);
    m.tags("p", 2);
    m.tags("q", 2);
    expect(d.reads).toBe(3);
  });
});
```
Dans `stage-tags.test.ts`, à la fin :
```ts
describe("stageTags (C8, Q18)", () => {
  it("C8 zones, zoneMs, zoneCells : recopiés ; vides par défaut", () => {
    expect(stageTags(base, { zones: "1", zoneMs: "12.3", zoneCells: "4032064" })).toMatchObject({ zones: "1", zoneMs: "12.3", zoneCells: "4032064" });
    expect(stageTags(base)).toMatchObject({ zones: "", zoneMs: "", zoneCells: "" });
  });
});
```
Lancer : `pnpm --filter @roomboard/web exec vitest run src/app/zone-marks.test.ts src/app/stage-tags.test.ts 2>&1 | tail -8`. Attendu : `FAIL` (module `./zone-marks` introuvable).

- [ ] **Étape 2 : écrire `zone-marks.ts`**

```ts
/**
 * Pot dans une zone fermée (C8, Q18) : durée du clic à l'écriture d'une commande `Fill` de cible `zone` (mesure
 * `performance.measure("pot-zone")`), cellules du masque (`zoneCells`) et nombre d'éléments `fill` de la page montrée ;
 * lus par l'essai C8 dans `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells` (patron B21, `stage-tags.ts`).
 */
import type { Change, Command } from "../core/api";

/** Ce que les marques lisent du document (structurel : `CoreDocument` convient). */
export interface ZoneDoc {
  elementIds(page: string): readonly string[];
  element(id: string): { readonly kind: string } | null;
  zoneCells(page: string, tol: number): number;
}
export interface ZoneTags { readonly zones: string; readonly zoneMs: string; readonly zoneCells: string }
export interface ZoneMarks {
  /** `run` mesuré quand la commande est un `Fill` de cible `zone` ; toute autre commande passe telle quelle. */
  timed(run: (c: Command) => Change | null): (c: Command) => Change | null;
  /** Marques de la page montrée ; le compte des `fill` n'est relu que si la page ou la version change. */
  tags(page: string, version: number): ZoneTags;
}

interface ZoneTarget { readonly kind: string; readonly tol?: unknown }
const zoneOf = (c: Command): { readonly page: string; readonly tol: number } | null => {
  if (c.type !== "Fill") return null;
  const t = c.target as ZoneTarget;
  return t.kind === "zone" && typeof t.tol === "number" ? { page: c.page, tol: t.tol } : null;
};

export function createZoneMarks(
  doc: ZoneDoc,
  now: () => number = () => performance.now(),
  measure: (start: number, end: number) => void = (start, end) => {
    performance.measure("pot-zone", { start, end });
  },
): ZoneMarks {
  let zoneMs = "";
  let zoneCells = "";
  let counted: { readonly page: string; readonly version: number; readonly zones: string } | null = null;
  return {
    timed: (run) => (c) => {
      const z = zoneOf(c);
      if (z === null) return run(c);
      const start = now();
      const change = run(c);
      const end = now();
      measure(start, end);
      zoneMs = (Math.round((end - start) * 10) / 10).toFixed(1);
      zoneCells = String(doc.zoneCells(z.page, z.tol));
      return change;
    },
    tags: (page, version) => {
      if (counted === null || counted.page !== page || counted.version !== version) {
        const zones = doc.elementIds(page).filter((id) => doc.element(id)?.kind === "fill").length;
        counted = { page, version, zones: String(zones) };
      }
      return { zones: counted.zones, zoneMs, zoneCells };
    },
  };
}
```

- [ ] **Étape 3 : étendre `stageTags`**

Dans `StageExtras`, après `pot` :
```ts
  /** C8 (Q18) : nombre de `fill` de la page, durée du dernier pot de zone (ms, au dixième), cellules de son masque. */
  readonly zones?: string;
  readonly zoneMs?: string;
  readonly zoneCells?: string;
```
Type de retour : ajouter `| "zones" | "zoneMs" | "zoneCells"` à l'union des clés ; dans l'objet rendu, après `pot` :
```ts
    zones: extra.zones ?? "",
    zoneMs: extra.zoneMs ?? "",
    zoneCells: extra.zoneCells ?? "",
```
Compléter le commentaire de `stageTags` par « et C8 (`zones`, `zoneMs`, `zoneCells`) ». Lancer la commande bornée. Attendu : 4 tests « C8 » passés.

- [ ] **Étape 4 : commit**

```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T5 && git add apps/web/src/app/zone-marks.ts apps/web/src/app/zone-marks.test.ts apps/web/src/app/stage-tags.ts apps/web/src/app/stage-tags.test.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): zone paint timing and stage marks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T6 — Outil Pot : rien touché → `Fill Zone` ; `fill` touché → recolorer ou `Delete` ; marques branchées

<a id="tache-t6"></a>

**Objectif :** quand rien n'est sous le pointeur, `fillCommand` envoie `Fill { kind: "zone", x, y, tol: 2 / zoom }` ; sur
un `fill`, une couleur le recolore (`inside`) et « Aucune » le supprime (`Delete`). La session mesure ces commandes et
marque `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells`.

**Fichiers :**
- Modifier : `apps/web/src/engine/fill-target.ts:1-97`, `apps/web/src/engine/fill-target.test.ts:205-252`, `apps/web/src/app/board-session.ts:51`, `:189-197`, `:328`, `:634-646`
- Test : `apps/web/src/engine/fill-target.test.ts`

**Interfaces :**
- Consomme (T3) : `FillTarget { kind: "zone"; x; y; tol }`, `FillElement`, `Command { type: "Delete"; ids }`, fausse liaison qui charge et touche un `fill`.
- Consomme (T5) : `createZoneMarks(doc)`, `ZoneMarks.timed(run)`, `ZoneMarks.tags(page, version)`, `StageExtras.zones/zoneMs/zoneCells`.
- Produit : `export const ZONE_CLOSE_TOL_PX = 2;` (`fill-target.ts`).
- Réutilise : `apps/web/src/engine/fill-target.ts:78` `fillCommand` — branche « rien touché » → `Zone` ; patron `FILL_HIT_TOL_PX / zoom` (étendre)
- Réutilise : `apps/web/src/app/image-fill.ts` `createFillQueue` — `submit(r, run)` tel quel, `run` enveloppé par `zoneMarks.timed`
- Réutilise : `apps/web/src/app/stage-tags.ts:30` `stageTags` — champs `zones`, `zoneMs`, `zoneCells` (T5)

**Test et commande bornée :**
```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T6 && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/app/image-fill.test.ts src/app/board-session.test.ts --reporter=verbose 2>&1 | grep -E "C8|Tests " | tail -12
```
Preuve : ≥ 1 ligne « C8 : rien sous le pointeur », `Tests  N passed` sans `failed` (`tools/fill.test.ts`, `image-fill.test.ts`, `board-session.test.ts` à garder verts).

**Preuve visuelle :** portée par T7.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC5 — Scène ≥ 640 px.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** modifier `image-fill.ts` (file inchangée, Q16) ou `tools/fill.ts` ; ajouter un contrôle de tolérance dans la rangée du pot (Q7) ; chercher la zone côté page.

**Critère « terminé » :** commande bornée verte. Rapport : `Réutilisation : appelé fillCommand, createFillQueue.submit, stageTags` ou `Réutilisation : écart — <pourquoi>`.

**Étapes :**

- [ ] **Étape 1 : tests rouges (cas « rien → fond » devenus « rien → zone », `fill` touché)**

Dans `fill-target.test.ts` :
1. Remplacer le test « rien sous le pointeur : fond de la page ; « Aucune » : fond retiré (D10, D11) » par :
```ts
  it("C8 : rien sous le pointeur : Fill zone à 2 px / zoom ; « Aucune » gardée (Q7, Q10, DA-Z3)", () => {
    const s = setup();
    expect(s.at(1500, 1000)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 2 }, color: RED });
    expect(s.at(1500, 1000, null)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 2 }, color: null });
    expect(s.at(1500, 1000, RED, 4)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 1500, y: 1000, tol: 0.5 }, color: RED });
  });
```
2. Remplacer le test « quatre lignes en carré, clic au centre : fond de la page (D1) » par :
```ts
  // C8 (DA-Z3) : la page ne cherche pas la zone ; elle envoie `Fill zone` et le cœur décide (zone fermée ou fond).
  it("C8 : quatre lignes en carré, clic au centre : Fill zone, décidée par le cœur", () => {
    const s = setup();
    const style = { color: "#000000", width: 4 };
    const seg = (x0: number, y0: number, x1: number, y1: number): void => {
      s.doc.apply({ type: "AddShape", page: s.page, shape: "line", x0, y0, x1, y1, style, fill: null });
    };
    seg(100, 1000, 300, 1000);
    seg(300, 1000, 300, 1200);
    seg(300, 1200, 100, 1200);
    seg(100, 1200, 100, 1000);
    expect(s.at(200, 1100)).toEqual({ type: "Fill", page: s.page, target: { kind: "zone", x: 200, y: 1100, tol: 2 }, color: RED });
  });
```
3. Le test « élément de genre inconnu sous le pointeur : fond de la page » reste tel quel (un inconnu touché garde le fond).
4. Ajouter à la fin du `describe` :
```ts
  // C8 (Q14) : un `fill` touché (dedans, à plus de 6 px du bord) se recolore ; « Aucune » le supprime en une étape.
  it("C8 : fill sous le pointeur : couleur → inside, « Aucune » → Delete", () => {
    const file = new TextEncoder().encode(JSON.stringify({
      now: "2026-11-21T00:00:00Z", appVersion: "0.1.0", assets: {},
      pages: [{ id: "p1", background: "#ffffff", backdrop: null, elements: [{ id: "f1", kind: "fill", transform: [1, 0, 0, 1, 100, 100], fill: { color: "#facc15", w: 400, h: 400, contours: [[0, 0, 400, 0, 400, 400, 0, 400]] } }] }],
    }));
    const doc = fakeCore.load(file);
    expect(fillCommand(doc, "p1", 300, 300, 1, RED, ten)).toEqual({ type: "Fill", page: "p1", target: { kind: "inside", id: "f1" }, color: RED });
    expect(fillCommand(doc, "p1", 300, 300, 1, null, ten)).toEqual({ type: "Delete", ids: ["f1"] });
    expect(fillCommand(doc, "p1", 103, 300, 1, RED, ten)).toEqual({ type: "Fill", page: "p1", target: { kind: "zone", x: 103, y: 300, tol: 2 }, color: RED });
  });
```
Lancer : `pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts 2>&1 | tail -8`. Attendu : `FAIL` sur les trois tests « C8 ».

- [ ] **Étape 2 : `fill-target.ts`**

En-tête : remplacer « élément inconnu ou rien : fond de la page (D1, D10) » par « élément inconnu : fond de la page (D1, D10) ; rien : zone fermée (C8, `Fill zone`, décidée par le cœur, sinon le fond) ; `fill` : recoloré, ou supprimé par « Aucune » (Q14) ». Après `FILL_HIT_TOL_PX` :
```ts
/** Tolérance de fermeture d'une zone, en px d'écran (C8, U28 : « tolérance de fermeture 2 px », Q7). */
export const ZONE_CLOSE_TOL_PX = 2;
```
Dans `fillCommand`, remplacer `if (!el) return background(page, color);` par :
```ts
  if (!el) return { type: "Fill", page, target: { kind: "zone", x, y, tol: ZONE_CLOSE_TOL_PX / zoom }, color };
  if (el.kind === "fill") return color === null ? { type: "Delete", ids: [el.id] } : { type: "Fill", page, target: { kind: "inside", id: el.id }, color };
```
Lancer la commande bornée sur `fill-target.test.ts`. Attendu : tous verts.

- [ ] **Étape 3 : brancher les marques dans `board-session.ts`**

1. Import, à côté de `createFillQueue` : `import { createZoneMarks } from "./zone-marks";`
2. Après `undo.push(() => fillQueue.dispose());` :
```ts
  // C8 (Q18) : durée du pot de zone (`performance.measure("pot-zone")`), cellules, nombre de `fill` (data-zones…).
  const zoneMarks = createZoneMarks(doc);
```
3. Outil Pot (`:328`) : `submit: (r, run) => fillQueue.submit(r, zoneMarks.timed(run))`.
4. Dans `mark`, remplacer l'appel `stageTags(s, { pixels: …, image: …, pot: fillQueue.state() })` par
```ts
    const zone = zoneMarks.tags(s.page, s.version);
    const tags = stageTags(s, { pixels: images.pixelState(), image: imageSize(s.selectionImage), pot: fillQueue.state(), zones: zone.zones, zoneMs: zone.zoneMs, zoneCells: zone.zoneCells });
```
et, après `stage.dataset["pot"] = tags.pot;` :
```ts
    stage.dataset["zones"] = tags.zones;
    stage.dataset["zoneMs"] = tags.zoneMs;
    stage.dataset["zoneCells"] = tags.zoneCells;
```
Lancer la commande bornée. Attendu : `Tests  N passed`, dont « C8 : rien sous le pointeur », sans `failed`.

- [ ] **Étape 4 : commit**

```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T6 && git add apps/web/src/engine/fill-target.ts apps/web/src/engine/fill-target.test.ts apps/web/src/app/board-session.ts && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "feat(web): paint bucket sends zone fills, recolors or deletes fill elements" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T7 — Essai navigateur C8, branché dans `verifier.sh --e2e` ; tailles finales

<a id="tache-t7"></a>

**Objectif :** prouver S1, S2, S3, S5 et S6 dans Chromium avec le vrai module : trois traits qui ferment un triangle
(écart < 2 px), remplissage au pot, `fill` présent, traits inchangés, annuler puis refaire, clic hors de toute zone (fond),
enregistrer puis rouvrir, fichier d'avant C8 ouvert ; porte de temps S6 (médiane ≤ 50 ms sur ≥ 4 000 000 cellules) ; scène
≥ 640 px ; capture `docs/essais/c8-pot-zones.png`.

**Fichiers :**
- Créer : `scripts/essais/c8-pot-zones-navigateur.mjs`, `docs/essais/c8-pot-zones.png`
- Modifier : `scripts/verifier.sh:110-112` (bloc `--e2e`), `scripts/tests/verifier-e2e.test.sh:12`, `docs/essais/taille-wasm.md` (section C8)

**Interfaces :**
- Consomme : `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells` (T5, T6) ; `#stage[data-camera]`, `data-elements`, `data-ready` (existants) ; Wasm `Document.blank`, `page_ids`, `commit_stroke(page, points, color, width)`, `save(now, version)` (fixture S6, T1) ; outils `item("pen")`, `item("fill")`, préréglages `data-preset="jaune" | "bleu"`.
- Produit : l'essai `C8 pot zones : OK`, la capture, les deux tailles relevées.
- Réutilise : `scripts/essais/commun.mjs` — `stageBox`, `stageMouse`, `inkIn`, `frames`, `serve`, `coqueCsp`, `loadPlaywright`, `item`, `TAB`, `VIEWPORT`, `Echec`, `gitSha` (appel tel quel)
- Réutilise : `scripts/essais/c6a-pot-navigateur.mjs:136-160`, `:210-260` — patron `saveTo`, `openFile`, `waitAttr`, `camera`, `main` (repris, pas modifié)

**Test et commande bornée :**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T7 && bash scripts/verifier.sh --e2e 2>&1 | grep -E "C8 pot zones|module Wasm|module formats|e2e OK|verifier.sh : OK|ÉCHEC" | tail -12
```
Preuve : « C8 pot zones : OK », « verifier.sh : e2e OK », « verifier.sh : OK », lignes `module Wasm : N octets` et `module formats : M octets` (N ≤ 1 420 000, M ≤ 3 145 728). Les essais C6a et C6b (`c6a-pot-navigateur.mjs`, `c6b-pot-image-navigateur.mjs`) passent dans la même commande (à garder verts).

**Preuve visuelle :** lectures d'abord, dans l'essai : `data-zones=1` après le remplissage, `data-zones=0` après Annuler, `data-zones=1` après Refaire et après réouverture, `data-zone-cells≥4000000` et médiane `data-zone-ms≤50` en S6. Puis la capture `docs/essais/c8-pot-zones.png` (lancée une fois avec `--captures`) : un triangle de trois traits noirs, intérieur jaune, fond de page bleu ; à décrire en une phrase dans le rapport.

**Contraintes (recopiées) :**
- GC1 — TDD : test rouge d'abord. Aucun seuil baissé ou relevé, aucun test désactivé ou sauté.
- GC2 — Plafonds Wasm : principal 1 572 864 o (garde-fou du cadrage 1 420 000 o → repli HU2-8), formats 3 145 728 o ; ni baissés ni relevés. Aucun troisième module Wasm. Aujourd'hui : principal 1 145 044 o, formats 3 100 344 o.
- GC4 — Un fichier d'avant C8 s'ouvre toujours.
- GC5 — Scène ≥ 640 px.
- GC7 — Aucun build Tauri, aucun build Android. Commandes : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- GC8 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Jamais `git add -A`, `.`, ni `commit -a`.
- GC9 — VM chargée : un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé.

**Interdits :** relever la porte de 50 ms ou baisser le seuil de 4 000 000 cellules ; passer `--captures` dans `verifier.sh` (l'option n'est donnée qu'à la main, une fois) ; toucher au code de l'application (une régression trouvée ici se rapporte, elle ne se corrige pas dans T7).

**Critère « terminé » :** commande bornée verte ; capture commitée ; tailles écrites. Si la porte S6 échoue deux fois de suite (GC9) : rapporter `BLOQUÉ : porte S6, médiane <x> ms, cellules <n>` sans rien relâcher (repli DA-Z5 décidé par l'orchestrateur). Rapport : `Réutilisation : appelé commun.mjs (stageBox, stageMouse, inkIn…)` ou `Réutilisation : écart — <pourquoi>`, les deux tailles, la description de la capture.

**Étapes :**

- [ ] **Étape 1 : écrire l'essai (rouge tant qu'il n'est pas branché)**

Créer `scripts/essais/c8-pot-zones-navigateur.mjs` :
```js
#!/usr/bin/env node
// Essai C8 « pot, zones fermées » au navigateur (S1, S2, S3, S5, S6 du cadrage usage-c8-pot-zones). Application
// construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, mode repli
// (`?fichiers=repli`), heure figée. Oracles : `#stage[data-zones]`, `data-zone-ms`, `data-zone-cells`, couleurs lues dans
// `#scene` (`inkIn`) ; aucune requête hors de 127.0.0.1. La fixture S6 est fabriquée par l'essai avec le vrai module
// (Node, `initSync`). Lancé par scripts/verifier.sh --e2e, sans option de capture.
// Code de sortie : 0 réussi, 1 échec, 2 outil absent. Usage : node scripts/essais/c8-pot-zones-navigateur.mjs [--captures]
// (--captures : docs/essais/c8-pot-zones.png : triangle de trois traits rempli au pot, fond bleu).
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C8 pot zones";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const SOCLE = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");
const WASM_DIR = join(ROOT, "apps", "web", "src", "wasm");
/** Triangle au stylo, px de la scène : le dernier trait s'arrête à 1 px de son départ (écart < 2 px). */
const A = [300, 200];
const B = [640, 200];
const C = [470, 470];
const A_END = [301, 200];
const CENTROID = [470, 290];
const ON_AB = [[440, 196], [500, 204]];
const VOID = [1100, 560];
const YELLOW = [250, 204, 21];
const BLUE = [29, 78, 216];
/** S6 (Q18) : porte de 50 ms, pire cas d'au moins 4 000 000 cellules à zoom 1. */
const GATE_MS = 50;
const MIN_CELLS = 4_000_000;
const WHEEL_ZOOM_SPEED = 0.002; // apps/web/src/engine/engine.ts:185
/** S6 : points monde dans et hors du triangle (côtés x = −700, y = −700, x + y = 600). */
const INSIDE = [100, 100];
const OUTSIDE = [900, 400];

/** S6 : triangle de traits à main levée de 2000 × 2000 en monde et 300 traits courts à l'intérieur, par le vrai module. */
async function buildFixture(tmp) {
  const glue = await import(pathToFileURL(join(WASM_DIR, "roomboard_wasm.js")).href);
  glue.initSync({ module: readFileSync(join(WASM_DIR, "roomboard_wasm_bg.wasm")) });
  const d = glue.Document.blank();
  const p = d.page_ids()[0];
  const side = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(len / 10);
    const [nx, ny] = [-(y1 - y0) / len, (x1 - x0) / len];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const wob = 3 * Math.sin(t * Math.PI * 7) * Math.sin(t * Math.PI); // main levée, nulle aux sommets
      pts.push(x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob, 0.5);
    }
    d.commit_stroke(p, new Float32Array(pts), "#000000", 4);
  };
  side(-700, -700, 1300, -700);
  side(1300, -700, -700, 1300);
  side(-700, 1300, -700, -700);
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 15; j++) {
      const [x, y] = [-600 + 40 * i, -600 + 40 * j];
      d.commit_stroke(p, new Float32Array([x, y, 0.5, x + 15, y, 0.5]), "#000000", 4);
    }
  }
  const file = join(tmp, "c8-s6.roomboard");
  await writeFile(file, d.save(FIXED.toISOString(), "essai-c8"));
  d.free();
  return file;
}

async function scenario(page, url, { captures, tmp }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const key = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  const sq = ([x, y], r = 8) => [x - r, y - r, x + r, y + r];
  const near = (p, rgb, tol = 40, r = 8) => inkIn(page, sq(p, r), { rgb, tol });
  const drag = async (a, b) => {
    await mouse.move(a[0], a[1]);
    await mouse.down();
    await mouse.move(b[0], b[1], { steps: 8 });
    await mouse.up();
    await fr();
  };
  const pot = async () => {
    await page.click(item("fill"));
    await fr();
  };
  const pick = async (id) => {
    await page.click(`button[data-preset="${id}"]`);
    await fr();
  };
  const click = async ([x, y]) => {
    await mouse.click(x, y);
    await fr();
  };
  const saveTo = async (name) => {
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const file = join(tmp, name);
    await (await dl).saveAs(file);
    return file;
  };
  const openFile = async (file) => {
    const before = await page.locator(TAB).count();
    const chooser = page.waitForEvent("filechooser");
    await page.keyboard.press("Control+o");
    await (await chooser).setFiles(file);
    await page.waitForFunction((n) => document.querySelectorAll('[role="tab"][data-tab]').length === n, before + 1, { timeout: 15000 });
    await fr();
  };
  const strokeInk = () => inkIn(page, [ON_AB[0][0], ON_AB[0][1], ON_AB[1][0], ON_AB[1][1]]);

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();

  // S1 : trois traits qui ferment un triangle (écart de 1 px), pot jaune au centre.
  await page.click(item("pen"));
  await fr();
  await drag(A, B);
  await drag(B, C);
  await drag(C, A_END);
  await waitAttr("data-elements", "3");
  const inkBefore = await strokeInk();
  await pot();
  check((await stageBox(page)).height >= 640, "S5 : Pot actif, la scène garde au moins 640 px de haut");
  await pick("jaune");
  check((await near(CENTROID, YELLOW)) === 0, "S1 : avant le clic, l'intérieur du triangle est vide");
  await click(CENTROID);
  await waitAttr("data-zones", "1");
  check((await attr("data-elements")) === "4", "S1 : un élément fill s'ajoute aux trois traits");
  check((await near(CENTROID, YELLOW)) > 150, "S1 : l'intérieur du triangle prend le jaune");
  const inkAfter = await strokeInk();
  check(inkAfter >= 0.9 * inkBefore && inkBefore > 0, `S1 : le trait du haut garde son encre (${inkBefore} → ${inkAfter} px)`);
  await key("Control+z");
  await waitAttr("data-zones", "0");
  check((await near(CENTROID, YELLOW)) <= 10, "S1 : Annuler retire le remplissage (une étape)");
  await key("Control+y");
  await waitAttr("data-zones", "1");
  check((await near(CENTROID, YELLOW)) > 150, "S1 : Refaire le rétablit");

  // S2 : hors de toute zone, le fond de la page change ; aucun fill de plus.
  await pick("bleu");
  await click(VOID);
  check((await near(VOID, BLUE)) > 150, "S2 : clic hors de toute zone : le fond de la page devient bleu");
  check((await attr("data-zones")) === "1" && (await attr("data-elements")) === "4", "S2 : aucun fill de plus");
  if (captures) {
    const path = join(ROOT, "docs", "essais", "c8-pot-zones.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S3 : enregistrer, rouvrir ; fichier d'avant C8.
  const file = await saveTo("c8.roomboard");
  await openFile(file);
  await waitAttr("data-zones", "1");
  check((await near(CENTROID, YELLOW)) > 150, "S3 : rouvert : le fill est là, jaune, au-dessus des traits");
  await openFile(SOCLE);
  check((await attr("data-zones")) === "0", "S3 : socle-v1.roomboard (d'avant C8) s'ouvre, aucun fill");

  // S6 : porte de temps sur le pire cas, à zoom 1.
  await openFile(await buildFixture(tmp));
  for (let k = 0; k < 6; k++) {
    const c = await camera();
    if (Math.abs(c.zoom - 1) <= 0.002) break;
    await mouse.move(Math.max(5, c.tx), Math.max(5, c.ty));
    await page.keyboard.down("Control");
    await mouse.wheel(0, Math.log(c.zoom) / WHEEL_ZOOM_SPEED);
    await page.keyboard.up("Control");
    await fr();
  }
  const z = await camera();
  check(Math.abs(z.zoom - 1) <= 0.002, `S6 : zoom 1 atteint (${z.zoom})`);
  const box = await stageBox(page);
  const [ix, iy] = await screen(INSIDE);
  const [ox, oy] = await screen(OUTSIDE);
  check(ix > 0 && iy > 0 && ox < box.width && oy < box.height, "S6 : points dans et hors du triangle visibles");
  await pot();
  await pick("jaune");
  const ms = [];
  let cells = 0;
  for (let k = 0; k < 3; k++) {
    await click([ix, iy]);
    await waitAttr("data-zones", "1");
    ms.push(Number(await attr("data-zone-ms")));
    cells = Number(await attr("data-zone-cells"));
    await key("Control+z");
    await waitAttr("data-zones", "0");
  }
  ms.sort((a, b) => a - b);
  check(cells >= MIN_CELLS, `S6 : masque de ${cells} cellules (>= ${MIN_CELLS})`);
  check(ms[1] <= GATE_MS, `S6 : médiane ${ms[1]} ms du clic à l'écriture (<= ${GATE_MS} ms ; ${ms.join(", ")})`);
  await pick("bleu");
  await click([ox, oy]);
  check((await near([ox, oy], BLUE)) > 150, "S6 : hors du triangle, le fond change");
  const out = Number(await attr("data-zone-ms"));
  check(out <= GATE_MS && (await attr("data-zones")) === "0", `S6 : fond en ${out} ms (<= ${GATE_MS}), aucun fill`);
  const hFinal = (await stageBox(page)).height;
  check(hFinal >= 640, `S5 : Pot actif : scène mesurée ${Math.round(hFinal)} px (>= 640)`);
  check(errors.length === 0, `aucune erreur dans la page${errors.length > 0 ? ` : ${errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html")) || !existsSync(join(WASM_DIR, "roomboard_wasm_bg.wasm"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist ou apps/web/src/wasm absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c8-"));
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
Si un repère de scène (`A`, `B`, `C`, `CENTROID`, `ON_AB`) tombe sur une barre d'outils à l'écran de 1280 × 900, le déplacer de façon à garder un triangle d'au moins 300 px de côté et un écart de 1 px au dernier sommet ; les oracles ne changent pas. Ajouter le test d'abord dans `scripts/tests/verifier-e2e.test.sh` : dans la liste `for s in …`, ajouter `c8-pot-zones-navigateur` après `c15-3d-navigateur`. Lancer : `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3`. Attendu : `ECHEC : c8-pot-zones-navigateur absent de verifier.sh`.

- [ ] **Étape 2 : brancher l'essai dans `verifier.sh --e2e`**

Dans le bloc `if [ "$E2E" = 1 ]; then`, après `echo "C15 3D : OK"` :
```bash
  node scripts/essais/c8-pot-zones-navigateur.mjs
  echo "C8 pot zones : OK"
```
Lancer : `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -2`. Attendu : `verifier-e2e.test.sh : OK`.

- [ ] **Étape 3 : jouer l'essai seul (construction comprise), puis la capture**

```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; cd ~/projets/roomboard-wt/usage-c8-pot-zones--T7 && pnpm install --frozen-lockfile >/dev/null && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -1 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && pnpm --filter @roomboard/web build 2>&1 | tail -2 && node scripts/essais/c8-pot-zones-navigateur.mjs 2>&1 | tail -30
```
Attendu : les lignes `ok — …` de S1, S2, S3, S5, S6, puis `C8 pot zones : OK`. Une ligne `ÉCHEC` sur un délai : rejouer une fois (GC9). Puis la capture, une fois : `node scripts/essais/c8-pot-zones-navigateur.mjs --captures 2>&1 | grep -E "capture|OK|ÉCHEC"`. Attendu : `capture : …/docs/essais/c8-pot-zones.png` et `C8 pot zones : OK`. Ouvrir l'image et vérifier : triangle de trois traits noirs, intérieur jaune, fond bleu.

- [ ] **Étape 4 : vérification complète et tailles**

Lancer la commande bornée de la tâche. Attendu : « C8 pot zones : OK », « verifier.sh : e2e OK », « verifier.sh : OK », `module Wasm : N octets`, `module formats : M octets`. Ajouter à la section C8 de `docs/essais/taille-wasm.md` la ligne :
```markdown
| après C8 (`scripts/verifier.sh --e2e`, asset émis par vite) | N o | M o |
```

- [ ] **Étape 5 : commit**

```bash
cd ~/projets/roomboard-wt/usage-c8-pot-zones--T7 && git add scripts/essais/c8-pot-zones-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh docs/essais/c8-pot-zones.png docs/essais/taille-wasm.md && git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(e2e): C8 closed-zone paint bucket browser trial with S6 time gate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Relecture du plan (writing-plans, contrôles 1 à 4)

- **Couverture du cadrage** : Q1 (T6, ordre inchangé) · Q2 (T6 garde `inside` d'une forme ; T1 `shape_ring`) · Q3, Q4, Q5 (T1, mesure étape 13) · Q6, Q9, Q20 (T1) · Q7 (T6 `ZONE_CLOSE_TOL_PX`) · Q8 (T1 `zone_walls`) · Q10 (T1) · Q11, Q12, Q13 (T2, T3) · Q14 (T1, T3, T6) · Q15 (T4) · Q16 (T6, file inchangée) · Q17 (T3) · Q18 (T5, T6, T7) · Q19 (T1 étape 14). Scénarios : S1 (T1, T4, T6, T7), S2 (T1, T3, T6, T7), S3 (T2, T3, T7), S4 (T1 `image_box_closes_zone`), S5 (T2, T6, T7), S6 (T1 témoin, T5, T7 porte).
- **Carte d'impact** : chaque entrée « touché : oui » est dans les fichiers d'une tâche ; `crates/roomboard-core/src/fill_element.rs` est un fichier neuf ajouté au découpage (schéma du `fill`, partagé par T1 et T2). Effets de bord : 1 → T1 `zone_on_empty_page_is_background_one_step`, T6 « C8 : rien sous le pointeur », `c6a-pot-navigateur.mjs` vert en T7 ; 2 → T2 `fill_is_hit_inside_far_from_edges_only` ; 3 → T1 étape 13, T7 ; 4 → T7 porte S6, T1 témoin ; 5 → T7 S6 (`data-zone-cells`, aucune erreur de page).
- **Noms cohérents** : `FillTarget::Zone { x, y, tol }` ↔ `{ kind: "zone", x, y, tol }` ; `fill_zone` ↔ `fillZone` absent (la liaison appelle `fill_zone`) ; `zone_cells(page, tol)` ↔ `zoneCells(page, tol)` ; `fill_rings` ↔ `fillRings` ; `FILL_KIND` = `"fill"` partout ; `data-zones`, `data-zone-ms`, `data-zone-cells` ↔ `dataset.zones`, `zoneMs`, `zoneCells`.
