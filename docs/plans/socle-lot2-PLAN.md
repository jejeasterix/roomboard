# Plan du lot 2 — Cœur du document (socle RoomBoard)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D2, D3, D4, D6, D7, D10, D11, D12, D23, D24, D25, D37, D38 ; DA3 à DA7 ;
H2-8, H2-12, H2-13, H2-14 ; scénarios S2 et S3 au niveau du cœur). Plan maître : `docs/plans/socle-PLAN.md`.

**But :** le cœur Rust du document (schéma Yrs D2, `Document::blank`, historique, encre, commandes, format
`.roomboard`), sa liaison Wasm, et un contrat TypeScript figé dès la première vague pour que le lot 3 avance sur une
fausse liaison (D36).

**Architecture :** `crates/roomboard-core` reste sans navigateur ni horloge. Modules : `element` (lecture et écriture
des valeurs Yrs), `document` (racines `meta` / `pages`, pages, encodage v1, `History` intégrée), `history`
(`UndoManager` derrière `History`), `ink/` (`points`, `outline`, `builder`, `hit`, `erase`), `commands` (`apply`,
`Change`), `query` (lectures sans écriture), `format/` (ZIP + manifeste). `crates/roomboard-wasm` expose des méthodes
par commande ; `apps/web/src/core/` porte le contrat TS (`api.ts`), la fausse liaison (`fake-core.ts`) et
l'adaptateur du vrai module (`wasm-core.ts`).

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T7 | Modules du cœur et dépendances (`zip` en wasm32, H2-8) | — | crates/roomboard-core/Cargo.toml, Cargo.lock, crates/roomboard-core/src/lib.rs, crates/roomboard-core/src/element.rs, crates/roomboard-core/src/history.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/query.rs, crates/roomboard-core/src/format/mod.rs, crates/roomboard-core/src/ink/mod.rs, crates/roomboard-core/src/ink/points.rs, crates/roomboard-core/src/ink/outline.rs, crates/roomboard-core/src/ink/builder.rs, crates/roomboard-core/src/ink/hit.rs, crates/roomboard-core/src/ink/erase.rs, crates/roomboard-core/tests/deps_smoke.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core --test deps_smoke` : 3 tests, `zip_deflate_round_trip_in_memory` présent ; `cargo build -p roomboard-core --target wasm32-unknown-unknown` sans `error[` ; `verifier.sh : OK` | S2 | #tache-t7 |
| T8 | Contrat TS de la liaison et fausse liaison (D36) | — | apps/web/src/core/api.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/fake-core.test.ts | isolé | implementeur-tdd | vitest `fake-core.test.ts` ≥ 9 tests, `une page vide ne s'annule pas` présent ; `verifier.sh : OK` | S2 | #tache-t8 |
| T9 | Schéma D2, `Document::blank` (D37) et `History` (DA6) | T7 | crates/roomboard-core/src/element.rs, crates/roomboard-core/src/document.rs, crates/roomboard-core/src/history.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib` ≥ 23 tests dont `blank_page_is_not_undoable`, `add_page_increments_count`, `new_document_has_no_page` ; `verifier.sh : OK` | S2, S3 | #tache-t9 |
| T10 | Points, contour `freedraw` et `StrokeBuilder` (D6, D7) | T7 | crates/roomboard-core/src/ink/points.rs, crates/roomboard-core/src/ink/outline.rs, crates/roomboard-core/src/ink/builder.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib ink::` ≥ 20 tests, `long_stroke_freezes_blocks_of_256` présent ; `verifier.sh : OK` | S2 | #tache-t10 |
| T11 | Collision et coupe par la gomme (D12, DA7) | T10 | crates/roomboard-core/src/ink/hit.rs, crates/roomboard-core/src/ink/erase.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core --lib -- ink::hit ink::erase` ≥ 12 tests, `erase_through_middle_gives_two_pieces` présent ; `verifier.sh : OK` | S2 | #tache-t11 |
| T12 | Commandes, `Change` et lectures (D10, D12, D16, D37, D38) | T9, T11 | crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/query.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib -- commands:: query::` ≥ 20 tests, `erase_miss_adds_no_undo_step` et `thousand_strokes_undo_all` présents ; `verifier.sh : OK` | S2, S3 | #tache-t12 |
| T13 | Format `.roomboard` : ZIP, manifeste, migration (D24, D25, DA3) | T9 | crates/roomboard-core/src/format/mod.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib format::` ≥ 13 tests, `schema_mismatch_is_corrupt` et `save_is_deterministic` présents ; `verifier.sh : OK` | S2, S3 | #tache-t13 |
| T14 | Scénarios S2 et S3 au niveau du cœur | T12, T13 | crates/roomboard-core/tests/scenarios.rs | isolé | implementeur-tdd | `cargo test -p roomboard-core --test scenarios` : 3 tests, `s2_three_strokes_erase_undo_redo_save_load` présent ; `verifier.sh : OK` | S2, S3 | #tache-t14 |
| T15 | Liaison Wasm (DA5, D10, D23) | T10, T12, T13 | crates/roomboard-wasm/Cargo.toml, crates/roomboard-wasm/src/lib.rs, Cargo.lock | isolé | concepteur-critique | `cargo test -p roomboard-wasm` ≥ 10 tests dont `version_is_not_empty`, `wasm_document_counts_pages` ; `verifier.sh : OK` | S2 | #tache-t15 |
| T16 | Adaptateur `wasm-core.ts`, contrat vitest sur le vrai `.wasm`, taille ≤ 1,5 Mo (D33, H2-13) | T8, T15 | apps/web/src/core/wasm-core.ts, apps/web/src/core/wasm-core.contract.test.ts, scripts/verifier.sh, Cargo.toml | isolé | concepteur-critique | vitest `wasm-core.contract.test.ts` ≥ 12 tests (aucun « skipped » sous `verifier.sh`), `S2 au niveau du cœur par la liaison` présent ; ligne `module Wasm : N octets` ≤ 1572864 ; `verifier.sh : OK` | S2, S3 | #tache-t16 |

Vagues : **1** T7 et T8 en parallèle (aucun fichier commun) ; **2** T9 et T10 ; **3** T11 et T13 ; **4** T12 ;
**5** T14 et T15 ; **6** T16. T8 se fusionne en premier si possible : le lot 3 code contre `api.ts` et `fake-core.ts`.

Le lot 1 s'exécute en même temps (worktrees `socle--T<n>`) : sa tâche T6 touche `scripts/verifier.sh` et
`apps/web/package.json`. T16 édite `scripts/verifier.sh` par **ancres textuelles** (jamais par numéro de ligne) et
part de `feat/socle` à jour (lot 1 fusionné s'il l'est).

## Carte des fichiers

| fichier | tâche | rôle |
|---|---|---|
| `crates/roomboard-core/Cargo.toml`, `Cargo.lock` | T7 | `freedraw` 1.0.4, `zip` 9.6 (sans défauts, `deflate-flate2-zlib-rs`), `serde`, `serde_json` |
| `crates/roomboard-core/src/lib.rs` | T7 | déclare `commands`, `element`, `format`, `history`, `ink`, `query` |
| `crates/roomboard-core/src/element.rs` | T7 (amorce), T9 | constantes du schéma, `StrokeStyle`, `ElementView`, `PageView`, conversions `Out` / `Any` |
| `crates/roomboard-core/src/document.rs` | T9 | `Document` : racines, `new`, `blank`, pages, encodage v1, `History` intégrée, aides `pub(crate)` |
| `crates/roomboard-core/src/history.rs` | T7 (amorce), T9 | `History` (DA6) |
| `crates/roomboard-core/src/ink/mod.rs` | T7 | déclare `points`, `outline`, `builder`, `hit`, `erase` |
| `crates/roomboard-core/src/ink/points.rs`, `outline.rs`, `builder.rs` | T7 (amorces), T10 | `InkPoint`, codec `f32` LE, `outline`, `StrokeBuilder` |
| `crates/roomboard-core/src/ink/hit.rs`, `erase.rs` | T7 (amorces), T11 | collision sur le contour, coupe par la gomme |
| `crates/roomboard-core/src/commands.rs` | T7 (amorce), T12 | `Command`, `Change`, `CommandError`, `Document::apply` |
| `crates/roomboard-core/src/query.rs` | T7 (amorce), T12 | `stroke_points`, `outline`, `hit_test`, `hit_test_path`, `ids_in_rect`, `bounds` |
| `crates/roomboard-core/src/format/mod.rs` | T7 (amorce), T13 | `save`, `load`, `load_with_manifest`, `migrate`, `Manifest`, `SaveMeta`, `FormatError` |
| `crates/roomboard-core/tests/deps_smoke.rs` | T7 | preuve H2-8 côté natif (zip, freedraw, uuid) |
| `crates/roomboard-core/tests/scenarios.rs` | T14 | S2, S3 au niveau du cœur |
| `crates/roomboard-wasm/Cargo.toml`, `src/lib.rs` | T15 | `serde`, `serde-wasm-bindgen` 0.6 ; `Document` étendu, `StrokeBuilder`, `capabilities` |
| `apps/web/src/core/api.ts`, `fake-core.ts`, `fake-core.test.ts` | T8 | contrat figé et fausse liaison pour le lot 3 |
| `apps/web/src/core/wasm-core.ts`, `wasm-core.contract.test.ts` | T16 | adaptateur et contrat sur le vrai `.wasm` |
| `scripts/verifier.sh`, `Cargo.toml` (racine) | T16 | `ROOMBOARD_WASM_REQUIRED=1`, contrôle de taille ; `[profile.release]` `opt-level = "s"`, `lto = true` |

**Carte d'impact du cadrage, entrées du lot 2.** `crates/roomboard-core/Cargo.toml:8` → T7 ; `document.rs:4-25` → T9
(commandes : T12 par `impl Document` dans `commands.rs`, sans toucher `document.rs`) ; `lib.rs:1-3` → T7 ;
`ink/` → T7, T10, T11 ; `history.rs` → T9 ; `format/` → T13 ; `crates/roomboard-wasm/Cargo.toml:12` et
`src/lib.rs:7,13-29` → T15 ; `scripts/verifier.sh` (taille, contrat sur le vrai `.wasm`) → T16 ;
`capabilities.rs:4-29` : non touché, appelé par T15. `apps/web/src/main.ts` : **non touché au lot 2** (T15 garde
`new`, `add_page`, `page_count` côté Wasm ; l'amorce change au lot 5).

**Effets de bord et leurs tests.** `Document::add_page` crée une page `Y.Map` (D2) → `add_page_increments_count` et
`new_document_has_no_page` gardés tels quels, plus `page_has_id_and_default_size` et `blank_page_is_not_undoable` (T9).
La liaison Wasm garde ses deux tests (`version_is_not_empty`, `wasm_document_counts_pages`, T15). Les tests de
`capabilities.rs:34-49` restent verts (preuve `verifier.sh` de chaque tâche).

## Global Constraints (recopiées dans chaque section)

- Jamais `git add -A`, `git add .`, `git commit -a` : fichiers ajoutés un par un. Pas de `--force`.
- Aucun workflow GitHub Actions (`.github/workflows/` non touché).
- Un seul build Tauri à la fois ; aucun build Android. Le lot 2 n'a besoin d'aucun build Tauri : n'en lancer aucun.
- Tests : `scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH`, sous le jeton
  `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T<n> --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"`.
  Les commandes ciblées (`cargo test -p …`, `pnpm exec vitest run …`) passent sous le même jeton.
- Sous-agents relecteurs au premier plan (`run_in_background: false`).
- `$WT` = dossier de travail donné par l'orchestrateur (par défaut `/home/adminjd/projets/roomboard-wt/socle--T<n>`).
  Worktree neuf : `cd "$WT" && pnpm install --frozen-lockfile` d'abord.
- Cœur : aucune horloge système (`SystemTime`, `Instant`), aucun aléa hors de yrs, aucune dépendance au navigateur
  dans `crates/roomboard-core` (D1). `cargo fmt` et `clippy -D warnings` passent (ils sont dans `verifier.sh`).
- yrs 0.28.1 : jamais `UndoManager::new()` ni `Options::default()` (absents sous Wasm) ; aucune `Array::move_to`
  (n'existe plus) ; aucun `get_or_insert_*` pendant une transaction ouverte (verrou).
- TypeScript strict avec `noUncheckedIndexedAccess` : aucun `any`, aucun `!` sur un index.

## Review Focus

- T9 : la page de `blank()` et la clé `meta.schema` sont écrites **sans origine** avant la création de `History` ;
  une transaction `"local"` = une étape (horloge `|| 0u64`) — cadrage D37, D11, effet de bord « `add_page` crée une
  page `Y.Map` » (`blank_page_is_not_undoable`, `each_local_transaction_is_one_step`).
- T10 : au-delà de 2 000 points, seuls le dernier bloc est recalculé, les blocs figés se recouvrent d'un point —
  D7, H2-12 (`long_stroke_freezes_blocks_of_256`, `frozen_blocks_overlap_by_one_point`).
- T11 : la coupe interpole l'extrémité à la distance exacte `radius + half_width` — D12
  (`cut_point_lies_on_reach_circle`).
- T12 : une gomme qui ne touche rien n'ouvre aucune transaction (aucune étape vide) ; une commande = une transaction —
  D38, S2 (`erase_miss_adds_no_undo_step`, `erase_is_one_undo_step`) ; dernière page indestructible — D37
  (`remove_last_page_is_refused`).
- T13 : `schema` du manifeste contrôlé contre `meta.schema` ; dates des entrées ZIP fixes, aucune horloge — D24, D25
  (`schema_mismatch_is_corrupt`, `save_is_deterministic`).
- T16 : le contrat ne se saute pas en silence sous `verifier.sh` (`ROOMBOARD_WASM_REQUIRED=1`) — D33
  (`le module wasm est présent quand il est exigé`).

---

<a id="tache-t7"></a>
### Tâche T7 — Modules du cœur et dépendances (`zip` en wasm32, H2-8)

**Objectif.** Poser les dépendances du cœur et l'arborescence des modules du lot 2 (fichiers amorces vides), et
prouver tout de suite que `zip` en pur Rust compile pour `wasm32-unknown-unknown` (D25 : « à vérifier à la première
tâche du lot 2 »). Les tâches suivantes possèdent chacune leurs fichiers sans toucher `lib.rs`. Scénario : S2
(l'enregistrement passe par `zip`).

**Fichiers.** Modifier `crates/roomboard-core/Cargo.toml`, `crates/roomboard-core/src/lib.rs`, `Cargo.lock`
(par `cargo`). Créer les amorces `crates/roomboard-core/src/{element.rs, history.rs, commands.rs, query.rs}`,
`crates/roomboard-core/src/format/mod.rs`, `crates/roomboard-core/src/ink/{mod.rs, points.rs, outline.rs,
builder.rs, hit.rs, erase.rs}`, et `crates/roomboard-core/tests/deps_smoke.rs`. Ne pas toucher `document.rs` ni
`capabilities.rs`.

**Interfaces.**
- Consomme : rien du lot.
- Réutilise : crate `zip` (9.x) — `ZipWriter::new`, `start_file`, `finish`, `ZipArchive::new`, `by_name` (cadrage,
  « Conteneur ZIP »), appelée ici seulement par le test de fumée.
- Réutilise : crate `freedraw` 1.0.4 — `freedraw::get_stroke(&[InputPoint], &StrokeOptions) -> Vec<[f64; 2]>`
  (`freedraw-1.0.4/src/get_stroke.rs:13`), test de fumée seulement.
- Réutilise : `yrs::uuid_v4() -> Arc<str>` (`yrs-0.28.1/src/lib.rs:726`), test de fumée seulement.
- Produit : les modules `pub mod commands; pub mod element; pub mod format; pub mod history; pub mod ink; pub mod
  query;` et `ink::{points, outline, builder, hit, erase}`, vides.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --test deps_smoke 2>&1 | tail -15`
→ `test result: ok. 3 passed`, nom `zip_deflate_round_trip_in_memory` présent.
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo build -p roomboard-core --target wasm32-unknown-unknown 2>&1 | tail -5`
→ `Finished`, aucun `error[`.
Puis `verifier.sh` (jeton, voir contraintes) → `verifier.sh : OK` (garde verts `capabilities.rs` ×2,
`document.rs` ×2, `roomboard-wasm` ×2, `toolbar.test.ts` ×2).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun build Tauri ici) ; tests par
`scripts/verifier.sh` avec `PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom
tests --proprietaire socle/T7 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ni dépendance au navigateur.

**Interdits.** Aucune fonction par défaut de `zip` (ni `bzip2`, `zstd`, `lzma`, `xz`, `aes-crypto`, `time`). Aucun
code métier dans les amorces (une ligne `//!` chacune). Ne pas toucher `document.rs`, `capabilities.rs`,
`crates/roomboard-wasm`.

**Terminé quand.** Les 3 tests passent, le build wasm32 du cœur passe, `verifier.sh : OK`, et le rapport contient
`Réutilisation : appelé zip, freedraw::get_stroke, yrs::uuid_v4` ou `Réutilisation : écart — <pourquoi>`, plus la
ligne `H2-8 : zip compile en wasm32 (fonction <nom>)` ou `H2-8 : échec — <erreur>`.

**Étapes.**

- [ ] **1. Écrire le test de fumée (rouge).** Créer `crates/roomboard-core/tests/deps_smoke.rs` :

```rust
//! Fumée des dépendances du cœur (H2-8) : zip en mémoire, freedraw, uuid.
use std::io::{Cursor, Read, Write};

#[test]
fn zip_deflate_round_trip_in_memory() {
    let mut w = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .last_modified_time(zip::DateTime::default());
    w.start_file("a.txt", opts).unwrap();
    w.write_all(b"bonjour bonjour bonjour").unwrap();
    let bytes = w.finish().unwrap().into_inner();

    let mut a = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
    let mut s = String::new();
    a.by_name("a.txt").unwrap().read_to_string(&mut s).unwrap();
    assert_eq!(s, "bonjour bonjour bonjour");
}

#[test]
fn freedraw_outline_is_a_polygon() {
    let pts: Vec<freedraw::InputPoint> = (0..20)
        .map(|i| freedraw::InputPoint::Struct { x: i as f64 * 3.0, y: 0.0, pressure: Some(0.5) })
        .collect();
    let opts = freedraw::StrokeOptions { size: Some(8.0), ..Default::default() };
    let outline = freedraw::get_stroke(&pts, &opts);
    assert!(outline.len() >= 3, "contour vide : {}", outline.len());
}

#[test]
fn uuid_v4_has_36_chars() {
    let id = yrs::uuid_v4();
    assert_eq!(id.len(), 36);
}
```

- [ ] **2. Lancer, constater l'échec.** `cargo test -p roomboard-core --test deps_smoke 2>&1 | tail -5` →
  `error[E0433]: failed to resolve: use of undeclared crate or module `zip`` (attendu).

- [ ] **3. Ajouter les dépendances.** `crates/roomboard-core/Cargo.toml`, section `[dependencies]` complète :

```toml
[dependencies]
yrs = "0.28"
freedraw = "1.0.4"
zip = { version = "9.6", default-features = false, features = ["deflate-flate2-zlib-rs"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **4. Poser les modules.** `crates/roomboard-core/src/lib.rs` :

```rust
//! Cœur de RoomBoard : modèle du document, sans dépendance au navigateur.
pub mod capabilities;
pub mod commands;
pub mod document;
pub mod element;
pub mod format;
pub mod history;
pub mod ink;
pub mod query;
```

`crates/roomboard-core/src/ink/mod.rs` :

```rust
//! Encre : points, contour à largeur variable, encre vive, collision, gomme (D6, D7, D12).
pub mod builder;
pub mod erase;
pub mod hit;
pub mod outline;
pub mod points;
```

Amorces d'une ligne (chacune son fichier) :
`element.rs` → `//! Valeurs du schéma D2 (T9).` · `history.rs` → `//! Historique derrière UndoManager (T9).` ·
`commands.rs` → `//! Commandes et Change (T12).` · `query.rs` → `//! Lectures sans écriture (T12).` ·
`format/mod.rs` → `//! Format .roomboard (T13).` · `ink/points.rs` → `//! Points d'encre (T10).` ·
`ink/outline.rs` → `//! Contour (T10).` · `ink/builder.rs` → `//! Encre vive (T10).` ·
`ink/hit.rs` → `//! Collision (T11).` · `ink/erase.rs` → `//! Gomme (T11).`

- [ ] **5. Vert en natif.** `cargo test -p roomboard-core --test deps_smoke 2>&1 | tail -5` → `3 passed`.

- [ ] **6. Prouver H2-8.** `cargo build -p roomboard-core --target wasm32-unknown-unknown 2>&1 | tail -5`.
  Si `zlib-rs` échoue en wasm32 : remplacer la ligne `zip` par
  `zip = { version = "9.6", default-features = false, features = ["deflate-flate2"] }` et ajouter
  `flate2 = { version = "1.1", default-features = false, features = ["rust_backend"] }` (miniz_oxide, pur Rust),
  relancer les étapes 5 et 6. Si les deux échouent : s'arrêter et rendre `H2-8 : échec — <erreur>` (repli du cadrage :
  ZIP « stocké » écrit à la main par T13, à décider par l'orchestrateur).

- [ ] **7. Suite complète** sous le jeton : `verifier.sh : OK`. Ajouter les fichiers un par un
  (`git add crates/roomboard-core/Cargo.toml`, `git add Cargo.lock`, …), commit
  `feat(core): lot 2 modules and dependencies (zip, freedraw)`.

---

<a id="tache-t8"></a>
### Tâche T8 — Contrat TS de la liaison et fausse liaison (D36)

**Objectif.** Figer côté TypeScript l'interface que le moteur (lot 3) appellera (DA5, D10, D38), et fournir une
fausse liaison en TS pur qui la respecte, pour que le lot 3 avance avant la fusion de T15/T16. Scénario : S2 (le moteur
du lot 3 trace, gomme, annule contre ce contrat).

**Fichiers.** Créer `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`.

**Interfaces.**
- Consomme : rien.
- Produit (`api.ts`, figé ; toute modification ultérieure passe par l'orchestrateur) :

```ts
export type Matrix = readonly [number, number, number, number, number, number];
export interface StrokeStyle { readonly color: string; readonly width: number }
export type EraseMode = "partial" | "object";
export type ElementKind = "stroke";
export interface Change { readonly pages: readonly string[]; readonly ids: readonly string[]; readonly removed: readonly string[]; readonly full: boolean; readonly version: number }
export type Command =
  | { readonly type: "AddPage"; readonly after: string | null }
  | { readonly type: "RemovePage"; readonly page: string }
  | { readonly type: "CommitStroke"; readonly page: string; readonly points: Float32Array; readonly style: StrokeStyle }
  | { readonly type: "Erase"; readonly page: string; readonly path: Float32Array; readonly radius: number; readonly mode: EraseMode }
  | { readonly type: "Delete"; readonly ids: readonly string[] };
export interface ElementView { readonly id: string; readonly kind: ElementKind; readonly transform: Matrix; readonly style: StrokeStyle }
export interface Bounds { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
export interface StrokeBuilderApi { push(points: Float32Array): Float32Array; finish(): Float32Array; free(): void }
export interface CoreDocument { /* voir le code de l'étape 3 */ }
export interface CoreFactory { blank(): CoreDocument; load(bytes: Uint8Array): CoreDocument; version(): string }
export const NO_CHANGE: Change;
```

  Conventions du contrat (dans les commentaires de `api.ts`) : `points` = triplets `x, y, pression` en coordonnées
  monde à l'entrée de `CommitStroke`, en coordonnées locales à la lecture (`points(id)`, placées par `transform`) ;
  `path` = paires `x, y` monde ; un contour = polygones `x, y` locaux ; `StrokeBuilderApi.push` rend des polygones en
  coordonnées monde séparés par une paire `NaN, NaN` (blocs figés au-delà de 2 000 points, D7) ; `Change.full = true`
  = tout invalider (annuler / rétablir). Les commandes `AddShape`, `SetText`, `Transform` s'ajoutent au lot 4.

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 | tail -20`
→ `Tests  9 passed` (N ≥ 9), nom `une page vide ne s'annule pas` présent. Puis `verifier.sh : OK` (garde verts
`toolbar.test.ts` et les tests Rust).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T8 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; TS strict, `noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Aucun import de `../wasm/`, d'un framework, ni de `src/proto/`. La fausse liaison n'a pas à reproduire
la géométrie `freedraw` (contour = polyligne fermée grossière) : elle sert aux tests du moteur, pas au rendu.

**Terminé quand.** 9 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : sans objet (nouveau module prévu
par DA5)`.

**Étapes.**

- [ ] **1. Écrire les tests (rouge).** `apps/web/src/core/fake-core.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Command, CoreDocument } from "./api";
import { fakeCore } from "./fake-core";

const style = { color: "#000000", width: 4 };
const line = (y: number): Float32Array => new Float32Array([0, y, 0.5, 50, y, 0.5, 100, y, 0.5]);
const commit = (d: CoreDocument, page: string, y: number): string => {
  const c = d.apply({ type: "CommitStroke", page, points: line(y), style });
  const id = c.ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};
const firstPage = (d: CoreDocument): string => {
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  return p;
};

describe("fakeCore", () => {
  it("blank a une page", () => {
    expect(fakeCore.blank().pageIds()).toHaveLength(1);
  });

  it("une page vide ne s'annule pas", () => {
    const d = fakeCore.blank();
    expect(d.canUndo()).toBe(false);
    d.undo();
    expect(d.pageIds()).toHaveLength(1);
  });

  it("CommitStroke ajoute un élément et rend son id", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    expect(d.elementIds(p)).toEqual([id]);
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 0, 10]);
  });

  it("les points lus sont locaux", () => {
    const d = fakeCore.blank();
    const id = commit(d, firstPage(d), 10);
    expect(Array.from(d.points(id) ?? [])).toEqual([0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5]);
  });

  it("annuler puis rétablir un trait", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(0);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(1);
  });

  it("la gomme d'objet retire le trait touché, une seule étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    commit(d, p, 10);
    commit(d, p, 200);
    const cmd: Command = { type: "Erase", page: p, path: new Float32Array([50, 0, 50, 20]), radius: 5, mode: "object" };
    expect(d.apply(cmd).removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(1);
    d.undo();
    expect(d.elementIds(p)).toHaveLength(2);
  });

  it("supprimer la dernière page est refusé", () => {
    const d = fakeCore.blank();
    expect(() => d.apply({ type: "RemovePage", page: firstPage(d) })).toThrow(/dernière page/);
  });

  it("save puis load rend les mêmes éléments", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = commit(d, p, 10);
    const e = fakeCore.load(d.save("2026-11-16T12:00:00Z", "0.1.0"));
    expect(e.elementIds(p)).toEqual([id]);
    expect(e.canUndo()).toBe(false);
  });

  it("le StrokeBuilder rend un contour non vide", () => {
    const d = fakeCore.blank();
    const b = d.newStrokeBuilder(style);
    expect(b.push(new Float32Array([0, 0, 0.5, 10, 0, 0.5])).length).toBeGreaterThan(0);
    expect(b.finish().length).toBeGreaterThan(0);
    b.free();
  });
});
```

- [ ] **2. Lancer, constater l'échec** (`Failed to resolve import "./fake-core"`).

- [ ] **3. Écrire le contrat.** `apps/web/src/core/api.ts` :

```ts
// Contrat de la liaison du cœur (DA5, D10, D38), figé au lot 2. Le moteur (lot 3) n'appelle que ceci.
// points : triplets x, y, pression (monde à l'entrée de CommitStroke, locaux à la lecture, placés par transform).
// path : paires x, y en coordonnées monde. Contour : polygone x, y local à l'élément.
// StrokeBuilderApi.push : polygones x, y monde séparés par une paire NaN, NaN (blocs figés au-delà de 2 000 points).
// Change.full = true : tout invalider (annuler, rétablir). AddShape, SetText, Transform arrivent au lot 4.

export type Matrix = readonly [number, number, number, number, number, number];
export interface StrokeStyle { readonly color: string; readonly width: number }
export type EraseMode = "partial" | "object";
export type ElementKind = "stroke";

export interface Change {
  readonly pages: readonly string[];
  readonly ids: readonly string[];
  readonly removed: readonly string[];
  readonly full: boolean;
  readonly version: number;
}

export type Command =
  | { readonly type: "AddPage"; readonly after: string | null }
  | { readonly type: "RemovePage"; readonly page: string }
  | { readonly type: "CommitStroke"; readonly page: string; readonly points: Float32Array; readonly style: StrokeStyle }
  | { readonly type: "Erase"; readonly page: string; readonly path: Float32Array; readonly radius: number; readonly mode: EraseMode }
  | { readonly type: "Delete"; readonly ids: readonly string[] };

export interface ElementView {
  readonly id: string;
  readonly kind: ElementKind;
  readonly transform: Matrix;
  readonly style: StrokeStyle;
}

export interface Bounds { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

export interface StrokeBuilderApi {
  push(points: Float32Array): Float32Array;
  finish(): Float32Array;
  free(): void;
}

export interface CoreDocument {
  pageIds(): string[];
  elementIds(page: string): string[];
  /** Lève une Error dont le message dit la cause (page inconnue, dernière page, points invalides). */
  apply(cmd: Command): Change;
  element(id: string): ElementView | null;
  points(id: string): Float32Array | null;
  outline(id: string): Float32Array | null;
  hitTest(page: string, x: number, y: number, tol: number): string | null;
  hitTestPath(page: string, path: Float32Array, radius: number): string[];
  idsInRect(page: string, rect: Bounds): string[];
  bounds(ids: readonly string[]): Bounds | null;
  undo(): Change;
  redo(): Change;
  canUndo(): boolean;
  canRedo(): boolean;
  version(): number;
  save(now: string, appVersion: string): Uint8Array;
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi;
  free(): void;
}

export interface CoreFactory {
  blank(): CoreDocument;
  /** Lève une Error lisible si le fichier n'est pas un .roomboard, est plus récent, ou est corrompu. */
  load(bytes: Uint8Array): CoreDocument;
  version(): string;
}

export const NO_CHANGE: Change = { pages: [], ids: [], removed: [], full: false, version: 0 };
```

- [ ] **4. Écrire la fausse liaison.** `apps/web/src/core/fake-core.ts` :

```ts
// Fausse liaison en TS pur (D36) : même contrat que le vrai module, géométrie grossière, pour les tests du moteur.
import type { Bounds, Change, Command, CoreDocument, CoreFactory, ElementView, StrokeBuilderApi, StrokeStyle } from "./api";

interface FakeStroke { readonly id: string; readonly x0: number; readonly y0: number; readonly local: Float32Array; readonly style: StrokeStyle }
interface FakePage { readonly id: string; readonly elements: FakeStroke[] }
interface State { readonly pages: FakePage[] }

let counter = 0;
const newId = (): string => `fake-${++counter}`;
const clone = (s: State): State => ({ pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements] })) });

function toLocal(points: Float32Array): { x0: number; y0: number; local: Float32Array } {
  const x0 = points[0] ?? 0;
  const y0 = points[1] ?? 0;
  const local = new Float32Array(points.length);
  for (let i = 0; i + 2 < points.length; i += 3) {
    local[i] = (points[i] ?? 0) - x0;
    local[i + 1] = (points[i + 1] ?? 0) - y0;
    local[i + 2] = points[i + 2] ?? 0;
  }
  return { x0, y0, local };
}

function strokeTouches(s: FakeStroke, path: Float32Array, radius: number): boolean {
  for (let i = 0; i + 2 < s.local.length; i += 3) {
    const x = (s.local[i] ?? 0) + s.x0;
    const y = (s.local[i + 1] ?? 0) + s.y0;
    for (let j = 0; j + 1 < path.length; j += 2) {
      if (Math.hypot(x - (path[j] ?? 0), y - (path[j + 1] ?? 0)) <= radius + s.style.width / 2) return true;
    }
  }
  return false;
}

function polyOutline(points: Float32Array, dx: number, dy: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push((points[i] ?? 0) + dx, (points[i + 1] ?? 0) + dy);
  return new Float32Array(out);
}

class FakeDocument implements CoreDocument {
  private state: State;
  private undoStack: State[] = [];
  private redoStack: State[] = [];
  private ver = 0;

  constructor(state: State) {
    this.state = state;
  }

  private page(id: string): FakePage {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) throw new Error(`page inconnue : ${id}`);
    return p;
  }

  private stroke(id: string): FakeStroke | undefined {
    for (const p of this.state.pages) {
      const s = p.elements.find((e) => e.id === id);
      if (s) return s;
    }
    return undefined;
  }

  private step(mutate: (s: State) => Omit<Change, "version" | "full">): Change {
    const next = clone(this.state);
    const partial = mutate(next);
    if (partial.ids.length === 0 && partial.removed.length === 0 && partial.pages.length === 0) {
      return { ...partial, full: false, version: this.ver };
    }
    this.undoStack.push(this.state);
    this.redoStack = [];
    this.state = next;
    return { ...partial, full: false, version: ++this.ver };
  }

  pageIds(): string[] { return this.state.pages.map((p) => p.id); }
  elementIds(page: string): string[] { return this.page(page).elements.map((e) => e.id); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage":
        return this.step((s) => {
          const id = newId();
          const at = cmd.after === null ? s.pages.length : s.pages.findIndex((p) => p.id === cmd.after) + 1;
          s.pages.splice(at, 0, { id, elements: [] });
          return { pages: [id], ids: [], removed: [] };
        });
      case "RemovePage": {
        if (this.state.pages.length <= 1) throw new Error("la dernière page ne se supprime pas");
        const removed = this.elementIds(cmd.page);
        return this.step((s) => {
          s.pages.splice(s.pages.findIndex((p) => p.id === cmd.page), 1);
          return { pages: [cmd.page], ids: [], removed };
        });
      }
      case "CommitStroke": {
        if (cmd.points.length < 3 || cmd.points.length % 3 !== 0) throw new Error("points invalides");
        this.page(cmd.page);
        return this.step((s) => {
          const id = newId();
          const { x0, y0, local } = toLocal(cmd.points);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, x0, y0, local, style: cmd.style });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "Erase": {
        const hit = this.page(cmd.page).elements.filter((e) => strokeTouches(e, cmd.path, cmd.radius)).map((e) => e.id);
        if (hit.length === 0) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !hit.includes(e.id)));
          return { pages: [cmd.page], ids: [], removed: hit };
        });
      }
      case "Delete":
        return this.step((s) => {
          for (const p of s.pages) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !cmd.ids.includes(e.id)));
          return { pages: [], ids: [], removed: [...cmd.ids] };
        });
    }
  }

  element(id: string): ElementView | null {
    const s = this.stroke(id);
    return s ? { id, kind: "stroke", transform: [1, 0, 0, 1, s.x0, s.y0], style: s.style } : null;
  }
  points(id: string): Float32Array | null { return this.stroke(id)?.local ?? null; }
  outline(id: string): Float32Array | null {
    const s = this.stroke(id);
    return s ? polyOutline(s.local, 0, 0) : null;
  }
  hitTest(page: string, x: number, y: number, tol: number): string | null {
    const els = this.page(page).elements;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (e && strokeTouches(e, new Float32Array([x, y]), tol)) return e.id;
    }
    return null;
  }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] {
    return this.page(page).elements.filter((e) => strokeTouches(e, path, radius)).map((e) => e.id);
  }
  idsInRect(page: string, r: Bounds): string[] {
    return this.page(page).elements.filter((e) => {
      const b = this.bounds([e.id]);
      return b !== null && b.x0 >= r.x0 && b.y0 >= r.y0 && b.x1 <= r.x1 && b.y1 <= r.y1;
    }).map((e) => e.id);
  }
  bounds(ids: readonly string[]): Bounds | null {
    let b: Bounds | null = null;
    for (const id of ids) {
      const s = this.stroke(id);
      if (!s) continue;
      for (let i = 0; i + 2 < s.local.length; i += 3) {
        const x = (s.local[i] ?? 0) + s.x0;
        const y = (s.local[i + 1] ?? 0) + s.y0;
        const h = s.style.width / 2;
        b = b === null
          ? { x0: x - h, y0: y - h, x1: x + h, y1: y + h }
          : { x0: Math.min(b.x0, x - h), y0: Math.min(b.y0, y - h), x1: Math.max(b.x1, x + h), y1: Math.max(b.y1, y + h) };
      }
    }
    return b;
  }
  undo(): Change {
    const prev = this.undoStack.pop();
    if (!prev) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
    this.redoStack.push(this.state);
    this.state = prev;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  redo(): Change {
    const next = this.redoStack.pop();
    if (!next) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
    this.undoStack.push(this.state);
    this.state = next;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  version(): number { return this.ver; }
  save(now: string, appVersion: string): Uint8Array {
    const json = JSON.stringify({ now, appVersion, pages: this.state.pages.map((p) => ({
      id: p.id,
      elements: p.elements.map((e) => ({ id: e.id, x0: e.x0, y0: e.y0, local: Array.from(e.local), style: e.style })),
    })) });
    return new TextEncoder().encode(json);
  }
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const pts: number[] = [];
    void style;
    return {
      push: (p: Float32Array) => { pts.push(...p); return polyOutline(new Float32Array(pts), 0, 0); },
      finish: () => polyOutline(new Float32Array(pts), 0, 0),
      free: () => undefined,
    };
  }
  free(): void { /* rien à libérer */ }
}

interface SavedStroke { id: string; x0: number; y0: number; local: number[]; style: StrokeStyle }
interface SavedPage { id: string; elements: SavedStroke[] }

export const fakeCore: CoreFactory = {
  blank: () => new FakeDocument({ pages: [{ id: newId(), elements: [] }] }),
  load: (bytes: Uint8Array) => {
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof raw !== "object" || raw === null || !("pages" in raw) || !Array.isArray(raw.pages)) {
      throw new Error("fichier non reconnu");
    }
    const pages = (raw.pages as SavedPage[]).map((p) => ({
      id: p.id,
      elements: p.elements.map((e) => ({ id: e.id, x0: e.x0, y0: e.y0, local: new Float32Array(e.local), style: e.style })),
    }));
    return new FakeDocument({ pages });
  },
  version: () => "fake",
};
```

- [ ] **5. Vert.** `pnpm exec vitest run src/core/fake-core.test.ts` → 9 passed ; `pnpm exec tsc --noEmit` sans erreur.
- [ ] **6. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un, commit
  `feat(web): frozen core contract and fake binding (lot 2)`.

---
<a id="tache-t9"></a>
### Tâche T9 — Schéma D2, `Document::blank` (D37) et `History` (DA6)

**Objectif.** Remplacer le schéma du squelette (`pages` = entiers) par celui de D2 (racines `meta` {`schema: 1`} et
`pages` = tableau de `Y.Map`), ajouter `Document::blank()` dont la page n'entre pas dans l'historique (D37), brancher
`History` (DA6, D11) dans `Document`, l'encodage v1 et le décodage contrôlé par `meta.schema`, et les aides
`pub(crate)` dont T12 et T13 ont besoin (ils ne touchent pas `document.rs`). Scénarios : S2 (« une page vide, Ctrl+Z
ne la retire pas »), S3 (pages qui s'ajoutent et s'annulent).

**Fichiers.** Remplacer `crates/roomboard-core/src/element.rs` et `crates/roomboard-core/src/history.rs` (amorces de
T7) ; modifier `crates/roomboard-core/src/document.rs`. Rien d'autre.

**Interfaces.**
- Consomme (T7) : modules déclarés dans `lib.rs`.
- Réutilise : `crates/roomboard-core/src/document.rs:4` `Document` — `new`, `add_page`, `page_count` gardés et étendus
  (cadrage, « Document Yrs et pages », étendre).
- Réutilise : `yrs::undo::UndoManager` (`yrs-0.28.1/src/undo.rs:73`) —
  `UndoManager::with_options(Options { capture_timeout_millis: 0, tracked_origins: {"local"}, capture_transaction: None, timestamp: Arc::new(|| 0u64), init_undo_stack: vec![], init_redo_stack: vec![] })` (`:130`),
  `expand_scope(&doc, &pages)` puis `expand_scope(&doc, &meta)` (`:152`), `undo_blocking()` (`:529`),
  `redo_blocking()` (`:570`), `can_undo()` (`:482`), `can_redo()` (`:535`), `clear_all()` (`:375`).
- Réutilise : `yrs::uuid_v4()` (`lib.rs:726`) ; `ReadTxn::encode_state_as_update_v1(&StateVector::default())`
  (`transaction.rs:140`) ; `Update::decode_v1` (`updates/decoder.rs:11`) + `TransactionMut::apply_update`
  (`transaction.rs:873`).
- Produit (`element.rs`) :
  ```rust
  pub const SCHEMA: u32 = 1; pub const PAGE_WIDTH: f64 = 1920.0; pub const PAGE_HEIGHT: f64 = 1080.0;
  pub const DEFAULT_BACKGROUND: &str = "#ffffff"; pub type Transform = [f64; 6]; pub const IDENTITY: Transform;
  #[derive(Debug, Clone, PartialEq, serde::Serialize)] pub struct StrokeStyle { pub color: String, pub width: f32 }
  #[derive(Debug, Clone, PartialEq, serde::Serialize)] pub struct PageView { pub id: String, pub width: f64, pub height: f64, pub background: String }
  #[derive(Debug, Clone, PartialEq, serde::Serialize)] pub struct ElementView { pub id: String, pub kind: String, pub transform: Transform, pub style: StrokeStyle }
  pub fn invert(t: &Transform) -> Option<Transform>; pub fn apply_transform(t: &Transform, x: f64, y: f64) -> (f64, f64);
  pub(crate) fn any_f64(&Any) -> Option<f64>; pub(crate) fn out_f64(Option<Out>) -> Option<f64>; pub(crate) fn out_string(Option<Out>) -> Option<String>;
  pub(crate) fn out_bytes(Option<Out>) -> Option<Arc<[u8]>>; pub(crate) fn transform_to_any(&Transform) -> Any; pub(crate) fn out_transform(Option<Out>) -> Option<Transform>;
  pub(crate) fn style_to_any(&StrokeStyle) -> Any; pub(crate) fn out_style(Option<Out>) -> Option<StrokeStyle>;
  ```
- Produit (`history.rs`) : `pub struct History` ; `History::new(doc: &Doc, pages: &ArrayRef, meta: &MapRef) -> History`,
  `undo(&mut self) -> bool`, `redo(&mut self) -> bool`, `can_undo(&self) -> bool`, `can_redo(&self) -> bool`,
  `clear(&mut self)`. Écart assumé avec DA6 (`scope: &[&dyn AsRef<Branch>]`) : `expand_scope<T: AsRef<Branch>>`
  exige un `T` dimensionné, une tranche d'objets `dyn` ne compile pas ; les deux racines sont nommées.
- Produit (`document.rs`) :
  ```rust
  pub const LOCAL: &str = "local";
  #[derive(Debug, Clone, PartialEq)] pub enum DecodeError { Update(String), Schema { found: Option<f64> } }
  impl Document {
    pub fn new() -> Self; pub fn blank() -> Self; pub fn add_page(&mut self) -> String; pub fn insert_page_at(&mut self, index: u32) -> String;
    pub fn page_count(&self) -> u32; pub fn page_ids(&self) -> Vec<String>; pub fn page(&self, id: &str) -> Option<PageView>;
    pub fn page_index(&self, id: &str) -> Option<u32>; pub fn element_ids(&self, page: &str) -> Vec<String>;
    pub fn element(&self, id: &str) -> Option<ElementView>; pub fn schema(&self) -> Option<f64>; pub fn version(&self) -> u64;
    pub fn undo(&mut self) -> bool; pub fn redo(&mut self) -> bool; pub fn can_undo(&self) -> bool; pub fn can_redo(&self) -> bool;
    pub fn encode_v1(&self) -> Vec<u8>; pub fn from_update_v1(bytes: &[u8]) -> Result<Document, DecodeError>;
    pub(crate) fn transact_local(&self) -> TransactionMut<'_>; pub(crate) fn read(&self) -> Transaction<'_>;
    pub(crate) fn bump(&mut self) -> u64; pub(crate) fn find_page<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<(u32, MapRef)>;
    pub(crate) fn page_elements<T: ReadTxn>(&self, txn: &T, page: &str) -> Option<ArrayRef>;
    pub(crate) fn find_element<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<FoundElement>;
    pub(crate) fn pages_ref(&self) -> &ArrayRef;
  }
  pub(crate) struct FoundElement { pub page_id: String, pub elements: ArrayRef, pub index: u32, pub element: MapRef }
  pub(crate) fn insert_page(pages: &ArrayRef, txn: &mut TransactionMut, index: u32) -> String;
  ```

**Le patron à ne pas reprendre.** (1) `UndoManager::new()` ou `Options::default()` : absents sous
`wasm32-unknown-unknown` (`undo.rs:121-123`, `:804`), le build Wasm casse alors que `cargo test` natif passe.
(2) Créer la page de `blank()` dans une transaction `"local"`, ou créer `History` avant elle : Ctrl+Z retire la page
(D37). (3) Garder l'horloge système ou un délai de capture non nul : deux gestes rapprochés fusionnent en une étape
(`undo.rs`, `extend` exige `last_change > 0` ; l'horloge `|| 0u64` le garde à 0). (4) Appeler `get_or_insert_array`
pendant une transaction ouverte (verrou) : les racines sont prises une fois et gardées dans `Document`.
Chemin de référence : `docs/plans/socle-cadrage.md:38` (D11), `:64` (D37), `:296-300` (DA6) ;
`~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/yrs-0.28.1/src/undo.rs:184-246` (`should_skip`,
`handle_after_transaction`).

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib 2>&1 | tail -30`
→ `test result: ok. N passed` (N ≥ 23 : 2 de `capabilities`, ≥ 21 neufs ou gardés), noms `blank_page_is_not_undoable`,
`new_document_has_no_page`, `add_page_increments_count`, `each_local_transaction_is_one_step` présents
(`cargo test -p roomboard-core --lib -- --list 2>&1 | grep -c ": test"`). Puis
`cargo build -p roomboard-core --target wasm32-unknown-unknown 2>&1 | tail -3` (aucun `error[`) et `verifier.sh : OK`
(garde verts `wasm_document_counts_pages` et `version_is_not_empty` de `roomboard-wasm`).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T9 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ; yrs 0.28.1 : ni `UndoManager::new()`, ni
`Options::default()`, ni `move_to`, ni `get_or_insert_*` dans une transaction.

**Interdits.** Ne pas modifier ni affaiblir `new_document_has_no_page` et `add_page_increments_count`. Ne pas toucher
`capabilities.rs`, `lib.rs`, `crates/roomboard-wasm`.

**Terminé quand.** Tests verts, build wasm32 du cœur sans erreur, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé Document (étendu), UndoManager::with_options/expand_scope/undo_blocking/redo_blocking, uuid_v4, encode_state_as_update_v1, Update::decode_v1`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Tests de `History` (rouge).** Remplacer `crates/roomboard-core/src/history.rs` par le module complet de
  l'étape 3 **sans** le bloc `impl History` (seulement `pub struct History { mgr: UndoManager }` et les tests
  ci-dessous), lancer `cargo test -p roomboard-core --lib history` → erreurs `no function or associated item named
  'new'` (attendu). Tests :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Array, Map, Transact};

    fn setup() -> (Doc, ArrayRef, MapRef, History) {
        let doc = Doc::new();
        let pages = doc.get_or_insert_array("pages");
        let meta = doc.get_or_insert_map("meta");
        let h = History::new(&doc, &pages, &meta);
        (doc, pages, meta, h)
    }

    #[test]
    fn untracked_transaction_is_not_undoable() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut(), 1.0);
        assert!(!h.can_undo());
        assert!(!h.undo());
    }

    #[test]
    fn local_transaction_is_undoable() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 1.0);
        assert!(h.can_undo());
        assert!(h.undo());
        assert_eq!(pages.len(&doc.transact()), 0);
        assert!(h.redo());
        assert_eq!(pages.len(&doc.transact()), 1);
    }

    #[test]
    fn two_local_transactions_are_two_steps() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 1.0);
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 2.0);
        assert!(h.undo());
        assert_eq!(pages.len(&doc.transact()), 1);
    }

    #[test]
    fn meta_is_in_scope_and_clear_empties_stacks() {
        let (doc, _p, meta, mut h) = setup();
        meta.insert(&mut doc.transact_mut_with(LOCAL), "k", 1.0);
        assert!(h.can_undo());
        h.clear();
        assert!(!h.can_undo() && !h.can_redo());
    }
}
```

- [ ] **2. Tests du document (rouge).** Dans `crates/roomboard-core/src/document.rs`, remplacer le module `tests` par
  (les deux premiers tests sont ceux du squelette, inchangés) :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_document_has_no_page() {
        assert_eq!(Document::new().page_count(), 0);
    }

    #[test]
    fn add_page_increments_count() {
        let mut d = Document::new();
        d.add_page();
        d.add_page();
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn blank_has_one_page() {
        assert_eq!(Document::blank().page_count(), 1);
    }

    #[test]
    fn blank_page_is_not_undoable() {
        let mut d = Document::blank();
        assert!(!d.can_undo());
        assert!(!d.undo());
        assert_eq!(d.page_count(), 1);
    }

    #[test]
    fn new_document_cannot_undo_schema() {
        let mut d = Document::new();
        assert!(!d.undo());
        assert_eq!(d.schema(), Some(1.0));
    }

    #[test]
    fn page_has_id_and_default_size() {
        let d = Document::blank();
        let id = d.page_ids()[0].clone();
        assert_eq!(id.len(), 36);
        let p = d.page(&id).expect("page");
        assert_eq!((p.width, p.height), (1920.0, 1080.0));
        assert_eq!(p.background, "#ffffff");
    }

    #[test]
    fn page_ids_are_distinct() {
        let mut d = Document::blank();
        d.add_page();
        let ids = d.page_ids();
        assert_eq!(ids.len(), 2);
        assert_ne!(ids[0], ids[1]);
    }

    #[test]
    fn add_page_is_undoable_and_redoable() {
        let mut d = Document::blank();
        d.add_page();
        assert!(d.undo());
        assert_eq!(d.page_count(), 1);
        assert!(d.redo());
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn each_local_transaction_is_one_step() {
        let mut d = Document::blank();
        d.add_page();
        d.add_page();
        assert!(d.undo());
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn insert_page_at_keeps_order() {
        let mut d = Document::blank();
        let last = d.add_page();
        let mid = d.insert_page_at(1);
        assert_eq!(d.page_ids()[1], mid);
        assert_eq!(d.page_ids()[2], last);
        assert_eq!(d.page_index(&last), Some(2));
    }

    #[test]
    fn version_increases_on_change_and_undo() {
        let mut d = Document::blank();
        assert_eq!(d.version(), 0);
        d.add_page();
        assert_eq!(d.version(), 1);
        d.undo();
        assert_eq!(d.version(), 2);
        d.undo();
        assert_eq!(d.version(), 2);
    }

    #[test]
    fn element_ids_of_unknown_page_is_empty() {
        let d = Document::blank();
        assert!(d.element_ids("nope").is_empty());
        assert!(d.element("nope").is_none());
    }

    #[test]
    fn encode_decode_keeps_pages() {
        let mut d = Document::blank();
        d.add_page();
        let e = Document::from_update_v1(&d.encode_v1()).ok().expect("décodage");
        assert_eq!(e.page_ids(), d.page_ids());
        assert_eq!(e.schema(), Some(1.0));
    }

    #[test]
    fn decoded_document_has_no_history() {
        let mut d = Document::blank();
        d.add_page();
        let mut e = Document::from_update_v1(&d.encode_v1()).ok().expect("décodage");
        assert!(!e.can_undo());
        assert!(!e.undo());
        assert_eq!(e.page_count(), 2);
    }

    #[test]
    fn decode_rejects_garbage() {
        assert!(matches!(Document::from_update_v1(&[0xff, 0x00, 0x13]), Err(DecodeError::Update(_))));
    }

    #[test]
    fn decode_rejects_other_schema() {
        let doc = Doc::new();
        let meta = doc.get_or_insert_map("meta");
        meta.insert(&mut doc.transact_mut(), "schema", 2.0);
        let bytes = doc.transact().encode_state_as_update_v1(&StateVector::default());
        assert!(matches!(
            Document::from_update_v1(&bytes),
            Err(DecodeError::Schema { found: Some(f) }) if f == 2.0
        ));
    }

    #[test]
    fn invert_undoes_a_translation_and_scale() {
        let t = [2.0, 0.0, 0.0, 2.0, 10.0, 20.0];
        let i = crate::element::invert(&t).expect("inversible");
        let (x, y) = crate::element::apply_transform(&t, 3.0, 4.0);
        let (bx, by) = crate::element::apply_transform(&i, x, y);
        assert!((bx - 3.0).abs() < 1e-9 && (by - 4.0).abs() < 1e-9);
    }
}
```

  Lancer `cargo test -p roomboard-core --lib` → erreurs de compilation (`no function named blank`, …), attendu.

- [ ] **3. Écrire `history.rs`.**

```rust
//! Historique (DA6, D11) : `UndoManager` de yrs 0.28.1 configuré à la main. Sous Wasm, ni `UndoManager::new()` ni
//! `Options::default()` n'existent, et il n'y a pas d'horloge système : horloge `|| 0`, délai 0, origine "local".
//! Une transaction d'origine "local" = un geste = une étape ; tout le reste (page initiale, chargement, distant)
//! n'entre pas dans l'historique.
use std::collections::HashSet;
use std::sync::Arc;

use yrs::undo::Options;
use yrs::{ArrayRef, Doc, MapRef, Origin, UndoManager};

use crate::document::LOCAL;

pub struct History {
    mgr: UndoManager,
}

impl History {
    pub fn new(doc: &Doc, pages: &ArrayRef, meta: &MapRef) -> Self {
        let options = Options {
            capture_timeout_millis: 0,
            tracked_origins: HashSet::from([Origin::from(LOCAL)]),
            capture_transaction: None,
            timestamp: Arc::new(|| 0u64),
            init_undo_stack: Vec::new(),
            init_redo_stack: Vec::new(),
        };
        let mut mgr = UndoManager::with_options(options);
        mgr.expand_scope(doc, pages);
        mgr.expand_scope(doc, meta);
        Self { mgr }
    }

    pub fn undo(&mut self) -> bool {
        self.mgr.undo_blocking()
    }

    pub fn redo(&mut self) -> bool {
        self.mgr.redo_blocking()
    }

    pub fn can_undo(&self) -> bool {
        self.mgr.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.mgr.can_redo()
    }

    pub fn clear(&mut self) {
        self.mgr.clear_all();
    }
}
```

  (suivi du module `tests` de l'étape 1).

- [ ] **4. Écrire `element.rs`.**

```rust
//! Valeurs du schéma D2 : constantes, vues, conversions entre les valeurs yrs (`Out`, `Any`) et les types Rust.
use std::collections::HashMap;
use std::sync::Arc;

use yrs::{Any, Number, Out};

pub const SCHEMA: u32 = 1;
pub const PAGE_WIDTH: f64 = 1920.0;
pub const PAGE_HEIGHT: f64 = 1080.0;
pub const DEFAULT_BACKGROUND: &str = "#ffffff";

/// Transformation affine [a, b, c, d, e, f] : x' = a·x + c·y + e ; y' = b·x + d·y + f (D4).
pub type Transform = [f64; 6];
pub const IDENTITY: Transform = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct StrokeStyle {
    pub color: String,
    pub width: f32,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct PageView {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub background: String,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ElementView {
    pub id: String,
    pub kind: String,
    pub transform: Transform,
    pub style: StrokeStyle,
}

pub fn apply_transform(t: &Transform, x: f64, y: f64) -> (f64, f64) {
    (t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5])
}

pub fn invert(t: &Transform) -> Option<Transform> {
    let det = t[0] * t[3] - t[1] * t[2];
    if det.abs() < 1e-12 {
        return None;
    }
    let (a, b, c, d) = (t[3] / det, -t[1] / det, -t[2] / det, t[0] / det);
    let e = -(a * t[4] + c * t[5]);
    let f = -(b * t[4] + d * t[5]);
    Some([a, b, c, d, e, f])
}

pub(crate) fn any_f64(a: &Any) -> Option<f64> {
    match a {
        Any::Number(Number::Float(f)) => Some(*f),
        Any::Number(Number::Int(i)) => Some(*i as f64),
        _ => None,
    }
}

pub(crate) fn out_f64(o: Option<Out>) -> Option<f64> {
    match o {
        Some(Out::Any(a)) => any_f64(&a),
        _ => None,
    }
}

pub(crate) fn out_string(o: Option<Out>) -> Option<String> {
    match o {
        Some(Out::Any(Any::String(s))) => Some(s.to_string()),
        _ => None,
    }
}

pub(crate) fn out_bytes(o: Option<Out>) -> Option<Arc<[u8]>> {
    match o {
        Some(Out::Any(Any::Buffer(b))) => Some(b),
        _ => None,
    }
}

pub(crate) fn transform_to_any(t: &Transform) -> Any {
    Any::Array(t.iter().map(|v| Any::from(*v)).collect::<Vec<Any>>().into())
}

pub(crate) fn out_transform(o: Option<Out>) -> Option<Transform> {
    match o {
        Some(Out::Any(Any::Array(items))) if items.len() == 6 => {
            let mut t = [0.0; 6];
            for (slot, a) in t.iter_mut().zip(items.iter()) {
                *slot = any_f64(a)?;
            }
            Some(t)
        }
        _ => None,
    }
}

pub(crate) fn style_to_any(s: &StrokeStyle) -> Any {
    let mut m = HashMap::new();
    m.insert("color".to_string(), Any::from(s.color.as_str()));
    m.insert("width".to_string(), Any::from(f64::from(s.width)));
    m.insert("tool".to_string(), Any::from("pen"));
    Any::Map(Arc::new(m))
}

pub(crate) fn out_style(o: Option<Out>) -> Option<StrokeStyle> {
    match o {
        Some(Out::Any(Any::Map(m))) => {
            let color = match m.get("color")? {
                Any::String(s) => s.to_string(),
                _ => return None,
            };
            let width = any_f64(m.get("width")?)? as f32;
            Some(StrokeStyle { color, width })
        }
        _ => None,
    }
}
```

- [ ] **5. Écrire `document.rs`** (au-dessus du module `tests` de l'étape 2) :

```rust
//! Document CRDT (yrs), schéma D2 : racine `meta` {schema}, racine `pages` = tableau de pages `Y.Map`
//! {id, width, height, background, elements: Y.Array de Y.Map}. L'ordre de `elements` est l'ordre d'empilement.
use yrs::updates::decoder::Decode;
use yrs::{
    Array, ArrayPrelim, ArrayRef, Doc, In, Map, MapPrelim, MapRef, Out, ReadTxn, StateVector, Transact,
    Transaction, TransactionMut, Update,
};

use crate::element::{
    out_f64, out_string, out_style, out_transform, ElementView, PageView, DEFAULT_BACKGROUND, PAGE_HEIGHT,
    PAGE_WIDTH, SCHEMA,
};
use crate::history::History;

/// Origine des transactions d'un geste local : seules celles-ci s'annulent (D11).
pub const LOCAL: &str = "local";

#[derive(Debug, Clone, PartialEq)]
pub enum DecodeError {
    Update(String),
    Schema { found: Option<f64> },
}

pub struct Document {
    doc: Doc,
    meta: MapRef,
    pages: ArrayRef,
    history: History,
    version: u64,
}

pub(crate) struct FoundElement {
    pub page_id: String,
    pub elements: ArrayRef,
    pub index: u32,
    pub element: MapRef,
}

fn roots(doc: &Doc) -> (MapRef, ArrayRef) {
    (doc.get_or_insert_map("meta"), doc.get_or_insert_array("pages"))
}

pub(crate) fn insert_page(pages: &ArrayRef, txn: &mut TransactionMut, index: u32) -> String {
    let id = yrs::uuid_v4();
    let page = MapPrelim::from([
        ("id", In::from(id.clone())),
        ("width", In::from(PAGE_WIDTH)),
        ("height", In::from(PAGE_HEIGHT)),
        ("background", In::from(DEFAULT_BACKGROUND)),
        ("elements", In::Array(ArrayPrelim::from(Vec::<In>::new()))),
    ]);
    pages.insert(txn, index, page);
    id.to_string()
}

impl Document {
    /// Doc neuf, racines prises une fois, `meta.schema` écrit sans origine (hors historique).
    fn bare() -> (Doc, MapRef, ArrayRef) {
        let doc = Doc::new();
        let (meta, pages) = roots(&doc);
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "schema", f64::from(SCHEMA));
        }
        (doc, meta, pages)
    }

    /// `History` est créée en dernier : rien de ce qui précède ne s'annule (D37).
    fn assemble(doc: Doc, meta: MapRef, pages: ArrayRef) -> Self {
        let history = History::new(&doc, &pages, &meta);
        Self { doc, meta, pages, history, version: 0 }
    }

    pub fn new() -> Self {
        let (doc, meta, pages) = Self::bare();
        Self::assemble(doc, meta, pages)
    }

    /// Document de démarrage : une page, créée sans origine avant `History` (D37).
    pub fn blank() -> Self {
        let (doc, meta, pages) = Self::bare();
        {
            let mut txn = doc.transact_mut();
            insert_page(&pages, &mut txn, 0);
        }
        Self::assemble(doc, meta, pages)
    }

    pub fn add_page(&mut self) -> String {
        let n = self.page_count();
        self.insert_page_at(n)
    }

    pub fn insert_page_at(&mut self, index: u32) -> String {
        let id = {
            let mut txn = self.doc.transact_mut_with(LOCAL);
            insert_page(&self.pages, &mut txn, index)
        };
        self.bump();
        id
    }

    pub fn page_count(&self) -> u32 {
        let txn = self.doc.transact();
        self.pages.len(&txn)
    }

    pub fn page_ids(&self) -> Vec<String> {
        let txn = self.doc.transact();
        self.pages
            .iter(&txn)
            .filter_map(|o| match o {
                Out::YMap(m) => out_string(m.get(&txn, "id")),
                _ => None,
            })
            .collect()
    }

    pub fn page(&self, id: &str) -> Option<PageView> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, id)?;
        Some(PageView {
            id: id.to_string(),
            width: out_f64(m.get(&txn, "width"))?,
            height: out_f64(m.get(&txn, "height"))?,
            background: out_string(m.get(&txn, "background"))?,
        })
    }

    pub fn page_index(&self, id: &str) -> Option<u32> {
        let txn = self.doc.transact();
        self.find_page(&txn, id).map(|(i, _)| i)
    }

    pub fn element_ids(&self, page: &str) -> Vec<String> {
        let txn = self.doc.transact();
        match self.page_elements(&txn, page) {
            Some(els) => els
                .iter(&txn)
                .filter_map(|o| match o {
                    Out::YMap(e) => out_string(e.get(&txn, "id")),
                    _ => None,
                })
                .collect(),
            None => Vec::new(),
        }
    }

    pub fn element(&self, id: &str) -> Option<ElementView> {
        let txn = self.doc.transact();
        let found = self.find_element(&txn, id)?;
        let e = &found.element;
        Some(ElementView {
            id: id.to_string(),
            kind: out_string(e.get(&txn, "kind"))?,
            transform: out_transform(e.get(&txn, "transform"))?,
            style: out_style(e.get(&txn, "style"))?,
        })
    }

    pub fn schema(&self) -> Option<f64> {
        let txn = self.doc.transact();
        out_f64(self.meta.get(&txn, "schema"))
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn undo(&mut self) -> bool {
        let done = self.history.undo();
        if done {
            self.bump();
        }
        done
    }

    pub fn redo(&mut self) -> bool {
        let done = self.history.redo();
        if done {
            self.bump();
        }
        done
    }

    pub fn can_undo(&self) -> bool {
        self.history.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.history.can_redo()
    }

    /// État complet en mise à jour binaire v1 depuis un vecteur d'état vide (D24).
    pub fn encode_v1(&self) -> Vec<u8> {
        self.doc.transact().encode_state_as_update_v1(&StateVector::default())
    }

    /// Décode un état v1 ; `History` est recréée après : rien de chargé ne s'annule (D37).
    pub fn from_update_v1(bytes: &[u8]) -> Result<Self, DecodeError> {
        let update = Update::decode_v1(bytes).map_err(|e| DecodeError::Update(format!("{e:?}")))?;
        let doc = Doc::new();
        let (meta, pages) = roots(&doc);
        {
            let mut txn = doc.transact_mut();
            txn.apply_update(update).map_err(|e| DecodeError::Update(format!("{e:?}")))?;
        }
        let found = {
            let txn = doc.transact();
            out_f64(meta.get(&txn, "schema"))
        };
        if found != Some(f64::from(SCHEMA)) {
            return Err(DecodeError::Schema { found });
        }
        Ok(Self::assemble(doc, meta, pages))
    }

    pub(crate) fn transact_local(&self) -> TransactionMut<'_> {
        self.doc.transact_mut_with(LOCAL)
    }

    pub(crate) fn read(&self) -> Transaction<'_> {
        self.doc.transact()
    }

    pub(crate) fn bump(&mut self) -> u64 {
        self.version += 1;
        self.version
    }

    pub(crate) fn pages_ref(&self) -> &ArrayRef {
        &self.pages
    }

    pub(crate) fn find_page<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<(u32, MapRef)> {
        self.pages.iter(txn).enumerate().find_map(|(i, o)| match o {
            Out::YMap(m) if out_string(m.get(txn, "id")).as_deref() == Some(id) => Some((i as u32, m)),
            _ => None,
        })
    }

    pub(crate) fn page_elements<T: ReadTxn>(&self, txn: &T, page: &str) -> Option<ArrayRef> {
        let (_, m) = self.find_page(txn, page)?;
        match m.get(txn, "elements") {
            Some(Out::YArray(a)) => Some(a),
            _ => None,
        }
    }

    pub(crate) fn find_element<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<FoundElement> {
        for page in self.pages.iter(txn) {
            let Out::YMap(pm) = page else { continue };
            let Some(Out::YArray(els)) = pm.get(txn, "elements") else { continue };
            let page_id = out_string(pm.get(txn, "id")).unwrap_or_default();
            for (i, o) in els.iter(txn).enumerate() {
                if let Out::YMap(e) = o {
                    if out_string(e.get(txn, "id")).as_deref() == Some(id) {
                        return Some(FoundElement { page_id, elements: els.clone(), index: i as u32, element: e });
                    }
                }
            }
        }
        None
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}
```

  Si `clippy` signale `dead_code` sur une aide `pub(crate)` pas encore appelée (T12, T13 l'appellent), poser
  `#[allow(dead_code)]` sur cette aide seulement, avec le commentaire `// appelée par commands.rs / format (lot 2)`.
  Même règle pour les aides `pub(crate)` d'`element.rs` (`out_bytes`, `style_to_any`, `transform_to_any`).
  Si le compilateur refuse une fin de bloc qui emprunte `txn` (E0597, temporaire de fin de bloc), lier la valeur à une
  variable avant la fin du bloc (`let out = …; out`).

- [ ] **6. Vert.** `cargo test -p roomboard-core --lib` → ≥ 23 passed ; build wasm32 du cœur sans erreur.
- [ ] **7. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un (`element.rs`, `history.rs`,
  `document.rs`), commit `feat(core): D2 schema, blank document and History`.

---

<a id="tache-t10"></a>
### Tâche T10 — Points, contour `freedraw` et `StrokeBuilder` (D6, D7)

**Objectif.** Écrire la seule géométrie de l'encre (DA7) : codec des points (D6 : `f32` petit-boutiste, 3 par point,
doublons < 0,5 retirés, origine locale = premier point), contour à largeur variable par `freedraw::get_stroke`, et
`StrokeBuilder` pour l'encre vive (recalcul complet ≤ 2 000 points, puis blocs figés de 256 points). Scénario : S2
(les traits tracés, enregistrés, rouverts aux mêmes coordonnées).

**Fichiers.** Remplacer les amorces `crates/roomboard-core/src/ink/points.rs`, `ink/outline.rs`, `ink/builder.rs`.
Rien d'autre.

**Interfaces.**
- Consomme (T7) : `freedraw` dans `Cargo.toml`, modules déclarés dans `ink/mod.rs`.
- Réutilise : crate `freedraw` 1.0.4 — `get_stroke(points: &[InputPoint], options: &StrokeOptions) -> Vec<[f64; 2]>`
  (`freedraw-1.0.4/src/get_stroke.rs:13`), `InputPoint::Struct { x: f64, y: f64, pressure: Option<f64> }`
  (`types.rs:107-110`), `StrokeOptions { size, thinning, smoothing, streamline, simulate_pressure, last, .. }`
  (`types.rs:13-23`, `Default` disponible) — appelée **seulement** par `ink::outline` (cadrage, « Contour à largeur
  variable »).
- Produit :
  ```rust
  // ink/points.rs
  #[derive(Debug, Clone, Copy, PartialEq)] pub struct InkPoint { pub x: f32, pub y: f32, pub pressure: f32 }
  pub const MIN_STEP: f32 = 0.5;
  pub fn from_flat(flat: &[f32]) -> Vec<InkPoint>; pub fn to_flat(points: &[InkPoint]) -> Vec<f32>;
  pub fn dist(a: &InkPoint, b: &InkPoint) -> f32; pub fn dedup(points: &[InkPoint]) -> Vec<InkPoint>;
  pub fn encode(points: &[InkPoint]) -> Vec<u8>; pub fn decode(bytes: &[u8]) -> Option<Vec<InkPoint>>;
  pub fn to_local(points: &[InkPoint]) -> (Vec<InkPoint>, (f64, f64));
  // ink/outline.rs
  #[derive(Debug, Clone, Copy, PartialEq)] pub struct InkStyle { pub width: f32 }
  pub const THINNING: f64 = 0.5; pub const SMOOTHING: f64 = 0.5; pub const STREAMLINE: f64 = 0.3;
  pub fn outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32>;
  pub(crate) fn outline_with(points: &[InkPoint], style: &InkStyle, last: bool) -> Vec<f32>;
  // ink/builder.rs
  pub const FULL_LIMIT: usize = 2000; pub const BLOCK: usize = 256;
  pub struct StrokeBuilder;  impl StrokeBuilder { pub fn new(style: InkStyle) -> Self; pub fn push(&mut self, flat: &[f32]) -> Vec<f32>;
    pub fn finish(&self) -> Vec<f32>; pub fn points(&self) -> &[InkPoint]; pub fn frozen_blocks(&self) -> usize; pub fn frozen_upto(&self) -> usize }
  ```
  Écart assumé avec DA7 (`ink::outline(points, style) -> Vec<f32>`) : aucun ; `outline_with` ajoute seulement le
  drapeau `last` de `freedraw` (faux pendant le geste). `STREAMLINE` vaut 0,3 et non 0,5 (défaut de perfect-freehand) :
  le lissage par traînée ajoute du retard visible à l'encre vive (risque n° 1) ; réglage à revoir après l'essai ENI
  (H2-12).

**Le patron à ne pas reprendre.** Recalculer tout le contour à chaque image sans limite (coût quadratique sur un long
trait), ou découper en blocs **sans** recouvrement (trou visible entre deux blocs) ; laisser `simulate_pressure` au
défaut de `freedraw` (il invente une pression depuis la vitesse, contraire à D8) ; rendre un contour vide pour un
point unique (un tap du stylet doit laisser un point). Chemin de référence : `docs/plans/socle-cadrage.md:34` (D7),
`:302-306` (DA7), `:251-253` (H2-12) ; `freedraw-1.0.4/src/get_stroke_points.rs:21,50` (cas vide et point unique).

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib ink:: 2>&1 | tail -30`
→ `test result: ok. N passed` (N ≥ 20), noms `long_stroke_freezes_blocks_of_256`, `finish_matches_outline_under_limit`,
`encode_is_little_endian` présents. Puis build wasm32 du cœur sans `error[` et `verifier.sh : OK`.

**Essais de plateforme.** Aucun (le rendu du contour est jugé au lot 3, banc rejoué à l'ENI).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T10 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ni dépendance au navigateur.

**Interdits.** Aucun appel à `freedraw` hors de `ink/outline.rs`. Ne pas toucher `ink/mod.rs`, `hit.rs`, `erase.rs`.

**Terminé quand.** ≥ 20 tests `ink::` verts, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé freedraw::get_stroke (ink/outline.rs seul)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Tests des points (rouge).** `ink/points.rs` : poser seulement `pub struct InkPoint` et ce module de tests,
  lancer → erreurs `cannot find function` (attendu).

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f32, y: f32) -> InkPoint {
        InkPoint { x, y, pressure: 0.5 }
    }

    #[test]
    fn from_flat_ignores_trailing_values() {
        assert_eq!(from_flat(&[1.0, 2.0, 0.5, 9.0]), vec![InkPoint { x: 1.0, y: 2.0, pressure: 0.5 }]);
    }

    #[test]
    fn to_flat_round_trip() {
        let pts = vec![p(1.0, 2.0), p(3.0, 4.0)];
        assert_eq!(from_flat(&to_flat(&pts)), pts);
    }

    #[test]
    fn dedup_drops_points_closer_than_half_unit() {
        let pts = vec![p(0.0, 0.0), p(0.2, 0.0), p(0.6, 0.0), p(0.7, 0.0)];
        assert_eq!(dedup(&pts), vec![p(0.0, 0.0), p(0.6, 0.0)]);
    }

    #[test]
    fn encode_decode_round_trip() {
        let pts = vec![p(1.5, -2.25), InkPoint { x: 1e6, y: 0.0, pressure: 1.0 }];
        assert_eq!(decode(&encode(&pts)), Some(pts));
    }

    #[test]
    fn encode_is_little_endian() {
        let b = encode(&[InkPoint { x: 1.0, y: 0.0, pressure: 0.0 }]);
        assert_eq!(b.len(), 12);
        assert_eq!(&b[0..4], &[0x00, 0x00, 0x80, 0x3f]);
    }

    #[test]
    fn decode_rejects_bad_length() {
        assert_eq!(decode(&[0u8; 13]), None);
    }

    #[test]
    fn to_local_origin_is_first_point() {
        let (local, origin) = to_local(&[p(10.0, 20.0), p(15.0, 25.0)]);
        assert_eq!(origin, (10.0, 20.0));
        assert_eq!(local, vec![p(0.0, 0.0), p(5.0, 5.0)]);
    }
}
```

- [ ] **2. Écrire `ink/points.rs`** (au-dessus des tests) :

```rust
//! Points d'encre (D6) : ligne médiane brute (x, y, pression), rangée en `f32` petit-boutiste, 3 nombres par point.
//! Le lissage n'est jamais destructif : il est calculé par `ink::outline`.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InkPoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32,
}

/// Distance sous laquelle un point est un doublon du précédent gardé (D6).
pub const MIN_STEP: f32 = 0.5;

pub fn from_flat(flat: &[f32]) -> Vec<InkPoint> {
    flat.chunks_exact(3).map(|c| InkPoint { x: c[0], y: c[1], pressure: c[2] }).collect()
}

pub fn to_flat(points: &[InkPoint]) -> Vec<f32> {
    points.iter().flat_map(|p| [p.x, p.y, p.pressure]).collect()
}

pub fn dist(a: &InkPoint, b: &InkPoint) -> f32 {
    (a.x - b.x).hypot(a.y - b.y)
}

pub fn dedup(points: &[InkPoint]) -> Vec<InkPoint> {
    let mut out: Vec<InkPoint> = Vec::with_capacity(points.len());
    for p in points {
        match out.last() {
            Some(last) if dist(last, p) < MIN_STEP => {}
            _ => out.push(*p),
        }
    }
    out
}

pub fn encode(points: &[InkPoint]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(points.len() * 12);
    for p in points {
        for v in [p.x, p.y, p.pressure] {
            bytes.extend_from_slice(&v.to_le_bytes());
        }
    }
    bytes
}

pub fn decode(bytes: &[u8]) -> Option<Vec<InkPoint>> {
    if bytes.len() % 12 != 0 {
        return None;
    }
    let f = |c: &[u8], i: usize| f32::from_le_bytes([c[i], c[i + 1], c[i + 2], c[i + 3]]);
    Some(bytes.chunks_exact(12).map(|c| InkPoint { x: f(c, 0), y: f(c, 4), pressure: f(c, 8) }).collect())
}

/// Origine locale = premier point (D4) : points relatifs, et la translation qui les replace sur la page.
pub fn to_local(points: &[InkPoint]) -> (Vec<InkPoint>, (f64, f64)) {
    let Some(first) = points.first() else {
        return (Vec::new(), (0.0, 0.0));
    };
    let (ox, oy) = (first.x, first.y);
    let local = points.iter().map(|p| InkPoint { x: p.x - ox, y: p.y - oy, pressure: p.pressure }).collect();
    (local, (f64::from(ox), f64::from(oy)))
}
```

- [ ] **3. Tests du contour (rouge)**, module `tests` de `ink/outline.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn line(n: usize, pressure: f32) -> Vec<InkPoint> {
        (0..n).map(|i| InkPoint { x: i as f32 * 2.0, y: 0.0, pressure }).collect()
    }

    fn height(poly: &[f32]) -> f32 {
        let ys: Vec<f32> = poly.chunks_exact(2).map(|c| c[1]).collect();
        ys.iter().cloned().fold(f32::MIN, f32::max) - ys.iter().cloned().fold(f32::MAX, f32::min)
    }

    #[test]
    fn outline_is_a_polygon_of_xy_pairs() {
        let o = outline(&line(30, 0.5), &InkStyle { width: 8.0 });
        assert!(o.len() >= 6 && o.len() % 2 == 0, "longueur {}", o.len());
        assert!(o.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn empty_points_give_empty_outline() {
        assert!(outline(&[], &InkStyle { width: 8.0 }).is_empty());
    }

    #[test]
    fn single_point_gives_a_dot() {
        let o = outline(&line(1, 0.5), &InkStyle { width: 8.0 });
        assert!(o.len() >= 6);
    }

    #[test]
    fn wider_style_gives_wider_outline() {
        let thin = height(&outline(&line(30, 0.5), &InkStyle { width: 4.0 }));
        let thick = height(&outline(&line(30, 0.5), &InkStyle { width: 16.0 }));
        assert!(thick > thin * 2.0, "{thin} {thick}");
    }

    #[test]
    fn higher_pressure_gives_wider_outline() {
        let light = height(&outline(&line(30, 0.1), &InkStyle { width: 8.0 }));
        let heavy = height(&outline(&line(30, 1.0), &InkStyle { width: 8.0 }));
        assert!(heavy > light, "{light} {heavy}");
    }

    #[test]
    fn outline_is_deterministic() {
        let s = InkStyle { width: 8.0 };
        assert_eq!(outline(&line(50, 0.5), &s), outline(&line(50, 0.5), &s));
    }
}
```

- [ ] **4. Écrire `ink/outline.rs`** :

```rust
//! Contour à largeur variable (D7, DA7) : la seule géométrie de l'encre, pour le rendu ET la collision.
//! `freedraw` (portage MIT de perfect-freehand) n'est appelé qu'ici.
use freedraw::{get_stroke, InputPoint, StrokeOptions};

use super::points::InkPoint;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InkStyle {
    pub width: f32,
}

/// Réglages fixés au lot 2 (H2-12), revus après l'essai ENI. Streamline bas : moins de traînée sur l'encre vive.
pub const THINNING: f64 = 0.5;
pub const SMOOTHING: f64 = 0.5;
pub const STREAMLINE: f64 = 0.3;

fn options(style: &InkStyle, last: bool) -> StrokeOptions {
    StrokeOptions {
        size: Some(f64::from(style.width)),
        thinning: Some(THINNING),
        smoothing: Some(SMOOTHING),
        streamline: Some(STREAMLINE),
        simulate_pressure: Some(false),
        last: Some(last),
        ..Default::default()
    }
}

/// Contour d'un trait terminé : polygone fermé, x, y alternés, dans le repère des points.
pub fn outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32> {
    outline_with(points, style, true)
}

/// `last = false` pendant le geste (la fin du trait n'est pas encore connue).
pub(crate) fn outline_with(points: &[InkPoint], style: &InkStyle, last: bool) -> Vec<f32> {
    let Some(first) = points.first() else {
        return Vec::new();
    };
    let input: Vec<InputPoint> = points
        .iter()
        .map(|p| InputPoint::Struct { x: f64::from(p.x), y: f64::from(p.y), pressure: Some(f64::from(p.pressure)) })
        .collect();
    let poly = get_stroke(&input, &options(style, last));
    if poly.len() < 3 {
        return dot(first, style);
    }
    poly.iter().flat_map(|p| [p[0] as f32, p[1] as f32]).collect()
}

/// Repli pour un point isolé : disque à 16 côtés de diamètre `width`.
fn dot(p: &InkPoint, style: &InkStyle) -> Vec<f32> {
    let r = (style.width / 2.0).max(0.5);
    (0..16)
        .flat_map(|i| {
            let a = i as f32 * std::f32::consts::TAU / 16.0;
            [p.x + r * a.cos(), p.y + r * a.sin()]
        })
        .collect()
}
```

- [ ] **5. Tests de `StrokeBuilder` (rouge)**, module `tests` de `ink/builder.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::ink::outline::outline;
    use crate::ink::points::from_flat;

    fn flat(n: usize) -> Vec<f32> {
        (0..n).flat_map(|i| [i as f32, (i as f32 * 0.1).sin() * 20.0, 0.5]).collect()
    }

    fn nan_pairs(o: &[f32]) -> usize {
        o.chunks_exact(2).filter(|c| c[0].is_nan() && c[1].is_nan()).count()
    }

    #[test]
    fn empty_builder_gives_empty_outline() {
        assert!(StrokeBuilder::new(InkStyle { width: 6.0 }).finish().is_empty());
    }

    #[test]
    fn push_returns_single_polygon_under_limit() {
        let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
        let o = b.push(&flat(500));
        assert!(!o.is_empty());
        assert_eq!(nan_pairs(&o), 0);
        assert_eq!(b.frozen_blocks(), 0);
    }

    #[test]
    fn finish_matches_outline_under_limit() {
        let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
        b.push(&flat(300));
        assert_eq!(b.finish(), outline(&from_flat(&flat(300)), &InkStyle { width: 6.0 }));
    }

    #[test]
    fn push_drops_close_points_across_calls() {
        let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
        b.push(&[0.0, 0.0, 0.5]);
        b.push(&[0.1, 0.0, 0.5, 1.0, 0.0, 0.5]);
        assert_eq!(b.points().len(), 2);
    }

    #[test]
    fn long_stroke_freezes_blocks_of_256() {
        let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
        let o = b.push(&flat(2500));
        assert_eq!(b.frozen_blocks(), 9);
        assert_eq!(nan_pairs(&o), 9);
    }

    #[test]
    fn frozen_blocks_overlap_by_one_point() {
        let mut b = StrokeBuilder::new(InkStyle { width: 6.0 });
        b.push(&flat(2500));
        assert_eq!(b.frozen_upto(), b.frozen_blocks() * BLOCK);
        assert!(b.points().len() - b.frozen_upto() <= BLOCK + 1);
    }

    #[test]
    fn chunking_does_not_change_frozen_blocks() {
        let all = flat(2500);
        let mut one = StrokeBuilder::new(InkStyle { width: 6.0 });
        one.push(&all);
        let mut many = StrokeBuilder::new(InkStyle { width: 6.0 });
        for chunk in all.chunks(300) {
            many.push(chunk);
        }
        assert_eq!(one.frozen_blocks(), many.frozen_blocks());
        assert_eq!(one.finish(), many.finish());
    }
}
```

  Note : `flat(n)` donne des points espacés d'au moins 1 unité, aucun n'est retiré par la règle des 0,5.
  `chunks(300)` = 100 triplets entiers (la page pousse toujours des triplets entiers) : `push` n'a aucun reste à gérer.

- [ ] **6. Écrire `ink/builder.rs`** :

```rust
//! Encre vive (D7, DA7, D10) : la page pousse les points accumulés une fois par image. Contour complet recalculé
//! tant que le trait a ≤ FULL_LIMIT points ; au-delà, blocs de BLOCK points figés (chaque bloc reprend le dernier
//! point du précédent) et seul le dernier bloc est recalculé. Polygones séparés par une paire NaN, NaN.
use super::outline::{outline_with, InkStyle};
use super::points::{dist, from_flat, InkPoint, MIN_STEP};

pub const FULL_LIMIT: usize = 2000;
pub const BLOCK: usize = 256;

pub struct StrokeBuilder {
    style: InkStyle,
    points: Vec<InkPoint>,
    frozen: Vec<Vec<f32>>,
    frozen_upto: usize,
}

impl StrokeBuilder {
    pub fn new(style: InkStyle) -> Self {
        Self { style, points: Vec::new(), frozen: Vec::new(), frozen_upto: 0 }
    }

    pub fn points(&self) -> &[InkPoint] {
        &self.points
    }

    pub fn frozen_blocks(&self) -> usize {
        self.frozen.len()
    }

    pub fn frozen_upto(&self) -> usize {
        self.frozen_upto
    }

    /// Ajoute des triplets x, y, pression ; rend le contour courant.
    pub fn push(&mut self, flat: &[f32]) -> Vec<f32> {
        for p in from_flat(flat) {
            match self.points.last() {
                Some(last) if dist(last, &p) < MIN_STEP => {}
                _ => self.points.push(p),
            }
        }
        self.freeze();
        self.current(false)
    }

    /// Contour final du geste (fin du trait connue).
    pub fn finish(&self) -> Vec<f32> {
        self.current(true)
    }

    fn freeze(&mut self) {
        if self.points.len() <= FULL_LIMIT {
            return;
        }
        while self.points.len() - self.frozen_upto > BLOCK + 1 {
            let end = self.frozen_upto + BLOCK;
            let block = outline_with(&self.points[self.frozen_upto..=end], &self.style, false);
            self.frozen.push(block);
            self.frozen_upto = end;
        }
    }

    fn current(&self, last: bool) -> Vec<f32> {
        let tail = outline_with(&self.points[self.frozen_upto..], &self.style, last);
        if self.frozen.is_empty() {
            return tail;
        }
        let mut out = Vec::with_capacity(self.frozen.iter().map(|b| b.len() + 2).sum::<usize>() + tail.len());
        for block in &self.frozen {
            out.extend_from_slice(block);
            out.extend_from_slice(&[f32::NAN, f32::NAN]);
        }
        out.extend(tail);
        out
    }
}
```

  Vérification de `long_stroke_freezes_blocks_of_256` : 2 500 points ; la boucle fige tant que
  `2500 - upto > 257` : upto passe de 0 à 2 304 par pas de 256 (9 blocs), reste 196 points.

- [ ] **7. Vert.** `cargo test -p roomboard-core --lib ink::` → ≥ 20 passed. Si `single_point_gives_a_dot` passe sans
  le repli `dot` (freedraw rend déjà un disque), garder le repli : il couvre `get_stroke` qui rendrait < 3 points.
- [ ] **8. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un, commit
  `feat(core): ink points, freedraw outline and StrokeBuilder`.

---

<a id="tache-t11"></a>
### Tâche T11 — Collision et coupe par la gomme (D12, DA7)

**Objectif.** Collision d'un point ou d'un chemin avec un contour (sélection au clic, gomme d'objet) et coupe d'un
trait par la gomme partielle : points retirés sous le disque, extrémités interpolées, un trait devient 0, 1 ou
plusieurs morceaux (D12). Scénario : S2 (« gommer en travers du milieu du deuxième : il en reste quatre »).

**Fichiers.** Remplacer les amorces `crates/roomboard-core/src/ink/hit.rs` et `ink/erase.rs`. Rien d'autre.

**Interfaces.**
- Consomme (T10) : `ink::points::InkPoint` ; aucune autre.
- Réutilise : aucun module de la liste du cadrage (calcul neuf, prévu par DA7 : `ink::hit` / `ink::erase`).
- Produit :
  ```rust
  // ink/hit.rs — polygones et chemins en paires x, y
  pub fn point_in_polygon(poly: &[f32], x: f32, y: f32) -> bool;
  pub fn dist_point_segment(p: (f32, f32), a: (f32, f32), b: (f32, f32)) -> f32;
  pub fn dist_to_edges(poly: &[f32], x: f32, y: f32) -> f32;
  pub fn dist_to_path(path: &[f32], x: f32, y: f32) -> f32;
  pub fn sample_path(path: &[f32], step: f32) -> Vec<(f32, f32)>;
  pub fn hit_outline(poly: &[f32], x: f32, y: f32, tol: f32) -> bool;
  pub fn path_hits_outline(poly: &[f32], path: &[f32], radius: f32) -> bool;
  // ink/erase.rs
  pub fn erase(points: &[InkPoint], half_width: f32, path: &[f32], radius: f32) -> Option<Vec<Vec<InkPoint>>>;
  ```
  `erase` rend `None` si le trait n'est pas touché (aucune écriture), `Some(morceaux)` sinon (morceaux de ≥ 2 points ;
  `Some(vec![])` = trait entièrement effacé). Écart assumé avec DA7 (« `ink::erase` appelle `ink::outline` ») : la coupe
  travaille sur la ligne médiane avec une portée `radius + half_width`, car couper un polygone de contour ne rend pas
  des points de ligne médiane réenregistrables ; la collision (`hit_outline`, `path_hits_outline`) utilise bien le
  contour.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib -- ink::hit ink::erase 2>&1 | tail -25`
→ N ≥ 12 passed, noms `erase_through_middle_gives_two_pieces`, `cut_point_lies_on_reach_circle`,
`fast_sparse_stroke_is_still_cut` présents. Puis `verifier.sh : OK` (garde verts les tests `ink::` de T10).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T11 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ni dépendance au navigateur.

**Interdits.** Ne pas toucher `points.rs`, `outline.rs`, `builder.rs`, `ink/mod.rs`. Aucune lecture du document ici
(fonctions pures).

**Terminé quand.** ≥ 12 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : sans objet (calcul neuf, DA7)`.

**Étapes.**

- [ ] **1. Tests de collision (rouge)**, module `tests` de `ink/hit.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    const SQUARE: [f32; 8] = [0.0, 0.0, 10.0, 0.0, 10.0, 10.0, 0.0, 10.0];

    #[test]
    fn point_inside_square() {
        assert!(point_in_polygon(&SQUARE, 5.0, 5.0));
    }

    #[test]
    fn point_outside_square() {
        assert!(!point_in_polygon(&SQUARE, 15.0, 5.0));
    }

    #[test]
    fn near_edge_hits_within_tolerance_only() {
        assert!(hit_outline(&SQUARE, 12.0, 5.0, 2.5));
        assert!(!hit_outline(&SQUARE, 12.0, 5.0, 1.5));
    }

    #[test]
    fn dist_point_segment_clamps_to_ends() {
        assert!((dist_point_segment((-3.0, 4.0), (0.0, 0.0), (10.0, 0.0)) - 5.0).abs() < 1e-5);
        assert!((dist_point_segment((5.0, 2.0), (0.0, 0.0), (10.0, 0.0)) - 2.0).abs() < 1e-5);
    }

    #[test]
    fn dist_to_single_point_path() {
        assert!((dist_to_path(&[0.0, 0.0], 3.0, 4.0) - 5.0).abs() < 1e-5);
    }

    #[test]
    fn sample_path_spacing_is_at_most_step() {
        let s = sample_path(&[0.0, 0.0, 10.0, 0.0], 2.0);
        assert!(s.len() >= 6);
        for w in s.windows(2) {
            assert!(((w[1].0 - w[0].0).powi(2) + (w[1].1 - w[0].1).powi(2)).sqrt() <= 2.0 + 1e-4);
        }
    }

    #[test]
    fn path_crossing_outline_hits() {
        assert!(path_hits_outline(&SQUARE, &[-20.0, 5.0, 30.0, 5.0], 1.0));
    }

    #[test]
    fn path_far_from_outline_misses() {
        assert!(!path_hits_outline(&SQUARE, &[-20.0, 50.0, 30.0, 50.0], 1.0));
    }
}
```

- [ ] **2. Écrire `ink/hit.rs`** :

```rust
//! Collision sur le contour (DA7) : point dans le polygone (règle pair-impair) ou à moins de `tol` d'une arête.

pub fn point_in_polygon(poly: &[f32], x: f32, y: f32) -> bool {
    let n = poly.len() / 2;
    if n < 3 {
        return false;
    }
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let (xi, yi) = (poly[2 * i], poly[2 * i + 1]);
        let (xj, yj) = (poly[2 * j], poly[2 * j + 1]);
        if (yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi {
            inside = !inside;
        }
        j = i;
    }
    inside
}

pub fn dist_point_segment(p: (f32, f32), a: (f32, f32), b: (f32, f32)) -> f32 {
    let (dx, dy) = (b.0 - a.0, b.1 - a.1);
    let l2 = dx * dx + dy * dy;
    let t = if l2 == 0.0 { 0.0 } else { (((p.0 - a.0) * dx + (p.1 - a.1) * dy) / l2).clamp(0.0, 1.0) };
    (p.0 - (a.0 + t * dx)).hypot(p.1 - (a.1 + t * dy))
}

pub fn dist_to_edges(poly: &[f32], x: f32, y: f32) -> f32 {
    let n = poly.len() / 2;
    if n == 0 {
        return f32::INFINITY;
    }
    (0..n)
        .map(|i| {
            let k = (i + 1) % n;
            dist_point_segment((x, y), (poly[2 * i], poly[2 * i + 1]), (poly[2 * k], poly[2 * k + 1]))
        })
        .fold(f32::INFINITY, f32::min)
}

/// Distance d'un point à une polyligne ouverte (paires x, y) ; un seul point = distance à ce point.
pub fn dist_to_path(path: &[f32], x: f32, y: f32) -> f32 {
    let n = path.len() / 2;
    match n {
        0 => f32::INFINITY,
        1 => (x - path[0]).hypot(y - path[1]),
        _ => (0..n - 1)
            .map(|i| dist_point_segment((x, y), (path[2 * i], path[2 * i + 1]), (path[2 * i + 2], path[2 * i + 3])))
            .fold(f32::INFINITY, f32::min),
    }
}

/// Points de la polyligne, plus des points intermédiaires tous les `step` au plus.
pub fn sample_path(path: &[f32], step: f32) -> Vec<(f32, f32)> {
    let pts: Vec<(f32, f32)> = path.chunks_exact(2).map(|c| (c[0], c[1])).collect();
    let mut out = Vec::new();
    for (i, &a) in pts.iter().enumerate() {
        out.push(a);
        if let Some(&b) = pts.get(i + 1) {
            let len = (b.0 - a.0).hypot(b.1 - a.1);
            let k = (len / step.max(1e-3)).ceil() as usize;
            for s in 1..k {
                let t = s as f32 / k as f32;
                out.push((a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t));
            }
        }
    }
    out
}

pub fn hit_outline(poly: &[f32], x: f32, y: f32, tol: f32) -> bool {
    point_in_polygon(poly, x, y) || dist_to_edges(poly, x, y) <= tol
}

/// Le chemin de la gomme d'objet (paires x, y) touche-t-il le contour, à `radius` près ?
pub fn path_hits_outline(poly: &[f32], path: &[f32], radius: f32) -> bool {
    sample_path(path, (radius / 2.0).max(0.25)).into_iter().any(|(x, y)| hit_outline(poly, x, y, radius))
}
```

- [ ] **3. Tests de la gomme (rouge)**, module `tests` de `ink/erase.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::ink::hit::dist_to_path;

    fn line(n: usize) -> Vec<InkPoint> {
        (0..=n).map(|i| InkPoint { x: i as f32, y: 0.0, pressure: 0.5 }).collect()
    }

    #[test]
    fn erase_miss_returns_none() {
        assert_eq!(erase(&line(100), 2.0, &[50.0, 40.0, 60.0, 40.0], 5.0), None);
    }

    #[test]
    fn erase_through_middle_gives_two_pieces() {
        let pieces = erase(&line(100), 2.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
        assert!(pieces[0].iter().all(|p| p.x < 50.0));
        assert!(pieces[1].iter().all(|p| p.x > 50.0));
    }

    #[test]
    fn erase_start_gives_one_piece() {
        let pieces = erase(&line(100), 2.0, &[0.0, -20.0, 0.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 1);
        assert!(pieces[0][0].x > 6.9);
    }

    #[test]
    fn erase_everything_gives_no_piece() {
        assert_eq!(erase(&line(10), 2.0, &[5.0, 0.0], 50.0), Some(vec![]));
    }

    #[test]
    fn cut_point_lies_on_reach_circle() {
        let path = [50.0, -20.0, 50.0, 20.0];
        let pieces = erase(&line(100), 2.0, &path, 5.0).expect("touché");
        let end = *pieces[0].last().expect("point");
        assert!((dist_to_path(&path, end.x, end.y) - 7.0).abs() < 0.01, "{end:?}");
    }

    #[test]
    fn cut_interpolates_pressure() {
        let pts: Vec<InkPoint> =
            (0..=100).map(|i| InkPoint { x: i as f32, y: 0.0, pressure: i as f32 / 100.0 }).collect();
        let pieces = erase(&pts, 0.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        let end = *pieces[0].last().expect("point");
        assert!((end.pressure - end.x / 100.0).abs() < 0.01, "{end:?}");
    }

    #[test]
    fn fast_sparse_stroke_is_still_cut() {
        let pts = vec![InkPoint { x: 0.0, y: 0.0, pressure: 0.5 }, InkPoint { x: 100.0, y: 0.0, pressure: 0.5 }];
        let pieces = erase(&pts, 1.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
    }
}
```

- [ ] **4. Écrire `ink/erase.rs`** :

```rust
//! Gomme partielle (D12) : retire les points de la ligne médiane à moins de `radius + half_width` du chemin de la
//! gomme et interpole les extrémités sur ce cercle. Un trait devient 0, 1 ou plusieurs morceaux.
use super::hit::dist_to_path;
use super::points::InkPoint;

fn lerp(a: InkPoint, b: InkPoint, t: f32) -> InkPoint {
    InkPoint { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pressure: a.pressure + (b.pressure - a.pressure) * t }
}

/// Densifie la ligne médiane : deux points consécutifs à plus de `step` reçoivent des points intermédiaires
/// (un trait rapide aux points espacés est quand même coupé).
fn densify(points: &[InkPoint], step: f32) -> Vec<InkPoint> {
    let mut out = Vec::with_capacity(points.len());
    for (i, &a) in points.iter().enumerate() {
        out.push(a);
        if let Some(&b) = points.get(i + 1) {
            let k = ((b.x - a.x).hypot(b.y - a.y) / step).ceil() as usize;
            for s in 1..k {
                out.push(lerp(a, b, s as f32 / k as f32));
            }
        }
    }
    out
}

/// Point du segment [a, b] où la distance au chemin franchit `reach` (dichotomie, 24 pas).
fn boundary(a: InkPoint, b: InkPoint, path: &[f32], reach: f32) -> InkPoint {
    let inside_a = dist_to_path(path, a.x, a.y) <= reach;
    let (mut lo, mut hi) = (0.0f32, 1.0f32);
    for _ in 0..24 {
        let mid = (lo + hi) / 2.0;
        let m = lerp(a, b, mid);
        if (dist_to_path(path, m.x, m.y) <= reach) == inside_a {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lerp(a, b, (lo + hi) / 2.0)
}

pub fn erase(points: &[InkPoint], half_width: f32, path: &[f32], radius: f32) -> Option<Vec<Vec<InkPoint>>> {
    let reach = radius + half_width;
    let pts = densify(points, (reach / 2.0).max(0.25));
    let covered = |p: &InkPoint| dist_to_path(path, p.x, p.y) <= reach;
    if !pts.iter().any(covered) {
        return None;
    }
    let mut pieces: Vec<Vec<InkPoint>> = Vec::new();
    let mut cur: Vec<InkPoint> = Vec::new();
    let mut prev: Option<(InkPoint, bool)> = None;
    for &p in &pts {
        let c = covered(&p);
        if let Some((q, qc)) = prev {
            if qc != c {
                let b = boundary(q, p, path, reach);
                cur.push(b);
                if c {
                    pieces.push(std::mem::take(&mut cur));
                }
            }
        }
        if !c {
            cur.push(p);
        }
        prev = Some((p, c));
    }
    pieces.push(cur);
    pieces.retain(|piece| piece.len() >= 2);
    Some(pieces)
}
```

  Les morceaux gardent les points densifiés de la partie non touchée : même ligne, quelques points de plus ; sans
  effet visible (le contour est recalculé).

- [ ] **5. Vert.** `cargo test -p roomboard-core --lib ink::` → tous verts (T10 + T11).
- [ ] **6. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un, commit
  `feat(core): ink hit test and partial eraser`.

---

<a id="tache-t12"></a>
### Tâche T12 — Commandes, `Change` et lectures (D10, D12, D16, D37, D38)

**Objectif.** Les commandes du lot 2 (`AddPage`, `RemovePage`, `CommitStroke`, `Erase` partielle et d'objet,
`Delete`) écrites chacune en **une** transaction `"local"` (= une étape d'annulation), le `Change` qu'elles rendent,
et les lectures sans écriture pour le rendu et les aperçus (D38) : points, contour, collision, rectangle, boîte
englobante. Scénarios : S2 (trois traits, gommer le deuxième en son milieu → quatre, annuler → trois, rétablir →
quatre), S3 (supprimer une page puis annuler la rend avec son trait ; la dernière page ne se supprime pas).

**Fichiers.** Remplacer les amorces `crates/roomboard-core/src/commands.rs` et `crates/roomboard-core/src/query.rs`.
**Ne pas toucher `document.rs`** : les commandes s'écrivent en `impl Document` dans `commands.rs` et `query.rs`, par
les aides `pub(crate)` de T9.

**Interfaces.**
- Consomme (T9) : `Document::{transact_local, read, bump, version, page_index, page_count, element_ids,
  page_elements, find_element, pages_ref}`, `FoundElement { page_id, elements, index, element }`,
  `document::insert_page(&ArrayRef, &mut TransactionMut, u32) -> String`, `element::{StrokeStyle, Transform,
  invert, apply_transform, out_bytes, out_string, out_style, out_transform, style_to_any, transform_to_any}`.
- Consomme (T10, T11) : `ink::points::{InkPoint, from_flat, dedup, to_local, encode, decode}`,
  `ink::outline::{outline, InkStyle}`, `ink::hit::{hit_outline, path_hits_outline}`, `ink::erase::erase`.
- Réutilise : `crates/roomboard-core/src/document.rs:4` `Document` — étendu de `apply(Command) -> Result<Change,
  CommandError>` (cadrage, « Document Yrs et pages », étendre) ; `yrs::uuid_v4()` pour les ids (D3).
- Produit :
  ```rust
  // commands.rs
  #[derive(Debug, Clone, Copy, PartialEq, Eq)] pub enum EraseMode { Partial, Object }
  #[derive(Debug, Clone, PartialEq)] pub enum Command { AddPage { after: Option<String> }, RemovePage { page: String },
    CommitStroke { page: String, points: Vec<f32>, style: StrokeStyle },
    Erase { page: String, path: Vec<f32>, radius: f32, mode: EraseMode }, Delete { ids: Vec<String> } }
  #[derive(Debug, Clone, PartialEq, Default, serde::Serialize)]
  pub struct Change { pub pages: Vec<String>, pub ids: Vec<String>, pub removed: Vec<String>, pub full: bool, pub version: u64 }
  #[derive(Debug, Clone, PartialEq)] pub enum CommandError { UnknownPage(String), LastPage, BadPoints }  // + Display, Error
  impl Document { pub fn apply(&mut self, cmd: Command) -> Result<Change, CommandError> }
  pub(crate) fn read_stroke<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, StrokeStyle, Vec<InkPoint>)>;
  pub(crate) fn world_to_local_path(t: &Transform, path: &[f32]) -> Option<Vec<f32>>;
  // query.rs
  #[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)] pub struct Bounds { pub x0: f64, pub y0: f64, pub x1: f64, pub y1: f64 }
  impl Document { pub fn stroke_points(&self, id: &str) -> Option<Vec<InkPoint>>; pub fn outline(&self, id: &str) -> Option<Vec<f32>>;
    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String>;
    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String>;
    pub fn ids_in_rect(&self, page: &str, rect: Bounds) -> Vec<String>; pub fn bounds(&self, ids: &[String]) -> Option<Bounds> }
  ```
  Conventions : `CommitStroke.points` = triplets monde ; l'élément reçoit `transform = [1, 0, 0, 1, x0, y0]` (premier
  point) et des points locaux dédoublonnés (D4, D6). `Erase.path` = paires monde, ramenées au repère local par
  l'inverse de `transform`. Les morceaux d'un trait coupé gardent le `transform` et le style du trait d'origine et
  prennent sa place dans l'ordre d'empilement. Les mises à l'échelle (lot 4) ne sont pas répercutées sur `radius` et
  `tol` au lot 2 (seules des translations existent).

**Le patron à ne pas reprendre.** (1) Ouvrir la transaction d'écriture avant de savoir si la commande a un effet : une
gomme qui ne touche rien pousse alors une étape vide ou, pire, une écriture inutile (D38 : rien n'est écrit sans
effet). On calcule le plan sous une transaction de **lecture**, on la ferme, puis on écrit. (2) Une transaction par
trait coupé : une gomme = plusieurs étapes d'annulation (S2 exige une étape). (3) Supprimer par indices croissants dans
un même tableau : les indices suivants glissent. (4) Réécrire les points d'un trait (DA4 : tampon immuable ; un trait
gommé = retiré + nouveaux traits). Chemin de référence : `docs/plans/socle-cadrage.md:39` (D12), `:65` (D38),
`:289-294` (DA5), `:283-287` (DA4).

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib -- commands:: query:: 2>&1 | tail -30`
→ N ≥ 20 passed, noms `erase_miss_adds_no_undo_step`, `erase_is_one_undo_step`, `remove_last_page_is_refused`,
`thousand_strokes_undo_all` présents ; ligne `1000 traits : N octets` lisible avec `-- --nocapture` (à recopier dans
le rapport, mesure H2-13). Puis build wasm32 du cœur sans `error[` et `verifier.sh : OK` (garde verts les tests de
T9, T10, T11).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T12 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ; yrs 0.28.1 : pas de `move_to`, pas de
`get_or_insert_*` dans une transaction.

**Interdits.** Ne pas toucher `document.rs`, `element.rs`, `history.rs`, `ink/`. Aucun `AddShape`, `SetText`,
`Transform` (lot 4).

**Terminé quand.** ≥ 20 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : appelé Document (étendu par
impl dans commands.rs), uuid_v4` ou `Réutilisation : écart — <pourquoi>`, et la ligne de mesure `1000 traits : N octets`.

**Étapes.**

- [ ] **1. Tests des commandes (rouge).** Écrire dans `commands.rs` les types publics (`EraseMode`, `Command`,
  `Change`, `CommandError`) et ce module de tests, sans `impl Document` ; lancer → `no method named apply` (attendu).

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn pen() -> StrokeStyle {
        StrokeStyle { color: "#000000".into(), width: 4.0 }
    }

    fn hline(y: f32) -> Vec<f32> {
        (0..=40).flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5]).collect()
    }

    fn commit(d: &mut Document, page: &str, pts: Vec<f32>) -> String {
        d.apply(Command::CommitStroke { page: page.into(), points: pts, style: pen() }).expect("commit").ids[0].clone()
    }

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }

    fn three(d: &mut Document) -> (String, [String; 3]) {
        let p = first(d);
        let a = commit(d, &p, hline(100.0));
        let b = commit(d, &p, hline(200.0));
        let c = commit(d, &p, hline(300.0));
        (p, [a, b, c])
    }

    fn cut_second(p: &str) -> Command {
        Command::Erase { page: p.into(), path: vec![300.0, 150.0, 300.0, 250.0], radius: 10.0, mode: EraseMode::Partial }
    }

    #[test]
    fn commit_stroke_adds_element_with_local_points() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = commit(&mut d, &p, vec![10.0, 20.0, 0.5, 30.0, 40.0, 0.7]);
        assert_eq!(d.element_ids(&p), vec![id.clone()]);
        let e = d.element(&id).expect("élément");
        assert_eq!(e.kind, "stroke");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]);
        assert_eq!(e.style, pen());
        let pts = d.stroke_points(&id).expect("points");
        assert_eq!((pts[1].x, pts[1].y, pts[1].pressure), (20.0, 20.0, 0.7));
    }

    #[test]
    fn commit_stroke_is_one_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        commit(&mut d, &p, hline(100.0));
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 1);
    }

    #[test]
    fn commit_rejects_bad_points() {
        let mut d = Document::blank();
        let p = first(&d);
        let bad = |points: Vec<f32>| Command::CommitStroke { page: p.clone(), points, style: pen() };
        assert_eq!(d.apply(bad(vec![1.0, 2.0])), Err(CommandError::BadPoints));
        assert_eq!(d.apply(bad(vec![1.0, f32::NAN, 0.5])), Err(CommandError::BadPoints));
        assert!(!d.can_undo());
    }

    #[test]
    fn commit_on_unknown_page_fails() {
        let mut d = Document::blank();
        let r = d.apply(Command::CommitStroke { page: "nope".into(), points: hline(1.0), style: pen() });
        assert_eq!(r, Err(CommandError::UnknownPage("nope".into())));
    }

    #[test]
    fn add_page_after_inserts_next() {
        let mut d = Document::blank();
        let p0 = first(&d);
        let last = d.apply(Command::AddPage { after: None }).expect("ajout").pages[0].clone();
        let mid = d.apply(Command::AddPage { after: Some(p0.clone()) }).expect("ajout").pages[0].clone();
        assert_eq!(d.page_ids(), vec![p0, mid, last]);
    }

    #[test]
    fn remove_page_then_undo_restores_its_stroke() {
        let mut d = Document::blank();
        let p1 = d.apply(Command::AddPage { after: None }).expect("ajout").pages[0].clone();
        let id = commit(&mut d, &p1, hline(100.0));
        let before = d.stroke_points(&id);
        let c = d.apply(Command::RemovePage { page: p1.clone() }).expect("suppression");
        assert_eq!(c.removed, vec![id.clone()]);
        assert_eq!(d.page_count(), 1);
        assert!(d.undo());
        assert_eq!(d.page_ids()[1], p1);
        assert_eq!(d.element_ids(&p1), vec![id.clone()]);
        assert_eq!(d.stroke_points(&id), before);
    }

    #[test]
    fn remove_last_page_is_refused() {
        let mut d = Document::blank();
        let p = first(&d);
        assert_eq!(d.apply(Command::RemovePage { page: p }), Err(CommandError::LastPage));
        assert_eq!(d.page_count(), 1);
        assert!(!d.can_undo());
    }

    #[test]
    fn erase_through_middle_splits_in_two() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let ch = d.apply(cut_second(&p)).expect("gomme");
        assert_eq!(ch.removed, vec![b.clone()]);
        assert_eq!(ch.ids.len(), 2);
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 4);
        assert!(ids.contains(&a) && ids.contains(&c) && !ids.contains(&b));
    }

    #[test]
    fn erase_is_one_undo_step() {
        let mut d = Document::blank();
        let (p, [_, b, _]) = three(&mut d);
        d.apply(cut_second(&p)).expect("gomme");
        assert!(d.undo());
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 3);
        assert!(ids.contains(&b));
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 4);
    }

    #[test]
    fn erase_miss_adds_no_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        commit(&mut d, &p, hline(100.0));
        let v = d.version();
        let far = Command::Erase { page: p.clone(), path: vec![900.0, 900.0, 950.0, 950.0], radius: 10.0, mode: EraseMode::Partial };
        let ch = d.apply(far).expect("gomme");
        assert!(ch.removed.is_empty() && ch.ids.is_empty());
        assert_eq!(ch.version, v);
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
    }

    #[test]
    fn object_erase_removes_whole_stroke() {
        let mut d = Document::blank();
        let (p, [_, b, _]) = three(&mut d);
        let cmd = Command::Erase { page: p.clone(), path: vec![300.0, 190.0, 300.0, 210.0], radius: 5.0, mode: EraseMode::Object };
        let ch = d.apply(cmd).expect("gomme");
        assert_eq!(ch.removed, vec![b.clone()]);
        assert!(ch.ids.is_empty());
        assert_eq!(d.element_ids(&p).len(), 2);
    }

    #[test]
    fn delete_removes_each_element_once() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let ch = d.apply(Command::Delete { ids: vec![a.clone(), a.clone(), c.clone()] }).expect("suppression");
        assert_eq!(ch.removed.len(), 2);
        assert_eq!(d.element_ids(&p), vec![b]);
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    #[test]
    fn change_version_increases() {
        let mut d = Document::blank();
        let p = first(&d);
        let c1 = d.apply(Command::CommitStroke { page: p.clone(), points: hline(1.0), style: pen() }).expect("commit");
        assert_eq!(c1.version, 1);
        let c2 = d.apply(Command::AddPage { after: None }).expect("ajout");
        assert_eq!(c2.version, 2);
    }

    #[test]
    fn thousand_strokes_undo_all() {
        let mut d = Document::blank();
        let p = first(&d);
        for i in 0..1000 {
            let y = (i % 50) as f32 * 20.0;
            let pts: Vec<f32> = (0..20).flat_map(|k| [k as f32 * 5.0, y + k as f32, 0.5]).collect();
            commit(&mut d, &p, pts);
        }
        let size = d.encode_v1().len();
        eprintln!("1000 traits : {size} octets");
        assert!(size < 50 * 1024 * 1024);
        for _ in 0..1000 {
            assert!(d.undo());
        }
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
    }
}
```

- [ ] **2. Écrire `commands.rs`** (au-dessus des tests) :

```rust
//! Commandes (D10, DA5) : une commande = une transaction "local" = une étape d'annulation (D11). Une commande sans
//! effet (gomme qui ne touche rien) n'ouvre aucune transaction d'écriture : aucune étape vide (D38).
use std::collections::BTreeSet;

use yrs::{Array, ArrayRef, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::document::{insert_page, Document};
use crate::element::{
    apply_transform, invert, out_bytes, out_string, out_style, out_transform, style_to_any, transform_to_any,
    StrokeStyle, Transform,
};
use crate::ink::erase::erase;
use crate::ink::hit::path_hits_outline;
use crate::ink::outline::{outline, InkStyle};
use crate::ink::points::{decode, dedup, encode, from_flat, to_local, InkPoint};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EraseMode {
    Partial,
    Object,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    AddPage { after: Option<String> },
    RemovePage { page: String },
    CommitStroke { page: String, points: Vec<f32>, style: StrokeStyle },
    Erase { page: String, path: Vec<f32>, radius: f32, mode: EraseMode },
    Delete { ids: Vec<String> },
}

/// Ce qu'une commande a touché ; `full` = tout invalider (annuler, rétablir).
#[derive(Debug, Clone, PartialEq, Default, serde::Serialize)]
pub struct Change {
    pub pages: Vec<String>,
    pub ids: Vec<String>,
    pub removed: Vec<String>,
    pub full: bool,
    pub version: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CommandError {
    UnknownPage(String),
    LastPage,
    BadPoints,
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CommandError::UnknownPage(id) => write!(f, "page inconnue : {id}"),
            CommandError::LastPage => write!(f, "la dernière page ne se supprime pas"),
            CommandError::BadPoints => write!(f, "points invalides (triplets x, y, pression ou paires x, y finis attendus)"),
        }
    }
}

impl std::error::Error for CommandError {}

pub(crate) fn read_stroke<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, StrokeStyle, Vec<InkPoint>)> {
    if out_string(e.get(txn, "kind"))? != "stroke" {
        return None;
    }
    Some((
        out_transform(e.get(txn, "transform"))?,
        out_style(e.get(txn, "style"))?,
        decode(&out_bytes(e.get(txn, "points"))?)?,
    ))
}

pub(crate) fn world_to_local_path(t: &Transform, path: &[f32]) -> Option<Vec<f32>> {
    let inv = invert(t)?;
    Some(
        path.chunks_exact(2)
            .flat_map(|c| {
                let (x, y) = apply_transform(&inv, f64::from(c[0]), f64::from(c[1]));
                [x as f32, y as f32]
            })
            .collect(),
    )
}

fn stroke_prelim(id: &str, transform: &Transform, style: &StrokeStyle, points: &[InkPoint]) -> MapPrelim {
    MapPrelim::from([
        ("id", In::from(id)),
        ("kind", In::from("stroke")),
        ("transform", In::Any(transform_to_any(transform))),
        ("style", In::Any(style_to_any(style))),
        ("points", In::from(encode(points))),
    ])
}

struct Cut {
    index: u32,
    id: String,
    transform: Transform,
    style: StrokeStyle,
    pieces: Vec<Vec<InkPoint>>,
}

struct Target {
    elements: ArrayRef,
    index: u32,
    page: String,
    id: String,
}

impl Document {
    pub fn apply(&mut self, cmd: Command) -> Result<Change, CommandError> {
        match cmd {
            Command::AddPage { after } => self.cmd_add_page(after.as_deref()),
            Command::RemovePage { page } => self.cmd_remove_page(&page),
            Command::CommitStroke { page, points, style } => self.cmd_commit_stroke(&page, &points, &style),
            Command::Erase { page, path, radius, mode } => self.cmd_erase(&page, &path, radius, mode),
            Command::Delete { ids } => self.cmd_delete(&ids),
        }
    }

    fn done(&mut self, mut change: Change) -> Change {
        change.version = self.bump();
        change
    }

    fn unchanged(&self) -> Change {
        Change { version: self.version(), ..Default::default() }
    }

    fn cmd_add_page(&mut self, after: Option<&str>) -> Result<Change, CommandError> {
        let index = match after {
            Some(a) => self.page_index(a).ok_or_else(|| CommandError::UnknownPage(a.to_string()))? + 1,
            None => self.page_count(),
        };
        let id = {
            let mut txn = self.transact_local();
            insert_page(self.pages_ref(), &mut txn, index)
        };
        Ok(self.done(Change { pages: vec![id], ..Default::default() }))
    }

    fn cmd_remove_page(&mut self, page: &str) -> Result<Change, CommandError> {
        let index = self.page_index(page).ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        if self.page_count() <= 1 {
            return Err(CommandError::LastPage);
        }
        let removed = self.element_ids(page);
        {
            let mut txn = self.transact_local();
            self.pages_ref().remove(&mut txn, index);
        }
        Ok(self.done(Change { pages: vec![page.to_string()], removed, ..Default::default() }))
    }

    fn cmd_commit_stroke(&mut self, page: &str, flat: &[f32], style: &StrokeStyle) -> Result<Change, CommandError> {
        if flat.len() < 3 || flat.len() % 3 != 0 || flat.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadPoints);
        }
        let elements = {
            let txn = self.read();
            self.page_elements(&txn, page)
        }
        .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let (local, (ox, oy)) = to_local(&dedup(&from_flat(flat)));
        let id = yrs::uuid_v4().to_string();
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, stroke_prelim(&id, &[1.0, 0.0, 0.0, 1.0, ox, oy], style, &local));
        }
        Ok(self.done(Change { pages: vec![page.to_string()], ids: vec![id], ..Default::default() }))
    }

    fn cmd_erase(&mut self, page: &str, path: &[f32], radius: f32, mode: EraseMode) -> Result<Change, CommandError> {
        if path.len() < 2 || path.len() % 2 != 0 || path.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadPoints);
        }
        // 1. Plan, sous une transaction de lecture.
        let (elements, cuts) = {
            let txn = self.read();
            let elements =
                self.page_elements(&txn, page).ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let mut cuts = Vec::new();
            for (i, o) in elements.iter(&txn).enumerate() {
                let Out::YMap(e) = o else { continue };
                let Some((transform, style, pts)) = read_stroke(&txn, &e) else { continue };
                let Some(local_path) = world_to_local_path(&transform, path) else { continue };
                let pieces = match mode {
                    EraseMode::Partial => erase(&pts, style.width / 2.0, &local_path, radius),
                    EraseMode::Object => {
                        let poly = outline(&pts, &InkStyle { width: style.width });
                        path_hits_outline(&poly, &local_path, radius).then(Vec::new)
                    }
                };
                if let Some(pieces) = pieces {
                    let id = out_string(e.get(&txn, "id")).unwrap_or_default();
                    cuts.push(Cut { index: i as u32, id, transform, style, pieces });
                }
            }
            (elements, cuts)
        };
        if cuts.is_empty() {
            return Ok(self.unchanged());
        }
        // 2. Écriture : une seule transaction, indices décroissants.
        let mut change = Change { pages: vec![page.to_string()], ..Default::default() };
        {
            let mut txn = self.transact_local();
            for cut in cuts.iter().rev() {
                elements.remove(&mut txn, cut.index);
                for (k, piece) in cut.pieces.iter().enumerate() {
                    let id = yrs::uuid_v4().to_string();
                    elements.insert(&mut txn, cut.index + k as u32, stroke_prelim(&id, &cut.transform, &cut.style, piece));
                    change.ids.push(id);
                }
                change.removed.push(cut.id.clone());
            }
        }
        Ok(self.done(change))
    }

    fn cmd_delete(&mut self, ids: &[String]) -> Result<Change, CommandError> {
        let unique: BTreeSet<&String> = ids.iter().collect();
        let mut targets: Vec<Target> = {
            let txn = self.read();
            unique
                .into_iter()
                .filter_map(|id| {
                    self.find_element(&txn, id).map(|f| Target {
                        elements: f.elements,
                        index: f.index,
                        page: f.page_id,
                        id: id.clone(),
                    })
                })
                .collect()
        };
        if targets.is_empty() {
            return Ok(self.unchanged());
        }
        targets.sort_by(|a, b| b.index.cmp(&a.index));
        {
            let mut txn = self.transact_local();
            for t in &targets {
                t.elements.remove(&mut txn, t.index);
            }
        }
        let mut pages: Vec<String> = targets.iter().map(|t| t.page.clone()).collect();
        pages.sort();
        pages.dedup();
        let removed = targets.into_iter().map(|t| t.id).collect();
        Ok(self.done(Change { pages, removed, ..Default::default() }))
    }
}
```

  Note `cmd_delete` : trier par index décroissant **tous** tableaux confondus garde des indices valides dans chaque
  tableau (dans un même tableau, le plus grand part d'abord). Si le compilateur refuse un bloc dont la dernière
  expression emprunte `txn` (E0597, temporaire de fin de bloc), lier la valeur à une variable avant la fin du bloc.

- [ ] **3. Tests des lectures (rouge)**, module `tests` de `query.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::Command;
    use crate::element::StrokeStyle;

    fn pen() -> StrokeStyle {
        StrokeStyle { color: "#000000".into(), width: 4.0 }
    }

    /// a : horizontale y = 100, x de 100 à 500 ; b (au-dessus) : verticale x = 300, y de 50 à 150.
    fn setup() -> (Document, String, String, String) {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a: Vec<f32> = (0..=40).flat_map(|i| [100.0 + i as f32 * 10.0, 100.0, 0.5]).collect();
        let b: Vec<f32> = (0..=10).flat_map(|i| [300.0, 50.0 + i as f32 * 10.0, 0.5]).collect();
        let ia = d.apply(Command::CommitStroke { page: p.clone(), points: a, style: pen() }).expect("a").ids[0].clone();
        let ib = d.apply(Command::CommitStroke { page: p.clone(), points: b, style: pen() }).expect("b").ids[0].clone();
        (d, p, ia, ib)
    }

    #[test]
    fn hit_test_returns_topmost() {
        let (d, p, _a, b) = setup();
        assert_eq!(d.hit_test(&p, 300.0, 100.0, 2.0), Some(b));
    }

    #[test]
    fn hit_test_misses_empty_area() {
        let (d, p, _a, _b) = setup();
        assert_eq!(d.hit_test(&p, 900.0, 900.0, 6.0), None);
    }

    #[test]
    fn hit_test_path_lists_touched() {
        let (d, p, a, _b) = setup();
        assert_eq!(d.hit_test_path(&p, &[150.0, 90.0, 150.0, 110.0], 3.0), vec![a]);
    }

    #[test]
    fn ids_in_rect_requires_full_inclusion() {
        let (d, p, a, b) = setup();
        let all = d.ids_in_rect(&p, Bounds { x0: 0.0, y0: 0.0, x1: 1000.0, y1: 1000.0 });
        assert_eq!(all, vec![a, b.clone()]);
        assert_eq!(d.ids_in_rect(&p, Bounds { x0: 250.0, y0: 0.0, x1: 350.0, y1: 200.0 }), vec![b]);
        assert!(d.ids_in_rect(&p, Bounds { x0: 0.0, y0: 0.0, x1: 350.0, y1: 120.0 }).is_empty());
    }

    #[test]
    fn bounds_covers_strokes() {
        let (d, _p, a, _b) = setup();
        let bx = d.bounds(&[a]).expect("boîte");
        assert!(bx.x0 <= 100.0 && bx.x1 >= 495.0, "{bx:?}");
        assert!(bx.y0 < 100.0 && bx.y1 > 100.0, "{bx:?}");
        assert_eq!(d.bounds(&[]), None);
    }

    #[test]
    fn outline_and_points_are_local() {
        let (d, _p, a, _b) = setup();
        let pts = d.stroke_points(&a).expect("points");
        assert_eq!((pts[0].x, pts[0].y), (0.0, 0.0));
        let o = d.outline(&a).expect("contour");
        assert!(o.chunks_exact(2).all(|c| c[0] > -20.0 && c[0] < 420.0), "contour hors du repère local");
    }
}
```

- [ ] **4. Écrire `query.rs`** (au-dessus des tests) :

```rust
//! Lectures sans écriture (D10, D38) : entrées en coordonnées monde ; points et contours rendus dans le repère local
//! de l'élément (placés par `transform`). Aucune lecture n'ouvre de transaction d'écriture.
use yrs::{Array, Map, Out};

use crate::commands::{read_stroke, world_to_local_path};
use crate::document::Document;
use crate::element::{apply_transform, invert, out_string, Transform};
use crate::ink::hit::{hit_outline, path_hits_outline};
use crate::ink::outline::{outline as ink_outline, InkStyle};
use crate::ink::points::InkPoint;

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
pub struct Bounds {
    pub x0: f64,
    pub y0: f64,
    pub x1: f64,
    pub y1: f64,
}

impl Bounds {
    fn union(self, o: Bounds) -> Bounds {
        Bounds { x0: self.x0.min(o.x0), y0: self.y0.min(o.y0), x1: self.x1.max(o.x1), y1: self.y1.max(o.y1) }
    }

    fn contains(&self, o: &Bounds) -> bool {
        o.x0 >= self.x0 && o.y0 >= self.y0 && o.x1 <= self.x1 && o.y1 <= self.y1
    }
}

struct StrokeGeom {
    id: String,
    transform: Transform,
    outline: Vec<f32>,
}

fn world_bounds(t: &Transform, poly: &[f32]) -> Option<Bounds> {
    poly.chunks_exact(2)
        .map(|c| apply_transform(t, f64::from(c[0]), f64::from(c[1])))
        .fold(None, |acc: Option<Bounds>, (x, y)| {
            let b = Bounds { x0: x, y0: y, x1: x, y1: y };
            Some(match acc {
                Some(a) => a.union(b),
                None => b,
            })
        })
}

impl Document {
    pub fn stroke_points(&self, id: &str) -> Option<Vec<InkPoint>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        let pts = read_stroke(&txn, &found.element).map(|(_, _, p)| p);
        pts
    }

    pub fn outline(&self, id: &str) -> Option<Vec<f32>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        let (_, style, pts) = read_stroke(&txn, &found.element)?;
        Some(ink_outline(&pts, &InkStyle { width: style.width }))
    }

    /// Traits de la page, du dessous vers le dessus.
    fn stroke_geoms(&self, page: &str) -> Vec<StrokeGeom> {
        let txn = self.read();
        let Some(elements) = self.page_elements(&txn, page) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for o in elements.iter(&txn) {
            let Out::YMap(e) = o else { continue };
            let Some((transform, style, pts)) = read_stroke(&txn, &e) else { continue };
            out.push(StrokeGeom {
                id: out_string(e.get(&txn, "id")).unwrap_or_default(),
                transform,
                outline: ink_outline(&pts, &InkStyle { width: style.width }),
            });
        }
        out
    }

    /// Élément le plus haut sous (x, y) monde, à `tol` près.
    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.stroke_geoms(page)
            .into_iter()
            .rev()
            .find(|g| {
                invert(&g.transform).is_some_and(|inv| {
                    let (lx, ly) = apply_transform(&inv, x, y);
                    hit_outline(&g.outline, lx as f32, ly as f32, tol)
                })
            })
            .map(|g| g.id)
    }

    /// Traits touchés par un chemin (gomme d'objet, aperçu D38), dans l'ordre d'empilement.
    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String> {
        self.stroke_geoms(page)
            .into_iter()
            .filter(|g| world_to_local_path(&g.transform, path).is_some_and(|lp| path_hits_outline(&g.outline, &lp, radius)))
            .map(|g| g.id)
            .collect()
    }

    /// Éléments entièrement inclus dans le rectangle monde (D15).
    pub fn ids_in_rect(&self, page: &str, rect: Bounds) -> Vec<String> {
        self.stroke_geoms(page)
            .into_iter()
            .filter(|g| world_bounds(&g.transform, &g.outline).is_some_and(|b| rect.contains(&b)))
            .map(|g| g.id)
            .collect()
    }

    pub fn bounds(&self, ids: &[String]) -> Option<Bounds> {
        let txn = self.read();
        let mut acc: Option<Bounds> = None;
        for id in ids {
            let Some(found) = self.find_element(&txn, id) else { continue };
            let Some((t, style, pts)) = read_stroke(&txn, &found.element) else { continue };
            if let Some(b) = world_bounds(&t, &ink_outline(&pts, &InkStyle { width: style.width })) {
                acc = Some(match acc {
                    Some(a) => a.union(b),
                    None => b,
                });
            }
        }
        acc
    }
}
```

  (`let pts = …; pts` dans `stroke_points` : évite l'E0597 de fin de bloc ; `clippy::let_and_return` le signale — si
  oui, écrire `#[allow(clippy::let_and_return)]` sur la fonction avec le commentaire `// garde txn vivant`.)

- [ ] **5. Vert.** `cargo test -p roomboard-core --lib -- commands:: query:: --nocapture 2>&1 | grep -E "1000 traits|test result"`.
- [ ] **6. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un, commit
  `feat(core): commands, Change and read queries`.

---

<a id="tache-t13"></a>
### Tâche T13 — Format `.roomboard` : ZIP, manifeste, migration (D24, D25, DA3)

**Objectif.** Lire et écrire le format natif : ZIP contenant `manifest.json` {`format`, `formatVersion`, `schema`,
`appVersion`, `created`, `modified`} et `document.ybin` (état Yrs complet, v1) ; refus clair d'une version plus
récente ; `schema` du manifeste contrôlé contre `meta.schema` ; migration (vide en v1) ; heure et version de
l'application **passées en paramètres**. Scénarios : S2 et S3 (« enregistrer, rouvrir : tout est là »).

**Fichiers.** Remplacer l'amorce `crates/roomboard-core/src/format/mod.rs`. Rien d'autre.

**Interfaces.**
- Consomme (T7) : `zip`, `serde`, `serde_json` dans `Cargo.toml`. Consomme (T9) : `Document::{encode_v1,
  from_update_v1, schema, can_undo}`, `document::DecodeError`, `element::SCHEMA`.
- Réutilise : crate `zip` 9.6 — `ZipWriter::new`, `start_file(name, SimpleFileOptions)`, `finish() -> W`,
  `ZipArchive::new(Cursor)`, `by_name(name)`, `SimpleFileOptions::default().compression_method(Deflated)
  .last_modified_time(DateTime::default())` — **dans `format/` seulement** (cadrage, « Conteneur ZIP »).
- Réutilise : `yrs` `encode_state_as_update_v1` / `Update::decode_v1`, par `Document::encode_v1` /
  `Document::from_update_v1` de T9 (cadrage, « Encodage du document »).
- Produit :
  ```rust
  pub const FORMAT: &str = "roomboard"; pub const FORMAT_VERSION: u32 = 1; pub const EXTENSION: &str = "roomboard";
  pub const MIME: &str = "application/x-roomboard"; pub const MANIFEST: &str = "manifest.json"; pub const DOCUMENT: &str = "document.ybin";
  #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)] #[serde(rename_all = "camelCase")]
  pub struct Manifest { pub format: String, pub format_version: u32, pub schema: u32, pub app_version: String, pub created: String, pub modified: String }
  #[derive(Debug, Clone, PartialEq)] pub struct SaveMeta { pub app_version: String, pub now: String, pub created: Option<String> }
  #[derive(Debug, Clone, PartialEq)] pub enum FormatError { NotRoomboard, NewerVersion { found: u32, supported: u32 }, Corrupt(String) } // + Display, Error
  pub fn save(doc: &Document, meta: &SaveMeta) -> Result<Vec<u8>, FormatError>;
  pub fn load(bytes: &[u8]) -> Result<Document, FormatError>;
  pub fn load_with_manifest(bytes: &[u8]) -> Result<(Document, Manifest), FormatError>;
  pub fn migrate(manifest: Manifest, ybin: Vec<u8>) -> Result<(Manifest, Vec<u8>), FormatError>;
  ```
  Écart assumé avec DA3 : `SaveMeta` gagne `created: Option<String>` (date de création du fichier rouvert, gardée par
  la liaison ; `None` = nouveau fichier, `created = now`) et `load_with_manifest` la rend. `assets/` reste réservé :
  aucune entrée écrite au socle.

**Le patron à ne pas reprendre.** (1) `SystemTime::now()` ou la fonction `time` de `zip` pour dater les entrées : le
cœur n'a pas d'horloge sous Wasm et deux enregistrements identiques doivent donner les mêmes octets. (2) Lire
`document.ybin` sans contrôler `formatVersion` puis `schema` : un fichier d'une version future serait décodé de
travers. (3) Accepter un document dont `meta.schema` diffère du manifeste (D24 : désaccord = `Corrupt`).
(4) Sérialiser le document en JSON (DA3 : le JSON perd les identifiants CRDT). Chemin de référence :
`docs/plans/socle-cadrage.md:51-52` (D24, D25), `:276-281` (DA3).

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --lib format:: 2>&1 | tail -25`
→ N ≥ 13 passed, noms `schema_mismatch_is_corrupt`, `save_is_deterministic`, `newer_format_version_is_refused`
présents. Puis build wasm32 du cœur sans `error[` (H2-8 rejoué avec le vrai code) et `verifier.sh : OK`.

**Essais de plateforme.** Aucun au lot 2 (le fichier est ouvert par les coques au lot 5, S5).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T13 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; cœur sans horloge système ni dépendance au navigateur.

**Interdits.** Ne pas toucher `document.rs`, `Cargo.toml`. Aucun appel à `zip` hors de `format/`.

**Terminé quand.** ≥ 13 tests verts, build wasm32 sans erreur, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé zip (ZipWriter/ZipArchive, format/ seul), Document::encode_v1/from_update_v1` ou
`Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Tests (rouge).** Écrire dans `format/mod.rs` les constantes, `Manifest`, `SaveMeta`, `FormatError` et ce
  module de tests ; lancer → `cannot find function save` (attendu).

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Doc, Map, ReadTxn, StateVector, Transact};

    fn meta() -> SaveMeta {
        SaveMeta { app_version: "0.1.0".into(), now: "2026-11-16T12:00:00Z".into(), created: None }
    }

    fn zip_of(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, bytes) in entries {
            w.start_file(*name, options()).expect("entrée");
            w.write_all(bytes).expect("écriture");
        }
        w.finish().expect("fin").into_inner()
    }

    fn manifest_json(format: &str, format_version: u32, schema: u32) -> Vec<u8> {
        serde_json::to_vec(&Manifest {
            format: format.into(),
            format_version,
            schema,
            app_version: "0.1.0".into(),
            created: "c".into(),
            modified: "m".into(),
        })
        .expect("json")
    }

    #[test]
    fn save_then_load_keeps_pages() {
        let mut d = Document::blank();
        d.add_page();
        let e = load(&save(&d, &meta()).expect("save")).ok().expect("load");
        assert_eq!(e.page_ids(), d.page_ids());
    }

    #[test]
    fn manifest_fields_are_written() {
        let (_, m) = load_with_manifest(&save(&Document::blank(), &meta()).expect("save")).ok().expect("load");
        assert_eq!(m.format, "roomboard");
        assert_eq!((m.format_version, m.schema), (1, 1));
        assert_eq!(m.app_version, "0.1.0");
        assert_eq!((m.created.as_str(), m.modified.as_str()), ("2026-11-16T12:00:00Z", "2026-11-16T12:00:00Z"));
    }

    #[test]
    fn created_is_kept_when_given() {
        let m = SaveMeta { created: Some("2026-01-01T00:00:00Z".into()), ..meta() };
        let (_, man) = load_with_manifest(&save(&Document::blank(), &m).expect("save")).ok().expect("load");
        assert_eq!(man.created, "2026-01-01T00:00:00Z");
        assert_eq!(man.modified, "2026-11-16T12:00:00Z");
    }

    #[test]
    fn manifest_json_is_camel_case() {
        let bytes = save(&Document::blank(), &meta()).expect("save");
        let mut a = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("zip");
        let mut s = String::new();
        a.by_name(MANIFEST).expect("manifeste").read_to_string(&mut s).expect("lecture");
        assert!(s.contains("\"formatVersion\"") && s.contains("\"appVersion\""), "{s}");
    }

    #[test]
    fn loaded_document_cannot_undo() {
        let mut d = Document::blank();
        d.add_page();
        let e = load(&save(&d, &meta()).expect("save")).ok().expect("load");
        assert!(!e.can_undo());
    }

    #[test]
    fn garbage_is_not_roomboard() {
        assert_eq!(load(b"pas un zip").err(), Some(FormatError::NotRoomboard));
    }

    #[test]
    fn zip_without_manifest_is_not_roomboard() {
        assert_eq!(load(&zip_of(&[("autre.txt", b"x")])).err(), Some(FormatError::NotRoomboard));
    }

    #[test]
    fn other_format_name_is_not_roomboard() {
        let z = zip_of(&[(MANIFEST, &manifest_json("flipx", 1, 1)), (DOCUMENT, b"")]);
        assert_eq!(load(&z).err(), Some(FormatError::NotRoomboard));
    }

    #[test]
    fn newer_format_version_is_refused() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 2, 1)), (DOCUMENT, b"")]);
        let err = load(&z).err().expect("refus");
        assert_eq!(err, FormatError::NewerVersion { found: 2, supported: 1 });
        assert!(err.to_string().contains("plus récente"));
    }

    #[test]
    fn newer_schema_is_refused() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 1, 7)), (DOCUMENT, b"")]);
        assert_eq!(load(&z).err(), Some(FormatError::NewerVersion { found: 7, supported: 1 }));
    }

    #[test]
    fn missing_document_is_corrupt() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 1, 1))]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn corrupt_ybin_is_corrupt() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 1, 1)), (DOCUMENT, &[0xff, 0x01, 0x02])]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn schema_mismatch_is_corrupt() {
        let doc = Doc::new();
        let m = doc.get_or_insert_map("meta");
        m.insert(&mut doc.transact_mut(), "schema", 2.0);
        let ybin = doc.transact().encode_state_as_update_v1(&StateVector::default());
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 1, 1)), (DOCUMENT, &ybin)]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn save_is_deterministic() {
        let d = Document::blank();
        assert_eq!(save(&d, &meta()).expect("1"), save(&d, &meta()).expect("2"));
    }
}
```

- [ ] **2. Écrire `format/mod.rs`** :

```rust
//! Format natif `.roomboard` (D24, D25, DA3) : ZIP { manifest.json, document.ybin = état Yrs complet en v1 },
//! dossier `assets/` réservé (vide au socle). Dates des entrées ZIP fixes (1980-01-01) ; l'heure et la version de
//! l'application viennent de l'appelant. `formatVersion` = disposition du conteneur ; `schema` = schéma du document.
use std::io::{Cursor, Read, Write};

use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};

use crate::document::{DecodeError, Document};
use crate::element::SCHEMA;

pub const FORMAT: &str = "roomboard";
pub const FORMAT_VERSION: u32 = 1;
pub const EXTENSION: &str = "roomboard";
pub const MIME: &str = "application/x-roomboard";
pub const MANIFEST: &str = "manifest.json";
pub const DOCUMENT: &str = "document.ybin";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub format: String,
    pub format_version: u32,
    pub schema: u32,
    pub app_version: String,
    pub created: String,
    pub modified: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SaveMeta {
    pub app_version: String,
    /// RFC 3339, fourni par la page (le cœur n'a pas d'horloge).
    pub now: String,
    /// Date de création d'un fichier rouvert ; `None` = nouveau fichier.
    pub created: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FormatError {
    NotRoomboard,
    NewerVersion { found: u32, supported: u32 },
    Corrupt(String),
}

impl std::fmt::Display for FormatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FormatError::NotRoomboard => write!(f, "ce fichier n'est pas un document RoomBoard"),
            FormatError::NewerVersion { found, supported } => write!(
                f,
                "document créé par une version plus récente de RoomBoard (version {found}, celle-ci lit jusqu'à la {supported})"
            ),
            FormatError::Corrupt(m) => write!(f, "document RoomBoard endommagé : {m}"),
        }
    }
}

impl std::error::Error for FormatError {}

fn options() -> SimpleFileOptions {
    SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .last_modified_time(DateTime::default())
}

fn zip_err(e: zip::result::ZipError) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

fn io_err(e: std::io::Error) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

pub fn save(doc: &Document, meta: &SaveMeta) -> Result<Vec<u8>, FormatError> {
    let schema = doc.schema().ok_or_else(|| FormatError::Corrupt("meta.schema absent".into()))? as u32;
    let manifest = Manifest {
        format: FORMAT.into(),
        format_version: FORMAT_VERSION,
        schema,
        app_version: meta.app_version.clone(),
        created: meta.created.clone().unwrap_or_else(|| meta.now.clone()),
        modified: meta.now.clone(),
    };
    let json = serde_json::to_vec_pretty(&manifest).map_err(|e| FormatError::Corrupt(e.to_string()))?;
    let mut w = ZipWriter::new(Cursor::new(Vec::new()));
    w.start_file(MANIFEST, options()).map_err(zip_err)?;
    w.write_all(&json).map_err(io_err)?;
    w.start_file(DOCUMENT, options()).map_err(zip_err)?;
    w.write_all(&doc.encode_v1()).map_err(io_err)?;
    Ok(w.finish().map_err(zip_err)?.into_inner())
}

pub fn load(bytes: &[u8]) -> Result<Document, FormatError> {
    load_with_manifest(bytes).map(|(doc, _)| doc)
}

fn read_entry(archive: &mut ZipArchive<Cursor<&[u8]>>, name: &str) -> Option<Vec<u8>> {
    let mut file = archive.by_name(name).ok()?;
    let mut out = Vec::new();
    file.read_to_end(&mut out).ok()?;
    Some(out)
}

pub fn load_with_manifest(bytes: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|_| FormatError::NotRoomboard)?;
    let raw = read_entry(&mut archive, MANIFEST).ok_or(FormatError::NotRoomboard)?;
    let manifest: Manifest =
        serde_json::from_slice(&raw).map_err(|e| FormatError::Corrupt(format!("manifeste illisible : {e}")))?;
    if manifest.format != FORMAT {
        return Err(FormatError::NotRoomboard);
    }
    if manifest.format_version > FORMAT_VERSION {
        return Err(FormatError::NewerVersion { found: manifest.format_version, supported: FORMAT_VERSION });
    }
    if manifest.schema > SCHEMA {
        return Err(FormatError::NewerVersion { found: manifest.schema, supported: SCHEMA });
    }
    let ybin = read_entry(&mut archive, DOCUMENT).ok_or_else(|| FormatError::Corrupt(format!("{DOCUMENT} absent")))?;
    let (manifest, ybin) = migrate(manifest, ybin)?;
    let doc = Document::from_update_v1(&ybin).map_err(|e| match e {
        DecodeError::Update(m) => FormatError::Corrupt(format!("état illisible : {m}")),
        DecodeError::Schema { found } => {
            FormatError::Corrupt(format!("schéma du document {found:?} différent du manifeste ({})", manifest.schema))
        }
    })?;
    if doc.schema() != Some(f64::from(manifest.schema)) {
        return Err(FormatError::Corrupt("schéma du document différent du manifeste".into()));
    }
    Ok((doc, manifest))
}

/// Migration (D24) : appelée pour toute version ≤ la version connue. Rien à migrer en v1 ; une version < 1 n'a
/// jamais existé : `Corrupt`.
pub fn migrate(manifest: Manifest, ybin: Vec<u8>) -> Result<(Manifest, Vec<u8>), FormatError> {
    if manifest.format_version < 1 || manifest.schema < 1 {
        return Err(FormatError::Corrupt(format!(
            "version inconnue : format {}, schéma {}",
            manifest.format_version, manifest.schema
        )));
    }
    Ok((manifest, ybin))
}
```

  Si `DateTime::default()` n'est pas à la racine de `zip` 9.6, le prendre où `cargo doc -p zip --no-deps` l'indique
  (`zip::DateTime` est réexporté en 9.x) ; ne jamais activer la fonction `time`.

- [ ] **3. Vert.** `cargo test -p roomboard-core --lib format::` → ≥ 13 passed ; build wasm32 du cœur sans erreur.
- [ ] **4. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout un par un, commit
  `feat(core): .roomboard format (zip, manifest, migration)`.

---

<a id="tache-t14"></a>
### Tâche T14 — Scénarios S2 et S3 au niveau du cœur

**Objectif.** Rejouer S2 et S3 du cadrage par l'API publique du cœur seule (sans interface), de bout en bout : page
vide non annulable, traits, gomme, annuler / rétablir, enregistrer, rouvrir, mêmes coordonnées ; pages, suppression
annulée, dernière page indestructible. Le texte et le rectangle de S3 relèvent du lot 4 : non joués ici.

**Fichiers.** Créer `crates/roomboard-core/tests/scenarios.rs`. Rien d'autre.

**Interfaces.**
- Consomme (T9, T12, T13) : `roomboard_core::document::Document::{blank, page_ids, page_count, element_ids,
  element, stroke_points, undo, redo, can_undo}`, `roomboard_core::commands::{Command, CommandError, EraseMode}`,
  `roomboard_core::element::StrokeStyle`, `roomboard_core::format::{save, load, SaveMeta}`.
- Réutilise : aucun module de la liste du cadrage en direct (passe par l'API produite par T9-T13).
- Produit : 3 tests d'intégration.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-core --test scenarios 2>&1 | tail -10`
→ `test result: ok. 3 passed`, noms `s2_three_strokes_erase_undo_redo_save_load`, `s3_pages_save_load_remove_undo`,
`s3_last_page_cannot_be_removed`. Puis `verifier.sh : OK`.

**Essais de plateforme.** Facultatif, non bloquant : `cargo test -p roomboard-core` sur le PC Windows par la file
d'attente (`ordre-pc.cjs confier`, type `tache-cli`) pour prouver le cœur portable ; la tâche ne l'attend pas, la
réponse est consignée par l'orchestrateur quand elle arrive. macOS : aucun. Android : en attente de KVM.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T14 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`).

**Interdits.** Aucune modification de `src/` : un test qui échoue est rapporté (avec la sortie), pas contourné.

**Terminé quand.** 3 tests verts, `verifier.sh : OK`, rapport avec `Réutilisation : sans objet (tests de l'API du
lot)`.

**Étapes.**

- [ ] **1. Écrire `crates/roomboard-core/tests/scenarios.rs`** :

```rust
//! Scénarios S2 et S3 du cadrage, au niveau du cœur (sans interface).
use roomboard_core::commands::{Command, CommandError, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, save, SaveMeta};

fn pen() -> StrokeStyle {
    StrokeStyle { color: "#1e40af".into(), width: 4.0 }
}

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-16T14:00:00Z".into(), created: None }
}

fn hline(y: f32) -> Vec<f32> {
    (0..=40).flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.3 + i as f32 / 100.0]).collect()
}

fn commit(d: &mut Document, page: &str, pts: Vec<f32>) -> String {
    d.apply(Command::CommitStroke { page: page.into(), points: pts, style: pen() }).expect("commit").ids[0].clone()
}

#[test]
fn s2_three_strokes_erase_undo_redo_save_load() {
    let mut d = Document::blank();
    assert!(!d.undo(), "Ctrl+Z sur un document neuf ne fait rien");
    assert_eq!(d.page_count(), 1);
    let p = d.page_ids()[0].clone();
    for y in [100.0, 200.0, 300.0] {
        commit(&mut d, &p, hline(y));
    }
    let erase = Command::Erase { page: p.clone(), path: vec![300.0, 150.0, 300.0, 250.0], radius: 10.0, mode: EraseMode::Partial };
    d.apply(erase).expect("gomme");
    assert_eq!(d.element_ids(&p).len(), 4);
    assert!(d.undo());
    assert_eq!(d.element_ids(&p).len(), 3);
    assert!(d.redo());
    assert_eq!(d.element_ids(&p).len(), 4);

    let bytes = save(&d, &meta()).expect("save");
    let e = load(&bytes).ok().expect("load");
    assert_eq!(e.page_ids(), vec![p.clone()]);
    assert_eq!(e.element_ids(&p), d.element_ids(&p));
    for id in d.element_ids(&p) {
        assert_eq!(e.element(&id), d.element(&id), "élément {id}");
        assert_eq!(e.stroke_points(&id), d.stroke_points(&id), "points {id}");
    }
    assert!(!e.can_undo());
}

#[test]
fn s3_pages_save_load_remove_undo() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d.apply(Command::AddPage { after: Some(p1.clone()) }).expect("p2").pages[0].clone();
    let p3 = d.apply(Command::AddPage { after: Some(p2.clone()) }).expect("p3").pages[0].clone();
    let s = commit(&mut d, &p2, hline(500.0));

    let mut e = load(&save(&d, &meta()).expect("save")).ok().expect("load");
    assert_eq!(e.page_ids(), vec![p1.clone(), p2.clone(), p3.clone()]);
    assert!(e.element_ids(&p1).is_empty() && e.element_ids(&p3).is_empty());
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);

    e.apply(Command::RemovePage { page: p2.clone() }).expect("suppression");
    assert_eq!(e.page_ids(), vec![p1.clone(), p3.clone()]);
    assert!(e.undo());
    assert_eq!(e.page_ids(), vec![p1, p2.clone(), p3]);
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);
    assert_eq!(e.stroke_points(&s), d.stroke_points(&s));
}

#[test]
fn s3_last_page_cannot_be_removed() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d.apply(Command::AddPage { after: None }).expect("p2").pages[0].clone();
    d.apply(Command::RemovePage { page: p1 }).expect("première suppression");
    assert_eq!(d.apply(Command::RemovePage { page: p2 }), Err(CommandError::LastPage));
    assert_eq!(d.page_count(), 1);
}
```

- [ ] **2. Lancer.** Les trois passent si T9-T13 sont justes ; un échec est rapporté tel quel (sortie complète) à
  l'orchestrateur, qui renvoie à la tâche fautive.
- [ ] **3. Suite complète** sous le jeton → `verifier.sh : OK`. Ajout, commit `test(core): S2 and S3 core scenarios`.

---

<a id="tache-t15"></a>
### Tâche T15 — Liaison Wasm (DA5, D10, D23)

**Objectif.** Étendre le `Document` exposé à JavaScript : `blank`, `load`, `save(now, appVersion)`, une méthode par
commande rendant un `Change`, les lectures (D38), annuler / rétablir, `StrokeBuilder` pour l'encre vive, et
`capabilities(platform)` (D23). Les objets passent par `serde-wasm-bindgen`, les points et contours par
`Float32Array`. Scénario : S2 (tout le parcours de S2 traverse cette liaison au lot 3).

**Fichiers.** Modifier `crates/roomboard-wasm/Cargo.toml`, `crates/roomboard-wasm/src/lib.rs`, `Cargo.lock` (par
`cargo`). Rien d'autre.

**Interfaces.**
- Consomme (T9, T10, T12, T13) : `Document::{new, blank, add_page, page_count, page_ids, element_ids, element, undo,
  redo, can_undo, can_redo, version, apply, stroke_points, outline, hit_test, hit_test_path, ids_in_rect, bounds}`,
  `commands::{Change, Command, CommandError, EraseMode}`, `query::Bounds`, `element::StrokeStyle`,
  `format::{save, load_with_manifest, SaveMeta}`, `ink::builder::StrokeBuilder`, `ink::outline::InkStyle`,
  `ink::points::to_flat`.
- Réutilise : `crates/roomboard-wasm/src/lib.rs:13` `Document` (wasm) — même type étendu ; `version()` (`:7`)
  gardée ; `new`, `add_page`, `page_count` gardés (appelés par `apps/web/src/main.ts`, non touché au lot 2) (cadrage,
  « Liaison Wasm », étendre).
- Réutilise : `crates/roomboard-core/src/capabilities.rs:21` `capabilities(Platform) -> Capabilities`, appelée telle
  quelle (cadrage, « Table des capacités », réutiliser).
- Produit (vue JS, `--target web`) :
  ```text
  version(): string ; capabilities(platform: "web"|"windows"|"macos"|"linux"|"android"|"ipados"): {desktopAnnotation, multiWindow}
  class Document {
    constructor() ; static blank(): Document ; static load(bytes: Uint8Array): Document  // lève Error(message FormatError)
    save(now: string, app_version: string): Uint8Array ; add_page(): void ; page_count(): number
    page_ids(): string[] ; element_ids(page: string): string[]
    add_page_after(after?: string | null): Change ; remove_page(page: string): Change
    commit_stroke(page: string, points: Float32Array, color: string, width: number): Change
    erase(page: string, path: Float32Array, radius: number, object: boolean): Change ; delete(ids: string[]): Change
    element(id: string): ElementView | null ; points(id: string): Float32Array | undefined ; outline(id: string): Float32Array | undefined
    hit_test(page: string, x: number, y: number, tol: number): string | undefined
    hit_test_path(page: string, path: Float32Array, radius: number): string[]
    ids_in_rect(page: string, x0: number, y0: number, x1: number, y1: number): string[] ; bounds(ids: string[]): Bounds | null
    undo(): Change ; redo(): Change ; can_undo(): boolean ; can_redo(): boolean ; version(): number ; free(): void }
  class StrokeBuilder { constructor(width: number) ; push(points: Float32Array): Float32Array ; finish(): Float32Array ; point_count(): number ; free(): void }
  ```
  Écart assumé avec DA5 (`apply(cmd: Command) -> Change`) : une méthode par commande côté Wasm (les `Float32Array`
  ne passent pas proprement dans un objet désérialisé par serde) ; `apply(cmd)` existe côté TS dans l'adaptateur
  `wasm-core.ts` (T16), qui respecte le contrat `api.ts` (T8). Les erreurs de commande lèvent une `Error` JS dont le
  message est le `Display` de `CommandError` / `FormatError`.

**Le patron à ne pas reprendre.** Créer un `JsValue` ou un `JsError` dans du code testé par `cargo test` natif : hors
wasm32, tout appel à JS panique. Chaque méthode exposée délègue à une méthode Rust « `_inner` » qui rend des types du
cœur ; seuls les tests natifs de ces `_inner` et des méthodes sans `JsValue` tournent sous `cargo test`. Ne pas
renommer ni retirer `new`, `add_page`, `page_count` (amorce `main.ts:16-18`). Chemin de référence :
`docs/plans/socle-cadrage.md:37` (D10), `:289-294` (DA5), `crates/roomboard-wasm/src/lib.rs:13-29`.

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH cargo test -p roomboard-wasm 2>&1 | tail -20`
→ N ≥ 10 passed, noms `version_is_not_empty`, `wasm_document_counts_pages` (gardés), `commit_then_undo_inner` présents.
`cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3` sans `error[`. Puis
`verifier.sh : OK` (il lance `wasm-bindgen` sur ce module et `pnpm --filter @roomboard/web build`, qui compile
`main.ts` contre les liaisons générées).

**Essais de plateforme.** Aucun.

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire socle/T15 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan
(`run_in_background: false`) ; `wasm-bindgen` reste épinglé `=0.2.130` (contrôle `scripts/controle-wasm-bindgen.sh`).

**Interdits.** Ne pas changer la version de `wasm-bindgen`. Ne pas toucher `crates/roomboard-core`, `apps/web`,
`scripts/`. Pas de `js-sys` sauf nécessité prouvée par une erreur de compilation (à rapporter).

**Terminé quand.** ≥ 10 tests natifs verts, build wasm32 release sans erreur, `verifier.sh : OK`, rapport avec
`Réutilisation : appelé Document wasm (étendu), version(), capabilities(Platform)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Dépendances.** `crates/roomboard-wasm/Cargo.toml`, section `[dependencies]` :

```toml
[dependencies]
roomboard-core = { path = "../roomboard-core" }
wasm-bindgen = "=0.2.130"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
```

- [ ] **2. Tests natifs (rouge).** Remplacer le module `tests` de `crates/roomboard-wasm/src/lib.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn hline(y: f32) -> Vec<f32> {
        (0..=40).flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5]).collect()
    }

    #[test]
    fn version_is_not_empty() {
        assert!(!version().is_empty());
    }

    #[test]
    fn wasm_document_counts_pages() {
        let mut d = Document::new();
        d.add_page();
        assert_eq!(d.page_count(), 1);
    }

    #[test]
    fn blank_has_one_page_and_nothing_to_undo() {
        let d = Document::blank();
        assert_eq!(d.page_ids().len(), 1);
        assert!(!d.can_undo());
    }

    #[test]
    fn commit_then_undo_inner() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0).expect("commit");
        assert_eq!(c.ids.len(), 1);
        let u = d.undo_inner();
        assert!(u.full);
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn erase_inner_partial_splits() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0).expect("commit");
        let c = d.erase_inner(&p, &[300.0, 50.0, 300.0, 150.0], 10.0, false).expect("gomme");
        assert_eq!((c.removed.len(), c.ids.len()), (1, 2));
    }

    #[test]
    fn outline_is_cached_and_stable() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0).expect("commit").ids[0].clone();
        let first = d.outline(&id).expect("contour");
        assert!(!first.is_empty());
        assert_eq!(d.outline(&id), Some(first));
    }

    #[test]
    fn remove_last_page_inner_is_refused() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.remove_page_inner(&p), Err(CommandError::LastPage));
    }

    #[test]
    fn save_then_load_inner_keeps_elements() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.commit_stroke_inner(&p, &hline(100.0), "#000000", 4.0).expect("commit");
        let bytes = d.save_inner("2026-11-16T12:00:00Z", "0.1.0").expect("save");
        let e = Document::load_inner(&bytes).expect("load");
        assert_eq!(e.element_ids(&p), d.element_ids(&p));
        assert_eq!(e.created.as_deref(), Some("2026-11-16T12:00:00Z"));
    }

    #[test]
    fn stroke_builder_push_and_finish() {
        let mut b = StrokeBuilder::new(6.0);
        assert!(!b.push(&hline(10.0)).is_empty());
        assert_eq!(b.point_count(), 41);
        assert!(!b.finish().is_empty());
    }

    #[test]
    fn parse_platform_knows_six_names() {
        for n in ["web", "windows", "macos", "linux", "android", "ipados"] {
            assert!(parse_platform(n).is_some(), "{n}");
        }
        assert!(parse_platform("amiga").is_none());
    }
}
```

  Lancer `cargo test -p roomboard-wasm` → erreurs `no function named blank` (attendu).

- [ ] **3. Écrire `crates/roomboard-wasm/src/lib.rs`** (au-dessus des tests) :

```rust
//! Liaison wasm-bindgen du cœur RoomBoard (DA5, D10). Une méthode par commande ; objets (Change, ElementView,
//! Bounds, capacités) par serde-wasm-bindgen ; points et contours en Float32Array. Chaque méthode exposée délègue à
//! une méthode `_inner` sans JsValue, seule testée en natif.
use std::collections::HashMap;

use roomboard_core::capabilities::{capabilities as core_capabilities, Platform};
use roomboard_core::commands::{Change, Command, CommandError, EraseMode};
use roomboard_core::document::Document as CoreDocument;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{self, FormatError, SaveMeta};
use roomboard_core::ink::builder::StrokeBuilder as CoreBuilder;
use roomboard_core::ink::outline::InkStyle;
use roomboard_core::ink::points::to_flat;
use roomboard_core::query::Bounds;
use wasm_bindgen::prelude::*;

/// Version du cœur, pour vérifier que le module Wasm est chargé.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn to_js<T: serde::Serialize>(v: &T) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(v).map_err(|e| JsError::new(&e.to_string()))
}

fn cmd_err(e: CommandError) -> JsError {
    JsError::new(&e.to_string())
}

fn fmt_err(e: FormatError) -> JsError {
    JsError::new(&e.to_string())
}

fn parse_platform(name: &str) -> Option<Platform> {
    Some(match name {
        "web" => Platform::Web,
        "windows" => Platform::Windows,
        "macos" => Platform::MacOs,
        "linux" => Platform::Linux,
        "android" => Platform::Android,
        "ipados" => Platform::IPadOs,
        _ => return None,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CapabilitiesView {
    desktop_annotation: bool,
    multi_window: bool,
}

/// Table des capacités (D23), appelée telle quelle.
#[wasm_bindgen]
pub fn capabilities(platform: &str) -> Result<JsValue, JsError> {
    let p = parse_platform(platform).ok_or_else(|| JsError::new(&format!("plateforme inconnue : {platform}")))?;
    let c = core_capabilities(p);
    to_js(&CapabilitiesView { desktop_annotation: c.desktop_annotation, multi_window: c.multi_window })
}

/// Document exposé à JavaScript.
#[wasm_bindgen]
pub struct Document {
    core: CoreDocument,
    created: Option<String>,
    outlines: HashMap<String, Vec<f32>>,
}

#[wasm_bindgen]
impl Document {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Document {
        Self::wrap(CoreDocument::new(), None)
    }

    /// Document de démarrage : une page, hors historique (D37).
    pub fn blank() -> Document {
        Self::wrap(CoreDocument::blank(), None)
    }

    pub fn load(bytes: &[u8]) -> Result<Document, JsError> {
        Self::load_inner(bytes).map_err(fmt_err)
    }

    pub fn save(&mut self, now: String, app_version: String) -> Result<Vec<u8>, JsError> {
        self.save_inner(&now, &app_version).map_err(fmt_err)
    }

    pub fn add_page(&mut self) {
        self.core.add_page();
    }

    pub fn page_count(&self) -> u32 {
        self.core.page_count()
    }

    pub fn page_ids(&self) -> Vec<String> {
        self.core.page_ids()
    }

    pub fn element_ids(&self, page: &str) -> Vec<String> {
        self.core.element_ids(page)
    }

    pub fn add_page_after(&mut self, after: Option<String>) -> Result<JsValue, JsError> {
        to_js(&self.add_page_after_inner(after).map_err(cmd_err)?)
    }

    pub fn remove_page(&mut self, page: &str) -> Result<JsValue, JsError> {
        to_js(&self.remove_page_inner(page).map_err(cmd_err)?)
    }

    pub fn commit_stroke(&mut self, page: &str, points: &[f32], color: &str, width: f32) -> Result<JsValue, JsError> {
        to_js(&self.commit_stroke_inner(page, points, color, width).map_err(cmd_err)?)
    }

    pub fn erase(&mut self, page: &str, path: &[f32], radius: f32, object: bool) -> Result<JsValue, JsError> {
        to_js(&self.erase_inner(page, path, radius, object).map_err(cmd_err)?)
    }

    pub fn delete(&mut self, ids: Vec<String>) -> Result<JsValue, JsError> {
        to_js(&self.delete_inner(ids).map_err(cmd_err)?)
    }

    pub fn element(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.element(id) {
            Some(e) => to_js(&e),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn points(&self, id: &str) -> Option<Vec<f32>> {
        self.core.stroke_points(id).map(|p| to_flat(&p))
    }

    /// Contour local, mis en cache par id (les points d'un élément sont immuables, DA4).
    pub fn outline(&mut self, id: &str) -> Option<Vec<f32>> {
        if let Some(o) = self.outlines.get(id) {
            return Some(o.clone());
        }
        let o = self.core.outline(id)?;
        self.outlines.insert(id.to_string(), o.clone());
        Some(o)
    }

    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.core.hit_test(page, x, y, tol)
    }

    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String> {
        self.core.hit_test_path(page, path, radius)
    }

    pub fn ids_in_rect(&self, page: &str, x0: f64, y0: f64, x1: f64, y1: f64) -> Vec<String> {
        self.core.ids_in_rect(page, Bounds { x0, y0, x1, y1 })
    }

    pub fn bounds(&self, ids: Vec<String>) -> Result<JsValue, JsError> {
        match self.core.bounds(&ids) {
            Some(b) => to_js(&b),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn undo(&mut self) -> Result<JsValue, JsError> {
        to_js(&self.undo_inner())
    }

    pub fn redo(&mut self) -> Result<JsValue, JsError> {
        to_js(&self.redo_inner())
    }

    pub fn can_undo(&self) -> bool {
        self.core.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.core.can_redo()
    }

    pub fn version(&self) -> f64 {
        self.core.version() as f64
    }
}

impl Document {
    fn wrap(core: CoreDocument, created: Option<String>) -> Document {
        Document { core, created, outlines: HashMap::new() }
    }

    fn forget(&mut self, change: &Change) {
        for id in &change.removed {
            self.outlines.remove(id);
        }
    }

    fn run(&mut self, cmd: Command) -> Result<Change, CommandError> {
        let change = self.core.apply(cmd)?;
        self.forget(&change);
        Ok(change)
    }

    pub fn load_inner(bytes: &[u8]) -> Result<Document, FormatError> {
        let (core, manifest) = format::load_with_manifest(bytes)?;
        Ok(Self::wrap(core, Some(manifest.created)))
    }

    pub fn save_inner(&mut self, now: &str, app_version: &str) -> Result<Vec<u8>, FormatError> {
        let meta = SaveMeta { app_version: app_version.to_string(), now: now.to_string(), created: self.created.clone() };
        let bytes = format::save(&self.core, &meta)?;
        if self.created.is_none() {
            self.created = Some(now.to_string());
        }
        Ok(bytes)
    }

    pub fn add_page_after_inner(&mut self, after: Option<String>) -> Result<Change, CommandError> {
        self.run(Command::AddPage { after })
    }

    pub fn remove_page_inner(&mut self, page: &str) -> Result<Change, CommandError> {
        self.run(Command::RemovePage { page: page.to_string() })
    }

    pub fn commit_stroke_inner(&mut self, page: &str, points: &[f32], color: &str, width: f32) -> Result<Change, CommandError> {
        let style = StrokeStyle { color: color.to_string(), width };
        self.run(Command::CommitStroke { page: page.to_string(), points: points.to_vec(), style })
    }

    pub fn erase_inner(&mut self, page: &str, path: &[f32], radius: f32, object: bool) -> Result<Change, CommandError> {
        let mode = if object { EraseMode::Object } else { EraseMode::Partial };
        self.run(Command::Erase { page: page.to_string(), path: path.to_vec(), radius, mode })
    }

    pub fn delete_inner(&mut self, ids: Vec<String>) -> Result<Change, CommandError> {
        self.run(Command::Delete { ids })
    }

    /// Annuler touche n'importe quoi : `full = true` (tout invalider) si une étape a été défaite.
    pub fn undo_inner(&mut self) -> Change {
        let full = self.core.undo();
        if full {
            self.outlines.clear();
        }
        Change { full, version: self.core.version(), ..Default::default() }
    }

    pub fn redo_inner(&mut self) -> Change {
        let full = self.core.redo();
        if full {
            self.outlines.clear();
        }
        Change { full, version: self.core.version(), ..Default::default() }
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}

/// Encre vive (D20, DA7) : la page pousse les points accumulés une fois par image.
#[wasm_bindgen]
pub struct StrokeBuilder(CoreBuilder);

#[wasm_bindgen]
impl StrokeBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f32) -> StrokeBuilder {
        StrokeBuilder(CoreBuilder::new(InkStyle { width }))
    }

    pub fn push(&mut self, points: &[f32]) -> Vec<f32> {
        self.0.push(points)
    }

    pub fn finish(&self) -> Vec<f32> {
        self.0.finish()
    }

    pub fn point_count(&self) -> u32 {
        self.0.points().len() as u32
    }
}
```

  `clippy::too_many_arguments` peut viser `ids_in_rect` (6 arguments avec `self` : sous le seuil de 7) ; si `clippy`
  signale `new_without_default` sur `StrokeBuilder`, il n'a pas lieu (constructeur à argument). Le champ `created` est
  lu par le test `save_then_load_inner_keeps_elements` (module enfant : accès aux champs privés permis).

- [ ] **4. Vert.** `cargo test -p roomboard-wasm` → ≥ 10 passed ; `cargo build -p roomboard-wasm --target
  wasm32-unknown-unknown --release` sans erreur.
- [ ] **5. Suite complète** sous le jeton → `verifier.sh : OK` (le build web compile `main.ts`, qui appelle toujours
  `new Document()`, `add_page`, `page_count`). Ajout un par un, commit `feat(wasm): document commands, queries,
  StrokeBuilder and capabilities`.

---

<a id="tache-t16"></a>
### Tâche T16 — Adaptateur `wasm-core.ts`, contrat vitest sur le vrai `.wasm`, taille ≤ 1,5 Mo (D33, H2-13)

**Objectif.** Brancher le vrai module sur le contrat figé par T8 (`CoreFactory` / `CoreDocument`), le prouver par des
tests vitest qui chargent le vrai `.wasm` en Node (`initSync` sur les octets, D33), faire que `verifier.sh` refuse
qu'ils soient sautés et mesure la taille du module (≤ 1,5 Mo non compressé, H2-13), avec `opt-level = "s"` et `lto`.
Scénarios : S2 et S3 au niveau du cœur, joués à travers la liaison.

**Fichiers.** Créer `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` ; modifier
`scripts/verifier.sh` et `Cargo.toml` (racine). Rien d'autre.

**Interfaces.**
- Consomme (T8) : `apps/web/src/core/api.ts` — `Change`, `Command`, `CoreDocument`, `CoreFactory`, `ElementView`,
  `Bounds`, `StrokeStyle`, `StrokeBuilderApi`, `Matrix`. Consomme (T15) : module généré `apps/web/src/wasm/roomboard_wasm.js`
  (`initSync`, `version`, `capabilities`, classes `Document`, `StrokeBuilder` ; signatures de T15).
- Réutilise : `scripts/verifier.sh` (étendu, ancres textuelles) et `scripts/controle-wasm-bindgen.sh` (appelé tel quel,
  non modifié) ; `crates/roomboard-wasm/src/lib.rs` `Document` via les liaisons générées (cadrage, « Liaison Wasm »).
- Produit :
  ```ts
  export type WasmModule = Pick<typeof Wasm, "Document" | "StrokeBuilder" | "version">;
  export function toChange(v: unknown): Change;              // lève Error("Change invalide") si la forme diffère
  export function toElementView(v: unknown): ElementView | null;
  export function toBounds(v: unknown): Bounds | null;
  export function createWasmCore(mod: WasmModule): CoreFactory;
  ```
  `verifier.sh` : variable `ROOMBOARD_WASM_REQUIRED=1` pour `pnpm -r test` ; ligne `module Wasm : N octets` ; arrêt si
  N > 1572864. `Cargo.toml` racine : `[profile.release] opt-level = "s"`, `lto = true`.

**Le patron à ne pas reprendre.** (1) Un test de contrat qui se saute en silence quand le `.wasm` manque : sous
`verifier.sh`, il doit échouer (le test `le module wasm est présent quand il est exigé`). (2) Importer `node:fs`
statiquement : `apps/web` n'a pas `@types/node` et `tsc --noEmit` du build web échouerait ; on passe par un import
dynamique typé localement et par `globalThis.process`. (3) `as Change` sur la valeur rendue par Wasm sans contrôle :
une dérive de forme entre Rust et TS passerait inaperçue ; `toChange` vérifie chaque champ. (4) Éditer `verifier.sh`
par numéro de ligne : la tâche T6 du lot 1 le modifie aussi. Chemin de référence :
`docs/plans/socle-cadrage.md:60` (D33), `:254-256` (H2-13), `apps/web/src/core/api.ts` (T8).

**Test et commande bornée.**
`cd "$WT" && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | grep -E "module Wasm|wasm-core.contract|Tests |verifier.sh"`
→ `module Wasm : N octets` (N ≤ 1572864, recopié dans le rapport), `wasm-core.contract.test.ts` avec ≥ 12 tests passés
et **0 skipped**, `verifier.sh : OK`. Contrôle ciblé après un `verifier.sh` (le `.wasm` est alors généré) :
`cd "$WT/apps/web" && ROOMBOARD_WASM_REQUIRED=1 pnpm exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | tail -25`
→ nom `S2 au niveau du cœur par la liaison` présent.

**Essais de plateforme.** Aucun au lot 2 (le module tourne dans les navigateurs et WebView au lot 3).

**Contraintes (recopiées).** Jamais `git add -A`, `git add .`, `git commit -a` ; pas de `--force` ; aucun workflow
GitHub Actions ; un seul build Tauri à la fois, aucun build Android (aucun ici) ; tests par `scripts/verifier.sh` avec
`PATH=$HOME/.cargo/bin:$PATH` sous le jeton `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire
socle/T16 --places-par-sujet 3 --commande "cd $WT && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30"` (commandes ciblées sous le même jeton) ; relecteurs au premier plan (`run_in_background: false`) ; TS strict,
`noUncheckedIndexedAccess`, aucun `any`.

**Interdits.** Ne pas modifier `api.ts` (contrat figé ; un écart se rapporte à l'orchestrateur). Ne pas toucher
`apps/web/package.json` ni `pnpm-lock.yaml` (pas d'ajout de `@types/node`). Ne pas toucher `main.ts`,
`.github/workflows/`, `controle-wasm-bindgen.sh`.

**Terminé quand.** Contrat vert sans test sauté sous `verifier.sh`, taille rapportée et ≤ 1,5 Mo, `verifier.sh : OK`,
rapport avec `Réutilisation : appelé verifier.sh (étendu), controle-wasm-bindgen.sh, Document wasm via wasm-core.ts`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **1. Tests de contrat (rouge).** `apps/web/src/core/wasm-core.contract.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { CoreDocument, CoreFactory } from "./api";
import { createWasmCore } from "./wasm-core";

interface NodeFs { existsSync(p: URL): boolean; readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const wasmFile = new URL("../wasm/roomboard_wasm_bg.wasm", import.meta.url);
const present = fs.existsSync(wasmFile);
const required = env["ROOMBOARD_WASM_REQUIRED"] === "1";

it("le module wasm est présent quand il est exigé", () => {
  if (required) expect(present).toBe(true);
});

const style = { color: "#1e40af", width: 4 };
const hline = (y: number): Float32Array => {
  const a: number[] = [];
  for (let i = 0; i <= 40; i++) a.push(100 + i * 10, y, 0.5);
  return new Float32Array(a);
};
const first = (d: CoreDocument): string => {
  const p = d.pageIds()[0];
  if (p === undefined) throw new Error("aucune page");
  return p;
};
const commit = (d: CoreDocument, page: string, y: number): string => {
  const id = d.apply({ type: "CommitStroke", page, points: hline(y), style }).ids[0];
  if (id === undefined) throw new Error("aucun id");
  return id;
};

// Import par URL calculée (`@vite-ignore`) : un import littéral d'un fichier absent casserait la collecte du test
// même sauté. Le type vient de `typeof import(...)`, effacé à l'exécution.
type WasmJs = typeof import("../wasm/roomboard_wasm");
interface Loaded { readonly core: CoreFactory; readonly capabilities: (platform: string) => unknown }
async function loadWasm(): Promise<Loaded> {
  const href = new URL("../wasm/roomboard_wasm.js", import.meta.url).href;
  const mod = (await import(/* @vite-ignore */ href)) as WasmJs;
  mod.initSync({ module: fs.readFileSync(wasmFile) });
  return { core: createWasmCore(mod), capabilities: (platform: string) => mod.capabilities(platform) };
}
const loaded: Loaded | null = present ? await loadWasm() : null;
const need = (): Loaded => {
  if (loaded === null) throw new Error("module wasm absent");
  return loaded;
};

describe.skipIf(loaded === null)("contrat du vrai module wasm", () => {
  const core = {
    version: (): string => need().core.version(),
    blank: (): CoreDocument => need().core.blank(),
    load: (b: Uint8Array): CoreDocument => need().core.load(b),
  };

  it("version non vide", () => {
    expect(core.version().length).toBeGreaterThan(0);
  });

  it("blank : une page, rien à annuler", () => {
    const d = core.blank();
    expect(d.pageIds()).toHaveLength(1);
    expect(d.canUndo()).toBe(false);
    expect(d.undo().full).toBe(false);
    d.free();
  });

  it("CommitStroke rend un Change et des points locaux", () => {
    const d = core.blank();
    const p = first(d);
    const c = d.apply({ type: "CommitStroke", page: p, points: hline(100), style });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    expect(c.version).toBe(1);
    const id = c.ids[0] ?? "";
    expect(d.element(id)?.transform).toEqual([1, 0, 0, 1, 100, 100]);
    expect(Array.from(d.points(id) ?? []).slice(0, 3)).toEqual([0, 0, 0.5]);
    d.free();
  });

  it("S2 au niveau du cœur par la liaison", () => {
    const d = core.blank();
    const p = first(d);
    commit(d, p, 100);
    commit(d, p, 200);
    commit(d, p, 300);
    const e = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 150, 300, 250]), radius: 10, mode: "partial" });
    expect(e.removed).toHaveLength(1);
    expect(d.elementIds(p)).toHaveLength(4);
    expect(d.undo().full).toBe(true);
    expect(d.elementIds(p)).toHaveLength(3);
    d.redo();
    expect(d.elementIds(p)).toHaveLength(4);
    const back = core.load(d.save("2026-11-16T14:00:00Z", "0.1.0"));
    expect(back.elementIds(p)).toEqual(d.elementIds(p));
    for (const id of d.elementIds(p)) {
      expect(back.element(id)).toEqual(d.element(id));
      expect(Array.from(back.points(id) ?? [])).toEqual(Array.from(d.points(id) ?? []));
    }
    expect(back.canUndo()).toBe(false);
    back.free();
    d.free();
  });

  it("S3 : suppression de page annulée, dernière page refusée", () => {
    const d = core.blank();
    const p1 = first(d);
    const p2 = d.apply({ type: "AddPage", after: p1 }).pages[0] ?? "";
    const s = commit(d, p2, 500);
    d.apply({ type: "RemovePage", page: p2 });
    expect(d.pageIds()).toEqual([p1]);
    d.undo();
    expect(d.pageIds()).toEqual([p1, p2]);
    expect(d.elementIds(p2)).toEqual([s]);
    d.apply({ type: "RemovePage", page: p2 });
    expect(() => d.apply({ type: "RemovePage", page: p1 })).toThrow(/dernière page/);
    d.free();
  });

  it("le contour est un polygone x, y non vide", () => {
    const d = core.blank();
    const id = commit(d, first(d), 100);
    const o = d.outline(id);
    expect(o).not.toBeNull();
    expect((o?.length ?? 0) % 2).toBe(0);
    expect(o?.length ?? 0).toBeGreaterThan(6);
    d.free();
  });

  it("hitTest et hitTestPath", () => {
    const d = core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    expect(d.hitTest(p, 300, 100, 2)).toBe(a);
    expect(d.hitTest(p, 300, 900, 2)).toBeNull();
    expect(d.hitTestPath(p, new Float32Array([150, 90, 150, 110]), 3)).toEqual([a]);
    d.free();
  });

  it("idsInRect et bounds", () => {
    const d = core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    expect(d.idsInRect(p, { x0: 0, y0: 0, x1: 1000, y1: 1000 })).toEqual([a]);
    const b = d.bounds([a]);
    expect(b?.x0 ?? Infinity).toBeLessThanOrEqual(100);
    expect(d.bounds([])).toBeNull();
    d.free();
  });

  it("gomme d'objet et Delete", () => {
    const d = core.blank();
    const p = first(d);
    const a = commit(d, p, 100);
    const b = commit(d, p, 200);
    const c = d.apply({ type: "Erase", page: p, path: new Float32Array([300, 195, 300, 205]), radius: 5, mode: "object" });
    expect(c.removed).toEqual([b]);
    expect(d.apply({ type: "Delete", ids: [a] }).removed).toEqual([a]);
    expect(d.elementIds(p)).toHaveLength(0);
    d.free();
  });

  it("StrokeBuilder rend un contour pendant et à la fin du geste", () => {
    const d = core.blank();
    const b = d.newStrokeBuilder(style);
    expect(b.push(hline(10)).length).toBeGreaterThan(0);
    expect(b.finish().length).toBeGreaterThan(0);
    b.free();
    d.free();
  });

  it("load d'octets quelconques lève une erreur lisible", () => {
    expect(() => core.load(new Uint8Array([1, 2, 3]))).toThrow(/n'est pas un document RoomBoard/);
  });

  it("capabilities expose la table du cœur", () => {
    expect(need().capabilities("windows")).toEqual({ desktopAnnotation: true, multiWindow: true });
    expect(need().capabilities("ipados")).toEqual({ desktopAnnotation: false, multiWindow: false });
  });
});
```

  Lancer `cd "$WT/apps/web" && pnpm exec vitest run src/core/wasm-core.contract.test.ts` (après un `verifier.sh` de
  la branche à jour, ou les trois commandes Wasm de `verifier.sh` à la main) → `Failed to resolve import "./wasm-core"`
  (attendu).

- [ ] **2. Écrire `apps/web/src/core/wasm-core.ts`** :

```ts
// Adaptateur du vrai module Wasm (T15) vers le contrat figé `api.ts` (T8). Toute valeur venue de Wasm est contrôlée.
import type { Bounds, Change, Command, CoreDocument, CoreFactory, ElementView, Matrix, StrokeBuilderApi, StrokeStyle } from "./api";
import type * as Wasm from "../wasm/roomboard_wasm";

export type WasmModule = Pick<typeof Wasm, "Document" | "StrokeBuilder" | "version">;

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function toChange(v: unknown): Change {
  if (!isRecord(v)) throw new Error("Change invalide");
  const { pages, ids, removed, full, version } = v;
  if (!isStrings(pages) || !isStrings(ids) || !isStrings(removed) || typeof full !== "boolean" || typeof version !== "number") {
    throw new Error("Change invalide");
  }
  return { pages, ids, removed, full, version };
}

export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error("ElementView invalide");
  const { id, kind, transform, style } = v;
  if (typeof id !== "string" || kind !== "stroke" || !Array.isArray(transform) || transform.length !== 6 || !isRecord(style)) {
    throw new Error("ElementView invalide");
  }
  const t = transform.map(Number);
  const [a, b, c, d, e, f] = t;
  if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error("ElementView invalide");
  }
  const { color, width } = style;
  if (typeof color !== "string" || typeof width !== "number") throw new Error("ElementView invalide");
  const matrix: Matrix = [a, b, c, d, e, f];
  return { id, kind, transform: matrix, style: { color, width } };
}

export function toBounds(v: unknown): Bounds | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error("Bounds invalide");
  const { x0, y0, x1, y1 } = v;
  if (typeof x0 !== "number" || typeof y0 !== "number" || typeof x1 !== "number" || typeof y1 !== "number") {
    throw new Error("Bounds invalide");
  }
  return { x0, y0, x1, y1 };
}

class WasmCoreDocument implements CoreDocument {
  constructor(private readonly d: Wasm.Document, private readonly mod: WasmModule) {}

  pageIds(): string[] { return this.d.page_ids(); }
  elementIds(page: string): string[] { return this.d.element_ids(page); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": return toChange(this.d.add_page_after(cmd.after));
      case "RemovePage": return toChange(this.d.remove_page(cmd.page));
      case "CommitStroke": return toChange(this.d.commit_stroke(cmd.page, cmd.points, cmd.style.color, cmd.style.width));
      case "Erase": return toChange(this.d.erase(cmd.page, cmd.path, cmd.radius, cmd.mode === "object"));
      case "Delete": return toChange(this.d.delete([...cmd.ids]));
    }
  }

  element(id: string): ElementView | null { return toElementView(this.d.element(id)); }
  points(id: string): Float32Array | null { return this.d.points(id) ?? null; }
  outline(id: string): Float32Array | null { return this.d.outline(id) ?? null; }
  hitTest(page: string, x: number, y: number, tol: number): string | null { return this.d.hit_test(page, x, y, tol) ?? null; }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] { return this.d.hit_test_path(page, path, radius); }
  idsInRect(page: string, r: Bounds): string[] { return this.d.ids_in_rect(page, r.x0, r.y0, r.x1, r.y1); }
  bounds(ids: readonly string[]): Bounds | null { return toBounds(this.d.bounds([...ids])); }
  undo(): Change { return toChange(this.d.undo()); }
  redo(): Change { return toChange(this.d.redo()); }
  canUndo(): boolean { return this.d.can_undo(); }
  canRedo(): boolean { return this.d.can_redo(); }
  version(): number { return this.d.version(); }
  save(now: string, appVersion: string): Uint8Array { return this.d.save(now, appVersion); }

  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const b = new this.mod.StrokeBuilder(style.width);
    return { push: (p: Float32Array) => b.push(p), finish: () => b.finish(), free: () => b.free() };
  }

  free(): void { this.d.free(); }
}

export function createWasmCore(mod: WasmModule): CoreFactory {
  return {
    blank: () => new WasmCoreDocument(mod.Document.blank(), mod),
    load: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load(bytes), mod),
    version: () => mod.version(),
  };
}
```

  Les noms et types des méthodes générées (`add_page_after(after?: string | null)`, `delete(ids: string[])`,
  `points(id): Float32Array | undefined`, `element(id): any`) sont ceux de `apps/web/src/wasm/roomboard_wasm.d.ts`
  produit par `wasm-bindgen` 0.2.130 : s'ils diffèrent (par exemple `JsValue` typé `any`), adapter l'appel, jamais
  `api.ts`, et le noter au rapport.

- [ ] **3. `Cargo.toml` racine** : ajouter à la fin

```toml
[profile.release]
opt-level = "s"
lto = true
```

  (`apps/desktop/src-tauri` est hors du workspace et garde son propre profil.)

- [ ] **4. `scripts/verifier.sh`**, par ancres :
  - juste **après** la ligne `  target/wasm32-unknown-unknown/release/roomboard_wasm.wasm` (fin de la commande
    `wasm-bindgen`), insérer :

```bash
taille=$(stat -c %s "$WASM_OUT/roomboard_wasm_bg.wasm")
echo "module Wasm : $taille octets"
if [ "$taille" -gt 1572864 ]; then
  echo "verifier.sh : module Wasm trop gros ($taille octets > 1,5 Mo, H2-13)" >&2
  exit 1
fi
```

  - remplacer la ligne `pnpm -r test` par `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test`.
  Vérifier : `grep -n "module Wasm\|ROOMBOARD_WASM_REQUIRED" scripts/verifier.sh` → 2 lignes au moins.

- [ ] **5. Vert.** `verifier.sh` sous le jeton → `module Wasm : N octets` (N ≤ 1572864), contrat ≥ 12 tests, 0 sauté,
  `verifier.sh : OK`. Si N dépasse 1,5 Mo : ne pas relever le seuil ; rapporter N et les deux plus gros postes
  (`twiggy` n'est pas installé : comparer avec et sans `zip` par `cargo build … --release` et `ls -l`), l'orchestrateur
  tranche (H2-13).
- [ ] **6. Commit.** Ajout un par un (`wasm-core.ts`, `wasm-core.contract.test.ts`, `scripts/verifier.sh`,
  `Cargo.toml`), commit `feat(web): wasm core adapter and contract tests on the real module`.

---

## Relecture du plan (auto-contrôle)

- **Couverture du cadrage (lot 2 du plan maître).** Schéma D2 → T9 ; `Document::blank` D37 → T9 (et T12 : dernière
  page) ; `ink` : contour T10, collision et gomme T11, `StrokeBuilder` T10 ; commandes → T12 ; `History` DA6 → T9 ;
  `format` DA3, D24, D25 → T13 (H2-8 prouvé dès T7) ; liaison DA5, D10, D23 → T15 ; contrat vitest sur le vrai `.wasm`
  D33 → T16 ; taille ≤ 1,5 Mo H2-13 → T16 ; mesure de la pile d'annulation sur 1 000 gestes H2-13 → T12 ; interface
  figée tôt pour le lot 3 (D36) → T8.
- **Scénarios.** S2 → T7, T8, T9, T10, T11, T12, T13, T14, T15, T16 ; S3 → T9, T12, T13, T14, T16. Chaque tâche a un
  scénario. S1, S4, S5 ne relèvent pas du lot 2.
- **Carte d'impact.** Toutes les entrées « oui » du cœur et de la liaison sont dans les fichiers touchés d'une tâche ;
  `capabilities.rs` (« non au socle ») est appelé par T15 sans être modifié ; `main.ts` n'est pas touché au lot 2.
- **Modules à réutiliser.** `document.rs:4` → T9 (étendu), T12 (`impl` dans `commands.rs`) ; `capabilities.rs:21` →
  T15 ; `roomboard-wasm/src/lib.rs:13` → T15 ; `UndoManager` → T9 ; `uuid_v4` → T9, T12 ; encodage v1 → T9, T13 ;
  `freedraw` → T10 ; `zip` → T7, T13. Les modules du cadrage hors lot 2 (`toolbar.ts`, `main.ts`, échantillonneur,
  rendu, fichiers, `vite-plugin-singlefile`) relèvent des lots 1, 3, 5.
- **Noms cohérents entre tâches.** `transact_local`, `read`, `bump`, `find_page`, `page_elements`, `find_element`,
  `FoundElement`, `insert_page`, `pages_ref` (T9) appelés par T12 ; `read_stroke`, `world_to_local_path` (T12)
  appelés par `query.rs` (T12) ; `outline_with` (T10) appelé par `builder.rs` (T10) ; `Change` / `Bounds` / `ElementView`
  sérialisés en `pages, ids, removed, full, version` / `x0, y0, x1, y1` / `id, kind, transform, style{color, width}`,
  lus par `toChange`, `toBounds`, `toElementView` (T16) contre `api.ts` (T8).
- **Points non vérifiés par compilation** (à surveiller par les exécutants, chacun a sa consigne de repli dans sa
  section) : `zlib-rs` en wasm32 (T7) ; `MapPrelim` passé directement à `Array::insert` / `push_back` (T9, T12 : sinon
  `In::Map(prelim)`) ; fin de bloc empruntant `txn` (E0597, T9, T12) ; noms TS exacts générés par `wasm-bindgen`
  0.2.130 (T16).
