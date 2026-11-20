# Usage C5 — édition d'image non destructive : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Goal :** rogner une image, la retourner, la tourner par quarts de tour, régler luminosité et contraste, rendre transparente une couleur (pipette, tolérance, plume, contigu ou global, aperçu), sans jamais réécrire l'asset, avec « Rétablir l'original » et les calculs de pixels dans un Worker.

**Architecture :** les réglages sont des champs facultatifs de l'élément image (neutre = absent), écrits en bloc par `Command::SetImageParams` (module neuf `crates/roomboard-core/src/image.rs`, patron de `fill.rs`) ; le cœur ne connaît que la boîte affichée (`display_size`), toute la géométrie d'affichage vit dans un module pur de la page (`apps/web/src/core/image-params.ts`). Les pixels sont calculés en Rust pur dans `crates/roomboard-formats/src/pixels.rs`, exposés sans état par le module `formats`, appelés par un Worker par onglet (`platform/pixel-runner.ts`) ; le cache des bitmaps gagne un emplacement par élément ; le moteur ouvre une séance de retouche (`engine/tools/image-edit.ts`) pilotée par le panneau `ImagePanel`, ouvert par un bouton « Image » de la rangée Sélection.

**Tech Stack :** Rust (yrs 0.28, serde, wasm-bindgen), TypeScript strict, SolidJS, Vitest, Playwright (essais navigateur).

**Spec :** `docs/plans/usage-c5-image-cadrage.md` (commit 8319538, fait autorité).

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Fixture d'avant C5 | — | crates/roomboard-core/tests/compat_c5.rs, crates/roomboard-core/tests/fixtures/image-c2.roomboard | isolé | implementeur-tdd | `cargo test -p roomboard-core --test compat_c5` : 1 test, `image_c2_fixture_opens_raw_and_resaves_identically ... ok` | S4 | #tache-t1 |
| T2 | Lecture des réglages, boîte affichée | T1 | crates/roomboard-core/src/image.rs, crates/roomboard-core/src/lib.rs, crates/roomboard-core/src/element.rs, crates/roomboard-core/src/query.rs, crates/roomboard-core/src/document.rs, crates/roomboard-core/tests/compat_c5.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib image::` ≥ 5 tests dont `image_box_follows_crop_and_turns` ; `--test compat_c5` 2 tests ; `cargo test -p roomboard-core` sans `FAILED` | S1, S4 | #tache-t2 |
| T3 | Commande SetImageParams | T2 | crates/roomboard-core/src/image.rs, crates/roomboard-core/src/commands.rs | isolé | concepteur-critique | `cargo test -p roomboard-core --lib image::` ≥ 12 tests dont `copy_keeps_image_params`, `image_params_reload_keep_bytes` | S4 | #tache-t3 |
| T4 | Liaison du module principal | T3 | crates/roomboard-wasm/src/lib.rs | isolé | implementeur-tdd | `cargo test -p roomboard-wasm image_params` 2 tests ; taille du module principal avant/après ≤ 1 572 864 o | S1 | #tache-t4 |
| T5 | Fonctions de pixels (Rust) | — | crates/roomboard-formats/src/pixels.rs, crates/roomboard-formats/src/lib.rs, crates/roomboard-formats-wasm/src/lib.rs | isolé | implementeur-tdd | `cargo test -p roomboard-formats --lib pixels::` ≥ 11 tests ; `cargo test -p roomboard-formats-wasm image_` 2 tests ; taille `formats` avant/après ≤ 3 Mio | S3 | #tache-t5 |
| T6 | Géométrie d'affichage (page) | — | apps/web/src/core/api.ts, apps/web/src/core/image-params.ts, apps/web/src/core/image-params.test.ts | isolé | implementeur-tdd | `image-params.test.ts` : ≥ 16 tests, dont « placeAfter garde le centre, échelle diag(2, 1), ⟳ » | S1, S2 | #tache-t6 |
| T7 | Faux cœur, liaison TS, contrat | T4, T6 | apps/web/src/core/api.ts, apps/web/src/core/fake-core.ts, apps/web/src/core/wasm-core.ts, apps/web/src/core/wasm-core.contract.test.ts | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1` `wasm-core.contract.test.ts` : « contrat C5 » joué par les 2 fabriques (12 tests C5) ; `tsc --noEmit` sans erreur | S4 | #tache-t7 |
| T8 | Lanceur et Worker de pixels | — | apps/web/src/platform/pixel-runner.ts, apps/web/src/platform/pixel-runner.test.ts, apps/web/src/platform/pixel-worker.ts, apps/web/src/platform/container.ts | isolé | implementeur-tdd | `pixel-runner.test.ts` : ≥ 10 tests dont « chargé au premier besoin » ; `sheet-reader.test.ts` vert | S5 | #tache-t8 |
| T9 | Cache des bitmaps par élément | T6, T8 | apps/web/src/engine/render/image-cache.ts, apps/web/src/engine/render/image-cache.test.ts | isolé | concepteur-critique | `image-cache.test.ts` : anciens tests + 11 neufs dont « une image sans retouche ne lance aucun Worker » | S5 | #tache-t9 |
| T10 | Dessin, aperçu, cadre de rognage | T9 | apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts, apps/web/src/engine/render/renderer.ts, apps/web/src/engine/render/webgl2.ts, apps/web/src/engine/render/webgl2.test.ts, apps/web/src/engine/render/fake-ctx.ts, apps/web/src/engine/engine.test.ts | isolé | implementeur-tdd | `canvas2d.test.ts` + `webgl2.test.ts` verts, dont « setImagePreview : délégué à la scène Canvas 2D » | S1 | #tache-t10 |
| T11 | Moteur : séance de retouche | T7, T10 | apps/web/src/engine/tools/image-edit.ts, apps/web/src/engine/tools/image-edit.test.ts, apps/web/src/engine/engine.ts, apps/web/src/engine/engine.test.ts | isolé | implementeur-tdd | `engine.test.ts` « moteur — C5 » ≥ 14 tests dont « Échap sort du rognage sans écrire » ; `image-edit.test.ts` 3 tests | S1, S2 | #tache-t11 |
| T12 | Session, attributs, amorce | T8, T9, T11 | apps/web/src/app/board-session.ts, apps/web/src/app/board-session.test.ts, apps/web/src/app/stage-tags.ts, apps/web/src/app/stage-tags.test.ts, apps/web/src/main.ts | isolé | implementeur-tdd | `board-session.test.ts` dont « S5 (I24) : module des pixels en échec » ; `stage-tags.test.ts` verts ; `tsc --noEmit` | S5 | #tache-t12 |
| T13 | Entrée « Image » de la rangée Sélection | T11 | apps/web/src/ui/SelectionRow.tsx, apps/web/src/ui/SelectionRow.test.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/ui/item-state.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/ui/App.tsx | isolé | implementeur-tdd | `SelectionRow.test.tsx`, `Toolbar.test.tsx`, `toolbar-host.test.ts` verts, dont « Image : grisé hors d'une seule image » | S1 | #tache-t13 |
| T14 | Panneau de retouche | T13 | apps/web/src/ui/ImagePanel.tsx, apps/web/src/ui/ImagePanel.test.tsx, apps/web/src/ui/App.tsx, apps/web/src/ui/App.test.tsx, apps/web/src/ui/rb.css | isolé | implementeur-tdd | `ImagePanel.test.tsx` ≥ 9 tests ; `App.test.tsx` dont « panneau image » ; `Toolbar.test.tsx` (garde de src/ui) vert | S2 | #tache-t14 |
| T15 | Générateur PNG des essais dans commun.mjs | — | scripts/essais/commun.mjs, scripts/essais/c2-image-navigateur.mjs, scripts/essais/c6a-pot-navigateur.mjs | isolé | implementeur-tdd | `node --check` des 3 fichiers ; empreintes SHA-256 de `solidPng` identiques à l'ancien code | S1 | #tache-t15 |
| T16 | Essai navigateur C5 et suite complète | T5, T12, T14, T15 | scripts/essais/c5-image-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh, docs/essais/c5-image-rognee-transparente.png, apps/web/src/ui/rb.css | isolé | implementeur-tdd | `scripts/verifier.sh --e2e` : `C5 image : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; tailles des deux modules | S1, S2 | #tache-t16 |
| T17 | Simplification du lot | T16 | fichiers du lot listés dans sa section (T1 à T16) | isolé | implementeur-tdd | `scripts/verifier.sh --e2e` : `verifier.sh : OK` après simplification | S1, S2, S3, S4, S5 | #tache-t17 |

Vagues possibles (aucun recoupement de fichiers dans une vague) : V1 = T1, T5, T6, T8, T15 · V2 = T2, T9 · V3 = T3, T10 · V4 = T4 · V5 = T7 · V6 = T11 · V7 = T12, T13 · V8 = T14 · V9 = T16 · V10 = T17.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-core/tests/compat_c5.rs`, `tests/fixtures/image-c2.roomboard` (neufs) | fichier d'avant C5, écrit une fois par le code de `main` | T1, T2 |
| `crates/roomboard-core/src/image.rs` (neuf) | lecture tolérante, domaine, boîte affichée (T2) ; `ImageParamsInput`, `cmd_set_image_params` (T3) | T2, T3 |
| `crates/roomboard-core/src/element.rs` | `ImageView` gagne ses champs, `read_image` appelle `image::read_params` | T2 |
| `crates/roomboard-core/src/query.rs` | `element_geom` : boîte affichée | T2 |
| `crates/roomboard-core/src/document.rs` | un test qui construit `ImageView` (ligne 919) gagne `..ImageView::default()` | T2 |
| `crates/roomboard-core/src/commands.rs` | variante `SetImageParams`, `BadImageParams`, bras d'`apply` | T3 |
| `crates/roomboard-wasm/src/lib.rs` | `set_image_params` + `_inner` + `image_params_input` | T4 |
| `crates/roomboard-formats/src/pixels.rs` (neuf), `lib.rs` | `transparent_color`, `adjust`, `flood_fill`, `flood_region` | T5 |
| `crates/roomboard-formats-wasm/src/lib.rs` | `image_transparent`, `image_adjust`, `image_flood_fill` | T5 |
| `apps/web/src/core/api.ts` | `ImageParams`, `TransparentColor`, `ImageData` (T6) ; `Command.SetImageParams` (T7) | T6, T7 |
| `apps/web/src/core/image-params.ts` (neuf) | géométrie d'affichage, domaine, `pixelKey` | T6 |
| `apps/web/src/core/fake-core.ts`, `wasm-core.ts`, `wasm-core.contract.test.ts` | parité des deux cœurs | T7 |
| `apps/web/src/platform/pixel-runner.ts`, `pixel-worker.ts` (neufs), `container.ts` | file avec remplacement, Worker, garde `hasPixels` | T8 |
| `apps/web/src/engine/render/image-cache.ts` | emplacement par élément, péremption, `colorAt`, `pixelState` | T9 |
| `apps/web/src/engine/render/canvas2d.ts`, `renderer.ts`, `webgl2.ts`, `fake-ctx.ts` | dessin rogné, retourné, tourné ; aperçu ; cadre de rognage | T10 |
| `apps/web/src/engine/tools/image-edit.ts` (neuf), `engine.ts` | séance de retouche, touches, `selectionImage`, `report` | T11 |
| `apps/web/src/app/board-session.ts`, `stage-tags.ts`, `apps/web/src/main.ts` | lanceur branché, `data-pixels`, `data-image`, Worker de l'amorce | T12 |
| `apps/web/src/ui/SelectionRow.tsx`, `item-state.ts`, `app/toolbar-host.ts`, `ui/App.tsx` (type `Panel`) | bouton « Image » | T13 |
| `apps/web/src/ui/ImagePanel.tsx` (neuf), `App.tsx`, `rb.css` | panneau, fermeture, calage à droite | T14 |
| `scripts/essais/commun.mjs`, `c2-image-navigateur.mjs`, `c6a-pot-navigateur.mjs` | `rgbPng`, `solidPng` partagés | T15 |
| `scripts/essais/c5-image-navigateur.mjs` (neuf), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh`, `docs/essais/c5-image-rognee-transparente.png` | essai S1, S2, capture | T16 |

## Global Constraints

- **GC1** Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- **GC2** Module Wasm principal ≤ 1 572 864 octets (H2-13), module `formats` ≤ 3 Mio (3 145 728 octets) ; aucun seuil baissé ni relevé dans `scripts/verifier.sh` ; tailles écrites avant/après dans le rapport (référence `main` @ 0dd7f1a : principal 1 080 736 o, `formats` 859 580 o).
- **GC3** Scène ≥ 640 px de haut à 1280 × 900, mesurée par un test, y compris panneau de l'image ouvert.
- **GC4** Un `.roomboard` d'avant C5 s'ouvre toujours : fixture `crates/roomboard-core/tests/fixtures/image-c2.roomboard` écrite par T1 avec le code de `main`, jamais régénérée ensuite ; l'aller-retour enregistrer/rouvrir garde les réglages et les octets.
- **GC5** Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- **GC6** L'essai Playwright C5 entre dans le bloc `--e2e` de `scripts/verifier.sh` (patron `scripts/essais/*-navigateur.mjs`, ex. `c6a-pot-navigateur.mjs`) : déposer une image, la rogner, la retourner, rendre transparent son fond blanc par la pipette, annuler puis refaire, rétablir l'original, enregistrer puis rouvrir ; capture PNG d'une image rognée au fond transparent dans `docs/essais/`.
- **GC7** Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20` ; `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (forme réelle, sans `--` : voir « Commandes de preuve ») ; suite complète `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && scripts/verifier.sh --e2e 2>&1 | tail -40`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- **GC8** Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté (`.skip`, `.only`, `#[ignore]`) ni affaibli.
- **GC9** Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (configuration du dépôt, à vérifier par `git -C <worktree> config user.email`), message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **GC10** VM chargée : un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai relevé.
- **GC11** Chantier parallèle OD85 (C12 PDF) sur les mêmes fichiers (`element.rs`, `api.ts`, `wasm-core.ts`, `fake-core.ts`, `renderer.ts`, `canvas2d.ts`, `board-session.ts`, `stage-tags.ts`, `toolbar-host.ts`, `App.tsx`, `main.ts`, `verifier.sh`, `verifier-e2e.test.sh`) : modifications localisées, ajouts plutôt que réécritures, aucune remise en forme d'un bloc non touché.
- **GC12** `src/ui` : aucun `switch (`, aucun `\d+px` dans un `.tsx`, aucun `localStorage` (garde de `apps/web/src/ui/Toolbar.test.tsx:135`) ; design des panneaux existants (`GridPanel`, `.rb-editor`), aucun style neuf hors du calage à droite.
- **GC13** Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

## Commandes de preuve (forme réelle, vérifiée le 2026-11-20)

- Rust : `cd <worktree> && cargo test -p <crate> [--lib <module>:: | --test <fichier>] 2>&1 | tail -20` ; le filtre fait apparaître les lignes `test <module>::tests::<nom> ... ok` dans les 20 dernières lignes. Motif : `test result: ok. N passed` avec N attendu, aucune ligne `FAILED`.
- Web : `cd <worktree> && pnpm --filter @roomboard/web test <chemin depuis apps/web> 2>&1 | tail -20`. **Sans `--`** : la forme `test -- <fichier>` du profil transmet `--` à vitest, qui joue alors les 96 fichiers (constaté : 1839 tests). Un nom précis : ajouter `-t "<nom>"` (motif `Tests  1 passed | k skipped`). Motif : `Test Files  1 passed (1)`, `Tests  N passed (N)`, aucune ligne `FAIL `.
- Contrat du vrai module : construire d'abord le module (`export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm`), puis `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core/wasm-core.contract.test.ts 2>&1 | tail -20`.
- Types : `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` (sortie vide = aucune erreur).
- Lint Rust : `cd <worktree> && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -20` (motif d'échec : `error:` ou `warning:`).
- Suite complète : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && scripts/verifier.sh --e2e 2>&1 | tail -40` (motif : `verifier.sh : e2e OK` puis `verifier.sh : OK`).

## Review Focus

Les cinq entrées que le cadrage implique et que l'on oublierait le plus vite ; chacune a son test dans la tâche qui possède le code.

1. **Image réduite à l'affichage (côté > 4096 px, I22, U26)** : le rognage et la pipette travaillent en pixels source, le bitmap est plus petit ; attendu : rectangle source mis à l'échelle de la copie, pixel lu à l'échelle. Tests : T10 « image rognée, retournée, tournée : … rectangle source à l'échelle de la copie » ; T9 « colorAt : couleur du pixel source mis à l'échelle de la copie ».
2. **Image étirée (échelle non uniforme) puis tournée (I9)** : attendu : l'étirement suit le contenu, le centre ne bouge pas. Test : T6 « placeAfter garde le centre, échelle diag(2, 1), ⟳ ».
3. **Annuler ou retoucher pendant un calcul de pixels (I19, S5)** : attendu : seul le résultat de la clé encore voulue est dessiné, les autres bitmaps sont fermés. Tests : T9 « S5 : résultat périmé jeté et fermé » et « Annuler pendant un calcul : le résultat arrivé est fermé ».
4. **Champ illisible écrit par une autre version, puis « Rétablir l'original » (I4, I5)** : attendu : lu comme absent, puis retiré par l'état neutre. Tests : T2 « unreadable_fields_read_as_absent » ; T3 « neutral_state_removes_every_field_even_unreadable ».
5. **Rogner une image déjà tournée (I11)** : le cadre tracé à l'écran doit donner le bon rectangle source. Tests : T6 « rogner après Tourner ⟳ : le cadre tracé à l'écran donne le bon rectangle source » ; T11 « rognage : … Valider le rognage garde les pixels en place ».

---

### Tâche T1 — Fixture d'avant C5

<a id="tache-t1"></a>

**Objectif :** écrire une fois, avec le code de `main` (aucun code de C5), un `.roomboard` qui contient une image de C2, et le test qui l'ouvre et le réenregistre à l'identique (I32, S4 ; prémisse corrigée : aucune fixture d'image n'existait).

**Fichiers :**
- Créer : `crates/roomboard-core/tests/compat_c5.rs`
- Créer (généré par le test) : `crates/roomboard-core/tests/fixtures/image-c2.roomboard`

**Interfaces :**
- Consomme : `roomboard_core::format::{load, save, SaveMeta}`, `roomboard_core::commands::Command::AddImage`, `roomboard_core::asset::AssetRef { id, name, mime, size }`.
- Produit : `fixture_bytes() -> Vec<u8>` et `meta() -> SaveMeta` dans `compat_c5.rs` (T2 y ajoute un test qui les appelle) ; le fichier `image-c2.roomboard` (une page, une image 200 × 150, asset `ba7816bf…15ad`, matrice `[2, 0, 0, 1, 100, 80]`).
- Réutilise : aucun module de la liste du cadrage (la ligne « Test « recharger garde les octets » » est servie par T3) ; patron de régénération de `crates/roomboard-core/tests/element_inconnu.rs:32-89` (`ROOMBOARD_REGENERER_FIXTURES=1`).

**Test et commande bornée :** `cd <worktree> && cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20` → `test image_c2_fixture_opens_raw_and_resaves_identically ... ok`, `test result: ok. 1 passed`.

**Contraintes (recopiées) :**
- GC4 Un `.roomboard` d'avant C5 s'ouvre toujours : fixture `crates/roomboard-core/tests/fixtures/image-c2.roomboard` écrite par T1 avec le code de `main`, jamais régénérée ensuite ; l'aller-retour enregistrer/rouvrir garde les réglages et les octets.
- GC5 Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- GC7 Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&`.

**Interdits :** toucher à `crates/roomboard-core/src/` (la fixture doit être écrite par le code de `main`) ; régénérer la fixture après un commit de C5.

**Terminé quand :** la fixture est commitée, le test passe sans variable d'environnement, `crates/roomboard-core/src/` est identique à `origin/main`.

**Rapport :** sha du commit ; sortie bornée du test ; `git -C <worktree> diff --stat origin/main -- crates/roomboard-core/src` (vide) ; taille de la fixture en octets.

- [ ] **Étape 1 : vérifier que le cœur est celui de `main`**

Run : `cd <worktree> && git diff --stat origin/main -- crates/roomboard-core/src | tail -5`
Attendu : aucune ligne. Sinon : s'arrêter et le dire dans le rapport (la fixture serait fausse).

- [ ] **Étape 2 : écrire le test**

`crates/roomboard-core/tests/compat_c5.rs` :

```rust
//! Garde de compatibilité C5 (I32, S4) : `image-c2.roomboard` a été écrit une fois par le code de `main` 0dd7f1a
//! (image de C2, aucun réglage d'image). Il ne se régénère pas après C5 : `ROOMBOARD_REGENERER_FIXTURES=1` seulement
//! avec le code d'avant C5.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/image-c2.roomboard")
}

pub fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

/// Document de C2 : une image 200 × 150 placée en (100, 80), étirée deux fois en x.
fn c2_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    d.apply(Command::AddImage {
        page: p,
        asset: AssetRef {
            id: ABC.into(),
            name: "anneau.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        },
        w: 200.0,
        h: 150.0,
        matrix: [2.0, 0.0, 0.0, 1.0, 100.0, 80.0],
    })
    .expect("image");
    d
}

pub fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        std::fs::write(&path, save(&c2_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture image-c2.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c5",
    )
}

#[test]
fn image_c2_fixture_opens_raw_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let p = d.page_ids()[0].clone();
    let ids = d.element_ids(&p);
    assert_eq!(ids.len(), 1);
    let v = d.element(&ids[0]).expect("vue");
    assert_eq!(v.kind, "image");
    assert_eq!(v.transform, [2.0, 0.0, 0.0, 1.0, 100.0, 80.0]);
    let i = v.image.expect("image");
    assert_eq!((i.asset.as_str(), i.w, i.h), (ABC, 200.0, 150.0));
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C5 réenregistré à l'identique"
    );
}
```

- [ ] **Étape 3 : le lancer sans fixture (rouge)**

Run : `cd <worktree> && cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20`
Attendu : `FAILED`, message `fixture image-c2.roomboard absente`.

- [ ] **Étape 4 : écrire la fixture une fois**

Run : `cd <worktree> && ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20 && ls -l crates/roomboard-core/tests/fixtures/image-c2.roomboard`
Attendu : `test result: ok. 1 passed`, fichier présent.

- [ ] **Étape 5 : le relancer sans variable (vert)**

Run : `cd <worktree> && cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20`
Attendu : `test image_c2_fixture_opens_raw_and_resaves_identically ... ok`, `test result: ok. 1 passed`.

- [ ] **Étape 6 : format et lint**

Run : `cd <worktree> && cargo fmt --all && cargo clippy -p roomboard-core --all-targets -- -D warnings 2>&1 | tail -20`
Attendu : aucune ligne `warning:` ni `error`.

- [ ] **Étape 7 : commit**

```bash
cd <worktree> && git add crates/roomboard-core/tests/compat_c5.rs crates/roomboard-core/tests/fixtures/image-c2.roomboard && git commit -m "test(core): add pre-C5 image fixture and compatibility guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T2 — Lecture des réglages, boîte affichée

<a id="tache-t2"></a>

**Objectif :** module neuf `image.rs` (patron de `fill.rs`, C6a D24) qui lit les sept réglages de l'élément image de façon tolérante, les contrôle (I5), les publie dans `ImageView` (`camelCase`, absents quand ils sont neutres) et donne la boîte affichée (I8) que la collision, les bornes, le rectangle de sélection et l'accroche suivent.

**Fichiers :**
- Créer : `crates/roomboard-core/src/image.rs`
- Modifier : `crates/roomboard-core/src/lib.rs` (liste des modules) ; `crates/roomboard-core/src/element.rs:57-62` (`ImageView`) et `:264-276` (`read_image`) ; `crates/roomboard-core/src/query.rs:146-151` (`element_geom`, image) ; `crates/roomboard-core/src/document.rs:919-923` (un test construit `ImageView` : `..ImageView::default()`) ; `crates/roomboard-core/tests/compat_c5.rs` (un test ajouté).

**Interfaces :**
- Consomme (T1) : `fixture_bytes() -> Vec<u8>`, `meta() -> SaveMeta` de `crates/roomboard-core/tests/compat_c5.rs`.
- Produit :
  - `pub struct TransparentView { pub color: String, pub tolerance: u8, pub soft: u8, pub contiguous: bool }` (`Serialize`, `Eq`) ;
  - `pub struct TransparentInput { pub color: String, pub tolerance: f64, pub soft: f64, pub contiguous: bool }` ;
  - `pub struct ImageParams { pub crop: Option<[u32; 4]>, pub flip_x: bool, pub flip_y: bool, pub quarter_turns: u8, pub brightness: i8, pub contrast: i8, pub transparent: Option<TransparentView> }` (`Default`, `Eq`) ;
  - `pub fn parse_rgb_hex(c: &str) -> Option<[u8; 3]>` ; `pub fn display_size(w: f64, h: f64, crop: Option<[u32; 4]>, quarter_turns: u8) -> (f64, f64)` ;
  - `pub(crate) fn read_params<T: ReadTxn>(txn: &T, e: &MapRef, w: f64, h: f64) -> ImageParams` ; `fn int_in(v: f64, lo: f64, hi: f64) -> Option<f64>`, `fn crop_of(c: [f64; 4], w: f64, h: f64) -> Option<Option<[u32; 4]>>`, `fn transparent_of(t: &TransparentInput) -> Option<TransparentView>`, `fn out_bool(o: Option<Out>) -> Option<bool>` (privées, réutilisées par T3) ;
  - `ImageView` gagne `crop`, `flip_x`, `flip_y`, `quarter_turns`, `brightness`, `contrast`, `transparent` (sérialisés `crop`, `flipX`, `flipY`, `quarterTurns`, `brightness`, `contrast`, `transparent`) et `impl ImageView { pub fn display_size(&self) -> (f64, f64); pub fn params(&self) -> ImageParams }` ; `ImageView` dérive `Default`.
- Réutilise : `crates/roomboard-core/src/element.rs:264` — `read_image(txn, e) -> Option<(Transform, ImageView)>`, `ImageView` (`:59`) gagne ses champs (étendre).
- Réutilise : `crates/roomboard-core/src/query.rs:146-151` — `box_polygon(bw, bh)` avec `ImageView::display_size() -> (f64, f64)` (étendre).

**Patron à ne pas reprendre (concepteur-critique) :** ranger les réglages en `Any::Map` (un seul champ `params`) : yrs l'encode dans l'ordre d'un `HashMap` à graine aléatoire, les octets changent d'un rechargement à l'autre (`crates/roomboard-core/src/element.rs:236-245`, commentaire de `style_fields`). Chemin de référence : champs scalaires du `Y.Map` de l'élément comme `transform` (`crates/roomboard-core/src/element.rs:195-197` et `:223-234`, `Any::Array` positionnel) et `Y.Map` de champs scalaires comme le fond (`crates/roomboard-core/src/commands.rs:1007-1018`, `read_backdrop` `crates/roomboard-core/src/element.rs:312-331`). Autre piège : faire échouer la lecture de l'élément sur un réglage illisible (U3) — `read_image` ne rend `None` que pour `asset`, `w`, `h`.

**Test et commande bornée :**
- `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20` → 5 lignes `test image::tests::… ok` (`read_params_reads_each_field`, `unreadable_fields_read_as_absent`, `full_crop_reads_as_absent`, `image_box_follows_crop_and_turns`, `image_view_serializes_camel_case_without_neutral_fields`), `test result: ok. 5 passed`.
- `cd <worktree> && cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20` → `test result: ok. 2 passed`.
- Tests à garder verts (zone touchée) : `cd <worktree> && cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -20` → aucune ligne `FAILED` (couvre `compat_socle.rs`, `compat_c3.rs`, `compat_grille_pr12.rs`, `element_inconnu.rs`, `pot.rs`, `scenarios.rs`, `commands.rs:2766` `image_and_backdrop_reload_keep_bytes`).

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC4 Un `.roomboard` d'avant C5 s'ouvre toujours : fixture `crates/roomboard-core/tests/fixtures/image-c2.roomboard` écrite par T1 avec le code de `main`, jamais régénérée ensuite ; l'aller-retour enregistrer/rouvrir garde les réglages et les octets.
- GC7 Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 Chantier parallèle OD85 (C12 PDF) sur les mêmes fichiers (dont `element.rs` : il touche `BackdropView` `:48-56`, `:303-357`) : modifications localisées, ajouts plutôt que réécritures, aucune remise en forme d'un bloc non touché.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&`.

**Interdits :** aucun `kind` neuf (constat `element.rs:25` `KNOWN_KINDS` non aggravé) ; `snap_box` (`query.rs:233`) non touché ; aucune écriture de document dans ce module (T3).

**Terminé quand :** les 5 tests de `image::` et les 2 de `compat_c5` passent, `cargo test -p roomboard-core` n'a aucun `FAILED`, clippy sans avertissement.

**Rapport :** sha ; sorties bornées ; `Réutilisation : appelé crates/roomboard-core/src/element.rs:264 read_image` et `Réutilisation : appelé crates/roomboard-core/src/query.rs:146 box_polygon` (ou `Réutilisation : écart — <pourquoi>`).

- [ ] **Étape 1 : déclarer le module**

`crates/roomboard-core/src/lib.rs` : ajouter `pub mod image;` entre `pub mod history;` et `pub mod ink;`.

- [ ] **Étape 2 : écrire `image.rs` avec ses tests (rouges tant que `ImageView` n'a pas ses champs)**

`crates/roomboard-core/src/image.rs` :

```rust
//! Réglages non destructifs d'une image (C5, U29, I2-I8) : lecture tolérante des champs du `Y.Map` de l'élément (un
//! champ illisible est lu comme absent, U3), domaine (I5), boîte affichée (I8). Champ neutre = champ absent (I4) ;
//! `crop` en `Any::Array` positionnel, `transparent` en `Y.Map` de champs scalaires, jamais `Any::Map` (I2, G4).
//! L'écriture (`Command::SetImageParams`) suit le patron de `fill.rs` ; l'asset n'est jamais réécrit.
use yrs::{Any, Map, MapRef, Out, ReadTxn};

use crate::element::{any_f64, out_f64, out_string};

/// Couleur rendue transparente (I5, I12-I14) : `color` en `#rrggbb` minuscules ; `tolerance`, `soft` de 0 à 100.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct TransparentView {
    pub color: String,
    pub tolerance: u8,
    pub soft: u8,
    pub contiguous: bool,
}

/// Couleur transparente demandée (I6) : valeurs brutes, contrôlées par `transparent_of`.
#[derive(Debug, Clone, PartialEq)]
pub struct TransparentInput {
    pub color: String,
    pub tolerance: f64,
    pub soft: f64,
    pub contiguous: bool,
}

/// Réglages normalisés (I4, I5) : neutres à `None`, `false` ou 0 ; `crop` = `[x, y, w, h]` en pixels source, jamais
/// l'image entière ; `quarter_turns` 0 à 3, sens horaire.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ImageParams {
    pub crop: Option<[u32; 4]>,
    pub flip_x: bool,
    pub flip_y: bool,
    pub quarter_turns: u8,
    pub brightness: i8,
    pub contrast: i8,
    pub transparent: Option<TransparentView>,
}

/// Plafond des entiers d'un rognage (u32).
const MAX_INT: f64 = 4_294_967_295.0;

/// `v` si c'est un entier fini de `lo` à `hi`.
fn int_in(v: f64, lo: f64, hi: f64) -> Option<f64> {
    (v.is_finite() && v.fract() == 0.0 && v >= lo && v <= hi).then_some(v)
}

/// `#rrggbb` en hexadécimal minuscule (I5) ; `None` pour toute autre forme (nom CSS, majuscules, `#rgb`) : `valid_color`
/// de `rich_text.rs` accepte des noms, inutilisables pour des pixels.
pub fn parse_rgb_hex(c: &str) -> Option<[u8; 3]> {
    let hex = c.strip_prefix('#')?;
    if hex.len() != 6 || !hex.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
        return None;
    }
    let byte = |i: usize| u8::from_str_radix(&hex[i..i + 2], 16).ok();
    Some([byte(0)?, byte(2)?, byte(4)?])
}

/// Rognage `[x, y, w, h]` d'une image `w × h` (I5) : `None` hors domaine (entiers, `x, y ≥ 0`, `w, h ≥ 1`, dans
/// l'image) ; `Some(None)` pour l'image entière (neutre, I4).
fn crop_of(c: [f64; 4], w: f64, h: f64) -> Option<Option<[u32; 4]>> {
    let x = int_in(c[0], 0.0, MAX_INT)?;
    let y = int_in(c[1], 0.0, MAX_INT)?;
    let cw = int_in(c[2], 1.0, MAX_INT)?;
    let ch = int_in(c[3], 1.0, MAX_INT)?;
    if x + cw > w || y + ch > h {
        return None;
    }
    let full = x == 0.0 && y == 0.0 && cw == w && ch == h;
    Some((!full).then_some([x as u32, y as u32, cw as u32, ch as u32]))
}

/// Domaine de la couleur transparente (I5).
fn transparent_of(t: &TransparentInput) -> Option<TransparentView> {
    parse_rgb_hex(&t.color)?;
    Some(TransparentView {
        color: t.color.clone(),
        tolerance: int_in(t.tolerance, 0.0, 100.0)? as u8,
        soft: int_in(t.soft, 0.0, 100.0)? as u8,
        contiguous: t.contiguous,
    })
}

fn out_bool(o: Option<Out>) -> Option<bool> {
    match o {
        Some(Out::Any(Any::Bool(b))) => Some(b),
        _ => None,
    }
}

fn read_crop(o: Option<Out>, w: f64, h: f64) -> Option<[u32; 4]> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    if items.len() != 4 {
        return None;
    }
    let mut c = [0.0; 4];
    for (slot, a) in c.iter_mut().zip(items.iter()) {
        *slot = any_f64(a)?;
    }
    crop_of(c, w, h).flatten()
}

fn read_transparent<T: ReadTxn>(txn: &T, o: Option<Out>) -> Option<TransparentView> {
    let Some(Out::YMap(m)) = o else {
        return None;
    };
    transparent_of(&TransparentInput {
        color: out_string(m.get(txn, "color"))?,
        tolerance: out_f64(m.get(txn, "tolerance"))?,
        soft: out_f64(m.get(txn, "soft"))?,
        contiguous: out_bool(m.get(txn, "contiguous"))?,
    })
}

/// Réglages de l'image `e` de taille source `w × h`, champ par champ : un champ illisible ou hors domaine est lu comme
/// absent (U3), l'élément reste lisible ; rien n'est réécrit à la lecture.
pub(crate) fn read_params<T: ReadTxn>(txn: &T, e: &MapRef, w: f64, h: f64) -> ImageParams {
    let int = |key: &str, lo: f64, hi: f64| out_f64(e.get(txn, key)).and_then(|v| int_in(v, lo, hi));
    ImageParams {
        crop: read_crop(e.get(txn, "crop"), w, h),
        flip_x: out_bool(e.get(txn, "flipX")).unwrap_or(false),
        flip_y: out_bool(e.get(txn, "flipY")).unwrap_or(false),
        quarter_turns: int("quarterTurns", 0.0, 3.0).map_or(0, |v| v as u8),
        brightness: int("brightness", -100.0, 100.0).map_or(0, |v| v as i8),
        contrast: int("contrast", -100.0, 100.0).map_or(0, |v| v as i8),
        transparent: read_transparent(txn, e.get(txn, "transparent")),
    }
}

/// Boîte affichée (I8) : taille du rognage (ou de l'image), échangée si le nombre de quarts de tour est impair.
pub fn display_size(w: f64, h: f64, crop: Option<[u32; 4]>, quarter_turns: u8) -> (f64, f64) {
    let (cw, ch) = crop.map_or((w, h), |c| (f64::from(c[2]), f64::from(c[3])));
    if quarter_turns % 2 == 1 {
        (ch, cw)
    } else {
        (cw, ch)
    }
}

pub(crate) fn is_zero_u8(v: &u8) -> bool {
    *v == 0
}

pub(crate) fn is_zero_i8(v: &i8) -> bool {
    *v == 0
}

#[cfg(test)]
mod tests {
    use yrs::{Any, In, Map, MapPrelim};

    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::Command;
    use crate::document::Document;
    use crate::element::{ImageView, Transform, IDENTITY};
    use crate::query::Bounds;

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    /// Image `w × h` placée par `m` sur la première page : (page, id).
    fn add(d: &mut Document, w: f64, h: f64, m: Transform) -> (String, String) {
        let p = d.page_ids()[0].clone();
        let id = d
            .apply(Command::AddImage {
                page: p.clone(),
                asset: AssetRef {
                    id: ABC.into(),
                    name: "a.png".into(),
                    mime: "image/png".into(),
                    size: 3.0,
                },
                w,
                h,
                matrix: m,
            })
            .expect("image")
            .ids[0]
            .clone();
        (p, id)
    }

    /// Écrit un champ brut de l'élément (comme une autre version le ferait), hors commande.
    fn put(d: &Document, id: &str, key: &str, v: In) {
        let e = {
            let txn = d.read();
            d.find_element(&txn, id).expect("élément").element
        };
        let mut txn = d.transact_local();
        e.insert(&mut txn, key, v);
    }

    fn nums(v: &[f64]) -> In {
        In::Any(Any::Array(v.iter().map(|x| Any::from(*x)).collect::<Vec<Any>>().into()))
    }

    fn color_map(color: &str, tolerance: f64) -> In {
        In::Map(MapPrelim::from([
            ("color", In::from(color)),
            ("tolerance", In::Any(Any::from(tolerance))),
            ("soft", In::Any(Any::from(0.0))),
            ("contiguous", In::Any(Any::Bool(true))),
        ]))
    }

    fn params_of(d: &Document, id: &str) -> ImageParams {
        d.element(id).and_then(|e| e.image).expect("image lisible").params()
    }

    #[test]
    fn read_params_reads_each_field() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "crop", nums(&[10.0, 20.0, 100.0, 50.0]));
        put(&d, &id, "flipX", In::Any(Any::Bool(true)));
        put(&d, &id, "quarterTurns", In::Any(Any::from(1.0)));
        put(&d, &id, "brightness", In::Any(Any::from(30.0)));
        put(&d, &id, "contrast", In::Any(Any::from(-20.0)));
        put(&d, &id, "transparent", color_map("#ffffff", 10.0));
        assert_eq!(
            params_of(&d, &id),
            ImageParams {
                crop: Some([10, 20, 100, 50]),
                flip_x: true,
                flip_y: false,
                quarter_turns: 1,
                brightness: 30,
                contrast: -20,
                transparent: Some(TransparentView {
                    color: "#ffffff".into(),
                    tolerance: 10,
                    soft: 0,
                    contiguous: true,
                }),
            }
        );
        let i = d.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(i.display_size(), (50.0, 100.0));
    }

    /// Review Focus 4 (I4, I5, U3) : champ illisible lu comme absent, l'élément reste lisible.
    #[test]
    fn unreadable_fields_read_as_absent() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        for (key, v) in [
            ("crop", nums(&[0.0, 0.0, 0.0, 5.0])),
            ("flipX", In::from("oui")),
            ("flipY", In::Any(Any::from(1.0))),
            ("quarterTurns", In::Any(Any::from(4.0))),
            ("brightness", In::Any(Any::from(101.0))),
            ("contrast", In::Any(Any::from(2.5))),
            ("transparent", In::Any(Any::from("#ffffff"))),
        ] {
            put(&d, &id, key, v);
        }
        assert_eq!(params_of(&d, &id), ImageParams::default());
        for c in [[600.0, 0.0, 100.0, 10.0], [0.5, 0.0, 10.0, 10.0], [-1.0, 0.0, 10.0, 10.0]] {
            put(&d, &id, "crop", nums(&c));
            assert_eq!(params_of(&d, &id).crop, None, "{c:?}");
        }
        put(&d, &id, "transparent", color_map("white", 10.0));
        assert_eq!(params_of(&d, &id).transparent, None);
        put(&d, &id, "transparent", color_map("#FFFFFF", 10.0));
        assert_eq!(params_of(&d, &id).transparent, None);
        put(&d, &id, "transparent", color_map("#ffffff", 101.0));
        assert_eq!(params_of(&d, &id).transparent, None);
    }

    #[test]
    fn full_crop_reads_as_absent() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        put(&d, &id, "crop", nums(&[0.0, 0.0, 640.0, 480.0]));
        assert_eq!(params_of(&d, &id).crop, None);
    }

    /// Effet de bord 1 (I8) : collision, bornes et rectangle suivent la boîte affichée.
    #[test]
    fn image_box_follows_crop_and_turns() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        put(&d, &id, "crop", nums(&[0.0, 0.0, 200.0, 100.0]));
        let b = d.bounds(&[id.clone()]).expect("bornes");
        assert_eq!((b.x0, b.y0, b.x1, b.y1), (100.0, 50.0, 300.0, 150.0));
        assert_eq!(d.hit_test(&p, 250.0, 100.0, 0.0), Some(id.clone()));
        assert_eq!(d.hit_test(&p, 500.0, 100.0, 0.0), None, "hors du rognage : plus de collision");
        put(&d, &id, "quarterTurns", In::Any(Any::from(1.0)));
        let b = d.bounds(&[id.clone()]).expect("bornes");
        assert_eq!((b.x0, b.y0, b.x1, b.y1), (100.0, 50.0, 200.0, 250.0));
        assert_eq!(d.hit_test(&p, 150.0, 200.0, 0.0), Some(id.clone()));
        assert_eq!(d.hit_test(&p, 250.0, 100.0, 0.0), None);
        let rect = Bounds {
            x0: 90.0,
            y0: 40.0,
            x1: 210.0,
            y1: 260.0,
        };
        assert_eq!(d.ids_in_rect(&p, rect), vec![id]);
    }

    #[test]
    fn image_view_serializes_camel_case_without_neutral_fields() {
        let plain = ImageView {
            asset: ABC.into(),
            w: 640.0,
            h: 480.0,
            ..ImageView::default()
        };
        assert_eq!(
            serde_json::to_value(&plain).expect("json"),
            serde_json::json!({ "asset": ABC, "w": 640.0, "h": 480.0 })
        );
        let full = ImageView {
            crop: Some([1, 2, 3, 4]),
            flip_x: true,
            flip_y: true,
            quarter_turns: 3,
            brightness: -5,
            contrast: 7,
            transparent: Some(TransparentView {
                color: "#ffffff".into(),
                tolerance: 10,
                soft: 2,
                contiguous: false,
            }),
            ..plain.clone()
        };
        assert_eq!(
            serde_json::to_value(&full).expect("json"),
            serde_json::json!({
                "asset": ABC, "w": 640.0, "h": 480.0, "crop": [1, 2, 3, 4], "flipX": true, "flipY": true,
                "quarterTurns": 3, "brightness": -5, "contrast": 7,
                "transparent": { "color": "#ffffff", "tolerance": 10, "soft": 2, "contiguous": false }
            })
        );
    }
}
```

- [ ] **Étape 3 : le lancer (rouge)**

Run : `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20`
Attendu : erreurs de compilation `error[E0560]` / `error[E0599]` (`ImageView` n'a ni `crop` ni `params`).

- [ ] **Étape 4 : étendre `ImageView` et `read_image`**

`crates/roomboard-core/src/element.rs` : ajouter l'import après `use crate::grid::GridView;` :

```rust
use crate::image::{ImageParams, TransparentView};
```

Remplacer le bloc `ImageView` (lignes 57-63) par :

```rust
/// Image (U5, K5 ; C5, I8) : `w`, `h` = taille source en pixels ; boîte locale = boîte affichée (`display_size`).
/// Réglages (U29) : absents quand ils sont neutres (I4), lus tolérants (`image::read_params`).
#[derive(Debug, Clone, Default, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageView {
    pub asset: String,
    pub w: f64,
    pub h: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crop: Option<[u32; 4]>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub flip_x: bool,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub flip_y: bool,
    #[serde(skip_serializing_if = "crate::image::is_zero_u8")]
    pub quarter_turns: u8,
    #[serde(skip_serializing_if = "crate::image::is_zero_i8")]
    pub brightness: i8,
    #[serde(skip_serializing_if = "crate::image::is_zero_i8")]
    pub contrast: i8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transparent: Option<TransparentView>,
}

impl ImageView {
    /// Boîte affichée (I8) : `(bw, bh)` en pixels source.
    pub fn display_size(&self) -> (f64, f64) {
        crate::image::display_size(self.w, self.h, self.crop, self.quarter_turns)
    }

    /// Réglages (C5), sous la forme comparée par `SetImageParams`.
    pub fn params(&self) -> ImageParams {
        ImageParams {
            crop: self.crop,
            flip_x: self.flip_x,
            flip_y: self.flip_y,
            quarter_turns: self.quarter_turns,
            brightness: self.brightness,
            contrast: self.contrast,
            transparent: self.transparent.clone(),
        }
    }
}
```

Remplacer le corps de `read_image` (lignes 264-277) par :

```rust
/// Image (K5) : transform et vue ; `None` si l'élément n'en est pas une ou est mal formé (asset non conforme, boîte ≤ 0).
/// Un réglage illisible ne rend jamais `None` (C5, U3) : il est lu comme absent.
pub(crate) fn read_image<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, ImageView)> {
    if out_string(e.get(txn, "kind"))? != "image" {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let asset = out_string(e.get(txn, "asset")).filter(|a| is_asset_id(a))?;
    let w = out_f64(e.get(txn, "w")).filter(|v| finite_positive(*v))?;
    let h = out_f64(e.get(txn, "h")).filter(|v| finite_positive(*v))?;
    let p = crate::image::read_params(txn, e, w, h);
    Some((
        transform,
        ImageView {
            asset,
            w,
            h,
            crop: p.crop,
            flip_x: p.flip_x,
            flip_y: p.flip_y,
            quarter_turns: p.quarter_turns,
            brightness: p.brightness,
            contrast: p.contrast,
            transparent: p.transparent,
        },
    ))
}
```

- [ ] **Étape 5 : boîte affichée dans `element_geom`**

`crates/roomboard-core/src/query.rs:146-151`, remplacer :

```rust
        if let Some((transform, i)) = read_image(txn, e) {
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(i.w, i.h).into(),
            });
        }
```

par :

```rust
        if let Some((transform, i)) = read_image(txn, e) {
            // C5 (I8) : boîte affichée (rognage, quarts de tour) ; collision, bornes, rectangle et accroche suivent.
            let (bw, bh) = i.display_size();
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(bw, bh).into(),
            });
        }
```

- [ ] **Étape 6 : test existant de `document.rs`**

`crates/roomboard-core/src/document.rs:919-923`, dans `image_view_reads_fields_without_style`, remplacer :

```rust
            Some(ImageView {
                asset: ABC.into(),
                w: 640.0,
                h: 480.0
            })
```

par :

```rust
            Some(ImageView {
                asset: ABC.into(),
                w: 640.0,
                h: 480.0,
                ..ImageView::default()
            })
```

- [ ] **Étape 7 : la fixture d'avant C5 n'a aucun réglage**

Ajouter à la fin de `crates/roomboard-core/tests/compat_c5.rs` :

```rust
/// C5 (I4, I32) : l'image d'avant C5 n'a aucun réglage ; sa boîte affichée est sa taille source.
#[test]
fn image_c2_fixture_has_no_image_params() {
    let d = load(&fixture_bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let i = d.element(&d.element_ids(&p)[0]).and_then(|v| v.image).expect("image");
    assert_eq!(i.params(), roomboard_core::image::ImageParams::default());
    assert_eq!(i.display_size(), (200.0, 150.0));
}
```

- [ ] **Étape 8 : vert**

Run : `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20 && cargo test -p roomboard-core --test compat_c5 2>&1 | tail -20`
Attendu : `test result: ok. 5 passed` puis `test result: ok. 2 passed`.

- [ ] **Étape 9 : tests à garder verts, format, lint**

Run : `cd <worktree> && cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -20 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -20`
Attendu : chaque ligne `test result: ok.`, aucune ligne `FAILED`, aucun `warning:`.

- [ ] **Étape 10 : commit**

```bash
cd <worktree> && git add crates/roomboard-core/src/image.rs crates/roomboard-core/src/lib.rs crates/roomboard-core/src/element.rs crates/roomboard-core/src/query.rs crates/roomboard-core/src/document.rs crates/roomboard-core/tests/compat_c5.rs && git commit -m "feat(core): read non-destructive image params and use the displayed box" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T3 — Commande SetImageParams

<a id="tache-t3"></a>

**Objectif :** `Command::SetImageParams { id, params, matrix }` : état voulu complet des réglages (remplacé en bloc, comme `SetGrid`) et nouvelle matrice, une transaction, une étape ; même état et même matrice : aucune (D38) ; neutre = champ retiré (I4) ; seuls les champs qui changent sont réécrits ; hors domaine : `BadImageParams` sans transaction (I5, I6, I7).

**Fichiers :**
- Modifier : `crates/roomboard-core/src/image.rs` (imports, `ImageParamsInput`, `normalize`, `plan`, `cmd_set_image_params`, tests) ; `crates/roomboard-core/src/commands.rs:30` (`Command`), `:238-255` (`CommandError`), `:258-312` (`Display`), `:713-717` (`apply`, après `Command::Fill`).

**Interfaces :**
- Consomme (T2) : `ImageParams`, `TransparentView`, `TransparentInput`, `int_in`, `crop_of`, `transparent_of`, `ImageView::params()`, `read_image`.
- Produit :
  - `pub struct ImageParamsInput { pub crop: Option<[f64; 4]>, pub flip_x: bool, pub flip_y: bool, pub quarter_turns: f64, pub brightness: f64, pub contrast: f64, pub transparent: Option<TransparentInput> }` (`Debug, Clone, Default, PartialEq`) ;
  - `Command::SetImageParams { id: String, params: crate::image::ImageParamsInput, matrix: Transform }` ;
  - `CommandError::BadImageParams`, message exact : `réglages d'image invalides (image lisible, rognage entier dans l'image, quarts de tour 0 à 3, luminosité et contraste entiers de -100 à 100, couleur #rrggbb, tolérance et plume entières de 0 à 100 attendus)` ;
  - `impl Document { pub(crate) fn cmd_set_image_params(&mut self, id: &str, p: &ImageParamsInput, m: &Transform) -> Result<Change, CommandError> }` ; ordre des refus : id inconnu (`UnknownElement(id)`), cible qui n'est pas une image lisible (`BadImageParams`), réglages hors domaine (`BadImageParams`), matrice (`BadMatrix`) ; `Change { pages: [page], ids: [id] }`.
- Réutilise : `crates/roomboard-core/src/commands.rs:30`, `:597` — variante `Command::SetImageParams { id: String, params: ImageParamsInput, matrix: Transform }` ; bras vers `image::cmd_set_image_params(doc: &mut Document, id: &str, p: &ImageParamsInput, m: &Transform) -> Result<Change, CommandError>` (module neuf `image.rs`, patron `fill.rs`) (étendre).
- Réutilise : `crates/roomboard-core/src/commands.rs:467` — `valid_matrix(m: &Transform) -> bool` (réutiliser).
- Réutilise : `crates/roomboard-core/src/copy.rs:62` — `copy_elements(...)` inchangé, appelé par `Document::extract` et `insert_fragment` dans `copy_keeps_image_params` (réutiliser).
- Réutilise : `crates/roomboard-core/src/commands.rs:2766` — modèle `image_and_backdrop_reload_keep_bytes` pour `image_params_reload_keep_bytes` (réutiliser).

**Patron à ne pas reprendre (concepteur-critique) :** réécrire tous les champs à chaque commande (comme `cmd_set_backdrop`, `crates/roomboard-core/src/commands.rs:1007-1018`, qui remplace tout le `Y.Map`) : chaque validation grossirait le document et changerait les octets d'un champ inchangé ; et comparer l'état voulu à des champs bruts (un champ illisible ou égal au neutre resterait). Chemin de référence : plan d'écritures calculé sous une lecture fermée puis au plus une transaction, comme `cmd_fill` (`crates/roomboard-core/src/fill.rs:44-110`) ; comparaison sur l'état **lu et normalisé** (`ImageView::params()`), retrait d'un champ présent dès que le voulu est neutre.

**Test et commande bornée :**
- `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20` → 12 lignes `test image::tests::… ok` dont `set_image_params_is_one_step_and_reads_back`, `same_state_and_matrix_is_no_step`, `neutral_state_removes_every_field_even_unreadable`, `rejects_out_of_domain_without_transaction`, `bad_image_params_message_is_readable`, `image_params_reload_keep_bytes`, `copy_keeps_image_params` ; `test result: ok. 12 passed`.
- Tests à garder verts : `cd <worktree> && cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -20` → aucune ligne `FAILED` (dont `commands::tests::image_and_backdrop_reload_keep_bytes`, `compat_c5`, `pot.rs`).

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC4 Un `.roomboard` d'avant C5 s'ouvre toujours : fixture `crates/roomboard-core/tests/fixtures/image-c2.roomboard` écrite par T1 avec le code de `main`, jamais régénérée ensuite ; l'aller-retour enregistrer/rouvrir garde les réglages et les octets.
- GC7 Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&`.

**Interdits :** recopier dans le cœur la géométrie d'affichage (DAI1 : la matrice arrive toute faite) ; toucher `copy.rs` (la recopie profonde garde déjà les champs) ; toucher `cmd_add_image`.

**Terminé quand :** 12 tests `image::` verts, aucun `FAILED` dans `cargo test -p roomboard-core`, clippy sans avertissement.

**Rapport :** sha ; sorties bornées ; une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` pour chacune des quatre lignes « Réutilise ».

- [ ] **Étape 1 : imports de `image.rs`**

`crates/roomboard-core/src/image.rs`, remplacer les deux lignes d'import du haut par :

```rust
use yrs::{Any, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::commands::{valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{any_f64, out_f64, out_string, read_image, transform_to_any, Transform};
```

- [ ] **Étape 2 : écrire les tests (rouges)**

Dans `mod tests` de `image.rs`, remplacer la ligne `use crate::commands::Command;` par `use crate::commands::tests::writes;` suivi de `use crate::commands::{Change, Command, CommandError};`, ajouter `use crate::element::StrokeStyle;`, puis ajouter à la fin du module :

```rust
    fn white_input(contiguous: bool) -> TransparentInput {
        TransparentInput {
            color: "#ffffff".into(),
            tolerance: 10.0,
            soft: 0.0,
            contiguous,
        }
    }

    fn full_input() -> ImageParamsInput {
        ImageParamsInput {
            crop: Some([10.0, 20.0, 300.0, 200.0]),
            flip_x: true,
            flip_y: false,
            quarter_turns: 1.0,
            brightness: 30.0,
            contrast: -20.0,
            transparent: Some(white_input(true)),
        }
    }

    fn set(
        d: &mut Document,
        id: &str,
        params: ImageParamsInput,
        matrix: Transform,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetImageParams {
            id: id.into(),
            params,
            matrix,
        })
    }

    const KEYS: [&str; 7] = [
        "crop",
        "flipX",
        "flipY",
        "quarterTurns",
        "brightness",
        "contrast",
        "transparent",
    ];

    /// Champs de réglage présents dans le `Y.Map` de l'élément, lus ou non.
    fn present(d: &Document, id: &str) -> Vec<&'static str> {
        let txn = d.read();
        let e = d.find_element(&txn, id).expect("élément").element;
        KEYS.into_iter().filter(|k| e.get(&txn, k).is_some()).collect()
    }

    #[test]
    fn set_image_params_is_one_step_and_reads_back() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let c = set(&mut d, &id, full_input(), [1.0, 0.0, 0.0, 1.0, 5.0, 6.0]).expect("réglages");
        assert_eq!((c.pages, c.ids), (vec![p], vec![id.clone()]));
        let v = d.element(&id).expect("vue");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 5.0, 6.0]);
        assert_eq!(
            v.image.map(|i| i.params()),
            Some(ImageParams {
                crop: Some([10, 20, 300, 200]),
                flip_x: true,
                flip_y: false,
                quarter_turns: 1,
                brightness: 30,
                contrast: -20,
                transparent: Some(TransparentView {
                    color: "#ffffff".into(),
                    tolerance: 10,
                    soft: 0,
                    contiguous: true,
                }),
            })
        );
        assert!(d.undo());
        let v = d.element(&id).expect("vue");
        assert_eq!(
            (v.transform, v.image.map(|i| i.params())),
            (IDENTITY, Some(ImageParams::default()))
        );
        assert!(d.can_undo(), "reste l'ajout de l'image : une seule étape pour les réglages");
        assert!(d.undo());
        assert!(!d.can_undo());
    }

    #[test]
    fn same_state_and_matrix_is_no_step() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let w = writes(&d);
        let neutral = ImageParamsInput {
            crop: Some([0.0, 0.0, 640.0, 480.0]),
            ..ImageParamsInput::default()
        };
        assert_eq!(set(&mut d, &id, neutral, IDENTITY).expect("neutre").ids, Vec::<String>::new());
        assert_eq!(w.since(), 0, "état neutre sur une image brute : aucune transaction");
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        let n = w.since();
        assert_eq!(set(&mut d, &id, full_input(), IDENTITY).expect("même état").ids, Vec::<String>::new());
        assert_eq!(w.since(), n, "même état, même matrice : aucune transaction");
        let moved = set(&mut d, &id, full_input(), [1.0, 0.0, 0.0, 1.0, 1.0, 0.0]).expect("matrice seule");
        assert_eq!(moved.ids, vec![id]);
    }

    /// Review Focus 4 : « Rétablir l'original » (état neutre) retire chaque champ, illisible compris.
    #[test]
    fn neutral_state_removes_every_field_even_unreadable() {
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        assert_eq!(
            present(&d, &id),
            vec!["crop", "flipX", "quarterTurns", "brightness", "contrast", "transparent"]
        );
        put(&d, &id, "flipY", In::from("illisible"));
        set(&mut d, &id, ImageParamsInput::default(), IDENTITY).expect("rétablir");
        assert_eq!(present(&d, &id), Vec::<&str>::new());
    }

    #[test]
    fn rejects_out_of_domain_without_transaction() {
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        let stroke = d
            .apply(Command::CommitStroke {
                page: p,
                points: vec![0.0, 0.0, 0.5, 50.0, 0.0, 0.5, 100.0, 0.0, 0.5],
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
            })
            .expect("trait")
            .ids[0]
            .clone();
        let w = writes(&d);
        let color = |f: fn(&mut TransparentInput)| {
            let mut t = white_input(true);
            f(&mut t);
            ImageParamsInput {
                transparent: Some(t),
                ..ImageParamsInput::default()
            }
        };
        let base = ImageParamsInput::default;
        let bad = [
            ImageParamsInput { crop: Some([600.0, 0.0, 100.0, 10.0]), ..base() },
            ImageParamsInput { crop: Some([0.0, 0.0, 0.0, 10.0]), ..base() },
            ImageParamsInput { crop: Some([0.5, 0.0, 10.0, 10.0]), ..base() },
            ImageParamsInput { quarter_turns: 4.0, ..base() },
            ImageParamsInput { quarter_turns: 1.5, ..base() },
            ImageParamsInput { brightness: 101.0, ..base() },
            ImageParamsInput { contrast: -101.0, ..base() },
            ImageParamsInput { brightness: f64::NAN, ..base() },
            color(|t| t.color = "#FFFFFF".into()),
            color(|t| t.color = "white".into()),
            color(|t| t.tolerance = 101.0),
            color(|t| t.soft = -1.0),
        ];
        for params in bad {
            assert_eq!(
                set(&mut d, &id, params.clone(), IDENTITY),
                Err(CommandError::BadImageParams),
                "{params:?}"
            );
        }
        assert_eq!(
            set(&mut d, &id, ImageParamsInput { brightness: 101.0, ..base() }, [0.0; 6]),
            Err(CommandError::BadImageParams),
            "réglages contrôlés avant la matrice"
        );
        assert_eq!(set(&mut d, &id, base(), [0.0; 6]), Err(CommandError::BadMatrix));
        assert_eq!(
            set(&mut d, "nulle-part", base(), IDENTITY),
            Err(CommandError::UnknownElement("nulle-part".into()))
        );
        assert_eq!(set(&mut d, &stroke, base(), IDENTITY), Err(CommandError::BadImageParams));
        assert_eq!(w.since(), 0);
    }

    #[test]
    fn bad_image_params_message_is_readable() {
        assert!(CommandError::BadImageParams
            .to_string()
            .starts_with("réglages d'image invalides"));
    }

    /// I2, S4 : rognage en `Any::Array`, couleur en `Y.Map` ; trente rechargements gardent les octets.
    #[test]
    fn image_params_reload_keep_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let (_, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), [2.0, 0.0, 0.0, 1.0, 5.0, 6.0]).expect("réglages");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
            assert_eq!(r.element(&id).and_then(|e| e.image), d.element(&id).and_then(|e| e.image));
        }
    }

    /// Effet de bord : copier, coller et `.rbitem` gardent les réglages (recopie profonde, `copy.rs:62`).
    #[test]
    fn copy_keeps_image_params() {
        use crate::format::{load_fragment, save_fragment, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let (p, id) = add(&mut d, 640.0, 480.0, IDENTITY);
        set(&mut d, &id, full_input(), IDENTITY).expect("réglages");
        let want = d.element(&id).and_then(|e| e.image);
        let f = d.extract(&p, &[id.clone()]).expect("extract");
        let fid = f.element_ids(&f.page_ids()[0])[0].clone();
        assert_eq!(f.element(&fid).and_then(|e| e.image), want);
        let mut t = Document::blank();
        let tp = t.page_ids()[0].clone();
        let pasted = t.insert_fragment(&f, &tp, 10.0, 0.0).expect("collage").ids[0].clone();
        assert_eq!(t.element(&pasted).and_then(|e| e.image), want);
        let (r, _) = load_fragment(&save_fragment(&f, &meta, "image").expect("rbitem")).expect("relu");
        let rid = r.element_ids(&r.page_ids()[0])[0].clone();
        assert_eq!(r.element(&rid).and_then(|e| e.image), want);
    }
```

Run : `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20`
Attendu : `error[E0599]`/`error[E0422]` (`SetImageParams`, `ImageParamsInput`, `BadImageParams` absents).

- [ ] **Étape 3 : `ImageParamsInput`, `normalize`, `plan`, la commande**

Ajouter dans `image.rs`, juste avant `pub(crate) fn is_zero_u8` :

```rust
/// Réglages demandés par `SetImageParams` (I6) : état voulu complet, valeurs brutes de la liaison (nombres de JS),
/// contrôlées par `normalize` (I5). `crop: None` : aucun rognage ; `transparent: None` : aucune couleur transparente.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct ImageParamsInput {
    pub crop: Option<[f64; 4]>,
    pub flip_x: bool,
    pub flip_y: bool,
    pub quarter_turns: f64,
    pub brightness: f64,
    pub contrast: f64,
    pub transparent: Option<TransparentInput>,
}

/// Domaine de I5, neutres normalisés (I4) ; `None` hors domaine. Mêmes règles que la lecture (`read_params`).
pub(crate) fn normalize(p: &ImageParamsInput, w: f64, h: f64) -> Option<ImageParams> {
    Some(ImageParams {
        crop: match p.crop {
            None => None,
            Some(c) => crop_of(c, w, h)?,
        },
        flip_x: p.flip_x,
        flip_y: p.flip_y,
        quarter_turns: int_in(p.quarter_turns, 0.0, 3.0)? as u8,
        brightness: int_in(p.brightness, -100.0, 100.0)? as i8,
        contrast: int_in(p.contrast, -100.0, 100.0)? as i8,
        transparent: match &p.transparent {
            None => None,
            Some(t) => Some(transparent_of(t)?),
        },
    })
}

/// `transparent` en `Y.Map` de champs scalaires (I2, comme `backdrop`).
fn transparent_prelim(t: &TransparentView) -> In {
    In::Map(MapPrelim::from([
        ("color", In::from(t.color.as_str())),
        ("tolerance", In::Any(Any::from(f64::from(t.tolerance)))),
        ("soft", In::Any(Any::from(f64::from(t.soft)))),
        ("contiguous", In::Any(Any::Bool(t.contiguous))),
    ]))
}

/// Écritures du passage de `cur` (lu, normalisé) à `next` : seuls les champs qui changent ; voulu neutre = champ retiré
/// s'il est présent, même illisible (I4) ; `None` = retrait.
fn plan<T: ReadTxn>(txn: &T, e: &MapRef, cur: &ImageParams, next: &ImageParams) -> Vec<(&'static str, Option<In>)> {
    let num = |v: f64| In::Any(Any::from(v));
    let wanted: [(&'static str, bool, Option<In>); 7] = [
        (
            "crop",
            cur.crop == next.crop,
            next.crop.map(|c| {
                In::Any(Any::Array(
                    c.iter().map(|v| Any::from(f64::from(*v))).collect::<Vec<Any>>().into(),
                ))
            }),
        ),
        ("flipX", cur.flip_x == next.flip_x, next.flip_x.then_some(In::Any(Any::Bool(true)))),
        ("flipY", cur.flip_y == next.flip_y, next.flip_y.then_some(In::Any(Any::Bool(true)))),
        (
            "quarterTurns",
            cur.quarter_turns == next.quarter_turns,
            (next.quarter_turns != 0).then(|| num(f64::from(next.quarter_turns))),
        ),
        (
            "brightness",
            cur.brightness == next.brightness,
            (next.brightness != 0).then(|| num(f64::from(next.brightness))),
        ),
        (
            "contrast",
            cur.contrast == next.contrast,
            (next.contrast != 0).then(|| num(f64::from(next.contrast))),
        ),
        (
            "transparent",
            cur.transparent == next.transparent,
            next.transparent.as_ref().map(transparent_prelim),
        ),
    ];
    wanted
        .into_iter()
        .filter_map(|(key, same, want)| match want {
            None if e.get(txn, key).is_some() => Some((key, None)),
            Some(v) if !same => Some((key, Some(v))),
            _ => None,
        })
        .collect()
}

impl Document {
    /// `SetImageParams` (I6) : refus dans l'ordre id inconnu, cible qui n'est pas une image lisible, réglages hors
    /// domaine, matrice ; plan sous une lecture fermée, puis au plus une transaction (une étape) ; aucun champ à écrire
    /// et même matrice : aucune (D38).
    pub(crate) fn cmd_set_image_params(
        &mut self,
        id: &str,
        p: &ImageParamsInput,
        m: &Transform,
    ) -> Result<Change, CommandError> {
        let (element, page, transform, ops) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (transform, view) =
                read_image(&txn, &found.element).ok_or(CommandError::BadImageParams)?;
            let next = normalize(p, view.w, view.h).ok_or(CommandError::BadImageParams)?;
            if !valid_matrix(m) {
                return Err(CommandError::BadMatrix);
            }
            let ops = plan(&txn, &found.element, &view.params(), &next);
            (found.element, found.page_id, transform, ops)
        };
        if ops.is_empty() && *m == transform {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (key, v) in ops {
                match v {
                    Some(v) => {
                        element.insert(&mut txn, key, v);
                    }
                    None => {
                        element.remove(&mut txn, key);
                    }
                }
            }
            if *m != transform {
                element.insert(&mut txn, "transform", transform_to_any(m));
            }
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
}
```

- [ ] **Étape 4 : la variante, l'erreur, le bras d'`apply`**

`crates/roomboard-core/src/commands.rs` :

1. Dans `enum Command`, après la variante `Fill { … },` (avant l'accolade fermante de l'enum), ajouter :

```rust
    /// Réglages d'une image (C5, U29, I6) : état voulu complet, remplacé en bloc, et nouvelle matrice de l'élément
    /// (placement calculé par la page, I9, DAI1) ; une transaction, une étape ; même état et même matrice : aucune (D38).
    SetImageParams {
        id: String,
        params: crate::image::ImageParamsInput,
        matrix: Transform,
    },
```

2. Dans `enum CommandError`, après `BadGroup,` ajouter `BadImageParams,`.

3. Dans `impl std::fmt::Display for CommandError`, après le bras `CommandError::BadFill => write!(…),` ajouter :

```rust
            CommandError::BadImageParams => write!(
                f,
                "réglages d'image invalides (image lisible, rognage entier dans l'image, quarts de tour 0 à 3, luminosité et contraste entiers de -100 à 100, couleur #rrggbb, tolérance et plume entières de 0 à 100 attendus)"
            ),
```

4. Dans `apply`, après le bras `Command::Fill { page, target, color } => self.cmd_fill(&page, &target, color.as_deref()),` ajouter :

```rust
            Command::SetImageParams { id, params, matrix } => {
                self.cmd_set_image_params(&id, &params, &matrix)
            }
```

- [ ] **Étape 5 : vert**

Run : `cd <worktree> && cargo test -p roomboard-core --lib image:: 2>&1 | tail -20`
Attendu : `test result: ok. 12 passed`, les sept noms neufs présents.

- [ ] **Étape 6 : tests à garder verts, format, lint**

Run : `cd <worktree> && cargo test -p roomboard-core 2>&1 | grep -E "test result|FAILED" | tail -20 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -20`
Attendu : aucune ligne `FAILED`, aucun `warning:`.

- [ ] **Étape 7 : commit**

```bash
cd <worktree> && git add crates/roomboard-core/src/image.rs crates/roomboard-core/src/commands.rs && git commit -m "feat(core): add SetImageParams command with neutral fields removed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T4 — Liaison du module principal

<a id="tache-t4"></a>

**Objectif :** exposer `SetImageParams` à la page par `Document.set_image_params(…)` (patron `add_image`), une méthode `_inner` sans `JsValue` testée en natif, et mesurer le module principal avant/après (H2-13).

**Fichiers :**
- Modifier : `crates/roomboard-wasm/src/lib.rs` — imports (l. 8-22), après `asset_ref` (l. 107-114), après `add_image` (l. 562-580), après `add_image_inner` (l. 1156-1171), tests C2 (après `add_image_inner_reads_back_image_and_meta`, l. 1947-1960).

**Interfaces :**
- Consomme (T3) : `roomboard_core::image::{ImageParamsInput, TransparentInput}`, `Command::SetImageParams { id, params, matrix }`, `CommandError::BadImageParams`.
- Produit (lu par T7, `apps/web/src/wasm/roomboard_wasm.d.ts` généré) :
  - `#[wasm_bindgen] Document::set_image_params(&mut self, id: &str, crop: &[f64], flip_x: bool, flip_y: bool, quarter_turns: f64, brightness: f64, contrast: f64, color: Option<String>, transparent: &[f64], matrix: &[f64]) -> Result<JsValue, JsError>` (rend un `Change`) ; côté JS : `set_image_params(id: string, crop: Float64Array, flip_x: boolean, flip_y: boolean, quarter_turns: number, brightness: number, contrast: number, color: string | null | undefined, transparent: Float64Array, matrix: Float64Array): any` ;
  - `crop` vide = aucun rognage, sinon `[x, y, w, h]` ; `color` absente = aucune couleur transparente, sinon `transparent = [tolérance, plume, contigu (0 ou 1)]` ; toute autre forme : `BadImageParams` ;
  - `pub fn set_image_params_inner(&mut self, id: &str, params: ImageParamsInput, matrix: &[f64]) -> Result<Change, CommandError>` ;
  - `fn image_params_input(crop: &[f64], flip_x: bool, flip_y: bool, quarter_turns: f64, brightness: f64, contrast: f64, color: Option<String>, transparent: &[f64]) -> Result<ImageParamsInput, CommandError>`.
- Réutilise : `crates/roomboard-wasm/src/lib.rs:528` — `set_image_params(...)` + `set_image_params_inner` (patron `add_image`, `add_image_inner` `:1156`) (étendre).

**Test et commande bornée :**
- `cd <worktree> && cargo test -p roomboard-wasm image_params 2>&1 | tail -20` → `test tests::set_image_params_inner_writes_and_reads_back ... ok`, `test tests::image_params_input_refuses_bad_shapes ... ok`, `test result: ok. 2 passed`.
- Taille (GC2) : commande de l'étape 1 avant la modification, de l'étape 6 après ; les deux nombres dans le rapport, le second ≤ 1 572 864.

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC2 Module Wasm principal ≤ 1 572 864 octets (H2-13), module `formats` ≤ 3 Mio (3 145 728 octets) ; aucun seuil baissé ni relevé dans `scripts/verifier.sh` ; tailles écrites avant/après dans le rapport (référence `main` @ 0dd7f1a : principal 1 080 736 o, `formats` 859 580 o).
- GC7 Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&`.

**Interdits :** ajouter au module principal une fonction de pixels ; commiter `apps/web/src/wasm/` (ignoré par git).

**Terminé quand :** 2 tests verts, clippy sans avertissement, taille après ≤ 1 572 864 octets.

**Rapport :** sha ; sortie bornée ; « module principal : <avant> o → <après> o » ; `Réutilisation : appelé crates/roomboard-wasm/src/lib.rs:528 (patron add_image)` ou écart.

- [ ] **Étape 1 : taille avant**

Run : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && wasm-bindgen --target web --remove-name-section --out-dir /tmp/c5-t4-avant target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c < /tmp/c5-t4-avant/roomboard_wasm_bg.wasm`
Attendu : un nombre (≈ 1 08x xxx) ; le noter.

- [ ] **Étape 2 : tests (rouges)**

Après le test `add_image_inner_reads_back_image_and_meta` du module `tests`, ajouter :

```rust
    // C5 (I6) : réglages d'image par leur `_inner`.

    #[test]
    fn set_image_params_inner_writes_and_reads_back() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .add_image_inner(&p, png(), [640.0, 480.0], &[1.0, 0.0, 0.0, 1.0, 0.0, 0.0])
            .expect("image")
            .ids[0]
            .clone();
        let params = image_params_input(
            &[0.0, 0.0, 320.0, 240.0],
            true,
            false,
            1.0,
            10.0,
            -10.0,
            Some("#ffffff".into()),
            &[10.0, 5.0, 1.0],
        )
        .expect("entrée");
        let c = d
            .set_image_params_inner(&id, params, &[1.0, 0.0, 0.0, 1.0, 5.0, 6.0])
            .expect("réglages");
        assert_eq!(c.ids, vec![id.clone()]);
        let i = d.core.element(&id).and_then(|e| e.image).expect("image");
        assert_eq!(
            (i.crop, i.flip_x, i.quarter_turns, i.brightness, i.contrast),
            (Some([0, 0, 320, 240]), true, 1, 10, -10)
        );
        assert_eq!(
            i.transparent.map(|t| (t.color, t.tolerance, t.soft, t.contiguous)),
            Some(("#ffffff".to_string(), 10, 5, true))
        );
        assert_eq!(
            d.set_image_params_inner(&id, ImageParamsInput::default(), &[1.0, 0.0]),
            Err(CommandError::BadMatrix)
        );
    }

    #[test]
    fn image_params_input_refuses_bad_shapes() {
        let none: &[f64] = &[];
        assert_eq!(
            image_params_input(&[1.0, 2.0], false, false, 0.0, 0.0, 0.0, None, none),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(none, false, false, 0.0, 0.0, 0.0, Some("#ffffff".into()), &[10.0]),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(none, false, false, 0.0, 0.0, 0.0, None, &[10.0, 0.0, 1.0]),
            Err(CommandError::BadImageParams)
        );
        assert_eq!(
            image_params_input(none, false, false, 0.0, 0.0, 0.0, None, none),
            Ok(ImageParamsInput::default())
        );
    }
```

Run : `cd <worktree> && cargo test -p roomboard-wasm image_params 2>&1 | tail -20`
Attendu : `error[E0425]` / `error[E0599]` (`image_params_input`, `set_image_params_inner` absents).

- [ ] **Étape 3 : import**

Après `use roomboard_core::grid::{GridInput, GridLevelView, GridLines};` ajouter :

```rust
use roomboard_core::image::{ImageParamsInput, TransparentInput};
```

- [ ] **Étape 4 : conversion des arguments, après `asset_ref`**

```rust
/// Réglages d'image reçus de JS (C5, I6) : `crop` vide ou `[x, y, w, h]` ; `color` absente avec `transparent` vide, ou
/// présente avec `[tolérance, plume, contigu (0 ou 1)]` ; toute autre forme : `BadImageParams`. Les valeurs sont
/// contrôlées par le cœur.
#[allow(clippy::too_many_arguments)]
fn image_params_input(
    crop: &[f64],
    flip_x: bool,
    flip_y: bool,
    quarter_turns: f64,
    brightness: f64,
    contrast: f64,
    color: Option<String>,
    transparent: &[f64],
) -> Result<ImageParamsInput, CommandError> {
    let crop = match crop {
        [] => None,
        [x, y, w, h] => Some([*x, *y, *w, *h]),
        _ => return Err(CommandError::BadImageParams),
    };
    let transparent = match (color, transparent) {
        (None, []) => None,
        (Some(color), [tolerance, soft, contiguous]) => Some(TransparentInput {
            color,
            tolerance: *tolerance,
            soft: *soft,
            contiguous: *contiguous != 0.0,
        }),
        _ => return Err(CommandError::BadImageParams),
    };
    Ok(ImageParamsInput {
        crop,
        flip_x,
        flip_y,
        quarter_turns,
        brightness,
        contrast,
        transparent,
    })
}
```

- [ ] **Étape 5 : méthodes exposée et `_inner`**

Dans le bloc `#[wasm_bindgen] impl Document`, juste après la méthode `add_image` (avant `set_backdrop`) :

```rust
    /// Réglages d'une image (C5, I6) : état voulu complet et nouvelle matrice ; voir `image_params_input` pour la forme
    /// de `crop`, `color` et `transparent`.
    #[allow(clippy::too_many_arguments)]
    pub fn set_image_params(
        &mut self,
        id: &str,
        crop: &[f64],
        flip_x: bool,
        flip_y: bool,
        quarter_turns: f64,
        brightness: f64,
        contrast: f64,
        color: Option<String>,
        transparent: &[f64],
        matrix: &[f64],
    ) -> Result<JsValue, JsError> {
        let params = image_params_input(
            crop,
            flip_x,
            flip_y,
            quarter_turns,
            brightness,
            contrast,
            color,
            transparent,
        )
        .map_err(cmd_err)?;
        to_js(&self.set_image_params_inner(id, params, matrix).map_err(cmd_err)?)
    }
```

Dans le bloc `impl Document` des `_inner`, juste après `add_image_inner` :

```rust
    pub fn set_image_params_inner(
        &mut self,
        id: &str,
        params: ImageParamsInput,
        matrix: &[f64],
    ) -> Result<Change, CommandError> {
        let m: Transform = matrix.try_into().map_err(|_| CommandError::BadMatrix)?;
        self.run(Command::SetImageParams {
            id: id.to_string(),
            params,
            matrix: m,
        })
    }
```

- [ ] **Étape 6 : vert, lint, taille après**

Run : `cd <worktree> && cargo test -p roomboard-wasm image_params 2>&1 | tail -20 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -20`
Attendu : `test result: ok. 2 passed`, aucun `warning:`.

Run : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && wc -c < apps/web/src/wasm/roomboard_wasm_bg.wasm && grep -c "set_image_params" apps/web/src/wasm/roomboard_wasm.d.ts`
Attendu : taille ≤ 1 572 864 ; `set_image_params` présent dans le `.d.ts` (≥ 1).

- [ ] **Étape 7 : commit**

```bash
cd <worktree> && git add crates/roomboard-wasm/src/lib.rs && git commit -m "feat(wasm): expose set_image_params to the page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T5 — Fonctions de pixels (Rust)

<a id="tache-t5"></a>

**Objectif :** fonctions pures de pixels RGBA dans `roomboard-formats` (U30, I12-I17, DAI2), aucune crate ajoutée : couleur rendue transparente (tolérance par canal, plume, contigu depuis les bords ou global), luminosité et contraste (alpha gardé), pot sur pixels prêt pour C6b ; exposées sans état par `roomboard-formats-wasm`, chacune par une `_inner` testée en natif.

**Fichiers :**
- Créer : `crates/roomboard-formats/src/pixels.rs`
- Modifier : `crates/roomboard-formats/src/lib.rs:1-4` ; `crates/roomboard-formats-wasm/src/lib.rs` (en-tête l. 1-7, fonctions après `write_container`, tests en fin de module).

**Interfaces :**
- Produit (`roomboard_formats::pixels`) :
  - `pub struct Transparent { pub rgb: [u8; 3], pub tolerance: u8, pub soft: u8, pub contiguous: bool }` ;
  - `pub enum PixelError { BadSize }`, `Display` : `pixels incohérents (4 × largeur × hauteur octets attendus)` ;
  - `pub fn transparent_color(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), PixelError>` ;
  - `pub fn adjust(px: &mut [u8], brightness: i8, contrast: i8)` ;
  - `pub fn flood_fill(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, rgb: [u8; 3]) -> Result<(), PixelError>` (graine hors de l'image : rien ne change) ;
  - `fn flood_region(px: &[u8], w: u32, h: u32, starts: &[(u32, u32)], target: [u8; 3], limit: u8) -> Vec<bool>` (privée, partagée).
- Produit (`roomboard_formats_wasm`, lu par T8 dans `PixelFormatsBinding`) : `image_transparent(px: &mut [u8], w: u32, h: u32, r: u8, g: u8, b: u8, tolerance: u8, soft: u8, contiguous: bool) -> Result<(), JsError>` ; `image_adjust(px: &mut [u8], brightness: i8, contrast: i8)` ; `image_flood_fill(px: &mut [u8], w: u32, h: u32, x: u32, y: u32, tolerance: u8, r: u8, g: u8, b: u8) -> Result<(), JsError>` ; `pub fn image_transparent_inner(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), String>`, `pub fn image_adjust_inner(px: &mut [u8], brightness: i8, contrast: i8)`, `pub fn image_flood_fill_inner(px: &mut [u8], w: u32, h: u32, seed: (u32, u32), tolerance: u8, rgb: [u8; 3]) -> Result<(), String>`.
- Formules (cadrage, recopiées) : écart `d` = `max(|ΔR|, |ΔG|, |ΔB|)` ; pixel retenu si `d × 100 ≤ tolérance × 255` (I12) ; alpha 0 jusqu'à `tolerance`, inchangé dès `tolerance + soft`, entre les deux `alpha × (d − tolerance) / soft` (I13, échelle 0-100) ; contigu : diffusion 4-connexe depuis tous les pixels du bord dont l'écart à `color` est ≤ `tolerance + soft` (I14) ; `v' = clamp((v − 128) × (1 + contrast / 100) + 128 + brightness × 2,55)`, arrondi, alpha gardé (I15).
- Réutilise : aucun module existant (termes `flood`, `toler`, `pixel`, `rgba` : rien dans `crates/`) — `crates/roomboard-formats/src/pixels.rs`, DAI2 (nouveau module).
- Réutilise : `crates/roomboard-formats-wasm/src/lib.rs:1-4` — patron `_inner` sans `JsValue` : `image_transparent`, `image_adjust`, `image_flood_fill` (étendre).

**Test et commande bornée :**
- `cd <worktree> && cargo test -p roomboard-formats --lib pixels:: 2>&1 | tail -20` → 11 lignes `test pixels::tests::… ok` (noms à l'étape 2), `test result: ok. 11 passed`.
- `cd <worktree> && cargo test -p roomboard-formats-wasm image_ 2>&1 | tail -20` → `test result: ok. 2 passed`.
- Tests à garder verts : `cd <worktree> && cargo test -p roomboard-formats 2>&1 | grep -E "test result|FAILED" | tail -20` (couvre `tests/container.rs`, `tests/scenarios.rs`) → aucune ligne `FAILED`.
- Taille (GC2) : étapes 1 et 7.

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC2 Module Wasm principal ≤ 1 572 864 octets (H2-13), module `formats` ≤ 3 Mio (3 145 728 octets) ; aucun seuil baissé ni relevé dans `scripts/verifier.sh` ; tailles écrites avant/après dans le rapport (référence `main` @ 0dd7f1a : principal 1 080 736 o, `formats` 859 580 o).
- GC5 Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- GC7 Preuves bornées : `cargo test -p <crate> … 2>&1 | tail -20`. Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&`.

**Interdits :** toucher `crates/roomboard-formats/Cargo.toml` (aucune crate ajoutée) ; une classe ou un état dans la liaison (fonctions libres seulement) ; toucher `container.rs`, `sheet.rs`.

**Terminé quand :** 11 + 2 tests verts, aucun `FAILED` dans `roomboard-formats`, clippy sans avertissement, taille `formats` après ≤ 3 145 728.

**Rapport :** sha ; sorties bornées ; « module formats : <avant> o → <après> o » ; `Réutilisation : écart — aucun module existant (nouveau pixels.rs, DAI2)` et `Réutilisation : appelé crates/roomboard-formats-wasm/src/lib.rs (patron _inner)`.

- [ ] **Étape 1 : taille avant**

Run : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && wasm-bindgen --target web --remove-name-section --out-dir /tmp/c5-t5-avant target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < /tmp/c5-t5-avant/roomboard_formats_wasm_bg.wasm`
Attendu : un nombre (≈ 859 580) ; le noter.

- [ ] **Étape 2 : écrire `pixels.rs` avec ses tests**

`crates/roomboard-formats/src/pixels.rs` :

```rust
//! Calculs de pixels des images (C5, U30, DAI2) : couleur rendue transparente (tolérance par canal, plume, contigu ou
//! global), luminosité et contraste, pot sur pixels (prêt pour C6b). RGBA 8 bits, `4 × w × h` octets, modifiés sur place ;
//! Rust pur, aucune crate d'image ; servis par `roomboard-formats-wasm` au Worker de pixels de la page (I17, I18).

/// Couleur à rendre transparente (I12-I14) : écart par canal RVB (échelle 0 à 100), rampe d'alpha de largeur `soft` ;
/// `contiguous` : diffusion depuis les bords de l'image, sinon tout pixel de l'image.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Transparent {
    pub rgb: [u8; 3],
    pub tolerance: u8,
    pub soft: u8,
    pub contiguous: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PixelError {
    /// `px.len()` différent de `4 × w × h`.
    BadSize,
}

impl std::fmt::Display for PixelError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PixelError::BadSize => {
                write!(f, "pixels incohérents (4 × largeur × hauteur octets attendus)")
            }
        }
    }
}

impl std::error::Error for PixelError {}

fn check(px: &[u8], w: u32, h: u32) -> Result<(), PixelError> {
    if px.len() as u64 == 4 * u64::from(w) * u64::from(h) {
        Ok(())
    } else {
        Err(PixelError::BadSize)
    }
}

/// Plus grand écart par canal RVB entre le pixel `p` (4 octets) et `rgb`, × 100 : comparé à un seuil × 255 (I12).
fn gap100(p: &[u8], rgb: [u8; 3]) -> u32 {
    p[..3]
        .iter()
        .zip(rgb)
        .map(|(a, b)| u32::from(a.abs_diff(b)))
        .max()
        .unwrap_or(0)
        * 100
}

/// Pixels joints (4-connexes, comme ActCraft `imagefill.cpp:40-42`) aux départs `starts` dont l'écart à `target` reste
/// ≤ `limit` (échelle 0 à 200) ; un départ hors de l'image ou trop loin de `target` est ignoré. Partagé par
/// `flood_fill` (un départ, couleur de la graine) et le mode contigu (départs du bord, couleur choisie).
fn flood_region(px: &[u8], w: u32, h: u32, starts: &[(u32, u32)], target: [u8; 3], limit: u8) -> Vec<bool> {
    let (w, h) = (w as usize, h as usize);
    let max = u32::from(limit) * 255;
    let near = |i: usize| gap100(&px[4 * i..4 * i + 4], target) <= max;
    let mut seen = vec![false; w * h];
    let mut stack: Vec<usize> = Vec::new();
    for &(x, y) in starts {
        let (x, y) = (x as usize, y as usize);
        if x >= w || y >= h {
            continue;
        }
        let i = y * w + x;
        if !seen[i] && near(i) {
            seen[i] = true;
            stack.push(i);
        }
    }
    while let Some(i) = stack.pop() {
        let (x, y) = (i % w, i / w);
        // Voisins 4-connexes ; `usize::MAX` = hors de l'image.
        let mut next = [usize::MAX; 4];
        if x > 0 {
            next[0] = i - 1;
        }
        if x + 1 < w {
            next[1] = i + 1;
        }
        if y > 0 {
            next[2] = i - w;
        }
        if y + 1 < h {
            next[3] = i + w;
        }
        for j in next {
            if j != usize::MAX && !seen[j] && near(j) {
                seen[j] = true;
                stack.push(j);
            }
        }
    }
    seen
}

/// Pixels du bord de l'image, chacun une fois (I14).
fn border(w: u32, h: u32) -> Vec<(u32, u32)> {
    let mut out = Vec::new();
    if w == 0 || h == 0 {
        return out;
    }
    for x in 0..w {
        out.push((x, 0));
        if h > 1 {
            out.push((x, h - 1));
        }
    }
    for y in 1..h.saturating_sub(1) {
        out.push((0, y));
        if w > 1 {
            out.push((w - 1, y));
        }
    }
    out
}

/// Alpha d'un pixel d'écart `g` (× 100) : 0 jusqu'à `tolerance`, inchangé dès `tolerance + soft`, rampe linéaire entre
/// les deux, arrondie (I13).
fn ramp(alpha: u8, g: u32, tolerance: u8, soft: u8) -> u8 {
    let lo = u32::from(tolerance) * 255;
    let hi = (u32::from(tolerance) + u32::from(soft)) * 255;
    if g <= lo {
        0
    } else if g >= hi {
        alpha
    } else {
        let span = hi - lo;
        ((u32::from(alpha) * (g - lo) + span / 2) / span) as u8
    }
}

/// Rend transparente la couleur `t.rgb` (I12-I14), décidée sur les couleurs d'origine ; seul l'alpha change.
pub fn transparent_color(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), PixelError> {
    check(px, w, h)?;
    let limit = t.tolerance.saturating_add(t.soft);
    let mask = t
        .contiguous
        .then(|| flood_region(px, w, h, &border(w, h), t.rgb, limit));
    for (i, p) in px.chunks_exact_mut(4).enumerate() {
        if mask.as_ref().is_some_and(|m| !m[i]) {
            continue;
        }
        p[3] = ramp(p[3], gap100(p, t.rgb), t.tolerance, t.soft);
    }
    Ok(())
}

/// Luminosité et contraste par canal, alpha gardé (I15) ; 0 et 0 : octets inchangés.
pub fn adjust(px: &mut [u8], brightness: i8, contrast: i8) {
    if brightness == 0 && contrast == 0 {
        return;
    }
    let k = 1.0 + f64::from(contrast) / 100.0;
    let b = f64::from(brightness) * 2.55;
    let lut: Vec<u8> = (0..=255u8)
        .map(|v| ((f64::from(v) - 128.0) * k + 128.0 + b).round().clamp(0.0, 255.0) as u8)
        .collect();
    for p in px.chunks_exact_mut(4) {
        for c in &mut p[..3] {
            *c = lut[usize::from(*c)];
        }
    }
}

/// Pot sur pixels (prêt pour C6b) : la zone 4-connexe de la graine (écart à la couleur de la graine ≤ `tolerance`)
/// prend `rgb`, alpha gardé ; graine hors de l'image : rien ne change (comme ActCraft).
pub fn flood_fill(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    rgb: [u8; 3],
) -> Result<(), PixelError> {
    check(px, w, h)?;
    if seed.0 >= w || seed.1 >= h {
        return Ok(());
    }
    let i = 4 * (seed.1 as usize * w as usize + seed.0 as usize);
    let target = [px[i], px[i + 1], px[i + 2]];
    let mask = flood_region(px, w, h, &[seed], target, tolerance);
    for (p, on) in px.chunks_exact_mut(4).zip(mask) {
        if on {
            p[..3].copy_from_slice(&rgb);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const WHITE: [u8; 4] = [255, 255, 255, 255];
    const RED: [u8; 4] = [220, 38, 38, 255];

    /// Image `w × h` fabriquée par `at(x, y)`.
    fn img(w: u32, h: u32, at: impl Fn(u32, u32) -> [u8; 4]) -> Vec<u8> {
        let at = &at;
        (0..h).flat_map(|y| (0..w).flat_map(move |x| at(x, y))).collect()
    }

    fn px(v: &[u8], w: u32, x: u32, y: u32) -> [u8; 4] {
        let i = 4 * (y * w + x) as usize;
        [v[i], v[i + 1], v[i + 2], v[i + 3]]
    }

    /// 20 × 20 : fond blanc, anneau carré rouge (bords 5 et 14, deux pixels d'épaisseur), intérieur blanc enfermé.
    fn ring() -> Vec<u8> {
        img(20, 20, |x, y| {
            let inside = (5..15).contains(&x) && (5..15).contains(&y);
            let hole = (7..13).contains(&x) && (7..13).contains(&y);
            if inside && !hole {
                RED
            } else {
                WHITE
            }
        })
    }

    fn white(tolerance: u8, soft: u8, contiguous: bool) -> Transparent {
        Transparent {
            rgb: [255, 255, 255],
            tolerance,
            soft,
            contiguous,
        }
    }

    #[test]
    fn global_tolerance_10_clears_background_and_enclosed_white() {
        let mut v = ring();
        transparent_color(&mut v, 20, 20, &white(10, 0, false)).expect("calcul");
        assert_eq!(px(&v, 20, 0, 0)[3], 0, "fond");
        assert_eq!(px(&v, 20, 10, 10)[3], 0, "intérieur enfermé");
        assert_eq!(px(&v, 20, 5, 10), RED, "anneau intact");
    }

    #[test]
    fn contiguous_clears_only_background_from_border() {
        let mut v = ring();
        transparent_color(&mut v, 20, 20, &white(10, 0, true)).expect("calcul");
        assert_eq!(px(&v, 20, 0, 0)[3], 0, "fond");
        assert_eq!(px(&v, 20, 19, 19)[3], 0, "fond, coin opposé");
        assert_eq!(px(&v, 20, 10, 10), WHITE, "intérieur enfermé gardé");
        assert_eq!(px(&v, 20, 5, 10), RED);
    }

    #[test]
    fn contiguous_reaches_both_halves_cut_by_a_bar_touching_two_borders() {
        let mut v = img(20, 20, |x, _| if (9..11).contains(&x) { RED } else { WHITE });
        transparent_color(&mut v, 20, 20, &white(10, 0, true)).expect("calcul");
        assert_eq!(px(&v, 20, 2, 10)[3], 0, "moitié gauche");
        assert_eq!(px(&v, 20, 17, 10)[3], 0, "moitié droite");
        assert_eq!(px(&v, 20, 9, 10), RED, "barre intacte");
    }

    #[test]
    fn soft_20_gives_light_gray_an_intermediate_alpha() {
        let mut v = img(3, 1, |x, _| match x {
            0 => WHITE,
            1 => [215, 215, 215, 255],
            _ => [0, 0, 0, 255],
        });
        transparent_color(&mut v, 3, 1, &white(10, 20, false)).expect("calcul");
        assert_eq!(px(&v, 3, 0, 0)[3], 0);
        assert_eq!(px(&v, 3, 1, 0)[3], 73, "écart 40 : 255 × (4000 − 2550) / 5100, arrondi");
        assert_eq!(px(&v, 3, 2, 0)[3], 255);
    }

    #[test]
    fn tolerance_is_per_channel() {
        let mut v = img(2, 1, |x, _| if x == 0 { [255, 255, 230, 255] } else { [255, 255, 229, 255] });
        transparent_color(&mut v, 2, 1, &white(10, 0, false)).expect("calcul");
        assert_eq!(px(&v, 2, 0, 0)[3], 0, "écart 25 : 2500 ≤ 2550");
        assert_eq!(px(&v, 2, 1, 0)[3], 255, "écart 26 : 2600 > 2550");
    }

    #[test]
    fn adjust_zero_keeps_bytes() {
        let before: Vec<u8> = (0..=255u8).cycle().take(4 * 64).collect();
        let mut v = before.clone();
        adjust(&mut v, 0, 0);
        assert_eq!(v, before);
    }

    #[test]
    fn adjust_brightness_and_contrast_formula_keeps_alpha() {
        let mut v = vec![100, 128, 0, 77];
        adjust(&mut v, 50, 0);
        assert_eq!(v, vec![228, 255, 128, 77], "100 + 127,5 arrondi ; 128 + 127,5 borné ; alpha gardé");
        let mut v = vec![100, 128, 255, 9];
        adjust(&mut v, 0, 50);
        assert_eq!(v, vec![86, 128, 255, 9], "(100 − 128) × 1,5 + 128 ; 128 fixe ; 255 borné");
    }

    #[test]
    fn flood_fill_red_from_background_tolerance_5_keeps_alpha() {
        let mut v = img(20, 20, |x, y| {
            let inside = (5..15).contains(&x) && (5..15).contains(&y);
            let hole = (7..13).contains(&x) && (7..13).contains(&y);
            if inside && !hole {
                RED
            } else {
                [255, 255, 255, 200]
            }
        });
        flood_fill(&mut v, 20, 20, (0, 0), 5, [255, 0, 0]).expect("calcul");
        assert_eq!(px(&v, 20, 0, 0), [255, 0, 0, 200], "fond rougi, alpha gardé");
        assert_eq!(px(&v, 20, 10, 10), [255, 255, 255, 200], "intérieur enfermé inchangé");
        assert_eq!(px(&v, 20, 5, 10), RED);
    }

    #[test]
    fn flood_fill_seed_outside_changes_nothing() {
        let before = ring();
        let mut v = before.clone();
        flood_fill(&mut v, 20, 20, (20, 0), 5, [0, 0, 0]).expect("calcul");
        assert_eq!(v, before);
    }

    #[test]
    fn bad_size_is_refused() {
        let mut v = vec![0u8; 3];
        assert_eq!(transparent_color(&mut v, 1, 1, &white(10, 0, false)), Err(PixelError::BadSize));
        assert_eq!(flood_fill(&mut v, 1, 1, (0, 0), 5, [0, 0, 0]), Err(PixelError::BadSize));
        assert_eq!(
            PixelError::BadSize.to_string(),
            "pixels incohérents (4 × largeur × hauteur octets attendus)"
        );
    }

    #[test]
    fn border_lists_each_edge_pixel_once() {
        let b = border(3, 3);
        assert_eq!(b.len(), 8);
        assert!(!b.contains(&(1, 1)));
        assert_eq!(border(1, 1), vec![(0, 0)]);
        assert_eq!(border(0, 5), Vec::<(u32, u32)>::new());
    }
}
```

- [ ] **Étape 3 : déclarer le module (rouge puis vert)**

Avant la déclaration, Run : `cd <worktree> && cargo test -p roomboard-formats --lib pixels:: 2>&1 | tail -20` → attendu : `running 0 tests` (module non compilé).

`crates/roomboard-formats/src/lib.rs` devient :

```rust
//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets ; première
//! feuille d'un classeur `.xlsx` en valeurs (C10b, U35) ; calculs de pixels des images (C5, U30). Rust pur, testé en
//! natif ; servis par le second module Wasm.
pub mod container;
pub mod pixels;
pub mod sheet;
```

Run : `cd <worktree> && cargo test -p roomboard-formats --lib pixels:: 2>&1 | tail -20`
Attendu : 11 lignes `test pixels::tests::… ok` (`global_tolerance_10_clears_background_and_enclosed_white`, `contiguous_clears_only_background_from_border`, `contiguous_reaches_both_halves_cut_by_a_bar_touching_two_borders`, `soft_20_gives_light_gray_an_intermediate_alpha`, `tolerance_is_per_channel`, `adjust_zero_keeps_bytes`, `adjust_brightness_and_contrast_formula_keeps_alpha`, `flood_fill_red_from_background_tolerance_5_keeps_alpha`, `flood_fill_seed_outside_changes_nothing`, `bad_size_is_refused`, `border_lists_each_edge_pixel_once`), `test result: ok. 11 passed`. Un écart de valeur (ex. alpha 73) se corrige dans le code, jamais dans l'attendu, sauf erreur d'arithmétique du plan prouvée dans le rapport.

- [ ] **Étape 4 : tests de la liaison (rouges)**

`crates/roomboard-formats-wasm/src/lib.rs`, à la fin du module `tests` :

```rust
    #[test]
    fn image_transparent_inner_clears_white_and_refuses_bad_size() {
        let t = roomboard_formats::pixels::Transparent {
            rgb: [255, 255, 255],
            tolerance: 10,
            soft: 0,
            contiguous: false,
        };
        let mut px = vec![255, 255, 255, 255, 0, 0, 0, 255];
        image_transparent_inner(&mut px, 2, 1, &t).expect("calcul");
        assert_eq!(px, vec![255, 255, 255, 0, 0, 0, 0, 255]);
        assert_eq!(
            image_transparent_inner(&mut px, 3, 1, &t),
            Err("pixels incohérents (4 × largeur × hauteur octets attendus)".to_string())
        );
    }

    #[test]
    fn image_adjust_and_flood_fill_inner() {
        let mut px = vec![100, 100, 100, 50];
        image_adjust_inner(&mut px, 50, 0);
        assert_eq!(px, vec![228, 228, 228, 50]);
        let mut px = vec![10, 10, 10, 255, 10, 10, 10, 255];
        image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, [1, 2, 3]).expect("calcul");
        assert_eq!(px, vec![1, 2, 3, 255, 1, 2, 3, 255]);
    }
```

Run : `cd <worktree> && cargo test -p roomboard-formats-wasm image_ 2>&1 | tail -20` → attendu `error[E0425]`.

- [ ] **Étape 5 : fonctions exposées**

En-tête du fichier : remplacer la première ligne du commentaire `//! Liaison wasm-bindgen du second module Wasm (R8, DAR1) : conteneur …` par la même ligne, et ajouter à la fin du bloc `//!` la ligne `//! C5 (U30, I17) : calculs de pixels sans état (`image_transparent`, `image_adjust`, `image_flood_fill`) pour le Worker de pixels.` ; ajouter l'import `use roomboard_formats::pixels::{self, Transparent};` après `use roomboard_formats::container::{self, AssetBytes};`.

Après la fonction `write_container` (avant `/// Première feuille d'un classeur …`) :

```rust
/// Couleur rendue transparente (C5, I17) : `px` RGBA modifié sur place ; le message d'erreur est le `Display` de
/// `PixelError`.
pub fn image_transparent_inner(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), String> {
    pixels::transparent_color(px, w, h, t).map_err(|e| e.to_string())
}

pub fn image_adjust_inner(px: &mut [u8], brightness: i8, contrast: i8) {
    pixels::adjust(px, brightness, contrast);
}

pub fn image_flood_fill_inner(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    rgb: [u8; 3],
) -> Result<(), String> {
    pixels::flood_fill(px, w, h, seed, tolerance, rgb).map_err(|e| e.to_string())
}

/// C5 (I17) : sans état ; `px` revient modifié côté JS (copie rendue par wasm-bindgen).
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn image_transparent(
    px: &mut [u8],
    w: u32,
    h: u32,
    r: u8,
    g: u8,
    b: u8,
    tolerance: u8,
    soft: u8,
    contiguous: bool,
) -> Result<(), JsError> {
    let t = Transparent {
        rgb: [r, g, b],
        tolerance,
        soft,
        contiguous,
    };
    image_transparent_inner(px, w, h, &t).map_err(|m| JsError::new(&m))
}

#[wasm_bindgen]
pub fn image_adjust(px: &mut [u8], brightness: i8, contrast: i8) {
    image_adjust_inner(px, brightness, contrast);
}

/// Pot sur pixels (prêt pour C6b) ; aucun appelant en C5.
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
) -> Result<(), JsError> {
    image_flood_fill_inner(px, w, h, (x, y), tolerance, [r, g, b]).map_err(|m| JsError::new(&m))
}
```

- [ ] **Étape 6 : vert et lint**

Run : `cd <worktree> && cargo test -p roomboard-formats-wasm image_ 2>&1 | tail -20 && cargo test -p roomboard-formats 2>&1 | grep -E "test result|FAILED" | tail -20 && cargo fmt --all && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -20`
Attendu : `test result: ok. 2 passed`, aucune ligne `FAILED`, aucun `warning:`.

- [ ] **Étape 7 : taille après**

Run : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-formats-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm-formats && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm-formats target/wasm32-unknown-unknown/release/roomboard_formats_wasm.wasm && wc -c < apps/web/src/wasm-formats/roomboard_formats_wasm_bg.wasm && grep -c "image_transparent" apps/web/src/wasm-formats/roomboard_formats_wasm.d.ts`
Attendu : taille ≤ 3 145 728 ; `image_transparent` présent.

- [ ] **Étape 8 : commit**

```bash
cd <worktree> && git add crates/roomboard-formats/src/pixels.rs crates/roomboard-formats/src/lib.rs crates/roomboard-formats-wasm/src/lib.rs && git commit -m "feat(formats): add pure pixel functions for image transparency and adjustments" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T6 — Géométrie d'affichage (page)

<a id="tache-t6"></a>

**Objectif :** types des réglages dans `api.ts` et module pur `core/image-params.ts` (DAI1, I8-I11, I19, I21) : boîte affichée, passage source ↔ affichage (rognage → retournements → quarts de tour horaires), retourner et tourner « tels qu'on les voit », placement après retouche (centre de la zone commune gardé, étirement qui suit le contenu), domaine et neutres (I4, I5) partagés avec le faux cœur, clé des pixels.

**Fichiers :**
- Modifier : `apps/web/src/core/api.ts:151` (`ImageData`) et `:297` (après `BAD_GROUP_MESSAGE`).
- Créer : `apps/web/src/core/image-params.ts`, `apps/web/src/core/image-params.test.ts`.

**Interfaces :**
- Produit (`api.ts`) : `interface TransparentColor { color: string; tolerance: number; soft: number; contiguous: boolean }` ; `interface ImageParams { crop?: readonly [number, number, number, number]; flipX?: boolean; flipY?: boolean; quarterTurns?: number; brightness?: number; contrast?: number; transparent?: TransparentColor }` (tous `readonly`) ; `type ImageData = { asset: string; w: number; h: number } & ImageParams` ; `const BAD_IMAGE_PARAMS_MESSAGE` (texte exact du cœur, T3). La variante `Command.SetImageParams` vient en T7 (l'ajouter ici casserait `tsc` sur les deux `switch` exhaustifs de `wasm-core.ts` et `fake-core.ts`).
- Produit (`image-params.ts`), signatures exactes :
  - `type Crop = readonly [number, number, number, number]` ; `cropOf(i: ImageData): Crop` ;
  - `displaySize(i: ImageData): [number, number]` ; `sourceToDisplay(i: ImageData, x: number, y: number): [number, number]` ; `displayToSource(i: ImageData, x: number, y: number): [number, number]` ; `orientMatrix(i: ImageData): Matrix` (repère du rognage → affichage, pour le dessin) ;
  - `flipShown(p: ImageParams, axis: "h" | "v"): ImageParams` ; `turnShown(p: ImageParams, dir: 1 | -1): ImageParams` ; `placeAfter(m: Matrix, i: ImageData, next: ImageParams): Matrix` ;
  - `frameOf(i: ImageData, c: Crop): Bounds` (rognage → cadre dans l'affichage de `i`) ; `cropFromDisplay(i: ImageData, b: Bounds): Crop` (cadre → rognage source, arrondi, borné, 1 px au moins) ;
  - `clean(p: ImageParams): ImageParams` (neutres retirés) ; `paramsOf(i: ImageData): ImageParams` ; `geometryOf(p): ImageParams` ; `pixelsOf(p): ImageParams` ; `isPlainGeometry(p): boolean` ; `needsPixels(p): boolean` ; `isNeutral(p): boolean` ; `sameParams(a, b): boolean` ;
  - `normalizeParams(p: ImageParams, w: number, h: number): ImageParams | null` (domaine I5, null hors domaine) ; `readParams(raw: Readonly<Record<string, unknown>>, w: number, h: number): ImageParams` (lecture tolérante champ par champ) ;
  - `pixelKey(i: ImageData): string` (asset + couleur transparente + luminosité + contraste).
- Réutilise : `apps/web/src/core/api.ts:76`, `:151` — `Command`, `ImageData` (étendre ; ici `ImageData`, `Command` en T7).
- Réutilise : aucun module existant (termes `crop`, `flip`, `quarterTurns` : rien) — `apps/web/src/core/image-params.ts`, DAI1 (nouveau module).
- Réutilise : `apps/web/src/core/shapes.ts:81`, `:98` — `applyMatrix(m, x, y)`, `invertMatrix(m)` (réutiliser ; ici `applyMatrix` et `composeMatrix` `:86`).

**Test et commande bornée :** `cd <worktree> && pnpm --filter @roomboard/web test src/core/image-params.test.ts 2>&1 | tail -20` → `Test Files  1 passed (1)`, `Tests  16 passed (16)` ; un nom : `pnpm --filter @roomboard/web test src/core/image-params.test.ts -t "placeAfter garde le centre" 2>&1 | tail -6` → `Tests  1 passed`.

**Contraintes (recopiées) :**
- GC7 Preuves bornées : `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (sans `--`). Motif d'échec : `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 Chantier parallèle OD85 (C12 PDF) sur les mêmes fichiers (dont `api.ts`) : modifications localisées, ajouts plutôt que réécritures, aucune remise en forme d'un bloc non touché.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

**Interdits :** importer `engine/` depuis `core/` (constat `api.ts:145`) ; ajouter `SetImageParams` à `Command` (T7).

**Terminé quand :** 16 tests verts ; `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` sans erreur.

**Rapport :** sha ; sortie bornée ; `Réutilisation : appelé apps/web/src/core/shapes.ts applyMatrix, composeMatrix`, `Réutilisation : appelé apps/web/src/core/api.ts ImageData (étendu)`, `Réutilisation : écart — aucun module de géométrie d'affichage existant (image-params.ts neuf)`.

- [ ] **Étape 1 : types dans `api.ts`**

Remplacer la ligne `export interface ImageData { readonly asset: string; readonly w: number; readonly h: number }` par :

```ts
/** C5 (U29, I5) : couleur rendue transparente ; `color` en `#rrggbb` minuscules ; `tolerance`, `soft` entiers de 0 à 100. */
export interface TransparentColor { readonly color: string; readonly tolerance: number; readonly soft: number; readonly contiguous: boolean }
/** C5 (U29, I2, I4) : réglages non destructifs, champ absent = neutre. `crop` = [x, y, w, h] en pixels source ;
 *  `quarterTurns` 0 à 3, sens horaire ; `brightness`, `contrast` entiers de −100 à 100. */
export interface ImageParams {
  readonly crop?: readonly [number, number, number, number];
  readonly flipX?: boolean;
  readonly flipY?: boolean;
  readonly quarterTurns?: number;
  readonly brightness?: number;
  readonly contrast?: number;
  readonly transparent?: TransparentColor;
}
/** Image (U5) : `w`, `h` = taille source en pixels ; réglages de C5 à plat (I8 : boîte affichée, `displaySize`). */
export type ImageData = { readonly asset: string; readonly w: number; readonly h: number } & ImageParams;
```

Après la ligne `export const BAD_GROUP_MESSAGE = …;` ajouter :

```ts
/** C5 (I5) : message de `BadImageParams` du cœur, repris par la fausse liaison. */
export const BAD_IMAGE_PARAMS_MESSAGE =
  "réglages d'image invalides (image lisible, rognage entier dans l'image, quarts de tour 0 à 3, luminosité et contraste entiers de -100 à 100, couleur #rrggbb, tolérance et plume entières de 0 à 100 attendus)";
```

- [ ] **Étape 2 : écrire les tests (rouges)**

`apps/web/src/core/image-params.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { ImageData, ImageParams, Matrix } from "./api";
import { applyMatrix } from "./shapes";
import {
  clean,
  cropFromDisplay,
  cropOf,
  displaySize,
  displayToSource,
  flipShown,
  frameOf,
  geometryOf,
  isNeutral,
  isPlainGeometry,
  needsPixels,
  normalizeParams,
  orientMatrix,
  paramsOf,
  pixelKey,
  pixelsOf,
  placeAfter,
  readParams,
  sameParams,
  sourceToDisplay,
  turnShown,
} from "./image-params";

const A = "ab".repeat(32);
const img = (p: ImageParams = {}, w = 200, h = 100): ImageData => ({ asset: A, w, h, ...p });
/** flipX × flipY × quarterTurns : 16 combinaisons. */
const combos: ImageParams[] = [];
for (const flipX of [false, true]) for (const flipY of [false, true]) for (const quarterTurns of [0, 1, 2, 3]) combos.push(clean({ flipX, flipY, quarterTurns }));
const near = (a: readonly number[], b: readonly number[]): void => {
  expect(a.length).toBe(b.length);
  a.forEach((v, k) => expect(v).toBeCloseTo(b[k] ?? Number.NaN, 9));
};
const WHITE = { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true } as const;

describe("géométrie d'affichage (DAI1, I8-I11)", () => {
  it("displaySize : rognage, échangé par un quart de tour impair", () => {
    expect(displaySize(img())).toEqual([200, 100]);
    expect(displaySize(img({ crop: [10, 5, 80, 40] }))).toEqual([80, 40]);
    expect(displaySize(img({ crop: [10, 5, 80, 40], quarterTurns: 1 }))).toEqual([40, 80]);
    expect(displaySize(img({ quarterTurns: 2 }))).toEqual([200, 100]);
    expect(cropOf(img())).toEqual([0, 0, 200, 100]);
  });

  it("sourceToDisplay : un quart de tour horaire envoie le coin haut gauche en haut à droite", () => {
    expect(sourceToDisplay(img({ quarterTurns: 1 }), 0, 0)).toEqual([100, 0]);
    expect(sourceToDisplay(img({ quarterTurns: 1 }), 200, 0)).toEqual([100, 200]);
    expect(sourceToDisplay(img({ flipX: true }), 0, 0)).toEqual([200, 0]);
    expect(sourceToDisplay(img({ crop: [10, 5, 80, 40] }), 10, 5)).toEqual([0, 0]);
  });

  it("aller-retour source ↔ affichage, 16 combinaisons (flipX × flipY × quarterTurns)", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const [bw, bh] = displaySize(i);
      for (const [x, y] of [[10, 5], [90, 45], [33, 17], [10, 45]] as const) {
        const [dx, dy] = sourceToDisplay(i, x, y);
        expect(dx).toBeGreaterThanOrEqual(0);
        expect(dx).toBeLessThanOrEqual(bw);
        expect(dy).toBeGreaterThanOrEqual(0);
        expect(dy).toBeLessThanOrEqual(bh);
        near(displayToSource(i, dx, dy), [x, y]);
      }
    }
  });

  it("orientMatrix : même résultat que sourceToDisplay, 16 combinaisons", () => {
    for (const p of combos) {
      const i = img({ ...p, crop: [10, 5, 80, 40] });
      const o = orientMatrix(i);
      for (const [x, y] of [[10, 5], [90, 45], [40, 20]] as const) near(applyMatrix(o, x - 10, y - 5), sourceToDisplay(i, x, y));
    }
  });

  it("flipShown voit l'image telle qu'affichée, 16 combinaisons", () => {
    for (const p of combos) {
      for (const axis of ["h", "v"] as const) {
        const before = img(p);
        const after = img(flipShown(p, axis));
        const [bw, bh] = displaySize(before);
        for (const [x, y] of [[0, 0], [150, 20], [37, 81]] as const) {
          const [X, Y] = sourceToDisplay(before, x, y);
          near(sourceToDisplay(after, x, y), axis === "h" ? [bw - X, Y] : [X, bh - Y]);
        }
      }
    }
  });

  it("turnShown : un quart de tour de l'image affichée, dans les deux sens", () => {
    for (const p of combos) {
      const before = img(p);
      const [bw, bh] = displaySize(before);
      for (const [x, y] of [[0, 0], [150, 20]] as const) {
        const [X, Y] = sourceToDisplay(before, x, y);
        near(sourceToDisplay(img(turnShown(p, 1)), x, y), [bh - Y, X]);
        near(sourceToDisplay(img(turnShown(p, -1)), x, y), [Y, bw - X]);
      }
    }
    expect(turnShown({ quarterTurns: 3 }, 1)).toEqual({});
  });

  it("placeAfter garde le centre, échelle diag(2, 1), ⟳", () => {
    const i = img();
    const m: Matrix = [2, 0, 0, 1, 10, 20];
    const next = turnShown({}, 1);
    const m2 = placeAfter(m, i, next);
    near(m2, [1, 0, 0, 2, 160, -130]);
    near(applyMatrix(m2, ...sourceToDisplay(img(next), 100, 50)), applyMatrix(m, 100, 50));
  });

  it("rogner garde les pixels gardés sous une échelle ≠ 1", () => {
    const i = img({}, 200, 150);
    const m: Matrix = [2, 0, 0, 3, 10, 20];
    const next: ImageParams = { crop: [40, 30, 100, 80] };
    const m2 = placeAfter(m, i, next);
    near(m2, [2, 0, 0, 3, 90, 110]);
    for (const [x, y] of [[60, 50], [139, 109], [40, 30]] as const) {
      near(applyMatrix(m2, ...sourceToDisplay(img(next, 200, 150), x, y)), applyMatrix(m, x, y));
    }
  });

  it("retourner garde le centre ; rétablir garde les pixels qui étaient visibles", () => {
    const i = img({ crop: [40, 20, 100, 60] });
    const m: Matrix = [1, 0, 0, 1, 5, 5];
    near(applyMatrix(placeAfter(m, i, flipShown(paramsOf(i), "h")), 50, 30), applyMatrix(m, 50, 30));
    const restored = placeAfter(m, i, {});
    near(applyMatrix(restored, ...sourceToDisplay(img(), 70, 40)), applyMatrix(m, ...sourceToDisplay(i, 70, 40)));
  });

  it("rogner après Tourner ⟳ : le cadre tracé à l'écran donne le bon rectangle source", () => {
    const full = img({ quarterTurns: 1 });
    expect(cropFromDisplay(full, { x0: 10, y0: 20, x1: 60, y1: 120 })).toEqual([20, 40, 100, 50]);
    expect(frameOf(full, [20, 40, 100, 50])).toEqual({ x0: 10, y0: 20, x1: 60, y1: 120 });
  });

  it("cropFromDisplay : arrondi au pixel, borné à l'image, 1 pixel au moins", () => {
    const full = img();
    expect(cropFromDisplay(full, { x0: -5, y0: 0.4, x1: 50.6, y1: 300 })).toEqual([0, 0, 51, 100]);
    expect(cropFromDisplay(full, { x0: 30.2, y0: 10, x1: 30.3, y1: 10.1 })).toEqual([30, 10, 1, 1]);
    expect(cropFromDisplay(full, { x0: 200, y0: 100, x1: 230, y1: 130 })).toEqual([199, 99, 1, 1]);
  });
});

describe("domaine, neutres et clé des pixels (I4, I5, I19)", () => {
  it("normalizeParams : neutres retirés, rognage entier = absent", () => {
    expect(normalizeParams({ crop: [0, 0, 200, 100], flipX: false, quarterTurns: 0, brightness: 0, contrast: 0 }, 200, 100)).toEqual({});
    const all: ImageParams = { crop: [1, 2, 3, 4], flipY: true, quarterTurns: 3, brightness: -100, contrast: 100, transparent: { color: "#00ff7f", tolerance: 0, soft: 100, contiguous: false } };
    expect(normalizeParams(all, 200, 100)).toEqual(all);
  });

  it("normalizeParams : hors domaine → null", () => {
    const bad = [
      { crop: [150, 0, 51, 10] },
      { crop: [0, 0, 0, 10] },
      { crop: [0.5, 0, 10, 10] },
      { crop: [-1, 0, 10, 10] },
      { crop: [0, 0, 10] },
      { quarterTurns: 4 },
      { quarterTurns: 1.5 },
      { brightness: 101 },
      { contrast: -101 },
      { brightness: Number.NaN },
      { flipX: "oui" },
      { transparent: { ...WHITE, color: "#FFFFFF" } },
      { transparent: { ...WHITE, color: "white" } },
      { transparent: { ...WHITE, tolerance: 101 } },
      { transparent: { ...WHITE, soft: -1 } },
    ] as unknown as ImageParams[];
    for (const p of bad) expect(normalizeParams(p, 200, 100), JSON.stringify(p)).toBeNull();
  });

  it("readParams : un champ illisible est lu comme absent, les autres restent", () => {
    expect(readParams({ crop: [0, 0, 0, 5], flipX: "oui", quarterTurns: 1, brightness: 500, transparent: { color: "white" } }, 200, 100)).toEqual({ quarterTurns: 1 });
    expect(readParams({ crop: null, transparent: WHITE }, 200, 100)).toEqual({ transparent: WHITE });
  });

  it("clean, paramsOf, geometryOf, pixelsOf, isPlainGeometry, needsPixels, isNeutral, sameParams", () => {
    const p: ImageParams = { crop: [1, 1, 5, 5], flipX: true, flipY: false, quarterTurns: 0, brightness: 3, contrast: 0, transparent: WHITE };
    expect(clean(p)).toEqual({ crop: [1, 1, 5, 5], flipX: true, brightness: 3, transparent: WHITE });
    expect(paramsOf(img(p))).toEqual(clean(p));
    expect(geometryOf(p)).toEqual({ crop: [1, 1, 5, 5], flipX: true });
    expect(pixelsOf(p)).toEqual({ brightness: 3, transparent: WHITE });
    expect([isPlainGeometry({ brightness: 3 }), isPlainGeometry({ quarterTurns: 2 })]).toEqual([true, false]);
    expect([needsPixels({ crop: [0, 0, 1, 1] }), needsPixels({ contrast: -1 }), needsPixels({ transparent: WHITE })]).toEqual([false, true, true]);
    expect([isNeutral({ flipX: false, quarterTurns: 0 }), isNeutral({ flipY: true })]).toEqual([true, false]);
    expect(sameParams({ flipX: false, brightness: 0 }, {})).toBe(true);
    expect(sameParams({ transparent: WHITE }, { transparent: { ...WHITE } })).toBe(true);
    expect(sameParams({ transparent: WHITE }, { transparent: { ...WHITE, soft: 1 } })).toBe(false);
  });

  it("pixelKey : asset et réglages de pixels seulement", () => {
    const k = pixelKey(img({ brightness: 10 }));
    expect(pixelKey(img({ brightness: 10, quarterTurns: 1, crop: [0, 0, 5, 5] }))).toBe(k);
    expect(pixelKey(img({ brightness: 11 }))).not.toBe(k);
    expect(pixelKey({ ...img({ brightness: 10 }), asset: "cd".repeat(32) })).not.toBe(k);
    expect(pixelKey(img({ transparent: WHITE }))).not.toBe(pixelKey(img({ transparent: { ...WHITE, contiguous: false } })));
  });
});
```

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/core/image-params.test.ts 2>&1 | tail -20`
Attendu : `FAIL ` (module `./image-params` introuvable).

- [ ] **Étape 3 : écrire `image-params.ts`**

```ts
/**
 * Géométrie d'affichage d'une image retouchée (C5, DAI1, I8-I11) : source → rognage → retournements → quarts de tour
 * (sens horaire). Module pur de la couche `core` (le faux cœur l'importe ; `core` n'importe pas `engine`) ; le cœur Rust
 * ne garde que `display_size` et reçoit la matrice toute faite (`placeAfter`). Aussi le domaine et les neutres (I4, I5),
 * partagés par le faux cœur et le panneau, et la clé des pixels (I19).
 */
import type { Bounds, ImageData, ImageParams, Matrix, TransparentColor } from "./api";
import { applyMatrix, composeMatrix } from "./shapes";

/** Rognage `[x, y, w, h]` en pixels source. */
export type Crop = readonly [number, number, number, number];

const MAX_INT = 4294967295;
const HEX6 = /^#[0-9a-f]{6}$/;
const intIn = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const odd = (p: ImageParams): boolean => ((p.quarterTurns ?? 0) & 1) === 1;

/** Rognage effectif : `crop`, sinon l'image entière. */
export function cropOf(i: ImageData): Crop {
  return i.crop ?? [0, 0, i.w, i.h];
}

/** Boîte affichée (I8) : taille du rognage, échangée par un nombre impair de quarts de tour. */
export function displaySize(i: ImageData): [number, number] {
  const [, , cw, ch] = cropOf(i);
  return odd(i) ? [ch, cw] : [cw, ch];
}

/** Point du rognage (u, v ∈ [0, cw] × [0, ch]) vers l'affichage : retournements, puis quarts de tour horaires
 *  ((u, v) → (h − v, u) dans une boîte w × h, qui devient h × w). */
function cropToDisplay(i: ImageData, u: number, v: number): [number, number] {
  const [, , cw, ch] = cropOf(i);
  let x = i.flipX ? cw - u : u;
  let y = i.flipY ? ch - v : v;
  let w = cw;
  let h = ch;
  for (let k = 0; k < (i.quarterTurns ?? 0); k++) {
    [x, y] = [h - y, x];
    [w, h] = [h, w];
  }
  return [x, y];
}

/** Inverse de `cropToDisplay` : quarts de tour défaits ((X, Y) → (Y, w − X) dans la boîte affichée w × h), puis
 *  retournements. */
function displayToCrop(i: ImageData, x: number, y: number): [number, number] {
  const [, , cw, ch] = cropOf(i);
  let [w, h]: [number, number] = odd(i) ? [ch, cw] : [cw, ch];
  let u = x;
  let v = y;
  for (let k = 0; k < (i.quarterTurns ?? 0); k++) {
    [u, v] = [v, w - u];
    [w, h] = [h, w];
  }
  return [i.flipX ? cw - u : u, i.flipY ? ch - v : v];
}

/** Pixel source (x, y) → point de la boîte affichée (0, 0)-(bw, bh). */
export function sourceToDisplay(i: ImageData, x: number, y: number): [number, number] {
  const [cx, cy] = cropOf(i);
  return cropToDisplay(i, x - cx, y - cy);
}

/** Point de la boîte affichée → pixel source (pipette, I29 ; cadre de rognage, I28). */
export function displayToSource(i: ImageData, x: number, y: number): [number, number] {
  const [cx, cy] = cropOf(i);
  const [u, v] = displayToCrop(i, x, y);
  return [u + cx, v + cy];
}

/** Matrice du repère du rognage vers l'affichage (I23) : le dessin pose le rectangle source en (0, 0)-(cw, ch). */
export function orientMatrix(i: ImageData): Matrix {
  const [ox, oy] = cropToDisplay(i, 0, 0);
  const [ux, uy] = cropToDisplay(i, 1, 0);
  const [vx, vy] = cropToDisplay(i, 0, 1);
  return [ux - ox, uy - oy, vx - ox, vy - oy, ox, oy];
}

/** Neutres retirés (I4) : `false`, 0 et champs absents ne sont pas écrits ; seuls les sept réglages sont gardés. */
export function clean(p: ImageParams): ImageParams {
  return {
    ...(p.crop !== undefined ? { crop: p.crop } : {}),
    ...(p.flipX ? { flipX: true } : {}),
    ...(p.flipY ? { flipY: true } : {}),
    ...(p.quarterTurns ? { quarterTurns: p.quarterTurns } : {}),
    ...(p.brightness ? { brightness: p.brightness } : {}),
    ...(p.contrast ? { contrast: p.contrast } : {}),
    ...(p.transparent !== undefined ? { transparent: p.transparent } : {}),
  };
}

/** Réglages d'une image (sans asset ni taille). */
export const paramsOf = (i: ImageData): ImageParams => clean(i);
/** Rognage, retournements, quarts de tour. */
export const geometryOf = (p: ImageParams): ImageParams => clean({ crop: p.crop, flipX: p.flipX, flipY: p.flipY, quarterTurns: p.quarterTurns });
/** Luminosité, contraste, couleur transparente (calculés dans le Worker). */
export const pixelsOf = (p: ImageParams): ImageParams => clean({ brightness: p.brightness, contrast: p.contrast, transparent: p.transparent });
export const isPlainGeometry = (p: ImageParams): boolean => p.crop === undefined && !p.flipX && !p.flipY && !p.quarterTurns;
export const needsPixels = (p: ImageParams): boolean => p.transparent !== undefined || !!p.brightness || !!p.contrast;
export const isNeutral = (p: ImageParams): boolean => isPlainGeometry(p) && !needsPixels(p);

const canon = (p: ImageParams): string => {
  const t = p.transparent;
  return JSON.stringify([
    p.crop ?? null,
    p.flipX === true,
    p.flipY === true,
    p.quarterTurns ?? 0,
    p.brightness ?? 0,
    p.contrast ?? 0,
    t === undefined ? null : [t.color, t.tolerance, t.soft, t.contiguous],
  ]);
};
/** Même état (neutres compris) : comparaison du faux cœur (D38). */
export const sameParams = (a: ImageParams, b: ImageParams): boolean => canon(a) === canon(b);

/** Retourner « tel qu'on le voit » (I11) : avec un nombre impair de quarts de tour, c'est l'autre axe de la source. */
export function flipShown(p: ImageParams, axis: "h" | "v"): ImageParams {
  const sourceX = (axis === "h") !== odd(p);
  return clean(sourceX ? { ...p, flipX: !p.flipX } : { ...p, flipY: !p.flipY });
}

/** Tourner l'image affichée d'un quart de tour (1 : horaire ⟳, −1 : antihoraire ⟲). */
export function turnShown(p: ImageParams, dir: 1 | -1): ImageParams {
  return clean({ ...p, quarterTurns: ((p.quarterTurns ?? 0) + dir + 4) % 4 });
}

/** Quart de tour horaire (x, y) → (−y, x) et son inverse, parties linéaires seules. */
const CW: Matrix = [0, 1, -1, 0, 0, 0];
const CCW: Matrix = [0, -1, 1, 0, 0, 0];

/**
 * Matrice après une retouche (I9) : le centre de la zone source commune aux réglages avant et après (intersection des
 * deux rognages ; vide : centre du nouveau rognage) reste au même point de la page. Partie linéaire inchangée si la
 * parité des quarts de tour ne change pas ; sinon conjuguée par le quart de tour ajouté (L' = Q · L · Q⁻¹ : l'étirement
 * suit le contenu).
 */
export function placeAfter(m: Matrix, i: ImageData, next: ImageParams): Matrix {
  const after: ImageData = { asset: i.asset, w: i.w, h: i.h, ...next };
  const [ax, ay, aw, ah] = cropOf(i);
  const [bx, by, bw, bh] = cropOf(after);
  const x0 = Math.max(ax, bx);
  const y0 = Math.max(ay, by);
  const x1 = Math.min(ax + aw, bx + bw);
  const y1 = Math.min(ay + ah, by + bh);
  const [px, py]: [number, number] = x1 > x0 && y1 > y0 ? [(x0 + x1) / 2, (y0 + y1) / 2] : [bx + bw / 2, by + bh / 2];
  const [wx, wy] = applyMatrix(m, ...sourceToDisplay(i, px, py));
  const d = ((((after.quarterTurns ?? 0) - (i.quarterTurns ?? 0)) % 4) + 4) % 4;
  const linear: Matrix = [m[0], m[1], m[2], m[3], 0, 0];
  const l = d % 2 === 1 ? composeMatrix(d === 1 ? CW : CCW, composeMatrix(linear, d === 1 ? CCW : CW)) : linear;
  const [dx, dy] = sourceToDisplay(after, px, py);
  return [l[0], l[1], l[2], l[3], wx - (l[0] * dx + l[2] * dy), wy - (l[1] * dx + l[3] * dy)];
}

/** Cadre (boîte affichée de `i`) d'un rognage source : rectangle aligné, retournements et quarts de tour compris. */
export function frameOf(i: ImageData, c: Crop): Bounds {
  const [ax, ay] = sourceToDisplay(i, c[0], c[1]);
  const [bx, by] = sourceToDisplay(i, c[0] + c[2], c[1] + c[3]);
  return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) };
}

/** Rognage source d'un cadre tracé dans la boîte affichée de `i` (image entière) : arrondi au pixel, borné à l'image,
 *  1 pixel source au moins (I28). */
export function cropFromDisplay(i: ImageData, b: Bounds): Crop {
  const [ax, ay] = displayToSource(i, b.x0, b.y0);
  const [bx, by] = displayToSource(i, b.x1, b.y1);
  const span = (a: number, z: number, max: number): [number, number] => {
    const lo = Math.min(max - 1, Math.max(0, Math.round(Math.min(a, z))));
    const hi = Math.min(max, Math.max(lo + 1, Math.round(Math.max(a, z))));
    return [lo, hi - lo];
  };
  const [x, w] = span(ax, bx, i.w);
  const [y, h] = span(ay, by, i.h);
  return [x, y, w, h];
}

function transparentOf(t: unknown): TransparentColor | null {
  if (typeof t !== "object" || t === null) return null;
  const { color, tolerance, soft, contiguous } = t as Record<string, unknown>;
  if (typeof color !== "string" || !HEX6.test(color) || !intIn(tolerance, 0, 100) || !intIn(soft, 0, 100) || typeof contiguous !== "boolean") return null;
  return { color, tolerance, soft, contiguous };
}

/** Rognage du domaine (I5) ; "full" = l'image entière (neutre). */
function cropIn(c: unknown, w: number, h: number): Crop | "full" | null {
  if (!Array.isArray(c) || c.length !== 4) return null;
  const [x, y, cw, ch] = c as unknown[];
  if (!intIn(x, 0, MAX_INT) || !intIn(y, 0, MAX_INT) || !intIn(cw, 1, MAX_INT) || !intIn(ch, 1, MAX_INT)) return null;
  if (x + cw > w || y + ch > h) return null;
  return x === 0 && y === 0 && cw === w && ch === h ? "full" : [x, y, cw, ch];
}

/** Domaine de I5 et neutres retirés (I4) ; null hors domaine. Mêmes règles que `normalize` du cœur (`image.rs`). */
export function normalizeParams(p: ImageParams, w: number, h: number): ImageParams | null {
  const raw = p as Readonly<Record<string, unknown>>;
  let crop: Crop | undefined;
  if (raw["crop"] !== undefined) {
    const c = cropIn(raw["crop"], w, h);
    if (c === null) return null;
    crop = c === "full" ? undefined : c;
  }
  for (const k of ["flipX", "flipY"]) if (raw[k] !== undefined && typeof raw[k] !== "boolean") return null;
  const q = raw["quarterTurns"] ?? 0;
  const b = raw["brightness"] ?? 0;
  const ct = raw["contrast"] ?? 0;
  if (!intIn(q, 0, 3) || !intIn(b, -100, 100) || !intIn(ct, -100, 100)) return null;
  let transparent: TransparentColor | undefined;
  if (raw["transparent"] !== undefined) {
    const t = transparentOf(raw["transparent"]);
    if (t === null) return null;
    transparent = t;
  }
  return clean({ crop, flipX: raw["flipX"] === true, flipY: raw["flipY"] === true, quarterTurns: q, brightness: b, contrast: ct, transparent });
}

const KEYS = ["crop", "flipX", "flipY", "quarterTurns", "brightness", "contrast", "transparent"] as const;

/** Lecture tolérante (U3, I5) : chaque champ est contrôlé seul ; illisible ou hors domaine, il est lu comme absent. */
export function readParams(raw: Readonly<Record<string, unknown>>, w: number, h: number): ImageParams {
  let out: ImageParams = {};
  for (const key of KEYS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    const one = normalizeParams({ [key]: v } as ImageParams, w, h);
    if (one !== null) out = { ...out, ...one };
  }
  return out;
}

/** Clé des pixels d'une image (I19) : asset et réglages calculés par le Worker, rien de la géométrie. */
export function pixelKey(i: ImageData): string {
  const t = i.transparent;
  return JSON.stringify([i.asset, t === undefined ? null : [t.color, t.tolerance, t.soft, t.contiguous], i.brightness ?? 0, i.contrast ?? 0]);
}
```

- [ ] **Étape 4 : vert, types**

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/core/image-params.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20`
Attendu : `Tests  16 passed (16)` ; aucune sortie de `tsc`.

- [ ] **Étape 5 : commit**

```bash
cd <worktree> && git add apps/web/src/core/api.ts apps/web/src/core/image-params.ts apps/web/src/core/image-params.test.ts && git commit -m "feat(web): add image display geometry and params domain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T7 — Faux cœur, liaison TS, contrat

<a id="tache-t7"></a>

**Objectif :** la commande `SetImageParams` dans le contrat de la page (`api.ts`), jouée à parité par la fausse liaison (mêmes refus dans le même ordre, mêmes messages, neutres retirés, une étape, aucune sans effet) et par l'adaptateur du vrai module (arguments de `set_image_params`, champs lus et contrôlés) ; le test de contrat le joue contre les deux.

**Fichiers :**
- Modifier : `apps/web/src/core/api.ts:1-19` (en-tête) et `:76-135` (`Command`) ; `apps/web/src/core/fake-core.ts:62-82` (imports de valeurs), `:139-151` (`MESSAGES`), `:403-417` (`worldPolygon`), `apply` (nouveau `case` après `case "Fill"`, avant la fermeture du `switch`, l. 1012), `:1420` (lecture d'une image enregistrée) ; `apps/web/src/core/wasm-core.ts` (imports, `toElementView` image `:194-199`, `apply` après `case "Fill"` `:421-425`) ; `apps/web/src/core/wasm-core.contract.test.ts` (imports, deux blocs ajoutés en fin de fichier).

**Interfaces :**
- Consomme (T4) : `Wasm.Document.set_image_params(id, crop: Float64Array, flip_x, flip_y, quarter_turns, brightness, contrast, color: string | undefined, transparent: Float64Array, matrix: Float64Array)` (rend un `Change`) ; message `BadImageParams` du cœur.
- Consomme (T6) : `ImageParams`, `TransparentColor`, `ImageData`, `BAD_IMAGE_PARAMS_MESSAGE` (`api.ts`) ; `normalizeParams`, `readParams`, `paramsOf`, `sameParams`, `displaySize` (`image-params.ts`).
- Produit : `Command` gagne `{ readonly type: "SetImageParams"; readonly id: string; readonly params: ImageParams; readonly matrix: Matrix }` (lu par T11) ; `export function imageParamsArgs(p: ImageParams): [Float64Array, boolean, boolean, number, number, number, string | undefined, Float64Array]` et `export function toImageParams(i: Record<string, unknown>): ImageParams` (`wasm-core.ts`).
- Ordre des refus (des deux côtés, celui de `image.rs`) : élément inconnu (`élément inconnu : <id>`), cible qui n'est pas une image lisible (`BAD_IMAGE_PARAMS_MESSAGE`), réglages hors domaine (`BAD_IMAGE_PARAMS_MESSAGE`), matrice (`matrice invalide (six nombres finis, inversible)`).
- Réutilise : `apps/web/src/core/api.ts:76`, `:151` — `Command`, `ImageData` (étendre : ici `Command`).
- Réutilise : `apps/web/src/core/fake-core.ts:410`, `:675` — `SetImageParams`, `displaySize` (étendre).

**Patron à ne pas reprendre (concepteur-critique) :** ranger `cmd.params` tel quel dans l'élément du faux cœur et comparer les réglages par référence ou par `JSON.stringify` des objets reçus : la fausse liaison garderait `flipX: false`, `crop` égal à l'image entière, l'ordre des clés de l'appelant — le vrai cœur retire les neutres (I4) et `Object.keys(image)` diffèrerait. Chemin de référence : `AddImage` du faux cœur (`apps/web/src/core/fake-core.ts:675-690`, contrôles dans l'ordre du cœur puis `this.step`) et `Fill` (`:975-1011`, `this.unchanged()` quand rien ne change) ; normaliser par `normalizeParams` (T6), comparer par `sameParams`.

**Test et commande bornée :**
- Construire le vrai module (§ « Commandes de preuve »), puis `cd <worktree> && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core/wasm-core.contract.test.ts -t "C5" 2>&1 | tail -20` → `Tests  13 passed` (6 tests × 2 fabriques + 1 test de forme), aucun `FAIL `.
- Tests à garder verts (zone touchée) : `cd <worktree> && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core 2>&1 | tail -20` → aucun `FAIL ` (dont le contrat C2 « AddImage : une étape, vue image sans style »).
- Types : `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

**Contraintes (recopiées) :**
- GC4 Un `.roomboard` d'avant C5 s'ouvre toujours : fixture `crates/roomboard-core/tests/fixtures/image-c2.roomboard` écrite par T1 avec le code de `main`, jamais régénérée ensuite ; l'aller-retour enregistrer/rouvrir garde les réglages et les octets.
- GC7 Preuves bornées : `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (sans `--`). Motif d'échec : `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 Chantier parallèle OD85 (C12 PDF) sur les mêmes fichiers (`api.ts`, `wasm-core.ts`, `fake-core.ts`, contrats) : modifications localisées, ajouts plutôt que réécritures, aucune remise en forme d'un bloc non touché.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

**Interdits :** affaiblir un test de contrat existant ; commiter `apps/web/src/wasm/` ; toucher `shapes.ts` ou `asset-store.ts`.

**Terminé quand :** 13 tests « C5 » verts avec le vrai module exigé, `src/core` sans `FAIL `, `tsc` sans erreur.

**Rapport :** sha ; sorties bornées ; `Réutilisation : appelé apps/web/src/core/api.ts Command (étendu)`, `Réutilisation : appelé apps/web/src/core/fake-core.ts:410 worldPolygon et :675 patron AddImage`.

- [ ] **Étape 1 : construire le vrai module (le `.d.ts` porte `set_image_params`)**

Run : `cd <worktree> && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --remove-name-section --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && grep -c "set_image_params" apps/web/src/wasm/roomboard_wasm.d.ts`
Attendu : `≥ 1`.

- [ ] **Étape 2 : la variante dans `api.ts`**

En-tête : après la ligne `// C3 : Group, Ungroup ; …`, ajouter :

```ts
// C5 : SetImageParams (état voulu complet des réglages et nouvelle matrice, une étape, D38) ; ImageData porte les réglages
// (neutres absents, I4) ; la boîte locale d'une image est sa boîte affichée (image-params.ts, displaySize).
```

Dans `export type Command =`, avant la variante `| { readonly type: "Group"; … }` (commentaire `/** C3 (Z1) : deux unités au moins …`), ajouter :

```ts
  /** C5 (I6) : état voulu complet des réglages (neutres retirés par le cœur) et nouvelle matrice (placeAfter, I9) ;
   *  même état et même matrice : aucune étape ; hors domaine : BAD_IMAGE_PARAMS_MESSAGE. */
  | { readonly type: "SetImageParams"; readonly id: string; readonly params: ImageParams; readonly matrix: Matrix }
```

- [ ] **Étape 3 : tests de contrat (rouges)**

`apps/web/src/core/wasm-core.contract.test.ts` : à la ligne d'import des types, ajouter `ImageElement, ImageParams` à la liste ; à la ligne `import { BAD_GROUP_MESSAGE, … } from "./api";`, ajouter `BAD_IMAGE_PARAMS_MESSAGE` ; à l'import de `./wasm-core`, ajouter `imageParamsArgs`. Puis, en fin de fichier :

```ts
// C5 (I4-I6, I8, S4) : réglages d'image, joués contre les deux cœurs.
const FULL: ImageParams = {
  crop: [10, 20, 300, 200],
  flipX: true,
  quarterTurns: 1,
  brightness: 30,
  contrast: -20,
  transparent: { color: "#ffffff", tolerance: 10, soft: 0, contiguous: true },
};
const imageOf = (d: CoreDocument, id: string): ImageElement["image"] | null => {
  const el = d.element(id);
  return el?.kind === "image" ? el.image : null;
};

describe.each(factories)("contrat C5 : $name", ({ f }) => {
  const image = (d: CoreDocument, p: string): string =>
    d.apply({ type: "AddImage", page: p, asset: png, w: 640, h: 480, matrix: I }).ids[0] ?? "";

  it("C5 SetImageParams : une étape, champs relus, boîte affichée, Annuler revient à l'image brute", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    const c = d.apply({ type: "SetImageParams", id, params: FULL, matrix: [1, 0, 0, 1, 5, 6] });
    expect([c.pages, c.ids]).toEqual([[p], [id]]);
    expect(d.element(id)).toEqual({ id, kind: "image", transform: [1, 0, 0, 1, 5, 6], image: { asset: ABC, w: 640, h: 480, ...FULL } });
    expect(d.bounds([id])).toEqual({ x0: 5, y0: 6, x1: 205, y1: 306 });
    d.undo();
    expect(d.element(id)).toEqual({ id, kind: "image", transform: I, image: { asset: ABC, w: 640, h: 480 } });
    d.free();
  });

  it("C5 SetImageParams : état neutre complet = champs retirés ; même état et même matrice : aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: { crop: [0, 0, 640, 480], flipX: false, quarterTurns: 0, brightness: 0 }, matrix: I }));
    d.apply({ type: "SetImageParams", id, params: { brightness: 10 }, matrix: I });
    unchanged(d, () => d.apply({ type: "SetImageParams", id, params: { brightness: 10 }, matrix: I }));
    expect(d.apply({ type: "SetImageParams", id, params: {}, matrix: I }).ids).toEqual([id]);
    expect(Object.keys(imageOf(d, id) ?? {}).sort()).toEqual(["asset", "h", "w"]);
    d.free();
  });

  it("C5 SetImageParams : refus sans étape, messages du contrat, réglages contrôlés avant la matrice", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    const stroke = commit(d, p, 100);
    const white = FULL.transparent!;
    const bad = [
      { crop: [600, 0, 100, 10] },
      { crop: [0, 0, 0, 10] },
      { crop: [0.5, 0, 10, 10] },
      { quarterTurns: 4 },
      { quarterTurns: 1.5 },
      { brightness: 101 },
      { contrast: -101 },
      { transparent: { ...white, color: "#FFFFFF" } },
      { transparent: { ...white, color: "white" } },
      { transparent: { ...white, tolerance: 101 } },
      { transparent: { ...white, soft: -1 } },
    ] as ImageParams[];
    const run = (target: string, params: ImageParams, matrix: Matrix = I): string =>
      messageOf(() => d.apply({ type: "SetImageParams", id: target, params, matrix }));
    unchanged(d, () => {
      for (const params of bad) expect(run(id, params), JSON.stringify(params)).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      expect(run(id, { brightness: 101 }, [0, 0, 0, 0, 0, 0])).toBe(BAD_IMAGE_PARAMS_MESSAGE);
      expect(run(id, {}, [0, 0, 0, 0, 0, 0])).toBe("matrice invalide (six nombres finis, inversible)");
      expect(run("nulle-part", {})).toBe("élément inconnu : nulle-part");
      expect(run(stroke, {})).toBe(BAD_IMAGE_PARAMS_MESSAGE);
    });
    d.free();
  });

  it("C5 enregistrer, rouvrir : réglages gardés (S4)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: [2, 0, 0, 1, 5, 6] });
    const r = f.load(d.save(now, "0.1.0"));
    expect(r.element(id)).toEqual(d.element(id));
    r.free();
    d.free();
  });

  it("C5 extract et .rbitem : une image retouchée garde ses réglages (copier, coller, exporter)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: FULL, matrix: I });
    const x = d.extract(p, [id]);
    expect(imageOf(x, x.elementIds(first(x))[0] ?? "")).toEqual(imageOf(d, id));
    const r = f.loadFragment(x.saveFragment(now, "0.1.0", "image"));
    expect(imageOf(r, r.elementIds(first(r))[0] ?? "")).toEqual(imageOf(d, id));
    for (const doc of [r, x, d]) doc.free();
  });

  it("C5 hitTest et bounds suivent la boîte affichée (I8, effet de bord 1)", () => {
    const d = f.blank();
    const p = first(d);
    const id = image(d, p);
    d.apply({ type: "SetImageParams", id, params: { crop: [0, 0, 100, 50] }, matrix: I });
    expect(d.hitTest(p, 50, 25, 0)).toBe(id);
    expect(d.hitTest(p, 150, 25, 0)).toBeNull();
    expect(d.bounds([id])).toEqual({ x0: 0, y0: 0, x1: 100, y1: 50 });
    d.free();
  });
});

describe("toElementView — image (C5)", () => {
  const base = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0] };
  it("C5 réglages lus ; un champ mal typé lève ; imageParamsArgs : forme des arguments de set_image_params", () => {
    expect(toElementView({ ...base, image: { asset: ABC, w: 4, h: 2, crop: [0, 0, 2, 1], flipY: true, contrast: 5 } })).toEqual({
      id: "i",
      kind: "image",
      transform: [1, 0, 0, 1, 0, 0],
      image: { asset: ABC, w: 4, h: 2, crop: [0, 0, 2, 1], flipY: true, contrast: 5 },
    });
    for (const bad of [{ crop: [1, 2] }, { flipX: 1 }, { quarterTurns: "1" }, { transparent: { color: "#ffffff" } }]) {
      expect(() => toElementView({ ...base, image: { asset: ABC, w: 4, h: 2, ...bad } })).toThrow("ElementView invalide");
    }
    const [crop, fx, fy, q, b, c, color, t] = imageParamsArgs(FULL);
    expect([Array.from(crop), fx, fy, q, b, c, color, Array.from(t)]).toEqual([[10, 20, 300, 200], true, false, 1, 30, -20, "#ffffff", [10, 0, 1]]);
    const [crop0, , , , , , color0, t0] = imageParamsArgs({});
    expect([crop0.length, color0, t0.length]).toEqual([0, undefined, 0]);
  });
});
```

Run : `cd <worktree> && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core/wasm-core.contract.test.ts -t "C5" 2>&1 | tail -20`
Attendu : `FAIL ` (`imageParamsArgs` absent, commande inconnue des deux cœurs).

- [ ] **Étape 4 : fausse liaison**

`apps/web/src/core/fake-core.ts` :

1. Dans la liste `import { … } from "./api";` des valeurs (l. 62-82), ajouter `BAD_IMAGE_PARAMS_MESSAGE` ; après la ligne `import { applyMatrix, boxPolygon, … } from "./shapes";`, ajouter :

```ts
import { displaySize, normalizeParams, paramsOf, readParams, sameParams } from "./image-params";
```

2. Dans `MESSAGES`, après `badGroup: BAD_GROUP_MESSAGE,` ajouter `badImageParams: BAD_IMAGE_PARAMS_MESSAGE,`.

3. Dans `worldPolygon`, remplacer `? boxPolygon(e.image.w, e.image.h)` par `? boxPolygon(...displaySize(e.image))`.

4. Dans `apply`, après la fin du `case "Fill": { … }` (avant l'accolade qui ferme le `switch`), ajouter :

```ts
      case "SetImageParams": {
        // Ordre du cœur (`image.rs`) : élément, image lisible, réglages (I5), matrice ; même état et même matrice : aucune étape.
        const found = this.find(cmd.id);
        if (!found) throw new Error(`élément inconnu : ${cmd.id}`);
        const im = found.element.image;
        if (!im || found.element.malformed) throw new Error(MESSAGES.badImageParams);
        const next = normalizeParams(cmd.params, im.w, im.h);
        if (next === null) throw new Error(MESSAGES.badImageParams);
        if (!validMatrix(cmd.matrix)) throw new Error(MESSAGES.badMatrix);
        const sameMatrix = cmd.matrix.every((v, k) => v === found.element.transform[k]);
        if (sameParams(paramsOf(im), next) && sameMatrix) return this.unchanged();
        const page = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === page);
          const i = p ? p.elements.findIndex((x) => x.id === cmd.id) : -1;
          const old = p?.elements[i];
          if (p && old?.image) {
            p.elements[i] = { ...old, transform: cmd.matrix, image: { asset: old.image.asset, w: old.image.w, h: old.image.h, ...next } };
          }
          return { pages: [page], ids: [cmd.id], removed: [] };
        });
      }
```

5. Lecture d'une image enregistrée (l. 1420) : remplacer

```ts
  if (e.kind === "image" && e.image) return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image: e.image, ...group };
```

par

```ts
  if (e.kind === "image" && e.image) {
    // C5 : réglages relus champ par champ (un champ illisible est lu comme absent, U3).
    const im = e.image;
    const image: ImageData = { asset: im.asset, w: im.w, h: im.h, ...readParams(im as unknown as Readonly<Record<string, unknown>>, im.w, im.h) };
    return { id: e.id, transform: toMatrix6(e.transform) ?? IDENTITY, style: NO_STYLE, image, ...group };
  }
```

- [ ] **Étape 5 : adaptateur du vrai module**

`apps/web/src/core/wasm-core.ts` :

1. À la liste `import type { … } from "./api";` ajouter `ImageParams`.

2. Après la fonction `gridArgs` (avant `class WasmCoreDocument`), ajouter :

```ts
/** Arguments de `set_image_params` (C5, I6) : rognage vide ou [x, y, w, h], deux booléens, trois nombres, couleur ou
 *  undefined, [tolérance, plume, contigu en 0 ou 1] ou vide ; les valeurs sont contrôlées par le cœur. */
export function imageParamsArgs(p: ImageParams): [Float64Array, boolean, boolean, number, number, number, string | undefined, Float64Array] {
  const t = p.transparent;
  return [
    new Float64Array(p.crop ?? []),
    p.flipX === true,
    p.flipY === true,
    p.quarterTurns ?? 0,
    p.brightness ?? 0,
    p.contrast ?? 0,
    t?.color,
    new Float64Array(t === undefined ? [] : [t.tolerance, t.soft, t.contiguous ? 1 : 0]),
  ];
}

/** Réglages d'une image lus du cœur (C5) : un champ absent reste absent, un neutre n'est pas recopié ; un champ présent
 *  mal typé lève (dérive de forme entre Rust et TS). */
export function toImageParams(i: Record<string, unknown>): ImageParams {
  const out: Record<string, unknown> = {};
  const crop = i["crop"];
  if (crop !== undefined && crop !== null) {
    if (!Array.isArray(crop) || crop.length !== 4 || !crop.every((n) => typeof n === "number")) throw new Error(ELEMENT);
    out["crop"] = [crop[0], crop[1], crop[2], crop[3]];
  }
  for (const k of ["flipX", "flipY"] as const) {
    const b = i[k];
    if (b === undefined || b === null) continue;
    if (typeof b !== "boolean") throw new Error(ELEMENT);
    if (b) out[k] = true;
  }
  for (const k of ["quarterTurns", "brightness", "contrast"] as const) {
    const n = i[k];
    if (n === undefined || n === null) continue;
    if (typeof n !== "number") throw new Error(ELEMENT);
    if (n !== 0) out[k] = n;
  }
  const t = i["transparent"];
  if (t !== undefined && t !== null) {
    if (!isRecord(t)) throw new Error(ELEMENT);
    const { color, tolerance, soft, contiguous } = t;
    if (typeof color !== "string" || typeof tolerance !== "number" || typeof soft !== "number" || typeof contiguous !== "boolean") throw new Error(ELEMENT);
    out["transparent"] = { color, tolerance, soft, contiguous };
  }
  return out as ImageParams;
}
```

3. Dans `toElementView`, `case "image"`, remplacer `return { ...base, kind, image: { asset, w, h } };` par `return { ...base, kind, image: { asset, w, h, ...toImageParams(i) } };`.

4. Dans `apply`, après le `case "Fill": { … }` (avant l'accolade qui ferme le `switch`), ajouter :

```ts
      case "SetImageParams":
        // C5 (I6) : réglages à plat ; seule la référence de l'asset vit dans l'élément, jamais ses octets.
        return toChange(this.d.set_image_params(cmd.id, ...imageParamsArgs(cmd.params), new Float64Array(cmd.matrix)));
```

- [ ] **Étape 6 : vert, zone, types**

Run : `cd <worktree> && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core/wasm-core.contract.test.ts -t "C5" 2>&1 | tail -20 && ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web test src/core 2>&1 | tail -20 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20`
Attendu : `Tests  13 passed`, puis aucun `FAIL `, puis aucune sortie de `tsc`.

- [ ] **Étape 7 : commit**

```bash
cd <worktree> && git add apps/web/src/core/api.ts apps/web/src/core/fake-core.ts apps/web/src/core/wasm-core.ts apps/web/src/core/wasm-core.contract.test.ts && git commit -m "feat(web): add SetImageParams to the page contract with fake core parity" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T8 — Lanceur et Worker de pixels

<a id="tache-t8"></a>

**Objectif :** un Worker de pixels par onglet, créé au premier calcul, gardé tant qu'il a du travail, arrêté 10 s après sa dernière réponse, après une erreur ou au bout de 60 s sans réponse (I18, DAI3) ; file **avec remplacement** : au plus un calcul en attente par emplacement, le remplacé se résout à `null` sans être lancé (I19) ; le Worker charge sa propre instance du module `formats`, extrait le RGBA par `OffscreenCanvas`, applique la couleur transparente sur les couleurs d'origine puis luminosité et contraste (I10), rend un `ImageBitmap` transféré.

**Fichiers :**
- Créer : `apps/web/src/platform/pixel-runner.ts`, `apps/web/src/platform/pixel-runner.test.ts`, `apps/web/src/platform/pixel-worker.ts`.
- Modifier : `apps/web/src/platform/container.ts:61-69` (après `hasSheetReader`).

**Interfaces :**
- Produit (`pixel-runner.ts`, lu par T9 et T12) :
  - `PIXEL_IDLE_MS = 10_000`, `PIXEL_TIMEOUT_MS = 60_000`, `PIXELS_FAILED_MESSAGE = "calcul des pixels interrompu"`, `pixelNotice(cause: string): string` → `retouches de l'image non affichées : ${cause}` (I24) ;
  - `interface PixelParams { transparent?: { color: string; tolerance: number; soft: number; contiguous: boolean }; brightness?: number; contrast?: number }` (tous `readonly`, structurellement compatible avec `ImageParams`) ;
  - `interface PixelJob extends PixelParams { readonly key: string; bitmap(): Promise<ImageBitmap> }` ;
  - `interface PixelRunner { run(slot: string, job: PixelJob): Promise<ImageBitmap | null>; dispose(): void }` ;
  - `createPixelRunner(spawn: () => WorkerLike, opts?: { readonly idleMs?: number; readonly timeoutMs?: number }): PixelRunner` ;
  - `applyPixels(mod: Pick<PixelFormatsBinding, "image_transparent" | "image_adjust">, px: Uint8Array, w: number, h: number, p: PixelParams): void` ; `rgbOf(c: string): [number, number, number]` ; `pixelErrorMessage(err: unknown): string`.
  - Messages : page → Worker `{ id: number, bitmap: ImageBitmap, transparent?, brightness?, contrast? }` (bitmap transféré) ; Worker → page `{ id, bitmap }` (transféré) ou `{ id, error: string }`.
- Produit (`container.ts`) : `interface PixelFormatsBinding extends FormatsBinding { image_transparent(px: Uint8Array, w: number, h: number, r: number, g: number, b: number, tolerance: number, soft: number, contiguous: boolean): void; image_adjust(px: Uint8Array, brightness: number, contrast: number): void; image_flood_fill(px: Uint8Array, w: number, h: number, x: number, y: number, tolerance: number, r: number, g: number, b: number): void }` ; `hasPixels(m: FormatsBinding): m is PixelFormatsBinding`.
- Consomme (T5, à l'exécution seulement) : `image_transparent`, `image_adjust` du module `formats` (le test n'en dépend pas : faux module).
- Réutilise : `apps/web/src/platform/sheet-reader.ts:30` — `WorkerLike` (réutiliser).
- Réutilise : `apps/web/src/platform/container-load.ts:7`, `container.ts:66` — `loadFormatsModule()` ; garde `hasPixels(m)` sur le patron `hasSheetReader` (réutiliser, étendre).
- Réutilise : `sheet-reader.ts:83` (`createSheetReader`, un Worker par lecture : pas substituable, I18) — `apps/web/src/platform/pixel-runner.ts`, DAI3 (nouveau module).

**Test et commande bornée :**
- `cd <worktree> && pnpm --filter @roomboard/web test src/platform/pixel-runner.test.ts 2>&1 | tail -20` → `Tests  10 passed (10)` ; un nom : `-t "chargé au premier besoin"` → `Tests  1 passed`.
- À garder vert : `cd <worktree> && pnpm --filter @roomboard/web test src/platform/sheet-reader.test.ts src/platform/container.test.ts 2>&1 | tail -20` → aucun `FAIL `.
- Types : `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC5 Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- GC7 Preuves bornées : `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (sans `--`). Motif d'échec : `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 VM chargée : un test qui échoue sur un délai est rejoué une fois avant d'être jugé ; aucun délai relevé (les tests utilisent de fausses horloges).
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

**Interdits :** importer `src/wasm-formats/` ou `container-load.ts` depuis `pixel-runner.ts` (aucun test ne doit résoudre le module construit) ; toucher `sheet-reader.ts`, `sheet-worker.ts`, `container-load.ts`.

**Terminé quand :** 10 tests verts, `sheet-reader.test.ts` et `container.test.ts` verts, `tsc` sans erreur.

**Rapport :** sha ; sorties bornées ; `Réutilisation : appelé apps/web/src/platform/sheet-reader.ts WorkerLike`, `Réutilisation : appelé apps/web/src/platform/container-load.ts loadFormatsModule (dans pixel-worker.ts), hasPixels sur le patron hasSheetReader`, `Réutilisation : écart — createSheetReader jette son Worker à chaque lecture (I18), pixel-runner.ts neuf`.

- [ ] **Étape 1 : garde `hasPixels`**

`apps/web/src/platform/container.ts`, juste après la fonction `hasSheetReader` :

```ts
/** Module `formats` avec les calculs de pixels (C5, I17) : servi seulement dans le Worker de `pixel-worker.ts`. */
export interface PixelFormatsBinding extends FormatsBinding {
  image_transparent(px: Uint8Array, w: number, h: number, r: number, g: number, b: number, tolerance: number, soft: number, contiguous: boolean): void;
  image_adjust(px: Uint8Array, brightness: number, contrast: number): void;
  image_flood_fill(px: Uint8Array, w: number, h: number, x: number, y: number, tolerance: number, r: number, g: number, b: number): void;
}

/** Vrai si le module chargé expose les calculs de pixels (module construit après C5). */
export function hasPixels(m: FormatsBinding): m is PixelFormatsBinding {
  const p = m as Partial<PixelFormatsBinding>;
  return typeof p.image_transparent === "function" && typeof p.image_adjust === "function";
}
```

- [ ] **Étape 2 : tests (rouges)**

`apps/web/src/platform/pixel-runner.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasPixels } from "./container";
import { applyPixels, createPixelRunner, pixelErrorMessage, pixelNotice, PIXELS_FAILED_MESSAGE, rgbOf, type PixelJob } from "./pixel-runner";
import type { WorkerLike } from "./sheet-reader";

class FakeWorker implements WorkerLike {
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readonly posted: { id: number; bitmap: unknown; brightness?: number }[] = [];
  readonly transfers: Transferable[][] = [];
  terminated = false;
  postMessage(m: unknown, transfer: Transferable[]): void {
    this.posted.push(m as { id: number; bitmap: unknown; brightness?: number });
    this.transfers.push(transfer);
  }
  terminate(): void {
    this.terminated = true;
  }
  reply(i: number, data: Record<string, unknown>): void {
    this.onmessage?.({ data: { id: this.posted[i]?.id, ...data } });
  }
}
const bmp = (tag: string): ImageBitmap => ({ tag, close: vi.fn() }) as unknown as ImageBitmap;
const job = (key: string, extra: Partial<PixelJob> = {}): PixelJob & { bitmap: ReturnType<typeof vi.fn> } =>
  ({ key, brightness: 10, bitmap: vi.fn(async () => bmp(`copie ${key}`)), ...extra }) as PixelJob & { bitmap: ReturnType<typeof vi.fn> };
const tick = (ms = 0): Promise<void> => vi.advanceTimersByTimeAsync(ms).then(() => undefined);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const workers: FakeWorker[] = [];
  const spawn = vi.fn((): WorkerLike => {
    const w = new FakeWorker();
    workers.push(w);
    return w;
  });
  return { spawn, workers, runner: createPixelRunner(spawn) };
}

describe("lanceur de pixels (DAI3, I18, I19)", () => {
  it("chargé au premier besoin : aucun Worker avant le premier calcul, un seul pour deux calculs", async () => {
    const { spawn, workers, runner } = setup();
    expect(spawn).not.toHaveBeenCalled();
    const a = runner.run("e1", job("a"));
    await tick();
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(workers[0]?.posted[0]).toMatchObject({ brightness: 10 });
    const out = bmp("a");
    workers[0]?.reply(0, { bitmap: out });
    await expect(a).resolves.toBe(out);
    const b = runner.run("e2", job("b"));
    await tick();
    workers[0]?.reply(1, { bitmap: bmp("b") });
    await b;
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("le bitmap copié part en transfert", async () => {
    const { workers, runner } = setup();
    void runner.run("e", job("a"));
    await tick();
    const posted = workers[0]?.posted[0];
    expect(workers[0]?.transfers[0]).toEqual([posted?.bitmap]);
  });

  it("file avec remplacement : le calcul remplacé se résout à null sans copie de bitmap", async () => {
    const { workers, runner } = setup();
    const first = runner.run("e", job("k1"));
    await tick();
    const replaced = job("k2");
    const second = runner.run("e#apercu", replaced);
    const third = runner.run("e#apercu", job("k3"));
    await expect(second).resolves.toBeNull();
    expect(replaced.bitmap).not.toHaveBeenCalled();
    workers[0]?.reply(0, { bitmap: bmp("k1") });
    await first;
    await tick();
    expect(workers[0]?.posted).toHaveLength(2);
    workers[0]?.reply(1, { bitmap: bmp("k3") });
    await expect(third).resolves.not.toBeNull();
  });

  it("un seul calcul à la fois dans le Worker", async () => {
    const { workers, runner } = setup();
    void runner.run("a", job("a"));
    void runner.run("b", job("b"));
    await tick();
    expect(workers[0]?.posted).toHaveLength(1);
  });

  it("arrêt 10 s après la dernière réponse ; le calcul suivant relance un Worker", async () => {
    const { spawn, workers, runner } = setup();
    const a = runner.run("e", job("a"));
    await tick();
    workers[0]?.reply(0, { bitmap: bmp("a") });
    await a;
    await tick(9_999);
    expect(workers[0]?.terminated).toBe(false);
    await tick(1);
    expect(workers[0]?.terminated).toBe(true);
    void runner.run("e", job("b"));
    await tick();
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("60 s sans réponse : rejet PIXELS_FAILED_MESSAGE, Worker arrêté", async () => {
    const { workers, runner } = setup();
    const a = runner.run("e", job("a"));
    const seen = a.catch((e: unknown) => (e instanceof Error ? e.message : String(e)));
    await tick(60_000);
    await expect(seen).resolves.toBe(PIXELS_FAILED_MESSAGE);
    expect(workers[0]?.terminated).toBe(true);
  });

  it("erreur du Worker : rejet avec son message ; onerror : PIXELS_FAILED_MESSAGE ; Worker arrêté chaque fois", async () => {
    const { spawn, workers, runner } = setup();
    const a = runner.run("e", job("a")).catch((e: unknown) => (e as Error).message);
    await tick();
    workers[0]?.reply(0, { error: "module des pixels indisponible" });
    await expect(a).resolves.toBe("module des pixels indisponible");
    expect(workers[0]?.terminated).toBe(true);
    const b = runner.run("e", job("b")).catch((e: unknown) => (e as Error).message);
    await tick();
    workers[1]?.onerror?.(new Event("error"));
    await expect(b).resolves.toBe(PIXELS_FAILED_MESSAGE);
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("dispose : en attente → null, Worker arrêté, résultat tardif ignoré", async () => {
    const { workers, runner } = setup();
    const a = runner.run("e", job("a"));
    const b = runner.run("f", job("b"));
    await tick();
    runner.dispose();
    await expect(a).resolves.toBeNull();
    await expect(b).resolves.toBeNull();
    expect(workers[0]?.terminated).toBe(true);
    await expect(runner.run("g", job("c"))).resolves.toBeNull();
  });
});

describe("calcul dans le Worker (I10, I17)", () => {
  it("applyPixels : couleur transparente sur les couleurs d'origine, puis luminosité et contraste ; rien sans réglage de pixels", () => {
    const calls: string[] = [];
    const mod = {
      image_transparent: (_px: Uint8Array, w: number, h: number, r: number, g: number, b: number, t: number, s: number, c: boolean) => calls.push(`transparent ${w}x${h} ${r},${g},${b} ${t} ${s} ${c}`),
      image_adjust: (_px: Uint8Array, b: number, c: number) => calls.push(`adjust ${b} ${c}`),
    };
    const px = new Uint8Array(8);
    applyPixels(mod, px, 2, 1, { transparent: { color: "#ff0010", tolerance: 10, soft: 0, contiguous: true }, brightness: 50 });
    expect(calls).toEqual(["transparent 2x1 255,0,16 10 0 true", "adjust 50 0"]);
    calls.length = 0;
    applyPixels(mod, px, 2, 1, {});
    expect(calls).toEqual([]);
    expect(() => rgbOf("white")).toThrow("couleur illisible");
  });

  it("messages : panique Wasm → PIXELS_FAILED_MESSAGE ; erreur connue gardée ; avis de #etat ; garde hasPixels", () => {
    expect(pixelErrorMessage(new WebAssembly.RuntimeError("unreachable"))).toBe(PIXELS_FAILED_MESSAGE);
    expect(pixelErrorMessage(new Error("module des pixels indisponible"))).toBe("module des pixels indisponible");
    expect(pixelErrorMessage(42)).toBe(PIXELS_FAILED_MESSAGE);
    expect(pixelNotice("x")).toBe("retouches de l'image non affichées : x");
    const base = { ContainerReader: { open: vi.fn() }, write_container: vi.fn() };
    expect(hasPixels(base as never)).toBe(false);
    expect(hasPixels({ ...base, image_transparent: vi.fn(), image_adjust: vi.fn() } as never)).toBe(true);
  });
});
```

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/platform/pixel-runner.test.ts 2>&1 | tail -20`
Attendu : `FAIL ` (module `./pixel-runner` introuvable).

- [ ] **Étape 3 : écrire `pixel-runner.ts`**

```ts
/**
 * Calculs de pixels hors de l'instance qui enregistre (C5, U30, DAI3, I18, I19) : un Worker par onglet, créé au premier
 * calcul, gardé tant qu'il a du travail, arrêté `PIXEL_IDLE_MS` après sa dernière réponse, après une erreur ou au bout
 * de `PIXEL_TIMEOUT_MS` sans réponse (une panique Wasm ne casse ni l'encre ni l'instance qui enregistre). File avec
 * remplacement : au plus un calcul en attente par emplacement (`<id>`, `<id>#apercu`) ; un calcul remplacé se résout à
 * null sans être lancé (sa copie de bitmap n'est jamais faite). Un seul calcul à la fois dans le Worker. La péremption à
 * l'arrivée est jugée par l'appelant (clé de son emplacement, `image-cache.ts`). Le Worker est créé par l'amorce
 * (`main.ts`) : aucun test ne résout `pixel-worker.ts` ni `src/wasm-formats/`.
 */
import type { PixelFormatsBinding } from "./container";
import type { WorkerLike } from "./sheet-reader";

export const PIXEL_IDLE_MS = 10_000;
/** Même délai que la lecture d'un classeur (C10b, `SHEET_WORKER_TIMEOUT_MS`). */
export const PIXEL_TIMEOUT_MS = 60_000;
export const PIXELS_FAILED_MESSAGE = "calcul des pixels interrompu";
/** Message de `#etat` au premier échec d'un onglet (I24). */
export const pixelNotice = (cause: string): string => `retouches de l'image non affichées : ${cause}`;

/** Réglages calculés par le Worker (sous-ensemble structurel d'`ImageParams`). */
export interface PixelParams {
  readonly transparent?: { readonly color: string; readonly tolerance: number; readonly soft: number; readonly contiguous: boolean };
  readonly brightness?: number;
  readonly contrast?: number;
}
export interface PixelJob extends PixelParams {
  /** `pixelKey` de l'image (I19). */
  readonly key: string;
  /** Copie transférable du bitmap d'affichage ; appelée seulement quand le calcul part. */
  bitmap(): Promise<ImageBitmap>;
}
export interface PixelRunner {
  /** null : calcul remplacé avant d'être lancé, ou lanceur fermé ; rejet : erreur du Worker, délai, module absent. */
  run(slot: string, job: PixelJob): Promise<ImageBitmap | null>;
  dispose(): void;
}

interface Waiting {
  readonly job: PixelJob;
  readonly resolve: (b: ImageBitmap | null) => void;
  readonly reject: (e: Error) => void;
}
interface Busy {
  readonly id: number;
  readonly w: Waiting;
  readonly timer: ReturnType<typeof setTimeout>;
}

export function createPixelRunner(spawn: () => WorkerLike, opts: { readonly idleMs?: number; readonly timeoutMs?: number } = {}): PixelRunner {
  const idleMs = opts.idleMs ?? PIXEL_IDLE_MS;
  const timeoutMs = opts.timeoutMs ?? PIXEL_TIMEOUT_MS;
  const queue = new Map<string, Waiting>();
  let worker: WorkerLike | null = null;
  let busy: Busy | null = null;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  let disposed = false;

  const stop = (): void => {
    clearTimeout(idle);
    idle = undefined;
    worker?.terminate();
    worker = null;
  };
  /** Le calcul en cours se termine (réponse, erreur, délai) : rend son attente. */
  const settle = (): Waiting | null => {
    const b = busy;
    if (b === null) return null;
    clearTimeout(b.timer);
    busy = null;
    return b.w;
  };
  const fail = (message: string): void => {
    const w = settle();
    stop();
    w?.reject(new Error(message));
    pump();
  };
  function ensure(): WorkerLike {
    if (worker !== null) return worker;
    const w = spawn();
    w.onmessage = (e) => {
      const d = e.data as { readonly id?: unknown; readonly bitmap?: unknown; readonly error?: unknown } | null;
      if (busy === null || typeof d !== "object" || d === null || d.id !== busy.id) return;
      if (typeof d.error === "string" || d.bitmap === undefined || d.bitmap === null) {
        fail(typeof d.error === "string" ? d.error : PIXELS_FAILED_MESSAGE);
        return;
      }
      settle()?.resolve(d.bitmap as ImageBitmap);
      pump();
    };
    w.onerror = () => fail(PIXELS_FAILED_MESSAGE);
    worker = w;
    return w;
  }
  function pump(): void {
    if (disposed || busy !== null) return;
    const next = queue.entries().next();
    if (next.done === true) {
      clearTimeout(idle);
      idle = worker === null ? undefined : setTimeout(stop, idleMs);
      return;
    }
    const [slot, w] = next.value;
    queue.delete(slot);
    clearTimeout(idle);
    const id = ++seq;
    busy = { id, w, timer: setTimeout(() => fail(PIXELS_FAILED_MESSAGE), timeoutMs) };
    const { job } = w;
    job.bitmap().then(
      (bitmap) => {
        if (busy?.id !== id) {
          bitmap.close();
          return;
        }
        const msg = { id, bitmap, transparent: job.transparent, brightness: job.brightness, contrast: job.contrast };
        ensure().postMessage(msg, [bitmap]);
      },
      () => {
        if (busy?.id === id) fail(PIXELS_FAILED_MESSAGE);
      },
    );
  }
  return {
    run(slot, job) {
      if (disposed) return Promise.resolve(null);
      return new Promise<ImageBitmap | null>((resolve, reject) => {
        queue.get(slot)?.resolve(null);
        queue.set(slot, { job, resolve, reject });
        pump();
      });
    },
    dispose() {
      disposed = true;
      for (const w of queue.values()) w.resolve(null);
      queue.clear();
      settle()?.resolve(null);
      stop();
    },
  };
}

/** `#rrggbb` → [r, g, b]. */
export function rgbOf(c: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(c);
  if (m === null) throw new Error(`couleur illisible : ${c}`);
  return [parseInt(m[1] ?? "0", 16), parseInt(m[2] ?? "0", 16), parseInt(m[3] ?? "0", 16)];
}

/** Calcul d'un travail sur les octets RGBA (I10) : couleur transparente décidée sur les couleurs d'origine, puis
 *  luminosité et contraste (alpha gardé). Appelé par le Worker ; testé avec un faux module. */
export function applyPixels(mod: Pick<PixelFormatsBinding, "image_transparent" | "image_adjust">, px: Uint8Array, w: number, h: number, p: PixelParams): void {
  const t = p.transparent;
  if (t !== undefined) {
    const [r, g, b] = rgbOf(t.color);
    mod.image_transparent(px, w, h, r, g, b, t.tolerance, t.soft, t.contiguous);
  }
  const brightness = p.brightness ?? 0;
  const contrast = p.contrast ?? 0;
  if (brightness !== 0 || contrast !== 0) mod.image_adjust(px, brightness, contrast);
}

/** Message rendu par le Worker : celui d'une erreur ordinaire ; une panique Wasm (`RuntimeError` « unreachable ») ou une
 *  valeur quelconque : `PIXELS_FAILED_MESSAGE`. */
export function pixelErrorMessage(err: unknown): string {
  if (err instanceof WebAssembly.RuntimeError || !(err instanceof Error) || err.message === "") return PIXELS_FAILED_MESSAGE;
  return err.message;
}
```

- [ ] **Étape 4 : l'entrée du Worker**

`apps/web/src/platform/pixel-worker.ts` :

```ts
/**
 * Entrée du Worker de pixels (C5, I18) : sa propre instance du module `formats`, chargée au premier calcul et gardée ;
 * reçoit `{ id, bitmap, transparent?, brightness?, contrast? }` (bitmap transféré), extrait le RGBA par `OffscreenCanvas`,
 * appelle le Rust (`applyPixels`), rend `{ id, bitmap }` (transféré) ou `{ id, error }`. Créé par `main.ts`, arrêté par
 * `pixel-runner.ts`. Aucun test ne résout ce fichier ni `src/wasm-formats/`.
 */
import { hasPixels, type PixelFormatsBinding } from "./container";
import { loadFormatsModule } from "./container-load";
import { applyPixels, pixelErrorMessage, type PixelParams } from "./pixel-runner";

let loading: Promise<PixelFormatsBinding> | null = null;
const pixels = async (): Promise<PixelFormatsBinding> => {
  const m = await loadFormatsModule();
  if (!hasPixels(m)) throw new Error("module des pixels indisponible");
  return m;
};

self.onmessage = async (e: MessageEvent<PixelParams & { readonly id: number; readonly bitmap: ImageBitmap }>): Promise<void> => {
  const { id, bitmap } = e.data;
  try {
    loading ??= pixels();
    const mod = await loading;
    const w = bitmap.width;
    const h = bitmap.height;
    const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("contexte 2D indisponible dans le Worker");
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    applyPixels(mod, new Uint8Array(img.data.buffer), w, h, e.data);
    const out = await createImageBitmap(img);
    self.postMessage({ id, bitmap: out }, { transfer: [out] });
  } catch (err) {
    self.postMessage({ id, error: pixelErrorMessage(err) });
  } finally {
    bitmap.close();
  }
};
```

- [ ] **Étape 5 : vert, zone, types**

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/platform/pixel-runner.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web test src/platform/sheet-reader.test.ts src/platform/container.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20`
Attendu : `Tests  10 passed (10)`, puis aucun `FAIL `, puis aucune sortie de `tsc`.

- [ ] **Étape 6 : commit**

```bash
cd <worktree> && git add apps/web/src/platform/pixel-runner.ts apps/web/src/platform/pixel-runner.test.ts apps/web/src/platform/pixel-worker.ts apps/web/src/platform/container.ts && git commit -m "feat(web): add a per-tab pixel worker with a replacing queue" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T9 — Cache des bitmaps par élément

<a id="tache-t9"></a>

**Objectif :** étendre `createImageCache` (par asset) d'un emplacement par élément pour le bitmap retouché (U5, I19, I22) : clé `pixelKey`, emplacements `<id>` et `<id>#apercu` ; tant que le bitmap d'une clé neuve manque, le **dernier** bitmap de l'emplacement reste dessiné (l'aperçu retombe sur celui de l'élément, l'élément sur l'image brute) ; « Valider » reprend le bitmap de l'aperçu de même clé sans recalcul ; un résultat dont la clé n'est plus celle voulue est fermé à l'arrivée ; un bitmap n'est fermé qu'une fois remplacé ou périmé ; pipette `colorAt` ; état `pixelState` pour `#stage[data-pixels]` ; premier échec dit une fois par onglet.

**Fichiers :**
- Modifier (réécrit en entier, même fichier) : `apps/web/src/engine/render/image-cache.ts:1-57`.
- Modifier : `apps/web/src/engine/render/image-cache.test.ts` (5 tests existants inchangés, 11 ajoutés).

**Interfaces :**
- Consomme (T6) : `needsPixels(p)`, `pixelKey(i)` (`apps/web/src/core/image-params.ts`) ; `ImageElement` (`api.ts`).
- Consomme (T8) : `type PixelRunner`, `type PixelJob` (`apps/web/src/platform/pixel-runner.ts`, import de type seul, effacé à la compilation).
- Produit (lu par T10, T11, T12) :
  - `interface ImageSource { bitmap(asset: string): CanvasImageSource | null; bitmapOf?(el: ImageElement, preview?: boolean): CanvasImageSource | null; colorAt?(asset: string, x: number, y: number): string | null; forget?(ids: readonly string[]): void }` (méthodes neuves facultatives : les faux `ImageSource` des tests existants restent valides) ;
  - `type PixelState = "" | "attente" | "pret" | "echec"` ;
  - `interface ImageCache extends ImageSource { bitmapOf(el: ImageElement, preview?: boolean): CanvasImageSource | null; colorAt(asset: string, x: number, y: number): string | null; forget(ids: readonly string[]): void; pixelState(): PixelState; dispose(): void }` ;
  - `interface ImageCacheOptions { copy?(b: BitmapLike): Promise<ImageBitmap>; readPixel?(b: BitmapLike, x: number, y: number): readonly [number, number, number] | null; onFailure?(message: string): void; onState?(s: PixelState): void }` (tous `readonly`) ;
  - `createImageCache(assets: Pick<AssetStore, "get">, decode: BitmapDecoder, ready: () => void, pixels?: PixelRunner, opts?: ImageCacheOptions): ImageCache`.
  - `colorAt(asset, x, y)` : `x`, `y` en pixels **source** ; la taille source est apprise au dessin (`bitmapOf`) et sert à la mise à l'échelle de la copie d'affichage ; null tant que le bitmap n'est pas décodé ou que l'image n'a pas été dessinée.
- Réutilise : `apps/web/src/engine/render/image-cache.ts:20` — `ImageSource` gagne `bitmapOf(el: ImageElement): CanvasImageSource | null` et `colorAt(asset: string, x: number, y: number): string | null` ; `createImageCache(assets, decode, ready, pixels?: PixelRunner)` (étendre).
- Réutilise : `apps/web/src/platform/image-import.ts:159` — `decodeImage(blob, kind, max, ports)` par le cache, inchangé (le décodeur reste celui de `board-session.ts`, `decodeBitmap`) (réutiliser).

**Patron à ne pas reprendre (concepteur-critique) :** clé du cache = l'asset seul (`done: Map<asset, bitmap>`, `apps/web/src/engine/render/image-cache.ts:20-57`) : deux images du même asset avec des réglages différents, ou l'image et son aperçu, se partageraient un bitmap ; et « effacer puis recalculer » à chaque changement de clé ferait clignoter l'image brute (fond blanc) pendant chaque calcul. Chemin de référence : garder le cache par asset tel quel pour le bitmap brut, ajouter une table `emplacement → { key, bitmap, wanted }` ; juger la péremption à l'arrivée (`wanted !== key`), comme ActCraft `staleImageFillDropped` (étude `docs/etudes/usage-pot-de-peinture.md:39`).

**Test et commande bornée :**
- `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/image-cache.test.ts 2>&1 | tail -20` → `Tests  16 passed (16)` ; un nom : `-t "une image sans retouche ne lance aucun Worker"` → `Tests  1 passed`.
- Types : `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.

**Contraintes (recopiées) :**
- GC1 Fonctions de pixels dans `crates/roomboard-formats` et `crates/roomboard-formats-wasm`, jamais dans le module principal (`roomboard-core`, `roomboard-wasm`) ; aucune crate d'image ajoutée ; aucune dépendance neuve (Rust ou npm), a fortiori AGPL/GPL/LGPL.
- GC5 Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- GC7 Preuves bornées : `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (sans `--`). Motif d'échec : `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

**Interdits :** modifier les 5 tests existants ; `ctx.filter` ; encoder un PNG (I20).

**Terminé quand :** 16 tests verts, `tsc` sans erreur.

**Rapport :** sha ; sorties bornées ; `Réutilisation : appelé apps/web/src/engine/render/image-cache.ts:20 (étendu)`, `Réutilisation : appelé apps/web/src/platform/image-import.ts:159 decodeImage (inchangé, par le décodeur de la session)`.

- [ ] **Étape 1 : tests (rouges)**

Ajouter en tête de `apps/web/src/engine/render/image-cache.test.ts`, après les imports existants :

```ts
import type { ImageData, ImageElement } from "../../core/api";
import { pixelKey } from "../../core/image-params";
import type { PixelJob, PixelRunner } from "../../platform/pixel-runner";
```

et à la fin du fichier :

```ts
describe("bitmaps retouchés par élément (C5, I19, I22)", () => {
  const out = (tag: string) => ({ tag, close: vi.fn() }) as unknown as ImageBitmap & { close: ReturnType<typeof vi.fn> };
  const el = (image: Partial<ImageData> = {}, id = "e"): ImageElement => ({ id, kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: ID, w: 4, h: 2, ...image } });
  function fakeRunner() {
    const calls: { slot: string; job: PixelJob; resolve: (b: ImageBitmap | null) => void; reject: (e: Error) => void }[] = [];
    const runner: PixelRunner = {
      run: vi.fn((slot: string, job: PixelJob) => new Promise<ImageBitmap | null>((resolve, reject) => calls.push({ slot, job, resolve, reject }))),
      dispose: vi.fn(),
    };
    return { runner, calls };
  }
  /** Cache dont le bitmap brut est déjà décodé. */
  async function ready(opts: Parameters<typeof createImageCache>[4] = {}) {
    const raw = { width: 2, height: 1, close: vi.fn() } as unknown as BitmapLike & { close: ReturnType<typeof vi.fn> };
    const { runner, calls } = fakeRunner();
    const redraw = vi.fn();
    const copy = vi.fn(async () => out("copie"));
    const c = createImageCache(store(), async () => raw, redraw, runner, { copy, ...opts });
    c.bitmap(ID);
    await flush();
    return { c, raw, runner, calls, redraw, copy };
  }

  it("une image sans retouche ne lance aucun Worker", async () => {
    const { c, raw, runner } = await ready();
    expect(c.bitmapOf(el())).toBe(raw);
    expect(c.bitmapOf(el({ crop: [0, 0, 2, 1], quarterTurns: 1 }))).toBe(raw);
    expect(runner.run).not.toHaveBeenCalled();
    expect(c.pixelState()).toBe("");
  });

  it("retouche de pixels : brut tant que le calcul manque, puis bitmap retouché ; attente → pret", async () => {
    const onState = vi.fn();
    const { c, raw, calls, redraw, copy } = await ready({ onState });
    const e = el({ brightness: 20 });
    expect(c.bitmapOf(e)).toBe(raw);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.slot).toBe("e");
    expect(calls[0]?.job).toMatchObject({ key: pixelKey(e.image), brightness: 20 });
    expect(c.pixelState()).toBe("attente");
    await calls[0]?.job.bitmap();
    expect(copy).toHaveBeenCalledWith(raw);
    const done = out("k1");
    calls[0]?.resolve(done);
    await flush();
    expect(c.bitmapOf(e)).toBe(done);
    expect(c.pixelState()).toBe("pret");
    expect(redraw).toHaveBeenCalled();
    expect(onState.mock.calls.map((x) => x[0])).toEqual(["attente", "pret"]);
  });

  it("nouvelle clé : le dernier bitmap reste dessiné (aucun clignotement)", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const first = out("k1");
    calls[0]?.resolve(first);
    await flush();
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(first);
    expect(calls).toHaveLength(2);
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(first);
    expect(calls).toHaveLength(2);
  });

  it("S5 : résultat périmé jeté et fermé (clé changée pendant le calcul)", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    c.bitmapOf(el({ brightness: 30 }));
    const stale = out("k1");
    calls[0]?.resolve(stale);
    await flush();
    expect(stale.close).toHaveBeenCalledTimes(1);
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(raw);
    const fresh = out("k2");
    calls[1]?.resolve(fresh);
    await flush();
    expect(c.bitmapOf(el({ brightness: 30 }))).toBe(fresh);
    expect(fresh.close).not.toHaveBeenCalled();
  });

  it("Annuler pendant un calcul (retour à l'image sans retouche) : le résultat arrivé est fermé", async () => {
    const { c, raw, calls } = await ready();
    c.bitmapOf(el({ contrast: 10 }));
    expect(c.bitmapOf(el())).toBe(raw);
    const late = out("k");
    calls[0]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
    expect(c.bitmapOf(el())).toBe(raw);
  });

  it("aperçu : emplacement <id>#apercu ; Valider reprend le bitmap de l'aperçu sans recalcul", async () => {
    const { c, calls, runner } = await ready();
    c.bitmapOf(el({ contrast: 10 }), true);
    expect(calls[0]?.slot).toBe("e#apercu");
    const p = out("apercu");
    calls[0]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ contrast: 10 }))).toBe(p);
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(p.close).not.toHaveBeenCalled();
  });

  it("aperçu sans bitmap : celui de l'élément reste dessiné ; aperçu fini : le sien est fermé", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const doc = out("doc");
    calls[0]?.resolve(doc);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }), true)).toBe(doc);
    const p = out("apercu");
    calls[1]?.resolve(p);
    await flush();
    expect(c.bitmapOf(el({ brightness: 50 }), true)).toBe(p);
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(doc);
    expect(p.close).toHaveBeenCalledTimes(1);
  });

  it("S5 : échec du calcul : image brute, état echec, onFailure une seule fois, aucune relance de la même clé", async () => {
    const onFailure = vi.fn();
    const { c, raw, calls, runner } = await ready({ onFailure });
    c.bitmapOf(el({ brightness: 20 }));
    calls[0]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(c.bitmapOf(el({ brightness: 20 }))).toBe(raw);
    expect(c.pixelState()).toBe("echec");
    c.bitmapOf(el({ brightness: 40 }, "f"));
    calls[1]?.reject(new Error("module des pixels indisponible"));
    await flush();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith("module des pixels indisponible");
    expect(runner.run).toHaveBeenCalledTimes(2);
  });

  it("forget : emplacements des éléments retirés, bitmaps fermés", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const b = out("k");
    calls[0]?.resolve(b);
    await flush();
    c.forget(["e"]);
    expect(b.close).toHaveBeenCalledTimes(1);
    expect(c.pixelState()).toBe("");
  });

  it("colorAt : couleur du pixel source mis à l'échelle de la copie ; null avant le dessin", async () => {
    const readPixel = vi.fn((_b: BitmapLike, _x: number, _y: number): readonly [number, number, number] | null => [255, 0, 16]);
    const { c } = await ready({ readPixel });
    expect(c.colorAt(ID, 3, 1)).toBeNull();
    c.bitmapOf(el());
    expect(c.colorAt(ID, 3, 1)).toBe("#ff0010");
    expect(readPixel).toHaveBeenCalledWith(expect.anything(), 1, 0);
  });

  it("dispose : bitmaps retouchés fermés ; résultat arrivé après : fermé", async () => {
    const { c, calls } = await ready();
    c.bitmapOf(el({ brightness: 20 }));
    const b = out("k");
    calls[0]?.resolve(b);
    await flush();
    c.bitmapOf(el({ brightness: 30 }, "f"));
    c.dispose();
    expect(b.close).toHaveBeenCalledTimes(1);
    const late = out("tard");
    calls[1]?.resolve(late);
    await flush();
    expect(late.close).toHaveBeenCalledTimes(1);
  });
});
```

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/image-cache.test.ts 2>&1 | tail -20`
Attendu : `FAIL ` (`bitmapOf` n'existe pas), les 5 tests existants passent.

- [ ] **Étape 2 : réécrire `image-cache.ts`**

```ts
/**
 * Bitmaps des images (DAR2, R16, HR12 ; C5, I19, I22). Le rendu de la scène est synchrone, le décodage et les calculs
 * de pixels ne le sont pas. `bitmap(asset)` rend le bitmap décodé de l'asset (copie d'affichage, au plus 4096 px de côté)
 * ou null et lance le décodage au premier appel. `bitmapOf(el, preview)` rend le bitmap à dessiner pour un élément
 * image : retouché (couleur transparente, luminosité, contraste) dans l'emplacement de l'élément (`<id>`) ou de son
 * aperçu (`<id>#apercu`), calculé par le lanceur de pixels ; tant que le bitmap de la clé voulue manque, le dernier de
 * l'emplacement reste dessiné (l'aperçu retombe sur celui de l'élément, l'élément sur l'image brute) : aucun clignotement.
 * Un résultat dont la clé n'est plus celle voulue par son emplacement est fermé à l'arrivée. `ready` (branché sur
 * `engine.redraw()`) est appelé quand un bitmap arrive. Une instance par onglet : `dispose` ferme les bitmaps, et ferme
 * aussitôt ceux qui arrivent après.
 */
import type { ImageElement } from "../../core/api";
import type { AssetStore } from "../../core/asset-store";
import { needsPixels, pixelKey } from "../../core/image-params";
// Type seul (effacé à la compilation) : le moteur ne dépend pas de la couche `platform` à l'exécution.
import type { PixelRunner } from "../../platform/pixel-runner";

export interface ImageSource {
  bitmap(asset: string): CanvasImageSource | null;
  /** C5 (I22) : bitmap à dessiner pour l'élément ; `preview` : emplacement de l'aperçu. Absent : `bitmap(asset)`. */
  bitmapOf?(el: ImageElement, preview?: boolean): CanvasImageSource | null;
  /** C5 (I22, I29) : couleur `#rrggbb` d'origine du pixel source (x, y) ; null tant que le bitmap n'est pas prêt. */
  colorAt?(asset: string, x: number, y: number): string | null;
  /** C5 (I19) : éléments retirés (`Change.removed`) : leurs emplacements et résultats en route sont jetés. */
  forget?(ids: readonly string[]): void;
}

export type BitmapLike = CanvasImageSource & { close?(): void };
export type BitmapDecoder = (blob: Blob) => Promise<BitmapLike>;
/** `#stage[data-pixels]` (I33) : "" aucune image retouchée, "attente" un calcul en cours, "pret", "echec". */
export type PixelState = "" | "attente" | "pret" | "echec";

export interface ImageCache extends ImageSource {
  bitmapOf(el: ImageElement, preview?: boolean): CanvasImageSource | null;
  colorAt(asset: string, x: number, y: number): string | null;
  forget(ids: readonly string[]): void;
  pixelState(): PixelState;
  dispose(): void;
}

export interface ImageCacheOptions {
  /** Copie transférable du bitmap décodé ; défaut : `createImageBitmap`. */
  readonly copy?: (b: BitmapLike) => Promise<ImageBitmap>;
  /** Pixel RVB (x, y) du bitmap décodé ; défaut : `OffscreenCanvas` 1 × 1. */
  readonly readPixel?: (b: BitmapLike, x: number, y: number) => readonly [number, number, number] | null;
  /** Premier échec d'un calcul de pixels de l'onglet (message de `#etat`, I24) : appelé une fois. */
  readonly onFailure?: (message: string) => void;
  /** Chaque changement de `pixelState()`. */
  readonly onState?: (s: PixelState) => void;
}

interface Slot {
  /** Clé du bitmap tenu. */
  key: string | null;
  bitmap: BitmapLike | null;
  /** Clé en calcul pour cet emplacement ; un résultat d'une autre clé est périmé. */
  wanted: string | null;
}

const hex2 = (v: number): string => v.toString(16).padStart(2, "0");
const sizeOf = (b: BitmapLike): readonly [number, number] | null => {
  const s = b as { readonly width?: unknown; readonly height?: unknown };
  return typeof s.width === "number" && typeof s.height === "number" && s.width > 0 && s.height > 0 ? [s.width, s.height] : null;
};
const defaultCopy = (b: BitmapLike): Promise<ImageBitmap> => createImageBitmap(b as ImageBitmapSource);
function defaultReadPixel(b: BitmapLike, x: number, y: number): readonly [number, number, number] | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  const ctx = new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
  if (ctx === null) return null;
  ctx.drawImage(b, x, y, 1, 1, 0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
}

export function createImageCache(
  assets: Pick<AssetStore, "get">,
  decode: BitmapDecoder,
  ready: () => void,
  pixels?: PixelRunner,
  opts: ImageCacheOptions = {},
): ImageCache {
  const done = new Map<string, BitmapLike>();
  const pending = new Set<string>();
  const failed = new Set<string>();
  /** Taille source de chaque asset, apprise au dessin : la pipette met (x, y) à l'échelle de la copie d'affichage. */
  const sizes = new Map<string, readonly [number, number]>();
  const slots = new Map<string, Slot>();
  /** Clés dont le calcul a échoué : image brute, aucune relance (I24). */
  const badKeys = new Set<string>();
  const copy = opts.copy ?? defaultCopy;
  const readPixel = opts.readPixel ?? defaultReadPixel;
  let running = 0;
  let lastFailed = false;
  let warned = false;
  let disposed = false;
  let state: PixelState = "";

  const publish = (): void => {
    const hasBitmap = [...slots.values()].some((s) => s.bitmap !== null);
    const next: PixelState = running > 0 ? "attente" : lastFailed ? "echec" : hasBitmap ? "pret" : "";
    if (next === state) return;
    state = next;
    opts.onState?.(next);
  };
  const drop = (name: string): void => {
    const s = slots.get(name);
    if (s === undefined) return;
    slots.delete(name);
    s.bitmap?.close?.();
  };

  function bitmap(asset: string): BitmapLike | null {
    const hit = done.get(asset);
    if (hit !== undefined) return hit;
    if (disposed || pending.has(asset) || failed.has(asset)) return null;
    const blob = assets.get(asset);
    if (blob === undefined) return null;
    pending.add(asset);
    decode(blob).then(
      (b) => {
        pending.delete(asset);
        if (disposed) {
          b.close?.();
          return;
        }
        done.set(asset, b);
        ready();
      },
      (e: unknown) => {
        pending.delete(asset);
        failed.add(asset);
        console.warn(`RoomBoard : image ${asset} illisible (${e instanceof Error ? e.message : String(e)})`);
      },
    );
    return null;
  }

  /** Lance le calcul de `key` pour l'emplacement `name` (une copie du bitmap brut part quand le calcul part). */
  function compute(runner: PixelRunner, name: string, s: Slot, key: string, el: ImageElement, raw: BitmapLike): void {
    s.wanted = key;
    running++;
    publish();
    const i = el.image;
    const job = {
      key,
      bitmap: () => copy(raw),
      ...(i.transparent !== undefined ? { transparent: i.transparent } : {}),
      ...(i.brightness ? { brightness: i.brightness } : {}),
      ...(i.contrast ? { contrast: i.contrast } : {}),
    };
    runner.run(name, job).then(
      (out) => {
        running--;
        const cur = slots.get(name);
        if (out === null) {
          publish();
          return;
        }
        if (disposed || cur === undefined || cur.wanted !== key) {
          out.close();
          publish();
          return;
        }
        cur.bitmap?.close?.();
        cur.bitmap = out;
        cur.key = key;
        cur.wanted = null;
        lastFailed = false;
        publish();
        ready();
      },
      (e: unknown) => {
        running--;
        badKeys.add(key);
        const cur = slots.get(name);
        if (cur?.wanted === key) cur.wanted = null;
        lastFailed = true;
        publish();
        if (!warned && !disposed) {
          warned = true;
          opts.onFailure?.(e instanceof Error ? e.message : String(e));
        }
        if (!disposed) ready();
      },
    );
  }

  return {
    bitmap,
    bitmapOf(el, preview = false) {
      const i = el.image;
      sizes.set(i.asset, [i.w, i.h]);
      const raw = bitmap(i.asset);
      const name = preview ? `${el.id}#apercu` : el.id;
      const twinName = preview ? el.id : `${el.id}#apercu`;
      if (!needsPixels(i) || pixels === undefined || disposed) {
        // Sans retouche de pixels : aucun Worker ; un emplacement resté (Annuler, Rétablir) est jeté.
        drop(name);
        if (!preview) drop(twinName);
        publish();
        return raw;
      }
      const key = pixelKey(i);
      let s = slots.get(name);
      if (s === undefined) {
        s = { key: null, bitmap: null, wanted: null };
        slots.set(name, s);
      }
      const twin = slots.get(twinName);
      if (s.key === key && s.bitmap !== null) {
        if (!preview && twin !== undefined) drop(twinName);
        return s.bitmap;
      }
      if (twin !== undefined && twin.key === key && twin.bitmap !== null) {
        if (preview) return twin.bitmap;
        // Valider (I22) : l'élément reprend le bitmap de l'aperçu de même clé, sans recalcul.
        s.bitmap?.close?.();
        s.bitmap = twin.bitmap;
        s.key = key;
        s.wanted = null;
        slots.delete(twinName);
        publish();
        return s.bitmap;
      }
      // Élément dessiné sans aperçu : l'aperçu est fini ; son emplacement et son calcul en route sont jetés.
      if (!preview && twin !== undefined) drop(twinName);
      if (badKeys.has(key)) return raw;
      if (raw !== null && s.wanted !== key) compute(pixels, name, s, key, el, raw);
      return s.bitmap ?? (preview ? (twin?.bitmap ?? null) : null) ?? raw;
    },
    colorAt(asset, x, y) {
      const b = done.get(asset);
      const size = sizes.get(asset);
      if (b === undefined || size === undefined) return null;
      const [bw, bh] = sizeOf(b) ?? size;
      const px = Math.min(bw - 1, Math.max(0, Math.floor((x * bw) / size[0])));
      const py = Math.min(bh - 1, Math.max(0, Math.floor((y * bh) / size[1])));
      const rgb = readPixel(b, px, py);
      return rgb === null ? null : `#${hex2(rgb[0])}${hex2(rgb[1])}${hex2(rgb[2])}`;
    },
    forget(ids) {
      for (const id of ids) {
        drop(id);
        drop(`${id}#apercu`);
      }
      publish();
    },
    pixelState: () => state,
    dispose() {
      disposed = true;
      for (const b of done.values()) b.close?.();
      done.clear();
      for (const name of [...slots.keys()]) drop(name);
    },
  };
}
```

- [ ] **Étape 3 : vert, types**

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/image-cache.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20`
Attendu : `Tests  16 passed (16)` ; aucune sortie de `tsc`.

- [ ] **Étape 4 : commit**

```bash
cd <worktree> && git add apps/web/src/engine/render/image-cache.ts apps/web/src/engine/render/image-cache.test.ts && git commit -m "feat(web): cache retouched bitmaps per element with stale results dropped" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Tâche T10 — Dessin, aperçu, cadre de rognage

<a id="tache-t10"></a>

**Objectif :** dessiner une image dans sa boîte affichée : rectangle source du rognage mis à l'échelle de la copie d'affichage, retournements et quarts de tour par la matrice du contexte, bitmap retouché (`bitmapOf`) ou brut, jamais `ctx.filter` (I23) ; aperçu non écrit `Renderer.setImagePreview` (patron `setGridPreview`, I30) avec cadre de rognage, voile au-dehors et huit poignées (I28) ; délégation par `WebGL2LiveRenderer` ; une image sans réglage se dessine exactement comme avant (journal inchangé).

**Fichiers :**
- Modifier : `apps/web/src/engine/render/renderer.ts:1-3` (imports), `:46-61` (`ImagePreview`, `Renderer.setImagePreview`) ; `apps/web/src/engine/render/canvas2d.ts` (imports l. 7-18, constantes après `PLACEHOLDER_STROKE` l. 64, champs après `gridPreview` l. 157, `drawScene` l. 199-219, `paintElement` l. 250-253, `paintOverlayContent` l. 284-287, `invalidate` l. 339-352, `setGridPreview` l. 355) ; `apps/web/src/engine/render/webgl2.ts:13` (import), `:272` (`Pick`), `:308-310` ; `apps/web/src/engine/render/fake-ctx.ts:77-81` (`drawImage`) ; `apps/web/src/engine/render/canvas2d.test.ts` (imports, bloc « images » l. 608-655) ; `apps/web/src/engine/render/webgl2.test.ts` (`FakeScene` l. 18-34, bloc « aperçu de grille » l. 309-316) ; `apps/web/src/engine/engine.test.ts:11` et `:48-70` (`FakeRenderer` gagne `setImagePreview`, sinon `tsc` casse : `implements Renderer`).

**Interfaces :**
- Consomme (T6) : `cropOf`, `displaySize`, `isPlainGeometry`, `orientMatrix` ; `ImageElement`, `ImageParams`, `Bounds`, `Matrix` (`api.ts`).
- Consomme (T9) : `ImageSource.bitmapOf?(el, preview)`, `ImageSource.forget?(ids)`.
- Produit (lu par T11) : `interface ImagePreview { readonly id: string; readonly params: ImageParams; readonly matrix: Matrix; readonly frame?: Bounds }` (`renderer.ts`) — `params` et `matrix` remplacent ceux du document pour l'élément `id` ; `frame` = cadre de rognage dans la boîte affichée de l'aperçu (pixels source) ; `Renderer.setImagePreview(p: ImagePreview | null): void` ; `export const CROP_VEIL = "rgba(15, 23, 42, 0.5)"` (`canvas2d.ts`).
- Produit (tests) : `FakeCtx.drawImage(img, ...a: number[])` journalise `drawImage x,y,w,h` (5 arguments, comme avant) ou `drawImage sx,sy,sw,sh -> x,y,w,h` (9 arguments) et pousse `{ img, x, y, w, h, src?: [sx, sy, sw, sh] }` ; `FakeCtx.scale(x, y)`, `FakeCtx.rotate(r)` journalisés.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:250` — dessin d'élément `image` (rognage, retournements, quarts) (étendre).
- Réutilise : `apps/web/src/engine/render/renderer.ts:61`, `engine.ts:647` — patron `setGridPreview` → `setImagePreview({ id, params } | null)` (étendre ; ici `renderer.ts`, `engine.ts` en T11).
- Réutilise : `apps/web/src/engine/render/webgl2.ts:308` — délégation `setGridPreview` → même délégation pour `setImagePreview` (étendre).
- Réutilise : `apps/web/src/engine/tools/handles.ts:24`, `:34` — `handlesOf(b)`, `HANDLE_PX` pour les poignées du cadre (réutiliser ; `hitHandle`, `HANDLE_GRAB_PX` en T11).

**Test et commande bornée :**
- `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts 2>&1 | tail -20` → `Test Files  2 passed (2)`, aucun `FAIL ` (anciens tests du journal des images compris) ; noms : `-t "setImagePreview : délégué à la scène Canvas 2D"` → `Tests  1 passed` ; `-t "image rognée, retournée, tournée"` → `Tests  1 passed`.
- Types : `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20` → aucune sortie.
- À garder vert : `cd <worktree> && pnpm --filter @roomboard/web test src/engine/engine.test.ts 2>&1 | tail -20` → aucun `FAIL `.

**Contraintes (recopiées) :**
- GC5 Images de test fabriquées dans les tests (octets construits en code), jamais téléchargées.
- GC7 Preuves bornées : `pnpm --filter @roomboard/web test <fichier> 2>&1 | tail -20` (sans `--`). Motif d'échec : `FAIL `, code de sortie non nul.
- GC8 Interdits : jamais `git add -A`, `git add .`, `git commit -a` ; aucun `--force` ; aucun tag ni release ; aucun `git push` ; aucun build Tauri ni Android ; aucun test désactivé, sauté ni affaibli.
- GC9 Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message en anglais, dernière ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC11 Chantier parallèle OD85 (C12 PDF) sur les mêmes fichiers (`renderer.ts`, `canvas2d.ts` : il touche `drawScene` `:195-216`) : modifications localisées, ajouts plutôt que réécritures, aucune remise en forme d'un bloc non touché.
- GC13 Tout le travail dans le worktree de la tâche, chaque commande préfixée `cd <worktree> &&` ; worktree neuf : `pnpm install --frozen-lockfile` à la racine avant le premier test web.

**Interdits :** `ctx.filter` ; dessiner une image côté WebGL2 ; changer le journal d'une image sans réglage ; toucher `overlay.ts`, `select.ts`.

**Terminé quand :** les deux fichiers de test et `engine.test.ts` verts, `tsc` sans erreur.

**Rapport :** sha ; sorties bornées ; sortie de `tsc` ; `Réutilisation : appelé canvas2d.ts:250 (étendu)`, `appelé renderer.ts:61 (patron setGridPreview)`, `appelé webgl2.ts:308 (délégation)`, `appelé handles.ts handlesOf, HANDLE_PX`.

- [ ] **Étape 1 : faux contexte**

`apps/web/src/engine/render/fake-ctx.ts`, remplacer :

```ts
  readonly images: { img: unknown; x: number; y: number; w: number; h: number }[] = [];
  drawImage(img: unknown, x = 0, y = 0, w = 0, h = 0): void {
    this.log.push(`drawImage ${x},${y},${w},${h}`);
    this.images.push({ img, x, y, w, h });
  }
```

par :

```ts
  /** `src` : rectangle source d'un drawImage à 9 arguments (C5, rognage) ; absent pour 5 arguments. */
  readonly images: { img: unknown; x: number; y: number; w: number; h: number; src?: readonly number[] }[] = [];
  drawImage(img: unknown, ...a: number[]): void {
    if (a.length === 8) {
      const [sx = 0, sy = 0, sw = 0, sh = 0, x = 0, y = 0, w = 0, h = 0] = a;
      this.log.push(`drawImage ${sx},${sy},${sw},${sh} -> ${x},${y},${w},${h}`);
      this.images.push({ img, x, y, w, h, src: [sx, sy, sw, sh] });
      return;
    }
    const [x = 0, y = 0, w = 0, h = 0] = a;
    this.log.push(`drawImage ${x},${y},${w},${h}`);
    this.images.push({ img, x, y, w, h });
  }
  scale(x: number, y: number): void { this.log.push(`scale ${x},${y}`); }
  rotate(r: number): void { this.log.push(`rotate ${r}`); }
```

- [ ] **Étape 2 : tests (rouges)**

`apps/web/src/engine/render/canvas2d.test.ts` : à l'import de `./canvas2d`, ajouter `CROP_VEIL, HANDLE_FILL` ; ajouter `import { orientMatrix } from "../../core/image-params";`. Dans le bloc `describe("images et éléments inconnus (R16, U3)", …)`, après le test « fantôme d'une image … », ajouter :

```ts
  /** Rendu de `el` avec un aperçu d'image posé avant la scène. */
  function previewed(el: ElementView, images: ImageSource, preview: Parameters<Canvas2DRenderer["setImagePreview"]>[0]) {
    const scene = new FakeCtx();
    const src: SceneSource = { element: (id) => (id === el.id ? el : null), outline: () => null };
    const r = new Canvas2DRenderer(asCtx(scene), null, src, { images });
    r.resize(100, 100, 1);
    r.setImagePreview(preview);
    r.drawScene({ id: "p", elementIds: [el.id] }, IDENTITY, new Set());
    return { scene, r };
  }

  it("image sans réglage : drawImage à 5 arguments, journal inchangé (effet de bord du faux contexte)", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const scene = sceneOf(image, { bitmap: () => bmp });
    expect(scene.log).toContain("drawImage 0,0,200,100");
    expect(scene.images[0]?.src).toBeUndefined();
  });

  it("image rognée, retournée, tournée : boîte affichée, rectangle source à l'échelle de la copie, matrice d'orientation (I23)", () => {
    const i = { asset: IMG, w: 200, h: 100, crop: [20, 10, 100, 50] as const, flipX: true, quarterTurns: 1 };
    const el: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: i };
    const half = { tag: "copie réduite", width: 100, height: 50 } as unknown as CanvasImageSource;
    const scene = sceneOf(el, { bitmap: () => half });
    expect(scene.images).toEqual([{ img: half, x: 0, y: 0, w: 100, h: 50, src: [10, 5, 50, 25] }]);
    expect(orientMatrix(i)).toEqual([0, -1, -1, 0, 50, 100]);
    expect(scene.log).toContain("transform 0,-1,-1,0,50,100");
  });

  it("image tournée sans bitmap : cadre gris de la boîte affichée", () => {
    const el: ElementView = { id: "i", kind: "image", transform: [1, 0, 0, 1, 0, 0], image: { asset: IMG, w: 200, h: 100, quarterTurns: 1 } };
    const scene = sceneOf(el, { bitmap: () => null });
    expect(scene.rects).toContainEqual([0, 0, 100, 200]);
  });

  it("bitmapOf préféré quand la source le fournit ; aperçu : réglages et matrice de l'aperçu, drapeau preview", () => {
    const bmp = { tag: "retouchée" } as unknown as CanvasImageSource;
    const bitmapOf = vi.fn((_el: ImageElement, _preview?: boolean) => bmp);
    const { scene, r } = previewed(image, { bitmap: () => null, bitmapOf }, { id: "i", params: { brightness: 10 }, matrix: [1, 0, 0, 1, 30, 0] });
    expect(bitmapOf).toHaveBeenCalledWith({ ...image, transform: [1, 0, 0, 1, 30, 0], image: { asset: IMG, w: 200, h: 100, brightness: 10 } }, true);
    expect(scene.log).toContain("transform 1,0,0,1,30,0");
    expect(scene.images[0]?.img).toBe(bmp);
    r.setImagePreview(null);
    r.drawScene({ id: "p", elementIds: ["i"] }, IDENTITY, new Set());
    expect(bitmapOf).toHaveBeenLastCalledWith(image, false);
  });

  it("cadre de rognage : voile hors du cadre (evenodd), cadre, huit poignées (I28)", () => {
    const bmp = { tag: "bitmap" } as unknown as CanvasImageSource;
    const { scene } = previewed(image, { bitmap: () => bmp }, { id: "i", params: {}, matrix: [1, 0, 0, 1, 5, 6], frame: { x0: 10, y0: 10, x1: 60, y1: 40 } });
    expect(scene.log).toContain(`fill ${CROP_VEIL}`);
    expect(scene.log.filter((l) => l === `fill ${HANDLE_FILL}`)).toHaveLength(8);
  });

  it("invalidate : les éléments retirés sont oubliés par la source d'images (I19)", () => {
    const forget = vi.fn();
    const src: SceneSource = { element: () => null, outline: () => null };
    const r = new Canvas2DRenderer(asCtx(new FakeCtx()), null, src, { images: { bitmap: () => null, forget } });
    r.invalidate({ ...NO_CHANGE, ids: ["a"], removed: ["b"] });
    expect(forget).toHaveBeenCalledWith(["b"]);
  });
```

et à l'import des types de `../../core/api`, ajouter `ImageElement`.

`apps/web/src/engine/render/webgl2.test.ts` : à l'import de `./renderer`, ajouter `ImagePreview` ; `class FakeScene implements Pick<Renderer, "drawScene" | "invalidate" | "resize" | "setGridPreview" | "setImagePreview">` et la méthode :

```ts
  setImagePreview(p: ImagePreview | null): void {
    this.log.push(`image ${p === null ? "null" : p.id}`);
  }
```

Dans `describe("aperçu de grille (C9 éditeur)", …)`, ajouter :

```ts
  it("setImagePreview : délégué à la scène Canvas 2D", () => {
    const { scene, r } = make();
    r.setImagePreview({ id: "i", params: {}, matrix: [1, 0, 0, 1, 0, 0] });
    r.setImagePreview(null);
    expect(scene.log.filter((l) => l.startsWith("image"))).toEqual(["image i", "image null"]);
  });
```

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts 2>&1 | tail -20`
Attendu : `FAIL ` (`setImagePreview` absent, `CROP_VEIL` absent).

- [ ] **Étape 3 : `renderer.ts`**

Remplacer la ligne d'import `import type { Change, CoreDocument, EraseMode, GridView } from "../../core/api";` par :

```ts
import type { Bounds, Change, CoreDocument, EraseMode, GridView, ImageParams, Matrix } from "../../core/api";
```

Après l'interface `GridPreview`, ajouter :

```ts
/** Aperçu d'une image (C5, DAI4, I28) : `params` et `matrix` remplacent ceux du document pour l'élément `id` ; `frame` :
 *  cadre de rognage dans la boîte affichée de l'aperçu (pixels source), voile au-dehors, huit poignées. Rien n'est écrit. */
export interface ImagePreview {
  readonly id: string;
  readonly params: ImageParams;
  readonly matrix: Matrix;
  readonly frame?: Bounds;
}
```

Dans `interface Renderer`, après `setGridPreview(p: GridPreview | null): void;` :

```ts
  /** Aperçu d'une image (C5, DAI4) : rien n'est écrit ; `null` rend l'image du document. */
  setImagePreview(p: ImagePreview | null): void;
```

- [ ] **Étape 4 : `canvas2d.ts`**

1. Import des types : ajouter `ImageElement` à `import type { Bounds, Change, ElementView, … } from "../../core/api";` ; ajouter `import { cropOf, displaySize, isPlainGeometry, orientMatrix } from "../../core/image-params";` ; à `import type { EraserPreview, GridPreview, … } from "./renderer";` ajouter `ImagePreview`.

2. Après `export const UNKNOWN_LABEL = "objet non pris en charge";` :

```ts
/** Voile hors du cadre de rognage (C5, I28). */
export const CROP_VEIL = "rgba(15, 23, 42, 0.5)";
```

3. Après le champ `private gridPreview: GridPreview | null = null;` :

```ts
  /** Aperçu d'une image (C5, DAI4) : ses réglages et sa matrice remplacent ceux du document pour son élément. */
  private imagePreview: ImagePreview | null = null;
  /** Zoom du dernier `drawScene` : traits du cadre de rognage à 1 px écran. */
  private zoom = 1;
```

4. Dans `drawScene`, ajouter `this.zoom = camera.zoom;` comme première ligne après `const ctx = this.scene;`, et remplacer `if (el) this.paintElement(ctx, el, null);` par `if (el) this.paintElement(ctx, this.withImagePreview(el), null);`.

5. Dans `paintElement`, remplacer :

```ts
    } else if (el.kind === "image") {
      const bmp = this.images?.bitmap(el.image.asset) ?? null;
      if (bmp !== null) ctx.drawImage(bmp, 0, 0, el.image.w, el.image.h);
      else paintPlaceholder(ctx, el.image.w, el.image.h, null);
    } else if (el.kind === "table") {
```

par :

```ts
    } else if (el.kind === "image") {
      this.paintImage(ctx, el);
    } else if (el.kind === "table") {
```

6. Dans `paintOverlayContent`, remplacer `if (el) this.paintElement(ctx, el, g.matrix);` par `if (el) this.paintElement(ctx, this.withImagePreview(el), g.matrix);`.

7. Après la méthode `paintElement` (avant `/** Contenu du calque d'édition …`), ajouter :

```ts
  /** L'image en aperçu (C5) : réglages et matrice de l'aperçu à la place de ceux du document. */
  private withImagePreview(el: ElementView): ElementView {
    const p = this.imagePreview;
    if (p === null || el.kind !== "image" || el.id !== p.id) return el;
    return { ...el, transform: p.matrix, image: { asset: el.image.asset, w: el.image.w, h: el.image.h, ...p.params } };
  }

  /** Image (C5, I23) : boîte affichée ; rectangle source du rognage mis à l'échelle de la copie d'affichage, retournements
   *  et quarts de tour par la matrice du contexte ; bitmap retouché (`bitmapOf`) ou brut ; jamais `ctx.filter`. Sans
   *  réglage de géométrie : le dessin d'avant C5, à l'identique. */
  private paintImage(ctx: CanvasRenderingContext2D, el: ImageElement): void {
    const i = el.image;
    const p = this.imagePreview;
    const preview = p !== null && p.id === el.id;
    const [bw, bh] = displaySize(i);
    const bmp = (this.images?.bitmapOf?.(el, preview) ?? null) ?? this.images?.bitmap(i.asset) ?? null;
    if (bmp === null) {
      paintPlaceholder(ctx, bw, bh, null);
    } else if (isPlainGeometry(i)) {
      ctx.drawImage(bmp, 0, 0, i.w, i.h);
    } else {
      const [cx, cy, cw, ch] = cropOf(i);
      const s = bmp as { readonly width?: unknown; readonly height?: unknown };
      const kx = typeof s.width === "number" && s.width > 0 ? s.width / i.w : 1;
      const ky = typeof s.height === "number" && s.height > 0 ? s.height / i.h : 1;
      const o = orientMatrix(i);
      ctx.save();
      ctx.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
      ctx.drawImage(bmp, cx * kx, cy * ky, cw * kx, ch * ky, 0, 0, cw, ch);
      ctx.restore();
    }
    if (p !== null && preview && p.frame !== undefined) this.paintCropFrame(ctx, p.frame, bw, bh, p.matrix);
  }

  /** Cadre de rognage (C5, I28), repère local de l'image : voile hors du cadre, cadre et huit poignées à 1 px écran. */
  private paintCropFrame(ctx: CanvasRenderingContext2D, f: Bounds, bw: number, bh: number, m: Matrix): void {
    const scale = this.zoom * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    const px = scale > 0 ? 1 / scale : 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, bw, bh);
    ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    ctx.fillStyle = CROP_VEIL;
    ctx.fill("evenodd");
    ctx.beginPath();
    ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = px;
    ctx.stroke();
    ctx.fillStyle = HANDLE_FILL;
    const half = (HANDLE_PX / 2) * px;
    for (const h of handlesOf(f)) {
      ctx.beginPath();
      ctx.rect(h.x - half, h.y - half, 2 * half, 2 * half);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
```

8. Dans `invalidate`, ajouter en première ligne : `if (change.removed.length > 0) this.images?.forget?.(change.removed);`.

9. Après la méthode `setGridPreview` :

```ts
  setImagePreview(p: ImagePreview | null): void {
    this.imagePreview = p;
  }
```

- [ ] **Étape 5 : `webgl2.ts`**

À l'import `import type { EraserPreview, GridPreview, … } from "./renderer";` ajouter `ImagePreview` ; dans le constructeur, `Pick<Renderer, "drawScene" | "invalidate" | "resize" | "setGridPreview">` devient `Pick<Renderer, "drawScene" | "invalidate" | "resize" | "setGridPreview" | "setImagePreview">` ; après la méthode `setGridPreview` :

```ts
  /** C5 : l'image se dessine sur la scène Canvas 2D ; WebGL2 ne dessine que l'encre vive. */
  setImagePreview(p: ImagePreview | null): void {
    this.scene.setImagePreview(p);
  }
```

- [ ] **Étape 6 : faux rendu du moteur**

`apps/web/src/engine/engine.test.ts` : ligne 11, `import type { GridPreview, LiveLayer, PageView, Renderer } from "./render/renderer";` devient `import type { GridPreview, ImagePreview, LiveLayer, PageView, Renderer } from "./render/renderer";` ; dans `class FakeRenderer`, après la méthode `setGridPreview`, ajouter :

```ts
  readonly imagePreviews: (ImagePreview | null)[] = [];
  setImagePreview(p: ImagePreview | null): void {
    this.imagePreviews.push(p);
  }
```

- [ ] **Étape 7 : vert, types**

Run : `cd <worktree> && pnpm --filter @roomboard/web test src/engine/render/canvas2d.test.ts src/engine/render/webgl2.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web test src/engine/engine.test.ts 2>&1 | tail -20 && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -20`
Attendu : `Test Files  2 passed (2)`, puis aucun `FAIL `, puis aucune sortie de `tsc`.

- [ ] **Étape 8 : commit**

```bash
cd <worktree> && git add apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/render/renderer.ts apps/web/src/engine/render/webgl2.ts apps/web/src/engine/render/webgl2.test.ts apps/web/src/engine/render/fake-ctx.ts apps/web/src/engine/engine.test.ts && git commit -m "feat(web): draw cropped, flipped and turned images with a preview and crop frame" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
