# Plan d'exécution — usage-c2-coeur (assets, image, fond de page, `kind` inconnu)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Fixture du socle écrite par le code de `main` | — | `crates/roomboard-core/tests/compat_socle.rs`, `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` | isolé | implementeur-tdd | `cargo test -p roomboard-core --test compat_socle` : 2 tests, `socle_fixture_resaves_identically` présent | S5 | #tache-t1 |
| T2 | Moitiés du `.roomboard` dans le format du cœur | — | `crates/roomboard-core/src/format/mod.rs` | isolé | implementeur-tdd | `cargo test -p roomboard-core format::` : ≥ 22 tests, `newer_format_version_without_document_is_newer` présent | S1, S5 | #tache-t2 |
| T3 | Vues image et `kind` inconnu, module `asset` | — | `crates/roomboard-core/src/asset.rs`, `crates/roomboard-core/src/lib.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/query.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/tests/element_inconnu.rs`, `crates/roomboard-core/tests/fixtures/element-inconnu.roomboard` | isolé | implementeur-tdd | `cargo test -p roomboard-core --test element_inconnu` : ≥ 4 tests, `unknown_kind_is_kept_moved_and_resaved` présent | S4 | #tache-t3 |
| T4 | `AssetStore` de la page | — | `apps/web/src/core/asset-store.ts`, `apps/web/src/core/asset-store.test.ts` | isolé | implementeur-tdd | `pnpm --filter @roomboard/web exec vitest run src/core/asset-store.test.ts` : ≥ 6 tests, « même Blob deux fois » présent | S2 | #tache-t4 |
| T5 | Contrat TS et fausse liaison (image, fond, inconnu) | — | `apps/web/src/core/api.ts`, `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts`, `apps/web/src/core/fixtures/element-inconnu.fake.json` | isolé | concepteur-critique | `pnpm --filter @roomboard/web test` : bloc « contrat C2 : fausse liaison » ≥ 6 tests, 0 échec | S2, S3, S4 | #tache-t5 |
| T6 | Assets, image et fond dans le cœur | T1, T3 | `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/history.rs`, `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/tests/element_inconnu.rs` | isolé | concepteur-critique | `cargo test -p roomboard-core` : 0 échec, `undo_add_image_removes_new_asset_meta_only` et `set_backdrop_scales_to_page_width` présents | S1, S2, S3 | #tache-t6 |
| T7 | Crate `roomboard-formats` : conteneur des assets | T1, T2, T3 | `Cargo.toml`, `Cargo.lock`, `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/container.rs`, `crates/roomboard-formats/tests/container.rs`, `THIRD_PARTY_NOTICES.md` | isolé | concepteur-critique | `cargo test -p roomboard-formats --test container` : ≥ 12 tests, `socle_fixture_hash_is_pinned` et `container_without_assets_equals_core_save` présents | S1, S5 | #tache-t7 |
| T8 | Liaison Wasm et adaptateur TS | T2, T5, T6 | `crates/roomboard-wasm/src/lib.rs`, `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test` : 0 échec, « contrat C2 : vrai module wasm » présent ; module ≤ 1 572 864 octets | S4, S1, S3 | #tache-t8 |
| T9 | Scénarios du conteneur et essai réel | T6, T7 | `crates/roomboard-formats/tests/scenarios.rs`, `crates/roomboard-formats/tests/fixtures/element-inconnu-avec-asset.roomboard` | isolé | implementeur-tdd | `cargo test -p roomboard-formats --test scenarios` : ≥ 4 tests, `s1_image_round_trip` présent, 1 ignoré | S1, S2, S3, S4 | #tache-t9 |

**Vagues proposées.** Vague 1 : T1, T2, T3, T4, T5 (fichiers disjoints, cinq en parallèle). Vague 2 : T6, T7 (disjoints).
Vague 3 : T8, T9 (disjoints). Fichiers partagés entre tâches de vagues différentes, donc jamais en parallèle :
`document.rs`, `commands.rs`, `element.rs`, `tests/element_inconnu.rs` (T3 puis T6) ; `wasm-core.contract.test.ts`
(T5 puis T8). Entre T5 et T8, `tsc` échoue sur `wasm-core.ts` (méthodes neuves du contrat non branchées) : attendu,
`vitest` reste vert ; T8 rend `tsc` vert.

**Goal :** le cœur RoomBoard porte des images, un fond de page et les éléments d'un `kind` inconnu ; le `.roomboard`
garde ses assets par le crate `roomboard-formats` ; la page a un `AssetStore` ; tout est testé sans interface.

**Architecture :** le cœur reste seul à écrire et lire `manifest.json` et `document.ybin` (`save_parts`, `write_parts`,
`open`, `load_parts`) ; le crate natif `roomboard-formats` n'ajoute que les entrées `assets/<sha256>.<ext>` (`sha2`) ;
les métadonnées vivent dans la racine `Y.Map` `assets`, les octets dans l'`AssetStore` TS ; les assets écrits sont ceux
que cite le document, trouvés par un balayage générique (K4).

**Tech Stack :** Rust (yrs 0.28.1, zip 9.6, serde, sha2 0.10), wasm-bindgen 0.2.130, TypeScript, Vitest.

**Spec :** `docs/plans/usage-c2-coeur-cadrage.md` (commit `2fa434b`).

## Global Constraints

- G1 Périmètre : `crates/roomboard-core`, `crates/roomboard-wasm`, crate neuf `crates/roomboard-formats` (dérogation K1, sans liaison Wasm), `Cargo.toml` racine et `Cargo.lock`, côté page `apps/web/src/core/` (`asset-store.ts` neuf, `api.ts`, `fake-core.ts`, `wasm-core.ts`, leurs tests), `THIRD_PARTY_NOTICES.md`, docs.
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G4 Jamais `Any::Map` pour une valeur composée écrite ; test « recharger garde les octets » pour chaque valeur composée neuve.
- G5 Aucune dépendance AGPL/GPL/LGPL. Module Wasm principal ≤ 1,5 Mo (1 572 864 octets, marge ~160 Ko partagée avec C7 et C9) : `sha2` n'entre pas dans `roomboard-wasm`.
- G6 Fichiers d'exemple `~/telechargements-roomboard/` jamais commités ; fixtures synthétiques seulement ; régénération des fixtures derrière `ROOMBOARD_REGENERER_FIXTURES=1`, jamais par `#[ignore]`.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un (jamais `git add -A`, `.`, `commit -a`).
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. VM chargée : un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p <crate> 2>&1 | tail -20`, `pnpm --filter @roomboard/web test 2>&1 | tail -20`, `cargo clippy -p <crate> --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 Format : `schema` reste 1, `formatVersion` reste 1 ; `format::save` et `format::load` gardent signature et octets (K2, K10).
- G11 Rapport de tâche : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :` de la section.

Commande de commit type (dans le dossier `$WT` que l'orchestrateur donne à la tâche) :

```bash
cd "$WT" && git add <fichier1> && git add <fichier2> && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "<message anglais>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Review Focus

1. Métadonnée d'asset mal formée (entrée qui n'est pas un `Y.Map`, `size` négatif ou chaîne, `mime` vide) : défauts champ par champ, rien écrit, enregistrement réussi (K4) — test `cited_assets_malformed_meta_falls_back_without_writing`, T6.
2. Fond sans asset lisible ou qui n'est pas un `Y.Map` : page lisible, `backdrop: null`, champ gardé (K9) — test `unreadable_backdrop_keeps_page_readable`, T6.
3. Entrées `assets/` douteuses à la lecture (empreinte fausse, nom non conforme, doublon, sous-dossier) : ignorées avec avertissement, lecture réussie (K11, HK3) — test `read_ignores_bad_asset_entries_with_warnings`, T7.
4. Empreinte en majuscules ou de 63 caractères : jamais un asset, refusée par `AddImage` (K4, K5) — tests `is_asset_id_accepts_only_lowercase_hex_64` (T3) et `add_image_rejects_bad_input_without_transaction` (T6).
5. Élément inconnu sans `transform` : identité à la lecture, rien réécrit, `Transform` l'ignore, `Delete` le retire, la gomme l'ignore (K8, S4) — test `unknown_without_transform_is_identity_selectable_deletable`, T3.

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/tests/compat_socle.rs` (neuf) | garde K10 : fixture du socle, réenregistrement identique | T1 |
| `crates/roomboard-core/src/format/mod.rs` | `Parts`, `save_parts`, `write_parts`, `check_manifest`, `open`, `load_parts`, `entry_options`, `pub use zip` | T2 |
| `crates/roomboard-core/src/asset.rs` (neuf) | `is_asset_id`, `AssetInfo`, `AssetRef`, `DEFAULT_ASSET_MIME` | T3 |
| `crates/roomboard-core/src/element.rs` | vues `ImageView`, `UnknownView`, `BackdropView`, `style: Option` ; lecteurs `read_image`, `read_unknown` (T3), `read_backdrop`, `backdrop_view` (T6) | T3, T6 |
| `crates/roomboard-core/src/document.rs` | `element()` image et inconnu (T3) ; racine `assets`, `page()` avec fond, `cited_assets`, `asset` (T6) | T3, T6 |
| `crates/roomboard-core/src/query.rs` | géométrie de boîte pour image et inconnu | T3 |
| `crates/roomboard-core/src/history.rs` | portée `assets` | T6 |
| `crates/roomboard-core/src/commands.rs` | tests `style` en `Option` (T3) ; `AddImage`, `SetBackdrop`, `BadAsset`, `BadImage` (T6) | T3, T6 |
| `crates/roomboard-core/tests/element_inconnu.rs` (neuf) | fixture `element-inconnu.roomboard`, S4 cœur | T3, T6 |
| `crates/roomboard-formats/**` (neuf) | `container` : `sha256_hex`, `write`, `read` ; tests ; scénarios | T7, T9 |
| `THIRD_PARTY_NOTICES.md` (neuf) | `sha2` et ses dépendances | T7 |
| `crates/roomboard-wasm/src/lib.rs` | `page`, `add_image`, `set_backdrop`, `clear_backdrop`, `cited_assets`, `asset`, `save_parts`, `load_parts` | T8 |
| `apps/web/src/core/asset-store.ts` (neuf) | octets des assets par empreinte | T4 |
| `apps/web/src/core/api.ts` | contrat élargi | T5 |
| `apps/web/src/core/fake-core.ts` | parité de la fausse liaison | T5 |
| `apps/web/src/core/wasm-core.ts` | contrôle des vues neuves, `kind` non reconnu → `UnknownElement` | T8 |
| `apps/web/src/core/wasm-core.contract.test.ts` | bloc « contrat C2 » (T5, fausse liaison ; T8, vrai module) | T5, T8 |

Valeurs communes à toutes les tâches (vecteurs SHA-256) :
`ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"` (octets `abc`) ;
`EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"` (octets vides).

Messages d'erreur neufs (Rust `Display` et fausse liaison, mot pour mot) :
- `BadAsset` : `asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)`
- `BadImage` : `image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)`

---

### Tâche T1 — Fixture du socle écrite par le code de `main`

**Objectif.** Écrire, sur le code de `main` (`d71eda3`) et avant tout changement du cœur, la fixture binaire
`socle-v1.roomboard` (traits, forme, texte, deux pages, `SaveMeta` fixe) et la garde permanente : la charger puis la
réenregistrer avec le même `SaveMeta` donne les mêmes octets (K10, K15, S5).

**Fichiers.**
- Create : `crates/roomboard-core/tests/compat_socle.rs`
- Create : `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (binaire, écrit par le test)

**Interfaces.**
- Consomme : `roomboard_core::format::{load, save, SaveMeta}`, `roomboard_core::commands::Command`,
  `roomboard_core::document::Document`, `roomboard_core::element::StrokeStyle`, `roomboard_core::shape::ShapeKind` (code de `main`, inchangé).
- Produit : le fichier `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (lu par T7 qui fige son SHA-256, et par T8
  dans le test de contrat du vrai module) ; `SaveMeta` de la fixture : `app_version "0.1.0"`, `now "2026-11-20T00:00:00Z"`,
  `created None`.
- Réutilise : aucun module de la liste « Modules à réutiliser » (test d'intégration sur l'API publique existante).

**Test et commande bornée.**
`cargo test -p roomboard-core --test compat_socle 2>&1 | tail -20` → `test result: ok. 2 passed`, noms
`socle_fixture_resaves_identically` et `socle_fixture_has_two_pages_and_three_kinds` présents.

**Preuve visuelle.** Aucune (pas d'interface).

**Contraintes (recopiées).**
- G1 Périmètre : `crates/roomboard-core` (ici `tests/` seulement).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G6 Fixtures synthétiques seulement ; régénération derrière `ROOMBOARD_REGENERER_FIXTURES=1`, jamais par `#[ignore]`.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-core 2>&1 | tail -20`, `cargo clippy -p roomboard-core --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `schema` 1, `formatVersion` 1 ; `save` et `load` inchangés.

**Interdits.** Toucher à `src/` du cœur : la fixture doit être écrite par le code de `main`. Lire `.style` d'une vue
(le champ devient facultatif en T3). Régénérer la fixture sans la variable d'environnement.

**Terminé quand.** Les deux tests passent sans la variable, la fixture est commitée, `cargo clippy -p roomboard-core --all-targets -- -D warnings` et `cargo fmt --all --check` sont verts.

**Étapes.**

- [ ] **Étape 1 : écrire le test (rouge : fixture absente).** Créer `crates/roomboard-core/tests/compat_socle.rs` :

```rust
//! Garde de compatibilité (K10, K15, S5) : `socle-v1.roomboard` est écrit une fois par le code de `main` (d71eda3).
//! La régénérer exige `ROOMBOARD_REGENERER_FIXTURES=1` ; T7 fige son SHA-256 : un octet changé fait échouer ce test-là.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::shape::ShapeKind;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name)
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#1e40af".into(),
        width: 4.0,
    }
}

fn hline(y: f32) -> Vec<f32> {
    (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
        .collect()
}

/// Document du socle : page 1 = trait, rectangle rempli, texte ; page 2 = trait.
fn socle_document() -> Document {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    d.apply(Command::CommitStroke {
        page: p1.clone(),
        points: hline(100.0),
        style: pen(),
    })
    .expect("trait");
    d.apply(Command::AddShape {
        page: p1.clone(),
        shape: ShapeKind::Rect,
        x0: 100.0,
        y0: 200.0,
        x1: 400.0,
        y1: 350.0,
        style: pen(),
        fill: Some("#fde68a".into()),
    })
    .expect("forme");
    d.apply(Command::SetText {
        page: p1.clone(),
        id: None,
        x: 500.0,
        y: 500.0,
        content: "Bonjour RoomBoard".into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
    })
    .expect("texte");
    let p2 = d
        .apply(Command::AddPage {
            after: Some(p1.clone()),
        })
        .expect("page")
        .pages[0]
        .clone();
    d.apply(Command::CommitStroke {
        page: p2,
        points: hline(300.0),
        style: pen(),
    })
    .expect("trait 2");
    d
}

fn socle_bytes() -> Vec<u8> {
    let path = fixture("socle-v1.roomboard");
    if regenerate() {
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("création du dossier");
        std::fs::write(&path, save(&socle_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture socle-v1.roomboard absente : la régénérer avec ROOMBOARD_REGENERER_FIXTURES=1 sur le code de main",
    )
}

#[test]
fn socle_fixture_resaves_identically() {
    let bytes = socle_bytes();
    let doc = load(&bytes).expect("load");
    assert!(
        save(&doc, &meta()).expect("resave") == bytes,
        "réenregistrer le fichier du socle change ses octets"
    );
}

#[test]
fn socle_fixture_has_two_pages_and_three_kinds() {
    let doc = load(&socle_bytes()).expect("load");
    let pages = doc.page_ids();
    assert_eq!(pages.len(), 2);
    let kinds = |p: &str| -> Vec<String> {
        doc.element_ids(p)
            .iter()
            .map(|id| doc.element(id).expect("vue").kind)
            .collect()
    };
    assert_eq!(kinds(&pages[0]), vec!["stroke", "shape", "text"]);
    assert_eq!(kinds(&pages[1]), vec!["stroke"]);
}
```

  Si `ShapeKind::Rect` n'est pas le nom du variant, lire `crates/roomboard-core/src/shape.rs` et prendre le variant du rectangle.

- [ ] **Étape 2 : vérifier le rouge.**
  `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core --test compat_socle 2>&1 | tail -20`
  Attendu : 2 tests en échec, message `fixture socle-v1.roomboard absente`.

- [ ] **Étape 3 : écrire la fixture une fois.**
  `cd "$WT" && ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_socle 2>&1 | tail -20`
  Attendu : `test result: ok. 2 passed`. Vérifier `ls -l crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (quelques Ko).

- [ ] **Étape 4 : vérifier le vert sans la variable, et le reste du crate.**
  `cargo test -p roomboard-core --test compat_socle 2>&1 | tail -20` → `2 passed` ; puis
  `cargo test -p roomboard-core 2>&1 | tail -20` → aucun `FAILED` ;
  `cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5` et `cargo fmt --all --check`.

- [ ] **Étape 5 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/tests/compat_socle.rs && \
git add crates/roomboard-core/tests/fixtures/socle-v1.roomboard && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(core): pin socle-v1 fixture written by main" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests, taille de la fixture, `Réutilisation : écart — aucun module de la liste n'est concerné`.

---

### Tâche T2 — Moitiés du `.roomboard` dans le format du cœur

**Objectif.** Découper `format::save` et `format::load_with_manifest` en fonctions publiques que le conteneur réutilise,
sans changer un octet ni l'ordre des contrôles : manifeste contrôlé **avant** de chercher `document.ybin` (K2, arbitrages B1, I1).

**Fichiers.**
- Modify : `crates/roomboard-core/src/format/mod.rs` (lignes 1-161 pour le code, tests à la suite de `:197-410`)

**Interfaces.**
- Produit (exact, utilisé par T7, T8, T9) :
  - `pub use zip;`
  - `#[derive(Debug, Clone, PartialEq)] pub struct Parts { pub manifest: Vec<u8>, pub ybin: Vec<u8> }`
  - `pub fn entry_options(stored: bool) -> SimpleFileOptions` (stored → `CompressionMethod::Stored`, sinon `Deflated` ; date `DateTime::default()`)
  - `pub fn save_parts(doc: &Document, meta: &SaveMeta) -> Result<Parts, FormatError>`
  - `pub fn write_parts(parts: &Parts) -> Result<ZipWriter<Cursor<Vec<u8>>>, FormatError>` (écrit `manifest.json` puis `document.ybin`, rend l'écrivain ouvert)
  - `pub fn check_manifest(raw: &[u8]) -> Result<Manifest, FormatError>`
  - `pub struct Opened<'a> { pub archive: ZipArchive<Cursor<&'a [u8]>>, pub manifest: Manifest, pub parts: Parts }`
  - `pub fn open(bytes: &[u8]) -> Result<Opened<'_>, FormatError>`
  - `pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>`
  - `save`, `load`, `load_with_manifest`, `migrate` : signatures et sorties inchangées.
- Réutilise : `crates/roomboard-core/src/format/mod.rs:63` (`options`) — étendu en `pub fn entry_options(stored: bool) -> SimpleFileOptions` ; `save` l'appelle avec `false`.
- Réutilise : `format/mod.rs:78` (`save`), `:113` (`load_with_manifest`) — étendus en `Parts`, `save_parts(doc: &Document, meta: &SaveMeta) -> Result<Parts, FormatError>`, `load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>`.
- Réutilise : `format/mod.rs:92-97` (corps de `save`) — étendu en `write_parts(parts: &Parts) -> Result<ZipWriter<Cursor<Vec<u8>>>, FormatError>` ; `save = write_parts(&save_parts(doc, meta)?)?.finish()` ; `pub use zip;`.
- Réutilise : `format/mod.rs:113-134` (début de `load_with_manifest`) — étendu en `check_manifest(raw: &[u8]) -> Result<Manifest, FormatError>`, `Opened<'a>`, `open(bytes: &[u8]) -> Result<Opened<'_>, FormatError>` ; appelée par `load_with_manifest`.

**Test et commande bornée.**
`cargo test -p roomboard-core format:: 2>&1 | tail -20` → ≥ 22 tests, 0 échec, `newer_format_version_without_document_is_newer`
présent ; les 16 tests existants du format (dont `save_is_deterministic`, `reload_with_strokes_keeps_bytes`,
`zip_entries_have_fixed_date`, `newer_format_version_is_refused`) restent verts.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : `crates/roomboard-core` (ici `src/format/mod.rs` seulement).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-core 2>&1 | tail -20`, `cargo clippy -p roomboard-core --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `schema` 1, `formatVersion` 1 ; `format::save` et `format::load` gardent signature et octets.
- G11 Rapport : une ligne `Réutilisation : appelé …` ou `Réutilisation : écart — …` par ligne `Réutilise :`.

**Interdits.** Dupliquer l'écriture ou la lecture des deux entrées (une seule implémentation : `write_parts`, `open`).
Lire `document.ybin` avant `check_manifest`. Ajouter une dépendance au cœur.

**Terminé quand.** Tests du format verts (anciens et neufs), `cargo test -p roomboard-core` vert, clippy et fmt verts.

**Étapes.**

- [ ] **Étape 1 : écrire les tests neufs (rouges : fonctions absentes).** Dans `mod tests` de `format/mod.rs`, remplacer
  l'appel `options()` de `zip_of` par `entry_options(false)` et ajouter à la fin du module :

```rust
    #[test]
    fn save_is_write_parts_of_save_parts() {
        let d = with_strokes();
        let parts = save_parts(&d, &meta()).expect("parts");
        let via = write_parts(&parts)
            .expect("écrivain")
            .finish()
            .expect("fin")
            .into_inner();
        assert!(via == save(&d, &meta()).expect("save"));
    }

    #[test]
    fn load_parts_reads_save_parts() {
        let d = with_strokes();
        let parts = save_parts(&d, &meta()).expect("parts");
        let (e, m) = load_parts(&parts.manifest, &parts.ybin).expect("load_parts");
        assert_eq!(e.page_ids(), d.page_ids());
        assert!(e.encode_v1() == d.encode_v1());
        assert_eq!((m.format_version, m.schema), (1, 1));
    }

    #[test]
    fn open_gives_checked_manifest_and_both_parts() {
        let d = with_strokes();
        let file = save(&d, &meta()).expect("save");
        let o = open(&file).expect("open");
        assert_eq!(o.parts, save_parts(&d, &meta()).expect("parts"));
        assert_eq!(o.manifest.format, FORMAT);
        assert_eq!(o.archive.len(), 2);
    }

    /// Arbitrage I1 : le manifeste est contrôlé avant de chercher `document.ybin` ; jamais `Corrupt` ici.
    #[test]
    fn newer_format_version_without_document_is_newer() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 2, 1))]);
        let newer = Some(FormatError::NewerVersion {
            found: 2,
            supported: 1,
        });
        assert_eq!(load(&z).err(), newer);
        assert_eq!(open(&z).err(), newer);
    }

    #[test]
    fn load_parts_checks_manifest_first() {
        assert_eq!(
            load_parts(&manifest_json("roomboard", 2, 1), b"").err(),
            Some(FormatError::NewerVersion {
                found: 2,
                supported: 1
            })
        );
        assert_eq!(
            load_parts(&manifest_json("flipx", 1, 1), b"").err(),
            Some(FormatError::NotRoomboard)
        );
        assert!(matches!(
            load_parts(b"{", b"").err(),
            Some(FormatError::Corrupt(_))
        ));
        assert!(matches!(
            load_parts(&manifest_json("roomboard", 1, 1), &[0xff, 0x01]).err(),
            Some(FormatError::Corrupt(_))
        ));
    }

    #[test]
    fn entry_options_sets_method_and_fixed_date() {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        w.start_file("a.png", entry_options(true)).expect("a");
        w.write_all(&[7u8; 300]).expect("écriture a");
        w.start_file("b.svg", entry_options(false)).expect("b");
        w.write_all(&[7u8; 300]).expect("écriture b");
        let bytes = w.finish().expect("fin").into_inner();
        let mut a = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("zip");
        for (name, method) in [
            ("a.png", CompressionMethod::Stored),
            ("b.svg", CompressionMethod::Deflated),
        ] {
            let f = a.by_name(name).expect("entrée");
            assert_eq!(f.compression(), method, "{name}");
            assert!(f.last_modified() == Some(DateTime::default()), "{name}");
        }
    }
```

- [ ] **Étape 2 : vérifier le rouge.** `cargo test -p roomboard-core format:: 2>&1 | tail -20` → erreurs de compilation
  `cannot find function \`save_parts\`` (et `write_parts`, `open`, `load_parts`, `entry_options`).

- [ ] **Étape 3 : implémenter.** Dans `format/mod.rs` : ajouter `pub use zip;` sous les `use`, puis remplacer `options()`,
  `save` et `load_with_manifest` par :

```rust
pub use zip;

/// Les deux entrées du `.roomboard` que seul le cœur écrit et lit (K2) : manifeste JSON et état Yrs v1.
#[derive(Debug, Clone, PartialEq)]
pub struct Parts {
    pub manifest: Vec<u8>,
    pub ybin: Vec<u8>,
}

/// Archive ouverte, manifeste déjà contrôlé, deux entrées lues (K2, arbitrage I1).
pub struct Opened<'a> {
    pub archive: ZipArchive<Cursor<&'a [u8]>>,
    pub manifest: Manifest,
    pub parts: Parts,
}

/// Options de toute entrée écrite : date DOS fixe (1980-01-01 00:00), jamais l'heure courante (D25) ; `stored` pour
/// un contenu déjà compressé (K12), deflate sinon.
pub fn entry_options(stored: bool) -> SimpleFileOptions {
    let method = if stored {
        CompressionMethod::Stored
    } else {
        CompressionMethod::Deflated
    };
    SimpleFileOptions::default()
        .compression_method(method)
        .last_modified_time(DateTime::default())
}

/// Manifeste et `document.ybin` de `doc` : `schema` recopié de `meta.schema`, heure venue de `meta` (D24).
pub fn save_parts(doc: &Document, meta: &SaveMeta) -> Result<Parts, FormatError> {
    let schema = doc
        .schema()
        .ok_or_else(|| FormatError::Corrupt("meta.schema absent".into()))? as u32;
    let manifest = Manifest {
        format: FORMAT.into(),
        format_version: FORMAT_VERSION,
        schema,
        app_version: meta.app_version.clone(),
        created: meta.created.clone().unwrap_or_else(|| meta.now.clone()),
        modified: meta.now.clone(),
    };
    let json =
        serde_json::to_vec_pretty(&manifest).map_err(|e| FormatError::Corrupt(e.to_string()))?;
    Ok(Parts {
        manifest: json,
        ybin: doc.encode_v1(),
    })
}

/// Ouvre une archive neuve et y écrit `manifest.json` puis `document.ybin` ; l'écrivain est rendu ouvert pour que le
/// conteneur ajoute ses entrées `assets/` (arbitrage B1).
pub fn write_parts(parts: &Parts) -> Result<ZipWriter<Cursor<Vec<u8>>>, FormatError> {
    let mut w = ZipWriter::new(Cursor::new(Vec::new()));
    w.start_file(MANIFEST, entry_options(false))
        .map_err(zip_err)?;
    w.write_all(&parts.manifest).map_err(io_err)?;
    w.start_file(DOCUMENT, entry_options(false))
        .map_err(zip_err)?;
    w.write_all(&parts.ybin).map_err(io_err)?;
    Ok(w)
}

/// Enregistre `doc` (sortie inchangée depuis le socle).
pub fn save(doc: &Document, meta: &SaveMeta) -> Result<Vec<u8>, FormatError> {
    let w = write_parts(&save_parts(doc, meta)?)?;
    Ok(w.finish().map_err(zip_err)?.into_inner())
}

/// `format`, puis `formatVersion`, puis `schema` (D24).
pub fn check_manifest(raw: &[u8]) -> Result<Manifest, FormatError> {
    let manifest: Manifest = serde_json::from_slice(raw)
        .map_err(|e| FormatError::Corrupt(format!("manifeste illisible : {e}")))?;
    if manifest.format != FORMAT {
        return Err(FormatError::NotRoomboard);
    }
    if manifest.format_version > FORMAT_VERSION {
        return Err(FormatError::NewerVersion {
            found: manifest.format_version,
            supported: FORMAT_VERSION,
        });
    }
    if manifest.schema > SCHEMA {
        return Err(FormatError::NewerVersion {
            found: manifest.schema,
            supported: SCHEMA,
        });
    }
    Ok(manifest)
}

/// Ouvre l'archive, contrôle le manifeste **avant** de chercher `document.ybin`, puis lit `document.ybin`.
pub fn open(bytes: &[u8]) -> Result<Opened<'_>, FormatError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|_| FormatError::NotRoomboard)?;
    let raw = read_entry(&mut archive, MANIFEST).ok_or(FormatError::NotRoomboard)?;
    let manifest = check_manifest(&raw)?;
    let ybin = read_entry(&mut archive, DOCUMENT)
        .ok_or_else(|| FormatError::Corrupt(format!("{DOCUMENT} absent")))?;
    Ok(Opened {
        archive,
        manifest,
        parts: Parts {
            manifest: raw,
            ybin,
        },
    })
}

/// Décode les deux moitiés : manifeste contrôlé, migration, décodage, accord du schéma (D24 : désaccord = `Corrupt`).
pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let manifest = check_manifest(manifest)?;
    let (manifest, ybin) = migrate(manifest, ybin.to_vec())?;
    let doc = Document::from_update_v1(&ybin).map_err(|e| match e {
        DecodeError::Update(m) => FormatError::Corrupt(format!("état illisible : {m}")),
        DecodeError::Schema { found } => FormatError::Corrupt(format!(
            "schéma du document {found:?} différent du manifeste ({})",
            manifest.schema
        )),
    })?;
    if doc.schema() != Some(f64::from(manifest.schema)) {
        return Err(FormatError::Corrupt(
            "schéma du document différent du manifeste".into(),
        ));
    }
    Ok((doc, manifest))
}

/// Lit un `.roomboard` : `open`, puis `load_parts`.
pub fn load_with_manifest(bytes: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let opened = open(bytes)?;
    load_parts(&opened.parts.manifest, &opened.parts.ybin)
}
```

  `read_entry`, `zip_err`, `io_err`, `load`, `migrate` restent tels quels. Mettre à jour le commentaire de tête du
  module : « dossier `assets/` écrit par `roomboard-formats` (K1) ».

- [ ] **Étape 4 : vérifier le vert.** `cargo test -p roomboard-core format:: 2>&1 | tail -20` → ≥ 22 passed, 0 failed ;
  `cargo test -p roomboard-core 2>&1 | tail -20` ; `cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -5` ; `cargo fmt --all --check`.

- [ ] **Étape 5 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/format/mod.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "refactor(core): split .roomboard into reusable parts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : nombre de tests du format avant et après, quatre lignes `Réutilisation :`.

---

### Tâche T3 — Vues image et `kind` inconnu, module `asset`

**Objectif.** Le cœur lit un élément `image` et garde tout élément d'un `kind` inconnu : vue `unknown`, boîte `w`, `h` ou
100 × 100, identité sans `transform`, sélectionnable, déplaçable, supprimable, jamais gommé (U3, K5 lecture, K8) ;
`ElementView.style` devient facultatif ; module `asset` (`is_asset_id`, `AssetInfo`, `AssetRef`) ; fixture
`element-inconnu.roomboard` (K15, S4).

**Fichiers.**
- Create : `crates/roomboard-core/src/asset.rs`
- Modify : `crates/roomboard-core/src/lib.rs:2-10` (`pub mod asset;`)
- Modify : `crates/roomboard-core/src/element.rs:21-47` (vues), fin du fichier (lecteurs)
- Modify : `crates/roomboard-core/src/document.rs:150-159` (`page` : `backdrop: None`), `:180-221` (`element`), tests
- Modify : `crates/roomboard-core/src/query.rs:110-133` (`element_geom`)
- Modify : `crates/roomboard-core/src/commands.rs` tests `:869`, `:1385`, `:1587` (`style` en `Option`)
- Create : `crates/roomboard-core/tests/element_inconnu.rs`, `crates/roomboard-core/tests/fixtures/element-inconnu.roomboard`

**Interfaces.**
- Produit (exact) :
  - `roomboard_core::asset` : `pub const DEFAULT_ASSET_MIME: &str = "application/octet-stream"` ; `pub fn is_asset_id(s: &str) -> bool` ;
    `#[derive(Debug, Clone, PartialEq, serde::Serialize)] #[serde(rename_all = "camelCase")] pub struct AssetInfo { pub id: String, pub name: String, pub mime: String, pub size: f64 }` ;
    `impl AssetInfo { pub fn fallback(id: &str) -> AssetInfo }` ; `pub type AssetRef = AssetInfo;`
  - `roomboard_core::element` : `pub const KNOWN_KINDS: [&str; 4] = ["stroke", "shape", "text", "image"]` ; `pub const UNKNOWN_BOX: f64 = 100.0` ;
    `pub const FIT_WIDTH: &str = "width"` ; `pub struct ImageView { pub asset: String, pub w: f64, pub h: f64 }` ;
    `pub struct UnknownView { pub source_kind: String, pub w: f64, pub h: f64 }` (serde `camelCase` → `sourceKind`) ;
    `pub struct BackdropView { pub asset: String, pub kind: String, pub w: Option<f64>, pub h: Option<f64>, pub fit: String, pub rect: Option<Bounds> }` ;
    `PageView.backdrop: Option<BackdropView>` ; `ElementView { id, kind, transform, style: Option<StrokeStyle>, shape, text, image: Option<ImageView>, unknown: Option<UnknownView> }`
    (`style`, `shape`, `text`, `image`, `unknown` : `skip_serializing_if = "Option::is_none"`) ;
    `pub(crate) fn read_image<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<ImageFields>` ; `pub(crate) fn read_unknown<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<UnknownFields>`.
  - Fixture `crates/roomboard-core/tests/fixtures/element-inconnu.roomboard` : page `p1` (1920 × 1080, `#ffffff`), éléments
    `h1` (`kind: "hologram"`, `transform [1,0,0,1,100,50]`, `w 300`, `h 200`, `layers: Y.Map{ a: Y.Array[1, 2] }`, `refs: Any::Array[ABC]`)
    et `h2` (`kind: "hologram"`, sans `transform` ni `w`, `h`) ; `SaveMeta` : `"0.1.0"`, `"2026-11-20T00:00:00Z"`, `None`.
    Lue par T6 (assets cités), T7/T9 (fixture avec asset) et T8 (contrat du vrai module).
- Réutilise : (nouveau module) `crates/roomboard-core/src/asset.rs` — `pub fn is_asset_id(s: &str) -> bool`, `DEFAULT_ASSET_MIME`, `AssetInfo`, `AssetInfo::fallback(id: &str) -> AssetInfo` ; réutilisé par T6 et `container` (T7).
- Réutilise : `crates/roomboard-core/src/element.rs:21` (`PageView`), `:37` (`ElementView`) — étendus : `style: Option<StrokeStyle>`, `image: Option<ImageView>`, `unknown: Option<UnknownView>`, `PageView.backdrop: Option<BackdropView>`.
- Réutilise : `crates/roomboard-core/src/element.rs:87-133` (`out_f64`, `out_string`, `out_transform`) — appelés tels quels par `read_image`, `read_unknown`.
- Réutilise : `crates/roomboard-core/src/shape.rs:146` (`box_polygon`) — `box_polygon(w, h)` pour `image` et `unknown` dans `element_geom`.
- Réutilise : `crates/roomboard-core/src/query.rs:110` (`element_geom`) — deux branches ajoutées ; `hit_test`, `ids_in_rect`, `bounds` inchangés.

**Test et commande bornée.**
`cargo test -p roomboard-core --test element_inconnu 2>&1 | tail -20` → ≥ 4 passed, `unknown_kind_is_kept_moved_and_resaved` et
`unknown_without_transform_is_identity_selectable_deletable` présents ; `cargo test -p roomboard-core 2>&1 | tail -20` → 0 échec
(tests de `document.rs:413-675`, de `commands.rs`, `tests/scenarios.rs`, `tests/compat_socle.rs` s'il est fusionné) ;
`cargo test -p roomboard-wasm 2>&1 | tail -20` → 0 échec (`add_shape_inner_unknown_kind_is_bad_shape` gardé).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : `crates/roomboard-core`.
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G4 Jamais `Any::Map` pour une valeur composée écrite ; test « recharger garde les octets » pour chaque valeur composée neuve (ici : `unknown_fixture_resaves_identically`).
- G6 Fixtures synthétiques seulement ; régénération derrière `ROOMBOARD_REGENERER_FIXTURES=1`, jamais par `#[ignore]`.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-core 2>&1 | tail -20`, `cargo clippy -p roomboard-core --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `schema` 1, `formatVersion` 1 ; `save` et `load` inchangés.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Écrire quoi que ce soit dans le document pendant une lecture (vue ou géométrie d'un élément inconnu).
Toucher à `format/mod.rs` (T2), à `history.rs` (T6), aux commandes (T6 ajoute `AddImage`, `SetBackdrop`). Rendre une vue
ou une géométrie pour un élément sans `id` lisible.

**Terminé quand.** Tests cités verts, fixture commitée, clippy et fmt verts.

**Étapes.**

- [ ] **Étape 1 : test du module `asset` (rouge).** Créer `crates/roomboard-core/src/asset.rs` avec seulement les tests
  et ajouter `pub mod asset;` en tête de la liste de `lib.rs` :

```rust
//! Assets du document (U4, K3, K4) : empreinte SHA-256 en hexadécimal minuscule ; métadonnée par défaut d'un asset
//! cité sans entrée lisible dans la racine `assets`.

#[cfg(test)]
mod tests {
    use super::*;

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    #[test]
    fn is_asset_id_accepts_only_lowercase_hex_64() {
        assert!(is_asset_id(ABC));
        assert!(!is_asset_id(&ABC.to_uppercase()));
        assert!(!is_asset_id(&ABC[..63]));
        assert!(!is_asset_id(&format!("{ABC}0")));
        assert!(!is_asset_id(&ABC.replace('b', "g")));
        assert!(!is_asset_id(""));
        assert!(!is_asset_id("2b6f0cc9-6d5c-4c1a-9a8e-2f6c1d1e9f00"));
    }

    #[test]
    fn fallback_uses_id_octet_stream_and_zero() {
        assert_eq!(
            AssetInfo::fallback(ABC),
            AssetInfo {
                id: ABC.into(),
                name: ABC.into(),
                mime: "application/octet-stream".into(),
                size: 0.0,
            }
        );
    }
}
```

  `cargo test -p roomboard-core asset:: 2>&1 | tail -20` → erreurs `cannot find function \`is_asset_id\``.

- [ ] **Étape 2 : implémenter `asset`.** Au-dessus des tests :

```rust
pub const DEFAULT_ASSET_MIME: &str = "application/octet-stream";

/// 64 caractères hexadécimaux minuscules : seule forme d'empreinte citée, écrite ou lue (K4).
pub fn is_asset_id(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// Métadonnée d'un asset (K3) : rangée en champs scalaires d'un `Y.Map` de la racine `assets`, jamais en `Any::Map`.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfo {
    pub id: String,
    pub name: String,
    pub mime: String,
    pub size: f64,
}

/// Référence reçue par `AddImage` et `SetBackdrop` : même forme que la métadonnée.
pub type AssetRef = AssetInfo;

impl AssetInfo {
    /// Défauts d'un asset cité sans métadonnée lisible : `name` = l'id, type inconnu, taille 0 (K4).
    pub fn fallback(id: &str) -> AssetInfo {
        AssetInfo {
            id: id.to_string(),
            name: id.to_string(),
            mime: DEFAULT_ASSET_MIME.to_string(),
            size: 0.0,
        }
    }
}
```

  `cargo test -p roomboard-core asset:: 2>&1 | tail -20` → 2 passed.

- [ ] **Étape 3 : test d'intégration de l'élément inconnu (rouge).** Créer `crates/roomboard-core/tests/element_inconnu.rs` :

```rust
//! S4 au niveau du cœur (U3, K8, K15) : un élément d'un `kind` inconnu est lu sans erreur, gardé, déplaçable,
//! supprimable, jamais gommé ; la fixture est écrite par `format::save` (sans entrée `assets/`).
use std::path::PathBuf;

use roomboard_core::commands::{Command, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::IDENTITY;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::query::Bounds;
use yrs::updates::decoder::Decode;
use yrs::{Any, Array, ArrayPrelim, Doc, In, Map, MapPrelim, Out, ReadTxn, StateVector, Transact, Update};

pub const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name)
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

/// État Yrs d'un fichier « d'une version plus récente » : `h1` porte des `Y.Map`, `Y.Array` imbriqués et un id d'asset
/// rangé dans un `Any::Array` ; `h2` n'a ni `transform` ni boîte.
fn hologram_ybin() -> Vec<u8> {
    let doc = Doc::with_client_id(7);
    let meta = doc.get_or_insert_map("meta");
    let pages = doc.get_or_insert_array("pages");
    {
        let mut txn = doc.transact_mut();
        meta.insert(&mut txn, "schema", 1.0);
        let layers = MapPrelim::from([(
            "a",
            In::Array(ArrayPrelim::from(vec![In::from(1.0), In::from(2.0)])),
        )]);
        let transform: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]
            .into_iter()
            .map(Any::from)
            .collect();
        let h1 = MapPrelim::from([
            ("id", In::from("h1")),
            ("kind", In::from("hologram")),
            ("transform", In::Any(Any::Array(transform.into()))),
            ("w", In::from(300.0)),
            ("h", In::from(200.0)),
            ("layers", In::Map(layers)),
            ("refs", In::Any(Any::Array(vec![Any::from(ABC)].into()))),
        ]);
        let h2 = MapPrelim::from([("id", In::from("h2")), ("kind", In::from("hologram"))]);
        let page = MapPrelim::from([
            ("id", In::from("p1")),
            ("width", In::from(1920.0)),
            ("height", In::from(1080.0)),
            ("background", In::from("#ffffff")),
            (
                "elements",
                In::Array(ArrayPrelim::from(vec![In::Map(h1), In::Map(h2)])),
            ),
        ]);
        pages.push_back(&mut txn, page);
    }
    let txn = doc.transact();
    txn.encode_state_as_update_v1(&StateVector::default())
}

pub fn unknown_bytes() -> Vec<u8> {
    let path = fixture("element-inconnu.roomboard");
    if regenerate() {
        let doc = Document::from_update_v1(&hologram_ybin()).expect("état");
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("dossier");
        std::fs::write(&path, save(&doc, &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture element-inconnu.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test element_inconnu",
    )
}

/// Champs bruts de `h1` relus dans un `Doc` yrs neuf : `w`, longueur de `layers.a`, contenu de `refs`.
fn raw_h1(d: &Document) -> (Option<f64>, Option<u32>, Option<Vec<String>>) {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    let txn = raw.transact();
    let Some(Out::YMap(page)) = pages.get(&txn, 0) else { panic!("page") };
    let Some(Out::YArray(els)) = page.get(&txn, "elements") else { panic!("éléments") };
    let Some(Out::YMap(h1)) = els.get(&txn, 0) else { panic!("h1") };
    let w = match h1.get(&txn, "w") {
        Some(Out::Any(Any::Number(n))) => Some(n.as_f64()),
        _ => None,
    };
    let a = match h1.get(&txn, "layers") {
        Some(Out::YMap(l)) => match l.get(&txn, "a") {
            Some(Out::YArray(a)) => Some(a.len(&txn)),
            _ => None,
        },
        _ => None,
    };
    let refs = match h1.get(&txn, "refs") {
        Some(Out::Any(Any::Array(items))) => Some(
            items
                .iter()
                .map(|i| match i {
                    Any::String(s) => s.to_string(),
                    other => format!("{other:?}"),
                })
                .collect(),
        ),
        _ => None,
    };
    (w, a, refs)
}

#[test]
fn unknown_fixture_resaves_identically() {
    let bytes = unknown_bytes();
    let d = load(&bytes).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == bytes);
}

#[test]
fn unknown_kind_view_has_box_and_no_style() {
    let d = load(&unknown_bytes()).expect("load");
    let before = d.encode_v1();
    let v = d.element("h1").expect("vue de h1");
    assert_eq!(v.kind, "unknown");
    assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
    assert_eq!(v.style, None);
    let u = v.unknown.expect("unknown");
    assert_eq!((u.source_kind.as_str(), u.w, u.h), ("hologram", 300.0, 200.0));
    assert!(d.encode_v1() == before, "la lecture a écrit dans le document");
    assert!(!d.can_undo());
}

#[test]
fn unknown_without_transform_is_identity_selectable_deletable() {
    let mut d = load(&unknown_bytes()).expect("load");
    let before = d.encode_v1();
    let v = d.element("h2").expect("vue de h2");
    assert_eq!(v.transform, IDENTITY);
    let u = v.unknown.expect("unknown");
    assert_eq!((u.w, u.h), (100.0, 100.0));
    assert_eq!(d.hit_test("p1", 50.0, 50.0, 0.0), Some("h2".to_string()));
    assert_eq!(
        d.bounds(&["h2".to_string()]),
        Some(Bounds { x0: 0.0, y0: 0.0, x1: 100.0, y1: 100.0 })
    );
    assert!(d.encode_v1() == before, "la lecture a écrit dans le document");
    let v0 = d.version();
    let c = d
        .apply(Command::Transform {
            ids: vec!["h2".into()],
            matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
        })
        .expect("transform");
    assert_eq!(c.version, v0, "Transform doit ignorer un élément sans transform lisible");
    let e = d
        .apply(Command::Erase {
            page: "p1".into(),
            path: vec![0.0, 50.0, 100.0, 50.0],
            radius: 10.0,
            mode: EraseMode::Object,
        })
        .expect("gomme");
    assert!(e.removed.is_empty(), "la gomme ne touche que les traits");
    let del = d
        .apply(Command::Delete {
            ids: vec!["h2".into()],
        })
        .expect("delete");
    assert_eq!(del.removed, vec!["h2".to_string()]);
    assert_eq!(d.element_ids("p1"), vec!["h1".to_string()]);
}

#[test]
fn unknown_kind_is_kept_moved_and_resaved() {
    let mut d = load(&unknown_bytes()).expect("load");
    assert_eq!(d.hit_test("p1", 150.0, 100.0, 0.0), Some("h1".to_string()));
    d.apply(Command::Transform {
        ids: vec!["h1".into()],
        matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
    })
    .expect("transform");
    assert_eq!(
        d.element("h1").expect("vue").transform,
        [1.0, 0.0, 0.0, 1.0, 110.0, 50.0]
    );
    let reloaded = load(&save(&d, &meta()).expect("save")).expect("reload");
    assert_eq!(
        reloaded.element("h1").expect("vue").transform,
        [1.0, 0.0, 0.0, 1.0, 110.0, 50.0]
    );
    assert_eq!(
        raw_h1(&reloaded),
        (Some(300.0), Some(2), Some(vec![ABC.to_string()]))
    );
}
```

  Si `n.as_f64()` n'existe pas sur `yrs::Number`, faire un `match` sur `Number::Float(f) => *f`, `Number::Int(i) => *i as f64`.
  `cargo test -p roomboard-core --test element_inconnu 2>&1 | tail -20` → erreurs de compilation (`unknown`, `style` n'est pas un `Option`).

- [ ] **Étape 4 : vues et lecteurs dans `element.rs`.** Ajouter `use crate::asset::is_asset_id;` et
  `use crate::query::Bounds;`, puis remplacer `PageView` et `ElementView` et ajouter les types neufs :

```rust
/// Types d'élément que ce cœur sait lire ; tout autre `kind` est gardé et rendu comme élément inconnu (U3, K8).
pub const KNOWN_KINDS: [&str; 4] = ["stroke", "shape", "text", "image"];
/// Boîte d'un élément inconnu sans `w`, `h` lisibles (K8, HK7).
pub const UNKNOWN_BOX: f64 = 100.0;
/// Seul ajustement de fond écrit par cette version : largeur de la page (K6, HK1).
pub const FIT_WIDTH: &str = "width";

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct PageView {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub background: String,
    pub backdrop: Option<BackdropView>,
}

/// Fond de page (U6, K6, K9) : valeurs brutes, `rect` calculé par le cœur (DAK4).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct BackdropView {
    pub asset: String,
    pub kind: String,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub fit: String,
    pub rect: Option<Bounds>,
}

/// Image (U5, K5) : boîte locale (0, 0)-(w, h), taille source en pixels.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ImageView {
    pub asset: String,
    pub w: f64,
    pub h: f64,
}

/// Élément d'un `kind` inconnu (U3, K8) : dessiné comme un cadre ; `source_kind` = le `kind` lu.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnknownView {
    pub source_kind: String,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ElementView {
    pub id: String,
    pub kind: String,
    pub transform: Transform,
    /// Présent pour `stroke`, `shape`, `text` ; absent pour `image` et `unknown` (K8).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub style: Option<StrokeStyle>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shape: Option<ShapeView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<TextView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<ImageView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unknown: Option<UnknownView>,
}

impl ElementView {
    /// Vue sans champ propre ; chaque branche de `Document::element` complète le sien.
    pub(crate) fn bare(id: &str, kind: &str, transform: Transform) -> ElementView {
        ElementView {
            id: id.to_string(),
            kind: kind.to_string(),
            transform,
            style: None,
            shape: None,
            text: None,
            image: None,
            unknown: None,
        }
    }
}
```

  Et à la fin du fichier :

```rust
pub(crate) fn finite_positive(v: f64) -> bool {
    v.is_finite() && v > 0.0
}

/// Champs d'une image (K5) ; `None` si l'élément n'en est pas une ou est mal formé (asset non conforme, boîte ≤ 0).
pub(crate) struct ImageFields {
    pub transform: Transform,
    pub asset: String,
    pub w: f64,
    pub h: f64,
}

pub(crate) fn read_image<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<ImageFields> {
    if out_string(e.get(txn, "kind"))? != "image" {
        return None;
    }
    Some(ImageFields {
        transform: out_transform(e.get(txn, "transform"))?,
        asset: out_string(e.get(txn, "asset")).filter(|a| is_asset_id(a))?,
        w: out_f64(e.get(txn, "w")).filter(|v| finite_positive(*v))?,
        h: out_f64(e.get(txn, "h")).filter(|v| finite_positive(*v))?,
    })
}

/// Champs lus d'un élément inconnu (K8) ; `None` pour un `kind` connu. `kind` absent ou non textuel : `""`.
pub(crate) struct UnknownFields {
    pub source_kind: String,
    pub transform: Transform,
    pub w: f64,
    pub h: f64,
}

/// Sans `transform` lisible : identité, rien n'est écrit ; boîte `w`, `h` s'ils sont tous deux finis > 0, sinon
/// 100 × 100.
pub(crate) fn read_unknown<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<UnknownFields> {
    let source_kind = out_string(e.get(txn, "kind")).unwrap_or_default();
    if KNOWN_KINDS.contains(&source_kind.as_str()) {
        return None;
    }
    let (w, h) = match (out_f64(e.get(txn, "w")), out_f64(e.get(txn, "h"))) {
        (Some(w), Some(h)) if finite_positive(w) && finite_positive(h) => (w, h),
        _ => (UNKNOWN_BOX, UNKNOWN_BOX),
    };
    Some(UnknownFields {
        source_kind,
        transform: out_transform(e.get(txn, "transform")).unwrap_or(IDENTITY),
        w,
        h,
    })
}
```

- [ ] **Étape 5 : `Document::element` et `Document::page`.** Dans `document.rs`, importer `read_image`, `read_unknown`,
  `ImageView`, `UnknownView` depuis `crate::element`, ajouter `backdrop: None` au `PageView` de `page()` (T6 le
  remplit), et remplacer le corps de `element` :

```rust
    pub fn element(&self, id: &str) -> Option<ElementView> {
        let txn = self.doc.transact();
        let found = self.find_element(&txn, id)?;
        let e = &found.element;
        match out_string(e.get(&txn, "kind")).as_deref() {
            Some("stroke") => Some(ElementView {
                style: Some(read_style(&txn, e)?),
                ..ElementView::bare(id, "stroke", out_transform(e.get(&txn, "transform"))?)
            }),
            Some("shape") => {
                let transform = out_transform(e.get(&txn, "transform"))?;
                let s = read_shape(&txn, e)?;
                Some(ElementView {
                    style: Some(s.style),
                    shape: Some(ShapeView {
                        shape: s.kind.as_str().to_string(),
                        w: s.w,
                        h: s.h,
                        fill: s.fill,
                    }),
                    ..ElementView::bare(id, "shape", transform)
                })
            }
            Some("text") => {
                let transform = out_transform(e.get(&txn, "transform"))?;
                let t = read_text(&txn, e)?;
                Some(ElementView {
                    style: Some(StrokeStyle {
                        color: t.color,
                        width: 0.0,
                    }),
                    text: Some(TextView {
                        content: t.content,
                        size: t.size,
                        box_width: t.box_width,
                        box_height: t.box_height,
                    }),
                    ..ElementView::bare(id, "text", transform)
                })
            }
            Some("image") => {
                let i = read_image(&txn, e)?;
                Some(ElementView {
                    image: Some(ImageView {
                        asset: i.asset,
                        w: i.w,
                        h: i.h,
                    }),
                    ..ElementView::bare(id, "image", i.transform)
                })
            }
            _ => {
                let u = read_unknown(&txn, e)?;
                Some(ElementView {
                    unknown: Some(UnknownView {
                        source_kind: u.source_kind,
                        w: u.w,
                        h: u.h,
                    }),
                    ..ElementView::bare(id, "unknown", u.transform)
                })
            }
        }
    }
```

- [ ] **Étape 6 : géométrie dans `query.rs`.** Importer `read_image`, `read_unknown` depuis `crate::element` et remplacer
  `element_geom` :

```rust
    /// Géométrie locale pour la collision et les bornes : contour en cache (trait), polygone (forme), boîte (texte,
    /// image, élément inconnu). Un élément inconnu sans `id` lisible n'a pas de géométrie (K8).
    fn element_geom<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Geom> {
        let raw_id = out_string(e.get(txn, "id"));
        let id = raw_id.clone().unwrap_or_default();
        if let Some((transform, style, pts)) = read_stroke(txn, e) {
            let outline = self.cached_outline(&id, &style, &pts);
            return Some(Geom {
                id,
                transform,
                outline,
            });
        }
        if let Some(u) = read_unknown(txn, e) {
            return Some(Geom {
                id: raw_id?,
                transform: u.transform,
                outline: box_polygon(u.w, u.h).into(),
            });
        }
        if let Some(i) = read_image(txn, e) {
            return Some(Geom {
                id,
                transform: i.transform,
                outline: box_polygon(i.w, i.h).into(),
            });
        }
        let transform = out_transform(e.get(txn, "transform"))?;
        if let Some(t) = read_text(txn, e) {
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(t.box_width, t.box_height).into(),
            });
        }
        let s = read_shape(txn, e)?;
        Some(Geom {
            id,
            transform,
            outline: shape_polygon(s.kind, s.w, s.h, s.style.width).into(),
        })
    }
```

- [ ] **Étape 7 : adapter les tests existants à `style: Option`.** `commands.rs` : `:869` et `:1385`
  `assert_eq!(e.style, pen());` → `assert_eq!(e.style, Some(pen()));` ; `:1587` envelopper le `StrokeStyle { … }` attendu
  dans `Some(…)`. Lancer `grep -rn "\.style" crates/roomboard-core crates/roomboard-wasm` et adapter toute autre lecture.

- [ ] **Étape 8 : tests unitaires de l'image et de l'élément sans id (rouges puis verts).** Dans `mod tests` de
  `document.rs` (accès aux champs privés), ajouter :

```rust
    use yrs::{Any, In, MapPrelim};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    /// Pousse un élément brut sur la première page, hors historique (fichier lu, pas un geste).
    fn push_raw(d: &Document, fields: Vec<(&str, In)>) {
        let els = {
            let txn = d.read();
            d.page_elements(&txn, &d.page_ids()[0]).expect("éléments")
        };
        els.push_back(&mut d.doc.transact_mut(), fields.into_iter().collect::<MapPrelim>());
    }

    fn translate(x: f64, y: f64) -> In {
        In::Any(crate::element::transform_to_any(&[1.0, 0.0, 0.0, 1.0, x, y]))
    }

    #[test]
    fn image_view_reads_fields_without_style() {
        let d = Document::blank();
        push_raw(
            &d,
            vec![
                ("id", In::from("i1")),
                ("kind", In::from("image")),
                ("transform", translate(10.0, 20.0)),
                ("asset", In::from(ABC)),
                ("w", In::Any(Any::from(640.0))),
                ("h", In::Any(Any::from(480.0))),
            ],
        );
        let v = d.element("i1").expect("vue");
        assert_eq!(v.kind, "image");
        assert_eq!(v.style, None);
        assert_eq!(
            v.image,
            Some(ImageView {
                asset: ABC.into(),
                w: 640.0,
                h: 480.0
            })
        );
        assert_eq!(d.hit_test(&d.page_ids()[0], 20.0, 30.0, 0.0), Some("i1".into()));
    }

    #[test]
    fn malformed_image_has_no_view() {
        let d = Document::blank();
        push_raw(
            &d,
            vec![
                ("id", In::from("i2")),
                ("kind", In::from("image")),
                ("transform", translate(0.0, 0.0)),
                ("asset", In::from(ABC.to_uppercase().as_str())),
                ("w", In::Any(Any::from(10.0))),
                ("h", In::Any(Any::from(10.0))),
            ],
        );
        assert_eq!(d.element("i2"), None);
    }

    #[test]
    fn element_without_id_has_no_geometry() {
        let d = Document::blank();
        push_raw(&d, vec![("kind", In::from("hologram"))]);
        let p = d.page_ids()[0].clone();
        assert_eq!(d.hit_test(&p, 50.0, 50.0, 0.0), None);
        assert!(d.ids_in_rect(&p, crate::query::Bounds { x0: -1.0, y0: -1.0, x1: 500.0, y1: 500.0 }).is_empty());
    }
```

  Si `transform_to_any` n'est pas visible (`pub(crate)` dans `element.rs` : il l'est), garder l'appel tel quel ; retirer
  son `#[allow(dead_code)]` s'il devient inutile.

- [ ] **Étape 9 : écrire la fixture une fois, puis vérifier le vert.**
  `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test element_inconnu 2>&1 | tail -20` → 4 passed ; puis
  sans la variable : `cargo test -p roomboard-core 2>&1 | tail -20` → 0 échec ; `cargo test -p roomboard-wasm 2>&1 | tail -20`
  → 0 échec ; `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -5` ; `cargo fmt --all --check`.

- [ ] **Étape 10 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/asset.rs && git add crates/roomboard-core/src/lib.rs && \
git add crates/roomboard-core/src/element.rs && git add crates/roomboard-core/src/document.rs && \
git add crates/roomboard-core/src/query.rs && git add crates/roomboard-core/src/commands.rs && \
git add crates/roomboard-core/tests/element_inconnu.rs && \
git add crates/roomboard-core/tests/fixtures/element-inconnu.roomboard && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): read image elements and keep unknown kinds" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests ajoutés, cinq lignes `Réutilisation :`, tout autre lecteur de `.style` adapté (chemin:ligne).

---

### Tâche T4 — `AssetStore` de la page

**Objectif.** Module `apps/web/src/core/asset-store.ts` : octets seulement (`Blob`) par empreinte SHA-256, une instance
par document, empreinte injectée (Web Crypto par défaut), `pick` dans l'ordre reçu (K13, DAK3, S2).

**Fichiers.**
- Create : `apps/web/src/core/asset-store.ts`
- Create : `apps/web/src/core/asset-store.test.ts`

**Interfaces.**
- Produit (exact) : `export type AssetId = string` ; `export type AssetHasher = (blob: Blob) => Promise<AssetId>` ;
  `export const webCryptoHasher: AssetHasher` ; `export const isAssetId: (s: string) => boolean` ;
  `export interface AssetStore { put(blob: Blob): Promise<AssetId>; adopt(id: AssetId, blob: Blob): void; get(id: AssetId): Blob | undefined; has(id: AssetId): boolean; pick(ids: readonly AssetId[]): { present: Array<readonly [AssetId, Blob]>; missing: AssetId[] } }` ;
  `export function createAssetStore(hash?: AssetHasher): AssetStore`.
- Consomme : rien des autres tâches (vecteur commun `ABC`, aussi vérifié par `container::sha256_hex` en T7).
- Réutilise : (nouveau module) `apps/web/src/core/asset-store.ts` — l'interface ci-dessus ; aucun équivalent existant (termes `AssetStore`, `crypto.subtle`, `Blob` : rien).

**Test et commande bornée.**
`cd "$WT/apps/web" && pnpm exec vitest run src/core/asset-store.test.ts 2>&1 | tail -20` → ≥ 6 tests passés, « même Blob deux
fois » présent ; puis `pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : côté page `apps/web/src/core/` (ici `asset-store.ts` et son test).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G5 Aucune dépendance AGPL/GPL/LGPL (ici : aucun paquet npm ajouté).
- G6 Fixtures synthétiques seulement.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `pnpm --filter @roomboard/web test 2>&1 | tail -20`.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Stocker des métadonnées (nom, type) dans l'`AssetStore` (HK4). Trier dans `pick` (le conteneur trie).
Ajouter un paquet npm. Instance globale partagée entre documents.

**Terminé quand.** Tests verts, `pnpm --filter @roomboard/web test` vert, `pnpm --filter @roomboard/web exec tsc --noEmit -p .` sans erreur
dans `asset-store*.ts` (une erreur ailleurs due à un module Wasm absent du worktree est hors tâche ; la citer dans le rapport).

**Étapes.**

- [ ] **Étape 1 : test (rouge).** Créer `apps/web/src/core/asset-store.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { createAssetStore, isAssetId, webCryptoHasher, type AssetHasher } from "./asset-store";

const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("AssetStore (K13)", () => {
  it("webCryptoHasher : vecteurs communs avec container::sha256_hex", async () => {
    expect(await webCryptoHasher(new Blob(["abc"]))).toBe(ABC);
    expect(await webCryptoHasher(new Blob([]))).toBe(EMPTY_HASH);
  });

  it("même Blob deux fois : même empreinte, un seul Blob gardé (S2)", async () => {
    const store = createAssetStore();
    const first = new Blob(["abc"], { type: "image/png" });
    const second = new Blob(["abc"], { type: "image/png" });
    expect(await store.put(first)).toBe(ABC);
    expect(await store.put(second)).toBe(ABC);
    expect(store.get(ABC)).toBe(first);
    expect(store.has(ABC)).toBe(true);
  });

  it("pick rend les présents dans l'ordre reçu et les absents à part, sans trier", async () => {
    const store = createAssetStore();
    const empty = new Blob([]);
    await store.put(new Blob(["abc"]));
    await store.put(empty);
    const missing = "0".repeat(64);
    const r = store.pick([EMPTY_HASH, missing, ABC]);
    expect(r.present.map(([id]) => id)).toEqual([EMPTY_HASH, ABC]);
    expect(r.present[0]?.[1]).toBe(empty);
    expect(r.missing).toEqual([missing]);
  });

  it("adopt garde des octets déjà vérifiés par le conteneur, refuse une empreinte non conforme", () => {
    const store = createAssetStore();
    const b = new Blob(["abc"]);
    store.adopt(ABC, b);
    expect(store.get(ABC)).toBe(b);
    store.adopt(ABC, new Blob(["autre"]));
    expect(store.get(ABC)).toBe(b);
    expect(() => store.adopt(ABC.toUpperCase(), b)).toThrow("empreinte d'asset invalide");
    expect(store.has(ABC.toUpperCase())).toBe(false);
  });

  it("l'empreinte est injectée : le hasher donné est seul appelé", async () => {
    let calls = 0;
    const hash: AssetHasher = async () => {
      calls++;
      return "f".repeat(64);
    };
    const store = createAssetStore(hash);
    expect(await store.put(new Blob(["x"]))).toBe("f".repeat(64));
    expect(calls).toBe(1);
  });

  it("une instance par document : deux stores ne partagent rien", async () => {
    const a = createAssetStore();
    const b = createAssetStore();
    await a.put(new Blob(["abc"]));
    expect(b.has(ABC)).toBe(false);
    expect(b.get(ABC)).toBeUndefined();
  });

  it("isAssetId : 64 caractères hexadécimaux minuscules seulement", () => {
    expect(isAssetId(ABC)).toBe(true);
    expect(isAssetId(ABC.toUpperCase())).toBe(false);
    expect(isAssetId(ABC.slice(1))).toBe(false);
    expect(isAssetId("")).toBe(false);
  });
});
```

- [ ] **Étape 2 : vérifier le rouge.** `cd "$WT/apps/web" && pnpm exec vitest run src/core/asset-store.test.ts 2>&1 | tail -20`
  → échec `Failed to resolve import "./asset-store"`.

- [ ] **Étape 3 : implémenter.** Créer `apps/web/src/core/asset-store.ts` :

```ts
// Octets des assets d'un document (U4, K13, DAK3) : empreinte SHA-256 → Blob. Les métadonnées (nom, type, taille)
// restent dans le cœur (racine `assets`, K3) ; aucun octet ne passe au module Wasm de l'encre. Une instance par
// document, donc par onglet (D27 amendée). `pick` ne trie pas : le conteneur trie à l'écriture (K12).
export type AssetId = string;
export type AssetHasher = (blob: Blob) => Promise<AssetId>;

const ASSET_ID = /^[0-9a-f]{64}$/;
export const isAssetId = (s: string): boolean => ASSET_ID.test(s);

const hex = (buf: ArrayBuffer): string => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

/** Web Crypto : contexte sûr exigé (coque, https, localhost) ; le Worker de la partie « reste » pourra le remplacer (HK6). */
export const webCryptoHasher: AssetHasher = async (blob) => hex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));

export interface AssetStore {
  /** Calcule l'empreinte ; un contenu déjà présent garde son premier Blob. */
  put(blob: Blob): Promise<AssetId>;
  /** Octets déjà vérifiés (lecture du conteneur) ; lève si l'empreinte n'est pas conforme. */
  adopt(id: AssetId, blob: Blob): void;
  get(id: AssetId): Blob | undefined;
  has(id: AssetId): boolean;
  /** Présents dans l'ordre reçu, absents à part. */
  pick(ids: readonly AssetId[]): { present: Array<readonly [AssetId, Blob]>; missing: AssetId[] };
}

export function createAssetStore(hash: AssetHasher = webCryptoHasher): AssetStore {
  const blobs = new Map<AssetId, Blob>();
  const keep = (id: AssetId, blob: Blob): void => {
    if (!blobs.has(id)) blobs.set(id, blob);
  };
  return {
    async put(blob) {
      const id = await hash(blob);
      keep(id, blob);
      return id;
    },
    adopt(id, blob) {
      if (!isAssetId(id)) throw new Error(`empreinte d'asset invalide : ${id}`);
      keep(id, blob);
    },
    get: (id) => blobs.get(id),
    has: (id) => blobs.has(id),
    pick(ids) {
      const present: Array<readonly [AssetId, Blob]> = [];
      const missing: AssetId[] = [];
      for (const id of ids) {
        const b = blobs.get(id);
        if (b) present.push([id, b] as const);
        else missing.push(id);
      }
      return { present, missing };
    },
  };
}
```

- [ ] **Étape 4 : vérifier le vert.** `pnpm exec vitest run src/core/asset-store.test.ts 2>&1 | tail -20` → 7 passed ;
  `pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec.

- [ ] **Étape 5 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/asset-store.ts && git add apps/web/src/core/asset-store.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): add per-document AssetStore keyed by SHA-256" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests passés, `Réutilisation : appelé apps/web/src/core/asset-store.ts (nouveau module, aucun existant)`.

---

### Tâche T5 — Contrat TS et fausse liaison (image, fond, inconnu)

**Objectif.** Élargir `api.ts` (image, `unknown`, fond, métadonnées, `saveParts`, `loadParts`) et donner à la fausse
liaison la même conduite que le cœur : `AddImage`, `SetBackdrop`, `page(id)`, `citedAssets` (même balayage, mêmes défauts),
`kind` inconnu gardé avec ses champs bruts et réécrit tel quel (K8, arbitrage I5, S2, S3, S4). Bloc de contrat
« contrat C2 » joué sur la fausse liaison seule ; T8 y ajoute le vrai module.

**Fichiers.**
- Modify : `apps/web/src/core/api.ts:13` (`ElementKind`), `:23-53` (`Command`), `:55-66` (vues), `:76-103` (`CoreDocument`, `CoreFactory`)
- Modify : `apps/web/src/core/fake-core.ts` (tout le modèle, voir étapes)
- Modify : `apps/web/src/core/fake-core.test.ts` (tests neufs à la fin)
- Modify : `apps/web/src/core/wasm-core.contract.test.ts` (bloc neuf après `:570`, avant `describe.skipIf(loaded === null)`)
- Create : `apps/web/src/core/fixtures/element-inconnu.fake.json`

**Interfaces.**
- Produit (exact, dans `api.ts`) :

```ts
export type ElementKind = "stroke" | "shape" | "text" | "image" | "unknown";
export interface AssetRef { readonly id: string; readonly name: string; readonly mime: string; readonly size: number }
export type AssetInfo = AssetRef;
export interface BackdropInput { readonly asset: AssetRef; readonly w: number; readonly h: number; readonly fit: string }
// Command :
//   | { readonly type: "AddImage"; readonly page: string; readonly asset: AssetRef; readonly w: number; readonly h: number; readonly matrix: Matrix }
//   | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null }
export interface ImageData { readonly asset: string; readonly w: number; readonly h: number }
export interface UnknownData { readonly sourceKind: string; readonly w: number; readonly h: number }
// ElementBase = { id, transform } ; style porté par StrokeElement, ShapeElement, TextElement
export interface ImageElement extends ElementBase { readonly kind: "image"; readonly image: ImageData }
export interface UnknownElement extends ElementBase { readonly kind: "unknown"; readonly unknown: UnknownData }
export type ElementView = StrokeElement | ShapeElement | TextElement | ImageElement | UnknownElement;
export interface BackdropView { readonly asset: string; readonly kind: string; readonly w: number | null; readonly h: number | null; readonly fit: string; readonly rect: Bounds | null }
export interface PageView { readonly id: string; readonly width: number; readonly height: number; readonly background: string; readonly backdrop: BackdropView | null }
// CoreDocument : page(id: string): PageView | null; citedAssets(): AssetInfo[]; asset(id: string): AssetInfo | null;
//                saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array];
// CoreFactory : loadParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;
export const DEFAULT_ASSET_MIME = "application/octet-stream";
export const UNKNOWN_BOX = 100;
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
```

- Produit : `apps/web/src/core/fixtures/element-inconnu.fake.json` (miroir de `element-inconnu.roomboard`, T3) et, dans
  `wasm-core.contract.test.ts`, la constante `const c2Factories: { name: string; f: CoreFactory }[]` (T8 la remplace par `factories`).
- Consomme : messages `BadAsset`, `BadImage` (tête du plan), vecteurs `ABC`, `EMPTY_HASH`.
- Réutilise : `apps/web/src/core/fake-core.ts:145` (`FakeDocument`), `:430` (`fakeCore`) — étendus : mêmes méthodes que `CoreDocument` ; balayage des assets cités sur le modèle JSON ; `SavedElement` gagne `kind?: string` et `raw?: Record<string, unknown>` ; un `kind` ni `stroke`, ni `shape`, ni `text`, ni `image` est gardé avec ses champs bruts, rendu en `UnknownElement` (`sourceKind`, boîte `w`, `h` ou 100 × 100, identité sans `transform`) et réécrit tel quel par `save` ; `Transform` ne change que son `transform`.

**Patron à ne pas reprendre (concepteur-critique).** (1) Ne balayer que `image.asset` et `backdrop.asset` : le cœur cite
toute chaîne conforme à toute profondeur, champs bruts des inconnus compris (`docs/plans/usage-c2-coeur-cadrage.md:38`,
K4) ; la parité se joue sur `citedAssets`. (2) Jeter les champs inconnus au chargement comme le fait `fakeCore.load`
aujourd'hui (`apps/web/src/core/fake-core.ts:430-457` : seuls `id`, `transform`, `style`, `local`, `shape`, `text` sont
gardés) : l'élément inconnu doit revenir intact au `save`. (3) Garder `private page(id)` : il lève, alors que `page(id)`
du contrat rend `null` ; renommer l'aide en `pageOf`.

**Test et commande bornée.**
`cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec ; le bloc « contrat C2 : fausse liaison » a ≥ 6 tests
et `fake-core.test.ts` ≥ 4 tests neufs (« fixture élément inconnu »). Dans un worktree neuf, `apps/web/src/wasm/` est absent
et le vrai module est sauté : c'est attendu ici (T8 le rebranche). Tests à garder verts : tout `fake-core.test.ts`, tout
`wasm-core.contract.test.ts`, `src/engine/**/*.test.ts`, `src/platform/*.test.ts`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : côté page `apps/web/src/core/` (`api.ts`, `fake-core.ts`, leurs tests, fixture JSON).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G4 Test « recharger garde les octets » pour chaque valeur composée neuve (image, fond, métadonnée : test « save puis load … recharger garde les octets »).
- G6 Fixtures synthétiques seulement.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `pnpm --filter @roomboard/web test 2>&1 | tail -20`.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Toucher à `wasm-core.ts` (T8). Ajouter le vrai module aux usines du bloc C2 (T8). Modifier un fichier hors
`apps/web/src/core/` même si `tsc` signale un appelant (le citer dans le rapport). Changer les messages d'erreur existants.

**Terminé quand.** `pnpm --filter @roomboard/web test` vert ; `pnpm --filter @roomboard/web exec tsc --noEmit -p .` ne
signale d'erreur que dans `wasm-core.ts` (méthodes neuves non branchées, attendu) ou pour un module Wasm absent ; les
erreurs ailleurs sont listées dans le rapport.

**Étapes.**

- [ ] **Étape 1 : fixture JSON.** Créer `apps/web/src/core/fixtures/element-inconnu.fake.json` :

```json
{
  "now": "2026-11-20T00:00:00Z",
  "appVersion": "0.1.0",
  "assets": {},
  "pages": [
    {
      "id": "p1",
      "backdrop": null,
      "elements": [
        {
          "id": "h1",
          "kind": "hologram",
          "transform": [1, 0, 0, 1, 100, 50],
          "raw": {
            "w": 300,
            "h": 200,
            "layers": { "a": [1, 2] },
            "refs": ["ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"]
          }
        },
        { "id": "h2", "kind": "hologram", "raw": {} }
      ]
    }
  ]
}
```

- [ ] **Étape 2 : contrat élargi dans `api.ts`.** Remplacer `ElementKind`, la fin de l'union `Command`, les vues et les
  deux interfaces par les définitions du bloc Interfaces, soit concrètement :

```ts
export type ElementKind = "stroke" | "shape" | "text" | "image" | "unknown";
export interface AssetRef { readonly id: string; readonly name: string; readonly mime: string; readonly size: number }
/** Métadonnée d'un asset cité (K3) : même forme que la référence ; défauts du cœur pour une entrée absente (K4). */
export type AssetInfo = AssetRef;
/** Fond demandé par SetBackdrop ; seul fit = "width" est accepté à l'écriture (K6). */
export interface BackdropInput { readonly asset: AssetRef; readonly w: number; readonly h: number; readonly fit: string }
```

  Ajouter à l'union `Command`, après `Transform` :

```ts
  | { readonly type: "AddImage"; readonly page: string; readonly asset: AssetRef; readonly w: number; readonly h: number; readonly matrix: Matrix }
  /** backdrop null : retire le fond ; même valeur : aucune étape (D38). */
  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null };
```

  Remplacer `ElementBase` … `ElementView` par :

```ts
export interface ImageData { readonly asset: string; readonly w: number; readonly h: number }
export interface UnknownData { readonly sourceKind: string; readonly w: number; readonly h: number }

interface ElementBase {
  readonly id: string;
  readonly transform: Matrix;
}
export interface StrokeElement extends ElementBase { readonly kind: "stroke"; readonly style: StrokeStyle }
export interface ShapeElement extends ElementBase { readonly kind: "shape"; readonly style: StrokeStyle; readonly shape: ShapeData }
export interface TextElement extends ElementBase { readonly kind: "text"; readonly style: StrokeStyle; readonly text: TextData }
/** Image (U5) : boîte locale (0, 0)-(w, h), taille source en pixels. */
export interface ImageElement extends ElementBase { readonly kind: "image"; readonly image: ImageData }
/** Élément d'un kind inconnu (U3) : gardé, dessiné comme un cadre, boîte (0, 0)-(w, h). */
export interface UnknownElement extends ElementBase { readonly kind: "unknown"; readonly unknown: UnknownData }
export type ElementView = StrokeElement | ShapeElement | TextElement | ImageElement | UnknownElement;

/** Fond de page (U6, K6) : rect calculé par le cœur, calé sur la largeur de la page ; null si w ou h illisibles. */
export interface BackdropView {
  readonly asset: string;
  readonly kind: string;
  readonly w: number | null;
  readonly h: number | null;
  readonly fit: string;
  readonly rect: Bounds | null;
}
export interface PageView {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly backdrop: BackdropView | null;
}
```

  Dans `CoreDocument`, après `element(…)` : `page(id: string): PageView | null;`, `citedAssets(): AssetInfo[];`,
  `asset(id: string): AssetInfo | null;` ; après `save(…)` : `saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array];`.
  Dans `CoreFactory`, après `load` : `loadParts(manifest: Uint8Array, ybin: Uint8Array): CoreDocument;`. À la fin :

```ts
export const DEFAULT_ASSET_MIME = "application/octet-stream";
export const UNKNOWN_BOX = 100;
export const PAGE_WIDTH = 1920;
export const PAGE_HEIGHT = 1080;
```

  Compléter l'en-tête du fichier : « C2 : AddImage, SetBackdrop ; éléments image et unknown (style absent) ; page(id),
  citedAssets, asset, saveParts, loadParts. »

- [ ] **Étape 3 : tests du bloc C2 (rouges).** Dans `wasm-core.contract.test.ts`, juste avant
  `describe.skipIf(loaded === null)("contrat du vrai module wasm"`, ajouter :

```ts
// C2 (cœur) : image, fond, métadonnées. T8 remplace `c2Factories` par `factories` (vrai module compris).
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const BAD_ASSET = "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)";
const BAD_IMAGE = "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)";
const png = { id: ABC, name: "photo.png", mime: "image/png", size: 3 } as const;
const jpg = { id: EMPTY_HASH, name: "fond.jpg", mime: "image/jpeg", size: 0 } as const;
const I: Matrix = [1, 0, 0, 1, 0, 0];
const c2Factories: { name: string; f: CoreFactory }[] = [{ name: "fausse liaison", f: fakeCore }];

describe.each(c2Factories)("contrat C2 : $name", ({ f }) => {
  const image = (d: CoreDocument, p: string, asset = png, matrix: Matrix = I): string =>
    d.apply({ type: "AddImage", page: p, asset, w: 640, h: 480, matrix }).ids[0] ?? "";

  it("AddImage : une étape, vue image sans style, une seule métadonnée pour deux images (S2)", () => {
    const d = f.blank();
    const p = first(d);
    const c = d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: [1, 0, 0, 1, 10, 20] });
    expect(c.pages).toEqual([p]);
    expect(c.ids).toHaveLength(1);
    const a = c.ids[0] ?? "";
    expect(d.element(a)).toEqual({ id: a, kind: "image", transform: [1, 0, 0, 1, 10, 20], image: { asset: ABC, w: 640, h: 480 } });
    const b = image(d, p, { ...png, name: "autre.png" });
    expect(d.elementIds(p)).toEqual([a, b]);
    expect(d.citedAssets()).toEqual([png]);
    d.undo();
    expect(d.asset(ABC)).toEqual(png);
    d.undo();
    expect(d.citedAssets()).toEqual([]);
    expect(d.asset(ABC)).toEqual({ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 });
    expect(d.asset(ABC.toUpperCase())).toBeNull();
    d.free();
  });

  it("AddImage : erreurs sans étape, messages du contrat", () => {
    const d = f.blank();
    const p = first(d);
    const bad = (asset: typeof png | Record<string, unknown>, w: number, h: number, matrix: Matrix): string =>
      messageOf(() => d.apply({ type: "AddImage", page: p, asset: asset as typeof png, w, h, matrix }));
    unchanged(d, () => {
      expect(bad({ ...png, id: ABC.toUpperCase() }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, mime: "" }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, size: -1 }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad({ ...png, size: 1.5 }, 1, 1, I)).toBe(BAD_ASSET);
      expect(bad(png, 0, 1, I)).toBe(BAD_IMAGE);
      expect(bad(png, 1, Number.NaN, I)).toBe(BAD_IMAGE);
      expect(bad(png, 1, 1, [0, 0, 0, 0, 0, 0])).toBe("matrice invalide (six nombres finis, inversible)");
      expect(messageOf(() => d.apply({ type: "AddImage", page: "nulle-part", asset: png, w: 1, h: 1, matrix: I }))).toBe(
        "page inconnue : nulle-part",
      );
    });
    expect(d.citedAssets()).toEqual([]);
    d.free();
  });

  it("image : hitTest dans sa boîte, Transform la déplace, gomme et hitTestPath l'ignorent", () => {
    const d = f.blank();
    const p = first(d);
    const a = image(d, p, png, [1, 0, 0, 1, 100, 100]);
    expect(d.hitTest(p, 400, 300, 0)).toBe(a);
    expect(d.bounds([a])).toEqual({ x0: 100, y0: 100, x1: 740, y1: 580 });
    unchanged(d, () => d.apply({ type: "Erase", page: p, path: new Float32Array([100, 300, 740, 300]), radius: 10, mode: "object" }));
    expect(d.hitTestPath(p, new Float32Array([100, 300, 740, 300]), 10)).toEqual([]);
    d.apply({ type: "Transform", ids: [a], matrix: [1, 0, 0, 1, 10, 0] });
    expect(d.element(a)?.transform).toEqual([1, 0, 0, 1, 110, 100]);
    d.free();
  });

  it("SetBackdrop (S3) : rect sur la largeur, page inchangée, aucun hitTest, même fond sans étape, retirer puis annuler", () => {
    const d = f.blank();
    const p = first(d);
    const before = d.page(p);
    expect(before).toEqual({ id: p, width: 1920, height: 1080, background: "#ffffff", backdrop: null });
    const fond = { asset: png, w: 1000, h: 500, fit: "width" };
    expect(d.apply({ type: "SetBackdrop", page: p, backdrop: fond }).pages).toEqual([p]);
    const rect = { x0: 0, y0: 0, x1: 1920, y1: 960 };
    expect(d.page(p)).toEqual({ ...before, backdrop: { asset: ABC, kind: "image", w: 1000, h: 500, fit: "width", rect } });
    expect(d.hitTest(p, 960, 480, 0)).toBeNull();
    expect(d.elementIds(p)).toEqual([]);
    expect(d.citedAssets()).toEqual([png]);
    unchanged(d, () => d.apply({ type: "SetBackdrop", page: p, backdrop: fond }));
    d.apply({ type: "SetBackdrop", page: p, backdrop: null });
    expect(d.page(p)?.backdrop).toBeNull();
    unchanged(d, () => d.apply({ type: "SetBackdrop", page: p, backdrop: null }));
    d.undo();
    expect(d.page(p)?.backdrop?.rect).toEqual(rect);
    expect(d.page("nulle-part")).toBeNull();
    d.free();
  });

  it("SetBackdrop : ajustement autre que width, boîte ou asset invalides refusés sans étape", () => {
    const d = f.blank();
    const p = first(d);
    unchanged(d, () => {
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: png, w: 10, h: 10, fit: "contain" } }))).toBe(BAD_IMAGE);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: png, w: 0, h: 10, fit: "width" } }))).toBe(BAD_IMAGE);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: { ...png, mime: "" }, w: 10, h: 10, fit: "width" } }))).toBe(BAD_ASSET);
      expect(messageOf(() => d.apply({ type: "SetBackdrop", page: "nulle-part", backdrop: null }))).toBe("page inconnue : nulle-part");
    });
    d.free();
  });

  it("saveParts puis loadParts, save puis load : image, fond et métadonnées gardés ; recharger garde les octets", () => {
    const d = f.blank();
    const p = first(d);
    const a = image(d, p);
    d.apply({ type: "SetBackdrop", page: p, backdrop: { asset: jpg, w: 1000, h: 500, fit: "width" } });
    expect(d.citedAssets().map((x) => x.id)).toEqual([ABC, EMPTY_HASH]);
    const [manifest, ybin] = d.saveParts(now, "0.1.0");
    const e = f.loadParts(manifest, ybin);
    expect(e.element(a)).toEqual(d.element(a));
    expect(e.page(p)).toEqual(d.page(p));
    expect(e.citedAssets()).toEqual(d.citedAssets());
    const file = d.save(now, "0.1.0");
    let cur = f.load(file);
    for (let i = 0; i < 5; i++) {
      const again = cur.save(now, "0.1.0");
      expect(again).toEqual(file);
      cur.free();
      cur = f.load(again);
    }
    cur.free();
    e.free();
    d.free();
  });
});
```

  `pnpm --filter @roomboard/web test 2>&1 | tail -20` → les 6 tests du bloc échouent (`d.page is not a function`, etc.).

- [ ] **Étape 4 : tests de la fausse liaison sur la fixture (rouges).** À la fin de `fake-core.test.ts` :

```ts
interface NodeFs { readFileSync(p: URL): Uint8Array }
const fs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const unknownFixture = (): Uint8Array => fs.readFileSync(new URL("./fixtures/element-inconnu.fake.json", import.meta.url));
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("fixture élément inconnu (S4, fausse liaison)", () => {
  it("vue unknown avec sa boîte ; sans transform : identité et 100 × 100", () => {
    const d = fakeCore.load(unknownFixture());
    expect(d.element("h1")).toEqual({ id: "h1", kind: "unknown", transform: [1, 0, 0, 1, 100, 50], unknown: { sourceKind: "hologram", w: 300, h: 200 } });
    expect(d.element("h2")).toEqual({ id: "h2", kind: "unknown", transform: [1, 0, 0, 1, 0, 0], unknown: { sourceKind: "hologram", w: 100, h: 100 } });
    expect(d.citedAssets()).toEqual([{ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 }]);
    expect(d.canUndo()).toBe(false);
  });

  it("Transform ne change que la matrice et ignore l'élément sans transform ; save réécrit les champs bruts", () => {
    const d = fakeCore.load(unknownFixture());
    const v = d.version();
    expect(d.apply({ type: "Transform", ids: ["h2"], matrix: [1, 0, 0, 1, 10, 0] }).version).toBe(v);
    d.apply({ type: "Transform", ids: ["h1"], matrix: [1, 0, 0, 1, 10, 0] });
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: unknown[] }[] };
    const original = JSON.parse(new TextDecoder().decode(unknownFixture())) as { pages: { elements: Record<string, unknown>[] }[] };
    const [h1, h2] = original.pages[0]?.elements ?? [];
    expect(saved.pages[0]?.elements).toEqual([{ ...h1, transform: [1, 0, 0, 1, 110, 50] }, h2]);
  });

  it("hitTest le sélectionne, Delete le retire, la gomme l'ignore", () => {
    const d = fakeCore.load(unknownFixture());
    expect(d.hitTest("p1", 50, 50, 0)).toBe("h2");
    expect(d.hitTest("p1", 150, 100, 0)).toBe("h1");
    expect(d.apply({ type: "Erase", page: "p1", path: new Float32Array([0, 50, 400, 50]), radius: 10, mode: "object" }).removed).toEqual([]);
    expect(d.apply({ type: "Delete", ids: ["h2"] }).removed).toEqual(["h2"]);
    expect(d.elementIds("p1")).toEqual(["h1"]);
  });

  it("métadonnée mal formée au chargement : défauts champ par champ (K4)", () => {
    const raw = {
      pages: [{ id: "p1", elements: [{ id: "i1", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ABC, w: 2, h: 2 } }] }],
      assets: { [ABC]: { name: 3, mime: "", size: -1 } },
    };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(raw)));
    expect(d.citedAssets()).toEqual([{ id: ABC, name: ABC, mime: "application/octet-stream", size: 0 }]);
    expect(d.page("p1")?.backdrop).toBeNull();
  });
});
```

- [ ] **Étape 5 : implémenter la fausse liaison.** Dans `fake-core.ts` :
  1. Remplacer `this.page(` par `this.pageOf(` partout, et renommer la méthode privée `page` en `pageOf`.
  2. Imports : ajouter `AssetInfo`, `AssetRef`, `BackdropView`, `ImageData`, `PageView`, `DEFAULT_ASSET_MIME`, `PAGE_HEIGHT`,
     `PAGE_WIDTH`, `UNKNOWN_BOX` depuis `./api`.
  3. Modèle et aides (remplacer `FakeElement`, `FakePage`, `State`, `clone`, compléter `MESSAGES`) :

```ts
/** Élément d'un kind inconnu (U3, K8) : champs bruts gardés tels quels, réécrits par save. */
interface FakeUnknown { readonly sourceKind: string; readonly raw: Readonly<Record<string, unknown>>; readonly hasTransform: boolean }
interface FakeElement {
  readonly id: string;
  /** Identité pour un élément inconnu sans transform lisible (hasTransform = false). */
  readonly transform: Matrix;
  /** Image et inconnu : NO_STYLE, jamais exposé par element(). */
  readonly style: StrokeStyle;
  /** Trait : triplets x, y, pression locaux. */
  readonly local?: Float32Array;
  readonly shape?: ShapeData;
  readonly text?: TextData;
  readonly image?: ImageData;
  readonly unknown?: FakeUnknown;
}
type RawRecord = Readonly<Record<string, unknown>>;
interface FakePage { readonly id: string; readonly elements: FakeElement[]; backdrop: RawRecord | null }
/** `assets` : valeurs brutes (K3) ; lues avec défauts champ par champ (K4). */
interface State { readonly pages: FakePage[]; readonly assets: Map<string, unknown> }

const MESSAGES = {
  badShape: "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)",
  badMatrix: "matrice invalide (six nombres finis, inversible)",
  badText: "texte invalide (taille et boîte finies > 0 attendues)",
  badWidth: "épaisseur de trait invalide (nombre fini > 0 attendu)",
  badAsset: "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)",
  badImage: "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)",
} as const;

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const NO_STYLE: StrokeStyle = { color: "", width: 0 };
const KNOWN_KINDS = new Set(["stroke", "shape", "text", "image"]);
const ASSET_ID = /^[0-9a-f]{64}$/;
const isAssetId = (s: unknown): s is string => typeof s === "string" && ASSET_ID.test(s);
const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Même règle que le cœur (`BadAsset`) : empreinte conforme, type non vide, taille entière ≥ 0. */
const validAsset = (a: AssetRef): boolean => isAssetId(a.id) && a.mime !== "" && Number.isInteger(a.size) && a.size >= 0;
const clone = (s: State): State => ({
  pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements], backdrop: p.backdrop })),
  assets: new Map(s.assets),
});
const unknownBox = (raw: RawRecord): { w: number; h: number } =>
  finitePositive(raw["w"]) && finitePositive(raw["h"]) ? { w: raw["w"], h: raw["h"] } : { w: UNKNOWN_BOX, h: UNKNOWN_BOX };
/** Écrite seulement si absente (K3). */
const putMeta = (assets: Map<string, unknown>, a: AssetRef): void => {
  if (!assets.has(a.id)) assets.set(a.id, { name: a.name, mime: a.mime, size: a.size });
};

/** Métadonnée lue avec les défauts du cœur, champ par champ (K4). */
function assetInfo(assets: ReadonlyMap<string, unknown>, id: string): AssetInfo {
  const m = assets.get(id);
  const r = isRecord(m) ? m : {};
  const { name, mime, size } = r;
  return {
    id,
    name: typeof name === "string" ? name : id,
    mime: typeof mime === "string" && mime !== "" ? mime : DEFAULT_ASSET_MIME,
    size: typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : 0,
  };
}

/** Fond vu comme par le cœur (K6, K9) : null sans asset conforme ; rect sur la largeur si w et h sont lisibles. */
function backdropView(raw: RawRecord | null, width: number): BackdropView | null {
  if (raw === null) return null;
  const { asset, kind, w, h, fit } = raw;
  if (!isAssetId(asset)) return null;
  const bw = finitePositive(w) ? w : null;
  const bh = finitePositive(h) ? h : null;
  return {
    asset,
    kind: typeof kind === "string" ? kind : "",
    w: bw,
    h: bh,
    fit: typeof fit === "string" ? fit : "",
    rect: bw !== null && bh !== null ? { x0: 0, y0: 0, x1: width, y1: (bh * width) / bw } : null,
  };
}

const BACKDROP_KEYS = ["asset", "kind", "w", "h", "fit"] as const;
const sameBackdrop = (a: RawRecord | null, b: RawRecord | null): boolean =>
  a === null || b === null ? a === b : BACKDROP_KEYS.every((k) => a[k] === b[k]);

/** Balayage des assets cités (K4) : toute chaîne conforme, à toute profondeur ; le texte lui-même n'est pas balayé. */
function scanAssets(v: unknown, acc: Set<string>): void {
  if (typeof v === "string") {
    if (ASSET_ID.test(v)) acc.add(v);
    return;
  }
  if (v instanceof Float32Array) return;
  if (Array.isArray(v)) {
    for (const x of v) scanAssets(x, acc);
    return;
  }
  if (isRecord(v)) for (const x of Object.values(v)) scanAssets(x, acc);
}
```

  4. `worldPolygon` : compléter le calcul de `local` par image et inconnu :

```ts
  const local = e.shape
    ? shapePolygon(e.shape.shape, e.shape.w, e.shape.h, e.style.width)
    : e.text
      ? boxPolygon(e.text.boxWidth, e.text.boxHeight)
      : e.image
        ? boxPolygon(e.image.w, e.image.h)
        : e.unknown
          ? boxPolygon(unknownBox(e.unknown.raw).w, unknownBox(e.unknown.raw).h)
          : null;
```

  5. Pages : `AddPage` crée `{ id, elements: [], backdrop: null }` ; `fakeCore.blank` crée
     `new FakeDocument({ pages: [{ id: newId(), elements: [], backdrop: null }], assets: new Map() })`.
  6. `Transform` : remplacer le filtre des ids par
     `.filter((id) => { const found = this.find(id); return found !== undefined && found.element.unknown?.hasTransform !== false; })`
     (un inconnu sans transform lisible est ignoré, comme `commands.rs:458-497`).
  7. Deux cas neufs dans `apply` :

```ts
      case "AddImage": {
        // Même ordre que le cœur : asset, boîte, matrice, puis page.
        if (!validAsset(cmd.asset)) throw new Error(MESSAGES.badAsset);
        if (!positive(cmd.w) || !positive(cmd.h)) throw new Error(MESSAGES.badImage);
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        this.pageOf(cmd.page);
        return this.step((s) => {
          const id = newId();
          s.pages.find((p) => p.id === cmd.page)?.elements.push({
            id,
            transform: cmd.matrix,
            style: NO_STYLE,
            image: { asset: cmd.asset.id, w: cmd.w, h: cmd.h },
          });
          putMeta(s.assets, cmd.asset);
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "SetBackdrop": {
        const b = cmd.backdrop;
        if (b !== null) {
          if (!validAsset(b.asset)) throw new Error(MESSAGES.badAsset);
          if (!positive(b.w) || !positive(b.h) || b.fit !== "width") throw new Error(MESSAGES.badImage);
        }
        const current = this.pageOf(cmd.page).backdrop;
        const next: RawRecord | null = b === null ? null : { asset: b.asset.id, kind: "image", w: b.w, h: b.h, fit: "width" };
        if (sameBackdrop(current, next)) return this.unchanged();
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.backdrop = next;
          if (b !== null) putMeta(s.assets, b.asset);
          return { pages: [cmd.page], ids: [], removed: [] };
        });
      }
```

  8. Lectures neuves et `element` :

```ts
  element(id: string): ElementView | null {
    const e = this.find(id)?.element;
    if (!e) return null;
    const base = { id, transform: e.transform };
    if (e.unknown) return { ...base, kind: "unknown", unknown: { sourceKind: e.unknown.sourceKind, ...unknownBox(e.unknown.raw) } };
    if (e.image) return { ...base, kind: "image", image: e.image };
    const styled = { ...base, style: e.style };
    if (e.shape) return { ...styled, kind: "shape", shape: e.shape };
    if (e.text) return { ...styled, kind: "text", text: e.text };
    return { ...styled, kind: "stroke" };
  }
  page(id: string): PageView | null {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) return null;
    return { id, width: PAGE_WIDTH, height: PAGE_HEIGHT, background: "#ffffff", backdrop: backdropView(p.backdrop, PAGE_WIDTH) };
  }
  citedAssets(): AssetInfo[] {
    const acc = new Set<string>();
    for (const p of this.state.pages) {
      scanAssets(p.id, acc);
      scanAssets(p.backdrop, acc);
      for (const e of p.elements) scanAssets({ ...e, text: undefined, local: undefined }, acc);
    }
    return [...acc].sort().map((id) => assetInfo(this.state.assets, id));
  }
  asset(id: string): AssetInfo | null {
    return isAssetId(id) ? assetInfo(this.state.assets, id) : null;
  }
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array] {
    const manifest = new TextEncoder().encode(JSON.stringify({ format: "roomboard-fake", appVersion, modified: now }));
    return [manifest, this.save(now, appVersion)] as const;
  }
```

  9. Enregistrement et chargement (remplacer `save`, `SavedElement`, `SavedPage` et `fakeCore`) :

```ts
  save(now: string, appVersion: string): Uint8Array {
    const json = JSON.stringify({
      now,
      appVersion,
      assets: Object.fromEntries(this.state.assets),
      pages: this.state.pages.map((p) => ({ id: p.id, backdrop: p.backdrop, elements: p.elements.map(savedElement) })),
    });
    return new TextEncoder().encode(json);
  }
```

```ts
interface SavedElement {
  id: string;
  /** Absent : élément du socle (trait, forme ou texte selon ses champs). */
  kind?: string;
  transform?: number[];
  style?: StrokeStyle;
  local?: number[];
  shape?: ShapeData;
  text?: TextData;
  image?: ImageData;
  /** Champs bruts d'un élément inconnu, réécrits tels quels. */
  raw?: Record<string, unknown>;
}
interface SavedPage { id: string; elements: SavedElement[]; backdrop?: unknown }

function savedElement(e: FakeElement): SavedElement {
  if (e.unknown) {
    return { id: e.id, kind: e.unknown.sourceKind, ...(e.unknown.hasTransform ? { transform: [...e.transform] } : {}), raw: { ...e.unknown.raw } };
  }
  if (e.image) return { id: e.id, kind: "image", transform: [...e.transform], image: e.image };
  return {
    id: e.id,
    transform: [...e.transform],
    style: e.style,
    ...(e.local ? { local: Array.from(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: e.text } : {}),
  };
}

const toMatrix6 = (t: unknown): Matrix | null =>
  Array.isArray(t) && t.length === 6 && t.every((v) => typeof v === "number" && Number.isFinite(v)) ? (t as unknown as Matrix) : null;

function loadElement(e: SavedElement): FakeElement {
  if (e.kind !== undefined && !KNOWN_KINDS.has(e.kind)) {
    const t = toMatrix6(e.transform);
    return { id: e.id, transform: t ?? IDENTITY, style: NO_STYLE, unknown: { sourceKind: e.kind, raw: e.raw ?? {}, hasTransform: t !== null } };
  }
  if (e.kind === "image" && e.image) return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image: e.image };
  return {
    id: e.id,
    transform: toMatrix6(e.transform) ?? IDENTITY,
    style: e.style ?? NO_STYLE,
    ...(e.local ? { local: new Float32Array(e.local) } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.text ? { text: e.text } : {}),
  };
}

function loadFake(bytes: Uint8Array): CoreDocument {
  // Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel.
  const notRoomboard = "ce fichier n'est pas un document RoomBoard";
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(notRoomboard);
  }
  if (!isRecord(raw) || !Array.isArray(raw["pages"])) throw new Error(notRoomboard);
  const pages = (raw["pages"] as SavedPage[]).map((p) => ({
    id: p.id,
    elements: p.elements.map(loadElement),
    backdrop: isRecord(p.backdrop) ? p.backdrop : null,
  }));
  const assets = new Map(isRecord(raw["assets"]) ? Object.entries(raw["assets"]) : []);
  return new FakeDocument({ pages, assets });
}

export const fakeCore: CoreFactory = {
  blank: () => new FakeDocument({ pages: [{ id: newId(), elements: [], backdrop: null }], assets: new Map() }),
  load: loadFake,
  loadParts: (manifest: Uint8Array, ybin: Uint8Array) => {
    void manifest;
    return loadFake(ybin);
  },
  version: () => "fake",
};
```

  Mettre à jour l'en-tête du fichier : « C2 : images, fond (`page(id)`), métadonnées et `citedAssets` par le même balayage
  que le cœur ; `kind` inconnu gardé avec ses champs bruts (`raw`) et réécrit tel quel. »

- [ ] **Étape 6 : vérifier le vert.** `cd "$WT" && pnpm --filter @roomboard/web test 2>&1 | tail -20` → 0 échec, bloc
  « contrat C2 : fausse liaison » 6 tests, « fixture élément inconnu » 4 tests. Puis
  `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -20` et noter les erreurs (attendues : `wasm-core.ts`).

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add apps/web/src/core/api.ts && git add apps/web/src/core/fake-core.ts && \
git add apps/web/src/core/fake-core.test.ts && git add apps/web/src/core/wasm-core.contract.test.ts && \
git add apps/web/src/core/fixtures/element-inconnu.fake.json && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): extend core contract and fake binding for images, backdrops, unknown kinds" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests ajoutés, sortie de `tsc` (erreurs restantes et fichiers), ligne `Réutilisation : appelé apps/web/src/core/fake-core.ts`.

---

### Tâche T6 — Assets, image et fond dans le cœur

**Objectif.** Racine `assets` (métadonnées écrites seulement si absentes, dans l'historique), commandes `AddImage` et
`SetBackdrop` (une étape, erreurs sans écriture, même fond = aucune transaction), vue de page avec fond calé sur la largeur,
`cited_assets` par balayage générique, `asset(id)` avec défauts (K3 à K6, K9 ; S1, S2, S3).

**Fichiers.**
- Modify : `crates/roomboard-core/src/document.rs:39-47` (`Document`), `:57-62` (`roots`), `:76-101` (`bare`, `assemble`), `:150-159` (`page`), `:259-284` (`from_update_v1`), méthodes neuves, tests
- Modify : `crates/roomboard-core/src/history.rs:18-31` (`History::new`) et ses tests
- Modify : `crates/roomboard-core/src/commands.rs:27-73` (`Command`), `:86-118` (`CommandError`, `Display`), `:353-404` (`apply`), fonctions neuves, tests
- Modify : `crates/roomboard-core/src/element.rs` (fin : `RawBackdrop`, `read_backdrop`, `backdrop_view`)
- Modify : `crates/roomboard-core/tests/element_inconnu.rs` (un test)

**Interfaces.**
- Consomme (T3) : `asset::{is_asset_id, AssetInfo, AssetRef}`, `element::{BackdropView, PageView, FIT_WIDTH, finite_positive}`, `query::Bounds`.
- Produit (exact, utilisé par T8, T9) :
  - `Command::AddImage { page: String, asset: AssetRef, w: f64, h: f64, matrix: Transform }`
  - `Command::SetBackdrop { page: String, backdrop: Option<BackdropInput> }`
  - `#[derive(Debug, Clone, PartialEq)] pub struct BackdropInput { pub asset: AssetRef, pub w: f64, pub h: f64, pub fit: String }` (dans `commands.rs`)
  - `CommandError::BadAsset`, `CommandError::BadImage` (messages en tête du plan)
  - `Document::cited_assets(&self) -> Vec<AssetInfo>` (ids conformes, sans doublon, triés) ; `Document::asset(&self, id: &str) -> Option<AssetInfo>` (`None` si l'id n'est pas conforme)
  - `Document::page(&self, id: &str) -> Option<PageView>` avec `backdrop` rempli
- Réutilise : `crates/roomboard-core/src/document.rs:286` (`transact_local`), `crates/roomboard-core/src/commands.rs:585-596` (`done`, `unchanged`) — appelés par `cmd_add_image`, `cmd_set_backdrop`.
- Réutilise : `crates/roomboard-core/src/history.rs:18` (`History::new`) — étendu en `History::new(doc: &Doc, pages: &ArrayRef, meta: &MapRef, assets: &MapRef)`.
- Réutilise : `crates/roomboard-core/src/commands.rs:286` (`positive`), `:291` (`valid_matrix`) — appelés tels quels.
- Réutilise : `crates/roomboard-core/src/element.rs:87-133` (`out_f64`, `out_string`, `transform_to_any`) — appelés tels quels.
- Réutilise : (nouveau, dans `document.rs`, DAK2) `Document::cited_assets(&self) -> Vec<AssetInfo>` ; `Document::asset(&self, id: &str) -> Option<AssetInfo>` — défauts de `AssetInfo::fallback` (module `crates/roomboard-core/src/asset.rs`, T3).

**Patron à ne pas reprendre (concepteur-critique).** Ne pas lister les assets cités en lisant seulement le champ `asset` des
éléments `image` et du `backdrop` : un élément d'une version plus récente (fixture `hologram`, id rangé dans un `Any::Array`)
perdrait son asset au réenregistrement (K4, DAK2, `docs/plans/usage-c2-coeur-cadrage.md:38`, `:289-294`). Ne pas écrire de
métadonnée par défaut dans le document pendant une lecture (`cited_assets` et `asset` sont des lectures pures, D38).
Ne pas ranger la métadonnée ni le fond en `Any::Map` (U3, D25 : `crates/roomboard-core/src/element.rs:135-146`, commentaire de `style_fields`).

**Test et commande bornée.**
`cargo test -p roomboard-core 2>&1 | tail -20` → 0 échec ; noms présents : `add_image_is_one_step_and_writes_meta_once`,
`undo_add_image_removes_new_asset_meta_only`, `add_image_rejects_bad_input_without_transaction`,
`set_backdrop_scales_to_page_width`, `cited_assets_scans_any_depth`, `cited_assets_malformed_meta_falls_back_without_writing`,
`unreadable_backdrop_keeps_page_readable`, `image_and_backdrop_reload_keep_bytes`, `unknown_fixture_cites_asset_in_any_array`.
Tests à garder verts : 16 tests du format, `socle_fixture_resaves_identically` (T1 : prouve qu'aucune racine `assets` ni
champ neuf n'apparaît dans un document sans asset), tests de `history.rs`, `document.rs`, `commands.rs`, `tests/scenarios.rs` ;
`cargo test -p roomboard-wasm 2>&1 | tail -20` → 0 échec.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : `crates/roomboard-core`.
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G4 Jamais `Any::Map` pour une valeur composée écrite ; test « recharger garde les octets » pour chaque valeur composée neuve (métadonnée, élément image, fond : `image_and_backdrop_reload_keep_bytes`).
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-core 2>&1 | tail -20`, `cargo clippy -p roomboard-core --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `schema` 1, `formatVersion` 1 ; `format::save` et `format::load` gardent signature et octets.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Toucher à `format/mod.rs`. Ajouter une dépendance. Ménage implicite des métadonnées non citées (HK8).
Changer la taille de la page dans `SetBackdrop`.

**Terminé quand.** Tests cités verts, clippy (`-p roomboard-core -p roomboard-wasm`) et fmt verts.

**Étapes.**

- [ ] **Étape 1 : racine `assets` dans l'historique (test rouge).** Dans `history.rs`, `setup` devient :

```rust
    fn setup() -> (Doc, ArrayRef, MapRef, History) {
        let doc = Doc::new();
        let pages = doc.get_or_insert_array("pages");
        let meta = doc.get_or_insert_map("meta");
        let assets = doc.get_or_insert_map("assets");
        let h = History::new(&doc, &pages, &meta, &assets);
        (doc, pages, meta, h)
    }

    #[test]
    fn assets_is_in_scope() {
        let (doc, _p, _m, mut h) = setup();
        let assets = doc.get_or_insert_map("assets");
        assets.insert(&mut doc.transact_mut_with(LOCAL), "k", 1.0);
        assert!(h.can_undo());
        assert!(h.undo());
        assert!(assets.get(&doc.transact(), "k").is_none());
    }
```

  `cargo test -p roomboard-core history:: 2>&1 | tail -20` → erreur (4 arguments). Puis `History::new(doc, pages, meta, assets: &MapRef)`
  avec `mgr.expand_scope(doc, assets);` et mise à jour du commentaire. Dans `document.rs` : champ `assets: MapRef` dans
  `Document`, `roots` rend `(MapRef, ArrayRef, MapRef)` avec `doc.get_or_insert_map("assets")`, `bare` rend le quadruplet,
  `assemble(doc, meta, pages, assets)` appelle `History::new(&doc, &pages, &meta, &assets)`, `from_update_v1` prend les trois
  racines par `roots`. Ajouter à `document.rs` :

```rust
    /// Métadonnée écrite seulement si absente (K3), dans la transaction de la commande qui cite l'asset.
    pub(crate) fn insert_asset_meta(&self, txn: &mut TransactionMut, a: &AssetRef) {
        if self.assets.get(txn, &a.id).is_none() {
            self.assets.insert(
                txn,
                a.id.as_str(),
                MapPrelim::from([
                    ("name", In::from(a.name.as_str())),
                    ("mime", In::from(a.mime.as_str())),
                    ("size", In::Any(Any::from(a.size))),
                ]),
            );
        }
    }
```

  `cargo test -p roomboard-core 2>&1 | tail -20` → vert, `socle_fixture_resaves_identically` compris.

- [ ] **Étape 2 : tests de `AddImage` (rouges).** Dans `mod tests` de `commands.rs` :

```rust
    use crate::asset::{AssetInfo, AssetRef};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    fn png() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        }
    }

    fn add_image(d: &mut Document, page: &str, asset: AssetRef, matrix: Transform) -> Result<Change, CommandError> {
        d.apply(Command::AddImage {
            page: page.into(),
            asset,
            w: 640.0,
            h: 480.0,
            matrix,
        })
    }

    #[test]
    fn add_image_is_one_step_and_writes_meta_once() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = add_image(&mut d, &p, png(), [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]).expect("image");
        assert_eq!(c.pages, vec![p.clone()]);
        let a = c.ids[0].clone();
        let v = d.element(&a).expect("vue");
        assert_eq!((v.kind.as_str(), v.transform), ("image", [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]));
        assert_eq!(v.image.map(|i| (i.asset, i.w, i.h)), Some((ABC.to_string(), 640.0, 480.0)));
        let renamed = AssetRef { name: "autre.png".into(), ..png() };
        let b = add_image(&mut d, &p, renamed, IDENTITY).expect("image 2").ids[0].clone();
        assert_eq!(d.element_ids(&p), vec![a, b]);
        assert_eq!(d.cited_assets(), vec![png()]);
        assert_eq!(d.asset(ABC), Some(png()));
    }

    #[test]
    fn undo_add_image_removes_new_asset_meta_only() {
        let mut d = Document::blank();
        let p = first(&d);
        add_image(&mut d, &p, png(), IDENTITY).expect("1");
        add_image(&mut d, &p, png(), IDENTITY).expect("2");
        assert!(d.undo());
        assert_eq!(d.asset(ABC), Some(png()), "annuler la seconde garde la métadonnée");
        assert!(d.undo());
        assert_eq!(d.cited_assets(), Vec::<AssetInfo>::new());
        assert_eq!(d.asset(ABC), Some(AssetInfo::fallback(ABC)), "annuler la première la retire");
    }

    #[test]
    fn add_image_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        let bad = [
            (AssetRef { id: ABC.to_uppercase(), ..png() }, CommandError::BadAsset),
            (AssetRef { id: ABC[..63].into(), ..png() }, CommandError::BadAsset),
            (AssetRef { mime: String::new(), ..png() }, CommandError::BadAsset),
            (AssetRef { size: -1.0, ..png() }, CommandError::BadAsset),
            (AssetRef { size: 1.5, ..png() }, CommandError::BadAsset),
            (AssetRef { size: f64::NAN, ..png() }, CommandError::BadAsset),
        ];
        for (asset, err) in bad {
            assert_eq!(add_image(&mut d, &p, asset, IDENTITY), Err(err));
        }
        for (iw, ih) in [(0.0, 1.0), (1.0, f64::INFINITY), (f64::NAN, 1.0)] {
            assert_eq!(
                d.apply(Command::AddImage { page: p.clone(), asset: png(), w: iw, h: ih, matrix: IDENTITY }),
                Err(CommandError::BadImage)
            );
        }
        assert_eq!(add_image(&mut d, &p, png(), [0.0; 6]), Err(CommandError::BadMatrix));
        assert_eq!(
            add_image(&mut d, "nulle-part", png(), IDENTITY),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
        assert!(d.cited_assets().is_empty());
    }

    #[test]
    fn image_moves_hits_and_eraser_ignores_it() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = add_image(&mut d, &p, png(), [1.0, 0.0, 0.0, 1.0, 100.0, 100.0]).expect("image").ids[0].clone();
        assert_eq!(d.hit_test(&p, 400.0, 300.0, 0.0), Some(a.clone()));
        let w = writes(&d);
        let e = d
            .apply(Command::Erase { page: p.clone(), path: vec![100.0, 300.0, 740.0, 300.0], radius: 10.0, mode: EraseMode::Object })
            .expect("gomme");
        assert!(e.removed.is_empty());
        assert_eq!(w.since(), 0);
        d.apply(Command::Transform { ids: vec![a.clone()], matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0] }).expect("transform");
        assert_eq!(d.element(&a).expect("vue").transform, [1.0, 0.0, 0.0, 1.0, 110.0, 100.0]);
        d.apply(Command::Delete { ids: vec![a] }).expect("delete");
        assert_eq!(d.asset(ABC), Some(png()), "supprimer l'image laisse sa métadonnée (K3)");
        assert!(d.cited_assets().is_empty());
    }
```

  `cargo test -p roomboard-core commands:: 2>&1 | tail -20` → erreurs (`AddImage`, `BadAsset`, `cited_assets` absents).

- [ ] **Étape 3 : implémenter `AddImage`.** Dans `commands.rs` : variants `AddImage { page: String, asset: AssetRef, w: f64, h: f64, matrix: Transform }`
  et `SetBackdrop { page: String, backdrop: Option<BackdropInput> }`, `BackdropInput` (bloc Interfaces), erreurs `BadAsset`,
  `BadImage` et leurs messages dans `Display` :

```rust
            CommandError::BadAsset => write!(
                f,
                "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)"
            ),
            CommandError::BadImage => write!(
                f,
                "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)"
            ),
```

  Branches de `apply` :

```rust
            Command::AddImage {
                page,
                asset,
                w,
                h,
                matrix,
            } => self.cmd_add_image(&page, &asset, [w, h], &matrix),
            Command::SetBackdrop { page, backdrop } => self.cmd_set_backdrop(&page, backdrop.as_ref()),
```

  Fonctions (à côté de `positive`) et méthode :

```rust
/// Référence d'asset : empreinte conforme, type non vide, taille entière finie ≥ 0 (K5).
fn valid_asset(a: &AssetRef) -> bool {
    is_asset_id(&a.id) && !a.mime.is_empty() && a.size.is_finite() && a.size >= 0.0 && a.size.fract() == 0.0
}
```

```rust
    /// Image (U5, K5) : une étape ; la métadonnée entre dans la même transaction si elle est absente (K3).
    fn cmd_add_image(
        &mut self,
        page: &str,
        asset: &AssetRef,
        size: [f64; 2],
        m: &Transform,
    ) -> Result<Change, CommandError> {
        let [w, h] = size;
        if !valid_asset(asset) {
            return Err(CommandError::BadAsset);
        }
        if !positive(w) || !positive(h) {
            return Err(CommandError::BadImage);
        }
        if !valid_matrix(m) {
            return Err(CommandError::BadMatrix);
        }
        let elements = self.page_elements_or_err(page)?;
        let id = yrs::uuid_v4().to_string();
        let fields = MapPrelim::from([
            ("id", In::from(id.as_str())),
            ("kind", In::from("image")),
            ("transform", In::Any(transform_to_any(m))),
            ("asset", In::from(asset.id.as_str())),
            ("w", In::Any(Any::from(w))),
            ("h", In::Any(Any::from(h))),
        ]);
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields);
            self.insert_asset_meta(&mut txn, asset);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }
```

- [ ] **Étape 4 : assets cités et `asset(id)` (tests rouges puis code).** Tests dans `mod tests` de `document.rs`
  (réutiliser `push_raw`, `translate`, `ABC` posés par T3) :

```rust
    use std::collections::HashMap;
    use std::sync::Arc;
    use yrs::{Text, TextPrelim};

    const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const ZERO: &str = "0000000000000000000000000000000000000000000000000000000000000000";

    #[test]
    fn cited_assets_scans_any_depth() {
        let d = Document::blank();
        let nested = MapPrelim::from([(
            "deep",
            In::Array(ArrayPrelim::from(vec![In::from(ZERO), In::from("pas-un-asset")])),
        )]);
        push_raw(
            &d,
            vec![
                ("id", In::from("u1")),
                ("kind", In::from("model3d")),
                ("nested", In::Map(nested)),
                ("refs", In::Any(Any::Array(vec![Any::from(ABC), Any::from(ABC)].into()))),
                (
                    "legacy",
                    In::Any(Any::Map(Arc::new(HashMap::from([("src".to_string(), Any::from(EMPTY))])))),
                ),
                ("content", In::Text(TextPrelim::new(""))),
            ],
        );
        let text = {
            let txn = d.read();
            let found = d.find_element(&txn, "u1").expect("u1");
            match found.element.get(&txn, "content") {
                Some(Out::YText(t)) => t,
                _ => panic!("texte"),
            }
        };
        {
            let mut txn = d.doc.transact_mut();
            let other = "1111111111111111111111111111111111111111111111111111111111111111";
            text.insert(&mut txn, 0, other); // le texte lui-même n'est pas balayé
            let attrs = HashMap::from([(Arc::from("href"), Any::from("2222222222222222222222222222222222222222222222222222222222222222"))]);
            text.insert_with_attributes(&mut txn, 64, "lien", attrs);
        }
        let ids: Vec<String> = d.cited_assets().into_iter().map(|a| a.id).collect();
        assert_eq!(
            ids,
            vec![
                ZERO.to_string(),
                "2222222222222222222222222222222222222222222222222222222222222222".to_string(),
                ABC.to_string(),
                EMPTY.to_string(),
            ]
        );
    }

    #[test]
    fn cited_assets_malformed_meta_falls_back_without_writing() {
        let d = Document::blank();
        push_raw(&d, vec![("id", In::from("u1")), ("kind", In::from("x")), ("a", In::from(ABC)), ("b", In::from(EMPTY)), ("c", In::from(ZERO))]);
        {
            let mut txn = d.doc.transact_mut();
            d.assets.insert(&mut txn, ABC, "pas une map");
            d.assets.insert(
                &mut txn,
                EMPTY,
                MapPrelim::from([("name", In::from("fond.jpg")), ("mime", In::from("")), ("size", In::from("12"))]),
            );
            d.assets.insert(&mut txn, "CLE-NON-CONFORME", MapPrelim::from([("name", In::from("x"))]));
        }
        let before = d.encode_v1();
        let cited = d.cited_assets();
        assert_eq!(cited[0], AssetInfo::fallback(ZERO));
        assert_eq!(cited[1], AssetInfo::fallback(ABC));
        assert_eq!(cited[2], AssetInfo { name: "fond.jpg".into(), ..AssetInfo::fallback(EMPTY) });
        assert_eq!(cited.len(), 3, "une clé non conforme de `assets` n'est jamais citée");
        assert_eq!(d.asset("CLE-NON-CONFORME"), None);
        assert!(d.encode_v1() == before, "une lecture n'écrit rien");
    }
```

  Ajouter les imports manquants du module de tests (`ArrayPrelim`, `AssetInfo`). Le test d'embed : si
  `insert_embed` est simple à appeler dans yrs 0.28.1, ajouter un embed `Any::Map{ "src": <id> }` et son id attendu ; sinon
  le noter dans le rapport (les attributs prouvent déjà le parcours du `Y.Text`).
  Code dans `document.rs` (imports `std::collections::BTreeSet`, `yrs::types::text::YChange`, `yrs::{Any, Text}`,
  `crate::asset::{is_asset_id, AssetInfo, AssetRef}`) :

```rust
    /// Assets cités par le document (K4, DAK2) : toute chaîne conforme de `pages`, à toute profondeur ; sans doublon,
    /// triés ; métadonnée de `assets` ou défauts, rendus sans écrire.
    pub fn cited_assets(&self) -> Vec<AssetInfo> {
        let txn = self.doc.transact();
        let mut ids = BTreeSet::new();
        collect_out(&txn, &Out::YArray(self.pages.clone()), &mut ids);
        ids.iter().map(|id| self.asset_info(&txn, id)).collect()
    }

    /// Métadonnée d'un asset ; `None` si l'id n'est pas conforme ; défauts si l'entrée est absente ou mal formée.
    pub fn asset(&self, id: &str) -> Option<AssetInfo> {
        if !is_asset_id(id) {
            return None;
        }
        let txn = self.doc.transact();
        Some(self.asset_info(&txn, id))
    }

    /// Défauts champ par champ (K4) : `name` chaîne, `mime` chaîne non vide, `size` nombre fini ≥ 0.
    fn asset_info<T: ReadTxn>(&self, txn: &T, id: &str) -> AssetInfo {
        let mut info = AssetInfo::fallback(id);
        if let Some(Out::YMap(m)) = self.assets.get(txn, id) {
            if let Some(name) = out_string(m.get(txn, "name")) {
                info.name = name;
            }
            if let Some(mime) = out_string(m.get(txn, "mime")).filter(|s| !s.is_empty()) {
                info.mime = mime;
            }
            if let Some(size) = out_f64(m.get(txn, "size")).filter(|v| v.is_finite() && *v >= 0.0) {
                info.size = size;
            }
        }
        info
    }
```

  Fonctions libres du module :

```rust
fn collect_any(a: &Any, acc: &mut BTreeSet<String>) {
    match a {
        Any::String(s) if is_asset_id(s) => {
            acc.insert(s.to_string());
        }
        Any::Array(items) => items.iter().for_each(|i| collect_any(i, acc)),
        Any::Map(m) => m.values().for_each(|v| collect_any(v, acc)),
        _ => {}
    }
}

/// Parcours générique (K4) : `Y.Map`, `Y.Array`, valeurs `Any`, embeds et attributs des `Y.Text` ; le texte lui-même
/// (morceaux `Any::String` insérés) n'est pas balayé.
fn collect_out<T: ReadTxn>(txn: &T, o: &Out, acc: &mut BTreeSet<String>) {
    match o {
        Out::Any(a) => collect_any(a, acc),
        Out::YMap(m) => {
            for (_, v) in m.iter(txn) {
                collect_out(txn, &v, acc);
            }
        }
        Out::YArray(a) => {
            for v in a.iter(txn) {
                collect_out(txn, &v, acc);
            }
        }
        Out::YText(t) => {
            for d in t.diff(txn, YChange::identity) {
                if !matches!(d.insert, Out::Any(Any::String(_))) {
                    collect_out(txn, &d.insert, acc);
                }
                if let Some(attrs) = d.attributes {
                    attrs.values().for_each(|v| collect_any(v, acc));
                }
            }
        }
        _ => {}
    }
}
```

  Dans `tests/element_inconnu.rs`, ajouter :

```rust
#[test]
fn unknown_fixture_cites_asset_in_any_array() {
    let d = load(&unknown_bytes()).expect("load");
    let cited = d.cited_assets();
    assert_eq!(cited.len(), 1);
    assert_eq!(cited[0], roomboard_core::asset::AssetInfo::fallback(ABC));
}
```

- [ ] **Étape 5 : fond de page (tests rouges).** Dans `mod tests` de `commands.rs` :

```rust
    fn backdrop(asset: AssetRef, w: f64, h: f64, fit: &str) -> Option<BackdropInput> {
        Some(BackdropInput { asset, w, h, fit: fit.into() })
    }

    #[test]
    fn set_backdrop_scales_to_page_width() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d.apply(Command::SetBackdrop { page: p.clone(), backdrop: backdrop(png(), 1000.0, 500.0, "width") }).expect("fond");
        assert_eq!(c.pages, vec![p.clone()]);
        let v = d.page(&p).expect("page");
        assert_eq!((v.width, v.height), (1920.0, 1080.0));
        let b = v.backdrop.expect("fond");
        assert_eq!((b.asset.as_str(), b.kind.as_str(), b.fit.as_str()), (ABC, "image", "width"));
        assert_eq!((b.w, b.h), (Some(1000.0), Some(500.0)));
        assert_eq!(b.rect, Some(crate::query::Bounds { x0: 0.0, y0: 0.0, x1: 1920.0, y1: 960.0 }));
        assert_eq!(d.hit_test(&p, 960.0, 480.0, 0.0), None);
        assert!(d.element_ids(&p).is_empty());
        assert_eq!(d.cited_assets(), vec![png()]);
    }

    #[test]
    fn set_backdrop_same_value_or_none_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        d.apply(Command::SetBackdrop { page: p.clone(), backdrop: None }).expect("rien à retirer");
        assert_eq!(w.since(), 0);
        d.apply(Command::SetBackdrop { page: p.clone(), backdrop: backdrop(png(), 1000.0, 500.0, "width") }).expect("fond");
        let w = writes(&d);
        let v = d.version();
        let c = d.apply(Command::SetBackdrop { page: p.clone(), backdrop: backdrop(png(), 1000.0, 500.0, "width") }).expect("même");
        assert_eq!((c.version, w.since()), (v, 0));
    }

    #[test]
    fn remove_backdrop_then_undo_restores_it() {
        let mut d = Document::blank();
        let p = first(&d);
        d.apply(Command::SetBackdrop { page: p.clone(), backdrop: backdrop(png(), 1000.0, 500.0, "width") }).expect("fond");
        d.apply(Command::SetBackdrop { page: p.clone(), backdrop: None }).expect("retrait");
        assert_eq!(d.page(&p).expect("page").backdrop, None);
        assert!(d.undo());
        assert_eq!(d.page(&p).expect("page").backdrop.and_then(|b| b.rect).map(|r| r.y1), Some(960.0));
    }

    #[test]
    fn set_backdrop_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        for (b, err) in [
            (backdrop(png(), 10.0, 10.0, "contain"), CommandError::BadImage),
            (backdrop(png(), 0.0, 10.0, "width"), CommandError::BadImage),
            (backdrop(AssetRef { mime: String::new(), ..png() }, 10.0, 10.0, "width"), CommandError::BadAsset),
        ] {
            assert_eq!(d.apply(Command::SetBackdrop { page: p.clone(), backdrop: b }), Err(err));
        }
        assert_eq!(
            d.apply(Command::SetBackdrop { page: "nulle-part".into(), backdrop: None }),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
    }

    #[test]
    fn new_asset_errors_have_readable_messages() {
        assert!(CommandError::BadAsset.to_string().starts_with("asset invalide"));
        assert!(CommandError::BadImage.to_string().contains("« width »"));
    }

    /// G4 : métadonnée, élément image et fond en champs de `Y.Map` ; trente rechargements gardent les octets.
    #[test]
    fn image_and_backdrop_reload_keep_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None };
        let mut d = Document::blank();
        let p = first(&d);
        add_image(&mut d, &p, png(), IDENTITY).expect("image");
        let jpg = AssetRef { id: EMPTY.into(), name: "fond.jpg".into(), mime: "image/jpeg".into(), size: 0.0 };
        d.apply(Command::SetBackdrop { page: p, backdrop: backdrop(jpg, 1000.0, 500.0, "width") }).expect("fond");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
        }
    }
```

  Et dans `mod tests` de `document.rs` (Review Focus 2) :

```rust
    #[test]
    fn unreadable_backdrop_keeps_page_readable() {
        let d = Document::blank();
        let p = d.page_ids()[0].clone();
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        let set = |v: In| page.insert(&mut d.doc.transact_mut(), "backdrop", v);
        set(MapPrelim::from([("kind", In::from("image")), ("w", In::from(10.0)), ("h", In::from(10.0))]).into());
        assert_eq!(d.page(&p).expect("page lisible").backdrop, None);
        set(In::from("pas une map"));
        assert_eq!(d.page(&p).expect("page lisible").backdrop, None);
        set(MapPrelim::from([("asset", In::from(ABC)), ("kind", In::from("pdf-page")), ("fit", In::from("contain")), ("w", In::from(1000.0)), ("h", In::from(500.0))]).into());
        let b = d.page(&p).expect("page").backdrop.expect("fond d'une version plus récente");
        assert_eq!((b.kind.as_str(), b.fit.as_str()), ("pdf-page", "contain"));
        assert_eq!(b.rect.map(|r| r.y1), Some(960.0));
        set(MapPrelim::from([("asset", In::from(ABC)), ("kind", In::from("image"))]).into());
        let b = d.page(&p).expect("page").backdrop.expect("fond sans boîte");
        assert_eq!((b.w, b.h, b.rect), (None, None, None));
    }
```

  (`In::Map(prelim)` à la place de `.into()` si la conversion n'existe pas.)

- [ ] **Étape 6 : implémenter le fond.** Dans `element.rs` :

```rust
/// Champs bruts du fond d'une page (K9) ; `None` si la page n'a pas de champ `backdrop`.
pub(crate) struct RawBackdrop {
    pub asset: Option<String>,
    pub kind: Option<String>,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub fit: Option<String>,
}

pub(crate) fn read_backdrop<T: ReadTxn>(txn: &T, page: &MapRef) -> Option<RawBackdrop> {
    Some(match page.get(txn, "backdrop")? {
        Out::YMap(b) => RawBackdrop {
            asset: out_string(b.get(txn, "asset")),
            kind: out_string(b.get(txn, "kind")),
            w: out_f64(b.get(txn, "w")),
            h: out_f64(b.get(txn, "h")),
            fit: out_string(b.get(txn, "fit")),
        },
        _ => RawBackdrop { asset: None, kind: None, w: None, h: None, fit: None },
    })
}

/// Vue du fond (K6, K9, DAK4) : `None` sans asset conforme ; `rect` calé sur la largeur de la page (coin en (0, 0),
/// hauteur = h × largeur / w) dès que `w` et `h` sont finis > 0, quel que soit `fit`.
pub(crate) fn backdrop_view(r: RawBackdrop, page_width: f64) -> Option<BackdropView> {
    let asset = r.asset.filter(|a| is_asset_id(a))?;
    let w = r.w.filter(|v| finite_positive(*v));
    let h = r.h.filter(|v| finite_positive(*v));
    let rect = match (w, h) {
        (Some(w), Some(h)) => Some(Bounds { x0: 0.0, y0: 0.0, x1: page_width, y1: h * page_width / w }),
        _ => None,
    };
    Some(BackdropView { asset, kind: r.kind.unwrap_or_default(), w, h, fit: r.fit.unwrap_or_default(), rect })
}
```

  `Document::page` : `let width = out_f64(m.get(&txn, "width"))?;` puis
  `backdrop: read_backdrop(&txn, &m).and_then(|r| backdrop_view(r, width))`. Dans `commands.rs` :

```rust
    /// Fond de page (U6, K6) : une étape ; `None` retire ; même valeur, ou rien à retirer : aucune transaction (D38) ;
    /// seul `fit: "width"` s'écrit ; la taille de la page ne change jamais.
    fn cmd_set_backdrop(&mut self, page: &str, input: Option<&BackdropInput>) -> Result<Change, CommandError> {
        if let Some(b) = input {
            if !valid_asset(&b.asset) {
                return Err(CommandError::BadAsset);
            }
            if !positive(b.w) || !positive(b.h) || b.fit != FIT_WIDTH {
                return Err(CommandError::BadImage);
            }
        }
        let (page_map, current) = {
            let txn = self.read();
            let (_, m) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let current = read_backdrop(&txn, &m);
            (m, current)
        };
        let same = match (input, &current) {
            (None, None) => true,
            (Some(b), Some(r)) => {
                r.asset.as_deref() == Some(b.asset.id.as_str())
                    && r.kind.as_deref() == Some("image")
                    && r.w == Some(b.w)
                    && r.h == Some(b.h)
                    && r.fit.as_deref() == Some(FIT_WIDTH)
            }
            _ => false,
        };
        if same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match input {
                None => {
                    page_map.remove(&mut txn, "backdrop");
                }
                Some(b) => {
                    page_map.insert(
                        &mut txn,
                        "backdrop",
                        MapPrelim::from([
                            ("asset", In::from(b.asset.id.as_str())),
                            ("kind", In::from("image")),
                            ("w", In::Any(Any::from(b.w))),
                            ("h", In::Any(Any::from(b.h))),
                            ("fit", In::from(FIT_WIDTH)),
                        ]),
                    );
                    self.insert_asset_meta(&mut txn, &b.asset);
                }
            }
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ..Default::default()
        }))
    }
```

- [ ] **Étape 7 : vérifier le vert.** `cargo test -p roomboard-core 2>&1 | tail -20` → 0 échec, noms de la ligne de preuve
  présents (`cargo test -p roomboard-core -- --list 2>/dev/null | grep -c "add_image\|backdrop\|cited_assets"` ≥ 9) ;
  `cargo test -p roomboard-wasm 2>&1 | tail -20` ; `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -5` ;
  `cargo fmt --all --check`.

- [ ] **Étape 8 : commit.**

```bash
cd "$WT" && git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/src/history.rs && \
git add crates/roomboard-core/src/commands.rs && git add crates/roomboard-core/src/element.rs && \
git add crates/roomboard-core/tests/element_inconnu.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): add image and backdrop commands, asset metadata and cited assets" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests ajoutés, sort de l'embed `Y.Text`, cinq lignes `Réutilisation :`.

---

### Tâche T7 — Crate `roomboard-formats` : conteneur des assets

**Objectif.** Crate natif `crates/roomboard-formats`, module `container` : `sha256_hex`, `write` (trie, dédoublonne,
recalcule l'empreinte et refuse un écart, `stored` pour les types compressés), `read` (contrôle du manifeste d'abord par
`format::open`, empreinte recalculée, entrées douteuses ignorées avec avertissement) ; empreinte de `socle-v1.roomboard`
figée ; `THIRD_PARTY_NOTICES.md` (K1, K11, K12, K14 ; S1, S5).

**Fichiers.**
- Modify : `Cargo.toml:3` (`members` : ajouter `"crates/roomboard-formats"`), `Cargo.lock` (régénéré par cargo)
- Create : `crates/roomboard-formats/Cargo.toml`, `crates/roomboard-formats/src/lib.rs`, `crates/roomboard-formats/src/container.rs`
- Create : `crates/roomboard-formats/tests/container.rs`
- Create : `THIRD_PARTY_NOTICES.md` (racine)

**Interfaces.**
- Consomme : T2 (`format::{open, Opened, write_parts, entry_options, save_parts, load_parts, Parts, FormatError, zip}`),
  T3 (`asset::is_asset_id`), T1 (fixture `socle-v1.roomboard`).
- Produit (exact, utilisé par T9) :
  - `pub fn sha256_hex(bytes: &[u8]) -> String`
  - `#[derive(Debug, Clone, Copy)] pub struct AssetBytes<'a> { pub id: &'a str, pub mime: &'a str, pub bytes: &'a [u8] }`
  - `#[derive(Debug, Clone, PartialEq)] pub struct Unpacked { pub parts: Parts, pub assets: Vec<(String, Vec<u8>)>, pub warnings: Vec<String> }`
  - `pub fn extension(mime: &str) -> (&'static str, bool)` (extension, stored)
  - `pub fn write(parts: &Parts, assets: &[AssetBytes<'_>]) -> Result<Vec<u8>, FormatError>`
  - `pub fn read(file: &[u8]) -> Result<Unpacked, FormatError>`
  - `pub const ASSETS_DIR: &str = "assets/"`
- Réutilise : `crates/roomboard-core/src/format/mod.rs:63` — `entry_options(stored: bool) -> SimpleFileOptions` pour chaque entrée `assets/`.
- Réutilise : `format/mod.rs:78`, `:113` — `Parts`, `save_parts`, `load_parts` (tests du conteneur).
- Réutilise : `format/mod.rs:92-97` — `write_parts(parts: &Parts) -> Result<ZipWriter<Cursor<Vec<u8>>>, FormatError>` appelé d'abord par `container::write` ; `pub use zip;` (aucune dépendance `zip` propre).
- Réutilise : `format/mod.rs:113-134` — `open(bytes: &[u8]) -> Result<Opened<'_>, FormatError>` appelé par `container::read`.
- Réutilise : `crates/roomboard-core/src/asset.rs` — `is_asset_id(s: &str) -> bool`.
- Réutilise : (nouveau crate, K1, DAK1) `roomboard_formats::container` — `sha256_hex`, `AssetBytes`, `write`, `read`, `Unpacked` ; ne contient aucune écriture ni lecture du manifeste et de `document.ybin`.

**Patron à ne pas reprendre (concepteur-critique).** (1) Réécrire dans le conteneur l'ouverture du ZIP, l'écriture du
manifeste et de `document.ybin` ou leurs contrôles (`crates/roomboard-core/src/format/mod.rs` de T2 : `write_parts`,
`open`) : c'est la duplication que l'arbitrage B1 a écartée (carnet de relecture, F1). (2) Faire confiance à l'id reçu :
`write` recalcule `sha256_hex(bytes)` et refuse un écart (arbitrage I2) ; `read` le recalcule aussi et ignore l'entrée (K11).
(3) Écrire les assets dans l'ordre reçu : trier par id (U4, K12).

**Test et commande bornée.**
`cargo test -p roomboard-formats --test container 2>&1 | tail -20` → ≥ 12 passed, `socle_fixture_hash_is_pinned`,
`container_without_assets_equals_core_save`, `read_ignores_bad_asset_entries_with_warnings` présents ;
`cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5` (le membre neuf est couvert) ;
`cargo tree -p roomboard-wasm -e normal 2>/dev/null | grep -c sha2` → `0` ; `cargo test --workspace 2>&1 | tail -20` → 0 échec.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : crate neuf `crates/roomboard-formats` (dérogation K1, sans liaison Wasm), `Cargo.toml` racine et `Cargo.lock`, `THIRD_PARTY_NOTICES.md`.
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G5 Aucune dépendance AGPL/GPL/LGPL. Module Wasm principal ≤ 1,5 Mo : `sha2` n'entre pas dans `roomboard-wasm`.
- G6 Fixtures synthétiques seulement ; `~/telechargements-roomboard/` jamais commité.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-formats 2>&1 | tail -20`, `cargo clippy -p roomboard-formats --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `formatVersion` 1 ; sans asset, `container::write` donne les mêmes octets que `format::save`.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Dépendance `zip` propre au crate (prendre `roomboard_core::format::zip`). Liaison Wasm (`roomboard-formats-wasm`,
partie « reste »). Toucher `scripts/verifier.sh` ou un script de contrôle des licences (HK5). Toucher au cœur.
Conflit attendu sur `members` avec le lot 5b : ne rien anticiper ici, il se résout au rebase en gardant les deux lignes.

**Terminé quand.** Tests verts, clippy `--workspace` et fmt verts, `sha2` absent de l'arbre de `roomboard-wasm`, notices écrites.

**Étapes.**

- [ ] **Étape 1 : crate vide et tests (rouges).** `Cargo.toml` racine :
  `members = ["crates/roomboard-core", "crates/roomboard-wasm", "crates/roomboard-formats"]`. Créer
  `crates/roomboard-formats/Cargo.toml` :

```toml
[package]
name = "roomboard-formats"
version.workspace = true
edition.workspace = true
license.workspace = true

[dependencies]
roomboard-core = { path = "../roomboard-core" }
sha2 = "0.10"
```

  `crates/roomboard-formats/src/lib.rs` :

```rust
//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets. Rust pur,
//! testé en natif ; la liaison Wasm et le Worker viennent avec la partie « reste » de C2.
pub mod container;
```

  `crates/roomboard-formats/src/container.rs` : seulement la ligne de tête `//! Conteneur des assets (K11, K12).`
  Créer `crates/roomboard-formats/tests/container.rs` :

```rust
//! Conteneur `.roomboard` avec assets (U4, K11, K12, S1, S5).
use std::io::{Cursor, Read, Write};

use roomboard_core::document::Document;
use roomboard_core::format::zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};
use roomboard_core::format::{self, FormatError, SaveMeta, DOCUMENT, MANIFEST};
use roomboard_formats::container::{self, sha256_hex, AssetBytes};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
/// Relevé une fois par `sha256sum crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (étape 4).
const SOCLE_SHA256: &str = "A_RELEVER";
const SOCLE: &[u8] = include_bytes!("../../roomboard-core/tests/fixtures/socle-v1.roomboard");

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None }
}

fn parts() -> format::Parts {
    let mut d = Document::blank();
    d.add_page();
    format::save_parts(&d, &meta()).expect("parts")
}

fn names(file: &[u8]) -> Vec<String> {
    let a = ZipArchive::new(Cursor::new(file)).expect("zip");
    a.file_names().map(|n| n.expect("nom").into_owned()).collect()
}

fn zip_of(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut w = ZipWriter::new(Cursor::new(Vec::new()));
    for (name, bytes) in entries {
        w.start_file(*name, format::entry_options(false)).expect("entrée");
        w.write_all(bytes).expect("écriture");
    }
    w.finish().expect("fin").into_inner()
}

#[test]
fn sha256_hex_matches_common_vectors() {
    assert_eq!(sha256_hex(b"abc"), ABC);
    assert_eq!(sha256_hex(b""), EMPTY);
}

#[test]
fn container_without_assets_equals_core_save() {
    let mut d = Document::blank();
    d.add_page();
    let p = format::save_parts(&d, &meta()).expect("parts");
    assert!(container::write(&p, &[]).expect("write") == format::save(&d, &meta()).expect("save"));
}

#[test]
fn assets_are_sorted_typed_and_compressed_by_type() {
    let png = b"png-synthetique".to_vec();
    let svg = b"<svg xmlns='http://www.w3.org/2000/svg'/>".to_vec();
    let raw = b"octets".to_vec();
    let ids = [sha256_hex(&png), sha256_hex(&svg), sha256_hex(&raw)];
    let assets = [
        AssetBytes { id: &ids[0], mime: "image/png", bytes: &png },
        AssetBytes { id: &ids[1], mime: "image/svg+xml", bytes: &svg },
        AssetBytes { id: &ids[2], mime: "application/octet-stream", bytes: &raw },
    ];
    let reversed: Vec<AssetBytes<'_>> = assets.iter().rev().copied().collect();
    let a = container::write(&parts(), &assets).expect("write");
    assert!(a == container::write(&parts(), &reversed).expect("write 2"), "l'ordre reçu change le fichier");
    let mut expected: Vec<(String, &str, CompressionMethod)> = vec![
        (ids[0].clone(), "png", CompressionMethod::Stored),
        (ids[1].clone(), "svg", CompressionMethod::Deflated),
        (ids[2].clone(), "bin", CompressionMethod::Deflated),
    ];
    expected.sort_by(|x, y| x.0.cmp(&y.0));
    let mut want = vec![MANIFEST.to_string(), DOCUMENT.to_string()];
    want.extend(expected.iter().map(|(id, ext, _)| format!("assets/{id}.{ext}")));
    assert_eq!(names(&a), want);
    let mut z = ZipArchive::new(Cursor::new(a.as_slice())).expect("zip");
    for (id, ext, method) in &expected {
        let f = z.by_name(&format!("assets/{id}.{ext}")).expect("entrée");
        assert_eq!(f.compression(), *method, "{ext}");
        assert!(f.last_modified() == Some(DateTime::default()), "{ext} daté");
    }
}

#[test]
fn duplicate_id_is_written_once() {
    let a = AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" };
    let file = container::write(&parts(), &[a, a]).expect("write");
    assert_eq!(names(&file).len(), 3);
}

#[test]
fn mismatched_hash_refuses_write() {
    let err = container::write(&parts(), &[AssetBytes { id: ABC, mime: "image/png", bytes: b"abd" }])
        .err()
        .expect("refus");
    assert!(matches!(&err, FormatError::Corrupt(m) if m.contains("empreinte")), "{err}");
}

#[test]
fn non_conforming_id_refuses_write() {
    let upper = ABC.to_uppercase();
    assert!(matches!(
        container::write(&parts(), &[AssetBytes { id: &upper, mime: "image/png", bytes: b"abc" }]),
        Err(FormatError::Corrupt(_))
    ));
}

#[test]
fn extension_table_and_default() {
    for (mime, ext, stored) in [
        ("image/png", "png", true),
        ("image/jpeg", "jpg", true),
        ("image/gif", "gif", true),
        ("image/webp", "webp", true),
        ("image/bmp", "bmp", false),
        ("image/x-icon", "ico", false),
        ("image/vnd.microsoft.icon", "ico", false),
        ("image/svg+xml", "svg", false),
        ("image/avif", "avif", true),
        ("image/heic", "heic", true),
        ("image/tiff", "tif", false),
        ("application/pdf", "pdf", true),
        ("video/mp4", "mp4", true),
        ("video/webm", "webm", true),
        ("application/octet-stream", "bin", false),
        ("text/plain", "bin", false),
    ] {
        assert_eq!(container::extension(mime), (ext, stored), "{mime}");
    }
}

#[test]
fn read_round_trip_keeps_parts_and_bytes() {
    let p = parts();
    let file = container::write(&p, &[AssetBytes { id: EMPTY, mime: "image/jpeg", bytes: b"" }, AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" }])
        .expect("write");
    let u = container::read(&file).expect("read");
    assert_eq!(u.parts, p);
    assert_eq!(u.assets, vec![(ABC.to_string(), b"abc".to_vec()), (EMPTY.to_string(), Vec::new())]);
    assert!(u.warnings.is_empty(), "{:?}", u.warnings);
    assert!(container::write(&u.parts, &[AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" }, AssetBytes { id: EMPTY, mime: "image/jpeg", bytes: b"" }]).expect("rewrite") == file);
}

#[test]
fn read_ignores_bad_asset_entries_with_warnings() {
    let p = parts();
    let wrong = format!("assets/{ABC}.png");
    let dup = format!("assets/{EMPTY}.jpg");
    let dup2 = format!("assets/{EMPTY}.bin");
    let sub = format!("assets/x/{ABC}.png");
    let file = zip_of(&[
        (MANIFEST, &p.manifest),
        (DOCUMENT, &p.ybin),
        (&wrong, b"pas abc"),
        ("assets/pasunhash.png", b"abc"),
        (&dup, b""),
        (&dup2, b""),
        (&sub, b"abc"),
        ("autre.txt", b"x"),
    ]);
    let u = container::read(&file).expect("la lecture ne doit pas échouer");
    assert_eq!(u.assets, vec![(EMPTY.to_string(), Vec::new())]);
    assert_eq!(u.warnings.len(), 4, "{:?}", u.warnings);
    assert!(u.warnings.iter().all(|w| w.contains("assets/")), "{:?}", u.warnings);
}

#[test]
fn read_newer_format_without_document_is_newer() {
    let manifest = br#"{"format":"roomboard","formatVersion":2,"schema":1,"appVersion":"9","created":"c","modified":"m"}"#;
    assert_eq!(
        container::read(&zip_of(&[(MANIFEST, manifest)])).err(),
        Some(FormatError::NewerVersion { found: 2, supported: 1 })
    );
}

#[test]
fn socle_fixture_hash_is_pinned() {
    assert_eq!(sha256_hex(SOCLE), SOCLE_SHA256, "socle-v1.roomboard a changé : la garde S5 n'est plus celle de main");
}

#[test]
fn socle_fixture_opens_by_read_and_load_parts() {
    let u = container::read(SOCLE).expect("read");
    assert!(u.assets.is_empty() && u.warnings.is_empty());
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    assert_eq!(d.page_count(), 2);
}

#[test]
fn core_load_ignores_assets() {
    let mut d = Document::blank();
    d.add_page();
    let file = container::write(&format::save_parts(&d, &meta()).expect("parts"), &[AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" }])
        .expect("write");
    assert_eq!(format::load(&file).expect("Ouvrir des lots 5a et 5b").page_ids(), d.page_ids());
}
```

  `Read` peut être inutile : retirer l'import si clippy le signale. `cargo test -p roomboard-formats --test container 2>&1 | tail -20`
  → erreurs (`sha256_hex`, `write`, `read` absents).

- [ ] **Étape 2 : implémenter `container.rs`.**

```rust
//! Conteneur `.roomboard` avec assets (U4, K11, K12, DAK1) : n'écrit et ne lit que les entrées
//! `assets/<sha256>.<ext>` ; le manifeste et `document.ybin` passent par le cœur (`format::write_parts`,
//! `format::open`), jamais recopiés ici.
use std::collections::BTreeMap;
use std::io::{Read, Write};

use roomboard_core::asset::is_asset_id;
use roomboard_core::format::{self, FormatError, Parts};
use sha2::{Digest, Sha256};

pub const ASSETS_DIR: &str = "assets/";

/// (type MIME, extension, stored) : « stored » pour les contenus déjà compressés (K12).
const TYPES: [(&str, &str, bool); 14] = [
    ("image/png", "png", true),
    ("image/jpeg", "jpg", true),
    ("image/gif", "gif", true),
    ("image/webp", "webp", true),
    ("image/bmp", "bmp", false),
    ("image/x-icon", "ico", false),
    ("image/vnd.microsoft.icon", "ico", false),
    ("image/svg+xml", "svg", false),
    ("image/avif", "avif", true),
    ("image/heic", "heic", true),
    ("image/tiff", "tif", false),
    ("application/pdf", "pdf", true),
    ("video/mp4", "mp4", true),
    ("video/webm", "webm", true),
];

#[derive(Debug, Clone, Copy)]
pub struct AssetBytes<'a> {
    pub id: &'a str,
    pub mime: &'a str,
    pub bytes: &'a [u8],
}

#[derive(Debug, Clone, PartialEq)]
pub struct Unpacked {
    pub parts: Parts,
    /// Triés par empreinte.
    pub assets: Vec<(String, Vec<u8>)>,
    /// Entrées `assets/` ignorées, en français (K11, HK3).
    pub warnings: Vec<String>,
}

/// Empreinte SHA-256 en hexadécimal minuscule (64 caractères).
pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes).iter().map(|b| format!("{b:02x}")).collect()
}

/// Extension et méthode d'une entrée ; `bin` et deflate pour un type inconnu.
pub fn extension(mime: &str) -> (&'static str, bool) {
    TYPES
        .iter()
        .find(|(m, _, _)| *m == mime)
        .map_or(("bin", false), |(_, ext, stored)| (*ext, *stored))
}

fn corrupt<E: std::fmt::Display>(e: E) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

/// Écrit `parts` puis les assets triés par empreinte, chacun une fois ; empreinte recalculée : un écart refuse
/// l'enregistrement (arbitrage I2), jamais un fichier qui perdrait l'asset à la relecture.
pub fn write(parts: &Parts, assets: &[AssetBytes<'_>]) -> Result<Vec<u8>, FormatError> {
    let mut sorted: BTreeMap<&str, AssetBytes<'_>> = BTreeMap::new();
    for a in assets {
        if !is_asset_id(a.id) {
            return Err(FormatError::Corrupt(format!("empreinte d'asset invalide : {}", a.id)));
        }
        if sha256_hex(a.bytes) != a.id {
            return Err(FormatError::Corrupt(format!(
                "le contenu de l'asset {} ne correspond pas à son empreinte",
                a.id
            )));
        }
        // Doublon : le plus petit type MIME gagne, quel que soit l'ordre reçu.
        sorted
            .entry(a.id)
            .and_modify(|cur| {
                if a.mime < cur.mime {
                    *cur = *a;
                }
            })
            .or_insert(*a);
    }
    let mut w = format::write_parts(parts)?;
    for (id, a) in sorted {
        let (ext, stored) = extension(a.mime);
        w.start_file(format!("{ASSETS_DIR}{id}.{ext}"), format::entry_options(stored))
            .map_err(corrupt)?;
        w.write_all(a.bytes).map_err(corrupt)?;
    }
    Ok(w.finish().map_err(corrupt)?.into_inner())
}

/// Lit un `.roomboard` : `format::open` (manifeste contrôlé avant `document.ybin`), puis les seules entrées
/// `assets/<id>.<ext>` ; empreinte recalculée ; écart, nom invalide, sous-dossier ou doublon : ignoré avec un
/// avertissement ; autres entrées ignorées (HK9).
pub fn read(file: &[u8]) -> Result<Unpacked, FormatError> {
    let format::Opened { mut archive, parts, .. } = format::open(file)?;
    let names: Vec<String> = archive
        .file_names()
        .filter_map(|n| n.ok().map(|n| n.into_owned()))
        .filter(|n| n.starts_with(ASSETS_DIR))
        .collect();
    let mut assets: BTreeMap<String, Vec<u8>> = BTreeMap::new();
    let mut warnings = Vec::new();
    for name in names {
        let rest = &name[ASSETS_DIR.len()..];
        let id = rest.split_once('.').map_or(rest, |(id, _)| id);
        if rest.contains('/') || !is_asset_id(id) {
            warnings.push(format!("entrée ignorée : {name} (nom d'asset invalide)"));
            continue;
        }
        let mut bytes = Vec::new();
        let read_ok = archive
            .by_name(&name)
            .map_err(|e| e.to_string())
            .and_then(|mut f| f.read_to_end(&mut bytes).map_err(|e| e.to_string()));
        if let Err(e) = read_ok {
            warnings.push(format!("asset ignoré : {name} (illisible : {e})"));
            continue;
        }
        if sha256_hex(&bytes) != id {
            warnings.push(format!("asset ignoré : {name} (contenu différent de son empreinte)"));
            continue;
        }
        if assets.contains_key(id) {
            warnings.push(format!("asset ignoré : {name} (empreinte en double)"));
            continue;
        }
        assets.insert(id.to_string(), bytes);
    }
    Ok(Unpacked {
        parts,
        assets: assets.into_iter().collect(),
        warnings,
    })
}
```

  Si `start_file` ou `by_name` ont une autre forme dans zip 9.6, adapter l'appel sans changer le comportement.

- [ ] **Étape 3 : construire, vérifier le vert sauf l'empreinte.** `cargo test -p roomboard-formats --test container 2>&1 | tail -20`
  → tous verts sauf `socle_fixture_hash_is_pinned` (`A_RELEVER`).

- [ ] **Étape 4 : figer l'empreinte du socle.** `sha256sum crates/roomboard-core/tests/fixtures/socle-v1.roomboard`,
  coller la valeur dans `SOCLE_SHA256`, relancer → ≥ 13 passed. Vérifier que la fixture n'a pas été modifiée depuis T1 :
  `git log --oneline -- crates/roomboard-core/tests/fixtures/socle-v1.roomboard` → un seul commit (celui de T1).

- [ ] **Étape 5 : notices.** Relever les dépendances apportées par `sha2` :
  `cargo tree -p roomboard-formats -e normal,build --target all --prefix none 2>/dev/null | sort -u` et leurs licences :
  `cargo metadata --format-version 1 | python3 -I -c "import json,sys; d=json.load(sys.stdin); [print(p['name'], p['version'], p['license'], p.get('repository')) for p in d['packages'] if p['name'] in sys.argv[1:]]" sha2 digest block-buffer crypto-common typenum cpufeatures generic-array cfg-if version_check libc`.
  Aucune licence AGPL, GPL ou LGPL (sinon arrêter et le dire dans le rapport). Créer `THIRD_PARTY_NOTICES.md` :

```markdown
# Avis de tiers

Dépendances tierces ajoutées par les chantiers d'usage (U39). Relevé : `cargo metadata` sur `Cargo.lock`.
Le contrôle scripté des licences et son appel par `scripts/verifier.sh` viennent avec la partie « reste » de C2 (HK5).

## Crate `roomboard-formats` (C2, empreinte SHA-256 des assets)

| crate | version | licence | dépôt |
|---|---|---|---|
| sha2 | <version de Cargo.lock> | MIT OR Apache-2.0 | https://github.com/RustCrypto/hashes |
| … une ligne par crate relevé à l'étape 5, versions et licences recopiées de `cargo metadata` … | | | |

Textes des licences : MIT (https://opensource.org/licenses/MIT), Apache-2.0 (https://www.apache.org/licenses/LICENSE-2.0).
```

  Remplacer la ligne « … une ligne par crate … » par les lignes réelles (une par crate de la sortie de l'étape 5 qui
  n'était pas déjà dans l'arbre de `roomboard-core`).

- [ ] **Étape 6 : preuves.** `cargo test --workspace 2>&1 | tail -20` ; `cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5` ;
  `cargo fmt --all --check` ; `cargo tree -p roomboard-wasm -e normal 2>/dev/null | grep -c sha2` → `0`.

- [ ] **Étape 7 : commit.**

```bash
cd "$WT" && git add Cargo.toml && git add Cargo.lock && git add crates/roomboard-formats/Cargo.toml && \
git add crates/roomboard-formats/src/lib.rs && git add crates/roomboard-formats/src/container.rs && \
git add crates/roomboard-formats/tests/container.rs && git add THIRD_PARTY_NOTICES.md && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(formats): add asset container crate with SHA-256 checked entries" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests passés, empreinte figée, crates et licences des notices, sortie `grep -c sha2`, six lignes `Réutilisation :`.

---

### Tâche T8 — Liaison Wasm et adaptateur TS

**Objectif.** Exposer au JS les lectures et commandes neuves (`page`, `add_image`, `set_backdrop`, `clear_backdrop`,
`cited_assets`, `asset`, `save_parts`, `load_parts`), contrôler leurs valeurs dans `wasm-core.ts` (un `kind` non reconnu
devient `UnknownElement` au lieu de lever, K8, HK10), jouer le bloc « contrat C2 » sur le vrai module et la fixture binaire
(K7, K15, S4 ; S1, S3 par la liaison).

**Fichiers.**
- Modify : `crates/roomboard-wasm/src/lib.rs` (imports `:6-15`, méthodes après `:211-216`, `_inner` après `:267-429`, tests)
- Modify : `apps/web/src/core/wasm-core.ts:22-56` (`toElementView`), `:74-94` (`apply`), classe, `:117-123` (`createWasmCore`)
- Modify : `apps/web/src/core/wasm-core.contract.test.ts` (bloc « contrôle de forme » `:72-129`, `c2Factories`, bloc du vrai module `:572`)

**Interfaces.**
- Consomme : T6 (`Command::AddImage`, `Command::SetBackdrop`, `BackdropInput`, `Document::{page, cited_assets, asset}`),
  T3 (`asset::AssetRef`), T2 (`format::{save_parts, load_parts, Parts}`), T5 (`api.ts` : `PageView`, `BackdropView`,
  `AssetInfo`, `ImageElement`, `UnknownElement`, `UNKNOWN_BOX`, `CoreDocument.saveParts`, `CoreFactory.loadParts` ; `c2Factories`).
- Produit (liaison, exact) :
  - `#[wasm_bindgen] pub struct SavedParts` avec `pub fn manifest(&self) -> Vec<u8>` et `pub fn ybin(&self) -> Vec<u8>`
  - `Document::load_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError>` (statique)
  - `Document::save_parts(&mut self, now: String, app_version: String) -> Result<SavedParts, JsError>`
  - `Document::page(&self, id: &str) -> Result<JsValue, JsError>` (`null` si inconnue)
  - `Document::cited_assets(&self) -> Result<JsValue, JsError>` ; `Document::asset(&self, id: &str) -> Result<JsValue, JsError>`
  - `Document::add_image(&mut self, page: &str, asset: &str, name: &str, mime: &str, size: f64, w: f64, h: f64, matrix: &[f64]) -> Result<JsValue, JsError>`
  - `Document::set_backdrop(&mut self, page: &str, asset: &str, name: &str, mime: &str, size: f64, w: f64, h: f64, fit: &str) -> Result<JsValue, JsError>`
  - `Document::clear_backdrop(&mut self, page: &str) -> Result<JsValue, JsError>`
  - TS : `export function toPageView(v: unknown): PageView | null`, `export function toAssetInfo(v: unknown): AssetInfo`
- Réutilise : `crates/roomboard-wasm/src/lib.rs:24` (`to_js`), `:34-38` (`cmd_err`, `fmt_err`) — appelés pour `page`, `cited_assets`, `asset`, `save_parts` et les commandes neuves.
- Réutilise : `apps/web/src/core/wasm-core.ts:8-20` (`isStrings`, `isNumbers`, `isRecord`, `toChange`), `toBounds` — réutilisés par `toPageView`, `toAssetInfo`.
- Réutilise : `crates/roomboard-core/src/format/mod.rs:78`, `:113` — `save_parts(doc: &Document, meta: &SaveMeta) -> Result<Parts, FormatError>`, `load_parts(manifest: &[u8], ybin: &[u8]) -> Result<(Document, Manifest), FormatError>`.

**Patron à ne pas reprendre (concepteur-critique).** (1) Lever sur un `kind` non reconnu comme aujourd'hui
(`apps/web/src/core/wasm-core.ts:55`, `throw new Error("ElementView invalide")` en fin de `toElementView`) : U3 veut qu'un
élément inconnu ne fasse jamais échouer la lecture ; seuls `id` et `transform` restent exigés. (2) Exiger `style` pour
tout élément (`wasm-core.ts:25-35`) : `image` et `unknown` n'en ont pas. (3) Un `as PageView` ou `as AssetInfo` sur le
retour de Wasm : contrôler la forme comme `toChange` (`wasm-core.ts:12-20`).

**Test et commande bornée.**
Construire le module puis lancer le contrat :

```bash
cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && \
cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && \
rm -rf apps/web/src/wasm && wasm-bindgen --target web --out-dir apps/web/src/wasm \
  target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && \
ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test 2>&1 | tail -20
```

Attendu : 0 échec ; « contrat C2 : vrai module wasm » présent (6 tests) ; « élément de type inconnu : gardé, sans erreur »
et « toElementView : image et kind inconnu sans style, kind non reconnu → unknown » présents ; tests gardés verts :
`describe.each` `:131` et `:278`, « un élément inconnu rend null, jamais undefined » (`:187`).
Puis `cargo test -p roomboard-wasm 2>&1 | tail -20` → 0 échec ; `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5`
→ aucune erreur ; `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` ≤ 1572864 (noter la valeur) ;
`cargo tree -p roomboard-wasm -e normal 2>/dev/null | grep -c sha2` → `0`.

**Preuve visuelle.** Aucune (pas d'interface) ; la taille du module tient lieu de mesure.

**Contraintes (recopiées).**
- G1 Périmètre : `crates/roomboard-wasm`, côté page `apps/web/src/core/` (`wasm-core.ts` et son test de contrat).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé.
- G4 Test « recharger garde les octets » pour chaque valeur composée neuve (joué par le bloc C2 sur le vrai module).
- G5 Aucune dépendance AGPL/GPL/LGPL. Module Wasm principal ≤ 1,5 Mo (1 572 864 octets, marge ~160 Ko partagée avec C7 et C9) : `sha2` n'entre pas dans `roomboard-wasm`.
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-wasm 2>&1 | tail -20`, `pnpm --filter @roomboard/web test 2>&1 | tail -20`, `cargo clippy -p roomboard-wasm --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G10 `load` et `save` de la liaison gardés (Ouvrir et Enregistrer des lots 5a et 5b).
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Faire dépendre `roomboard-wasm` de `roomboard-formats` ou de `sha2`. Passer des octets d'asset au module
Wasm. Commiter `apps/web/src/wasm/` (ignoré par git). Modifier `fake-core.ts` (si une parité casse, le dire dans le rapport ;
l'orchestrateur rouvre T5).

**Terminé quand.** Commande bornée verte, `tsc` vert, taille ≤ budget, clippy et fmt verts.

**Étapes.**

- [ ] **Étape 1 : tests Rust de la liaison (rouges).** Dans `mod tests` de `crates/roomboard-wasm/src/lib.rs` :

```rust
    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    fn png() -> AssetRef {
        AssetRef { id: ABC.into(), name: "photo.png".into(), mime: "image/png".into(), size: 3.0 }
    }

    #[test]
    fn add_image_inner_reads_back_image_and_meta() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d.add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 5.0, 6.0]).expect("image");
        let e = d.core.element(&c.ids[0]).expect("vue");
        assert_eq!(e.kind, "image");
        assert_eq!(d.core.cited_assets(), vec![png()]);
        assert_eq!(d.add_image_inner(&p, png(), [1.0, 1.0], &[1.0, 0.0]), Err(CommandError::BadMatrix));
    }

    #[test]
    fn set_backdrop_inner_then_clear() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let input = BackdropInput { asset: png(), w: 1000.0, h: 500.0, fit: "width".into() };
        d.set_backdrop_inner(&p, Some(input)).expect("fond");
        assert_eq!(d.core.page(&p).and_then(|v| v.backdrop).and_then(|b| b.rect).map(|r| r.y1), Some(960.0));
        d.set_backdrop_inner(&p, None).expect("retrait");
        assert_eq!(d.core.page(&p).and_then(|v| v.backdrop), None);
    }

    #[test]
    fn save_parts_then_load_parts_inner_keeps_document_and_created() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.add_image_inner(&p, png(), [2.0, 2.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0]).expect("image");
        let parts = d.save_parts_inner("2026-11-20T00:00:00Z", "0.1.0").expect("parts");
        let mut e = Document::load_parts_inner(&parts.manifest, &parts.ybin).expect("load_parts");
        assert_eq!(e.core.cited_assets(), vec![png()]);
        let again = e.save_parts_inner("2026-11-21T00:00:00Z", "0.1.0").expect("parts 2");
        let (_, m) = roomboard_core::format::load_parts(&again.manifest, &again.ybin).expect("relu");
        assert_eq!(m.created, "2026-11-20T00:00:00Z");
    }
```

  `cargo test -p roomboard-wasm 2>&1 | tail -20` → erreurs (`add_image_inner`, `AssetRef` absents).

- [ ] **Étape 2 : implémenter la liaison.** Imports : `use roomboard_core::asset::AssetRef;`,
  `use roomboard_core::commands::{BackdropInput, Change, Command, CommandError, EraseMode};`,
  `use roomboard_core::format::{self, FormatError, Parts, SaveMeta};`. Avant `pub struct Document` :

```rust
/// Les deux moitiés d'un `.roomboard` (K2) pour le Worker de la partie « reste » ; libérée par `free()` côté JS.
#[wasm_bindgen]
pub struct SavedParts {
    manifest: Vec<u8>,
    ybin: Vec<u8>,
}

#[wasm_bindgen]
impl SavedParts {
    pub fn manifest(&self) -> Vec<u8> {
        self.manifest.clone()
    }

    pub fn ybin(&self) -> Vec<u8> {
        self.ybin.clone()
    }
}

fn asset_ref(id: &str, name: &str, mime: &str, size: f64) -> AssetRef {
    AssetRef { id: id.to_string(), name: name.to_string(), mime: mime.to_string(), size }
}
```

  Dans `#[wasm_bindgen] impl Document`, après `save` :

```rust
    pub fn load_parts(manifest: &[u8], ybin: &[u8]) -> Result<Document, JsError> {
        Self::load_parts_inner(manifest, ybin).map_err(fmt_err)
    }

    pub fn save_parts(&mut self, now: String, app_version: String) -> Result<SavedParts, JsError> {
        let p = self.save_parts_inner(&now, &app_version).map_err(fmt_err)?;
        Ok(SavedParts { manifest: p.manifest, ybin: p.ybin })
    }

    /// Vue de page (K7) ; `null` pour une page inconnue.
    pub fn page(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.page(id) {
            Some(p) => to_js(&p),
            None => Ok(JsValue::NULL),
        }
    }

    pub fn cited_assets(&self) -> Result<JsValue, JsError> {
        to_js(&self.core.cited_assets())
    }

    pub fn asset(&self, id: &str) -> Result<JsValue, JsError> {
        match self.core.asset(id) {
            Some(a) => to_js(&a),
            None => Ok(JsValue::NULL),
        }
    }

    /// `matrix` : six nombres ; seule la référence de l'asset traverse la liaison, jamais ses octets (K13).
    #[allow(clippy::too_many_arguments)]
    pub fn add_image(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        matrix: &[f64],
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .add_image_inner(page, asset_ref(asset, name, mime, size), [w, h], matrix)
                .map_err(cmd_err)?,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn set_backdrop(
        &mut self,
        page: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        w: f64,
        h: f64,
        fit: &str,
    ) -> Result<JsValue, JsError> {
        let input = BackdropInput { asset: asset_ref(asset, name, mime, size), w, h, fit: fit.to_string() };
        to_js(&self.set_backdrop_inner(page, Some(input)).map_err(cmd_err)?)
    }

    pub fn clear_backdrop(&mut self, page: &str) -> Result<JsValue, JsError> {
        to_js(&self.set_backdrop_inner(page, None).map_err(cmd_err)?)
    }
```

  Dans `impl Document` (natif), remplacer `save_inner` et ajouter :

```rust
    fn save_meta(&self, now: &str, app_version: &str) -> SaveMeta {
        SaveMeta { app_version: app_version.to_string(), now: now.to_string(), created: self.created.clone() }
    }

    fn mark_saved(&mut self, now: &str) {
        if self.created.is_none() {
            self.created = Some(now.to_string());
        }
    }

    /// Le premier enregistrement fixe `created` ; les suivants le recopient (D24).
    pub fn save_inner(&mut self, now: &str, app_version: &str) -> Result<Vec<u8>, FormatError> {
        let bytes = format::save(&self.core, &self.save_meta(now, app_version))?;
        self.mark_saved(now);
        Ok(bytes)
    }

    pub fn save_parts_inner(&mut self, now: &str, app_version: &str) -> Result<Parts, FormatError> {
        let parts = format::save_parts(&self.core, &self.save_meta(now, app_version))?;
        self.mark_saved(now);
        Ok(parts)
    }

    pub fn load_parts_inner(manifest: &[u8], ybin: &[u8]) -> Result<Document, FormatError> {
        let (core, m) = format::load_parts(manifest, ybin)?;
        Ok(Self::wrap(core, Some(m.created)))
    }

    /// Longueur de matrice différente de 6 : `BadMatrix`.
    pub fn add_image_inner(
        &mut self,
        page: &str,
        asset: AssetRef,
        size: [f64; 2],
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::AddImage { page: page.to_string(), asset, w: size[0], h: size[1], matrix: m })
    }

    pub fn set_backdrop_inner(
        &mut self,
        page: &str,
        backdrop: Option<BackdropInput>,
    ) -> Result<Change, CommandError> {
        self.run(Command::SetBackdrop { page: page.to_string(), backdrop })
    }
```

  `cargo test -p roomboard-wasm 2>&1 | tail -20` → vert (tests existants compris, dont `second_save_keeps_first_created`).

- [ ] **Étape 3 : tests TS du contrôle de forme et du vrai module (rouges).** Dans `wasm-core.contract.test.ts` :
  importer `toAssetInfo`, `toPageView` depuis `./wasm-core` ; remplacer
  `const c2Factories: { name: string; f: CoreFactory }[] = [{ name: "fausse liaison", f: fakeCore }];` par
  `const c2Factories = factories;` (le vrai module joue le bloc C2) ; dans le bloc « contrôle de forme des valeurs venues
  de Wasm », ajouter :

```ts
  it("toElementView : image et kind inconnu sans style, kind non reconnu → unknown", () => {
    const t = [1, 0, 0, 1, 5, 6];
    const hash = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(toElementView({ id: "i1", kind: "image", transform: t, image: { asset: hash, w: 2, h: 3 } })).toEqual({
      id: "i1", kind: "image", transform: t, image: { asset: hash, w: 2, h: 3 },
    });
    const u = { id: "u1", kind: "unknown", transform: t, unknown: { sourceKind: "hologram", w: 300, h: 200 } };
    expect(toElementView(u)).toEqual(u);
    expect(toElementView({ id: "u2", kind: "video3d", transform: t })).toEqual({
      id: "u2", kind: "unknown", transform: t, unknown: { sourceKind: "video3d", w: 100, h: 100 },
    });
    expect(toElementView({ id: "u3", kind: "video3d", transform: t, unknown: { w: 40, h: 30 } })).toEqual({
      id: "u3", kind: "unknown", transform: t, unknown: { sourceKind: "video3d", w: 40, h: 30 },
    });
    expect(() => toElementView({ id: "u4", kind: "video3d", transform: [1, 0] })).toThrow("ElementView invalide");
    expect(() => toElementView({ kind: "video3d", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "i2", kind: "image", transform: t })).toThrow("ElementView invalide");
    expect(() => toElementView({ ...u, unknown: { sourceKind: "x", w: 0, h: 1 } })).toThrow("ElementView invalide");
    expect(() => toElementView({ id: "s1", kind: "stroke", transform: t })).toThrow("ElementView invalide");
  });

  it("toPageView et toAssetInfo : null pour rien, erreur pour une forme fausse", () => {
    const page = { id: "p1", width: 1920, height: 1080, background: "#ffffff" };
    expect(toPageView(undefined)).toBeNull();
    expect(toPageView({ ...page, backdrop: undefined })).toEqual({ ...page, backdrop: null });
    const b = { asset: "a".repeat(64), kind: "pdf-page", w: undefined, h: 5, fit: "contain", rect: undefined };
    expect(toPageView({ ...page, backdrop: b })).toEqual({ ...page, backdrop: { ...b, w: null, rect: null } });
    expect(() => toPageView({ ...page, width: "1920" })).toThrow("PageView invalide");
    expect(() => toPageView({ ...page, backdrop: { ...b, asset: 3 } })).toThrow("PageView invalide");
    const info = { id: "a".repeat(64), name: "n", mime: "image/png", size: 3 };
    expect(toAssetInfo(info)).toEqual(info);
    expect(() => toAssetInfo({ ...info, size: "3" })).toThrow("AssetInfo invalide");
  });

  it("AddImage et SetBackdrop : retour contrôlé par toChange, arguments dans l'ordre de la liaison", () => {
    const drift = { pages: ["p1"], ids: ["e1"], full: false, version: 1 };
    const calls: unknown[][] = [];
    const record = (name: string) => (...args: unknown[]): unknown => {
      calls.push([name, ...args]);
      return drift;
    };
    const doc = { add_image: record("add_image"), set_backdrop: record("set_backdrop"), clear_backdrop: record("clear_backdrop") };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    const a = { id: "a".repeat(64), name: "n.png", mime: "image/png", size: 3 };
    expect(() => d.apply({ type: "AddImage", page: "p1", asset: a, w: 2, h: 3, matrix: [1, 0, 0, 1, 4, 5] })).toThrow("Change invalide");
    expect(() => d.apply({ type: "SetBackdrop", page: "p1", backdrop: { asset: a, w: 10, h: 20, fit: "width" } })).toThrow("Change invalide");
    expect(() => d.apply({ type: "SetBackdrop", page: "p1", backdrop: null })).toThrow("Change invalide");
    expect(calls).toEqual([
      ["add_image", "p1", a.id, "n.png", "image/png", 3, 2, 3, new Float64Array([1, 0, 0, 1, 4, 5])],
      ["set_backdrop", "p1", a.id, "n.png", "image/png", 3, 10, 20, "width"],
      ["clear_backdrop", "p1"],
    ]);
  });
```

  Dans le bloc `describe.skipIf(loaded === null)("contrat du vrai module wasm", …)`, ajouter :

```ts
  const fixtureOf = (path: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(path, import.meta.url)));

  it("élément de type inconnu : gardé, sans erreur (fixture binaire du cœur et fixture de la fausse liaison)", () => {
    const real = core.load(fixtureOf("../../../../crates/roomboard-core/tests/fixtures/element-inconnu.roomboard"));
    const fake = fakeCore.load(fixtureOf("./fixtures/element-inconnu.fake.json"));
    expect(real.element("h1")).toEqual({
      id: "h1", kind: "unknown", transform: [1, 0, 0, 1, 100, 50], unknown: { sourceKind: "hologram", w: 300, h: 200 },
    });
    for (const id of ["h1", "h2"]) expect(real.element(id)).toEqual(fake.element(id));
    expect(real.citedAssets()).toEqual(fake.citedAssets());
    expect(real.hitTest("p1", 50, 50, 0)).toBe("h2");
    expect(real.canUndo()).toBe(false);
    real.free();
  });

  it("fichier du socle : ouvert par le vrai module, réenregistré à l'identique (S5)", () => {
    const socle = fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard");
    const d = core.load(socle);
    expect(d.pageIds()).toHaveLength(2);
    expect(new Uint8Array(d.save("2026-11-20T00:00:00Z", "0.1.0"))).toEqual(socle);
    d.free();
  });
```

  Construire le module (commande bornée, deux premières lignes) puis
  `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test 2>&1 | tail -20` → échecs attendus (`toPageView` absent,
  `d.page is not a function` sur le vrai module).

- [ ] **Étape 4 : implémenter l'adaptateur.** Dans `wasm-core.ts`, importer `AssetInfo`, `BackdropView`, `PageView`,
  `UNKNOWN_BOX` depuis `./api` ; remplacer `toElementView` par :

```ts
const ELEMENT = "ElementView invalide";
const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function toMatrix(t: unknown): Matrix {
  if (!isNumbers(t) || t.length !== 6) throw new Error(ELEMENT);
  const [a, b, c, d, e, f] = t;
  if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) {
    throw new Error(ELEMENT);
  }
  return [a, b, c, d, e, f];
}

function toStyle(s: unknown): StrokeStyle {
  if (!isRecord(s)) throw new Error(ELEMENT);
  const { color, width } = s;
  if (typeof color !== "string" || typeof width !== "number") throw new Error(ELEMENT);
  return { color, width };
}

/** Kind connu : forme contrôlée ; kind non reconnu : UnknownElement (U3, K8) ; id et transform toujours exigés. */
export function toElementView(v: unknown): ElementView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(ELEMENT);
  const { id, kind } = v;
  if (typeof id !== "string") throw new Error(ELEMENT);
  const base = { id, transform: toMatrix(v["transform"]) };
  switch (kind) {
    case "stroke":
      return { ...base, kind, style: toStyle(v["style"]) };
    case "shape": {
      const style = toStyle(v["style"]);
      const s = v["shape"];
      if (!isRecord(s)) throw new Error(ELEMENT);
      const { shape, w, h, fill } = s;
      if (typeof shape !== "string" || !isShapeKind(shape) || typeof w !== "number" || typeof h !== "number") throw new Error(ELEMENT);
      if (fill !== undefined && fill !== null && typeof fill !== "string") throw new Error(ELEMENT);
      return { ...base, kind, style, shape: { shape, w, h, fill: typeof fill === "string" ? fill : null } };
    }
    case "text": {
      const style = toStyle(v["style"]);
      const t = v["text"];
      if (!isRecord(t)) throw new Error(ELEMENT);
      const { content, size, boxWidth, boxHeight } = t;
      if (typeof content !== "string" || typeof size !== "number" || typeof boxWidth !== "number" || typeof boxHeight !== "number") {
        throw new Error(ELEMENT);
      }
      return { ...base, kind, style, text: { content, size, boxWidth, boxHeight } };
    }
    case "image": {
      const i = v["image"];
      if (!isRecord(i)) throw new Error(ELEMENT);
      const { asset, w, h } = i;
      if (typeof asset !== "string" || typeof w !== "number" || typeof h !== "number") throw new Error(ELEMENT);
      return { ...base, kind, image: { asset, w, h } };
    }
    case "unknown": {
      const u = v["unknown"];
      if (!isRecord(u)) throw new Error(ELEMENT);
      const { sourceKind, w, h } = u;
      if (typeof sourceKind !== "string" || !finitePositive(w) || !finitePositive(h)) throw new Error(ELEMENT);
      return { ...base, kind, unknown: { sourceKind, w, h } };
    }
    default: {
      const u = isRecord(v["unknown"]) ? v["unknown"] : {};
      const w = u["w"];
      const h = u["h"];
      const box = finitePositive(w) && finitePositive(h) ? { w, h } : { w: UNKNOWN_BOX, h: UNKNOWN_BOX };
      return { ...base, kind: "unknown", unknown: { sourceKind: typeof kind === "string" ? kind : "", ...box } };
    }
  }
}

const PAGE = "PageView invalide";
const numberOrNull = (v: unknown, err: string): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number") throw new Error(err);
  return v;
};

function toBackdropView(v: unknown): BackdropView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { asset, kind, fit } = v;
  if (typeof asset !== "string" || typeof kind !== "string" || typeof fit !== "string") throw new Error(PAGE);
  return { asset, kind, w: numberOrNull(v["w"], PAGE), h: numberOrNull(v["h"], PAGE), fit, rect: toBounds(v["rect"]) };
}

export function toPageView(v: unknown): PageView | null {
  if (v === null || v === undefined) return null;
  if (!isRecord(v)) throw new Error(PAGE);
  const { id, width, height, background } = v;
  if (typeof id !== "string" || typeof width !== "number" || typeof height !== "number" || typeof background !== "string") {
    throw new Error(PAGE);
  }
  return { id, width, height, background, backdrop: toBackdropView(v["backdrop"]) };
}

export function toAssetInfo(v: unknown): AssetInfo {
  if (!isRecord(v)) throw new Error("AssetInfo invalide");
  const { id, name, mime, size } = v;
  if (typeof id !== "string" || typeof name !== "string" || typeof mime !== "string" || typeof size !== "number") {
    throw new Error("AssetInfo invalide");
  }
  return { id, name, mime, size };
}
```

  `toBounds` lève « Bounds invalide » pour un `rect` mal formé : acceptable (dérive de forme). Dans `apply`, deux cas :

```ts
      case "AddImage": {
        const a = cmd.asset;
        return toChange(this.d.add_image(cmd.page, a.id, a.name, a.mime, a.size, cmd.w, cmd.h, new Float64Array(cmd.matrix)));
      }
      case "SetBackdrop": {
        const b = cmd.backdrop;
        if (b === null) return toChange(this.d.clear_backdrop(cmd.page));
        return toChange(this.d.set_backdrop(cmd.page, b.asset.id, b.asset.name, b.asset.mime, b.asset.size, b.w, b.h, b.fit));
      }
```

  Méthodes de la classe et usine :

```ts
  page(id: string): PageView | null { return toPageView(this.d.page(id)); }
  citedAssets(): AssetInfo[] {
    const v: unknown = this.d.cited_assets();
    if (!Array.isArray(v)) throw new Error("AssetInfo invalide");
    return v.map(toAssetInfo);
  }
  asset(id: string): AssetInfo | null {
    const v: unknown = this.d.asset(id);
    return v === null || v === undefined ? null : toAssetInfo(v);
  }
  saveParts(now: string, appVersion: string): readonly [Uint8Array, Uint8Array] {
    const p = this.d.save_parts(now, appVersion);
    try {
      return [p.manifest(), p.ybin()] as const;
    } finally {
      p.free();
    }
  }
```

```ts
export function createWasmCore(mod: WasmModule): CoreFactory {
  return {
    blank: () => new WasmCoreDocument(mod.Document.blank(), mod),
    load: (bytes: Uint8Array) => new WasmCoreDocument(mod.Document.load(bytes), mod),
    loadParts: (manifest: Uint8Array, ybin: Uint8Array) => new WasmCoreDocument(mod.Document.load_parts(manifest, ybin), mod),
    version: () => mod.version(),
  };
}
```

  Importer `AssetInfo`, `PageView` dans la liste `import type` de tête.

- [ ] **Étape 5 : vérifier le vert.** Commande bornée complète de la section (construction, `wasm-bindgen`, tests) → 0
  échec ; `pnpm --filter @roomboard/web exec tsc --noEmit -p . 2>&1 | tail -5` → rien ;
  `cargo clippy -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -5` ; `cargo fmt --all --check` ;
  `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` (≤ 1572864) ; `cargo tree -p roomboard-wasm -e normal | grep -c sha2` → 0.

- [ ] **Étape 6 : commit.**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && git add apps/web/src/core/wasm-core.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): expose pages, images, backdrops, cited assets and split save" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests passés (dont bloc C2 du vrai module), taille du module en octets et marge restante, trois lignes `Réutilisation :`.

---

### Tâche T9 — Scénarios du conteneur et essai réel

**Objectif.** Jouer S1 à S4 de bout en bout côté Rust (commande du cœur → `save_parts` → `container::write` →
`container::read` → `load_parts`), écrire la fixture `element-inconnu-avec-asset.roomboard`, et l'essai réel facultatif sur
`~/telechargements-roomboard/images/` (`#[ignore]`, sa sortie sert de `## Preuve` à la PR) (K15).

**Fichiers.**
- Create : `crates/roomboard-formats/tests/scenarios.rs`
- Create : `crates/roomboard-formats/tests/fixtures/element-inconnu-avec-asset.roomboard`

**Interfaces.**
- Consomme : T7 (`container::{sha256_hex, write, read, AssetBytes, Unpacked}`), T6 (`Command::AddImage`,
  `Command::SetBackdrop`, `BackdropInput`, `Document::cited_assets`), T3 (`asset::AssetRef`, fixture `element-inconnu.roomboard`),
  T2 (`format::{save_parts, load_parts, save}`).
- Produit : la fixture `element-inconnu-avec-asset.roomboard` (asset `ABC` = octets `abc`, type `image/png`) ; la sortie de
  `real_images_round_trip` pour la PR.
- Réutilise : `roomboard_formats::container` (`crates/roomboard-formats/src/container.rs`, T7) — `write(parts: &Parts, assets: &[AssetBytes<'_>]) -> Result<Vec<u8>, FormatError>`, `read(file: &[u8]) -> Result<Unpacked, FormatError>`, `sha256_hex(bytes: &[u8]) -> String`.
- Réutilise : `crates/roomboard-core/src/document.rs` (T6) — `Document::cited_assets(&self) -> Vec<AssetInfo>` pour choisir les octets à écrire.

**Test et commande bornée.**
`cargo test -p roomboard-formats --test scenarios 2>&1 | tail -20` → ≥ 4 passed, 1 ignored, `s1_image_round_trip`,
`s2_same_asset_twice_one_entry`, `s3_backdrop_asset_is_written`, `s4_unknown_with_asset_round_trip` présents ;
`cargo test --workspace 2>&1 | tail -20` → 0 échec. Essai réel (si le dossier existe sur la VM) :
`ROOMBOARD_EXEMPLES=$HOME/telechargements-roomboard/images cargo test -p roomboard-formats --test scenarios -- --ignored --nocapture 2>&1 | grep "essai réel"`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 Périmètre : crate `crates/roomboard-formats` (tests seulement).
- G2 Interdit : `scripts/verifier.sh`, `main.ts`, composants d'interface, build Tauri ou Android, branches `feat/socle-lot5b*`.
- G3 TDD : test rouge d'abord. Aucun test sauté, désactivé ni seuil baissé (le seul `#[ignore]` est l'essai réel exigé par K15).
- G4 Test « recharger garde les octets » pour chaque valeur composée neuve (`s1_image_round_trip` : trente rechargements).
- G6 Fichiers d'exemple `~/telechargements-roomboard/` jamais commités ; fixtures synthétiques seulement ; régénération derrière `ROOMBOARD_REGENERER_FIXTURES=1`, jamais par `#[ignore]` (un `--ignored` ne réécrit rien).
- G7 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers ajoutés un par un.
- G8 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Un test qui échoue sur un délai est rejoué une fois.
- G9 Preuves bornées : `cargo test -p roomboard-formats 2>&1 | tail -20`, `cargo clippy -p roomboard-formats --all-targets -- -D warnings`, `cargo fmt --all --check`.
- G11 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :`.

**Interdits.** Modifier `container.rs` ou le cœur (un écart se rapporte, l'orchestrateur rouvre T6 ou T7). Commiter un
fichier venu de `~/telechargements-roomboard/`.

**Terminé quand.** Tests verts, fixture commitée, sortie de l'essai réel recopiée dans le rapport (ou « dossier absent »).

**Étapes.**

- [ ] **Étape 1 : écrire les scénarios (rouges : fixture absente).** Créer `crates/roomboard-formats/tests/scenarios.rs` :

```rust
//! Scénarios S1 à S4 du cadrage usage-c2-coeur, de la commande du cœur au fichier et retour.
use std::path::{Path, PathBuf};

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::{BackdropInput, Command};
use roomboard_core::document::Document;
use roomboard_core::element::IDENTITY;
use roomboard_core::format::{self, SaveMeta};
use roomboard_formats::container::{self, sha256_hex, AssetBytes};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None }
}

fn first(d: &Document) -> String {
    d.page_ids()[0].clone()
}

fn png(n: u8) -> Vec<u8> {
    let mut v = b"\x89PNG\r\n\x1a\n".to_vec();
    v.extend(std::iter::repeat_n(n, 64));
    v
}

fn image_ref(bytes: &[u8], name: &str) -> AssetRef {
    AssetRef { id: sha256_hex(bytes), name: name.into(), mime: "image/png".into(), size: bytes.len() as f64 }
}

/// Octets des assets cités, passés dans l'ordre inverse (le conteneur trie, K12).
fn pack(d: &Document, store: &[Vec<u8>]) -> Vec<u8> {
    let parts = format::save_parts(d, &meta()).expect("parts");
    let cited = d.cited_assets();
    let mut assets: Vec<AssetBytes<'_>> = cited
        .iter()
        .filter_map(|c| {
            store
                .iter()
                .find(|b| sha256_hex(b) == c.id)
                .map(|b| AssetBytes { id: &c.id, mime: &c.mime, bytes: b })
        })
        .collect();
    assets.reverse();
    container::write(&parts, &assets).expect("write")
}

fn unpack(file: &[u8]) -> (Document, Vec<(String, Vec<u8>)>) {
    let u = container::read(file).expect("read");
    assert!(u.warnings.is_empty(), "{:?}", u.warnings);
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    (d, u.assets)
}

#[test]
fn s1_image_round_trip() {
    let (a, b) = (png(1), png(2));
    let mut d = Document::blank();
    let p = first(&d);
    let ia = d
        .apply(Command::AddImage { page: p.clone(), asset: image_ref(&a, "a.png"), w: 64.0, h: 32.0, matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 20.0] })
        .expect("image a")
        .ids[0]
        .clone();
    d.apply(Command::AddImage { page: p.clone(), asset: image_ref(&b, "b.png"), w: 8.0, h: 8.0, matrix: IDENTITY })
        .expect("image b");
    let store = vec![a.clone(), b.clone()];
    let file = pack(&d, &store);
    assert!(pack(&d, &store) == file, "deux enregistrements, deux fichiers différents");
    let (back, assets) = unpack(&file);
    let v = back.element(&ia).expect("image relue");
    let img = v.image.expect("vue image");
    assert_eq!((img.asset, img.w, img.h, v.transform), (sha256_hex(&a), 64.0, 32.0, [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]));
    let mut want = vec![(sha256_hex(&a), a.clone()), (sha256_hex(&b), b.clone())];
    want.sort();
    assert_eq!(assets, want);
    let mut cur = file.clone();
    for i in 0..30 {
        let (r, _) = unpack(&cur);
        cur = pack(&r, &store);
        assert!(cur == file, "fichier différent au rechargement {i}");
    }
    assert!(d.undo() && d.undo());
    assert!(pack(&d, &store) == format::save(&d, &meta()).expect("save"), "sans image, le fichier est celui du cœur");
}

#[test]
fn s2_same_asset_twice_one_entry() {
    let a = png(3);
    let mut d = Document::blank();
    let p = first(&d);
    for _ in 0..2 {
        d.apply(Command::AddImage { page: p.clone(), asset: image_ref(&a, "a.png"), w: 4.0, h: 4.0, matrix: IDENTITY })
            .expect("image");
    }
    let (back, assets) = unpack(&pack(&d, &[a.clone()]));
    assert_eq!(back.element_ids(&p).len(), 2);
    assert_eq!(assets.len(), 1);
    assert_eq!(back.cited_assets().len(), 1);
}

#[test]
fn s3_backdrop_asset_is_written() {
    let fond = png(4);
    let mut d = Document::blank();
    let p = first(&d);
    d.apply(Command::SetBackdrop {
        page: p.clone(),
        backdrop: Some(BackdropInput { asset: image_ref(&fond, "fond.png"), w: 1000.0, h: 500.0, fit: "width".into() }),
    })
    .expect("fond");
    let file = pack(&d, &[fond.clone()]);
    let (back, assets) = unpack(&file);
    assert_eq!(assets, vec![(sha256_hex(&fond), fond.clone())]);
    let b = back.page(&p).expect("page").backdrop.expect("fond relu");
    assert_eq!(b.rect.map(|r| (r.x1, r.y1)), Some((1920.0, 960.0)));
    assert!(pack(&back, &[fond]) == file, "recharger garde les octets");
}

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures").join(name)
}

#[test]
fn s4_unknown_with_asset_round_trip() {
    let path = fixture("element-inconnu-avec-asset.roomboard");
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        let core = std::fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../roomboard-core/tests/fixtures/element-inconnu.roomboard"),
        )
        .expect("fixture du cœur");
        let opened = container::read(&core).expect("read");
        let file = container::write(&opened.parts, &[AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" }]).expect("write");
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("dossier");
        std::fs::write(&path, file).expect("écriture");
    }
    let file = std::fs::read(&path).expect(
        "fixture absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats --test scenarios",
    );
    let u = container::read(&file).expect("read");
    assert_eq!(u.assets, vec![(ABC.to_string(), b"abc".to_vec())]);
    let again: Vec<AssetBytes<'_>> = u.assets.iter().map(|(id, b)| AssetBytes { id, mime: "image/png", bytes: b }).collect();
    assert!(container::write(&u.parts, &again).expect("rewrite") == file, "sans geste, mêmes octets");
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    assert_eq!(d.element("h1").expect("h1").kind, "unknown");
    assert_eq!(d.cited_assets().into_iter().map(|a| a.id).collect::<Vec<_>>(), vec![ABC.to_string()]);
    let store = vec![b"abc".to_vec()];
    let resaved = container::read(&pack(&d, &store)).expect("read");
    assert_eq!(resaved.assets, vec![(ABC.to_string(), b"abc".to_vec())], "l'asset de l'élément inconnu est gardé");
}

fn mime_of(p: &Path) -> &'static str {
    match p.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase).as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("avif") => "image/avif",
        Some("heic") => "image/heic",
        _ => "application/octet-stream",
    }
}

/// Essai réel (K15, Q6) : `ROOMBOARD_EXEMPLES=~/telechargements-roomboard/images`. Rien de ce dossier n'est commité.
#[test]
#[ignore = "essai réel : ROOMBOARD_EXEMPLES=<dossier d'images>"]
fn real_images_round_trip() {
    let dir = std::env::var("ROOMBOARD_EXEMPLES").expect("ROOMBOARD_EXEMPLES");
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .expect("dossier")
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_file())
        .collect();
    files.sort();
    assert!(!files.is_empty(), "aucun fichier dans {dir}");
    let mut d = Document::blank();
    let p = first(&d);
    let mut store = Vec::new();
    for f in &files {
        let bytes = std::fs::read(f).expect("lecture");
        let asset = AssetRef {
            id: sha256_hex(&bytes),
            name: f.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
            mime: mime_of(f).into(),
            size: bytes.len() as f64,
        };
        d.apply(Command::AddImage { page: p.clone(), asset, w: 100.0, h: 100.0, matrix: IDENTITY }).expect("image");
        store.push(bytes);
    }
    let file = pack(&d, &store);
    let (back, assets) = unpack(&file);
    for b in &store {
        assert_eq!(assets.iter().find(|(id, _)| *id == sha256_hex(b)).map(|(_, x)| x), Some(b));
    }
    assert!(pack(&back, &store) == file);
    println!(
        "essai réel : {} fichiers, {} assets distincts, fichier de {} octets, aller-retour octet pour octet OK",
        files.len(),
        assets.len(),
        file.len()
    );
}
```

  Si `std::iter::repeat_n` n'est pas disponible avec la version de Rust de la VM, utiliser `std::iter::repeat(n).take(64)`.
  `cargo test -p roomboard-formats --test scenarios 2>&1 | tail -20` → `s4_unknown_with_asset_round_trip` échoue (fixture
  absente), les autres passent déjà si T6 et T7 sont fusionnés (ils sont la garde de bout en bout ; le rouge de la tâche est S4).

- [ ] **Étape 2 : écrire la fixture une fois.**
  `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats --test scenarios 2>&1 | tail -20` → 4 passed, 1 ignored.

- [ ] **Étape 3 : vérifier le vert et l'essai réel.** Sans la variable : `cargo test -p roomboard-formats --test scenarios 2>&1 | tail -20`
  → 4 passed, 1 ignored ; `cargo test --workspace 2>&1 | tail -20` ; `cargo clippy -p roomboard-formats --all-targets -- -D warnings 2>&1 | tail -5` ;
  `cargo fmt --all --check` ; si `ls ~/telechargements-roomboard/images` liste des fichiers :
  `ROOMBOARD_EXEMPLES=$HOME/telechargements-roomboard/images cargo test -p roomboard-formats --test scenarios -- --ignored --nocapture 2>&1 | grep -E "essai réel|test result"`.
  Vérifier `git status --short` : aucun fichier de `~/telechargements-roomboard/`, fixture S4 seule ajoutée.

- [ ] **Étape 4 : commit.**

```bash
cd "$WT" && git add crates/roomboard-formats/tests/scenarios.rs && \
git add crates/roomboard-formats/tests/fixtures/element-inconnu-avec-asset.roomboard && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(formats): play container scenarios S1-S4 and real-image trial" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Rapport : tests passés, sortie mot pour mot de l'essai réel (ou « dossier absent »), deux lignes `Réutilisation :`.

---

## Relecture du plan (faite)

- **Couverture du cadrage.** K1 → T7 ; K2 → T2 (et T7 pour le conteneur) ; K3 → T6 ; K4 → T6 (cœur), T5 (fausse liaison),
  T9 (fichier) ; K5 → T3 (lecture), T6 (commande) ; K6, K9 → T6, T5 ; K7 → T6, T8 ; K8 → T3, T5, T8 ; K10 → T1, T6 (garde
  rejouée) ; K11, K12 → T7 ; K13 → T4 ; K14 → T7 (notices, `sha2` hors Wasm), T8 (taille) ; K15 → T1, T3, T5, T8, T9.
  S1 → T2, T6, T7, T9 ; S2 → T4, T5, T6, T9 ; S3 → T5, T6, T9 ; S4 → T3, T5, T8, T9 ; S5 → T1, T7, T8.
- **Carte d'impact.** Toute entrée « touché : oui » est dans les fichiers touchés d'une tâche ; `Cargo.toml` et `Cargo.lock`
  (fichiers communs avec le lot 5b) dans T7 seulement. Effets de bord : `toElementView : image et kind inconnu sans style,
  kind non reconnu → unknown` (T8), `unknown_kind_is_kept_moved_and_resaved` (T3), « élément de type inconnu : gardé,
  sans erreur » (T8), `undo_add_image_removes_new_asset_meta_only` et tests de `history.rs` (T6),
  `newer_format_version_without_document_is_newer` (T2), `socle_fixture_resaves_identically` (T1), `socle_fixture_hash_is_pinned`
  et `container_without_assets_equals_core_save` (T7), 16 tests du format (preuve de T2), membre neuf du workspace (preuve de T7).
- **Noms d'une tâche à l'autre.** `Parts`, `save_parts`, `write_parts`, `open`, `Opened`, `check_manifest`, `load_parts`,
  `entry_options` (T2 → T7, T8, T9) ; `is_asset_id`, `AssetInfo`, `AssetRef`, `AssetInfo::fallback` (T3 → T6, T7, T8, T9) ;
  `BackdropInput`, `Command::AddImage`, `Command::SetBackdrop`, `cited_assets`, `asset` (T6 → T8, T9) ; `PageView`,
  `BackdropView`, `UnknownElement`, `UNKNOWN_BOX`, `saveParts`, `loadParts`, `c2Factories` (T5 → T8) ; vecteurs `ABC`,
  `EMPTY_HASH` et messages `BadAsset`, `BadImage` partout identiques.
- **Écarts assumés.** Le rouge de T9 ne porte que sur S4 (S1 à S3 y sont des gardes de bout en bout sur du code déjà écrit
  par T6 et T7) ; la ligne « … une ligne par crate … » de `THIRD_PARTY_NOTICES.md` est remplie depuis la sortie d'une
  commande nommée (versions résolues inconnues avant l'ajout) ; `SOCLE_SHA256` est relevé par `sha256sum` à l'étape 4 de T7.
