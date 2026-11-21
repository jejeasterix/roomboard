# Usage C6b — pot de peinture sur image : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**But :** le pot remplit ou efface une zone d'une image par diffusion 4-connexe, avec une tolérance réglable (défaut 5) ; chaque clic est une étape annulable ; « Rétablir l'original » rend l'image d'avant tout remplissage.

**Architecture :** le cœur Rust reçoit `Command::Fill` avec la cible `FillTarget::Image { id, asset }` (nouvel asset, `sourceAsset` posé au premier remplissage, pixels de C5 cuits et retirés) et `SetImageParams.restore`. La page calcule le nouvel asset hors de l'instance qui enregistre : la file du pot (`app/image-fill.ts`) envoie l'original pleine résolution au Worker de pixels (décodage partagé `platform/image-decode.ts`, `flood_fill` RVBA du module `formats`, encodage PNG), met le PNG au magasin, écrit `Fill`, puis fait adopter le bitmap par le cache. Un jeton de révision (`doc.version()`) abandonne la file si le document change pendant le calcul.

**Tech :** Rust (yrs, wasm-bindgen), TypeScript, Solid, Vitest, Playwright (essais).

**Spec :** `docs/plans/usage-c6b-pot-image-cadrage.md`

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Cœur Rust : remplissage d'image, `sourceAsset`, Rétablir, fixture C5, liaison | — | crates/roomboard-core/src/fill.rs, crates/roomboard-core/src/image.rs, crates/roomboard-core/src/commands.rs, crates/roomboard-core/src/element.rs, crates/roomboard-core/tests/compat_c6b.rs (neuf), crates/roomboard-core/tests/pot_image.rs (neuf), crates/roomboard-core/tests/fixtures/image-c5.roomboard (neuf), crates/roomboard-wasm/src/lib.rs | isolé | concepteur-critique | roomboard-core `--test pot_image` ≥ 8 tests dont `restore_brings_back_source_asset_in_one_step` ; `--test compat_c6b` 2 tests ; roomboard-wasm `fill_image_inner_and_restore_flag` ; tests `pot`, `compat_c5`, C5 de `image.rs` verts ; module Wasm ≤ 1 572 864 o | S2, S4 | #tache-t1 |
| T2 | Pixels : `flood_fill` RVBA, effacer, nombre changé | — | crates/roomboard-formats/src/pixels.rs, crates/roomboard-formats-wasm/src/lib.rs | isolé | implementeur-tdd | roomboard-formats `flood_fill` ≥ 5 tests dont `transparent_zone_does_not_leak_into_black` ; roomboard-formats-wasm `image_adjust_and_flood_fill_inner` ; tests C5 de `pixels.rs` verts ; module formats mesuré avant/après ≤ 3 145 728 o | S3 | #tache-t2 |
| T3 | Moteur : types, pixel source, cible `ImageFill`, outil, tolérance, pipette, `restore` | — | apps/web/src/core/api.ts, apps/web/src/core/image-params.ts, apps/web/src/core/image-params.test.ts, apps/web/src/engine/fill-target.ts, apps/web/src/engine/fill-target.test.ts, apps/web/src/engine/tools/fill.ts, apps/web/src/engine/tools/fill.test.ts, apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts, apps/web/src/engine/tools/image-edit.ts | isolé | implementeur-tdd | vitest 4 fichiers : ≥ 1 test des blocs `pixel source sous le point`, `image : action ImageFill`, `C6b : avec la file`, `C6b restore` ; pipette C5 verte ; tsc sans erreur | S1, S5 b | #tache-t3 |
| T4 | Décodage partagé, Worker et lanceur du remplissage | — | apps/web/src/platform/image-decode.ts (neuf), apps/web/src/platform/image-decode.test.ts (neuf), apps/web/src/platform/image-import.ts, apps/web/src/platform/pixel-runner.ts, apps/web/src/platform/pixel-runner.test.ts, apps/web/src/platform/pixel-worker.ts, apps/web/src/platform/container.ts | isolé | implementeur-tdd | vitest `image-decode`, `pixel-runner`, `image-import` : ≥ 1 test `S5 h`, `un remplissage n'est jamais remplacé`, `applyFill` ; tsc sans erreur | S5 e, S5 h | #tache-t4 |
| T5 | Cache : adoption, copie, budget, emplacement gardé | — | apps/web/src/engine/render/image-cache.ts, apps/web/src/engine/render/image-cache.test.ts | isolé | concepteur-critique | vitest `image-cache.test.ts` ≥ 1 test `S5 g`, `C6b B16 : annuler un remplissage` ; test C5 `Annuler pendant un calcul` vert ; tsc sans erreur | S5 g | #tache-t5 |
| T6 | Parité du cœur TS : liaison Wasm et faux cœur | T1, T3 | apps/web/src/core/wasm-core.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/wasm-core.contract.test.ts | isolé | concepteur-critique | vitest contrat avec `ROOMBOARD_WASM_REQUIRED=1` : ≥ 4 tests `contrat C6b : fake` et `contrat C6b : wasm` ; contrats C5, C6a verts ; tsc sans erreur | S2 | #tache-t6 |
| T7 | File du pot `app/image-fill.ts` | T3, T4, T5 | apps/web/src/app/image-fill.ts (neuf), apps/web/src/app/image-fill.test.ts (neuf) | isolé | concepteur-critique | vitest `image-fill.test.ts` ≥ 12 tests dont `S5 a`, `S5 c`, `S5 f` ; tsc sans erreur | S5 a–f, S5 h | #tache-t7 |
| T8 | Rangée du pot : curseur de tolérance | T3 | apps/web/src/ui/Toolbar.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/ui/item-state.ts, apps/web/src/ui/rb.css, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts | isolé | implementeur-tdd | vitest `Toolbar.test.tsx`, `toolbar-host.test.ts` : ≥ 1 test `C6b : curseur de tolérance` ; rangée C6a verte ; tsc sans erreur | S1 | #tache-t8 |
| T9 | Câblage de la session, `data-pot` | T6, T7 | apps/web/src/app/board-session.ts, apps/web/src/app/board-session.test.ts, apps/web/src/app/stage-tags.ts, apps/web/src/app/stage-tags.test.ts, apps/web/src/engine/engine.test.ts | isolé | implementeur-tdd | vitest `board-session`, `stage-tags`, `engine` : ≥ 1 test `S5 c (session)`, `S5 e (session)`, `C6b I31` ; `pnpm -r test` vert ; tsc sans erreur | S5 c, S5 e | #tache-t9 |
| T10 | Essais navigateur, capture, `verifier.sh --e2e` | T1, T2, T3, T4, T5, T6, T7, T8, T9 | scripts/essais/c6b-pot-image-navigateur.mjs (neuf), scripts/essais/commun.mjs, scripts/essais/c2-image-navigateur.mjs, scripts/essais/c14-media-navigateur.mjs, scripts/essais/c6a-pot-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/essais/c6b-pot-image.png (neuf), apps/web/src/ui/rb.css | isolé | implementeur-tdd | `node scripts/essais/c6b-pot-image-navigateur.mjs` → `C6b pot sur image : OK` ; `scripts/verifier.sh --e2e` → `verifier.sh : e2e OK` puis `verifier.sh : OK` ; capture décrite | S1 | #tache-t10 |

**Vagues** (fichiers disjoints dans une vague, worktrees `~/projets/roomboard-wt/usage-c6b-pot-image--T<n>`) :
V1 = T1, T2, T3, T4, T5 · V2 = T6, T7, T8 · V3 = T9 · V4 = T10.

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/fill.rs` | variante `FillTarget::Image`, aiguillage vers `image.rs` | T1 |
| `crates/roomboard-core/src/image.rs` | `cmd_fill_image` (B3, B4), `restore` de `cmd_set_image_params` (B11) | T1 |
| `crates/roomboard-core/src/commands.rs` | `SetImageParams.restore` | T1 |
| `crates/roomboard-core/src/element.rs` | `ImageView.source_asset` lu tolérant (B12) | T1 |
| `crates/roomboard-core/tests/compat_c6b.rs`, `fixtures/image-c5.roomboard` | fichier d'avant C6b (B23, S4) | T1 |
| `crates/roomboard-core/tests/pot_image.rs` | S2 par l'API publique | T1 |
| `crates/roomboard-wasm/src/lib.rs` | `fill_image`, `set_image_params(…, restore)` | T1 |
| `crates/roomboard-formats/src/pixels.rs` | `flood_region` à prédicat, `flood_fill` RVBA (B8, B17) | T2 |
| `crates/roomboard-formats-wasm/src/lib.rs` | `image_flood_fill(…, clear) -> u32` | T2 |
| `apps/web/src/core/api.ts` | types `FillTarget` image, `restore?`, `sourceAsset?` | T3 |
| `apps/web/src/core/image-params.ts` | `sourcePixelAt` (B5), partagé pot / pipette | T3 |
| `apps/web/src/engine/fill-target.ts` | `ImageFillAt`, `FillRequest` (B19) | T3 |
| `apps/web/src/engine/tools/fill.ts` | `FillToolQueue`, toutes les actions vers la file | T3 |
| `apps/web/src/engine/engine.ts` | `fillTolerance`, `setFillTolerance` (B10) | T3 |
| `apps/web/src/engine/tools/image-edit.ts` | pipette par `sourcePixelAt`, `restore: true` | T3 |
| `apps/web/src/platform/image-decode.ts` | décodage sans DOM (B25) | T4 |
| `apps/web/src/platform/pixel-runner.ts`, `pixel-worker.ts`, `container.ts` | `fill(job)`, `applyFill`, branche remplissage du Worker (B14) | T4 |
| `apps/web/src/engine/render/image-cache.ts` | `adopt`, `copyOf`, budget (B15), emplacement gardé (B16) | T5 |
| `apps/web/src/core/wasm-core.ts`, `fake-core.ts` | parité des deux cœurs (B2-B4, B11, B12) | T6 |
| `apps/web/src/app/image-fill.ts` | file du pot, jeton de révision (B13, B14, B20, B21) | T7 |
| `apps/web/src/ui/Toolbar.tsx`, `item-state.ts`, `rb.css`, `app/toolbar-host.ts` | curseur de tolérance (B10, B22) | T8 |
| `apps/web/src/app/board-session.ts`, `stage-tags.ts` | file câblée, `#stage[data-pot]` | T9 |
| `scripts/essais/*.mjs`, `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai S1, essai C6a réécrit, `zipEntries`/`sha256` communs (B24) | T10 |

## Global Constraints

- **GC1 TDD** : chaque comportement commence par un test qui échoue, lancé et vu rouge avant le code.
- **GC2 Preuve bornée** : `cargo test -p <crate> <filtre> 2>&1 | tail -20` et `pnpm --filter @roomboard/web exec vitest run <fichiers> 2>&1 | tail -20` ; le rapport cite la ligne qui prouve qu'un test a tourné (`test result: ok. N passed`, `Tests  N passed`, N ≥ 1) et le nom du test attendu. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- **GC3 Tailles** : module Wasm principal ≤ 1 572 864 o (référence 1 119 330 o) ; module `formats` ≤ 3 145 728 o (référence 3 099 350 o) ; ajout au module `formats` au strict nécessaire, tailles mesurées avant et après dans la tâche qui le touche.
- **GC4 Dépendances** : aucune crate d'image ajoutée, aucun paquet npm ajouté, aucune dépendance AGPL, GPL ou LGPL ; `Cargo.toml`, `Cargo.lock`, `package.json`, `pnpm-lock.yaml` inchangés.
- **GC5 Images de test** fabriquées dans les tests (tableaux d'octets, `rgbPng`), jamais téléchargées.
- **GC6** Aucun seuil changé, aucun test désactivé ni sauté (`.skip`, `.only`, `#[ignore]`), aucune assertion affaiblie. Un test existant ne change que si le cadrage change le contrat qu'il fixe (cas nommés dans la section).
- **GC7** La scène ne passe pas sous 640 px de haut (1280 × 900, Pot actif, curseur visible).
- **GC8** Aucun build Tauri (`pnpm --filter @roomboard/desktop tauri build` interdit).
- **GC9 Commits** : `git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>"`, message en anglais terminé par une ligne vide puis `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (`git add <chemin>`), jamais `git add -A`, `git add .`, `git commit -a` ; aucun `git push`, aucun tag.
- **GC10** Chaque commande commence par `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`.
- **GC11 Couches** : `crates/` sans dépendance au navigateur ; le moteur (`engine/`) n'importe `platform/` qu'en type ; le Worker (`pixel-worker.ts`) n'importe ni le moteur, ni l'application, ni le DOM.
- **GC12** Commentaires et messages lisibles en français, comme le code existant ; identifiants en anglais.

## Review Focus

- **RF1** Photo de téléphone orientée par EXIF : la graine est calculée dans le repère orienté (taille `w × h` de l'import) ; le Worker doit décoder l'original avec `imageOrientation: "from-image"`, sinon la zone remplie est ailleurs. Test dans T4 (`S5 h : max = Infinity … orientation EXIF appliquée`), d'après B7 (« même orientation EXIF … qu'à l'import »).
- **RF2** Couleur du préréglage d'un profil en majuscules (`#FACC15`) : `rgbOf` n'accepte que les minuscules ; le remplissage doit marcher. Test dans T4 (`applyFill : graine mise à l'échelle … couleur en majuscules`), d'après B8 (« remplir : RVB choisi »).
- **RF3** Image dans un groupe : remplie seule, le groupe et ses autres membres inchangés. Test dans T1 (`grouped_image_fills_alone_and_keeps_its_group`), d'après B19 (« Image dans un groupe : remplie seule (C6a D4) »).
- **RF4** Onglet fermé pendant un calcul de remplissage : rien n'est écrit, le bitmap arrivé est fermé. Test dans T7 (`RF4 : dispose pendant le calcul`), d'après B14 (ordre des effets) et B13.
- **RF5** Clic au bord bas-droit de la boîte (bande de 6 px) d'une image rognée, tournée et retournée : la graine reste un pixel du rognage. Test dans T3 (`RF5 : bord de la boîte avec quart de tour et retournement`), d'après B5 (« ramené … borné »).

## Écarts déclarés au cadrage (interfaces seulement, aucun comportement changé)

- **E1** `ImageFillAt` n'a pas de champ `key` (B19) : la file lit l'élément courant au moment du calcul ; B13 garantit qu'il n'a changé que par les écritures de la file elle-même ; une clé prise au clic serait périmée dès le second clic (S5 a).
- **E2** `PixelFillJob` porte en plus `size: [w, h]` (taille source de l'élément) : le bitmap d'un SVG peut être plus petit que `w × h` ; le Worker met la graine à l'échelle (`applyFill`).
- **E3** `fill(job)` est dans l'interface `PixelFillRunner`, à côté de `PixelRunner` (inchangée) ; `createPixelRunner` rend `PixelRunner & PixelFillRunner` ; `FillQueueDeps.runner` est `PixelFillRunner`. Raison : les faux lanceurs existants (`image-cache.test.ts`) restent valides sans retouche croisée entre T4 et T5.
- **E4** `FillQueue` expose `state(): PotState` (lu par le marquage de la session) en plus de `onState`.
- **E5** `sourcePixelAt` borne la graine au rognage (donc à l'image) plutôt qu'à `[0, w−1] × [0, h−1]` seulement : identique pour tout point intérieur, plus juste au bord exact de la boîte.

---

<a id="tache-t1"></a>
### Tâche T1 — Cœur Rust : remplissage d'image, `sourceAsset`, Rétablir, fixture C5, liaison

**Objectif.** `Command::Fill` accepte la cible `FillTarget::Image { id, asset }` : une transaction écrit le nouvel asset, pose `sourceAsset` au premier remplissage seulement, retire luminosité, contraste et couleur transparente (cuits dans les pixels par la page), garde la géométrie et la matrice, et écrit la métadonnée du nouvel asset. `SetImageParams { restore: true }` rend `sourceAsset` dans la même étape. La fixture `image-c5.roomboard` est écrite **avant tout changement** par le code de `main`. La liaison principale expose `fill_image` et `restore`. Scénarios S2 et S4.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T1` (ou celui que donne l'orchestrateur). Commandes : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && …`.

**Fichiers.**
- Créer : `crates/roomboard-core/tests/compat_c6b.rs`, `crates/roomboard-core/tests/fixtures/image-c5.roomboard` (généré), `crates/roomboard-core/tests/pot_image.rs`
- Modifier : `crates/roomboard-core/src/element.rs:66-82` (`ImageView`), `:312-334` (`read_image`) ; `crates/roomboard-core/src/fill.rs:1-22`, `:44-80` ; `crates/roomboard-core/src/image.rs:258-302` et le module de tests (`set`, `:600-611`) ; `crates/roomboard-core/src/commands.rs:202-207` (doc de `Fill`), `:232-236`, `:792-794` ; `crates/roomboard-wasm/src/lib.rs:653-686` (`set_image_params`), `:1133-1146` (`fill`), `:1366-1378` (`set_image_params_inner`), `:1627-1642` (`fill_inner`), tests `:2279-2317`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit (Rust) :
  - `pub enum FillTarget { Edge { id: String }, Inside { id: String }, Background, Image { id: String, asset: AssetRef } }` — dérive `Debug, Clone, PartialEq` (plus `Eq` : `AssetRef` a un `f64`).
  - `pub(crate) fn Document::cmd_fill_image(&mut self, page: &str, id: &str, asset: &AssetRef) -> Result<Change, CommandError>` dans `image.rs`.
  - `Command::SetImageParams { id: String, params: ImageParamsInput, matrix: Transform, restore: bool }`.
  - `pub(crate) fn Document::cmd_set_image_params(&mut self, id: &str, p: &ImageParamsInput, m: &Transform, restore: bool) -> Result<Change, CommandError>`.
  - `ImageView.source_asset: Option<String>`, sérialisé `sourceAsset`, absent si `None`.
- Produit (liaison `roomboard-wasm`, lue par T6) :
  - `pub fn fill_image(&mut self, page: &str, id: &str, asset: &str, name: &str, mime: &str, size: f64, color: Option<String>) -> Result<JsValue, JsError>`
  - `pub fn fill_image_inner(&mut self, page: &str, id: &str, asset: AssetRef, color: Option<String>) -> Result<Change, CommandError>`
  - `pub fn set_image_params(&mut self, id, crop, flip_x, flip_y, quarter_turns, brightness, contrast, color, transparent, matrix: &[f64], restore: bool)` (dernier argument ajouté)
  - `pub fn set_image_params_inner(&mut self, id: &str, params: ImageParamsInput, matrix: &[f64], restore: bool) -> Result<Change, CommandError>`
- Réutilise : `crates/roomboard-core/src/fill.rs:18` — `FillTarget`, `cmd_fill` (contrôle de la couleur gardé en tête, `fill.rs:50-52`), étendu d'une variante et d'un aiguillage.
- Réutilise : `crates/roomboard-core/src/image.rs:125`, `:258` ; `element.rs:312` — `read_image(&txn, &e) -> Option<(Transform, ImageView)>`, `read_params`, `plan`, `cmd_set_image_params` étendu de `restore`.
- Réutilise : `crates/roomboard-core/src/document.rs:275` — `Document::insert_asset_meta(&self, txn: &mut TransactionMut, a: &AssetRef)` ; `crates/roomboard-core/src/commands.rs:510` — `valid_asset(a: &AssetRef) -> bool`, appelés tels quels.
- Réutilise : `crates/roomboard-core/src/document.rs:679` (`collect_out`), `copy.rs:94` (`cited_by`) — sans changement : `sourceAsset` est une chaîne conforme, donc citée (enregistrer, copier, `.rbitem`).
- Réutilise : `crates/roomboard-wasm/src/lib.rs:109` — `asset_ref(id, name, mime, size) -> AssetRef` ; `fill_inner` et `set_image_params_inner` étendus.
- Réutilise (patron) : `crates/roomboard-core/tests/compat_c5.rs:13-60` — `fixture`, `meta`, `regenerate`, `fixture_bytes`.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise` ci-dessus.

**Patron à ne pas reprendre (concepteur-critique).**
- `crates/roomboard-core/src/fill.rs:84-104` (`cmd_fill`) écrit **une** clé : un remplissage d'image en écrit jusqu'à six (`asset`, `sourceAsset`, trois retraits, métadonnée) dans **une** transaction, sinon Annuler rendrait l'image à moitié.
- `crates/roomboard-core/src/commands.rs:1007-1018` (`cmd_set_backdrop`) réécrit tout le `Y.Map` : ici seules les clés qui changent sont écrites.
- Écrire `sourceAsset` à chaque remplissage : le second remplissage perdrait l'original (B3, « seulement s'il est absent »).
- Chemin de référence : `crates/roomboard-core/src/image.rs:258-302` (lecture sous une transaction de lecture fermée, puis une seule transaction locale, `self.done(Change { … })`).

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`cargo test -p roomboard-core --test pot_image 2>&1 | tail -20`) · GC3 module Wasm principal ≤ 1 572 864 o (référence 1 119 330 o), mesuré en fin de tâche · GC4 aucune crate ajoutée · GC6 aucun test désactivé ni assertion affaiblie · GC8 aucun build Tauri · GC9 commits (auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, anglais, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, fichiers un par un) · GC10 `PATH` · GC11 `crates/` sans navigateur · GC12 français.

**Interdits.** Toucher `crates/roomboard-formats*`, `apps/`, `scripts/`. Changer `schema` ou `formatVersion`. Régénérer `image-c2.roomboard`. Régénérer `image-c5.roomboard` après l'étape 2.

**Terminé quand.** `cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|error\[" ` ne montre que des `ok` (dont `pot_image` ≥ 8 passed, `compat_c6b` 2 passed, `pot`, `compat_c5`) ; `cargo test -p roomboard-wasm fill_image 2>&1 | tail -5` montre `1 passed` ; `cargo fmt --all --check` et `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings` sans sortie d'erreur ; taille du module mesurée ≤ 1 572 864 o ; commits faits.

#### Étapes

- [ ] **1. Écrire la garde de compatibilité avec le code d'avant C6b** (aucun autre fichier n'est encore modifié). Créer `crates/roomboard-core/tests/compat_c6b.rs` :

```rust
//! Garde de compatibilité C6b (B23, S4) : `image-c5.roomboard` a été écrit une fois par le code de `main` 458a90d
//! (image retouchée par C5 : rognage, luminosité, couleur transparente ; aucun `sourceAsset`). Il ne se régénère pas
//! après C6b : `ROOMBOARD_REGENERER_FIXTURES=1` seulement avec le code d'avant C6b.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::{ImageParamsInput, TransparentInput};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const M: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 100.0, 80.0];

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/image-c5.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

/// Document de C5 : image 200 × 150 en (100, 80), rognée [10, 20, 160, 120], luminosité 20, blanc transparent
/// (tolérance 10, contigu). Même matrice à l'ajout et aux réglages : aucun champ `transform` remplacé.
fn c5_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddImage {
            page: p,
            asset: AssetRef {
                id: ABC.into(),
                name: "anneau.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 150.0,
            matrix: M,
        })
        .expect("image")
        .ids[0]
        .clone();
    d.apply(Command::SetImageParams {
        id,
        params: ImageParamsInput {
            crop: Some([10.0, 20.0, 160.0, 120.0]),
            brightness: 20.0,
            transparent: Some(TransparentInput {
                color: "#ffffff".into(),
                tolerance: 10.0,
                soft: 0.0,
                contiguous: true,
            }),
            ..ImageParamsInput::default()
        },
        matrix: M,
    })
    .expect("réglages");
    d
}

fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        std::fs::write(&path, save(&c5_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture image-c5.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c6b (code d'avant C6b seulement)",
    )
}

/// S4 : le fichier d'avant C6b s'ouvre retouché et se réenregistre aux mêmes octets.
#[test]
fn image_c5_fixture_opens_retouched_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let p = d.page_ids()[0].clone();
    let ids = d.element_ids(&p);
    assert_eq!(ids.len(), 1);
    let i = d.element(&ids[0]).and_then(|v| v.image).expect("image");
    assert_eq!(
        (i.asset.as_str(), i.crop, i.brightness),
        (ABC, Some([10, 20, 160, 120]), 20)
    );
    assert_eq!(
        i.transparent.map(|t| (t.color, t.tolerance, t.contiguous)),
        Some(("#ffffff".to_string(), 10, true))
    );
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C6b réenregistré à l'identique"
    );
}
```

- [ ] **2. Générer la fixture avec le code de `main`, puis la relire sans régénérer.**
  - `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c6b 2>&1 | tail -5` → `test result: ok. 1 passed`.
  - `cargo test -p roomboard-core --test compat_c6b 2>&1 | tail -5` → `test result: ok. 1 passed` (nom `image_c5_fixture_opens_retouched_and_resaves_identically`).
  - Commit : `git add crates/roomboard-core/tests/fixtures/image-c5.roomboard` puis `git add crates/roomboard-core/tests/compat_c6b.rs`, `git commit --author="jejeasterix <jejeasterix@users.noreply.github.com>" -m "test(core): add image-c5 fixture written by pre-C6b code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

- [ ] **3. Écrire les tests rouges de S2.** Créer `crates/roomboard-core/tests/pot_image.rs` :

```rust
//! Pot sur une image (C6b, B2-B4, B11, B12 ; S2) par l'API publique du cœur.
use roomboard_core::asset::AssetRef;
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{ImageView, StrokeStyle, Transform};
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::{ImageParams, ImageParamsInput, TransparentInput};
use roomboard_core::shape::ShapeKind;

const ORIG: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const M: Transform = [1.0, 0.0, 0.0, 1.0, 100.0, 80.0];
const YELLOW: &str = "#facc15";

/// Empreinte conforme faite d'un seul chiffre hexadécimal.
fn hash(c: char) -> String {
    c.to_string().repeat(64)
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn png(id: &str) -> AssetRef {
    AssetRef {
        id: id.into(),
        name: "photo.png".into(),
        mime: "image/png".into(),
        size: 9.0,
    }
}

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

/// Image 200 × 150 retouchée par C5 : rognage, un quart de tour, luminosité 20, blanc transparent.
fn retouched() -> (Document, String, String) {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddImage {
            page: p.clone(),
            asset: AssetRef {
                id: ORIG.into(),
                name: "photo.jpg".into(),
                mime: "image/jpeg".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 150.0,
            matrix: M,
        })
        .expect("image")
        .ids[0]
        .clone();
    d.apply(Command::SetImageParams {
        id: id.clone(),
        params: ImageParamsInput {
            crop: Some([10.0, 20.0, 160.0, 120.0]),
            quarter_turns: 1.0,
            brightness: 20.0,
            transparent: Some(TransparentInput {
                color: "#ffffff".into(),
                tolerance: 10.0,
                soft: 0.0,
                contiguous: true,
            }),
            ..ImageParamsInput::default()
        },
        matrix: M,
        restore: false,
    })
    .expect("réglages");
    (d, p, id)
}

fn fill(p: &str, id: &str, a: AssetRef, color: Option<&str>) -> Command {
    Command::Fill {
        page: p.into(),
        target: FillTarget::Image {
            id: id.into(),
            asset: a,
        },
        color: color.map(str::to_string),
    }
}

fn restore(id: &str) -> Command {
    Command::SetImageParams {
        id: id.into(),
        params: ImageParamsInput::default(),
        matrix: M,
        restore: true,
    }
}

fn image(d: &Document, id: &str) -> ImageView {
    d.element(id).and_then(|e| e.image).expect("image")
}

fn cited(d: &Document) -> Vec<String> {
    d.cited_assets().into_iter().map(|a| a.id).collect()
}

fn sorted(mut v: Vec<String>) -> Vec<String> {
    v.sort();
    v
}

#[test]
fn fill_image_is_one_step_new_asset_source_and_baked_fields_removed() {
    let (mut d, p, id) = retouched();
    let mid = hash('1');
    let c = d.apply(fill(&p, &id, png(&mid), Some(YELLOW))).expect("remplissage");
    assert_eq!((c.pages, c.ids), (vec![p.clone()], vec![id.clone()]));
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset.as_deref()),
        (mid.as_str(), Some(ORIG))
    );
    assert_eq!(
        i.params(),
        ImageParams {
            crop: Some([10, 20, 160, 120]),
            quarter_turns: 1,
            ..ImageParams::default()
        },
        "géométrie gardée, pixels de C5 retirés (cuits)"
    );
    assert_eq!(d.element(&id).expect("vue").transform, M);
    assert_eq!(
        d.asset(&mid).map(|a| (a.name, a.mime)),
        Some(("photo.png".to_string(), "image/png".to_string()))
    );
    assert!(d.undo());
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset, i.brightness),
        (ORIG, None, 20)
    );
    assert!(
        i.transparent.is_some(),
        "Annuler rend la couleur transparente dans la même étape"
    );
}

#[test]
fn second_fill_keeps_first_source_and_two_undos_restore_start() {
    let (mut d, p, id) = retouched();
    let start = image(&d, &id);
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("premier");
    d.apply(fill(&p, &id, png(&hash('2')), None)).expect("second");
    let i = image(&d, &id);
    assert_eq!((i.asset, i.source_asset.as_deref()), (hash('2'), Some(ORIG)));
    assert!(d.undo() && d.undo());
    assert_eq!(image(&d, &id), start);
}

/// Effet de bord : « Rétablir l'original » rend aussi l'asset d'origine, en une étape (B11).
#[test]
fn restore_brings_back_source_asset_in_one_step() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    let v = d.version();
    let c = d.apply(restore(&id)).expect("rétablir");
    assert_eq!(c.ids, vec![id.clone()]);
    assert!(d.version() > v);
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset.clone(), i.params()),
        (ORIG, None, ImageParams::default())
    );
    assert!(d.undo());
    let i = image(&d, &id);
    assert_eq!(
        (i.asset, i.source_asset.as_deref(), i.crop),
        (hash('1'), Some(ORIG), Some([10, 20, 160, 120]))
    );
}

/// B11 : sans `sourceAsset`, `restore` se comporte comme C5 (tous les champs retirés, même asset).
#[test]
fn restore_without_source_asset_is_c5_unchanged() {
    let (mut d, _, id) = retouched();
    d.apply(restore(&id)).expect("rétablir");
    let i = image(&d, &id);
    assert_eq!(
        (i.asset.as_str(), i.source_asset, i.params()),
        (ORIG, None, ImageParams::default())
    );
    assert!(
        d.apply(restore(&id)).expect("même état").ids.is_empty(),
        "image brute sans sourceAsset : aucune étape (D38)"
    );
}

/// B2 : même asset que l'actuel : aucune étape ; refus dans l'ordre couleur, page, élément de cette page, image
/// lisible, asset ; aucun refus n'écrit.
#[test]
fn same_asset_is_no_step_and_refusals_keep_core_order() {
    let (mut d, p, id) = retouched();
    let v = d.version();
    let same = AssetRef {
        id: ORIG.into(),
        name: "photo.jpg".into(),
        mime: "image/jpeg".into(),
        size: 3.0,
    };
    assert!(d
        .apply(fill(&p, &id, same, Some(YELLOW)))
        .expect("même asset")
        .ids
        .is_empty());
    assert_eq!(d.version(), v);
    let stroke = d
        .apply(Command::CommitStroke {
            page: p.clone(),
            points: vec![0.0, 0.0, 0.5, 50.0, 0.0, 0.5],
            style: pen(),
        })
        .expect("trait")
        .ids[0]
        .clone();
    let other = d.add_page();
    let v = d.version();
    let bad = AssetRef {
        id: "x".into(),
        ..png(&hash('1'))
    };
    let cases = [
        (
            fill("nope", &id, png(&hash('1')), Some("#12")),
            CommandError::BadFill,
        ),
        (
            fill("nope", &id, png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownPage("nope".into()),
        ),
        (
            fill(&p, "nope", png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownElement("nope".into()),
        ),
        (
            fill(&other, &id, png(&hash('1')), Some(YELLOW)),
            CommandError::UnknownElement(id.clone()),
        ),
        (fill(&p, &stroke, bad.clone(), None), CommandError::BadFill),
        (fill(&p, &id, bad, None), CommandError::BadAsset),
    ];
    for (cmd, want) in cases {
        assert_eq!(d.apply(cmd), Err(want));
    }
    assert_eq!(d.version(), v, "aucun refus n'écrit");
}

/// S2 : le fichier cite l'original et la version courante seulement ; la métadonnée de la version intermédiaire reste
/// dans `assets` (C2 K3, aucun ménage implicite).
#[test]
fn saved_file_cites_original_and_current_and_keeps_intermediate_meta() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("premier");
    d.apply(fill(&p, &id, png(&hash('2')), None)).expect("second");
    let want = sorted(vec![hash('2'), ORIG.to_string()]);
    assert_eq!(cited(&d), want);
    let r = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(cited(&r), want);
    assert_eq!(
        r.asset(&hash('1')).map(|a| a.mime),
        Some("image/png".to_string()),
        "métadonnée intermédiaire gardée (K3)"
    );
    assert_eq!(image(&r, &id).source_asset.as_deref(), Some(ORIG));
}

/// Effet de bord : copier-coller une image remplie emporte l'original et la version courante (`cited_by`).
#[test]
fn copy_paste_of_filled_image_carries_both_assets() {
    let (mut d, p, id) = retouched();
    d.apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    let f = d.extract(&p, std::slice::from_ref(&id)).expect("extract");
    let mut t = Document::blank();
    let tp = t.page_ids()[0].clone();
    let pasted = t.insert_fragment(&f, &tp, 10.0, 0.0).expect("collage").ids[0].clone();
    assert_eq!(
        sorted(cited(&t)),
        sorted(vec![hash('1'), ORIG.to_string()])
    );
    assert_eq!(image(&t, &pasted).source_asset.as_deref(), Some(ORIG));
}

/// Review Focus RF3 : une image d'un groupe se remplit seule ; son groupe et l'autre membre restent (B19, C6a D4).
#[test]
fn grouped_image_fills_alone_and_keeps_its_group() {
    let (mut d, p, id) = retouched();
    let r = d
        .apply(Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Rect,
            x0: 0.0,
            y0: 0.0,
            x1: 50.0,
            y1: 50.0,
            style: pen(),
            fill: None,
        })
        .expect("forme")
        .ids[0]
        .clone();
    d.apply(Command::Group {
        ids: vec![id.clone(), r.clone()],
    })
    .expect("groupe");
    let group = d.element(&id).expect("vue").group;
    let rect = d.element(&r);
    let c = d
        .apply(fill(&p, &id, png(&hash('1')), Some(YELLOW)))
        .expect("remplissage");
    assert_eq!(c.ids, vec![id.clone()]);
    assert_eq!(d.element(&id).expect("vue").group, group);
    assert_eq!(d.element(&r), rect);
}
```

- [ ] **4. Lancer, voir rouge.** `cargo test -p roomboard-core --test pot_image 2>&1 | tail -20` → erreurs de compilation `error[E0599]` / `error[E0559]` (`FillTarget::Image`, champ `restore`, `source_asset` absents).

- [ ] **5. `element.rs` : `source_asset`.** Dans `ImageView`, après `transparent` :

```rust
    /// C6b (B12) : asset d'avant le premier remplissage au pot, pour « Rétablir l'original » ; absent sinon (ou illisible, U3).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_asset: Option<String>,
```

Dans `read_image`, dans le littéral `ImageView { … }`, après `transparent: p.transparent,` :

```rust
            source_asset: out_string(e.get(txn, "sourceAsset")).filter(|a| is_asset_id(a)),
```

- [ ] **6. `fill.rs` : variante et aiguillage.** Remplacer l'en-tête du module (lignes 1-4) par :

```rust
//! Pot de peinture (C6a, DA1, DA2) : commande `Fill` (contour, intérieur, fond de page), une transaction, aucune étape
//! sans effet (D38), et requête `edge_hit` (bord d'un rectangle ou d'une ellipse, mesuré comme `hit_test`). Mots et
//! cellules gardent `FormatText`, `SetTableCell`, `SetTableFill` (D6, D8, D9). C6b : zone d'une image
//! (`FillTarget::Image`, écrite par `image.rs`, `cmd_fill_image`) ; C8 ajoutera une variante.
```

Ajouter `use crate::asset::AssetRef;`. Remplacer l'énumération :

```rust
/// Cible du pot (D12) : contour d'une forme ou d'un trait (`color`), intérieur d'un rectangle ou d'une ellipse (`fill`),
/// fond de la page (`background`) ; C6b (B2) : image, avec le nouvel asset calculé par la page (pixels remplis ou effacés).
#[derive(Debug, Clone, PartialEq)]
pub enum FillTarget {
    Edge { id: String },
    Inside { id: String },
    Background,
    Image { id: String, asset: AssetRef },
}
```

Dans `cmd_fill`, juste après le refus de couleur (`return Err(CommandError::BadFill);` puis `}`) :

```rust
        if let FillTarget::Image { id, asset } = target {
            return self.cmd_fill_image(page, id, asset);
        }
```

Dans le `match target`, ajouter le bras (jamais atteint, l'image est aiguillée plus haut) :

```rust
                FillTarget::Image { .. } => return Err(CommandError::BadFill),
```

- [ ] **7. `image.rs` : `cmd_fill_image` et `restore`.** Imports : `use crate::asset::AssetRef;` et `use crate::commands::{valid_asset, valid_matrix, Change, CommandError};`. Ajouter après `fn plan` :

```rust
/// Champs de pixels de C5 cuits dans le nouvel asset par un remplissage (B4) : retirés dans la même transaction.
const BAKED: [&str; 3] = ["brightness", "contrast", "transparent"];
```

Dans `impl Document`, ajouter :

```rust
    /// Pot sur une image (C6b, B2-B4) : refus dans l'ordre page, élément de cette page, image lisible (`BadFill`), asset
    /// (`BadAsset`) ; même asset que l'actuel : aucune étape (D38). Une transaction : `asset` ← nouvel asset ;
    /// `sourceAsset` ← ancien asset s'il est absent (l'original reste celui d'avant le premier remplissage) ; luminosité,
    /// contraste et couleur transparente retirés (cuits par la page) ; géométrie et matrice gardées ; métadonnée du nouvel
    /// asset (K3). La couleur est contrôlée par `cmd_fill`, jamais écrite : les pixels la portent.
    pub(crate) fn cmd_fill_image(
        &mut self,
        page: &str,
        id: &str,
        asset: &AssetRef,
    ) -> Result<Change, CommandError> {
        let (element, view) = {
            let txn = self.read();
            self.find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let found = self
                .find_element(&txn, id)
                .filter(|f| f.page_id == page)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (_, view) = read_image(&txn, &found.element).ok_or(CommandError::BadFill)?;
            (found.element, view)
        };
        if !valid_asset(asset) {
            return Err(CommandError::BadAsset);
        }
        if asset.id == view.asset {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            element.insert(&mut txn, "asset", In::from(asset.id.as_str()));
            if view.source_asset.is_none() {
                element.insert(&mut txn, "sourceAsset", In::from(view.asset.as_str()));
            }
            for key in BAKED {
                if element.get(&txn, key).is_some() {
                    element.remove(&mut txn, key);
                }
            }
            self.insert_asset_meta(&mut txn, asset);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
```

Dans `cmd_set_image_params` : signature `(&mut self, id: &str, p: &ImageParamsInput, m: &Transform, restore: bool)` ; compléter la doc par « C6b (B11) : `restore` et un `sourceAsset` lisible : `asset` ← `sourceAsset` dans la même étape ; `sourceAsset` retiré, même illisible. » ; remplacer `let ops = plan(&txn, &found.element, &view.params(), &next);` par :

```rust
            let mut ops = plan(&txn, &found.element, &view.params(), &next);
            if restore {
                if let Some(src) = &view.source_asset {
                    ops.push(("asset", Some(In::from(src.as_str()))));
                }
                if found.element.get(&txn, "sourceAsset").is_some() {
                    ops.push(("sourceAsset", None));
                }
            }
```

- [ ] **8. `commands.rs` et appelants.** Variante :

```rust
    SetImageParams {
        id: String,
        params: crate::image::ImageParamsInput,
        matrix: Transform,
        /// « Rétablir l'original » (C6b, B11) : avec un `sourceAsset` lisible, l'asset d'origine revient dans la même étape.
        restore: bool,
    },
```

Bras d'`apply` : `Command::SetImageParams { id, params, matrix, restore } => self.cmd_set_image_params(&id, &params, &matrix, restore)`. Doc de `Fill` (`:202-203`) : ajouter « C6b : image (nouvel asset, `sourceAsset`, B2-B4). ». Dans `image.rs`, test `fn set` (`:600-611`) : ajouter `restore: false`. Dans `tests/compat_c6b.rs`, `c5_document` : ajouter `restore: false` (même document, octets inchangés).

- [ ] **9. Tests unitaires de `image.rs`** (dans `mod tests`, imports déjà présents : `AssetRef`, `put`, `add`, `ABC`, `ImageView`) :

```rust
    /// B12 : `sourceAsset` lu tolérant (non conforme = absent, U3) ; un premier remplissage le remplace par l'original.
    #[test]
    fn source_asset_read_tolerant_and_first_fill_overwrites_unreadable() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "sourceAsset", In::from("illisible"));
        assert_eq!(
            d.element(&id).and_then(|e| e.image).and_then(|i| i.source_asset),
            None
        );
        let next = AssetRef {
            id: "cd".repeat(32),
            name: "a.png".into(),
            mime: "image/png".into(),
            size: 9.0,
        };
        d.apply(Command::Fill {
            page: p,
            target: crate::fill::FillTarget::Image {
                id: id.clone(),
                asset: next,
            },
            color: None,
        })
        .expect("remplissage");
        assert_eq!(
            d.element(&id)
                .and_then(|e| e.image)
                .and_then(|i| i.source_asset)
                .as_deref(),
            Some(ABC)
        );
    }

    #[test]
    fn image_view_serializes_source_asset_camel_case() {
        let v = ImageView {
            asset: ABC.into(),
            w: 1.0,
            h: 1.0,
            source_asset: Some(ABC.into()),
            ..ImageView::default()
        };
        assert_eq!(
            serde_json::to_value(&v).expect("json"),
            serde_json::json!({ "asset": ABC, "w": 1.0, "h": 1.0, "sourceAsset": ABC })
        );
    }
```

Ajouter à `tests/compat_c6b.rs` :

```rust
/// S4 : l'image d'avant C6b n'a pas de `sourceAsset`.
#[test]
fn image_c5_fixture_has_no_source_asset() {
    let d = load(&fixture_bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let i = d
        .element(&d.element_ids(&p)[0])
        .and_then(|v| v.image)
        .expect("image");
    assert_eq!(i.source_asset, None);
}
```

- [ ] **10. Vert.** `cargo test -p roomboard-core --test pot_image 2>&1 | tail -20` → `test result: ok. 9 passed` ; `cargo test -p roomboard-core --test compat_c6b 2>&1 | tail -5` → `2 passed` ; `cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED|error\[" | tail -30` → que des `ok` (`pot`, `compat_c5`, tests C5 de `image.rs` compris). Commit des fichiers du cœur un par un : `feat(core): fill an image zone with a new asset, keep the source asset, restore it`.

- [ ] **11. Liaison principale : test rouge.** Dans `crates/roomboard-wasm/src/lib.rs`, module de tests (après `set_image_params_inner_writes_and_reads_back`) ; dans ce test existant, l'appel `set_image_params_inner(&id, params, &[…])` reçoit `, false` et l'appel à `&[1.0, 0.0]` aussi :

```rust
    // C6b (B2, B11) : pot sur image et « Rétablir l'original » par leurs `_inner`.
    #[test]
    fn fill_image_inner_and_restore_flag() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image")
            .ids[0]
            .clone();
        let next = AssetRef {
            id: "cd".repeat(32),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 9.0,
        };
        let c = d
            .fill_image_inner(&p, &id, next.clone(), Some("#facc15".into()))
            .expect("remplissage");
        assert_eq!(c.ids, vec![id.clone()]);
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(
            (i.asset.as_str(), i.source_asset.as_deref()),
            (next.id.as_str(), Some(ABC))
        );
        assert_eq!(
            d.fill_image_inner(
                &p,
                &id,
                AssetRef {
                    id: "x".into(),
                    ..next.clone()
                },
                None
            ),
            Err(CommandError::BadAsset)
        );
        d.set_image_params_inner(
            &id,
            ImageParamsInput::default(),
            &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            true,
        )
        .expect("rétablir");
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!((i.asset.as_str(), i.source_asset), (ABC, None));
    }
```

`cargo test -p roomboard-wasm fill_image 2>&1 | tail -10` → erreur de compilation (`fill_image_inner` absent).

- [ ] **12. Liaison principale : code.** Près de `fill` (`:1133`), dans le bloc `#[wasm_bindgen]` :

```rust
    /// Pot sur une image (C6b, B2) : nouvel asset (empreinte, nom, type, taille) et couleur contrôlée (absente ou null :
    /// « Aucune », zone effacée) ; voir `Document::cmd_fill_image`.
    #[allow(clippy::too_many_arguments)]
    pub fn fill_image(
        &mut self,
        page: &str,
        id: &str,
        asset: &str,
        name: &str,
        mime: &str,
        size: f64,
        color: Option<String>,
    ) -> Result<JsValue, JsError> {
        to_js(
            &self
                .fill_image_inner(page, id, asset_ref(asset, name, mime, size), color)
                .map_err(cmd_err)?,
        )
    }
```

Près de `fill_inner` (`:1627`) :

```rust
    pub fn fill_image_inner(
        &mut self,
        page: &str,
        id: &str,
        asset: AssetRef,
        color: Option<String>,
    ) -> Result<Change, CommandError> {
        self.run(Command::Fill {
            page: page.to_string(),
            target: FillTarget::Image {
                id: id.to_string(),
                asset,
            },
            color,
        })
    }
```

`set_image_params` : ajouter le paramètre `restore: bool` après `matrix: &[f64]`, et passer `restore` à `set_image_params_inner(id, params, matrix, restore)` ; doc : « `restore` : « Rétablir l'original » (C6b, B11). ». `set_image_params_inner` : paramètre `restore: bool`, `Command::SetImageParams { id: id.to_string(), params, matrix: m, restore }`.

- [ ] **13. Vert et taille.** `cargo test -p roomboard-wasm 2>&1 | grep -E "test result|FAILED" | tail -5` → `ok`, avec `fill_image_inner_and_restore_flag` dans `cargo test -p roomboard-wasm fill_image 2>&1 | tail -5` (`1 passed`). Taille : `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf /tmp/c6b-T1-wasm && wasm-bindgen --target web --remove-name-section --out-dir /tmp/c6b-T1-wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c < /tmp/c6b-T1-wasm/roomboard_wasm_bg.wasm` → valeur ≤ 1 572 864, citée au rapport avec la référence 1 119 330.

- [ ] **14. Format, lint, commit.** `cargo fmt --all --check 2>&1 | tail -5` (sinon `cargo fmt --all` puis revérifier) ; `cargo clippy -p roomboard-core -p roomboard-wasm --all-targets -- -D warnings 2>&1 | tail -10` → aucun `error`. Commit : `git add crates/roomboard-wasm/src/lib.rs` (et les fichiers du cœur reformatés, un par un), message `feat(wasm): expose fill_image and the restore flag`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 2, 10, 13, 14 ; taille du module ; lignes `Réutilisation : …`.

<a id="tache-t2"></a>
### Tâche T2 — Pixels : `flood_fill` RVBA, effacer, nombre changé

**Objectif.** `flood_fill` compare l'écart **RVBA** à la couleur de la graine (échelle de C5 I12), peint en RVB opaque (alpha 255) ou efface (`[0, 0, 0, 0]`), et rend le nombre de pixels changés ; `flood_region` reçoit un prédicat d'écart, la couleur transparente de C5 reste identique octet pour octet. Exposition au Worker : argument `clear` et retour `u32`. Scénario S3.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T2`. Commandes : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && …`.

**Fichiers.** Modifier : `crates/roomboard-formats/src/pixels.rs:1-3` (doc), `:44-104` (`flood_region`), `:145-158` (`transparent_color`), `:181-202` (`flood_fill`), tests `:345-392` ; `crates/roomboard-formats-wasm/src/lib.rs:6` (doc), `:190-199`, `:229-244`, test `:485-493`.

**Interfaces.**
- Consomme : rien.
- Produit :
  - `pub fn flood_fill(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, paint: Option<[u8; 3]>) -> Result<u32, PixelError>`
  - `fn flood_region(px: &[u8], w: u32, h: u32, starts: &[(u32, u32)], close_to: impl Fn(&[u8]) -> bool) -> Vec<bool>`
  - `pub fn image_flood_fill_inner(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, paint: Option<[u8; 3]>) -> Result<u32, String>`
  - `#[wasm_bindgen] pub fn image_flood_fill(px: &mut [u8], w: u32, h: u32, x: u32, y: u32, tolerance: u8, r: u8, g: u8, b: u8, clear: bool) -> Result<u32, JsError>` (lu par T4 : `image_flood_fill(px, w, h, x, y, tolerance, r, g, b, clear): number`)
- Réutilise : `crates/roomboard-formats/src/pixels.rs:58`, `:183` — `flood_region` (diffusion 4-connexe, pile) étendu d'un prédicat ; `flood_fill` étendu (RVBA, `paint: Option`, nombre changé). Écart déclaré à C5 DAI2 par le cadrage (B17) : `flood_fill` n'avait aucun appelant.
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:232` — `image_flood_fill` étendu de `clear: bool` et du retour `u32`.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`cargo test -p roomboard-formats flood 2>&1 | tail -20`) · GC3 module `formats` ≤ 3 145 728 o (référence 3 099 350 o), ajout au strict nécessaire, **mesuré avant et après** · GC4 aucune crate d'image · GC5 images fabriquées dans les tests · GC6 : le test `flood_fill_red_from_background_tolerance_5_keeps_alpha` fixe « alpha gardé », contrat changé par B8 : il est **remplacé** par `flood_fill_paints_opaque_and_keeps_enclosed_interior` (même image, même graine) ; aucun autre test changé hors signature · GC8 · GC9 commits · GC10 `PATH` · GC11 · GC12.

**Interdits.** Toucher `transparent_color` et `adjust` au-delà de l'appel à `flood_region` ; ajouter une fonction exportée autre que celles ci-dessus ; ajouter un paramètre de bornes (B6) ; toucher `crates/roomboard-core`, `apps/`.

**Terminé quand.** `cargo test -p roomboard-formats 2>&1 | grep -E "test result|FAILED"` et `cargo test -p roomboard-formats-wasm 2>&1 | grep -E "test result|FAILED"` : que des `ok` ; les nouveaux tests nommés passent ; `cargo fmt --all --check`, `cargo clippy -p roomboard-formats -p roomboard-formats-wasm --all-targets -- -D warnings` propres ; tailles avant/après citées, après ≤ 3 145 728 o ; commit fait.

#### Étapes

- [ ] **1. Taille avant.** `cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf /tmp/c6b-T2-fmt && wasm-bindgen --target web --remove-name-section --out-dir /tmp/c6b-T2-fmt target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c6b-T2-fmt/roomboard_formats_wasm_bg.wasm` → noter la valeur (attendue proche de 3 099 350).

- [ ] **2. Tests rouges** dans `pixels.rs`, `mod tests`. Remplacer `flood_fill_red_from_background_tolerance_5_keeps_alpha` par les tests ci-dessous, et dans `flood_fill_seed_outside_changes_nothing` et `bad_size_is_refused` remplacer l'argument `[0, 0, 0]` par `Some([0, 0, 0])` ; dans `flood_fill_seed_outside_changes_nothing`, garder le résultat : `assert_eq!(flood_fill(&mut v, 20, 20, (20, 0), 5, Some([0, 0, 0])).expect("calcul"), 0);`.

```rust
    /// B8 : la zone de la graine prend la couleur opaque ; l'intérieur enfermé et l'anneau ne changent pas.
    #[test]
    fn flood_fill_paints_opaque_and_keeps_enclosed_interior() {
        let mut v = img(20, 20, |x, y| {
            let inside = (5..15).contains(&x) && (5..15).contains(&y);
            let hole = (7..13).contains(&x) && (7..13).contains(&y);
            if inside && !hole {
                RED
            } else {
                [255, 255, 255, 200]
            }
        });
        let n = flood_fill(&mut v, 20, 20, (0, 0), 5, Some([255, 0, 0])).expect("calcul");
        assert_eq!(n, 300, "fond extérieur : 20 × 20 − 10 × 10");
        assert_eq!(px(&v, 20, 0, 0), [255, 0, 0, 255], "fond rougi, opaque");
        assert_eq!(px(&v, 20, 10, 10), [255, 255, 255, 200], "intérieur enfermé inchangé");
        assert_eq!(px(&v, 20, 5, 10), RED);
    }

    /// S3 : fond transparent et trait noir : remplir le fond (tolérance 5) le rend opaque de la couleur choisie sans
    /// toucher au noir (en RVB seul, le transparent lu 0,0,0,0 déborderait dans le noir).
    #[test]
    fn transparent_zone_does_not_leak_into_black() {
        const CLEAR: [u8; 4] = [0, 0, 0, 0];
        const BLACK: [u8; 4] = [0, 0, 0, 255];
        let mut v = img(20, 20, |x, _| if x == 10 { BLACK } else { CLEAR });
        let n = flood_fill(&mut v, 20, 20, (0, 0), 5, Some([250, 204, 21])).expect("calcul");
        assert_eq!(n, 10 * 20, "colonnes 0 à 9");
        assert_eq!(px(&v, 20, 0, 0), [250, 204, 21, 255]);
        assert_eq!(px(&v, 20, 10, 5), BLACK);
        assert_eq!(px(&v, 20, 15, 5), CLEAR, "de l'autre côté du trait : inchangé");
    }

    /// S3 : effacer une zone blanche donne [0, 0, 0, 0] et rend le nombre de pixels changés ; déjà transparente : 0.
    #[test]
    fn clear_makes_zone_transparent_and_counts() {
        let mut v = ring();
        assert_eq!(flood_fill(&mut v, 20, 20, (0, 0), 5, None).expect("calcul"), 300);
        assert_eq!(px(&v, 20, 0, 0), [0, 0, 0, 0]);
        assert_eq!(px(&v, 20, 10, 10), WHITE, "intérieur enfermé inchangé");
        assert_eq!(px(&v, 20, 5, 10), RED);
        assert_eq!(
            flood_fill(&mut v, 20, 20, (0, 0), 5, None).expect("calcul"),
            0,
            "zone déjà transparente : rien changé"
        );
    }

    /// HB13 : peindre la couleur déjà présente (même alpha) : 0 changé.
    #[test]
    fn flood_fill_same_paint_changes_nothing() {
        let mut v = img(4, 4, |_, _| [250, 204, 21, 255]);
        assert_eq!(
            flood_fill(&mut v, 4, 4, (1, 1), 5, Some([250, 204, 21])).expect("calcul"),
            0
        );
    }

    /// B8 : échelle de C5 (écart × 100 ≤ tolérance × 255) sur les quatre canaux : gris 240 joint au blanc à 10, pas à 5.
    #[test]
    fn flood_fill_tolerance_scale_on_rgba() {
        let band = |x: u32, _y: u32| if x < 2 { [240, 240, 240, 255] } else { WHITE };
        let mut v = img(6, 1, band);
        assert_eq!(flood_fill(&mut v, 6, 1, (5, 0), 5, None).expect("calcul"), 4);
        let mut v = img(6, 1, band);
        assert_eq!(flood_fill(&mut v, 6, 1, (5, 0), 10, None).expect("calcul"), 6);
        let mut v = img(2, 1, |x, _| if x == 0 { [255, 255, 255, 240] } else { WHITE });
        assert_eq!(
            flood_fill(&mut v, 2, 1, (1, 0), 5, None).expect("calcul"),
            1,
            "un écart d'alpha seul sépare aussi les zones"
        );
    }
```

`cargo test -p roomboard-formats flood 2>&1 | tail -20` → erreurs de compilation (`expected [u8; 3], found Option`).

- [ ] **3. Code.** Doc du module (lignes 1-3) : remplacer « pot sur pixels (prêt pour C6b) » par « pot sur une image (C6b : écart RVBA, peinture opaque ou effacement) ». Ajouter après `gap100` :

```rust
/// Plus grand écart des quatre canaux RVBA entre le pixel `p` et `q`, × 100 (pot sur une image, C6b, B8).
fn gap100_rgba(p: &[u8], q: [u8; 4]) -> u32 {
    p[..4]
        .iter()
        .zip(q)
        .map(|(a, b)| u32::from(a.abs_diff(b)))
        .max()
        .unwrap_or(0)
        * 100
}
```

`flood_region` : doc « Pixels joints (4-connexes, comme ActCraft `imagefill.cpp:40-42`) aux départs `starts` dont les octets satisfont `close_to` ; un départ hors de l'image ou refusé est ignoré. Partagé par `flood_fill` (un départ, écart RVBA à la graine) et le mode contigu de la couleur transparente (départs du bord, écart RVB à la couleur choisie). » ; signature `fn flood_region(px: &[u8], w: u32, h: u32, starts: &[(u32, u32)], close_to: impl Fn(&[u8]) -> bool) -> Vec<bool>` ; remplacer les deux lignes `let max = …; let near = …;` par :

```rust
    let near = |i: usize| close_to(&px[4 * i..4 * i + 4]);
```

`transparent_color` : `let max = u32::from(limit) * 255;` puis `.then(|| flood_region(px, w, h, &border(w, h), |p| gap100(p, t.rgb) <= max));`.

`flood_fill` :

```rust
/// Pot sur une image (C6b, B8, B17) : la zone 4-connexe de la graine dont l'écart RVBA à la couleur de la graine reste
/// ≤ `tolerance` (échelle 0 à 100, comme C5 I12) prend `paint` opaque (alpha 255) ; `None` (« Aucune ») l'efface
/// (`[0, 0, 0, 0]`). Rend le nombre de pixels changés ; graine hors de l'image : 0, rien ne change.
pub fn flood_fill(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    paint: Option<[u8; 3]>,
) -> Result<u32, PixelError> {
    check(px, w, h)?;
    if seed.0 >= w || seed.1 >= h {
        return Ok(0);
    }
    let i = 4 * (seed.1 as usize * w as usize + seed.0 as usize);
    let target = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    let max = u32::from(tolerance) * 255;
    let mask = flood_region(px, w, h, &[seed], |p| gap100_rgba(p, target) <= max);
    let value = paint.map_or([0, 0, 0, 0], |[r, g, b]| [r, g, b, 255]);
    let mut changed = 0;
    for (p, on) in px.as_chunks_mut::<4>().0.iter_mut().zip(mask) {
        if on && *p != value {
            *p = value;
            changed += 1;
        }
    }
    Ok(changed)
}
```

- [ ] **4. Vert.** `cargo test -p roomboard-formats flood 2>&1 | tail -20` → `test result: ok. N passed` (N ≥ 6, dont `transparent_zone_does_not_leak_into_black`) ; `cargo test -p roomboard-formats 2>&1 | grep -E "test result|FAILED"` → que des `ok` (tests C5 `transparent_*`, `adjust_*` inchangés).

- [ ] **5. Exposition : test rouge.** `roomboard-formats-wasm/src/lib.rs`, test `image_adjust_and_flood_fill_inner` : remplacer ses deux dernières lignes par :

```rust
        let mut px = vec![10, 10, 10, 255, 10, 10, 10, 255];
        assert_eq!(
            image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, Some([1, 2, 3])),
            Ok(2)
        );
        assert_eq!(px, vec![1, 2, 3, 255, 1, 2, 3, 255]);
        assert_eq!(image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, None), Ok(2));
        assert_eq!(px, vec![0; 8], "effacer : transparent");
```

`cargo test -p roomboard-formats-wasm image_adjust_and_flood_fill_inner 2>&1 | tail -10` → erreur de compilation.

- [ ] **6. Exposition : code.** Doc ligne 6 : « C5 (U30, I17) ; C6b (B17) : calculs de pixels sans état (`image_transparent`, `image_adjust`, `image_flood_fill`) pour le Worker de pixels. ». Remplacer :

```rust
pub fn image_flood_fill_inner(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    paint: Option<[u8; 3]>,
) -> Result<u32, String> {
    pixels::flood_fill(px, w, h, seed, tolerance, paint).map_err(|e| e.to_string())
}
```

```rust
/// Pot sur une image (C6b, B17) : `clear` efface la zone (`r`, `g`, `b` ignorés), sinon peinture opaque ; rend le
/// nombre de pixels changés ; `px` revient modifié côté JS.
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn image_flood_fill(
    px: &mut [u8],
    w: u32,
    h: u32,
    x: u32,
    y: u32,
    tolerance: u8,
    r: u8,
    g: u8,
    b: u8,
    clear: bool,
) -> Result<u32, JsError> {
    let paint = (!clear).then_some([r, g, b]);
    image_flood_fill_inner(px, w, h, (x, y), tolerance, paint).map_err(|m| JsError::new(&m))
}
```

- [ ] **7. Vert, taille après, lint.** `cargo test -p roomboard-formats-wasm 2>&1 | grep -E "test result|FAILED"` → `ok` ; reprendre la commande de l'étape 1 → taille après ≤ 3 145 728 o, écart à l'avant cité (attendu < 1 Ko) ; `cargo fmt --all --check` ; `cargo clippy -p roomboard-formats -p roomboard-formats-wasm --all-targets -- -D warnings 2>&1 | tail -10`.

- [ ] **8. Commit.** `git add crates/roomboard-formats/src/pixels.rs`, `git add crates/roomboard-formats-wasm/src/lib.rs`, message `feat(formats): RGBA flood fill that paints opaque or clears, and returns the changed count`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 4 et 7, tailles avant/après, lignes `Réutilisation : …`.

<a id="tache-t3"></a>
### Tâche T3 — Moteur : types, pixel source, cible `ImageFill`, outil, tolérance, pipette, `restore`

**Objectif.** Les types de la page connaissent la cible image du pot, `restore` et `sourceAsset`. Un clic du pot sur une image rend une action `ImageFill` au pixel source sous le clic (calcul pur `sourcePixelAt`, partagé avec la pipette). L'outil Pot passe toutes ses actions à une file fournie par l'application, avec la tolérance tenue par le moteur (défaut 5). « Rétablir l'original » écrit `restore: true`. Scénarios S1 (geste) et S5 b (ordre des clics, côté outil).

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T3`. Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/` (modules générés, non suivis par git, nécessaires à `tsc`).

**Fichiers.** Modifier : `apps/web/src/core/api.ts:41-43`, `:154-156`, `:186-187` ; `apps/web/src/core/image-params.ts` (après `displayToSource`, `:70`) ; `apps/web/src/core/image-params.test.ts` ; `apps/web/src/engine/fill-target.ts:1-24`, `:59-77` ; `apps/web/src/engine/fill-target.test.ts:192-196` ; `apps/web/src/engine/tools/fill.ts` ; `apps/web/src/engine/tools/fill.test.ts:11-32` (retour de `setup`) et nouveaux tests ; `apps/web/src/engine/engine.ts:48-50`, `:75-76`, `:136-139`, `:164`, `:222`, `:312`, `:450`, `:715-719` ; `apps/web/src/engine/engine.test.ts` (après `:1220` et dans le bloc C5 `:1569-1578`) ; `apps/web/src/engine/tools/image-edit.ts:1-10`, `:105-113`, `:135-144`, `:229-235`.

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Produit :
  - `api.ts` : `FillTarget = { kind: "edge" | "inside"; id } | { kind: "background" } | { kind: "image"; id: string; asset: AssetRef }` ; `SetImageParams` gagne `readonly restore?: boolean` ; `ImageData = { asset; w; h; readonly sourceAsset?: string } & ImageParams`.
  - `image-params.ts` : `export function sourcePixelAt(m: Matrix, i: ImageData, x: number, y: number, clamp: boolean): [number, number] | null`.
  - `fill-target.ts` : `export interface ImageFillAt { readonly type: "ImageFill"; readonly page: string; readonly id: string; readonly seed: readonly [number, number]; readonly color: string | null }` ; `export type ImageFillRequest = ImageFillAt & { readonly tolerance: number }` ; `export type FillRequest = { readonly command: Command } | ImageFillRequest` ; `fillCommand(…): Command | ImageFillAt | null`.
  - `tools/fill.ts` : `export interface FillToolQueue { tolerance(): number; submit(r: FillRequest, run: (c: Command) => Change | null): void }` ; `createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure, queue?: FillToolQueue): GestureTool`.
  - `engine.ts` : `export const DEFAULT_FILL_TOLERANCE = 5` ; `EngineState.fillTolerance?: number` ; `Engine.setFillTolerance(t: number): void` ; `ToolFactories.fill?(ctx: ToolContext, color: () => string | null, tolerance: () => number): GestureTool`.
- Réutilise : `apps/web/src/core/api.ts:43`, `:156`, `:187` — `FillTarget`, `Command` `SetImageParams`, `ImageData`, étendus.
- Réutilise : `apps/web/src/core/image-params.ts:65` — `displayToSource(i, x, y)`, `displaySize(i)`, `cropOf(i)` appelés par `sourcePixelAt` ; la pipette `engine/tools/image-edit.ts:137-143`, qui refaisait ce calcul en ligne, l'appelle (duplication retirée).
- Réutilise : `apps/web/src/engine/fill-target.ts:63` — `fillCommand(doc, page, x, y, zoom, color, measure)`, étendu de la branche image.
- Réutilise : `apps/web/src/engine/tools/fill.ts:19` — `createFillTool`, étendu du paramètre `queue` ; sans `queue`, `ctx.run` direct (C6a).
- Réutilise : `apps/web/src/engine/engine.ts:139`, `:450` — patron de `setFillColor` / `fillColor` pour `setFillTolerance` / `fillTolerance`.
- Réutilise : `apps/web/src/engine/tools/image-edit.ts:229` — `restore()` et `write(params, geometric)`, étendus de `restore`.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/core/image-params.test.ts src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/engine/engine.test.ts 2>&1 | tail -20`) · GC4 aucun paquet · GC6 : le test `image : fond de la page (D1, S4)` de `fill-target.test.ts:192` fixe le comportement que B19 remplace : il devient `image : action ImageFill au pixel source (B5, B19)` ; aucun autre test changé · GC8 · GC9 commits · GC10 `PATH` · GC11 le moteur n'importe pas `app/` ni `platform/` · GC12. Écarts E1 (pas de `key`) et E5 (graine bornée au rognage) du plan.

**Interdits.** Toucher `wasm-core.ts`, `fake-core.ts` (T6), `image-cache.ts` (T5), `app/`, `ui/`, `platform/`. Changer le comportement du pot sur une forme, un texte, un tableau, le fond.

**Terminé quand.** Les quatre fichiers de test passent (`Tests  N passed`, `FAIL` absent) avec les tests nommés ci-dessous ; `pnpm --filter @roomboard/web exec vitest run src/engine 2>&1 | tail -8` sans `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` sans erreur ; commits faits.

#### Étapes

- [ ] **1. Types (`api.ts`).** Remplacer la doc et le type `FillTarget` (`:41-43`) :

```ts
/** Cible du pot (C6a, D12) : contour (`color` d'une forme ou d'un trait), intérieur (`fill` d'un rectangle ou d'une
 *  ellipse), fond de la page (`background`) ; C6b (B2) : image, avec le nouvel asset calculé par la page (pixels remplis
 *  ou effacés) ; `color` y est contrôlée, jamais écrite. */
export type FillTarget =
  | { readonly kind: "edge" | "inside"; readonly id: string }
  | { readonly kind: "background" }
  | { readonly kind: "image"; readonly id: string; readonly asset: AssetRef };
```

Commande `SetImageParams` : `| { readonly type: "SetImageParams"; readonly id: string; readonly params: ImageParams; readonly matrix: Matrix; readonly restore?: boolean }`, doc complétée : « C6b (B11) : `restore` : avec un `sourceAsset`, l'asset d'origine revient dans la même étape. ». `ImageData` :

```ts
/** Image (U5) : `w`, `h` = taille source en pixels ; réglages de C5 à plat (I8 : boîte affichée, `displaySize`) ; C6b
 *  (B12) : `sourceAsset` = asset d'avant le premier remplissage au pot, absent sinon. */
export type ImageData = { readonly asset: string; readonly w: number; readonly h: number; readonly sourceAsset?: string } & ImageParams;
```

- [ ] **2. Test rouge de `sourcePixelAt`** (`image-params.test.ts`, ajouter `sourcePixelAt` à l'import et ce bloc à la fin) :

```ts
describe("pixel source sous le point (C6b, B5)", () => {
  it("sans réglage : monde → pixel entier ; bord bas-droit borné à w − 1, h − 1", () => {
    const m: Matrix = [2, 0, 0, 2, 100, 50];
    expect(sourcePixelAt(m, img(), 100 + 2 * 10.7, 50 + 2 * 20.2, false)).toEqual([10, 20]);
    expect(sourcePixelAt(m, img(), 100 + 2 * 200, 50 + 2 * 100, false)).toEqual([199, 99]);
  });
  it("hors de la boîte : null pour la pipette, ramené dans l'image pour le pot (HB16)", () => {
    const m: Matrix = [1, 0, 0, 1, 0, 0];
    expect(sourcePixelAt(m, img(), 203, 50, false)).toBeNull();
    expect(sourcePixelAt(m, img(), 203, 50, true)).toEqual([199, 50]);
    expect(sourcePixelAt(m, img(), -4, -4, true)).toEqual([0, 0]);
  });
  it("rognage, retournements, quarts de tour : inverse de sourceToDisplay, 16 combinaisons", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const [dx, dy] = sourceToDisplay(i, 30.5, 20.5);
      expect(sourcePixelAt([1, 0, 0, 1, 0, 0], i, dx, dy, false), JSON.stringify(p)).toEqual([30, 20]);
    }
  });
  it("RF5 : bord de la boîte avec quart de tour et retournement : la graine reste un pixel du rognage", () => {
    const i = img({ crop: [10, 5, 80, 40], quarterTurns: 1, flipX: true });
    const [bw, bh] = displaySize(i);
    for (const [x, y] of [[bw, bh], [bw + 3, bh + 3], [0, bh + 3], [-3, 0]] as const) {
      const s = sourcePixelAt([1, 0, 0, 1, 0, 0], i, x, y, true);
      expect(s !== null && s[0] >= 10 && s[0] <= 89 && s[1] >= 5 && s[1] <= 44, `${x},${y} → ${String(s)}`).toBe(true);
    }
  });
  it("matrice non inversible : null", () => {
    expect(sourcePixelAt([0, 0, 0, 0, 0, 0], img(), 1, 1, true)).toBeNull();
  });
});
```

`pnpm --filter @roomboard/web exec vitest run src/core/image-params.test.ts 2>&1 | tail -20` → `FAIL` (`sourcePixelAt is not a function`).

- [ ] **3. `sourcePixelAt`** (`image-params.ts`, après `displayToSource` ; importer `invertMatrix` depuis `./shapes` à côté de `applyMatrix, composeMatrix`) :

```ts
/** Pixel source sous le point monde (x, y) d'une image de matrice `m` (C6b, B5 ; pipette, I29) : monde → boîte affichée
 *  (0, 0)-(bw, bh) → rognage, retournements et quarts de tour défaits → pixel entier, borné au rognage (donc à l'image).
 *  Hors de la boîte : `clamp` (pot, bande de tolérance de 6 px) y ramène le point ; sinon null (pipette). Matrice non
 *  inversible : null. */
export function sourcePixelAt(m: Matrix, i: ImageData, x: number, y: number, clamp: boolean): [number, number] | null {
  const inv = invertMatrix(m);
  if (inv === null) return null;
  const [lx, ly] = applyMatrix(inv, x, y);
  const [bw, bh] = displaySize(i);
  if (!clamp && (lx < 0 || ly < 0 || lx > bw || ly > bh)) return null;
  const [sx, sy] = displayToSource(i, Math.min(Math.max(lx, 0), bw), Math.min(Math.max(ly, 0), bh));
  const [cx, cy, cw, ch] = cropOf(i);
  return [Math.min(cx + cw - 1, Math.max(cx, Math.floor(sx))), Math.min(cy + ch - 1, Math.max(cy, Math.floor(sy)))];
}
```

Relancer l'étape 2 → `Tests  N passed`, bloc `pixel source sous le point` présent.

- [ ] **4. Pipette par `sourcePixelAt`** (`image-edit.ts`). Dans `begin`, branche `picking !== null`, remplacer de `const el = current();` jusqu'à la ligne `const c = deps.colorAt(…)` par :

```ts
        const el = current();
        if (el === null) return;
        const px = sourcePixelAt(el.transform, el.image, ...screenToWorld(ctx.camera(), s.x, s.y), false);
        if (px === null) return; // hors de l'image : la pipette reste armée
        const c = deps.colorAt(el.image.asset, px[0], px[1]);
```

Ajouter `sourcePixelAt` à l'import de `../../core/image-params` ; retirer de cet import ce qui n'est plus utilisé (`tsc` le signale). Vérifier : `pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts -t "pipette" 2>&1 | tail -8` → les deux tests `C5 pipette` passent (`colorAt` appelé avec `(ASSET.id, 10, 5)`).

- [ ] **5. Tests rouges de la cible** (`fill-target.test.ts`) : remplacer le test `image : fond de la page (D1, S4)` par :

```ts
  it("image : action ImageFill au pixel source sous le point (B5, B19)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 700, 500] }));
    expect(s.at(750.6, 520.2)).toEqual({ type: "ImageFill", page: s.page, id, seed: [50, 20], color: RED });
    expect(s.at(750.6, 520.2, null)).toEqual({ type: "ImageFill", page: s.page, id, seed: [50, 20], color: null });
  });

  it("image : point de la bande de tolérance hors de la boîte ramené dans l'image (B5, HB16)", () => {
    const s = setup();
    const id = idOf(s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 700, 500] }));
    expect(s.at(803, 550)).toEqual({ type: "ImageFill", page: s.page, id, seed: [99, 50], color: RED });
  });
```

Le type de retour de `at` dans `setup` devient `Command | ImageFillAt | null` (importer `type ImageFillAt` depuis `./fill-target`). `pnpm --filter @roomboard/web exec vitest run src/engine/fill-target.test.ts 2>&1 | tail -20` → `FAIL` (fond rendu au lieu d'`ImageFill`).

- [ ] **6. Cible** (`fill-target.ts`). Doc du module : remplacer « image, élément inconnu ou rien : fond de la page (D1, D10) » par « image : zone de pixels sous le point (C6b, B19 ; action `ImageFill`, écrite plus tard par la file du pot de l'application) ; élément inconnu ou rien : fond de la page (D1, D10) ». Importer `sourcePixelAt` depuis `../core/image-params`. Ajouter après `FillDoc` :

```ts
/** C6b (B5, B19) : remplissage d'une zone d'image demandé au point ; calculé et écrit par la file du pot
 *  (`app/image-fill.ts`), jamais par le moteur. */
export interface ImageFillAt {
  readonly type: "ImageFill";
  readonly page: string;
  readonly id: string;
  /** Pixel source sous le clic (`sourcePixelAt`, point de la bande de tolérance ramené dans la boîte). */
  readonly seed: readonly [number, number];
  readonly color: string | null;
}
/** Remplissage d'image avec la tolérance lue au relâché (B10). */
export type ImageFillRequest = ImageFillAt & { readonly tolerance: number };
/** Ce que l'outil Pot confie à la file (B13) : une commande vectorielle, ou un remplissage d'image. */
export type FillRequest = { readonly command: Command } | ImageFillRequest;
```

`fillCommand` : type de retour `Command | ImageFillAt | null` ; avant le `return background(page, color);` final :

```ts
  if (el.kind === "image") {
    const seed = sourcePixelAt(el.transform, el.image, x, y, true);
    return seed === null ? background(page, color) : { type: "ImageFill", page, id: el.id, seed, color };
  }
```

Relancer l'étape 5 → `Tests  N passed`.

- [ ] **7. Tests rouges de l'outil** (`tools/fill.test.ts`). `setup` rend aussi `ctx` (`return { doc, page, runs, tool, rect, ctx, setColor: … }`). Importer `type FillRequest` depuis `../fill-target`. Ajouter :

```ts
  it("C6b : avec la file, toutes les actions y passent ; image : ImageFill avec la tolérance lue au relâché (B13, B19)", () => {
    const s = setup();
    const submitted: FillRequest[] = [];
    let tol = 5;
    const queue = { tolerance: () => tol, submit: (r: FillRequest) => void submitted.push(r) };
    const tool = createFillTool(s.ctx, () => "#facc15", (t) => t.length * 10, queue);
    const img = s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 600, 100] }).ids[0] ?? "";
    tool.begin(1, [at(410, 320)]);
    tool.close(1, "end");
    tool.begin(2, [at(2 * 650 + 10, 2 * 150 + 20)]);
    tol = 12;
    tool.close(2, "end");
    expect(submitted).toEqual([
      { command: { type: "Fill", page: s.page, target: { kind: "inside", id: s.rect }, color: "#facc15" } },
      { type: "ImageFill", page: s.page, id: img, seed: [50, 50], color: "#facc15", tolerance: 12 },
    ]);
    expect(s.runs).toEqual([]);
  });

  it("C6b : sans file, un clic sur une image n'écrit rien (aucun repli sur le fond)", () => {
    const s = setup();
    s.doc.apply({ type: "AddImage", page: s.page, asset: { id: "a".repeat(64), name: "x.png", mime: "image/png", size: 1 }, w: 100, h: 100, matrix: [1, 0, 0, 1, 600, 100] });
    s.tool.begin(1, [at(2 * 650 + 10, 2 * 150 + 20)]);
    s.tool.close(1, "end");
    expect(s.runs).toEqual([]);
  });
```

`pnpm --filter @roomboard/web exec vitest run src/engine/tools/fill.test.ts 2>&1 | tail -20` → `FAIL`.

- [ ] **8. Outil** (`tools/fill.ts`). Doc du module : ajouter « C6b (B13) : avec une file (`queue`), toutes les actions y passent dans l'ordre des clics ; une image donne `ImageFill` avec la tolérance lue au relâché. ». Imports : `import type { Change, Command } from "../../core/api";`, `import { fillCommand, type FillRequest } from "../fill-target";`. Ajouter :

```ts
/** File du pot (C6b, B13, DAB2), tenue par l'application : toutes les actions du pot y passent dans l'ordre des clics. */
export interface FillToolQueue {
  /** Tolérance courante (0 à 100), lue au relâché comme la couleur (PC12). */
  tolerance(): number;
  submit(r: FillRequest, run: (c: Command) => Change | null): void;
}
```

Signature `createFillTool(ctx: ToolContext, color: () => string | null, measure: Measure, queue?: FillToolQueue): GestureTool` ; dans `close`, remplacer les deux dernières lignes par :

```ts
      const out = fillCommand(ctx.doc, p.page, p.x, p.y, p.zoom, color(), measure);
      if (out === null) return;
      if (queue === undefined) {
        // Sans file (tests du moteur, amorce partielle) : commandes vectorielles seules ; une image ne change pas.
        if (out.type !== "ImageFill") ctx.run(out);
        return;
      }
      queue.submit(out.type === "ImageFill" ? { ...out, tolerance: queue.tolerance() } : { command: out }, (c) => ctx.run(c));
```

Relancer l'étape 7 → `Tests  N passed` (tests C6a existants compris).

- [ ] **9. Tests rouges du moteur** (`engine.test.ts`). Après le test `fabrique fill : reçoit la couleur courante …` :

```ts
  it("C6b fabrique fill : tolérance 5 par défaut, arrondie et bornée à 0-100, lue par l'outil (B10)", () => {
    const got: { tolerance?: () => number } = {};
    const engine = createEngine({
      doc: fakeCore.blank(),
      renderer: new FakeRenderer(),
      frames: new Frames(),
      tools: {
        pen: () => inert,
        eraser: () => inert,
        fill: (_ctx, _c, t) => {
          got.tolerance = t;
          return inert;
        },
      },
    });
    expect([engine.state().fillTolerance, got.tolerance?.()]).toEqual([5, 5]);
    engine.setFillTolerance(12.6);
    expect(got.tolerance?.()).toBe(13);
    engine.setFillTolerance(250);
    expect(engine.state().fillTolerance).toBe(100);
    engine.setFillTolerance(-3);
    expect(engine.state().fillTolerance).toBe(0);
    engine.setFillTolerance(Number.NaN);
    expect(engine.state().fillTolerance).toBe(0);
  });
```

Dans le bloc C5 (après `C5 restore : tous les réglages retirés, une étape`) :

```ts
  it("C6b restore : la commande porte restore: true (B11)", () => {
    const { engine, doc, id } = c5();
    const apply = vi.spyOn(doc, "apply");
    engine.editImage(id)!.restore();
    expect(apply.mock.calls.at(-1)?.[0]).toMatchObject({ type: "SetImageParams", id, params: {}, restore: true });
  });
```

`pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts -t "C6b" 2>&1 | tail -20` → `FAIL`.

- [ ] **10. Moteur** (`engine.ts`). Après `fillColor` dans `EngineState` :

```ts
  /** Tolérance du pot sur une image (C6b, B10), entier de 0 à 100 ; facultative comme fillColor (le moteur la publie). */
  readonly fillTolerance?: number;
```

`ToolFactories.fill` : `/** Outil Pot (C6a, D15 ; C6b, B10) : `color` et `tolerance` lues au relâché ; absent : outil inerte. */ fill?(ctx: ToolContext, color: () => string | null, tolerance: () => number): GestureTool;`. Interface `Engine`, après `setFillColor` : `/** Tolérance du pot (C6b, B10) : arrondie, bornée à 0-100 ; non finie : ignorée. */ setFillTolerance(t: number): void;`. Après `DEFAULT_FILL_COLOR` : `export const DEFAULT_FILL_TOLERANCE = 5;`. Après `let fillColor …` : `let fillTolerance = DEFAULT_FILL_TOLERANCE;`. Dans l'état publié, après `fillColor,` : `fillTolerance,`. Outils : `fill: deps.tools.fill?.(ctx, () => fillColor, () => fillTolerance) ?? inertTool(),`. Après `setFillColor(c) { … }` :

```ts
    setFillTolerance(t) {
      if (typeof t !== "number" || !Number.isFinite(t)) return;
      fillTolerance = Math.min(100, Math.max(0, Math.round(t)));
      emit();
    },
```

- [ ] **11. `restore: true`** (`image-edit.ts`). Doc du module : remplacer « C6b étendra `restore` (`sourceAsset`). » par « C6b (B11) : `restore` écrit `restore: true` (avec un `sourceAsset`, l'asset d'origine revient). ». `write` :

```ts
  function write(params: ImageParams, geometric: boolean, restore = false): boolean {
    const el = current();
    if (el === null) return false;
    writing = geometric;
    const change = ctx.run({ type: "SetImageParams", id, params, matrix: placeAfter(el.transform, el.image, params), ...(restore ? { restore: true } : {}) });
    writing = false;
    if (change !== null && geometric) own.add(change.version);
    return change !== null;
  }
```

Dans `restore()` : `const ok = write({}, false, true);`.

- [ ] **12. Vert et types.** `pnpm --filter @roomboard/web exec vitest run src/core/image-params.test.ts src/engine/fill-target.test.ts src/engine/tools/fill.test.ts src/engine/engine.test.ts 2>&1 | tail -20` → `Test Files  4 passed`, aucun `FAIL` ; `pnpm --filter @roomboard/web exec vitest run src/engine src/core/image-params.test.ts 2>&1 | tail -8` → aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

- [ ] **13. Commits** (fichiers un par un) : `feat(web): image fill target, source pixel under the click, tolerance and restore flag in the engine`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 2, 5, 7, 9, 12 ; lignes `Réutilisation : …`.

<a id="tache-t4"></a>
### Tâche T4 — Décodage partagé, Worker et lanceur du remplissage

**Objectif.** Le décodage (`decodeImage` et ses constantes) passe dans un module sans DOM réexporté par `image-import.ts`. Le lanceur de pixels gagne `fill(job)` : un remplissage n'est jamais remplacé, part avec l'original (`Blob`, décodé dans le Worker à pleine résolution, `max = Infinity`) ou un bitmap transféré (SVG), et rend `{ changed, png, bitmap }` ou `{ changed: 0 }`. Le Worker cuit les pixels de C5, appelle `image_flood_fill`, encode le PNG et refait la copie d'affichage par le même `decodeImage`. Scénarios S5 e (module en échec) et S5 h (original pleine résolution).

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T4`. Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.**
- Créer : `apps/web/src/platform/image-decode.ts`, `apps/web/src/platform/image-decode.test.ts`
- Modifier : `apps/web/src/platform/image-import.ts:15`, `:29-36`, `:114-181` ; `apps/web/src/platform/pixel-runner.ts` ; `apps/web/src/platform/pixel-runner.test.ts` (ajouts) ; `apps/web/src/platform/pixel-worker.ts` ; `apps/web/src/platform/container.ts:85`

**Interfaces.**
- Consomme : le contrat de T2, côté JS : `image_flood_fill(px, w, h, x, y, tolerance, r, g, b, clear: boolean): number` (aucune dépendance de code : les tests utilisent un faux module).
- Produit :
  - `platform/image-decode.ts` : `export type ImageKind` ; `export const MAX_PIXELS = 100_000_000`, `DISPLAY_MAX = 4096`, `TOO_MANY_PIXELS` ; `export interface DecodedImage`, `DecodePorts` ; `export class ImageTooLargeError` ; `export async function decodeImage(blob: Blob, kind: ImageKind, max: number, ports: DecodePorts): Promise<DecodedImage>`.
  - `platform/image-import.ts` réexporte ces noms ; `decodeImage(blob, kind, max = DISPLAY_MAX, ports = browserDecodePorts())` garde sa signature (appelants inchangés).
  - `platform/pixel-runner.ts` : `export const FILL_UNREADABLE_MESSAGE = "pot : image illisible"` ; `export const FILL_MODULE_OLD_MESSAGE = "module des pixels sans pot sur image"` ; `export interface PixelFillSpec { readonly seed: readonly [number, number]; readonly size: readonly [number, number]; readonly tolerance: number; readonly color: string | null }` ; `export interface PixelFillJob extends PixelParams, PixelFillSpec { source(): Promise<{ readonly blob: Blob; readonly kind: ImageKind } | { readonly bitmap: ImageBitmap }> }` ; `export type PixelFillResult = { readonly changed: 0 } | { readonly changed: number; readonly png: Blob; readonly bitmap: ImageBitmap }` ; `export interface PixelFillRunner { fill(job: PixelFillJob): Promise<PixelFillResult | null> }` ; `createPixelRunner(spawn, opts?): PixelRunner & PixelFillRunner` ; `export function applyFill(mod: Pick<PixelFormatsBinding, "image_flood_fill">, px: Uint8Array, w: number, h: number, f: PixelFillSpec): number`.
  - `PixelRunner` (interface) inchangée (écart E3).
- Réutilise : `apps/web/src/platform/pixel-runner.ts:29`, `:156` — `createPixelRunner` (même Worker, même file, délai 60 s, arrêt 10 s) étendu de `fill` ; `applyPixels(mod, px, w, h, p)` appelé avant le remplissage (B4) ; `rgbOf`, `pixelErrorMessage` appelés.
- Réutilise : `apps/web/src/platform/image-import.ts:156-181` — `decodeImage` **déplacé** dans `image-decode.ts`, réexporté ; appelé par le Worker avec `max = Infinity` (original, B7) et `DISPLAY_MAX` (copie d'affichage du PNG).
- Réutilise : `apps/web/src/platform/pixel-worker.ts:18` — entrée du Worker, gagne la branche remplissage (`OffscreenCanvas`, `putImageData`, `convertToBlob({ type: "image/png" })`).
- Réutilise : `apps/web/src/platform/container.ts:85` — `PixelFormatsBinding.image_flood_fill`, signature mise à jour ; `hasPixels` inchangé.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/platform/image-decode.test.ts src/platform/pixel-runner.test.ts src/platform/image-import.test.ts 2>&1 | tail -20`) · GC4 aucun paquet · GC5 images fabriquées (faux ports, faux bitmaps) · GC6 aucun test existant changé (`image-import.test.ts`, `pixel-runner.test.ts` C5 restent tels quels) · GC8 · GC9 commits · GC10 `PATH` · GC11 `image-decode.ts` et `pixel-worker.ts` n'importent ni `engine/`, ni `app/`, ni le DOM (`Image`, `document`) · GC12. Écarts E2 (`size`) et E3 (`PixelFillRunner`).

**Interdits.** Changer le message ou le transfert d'un calcul C5 (`run`) ; ajouter un refus de taille (B7) ; toucher `engine/`, `app/`, `core/`.

**Terminé quand.** Les trois fichiers de test passent (tests nommés ci-dessous présents) ; `pnpm --filter @roomboard/web exec vitest run src/platform 2>&1 | tail -8` sans `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` sans erreur ; `grep -nE "from \"\.\./(engine|app)|new Image\(|document\." apps/web/src/platform/image-decode.ts apps/web/src/platform/pixel-worker.ts` ne rend rien ; commits faits.

#### Étapes

- [ ] **1. Test rouge du décodage partagé.** Créer `apps/web/src/platform/image-decode.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { decodeImage, DISPLAY_MAX, ImageTooLargeError, type DecodePorts } from "./image-decode";
import * as page from "./image-import";

const bmp = (width: number, height: number) => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
/** Faux ports du Worker : bitmap `w × h` au premier appel, bitmap redimensionné ensuite ; SVG refusé (pas de DOM). */
function ports(w: number, h: number) {
  const calls: (ImageBitmapOptions | undefined)[] = [];
  const made: ReturnType<typeof bmp>[] = [];
  const p: DecodePorts = {
    createImageBitmap: vi.fn(async (_src: ImageBitmapSource, opts?: ImageBitmapOptions) => {
      calls.push(opts);
      const b = opts?.resizeWidth !== undefined ? bmp(opts.resizeWidth, opts.resizeHeight ?? 0) : bmp(w, h);
      made.push(b);
      return b;
    }),
    loadSvg: vi.fn(async () => {
      throw new Error("SVG non décodable dans le Worker");
    }),
  };
  return { p, calls, made };
}
const blob = new Blob([new Uint8Array([1])]);

describe("décodage sans DOM (C6b, B7, B25)", () => {
  it("S5 h : max = Infinity : une photo de 6000 × 4000 garde sa pleine résolution, orientation EXIF appliquée (RF1)", async () => {
    const { p, calls } = ports(6000, 4000);
    const d = await decodeImage(blob, "jpeg", Infinity, p);
    expect([d.bitmap.width, d.bitmap.height, d.w, d.h]).toEqual([6000, 4000, 6000, 4000]);
    expect(calls).toEqual([{ imageOrientation: "from-image" }]);
  });
  it("copie d'affichage : côté le plus long ramené à 4096, original fermé", async () => {
    const { p, made } = ports(6000, 4000);
    const d = await decodeImage(blob, "png", DISPLAY_MAX, p);
    expect([d.bitmap.width, d.bitmap.height, d.w, d.h]).toEqual([4096, 2731, 6000, 4000]);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
  });
  it("plus de 100 Mpx : ImageTooLargeError, bitmap fermé", async () => {
    const { p, made } = ports(12000, 9000);
    await expect(decodeImage(blob, "png", Infinity, p)).rejects.toBeInstanceOf(ImageTooLargeError);
    expect(made[0]?.close).toHaveBeenCalledTimes(1);
  });
  it("SVG : le loadSvg du Worker refuse", async () => {
    const { p } = ports(10, 10);
    await expect(decodeImage(blob, "svg", Infinity, p)).rejects.toThrow("SVG non décodable dans le Worker");
  });
  it("image-import réexporte les mêmes valeurs (appelants inchangés)", () => {
    expect(page.DISPLAY_MAX).toBe(DISPLAY_MAX);
    expect(page.ImageTooLargeError).toBe(ImageTooLargeError);
    expect(page.MAX_PIXELS).toBe(100_000_000);
  });
});
```

`pnpm --filter @roomboard/web exec vitest run src/platform/image-decode.test.ts 2>&1 | tail -20` → `FAIL` (module introuvable).

- [ ] **2. `image-decode.ts`.** Créer le fichier ; y **déplacer** depuis `image-import.ts`, corps inchangés : `ImageKind` (`:15`), `MAX_PIXELS`, `DISPLAY_MAX`, `TOO_MANY_PIXELS` (`:30-31`, `:36`), `DecodedImage`, `DecodePorts` (`:114-125`), `ImageTooLargeError` (`:129-134`), `decodeImage` (`:157-181`) avec ses quatre paramètres **obligatoires** (`max: number, ports: DecodePorts`, sans défaut : le défaut `browserDecodePorts()` touche le DOM). En-tête :

```ts
/**
 * Décodage d'une image sans DOM (C6b, B7, B25), partagé par la page (`image-import.ts`, qui le réexporte) et le Worker de
 * pixels : orientation EXIF appliquée, refus au-delà de 100 Mpx (U26), réduction du côté le plus long à `max` (copie
 * d'affichage, `DISPLAY_MAX`) ; `max = Infinity` : l'original à pleine résolution. Les ports viennent de l'appelant (le
 * Worker n'a pas d'`HTMLImageElement` : son `loadSvg` refuse). N'importe ni le moteur, ni l'application, ni le DOM.
 */
```

Dans `image-import.ts`, à la place des définitions retirées :

```ts
import { DISPLAY_MAX, decodeImage as decodeWith, ImageTooLargeError, MAX_PIXELS, TOO_MANY_PIXELS, type DecodePorts, type DecodedImage, type ImageKind } from "./image-decode";
export { DISPLAY_MAX, ImageTooLargeError, MAX_PIXELS, TOO_MANY_PIXELS, type DecodePorts, type DecodedImage, type ImageKind } from "./image-decode";
```

et, à la place de l'ancienne fonction :

```ts
/** Décode avec les ports du navigateur par défaut (`image-decode.ts`, B25) ; refuse au-delà de 100 Mpx (bitmap fermé) ;
 *  côté le plus long au-delà de `max` : bitmap d'affichage réduit. */
export function decodeImage(blob: Blob, kind: ImageKind, max = DISPLAY_MAX, ports: DecodePorts = browserDecodePorts()): Promise<DecodedImage> {
  return decodeWith(blob, kind, max, ports);
}
```

Relancer l'étape 1 et `pnpm --filter @roomboard/web exec vitest run src/platform/image-import.test.ts 2>&1 | tail -8` → les deux passent.

- [ ] **3. Tests rouges du lanceur** (`pixel-runner.test.ts`) : élargir l'import (`applyFill, FILL_MODULE_OLD_MESSAGE, FILL_UNREADABLE_MESSAGE, type PixelFillJob`) et ajouter à la fin :

```ts
describe("remplissage d'image dans le lanceur (C6b, B14)", () => {
  const original = new Blob([new Uint8Array([1, 2])], { type: "image/png" });
  const fillJob = (extra: Partial<PixelFillJob> = {}): PixelFillJob => ({
    seed: [3, 4],
    size: [10, 8],
    tolerance: 5,
    color: "#facc15",
    brightness: 20,
    source: async () => ({ blob: original, kind: "png" }),
    ...extra,
  });
  const result = () => ({ changed: 12, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: bmp("rempli") });

  it("message : type fill, graine, taille, tolérance, couleur, pixels de C5, Blob de l'original sans transfert", async () => {
    const { workers, runner } = setup();
    void runner.fill(fillJob());
    await tick();
    expect(workers[0]?.posted[0]).toMatchObject({ type: "fill", seed: [3, 4], size: [10, 8], tolerance: 5, color: "#facc15", brightness: 20, blob: original, kind: "png" });
    expect(workers[0]?.transfers[0]).toEqual([]);
  });

  it("source bitmap (SVG) : transférée", async () => {
    const { workers, runner } = setup();
    const copy = bmp("svg");
    void runner.fill(fillJob({ source: async () => ({ bitmap: copy }) }));
    await tick();
    expect(workers[0]?.posted[0]).toMatchObject({ type: "fill", bitmap: copy });
    expect(workers[0]?.transfers[0]).toEqual([copy]);
  });

  it("un remplissage n'est jamais remplacé : deux remplissages, deux résultats dans l'ordre", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    const b = runner.fill(fillJob({ color: null }));
    await tick();
    const r = result();
    workers[0]?.reply(0, r);
    await expect(a).resolves.toEqual(r);
    await tick();
    expect(workers[0]?.posted[1]).toMatchObject({ type: "fill", color: null });
    workers[0]?.reply(1, { changed: 0 });
    await expect(b).resolves.toEqual({ changed: 0 });
  });

  it("réponse mal formée : PIXELS_FAILED_MESSAGE ; erreur du Worker (image illisible) : son message", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    await tick();
    workers[0]?.reply(0, { changed: 3 });
    await expect(a).rejects.toThrow(PIXELS_FAILED_MESSAGE);
    const b = runner.fill(fillJob());
    await tick();
    workers[1]?.reply(0, { error: FILL_UNREADABLE_MESSAGE });
    await expect(b).rejects.toThrow(FILL_UNREADABLE_MESSAGE);
  });

  it("S5 e : module des pixels absent : rejet avec le message du Worker", async () => {
    const { workers, runner } = setup();
    const a = runner.fill(fillJob());
    await tick();
    workers[0]?.reply(0, { error: "module des pixels indisponible" });
    await expect(a).rejects.toThrow("module des pixels indisponible");
  });

  it("dispose : remplissage en attente → null", async () => {
    const { runner } = setup();
    const a = runner.fill(fillJob());
    runner.dispose();
    await expect(a).resolves.toBeNull();
    await expect(runner.fill(fillJob())).resolves.toBeNull();
  });
});

describe("applyFill (C6b, B8)", () => {
  const mod = () => ({ image_flood_fill: vi.fn((..._a: unknown[]) => 7) });
  it("graine en pixels source mise à l'échelle du bitmap décodé ; couleur en majuscules acceptée (RF2) ; effacer", () => {
    const m = mod();
    expect(applyFill(m, new Uint8Array(4 * 5 * 4), 5, 4, { seed: [9, 7], size: [10, 8], tolerance: 5, color: "#FACC15" })).toBe(7);
    expect(m.image_flood_fill.mock.calls[0]?.slice(1)).toEqual([5, 4, 4, 3, 5, 250, 204, 21, false]);
    applyFill(m, new Uint8Array(4 * 10 * 8), 10, 8, { seed: [9, 7], size: [10, 8], tolerance: 0, color: null });
    expect(m.image_flood_fill.mock.calls[1]?.slice(1)).toEqual([10, 8, 9, 7, 0, 0, 0, 0, true]);
  });
  it("module d'avant C6b (ne rend pas de nombre) : erreur lisible", () => {
    const old = { image_flood_fill: vi.fn((..._a: unknown[]) => undefined as unknown as number) };
    expect(() => applyFill(old, new Uint8Array(4), 1, 1, { seed: [0, 0], size: [1, 1], tolerance: 5, color: null })).toThrow(FILL_MODULE_OLD_MESSAGE);
  });
});
```

`pnpm --filter @roomboard/web exec vitest run src/platform/pixel-runner.test.ts 2>&1 | tail -20` → `FAIL`.

- [ ] **4. `container.ts:85`.**

```ts
  /** C6b (B17) : `clear` efface la zone (`r`, `g`, `b` ignorés) ; rend le nombre de pixels changés. */
  image_flood_fill(px: Uint8Array, w: number, h: number, x: number, y: number, tolerance: number, r: number, g: number, b: number, clear: boolean): number;
```

- [ ] **5. Lanceur** (`pixel-runner.ts`). Doc du module : ajouter « C6b (B14) : `fill(job)` passe dans la même file sous un emplacement unique (jamais remplacé) ; le message part avec l'original (`Blob`) ou un bitmap transféré (SVG). ». Import : `import type { ImageKind } from "./image-decode";`. Après `pixelNotice` :

```ts
/** Erreur rendue par le Worker quand l'original ne se décode pas (B20). */
export const FILL_UNREADABLE_MESSAGE = "pot : image illisible";
/** Module `formats` d'avant C6b : `image_flood_fill` ne rend pas de nombre. */
export const FILL_MODULE_OLD_MESSAGE = "module des pixels sans pot sur image";
```

Après `PixelRunner` :

```ts
/** Pot sur une image (C6b, B8, B14) : graine en pixels source de l'élément ; `size` = (w, h) de l'élément (le bitmap
 *  d'un SVG peut être plus petit : la graine est mise à l'échelle) ; tolérance 0 à 100 ; couleur `#rrggbb`, ou null
 *  (« Aucune » : zone effacée). */
export interface PixelFillSpec {
  readonly seed: readonly [number, number];
  readonly size: readonly [number, number];
  readonly tolerance: number;
  readonly color: string | null;
}
export interface PixelFillJob extends PixelParams, PixelFillSpec {
  /** Original à décoder dans le Worker (`Blob` du magasin, pleine résolution) ou bitmap déjà décodé (SVG, copie du
   *  cache, transférée) ; appelé seulement quand le calcul part. */
  source(): Promise<{ readonly blob: Blob; readonly kind: ImageKind } | { readonly bitmap: ImageBitmap }>;
}
/** `changed: 0` : aucun pixel changé, ni PNG ni bitmap. Sinon : PNG pleine résolution et sa copie d'affichage. */
export type PixelFillResult = { readonly changed: 0 } | { readonly changed: number; readonly png: Blob; readonly bitmap: ImageBitmap };
export interface PixelFillRunner {
  /** Jamais remplacé (un clic = une étape) ; null : lanceur fermé ; rejet : erreur du Worker (dont
   *  `FILL_UNREADABLE_MESSAGE`), délai, module absent. */
  fill(job: PixelFillJob): Promise<PixelFillResult | null>;
}
```

Remplacer `interface Waiting { … }` par :

```ts
interface Waiting {
  /** Message (sans `id`) et objets transférés, préparés quand le calcul part. */
  readonly prepare: () => Promise<{ readonly msg: Readonly<Record<string, unknown>>; readonly transfer: Transferable[] }>;
  /** Réponse sans erreur → valeur rendue ; undefined : réponse mal formée. */
  readonly accept: (d: Readonly<Record<string, unknown>>) => unknown;
  readonly resolve: (v: unknown) => void;
  readonly reject: (e: Error) => void;
}

const closeAll = (ts: readonly Transferable[]): void => {
  for (const t of ts) (t as { close?: () => void }).close?.();
};
```

`createPixelRunner(…): PixelRunner & PixelFillRunner`, ajouter `let fills = 0;` aux variables. Dans `ensure`, remplacer le corps de `w.onmessage` par :

```ts
    w.onmessage = (e) => {
      const d = e.data as Readonly<Record<string, unknown>> | null;
      if (busy === null || typeof d !== "object" || d === null || d["id"] !== busy.id) return;
      if (typeof d["error"] === "string") {
        fail(d["error"]);
        return;
      }
      const out = busy.w.accept(d);
      if (out === undefined) {
        fail(PIXELS_FAILED_MESSAGE);
        return;
      }
      settle()?.resolve(out);
      pump();
    };
```

Dans `pump`, remplacer de `const { job } = w;` à la fin du `try … catch` final par :

```ts
    const send = ({ msg, transfer }: { readonly msg: Readonly<Record<string, unknown>>; readonly transfer: Transferable[] }): void => {
      if (busy?.id !== id) {
        closeAll(transfer);
        return;
      }
      try {
        ensure().postMessage({ ...msg, id }, transfer);
      } catch {
        closeAll(transfer);
        fail(PIXELS_FAILED_MESSAGE);
      }
    };
    w.prepare().then(send, () => {
      if (busy?.id === id) fail(PIXELS_FAILED_MESSAGE);
    });
```

Remplacer `run` et ajouter `fill` dans l'objet rendu :

```ts
    run(slot, job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<ImageBitmap | null>((resolve, reject) => {
        queue.get(slot)?.resolve(null);
        queue.set(slot, {
          prepare: async () => {
            const bitmap = await job.bitmap();
            return { msg: { bitmap, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast }, transfer: [bitmap] };
          },
          accept: (d) => (d["bitmap"] === undefined || d["bitmap"] === null ? undefined : d["bitmap"]),
          resolve: (v) => resolve(v as ImageBitmap | null),
          reject,
        });
        pump();
      });
    },
    fill(job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<PixelFillResult | null>((resolve, reject) => {
        // Emplacement unique : un remplissage n'est jamais remplacé (les ids d'élément n'ont pas de « # »).
        queue.set(`#remplissage-${++fills}`, {
          prepare: async () => {
            const src = await job.source();
            const base = { type: "fill", seed: job.seed, size: job.size, tolerance: job.tolerance, color: job.color, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast };
            return "bitmap" in src ? { msg: { ...base, bitmap: src.bitmap }, transfer: [src.bitmap] } : { msg: { ...base, blob: src.blob, kind: src.kind }, transfer: [] };
          },
          accept: (d) => {
            const changed = d["changed"];
            if (changed === 0) return { changed: 0 };
            const png = d["png"];
            const bitmap = d["bitmap"];
            if (typeof changed !== "number" || !(png instanceof Blob) || bitmap === undefined || bitmap === null) return undefined;
            return { changed, png, bitmap: bitmap as ImageBitmap };
          },
          resolve: (v) => resolve(v as PixelFillResult | null),
          reject,
        });
        pump();
      });
    },
```

Après `applyPixels` :

```ts
/** Remplissage sur les octets RGBA (C6b, B8) : graine mise à l'échelle du bitmap décodé (`size` → w × h), couleur en
 *  minuscules, null = effacer ; rend le nombre de pixels changés. Appelé par le Worker ; testé avec un faux module. */
export function applyFill(mod: Pick<PixelFormatsBinding, "image_flood_fill">, px: Uint8Array, w: number, h: number, f: PixelFillSpec): number {
  const x = Math.min(w - 1, Math.floor((f.seed[0] * w) / f.size[0]));
  const y = Math.min(h - 1, Math.floor((f.seed[1] * h) / f.size[1]));
  const [r, g, b] = f.color === null ? [0, 0, 0] : rgbOf(f.color.toLowerCase());
  const n: unknown = mod.image_flood_fill(px, w, h, x, y, f.tolerance, r, g, b, f.color === null);
  if (typeof n !== "number") throw new Error(FILL_MODULE_OLD_MESSAGE);
  return n;
}
```

Relancer l'étape 3 → `Tests  N passed` ; les tests C5 du fichier (`lanceur de pixels (DAI3, I18, I19)`) passent toujours.

- [ ] **6. Worker** (`pixel-worker.ts`). Remplacer le fichier :

```ts
/**
 * Entrée du Worker de pixels (C5, I18 ; C6b, B7, B14) : sa propre instance du module `formats`, chargée au premier calcul
 * et gardée. Retouche (C5) : reçoit `{ id, bitmap, transparent?, brightness?, contrast? }` (bitmap transféré), rend
 * `{ id, bitmap }`. Remplissage (C6b) : reçoit `{ id, type: "fill", blob, kind | bitmap, seed, size, tolerance, color,
 * transparent?, brightness?, contrast? }` : original décodé à pleine résolution (`decodeImage`, `max = Infinity`), pixels
 * de C5 cuits (`applyPixels`), zone remplie (`applyFill`), PNG encodé, copie d'affichage refaite par le même
 * `decodeImage` ; rend `{ id, changed, png, bitmap }` ou `{ id, changed: 0 }`. Erreur : `{ id, error }`. Créé par
 * `main.ts`, arrêté par `pixel-runner.ts`. Aucun test ne résout ce fichier ni `src/wasm-formats/`.
 */
import { hasPixels, type PixelFormatsBinding } from "./container";
import { loadFormatsModule } from "./container-load";
import { decodeImage, DISPLAY_MAX, ImageTooLargeError, type DecodePorts, type ImageKind } from "./image-decode";
import { applyFill, applyPixels, FILL_UNREADABLE_MESSAGE, pixelErrorMessage, type PixelFillSpec, type PixelParams } from "./pixel-runner";

type AdjustMessage = PixelParams & { readonly id: number; readonly type?: undefined; readonly bitmap: ImageBitmap };
type FillMessage = PixelParams & PixelFillSpec & { readonly id: number; readonly type: "fill"; readonly blob?: Blob; readonly kind?: ImageKind; readonly bitmap?: ImageBitmap };

/** Ports du Worker : `createImageBitmap` du Worker ; pas de DOM, donc pas de SVG (la page envoie le bitmap du cache). */
const ports: DecodePorts = {
  createImageBitmap: (src, opts) => self.createImageBitmap(src, opts),
  loadSvg: () => Promise.reject(new Error("SVG non décodable dans le Worker")),
};

let loading: Promise<PixelFormatsBinding> | null = null;
const pixels = async (): Promise<PixelFormatsBinding> => {
  const m = await loadFormatsModule();
  if (!hasPixels(m)) throw new Error("module des pixels indisponible");
  return m;
};

/** Original à pleine résolution : bitmap reçu (SVG), sinon `Blob` décodé ; un échec de décodage devient « illisible ». */
async function original(d: FillMessage): Promise<ImageBitmap> {
  if (d.bitmap !== undefined) return d.bitmap;
  if (d.blob === undefined || d.kind === undefined) throw new Error(FILL_UNREADABLE_MESSAGE);
  try {
    return (await decodeImage(d.blob, d.kind, Infinity, ports)).bitmap;
  } catch (err) {
    throw err instanceof ImageTooLargeError ? err : new Error(FILL_UNREADABLE_MESSAGE);
  }
}

async function fill(mod: PixelFormatsBinding, d: FillMessage): Promise<void> {
  const src = await original(d);
  const w = src.width;
  const h = src.height;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    src.close();
    throw new Error("contexte 2D indisponible dans le Worker");
  }
  ctx.drawImage(src, 0, 0);
  src.close();
  const img = ctx.getImageData(0, 0, w, h);
  const px = new Uint8Array(img.data.buffer);
  applyPixels(mod, px, w, h, d);
  const changed = applyFill(mod, px, w, h, d);
  if (changed === 0) {
    self.postMessage({ id: d.id, changed: 0 });
    return;
  }
  ctx.putImageData(img, 0, 0);
  const png = await canvas.convertToBlob({ type: "image/png" });
  const bitmap = (await decodeImage(png, "png", DISPLAY_MAX, ports)).bitmap;
  self.postMessage({ id: d.id, changed, png, bitmap }, { transfer: [bitmap] });
}

self.onmessage = async (e: MessageEvent<AdjustMessage | FillMessage>): Promise<void> => {
  const d = e.data;
  try {
    loading ??= pixels();
    const mod = await loading;
    if (d.type === "fill") {
      await fill(mod, d);
      return;
    }
    const { id, bitmap } = d;
    const w = bitmap.width;
    const h = bitmap.height;
    const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("contexte 2D indisponible dans le Worker");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    applyPixels(mod, new Uint8Array(img.data.buffer), w, h, d);
    const out = await createImageBitmap(img);
    self.postMessage({ id, bitmap: out }, { transfer: [out] });
  } catch (err) {
    self.postMessage({ id: d.id, error: pixelErrorMessage(err) });
  } finally {
    // Fermer un bitmap déjà fermé est sans effet : la retouche ferme le sien, le remplissage aussi s'il en a reçu un.
    d.bitmap?.close();
  }
};
```

- [ ] **7. Vert, types, couches.** `pnpm --filter @roomboard/web exec vitest run src/platform/image-decode.test.ts src/platform/pixel-runner.test.ts src/platform/image-import.test.ts 2>&1 | tail -20` → `Test Files  3 passed` ; `pnpm --filter @roomboard/web exec vitest run src/platform 2>&1 | tail -8` → aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie ; la commande `grep` du critère « terminé » ne rend rien.

- [ ] **8. Commits** (fichiers un par un) : `refactor(web): move image decoding to a DOM-free module shared with the pixel worker` (image-decode.ts, image-decode.test.ts, image-import.ts), puis `feat(web): image fill job in the pixel runner and worker (full-resolution original, PNG encoding)` (pixel-runner.ts, pixel-runner.test.ts, pixel-worker.ts, container.ts), chacun avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1-3, 5, 7 ; lignes `Réutilisation : …`.

<a id="tache-t5"></a>
### Tâche T5 — Cache : adoption, copie, budget, emplacement gardé

**Objectif.** Le cache des bitmaps : `adopt(asset, bitmap)` sert le bitmap rendu par le Worker pour le nouvel asset (pas de décodage, pas de clignotement) ; `copyOf(asset)` fournit une copie du bitmap décodé (source d'un SVG) ; un budget de 48 Mpx décodés ferme, à chaque `endScene`, les bitmaps les moins récemment dessinés hors de la scène (B15) ; l'emplacement retouché d'un élément redevenu sans retouche est **gardé**, jamais dessiné, et repris si l'élément revient à sa clé (B16 : Annuler un remplissage d'une image retouchée redessine aussitôt le bitmap retouché). Scénario S5 g.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T5`. Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.** Modifier : `apps/web/src/engine/render/image-cache.ts` (doc `:1-12`, `ImageCache` `:40-49`, `ImageCacheOptions` `:51-60`, `Slot` `:62-70`, corps `:90-330`) ; `apps/web/src/engine/render/image-cache.test.ts` (ajouts).

**Interfaces.**
- Consomme : rien d'une autre tâche (`PixelRunner` inchangé, écart E3).
- Produit :
  - `ImageCache.adopt(asset: string, bitmap: BitmapLike): void` — déjà présent ou cache fermé : le bitmap reçu est fermé ; sinon servi par `bitmap(asset)`, `ready()` appelé.
  - `ImageCache.copyOf(asset: string): Promise<ImageBitmap> | null` — copie (`opts.copy`, défaut `createImageBitmap`) du bitmap décodé ; null s'il n'est pas décodé ou si le cache est fermé.
  - `ImageCacheOptions.budgetPx?: number` ; `export const DECODED_BUDGET_PX = 48_000_000`.
- Réutilise : `apps/web/src/engine/render/image-cache.ts:40`, `:97`, `:262` — `createImageCache`, la table `done`, les emplacements `slots` et `drop` étendus (adoption, budget, emplacement gardé) ; `sizeOf` (`:76`) pour la surface d'un bitmap.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Patron à ne pas reprendre (concepteur-critique).**
- `image-cache.ts:250-256` jette l'emplacement (`drop(name)`) dès que l'élément n'a plus de retouche : c'est le clignotement que B16 retire ; ne pas non plus garder l'emplacement **dessinable** : un emplacement gardé dont la clé n'est plus voulue ne doit jamais être rendu (ni par `bitmapOf` de l'élément, ni comme repli de l'aperçu `:290`), sinon une image remplie puis retouchée montrerait l'ancienne image pendant le calcul.
- Un emplacement gardé ne compte pas dans `data-pixels` (`publish`, `:117-126`) : sinon une image remplie (sans retouche) afficherait `pret` et un échec passé resterait affiché (test C5 `m5`).
- Le budget ne ferme jamais un bitmap dessiné par la dernière scène (B15) ; un bitmap partagé n'existe pas entre `done` et les emplacements (les résultats du Worker sont propres à leur emplacement).
- Chemin de référence : `image-cache.ts:142-166` (`bitmap`) et `:243-291` (`bitmapOf`).

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/engine/render/image-cache.test.ts 2>&1 | tail -20`) · GC5 bitmaps fabriqués dans les tests · GC6 aucun test existant changé ; le test C5 `Annuler pendant un calcul (retour à l'image sans retouche) : le résultat arrivé est fermé` (`image-cache.test.ts:149`) reste vert tel quel · GC8 · GC9 commits · GC10 `PATH` · GC11 le moteur n'importe `platform/` qu'en type · GC12.

**Interdits.** Toucher un autre fichier ; changer `PixelState`, la clé `pixelKey`, l'ordre des calculs.

**Terminé quand.** `image-cache.test.ts` passe en entier (anciens et nouveaux tests) ; `pnpm --filter @roomboard/web exec vitest run src/engine 2>&1 | tail -8` sans `FAIL` ; `tsc --noEmit` sans erreur ; commit fait.

#### Étapes

- [ ] **1. Tests rouges.** Dans `image-cache.test.ts`, importer `DECODED_BUDGET_PX` et `type ImageCache` depuis `./image-cache`. À la fin du bloc `describe("bitmaps retouchés par élément (C5, I19, I22)", …)` (il fournit `ready`, `out`, `el`, `calls`) :

```ts
  it("C6b B16 : annuler un remplissage d'image retouchée : bitmap retouché aussitôt, aucun calcul", async () => {
    const { c, calls, runner } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    const filled = { width: 4, height: 2, close: vi.fn() } as unknown as BitmapLike;
    c.adopt("cd".repeat(32), filled);
    expect(c.bitmapOf(el({ asset: "cd".repeat(32) }))).toBe(filled);
    expect(k1.close).not.toHaveBeenCalled();
    expect(c.pixelState()).toBe("");
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(k1);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(c.pixelState()).toBe("pret");
  });

  it("C6b B16 : emplacement gardé puis autre retouche : l'ancien bitmap est fermé, l'image brute est dessinée pendant le calcul", async () => {
    const { c, calls, raw } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    c.bitmapOf(el());
    expect(c.bitmapOf(el({ contrast: 30 }))).toBe(raw);
    expect(k1.close).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it("C6b B16 : l'aperçu ne retombe jamais sur un emplacement gardé d'une autre clé", async () => {
    const { c, calls, raw } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.resolve(out("k1"));
    await flush();
    c.bitmapOf(el());
    expect(c.bitmapOf(el({ contrast: 30 }), true)).toBe(raw);
  });

  it("C6b B16 : forget ferme l'emplacement gardé", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const k1 = out("k1");
    calls[0]?.resolve(k1);
    await flush();
    c.bitmapOf(el());
    c.forget(["e"]);
    expect(k1.close).toHaveBeenCalledTimes(1);
  });
```

Après ce bloc, un nouveau bloc :

```ts
describe("C6b : adoption, copie, budget (B14, B15)", () => {
  const sized = (w: number, h: number, tag = "") => ({ tag, width: w, height: h, close: vi.fn() }) as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };
  const hash = (c: string): string => c.repeat(64);
  const img = (asset: string, id = "e"): ImageElement => ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset, w: 3000, h: 2000 } });
  const scene = (c: ImageCache, ...els: ImageElement[]): void => {
    c.beginScene();
    for (const e of els) c.bitmapOf(e);
    c.endScene();
  };

  it("adopt : servi sans décodage, ready appelé ; déjà présent ou cache fermé : le bitmap reçu est fermé", () => {
    const decode = vi.fn(async () => sized(1, 1));
    const ready = vi.fn();
    const c = createImageCache(store({}), decode, ready);
    const a = sized(10, 10);
    c.adopt(hash("1"), a);
    expect(c.bitmap(hash("1"))).toBe(a);
    expect([decode.mock.calls.length, ready.mock.calls.length]).toEqual([0, 1]);
    const twice = sized(10, 10);
    c.adopt(hash("1"), twice);
    expect(twice.close).toHaveBeenCalledTimes(1);
    c.dispose();
    const late = sized(1, 1);
    c.adopt(hash("2"), late);
    expect(late.close).toHaveBeenCalledTimes(1);
  });

  it("adopt pendant un décodage : le décodé arrivé ensuite est fermé, l'adopté reste", async () => {
    let resolve!: (b: BitmapLike) => void;
    const c = createImageCache(store(), () => new Promise<BitmapLike>((r) => (resolve = r)), vi.fn());
    expect(c.bitmap(ID)).toBeNull();
    const adopted = sized(4, 2);
    c.adopt(ID, adopted);
    const decoded = sized(4, 2);
    resolve(decoded);
    await flush();
    expect(c.bitmap(ID)).toBe(adopted);
    expect(decoded.close).toHaveBeenCalledTimes(1);
  });

  it("copyOf : copie du bitmap décodé ; null avant le décodage", async () => {
    const copy = vi.fn(async (b: BitmapLike) => ({ copied: b }) as unknown as ImageBitmap);
    const decoded = sized(4, 2);
    const c = createImageCache(store(), async () => decoded, vi.fn(), undefined, { copy });
    expect(c.copyOf(ID)).toBeNull();
    c.bitmap(ID);
    await flush();
    await expect(c.copyOf(ID)).resolves.toEqual({ copied: decoded });
  });

  it("S5 g : dix remplissages d'une image de 3000 × 2000 restent sous le budget ; le bitmap de la scène n'est jamais fermé", () => {
    const c = createImageCache(store({}), async () => sized(1, 1), vi.fn());
    const bitmaps = Array.from({ length: 10 }, (_, k) => sized(3000, 2000, String(k)));
    bitmaps.forEach((b, k) => {
      c.adopt(hash(String(k)), b);
      scene(c, img(hash(String(k))));
    });
    const open = bitmaps.filter((b) => b.close.mock.calls.length === 0);
    expect(open.length * 6_000_000).toBeLessThanOrEqual(DECODED_BUDGET_PX);
    expect(bitmaps[9]?.close).not.toHaveBeenCalled();
    expect(bitmaps[0]?.close).toHaveBeenCalledTimes(1);
  });

  it("un bitmap de la scène n'est jamais fermé, même au-delà du budget ; hors scène, le moins récemment dessiné part", () => {
    const c = createImageCache(store({}), async () => sized(1, 1), vi.fn(), undefined, { budgetPx: 10 });
    const a = sized(100, 100);
    const b = sized(100, 100);
    c.adopt(hash("a"), a);
    c.adopt(hash("b"), b);
    scene(c, img(hash("a")), img(hash("b"), "f"));
    expect([a.close.mock.calls.length, b.close.mock.calls.length]).toEqual([0, 0]);
    scene(c, img(hash("b"), "f"));
    expect([a.close.mock.calls.length, b.close.mock.calls.length]).toEqual([1, 0]);
  });

  it("fermé par le budget puis redessiné : redécodé depuis le magasin", async () => {
    const decode = vi.fn(async () => sized(100, 100, "re"));
    const c = createImageCache(store({ [hash("a")]: new Blob([new Uint8Array([1])]) }), decode, vi.fn(), undefined, { budgetPx: 10 });
    c.adopt(hash("a"), sized(100, 100));
    c.adopt(hash("b"), sized(100, 100));
    scene(c, img(hash("b")));
    expect(c.bitmap(hash("a"))).toBeNull();
    await flush();
    expect(c.bitmap(hash("a"))).toMatchObject({ tag: "re" });
  });
});
```

`pnpm --filter @roomboard/web exec vitest run src/engine/render/image-cache.test.ts 2>&1 | tail -20` → `FAIL` (`c.adopt is not a function`).

- [ ] **2. Code.** Doc du module : ajouter « C6b (B14-B16) : `adopt` sert le bitmap rendu par le Worker pour un nouvel asset ; `copyOf` copie un bitmap décodé (SVG à remplir) ; budget de `DECODED_BUDGET_PX` pixels décodés, appliqué à `endScene` aux bitmaps hors de la scène, du moins récemment dessiné au plus récent ; l'emplacement d'un élément redevenu sans retouche est gardé (jamais dessiné), repris si sa clé revient. ». Interfaces :

```ts
/** Budget des bitmaps décodés et retouchés gardés (C6b, B15) : ≈ 192 Mo RGBA. */
export const DECODED_BUDGET_PX = 48_000_000;
```

Dans `ImageCache` : `adopt(asset: string, bitmap: BitmapLike): void;` et `copyOf(asset: string): Promise<ImageBitmap> | null;`. Dans `ImageCacheOptions` : `/** C6b (B15) : pixels décodés gardés au plus ; défaut DECODED_BUDGET_PX. */ readonly budgetPx?: number;`. `Slot` :

```ts
interface Slot {
  /** Clé du bitmap tenu. */
  key: string | null;
  bitmap: BitmapLike | null;
  /** Clé en calcul pour cet emplacement ; un résultat d'une autre clé est périmé. */
  wanted: string | null;
  /** Emplacement de l'élément qui attend ce calcul (Valider pendant le calcul de l'aperçu) : le résultat lui est transféré. */
  adopter?: string;
  /** C6b (B16) : élément redevenu sans retouche ; bitmap gardé, jamais dessiné ; repris si la clé revient. */
  dormant?: boolean;
  /** Dernier usage (horloge du cache), pour le budget (B15). */
  used: number;
}
```

Dans `createImageCache`, après les déclarations existantes :

```ts
  const budget = opts.budgetPx ?? DECODED_BUDGET_PX;
  /** Dernier dessin de chaque bitmap décodé (horloge `clock`). */
  const usedAsset = new Map<string, number>();
  let clock = 0;
  /** Assets lus par la scène en cours, puis par la dernière scène finie. */
  let markingAssets: Set<string> | null = null;
  let shownAssets: ReadonlySet<string> = new Set();
  const area = (b: BitmapLike | null): number => {
    const s = b === null ? null : sizeOf(b);
    return s === null ? 0 : s[0] * s[1];
  };
```

`publish` : remplacer ses deux premières lignes par :

```ts
    const live = [...slots].filter(([, s]) => s.dormant !== true);
    if (live.length === 0) lastFailed = false; // plus d'image retouchée : un échec passé ne s'affiche plus (I33)
    // « Aucune image retouchée visible » (I33) : seuls comptent les emplacements dessinables des éléments de la dernière scène.
    const visible = live.filter(([n]) => shown === null || shown.has(ownerOf(n))).map(([, s]) => s);
```

`bitmap(asset)` : première ligne `markingAssets?.add(asset);` ; en cas de succès du cache (`hit`) : `usedAsset.set(asset, ++clock); return hit;` ; dans le succès du décodage, remplacer `if (disposed) {` par `if (disposed || done.has(asset)) {` (commentaire : « adopté entre-temps (B14) : le décodé est fermé ») et ajouter `usedAsset.set(asset, ++clock);` avant `ready();`.

Évicteur (avant `return {`) :

```ts
  /** B15 : au-delà du budget, ferme d'abord les bitmaps le moins récemment dessinés hors de la dernière scène. */
  function evict(): void {
    let total = 0;
    for (const b of done.values()) total += area(b);
    for (const s of slots.values()) total += area(s.bitmap);
    if (total <= budget) return;
    const candidates: { readonly used: number; readonly px: number; readonly close: () => void }[] = [];
    for (const [asset, b] of done) {
      if (shownAssets.has(asset)) continue;
      candidates.push({
        used: usedAsset.get(asset) ?? 0,
        px: area(b),
        close: () => {
          done.delete(asset);
          usedAsset.delete(asset);
          b.close?.();
        },
      });
    }
    for (const [name, s] of slots) {
      if (s.bitmap === null || (s.dormant !== true && (shown === null || shown.has(ownerOf(name))))) continue;
      candidates.push({
        used: s.used,
        px: area(s.bitmap),
        close: () => {
          s.bitmap?.close?.();
          s.bitmap = null;
          s.key = null;
        },
      });
    }
    candidates.sort((a, b) => a.used - b.used);
    for (const c of candidates) {
      if (total <= budget) break;
      c.close();
      total -= c.px;
    }
  }
```

Création d'un emplacement dans `bitmapOf` : `s = { key: null, bitmap: null, wanted: null, used: ++clock };`. Branche sans retouche (`:250-256`) :

```ts
      if (!needsPixels(i) || pixels === undefined || disposed) {
        if (preview) drop(name);
        else {
          drop(twinName);
          // B16 : l'emplacement retouché reste (Annuler le remplissage le retrouve) ; son calcul en route est abandonné.
          const kept = slots.get(name);
          if (kept !== undefined) {
            release(kept);
            kept.wanted = null;
            kept.dormant = true;
          }
        }
        publish();
        return raw;
      }
```

Juste après la création ou la lecture de `s` (avant `const twin = slots.get(twinName);`) :

```ts
      if (s.dormant === true) {
        // Reprise (B16) : même clé, le bitmap gardé est servi sans calcul ; autre clé, il ne vaut plus rien.
        s.dormant = false;
        if (s.key !== key) {
          s.bitmap?.close?.();
          s.bitmap = null;
          s.key = null;
        }
        publish();
      }
      s.used = ++clock;
```

Dernière ligne de `bitmapOf` : `return s.bitmap ?? (preview && twin?.dormant !== true ? (twin?.bitmap ?? null) : null) ?? raw;`. Dans l'objet rendu, ajouter :

```ts
    adopt(asset, b) {
      if (disposed || done.has(asset)) {
        b.close?.();
        return;
      }
      failed.delete(asset);
      done.set(asset, b);
      usedAsset.set(asset, ++clock);
      ready();
    },
    copyOf(asset) {
      const b = done.get(asset);
      if (b === undefined || disposed) return null;
      usedAsset.set(asset, ++clock);
      return copy(b);
    },
```

`beginScene` : `marking = new Set(); markingAssets = new Set();`. `endScene` :

```ts
    endScene() {
      if (marking === null) return;
      shown = marking;
      shownAssets = markingAssets ?? new Set();
      marking = null;
      markingAssets = null;
      evict();
      publish();
    },
```

`dispose` : ajouter `usedAsset.clear();`.

- [ ] **3. Vert.** `pnpm --filter @roomboard/web exec vitest run src/engine/render/image-cache.test.ts 2>&1 | tail -20` → `Tests  N passed`, aucun `FAIL` (les tests C5 dont `Annuler pendant un calcul …` et `m5 …` compris) ; `pnpm --filter @roomboard/web exec vitest run src/engine 2>&1 | tail -8` → aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

- [ ] **4. Commit.** `git add apps/web/src/engine/render/image-cache.ts`, `git add apps/web/src/engine/render/image-cache.test.ts`, message `feat(web): image cache adopts worker bitmaps, keeps retouched slots, and caps decoded memory`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1 et 3 ; lignes `Réutilisation : …`.

<a id="tache-t6"></a>
### Tâche T6 — Parité du cœur TS : liaison Wasm et faux cœur

**Objectif.** Les deux cœurs de la page (`wasm-core.ts` sur le vrai module, `fake-core.ts` en TS) jouent la même commande `Fill` sur une image, le même `SetImageParams { restore }`, et lisent `sourceAsset` de la même façon ; le contrat commun le prouve contre les deux. Scénario S2 (côté page).

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T6` (après la fusion de T1 et T3). Préparation (module principal reconstruit : `fill_image` et `restore` viennent de T1) : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/ && grep -c "fill_image" apps/web/src/wasm/roomboard_wasm.d.ts` (≥ 1).

**Fichiers.** Modifier : `apps/web/src/core/wasm-core.ts:198-203`, `:529-536` ; `apps/web/src/core/fake-core.ts:94` (import), `:1062-1097` (`Fill`), `:1098-1119` (`SetImageParams`), `:1571-1575` (lecture) ; `apps/web/src/core/wasm-core.contract.test.ts` (ajouts en fin de fichier).

**Interfaces.**
- Consomme : T1 — `Document.fill_image(page, id, asset, name, mime, size, color?)`, `Document.set_image_params(…, matrix, restore: boolean)` du module généré ; `ImageView` sérialisé avec `sourceAsset`. T3 — `FillTarget` `{ kind: "image"; id; asset: AssetRef }`, `SetImageParams.restore?`, `ImageData.sourceAsset?` (`core/api.ts`).
- Produit : `CoreDocument.apply` accepte ces commandes sur les deux cœurs, mêmes refus, mêmes messages ; `element(id).image.sourceAsset` présent après un remplissage.
- Réutilise : `apps/web/src/core/api.ts:43`, `:156`, `:187` — types de T3, consommés tels quels.
- Réutilise : `apps/web/src/core/fake-core.ts:1062`, `:1099` — branches `Fill` et `SetImageParams` étendues ; `putMeta` (`:273`), `validAsset` (`:172`), `MESSAGES.badFill`, `MESSAGES.badAsset`, `paramsOf`, `geometryOf` (`core/image-params.ts:93-95`) appelés.
- Réutilise : `apps/web/src/core/wasm-core.ts:529-536` — aiguillage de `apply`, étendu ; `imageParamsArgs` appelé tel quel.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Patron à ne pas reprendre (concepteur-critique).**
- `fake-core.ts:1116` reconstruit l'image `{ asset, w, h, ...next }` : il **perdrait** `sourceAsset` à chaque `SetImageParams` (rognage après un remplissage = original oublié) ; le cœur Rust ne touche pas ce champ hors `restore`.
- `wasm-core.ts:532` envoie `t.kind` à `fill` : une cible image partirait à `fill` et serait refusée (`BadFill`) au lieu d'aller à `fill_image`.
- Référence de l'ordre des refus : `crates/roomboard-core/src/image.rs` (`cmd_fill_image`, écrit par T1) et `fake-core.ts:1063-1078` (patron `Fill` de C6a).

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | tail -20`, les blocs `contrat C6b : fake` **et** `contrat C6b : wasm` doivent apparaître dans `--reporter=verbose`) · GC3 module principal ≤ 1 572 864 o (vérifier `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm`) · GC4 · GC6 aucun test existant changé · GC8 · GC9 commits · GC10 `PATH` · GC12.

**Interdits.** Changer un message d'erreur existant ; toucher `crates/`, `engine/`, `app/`.

**Terminé quand.** Le contrat passe en entier avec le vrai module exigé (`ROOMBOARD_WASM_REQUIRED=1`), dont les blocs C5, C6a, C6b sur les deux cœurs ; `pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -8` sans `FAIL` ; `tsc --noEmit` sans erreur ; commit fait.

#### Étapes

- [ ] **1. Tests rouges** (fin de `wasm-core.contract.test.ts`, après le bloc C5 qui définit `FULL` et `imageOf`) :

```ts
// C6b (B2-B4, B11, B12, S2) : pot sur image et « Rétablir l'original », joués contre les deux cœurs.
const NEXT = { id: "cd".repeat(32), name: "photo.png", mime: "image/png", size: 9 } as const;
const LAST = { id: "ef".repeat(32), name: "photo.png", mime: "image/png", size: 7 } as const;
/** Géométrie de `FULL` (rognage, retournement, quart de tour) : ce qu'un remplissage garde (B4). */
const GEOMETRY: ImageParams = { crop: [10, 20, 300, 200], flipX: true, quarterTurns: 1 };

describe.each(factories)("contrat C6b : $name", ({ f }) => {
  const retouched = (d: CoreDocument, p: string): string => {
    const id = d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: I }).ids[0] ?? "";
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: I });
    return id;
  };
  const fill = (p: string, id: string, asset: AssetRef, color: string | null = "#facc15"): Command => ({ type: "Fill", page: p, target: { kind: "image", id, asset }, color });

  it("Fill image : une étape ; nouvel asset, sourceAsset, géométrie gardée, pixels retirés ; Annuler rend tout", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    const c = d.apply(fill(p, id, NEXT));
    expect([c.pages, c.ids]).toEqual([[p], [id]]);
    expect(imageOf(d, id)).toEqual({ asset: NEXT.id, w: 640, h: 480, sourceAsset: ABC, ...GEOMETRY });
    expect(d.asset(NEXT.id)).toEqual(NEXT);
    d.undo();
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480, ...FULL });
    d.free();
  });

  it("second remplissage : sourceAsset gardé ; rognage ensuite : sourceAsset gardé ; restore : l'original sans aucun champ, une étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply(fill(p, id, NEXT));
    d.apply(fill(p, id, LAST, null));
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    d.apply({ type: "SetImageParams", id, params: { ...GEOMETRY, flipY: true }, matrix: I });
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC, flipY: true });
    const c = d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true });
    expect(c.ids).toEqual([id]);
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480 });
    d.undo();
    expect(imageOf(d, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    d.free();
  });

  it("restore sans sourceAsset : comportement de C5 ; image brute : aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true });
    expect(imageOf(d, id)).toEqual({ asset: ABC, w: 640, h: 480 });
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: {}, matrix: I, restore: true }));
    d.free();
  });

  it("même asset : aucune étape ; refus dans l'ordre du cœur, sans étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    const stroke = commit(d, p, 100);
    d.apply({ type: "AddPage", after: p });
    const p2 = d.pageIds().find((x) => x !== p) ?? "";
    unchanged(d, () => d.apply(fill(p, id, png)));
    const bad = { ...NEXT, id: "x" };
    const run = (cmd: Command): string => messageOf(() => d.apply(cmd));
    unchanged(d, () => {
      expect(run(fill("nope", id, NEXT, "#12"))).toBe(BAD_FILL);
      expect(run(fill("nope", id, NEXT, null))).toBe("page inconnue : nope");
      expect(run(fill(p, "nope", NEXT, null))).toBe("élément inconnu : nope");
      expect(run(fill(p2, id, NEXT, null))).toBe(`élément inconnu : ${id}`);
      expect(run(fill(p, stroke, bad, null))).toBe(BAD_FILL);
      expect(run(fill(p, id, bad, null))).toBe(BAD_ASSET);
    });
    d.free();
  });

  it("enregistré puis relu : sourceAsset gardé ; cités : original et version courante ; métadonnée intermédiaire gardée", () => {
    const d = f.blank();
    const p = first(d);
    const id = retouched(d, p);
    d.apply(fill(p, id, NEXT));
    d.apply(fill(p, id, LAST, null));
    expect(d.citedAssets().map((a) => a.id)).toEqual([ABC, LAST.id].sort());
    const r = f.load(d.save("2026-11-21T00:00:00Z", "0.1.0"));
    expect(imageOf(r, id)).toMatchObject({ asset: LAST.id, sourceAsset: ABC });
    expect(r.citedAssets().map((a) => a.id)).toEqual([ABC, LAST.id].sort());
    expect(r.asset(NEXT.id)).toEqual(NEXT);
    r.free();
    d.free();
  });
});

describe("contrôle de forme C6b (sourceAsset)", () => {
  const t = [1, 0, 0, 1, 0, 0];
  it("sourceAsset chaîne gardé ; absent : absent ; autre type : ElementView invalide", () => {
    expect(toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: EMPTY_HASH } })).toEqual({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: EMPTY_HASH } });
    expect(toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1 } })).toEqual({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1 } });
    expect(() => toElementView({ id: "i", kind: "image", transform: t, image: { asset: ABC, w: 1, h: 1, sourceAsset: 3 } })).toThrow("ElementView invalide");
  });
});
```

Ajouter `Command` à l'import de types de `./api` s'il manque. `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts -t "C6b" 2>&1 | tail -20` → `FAIL` sur les deux cœurs.

- [ ] **2. Liaison** (`wasm-core.ts`). Lecture de l'image (`:198-203`) :

```ts
    case "image": {
      const i = v["image"];
      if (!isRecord(i)) throw new Error(ELEMENT);
      const { asset, w, h, sourceAsset } = i;
      if (typeof asset !== "string" || typeof w !== "number" || typeof h !== "number" || (sourceAsset !== undefined && typeof sourceAsset !== "string")) {
        throw new Error(ELEMENT);
      }
      // C6b (B12) : `sourceAsset` absent quand le cœur ne l'envoie pas (Option::None), recopié sinon.
      return { ...base, kind, image: { asset, w, h, ...(sourceAsset !== undefined ? { sourceAsset } : {}), ...toImageParams(i) } };
    }
```

`apply` (`:529-536`) :

```ts
      case "Fill": {
        const t = cmd.target;
        // C6b (B2) : une image reçoit le nouvel asset à plat ; null → undefined : Option::None (« Aucune ») ; le fond n'a pas d'id.
        if (t.kind === "image") {
          const a = t.asset;
          return toChange(this.d.fill_image(cmd.page, t.id, a.id, a.name, a.mime, a.size, cmd.color ?? undefined));
        }
        return toChange(this.d.fill(cmd.page, t.kind, t.kind === "background" ? undefined : t.id, cmd.color ?? undefined));
      }
      case "SetImageParams":
        // C5 (I6) : réglages à plat ; seule la référence de l'asset vit dans l'élément ; C6b (B11) : `restore`.
        return toChange(this.d.set_image_params(cmd.id, ...imageParamsArgs(cmd.params), new Float64Array(cmd.matrix), cmd.restore === true));
```

- [ ] **3. Faux cœur** (`fake-core.ts`). Import : ajouter `geometryOf` à `./image-params`. Branche `Fill`, juste après le bloc `if (t.kind === "background") { … }` :

```ts
        if (t.kind === "image") {
          // Ordre du cœur (`image.rs`, `cmd_fill_image`, B2) : élément de cette page, image lisible, asset ; même asset :
          // aucune étape. Pixels de C5 retirés (cuits par la page), géométrie gardée, `sourceAsset` posé au premier
          // remplissage seulement, métadonnée du nouvel asset (K3).
          const e = page.elements.find((x) => x.id === t.id);
          if (!e) throw new Error(`élément inconnu : ${t.id}`);
          const im = e.image;
          if (!im || e.malformed) throw new Error(MESSAGES.badFill);
          if (!validAsset(t.asset)) throw new Error(MESSAGES.badAsset);
          if (im.asset === t.asset.id) return this.unchanged();
          return this.step((s) => {
            const p = s.pages.find((q) => q.id === cmd.page);
            const i = p ? p.elements.findIndex((x) => x.id === t.id) : -1;
            const old = p?.elements[i];
            if (p && old?.image) {
              const o = old.image;
              p.elements[i] = { ...old, image: { asset: t.asset.id, w: o.w, h: o.h, sourceAsset: o.sourceAsset ?? o.asset, ...geometryOf(paramsOf(o)) } };
            }
            putMeta(s.assets, t.asset);
            return { pages: [cmd.page], ids: [t.id], removed: [] };
          });
        }
```

Branche `SetImageParams` : remplacer la ligne `if (sameParams(paramsOf(im), next) && sameMatrix) return this.unchanged();` et la reconstruction de l'image par :

```ts
        // C6b (B11) : `restore` avec un `sourceAsset` : l'asset d'origine revient, `sourceAsset` retiré (une étape).
        const restoring = cmd.restore === true && im.sourceAsset !== undefined;
        if (sameParams(paramsOf(im), next) && sameMatrix && !restoring) return this.unchanged();
        const page = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === page);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          const old = p?.elements[i];
          if (p && old?.image) {
            const o = old.image;
            const asset = restoring ? (o.sourceAsset ?? o.asset) : o.asset;
            const source = !restoring && o.sourceAsset !== undefined ? { sourceAsset: o.sourceAsset } : {};
            p.elements[i] = { ...old, transform: cmd.matrix, image: { asset, w: o.w, h: o.h, ...source, ...next } };
          }
          return { pages: [page], ids: [cmd.id], removed: [] };
        });
```

Lecture d'un document (`:1571-1575`), branche `e.kind === "image" && e.image` :

```ts
    const im = e.image;
    const src = (im as unknown as Readonly<Record<string, unknown>>)["sourceAsset"];
    const image: ImageData = {
      asset: im.asset,
      w: im.w,
      h: im.h,
      // C6b (B12) : lu tolérant, comme le cœur (non conforme = absent, U3).
      ...(isAssetId(src) ? { sourceAsset: src } : {}),
      ...readParams(im as unknown as Readonly<Record<string, unknown>>, im.w, im.h),
    };
```

- [ ] **4. Vert.** `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C6b|Tests |FAIL" | tail -30` → lignes `contrat C6b : fake` et `contrat C6b : wasm` (5 tests chacun) et `contrôle de forme C6b`, `Tests  N passed`, aucun `FAIL` ; `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core 2>&1 | tail -8` → aucun `FAIL` (contrats C5, C6a, C2 compris) ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie ; `wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm` ≤ 1 572 864.

- [ ] **5. Commit** (fichiers un par un) : `feat(web): image fill and restore parity between the wasm core and the fake core`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1 et 4, taille du module ; lignes `Réutilisation : …`.

<a id="tache-t7"></a>
### Tâche T7 — File du pot `app/image-fill.ts`

**Objectif.** Une file par onglet reçoit toutes les actions du pot dans l'ordre des clics : file vide, un clic vectoriel s'écrit tout de suite ; dès qu'un remplissage d'image est en route, tout clic passe derrière lui. Un calcul à la fois, lancé après l'écriture du précédent. Jeton de révision : `doc.version()` retenu au premier clic mis en file, puis la version rendue par chacune des écritures de la file ; vérifié avant chaque calcul, à l'arrivée du résultat et avant chaque écriture ; s'il diffère, le résultat est jeté (bitmap fermé), la file vidée, message « remplissage abandonné : le document a changé ». Ordre des effets : jeton → `AssetStore.put(png)` → `Fill` écrit → si l'écriture réussit, le cache adopte le bitmap, sinon il est fermé. Messages distincts (B20) et état `PotState` (B21). Scénarios S5 a–f et S5 h.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T7` (après la fusion de T3, T4, T5). Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.** Créer : `apps/web/src/app/image-fill.ts`, `apps/web/src/app/image-fill.test.ts`.

**Interfaces.**
- Consomme :
  - T3 : `FillRequest`, `ImageFillRequest` (`engine/fill-target.ts`) ; `FillTarget` `{ kind: "image"; id; asset }`, `ImageData.sourceAsset?` (`core/api.ts`).
  - T4 : `PixelFillRunner`, `PixelFillJob`, `PixelFillResult`, `FILL_UNREADABLE_MESSAGE` (`platform/pixel-runner.ts`) ; `kindOfMime` (`platform/image-import.ts`, inchangé).
  - T5 : `ImageCache.copyOf(asset): Promise<ImageBitmap> | null`, `ImageCache.adopt(asset, bitmap): void`.
- Produit (lu par T9) :
  - `export type PotState = "" | "attente" | "pret" | "refus" | "abandon" | "echec"`
  - `export interface FillQueueDeps { readonly doc: Pick<CoreDocument, "element" | "asset" | "version">; readonly assets: Pick<AssetStore, "put" | "get">; readonly images: Pick<ImageCache, "copyOf" | "adopt">; readonly runner?: PixelFillRunner; report(m: string): void; onState(s: PotState): void }`
  - `export interface FillQueue { submit(r: FillRequest, run: (c: Command) => Change | null): void; state(): PotState; dispose(): void }`
  - `export function createFillQueue(deps: FillQueueDeps): FillQueue`
  - `export const FILL_ABANDONED_MESSAGE = "remplissage abandonné : le document a changé"`, `FILL_MISSING_MESSAGE = "pot : image absente du document"`, `FILL_NOT_READY_MESSAGE = "pot : image pas encore prête"`, `FILL_NO_RUNNER = "calcul des pixels indisponible"` ; `export const fillFailure = (cause: string): string => \`pot sur image impossible : ${cause}\`` ; `export function pngName(name: string): string` ; réexport de `FILL_UNREADABLE_MESSAGE`.
- Réutilise : `apps/web/src/core/asset-store.ts:36` — `AssetStore.put(blob): Promise<AssetId>` (PNG du remplissage) et `get(id)` (original), appelés tels quels.
- Réutilise : `apps/web/src/core/api.ts:309` — `CoreDocument.version()`, jeton de révision.
- Réutilise : `apps/web/src/platform/pixel-runner.ts` (T4) — `PixelFillRunner.fill(job)`.
- Réutilise : `apps/web/src/engine/render/image-cache.ts` (T5) — `adopt`, `copyOf`.
- Nouveau module (cadrage, ligne « File du pot, ordre, écriture » : aucun module existant substituable ; DAB2).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise` ; écarts E1, E3, E4 cités.

**Patron à ne pas reprendre (concepteur-critique).**
- L'import d'image (`platform/image-import.ts:247-280`) écrit après un `await` sans vérifier que le document n'a pas changé : ici chaque `await` (calcul, `put`) est suivi d'une vérification du jeton, sinon un remplissage s'écrirait dans le dos de l'utilisateur après un Ctrl+Z (B13, HB8).
- Lancer les calculs en parallèle ou par la file à remplacement du lanceur : le second clic doit être calculé sur l'asset écrit par le premier (S5 a).
- Adopter le bitmap avant l'écriture : un refus du cœur laisserait un bitmap adopté pour un asset jamais cité (S5 f).
- Chemin de référence de l'ordre des effets : cadrage B14 ; patron du jeton : `app/board-session.ts:430-437` (`markedVersion`).

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/app/image-fill.test.ts 2>&1 | tail -20`) · GC4 aucun paquet · GC5 bitmaps et Blob fabriqués dans les tests · GC6 · GC8 · GC9 commits · GC10 `PATH` · GC11 la file vit dans `app/` (elle importe `engine/`, `platform/`, `core/` ; personne dans `engine/` ne l'importe) · GC12.

**Interdits.** Toucher un autre fichier ; écrire dans le document autrement que par le `run` reçu ; garder une référence au bitmap après `adopt` ou `close`.

**Terminé quand.** `image-fill.test.ts` passe (≥ 12 tests, dont `S5 a`, `S5 b`, `S5 c`, `S5 d`, `S5 e`, `S5 f`, `S5 h`, `RF4`) ; `tsc --noEmit` sans erreur ; commit fait.

#### Étapes

- [ ] **1. Tests rouges.** Créer `apps/web/src/app/image-fill.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import type { AssetRef, Change, Command, ElementView, ImageData } from "../core/api";
import type { FillRequest } from "../engine/fill-target";
import { FILL_UNREADABLE_MESSAGE, type PixelFillJob, type PixelFillResult } from "../platform/pixel-runner";
import { createFillQueue, FILL_ABANDONED_MESSAGE, FILL_MISSING_MESSAGE, FILL_NO_RUNNER, FILL_NOT_READY_MESSAGE, fillFailure, pngName, type FillQueueDeps, type PotState } from "./image-fill";

const A = "ab".repeat(32);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const bmp = (tag: string) => ({ tag, width: 4, height: 2, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
const filled = (bitmap: ImageBitmap): PixelFillResult => ({ changed: 3, png: new Blob([new Uint8Array([7])], { type: "image/png" }), bitmap });

/** Document minimal : une image « img » (JPEG) ; `run` écrit comme le cœur (version + 1), `foreign` imite une écriture
 *  étrangère (Ctrl+Z, trait d'un autre outil) ; `put` rend une empreinte « 1111… », « 2222… ». */
function world(image: Partial<ImageData> = {}) {
  let version = 1;
  let img: ImageData = { asset: A, w: 4, h: 2, ...image };
  const metas = new Map<string, AssetRef>([[A, { id: A, name: "photo.jpg", mime: "image/jpeg", size: 3 }]]);
  const blobs = new Map<string, Blob>([[A, new Blob([new Uint8Array([1])], { type: "image/jpeg" })]]);
  const writes: Command[] = [];
  let refuse = false;
  const doc: FillQueueDeps["doc"] = {
    element: (id) => (id === "img" ? ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: img } as ElementView) : null),
    asset: (id) => metas.get(id) ?? null,
    version: () => version,
  };
  const run = (c: Command): Change | null => {
    if (refuse) return null;
    writes.push(c);
    if (c.type === "Fill" && c.target.kind === "image") {
      img = { asset: c.target.asset.id, w: img.w, h: img.h, sourceAsset: img.sourceAsset ?? img.asset };
      metas.set(c.target.asset.id, c.target.asset);
    }
    version++;
    return { pages: ["p"], ids: ["img"], removed: [], full: false, version };
  };
  let n = 0;
  const put = vi.fn(async (b: Blob): Promise<string> => {
    const id = String(++n).repeat(64);
    blobs.set(id, b);
    return id;
  });
  const assets: FillQueueDeps["assets"] = { put, get: (id: string) => blobs.get(id) };
  const images = { copyOf: vi.fn((_a: string): Promise<ImageBitmap> | null => null), adopt: vi.fn() };
  const jobs: { job: PixelFillJob; resolve: (r: PixelFillResult | null) => void; reject: (e: Error) => void }[] = [];
  const runner = { fill: vi.fn((job: PixelFillJob) => new Promise<PixelFillResult | null>((resolve, reject) => jobs.push({ job, resolve, reject }))) };
  const states: PotState[] = [];
  const report = vi.fn();
  const deps: FillQueueDeps = { doc, assets, images, runner, report, onState: (s) => void states.push(s) };
  return {
    deps, run, writes, jobs, images, put, states, report, blobs,
    foreign: (): void => void version++,
    refuse: (v: boolean): void => void (refuse = v),
    image: (): ImageData => img,
  };
}
const at = (color: string | null = "#facc15", seed: readonly [number, number] = [1, 1]): FillRequest => ({ type: "ImageFill", page: "p", id: "img", seed, color, tolerance: 5 });
const shape: FillRequest = { command: { type: "Fill", page: "p", target: { kind: "inside", id: "rect" }, color: "#facc15" } };
const lastReport = (w: ReturnType<typeof world>): unknown => w.report.mock.calls.at(-1)?.[0];

describe("file du pot (C6b, DAB2, B13, B14)", () => {
  it("file vide : un clic vectoriel s'écrit tout de suite (C6a inchangé)", () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([(shape as { command: Command }).command]);
    expect(q.state()).toBe("");
  });

  it("S5 h : travail envoyé : original du magasin (pas la copie d'affichage), graine, taille source, tolérance, couleur, pixels de C5", async () => {
    const w = world({ w: 6000, h: 4000, brightness: 20, crop: [0, 0, 100, 100] });
    const q = createFillQueue(w.deps);
    q.submit(at("#facc15", [3, 1]), w.run);
    await flush();
    const job = w.jobs[0]?.job;
    expect(job).toMatchObject({ seed: [3, 1], size: [6000, 4000], tolerance: 5, color: "#facc15", brightness: 20 });
    const src = await job!.source();
    expect("blob" in src ? [src.blob, src.kind] : null).toEqual([w.blobs.get(A), "jpeg"]);
    expect([w.states, q.state()]).toEqual([["attente"], "attente"]);
  });

  it("S5 a : deux clics rapides : deux étapes dans l'ordre ; le second calculé après l'écriture du premier, sur l'asset écrit", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at("#facc15"), w.run);
    q.submit(at(null), w.run);
    await flush();
    expect(w.jobs).toHaveLength(1);
    const b1 = bmp("1");
    w.jobs[0]?.resolve(filled(b1));
    await flush();
    expect(w.writes).toHaveLength(1);
    expect(w.jobs).toHaveLength(2);
    const src = await w.jobs[1]!.job.source();
    expect("blob" in src ? src.blob : null).toBe(w.blobs.get(w.image().asset));
    w.jobs[1]?.resolve(filled(bmp("2")));
    await flush();
    expect(w.writes.map((c) => (c.type === "Fill" && c.target.kind === "image" ? [c.target.asset.name, c.target.asset.mime, c.color] : null))).toEqual([
      ["photo.png", "image/png", "#facc15"],
      ["photo.png", "image/png", null],
    ]);
    expect(w.image().sourceAsset).toBe(A);
    expect(w.images.adopt).toHaveBeenCalledTimes(2);
    expect(w.images.adopt.mock.calls[0]).toEqual(["1".repeat(64), b1]);
    expect(w.states.at(-1)).toBe("pret");
  });

  it("S5 b : clic sur l'image puis clic dans une forme : deux étapes dans l'ordre des clics", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([]);
    await flush();
    w.jobs[0]?.resolve(filled(bmp("1")));
    await flush();
    expect(w.writes.map((c) => (c.type === "Fill" ? c.target.kind : ""))).toEqual(["image", "inside"]);
  });

  it("S5 c : écriture étrangère pendant le calcul : rien ne s'écrit, file vidée, bitmap fermé, abandon et message", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    await flush();
    w.foreign();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect(w.writes).toEqual([]);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect([w.states.at(-1), lastReport(w)]).toEqual(["abandon", FILL_ABANDONED_MESSAGE]);
    expect(w.images.adopt).not.toHaveBeenCalled();
    expect(w.put).not.toHaveBeenCalled();
    q.submit(shape, w.run);
    expect(w.writes).toHaveLength(1);
  });

  it("écriture étrangère pendant l'enregistrement du PNG au magasin : abandon aussi (jeton vérifié avant l'écriture)", async () => {
    const w = world();
    let release!: () => void;
    w.put.mockImplementationOnce(() => new Promise<string>((r) => (release = () => r("9".repeat(64)))));
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    w.foreign();
    release();
    await flush();
    expect([w.writes.length, b.close.mock.calls.length, w.states.at(-1)]).toEqual([0, 1, "abandon"]);
  });

  it("S5 d : asset absent du magasin, puis décodage échoué : messages distincts, refus, aucune étape", async () => {
    const w = world();
    w.blobs.delete(A);
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    expect([lastReport(w), w.states.at(-1), w.jobs.length, w.writes.length]).toEqual([FILL_MISSING_MESSAGE, "refus", 0, 0]);
    const v = world();
    createFillQueue(v.deps).submit(at(), v.run);
    await flush();
    v.jobs[0]?.reject(new Error(FILL_UNREADABLE_MESSAGE));
    await flush();
    expect([lastReport(v), v.states.at(-1), v.writes.length]).toEqual([FILL_UNREADABLE_MESSAGE, "refus", 0]);
  });

  it("SVG : copie du bitmap du cache ; pas encore décodé : « image pas encore prête »", async () => {
    const w = world();
    w.blobs.set(A, new Blob([new Uint8Array([1])], { type: "image/svg+xml" }));
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    expect([lastReport(w), w.states.at(-1), w.jobs.length]).toEqual([FILL_NOT_READY_MESSAGE, "refus", 0]);
    const copy = bmp("copie");
    w.images.copyOf.mockReturnValue(Promise.resolve(copy));
    q.submit(at(), w.run);
    await flush();
    const src = await w.jobs[0]!.job.source();
    expect("bitmap" in src ? src.bitmap : null).toBe(copy);
  });

  it("S5 e : module formats absent (erreur du Worker) ou lanceur absent : echec, aucune étape", async () => {
    const w = world();
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    w.jobs[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect([lastReport(w), w.states.at(-1), w.writes.length]).toEqual([fillFailure("module des pixels indisponible"), "echec", 0]);
    const v = world();
    const { runner: _unused, ...noRunner } = v.deps;
    createFillQueue(noRunner).submit(at(), v.run);
    await flush();
    expect([lastReport(v), v.states.at(-1), v.writes.length]).toEqual([fillFailure(FILL_NO_RUNNER), "echec", 0]);
  });

  it("S5 f : refus du cœur après le calcul : bitmap fermé, rien adopté, état refus", async () => {
    const w = world();
    w.refuse(true);
    createFillQueue(w.deps).submit(at(), w.run);
    await flush();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect([b.close.mock.calls.length, w.images.adopt.mock.calls.length, w.states.at(-1)]).toEqual([1, 0, "refus"]);
  });

  it("HB13 : aucun pixel changé : aucune étape, rien au magasin, état pret ; la file continue", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    q.submit(shape, w.run);
    await flush();
    w.jobs[0]?.resolve({ changed: 0 });
    await flush();
    expect([w.put.mock.calls.length, w.states.at(-1)]).toEqual([0, "pret"]);
    expect(w.writes.map((c) => (c.type === "Fill" ? c.target.kind : ""))).toEqual(["inside"]);
  });

  it("RF4 : dispose (onglet fermé) pendant le calcul : rien n'est écrit, bitmap fermé ; submit ensuite sans effet", async () => {
    const w = world();
    const q = createFillQueue(w.deps);
    q.submit(at(), w.run);
    await flush();
    q.dispose();
    const b = bmp("1");
    w.jobs[0]?.resolve(filled(b));
    await flush();
    expect([w.writes.length, b.close.mock.calls.length, w.images.adopt.mock.calls.length]).toEqual([0, 1, 0]);
    q.submit(shape, w.run);
    expect(w.writes).toEqual([]);
  });

  it("pngName : extension remplacée par .png ; sans extension : ajoutée (HB10)", () => {
    expect([pngName("photo.jpg"), pngName("scan"), pngName("a.b.webp"), pngName("x.png")]).toEqual(["photo.png", "scan.png", "a.b.png", "x.png"]);
  });
});
```

`pnpm --filter @roomboard/web exec vitest run src/app/image-fill.test.ts 2>&1 | tail -20` → `FAIL` (module introuvable).

- [ ] **2. Code.** Créer `apps/web/src/app/image-fill.ts` :

```ts
/**
 * File du pot d'un onglet (C6b, DAB2, B13, B14, B20, B21). Reçoit toutes les actions de l'outil Pot dans l'ordre des
 * clics : file vide, une commande vectorielle s'écrit tout de suite (C6a) ; dès qu'un remplissage d'image est en route,
 * tout clic passe derrière lui. Un calcul à la fois, lancé après l'écriture du précédent (il lit l'asset écrit par lui).
 * Jeton de révision : `doc.version()` au premier clic mis en file, puis la version rendue par chaque écriture de la file ;
 * vérifié avant chaque calcul, à l'arrivée du résultat et avant chaque écriture : s'il diffère (Annuler, autre outil,
 * autre écrivain), le résultat est jeté, la file vidée, aucune étape. Ordre des effets : jeton → PNG au magasin →
 * `Fill` écrit → bitmap adopté par le cache si l'écriture réussit, fermé sinon (le PNG non cité n'est jamais enregistré).
 */
import type { Change, Command, CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { FillRequest, ImageFillRequest } from "../engine/fill-target";
import type { ImageCache } from "../engine/render/image-cache";
import { kindOfMime } from "../platform/image-import";
import { FILL_UNREADABLE_MESSAGE, type PixelFillJob, type PixelFillResult, type PixelFillRunner } from "../platform/pixel-runner";

export { FILL_UNREADABLE_MESSAGE };
/** `#stage[data-pot]` (B21) : "" rien fait, "attente" calcul en route, "pret", "refus", "abandon", "echec". */
export type PotState = "" | "attente" | "pret" | "refus" | "abandon" | "echec";
export const FILL_ABANDONED_MESSAGE = "remplissage abandonné : le document a changé";
export const FILL_MISSING_MESSAGE = "pot : image absente du document";
export const FILL_NOT_READY_MESSAGE = "pot : image pas encore prête";
export const FILL_NO_RUNNER = "calcul des pixels indisponible";
/** Message de `#etat` d'un échec du Worker ou du module (patron `pixelNotice`). */
export const fillFailure = (cause: string): string => `pot sur image impossible : ${cause}`;
/** Nom du nouvel asset (HB10) : celui de l'image, extension remplacée par `.png`. */
export const pngName = (name: string): string => `${name.replace(/\.[^./\\]*$/, "")}.png`;

export interface FillQueueDeps {
  readonly doc: Pick<CoreDocument, "element" | "asset" | "version">;
  readonly assets: Pick<AssetStore, "put" | "get">;
  readonly images: Pick<ImageCache, "copyOf" | "adopt">;
  /** Absent (aucun Worker de pixels) : chaque remplissage d'image échoue avec un message. */
  readonly runner?: PixelFillRunner;
  report(message: string): void;
  onState(s: PotState): void;
}

export interface FillQueue {
  submit(r: FillRequest, run: (c: Command) => Change | null): void;
  state(): PotState;
  dispose(): void;
}

type Run = (c: Command) => Change | null;
interface Item {
  readonly r: FillRequest;
  readonly run: Run;
}
const isImage = (r: FillRequest): r is ImageFillRequest => !("command" in r);
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export function createFillQueue(deps: FillQueueDeps): FillQueue {
  const items: Item[] = [];
  let busy = false;
  let token: number | null = null;
  let disposed = false;
  let current: PotState = "";

  const set = (s: PotState): void => {
    if (s === current) return;
    current = s;
    deps.onState(s);
  };
  const stale = (): boolean => token !== null && deps.doc.version() !== token;
  const closeResult = (res: PixelFillResult): void => {
    if ("png" in res) res.bitmap.close();
  };
  /** B13 : le document a changé ; le résultat en route est déjà fermé par l'appelant. */
  function abandon(): void {
    items.length = 0;
    token = null;
    busy = false;
    set("abandon");
    deps.report(FILL_ABANDONED_MESSAGE);
  }
  /** Fin d'un remplissage sans écriture (B20) : état, message ; la file continue. */
  function stop(s: "refus" | "echec", message: string): void {
    busy = false;
    set(s);
    deps.report(message);
    pump();
  }

  function pump(): void {
    while (!disposed && !busy && items.length > 0) {
      if (stale()) {
        abandon();
        return;
      }
      const it = items.shift();
      if (it === undefined) break;
      if (isImage(it.r)) {
        busy = true;
        void compute(it.r, it.run);
      } else {
        it.run(it.r.command);
        token = deps.doc.version();
      }
    }
    if (!busy && items.length === 0) token = null;
  }

  async function compute(r: ImageFillRequest, run: Run): Promise<void> {
    set("attente");
    const el = deps.doc.element(r.id);
    if (el === null || el.kind !== "image") return stop("refus", FILL_MISSING_MESSAGE);
    const i = el.image;
    const blob = deps.assets.get(i.asset);
    if (blob === undefined) return stop("refus", FILL_MISSING_MESSAGE);
    const runner = deps.runner;
    if (runner === undefined) return stop("echec", fillFailure(FILL_NO_RUNNER));
    const kind = kindOfMime(blob.type) ?? kindOfMime(deps.doc.asset(i.asset)?.mime ?? "") ?? "png";
    let source: PixelFillJob["source"];
    if (kind === "svg") {
      // Le Worker ne rastérise pas un SVG (pas de DOM) : copie du bitmap décodé par le cache (B7, HB12).
      const copy = deps.images.copyOf(i.asset);
      if (copy === null) return stop("refus", FILL_NOT_READY_MESSAGE);
      source = () => copy.then((bitmap) => ({ bitmap }));
    } else {
      source = async () => ({ blob, kind });
    }
    const job: PixelFillJob = {
      source,
      seed: r.seed,
      size: [i.w, i.h],
      tolerance: r.tolerance,
      color: r.color,
      ...(i.transparent !== undefined ? { transparent: i.transparent } : {}),
      ...(i.brightness ? { brightness: i.brightness } : {}),
      ...(i.contrast ? { contrast: i.contrast } : {}),
    };
    let res: PixelFillResult | null;
    try {
      res = await runner.fill(job);
    } catch (e) {
      if (disposed) return;
      if (stale()) return abandon();
      const m = messageOf(e);
      return m === FILL_UNREADABLE_MESSAGE ? stop("refus", m) : stop("echec", fillFailure(m));
    }
    if (res === null || disposed) {
      if (res !== null) closeResult(res);
      return;
    }
    if (stale()) {
      closeResult(res);
      return abandon();
    }
    if (!("png" in res)) {
      busy = false;
      set("pret");
      return pump();
    }
    const { png, bitmap } = res;
    let id: string;
    try {
      id = await deps.assets.put(png);
    } catch (e) {
      bitmap.close();
      return stop("echec", fillFailure(messageOf(e)));
    }
    if (disposed) {
      bitmap.close();
      return;
    }
    if (stale()) {
      bitmap.close();
      return abandon();
    }
    const name = pngName(deps.doc.asset(i.asset)?.name ?? "image");
    const change = run({ type: "Fill", page: r.page, target: { kind: "image", id: r.id, asset: { id, name, mime: "image/png", size: png.size } }, color: r.color });
    busy = false;
    if (change === null || change.ids.length === 0) {
      // Refus du cœur (message déjà dans l'état par le moteur) ou même asset : rien adopté (B14, S5 f).
      bitmap.close();
      set(change === null ? "refus" : "pret");
      token = deps.doc.version();
      return pump();
    }
    deps.images.adopt(id, bitmap);
    token = change.version;
    set("pret");
    pump();
  }

  return {
    submit(r, run) {
      if (disposed) return;
      if (!isImage(r) && !busy && items.length === 0) {
        run(r.command);
        return;
      }
      if (token === null) token = deps.doc.version();
      items.push({ r, run });
      pump();
    },
    state: () => current,
    dispose() {
      disposed = true;
      items.length = 0;
    },
  };
}
```

- [ ] **3. Vert.** `pnpm --filter @roomboard/web exec vitest run src/app/image-fill.test.ts 2>&1 | tail -20` → `Tests  13 passed`, aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

- [ ] **4. Commit.** `git add apps/web/src/app/image-fill.ts`, `git add apps/web/src/app/image-fill.test.ts`, message `feat(web): paint bucket queue for images, ordered by clicks and guarded by the document version`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1 et 3 ; lignes `Réutilisation : …`.

<a id="tache-t8"></a>
### Tâche T8 — Rangée du pot : curseur de tolérance

**Objectif.** Pot actif, la rangée montre après « Aucune » un curseur 0-100 (pas de 1, `data-fill-tolerance`), précédé du libellé « Tolérance » et suivi de sa valeur ; la valeur vient de la vue (`fillTolerance`, défaut 5) ; le déplacer appelle `host.fillTolerance(v)`, relayé à `engine.setFillTolerance(v)`. Le libellé se cache quand la place manque (le `title` reste). Scénario S1 (réglage de la tolérance).

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T8` (après la fusion de T3). Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cp -r /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image/apps/web/src/wasm-formats apps/web/src/`.

**Fichiers.** Modifier : `apps/web/src/ui/Toolbar.tsx:84-118` (`PresetRow`) ; `apps/web/src/ui/Toolbar.test.tsx:25` (hôte factice), bloc `Toolbar — rangée du pot (C6a)` (`:285`) ; `apps/web/src/ui/item-state.ts:6-27` (`ToolbarView`) ; `apps/web/src/ui/rb.css:52-53` ; `apps/web/src/app/toolbar-host.ts:9-25`, `:27`, `:89` ; `apps/web/src/app/toolbar-host.test.ts:7-11`, après `:195`.

**Interfaces.**
- Consomme : T3 — `Engine.setFillTolerance(t: number): void`, `EngineState.fillTolerance?: number`, `DEFAULT_FILL_TOLERANCE = 5` (`engine/engine.ts`).
- Produit : `ToolbarHost.fillTolerance(t: number): void` ; `ToolbarView.fillTolerance?: number` ; `HostTargets.engine()` inclut `"setFillTolerance"` ; DOM : `label.rb-fill-tolerance[title="Tolérance <v>"]` > `span.rb-fill-tolerance-label` « Tolérance », `input[type=range][data-fill-tolerance][min=0][max=100][step=1]`, `span[data-fill-tolerance-value]` (lus par T10).
- Réutilise : `apps/web/src/ui/Toolbar.tsx:86` — `PresetRow` (branche `isFill()`, après « Aucune ») étendu du curseur ; `apps/web/src/app/toolbar-host.ts:18` — patron `fillColor` pour `fillTolerance`.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/app/toolbar-host.test.ts 2>&1 | tail -20`) · GC4 aucun paquet · GC6 : les tests C6a de la rangée (`pot actif sans presets.fill … « Aucune » en dernier`) gardent leur sens : « Aucune » reste le dernier **bouton** de la rangée (le curseur n'est pas un bouton) ; l'hôte factice de `Toolbar.test.tsx:25` gagne `fillTolerance: vi.fn()` (type élargi, pas d'assertion changée) · GC7 scène ≥ 640 px (mesurée par T10) · GC8 · GC9 commits · GC10 `PATH` · GC12 libellé français « Tolérance ».

**Interdits.** Enregistrer la tolérance (HB9) ; toucher `engine/`, `board-session.ts`, `stage-tags.ts`.

**Terminé quand.** Les deux fichiers de test passent avec les tests `C6b …` ; `pnpm --filter @roomboard/web exec vitest run src/ui src/app/toolbar-host.test.ts 2>&1 | tail -8` sans `FAIL` ; `tsc --noEmit` sans erreur ; commit fait.

#### Étapes

- [ ] **1. Tests rouges.** `Toolbar.test.tsx:25` : ajouter `fillTolerance: vi.fn()` à l'objet `host`. Dans le bloc `Toolbar — rangée du pot (C6a)` :

```tsx
  it("C6b : curseur de tolérance après « Aucune », valeur de la vue (défaut 5), libellé « Tolérance » ; seulement avec le Pot (B10, B22)", () => {
    const { container, setV } = potSetup();
    const input = container.querySelector<HTMLInputElement>("input[data-fill-tolerance]")!;
    expect([input.type, input.min, input.max, input.step, input.value]).toEqual(["range", "0", "100", "1", "5"]);
    const none = container.querySelector("button[data-fill-none]")!;
    expect(none.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const label = container.querySelector(".rb-fill-tolerance")!;
    expect(label.querySelector(".rb-fill-tolerance-label")?.textContent).toBe("Tolérance");
    expect(label.getAttribute("title")).toBe("Tolérance 5");
    expect(container.querySelector("[data-fill-tolerance-value]")?.textContent).toBe("5");
    setV({ ...VIEW, tool: "fill", fillTolerance: 30 });
    expect([input.value, label.getAttribute("title")]).toEqual(["30", "Tolérance 30"]);
    setV({ ...VIEW, tool: "pen" });
    expect(container.querySelector("input[data-fill-tolerance]")).toBeNull();
  });
  it("C6b : déplacer le curseur appelle host.fillTolerance(valeur), sans setTool", () => {
    const { container, host } = potSetup();
    const input = container.querySelector<HTMLInputElement>("input[data-fill-tolerance]")!;
    input.value = "12";
    fireEvent.input(input);
    expect(host.fillTolerance).toHaveBeenCalledWith(12);
    expect(host.setTool).not.toHaveBeenCalled();
  });
```

`toolbar-host.test.ts:7-11` : ajouter `setFillTolerance: vi.fn()` à l'objet `engine` ; après le test `fillColor(null) …` :

```ts
  it("C6b fillTolerance(t) → setFillTolerance(t), sans changer d'outil (B10)", () => {
    const { host, engine } = setup();
    host.fillTolerance(12);
    expect(engine.setFillTolerance).toHaveBeenCalledWith(12);
    expect(engine.setTool).not.toHaveBeenCalled();
  });
```

`pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/app/toolbar-host.test.ts 2>&1 | tail -20` → `FAIL`.

- [ ] **2. Vue et hôte.** `item-state.ts`, dans `ToolbarView` :

```ts
  /** C6b (B10) : tolérance du pot sur une image, 0 à 100 ; absente : 5 (défaut du moteur). */
  readonly fillTolerance?: number;
```

`toolbar-host.ts` : dans `ToolbarHost`, après `fillColor` : `/** Curseur de tolérance de la rangée du pot (C6b, B10) : relayé au moteur ; ne change pas l'outil. */ fillTolerance(t: number): void;` ; ajouter `| "setFillTolerance"` au `Pick<Engine, …>` de `HostTargets.engine()` ; dans `createLocalToolbarHost`, après `fillColor: …` : `fillTolerance: (v) => t.engine().setFillTolerance(v),`.

- [ ] **3. Curseur** (`Toolbar.tsx`). Import : `import { DEFAULT_FILL_TOLERANCE } from "../engine/engine";`. Après les imports : `/** Libellé du curseur du pot (C6b, B10). */ const FILL_TOLERANCE_LABEL = "Tolérance";`. Doc de `PresetRow` : ajouter « C6b (B10) : puis le curseur de tolérance (`data-fill-tolerance`). ». Dans `PresetRow`, après `const isFill = …` : `const tolerance = createMemo(() => props.view().fillTolerance ?? DEFAULT_FILL_TOLERANCE);`. Dans `<Show when={isFill()}>`, après le bouton « Aucune » (dans le même `Show`, envelopper les deux dans `<>…</>`) :

```tsx
        <label class="rb-fill-tolerance" title={`${FILL_TOLERANCE_LABEL} ${tolerance()}`}>
          <span class="rb-fill-tolerance-label">{FILL_TOLERANCE_LABEL}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            data-fill-tolerance
            aria-label={FILL_TOLERANCE_LABEL}
            value={tolerance()}
            onInput={(e) => props.host.fillTolerance(Number(e.currentTarget.value))}
          />
          <span data-fill-tolerance-value>{tolerance()}</span>
        </label>
```

- [ ] **4. Style** (`rb.css`, après `.rb-swatch`) :

```css
/* Curseur de tolérance du pot (C6b, B10, B22) : resserré ; le libellé se cache sur une fenêtre étroite (title gardé). */
.rb-fill-tolerance { display: inline-flex; align-items: center; gap: calc(var(--rb-gap) / 2); white-space: nowrap; }
.rb-fill-tolerance input[type="range"] { inline-size: 6em; min-height: var(--rb-btn-s); }
.rb-fill-tolerance [data-fill-tolerance-value] { min-inline-size: 2ch; text-align: end; font-variant-numeric: tabular-nums; }
@media (max-width: 1100px) { .rb-fill-tolerance-label { display: none; } }
```

Si `--rb-btn-s` n'existe pas dans `rb.css` (`grep -n "\-\-rb-btn-s" apps/web/src/ui/rb.css`), prendre `var(--rb-btn-m)` comme `.rb-media-bar-inner input[type="range"]` (`rb.css:101`).

- [ ] **5. Vert.** `pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/app/toolbar-host.test.ts 2>&1 | tail -20` → `Test Files  2 passed`, tests `C6b …` présents ; `pnpm --filter @roomboard/web exec vitest run src/ui src/app/toolbar-host.test.ts 2>&1 | tail -8` → aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

- [ ] **6. Commit** (fichiers un par un) : `feat(ui): tolerance slider in the paint bucket row`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1 et 5 ; lignes `Réutilisation : …`.

<a id="tache-t9"></a>
### Tâche T9 — Câblage de la session, `data-pot`

**Objectif.** Chaque session (onglet) crée sa file du pot (magasin, cache, lanceur de pixels, document, `report` vers `#etat`) et la passe à l'outil Pot avec la tolérance du moteur ; `#stage[data-pot]` publie l'état de la file ; la file est fermée avec la session. Scénarios S5 c et S5 e de bout en bout dans la session ; effet de bord C5 I31 (un remplissage écrit jette le brouillon d'un panneau Image ouvert) vérifié.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T9` (après la fusion de T6 et T7). Préparation (module principal reconstruit, `wasm-core.ts` appelle `fill_image`) : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm`.

**Fichiers.** Modifier : `apps/web/src/app/board-session.ts:39`, `:47`, `:160-172`, `:268`, `:442-453` ; `apps/web/src/app/board-session.test.ts` (nouveau bloc) ; `apps/web/src/app/stage-tags.ts:20-43` ; `apps/web/src/app/stage-tags.test.ts:38-39` et un test ; `apps/web/src/engine/engine.test.ts` (un test dans le bloc C5).

**Interfaces.**
- Consomme : T7 — `createFillQueue(deps: FillQueueDeps): FillQueue`, `FillQueue.state()`, `FILL_ABANDONED_MESSAGE`, `fillFailure`, `FILL_NO_RUNNER` ; T3 — `createFillTool(ctx, color, measure, queue?: FillToolQueue)`, `ToolFactories.fill?(ctx, color, tolerance)` ; T5 — `ImageCache` (`adopt`, `copyOf`) ; T4 — `createPixelRunner(…): PixelRunner & PixelFillRunner` ; T6 — `Fill` image et `restore` sur les deux cœurs.
- Produit : `StageExtras.pot?: string` ; `stageTags(…)` rend aussi la clé `pot` ; `#stage[data-pot]` = `FillQueue.state()` (lu par T10).
- Réutilise : `apps/web/src/app/stage-tags.ts:21` — `stageTags(s, extra)` étendu de `pot`.
- Réutilise : `apps/web/src/app/board-session.ts:165-172` — `runner`, `images`, `report`, `remark` existants passés à la file (aucun second lanceur, aucun second cache).
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Contraintes (recopiées).** GC1 TDD · GC2 preuve bornée (`pnpm --filter @roomboard/web exec vitest run src/app/board-session.test.ts src/app/stage-tags.test.ts src/engine/engine.test.ts 2>&1 | tail -20`) · GC5 bitmaps et Blob fabriqués · GC6 : les deux `toEqual` de `stage-tags.test.ts:38-39` gagnent la clé `pot: ""` (objet rendu élargi par le cadrage B21, aucune valeur existante changée) · GC8 · GC9 commits · GC10 `PATH` · GC11 · GC12.

**Interdits.** Créer un second lanceur de pixels ou un second cache ; toucher `main.ts`, `image-fill.ts`, `engine.ts`.

**Terminé quand.** Les trois fichiers passent avec les tests nommés ; `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -15` sans `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` sans erreur ; commit fait.

#### Étapes

- [ ] **1. Tests rouges.** `stage-tags.test.ts:38-39` : ajouter `pot: ""` aux deux objets attendus. Ajouter :

```ts
describe("stageTags (C6b, B21)", () => {
  it("pot : état de la file du pot ; absent : vide", () => {
    expect(stageTags(base).pot).toBe("");
    expect(stageTags(base, { pot: "attente" }).pot).toBe("attente");
  });
});
```

`board-session.test.ts` : importer `FILL_ABANDONED_MESSAGE, FILL_NO_RUNNER, fillFailure` depuis `./image-fill` ; ajouter le bloc :

```ts
describe("session — pot sur image (C6b, B13, B21)", () => {
  const ORIGINAL = "cd".repeat(32);
  const NEW = "ef".repeat(32);
  /** Image 10 × 10 en (0, 0) ; magasin à empreinte fixe ; Worker factice qui garde les messages. */
  async function setup(withPixels = true) {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 10, height: 10, close: vi.fn() })));
    const doc = fakeCore.blank();
    const page = doc.pageIds()[0]!;
    const el = doc.apply({ type: "AddImage", page, asset: { id: ORIGINAL, name: "a.png", mime: "image/png", size: 3 }, w: 10, h: 10, matrix: [1, 0, 0, 1, 0, 0] }).ids[0]!;
    const assets = createAssetStore(async () => NEW);
    assets.adopt(ORIGINAL, new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const decode = vi.fn(async (_b: Blob) => ({ width: 10, height: 10, close: vi.fn() }) as unknown as ImageBitmap);
    const posted: { id: number; type?: string }[] = [];
    const workers: WorkerLike[] = [];
    const spawn = (): WorkerLike => {
      const w: WorkerLike = { onmessage: null, onerror: null, postMessage: (m) => void posted.push(m as { id: number; type?: string }), terminate: vi.fn() };
      workers.push(w);
      return w;
    };
    const { pixels: _none, ...base } = { ...shared, decode };
    const s = await createBoardSession(doc, withPixels ? { ...base, pixels: spawn } : base, assets);
    s.activate();
    const click = (x: number, y: number): void => {
      const c = s.engine.camera();
      const sample = { x: x * c.zoom + c.tx, y: y * c.zoom + c.ty, pressure: 0.5, tiltX: 0, tiltY: 0, t: 0 };
      s.engine.sink.begin(9, "fill", [sample]);
      s.engine.sink.close(9, "end");
    };
    s.engine.setFillColor("#facc15");
    s.engine.setTool("fill");
    const reply = (data: Record<string, unknown>): void => {
      const m = posted.find((x) => x.type === "fill");
      workers[0]?.onmessage?.({ data: { id: m?.id, ...data } });
    };
    return { s, doc, page, el, posted, click, reply };
  }

  it("pot sur une image : data-pot attente puis pret ; nouvel asset et sourceAsset écrits, fond de la page inchangé", async () => {
    const { s, doc, page, el, posted, click, reply } = await setup();
    try {
      const bg = doc.page(page)?.background;
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      expect(s.stage.dataset["pot"]).toBe("attente");
      const out = { width: 10, height: 10, close: vi.fn() };
      reply({ changed: 4, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: out });
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("pret"), { timeout: 5000 });
      const e = doc.element(el);
      expect(e?.kind === "image" ? [e.image.asset, e.image.sourceAsset] : null).toEqual([NEW, ORIGINAL]);
      expect(doc.page(page)?.background).toBe(bg);
      expect(out.close).not.toHaveBeenCalled();
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("S5 c (session) : trait, pot sur l'image, Ctrl+Z pendant le calcul : trait annulé, rien d'écrit, data-pot=abandon, bitmap fermé ; Ctrl+Y rend le trait", async () => {
    const { s, doc, page, el, posted, click, reply } = await setup();
    try {
      s.engine.run({ type: "CommitStroke", page, points: new Float32Array([50, 50, 0.5, 80, 50, 0.5]), style: { color: "#000000", width: 4 } });
      expect(doc.elementIds(page)).toHaveLength(2);
      click(5, 5);
      await vi.waitFor(() => expect(posted.some((m) => m.type === "fill")).toBe(true), { timeout: 5000 });
      s.engine.undo();
      const out = { width: 10, height: 10, close: vi.fn() };
      reply({ changed: 4, png: new Blob([new Uint8Array([9])], { type: "image/png" }), bitmap: out });
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("abandon"), { timeout: 5000 });
      expect(out.close).toHaveBeenCalledTimes(1);
      expect(doc.elementIds(page)).toEqual([el]);
      const e = doc.element(el);
      expect(e?.kind === "image" ? e.image.asset : null).toBe(ORIGINAL);
      expect(s.engine.state().error).toBe(FILL_ABANDONED_MESSAGE);
      s.engine.redo();
      expect(doc.elementIds(page)).toHaveLength(2);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("S5 e (session) : aucun Worker de pixels : data-pot=echec, message dans l'état, aucune étape", async () => {
    const { s, doc, click } = await setup(false);
    try {
      const v = doc.version();
      click(5, 5);
      await vi.waitFor(() => expect(s.stage.dataset["pot"]).toBe("echec"), { timeout: 5000 });
      expect(s.engine.state().error).toBe(fillFailure(FILL_NO_RUNNER));
      expect(doc.version()).toBe(v);
      s.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
```

`engine.test.ts`, bloc C5 (il a `c5()`, `renderer.imagePreviews`) :

```ts
  it("C6b I31 : un remplissage d'image écrit pendant un brouillon du panneau : brouillon jeté, aperçu retiré", () => {
    const { engine, renderer, id, page } = c5();
    const edit = engine.editImage(id)!;
    edit.preview({ brightness: 50 });
    expect(renderer.imagePreviews.at(-1)).not.toBeNull();
    engine.run({ type: "Fill", page, target: { kind: "image", id, asset: { id: "cd".repeat(32), name: "a.png", mime: "image/png", size: 9 } }, color: "#facc15" });
    expect(renderer.imagePreviews.at(-1)).toBeNull();
  });
```

`pnpm --filter @roomboard/web exec vitest run src/app/board-session.test.ts src/app/stage-tags.test.ts src/engine/engine.test.ts 2>&1 | tail -20` → `FAIL` (`data-pot` absent, clé `pot` absente). Le test `C6b I31` peut passer d'emblée (comportement de C5 rejoué) : le noter au rapport.

- [ ] **2. `stage-tags.ts`.** Dans `StageExtras` : `/** C6b (B21) : état de la file du pot (`PotState`). */ readonly pot?: string;`. Type de retour : ajouter `| "pot"` à l'union des clés ; dans l'objet rendu : `pot: extra.pot ?? "",`. Doc : ajouter « C6b (`pot`) ».

- [ ] **3. `board-session.ts`.** Import : `import { createFillQueue } from "./image-fill";`. Après la création de `images` et son `undo.push(() => images.dispose());` :

```ts
  // C6b (DAB2, B13) : une file du pot par onglet ; mêmes magasin, cache et lanceur que les retouches ; état dans data-pot.
  const fillQueue = createFillQueue({
    doc,
    assets,
    images,
    ...(runner === undefined ? {} : { runner }),
    report: (m) => report(m),
    onState: () => remark(),
  });
  undo.push(() => fillQueue.dispose());
```

Outil Pot (`:268`) : `fill: (ctx, color, tolerance) => createFillTool(ctx, color, measure, { tolerance, submit: (r, run) => fillQueue.submit(r, run) }),`. Marquage (`:442`) : `const tags = stageTags(s, { pixels: images.pixelState(), image: imageSize(s.selectionImage), pot: fillQueue.state() });` et, après `stage.dataset["image"] = tags.image;` : `stage.dataset["pot"] = tags.pot;`.

- [ ] **4. Vert.** `pnpm --filter @roomboard/web exec vitest run src/app/board-session.test.ts src/app/stage-tags.test.ts src/engine/engine.test.ts 2>&1 | tail -20` → `Test Files  3 passed`, tests `S5 c (session)`, `S5 e (session)`, `C6b I31` présents ; `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test 2>&1 | tail -15` → aucun `FAIL` ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

- [ ] **5. Commit** (fichiers un par un) : `feat(web): wire the paint bucket queue into each tab session and publish data-pot`, ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 1 et 4 ; lignes `Réutilisation : …`.

<a id="tache-t10"></a>
### Tâche T10 — Essais navigateur, capture, `verifier.sh --e2e`

**Objectif.** L'essai Playwright S1 joue le geste complet (déposer une image fabriquée, la rogner, remplir une zone au pot, en effacer une autre, régler la tolérance, annuler puis refaire, enregistrer, vérifier `sourceAsset` et le nouvel asset dans le fichier, rouvrir, « Rétablir l'original », scène ≥ 640 px) ; il entre dans le bloc `--e2e` de `verifier.sh` et dans sa liste de contrôle ; `zipEntries` et `sha256` passent dans `commun.mjs` ; l'essai C6a est réécrit là où il reposait sur « clic sur l'image → fond » ; capture `docs/essais/c6b-pot-image.png` d'une image remplie avec une zone effacée. Scénario S1.

**Dossier.** `~/projets/roomboard-wt/usage-c6b-pot-image--T10` (après la fusion de T1 à T9). Préparation : `cd <dossier> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile`. Le build complet (`scripts/verifier.sh`, étape 6) reconstruit les deux modules et `apps/web/dist`.

**Fichiers.**
- Créer : `scripts/essais/c6b-pot-image-navigateur.mjs`, `docs/essais/c6b-pot-image.png` (par `--captures`)
- Modifier : `scripts/essais/commun.mjs:3-10` (imports), après `:207` ; `scripts/essais/c2-image-navigateur.mjs:1-8`, `:24-49` ; `scripts/essais/c14-media-navigateur.mjs:1-8`, `:25`, `:103-125` ; `scripts/essais/c6a-pot-navigateur.mjs:284-296` ; `scripts/verifier.sh:106-107` ; `scripts/tests/verifier-e2e.test.sh:13` ; `apps/web/src/ui/rb.css` (seulement si la scène mesure moins de 640 px, étape 7)

**Interfaces.**
- Consomme : T9 — `#stage[data-pot]` (`""`, `attente`, `pret`, `refus`, `abandon`, `echec`) ; T8 — `input[data-fill-tolerance]`, `button[data-fill-none]` ; C5 — `[data-image-action="crop" | "crop-apply" | "restore" | "close"]`, `button[data-selection-action="image"]`, `#image-retouche`, `#stage[data-image]`, `#stage[data-bounds]` ; C6a — `button[data-preset="bleu" | "jaune" | "vert"]`, `item("fill")`.
- Produit : `commun.mjs` exporte `zipEntries(buf: Buffer): Map<string, Buffer>` et `sha256(b: Buffer): string`.
- Réutilise : `scripts/essais/c2-image-navigateur.mjs:25`, `c14-media-navigateur.mjs:104` — `zipEntries` et `sha256`, deux copies identiques déplacées dans `commun.mjs` (`export function zipEntries(buf)`, `export const sha256 = (b) => …`), importées par les deux essais.
- Réutilise : `scripts/essais/commun.mjs:73`, `:102`, `:144`, `:186` — `inkIn(page, box, { rgb, tol })`, `stageBox(page)`, `dropFile(page, selector, name, bytes, type, at)`, `rgbPng(w, h, at)` appelés tels quels ; helpers de l'essai C5 (`c5-image-navigateur.mjs:44-131` : `check`, `waitAttr`, `until`, `box`, `near`, `act`, `openPanel`, `saveTo`, `openFile`) recopiés dans le nouvel essai comme chaque essai le fait.
- Rapport : une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise`.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : l'essai lit `data-pot` (`attente` puis `pret`), `data-image` (`160x120`, `200x150`), `input[data-fill-tolerance]` (`5`, puis `10`), les entrées du fichier enregistré et la hauteur de la scène ; puis la capture `docs/essais/c6b-pot-image.png` (`node scripts/essais/c6b-pot-image-navigateur.mjs --captures`), lue avec l'outil `Read` et décrite au rapport : anneau rouge à intérieur jaune, fond de l'image remplacé par le bleu de la page, bande grise effacée, rangée du pot avec le curseur « Tolérance 10 ».

**Contraintes (recopiées).** GC1 : l'essai est écrit avant de le lancer et vu échouer s'il manque un comportement · GC2 preuve bornée (`node scripts/essais/c6b-pot-image-navigateur.mjs 2>&1 | tail -30` → `C6b pot sur image : OK`) · GC3 tailles affichées par `verifier.sh` (`module Wasm : N octets` ≤ 1 572 864, `module formats : N octets` ≤ 3 145 728) citées au rapport · GC4 · GC5 PNG fabriqué dans l'essai (`rgbPng`) · GC6 : dans `c6a-pot-navigateur.mjs`, seule l'étape S4 qui affirmait « clic sur l'image : le fond de la page change » change (contrat remplacé par B19, B24) ; les autres essais ne changent que par l'import de `zipEntries`/`sha256` · GC7 scène ≥ 640 px, mesurée · GC8 aucun build Tauri · GC9 commits · GC10 `PATH` · GC12. `verifier.sh --e2e` ne passe aucune option de capture.

**Interdits.** Réécrire une capture commitée d'un autre essai ; lancer un essai hors du bloc `--e2e` ; toucher `apps/web/src` hors `rb.css`.

**Terminé quand.** `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `verifier-e2e.test.sh : OK` ; `scripts/verifier.sh --e2e 2>&1 | tail -30` → `C6b pot sur image : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; capture présente et décrite ; commits faits.

#### Étapes

- [ ] **1. `commun.mjs`.** Imports : ajouter `import { createHash } from "node:crypto";` et remplacer `import { deflateSync } from "node:zlib";` par `import { deflateSync, inflateRawSync } from "node:zlib";`. Après `solidPng` :

```js
/** Entrées d'un ZIP (.roomboard) par son répertoire central : nom → octets (stored ou deflate). Repris de
 *  `c2-image-navigateur.mjs` et `c14-media-navigateur.mjs`, qui en avaient deux copies (C6b, B24). */
export function zipEntries(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Echec("fichier enregistré : ZIP sans répertoire central");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Echec("fichier enregistré : répertoire central illisible");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    out.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

/** Empreinte SHA-256 en hexadécimal minuscule (nom d'entrée `assets/<sha>.<ext>`). */
export const sha256 = (b) => createHash("sha256").update(b).digest("hex");
```

Dans `c2-image-navigateur.mjs` et `c14-media-navigateur.mjs` : supprimer la fonction locale `zipEntries` et la constante locale `sha256`, ajouter `sha256, zipEntries` à l'import de `./commun.mjs`, retirer les imports `createHash` et `inflateRawSync` devenus inutiles (`grep -n "createHash\|inflateRawSync" <fichier>` ne doit plus rien rendre). Vérifier : `node --check scripts/essais/commun.mjs scripts/essais/c2-image-navigateur.mjs scripts/essais/c14-media-navigateur.mjs` sans sortie.

- [ ] **2. Liste de contrôle d'abord (rouge).** `scripts/tests/verifier-e2e.test.sh:13` : ajouter `c6b-pot-image-navigateur` à la fin de la liste `for s in … c14-media-navigateur; do`. `bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `ECHEC : c6b-pot-image-navigateur absent de verifier.sh`.

- [ ] **3. `verifier.sh`.** Dans le bloc `if [ "$E2E" = 1 ]; then`, après `node scripts/essais/c14-media-navigateur.mjs` et `echo "C14 média : OK"` :

```bash
  node scripts/essais/c6b-pot-image-navigateur.mjs
```

`bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3` → `verifier-e2e.test.sh : OK`.

- [ ] **4. Essai C6b.** Créer `scripts/essais/c6b-pot-image-navigateur.mjs` :

```js
#!/usr/bin/env node
// Essai C6b « pot de peinture sur image » au navigateur (S1 du cadrage usage-c6b-pot-image). Application construite
// (apps/web/dist) servie avec la CSP de la coque, Chromium headless de Playwright, mode repli (`?fichiers=repli`), heure
// figée. PNG fabriqué ici (fond blanc, bande gris très clair en haut, anneau rouge fermé à intérieur blanc), jamais
// téléchargé. Oracles : couleurs lues dans `#scene` (`inkIn` avec `rgb`), attributs de `#stage` (`data-pot`,
// `data-image`, `data-bounds`), entrées du fichier enregistré ; aucune requête hors de 127.0.0.1. Lancé par
// scripts/verifier.sh --e2e, sans option de capture. Code de sortie : 0 réussi, 1 échec, 2 outil absent.
// Usage : node scripts/essais/c6b-pot-image-navigateur.mjs [--captures]
// (--captures : docs/essais/c6b-pot-image.png : image remplie avec une zone effacée).
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, coqueCsp, dropFile, frames, gitSha, inkIn, item, loadPlaywright, rgbPng, serve, sha256, stageBox, stageMouse, zipEntries } from "./commun.mjs";

const LABEL = "C6b pot sur image";
const FIXED = new Date("2026-11-21T08:00:00.000Z");
const W = 200;
const H = 150;
const RED = [220, 38, 38];
const WHITE = [255, 255, 255];
const GREY = [240, 240, 240];
const BLUE = [29, 78, 216];
const YELLOW = [250, 204, 21];
/** Points de la scène (px de la scène, caméra du premier onglet). */
const VOID = [1100, 560];
const DROP = [400, 360];
/** Points de la boîte affichée après le rognage (160 × 120 pixels source, sans retournement) : fond, bande, intérieur. */
const FOND = [12, 60];
const BAND = [80, 5];
const INSIDE = [100, 75];

/** 200 × 150 : fond blanc ; bande #f0f0f0 sur les 12 premières lignes, collée au fond ; anneau rouge fermé (rayons 30 à
 *  45 autour de (100, 75)), intérieur blanc. Tolérance 5 : la bande reste ; tolérance 10 : elle part avec le fond. */
const potPng = () =>
  rgbPng(W, H, (x, y) => {
    const d = Math.hypot(x + 0.5 - 100, y + 0.5 - 75);
    if (d >= 30 && d <= 45) return RED;
    return y < 12 ? GREY : WHITE;
  });

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
  const press = async (k) => {
    await page.keyboard.press(k);
    await fr();
  };
  const waitAttr = (name, v) =>
    page
      .waitForFunction(([n, w]) => document.querySelector("#stage")?.getAttribute(n) === w, [name, v], { timeout: 15000 })
      .catch(async () => {
        throw new Echec(`${name} attendu « ${v} », lu « ${await attr(name)} »`);
      });
  /** Attend qu'une sonde devienne vraie (15 s au plus, une image d'animation entre deux lectures). */
  const until = async (probe, msg, ms = 15000) => {
    const end = Date.now() + ms;
    for (;;) {
      if (await probe()) {
        console.log(`ok — ${msg}`);
        return;
      }
      if (Date.now() > end) throw new Echec(msg);
      await fr();
    }
  };
  const camera = async () => {
    const [zoom, tx, ty] = ((await attr("data-camera")) ?? "").split(",").map(Number);
    return { zoom, tx, ty };
  };
  const screen = async ([wx, wy]) => {
    const c = await camera();
    return [wx * c.zoom + c.tx, wy * c.zoom + c.ty];
  };
  /** Boîte de l'image sélectionnée seule : bornes monde, taille affichée en pixels source, échelle monde par pixel. */
  const box = async () => {
    const [x0, y0, x1, y1] = ((await attr("data-bounds")) ?? "").split(",").map(Number);
    const [bw, bh] = ((await attr("data-image")) ?? "").split("x").map(Number);
    return { x0, y0, x1, y1, bw, bh, s: (x1 - x0) / bw };
  };
  const near = async (w, rgb, tol = 30, r = 3) => {
    const [x, y] = await screen(w);
    return inkIn(page, [x - r, y - r, x + r, y + r], { rgb, tol });
  };
  const nearDisplay = async (d, rgb, tol = 30) => {
    const b = await box();
    return near([b.x0 + d[0] * b.s, b.y0 + d[1] * b.s], rgb, tol);
  };
  const clickWorld = async (w) => {
    const [x, y] = await screen(w);
    await mouse.click(x, y);
    await fr();
  };
  const act = async (id) => {
    await page.click(`[data-image-action="${id}"]`);
    await fr();
  };
  const openPanel = async () => {
    await page.click('button[data-selection-action="image"]');
    await page.waitForSelector("#image-retouche", { timeout: 5000 });
    await fr();
  };
  const pot = async (preset) => {
    await page.click(item("fill"));
    if (preset !== undefined) await page.click(`button[data-preset="${preset}"]`);
    await fr();
  };
  const setTolerance = async (v) => {
    await page.$eval("input[data-fill-tolerance]", (el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
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

  await page.goto(url);
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 30000 });
  await fr();
  const c0 = await camera();
  const world = ([x, y]) => [(x - c0.tx) / c0.zoom, (y - c0.ty) / c0.zoom];
  const voidW = world(VOID);

  // S1 : Pot, Bleu, clic sur la page vide : fond bleu.
  await pot("bleu");
  await clickWorld(voidW);
  check((await near(voidW, BLUE, 40, 8)) > 150, "S1 : Pot Bleu, clic sur la page vide : fond bleu (#1d4ed8)");

  // S1 : dépôt, sélection, rognage de 40 × 30 pixels source par la poignée sud-est.
  const png = potPng();
  await dropFile(page, "#stage", "anneau.png", png, "image/png", DROP);
  await waitAttr("data-elements", "1");
  await page.click(item("select"));
  await fr();
  await mouse.click(DROP[0], DROP[1]);
  await waitAttr("data-image", "200x150");
  await openPanel();
  const b0 = await box();
  await act("crop");
  const se = await screen([b0.x1, b0.y1]);
  const to = await screen([b0.x1 - 40 * b0.s, b0.y1 - 30 * b0.s]);
  await mouse.move(se[0], se[1]);
  await mouse.down();
  await mouse.move(to[0], to[1], { steps: 8 });
  await mouse.up();
  await fr();
  await act("crop-apply");
  await waitAttr("data-image", "160x120");
  console.log("ok — S1 : « Valider le rognage » : data-image 160x120");
  const b1 = await box();
  const shown = (d) => [b1.x0 + d[0] * b1.s, b1.y0 + d[1] * b1.s];
  const fondW = shown(FOND);
  const bandW = shown(BAND);
  const insideW = shown(INSIDE);
  await act("close");

  // S1 : Pot, Jaune, clic dans l'intérieur de l'anneau : data-pot passe par attente puis pret.
  await page.evaluate(() => {
    const stage = document.querySelector("#stage");
    const seen = [];
    window.__pots = seen;
    new MutationObserver((ms) => {
      for (const m of ms) seen.push(m.oldValue ?? "");
    }).observe(stage, { attributes: true, attributeFilter: ["data-pot"], attributeOldValue: true });
  });
  await pot("jaune");
  await clickWorld(insideW);
  await waitAttr("data-pot", "pret");
  const pots = await page.evaluate(() => window.__pots);
  check(pots.includes("attente"), `S1 : data-pot passe par « attente » puis « pret » (${[...new Set(pots)].join(" → ")} → pret)`);
  await until(async () => (await near(insideW, YELLOW)) > 20 && (await near(fondW, WHITE, 6)) > 20, "S1 : l'intérieur de l'anneau devient jaune, le fond de l'image reste blanc");

  // S1 : « Aucune », tolérance 5, clic sur le fond : le bleu de la page apparaît, la bande grise reste.
  await page.click("button[data-fill-none]");
  await fr();
  check((await page.inputValue("input[data-fill-tolerance]")) === "5", "S1 : tolérance par défaut 5");
  await clickWorld(fondW);
  await until(
    async () => (await near(fondW, BLUE)) > 20 && (await near(bandW, GREY, 6)) > 20 && (await near(insideW, YELLOW)) > 20,
    "S1 : « Aucune », tolérance 5 : fond effacé (bleu de la page), bande grise gardée, intérieur jaune",
  );
  await press("Control+z");
  await until(async () => (await near(fondW, WHITE, 6)) > 20, "S1 : Ctrl+Z : le fond de l'image redevient blanc");
  await setTolerance(10);
  check((await page.inputValue("input[data-fill-tolerance]")) === "10", "S1 : tolérance réglée à 10");
  await clickWorld(fondW);
  await until(async () => (await near(fondW, BLUE)) > 20 && (await near(bandW, BLUE)) > 20, "S1 : tolérance 10 : le fond et la bande deviennent transparents");
  await press("Control+z");
  await until(async () => (await near(bandW, GREY, 6)) > 20, "S1 : Ctrl+Z : la bande revient");
  await press("Control+y");
  await until(async () => (await near(bandW, BLUE)) > 20 && (await near(insideW, YELLOW)) > 20, "S1 : Ctrl+Y : la bande disparaît, l'intérieur reste jaune");
  const h = (await stageBox(page)).height;
  check(h >= 640, `S1 : Pot actif, curseur visible : scène mesurée ${Math.round(h)} px (>= 640)`);
  if (captures) {
    await fr();
    const path = join(ROOT, "docs", "essais", "c6b-pot-image.png");
    await page.screenshot({ path });
    console.log(`capture : ${path}`);
  }

  // S1 : enregistrer : deux assets PNG (l'original déposé, la version courante) ; document.ybin cite sourceAsset.
  const file = await saveTo("c6b.roomboard");
  const entries = zipEntries(await readFile(file));
  const original = `assets/${sha256(png)}.png`;
  const pngs = [...entries.keys()].filter((k) => /^assets\/[0-9a-f]{64}\.png$/.test(k));
  check(pngs.length === 2 && pngs.includes(original), `S1 : enregistré : exactement deux assets PNG, dont l'original ${original} (${pngs.join(", ")})`);
  const current = (pngs.find((k) => k !== original) ?? "").slice("assets/".length, "assets/".length + 64);
  const ybin = entries.get("document.ybin") ?? Buffer.alloc(0);
  check(
    ybin.includes(Buffer.from("sourceAsset")) && ybin.includes(Buffer.from(sha256(png))) && current !== "" && ybin.includes(Buffer.from(current)),
    "S1 : document.ybin cite sourceAsset (l'original) et le nouvel asset",
  );

  // S1 : rouvrir : intérieur jaune, fond bleu, data-image 160x120.
  await openFile(file);
  await until(async () => (await near(insideW, YELLOW)) > 20 && (await near(fondW, BLUE)) > 20, "S1 : rouvert : intérieur jaune, fond bleu");
  await page.click(item("select"));
  await fr();
  await clickWorld(insideW);
  await waitAttr("data-image", "160x120");
  console.log("ok — S1 : rouvert : data-image 160x120");

  // S1 : « Rétablir l'original » : 200x150, plus de jaune, fond blanc ; Ctrl+Z : l'image remplie revient.
  await openPanel();
  await act("restore");
  await waitAttr("data-image", "200x150");
  await until(
    async () => (await nearDisplay(INSIDE, WHITE, 6)) > 20 && (await nearDisplay(FOND, WHITE, 6)) > 20 && (await nearDisplay(INSIDE, YELLOW)) === 0,
    "S1 : « Rétablir l'original » : data-image 200x150, plus de jaune, fond blanc",
  );
  await act("close");
  await press("Control+z");
  await waitAttr("data-image", "160x120");
  await until(async () => (await near(insideW, YELLOW)) > 20, "S1 : Ctrl+Z : l'image remplie revient");
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c6b-"));
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

`node --check scripts/essais/c6b-pot-image-navigateur.mjs` sans sortie.

- [ ] **5. Essai C6a réécrit** (`c6a-pot-navigateur.mjs:284-296`). Le fond est bleu à ce stade (S4 début, `:210`). Remplacer le commentaire et les lignes de `await pick("vert");` à la vérification « Annuler : le vert revient » par :

```js
  // S4 : image → zone de pixels (C6b) : l'image prend le vert, le fond reste bleu ; clic sur la page vide : fond vert ;
  // « Aucune » dans le vide : blanc ; Annuler : le vert revient.
  await dropFile(page, "#stage", "sombre.png", solidPng(200, 150, [20, 20, 20]), "image/png", DROP_AT);
  await waitAttr("data-elements", "5");
  await pot();
  await pick("vert");
  await clickWorld(dropW);
  await waitAttr("data-pot", "pret");
  // Le bitmap adopté arrive au dessin suivant : quelques images d'animation au plus (15 s).
  for (let i = 0; i < 900 && (await near(dropW, GREEN)) <= 150; i++) await fr();
  check((await near(dropW, GREEN)) > 150, "S4 : clic sur l'image sombre : l'image prend le vert (C6b)");
  check((await near(voidW, BLUE)) > 150, "S4 : le fond de la page ne change pas (bleu)");
  await clickWorld(voidW);
  check((await near(voidW, GREEN)) > 150, "S4 : clic sur la page vide : le fond devient vert");
  await none();
  await clickWorld(voidW);
  check((await near(voidW, WHITE, 6)) > 150, "S4 : « Aucune » dans le vide : fond blanc");
  await key("Control+z");
  check((await near(voidW, GREEN)) > 150, "S4 : Annuler : le vert revient");
```

Garder telles quelles les lignes S5 qui suivent (« rouvert : fond vert, cellule rouge » reste vrai : le fond vert vient maintenant du clic sur la page vide). Mettre à jour le commentaire d'en-tête si il cite « image → fond ».

- [ ] **6. Build complet, puis essais un par un.** `scripts/verifier.sh 2>&1 | tail -15` → `module Wasm : N octets` (N ≤ 1 572 864), `module formats : N octets` (N ≤ 3 145 728), `verifier.sh : OK`. Puis : `node scripts/essais/c6b-pot-image-navigateur.mjs 2>&1 | tail -30` → `C6b pot sur image : OK` ; `node scripts/essais/c6a-pot-navigateur.mjs 2>&1 | tail -8` → `C6a pot : OK` ; `node scripts/essais/c2-image-navigateur.mjs 2>&1 | tail -3`, `node scripts/essais/c14-media-navigateur.mjs 2>&1 | tail -3`, `node scripts/essais/c5-image-navigateur.mjs 2>&1 | tail -3` → `: OK` chacun. Un échec de l'essai C6b sur une couleur : lire la ligne `ok —` précédente et la valeur lue, corriger la cause dans l'essai (point de la boîte, attente d'une image) sans baisser un seuil (GC6) ; un échec venu du code de l'application est rapporté comme bloquant, sans corriger le code ici.

- [ ] **7. Hauteur de la scène (B22).** Si l'essai C6b ou C6a mesure moins de 640 px avec le Pot actif : dans `rb.css`, élargir la règle `@media (max-width: 1100px) { .rb-fill-tolerance-label { display: none; } }` à `@media (max-width: 1400px)` et réduire `.rb-fill-tolerance input[type="range"]` à `inline-size: 4.5em` ; relancer `pnpm --filter @roomboard/web build 2>&1 | tail -3` puis les deux essais ; citer la hauteur avant et après au rapport. Sinon ne pas toucher `rb.css`.

- [ ] **8. Capture.** `node scripts/essais/c6b-pot-image-navigateur.mjs --captures 2>&1 | tail -5` → `capture : …/docs/essais/c6b-pot-image.png` ; lire l'image avec `Read` et la décrire (voir « Preuve visuelle »).

- [ ] **9. Suite complète.** `scripts/verifier.sh --e2e 2>&1 | tail -30` → `C14 média : OK`, `C6b pot sur image : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK`, aucun `ÉCHEC`. Si le CPU de la VM est chargé, relancer une fois l'essai qui a échoué seul avant de conclure.

- [ ] **10. Commits** (fichiers un par un) : `refactor(essais): share zipEntries and sha256 in commun.mjs` (commun.mjs, c2-image-navigateur.mjs, c14-media-navigateur.mjs) ; `test(essais): C6b paint bucket on image browser run, C6a image step now fills the image` (c6b-pot-image-navigateur.mjs, c6a-pot-navigateur.mjs, verifier.sh, verifier-e2e.test.sh, rb.css s'il a changé) ; `docs(essais): C6b paint bucket capture` (docs/essais/c6b-pot-image.png) ; chacun avec `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Rapport attendu.** Sorties bornées des étapes 2, 3, 6, 9 ; hauteur de la scène ; tailles des deux modules ; description de la capture ; lignes `Réutilisation : …`.
