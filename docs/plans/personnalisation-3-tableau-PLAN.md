# personnalisation-3-tableau — plan du lot A (objets dans les cases)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**But** : une photo glissée sur une case du tableau s'y loge et la case s'agrandit ; l'objet suit sa case quand le tableau
change ; il en sort au glisser ; puis, si le temps reste, réduction de la case quittée, mode « rétrécir », tracé lié, fond
de case.

**Architecture** : lien `cell = [tableId, rowId, colId]` sur l'élément (DA1) ; la page calcule tailles et matrice
(`engine/tools/cell-drop.ts`), le cœur écrit en une transaction et fait suivre les objets liés (DA2) ; la Sélection
n'est touchée qu'en 4 points (DA3) ; tout calcul en TS, le cœur en écrivain (DA4).

**Pile** : Rust (`yrs`) + `wasm-bindgen`, TypeScript (vitest), Playwright (essai navigateur).

**Spec** : `docs/plans/personnalisation-3-tableau-cadrage.md` (commit 745275c1).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur : lien `cell`, `PlaceInCell`, `SetTableLineSizes`, suivi, emport par `Transform`, exports Wasm | — | crates/roomboard-core/src/{element.rs,document.rs,table.rs,table_links.rs,commands.rs,copy.rs,lib.rs}, crates/roomboard-wasm/src/lib.rs | partagé | concepteur-critique | `cargo test -p roomboard-core table_links` ≥ 9 tests dont `place_in_cell_grows_and_links` ; `cargo test -p roomboard-wasm place_in_cell` ≥ 1 ; module principal ≤ 1 540 000 o | S1, S16, S17, S18 | #tache-t1 |
| T2 | Contrat TS : `api.ts`, `wasm-core.ts`, faux cœur à parité, contrat, CLI | T1 | apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts}, scripts/essais/cli-essai.mjs | partagé | concepteur-critique | vitest `wasm-core.contract.test.ts -t "personnalisation-3"` ≥ 14 tests (7 × 2 fabriques) ; `ops.test.ts` 38 commandes ; `cli-essai.mjs` affiche `CLI : OK` et `S16` | S16, S17, S18 | #tache-t2 |
| T3 | Glisser vers une case : `cell-drop.ts`, `requiredSizes`, `tableAt`, Sélection (4 points), cadre de case visée | T2 | apps/web/src/engine/{table-geom.ts,table-geom.test.ts,groups.ts}, apps/web/src/engine/tools/{cell-drop.ts,cell-drop.test.ts,select.ts,select.test.ts}, apps/web/src/engine/render/{overlay.ts,canvas2d.ts}, apps/web/src/app/board-session.ts | partagé | implementeur-tdd | vitest `cell-drop.test.ts` ≥ 8 tests dont `S1 : image 400 × 300 sur la case (1, 1)` ; `table-geom.test.ts`, `select.test.ts`, `table.test.ts` verts | S1, S4, S18 | #tache-t3 |
| T4 | Essai navigateur du lot A (noyau) + `verifier.sh --e2e` + captures 2x | T3 | scripts/essais/personnalisation-3-tableau-navigateur.mjs, scripts/verifier.sh, docs/design/captures/personnalisation-3-tableau/photo-case-agrandie.png | partagé | implementeur-tdd | `node scripts/essais/personnalisation-3-tableau-navigateur.mjs` affiche `personnalisation-3 tableau : OK` ; `bash scripts/tests/verifier-e2e.test.sh` vert | S1, S4 | #tache-t4 |
| T5 | Compléments du socle : montée dans la pile, renumérotation à la copie, gomme qui garde `cell` | T2 | crates/roomboard-core/src/{table_links.rs,copy.rs,commands.rs}, apps/web/src/core/{fake-core.ts,wasm-core.contract.test.ts} | partagé | concepteur-critique | `cargo test -p roomboard-core duplicate_page_keeps_cell_links` 1 test ; `object_below_its_table_is_relinked`, `partial_erase_keeps_cell`, `place_in_cell_lifts_object_above_table` ; contrat `-t "personnalisation-3 copie"` ≥ 2 | S18 | #tache-t5 |
| T6 | Sortie qui réduit la case quittée (D11) + raccourcis Alt+Entrée / Alt+Maj+Entrée | T4 | apps/web/src/engine/tools/{cell-drop.ts,cell-drop.test.ts,tool.ts,select.ts}, apps/web/src/engine/input/{keys.ts,keys.test.ts}, apps/web/src/engine/engine.ts, apps/web/src/ui/shortcuts.ts, scripts/essais/personnalisation-3-tableau-navigateur.mjs | partagé | implementeur-tdd | vitest `cell-drop.test.ts -t "D11"` ≥ 3 ; `keys.test.ts -t "cellKey"` ≥ 1 ; essai : `S4 : la colonne revient à 240` | S1, S4 | #tache-t6 |
| T7 | Point 2 : mode « rétrécir » (`SetTableOptions`, `fit`, Alt+F) | T6 | crates/roomboard-core/src/{table.rs,table_links.rs,commands.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts}, apps/web/src/engine/{table-geom.ts,input/keys.ts,engine.ts}, apps/web/src/engine/tools/{cell-drop.ts,cell-drop.test.ts,table.ts}, apps/web/src/ui/shortcuts.ts, scripts/essais/personnalisation-3-tableau-navigateur.mjs, docs/design/captures/personnalisation-3-tableau/objet-ajuste.png | partagé | implementeur-tdd | `cargo test -p roomboard-core set_table_options` ≥ 1 ; vitest `cell-drop.test.ts -t "S2"` ≥ 1 ; essai `S2 : image réduite à 64 × 48` ; module ≤ 1 540 000 o | S2 | #tache-t7 |
| T8 | Point 3 : tracé au stylo lié à sa case (`CommitStroke.cell`) | T4 | crates/roomboard-core/src/commands.rs, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/web/src/engine/{table-geom.ts,table-geom.test.ts}, apps/web/src/engine/tools/{pen.ts,pen.test.ts}, scripts/essais/personnalisation-3-tableau-navigateur.mjs, docs/design/captures/personnalisation-3-tableau/trace-dans-case.png | partagé | implementeur-tdd | `cargo test -p roomboard-core commit_stroke_with_cell` ≥ 1 ; vitest `pen.test.ts -t "D10"` ≥ 2 ; essai `S3 : le mot descend de 64` ; module ≤ 1 540 000 o | S3 | #tache-t8 |
| T9 | Point 5 : image de fond de case (`bg`, `SetCellImage`, appui long, Alt+I) | T6 | crates/roomboard-core/src/{table.rs,table_links.rs,commands.rs}, crates/roomboard-wasm/src/lib.rs, apps/web/src/core/{api.ts,wasm-core.ts,fake-core.ts,wasm-core.contract.test.ts}, apps/cli/src/{ops.ts,ops.test.ts}, apps/web/src/engine/table-geom.ts, apps/web/src/engine/render/table-paint.ts, apps/web/src/engine/tools/{table.ts,table.test.ts}, apps/web/src/engine/input/keys.ts, apps/web/src/engine/engine.ts, apps/web/src/ui/{cell-menu.ts,cell-menu.test.ts,shortcuts.ts}, apps/web/src/app/board-session.ts, scripts/essais/personnalisation-3-tableau-navigateur.mjs | partagé | implementeur-tdd | `cargo test -p roomboard-core set_cell_image` ≥ 2 ; vitest `table.test.ts -t "S5"` ≥ 2 ; essai `S5 : l'image devient le fond` ; module ≤ 1 540 000 o | S5 | #tache-t9 |

Ordre d'exécution : T1 → T2 → T3 → T4 (noyau indispensable, démo possible) → T5 → T6 → T7 → T8 → T9. Couper par la fin :
T9, puis T8, puis T7, puis T6, puis T5 ; chaque tâche coupée devient une hypothèse « à revoir » de l'état (cadrage § 1,
« Découpage minimal »).

## Carte des fichiers

| fichier | rôle | tâches |
|---|---|---|
| `crates/roomboard-core/src/element.rs` | `read_cell_link`, `cell_link_to_any`, `ElementView.cell` | T1 |
| `crates/roomboard-core/src/document.rs` | la vue d'un élément publie `cell` (jamais sur un tableau, D36) | T1 |
| `crates/roomboard-core/src/table_links.rs` (nouveau) | `LineSize`, `Offsets`, `offsets`, `write_line_sizes`, `line_sizes_ok`, `follow_in`, `table_done_with`, `cmd_place_in_cell`, `cmd_set_table_line_sizes`, `with_linked`, `leaving_cells`, `cell_rect`, tests | T1, T5, T7, T9 |
| `crates/roomboard-core/src/table.rs` | `table_of`, `ranks` en `pub(crate)` ; suivi dans `InsertTableLine`, `RemoveTableLine`, `SetTableSizes`, `SetTableCell` ; `fit` (T7), `bg` (T9) | T1, T7, T9 |
| `crates/roomboard-core/src/commands.rs` | variantes `PlaceInCell`, `SetTableLineSizes` (T1), `SetTableOptions` (T7), `SetCellImage` (T9) ; `cmd_transform` (D6) ; `CommitStroke.cell` (T8) ; gomme (T5) | T1, T5, T7, T8, T9 |
| `crates/roomboard-core/src/copy.rs` | `cell` retiré à la copie (T1), puis renuméroté (T5) | T1, T5 |
| `crates/roomboard-wasm/src/lib.rs` | exports et `_inner` | T1, T7, T8, T9 |
| `apps/web/src/core/api.ts` | `CellLink`, `LineSize`, commandes neuves, `ElementBase.cell` | T2, T7, T8, T9 |
| `apps/web/src/core/wasm-core.ts` | `case` des commandes neuves, `toElementView` lit `cell` | T2, T7, T8, T9 |
| `apps/web/src/core/fake-core.ts` | parité : `offsetsOf`, `followCells`, `writeTable`, `Transform`, `PlaceInCell`, `SetTableLineSizes` | T2, T5, T7, T8, T9 |
| `apps/web/src/engine/tools/cell-drop.ts` (nouveau) | `createCellDrop` : `expand`, `target`, `drop`, `place` | T3, T6, T7 |
| `apps/web/src/engine/table-geom.ts` | `tableAt` par `elementIdsOfKind`, `LinkedBox`, `requiredSizes`, `cellContaining` (T8) | T3, T7, T8, T9 |
| `apps/web/src/engine/tools/select.ts` | 4 points d'appel (DA3), `placeInCell` (T6) | T3, T6 |
| `apps/web/src/engine/render/overlay.ts`, `canvas2d.ts` | `EditOverlay.target`, cadre 2 px | T3 |
| `scripts/essais/personnalisation-3-tableau-navigateur.mjs` (nouveau) | essai du lot A, un bloc par tâche | T4, T6, T7, T8, T9 |

## Global Constraints

- G1 TDD : test rouge d'abord, vu rouge, puis le code, puis vert.
- G2 Exécution séquentielle dans le worktree partagé `/home/adminjd/projets/roomboard-wt/personnalisation-3-tableau` ; aucun worktree par tâche.
- G3 Builds et tests : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; `nice -n 10` ; `cargo … -j 4`. Suite complète : `node ~/.claude/scripts/vm/suite-vm.cjs -- <commande>`. Preuves bornées : `… 2>&1 | tail -20`, avec N ≥ 1 test exécuté et le nom attendu présent.
- G4 Module Wasm principal : plafond 1 572 864 o, aujourd'hui 1 429 754 o ; seuil d'arrêt 1 540 000 o (DA4) : au-delà, la tâche s'arrête et le rapporte. Module formats inchangé (2 794 527 o). Toute tâche qui touche le cœur Rust mesure le module avant de finir (commande M ci-dessous).
- G5 Fichier (U3) : champs facultatifs ; `schema` et `formatVersion` inchangés ; valeur illisible = ignorée, gardée.
- G6 CLI (D15 du profil) : toute commande neuve entre dans `COMMAND_TYPES`, `ops.test.ts` et `scripts/essais/cli-essai.mjs` ; `FORMAT_LOTS` inchangé (aucun format neuf).
- G7 Outil Sélection : point d'entrée court seulement (DA3), logique dans `engine/tools/cell-drop.ts`.
- G8 Tactile d'abord : événements de pointeur du moteur, cibles ≥ 44 px, appui long 500 ms ; jamais de glisser HTML5 ; chaque geste a un raccourci.
- G9 Comportement hors tableau inchangé ; essais `data-item` existants verts sans réécriture.
- G10 Interdits : pas de `git add -A` ni `git add .`, pas de `commit -a`, pas de `--force`, aucun test désactivé ou sauté, aucun seuil touché, aucun `tauri build`.
- G11 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `git add` fichier par fichier.
- G12 Une étape d'annulation par geste : une commande du cœur = une transaction ; aucun `runAll` (D23).

**Commande M (taille du module principal)** :

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH \
 && nice -n 10 cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release -j 4 2>&1 | tail -3 \
 && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm \
 && wc -c apps/web/src/wasm/roomboard_wasm_bg.wasm
```

Attendu : un nombre ≤ 1 540 000. Ce `.wasm` est aussi celui que lit `wasm-core.contract.test.ts` (vrai module).

## Review Focus

1. **Objet logé puis tableau modifié par la CLI** (cadrage D5, S16) : insérer, retirer une ligne, uniformiser — l'objet suit ou se libère, jamais à une place absurde → tests `insert_line_moves_linked_object`, `remove_line_unlinks_object`, `set_table_sizes_and_cell_follow` (T1) et contrat `personnalisation-3 suivi` (T2).
2. **Parité faux cœur / vrai cœur sur les commandes existantes qui changent** (cadrage carte d'impact, `fake-core.ts`) : `Transform` d'un tableau, `SetTableCell` qui grandit, `RemoveTableLine` → contrat `personnalisation-3 emport` et `personnalisation-3 suivi` joués par les deux fabriques (T2).
3. **Lâcher sur une case ombrée, sur un tableau sélectionné, avec Alt** (D7, D35, effet de bord « Alt : Transform seul ») → `cell-drop.test.ts` « case ombrée : déplacement libre », « sélection avec tableau : null », « Alt : Transform seul » (T3).
4. **Copier ou dupliquer une page avec objets logés** (effet de bord `duplicate_page_keeps_cell_links`) : sans T5, la copie doit être libre, jamais liée au tableau d'origine → `copy_drops_cell_link` (T1) puis `duplicate_page_keeps_cell_links` (T5).
5. **Ancien fichier ou valeur `cell` illisible** (U3, S17) → `cell_link_unreadable_is_free_and_kept`, `cell_reload_keeps_bytes` (T1).

---

### Tâche T1 — Cœur : lien `cell`, `PlaceInCell`, `SetTableLineSizes`, suivi, emport par `Transform`, exports Wasm

<a id="tache-t1"></a>

**Objectif** : le cœur lit et écrit le lien `cell`, loge un objet dans une case en une étape (tailles, matrice, lien),
fait suivre les objets liés quand une ligne ou une colonne bouge, fait emporter ses objets à un tableau transformé,
libère un objet sorti de sa case par `Transform`, et expose les deux commandes neuves au Wasm.

**Fichiers**
- Créer : `crates/roomboard-core/src/table_links.rs`
- Modifier : `crates/roomboard-core/src/lib.rs` (`pub mod table_links;` après `pub mod table;`)
- Modifier : `crates/roomboard-core/src/element.rs:193-218` (`ElementView.cell`, `bare`), `:306-330` (à côté de `read_group`)
- Modifier : `crates/roomboard-core/src/document.rs:375`, `:497` (vue : `cell` à côté de `group`)
- Modifier : `crates/roomboard-core/src/table.rs:1-8` (commentaire de schéma), `:609` (`table_of` → `pub(crate)`), `:568` (`ranks` → `pub(crate)`), `cmd_set_table_cell`, `cmd_insert_table_line`, `cmd_remove_table_line`, `cmd_set_table_sizes` (suivi)
- Modifier : `crates/roomboard-core/src/commands.rs:140-240` (variantes), `:718` (`apply`), `:700` (`find_unique` → `pub(crate)`), `:1043` (`cmd_transform`)
- Modifier : `crates/roomboard-core/src/copy.rs:61-90` (`copy_elements` retire `cell`)
- Modifier : `crates/roomboard-wasm/src/lib.rs` (exports après `set_table_shade`, `_inner` après `set_table_shade_inner`, test après `c10b_table_commands_inner`)

**Interfaces**
- Consomme : `table::read_raw(txn, e) -> Option<RawTable>`, `table::read_cell(txn, cells, row, col) -> Option<RawCell>`, `table::merges_of(raw, txn) -> Vec<Merge>`, `element::compose`, `element::invert`, `element::apply_transform`, `Document::element_bounds(txn, e) -> Option<Bounds>` (`query.rs:317`), `Document::page_elements(txn, page)`, `Document::find_element(txn, id)`.
- Produit (Rust) :
  - `pub(crate) fn read_cell_link<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<[String; 3]>` et `pub(crate) fn cell_link_to_any(link: &[String; 3]) -> Any` (`element.rs`)
  - `ElementView.cell: Option<[String; 3]>` (sérialisé `cell`, omis si absent)
  - `pub struct LineSize { pub table: String, pub axis: TableAxis, pub line: String, pub size: f64 }` (`table_links.rs`)
  - `Command::PlaceInCell { ids: Vec<String>, matrix: Transform, cell: Option<[String; 3]>, sizes: Vec<LineSize> }`
  - `Command::SetTableLineSizes { id: String, cols: Vec<(String, f64)>, rows: Vec<(String, f64)> }`
  - `Document::follow_in(&self, txn: &mut TransactionMut, page: &str, table: &MapRef, table_id: &str, before: &Offsets, skip: &HashSet<String>) -> Vec<String>`
  - `Document::table_done_with(&mut self, page: String, id: &str, moved: Vec<String>) -> Change` : `ids` = `[id, moved…]` (ordre de la pile)
  - `Change.ids` de `PlaceInCell` = ids triés et dédoublonnés de (objets placés, tableaux des `sizes`, objets suivis) ; de `Transform` = ids triés des cibles élargies.
- Produit (Wasm) :
  - `place_in_cell(ids: Vec<String>, matrix: &[f64], table: Option<String>, row: Option<String>, col: Option<String>, size_keys: Vec<String>, size_values: &[f64]) -> Result<JsValue, JsError>` ; `size_keys` = triplets `(tableau, "row" | "col", ligne)` bout à bout.
  - `set_table_line_sizes(id: &str, col_ids: Vec<String>, col_widths: &[f64], row_ids: Vec<String>, row_heights: &[f64]) -> Result<JsValue, JsError>`
- Réutilise : `crates/roomboard-core/src/element.rs:308` `read_group`, `:322` `group_to_any` — `read_cell_link(txn, e) -> Option<[String; 3]>`, `cell_link_to_any(&[String; 3]) -> Any` posés à côté (étendre).
- Réutilise : `crates/roomboard-core/src/table.rs:74` `Line.map` — `write_line_sizes(txn, raw, sizes: &[(TableAxis, String, f64)])` partagé par `SetTableLineSizes` et `PlaceInCell` (étendre).
- Réutilise : `crates/roomboard-core/src/commands.rs:1043` `cmd_transform` — cibles élargies aux objets liés (étendre).
- Réutilise : `crates/roomboard-core/src/copy.rs:61` `copy_elements` — `cell` retiré de la recopie (étendre ; renumérotation complète en T5).
- Le rapport de la tâche porte une ligne par module : `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>`.

**Ordre des refus de `PlaceInCell`** (le faux cœur de T2 suit le même) : 1. matrice invalide → `BadMatrix` ; 2. un id
trouvé est un tableau → `BadTable` ; 3. aucun id trouvé → aucune étape ; 4. ids sur plusieurs pages → `BadTable` ;
5. case visée : tableau inconnu → `UnknownElement`, autre page → `BadTable`, ligne ou colonne inconnue → `BadTable`, case
à `shade` → `BadTable` (D35) ; 6. pour chaque tableau de `sizes` (ordre d'apparition) : inconnu → `UnknownElement`,
autre page → `BadTable`, ligne inconnue, taille non finie > 0 ou total hors f32 → `BadTable` ; 7. une matrice composée
invalide → `BadMatrix` ; 8. matrice identité, tailles égales et liens égaux → aucune étape.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core table_links -j 4 2>&1 | tail -20
```

Attendu : `test result: ok. N passed` avec N ≥ 9, noms `place_in_cell_grows_and_links`, `transform_out_of_cell_unlinks` présents. Puis
`nice -n 10 cargo test -p roomboard-core -j 4 2>&1 | tail -5` (tests à garder verts : `table.rs` `:1757-3071`, C10a, C10b,
`group_reload_keeps_bytes`) et `nice -n 10 cargo test -p roomboard-wasm place_in_cell -j 4 2>&1 | tail -5` (≥ 1 test).
Puis la commande M : ≤ 1 540 000 o.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 `nice -n 10`, `-j 4`, PATH, preuves bornées ; G4 module
≤ 1 540 000 o, mesuré par la commande M avant de finir, formats inchangé ; G5 champs facultatifs, illisible = ignoré et
gardé ; G9 hors tableau inchangé ; G10 interdits ; G11 commits ; G12 une transaction par commande.

**Interdits** : aucun calcul de taille dans le cœur (la page donne les tailles, D2) ; ne pas toucher `cmd_restack`,
`history.rs`, `query.rs` ; ne pas réécrire les tests C10a/C10b ; ne pas toucher `crates/roomboard-formats`.

**Patron à ne pas reprendre** : suivre les objets liés par une **seconde** transaction après la commande du tableau (deux
étapes d'annulation : Ctrl+Z ramènerait l'objet sans la ligne) ; et lire les ids de ligne par rang : le lien vise des ids,
une ligne insérée avant ne doit pas changer de case. Référence : une transaction par geste,
`crates/roomboard-core/src/history.rs:1-4` ; écriture en un bloc `transact_local`, `crates/roomboard-core/src/table.rs:791-850`.

**Terminé quand** : les tests `table_links` passent (≥ 9), `cargo test -p roomboard-core` et `-p roomboard-wasm` sont
verts, `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -j 4 -- -D warnings` est propre, `cargo fmt --all
--check` passe, la taille du module est rapportée, un commit.

#### Étapes

- [ ] **1. Test rouge du lien et des commandes** — créer `crates/roomboard-core/src/table_links.rs` avec seulement le module de tests ci-dessous (et `pub mod table_links;` dans `lib.rs`) :

```rust
#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use yrs::{Any, Map, MapPrelim, In};

    use super::*;
    use crate::commands::Command;
    use crate::document::Document;
    use crate::element::{Look, StrokeStyle, IDENTITY};
    use crate::shape::ShapeKind;
    use crate::table::TableAxis;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn rect(d: &mut Document, p: &str, x0: f64, y0: f64, x1: f64, y1: f64) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: StrokeStyle { color: "#000000".into(), width: 4.0 },
            fill: None,
            look: Look::default(),
        })
        .expect("forme")
        .ids[0]
            .clone()
    }
    fn table3(d: &mut Document, p: &str) -> String {
        d.apply(Command::AddTable {
            page: p.into(),
            x: 0.0,
            y: 0.0,
            cols: 3,
            rows: 3,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }
    fn view(d: &Document, id: &str) -> crate::table::TableView {
        d.element(id).and_then(|v| v.table).expect("vue")
    }
    fn link(d: &Document, t: &str, r: usize, c: usize) -> [String; 3] {
        let v = view(d, t);
        [t.to_string(), v.rows[r].id.clone(), v.cols[c].id.clone()]
    }
    fn tx(d: &Document, id: &str) -> [f64; 6] {
        d.element(id).expect("élément").transform
    }
    /// Loge `obj` en (1, 1) d'un 3 × 3 : colonne 1 à 416, ligne 1 à 316, objet posé à (248, 72).
    fn place11(d: &mut Document, t: &str, obj: &str) -> crate::commands::Change {
        let v = view(d, t);
        let at = tx(d, obj);
        d.apply(Command::PlaceInCell {
            ids: vec![obj.to_string()],
            matrix: [1.0, 0.0, 0.0, 1.0, 248.0 - at[4], 72.0 - at[5]],
            cell: Some(link(d, t, 1, 1)),
            sizes: vec![
                LineSize { table: t.into(), axis: TableAxis::Col, line: v.cols[1].id.clone(), size: 416.0 },
                LineSize { table: t.into(), axis: TableAxis::Row, line: v.rows[1].id.clone(), size: 316.0 },
            ],
        })
        .expect("logé")
    }

    // S1 (cœur) : tailles, matrice et lien en une étape ; Ctrl+Z ramène tout.
    #[test]
    fn place_in_cell_grows_and_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1400.0, 1300.0);
        let before = tx(&d, &o);
        place11(&mut d, &t, &o);
        let v = view(&d, &t);
        assert_eq!(v.cols.iter().map(|c| c.width).collect::<Vec<_>>(), vec![240.0, 416.0, 240.0]);
        assert_eq!(v.rows.iter().map(|r| r.height).collect::<Vec<_>>(), vec![64.0, 316.0, 64.0]);
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 1, 1)));
        assert_eq!((tx(&d, &o)[4], tx(&d, &o)[5]), (248.0, 72.0));
        assert!(d.undo());
        assert_eq!(view(&d, &t).cols[1].width, 240.0);
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert_eq!(tx(&d, &o), before);
    }

    // S18, D35, D36 : refus sans écriture.
    #[test]
    fn place_in_cell_refuses_table_and_closed_shade() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let t2 = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let v0 = d.version();
        let table_in = d.apply(Command::PlaceInCell { ids: vec![t2.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 0, 0)), sizes: vec![] });
        assert_eq!(table_in, Err(CommandError::BadTable));
        let l = link(&d, &t, 0, 0);
        d.apply(Command::SetTableShade { id: t.clone(), from: (l[1].clone(), l[2].clone()), to: (l[1].clone(), l[2].clone()), shade: Some("#94a3b8".into()) })
            .expect("ombre");
        let v1 = d.version();
        let shaded = d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(l), sizes: vec![] });
        assert_eq!(shaded, Err(CommandError::BadTable));
        assert_eq!(d.version(), v1);
        assert!(v1 > v0);
    }

    // S16, D5 : une ligne insérée en tête fait descendre l'objet de 64.
    #[test]
    fn insert_line_moves_linked_object() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let y = tx(&d, &o)[5];
        let c = d.apply(Command::InsertTableLine { id: t.clone(), axis: TableAxis::Row, at: 0 }).expect("ligne");
        assert_eq!(tx(&d, &o)[5], y + 64.0);
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert!(d.undo());
        assert_eq!(tx(&d, &o)[5], y);
    }

    // H22 : ligne retirée, lien retiré, objet laissé en place.
    #[test]
    fn remove_line_unlinks_object() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let at = tx(&d, &o);
        let row = view(&d, &t).rows[1].id.clone();
        d.apply(Command::RemoveTableLine { id: t.clone(), axis: TableAxis::Row, line: row, to: None }).expect("retrait");
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert_eq!(tx(&d, &o), at);
    }

    // D5 : Uniformiser et une cellule qui grandit déplacent les objets des lignes et colonnes suivantes.
    #[test]
    fn set_table_sizes_and_cell_follow() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        let v = view(&d, &t);
        d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 2, 2)), sizes: vec![] }).expect("logé");
        let at = tx(&d, &o);
        d.apply(Command::SetTableSizes { id: t.clone(), col_width: 300.0, row_height: 80.0 }).expect("uniforme");
        assert_eq!((tx(&d, &o)[4], tx(&d, &o)[5]), (at[4] + 120.0, at[5] + 32.0));
        d.apply(Command::SetTableCell { id: t.clone(), row: v.rows[0].id.clone(), col: v.cols[0].id.clone(), content: "haut".into(), row_height: Some(180.0), spans: None })
            .expect("cellule");
        assert_eq!(tx(&d, &o)[5], at[5] + 32.0 + 100.0);
    }

    // D4 : tailles ligne par ligne, suivi, une étape ; id inconnu refusé ; mêmes tailles : aucune étape.
    #[test]
    fn set_table_line_sizes_writes_and_follows() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 1, 1)), sizes: vec![] }).expect("logé");
        let v = view(&d, &t);
        let at = tx(&d, &o);
        let c = d.apply(Command::SetTableLineSizes { id: t.clone(), cols: vec![(v.cols[0].id.clone(), 340.0)], rows: vec![] }).expect("tailles");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(tx(&d, &o)[4], at[4] + 100.0);
        assert_eq!(d.apply(Command::SetTableLineSizes { id: t.clone(), cols: vec![("zz".into(), 10.0)], rows: vec![] }), Err(CommandError::BadTable));
        let ver = d.version();
        d.apply(Command::SetTableLineSizes { id: t.clone(), cols: vec![(v.cols[0].id.clone(), 340.0)], rows: vec![] }).expect("même");
        assert_eq!(d.version(), ver);
    }

    // D6 : un tableau déplacé emporte ses objets liés ; sans lien, la Transform est celle d'aujourd'hui.
    #[test]
    fn transform_table_carries_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 0, 0)), sizes: vec![] }).expect("logé");
        let at = tx(&d, &o);
        let c = d.apply(Command::Transform { ids: vec![t.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 50.0, 20.0] }).expect("déplacé");
        assert_eq!((tx(&d, &o)[4], tx(&d, &o)[5]), (at[4] + 50.0, at[5] + 20.0));
        let mut want = vec![t.clone(), o.clone()];
        want.sort();
        assert_eq!(c.ids, want);
    }

    #[test]
    fn transform_table_without_links_unchanged() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        let at = tx(&d, &o);
        let c = d.apply(Command::Transform { ids: vec![t.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 50.0, 20.0] }).expect("déplacé");
        assert_eq!(c.ids, vec![t.clone()]);
        assert_eq!(tx(&d, &o), at);
    }

    // D6, H24 : objet lié déplacé seul : lien gardé si son centre reste dans sa case, retiré sinon.
    #[test]
    fn transform_out_of_cell_unlinks() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 10.0, 10.0, 50.0, 40.0);
        d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 0, 0)), sizes: vec![] }).expect("logé");
        d.apply(Command::Transform { ids: vec![o.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 0.0] }).expect("dedans");
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 0, 0)));
        d.apply(Command::Transform { ids: vec![o.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 500.0] }).expect("dehors");
        assert_eq!(d.element(&o).expect("o").cell, None);
    }

    // S17, U3 : `cell` illisible = objet libre, valeur gardée ; `cell` sur un tableau ignoré (D36).
    #[test]
    fn cell_link_unreadable_is_free_and_kept() {
        let bad = MapPrelim::from([
            ("id", In::from("s1")),
            ("kind", In::from("shape")),
            ("transform", In::Any(crate::element::transform_to_any(&IDENTITY))),
            ("shape", In::from("rect")),
            ("w", In::from(10.0)),
            ("h", In::from(10.0)),
            ("color", In::from("#000000")),
            ("width", In::from(4.0)),
            ("cell", In::Any(Any::Array(vec![Any::from("t"), Any::from(2.0)].into()))),
        ]);
        let d = crate::table::tests::doc_with(bad);
        assert_eq!(d.element("s1").map(|v| v.cell), Some(None));
        let txn = d.read();
        let f = d.find_element(&txn, "s1").expect("s1");
        assert!(matches!(f.element.get(&txn, "cell"), Some(yrs::Out::Any(Any::Array(_)))));
    }

    #[test]
    fn cell_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-27T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let once = save(&d, &meta).expect("save");
        let file = save(&load(&once).expect("load 1"), &meta).expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(load(&file).expect("load").element(&o).expect("o").cell, Some(link(&d, &t, 1, 1)));
    }

    // Sans T5 : une copie n'est jamais liée au tableau d'origine.
    #[test]
    fn copy_drops_cell_link() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let c = d.apply(Command::DuplicatePage { page: p.clone() }).expect("dup");
        let p2 = c.pages.iter().find(|x| **x != p).cloned().expect("page 2");
        let linked: HashSet<_> = d.element_ids(&p2).iter().filter_map(|id| d.element(id).and_then(|v| v.cell)).collect();
        assert!(linked.iter().all(|l| l[0] != t));
    }
}
```

Si `crate::table::tests::doc_with` construit un élément `shape` autrement (noms de champs), reprendre les champs d'un
`shape` lus par `read_shape` (`element.rs`) ; le test vise seulement `cell`. Si `DuplicatePage` ne rend pas la page
neuve dans `pages`, la prendre par `d.page_ids()[1]`.

- [ ] **2. Le voir rouge** — `nice -n 10 cargo test -p roomboard-core table_links -j 4 2>&1 | tail -20` : erreurs de compilation `LineSize`, `PlaceInCell`, `cell` introuvables.

- [ ] **3. Lien dans `element.rs` et la vue** — à côté de `read_group` :

```rust
/// Lien de case (personnalisation-3, D1) : `[tableId, rowId, colId]`, trois chaînes non vides. Absent ou mal formé =
/// objet libre ; la valeur reste telle quelle dans le document (U3).
pub(crate) fn read_cell_link<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<[String; 3]> {
    let Some(Out::Any(Any::Array(items))) = e.get(txn, "cell") else {
        return None;
    };
    if items.len() != 3 {
        return None;
    }
    let mut out: [String; 3] = Default::default();
    for (slot, a) in out.iter_mut().zip(items.iter()) {
        match a {
            Any::String(s) if !s.is_empty() => *slot = s.to_string(),
            _ => return None,
        }
    }
    Some(out)
}

/// Valeur écrite du champ `cell` : `Any::Array` de trois chaînes, remplacé en bloc (U3, jamais `Any::Map`).
pub(crate) fn cell_link_to_any(link: &[String; 3]) -> Any {
    Any::Array(link.iter().map(|s| Any::String(s.as_str().into())).collect())
}
```

Dans `ElementView`, après `group` :

```rust
    /// Case qui loge l'objet (personnalisation-3, D1) : `[tableId, rowId, colId]` ; absent sans lien lisible, et sur un tableau (D36).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cell: Option<[String; 3]>,
```

`bare` : `cell: None,`. Dans `document.rs::element` (`:375`) : `let cell = read_cell_link(&txn, e);` et à la fin
(`:497`) : `view.map(|v| { let cell = if v.kind == crate::table::TABLE_KIND { None } else { cell }; ElementView { group, cell, ..v } })`.

- [ ] **4. Corps de `table_links.rs`** — au-dessus du module de tests :

```rust
//! Objets logés dans une case (personnalisation-3, DA1, DA2) : lien `cell = [tableId, rowId, colId]` sur l'élément ; la
//! page calcule tailles et matrice, le cœur les écrit (`PlaceInCell`, `SetTableLineSizes`) et fait suivre les objets
//! liés quand une ligne ou une colonne bouge (`follow_in`), dans la transaction de la commande : une étape.
use std::collections::{HashMap, HashSet};

use yrs::{Any, Array, In, Map, MapRef, Out, ReadTxn, TransactionMut};

use crate::commands::{valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{
    apply_transform, cell_link_to_any, compose, finite_positive, fits_f32, invert, out_string,
    out_transform, read_cell_link, transform_to_any, Transform, IDENTITY,
};
use crate::table::{merges_of, read_cell, read_raw, Line, RawTable, TableAxis, TABLE_KIND};

/// Taille d'une ligne ou d'une colonne écrite par `PlaceInCell` (D3).
#[derive(Debug, Clone, PartialEq)]
pub struct LineSize {
    pub table: String,
    pub axis: TableAxis,
    pub line: String,
    pub size: f64,
}

/// Décalage de chaque ligne et colonne lisible depuis le coin du tableau (repère local).
pub(crate) struct Offsets {
    pub cols: HashMap<String, f64>,
    pub rows: HashMap<String, f64>,
}

fn run(lines: &[Line]) -> HashMap<String, f64> {
    let mut acc = 0.0;
    let mut out = HashMap::with_capacity(lines.len());
    for l in lines {
        out.insert(l.id.clone(), acc);
        acc += l.size;
    }
    out
}

pub(crate) fn offsets(raw: &RawTable) -> Offsets {
    Offsets { cols: run(&raw.cols), rows: run(&raw.rows) }
}

fn lines_of(raw: &RawTable, axis: TableAxis) -> (&[Line], &'static str) {
    match axis {
        TableAxis::Row => (&raw.rows, "height"),
        TableAxis::Col => (&raw.cols, "width"),
    }
}

/// Tailles valides : chaque ligne existe, taille finie > 0, total de chaque axe borné en f32 (même garde que T15).
pub(crate) fn line_sizes_ok(raw: &RawTable, sizes: &[(TableAxis, String, f64)]) -> bool {
    let known = sizes.iter().all(|(a, id, s)| finite_positive(*s) && lines_of(raw, *a).0.iter().any(|l| &l.id == id));
    let total = |axis: TableAxis| -> f64 {
        lines_of(raw, axis)
            .0
            .iter()
            .map(|l| sizes.iter().rev().find(|(a, id, _)| *a == axis && *id == l.id).map_or(l.size, |(_, _, s)| *s))
            .sum()
    };
    known && fits_f32(&[total(TableAxis::Row), total(TableAxis::Col)])
}

/// Vrai si chaque taille demandée vaut déjà la taille lue.
pub(crate) fn line_sizes_same(raw: &RawTable, sizes: &[(TableAxis, String, f64)]) -> bool {
    sizes.iter().all(|(a, id, s)| lines_of(raw, *a).0.iter().any(|l| &l.id == id && l.size == *s))
}

/// Écrit les tailles qui changent (contrôlées avant par `line_sizes_ok`).
pub(crate) fn write_line_sizes(txn: &mut TransactionMut, raw: &RawTable, sizes: &[(TableAxis, String, f64)]) {
    for (axis, id, size) in sizes {
        let (lines, key) = lines_of(raw, *axis);
        if let Some(l) = lines.iter().find(|l| &l.id == id && l.size != *size) {
            l.map.insert(txn, key, In::Any(Any::from(*size)));
        }
    }
}

/// Rectangle local `(x0, y0, x1, y1)` de la case `row`, `col` (celui de sa zone si elle en couvre une).
pub(crate) fn cell_rect<T: ReadTxn>(raw: &RawTable, txn: &T, row: &str, col: &str) -> Option<(f64, f64, f64, f64)> {
    let (r, c) = raw.ranks((row, col))?;
    let (r0, c0, r1, c1) = merges_of(raw, txn)
        .into_iter()
        .find(|m| m.r0 <= r && r <= m.r1 && m.c0 <= c && c <= m.c1)
        .map_or((r, c, r, c), |m| (m.r0, m.c0, m.r1, m.c1));
    let at = |lines: &[Line], i: usize| -> f64 { lines[..i].iter().map(|l| l.size).sum() };
    Some((at(&raw.cols, c0), at(&raw.rows, r0), at(&raw.cols, c1 + 1), at(&raw.rows, r1 + 1)))
}

impl Document {
    /// Suivi (D5) dans la transaction ouverte : chaque objet lié au tableau `table_id`, hors `skip`, est translaté du
    /// déplacement du coin de sa case (partie linéaire de la matrice du tableau) ; sa ligne ou sa colonne a disparu :
    /// lien retiré, objet laissé en place (H22). Rend les ids touchés, dans l'ordre de la pile.
    pub(crate) fn follow_in(
        &self,
        txn: &mut TransactionMut,
        page: &str,
        table: &MapRef,
        table_id: &str,
        before: &Offsets,
        skip: &HashSet<String>,
    ) -> Vec<String> {
        let Some(after_raw) = read_raw(&*txn, table) else {
            return Vec::new();
        };
        let after = offsets(&after_raw);
        let [a, b, c, d, _, _] = after_raw.transform;
        let Some(elements) = self.page_elements(&*txn, page) else {
            return Vec::new();
        };
        let linked: Vec<(MapRef, String, [String; 3], Option<Transform>)> = elements
            .iter(&*txn)
            .filter_map(|o| {
                let Out::YMap(m) = o else { return None };
                let link = read_cell_link(&*txn, &m)?;
                let id = out_string(m.get(&*txn, "id"))?;
                let is_table = out_string(m.get(&*txn, "kind")).as_deref() == Some(TABLE_KIND);
                if link[0] != table_id || skip.contains(&id) || is_table {
                    return None;
                }
                let t = out_transform(m.get(&*txn, "transform"));
                Some((m, id, link, t))
            })
            .collect();
        let mut touched = Vec::new();
        for (m, id, link, t) in linked {
            let (Some(c0), Some(r0)) = (before.cols.get(&link[2]), before.rows.get(&link[1])) else {
                continue;
            };
            match (after.cols.get(&link[2]), after.rows.get(&link[1])) {
                (Some(c1), Some(r1)) => {
                    let (dx, dy) = (c1 - c0, r1 - r0);
                    let Some(mut t) = t else { continue };
                    if dx == 0.0 && dy == 0.0 {
                        continue;
                    }
                    t[4] += a * dx + c * dy;
                    t[5] += b * dx + d * dy;
                    m.insert(txn, "transform", transform_to_any(&t));
                    touched.push(id);
                }
                _ => {
                    m.remove(txn, "cell");
                    touched.push(id);
                }
            }
        }
        touched
    }

    /// Changement d'une commande de tableau : le tableau, puis les objets suivis (ordre de la pile).
    pub(crate) fn table_done_with(&mut self, page: String, id: &str, moved: Vec<String>) -> Change {
        let mut ids = vec![id.to_string()];
        ids.extend(moved.into_iter().filter(|m| m != id));
        self.done(Change { pages: vec![page], ids, ..Default::default() })
    }

    /// `SetTableLineSizes` (D4) : tailles par id, objets liés suivis, une étape ; mêmes tailles : aucune étape.
    pub(crate) fn cmd_set_table_line_sizes(
        &mut self,
        id: &str,
        cols: &[(String, f64)],
        rows: &[(String, f64)],
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let sizes: Vec<(TableAxis, String, f64)> = cols
            .iter()
            .map(|(l, s)| (TableAxis::Col, l.clone(), *s))
            .chain(rows.iter().map(|(l, s)| (TableAxis::Row, l.clone(), *s)))
            .collect();
        if !line_sizes_ok(&raw, &sizes) {
            return Err(CommandError::BadTable);
        }
        if line_sizes_same(&raw, &sizes) {
            return Ok(self.unchanged());
        }
        let before = offsets(&raw);
        let moved = {
            let mut txn = self.transact_local();
            write_line_sizes(&mut txn, &raw, &sizes);
            self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())
        };
        Ok(self.table_done_with(page, id, moved))
    }

    /// `PlaceInCell` (D3) : refus dans l'ordre du plan (T1) ; puis une transaction : tailles et suivi des autres objets
    /// liés, matrice composée sur `ids`, `cell` posé ou retiré.
    pub(crate) fn cmd_place_in_cell(
        &mut self,
        ids: &[String],
        m: &Transform,
        cell: Option<&[String; 3]>,
        sizes: &[LineSize],
    ) -> Result<Change, CommandError> {
        if !valid_matrix(m) {
            return Err(CommandError::BadMatrix);
        }
        let (found, same_links) = {
            let txn = self.read();
            let found = self.find_unique(&txn, ids);
            if found.iter().any(|(_, f)| out_string(f.element.get(&txn, "kind")).as_deref() == Some(TABLE_KIND)) {
                return Err(CommandError::BadTable);
            }
            let same = found.iter().all(|(_, f)| read_cell_link(&txn, &f.element).as_ref() == cell);
            (found, same)
        };
        let Some(page) = found.first().map(|(_, f)| f.page_id.clone()) else {
            return Ok(self.unchanged());
        };
        if found.iter().any(|(_, f)| f.page_id != page) {
            return Err(CommandError::BadTable);
        }
        if let Some(l) = cell {
            let (tpage, _, raw) = self.table_of(&l[0])?;
            if tpage != page {
                return Err(CommandError::BadTable);
            }
            raw.ranks((l[1].as_str(), l[2].as_str())).ok_or(CommandError::BadTable)?;
            let shaded = {
                let txn = self.read();
                read_cell(&txn, raw.cells.as_ref(), &l[1], &l[2]).is_some_and(|x| x.shade.is_some())
            };
            if shaded {
                return Err(CommandError::BadTable);
            }
        }
        let mut tables: Vec<(String, MapRef, RawTable, Vec<(TableAxis, String, f64)>)> = Vec::new();
        for s in sizes {
            if !tables.iter().any(|t| t.0 == s.table) {
                let (tpage, e, raw) = self.table_of(&s.table)?;
                if tpage != page {
                    return Err(CommandError::BadTable);
                }
                tables.push((s.table.clone(), e, raw, Vec::new()));
            }
            if let Some(t) = tables.iter_mut().find(|t| t.0 == s.table) {
                t.3.push((s.axis, s.line.clone(), s.size));
            }
        }
        if !tables.iter().all(|(_, _, raw, list)| line_sizes_ok(raw, list)) {
            return Err(CommandError::BadTable);
        }
        let composed: Vec<Transform> = {
            let txn = self.read();
            found
                .iter()
                .map(|(_, f)| out_transform(f.element.get(&txn, "transform")).map_or(*m, |t| compose(m, &t)))
                .collect()
        };
        if !composed.iter().all(valid_matrix) {
            return Err(CommandError::BadMatrix);
        }
        if *m == IDENTITY && same_links && tables.iter().all(|(_, _, raw, list)| line_sizes_same(raw, list)) {
            return Ok(self.unchanged());
        }
        let skip: HashSet<String> = found.iter().map(|(id, _)| id.clone()).collect();
        let mut touched: Vec<String> = skip.iter().cloned().collect();
        {
            let mut txn = self.transact_local();
            for (tid, e, raw, list) in &tables {
                let before = offsets(raw);
                write_line_sizes(&mut txn, raw, list);
                touched.push(tid.clone());
                touched.extend(self.follow_in(&mut txn, &page, e, tid, &before, &skip));
            }
            for ((_, f), c) in found.iter().zip(&composed) {
                if *m != IDENTITY {
                    f.element.insert(&mut txn, "transform", transform_to_any(c));
                }
                match cell {
                    Some(l) => {
                        f.element.insert(&mut txn, "cell", cell_link_to_any(l));
                    }
                    None => {
                        f.element.remove(&mut txn, "cell");
                    }
                }
            }
        }
        touched.sort();
        touched.dedup();
        Ok(self.done(Change { pages: vec![page], ids: touched, ..Default::default() }))
    }

    /// D6 : ajoute aux cibles d'une `Transform` les objets liés aux tableaux qu'elles contiennent.
    pub(crate) fn with_linked<T: ReadTxn>(&self, txn: &T, targets: &mut Vec<(MapRef, Transform, String, String)>) {
        let tables: Vec<(String, String)> = targets
            .iter()
            .filter(|(e, _, _, _)| out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND))
            .map(|(_, _, page, id)| (page.clone(), id.clone()))
            .collect();
        for (page, tid) in tables {
            let Some(elements) = self.page_elements(txn, &page) else { continue };
            for o in elements.iter(txn) {
                let Out::YMap(e) = o else { continue };
                let Some(link) = read_cell_link(txn, &e) else { continue };
                let Some(id) = out_string(e.get(txn, "id")) else { continue };
                let is_table = out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND);
                if link[0] != tid || is_table || targets.iter().any(|t| t.3 == id) {
                    continue;
                }
                let Some(t) = out_transform(e.get(txn, "transform")) else { continue };
                targets.push((e, t, page.clone(), id));
            }
        }
    }

    /// D6 : ids des cibles liées dont le tableau ne bouge pas et dont le centre de la boîte, après `m`, sort de la case.
    pub(crate) fn leaving_cells<T: ReadTxn>(&self, txn: &T, targets: &[(MapRef, Transform, String, String)], m: &Transform) -> HashSet<String> {
        let moving: HashSet<&str> = targets.iter().map(|t| t.3.as_str()).collect();
        let mut out = HashSet::new();
        for (e, _, _, id) in targets {
            let Some(link) = read_cell_link(txn, e) else { continue };
            if moving.contains(link[0].as_str()) {
                continue;
            }
            let Some(b) = self.element_bounds(txn, e) else { continue };
            let (nx, ny) = apply_transform(m, (b.x0 + b.x1) / 2.0, (b.y0 + b.y1) / 2.0);
            let Some(f) = self.find_element(txn, &link[0]) else { continue };
            let Some(raw) = read_raw(txn, &f.element) else { continue };
            let Some(inv) = invert(&raw.transform) else { continue };
            let (lx, ly) = apply_transform(&inv, nx, ny);
            let inside = cell_rect(&raw, txn, &link[1], &link[2])
                .is_some_and(|(x0, y0, x1, y1)| lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1);
            if !inside {
                out.insert(id.clone());
            }
        }
        out
    }
}
```

Si `invert` ou `apply_transform` ont une autre signature dans `element.rs:252-260`, adapter l'appel, pas la règle.

- [ ] **5. `table.rs`** : `fn table_of` et `fn ranks` en `pub(crate)` ; dans `cmd_set_table_cell`, `cmd_insert_table_line`,
`cmd_remove_table_line`, `cmd_set_table_sizes` : `let before = crate::table_links::offsets(&raw);` avant le bloc
d'écriture, puis en dernière ligne du bloc `let moved = self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new());`
(prendre `e` dans `table_of` là où il est ignoré par `_`), et `Ok(self.table_done_with(page, id, moved))` au lieu de
`Ok(self.table_done(page, id))`. Commentaire de schéma de l'en-tête (`:1-8`) : ajouter « objet logé : champ `cell` de
l'objet, `table_links.rs` ».

- [ ] **6. `commands.rs`** — variantes, après `ImportTable` :

```rust
    /// personnalisation-3 (D3) : tailles, suivi des autres objets liés, `matrix` composée sur `ids`, `cell` posé (`Some`)
    /// ou retiré (`None`) ; refus `BadTable` si `ids` contient un tableau ou si la case visée est ombrée (D35, D36) ; une étape.
    PlaceInCell {
        ids: Vec<String>,
        matrix: Transform,
        cell: Option<[String; 3]>,
        sizes: Vec<crate::table_links::LineSize>,
    },
    /// personnalisation-3 (D4) : tailles par id de ligne et de colonne, objets liés suivis ; une étape.
    SetTableLineSizes {
        id: String,
        cols: Vec<(String, f64)>,
        rows: Vec<(String, f64)>,
    },
```

Dans `apply` :

```rust
            Command::PlaceInCell { ids, matrix, cell, sizes } => {
                self.cmd_place_in_cell(&ids, &matrix, cell.as_ref(), &sizes)
            }
            Command::SetTableLineSizes { id, cols, rows } => self.cmd_set_table_line_sizes(&id, &cols, &rows),
```

`find_unique` en `pub(crate)`. Dans `cmd_transform`, remplacer la lecture des cibles et l'écriture par :

```rust
        let (targets, unlink) = {
            let txn = self.read();
            let mut targets: Vec<(MapRef, Transform, String, String)> = self
                .find_unique(&txn, ids)
                .into_iter()
                .filter_map(|(id, f)| {
                    let t = out_transform(f.element.get(&txn, "transform"))?;
                    Some((f.element, t, f.page_id, id))
                })
                .collect();
            // D6 : un tableau emporte ses objets liés ; un objet lié déplacé sans lui quitte sa case si son centre en sort.
            self.with_linked(&txn, &mut targets);
            let unlink = self.leaving_cells(&txn, &targets, m);
            (targets, unlink)
        };
```

et dans le bloc d'écriture, après l'insertion de `transform` : `if unlink.contains(&targets_id) { e.remove(&mut txn, "cell"); }`
(itérer `for ((e, _, _, id), c) in targets.iter().zip(&composed)`). Les `ids` du changement : `let mut ids: Vec<String> =
targets.into_iter().map(|t| t.3).collect(); ids.sort();`.

- [ ] **7. `copy.rs`** — dans `copy_elements`, après le traitement de `group` : `prelim.remove("cell");` avec le commentaire
« personnalisation-3 : une copie est libre (renumérotation : T5) ». Si `MapPrelim` n'a pas `remove`, utiliser
`prelim.retain(|k, _| k.as_ref() != "cell")` ou l'équivalent de son type (`HashMap<Arc<str>, In>`).

- [ ] **8. Exports Wasm** — dans `crates/roomboard-wasm/src/lib.rs`, après `set_table_shade` :

```rust
    /// personnalisation-3 (D3) : `table`, `row`, `col` tous présents = case visée, sinon sortie de case ; `size_keys` =
    /// triplets (tableau, "row" | "col", ligne) bout à bout, `size_values` une taille par triplet.
    #[allow(clippy::too_many_arguments)]
    pub fn place_in_cell(
        &mut self,
        ids: Vec<String>,
        matrix: &[f64],
        table: Option<String>,
        row: Option<String>,
        col: Option<String>,
        size_keys: Vec<String>,
        size_values: &[f64],
    ) -> Result<JsValue, JsError> {
        let cell = match (table, row, col) {
            (Some(t), Some(r), Some(c)) => Some([t, r, c]),
            _ => None,
        };
        to_js(&self.place_in_cell_inner(ids, matrix, cell, &size_keys, size_values).map_err(cmd_err)?)
    }

    /// personnalisation-3 (D4) : ids et tailles de même longueur, sinon `BadTable`.
    pub fn set_table_line_sizes(
        &mut self,
        id: &str,
        col_ids: Vec<String>,
        col_widths: &[f64],
        row_ids: Vec<String>,
        row_heights: &[f64],
    ) -> Result<JsValue, JsError> {
        to_js(&self.set_table_line_sizes_inner(id, &col_ids, col_widths, &row_ids, row_heights).map_err(cmd_err)?)
    }
```

et après `set_table_shade_inner` :

```rust
    pub fn place_in_cell_inner(
        &mut self,
        ids: Vec<String>,
        matrix: &[f64],
        cell: Option<[String; 3]>,
        size_keys: &[String],
        size_values: &[f64],
    ) -> Result<Change, CommandError> {
        let matrix: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        if size_keys.len() != 3 * size_values.len() {
            return Err(CommandError::BadTable);
        }
        let sizes = size_keys
            .chunks(3)
            .zip(size_values)
            .map(|(k, s)| {
                let axis = match k[1].as_str() {
                    "row" => TableAxis::Row,
                    "col" => TableAxis::Col,
                    _ => return Err(CommandError::BadTable),
                };
                Ok(LineSize { table: k[0].clone(), axis, line: k[2].clone(), size: *s })
            })
            .collect::<Result<Vec<_>, _>>()?;
        self.run(Command::PlaceInCell { ids, matrix, cell, sizes })
    }

    pub fn set_table_line_sizes_inner(
        &mut self,
        id: &str,
        col_ids: &[String],
        col_widths: &[f64],
        row_ids: &[String],
        row_heights: &[f64],
    ) -> Result<Change, CommandError> {
        if col_ids.len() != col_widths.len() || row_ids.len() != row_heights.len() {
            return Err(CommandError::BadTable);
        }
        self.run(Command::SetTableLineSizes {
            id: id.to_string(),
            cols: col_ids.iter().cloned().zip(col_widths.iter().copied()).collect(),
            rows: row_ids.iter().cloned().zip(row_heights.iter().copied()).collect(),
        })
    }
```

Imports : `use roomboard_core::table_links::LineSize;` et `TableAxis` (comme les autres exports de tableau). Test, après
`c10b_table_commands_inner` :

```rust
    #[test]
    fn place_in_cell_inner_links_and_sizes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.add_table_inner(&p, [0.0, 0.0], [3, 3], [240.0, 64.0], "#000000", 36.0).expect("tableau").ids[0].clone();
        let t = table_of(&d, &id);
        let s = d
            .add_shape_inner(&p, "rect", [1000.0, 1000.0, 1400.0, 1300.0], "#000000", 4.0, None, Look::default())
            .expect("forme")
            .ids[0]
            .clone();
        let keys = vec![id.clone(), "col".into(), t.cols[1].id.clone(), id.clone(), "row".into(), t.rows[1].id.clone()];
        d.place_in_cell_inner(vec![s.clone()], &[1.0, 0.0, 0.0, 1.0, -752.0, -928.0], Some([id.clone(), t.rows[1].id.clone(), t.cols[1].id.clone()]), &keys, &[416.0, 316.0])
            .expect("logé");
        assert_eq!(table_of(&d, &id).cols[1].width, 416.0);
        assert!(d.place_in_cell_inner(vec![s], &[1.0], None, &[], &[]).is_err());
        assert!(d.set_table_line_sizes_inner(&id, &[t.cols[0].id.clone()], &[], &[], &[]).is_err());
    }
```

Si `add_shape_inner` a une autre signature, prendre celle de l'appel existant le plus proche dans les tests de `lib.rs`.

- [ ] **9. Vert** — relancer la commande bornée de la tâche, puis `cargo test -p roomboard-core` et `-p roomboard-wasm`
(motifs `test result: ok`), `cargo clippy` et `cargo fmt --all --check`. Mesurer : commande M. Rapporter la taille.

- [ ] **10. Commit**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau
git add crates/roomboard-core/src/table_links.rs
git add crates/roomboard-core/src/lib.rs
git add crates/roomboard-core/src/element.rs
git add crates/roomboard-core/src/document.rs
git add crates/roomboard-core/src/table.rs
git add crates/roomboard-core/src/commands.rs
git add crates/roomboard-core/src/copy.rs
git add crates/roomboard-wasm/src/lib.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(core): link objects to table cells, PlaceInCell, SetTableLineSizes, follow and carry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Contrat TS : `api.ts`, `wasm-core.ts`, faux cœur à parité, contrat, CLI

<a id="tache-t2"></a>

**Objectif** : la page et la CLI parlent `PlaceInCell` et `SetTableLineSizes` ; la fausse liaison reproduit exactement le
cœur de T1 (suivi, emport, sortie, refus, ids du changement) ; le contrat le prouve sur les deux fabriques ; la CLI
loge un objet et le voit suivre une ligne insérée (S16).

**Fichiers**
- Modifier : `apps/web/src/core/api.ts:60-200` (commandes), `:310-316` (`ElementBase.cell`), en-tête (`:12-16`, une ligne personnalisation-3)
- Modifier : `apps/web/src/core/wasm-core.ts:178-186` (`toElementView` lit `cell`), `:636-660` (deux `case`)
- Modifier : `apps/web/src/core/fake-core.ts:150-166` (`FakeElement.cell`), `:786-795` (`writeTable`), `:1033-1056` (`Transform`), nouveaux `case`, `:1624` (`element` publie `cell`)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (bloc `describe.each(c10aFactories)("contrat personnalisation-3 : $name", …)` après le bloc C10b)
- Modifier : `apps/cli/src/ops.ts:11-17`, `apps/cli/src/ops.test.ts:42-45`
- Modifier : `scripts/essais/cli-essai.mjs` (passage S16 avant `console.log("CLI : OK")`)

**Interfaces**
- Consomme (T1) : exports Wasm `place_in_cell(ids, matrix, table?, row?, col?, size_keys, size_values)`, `set_table_line_sizes(id, col_ids, col_widths, row_ids, row_heights)` ; vue `cell` (3 chaînes) ; ordre des refus de `PlaceInCell` (section T1) ; `Change.ids` (table d'abord puis suivis, pour les commandes de tableau ; triés pour `PlaceInCell` et `Transform`).
- Produit (`api.ts`) :

```ts
/** personnalisation-3 (D1) : case qui loge un objet, `[tableId, rowId, colId]`. */
export type CellLink = readonly [table: string, row: string, col: string];
/** personnalisation-3 (D3) : taille d'une ligne ou d'une colonne, `[tableau, axe, ligne, taille]`. */
export type LineSize = readonly [table: string, axis: TableAxis, line: string, size: number];
// dans Command :
  /** personnalisation-3 (D3) : tailles, suivi, matrice composée sur ids, cell posé (null : retiré) ; une étape. */
  | { readonly type: "PlaceInCell"; readonly ids: readonly string[]; readonly matrix: Matrix; readonly cell: CellLink | null; readonly sizes: readonly LineSize[] }
  /** personnalisation-3 (D4) : tailles par id, objets liés suivis ; une étape. */
  | { readonly type: "SetTableLineSizes"; readonly id: string; readonly cols: readonly (readonly [string, number])[]; readonly rows: readonly (readonly [string, number])[] }
// dans ElementBase :
  /** personnalisation-3 (D1) : case qui loge l'objet ; absent sans lien (jamais sur un tableau). */
  readonly cell?: CellLink;
```

- Produit (faux cœur) : `offsetsOf(t: FakeTable): Offsets`, `followCells(p: FakePage, tableId: string, m: Matrix, before: Offsets, after: Offsets, skip: ReadonlySet<string>): string[]`, avec `interface Offsets { readonly cols: ReadonlyMap<string, number>; readonly rows: ReadonlyMap<string, number> }`.
- Réutilise : `apps/web/src/core/fake-core.ts:786` `writeTable` — y loge le suivi (étendre).
- Le rapport porte `Réutilisation : appelé writeTable` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "personnalisation-3" 2>&1 | tail -20
```

Attendu : `Tests  N passed` avec N ≥ 14 (7 tests × 2 fabriques), « vrai module wasm » présent dans les noms (le `.wasm`
de la commande M de T1 existe). Puis `pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -5` (tests à
garder verts : contrats C10a, C10b, C3), `pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts 2>&1 | tail -5`
(« 38 commandes »), `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` et `pnpm --filter @roomboard/cli exec tsc
--noEmit 2>&1 | tail -5` (aucune erreur), puis `pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node
scripts/essais/cli-essai.mjs 2>&1 | tail -6` : `ok — … S16 : …` puis `CLI : OK`.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G5 champs facultatifs ; G6 CLI :
`COMMAND_TYPES`, `ops.test.ts`, `cli-essai.mjs`, `FORMAT_LOTS` inchangé ; G9 hors tableau inchangé ; G10 interdits ;
G11 commits ; G12 une étape par commande.

**Interdits** : ne pas modifier le cœur Rust (le faux cœur suit le vrai, jamais l'inverse ; un écart trouvé est
rapporté) ; ne pas réécrire de test existant du contrat.

**Patron à ne pas reprendre** : coder le suivi dans chaque `case` du faux cœur (InsertTableLine, RemoveTableLine,
SetTableSizes, SetTableCell…) : une commande oubliée diverge du cœur. Le suivi vit dans `writeTable`, seul passage de
toutes les écritures de tableau (`apps/web/src/core/fake-core.ts:786-795`) ; et l'ordre des refus est celui de la section
T1, pas celui qui vient naturellement en TS.

**Terminé quand** : les commandes bornées ci-dessus passent, `tsc` propre pour web et CLI, `CLI : OK`, un commit.

#### Étapes

- [ ] **1. Test rouge du contrat** — ajouter après le bloc C10b :

```ts
// personnalisation-3 (lot A) : lien de case, PlaceInCell, SetTableLineSizes, suivi (D5), emport (D6), refus (D35, D36).
type Cells = { readonly t: string; readonly o: string; readonly link: (r: number, c: number) => CellLink };
const placed = (d: CoreDocument): Cells => {
  const p = first(d);
  const t = addTable(d, p, { x: 0, y: 0, cols: 3, rows: 3 });
  const o = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 1000, y0: 1000, x1: 1400, y1: 1300, style, fill: null }).ids[0] ?? "";
  const link = (r: number, c: number): CellLink => {
    const v = tableOf(d, t);
    return [t, v.rows[r]?.id ?? "", v.cols[c]?.id ?? ""];
  };
  return { t, o, link };
};
const place11 = (d: CoreDocument, s: Cells): Change => {
  const v = tableOf(d, s.t);
  const at = d.element(s.o)?.transform ?? [1, 0, 0, 1, 0, 0];
  return d.apply({
    type: "PlaceInCell",
    ids: [s.o],
    matrix: [1, 0, 0, 1, 248 - at[4], 72 - at[5]],
    cell: s.link(1, 1),
    sizes: [[s.t, "col", v.cols[1]?.id ?? "", 416], [s.t, "row", v.rows[1]?.id ?? "", 316]],
  });
};

describe.each(c10aFactories)("contrat personnalisation-3 : $name", ({ f }) => {
  it("PlaceInCell (S1) : colonne 416, ligne 316, lien posé, une étape ; annuler ramène tout", () => {
    const d = f.blank();
    const s = placed(d);
    const before = d.element(s.o)?.transform;
    const c = place11(d, s);
    expect(c.ids).toEqual([s.o, s.t].sort());
    expect(tableOf(d, s.t).cols.map((x) => x.width)).toEqual([240, 416, 240]);
    expect(tableOf(d, s.t).rows.map((x) => x.height)).toEqual([64, 316, 64]);
    expect(d.element(s.o)?.cell).toEqual(s.link(1, 1));
    d.undo();
    expect(d.element(s.o)?.cell).toBeUndefined();
    expect(d.element(s.o)?.transform).toEqual(before);
    d.free();
  });

  it("PlaceInCell refusé (S18) : un tableau, une case ombrée ; aucun id : aucune étape", () => {
    const d = f.blank();
    const s = placed(d);
    const t2 = addTable(d, first(d), { x: 2000, y: 0 });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "PlaceInCell", ids: [t2], matrix: [1, 0, 0, 1, 0, 0], cell: s.link(0, 0), sizes: [] }))).toBe(TABLE_MESSAGE));
    const [, r, k] = s.link(0, 0);
    d.apply({ type: "SetTableShade", id: s.t, from: { row: r, col: k }, to: { row: r, col: k }, shade: "#94a3b8" });
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "PlaceInCell", ids: [s.o], matrix: [1, 0, 0, 1, 0, 0], cell: s.link(0, 0), sizes: [] }))).toBe(TABLE_MESSAGE));
    unchanged(d, () => d.apply({ type: "PlaceInCell", ids: ["zz"], matrix: [1, 0, 0, 1, 0, 0], cell: null, sizes: [] }));
    d.free();
  });

  it("personnalisation-3 suivi (S16, D5) : InsertTableLine en tête : l'objet descend de 64 ; ids [tableau, objet]", () => {
    const d = f.blank();
    const s = placed(d);
    place11(d, s);
    const y = d.element(s.o)?.transform[5] ?? 0;
    expect(d.apply({ type: "InsertTableLine", id: s.t, axis: "row", at: 0 }).ids).toEqual([s.t, s.o]);
    expect(d.element(s.o)?.transform[5]).toBe(y + 64);
    d.free();
  });

  it("personnalisation-3 suivi (H22) : RemoveTableLine de sa ligne : lien retiré, objet en place", () => {
    const d = f.blank();
    const s = placed(d);
    place11(d, s);
    const at = d.element(s.o)?.transform;
    d.apply({ type: "RemoveTableLine", id: s.t, axis: "row", line: s.link(1, 1)[1] });
    expect(d.element(s.o)?.cell).toBeUndefined();
    expect(d.element(s.o)?.transform).toEqual(at);
    d.free();
  });

  it("personnalisation-3 suivi : SetTableSizes, SetTableCell qui grandit, SetTableLineSizes", () => {
    const d = f.blank();
    const s = placed(d);
    d.apply({ type: "PlaceInCell", ids: [s.o], matrix: [1, 0, 0, 1, 0, 0], cell: s.link(2, 2), sizes: [] });
    const at = d.element(s.o)?.transform ?? [1, 0, 0, 1, 0, 0];
    d.apply({ type: "SetTableSizes", id: s.t, colWidth: 300, rowHeight: 80 });
    expect(d.element(s.o)?.transform.slice(4)).toEqual([at[4] + 120, at[5] + 32]);
    const [, r0, c0] = s.link(0, 0);
    d.apply({ type: "SetTableCell", id: s.t, row: r0, col: c0, content: "haut", rowHeight: 180 });
    expect(d.element(s.o)?.transform[5]).toBe(at[5] + 132);
    expect(d.apply({ type: "SetTableLineSizes", id: s.t, cols: [[c0, 400]], rows: [] }).ids).toEqual([s.t, s.o]);
    expect(d.element(s.o)?.transform[4]).toBe(at[4] + 220);
    unchanged(d, () => d.apply({ type: "SetTableLineSizes", id: s.t, cols: [[c0, 400]], rows: [] }));
    unchanged(d, () => expect(messageOf(() => d.apply({ type: "SetTableLineSizes", id: s.t, cols: [["zz", 10]], rows: [] }))).toBe(TABLE_MESSAGE));
    d.free();
  });

  it("personnalisation-3 emport (D6) : Transform du tableau emporte l'objet ; sans lien, inchangé", () => {
    const d = f.blank();
    const s = placed(d);
    expect(d.apply({ type: "Transform", ids: [s.t], matrix: [1, 0, 0, 1, 50, 20] }).ids).toEqual([s.t]);
    d.apply({ type: "PlaceInCell", ids: [s.o], matrix: [1, 0, 0, 1, 0, 0], cell: s.link(0, 0), sizes: [] });
    const at = d.element(s.o)?.transform ?? [1, 0, 0, 1, 0, 0];
    expect(d.apply({ type: "Transform", ids: [s.t], matrix: [1, 0, 0, 1, 50, 20] }).ids).toEqual([s.t, s.o].sort());
    expect(d.element(s.o)?.transform.slice(4)).toEqual([at[4] + 50, at[5] + 20]);
    d.free();
  });

  it("personnalisation-3 sortie (D6, H24) : objet lié déplacé seul : lien gardé dedans, retiré dehors", () => {
    const d = f.blank();
    const p = first(d);
    const t = addTable(d, p, { x: 0, y: 0, cols: 3, rows: 3 });
    const o = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 10, y0: 10, x1: 50, y1: 40, style, fill: null }).ids[0] ?? "";
    const v = tableOf(d, t);
    const l: CellLink = [t, v.rows[0]?.id ?? "", v.cols[0]?.id ?? ""];
    d.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: l, sizes: [] });
    d.apply({ type: "Transform", ids: [o], matrix: [1, 0, 0, 1, 100, 0] });
    expect(d.element(o)?.cell).toEqual(l);
    d.apply({ type: "Transform", ids: [o], matrix: [1, 0, 0, 1, 0, 500] });
    expect(d.element(o)?.cell).toBeUndefined();
    d.free();
  });
});
```

Importer `CellLink` dans la ligne d'import de `./api` du fichier de contrat.

- [ ] **2. Rouge** — `pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "personnalisation-3" 2>&1 | tail -20` : échec de compilation ou de type (`PlaceInCell` absent).

- [ ] **3. `api.ts`** — ajouter les types et membres de la section Interfaces (bloc « Produit »).

- [ ] **4. `wasm-core.ts`** — dans `toElementView`, après `group` :

```ts
  // personnalisation-3 (D1) : lien de case, trois chaînes ; absent laissé absent.
  const cell = v["cell"];
  if (cell !== undefined && cell !== null && !(isStrings(cell) && cell.length === 3)) throw new Error(ELEMENT);
  const link: CellLink | null = isStrings(cell) && cell.length === 3 ? [cell[0] ?? "", cell[1] ?? "", cell[2] ?? ""] : null;
```

et `...(link ? { cell: link } : {})` dans `base`. Dans `apply`, après `SetTableShade` :

```ts
      case "PlaceInCell":
        return toChange(
          this.d.place_in_cell(
            [...cmd.ids],
            new Float64Array(cmd.matrix),
            cmd.cell?.[0],
            cmd.cell?.[1],
            cmd.cell?.[2],
            cmd.sizes.flatMap(([t, a, l]) => [t, a, l]),
            new Float64Array(cmd.sizes.map((s) => s[3])),
          ),
        );
      case "SetTableLineSizes":
        return toChange(
          this.d.set_table_line_sizes(cmd.id, cmd.cols.map((c) => c[0]), new Float64Array(cmd.cols.map((c) => c[1])), cmd.rows.map((r) => r[0]), new Float64Array(cmd.rows.map((r) => r[1]))),
        );
```

Si `WasmModule` (type local de `wasm-core.ts`) déclare les méthodes à la main, y ajouter ces deux signatures.

- [ ] **5. Faux cœur** — `FakeElement` : `readonly cell?: CellLink;`. `element()` : `const base = { id, transform: e.transform, ...withGroup(e.group), ...(e.cell && !e.table ? { cell: e.cell } : {}) };`. Fonctions de module, près de `copyElement` :

```ts
/** personnalisation-3 (D5) : décalage de chaque ligne et colonne depuis le coin, comme `offsets` du cœur. */
interface Offsets { readonly cols: ReadonlyMap<string, number>; readonly rows: ReadonlyMap<string, number> }
function offsetsOf(t: FakeTable): Offsets {
  const run = (lines: readonly { readonly id: string; readonly size: number }[]): Map<string, number> => {
    const m = new Map<string, number>();
    let acc = 0;
    for (const l of lines) {
      m.set(l.id, acc);
      acc += l.size;
    }
    return m;
  };
  return { cols: run(t.cols.map((c) => ({ id: c.id, size: c.width }))), rows: run(t.rows.map((r) => ({ id: r.id, size: r.height }))) };
}
/** Suivi (D5), comme `follow_in` : translation du coin de la case, lien retiré si sa ligne a disparu (H22) ; ids touchés, ordre de la pile. */
function followCells(p: FakePage, tableId: string, m: Matrix, before: Offsets, after: Offsets, skip: ReadonlySet<string>): string[] {
  const out: string[] = [];
  p.elements.forEach((e, i) => {
    const l = e.cell;
    if (l === undefined || l[0] !== tableId || skip.has(e.id) || e.table !== undefined) return;
    const c0 = before.cols.get(l[2]);
    const r0 = before.rows.get(l[1]);
    if (c0 === undefined || r0 === undefined) return;
    const c1 = after.cols.get(l[2]);
    const r1 = after.rows.get(l[1]);
    if (c1 === undefined || r1 === undefined) {
      const { cell: _gone, ...rest } = e;
      p.elements[i] = rest;
      out.push(e.id);
      return;
    }
    const dx = c1 - c0;
    const dy = r1 - r0;
    if (dx === 0 && dy === 0) return;
    const [a, b, c, d, tx, ty] = e.transform;
    p.elements[i] = { ...e, transform: [a, b, c, d, tx + m[0] * dx + m[2] * dy, ty + m[1] * dx + m[3] * dy] };
    out.push(e.id);
  });
  return out;
}
/** Rectangle local d'une case (sa zone si elle en couvre une), comme `cell_rect`. */
function cellRectOf(t: FakeTable, row: string, col: string): Bounds | null {
  const r = t.rows.findIndex((x) => x.id === row);
  const c = t.cols.findIndex((x) => x.id === col);
  if (r < 0 || c < 0) return null;
  const z = mergesOf(t).find((m) => m.r0 <= r && r <= m.r1 && m.c0 <= c && c <= m.c1) ?? { r0: r, c0: c, r1: r, c1: c };
  const at = (sizes: readonly number[], i: number): number => sum(sizes.slice(0, i));
  const w = t.cols.map((x) => x.width);
  const h = t.rows.map((x) => x.height);
  return { x0: at(w, z.c0), y0: at(h, z.r0), x1: at(w, z.c1 + 1), y1: at(h, z.r1 + 1) };
}
```

`writeTable` :

```ts
  private writeTable(found: Found, id: string, next: FakeTable): Change {
    const pageId = found.page.id;
    const before = found.element.table ? offsetsOf(found.element.table) : null;
    return this.step((s) => {
      const p = s.pages.find((q) => q.id === pageId);
      const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
      const old = p?.elements[i];
      if (p && old) p.elements[i] = { ...old, table: next };
      // personnalisation-3 (D5) : le suivi vit ici, seul passage de toutes les écritures de tableau.
      const moved = p && old && before ? followCells(p, id, old.transform, before, offsetsOf(next), new Set()) : [];
      return { pages: [pageId], ids: [id, ...moved], removed: [] };
    });
  }
```

`case "Transform"` : après le calcul de `ids` (triés) et avant `composed`, élargir et calculer les sorties :

```ts
        // D6 : un tableau emporte ses objets liés ; un objet lié déplacé sans lui quitte sa case si son centre en sort.
        const asked = new Set(ids);
        for (const id of ids) {
          const f = this.find(id);
          if (f?.element.table === undefined) continue;
          for (const e of f.page.elements) if (e.cell?.[0] === id && e.table === undefined && e.malformed === undefined) asked.add(e.id);
        }
        const all = [...asked].sort();
        const unlink = new Set(
          all.filter((id) => {
            const l = this.find(id)?.element.cell;
            if (l === undefined || asked.has(l[0])) return false;
            const b = this.bounds([id]);
            const tf = this.find(l[0]);
            const t = tf?.element.table;
            const inv = tf ? invertMatrix(tf.element.transform) : null;
            if (b === null || t === undefined || inv === null) return false;
            const [nx, ny] = applyMatrix(m, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
            const [lx, ly] = applyMatrix(inv, nx, ny);
            const r = cellRectOf(t, l[1], l[2]);
            return r === null || lx < r.x0 || lx > r.x1 || ly < r.y0 || ly > r.y1;
          }),
        );
```

puis utiliser `all` à la place de `ids` pour `composed`, `pages`, la boucle d'écriture (`p.elements[i] = unlink.has(e.id) ? withoutCell({ ...e, transform: t }) : { ...e, transform: t }`, avec `const withoutCell = ({ cell: _c, ...rest }: FakeElement): FakeElement => rest;`) et le retour `{ pages, ids: all, removed: [] }`.

`case "SetTableLineSizes"` :

```ts
      case "SetTableLineSizes": {
        const { found, t } = this.tableOf(cmd.id);
        const known = (lines: readonly { readonly id: string }[], list: readonly (readonly [string, number])[]): boolean =>
          list.every(([id, s]) => positive(s) && lines.some((l) => l.id === id));
        if (!known(t.cols, cmd.cols) || !known(t.rows, cmd.rows)) throw new Error(MESSAGES.badTable);
        const resize = <L extends { readonly id: string }>(lines: readonly L[], list: readonly (readonly [string, number])[], key: "width" | "height"): L[] =>
          lines.map((l) => {
            const hit = [...list].reverse().find(([id]) => id === l.id);
            return hit === undefined || (l as Record<string, unknown>)[key] === hit[1] ? l : { ...l, [key]: hit[1] };
          });
        const cols = resize(t.cols, cmd.cols, "width");
        const rows = resize(t.rows, cmd.rows, "height");
        if (!fitsF32([sum(cols.map((c) => c.width)), sum(rows.map((r) => r.height))])) throw new Error(MESSAGES.badTable);
        if (cols.every((c, i) => c === t.cols[i]) && rows.every((r, i) => r === t.rows[i])) return this.unchanged();
        return this.writeTable(found, cmd.id, { ...t, cols, rows });
      }
```

`case "PlaceInCell"` (ordre des refus de T1) :

```ts
      case "PlaceInCell": {
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        const hits = [...new Set(cmd.ids)].map((id) => this.find(id)).filter((x): x is Found => x !== undefined && x.element.malformed === undefined);
        if (hits.some((x) => x.element.table !== undefined)) throw new Error(MESSAGES.badTable);
        const pageId = hits[0]?.page.id;
        if (pageId === undefined) return this.unchanged();
        if (hits.some((x) => x.page.id !== pageId)) throw new Error(MESSAGES.badTable);
        const target = cmd.cell;
        if (target !== null) {
          const { found, t } = this.tableOf(target[0]);
          if (found.page.id !== pageId) throw new Error(MESSAGES.badTable);
          if (!t.rows.some((r) => r.id === target[1]) || !t.cols.some((c) => c.id === target[2])) throw new Error(MESSAGES.badTable);
          if ((t.cells.get(cellKey(target[1], target[2]))?.shade ?? null) !== null) throw new Error(MESSAGES.badTable);
        }
        const tables: string[] = [];
        for (const [tid] of cmd.sizes) if (!tables.includes(tid)) tables.push(tid);
        const next = new Map<string, FakeTable>();
        for (const tid of tables) {
          const { found, t } = this.tableOf(tid);
          if (found.page.id !== pageId) throw new Error(MESSAGES.badTable);
          const list = cmd.sizes.filter((s) => s[0] === tid);
          const ok = list.every(([, a, l, s]) => positive(s) && (a === "row" ? t.rows : t.cols).some((x) => x.id === l));
          if (!ok) throw new Error(MESSAGES.badTable);
          const size = (a: TableAxis, id: string, cur: number): number => [...list].reverse().find((s) => s[1] === a && s[2] === id)?.[3] ?? cur;
          const cols = t.cols.map((c) => (size("col", c.id, c.width) === c.width ? c : { ...c, width: size("col", c.id, c.width) }));
          const rows = t.rows.map((r) => (size("row", r.id, r.height) === r.height ? r : { ...r, height: size("row", r.id, r.height) }));
          if (!fitsF32([sum(rows.map((r) => r.height)), sum(cols.map((c) => c.width))])) throw new Error(MESSAGES.badTable);
          next.set(tid, { ...t, cols, rows });
        }
        const composed = new Map(hits.map((x) => [x.element.id, composeMatrix(cmd.matrix, x.element.transform)]));
        if (![...composed.values()].every(validMatrix)) throw new Error(MESSAGES.badMatrix);
        const sameLink = (l: CellLink | undefined): boolean => (target === null ? l === undefined : l !== undefined && l.every((v, i) => v === target[i]));
        const sameSizes = tables.every((tid) => {
          const a = this.find(tid)?.element.table;
          const b = next.get(tid);
          return a !== undefined && b !== undefined && a.cols.every((c, i) => c === b.cols[i]) && a.rows.every((r, i) => r === b.rows[i]);
        });
        if (isIdentity(cmd.matrix) && sameSizes && hits.every((x) => sameLink(x.element.cell))) return this.unchanged();
        const skip = new Set(hits.map((x) => x.element.id));
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const touched = new Set<string>(skip);
          if (p) {
            for (const tid of tables) {
              const i = p.elements.findIndex((e) => e.id === tid);
              const old = p.elements[i];
              const t = next.get(tid);
              if (!old?.table || !t) continue;
              const before = offsetsOf(old.table);
              p.elements[i] = { ...old, table: t };
              touched.add(tid);
              for (const id of followCells(p, tid, old.transform, before, offsetsOf(t), skip)) touched.add(id);
            }
            p.elements.forEach((e, i) => {
              if (!skip.has(e.id)) return;
              const { cell: _old, ...rest } = e;
              const transform = isIdentity(cmd.matrix) ? e.transform : (composed.get(e.id) ?? e.transform);
              p.elements[i] = target === null ? { ...rest, transform } : { ...rest, transform, cell: target };
            });
          }
          return { pages: [pageId], ids: [...touched].sort(), removed: [] };
        });
      }
```

Imports : `applyMatrix`, `invertMatrix` depuis `./shapes` s'ils n'y sont pas ; `CellLink`, `TableAxis`, `Bounds` depuis `./api`.

- [ ] **6. Vert du contrat** — commande bornée de la tâche, puis `vitest run src/core` (5 dernières lignes).

- [ ] **7. CLI** — `COMMAND_TYPES` : ajouter `"PlaceInCell", "SetTableLineSizes"` après `"ImportTable"` ; `ops.test.ts` :
titre « COMMAND_TYPES couvre les 38 commandes de Command, sans doublon » et `toBe(38)`. Vérifier rouge puis vert
(`pnpm --filter @roomboard/cli exec vitest run src/ops.test.ts 2>&1 | tail -5`).

- [ ] **8. `cli-essai.mjs` (S16)** — avant `console.log("CLI : OK");` :

```js
  // personnalisation-3 (S16, D25) : loger une forme dans une case, insérer une ligne en tête, enregistrer, relire.
  const pl = join(dir, "cases-3.roomboard");
  verifie("S16 : new cases-3.roomboard", cli(["new", pl]).code === 0);
  const pose = cli(["run", pl, "--save", "--ops", "-"], lignesOps(
    { type: "AddTable", page: "$page:0", x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 },
    { type: "AddShape", page: "$page:0", shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1050, style: { color: "#1e40af", width: 4 }, fill: null },
    { op: "state" },
  ));
  const els = pose.lignes[2]?.state?.pages?.[0]?.elements ?? [];
  const tab = els.find((e) => e.kind === "table");
  const forme = els.find((e) => e.kind === "shape");
  verifie("S16 : un tableau et une forme", pose.code === 0 && tab !== undefined && forme !== undefined, pose.brut);
  const lien = [tab.id, tab.table.rows[1].id, tab.table.cols[1].id];
  const loge = cli(["run", pl, "--save", "--ops", "-"], lignesOps(
    { type: "PlaceInCell", ids: [forme.id], matrix: [1, 0, 0, 1, 0, 0], cell: lien, sizes: [] },
    { op: "state" },
    { type: "InsertTableLine", id: tab.id, axis: "row", at: 0 },
    { op: "state" },
    { op: "undo" },
    { op: "state" },
    { op: "redo" },
  ));
  const yDe = (i) => (loge.lignes[i]?.state?.pages?.[0]?.elements ?? []).find((e) => e.id === forme.id)?.transform?.[5];
  verifie("S16 : PlaceInCell, puis InsertTableLine à la ligne 0 : la forme descend de 64", loge.code === 0 && yDe(3) === yDe(1) + 64, loge.brut);
  verifie("S16 : undo, une étape : la forme remonte", yDe(5) === yDe(1), loge.brut);
  const relu = etat(pl).pages[0].elements.find((e) => e.id === forme.id);
  egal("S16 : réouverture : cell présent", relu?.cell, lien);
```

Si l'état de la CLI ne publie pas `transform` sous ce nom, lire le champ de position qu'elle publie (`state.ts`) ; le
contrôle reste « + 64 ».

- [ ] **9. Vert CLI** — `pnpm --filter @roomboard/cli build 2>&1 | tail -3 && node scripts/essais/cli-essai.mjs 2>&1 | tail -6` : lignes `S16` puis `CLI : OK`.

- [ ] **10. Commit** — `git add` des 7 fichiers un par un (`apps/web/src/core/api.ts`, `apps/web/src/core/wasm-core.ts`,
`apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/cli/src/ops.ts`,
`apps/cli/src/ops.test.ts`, `scripts/essais/cli-essai.mjs`), message `feat(web,cli): PlaceInCell and SetTableLineSizes
contract, fake core parity, CLI S16` + ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T3 — Glisser vers une case : `cell-drop.ts`, `requiredSizes`, `tableAt`, Sélection (4 points), cadre de case visée

<a id="tache-t3"></a>

**Objectif** : au relâché d'un déplacement par la Sélection sur une case d'un tableau, l'objet s'y loge et la case
grandit (mode agrandir, D8) ; un objet lié lâché hors de tout tableau sort de sa case (sans réduction : T6) ; Alt garde
le déplacement libre ; la case visée est encadrée pendant le glisser ; sélectionner un tableau prend ses objets.

**Fichiers**
- Créer : `apps/web/src/engine/tools/cell-drop.ts`, `apps/web/src/engine/tools/cell-drop.test.ts`
- Modifier : `apps/web/src/engine/table-geom.ts:166-181` (`tableAt`), fin de fichier (`LinkedBox`, `requiredSizes`)
- Modifier : `apps/web/src/engine/table-geom.test.ts` (2 tests)
- Modifier : `apps/web/src/engine/groups.ts:8-11` (`GroupedView.cell?` optionnel)
- Modifier : `apps/web/src/engine/tools/select.ts:91`, `:148-165`, `:168-176`, `:183-204`, `:206-224` (les 4 points DA3)
- Modifier : `apps/web/src/engine/tools/select.test.ts` (1 test : branché, Alt)
- Modifier : `apps/web/src/engine/render/overlay.ts` (`target?`), `apps/web/src/engine/render/canvas2d.ts:634-664` (cadre 2 px)
- Modifier : `apps/web/src/app/board-session.ts:371`

**Interfaces**
- Consomme (T2) : `Command` `PlaceInCell` (`CellLink`, `LineSize`), `ElementView.cell`, `CoreDocument.elementIdsOfKind(page, kind)`, `CoreDocument.version()`.
- Produit :

```ts
// table-geom.ts
export interface LinkedBox { readonly row: string; readonly col: string; readonly w: number; readonly h: number }
export function requiredSizes(t: TableData, linked: readonly LinkedBox[], colWidths: readonly number[], measure: Measure): { rows: number[]; cols: number[] };
export function tableAt(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, x: number, y: number): TableHit | null;
// cell-drop.ts
export interface CellDrop {
  expand(ids: readonly string[], views: readonly GroupedView[]): string[];
  target(selection: readonly string[], x: number, y: number): Bounds | null;
  drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null;
  place(selection: readonly string[], out: boolean): Command | null; // T3 : rend null ; T6 le remplit
}
export function createCellDrop(ctx: ToolContext, measure: Measure): CellDrop;
// select.ts
export function createSelectTool(ctx: ToolContext, cellDrop?: CellDrop): SelectionTool;
// overlay.ts
EditOverlay.target?: Bounds | null; // cadre de la case visée (monde)
```

- Réutilise : `apps/web/src/engine/groups.ts:24` `expandToGroups`, `:12` `viewsOf` — `cell-drop.expand(ids, views)` appelé après `expandToGroups` (réutiliser).
- Réutilise : `apps/web/src/engine/table-geom.ts:168` `tableAt`, `:116` `cellRect`, `:225` `cellInnerBox`, `:238` `rowHeightsFor`, `:231` `cellHeight` — appelés tels quels ; `tableAt` lit par `elementIdsOfKind` (étendre).
- Réutilise : `apps/web/src/engine/table-geom.ts:238` `rowHeightsFor` — `requiredSizes` (D34) l'appelle pour le texte (étendre).
- Nouveau module : `apps/web/src/engine/tools/cell-drop.ts` (cadrage : aucun existant, DA3).
- Le rapport porte une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par module ci-dessus.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && pnpm --filter @roomboard/web exec vitest run src/engine/tools/cell-drop.test.ts 2>&1 | tail -20
```

Attendu : `Tests  N passed`, N ≥ 8, nom `S1 : image 400 × 300 sur la case (1, 1)` présent. Puis, tests à garder verts :
`pnpm --filter @roomboard/web exec vitest run src/engine/table-geom.test.ts src/engine/tools/select.test.ts src/engine/tools/table.test.ts src/engine/fill-target.test.ts 2>&1 | tail -6`
et `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5`.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G7 Sélection : point d'entrée court
seulement, logique dans `cell-drop.ts` ; G8 tactile d'abord, pointeur du moteur, jamais glisser HTML5 ; G9 hors tableau
inchangé (sans `cellDrop`, ou sans tableau sous le pointeur, la Sélection écrit la même `Transform` qu'aujourd'hui) ;
G10 interdits ; G11 commits ; G12 une étape par geste.

**Interdits** : aucune ligne de logique de case dans `select.ts` au-delà des 4 points ; aucune boucle neuve dans `emit`
(D28) ; ne pas toucher `engine/engine.ts` (le branchement passe par `board-session.ts`).

**Terminé quand** : `cell-drop.test.ts` ≥ 8 verts, tests à garder verts, `tsc` propre, un commit.

#### Étapes

- [ ] **1. Tests rouges `table-geom`** — ajouter :

```ts
  it("tableAt garde le plus haut (D28, elementIdsOfKind)", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const add = (x: number): string => doc.apply({ type: "AddTable", page, x, y: 0, cols: 2, rows: 2, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    add(0);
    const top = add(100);
    expect(tableAt(doc, page, 150, 10)?.id).toBe(top);
  });

  it("requiredSizes (D34) : objet + 2 × marge, plancher 64 en hauteur et 2 × 8 + 24 en largeur", () => {
    const t: TableData = { color: "#000000", size: 36, cols: [{ id: "c0", width: 240 }, { id: "c1", width: 240 }], rows: [{ id: "r0", height: 64 }, { id: "r1", height: 64 }], cells: [], merges: [] };
    const measure = (s: string, size: number): number => s.length * size * 0.5;
    const r = requiredSizes(t, [{ row: "r1", col: "c1", w: 400, h: 300 }], [240, 240], measure);
    expect(r.cols).toEqual([40, 416]);
    expect(r.rows[1]).toBe(316);
    expect(r.rows[0]).toBeGreaterThanOrEqual(64);
  });
```

- [ ] **2. Tests rouges `cell-drop`** — créer `apps/web/src/engine/tools/cell-drop.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command } from "../../core/api";
import { fakeCore } from "../../core/fake-core";
import type { InputSample } from "../input/sampler";
import { viewsOf } from "../groups";
import { createCellDrop } from "./cell-drop";
import { createSelectTool } from "./select";
import type { ToolContext } from "./tool";

const at = (x: number, y: number): InputSample => ({ x, y, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 });
const measure = (s: string, size: number): number => s.length * size * 0.5;
const ASSET = { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 };

function setup() {
  const doc = fakeCore.blank();
  const page = doc.pageIds()[0] ?? "";
  let alt = false;
  const runs: Command[] = [];
  const ctx: ToolContext = {
    doc,
    page: () => page,
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    run: (cmd) => {
      runs.push(cmd);
      try {
        return doc.apply(cmd);
      } catch {
        return null;
      }
    },
    alt: () => alt,
  };
  const drop = createCellDrop(ctx, measure);
  const tool = createSelectTool(ctx, drop);
  const table = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
  const image = doc.apply({ type: "AddImage", page, asset: ASSET, w: 400, h: 300, matrix: [1, 0, 0, 1, 1000, 1000] }).ids[0] ?? "";
  const t = () => {
    const v = doc.element(table);
    if (v?.kind !== "table") throw new Error("tableau");
    return v.table;
  };
  const move = (from: [number, number], to: [number, number]): void => {
    tool.begin(1, [at(...from)]);
    tool.extend(1, [at(to[0], to[1])], []);
    tool.close(1, "end");
  };
  return { doc, page, tool, drop, runs, table, image, t, move, setAlt: (v: boolean) => { alt = v; } };
}

describe("glisser vers une case (cell-drop, DA3)", () => {
  it("S1 : image 400 × 300 sur la case (1, 1) : PlaceInCell, colonne 416, ligne 316, image dans la boîte intérieure", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type).toBe("PlaceInCell");
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 416, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 316, 64]);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 248, y0: 72, x1: 648, y1: 372 });
    expect(s.doc.element(s.image)?.cell).toEqual([s.table, s.t().rows[1]?.id, s.t().cols[1]?.id]);
    s.doc.undo();
    expect(s.t().cols[1]?.width).toBe(240);
  });

  it("Alt : Transform seul (effet de bord, G8 de C9)", () => {
    const s = setup();
    s.setAlt(true);
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
  });

  it("hors de tout tableau : Transform d'aujourd'hui", () => {
    const s = setup();
    s.move([1200, 1150], [1300, 1150]);
    expect(s.runs.at(-1)).toEqual({ type: "Transform", ids: [s.image], matrix: [1, 0, 0, 1, 100, 0] });
  });

  it("case ombrée : déplacement libre (D35)", () => {
    const s = setup();
    const r = s.t().rows[1]?.id ?? "";
    const c = s.t().cols[1]?.id ?? "";
    s.doc.apply({ type: "SetTableShade", id: s.table, from: { row: r, col: c }, to: { row: r, col: c }, shade: "#94a3b8" });
    s.move([1200, 1150], [360, 96]);
    expect(s.runs.at(-1)?.type).toBe("Transform");
  });

  it("sélection avec tableau : drop rend null", () => {
    const s = setup();
    expect(s.drop.drop([s.table, s.image], [1, 0, 0, 1, 10, 0], 360, 96, false)).toBeNull();
  });

  it("S4 : objet lié lâché hors de tout tableau : PlaceInCell sans cell, à la place du relâché", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [1448, 222]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" && cmd.cell === null).toBe(true);
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
    expect(s.doc.bounds([s.image])?.x0).toBe(1248);
  });

  it("expand (D6) : un tableau sélectionné prend ses objets liés", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    expect(s.drop.expand([s.table], viewsOf(s.doc, s.doc.elementIds(s.page))).sort()).toEqual([s.table, s.image].sort());
  });

  it("target : cadre monde de la case visée pendant le glisser, null hors tableau", () => {
    const s = setup();
    expect(s.drop.target([s.image], 360, 96)).toEqual({ x0: 240, y0: 64, x1: 480, y1: 128 });
    expect(s.drop.target([s.image], 1500, 1500)).toBeNull();
    s.tool.begin(1, [at(1200, 1150)]);
    s.tool.extend(1, [at(360, 96)], []);
    expect(s.tool.live().overlay?.target).toEqual({ x0: 240, y0: 64, x1: 480, y1: 128 });
    s.tool.close(1, "cancel");
  });
});
```

- [ ] **3. Rouge** — commande bornée : `Cannot find module './cell-drop'` (ou équivalent). `table-geom.test.ts -t "requiredSizes"` : rouge.

- [ ] **4. `table-geom.ts`** — `tableAt` lit les seuls tableaux, ordre de la pile gardé :

```ts
/** Le tableau le plus haut sous (x, y) monde, du dessus vers le dessous (I2) ; matrice non inversible : sauté. Lit les
 *  seuls tableaux (`elementIdsOfKind`, D28), dans l'ordre de la pile. */
export function tableAt(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, x: number, y: number): TableHit | null {
  const ids = doc.elementIdsOfKind(page, "table");
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
```

Si un appelant passe un `doc` typé sans `elementIdsOfKind` (cherché : `tools/table.ts:295`, `:317`, `tools/select.ts:140`,
`fill-target.ts`), le type `CoreDocument` complet le porte déjà ; corriger seulement un `Pick` local s'il en existe un.
En fin de fichier :

```ts
/** Boîte locale (repère du tableau) d'un objet logé dans la case `row`, `col` (D34). */
export interface LinkedBox { readonly row: string; readonly col: string; readonly w: number; readonly h: number }

/** Taille exigée (D34) : ligne = max(texte, objet le plus haut + 2 × marge, TABLE_ROW_HEIGHT) ; colonne = max(objet le
 *  plus large + 2 × marge, 2 × marge + 24). Objet d'une zone : la dernière ligne et la dernière colonne portent l'écart. */
export function requiredSizes(t: TableData, linked: readonly LinkedBox[], colWidths: readonly number[], measure: Measure): { rows: number[]; cols: number[] } {
  const rows = rowHeightsFor(t, colWidths, measure).map((h) => Math.max(h, TABLE_ROW_HEIGHT));
  const cols = t.cols.map(() => 2 * TABLE_PADDING + 24);
  const width = (c: number): number => colWidths[c] ?? t.cols[c]?.width ?? 0;
  const height = (r: number): number => rows[r] ?? t.rows[r]?.height ?? 0;
  for (const o of linked) {
    const cell = cellOf(t, o);
    if (cell === null) continue;
    const z = mergeAt(t, cell) ?? single(cell);
    let otherW = 0;
    for (let c = z.c0; c < z.c1; c++) otherW += width(c);
    let otherH = 0;
    for (let r = z.r0; r < z.r1; r++) otherH += height(r);
    cols[z.c1] = Math.max(cols[z.c1] ?? 0, o.w + 2 * TABLE_PADDING - otherW);
    rows[z.r1] = Math.max(rows[z.r1] ?? 0, o.h + 2 * TABLE_PADDING - otherH);
  }
  return { rows, cols };
}
```

(`mergeAt` et `single` existent déjà dans le fichier ; `mergeAt(t, c)` rend la zone en rangs ou null.)

- [ ] **5. `groups.ts`** — `GroupedView` gagne `readonly cell?: readonly [string, string, string];` (commentaire : « personnalisation-3 : lien de case, lu par `cell-drop.expand` »).

- [ ] **6. `cell-drop.ts`**

```ts
/**
 * Glisser vers une case (personnalisation-3, DA3, D7, D8, D34, D35) : la Sélection appelle ce module en 4 points et
 * n'en sait pas plus. Au relâché d'un déplacement, pointeur sur une case d'un tableau absent de la sélection, sélection
 * sans tableau, Alt relâchée, case non ombrée et hors zone fusionnée : `PlaceInCell` (mode agrandir : la colonne et la
 * ligne prennent la taille exigée par l'objet, l'objet est posé au coin de la boîte intérieure). Objet lié lâché hors de
 * tout tableau : `PlaceInCell` sans case, à la place du relâché. Sinon `null` : la Sélection écrit sa `Transform`.
 * Tableaux lus une fois par version du document (D28), jamais par image.
 */
import type { Bounds, CellLink, Command, ElementView, LineSize, Matrix } from "../../core/api";
import { applyMatrix, invertMatrix } from "../../core/shapes";
import type { GroupedView } from "../groups";
import { cellContent, cellRect, mergeAt, requiredSizes, tableAt, TABLE_PADDING, type LinkedBox, type TableHit } from "../table-geom";
import type { Measure } from "../text-layout";
import { transformBounds, translateMatrix } from "./handles";
import type { ToolContext } from "./tool";

export interface CellDrop {
  expand(ids: readonly string[], views: readonly GroupedView[]): string[];
  target(selection: readonly string[], x: number, y: number): Bounds | null;
  drop(selection: readonly string[], matrix: Matrix, x: number, y: number, alt: boolean): Command | null;
  place(selection: readonly string[], out: boolean): Command | null;
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Boîte locale (repère du tableau) d'une boîte monde : rectangle englobant de ses quatre coins. */
function localBox(m: Matrix, b: Bounds): Bounds | null {
  const inv = invertMatrix(m);
  return inv === null ? null : transformBounds(inv, b);
}

export function createCellDrop(ctx: ToolContext, measure: Measure): CellDrop {
  const views = (ids: readonly string[]): ElementView[] => ids.flatMap((id) => {
    const v = ctx.doc.element(id);
    return v === null ? [] : [v];
  });

  /** Case visée : tableau le plus haut sous le pointeur, hors sélection ; sélection sans tableau ; case ni ombrée ni en zone. */
  const aimed = (selection: readonly string[], x: number, y: number): TableHit | null => {
    if (views(selection).some((v) => v.kind === "table")) return null;
    const hit = tableAt(ctx.doc, ctx.page(), x, y);
    if (hit === null || selection.includes(hit.id)) return null;
    if (mergeAt(hit.table, hit.cell) !== null) return null;
    const r = hit.table.rows[hit.cell.row];
    const k = hit.table.cols[hit.cell.col];
    if (r === undefined || k === undefined) return null;
    if (cellContent(hit.table, r.id, k.id).shade !== null) return null;
    return hit;
  };

  /** `PlaceInCell` vers la case `hit` (mode agrandir, D8) ; objet posé au coin de la boîte intérieure. */
  const placeInto = (selection: readonly string[], hit: TableHit): Command | null => {
    const box = ctx.doc.bounds(selection);
    const local = box === null ? null : localBox(hit.transform, box);
    const r = hit.table.rows[hit.cell.row];
    const k = hit.table.cols[hit.cell.col];
    if (box === null || local === null || r === undefined || k === undefined) return null;
    const link: CellLink = [hit.id, r.id, k.id];
    const mine: LinkedBox = { row: r.id, col: k.id, w: local.x1 - local.x0, h: local.y1 - local.y0 };
    const others: LinkedBox[] = ctx.doc.elementIds(ctx.page()).flatMap((id) => {
      if (selection.includes(id)) return [];
      const v = ctx.doc.element(id);
      const b = v?.cell?.[0] === hit.id ? ctx.doc.bounds([id]) : null;
      const lb = b === null ? null : localBox(hit.transform, b);
      return v?.cell === undefined || lb === null ? [] : [{ row: v.cell[1], col: v.cell[2], w: lb.x1 - lb.x0, h: lb.y1 - lb.y0 }];
    });
    const widths = hit.table.cols.map((c) => c.width);
    const req = requiredSizes(hit.table, [...others, mine], widths, measure);
    const sizes: LineSize[] = [];
    const needW = req.cols[hit.cell.col] ?? 0;
    const needH = req.rows[hit.cell.row] ?? 0;
    if (needW > k.width) sizes.push([hit.id, "col", k.id, needW]);
    if (needH > r.height) sizes.push([hit.id, "row", r.id, needH]);
    const corner = cellRect(hit.table, hit.cell);
    const [tx, ty] = applyMatrix(hit.transform, corner.x0 + TABLE_PADDING, corner.y0 + TABLE_PADDING);
    return { type: "PlaceInCell", ids: [...selection], matrix: translateMatrix(tx - box.x0, ty - box.y0), cell: link, sizes };
  };

  return {
    expand(ids, page) {
      const tables = new Set(ids.filter((id) => ctx.doc.element(id)?.kind === "table"));
      if (tables.size === 0) return [...ids];
      const extra = page.filter((v) => v.cell !== undefined && tables.has(v.cell[0]) && !ids.includes(v.id)).map((v) => v.id);
      return [...ids, ...extra];
    },
    target(selection, x, y) {
      const hit = aimed(selection, x, y);
      return hit === null ? null : transformBounds(hit.transform, cellRect(hit.table, hit.cell));
    },
    drop(selection, matrix, x, y, alt) {
      if (alt || selection.length === 0) return null;
      const hit = aimed(selection, x, y);
      if (hit !== null) return placeInto(selection, hit);
      if (views(selection).some((v) => v.kind === "table")) return null;
      const linked = views(selection).some((v) => v.cell !== undefined);
      return linked && tableAt(ctx.doc, ctx.page(), x, y) === null ? { type: "PlaceInCell", ids: [...selection], matrix, cell: null, sizes: [] } : null;
    },
    place() {
      return null; // T6 : Alt+Entrée, Alt+Maj+Entrée
    },
  };
}
```

Si `transformBounds` ou `translateMatrix` n'acceptent pas ces types (`handles.ts:71`), utiliser leur signature exacte.
Le test « S4 » attend `x0 = 1248` : le relâché d'un objet lié hors tableau garde la matrice du glisser (D11 sans
réduction). Le cache par version (D28) : si `target` montre un coût mesurable dans `select.test.ts`, mémoriser
`ctx.doc.version()` et la liste `elementIdsOfKind` ; sinon le laisser (tableAt ne lit que les tableaux).

- [ ] **7. Les 4 points de `select.ts`** —

```ts
export function createSelectTool(ctx: ToolContext, cellDrop?: CellDrop): SelectionTool {
```

`begin` : `const views = pageViews(); const unit = widen(expandToGroups([hit], views), views);` avec, au début de
la fonction, `const widen = (ids: string[], views: readonly GroupedView[]): string[] => cellDrop?.expand(ids, views) ?? ids;`
(et le même `widen` dans `extend` pour la conversion `tap-shade` → `move`). `close` :

```ts
      const m = matrixOf(d);
      if (isIdentity(m)) return;
      // personnalisation-3 (DA3) : un déplacement lâché sur une case se loge ; sinon la Transform d'aujourd'hui.
      const placed = d.mode === "move" ? (cellDrop?.drop(selection, m, d.x, d.y, ctx.alt?.() === true) ?? null) : null;
      ctx.run(placed ?? { type: "Transform", ids: [...selection], matrix: m });
```

`live` : dans l'objet `overlay`, `target: dragging && d?.mode === "move" ? (cellDrop?.target(selection, d.x, d.y) ?? null) : null,`.
Import : `import type { CellDrop } from "./cell-drop";`. En-tête du fichier : une ligne « personnalisation-3 (DA3) : glisser vers une case par `cell-drop.ts`, 4 points d'appel ».

- [ ] **8. Calque** — `overlay.ts` : `/** personnalisation-3 : cadre de la case visée (monde), ou null. */ readonly target?: Bounds | null;` ; `mergeOverlays` : `target: present.find((p) => (p.target ?? null) !== null)?.target ?? null` ; `isEmptyOverlay` : `&& (o.target ?? null) === null`. `canvas2d.ts`, dans `paintOverlayChrome`, après le bloc `band` :

```ts
    if (o.target) {
      // personnalisation-3 (D32) : case visée, cadre plein de 2 px écran, couleur d'accent.
      ctx.save();
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 2 * px;
      ctx.setLineDash([]);
      box(o.target);
      ctx.stroke();
      ctx.restore();
    }
```

- [ ] **9. Branchement** — `board-session.ts:371` : `select: (ctx) => createSelectTool(ctx, createCellDrop(ctx, measure)),` et l'import de `createCellDrop`.

- [ ] **10. Test de `select.test.ts`** (effet de bord « Alt : Transform seul » déjà dans `cell-drop.test.ts`) : ajouter un cas « sans cellDrop : un objet lâché sur un tableau est posé par-dessus (Transform) » avec le `setup()` existant, un `AddTable` et un `rect`, glisser sur le tableau, `expect(runs.at(-1)?.type).toBe("Transform")`.

- [ ] **11. Vert** — commande bornée de la tâche (N ≥ 8), tests à garder verts, `tsc`.

- [ ] **12. Commit** — `git add` un par un des 11 fichiers de la liste, message `feat(web): drop objects into table cells from the select tool (cell-drop)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T4 — Essai navigateur du lot A (noyau) + `verifier.sh --e2e` + captures 2x

<a id="tache-t4"></a>

**Objectif** : prouver S1 et S4 (noyau) au doigt dans Chromium, sur l'application construite ; brancher l'essai dans le
bloc `--e2e` ; produire la capture 2x « photo glissée dans une case qui s'agrandit », jamais réécrite par un
`verifier.sh --e2e` ordinaire.

**Fichiers**
- Créer : `scripts/essais/personnalisation-3-tableau-navigateur.mjs`
- Modifier : `scripts/verifier.sh:118` (ligne après `c10b-tableau-navigateur.mjs`)
- Créer (avec `--captures`) : `docs/design/captures/personnalisation-3-tableau/photo-case-agrandie.png`

**Interfaces**
- Consomme : `scripts/essais/commun.mjs` (`DIST`, `Echec`, `ROOT`, `VIEWPORT`, `coqueCsp`, `dropFile`, `frames`, `gitSha`, `item`, `loadPlaywright`, `serve`, `solidPng`, `stageBox`, `stageMouse`) ; attributs `#stage[data-bounds|data-selection|data-camera|data-table]` ; picker `button[aria-label="3 colonnes, 3 lignes"]`.
- Produit : `scenario(page, url, { captures, tmp })` avec un bloc par scénario, `check(cond, msg)`, `touchDrag(a, b)` (vrai toucher par CDP `Input.dispatchTouchEvent`), `boundsOf()`, `selectAt(pt)`, `capture(nom)` ; les tâches T6 à T9 ajoutent leur bloc à la fin de `scenario`.
- Réutilise : `scripts/essais/c10b-tableau-navigateur.mjs` — gabarit (`main`, `serve`, CSP, routes bloquées, `--captures`) recopié, pas importé.
- Le rapport porte `Réutilisation : appelé commun.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/personnalisation-3-tableau-navigateur.mjs 2>&1 | tail -15
```

Attendu : lignes `ok — S1 : …` (≥ 4), `ok — S4 : …` (≥ 1), puis `personnalisation-3 tableau : OK`, code 0. Puis
`bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` (vert) et
`node scripts/essais/personnalisation-3-tableau-navigateur.mjs --captures 2>&1 | tail -3` (ligne `capture : …photo-case-agrandie.png`).
Essais à garder verts (zone voisine) : `node scripts/essais/c10b-tableau-navigateur.mjs 2>&1 | tail -2` et
`node scripts/essais/c10a-tableau-navigateur.mjs 2>&1 | tail -2` (`OK`).

**Preuve visuelle** : lectures d'abord — `#stage[data-bounds]` de l'image = coin du tableau + (248, 72, 648, 372) ;
du tableau sélectionné = largeur 896, hauteur 444 ; `data-selection="2"` (tableau et image). Puis la capture 2x à
décrire dans le rapport : tableau 3 × 3, colonne du milieu large, image sombre dans la case (1, 1), cadre de sélection.

**Contraintes (recopiées)** : G1 (le test est l'essai : écrit avant, vu rouge sur la construction d'avant T3 si elle est
disponible, sinon vu rouge en visant une valeur fausse puis corrigé) ; G2 worktree partagé ; G3 preuves bornées ; G8
tactile d'abord : le glisser de S1 et S4 est un **vrai toucher** (CDP), jamais un glisser HTML5 ; G9 essais `data-item`
existants verts sans réécriture ; G10 interdits ; G11 commits ; captures : seulement avec `--captures`, échelle 2
(`deviceScaleFactor: 2`), sous `docs/design/captures/personnalisation-3-tableau/` ; la ligne de `verifier.sh` n'a aucune
option de capture.

**Interdits** : ne pas changer le moteur pour faire passer l'essai ; si le moteur réserve le doigt au déplacement de la
vue avec l'outil Sélection, s'arrêter et le rapporter (écart au cadrage S1), sans repli sur la souris.

**Terminé quand** : l'essai affiche `OK`, `verifier-e2e.test.sh` est vert, la capture existe et est décrite, c10a et c10b
restent `OK`, un commit.

#### Étapes

- [ ] **1. Écrire l'essai** — `scripts/essais/personnalisation-3-tableau-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai personnalisation-3 « objets dans les cases du tableau » au navigateur (lot A : S1, S4 ; T6 à T9 ajoutent S2, S3, S5).
// Application construite (apps/web/dist) servie en local avec la CSP de la coque, Chromium headless de Playwright, vrai
// toucher (CDP Input.dispatchTouchEvent), mode repli, heure figée. Oracles : #stage[data-bounds|data-selection|data-table].
// Lancé par scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/personnalisation-3-tableau-navigateur.mjs [--captures]
//   (--captures : échelle 2, docs/design/captures/personnalisation-3-tableau/*.png).
import { existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, VIEWPORT, coqueCsp, dropFile, frames, gitSha, item, loadPlaywright, serve, solidPng, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "personnalisation-3 tableau";
const FIXED = new Date("2026-11-27T08:00:00.000Z");
// Même point que C10b : sous la rangée contextuelle de l'îlot d'outils à 1280 px.
const CLICK = [200, 230];
const COL = 240;
const ROW = 64;
const CAPTURES = join(ROOT, "docs", "design", "captures", "personnalisation-3-tableau");

async function scenario(page, url, { captures }) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const check = (cond, msg) => {
    if (!cond) throw new Echec(msg);
    console.log(`ok — ${msg}`);
  };
  const fr = () => frames(page);
  const mouse = stageMouse(page);
  const attr = (name) => page.getAttribute("#stage", name);
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = (c, wx, wy) => [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  const boundsOf = async () => ((await attr("data-bounds")) ?? "").split(",").map(Number);
  const near = (a, b) => Math.abs(a - b) <= 0.5;
  const cdp = await page.context().newCDPSession(page);
  /** Vrai toucher (G8) : un doigt posé en `a`, glissé en `steps` pas, levé en `b` (px de la scène). */
  const touchDrag = async (a, b, steps = 8) => {
    const box = await stageBox(page);
    const pt = (p) => ({ x: box.x + p[0], y: box.y + p[1], id: 1, radiusX: 4, radiusY: 4, force: 0.5 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(a)] });
    for (let i = 1; i <= steps; i++) {
      const p = [a[0] + ((b[0] - a[0]) * i) / steps, a[1] + ((b[1] - a[1]) * i) / steps];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(p)] });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await fr();
  };
  const selectAt = async (p) => {
    await mouse.click(p[0], p[1]);
    await fr();
  };
  const capture = async (nom) => {
    if (!captures) return;
    mkdirSync(CAPTURES, { recursive: true });
    const path = join(CAPTURES, `${nom}.png`);
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  };

  await page.goto(url);
  await page.waitForSelector("#stage");
  await fr();
  const c = await camera();
  const origin = [(CLICK[0] - c.tx) / c.zoom, (CLICK[1] - c.ty) / c.zoom];
  const cellPt = (row, col, w = COL, h = ROW) => screen(c, origin[0] + w * col + w / 2, origin[1] + h * row + h / 2);

  // Tableau 3 × 3 au point CLICK (gabarit C10b), puis image 400 × 300 hors du tableau.
  await page.click(item("table"));
  await fr();
  await mouse.click(CLICK[0], CLICK[1]);
  await page.waitForSelector(".rb-table-picker:not([hidden])", { timeout: 5000 });
  await page.click('button[aria-label="3 colonnes, 3 lignes"]');
  await page.keyboard.press("Escape");
  await fr();
  const imageAt = screen(c, origin[0] + 3 * COL + 400, origin[1] + 3 * ROW + 300);
  await dropFile(page, "#stage", "photo.png", solidPng(400, 300, [30, 60, 90]), "image/png", imageAt);
  await fr();
  await page.click(item("select"));
  await fr();

  // S1 : glisser l'image au doigt sur la case (1, 1) : colonne 416, ligne 316, image dans la boîte intérieure.
  await touchDrag(imageAt, cellPt(1, 1));
  await selectAt(screen(c, origin[0] + COL + 8 + 200, origin[1] + ROW + 8 + 150));
  const [ix0, iy0, ix1, iy1] = await boundsOf();
  check(near(ix0, origin[0] + 248) && near(iy0, origin[1] + 72) && near(ix1, origin[0] + 648) && near(iy1, origin[1] + 372), `S1 : l'image remplit la boîte intérieure de la case (1, 1) (data-bounds ${ix0},${iy0},${ix1},${iy1})`);
  await selectAt(cellPt(0, 0));
  const [tx0, ty0, tx1, ty1] = await boundsOf();
  check(near(tx1 - tx0, 896) && near(ty1 - ty0, 444), `S1 : le tableau fait 896 × 444 (colonne 1 à 416, ligne 1 à 316)`);
  check((await attr("data-selection")) === "2", 'S1 : sélectionner le tableau prend son image logée (data-selection="2")');
  await capture("photo-case-agrandie");
  await page.keyboard.press("Control+z");
  await fr();
  await selectAt(cellPt(0, 0));
  const [ux0, uy0, ux1, uy1] = await boundsOf();
  check(near(ux1 - ux0, 720) && near(uy1 - uy0, 192) && (await attr("data-selection")) === "1", "S1 : Ctrl+Z : tout revient en une fois (720 × 192, image libre)");
  await page.keyboard.press("Control+y");
  await fr();
  await page.keyboard.press("Escape");
  await fr();

  // S4 : glisser l'image hors du tableau au doigt : elle est libre.
  const inCell = screen(c, origin[0] + COL + 8 + 200, origin[1] + ROW + 8 + 150);
  const outside = screen(c, origin[0] + 3 * COL + 700, origin[1] + 600);
  await touchDrag(inCell, outside);
  await selectAt(cellPt(0, 0));
  check((await attr("data-selection")) === "1", 'S4 : l\'image sortie est libre : sélectionner le tableau ne la prend plus (data-selection="1")');
  await page.keyboard.press("Escape");
  await fr();

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
  const captures = process.argv.includes("--captures");
  const server = await serve({ headers: { "Content-Security-Policy": coqueCsp() } });
  const port = server.address().port;
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-p3-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: captures ? 2 : 1, hasTouch: true, acceptDownloads: true });
    const external = [];
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === "127.0.0.1") return route.continue();
      external.push(u.href);
      return route.abort();
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(FIXED);
    await scenario(page, `http://127.0.0.1:${port}/?fichiers=repli`, { captures, tmp });
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

Le contrôle S1 se fait en sélectionnant l'image par un clic en son centre (coin de la boîte intérieure + 200, + 150). Si `dropFile` place l'image par son coin et non
par son centre (`c2-image-navigateur.mjs:93-99`), décaler `inCell` en conséquence, pas les valeurs attendues.

- [ ] **2. Rouge** — sur la construction courante, inverser un oracle (`896` → `897`) : l'essai échoue avec `ÉCHEC — S1 : le tableau fait …` ; remettre `896`.

- [ ] **3. Vert** — commande bornée de la tâche ; puis `--captures` ; ouvrir la capture (outil Read) et la décrire.

- [ ] **4. `verifier.sh`** — après `node scripts/essais/c10b-tableau-navigateur.mjs` : `node scripts/essais/personnalisation-3-tableau-navigateur.mjs` (sans option). `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` : vert.

- [ ] **5. Commit** — `git add scripts/essais/personnalisation-3-tableau-navigateur.mjs`, `git add scripts/verifier.sh`, `git add docs/design/captures/personnalisation-3-tableau/photo-case-agrandie.png` ; message `test(e2e): personnalisation-3 browser run for objects in table cells (S1, S4)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T5 — Compléments du socle : montée dans la pile, renumérotation à la copie, gomme qui garde `cell`

<a id="tache-t5"></a>

**Objectif** : un objet posé avant le tableau monte au-dessus de lui à la mise en case ; copier, dupliquer une page ou
insérer des pages relie les objets copiés au tableau copié ; un morceau de gomme garde le lien.

**Fichiers**
- Modifier : `crates/roomboard-core/src/table_links.rs` (`cmd_place_in_cell` : montée ; tests)
- Modifier : `crates/roomboard-core/src/copy.rs:61-90` (`copy_elements` : ids générés d'abord, `cell[0]` remplacé)
- Modifier : `crates/roomboard-core/src/commands.rs:1565-1612` (`Cut` garde `cell`)
- Modifier : `apps/web/src/core/fake-core.ts:571-585` (`copyElement`), `:897`, `:1822`, `:1835` (appels), `PlaceInCell` (montée)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (2 tests « personnalisation-3 copie »)

**Interfaces**
- Consomme (T1, T2) : `cmd_place_in_cell`, `read_cell_link`, `cell_link_to_any`, `FakeElement.cell`.
- Produit : `copy_elements` (même signature) relie `cell[0]` à l'id neuf du tableau copié dans le même appel, retire `cell` si le tableau n'est pas copié ; `PlaceInCell` monte les `ids` situés sous le tableau visé juste au-dessus de lui (après l'écriture de `matrix` et `cell`) ; fake : `copyElement(e, groups, dx, dy, ids?: ReadonlyMap<string, string>)`.
- Réutilise : `crates/roomboard-core/src/copy.rs:96` `reinsert_kept(arr, txn, moves, to)` — appelé après l'écriture de `matrix` et `cell` (réutiliser).
- Réutilise : `crates/roomboard-core/src/copy.rs:61` `copy_elements`, `:75` `renumber` — ids générés d'abord, puis `cell[0]` remplacé (étendre).
- Réutilise : `crates/roomboard-core/src/commands.rs:1575` (copie de `group` dans la gomme) — même copie pour `cell` (étendre).
- Le rapport porte une ligne `Réutilisation : …` par module.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && nice -n 10 cargo test -p roomboard-core -j 4 -- duplicate_page_keeps_cell_links object_below_its_table_is_relinked partial_erase_keeps_cell place_in_cell_lifts_object_above_table 2>&1 | tail -20
```

Attendu : `4 passed`. Puis `pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "personnalisation-3 copie" 2>&1 | tail -6` (≥ 2 × 2 fabriques), tests à garder verts : `cargo test -p roomboard-core copy` et contrat C3 (`-t "C3"`). Commande M : ≤ 1 540 000 o.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G4 module mesuré (commande M) ; G5 U3 ;
G9 hors tableau inchangé (copie sans objet logé : octets et ids comme aujourd'hui) ; G10 interdits ; G11 commits ; G12
une transaction.

**Interdits** : ne pas toucher `cmd_restack` ; ne pas recopier `reinsert_kept`.

**Patron à ne pas reprendre** : renuméroter `cell[0]` au fil de la recopie (élément par élément) : un objet passé sous
son tableau par `Restack` est recopié avant lui, l'id neuf du tableau n'existe pas encore. Générer **tous** les ids
neufs d'abord (table ancien → neuf des éléments copiés), puis recopier (cadrage carte d'impact, `copy.rs:61-90`).
Référence : `crates/roomboard-core/src/copy.rs:61-90`. Et monter l'objet **avant** d'écrire `cell` : la recopie de
`reinsert_kept` emporte tous les champs, le lien écrit après serait perdu sur l'ancienne entrée (D3).

**Terminé quand** : les 4 tests Rust et les 2 du contrat passent, tests à garder verts, taille rapportée, un commit.

#### Étapes

- [ ] **1. Tests rouges** (dans `table_links.rs`, module `tests`) :

```rust
    #[test]
    fn duplicate_page_keeps_cell_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        d.apply(Command::DuplicatePage { page: p.clone() }).expect("dup");
        let p2 = d.page_ids().into_iter().find(|x| *x != p).expect("page 2");
        let ids = d.element_ids(&p2);
        let t2 = ids.iter().find(|id| d.element(id).is_some_and(|v| v.kind == "table")).expect("t2").clone();
        let o2 = ids.iter().find(|id| d.element(id).is_some_and(|v| v.kind == "shape")).expect("o2").clone();
        let l = d.element(&o2).and_then(|v| v.cell).expect("lien copié");
        assert_eq!(l[0], t2);
        assert_eq!(&l[1..], &link(&d, &t, 1, 1)[1..]);
    }

    #[test]
    fn object_below_its_table_is_relinked() {
        let mut d = Document::blank();
        let p = first(&d);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let t = table3(&mut d, &p);
        d.apply(Command::PlaceInCell { ids: vec![o.clone()], matrix: IDENTITY, cell: Some(link(&d, &t, 0, 0)), sizes: vec![] }).expect("logé");
        d.apply(Command::Restack { ids: vec![o.clone()], to: 0 }).expect("dessous");
        d.apply(Command::DuplicatePage { page: p.clone() }).expect("dup");
        let p2 = d.page_ids().into_iter().find(|x| *x != p).expect("page 2");
        let ids = d.element_ids(&p2);
        let t2 = ids.iter().find(|id| d.element(id).is_some_and(|v| v.kind == "table")).expect("t2").clone();
        assert_eq!(d.element(&ids[0]).and_then(|v| v.cell).map(|l| l[0].clone()), Some(t2));
    }

    #[test]
    fn place_in_cell_lifts_object_above_table() {
        let mut d = Document::blank();
        let p = first(&d);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let t = table3(&mut d, &p);
        place11(&mut d, &t, &o);
        let ids = d.element_ids(&p);
        assert_eq!(ids, vec![t.clone(), o.clone()]);
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 1, 1)));
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![o, t]);
    }
```

et dans les tests de `commands.rs` (près des tests de gomme partielle) :

```rust
    #[test]
    fn partial_erase_keeps_cell() {
        let mut d = Document::blank();
        let p = first(&d);
        let s = commit(&mut d, &p, 200.0); // trait horizontal (aide de test existante de la gomme)
        let t = d.apply(Command::AddTable { page: p.clone(), x: 0.0, y: 0.0, cols: 1, rows: 1, col_width: 2000.0, row_height: 400.0, color: "#000000".into(), size: 36.0 }).expect("t").ids[0].clone();
        let v = d.element(&t).and_then(|v| v.table).expect("vue");
        let l = [t.clone(), v.rows[0].id.clone(), v.cols[0].id.clone()];
        d.apply(Command::PlaceInCell { ids: vec![s.clone()], matrix: IDENTITY, cell: Some(l.clone()), sizes: vec![] }).expect("logé");
        let c = d.apply(Command::Erase { page: p.clone(), path: vec![300.0, 180.0, 300.0, 220.0], radius: 8.0, mode: EraseMode::Partial }).expect("gomme");
        assert!(c.ids.len() >= 2);
        assert!(c.ids.iter().all(|id| d.element(id).and_then(|v| v.cell) == Some(l.clone())));
    }
```

Si l'aide de trait des tests de gomme porte un autre nom que `commit`, prendre celle du test de gomme partielle le plus
proche ; garder les assertions.

- [ ] **2. Rouge** — commande bornée : 4 échecs (lien absent, ordre de pile).

- [ ] **3. `copy_elements`** :

```rust
    // personnalisation-3 : ids neufs générés d'abord (un objet passé sous son tableau est recopié avant lui), puis
    // `cell[0]` remplacé par l'id neuf du tableau copié ; tableau absent de la copie : lien retiré.
    let fresh: HashMap<String, String> = from
        .iter()
        .filter_map(|e| out_string(e.get(src, "id")).map(|old| (old, yrs::uuid_v4().to_string())))
        .collect();
    let mut out = Vec::with_capacity(from.len());
    for e in from {
        let mut prelim = e.as_prelim(src);
        let id = out_string(e.get(src, "id")).and_then(|old| fresh.get(&old).cloned()).unwrap_or_else(|| yrs::uuid_v4().to_string());
        prelim.insert("id".into(), In::from(id.as_str()));
        if let Some(g) = prelim.get("group").and_then(|g| renumber(g, ids)) {
            prelim.insert("group".into(), g);
        }
        match crate::element::read_cell_link(src, e) {
            Some(mut l) => match fresh.get(&l[0]) {
                Some(t) => {
                    l[0] = t.clone();
                    prelim.insert("cell".into(), In::Any(crate::element::cell_link_to_any(&l)));
                }
                None => {
                    prelim.remove("cell");
                }
            },
            None => {}
        }
        // (translation de transform et insertion : inchangées)
```

Retirer le `prelim.remove("cell")` inconditionnel posé par T1. Une valeur `cell` illisible est recopiée telle quelle (U3).

- [ ] **4. Montée dans `cmd_place_in_cell`** — dans le bloc d'écriture, après la boucle `matrix`/`cell`, si `cell` est
`Some(l)` : relire dans `txn` les index de la page (`self.page_elements(&*txn, &page)`), l'index `ti` du tableau `l[0]`,
les index des `ids` inférieurs à `ti` ; si non vide, construire `moves: Vec<(u32, MapPrelim)>` par
`elements.get(&*txn, i)` → `Out::YMap(m)` → `m.as_prelim(&*txn)` (dans l'ordre croissant), et appeler
`crate::copy::reinsert_kept(&elements, &mut txn, moves, ti + 1 - n)` où `n` est leur nombre (le tableau descend de `n`
quand ils sont retirés). Le changement ne change pas.

- [ ] **5. Gomme** — dans `Cut`, ajouter `cell: Option<Any>` lu comme `group` ; à l'écriture des morceaux, `if let Some(c) = &cut.cell { prelim.insert("cell".into(), In::Any(c.clone())); }` avec le commentaire « personnalisation-3 : un morceau reste dans la case du trait coupé ».

- [ ] **6. Faux cœur** — `copyElement(e, groups, dx, dy, ids?)` : si `e.cell` et `ids?.get(e.cell[0])` : `cell: [neuf, e.cell[1], e.cell[2]]`, sinon sans `cell`. Les trois appelants (`:897`, `:1822`, `:1835`) construisent d'abord `const ids = new Map(elements.map((e) => [e.id, newId()]))`, et `copyElement` prend l'id neuf dans `ids` au lieu de `newId()`. Dans `PlaceInCell`, après la boucle d'écriture, si `target !== null` : retirer de `p.elements` les placés d'index inférieur à celui du tableau et les réinsérer juste au-dessus de lui, ordre gardé.

- [ ] **7. Contrat** — dans le bloc `personnalisation-3` :

```ts
  it("personnalisation-3 copie : DuplicatePage relie l'objet copié au tableau copié", () => {
    const d = f.blank();
    const s = placed(d);
    place11(d, s);
    const p = first(d);
    d.apply({ type: "DuplicatePage", page: p });
    const p2 = d.pageIds().find((x) => x !== p) ?? "";
    const ids = d.elementIds(p2);
    const t2 = ids.find((id) => d.element(id)?.kind === "table");
    const o2 = ids.find((id) => d.element(id)?.kind === "shape") ?? "";
    expect(d.element(o2)?.cell?.[0]).toBe(t2);
    d.free();
  });

  it("personnalisation-3 copie : PlaceInCell monte un objet posé avant le tableau", () => {
    const d = f.blank();
    const p = first(d);
    const o = d.apply({ type: "AddShape", page: p, shape: "rect", x0: 1000, y0: 1000, x1: 1100, y1: 1100, style, fill: null }).ids[0] ?? "";
    const t = addTable(d, p, { x: 0, y: 0, cols: 3, rows: 3 });
    const v = tableOf(d, t);
    d.apply({ type: "PlaceInCell", ids: [o], matrix: [1, 0, 0, 1, 0, 0], cell: [t, v.rows[0]?.id ?? "", v.cols[0]?.id ?? ""], sizes: [] });
    expect(d.elementIds(p)).toEqual([t, o]);
    d.free();
  });
```

- [ ] **8. Vert, mesure, commit** — commandes bornées, commande M, puis `git add` un par un (`crates/roomboard-core/src/table_links.rs`, `crates/roomboard-core/src/copy.rs`, `crates/roomboard-core/src/commands.rs`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts`), message `feat(core): relink copied cell objects, lift placed objects, keep cell on erase` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T6 — Sortie qui réduit la case quittée (D11) + raccourcis Alt+Entrée / Alt+Maj+Entrée

<a id="tache-t6"></a>

**Objectif** : sortir un objet (ou le passer dans une autre case) ramène la ligne et la colonne quittées à leur taille
exigée quand elles valaient celle que l'objet imposait (± 0,5) ; une taille réglée à la main n'est jamais réduite ; au
clavier, Alt+Entrée loge la sélection dans la case sous son centre, Alt+Maj+Entrée la sort.

**Fichiers**
- Modifier : `apps/web/src/engine/tools/cell-drop.ts` (`drop` : réduction ; `place`), `cell-drop.test.ts`
- Modifier : `apps/web/src/engine/tools/tool.ts:49-54` (`SelectionTool.placeInCell?`), `apps/web/src/engine/tools/select.ts` (`placeInCell`, 3 lignes)
- Modifier : `apps/web/src/engine/input/keys.ts` (`cellKey`), `apps/web/src/engine/input/keys.test.ts`
- Modifier : `apps/web/src/engine/engine.ts:859` (routage avant `orderKey`)
- Modifier : `apps/web/src/ui/shortcuts.ts` (2 lignes)
- Modifier : `scripts/essais/personnalisation-3-tableau-navigateur.mjs` (blocs S4 et S1 clavier)

**Interfaces**
- Consomme (T3) : `CellDrop`, `requiredSizes`, `LinkedBox`, `PlaceInCell`.
- Produit :

```ts
// keys.ts
export type CellKey = "place" | "unplace" | "fit" | "cell-image";
/** personnalisation-3 (H12) : Alt+Entrée, Alt+Maj+Entrée, Alt+F, Alt+I ; par `code` (Alt change `key` sous macOS) ; hors champ, hors IME, sans Ctrl ni Cmd. */
export function cellKey(e: KeyLike): CellKey | null;
// KeyLike gagne : readonly code?: string;
// tool.ts, SelectionTool :
  /** personnalisation-3 : loge la sélection dans la case sous son centre (out : la sort) ; false si rien à faire. */
  placeInCell?(out: boolean): boolean;
```

- Réutilise : `apps/web/src/engine/table-geom.ts` `requiredSizes` (T3) — taille exigée de la case quittée (D11, D34).
- Le rapport porte `Réutilisation : appelé requiredSizes` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée**

```bash
cd /home/adminjd/projets/roomboard-wt/personnalisation-3-tableau && pnpm --filter @roomboard/web exec vitest run src/engine/tools/cell-drop.test.ts src/engine/input/keys.test.ts -t "D11|cellKey|Alt\+Entrée" 2>&1 | tail -20
```

Attendu : N ≥ 5 passés, noms `D11 : sortir ramène la colonne à 240 et la ligne à 64`, `cellKey` présents. Tests à garder
verts : `vitest run src/engine` (5 dernières lignes), `tsc --noEmit`. Puis build web et essai :
`… && node scripts/essais/personnalisation-3-tableau-navigateur.mjs 2>&1 | tail -6` avec `ok — S4 : la colonne revient à 240`.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G7 Sélection : point d'entrée court
(`placeInCell` délègue à `cellDrop.place`) ; G8 chaque geste a un raccourci ; G9 hors tableau inchangé (Alt+Entrée sans
tableau sous le centre : la touche passe) ; G10 interdits ; G11 commits ; G12 une étape : la réduction de la case
quittée et l'agrandissement de la case visée vont dans **une** `PlaceInCell` (D11).

**Interdits** : Alt+← jamais utilisé (retour du navigateur) ; aucune réduction d'une taille différente de celle que
l'objet imposait.

**Terminé quand** : tests bornés verts, essai `OK` avec la ligne S4 neuve, un commit.

#### Étapes

- [ ] **1. Tests rouges** (`cell-drop.test.ts`) :

```ts
  it("D11 : sortir ramène la colonne à 240 et la ligne à 64 (une seule PlaceInCell)", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [1448, 222]);
    const cmd = s.runs.at(-1);
    expect(cmd?.type === "PlaceInCell" && cmd.sizes.length).toBe(2);
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 240, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 64, 64]);
  });

  it("D11 : une colonne élargie à la main ne bouge pas", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    const col = s.t().cols[1]?.id ?? "";
    s.doc.apply({ type: "SetTableLineSizes", id: s.table, cols: [[col, 500]], rows: [] });
    s.move([448, 222], [1600, 222]);
    expect(s.t().cols[1]?.width).toBe(500);
  });

  it("D11 : vers une autre case : la quittée revient, la visée grandit, une étape", () => {
    const s = setup();
    s.move([1200, 1150], [360, 96]);
    s.move([448, 222], [120, 400]);
    expect(s.t().cols.map((c) => c.width)).toEqual([416, 240, 240]);
    expect(s.t().rows.map((r) => r.height)).toEqual([64, 64, 316]);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 8, y0: 136, x1: 408, y1: 436 });
    s.doc.undo();
    expect(s.t().cols.map((c) => c.width)).toEqual([240, 416, 240]);
  });

  it("Alt+Entrée : place loge la sélection dans la case sous son centre ; Alt+Maj+Entrée la sort", () => {
    const s = setup();
    s.doc.apply({ type: "Transform", ids: [s.image], matrix: [1, 0, 0, 1, -800, -1100] }); // centre en (400, 50) : case (0, 1)
    expect(s.drop.place([s.image], false)?.type).toBe("PlaceInCell");
    s.tool.setSelection([s.image]);
    expect(s.tool.placeInCell?.(false)).toBe(true);
    expect(s.doc.element(s.image)?.cell?.[2]).toBe(s.t().cols[1]?.id);
    expect(s.tool.placeInCell?.(true)).toBe(true);
    expect(s.doc.element(s.image)?.cell).toBeUndefined();
  });
```

et dans `keys.test.ts` :

```ts
  it("cellKey (H12) : Alt+Entrée, Alt+Maj+Entrée, Alt+F, Alt+I ; Ctrl ou champ : null", () => {
    const k = (o: Partial<KeyLike>): KeyLike => ({ key: "", code: "", ctrlKey: false, metaKey: false, shiftKey: false, altKey: true, isComposing: false, target: null, ...o });
    expect(cellKey(k({ key: "Enter", code: "Enter" }))).toBe("place");
    expect(cellKey(k({ key: "Enter", code: "Enter", shiftKey: true }))).toBe("unplace");
    expect(cellKey(k({ key: "ƒ", code: "KeyF" }))).toBe("fit");
    expect(cellKey(k({ key: "i", code: "KeyI" }))).toBe("cell-image");
    expect(cellKey(k({ key: "Enter", code: "Enter", ctrlKey: true }))).toBeNull();
    expect(cellKey(k({ key: "Enter", code: "Enter", target: { tagName: "TEXTAREA" } }))).toBeNull();
  });
```

- [ ] **2. Rouge** — commande bornée : échecs (tailles 416 gardées, `cellKey` absent).

- [ ] **3. Réduction dans `cell-drop.ts`** — ajouter :

```ts
  /** D11 : tailles de la case quittée par `selection` (lien commun) qui reviennent à la taille exigée sans elle, si
   *  elles valent celle que la sélection imposait (± 0,5) ; une taille réglée à la main n'est jamais réduite. */
  const shrinkLeft = (selection: readonly string[]): LineSize[] => {
    const link = views(selection).find((v) => v.cell !== undefined)?.cell;
    const tv = link === undefined ? null : ctx.doc.element(link[0]);
    if (link === undefined || tv?.kind !== "table") return [];
    const t = tv.table;
    const r = t.rows.findIndex((x) => x.id === link[1]);
    const k = t.cols.findIndex((x) => x.id === link[2]);
    const box = ctx.doc.bounds(selection);
    const local = box === null ? null : localBox(tv.transform, box);
    const row = t.rows[r];
    const col = t.cols[k];
    if (row === undefined || col === undefined || local === null) return [];
    const others: LinkedBox[] = ctx.doc.elementIds(ctx.page()).flatMap((id) => {
      const v = selection.includes(id) ? null : ctx.doc.element(id);
      const b = v?.cell?.[0] === link[0] ? ctx.doc.bounds([id]) : null;
      const lb = b === null ? null : localBox(tv.transform, b);
      return v?.cell === undefined || lb === null ? [] : [{ row: v.cell[1], col: v.cell[2], w: lb.x1 - lb.x0, h: lb.y1 - lb.y0 }];
    });
    const widths = t.cols.map((c) => c.width);
    const mine = { row: row.id, col: col.id, w: local.x1 - local.x0, h: local.y1 - local.y0 };
    const withMe = requiredSizes(t, [...others, mine], widths, measure);
    const out: LineSize[] = [];
    const colWithout = Math.max(requiredSizes(t, others, widths, measure).cols[k] ?? 0, TABLE_COL_WIDTH);
    if (Math.abs(col.width - (withMe.cols[k] ?? 0)) <= 0.5 && colWithout < col.width) out.push([link[0], "col", col.id, colWithout]);
    const narrowed = widths.map((w, i) => (i === k && out.length > 0 ? colWithout : w));
    const without = requiredSizes(t, others, narrowed, measure);
    const rowWithout = Math.max(without.rows[r] ?? 0, TABLE_ROW_HEIGHT);
    if (Math.abs(row.height - (withMe.rows[r] ?? 0)) <= 0.5 && rowWithout < row.height) out.push([link[0], "row", row.id, rowWithout]);
    // Colonne réduite : ses textes se replient, les lignes touchées reprennent leur hauteur exigée (D11, D13).
    if (out.length > 0 && out[0]?.[1] === "col") {
      t.rows.forEach((x, i) => {
        const need = without.rows[i] ?? x.height;
        if (i !== r && need > x.height) out.push([link[0], "row", x.id, need]);
      });
    }
    return out;
  };
```

(`TABLE_COL_WIDTH`, `TABLE_ROW_HEIGHT` importés de `table-geom`.) Dans `drop` : la branche « sortie » rend
`{ type: "PlaceInCell", ids, matrix, cell: null, sizes: shrinkLeft(selection) }` ; `placeInto` concatène
`shrinkLeft(selection)` (si la case quittée diffère de la visée) avant ses propres tailles, la case visée gardant le
dernier mot pour une même ligne. **Le coin visé se calcule sur les tailles après réduction** : appliquer les
tailles de `shrinkLeft` à une copie de `hit.table` (`cols`, `rows`) avant `cellRect` et `requiredSizes` (test « vers une
autre case » : image posée en (8, 136), pas en (8, 388)). `place(selection, out)` : `out` → même sortie avec la matrice identité si un lien existe,
sinon `null` ; sinon centre de `ctx.doc.bounds(selection)` → `aimed(...)` → `placeInto`.

- [ ] **4. Sélection, touches, moteur** — `tool.ts` : membre `placeInCell?` (Interfaces). `select.ts` :

```ts
    placeInCell(out) {
      const cmd = cellDrop?.place(selection, out) ?? null;
      return cmd !== null && ctx.run(cmd) !== null;
    },
```

`keys.ts` : `KeyLike.code?` puis :

```ts
export type CellKey = "place" | "unplace" | "fit" | "cell-image";
/** personnalisation-3 (H12) : Alt+Entrée loger, Alt+Maj+Entrée sortir, Alt+F agrandir / rétrécir, Alt+I fond de case ;
 *  par `code` (Alt change `key` sous macOS) ; hors champ, hors IME, sans Ctrl ni Cmd (Alt Gr = Ctrl+Alt refusé). */
export function cellKey(e: KeyLike): CellKey | null {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.isComposing || inEditable(e.target)) return null;
  const code = e.code ?? "";
  if (code === "Enter" || e.key === "Enter") return e.shiftKey ? "unplace" : "place";
  if (e.shiftKey) return null;
  if (code === "KeyF") return "fit";
  if (code === "KeyI") return "cell-image";
  return null;
}
```

`engine.ts`, avant `const order = orderKey(e);` :

```ts
      const ck = cellKey(e);
      if (ck !== null && tool === "select" && (ck === "place" || ck === "unplace")) {
        // personnalisation-3 (H12) : la touche passe s'il n'y a rien à loger ou à sortir.
        if (selectTool.placeInCell?.(ck === "unplace") === true) return true;
      }
```

(`fit` et `cell-image` : routés par T7 et T9.) `shortcuts.ts` : `s("cell-place", "Tableau", "Loger la sélection dans la case", "Alt+Entrée"),` et `s("cell-unplace", "Tableau", "Sortir la sélection de sa case", "Alt+Maj+Entrée"),` (même forme que les lignes voisines ; `icons.test.ts`/`shortcuts.test.ts` : ajuster seulement un compte s'il en existe un).

- [ ] **5. Essai** — dans le bloc S4, après « l'image sortie est libre » :

```js
  const [sx0, sy0, sx1, sy1] = await boundsOf();
  check(near(sx1 - sx0, 720) && near(sy1 - sy0, 192), "S4 : la colonne revient à 240 et la ligne à 64 (tableau 720 × 192)");
```

puis un bloc « S1 au clavier » : sélectionner l'image (clic en son centre), la placer au-dessus de la case (1, 1) par un
glisser Alt tenu (`page.keyboard.down("Alt")` … `up("Alt")`, déplacement libre), `page.keyboard.press("Alt+Enter")`,
contrôle des mêmes valeurs que S1 (`896 × 444`), puis `Alt+Shift+Enter` et contrôle `720 × 192`.

- [ ] **6. Vert, commit** — commandes bornées, build web, essai ; `git add` un par un des 9 fichiers, message `feat(web): shrink the left cell on exit, Alt+Enter to place in a cell` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T7 — Point 2 : mode « rétrécir » (`SetTableOptions`, `fit`, Alt+F)

<a id="tache-t7"></a>

**Objectif** : un tableau réglé sur « rétrécir » garde ses cases ; l'objet logé y est réduit à l'échelle uniforme
min(1, boîte intérieure / objet) et posé au coin haut-gauche de la boîte (S2) ; Alt+F en outil Tableau bascule le mode.

**Fichiers** : voir la table (cœur `table.rs`, `table_links.rs`, `commands.rs` ; Wasm ; `api.ts`, `wasm-core.ts`,
`fake-core.ts`, contrat ; CLI `ops.ts`, `ops.test.ts` ; `table-geom.ts` (`TableData.fit`) ; `cell-drop.ts` et test ;
`tools/table.ts` (action `fit-toggle`) ; `keys.ts` déjà prêt (T6) ; `engine.ts` ; `shortcuts.ts` ; essai et capture
`objet-ajuste.png`).

**Interfaces**
- Consomme (T6) : `cellKey(e) === "fit"` ; (T3) `placeInto`.
- Produit :
  - Rust : `Command::SetTableOptions { id: String, fit: Option<String>, header: Option<bool> }` — `fit` : `"shrink"` écrit, `"grow"` retire la clé ; `header` : `true` écrit, `false` retire (dessin de l'en-tête : lot B) ; autre valeur de `fit` → `BadTable` ; rien ne change → aucune étape. `TableView.fit: Option<String>` (`"shrink"` seulement), `TableView.header: bool` (sérialisé `header`, omis si faux par `skip_serializing_if`).
  - Wasm : `set_table_options(id: &str, fit: Option<String>, header: Option<bool>) -> Result<JsValue, JsError>` et `_inner`.
  - TS : `| { readonly type: "SetTableOptions"; readonly id: string; readonly fit?: "grow" | "shrink"; readonly header?: boolean }` ; `TableData.fit?: "shrink"` ; `TableData.header?: boolean` ; `TableAction` gagne `"fit-toggle"`.
  - CLI : `COMMAND_TYPES` + `"SetTableOptions"` (39), `ops.test.ts` → 39 ; `cli-essai.mjs` : un passage `SetTableOptions fit shrink`, relu par `state` (`fit: "shrink"`).
- Réutilise : `apps/web/src/engine/table-geom.ts:225` `cellInnerBox` — boîte intérieure de la mise à l'échelle (réutiliser).
- Le rapport porte `Réutilisation : appelé cellInnerBox` ou `Réutilisation : écart — <pourquoi>`.

**Test et commande bornée** :
`nice -n 10 cargo test -p roomboard-core set_table_options -j 4 2>&1 | tail -10` (≥ 1 test `set_table_options_writes_fit_and_header`) ;
`pnpm --filter @roomboard/web exec vitest run src/engine/tools/cell-drop.test.ts -t "S2" 2>&1 | tail -10` (≥ 1) ;
contrat `-t "SetTableOptions"` (≥ 2) ; `ops.test.ts` 39 ; `cli-essai.mjs` `CLI : OK` ; essai : `ok — S2 : image réduite à 64 × 48`.
Commande M : ≤ 1 540 000 o.

**Preuve visuelle** : lectures d'abord — `data-bounds` de l'image = coin du tableau + (248, 72, 312, 120) (64 × 48) ;
tableau 720 × 192. Puis capture 2x `docs/design/captures/personnalisation-3-tableau/objet-ajuste.png` à décrire.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G4 module mesuré (commande M) ; G5
champs facultatifs (`fit`, `header` absents par défaut) ; G6 CLI (`COMMAND_TYPES`, `ops.test.ts`, `cli-essai.mjs`,
`FORMAT_LOTS` inchangé) ; G8 raccourci Alt+F ; G9 hors tableau inchangé ; G10 interdits ; G11 commits ; G12 une étape.
Captures : seulement avec `--captures`, échelle 2.

**Interdits** : pas de panneau d'options (section `table`, `TableOptions.tsx` : lot B) ; pas de dessin d'en-tête (lot B).

**Terminé quand** : preuves ci-dessus, capture décrite, un commit.

#### Étapes

- [ ] **1. Tests rouges** — Rust (`table_links.rs`) :

```rust
    #[test]
    fn set_table_options_writes_fit_and_header() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        d.apply(Command::SetTableOptions { id: t.clone(), fit: Some("shrink".into()), header: Some(true) }).expect("options");
        assert_eq!(view(&d, &t).fit.as_deref(), Some("shrink"));
        assert!(view(&d, &t).header);
        let v = d.version();
        d.apply(Command::SetTableOptions { id: t.clone(), fit: Some("shrink".into()), header: None }).expect("même");
        assert_eq!(d.version(), v);
        assert_eq!(d.apply(Command::SetTableOptions { id: t.clone(), fit: Some("zz".into()), header: None }), Err(CommandError::BadTable));
        d.apply(Command::SetTableOptions { id: t.clone(), fit: Some("grow".into()), header: Some(false) }).expect("retour");
        assert_eq!(view(&d, &t).fit, None);
        assert!(!view(&d, &t).header);
    }
```

TS (`cell-drop.test.ts`) :

```ts
  it("S2 : rétrécir : la case garde 240 × 64, l'image est réduite à 64 × 48, posée en haut à gauche", () => {
    const s = setup();
    s.doc.apply({ type: "SetTableOptions", id: s.table, fit: "shrink" });
    s.move([1200, 1150], [360, 96]);
    expect(s.t().cols[1]?.width).toBe(240);
    expect(s.t().rows[1]?.height).toBe(64);
    expect(s.doc.bounds([s.image])).toEqual({ x0: 248, y0: 72, x1: 312, y1: 120 });
  });
```

- [ ] **2. Rouge** (deux commandes bornées).
- [ ] **3. Cœur** — `read_raw` lit `fit` (`"shrink"` seulement, sinon `None`) et `header` (`Any::Bool(true)` seulement) ; `TableView` les publie (`#[serde(skip_serializing_if = "Option::is_none")] pub fit: Option<String>`, `#[serde(skip_serializing_if = "std::ops::Not::not")] pub header: bool`) ; `cmd_set_table_options` dans `table_links.rs` : `table_of`, contrôle de `fit` (`"grow" | "shrink"`), une transaction `e.insert(&mut txn, "fit", "shrink")` / `e.remove(&mut txn, "fit")`, `e.insert(&mut txn, "header", true)` / `e.remove(&mut txn, "header")`, seulement ce qui change ; `table_done`. Variante et `apply` dans `commands.rs`.
- [ ] **4. Wasm** — `set_table_options` / `_inner` au patron de `set_table_sizes` (T1, étape 8).
- [ ] **5. TS** — `api.ts`, `wasm-core.ts` (`case "SetTableOptions": return toChange(this.d.set_table_options(cmd.id, cmd.fit, cmd.header));` ; `toElementView` lit `table.fit`, `table.header`), faux cœur (`FakeTable.fit?`, `header?`, `case` qui passe par `writeTable`), contrat (deux fabriques : écrit, relu, aucune étape si inchangé, `"zz"` → `TABLE_MESSAGE`).
- [ ] **6. `cell-drop.ts`** — dans `placeInto`, si `hit.table.fit === "shrink"` : `sizes = []`, `const inner = cellInnerBox(hit.table, hit.cell)` ; `const k = Math.min(1, inner.w / mine.w, inner.h / mine.h)` ; matrice = translation vers le coin de la boîte intérieure composée avec la mise à l'échelle `k` autour du coin `(box.x0, box.y0)` : `[k, 0, 0, k, tx - k * box.x0, ty - k * box.y0]` (mise à l'échelle dans le repère monde ; un tableau tourné : hors périmètre, cadrage § 7).
- [ ] **7. Outil Tableau, touche** — `TableAction` + `"fit-toggle"` ; dans `act` : `case "fit-toggle": ctx.run({ type: "SetTableOptions", id: ref.id, fit: t.fit === "shrink" ? "grow" : "shrink" }); break;` ; `engine.ts` : `if (ck === "fit" && tool === "table") { tableTool.act("fit-toggle"); return true; }` ; `shortcuts.ts` : `s("table-fit", "Tableau", "Agrandir ou rétrécir pour les objets", "Alt+F"),`.
- [ ] **8. CLI** — `COMMAND_TYPES`, `ops.test.ts` (39), `cli-essai.mjs` : `{ type: "SetTableOptions", id: tab.id, fit: "shrink" }` puis `state` : `table.fit === "shrink"`.
- [ ] **9. Essai** — bloc S2 : nouveau tableau 3 × 3 sous le premier (outil Tableau, clic, picker), Alt+F, outil Sélection, image 400 × 300 neuve, `touchDrag` sur (1, 1), lectures, `capture("objet-ajuste")`.
- [ ] **10. Vert, mesure, commit** — preuves, commande M, `git add` un par un de chaque fichier de la ligne T7 de la table, message `feat: shrink-to-fit mode for objects placed in table cells (SetTableOptions)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T8 — Point 3 : tracé au stylo lié à sa case (`CommitStroke.cell`)

<a id="tache-t8"></a>

**Objectif** : un tracé dont la boîte tient dans une seule case (tolérance : demi-épaisseur) du tableau le plus haut sous
son premier point lui appartient ; il suit sa case et le tableau ; un trait qui déborde reste libre (S3).

**Fichiers** : voir la table (`commands.rs` `CommitStroke`, `cmd_commit_stroke` ; Wasm `commit_stroke` ; `api.ts`,
`wasm-core.ts`, `fake-core.ts`, contrat ; `table-geom.ts` `cellContaining` et test ; `pen.ts` et test ; essai et capture
`trace-dans-case.png`).

**Interfaces**
- Consomme (T1) : `cell_link_to_any`, refus D35/D36 ; (T3) `tableAt`.
- Produit :
  - Rust : `CommitStroke { page, points, style, look, cell: Option<[String; 3]> }` ; `cell` écrit dans la même transaction que le trait ; tableau inconnu, autre page, ligne inconnue ou case ombrée → `BadTable`.
  - Wasm : `commit_stroke(…, opacity, cell_table: Option<String>, cell_row: Option<String>, cell_col: Option<String>)` (trois arguments en fin, D29) ; `commit_stroke_inner(…, look, cell: Option<[String; 3]>)`.
  - TS : `CommitStroke.cell?: CellLink` ; `export function cellContaining(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, box: Bounds, firstX: number, firstY: number, tol: number): CellLink | null` dans `table-geom.ts`.
- Réutilise : `apps/web/src/engine/table-geom.ts` — `cellContaining(doc, page, box): { table, row, col } | null` (étendre ; signature précisée ci-dessus : point de départ et tolérance ajoutés pour D10, rendu en `CellLink`). Le rapport note cet écart : `Réutilisation : écart — cellContaining prend le premier point et la tolérance (D10)`.

**Test et commande bornée** :
`nice -n 10 cargo test -p roomboard-core commit_stroke_with_cell -j 4 2>&1 | tail -10` (≥ 1) ;
`pnpm --filter @roomboard/web exec vitest run src/engine/tools/pen.test.ts src/engine/table-geom.test.ts -t "D10" 2>&1 | tail -10` (≥ 2) ;
contrat `-t "CommitStroke cell"` (≥ 2) ; tests à garder verts : `pen.test.ts` entier, contrats C2, lot 4 ; essai : `ok — S3 : le mot descend de 64`.
Commande M : ≤ 1 540 000 o.

**Preuve visuelle** : lectures — `data-bounds` du tracé sélectionné avant et après « + Ligne » : `y0` + 64 ; après un
déplacement du tableau : même translation. Capture 2x `trace-dans-case.png` à décrire.

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G4 module mesuré ; G5 champ facultatif ;
G8 tactile d'abord (le tracé de l'essai au stylo ou au doigt selon ce que l'outil Stylo accepte) ; G9 un trait hors
tableau : `CommitStroke` sans `cell`, octets d'aujourd'hui ; G10 interdits ; G11 commits ; G12 une transaction ; et le
chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (le cœur tourne en Wasm dans la page, profil).

**Interdits** : ne pas recentrer le tracé (D10) ; ne pas toucher `eraser.ts`.

**Terminé quand** : preuves ci-dessus, capture décrite, un commit.

#### Étapes

- [ ] **1. Tests rouges** — Rust :

```rust
    #[test]
    fn commit_stroke_with_cell() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let l = link(&d, &t, 1, 0);
        let c = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: vec![20.0, 90.0, 0.5, 100.0, 100.0, 0.5, 180.0, 95.0, 0.5],
                style: StrokeStyle { color: "#000000".into(), width: 4.0 },
                look: Look::default(),
                cell: Some(l.clone()),
            })
            .expect("trait");
        let s = c.ids[0].clone();
        assert_eq!(d.element(&s).expect("s").cell, Some(l));
        let y = tx(&d, &s)[5];
        d.apply(Command::InsertTableLine { id: t.clone(), axis: TableAxis::Row, at: 1 }).expect("ligne");
        assert_eq!(tx(&d, &s)[5], y + 64.0);
    }
```

(les autres appels existants de `CommitStroke` dans les tests gagnent `cell: None`). TS (`table-geom.test.ts`, `pen.test.ts`) :

```ts
  it("D10 : cellContaining rend la case qui contient la boîte (tolérance demi-épaisseur), null si elle déborde", () => {
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0] ?? "";
    const id = doc.apply({ type: "AddTable", page, x: 0, y: 0, cols: 3, rows: 3, colWidth: 240, rowHeight: 64, color: "#000000", size: 36 }).ids[0] ?? "";
    const v = doc.element(id);
    if (v?.kind !== "table") throw new Error("tableau");
    expect(cellContaining(doc, page, { x0: 20, y0: 70, x1: 200, y1: 126 }, 20, 90, 2)).toEqual([id, v.table.rows[1]?.id, v.table.cols[0]?.id]);
    expect(cellContaining(doc, page, { x0: 20, y0: 70, x1: 300, y1: 126 }, 20, 90, 2)).toBeNull();
  });
```

et dans `pen.test.ts` : « D10 : un trait écrit dans la case (1, 0) porte `cell` ; un trait sur deux cases n'en porte pas », au harnais existant du fichier (`setup`, glisser de (20, 90) à (180, 95) puis de (20, 90) à (300, 95)), assertion sur `runs.at(-1)` : `cell` défini puis absent.

- [ ] **2. Rouge** (commandes bornées).
- [ ] **3. Cœur** — champ `cell` de `CommitStroke` ; `cmd_commit_stroke(&page, &points, &style, &look, cell.as_ref())` : contrôles de la case avant toute écriture (mêmes que `PlaceInCell`, étape 5 de son ordre), puis `prelim.insert("cell".into(), In::Any(cell_link_to_any(l)))` dans la même prélim.
- [ ] **4. Wasm** — trois `Option<String>` en fin de `commit_stroke`, `cell` passé à `commit_stroke_inner` (`match (t, r, c) { (Some(t), Some(r), Some(c)) => Some([t, r, c]), _ => None }`).
- [ ] **5. TS** — `api.ts` (`cell?: CellLink` de `CommitStroke`), `wasm-core.ts` (`cmd.cell?.[0], cmd.cell?.[1], cmd.cell?.[2]` en fin d'appel), faux cœur (contrôles puis `cell` sur l'élément neuf), contrat (deux fabriques : lié, suit `InsertTableLine` ; case ombrée → `TABLE_MESSAGE`).
- [ ] **6. `cellContaining`** :

```ts
/** D10 : case du tableau le plus haut sous le premier point qui contient `box` (monde), à `tol` près ; null sinon. */
export function cellContaining(doc: Pick<CoreDocument, "elementIdsOfKind" | "element">, page: string, box: Bounds, firstX: number, firstY: number, tol: number): CellLink | null {
  const hit = tableAt(doc, page, firstX, firstY);
  if (hit === null || (hit.table.cells.find((c) => c.row === hit.table.rows[hit.cell.row]?.id && c.col === hit.table.cols[hit.cell.col]?.id)?.shade ?? null) !== null) return null;
  const r = transformBounds(hit.transform, cellRect(hit.table, hit.cell));
  const inside = box.x0 >= r.x0 - tol && box.y0 >= r.y0 - tol && box.x1 <= r.x1 + tol && box.y1 <= r.y1 + tol;
  const row = hit.table.rows[hit.cell.row];
  const col = hit.table.cols[hit.cell.col];
  return inside && row !== undefined && col !== undefined ? [hit.id, row.id, col.id] : null;
}
```

(`transformBounds` importé de `./tools/handles` ou recopié s'il crée un cycle d'import : dans ce cas, calcul des quatre coins par `applyMatrix`.)
- [ ] **7. `pen.ts`** — au `close`, avant `ctx.run` : boîte des points (`l.all` par triplets) élargie de `l.style.width / 2` ; `const cell = cellContaining(ctx.doc, l.page, box, l.all[0] ?? 0, l.all[1] ?? 0, l.style.width / 2);` puis `...(cell ? { cell } : {})` dans la commande.
- [ ] **8. Essai** — bloc S3 : outil Stylo, tracé dans la case (1, 0) d'un tableau neuf (souris ou toucher selon l'outil), outil Tableau, case (0, 0) active, bouton `button[data-table-action="row-insert"]`, outil Sélection, sélection du tracé, `data-bounds` `y0` + 64 ; déplacer le tableau au toucher : le tracé suit ; `capture("trace-dans-case")`.
- [ ] **9. Vert, mesure, commit** — preuves, commande M, `git add` un par un de chaque fichier de la ligne T8 de la table, message `feat: pen strokes written inside a table cell belong to it` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

### Tâche T9 — Point 5 : image de fond de case (`bg`, `SetCellImage`, appui long, Alt+I)

<a id="tache-t9"></a>

**Objectif** : une image logée devient le fond de sa case (en « couvrir », découpé à la case, sous le texte) par un appui
long sur la case avec l'outil Tableau puis « Mettre en fond », ou Alt+I sur la case active ; Ctrl+Z rend l'image libre ;
l'export PDF montre le fond (même peintre) (S5).

**Fichiers** : voir la table (cœur `table.rs` `bg`, `table_links.rs` `cmd_set_cell_image`, `commands.rs` ; Wasm ;
`api.ts`, `wasm-core.ts`, `fake-core.ts`, contrat ; CLI ; `table-geom.ts` (`cellContent().bg`) ; `render/table-paint.ts` ;
`tools/table.ts` (appui long, `cell-image`) et test ; `keys.ts`, `engine.ts` ; `ui/cell-menu.ts` (nouveau) et test ;
`ui/shortcuts.ts` ; `app/board-session.ts` ; essai).

**Interfaces**
- Consomme (T6) : `cellKey(e) === "cell-image"` ; (T1) `read_cell_link`.
- Produit :
  - Rust : clé de case `bg` = id d'asset (chaîne) ; `TableCellView.bg: Option<String>` ; la vue liste une case qui n'a que `bg` (`table.rs:315`) ; `Command::SetCellImage { id: String, row: String, col: String, from: Option<String> }` : `Some(imageId)` → l'image doit être un `image` lié à cette case (sinon `BadTable`), son asset écrit en `bg`, l'image supprimée, une étape ; `None` → `bg` retiré.
  - Wasm : `set_cell_image(id: &str, row: &str, col: &str, from: Option<String>)` et `_inner`.
  - TS : `TableCell.bg?: string` ; `| { readonly type: "SetCellImage"; readonly id: string; readonly row: string; readonly col: string; readonly from: string | null }` ; `TableAction` + `"cell-image"` ; `export interface CellMenu { open(x: number, y: number, items: readonly CellMenuItem[]): void; close(): void }`, `export interface CellMenuItem { readonly id: "cell-image" | "unplace"; readonly label: string; run(): void }` ; `createTableTool(ctx, editor, picker, style, measure, menu?: CellMenu)` ; `export function createCellMenu(host: HTMLElement): CellMenu` (`ui/cell-menu.ts`, `div[role="menu"].rb-cell-menu`, boutons ≥ 44 px).
  - CLI : `COMMAND_TYPES` + `"SetCellImage"` (40) ; `ops.test.ts` → 40 ; `cli-essai.mjs` : passage « image logée, `SetCellImage`, `state` : `bg` présent, `undo` : image revenue ».
- Réutilise : `crates/roomboard-core/src/document.rs:278` `cited_assets` — aucun changement : l'asset de `bg` est gardé à l'enregistrement (réutiliser ; test `cell_image_asset_kept_on_save`).
- Réutilise : `apps/web/src/engine/render/image-cache` — `ImageSource` déjà passé au peintre (réutiliser).
- Le rapport porte une ligne `Réutilisation : …` par module.

**Test et commande bornée** :
`nice -n 10 cargo test -p roomboard-core set_cell_image -j 4 2>&1 | tail -10` (≥ 2 : `set_cell_image_takes_asset_and_removes_image`, `set_cell_image_refuses_unlinked`) et `cargo test -p roomboard-core cell_image_asset_kept_on_save` (1) ;
`pnpm --filter @roomboard/web exec vitest run src/engine/tools/table.test.ts src/ui/cell-menu.test.ts -t "S5|appui long|cell-menu" 2>&1 | tail -10` (≥ 3) ;
contrat `-t "SetCellImage"` (≥ 2) ; `ops.test.ts` 40 ; `CLI : OK` ; essai : `ok — S5 : l'image devient le fond de la case`.
Tests à garder verts : `table.test.ts` entier (Uniformiser, Ombrer), `zone-s6-banc.test.ts` (témoin D30). Commande M : ≤ 1 540 000 o.

**Preuve visuelle** : lectures — après « Mettre en fond » : `data-elements` diminue de 1, la case (1, 1) montre des pixels
de la couleur de l'image (`inkIn` sur la boîte de la case) ; après Ctrl+Z : `data-elements` revient. Capture 2x
facultative (aucune exigée pour S5).

**Contraintes (recopiées)** : G1 TDD ; G2 worktree partagé ; G3 preuves bornées ; G4 module mesuré ; G5 champ facultatif
`bg` (un ancien lecteur ignore la clé, l'asset reste cité) ; G6 CLI ; G8 tactile d'abord : appui long 500 ms sans bouger
de plus de 8 px ouvre le menu, boutons ≥ 44 px, raccourci Alt+I ; jamais de glisser HTML5 ; G9 hors tableau inchangé ;
G10 interdits ; G11 commits ; G12 une étape.

**Interdits** : pas d'autre entrée de menu que « Mettre en fond » et « Sortir » (Trier : lot C) ; pas de panneau
d'options (lot B).

**Terminé quand** : preuves ci-dessus, un commit.

#### Étapes

- [ ] **1. Tests rouges** — Rust :

```rust
    #[test]
    fn set_cell_image_takes_asset_and_removes_image() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let img = add_png_image(&mut d, &p); // aide : AddImage d'un asset 1 × 1 (patron `add_image` des tests de commands.rs)
        place11(&mut d, &t, &img);
        let l = link(&d, &t, 1, 1);
        d.apply(Command::SetCellImage { id: t.clone(), row: l[1].clone(), col: l[2].clone(), from: Some(img.clone()) }).expect("fond");
        assert!(d.element(&img).is_none());
        assert!(view(&d, &t).cells.iter().any(|c| c.row == l[1] && c.col == l[2] && c.bg.is_some()));
        assert!(d.undo());
        assert!(d.element(&img).is_some());
    }

    #[test]
    fn set_cell_image_refuses_unlinked() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let img = add_png_image(&mut d, &p);
        let l = link(&d, &t, 1, 1);
        assert_eq!(d.apply(Command::SetCellImage { id: t, row: l[1].clone(), col: l[2].clone(), from: Some(img) }), Err(CommandError::BadTable));
    }
```

(`add_png_image` : écrire l'aide dans le module de tests de `table_links.rs` au patron `add_image` de `commands.rs:3203-3226`.) `cell_image_asset_kept_on_save` : enregistrer (`format::save`), relire, l'asset de `bg` est dans le fichier (patron `group_reload_keeps_bytes`). TS (`table.test.ts`) :

```ts
  it("S5 : Alt+I (act cell-image) met l'image logée la plus haute de la case active en fond, une étape", () => { /* harnais du fichier : tableau, image logée par PlaceInCell, cellule active (1, 1), tool.act("cell-image"), runs.at(-1) = SetCellImage { from: image }, doc.element(image) === null ; undo : image revenue */ });
  it("appui long (500 ms, < 8 px) sur une case : menu ouvert avec « Mettre en fond » si une image y loge", () => { /* vi.useFakeTimers(), begin, advanceTimersByTime(500), menu.open appelé avec l'item "cell-image" ; close sans saisie ouverte */ });
```

Écrire ces deux tests en entier au harnais de `table.test.ts` (création du tableau, cellule active, faux `editor`, `picker`) : les commentaires ci-dessus donnent les assertions exactes. `cell-menu.test.ts` (jsdom du projet) : `createCellMenu(document.body).open(10, 20, [{ id: "cell-image", label: "Mettre en fond", run }])` crée `div[role="menu"]` avec un `button` dont `style.minHeight` vaut `"44px"` ; clic → `run` appelé et menu fermé ; Échap ferme.

- [ ] **2. Rouge** (commandes bornées).
- [ ] **3. Cœur** — `RawCell.bg` lu (`out_string`, chaîne non vide), `TableCellView.bg` (`skip_serializing_if`), `view` garde une case à `bg` seul ; `cmd_set_cell_image` dans `table_links.rs` : `table_of`, `ranks`, `from` → `find_element`, `kind == "image"`, `read_cell_link == [id, row, col]` sinon `BadTable` ; asset lu au champ d'asset de l'image (`read_image`) ; une transaction : cellule créée si absente (`insert_cell` de `table.rs`, en `pub(crate)`), `bg` posé, image retirée de sa page (`elements.remove(&mut txn, index)`) ; `None` → `bg` retiré, aucune étape s'il n'y en avait pas.
- [ ] **4. Wasm, TS, contrat, CLI** — au patron de T7 étapes 4, 5, 8 (`case "SetCellImage": return toChange(this.d.set_cell_image(cmd.id, cmd.row, cmd.col, cmd.from ?? undefined));`).
- [ ] **5. Dessin** — `table-paint.ts` : pour une case à `bg`, avant le texte, dessin de l'image par la source d'images déjà passée au peintre, découpée au rectangle de la case (`ctx.save(); ctx.beginPath(); ctx.rect(...); ctx.clip();`), mise à l'échelle « couvrir » (`k = Math.max(w / iw, h / ih)`, centrée) ; image non encore chargée : rien (le cache redemande une image).
- [ ] **6. Outil Tableau** — `TableAction` + `"cell-image"` : image logée la plus haute de la case active (`ctx.doc.elementIds(page)` lu du dessus, `kind === "image"`, `cell` égal) → `SetCellImage` ; aucune : rien. Appui long : au `begin`, `hold = setTimeout(() => openMenu(press), 500)` ; `extend` au-delà de 8 px écran : `clearTimeout(hold)` ; `close` : `clearTimeout(hold)`, et si le menu a été ouvert, aucune saisie. `openMenu` appelle `menu?.open(x, y, items)` avec « Mettre en fond » (si une image loge) et « Sortir » (`PlaceInCell` des objets de la case, `cell: null`, `sizes: []`). `engine.ts` : `if (ck === "cell-image" && tool === "table") { tableTool.act("cell-image"); return true; }`. `shortcuts.ts` : `s("cell-image", "Tableau", "Mettre l'image logée en fond", "Alt+I"),`. `board-session.ts` : `createCellMenu(container)` passé à `createTableTool`.
- [ ] **7. Essai** — bloc S5 : image logée (comme S1), outil Tableau, appui long au toucher (CDP `touchStart`, attente 600 ms, `touchEnd`), clic sur `.rb-cell-menu button:has-text("Mettre en fond")`, lectures ; Ctrl+Z ; puis Alt+I sur la case active, même contrôle.
- [ ] **8. Vert, mesure, commit** — preuves, commande M, `git add` un par un de chaque fichier de la ligne T9 de la table, message `feat: table cell background image from a placed image (SetCellImage, long press, Alt+I)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, auteur G11.

---

## Couverture du cadrage (relecture)

| entrée du cadrage | tâche |
|---|---|
| socle : `cell` lu et écrit (D1, D36), `PlaceInCell`, `SetTableLineSizes`, `follow_cells` sur 4 commandes, emport (D6), exports Wasm, `case`, faux cœur, contrat, `COMMAND_TYPES`, `cli-essai` S16 | T1, T2 |
| socle « peut tomber » : montée `reinsert_kept`, renumérotation à la copie, `cell` gardé par la gomme | T5 (sans T5 : copie libre, T1 `copy_drops_cell_link`) |
| point 1 : `cell-drop.ts`, mode agrandir (D8), `requiredSizes`, cadre de case visée, S1 au doigt | T3, T4 |
| point 1 « peut tomber » : Alt+Entrée ; zones fusionnées (refus de loger : déplacement libre) | T6 ; refus des zones fait en T3 |
| point 2 (D9, S2) | T7 |
| point 3 (D10, S3) | T8 |
| point 4 : sortir retire le lien, retrait par `Transform` hors case (D6) ; réduction (D11) | T1, T3 ; T6 |
| point 5 (D12, S5) | T9 |
| garde-fous : refus case ombrée fermée, refus d'un tableau (D35, D36) | T1, T2, T3 |
| garde-fou « peut tomber » : refus d'Ombrer une case à objet (D35) | non couvert (lot B, avec l'outil Tableau) |
| D28 `tableAt` par `elementIdsOfKind` | T3 |
| D30 empreinte S6 | témoin rejoué en T9 (`zone-s6-banc.test.ts`) et à la clôture |
| effets de bord : Alt (T3), sans lien (T1), `tableAt` (T3), gomme (T5), copie (T5), sortie de case (T1), U3 (T1) | voir tâches |
| effets de bord hors lot A : F10 `open` (D19), panneau `table`, collage tabulé, Uniformiser par `requiredSizes`, Ombrer refusé | lots B et C |
